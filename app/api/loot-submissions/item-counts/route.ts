import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import type { SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryClient = SupabaseClient<any, any, any>

const INVALID_IDS_ERROR = 'ids must be a list of up to 2000 loot list ids'

// The loot lists page sends every non-draft list of one guild and
// expansion, far fewer than this; the limit bounds the database work of
// one request.
const ITEM_COUNTS_MAX_IDS = 2000

// Identical to UUID_PATTERN in lib/loot/guild-award-refs.ts, copied here
// (rather than imported) so that file, about raid events and characters
// only, stays untouched.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LOOKUP_CHUNK_SIZE = 100

/** Drops empty strings and de-duplicates in first-seen order. */
function normalizeIds(ids: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of ids) {
    if (!id) continue
    if (seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  return result
}

type ParsedPostBody = { ids: string[] } | { invalid: true }

/**
 * Parses and validates a POST body: a body that is not JSON, is not an
 * object, is null or an array, an `ids` value that is present but not an
 * array, or any entry that is not a string, is invalid. An absent or null
 * `ids` is today's "no ids" behaviour, not invalid.
 */
async function parsePostBody(request: NextRequest): Promise<ParsedPostBody> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return { invalid: true }
  }

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { invalid: true }
  }

  const ids = (body as { ids?: unknown }).ids
  if (ids === undefined || ids === null) return { ids: [] }
  if (!Array.isArray(ids)) return { invalid: true }
  if (!ids.every((id): id is string => typeof id === 'string')) return { invalid: true }

  return { ids }
}

/**
 * Finds every id in `ids` that names a loot_submissions row in a guild
 * where the caller holds an active membership (character_guild_memberships
 * rows with is_active = true, for the caller's own characters) -- the same
 * rule loot_submission_items_select already applies to the caller's own
 * session. No characters or no active guild returns [] without querying
 * loot_submissions. Ids that fail the UUID shape check are never queried.
 * Queried in chunks of LOOKUP_CHUNK_SIZE. Throws on any lookup error, so a
 * failure never falls back to unchecked ids.
 */
async function findReadableListIds(
  serviceSupabase: QueryClient,
  userId: string,
  ids: string[]
): Promise<string[]> {
  const { data: characters, error: charactersError } = await serviceSupabase
    .from('characters')
    .select('id')
    .eq('user_id', userId)

  if (charactersError) {
    throw new Error(`Failed to look up characters for user ${userId}: ${charactersError.message}`)
  }

  const characterIds = (characters ?? []).map((row: { id: string }) => row.id)
  if (characterIds.length === 0) return []

  const { data: memberships, error: membershipsError } = await serviceSupabase
    .from('character_guild_memberships')
    .select('guild_id')
    .in('character_id', characterIds)
    .eq('is_active', true)

  if (membershipsError) {
    throw new Error(`Failed to look up character_guild_memberships for user ${userId}: ${membershipsError.message}`)
  }

  const activeGuildIds = Array.from(new Set((memberships ?? []).map((row: { guild_id: string }) => row.guild_id)))
  if (activeGuildIds.length === 0) return []

  const wellFormedIds = ids.filter(id => UUID_PATTERN.test(id))
  if (wellFormedIds.length === 0) return []

  const readableIds: string[] = []
  for (let i = 0; i < wellFormedIds.length; i += LOOKUP_CHUNK_SIZE) {
    const chunk = wellFormedIds.slice(i, i + LOOKUP_CHUNK_SIZE)
    const { data, error } = await serviceSupabase
      .from('loot_submissions')
      .select('id')
      .in('id', chunk)
      .in('guild_id', activeGuildIds)

    if (error) {
      throw new Error(`Failed to look up loot_submissions for user ${userId}: ${error.message}`)
    }

    for (const row of (data ?? []) as Array<{ id: string }>) {
      readableIds.push(row.id)
    }
  }

  return readableIds
}

