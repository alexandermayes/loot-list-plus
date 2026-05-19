import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { logAudit } from '@/utils/audit/log'
import { trackApiError } from '@/utils/analytics/server'


const VALID_KINDS = new Set(['gold', 'materials', 'consumables', 'other'])
const POINTS_MIN = -1000
const POINTS_MAX = 1000
const NOTE_MAX = 500
const AMOUNT_TEXT_MAX = 200

// ─── Validation ────────────────────────────────────────────

type DonationKind = 'gold' | 'materials' | 'consumables' | 'other'

interface DonationCreateInput {
  guild_id: string
  character_id: string
  points: number
  kind: DonationKind
  amount_text: string | null
  note: string | null
  awarded_at: string | null
}

/**
 * Validate POST body. Returns either a normalized input object or an error
 * message. Drops unknown keys — mirrors the bulk loot-history pattern.
 */
function validateCreateBody(body: unknown): DonationCreateInput | { error: string } {
  if (!body || typeof body !== 'object') return { error: 'Invalid body' }
  const b = body as Record<string, unknown>

  if (typeof b.guild_id !== 'string' || !b.guild_id) return { error: 'guild_id is required' }
  if (typeof b.character_id !== 'string' || !b.character_id) return { error: 'character_id is required' }

  if (typeof b.points !== 'number' || !Number.isFinite(b.points)) return { error: 'points must be a finite number' }
  if (b.points < POINTS_MIN || b.points > POINTS_MAX) {
    return { error: `points must be between ${POINTS_MIN} and ${POINTS_MAX}` }
  }
  if (b.points === 0) return { error: 'points cannot be zero' }

  if (typeof b.kind !== 'string' || !VALID_KINDS.has(b.kind)) {
    return { error: `kind must be one of: ${[...VALID_KINDS].join(', ')}` }
  }

  const amount_text = typeof b.amount_text === 'string'
    ? b.amount_text.slice(0, AMOUNT_TEXT_MAX).trim() || null
    : null
  const note = typeof b.note === 'string'
    ? b.note.slice(0, NOTE_MAX).trim() || null
    : null

  // YYYY-MM-DD, optional. Defaults to today at insert time when null.
  let awarded_at: string | null = null
  if (typeof b.awarded_at === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.awarded_at)) {
    awarded_at = b.awarded_at
  }

  return {
    guild_id: b.guild_id,
    character_id: b.character_id,
    points: b.points,
    kind: b.kind as DonationKind,
    amount_text,
    note,
    awarded_at,
  }
}

// ─── GET ────────────────────────────────────────────────────

/**
 * GET /api/donations
 *
 * List donations for a guild. Available to any active guild member.
 *
 * Query params:
 * - guild_id (required)
 * - character_id (optional)
 * - since, until (optional, YYYY-MM-DD)
 * - limit (default 100), offset (default 0)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sp = request.nextUrl.searchParams
    const guildId = sp.get('guild_id')
    if (!guildId) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    const characterId = sp.get('character_id')
    const since = sp.get('since')
    const until = sp.get('until')
    const limit = Math.min(parseInt(sp.get('limit') || '100'), 500)
    const offset = parseInt(sp.get('offset') || '0')

    const supabase = createServiceRoleClient()

    // Guild membership check (any active CGM in the guild)
    const { data: userChars } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)
    const charIds = (userChars ?? []).map(c => c.id)
    let isMember = false
    if (charIds.length > 0) {
      const { data: membership } = await supabase
        .from('character_guild_memberships')
        .select('id')
        .eq('guild_id', guildId)
        .in('character_id', charIds)
        .eq('is_active', true)
        .limit(1)
      isMember = (membership?.length ?? 0) > 0
    }
    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
    }

    let query = supabase
      .from('donation_records')
      .select('*', { count: 'exact' })
      .eq('guild_id', guildId)
      .order('awarded_at', { ascending: false })
      .order('created_at', { ascending: false })

    if (characterId) query = query.eq('character_id', characterId)
    if (since) query = query.gte('awarded_at', since)
    if (until) query = query.lte('awarded_at', until)

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) {
      console.error('Error fetching donations:', error)
      return NextResponse.json({ error: 'Failed to fetch donations' }, { status: 500 })
    }

    return NextResponse.json({
      data: data ?? [],
      pagination: { total: count ?? 0, limit, offset },
    })
  } catch (error) {
    console.error('Error in GET /api/donations:', error)
    trackApiError('unknown', 'GET /api/donations', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── POST ───────────────────────────────────────────────────

/**
 * POST /api/donations
 *
 * Log a donation for a character. Officers only.
 *
 * Body: { guild_id, character_id, points, kind, amount_text?, note?, awarded_at? }
 *
 * Notes:
 * - `points` is signed. Negative values are clawback / corrections.
 * - `character_name` is denormalized from `characters` at write time.
 * - Audit log is written with `table_name = 'donation_records'`, `action = 'INSERT'`.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const validated = validateCreateBody(body)
    if ('error' in validated) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const perm = await verifyOfficerPermissions(supabase, user.id, validated.guild_id)
    if (!perm.hasPermission) {
      return NextResponse.json({ error: perm.error || 'Insufficient permissions' }, { status: 403 })
    }

    // Resolve character_name. Confirms the character belongs to this guild.
    const { data: character } = await supabase
      .from('characters')
      .select('id, name')
      .eq('id', validated.character_id)
      .single()
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    const { data: cgm } = await supabase
      .from('character_guild_memberships')
      .select('id')
      .eq('character_id', validated.character_id)
      .eq('guild_id', validated.guild_id)
      .eq('is_active', true)
      .limit(1)
    if (!cgm || cgm.length === 0) {
      return NextResponse.json({ error: 'Character is not an active member of this guild' }, { status: 400 })
    }

    const insertData: Record<string, unknown> = {
      guild_id: validated.guild_id,
      character_id: validated.character_id,
      character_name: character.name,
      points: validated.points,
      kind: validated.kind,
      amount_text: validated.amount_text,
      note: validated.note,
      awarded_by: user.id,
    }
    if (validated.awarded_at) insertData.awarded_at = validated.awarded_at

    const { data: inserted, error: insertError } = await supabase
      .from('donation_records')
      .insert(insertData)
      .select('*')
      .single()

    if (insertError || !inserted) {
      console.error('Error inserting donation:', insertError)
      return NextResponse.json({ error: 'Failed to log donation' }, { status: 500 })
    }

    // Fire-and-forget audit log
    const insertedRow = inserted as { id: string }
    logAudit({
      supabase,
      guildId: validated.guild_id,
      tableName: 'donation_records',
      recordId: insertedRow.id,
      action: 'INSERT',
      userId: user.id,
      newData: insertData,
    })

    return NextResponse.json({ data: inserted }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/donations:', error)
    trackApiError('unknown', 'POST /api/donations', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
