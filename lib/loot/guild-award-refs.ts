/**
 * Server-side guild checks for the raid event and character references a
 * loot_history write carries (GH #296).
 *
 * POST and PATCH /api/loot-history/bulk already scope loot_item_id to the
 * calling guild (GH #294), but write raid_event_id and character_id exactly
 * as the client sends them. Every route in this module's caller set uses the
 * service-role client, which bypasses RLS entirely, so the route's own
 * checks are the only thing standing between an officer's request and a
 * write that links this guild's history to another guild's raid night or
 * raider.
 *
 * As in lib/loot/guild-scoped-lookup.ts, every query error here is thrown,
 * never swallowed — a rejected filter or a transient DB error must surface
 * as a real failure, not be silently treated as "this id is invalid".
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryClient = SupabaseClient<any, any, any>

// Identical to UUID_PATTERN in lib/loot/guild-scoped-lookup.ts, duplicated
// here rather than shared so that file (about loot_items only) stays
// untouched.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CHUNK_SIZE = 100

/**
 * Normalizes a client-supplied raid_event_id or character_id before it is
 * checked or written. null, undefined and the empty string all mean
 * "absent" and become null (D-03/PD-02) — an empty-string raid_event_id now
 * saves as null instead of failing its row insert; no client sends one
 * today. Any other string passes through unchanged. Any other non-string
 * value is stringified so it fails the UUID check below and is reported in
 * a 400 instead of reaching Postgres as a 22P02 turned 500.
 */
export function normalizeRefId(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string') return value
  return String(value)
}

/**
 * Finds every id in `ids` that is NOT a raid_events row belonging to
 * guildId (GH #296 D-01). Ids that fail the UUID shape check are invalid
 * and never queried. Deduped in first-seen order before querying, in
 * chunks of 100. Empty input makes no query.
 *
 * Throws if the underlying query errors.
 */
export async function findInvalidRaidEventIds(
  supabase: QueryClient,
  guildId: string,
  ids: string[]
): Promise<string[]> {
  const seen = new Set<string>()
  const dedupedIds: string[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    dedupedIds.push(id)
  }
  if (dedupedIds.length === 0) return []

  const wellFormedIds = dedupedIds.filter(id => UUID_PATTERN.test(id))
  const found = new Set<string>()

  for (let i = 0; i < wellFormedIds.length; i += CHUNK_SIZE) {
    const chunk = wellFormedIds.slice(i, i + CHUNK_SIZE)
    const { data, error } = await supabase
      .from('raid_events')
      .select('id')
      .eq('guild_id', guildId)
      .in('id', chunk)

    if (error) {
      throw new Error(`Failed to look up raid_events for guild ${guildId}: ${error.message}`)
    }

    for (const row of (data ?? []) as Array<{ id: string }>) {
      found.add(row.id)
    }
  }

  return dedupedIds.filter(id => !found.has(id))
}

/**
 * Finds every id in `ids` that does NOT have an active
 * (is_active = true) character_guild_memberships row in guildId
 * (GH #296 D-02, OD-2). A null or false is_active counts as not a member.
 * Ids that fail the UUID shape check are invalid and never queried.
 * Deduped in first-seen order before querying, in chunks of 100. Empty
 * input makes no query.
 *
 * Throws if the underlying query errors.
 */
export async function findInvalidCharacterIds(
  supabase: QueryClient,
  guildId: string,
  ids: string[]
): Promise<string[]> {
  const seen = new Set<string>()
  const dedupedIds: string[] = []
  for (const id of ids) {
    if (seen.has(id)) continue
    seen.add(id)
    dedupedIds.push(id)
  }
  if (dedupedIds.length === 0) return []

  const wellFormedIds = dedupedIds.filter(id => UUID_PATTERN.test(id))
  const found = new Set<string>()

  for (let i = 0; i < wellFormedIds.length; i += CHUNK_SIZE) {
    const chunk = wellFormedIds.slice(i, i + CHUNK_SIZE)
    const { data, error } = await supabase
      .from('character_guild_memberships')
      .select('character_id')
      .eq('guild_id', guildId)
      .eq('is_active', true)
      .in('character_id', chunk)

    if (error) {
      throw new Error(`Failed to look up character_guild_memberships for guild ${guildId}: ${error.message}`)
    }

    for (const row of (data ?? []) as Array<{ character_id: string }>) {
      found.add(row.character_id)
    }
  }

  return dedupedIds.filter(id => !found.has(id))
}

/**
 * User-facing 400 message for a bulk award or reassign carrying a
 * raid_event_id and/or character_id the calling guild does not own (GH #296
 * COPY C-1/C-2/C-3, signed off verbatim). This text never interpolates the
 * offending ids — those belong only in the response body's
 * invalid_raid_event_ids / invalid_character_ids fields — so it cannot leak
 * whether an id exists under another guild.
 */
export function formatInvalidAwardRefsError(invalidRaidEventIds: string[], invalidCharacterIds: string[]): string {
  if (invalidRaidEventIds.length > 0 && invalidCharacterIds.length > 0) {
    return "Some awards are linked to a raid or raider that isn't in this guild. Refresh the page, check the roster, then try again."
  }
  if (invalidRaidEventIds.length > 0) {
    return "Some awards are linked to a raid that isn't in this guild. Refresh the page and try again."
  }
  return "Some raiders aren't active members of this guild. Check the roster, then try again."
}
