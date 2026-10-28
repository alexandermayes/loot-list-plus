// Service-role reads and writes for loot_list_slot_locks (quick task 261028-0gx).
//
// The table is written only here, through the service role: browser sessions
// can read it (RLS) but never write it. Lock creation runs after an award has
// already been saved, so lockAwardedSlots and releaseSlotLocksForAward never
// reject: an award must not fail because its lock could not be written. The
// readers used by enforcement routes do reject, so a failed read returns a
// 500 instead of silently skipping the check.
//
// console calls keep a constant first argument and pass error codes only, so
// CodeQL's tainted format string rule stays quiet and no ids reach the logs.

import type { SupabaseClient } from '@supabase/supabase-js'
import { positionKey } from '@/domain/loot/list-row-updates'
import { pickLockTarget, shouldLockForReason, type ListSlotLock } from '@/domain/loot/slot-locks'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryClient = SupabaseClient<any, any, any>

export type SlotLockReleaseReason = 'removed_by_officer' | 'award_reassigned'

export interface ActiveSlotLock extends ListSlotLock {
  id: string
  item_name: string
}

export interface SlotLockAward {
  lootHistoryId: string
  /** The award reason from the request; null for addon awards, which carry none. */
  reason?: string | null
}

const ITEM_NAME_FALLBACK = 'an awarded item'

interface HistoryRow {
  id: string
  character_id: string | null
  loot_item_id: string
  award_copy: number | null
}

/**
 * Locks, for each new award, the rank and slot the awarded item held on the
 * raider's one approved list. Locks nothing when the guild setting is off,
 * the award is off-spec or a roll, the raider has no approved list, the item
 * is on two approved lists of the character, or no live row matches the
 * award copy. Resolves the number of locks written; never rejects.
 */
export async function lockAwardedSlots(
  serviceClient: QueryClient,
  guildId: string,
  awards: readonly SlotLockAward[],
): Promise<number> {
  try {
    const kept = awards.filter(award => award.lootHistoryId && shouldLockForReason(award.reason))
    if (kept.length === 0) return 0

    const { data: settings, error: settingsError } = await serviceClient
      .from('guild_settings')
      .select('award_slot_lock_enabled')
      .eq('guild_id', guildId)
      .maybeSingle()
    if (settingsError) {
      console.error('slot-locks: guild_settings read failed', settingsError.code)
      return 0
    }
    if (settings?.award_slot_lock_enabled !== true) return 0

    const { data: historyData, error: historyError } = await serviceClient
      .from('loot_history')
      .select('id, character_id, loot_item_id, award_copy')
      .eq('guild_id', guildId)
      .in('id', kept.map(award => award.lootHistoryId))
    if (historyError) {
      console.error('slot-locks: loot_history read failed', historyError.code)
      return 0
    }
    const historyById = new Map<string, HistoryRow>(
      ((historyData ?? []) as HistoryRow[]).map(row => [row.id, row]),
    )

    // Input order matters: copy 1 locks before copy 2 when one request awards
    // two copies of the same item.
    let locked = 0
    for (const award of kept) {
      try {
        const history = historyById.get(award.lootHistoryId)
        if (!history || !history.character_id) continue
        if (await lockOneAward(serviceClient, guildId, award.lootHistoryId, history)) locked += 1
      } catch (error) {
        console.error('slot-locks: lock failed', errorCode(error))
      }
    }
    return locked
  } catch (error) {
    console.error('slot-locks: lockAwardedSlots failed', errorCode(error))
    return 0
  }
}

