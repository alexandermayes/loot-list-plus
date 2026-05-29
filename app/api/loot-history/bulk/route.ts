import { NextRequest, NextResponse, after } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { logAudit } from '@/utils/audit/log'
import { trackEvent, setUserMilestone } from '@/utils/analytics/server'
import { notifyLootAward, type LootAward } from '@/lib/discord-loot-announcements'
import type { AwardReason, AwardOutcomeType } from '@/domain/types'

const AWARD_REASON_VALUES = new Set<AwardReason>(['', 'score', 'loot_council', 'override', 'offspec', 'roll'])
const OUTCOME_TYPE_VALUES = new Set<AwardOutcomeType>(['score', 'roll', 'loot_council', 'override', 'offspec'])
const ALLOWED_COMPONENT_KEYS = ['itemRank', 'attendanceScore', 'rankModifier', 'roleBonus', 'priorityBonus', 'trialPenalty', 'badLuckBonus'] as const
const REASON_LABELS: Record<Exclude<AwardReason, '' | 'score'> | 'score', string> = {
  score: 'Score winner',
  loot_council: 'Loot council decision',
  override: 'Override',
  offspec: 'Offspec / no contest',
  roll: 'Won roll (tied scores)',
}
const MAX_AUDIT_PAYLOAD_BYTES = 4096

function asFiniteNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

function sanitizeComponents(input: unknown): Record<string, number> | null {
  if (!input || typeof input !== 'object') return null
  const src = input as Record<string, unknown>
  const out: Record<string, number> = {}
  for (const key of ALLOWED_COMPONENT_KEYS) {
    const n = asFiniteNumber(src[key])
    if (n !== null) out[key] = n
  }
  return out
}

function sanitizeCandidate(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object') return null
  const src = input as Record<string, unknown>
  const character_id = typeof src.character_id === 'string' ? src.character_id.slice(0, 64) : null
  if (!character_id) return null
  return {
    character_id,
    player_name: typeof src.player_name === 'string' ? src.player_name.slice(0, 64) : null,
    loot_score: asFiniteNumber(src.loot_score),
    is_trial: typeof src.is_trial === 'boolean' ? src.is_trial : null,
    is_eligible: typeof src.is_eligible === 'boolean' ? src.is_eligible : null,
    has_received: typeof src.has_received === 'boolean' ? src.has_received : null,
    bad_luck_bonus: asFiniteNumber(src.bad_luck_bonus),
    components: sanitizeComponents(src.components),
  }
}

/**
 * Whitelist + size-cap an officer-supplied decision_context before persisting
 * to audit_logs. Drops any unknown keys, hard-caps top_candidates to 3, and
 * stamps `_truncated: true` if the serialized payload would exceed the cap.
 */
function sanitizeDecisionContext(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== 'object') return null
  const src = input as Record<string, unknown>
  const outcome_type = typeof src.outcome_type === 'string' && OUTCOME_TYPE_VALUES.has(src.outcome_type as AwardOutcomeType)
    ? (src.outcome_type as AwardOutcomeType)
    : null
  const topCandidatesRaw = Array.isArray(src.top_candidates) ? src.top_candidates.slice(0, 3) : []
  const top_candidates = topCandidatesRaw.map(sanitizeCandidate).filter((c): c is Record<string, unknown> => c !== null)

  const sanitized: Record<string, unknown> = {
    outcome_type,
    was_score_winner: typeof src.was_score_winner === 'boolean' ? src.was_score_winner : null,
    tied_at_top: typeof src.tied_at_top === 'boolean' ? src.tied_at_top : null,
    gap_to_next: asFiniteNumber(src.gap_to_next),
    awarded_character_id: typeof src.awarded_character_id === 'string' ? src.awarded_character_id.slice(0, 64) : null,
    winner_score: asFiniteNumber(src.winner_score),
    winner_components: sanitizeComponents(src.winner_components),
    top_candidates,
  }

  if (JSON.stringify(sanitized).length > MAX_AUDIT_PAYLOAD_BYTES) {
    return { outcome_type, awarded_character_id: sanitized.awarded_character_id, _truncated: true }
  }
  return sanitized
}