// Shared logic for fetching item counts.
//
// Supabase enforces a server-side 1000-row cap that .limit(10000) does NOT
// override -- a prior implementation passed batches of 100 submission IDs
// hoping the limit would let through 10000 rows, but the server still capped
// each response at 1000. Submissions later in each batch silently came back
// with count=0. Paginate with .range() within each batch until exhausted.
async function getItemCounts(serviceSupabase: QueryClient, submissionIds: string[]): Promise<Record<string, number>> {
  if (submissionIds.length === 0) return {}

  const BATCH_SIZE = 100
  const PAGE = 1000
  const countMap: Record<string, number> = {}

  for (let i = 0; i < submissionIds.length; i += BATCH_SIZE) {
    const batch = submissionIds.slice(i, i + BATCH_SIZE)
    for (let start = 0; ; start += PAGE) {
      const { data, error } = await serviceSupabase
        .from('loot_submission_items')
        .select('submission_id')
        .in('submission_id', batch)
        .is('removed_at', null)
        // `.order('id')` is REQUIRED for stable pagination -- without it,
        // Postgres returns rows in arbitrary order and successive .range()
        // calls skip / duplicate rows, which previously caused 14 of 172
        // approved submissions in Big Yikes to show count=0 despite having
        // real items.
        .order('id', { ascending: true })
        .range(start, start + PAGE - 1)

      if (error) {
        throw new Error(`Failed to look up loot_submission_items: ${error.message}`)
      }
      if (!data || data.length === 0) break
      for (const item of data as { submission_id: string }[]) {
        countMap[item.submission_id] = (countMap[item.submission_id] || 0) + 1
      }
      if (data.length < PAGE) break
    }
  }

  return countMap
}

/**
 * Applies the limit and UUID short-cut, creates the service-role client
 * once, then finds the readable ids and counts their live items.
 */
async function buildCountsResponse(userId: string, ids: string[]): Promise<NextResponse> {
  if (ids.length > ITEM_COUNTS_MAX_IDS) {
    return NextResponse.json({ error: INVALID_IDS_ERROR }, { status: 400 })
  }

  const hasWellFormedId = ids.some(id => UUID_PATTERN.test(id))
  if (!hasWellFormedId) return NextResponse.json({})

  const serviceSupabase = createServiceRoleClient()
  const readableIds = await findReadableListIds(serviceSupabase, userId, ids)
  const counts = await getItemCounts(serviceSupabase, readableIds)
  return NextResponse.json(counts)
}

/**
 * GET and POST /api/loot-submissions/item-counts
 *
 * Returns the number of live items (removed_at null) for each requested
 * loot list id, counting only lists in a guild where the caller holds an
 * active membership -- the same rule the database already applies when the
 * caller's own session reads a list's items. A list in another guild, a
 * guild where the caller's membership is inactive, an unknown id or a
 * non-UUID string is simply left out of the response, exactly like a list
 * with no live items; the response never shows whether such an id exists.
 *
 * A POST body that is not JSON or not an object, an `ids` value present but
 * not an array, an entry that is not a string, or more than
 * ITEM_COUNTS_MAX_IDS distinct ids all return 400 before any database
 * client is created. Any error looking up the caller's characters, active
 * memberships or the requested lists returns 500 with no partial counts.
 */
export async function GET(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const idsParam = request.nextUrl.searchParams.get('ids')
    if (!idsParam) return NextResponse.json({})

    const ids = normalizeIds(idsParam.split(','))
    if (ids.length === 0) return NextResponse.json({})

    return await buildCountsResponse(user.id, ids)
  } catch (error) {
    console.error('Error in GET /api/loot-submissions/item-counts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const { user, error: authError } = await getAuthenticatedUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const parsed = await parsePostBody(request)
    if ('invalid' in parsed) {
      return NextResponse.json({ error: INVALID_IDS_ERROR }, { status: 400 })
    }

    const ids = normalizeIds(parsed.ids)
    if (ids.length === 0) return NextResponse.json({})

    return await buildCountsResponse(user.id, ids)
  } catch (error) {
    console.error('Error in POST /api/loot-submissions/item-counts:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