async function lockOneAward(
  client: QueryClient,
  guildId: string,
  lootHistoryId: string,
  history: HistoryRow,
): Promise<boolean> {
  // The approved list is found item-first (like master-sheet-summary):
  // loot_submissions.raid_tier_id is legacy and the editor never writes it.
  const { data: submissions, error: submissionsError } = await client
    .from('loot_submissions')
    .select('id')
    .eq('guild_id', guildId)
    .eq('character_id', history.character_id)
    .eq('status', 'approved')
  if (submissionsError) {
    console.error('slot-locks: loot_submissions read failed', submissionsError.code)
    return false
  }
  const submissionIds = ((submissions ?? []) as Array<{ id: string }>).map(row => row.id)
  if (submissionIds.length === 0) return false

  const { data: items, error: itemsError } = await client
    .from('loot_submission_items')
    .select('id, submission_id, rank, slot, loot_item_id')
    .in('submission_id', submissionIds)
    .eq('loot_item_id', history.loot_item_id)
    .is('removed_at', null)
  if (itemsError) {
    console.error('slot-locks: loot_submission_items read failed', itemsError.code)
    return false
  }
  const rows = (items ?? []) as Array<{ id: string; submission_id: string; rank: number; slot: number; loot_item_id: string }>
  if (rows.length === 0) return false

  // An ambiguous list is never locked: guessing the wrong list would pin an
  // item on a list the raider is not using.
  const listIds = new Set(rows.map(row => row.submission_id))
  if (listIds.size > 1) {
    console.warn('slot-locks: item is on more than one approved list, no lock written')
    return false
  }
  const submissionId = rows[0].submission_id

  const { data: existing, error: existingError } = await client
    .from('loot_list_slot_locks')
    .select('rank, slot')
    .eq('submission_id', submissionId)
    .is('released_at', null)
  if (existingError) {
    console.error('slot-locks: lock read failed', existingError.code)
    return false
  }
  const lockedKeys = new Set(
    ((existing ?? []) as Array<{ rank: number; slot: number }>).map(lock => positionKey(Number(lock.rank), Number(lock.slot))),
  )

  const target = pickLockTarget(rows, history.loot_item_id, history.award_copy ?? 1, lockedKeys)
  if (!target) return false

  const { error: upsertError } = await client
    .from('loot_list_slot_locks')
    .upsert(
      {
        guild_id: guildId,
        submission_id: submissionId,
        character_id: history.character_id,
        loot_item_id: history.loot_item_id,
        rank: target.rank,
        slot: target.slot,
        loot_history_id: lootHistoryId,
      },
      { onConflict: 'loot_history_id', ignoreDuplicates: true },
    )
  if (upsertError) {
    console.error('slot-locks: lock insert failed', upsertError.code)
    return false
  }
  return true
}

/**
 * The live locks of one list, rank descending, with the item name the
 * refusal message needs. Rejects on a read error: enforcement routes return
 * a 500 rather than skip the check, readers that can degrade catch it.
 */
export async function fetchActiveSlotLocks(client: QueryClient, submissionId: string): Promise<ActiveSlotLock[]> {
  const { data, error } = await client
    .from('loot_list_slot_locks')
    .select('id, rank, slot, loot_item_id, locked_at, loot_items(name)')
    .eq('submission_id', submissionId)
    .is('released_at', null)
    .order('rank', { ascending: false })
  if (error) {
    console.error('slot-locks: fetch failed', error.code)
    throw new Error('Failed to read loot list slot locks')
  }

  type Embed = { name: string | null } | Array<{ name: string | null }> | null
  return ((data ?? []) as Array<{
    id: string
    rank: number
    slot: number
    loot_item_id: string
    locked_at: string
    loot_items: Embed
  }>).map(row => {
    const embed = Array.isArray(row.loot_items) ? row.loot_items[0] : row.loot_items
    return {
      id: row.id,
      rank: Number(row.rank),
      slot: Number(row.slot),
      loot_item_id: row.loot_item_id,
      locked_at: row.locked_at,
      item_name: embed?.name || ITEM_NAME_FALLBACK,
    }
  })
}

/** Releases one live lock. Rejects on an error so the caller can stop before it changes the list. */
export async function releaseSlotLock(
  client: QueryClient,
  lockId: string,
  userId: string,
  reason: SlotLockReleaseReason,
): Promise<void> {
  const { error } = await client
    .from('loot_list_slot_locks')
    .update({ released_at: new Date().toISOString(), released_by: userId, release_reason: reason })
    .eq('id', lockId)
    .is('released_at', null)
  if (error) {
    console.error('slot-locks: release failed', error.code)
    throw new Error('Failed to release loot list slot lock')
  }
}

/** Releases the live lock an award created, if any. Resolves the row count; never rejects. */
export async function releaseSlotLocksForAward(
  client: QueryClient,
  lootHistoryId: string,
  userId: string,
  reason: SlotLockReleaseReason,
): Promise<number> {
  try {
    const { data, error } = await client
      .from('loot_list_slot_locks')
      .update({ released_at: new Date().toISOString(), released_by: userId, release_reason: reason })
      .eq('loot_history_id', lootHistoryId)
      .is('released_at', null)
      .select('id')
    if (error) {
      console.error('slot-locks: release for award failed', error.code)
      return 0
    }
    return (data ?? []).length
  } catch (error) {
    console.error('slot-locks: release for award threw', errorCode(error))
    return 0
  }
}

function errorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) return String((error as { code: unknown }).code)
  return 'unknown'
}