/** Compose the human-readable `loot_history.notes` from a structured reason+note pair. */
function composeNotesFromReason(reason: AwardReason | null | undefined, note: string | null | undefined): string | null {
  const trimmedNote = typeof note === 'string' ? note.trim() : ''
  const label = reason ? REASON_LABELS[reason] : null
  const parts = [label, trimmedNote || null].filter(Boolean) as string[]
  return parts.length ? parts.join(': ') : null
}

/**
 * POST /api/loot-history/bulk
 *
 * Bulk insert loot history entries. Uses service role to bypass RLS
 * after verifying the caller has officer permissions.
 *
 * Body: { guild_id, items: Array<{ loot_item_id, raid_tier_id, raid_event_id, awarded_date, character_id?, character_name?, notes? }> }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, items } = body

    if (!guild_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'guild_id and items array are required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { hasPermission, error: permError } = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_loot')
    if (!hasPermission) {
      return NextResponse.json({ error: permError || 'Insufficient permissions' }, { status: 403 })
    }

    const results: { index: number; success: boolean; error?: string; id?: string }[] = []
    // Parallel array of sanitized award metadata, used by the audit-log pass below.
    const awardMeta: { reason: AwardReason | null; note: string | null; notes: string | null; decisionContext: Record<string, unknown> | null }[] = []

    // Look up expansion_id from raid_tier_id (first item's tier)
    let expansionId: string | null = null
    const firstTierId = items[0]?.raid_tier_id
    if (firstTierId) {
      const { data: tier } = await serviceSupabase
        .from('raid_tiers')
        .select('expansion_id')
        .eq('id', firstTierId)
        .single()
      expansionId = tier?.expansion_id || null
    }

    // Check BLP settings once (used after inserts). blp_includes_benched
    // mirrors the master sheet award flow (#101) so benched raiders get BLP
    // here too when the guild has the setting on.
    const { data: guildSettings } = await serviceSupabase
      .from('guild_settings')
      .select('blp_enabled, blp_includes_benched')
      .eq('guild_id', guild_id)
      .single()
    const blpEnabled = guildSettings?.blp_enabled === true
    const blpIncludesBenched = guildSettings?.blp_includes_benched === true

    for (let i = 0; i < items.length; i++) {
      const item = items[i]

      // Structured decision fields (new). All optional — old callers (bulk
      // imports) keep working with just `notes`.
      const rawReason = typeof item.reason === 'string' ? item.reason : null
      const reason: AwardReason | null = rawReason !== null && AWARD_REASON_VALUES.has(rawReason as AwardReason)
        ? (rawReason as AwardReason)
        : null
      const note = typeof item.note === 'string' ? item.note.slice(0, 500) : null
      const decisionContext = sanitizeDecisionContext(item.decision_context)
      // If the client sent structured reason/note, compose the human notes
      // string server-side so legacy read paths ("Recent awards" strip) still
      // get the familiar "Label: note" format. Otherwise honor `notes` as-is.
      const composedNotes = reason !== null || note !== null
        ? composeNotesFromReason(reason, note)
        : null
      const finalNotes = composedNotes ?? (typeof item.notes === 'string' ? item.notes : null)

      const insertData: Record<string, unknown> = {
        loot_item_id: item.loot_item_id,
        guild_id,
        raid_tier_id: item.raid_tier_id,
        raid_event_id: item.raid_event_id,
        awarded_date: item.awarded_date,
        awarded_by: user.id,
        notes: finalNotes,
        expansion_id: expansionId,
      }

      if (item.character_id) insertData.character_id = item.character_id
      if (item.character_name) insertData.character_name = item.character_name

      awardMeta.push({ reason, note, notes: finalNotes, decisionContext })

      const { data, error } = await serviceSupabase
        .from('loot_history')
        .insert(insertData)
        .select('id')
        .single()

      if (error) {
        results.push({
          index: i,
          success: false,
          error: error.code === '23505' ? 'duplicate' : error.message,
        })
      } else {
        results.push({ index: i, success: true, id: data?.id })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failedCount = results.filter(r => !r.success).length

    // Audit log and BLP updates for successful awards
    for (const result of results) {
      if (result.success && result.id) {
        const item = items[result.index]
        const meta = awardMeta[result.index]

        // Audit log — Award Decision Receipt: capture the *why* alongside the *what*.
        // reason/note/decision_context are only present for officer UI awards;
        // bulk-import callers persist a plain `notes` string and leave the rest null.
        logAudit({
          supabase: serviceSupabase,
          guildId: guild_id,
          tableName: 'loot_history',
          recordId: result.id,
          action: 'INSERT',
          userId: user.id,
          newData: {
            loot_item_id: item.loot_item_id,
            character_id: item.character_id,
            character_name: item.character_name,
            raid_event_id: item.raid_event_id,
            awarded_date: item.awarded_date,
            notes: meta?.notes ?? null,
            reason: meta?.reason ?? null,
            note: meta?.note ?? null,
            decision_context: meta?.decisionContext ?? null,
          },
        })

        // BLP: increment for non-winners, reset for winner (server-side)
        if (blpEnabled && item.character_id && item.loot_item_id && item.raid_event_id) {
          updateBLP(serviceSupabase, guild_id, item.loot_item_id, item.character_id, item.raid_event_id, blpIncludesBenched)
            .catch(err => console.error('BLP update failed:', err))
        }
      }
    }

    if (successCount > 0) {
      if (successCount === 1) {
        trackEvent({
          event: 'loot_item_awarded',
          userId: user.id,
          guildId: guild_id,
        })
      }
      trackEvent({
        event: 'loot_awarded_bulk',
        userId: user.id,
        guildId: guild_id,
        properties: { guild_id, success_count: successCount, failed_count: failedCount },
      })
      setUserMilestone(user.id, 'first_loot_awarded_at')

      // Discord announcement (fire-and-forget) — collapse to one embed for
      // bulk imports, one item per embed for single-item bulk requests.
      const announceQueue: LootAward[] = results
        .filter((r) => r.success)
        .map((r) => items[r.index])
        .filter((item) => item.loot_item_id && item.character_name)
        .map((item) => ({
          itemId: item.loot_item_id as string,
          characterName: item.character_name as string,
          raidEventId: (item.raid_event_id as string | null) ?? null,
        }))
      if (announceQueue.length > 0) {
        after(() => notifyLootAward(serviceSupabase, guild_id, announceQueue))
      }
    }

    return NextResponse.json({ results, successCount, failedCount })
  } catch (error) {
    console.error('Error in POST /api/loot-history/bulk:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/loot-history/bulk
 *
 * Delete loot history entries by raid_event_id or by specific IDs.
 * Uses service role to bypass RLS after verifying officer permissions.
 *
 * Body: { guild_id, raid_event_id? , ids?: string[] }
 */
