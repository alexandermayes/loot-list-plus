import { NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { logAudit } from '@/utils/audit/log'
import { trackEvent, trackApiError } from '@/utils/analytics/server'
import { toDateString } from '@/utils/date'
import { resolveGuildLootItemIds, formatInvalidLootItemIdsError, type GuildScopedLootItem } from '@/lib/loot/guild-scoped-lookup'
import { buildRemoveItemHistoryRow } from '@/lib/loot/loot-history-rows'
import type { SupabaseClient } from '@supabase/supabase-js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryClient = SupabaseClient<any, any, any>

/**
 * Resolves loot_item_id to a row owned by guildId (GH #297 D-07): the
 * guild-owned scope from resolveGuildLootItemIds, plus name and
 * wowhead_id read filtered by both id and the resolved raid_tier_id, so
 * every loot_items query in this route carries a guild-owned tier filter.
 * Returns null when the guild does not own this loot_item_id.
 *
 * Throws if the name/wowhead_id query errors (see guild-scoped-lookup.ts
 * module doc for why errors are never swallowed).
 */
async function loadGuildLootItem(
  supabase: QueryClient,
  guildId: string,
  lootItemId: string
): Promise<(GuildScopedLootItem & { name: string; wowhead_id: number | null }) | null> {
  const { resolved } = await resolveGuildLootItemIds(supabase, guildId, [lootItemId])
  const scope = resolved.get(lootItemId)
  if (!scope) return null

  const { data, error } = await supabase
    .from('loot_items')
    .select('id, name, wowhead_id')
    .eq('id', scope.id)
    .eq('raid_tier_id', scope.raid_tier_id)
    .single()

  if (error) {
    throw new Error(`Failed to load loot_items row ${lootItemId} (guild ${guildId}): ${error.message}`)
  }
  if (!data) return null

  return { ...scope, name: data.name, wowhead_id: data.wowhead_id }
}

interface SubmissionItemRow {
  id: string
  rank: number
  slot: number | string
  loot_item_id: string
  removed_at: string | null
}

type TargetPick = { row: SubmissionItemRow } | { error: string; status: number }

const NOT_FOUND_ERROR = 'Item not found in this submission'
const ALREADY_REMOVED_ERROR = 'Item already removed'
const NOT_REMOVED_ERROR = 'Item is not removed'
const RESTORE_POSITION_TAKEN_ERROR = 'Another item is now at this rank and slot. Remove or move it first, then try again.'

/**
 * Picks the one loot_submission_items row to act on (GH #293, GH #354): a
 * list can hold two copies of an item, and removing or restoring one must
 * leave the other alone. Since #354 a removed row and a live row can share
 * a rank and slot (the partial unique index only guards live rows), so with
 * a position the route picks the row that matches the requested action: the
 * live row for remove, the most recently removed row for restore. Without a
 * position, the best-ranked candidate (rank descending, then slot
 * ascending) among the rows matching that action. `rows` are already
 * filtered by submission_id and loot_item_id.
 */
function pickTargetRow(
  rows: readonly SubmissionItemRow[],
  position: { rank: number; slot: number } | null,
  mode: 'remove' | 'restore'
): TargetPick {
  if (position) {
    const atPosition = rows.filter(r => Number(r.rank) === position.rank && Number(r.slot) === position.slot)
    if (atPosition.length === 0) return { error: NOT_FOUND_ERROR, status: 404 }
    if (mode === 'remove') {
      const row = atPosition.find(r => !r.removed_at)
      if (!row) return { error: ALREADY_REMOVED_ERROR, status: 400 }
      return { row }
    }
    const removedRows = atPosition
      .filter(r => r.removed_at)
      .sort((a, b) => (Date.parse(b.removed_at as string) || 0) - (Date.parse(a.removed_at as string) || 0))
    if (removedRows.length === 0) return { error: NOT_REMOVED_ERROR, status: 400 }
    return { row: removedRows[0] }
  }

  const candidates = rows
    .filter(r => (mode === 'remove' ? !r.removed_at : !!r.removed_at))
    .sort((a, b) => Number(b.rank) - Number(a.rank) || Number(a.slot) - Number(b.slot))
  if (candidates.length === 0) {
    return { error: mode === 'remove' ? ALREADY_REMOVED_ERROR : NOT_REMOVED_ERROR, status: 400 }
  }
  return { row: candidates[0] }
}

/**
 * POST /api/loot-submissions/remove-item
 *
 * Surgically removes a single item from an approved loot submission
 * without changing the submission's approved status.
 *
 * Allowed by: the character owner OR any officer in the guild.
 *
 * Body: {
 *   guild_id: string,
 *   submission_id: string,
 *   loot_item_id: string,
 *   reason?: string,
 *   already_obtained?: boolean  // If true, inserts into loot_history
 *   restore?: boolean           // If true, undoes a removal
 *   rank?: number, slot?: number  // The one row to act on (GH #293); when
 *                                 // absent, the best-ranked matching row
 * }
 *
 * GH #297: every loot_items lookup is scoped to the calling guild via
 * loadGuildLootItem. When already_obtained is set, the loot_history row is
 * built by buildRemoveItemHistoryRow (typed, carries raid_tier_id and
 * expansion_id from the guild-scoped item) instead of an inline untyped
 * insert. An item the guild does not own is rejected with 400 before the
 * soft delete.
 *
 * GH #354: a restore returns 409 when another item now holds that rank and
 * slot (the partial unique index on live rows refuses the update).
 */
export async function POST(request: Request) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, submission_id, loot_item_id, reason, already_obtained, restore, rank, slot } = body
    const position = rank != null || slot != null
      ? { rank: Number(rank), slot: Number(slot) }
      : null

    if (!guild_id || !submission_id || !loot_item_id) {
      return NextResponse.json(
        { error: 'guild_id, submission_id, and loot_item_id are required' },
        { status: 400 }
      )
    }

    const serviceSupabase = createServiceRoleClient()

    // Fetch the submission to verify it exists and is approved
    const { data: submission, error: subError } = await serviceSupabase
      .from('loot_submissions')
      .select('id, guild_id, character_id, status, expansion_id')
      .eq('id', submission_id)
      .eq('guild_id', guild_id)
      .single()

    if (subError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 })
    }

    if (submission.status !== 'approved' && !restore) {
      return NextResponse.json(
        { error: 'Can only remove items from approved submissions. Edit the list directly instead.' },
        { status: 400 }
      )
    }

    // Permission check: character owner OR officer
    let isOwner = false
    const { data: character } = await serviceSupabase
      .from('characters')
      .select('id, user_id, name')
      .eq('id', submission.character_id)
      .single()

    if (character?.user_id === user.id) {
      isOwner = true
    }

    if (!isOwner) {
      const { hasPermission } = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_submissions')
      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Only the list owner or officers can remove items' },
          { status: 403 }
        )
      }
    }

    // Fetch the item row(s)
    const { data: itemRows } = await serviceSupabase
      .from('loot_submission_items')
      .select('id, rank, slot, loot_item_id, removed_at')
      .eq('submission_id', submission_id)
      .eq('loot_item_id', loot_item_id)

    if (!itemRows || itemRows.length === 0) {
      return NextResponse.json({ error: NOT_FOUND_ERROR }, { status: 404 })
    }
    const rows = itemRows as SubmissionItemRow[]

    // Handle restore (undo removal)
    if (restore) {
      const pick = pickTargetRow(rows, position, 'restore')
      if ('error' in pick) {
        return NextResponse.json({ error: pick.error }, { status: pick.status })
      }
      const target = pick.row

      const { error: restoreError } = await serviceSupabase
        .from('loot_submission_items')
        .update({ removed_at: null, removed_by: null })
        .eq('id', target.id)

      if (restoreError) {
        if (restoreError.code === '23505') {
          return NextResponse.json({ error: RESTORE_POSITION_TAKEN_ERROR }, { status: 409 })
        }
        console.error('Error restoring item:', restoreError)
        return NextResponse.json({ error: 'Couldn\'t restore item. Try again.' }, { status: 500 })
      }

      const lootItem = await loadGuildLootItem(serviceSupabase, guild_id, loot_item_id)

      await logAudit({
        supabase: serviceSupabase,
        guildId: guild_id,
        tableName: 'loot_submission_items',
        recordId: submission_id,
        action: 'UPDATE',
        userId: user.id,
        oldData: { removed_at: target.removed_at, item_name: lootItem?.name, rank: target.rank },
        newData: { removed_at: null, item_name: lootItem?.name, restored: true },
      })

      return NextResponse.json({
        success: true,
        restored: true,
        item_name: lootItem?.name || 'Unknown',
      })
    }

    const pick = pickTargetRow(rows, position, 'remove')
    if ('error' in pick) {
      return NextResponse.json({ error: pick.error }, { status: pick.status })
    }
    const target = pick.row

    // Fetch item details for audit log and loot_history, scoped to this
    // guild (GH #297 D-07).
    const lootItem = await loadGuildLootItem(serviceSupabase, guild_id, loot_item_id)

    // An unowned item is rejected before the soft delete only when
    // already_obtained would otherwise insert an unscoped loot_history row
    // (PD-06). Without already_obtained, removal proceeds as today and the
    // response/audit name falls back to "Unknown".
    if (already_obtained && !lootItem) {
      return NextResponse.json(
        {
          error: formatInvalidLootItemIdsError([loot_item_id]),
          invalid_loot_item_ids: [loot_item_id],
        },
        { status: 400 }
      )
    }

    // Mark the one row as removed (soft delete) instead of deleting. The
    // removed_at guard keeps a concurrent removal from being stamped twice.
    const { error: updateError } = await serviceSupabase
      .from('loot_submission_items')
      .update({ removed_at: new Date().toISOString(), removed_by: user.id })
      .eq('id', target.id)
      .is('removed_at', null)

    if (updateError) {
      console.error('Error removing item from submission:', updateError)
      return NextResponse.json({ error: 'Couldn\'t remove item. Try again.' }, { status: 500 })
    }

    // If the raider already has the item, record it in loot_history with a
    // typed, guild-scoped row carrying expansion_id from the item's own
    // raid tier (GH #297 D-06).
    let historyRecorded: boolean | undefined
    if (already_obtained && character && lootItem) {
      const { error: historyError } = await serviceSupabase
        .from('loot_history')
        .insert(buildRemoveItemHistoryRow({
          guildId: guild_id,
          item: lootItem,
          characterId: submission.character_id,
          characterName: character.name,
          awardedBy: user.id,
          reason: typeof reason === 'string' ? reason : null,
          today: toDateString(new Date()),
        }))

      if (historyError) {
        // Fixed first argument (never request data) so CodeQL's tainted
        // format string rule does not flag this — the route already
        // removed the item, so this is reported, not thrown.
        console.error('remove-item: loot_history insert failed', historyError)
        trackApiError(user.id, 'POST /api/loot-submissions/remove-item', new Error(historyError.message))
        historyRecorded = false
      } else {
        historyRecorded = true
      }
    }

    // Audit log
    await logAudit({
      supabase: serviceSupabase,
      guildId: guild_id,
      tableName: 'loot_submission_items',
      recordId: submission_id,
      action: 'DELETE',
      userId: user.id,
      oldData: {
        item_name: lootItem?.name || 'Unknown',
        wowhead_id: lootItem?.wowhead_id,
        character_name: character?.name || 'Unknown',
        character_id: submission.character_id,
        ranks: [target.rank],
        reason: reason || null,
        already_obtained: !!already_obtained,
        removed_by_owner: isOwner,
      },
    })

    // Analytics
    await trackEvent({
      event: 'loot_item_removed_from_list',
      userId: user.id,
      guildId: guild_id,
      properties: {
        guild_id,
        submission_id,
        loot_item_id,
        item_name: lootItem?.name,
        character_name: character?.name,
        already_obtained: !!already_obtained,
        removed_by: isOwner ? 'owner' : 'officer',
      },
    })

    return NextResponse.json({
      success: true,
      item_name: lootItem?.name || 'Unknown',
      ranks_removed: [target.rank],
      ...(already_obtained ? { history_recorded: historyRecorded ?? false } : {}),
    })
  } catch (error) {
    console.error('Error in remove-item:', error)
    trackApiError('unknown', 'POST /api/loot-submissions/remove-item', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