export async function DELETE(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, raid_event_id, ids } = body

    if (!guild_id) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    if (!raid_event_id && (!ids || ids.length === 0)) {
      return NextResponse.json({ error: 'raid_event_id or ids required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { hasPermission, error: permError } = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_loot')
    if (!hasPermission) {
      return NextResponse.json({ error: permError || 'Insufficient permissions' }, { status: 403 })
    }

    if (raid_event_id) {
      // Read what we're about to delete for the audit log
      const { data: toDelete } = await serviceSupabase
        .from('loot_history')
        .select('id, loot_item_id, character_id, character_name')
        .eq('raid_event_id', raid_event_id)
        .eq('guild_id', guild_id)

      const { error } = await serviceSupabase
        .from('loot_history')
        .delete()
        .eq('raid_event_id', raid_event_id)
        .eq('guild_id', guild_id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Audit log each deleted entry
      for (const entry of toDelete || []) {
        logAudit({
          supabase: serviceSupabase,
          guildId: guild_id,
          tableName: 'loot_history',
          recordId: entry.id,
          action: 'DELETE',
          userId: user.id,
          oldData: { ...entry, raid_event_id },
        })
      }
    } else if (ids) {
      // Read what we're about to delete for the audit log
      const { data: toDelete } = await serviceSupabase
        .from('loot_history')
        .select('id, loot_item_id, character_id, character_name')
        .in('id', ids)
        .eq('guild_id', guild_id)

      const { error } = await serviceSupabase
        .from('loot_history')
        .delete()
        .in('id', ids)
        .eq('guild_id', guild_id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Audit log each deleted entry
      for (const entry of toDelete || []) {
        logAudit({
          supabase: serviceSupabase,
          guildId: guild_id,
          tableName: 'loot_history',
          recordId: entry.id,
          action: 'DELETE',
          userId: user.id,
          oldData: entry,
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/loot-history/bulk:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/loot-history/bulk
 *
 * Update a single loot history entry (reassign).
 * Uses service role to bypass RLS after verifying officer permissions.
 *
 * Body: { guild_id, id, updates: { character_id?, character_name?, notes? } }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, id, updates } = body

    if (!guild_id || !id || !updates) {
      return NextResponse.json({ error: 'guild_id, id, and updates are required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { hasPermission, error: permError } = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_loot')
    if (!hasPermission) {
      return NextResponse.json({ error: permError || 'Insufficient permissions' }, { status: 403 })
    }

    const allowedFields = ['character_id', 'character_name', 'notes']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in updates) sanitized[key] = updates[key]
    }

    // Read current state for audit log
    const { data: before } = await serviceSupabase
      .from('loot_history')
      .select('character_id, character_name, notes')
      .eq('id', id)
      .eq('guild_id', guild_id)
      .single()

    const { error } = await serviceSupabase
      .from('loot_history')
      .update(sanitized)
      .eq('id', id)
      .eq('guild_id', guild_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Audit log the reassignment
    logAudit({
      supabase: serviceSupabase,
      guildId: guild_id,
      tableName: 'loot_history',
      recordId: id,
      action: 'UPDATE',
      userId: user.id,
      oldData: before,
      newData: sanitized,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /api/loot-history/bulk:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Server-side BLP update after loot award.
 * Finds eligible characters (item ranked + attended raid),
 * increments BLP for non-winners, resets for the winner.
 */
async function updateBLP(
  supabase: ReturnType<typeof createServiceRoleClient>,
  guildId: string,
  lootItemId: string,
  winnerCharacterId: string,
  raidEventId: string,
  includesBenched: boolean,
) {
  // Find characters with this item in an approved submission
  const { data: submissionItems } = await supabase
    .from('loot_submission_items')
    .select(`
      loot_submissions!inner (
        character_id,
        status,
        guild_id
      )
    `)
    .eq('loot_item_id', lootItemId)
    .eq('loot_submissions.guild_id', guildId)
    .eq('loot_submissions.status', 'approved')
    .is('removed_at', null)

  if (!submissionItems?.length) return

  const charactersWithItem = new Set<string>()
  for (const item of submissionItems as unknown as { loot_submissions: { character_id: string } }[]) {
    if (item.loot_submissions?.character_id) {
      charactersWithItem.add(item.loot_submissions.character_id)
    }
  }

  if (charactersWithItem.size === 0) return

  // Filter to characters who attended this raid. When the guild opts to
  // include benched raiders, also count anyone marked benched for the raid
  // (matches /api/blp/update's behavior since #101).
  let query = supabase
    .from('attendance_records')
    .select('character_id')
    .eq('raid_event_id', raidEventId)
    .in('character_id', Array.from(charactersWithItem))

  query = includesBenched
    ? query.or('attended.eq.true,was_benched.eq.true')
    : query.eq('attended', true)

  const { data: attendanceRecords } = await query

  const eligible = attendanceRecords?.map(r => r.character_id) || []
  const nonWinners = eligible.filter(characterId => characterId !== winnerCharacterId)

  // Increment BLP for non-winners in one set-based round-trip. The
  // raid_event_id pins each credit so re-imports / duplicate loot_history
  // rows for the same (character, item, raid) are idempotent at the
  // journal layer (GH #98).
  if (nonWinners.length > 0) {
    await supabase.rpc('increment_blp_bulk', {
      p_guild_id: guildId,
      p_loot_item_id: lootItemId,
      p_raid_event_id: raidEventId,
      p_character_ids: nonWinners,
    })
  }

  // Reset winner's BLP
  await supabase.rpc('reset_blp', {
    p_guild_id: guildId,
    p_character_id: winnerCharacterId,
    p_loot_item_id: lootItemId,
  })
}
