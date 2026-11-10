// Award slot locks (quick task 261028-0gx).
//
// Once a raider receives an item that sits on their approved loot list, the
// rank and slot it held stay locked to that item for the rest of the tier.
// The awarded item keeps its allocation cost in its bracket, so the points it
// used stay spent without a ledger. Locks live in loot_list_slot_locks, not
// on loot_submission_items, because save_submission_items deletes and
// re-inserts every live row of a list on each save.
//
// Pure rules only: which awards lock, which list row a lock lands on, and
// which saved rows break a lock. The database function raises the same
// message for a direct RPC call, so the wording is shared here.

import { positionKey } from './list-row-updates'

/** The lock shape the API returns and the client keys by "{rank}-{slot}". */
export interface ListSlotLock {
  rank: number
  slot: number
  loot_item_id: string
  locked_at: string
}

export interface LockCandidateRow {
  rank: number
  slot: number
  loot_item_id: string
}

export interface LockedPosition {
  rank: number
  slot: number
  loot_item_id: string
  item_name: string
}

export interface ListPosition {
  rank: number | string
  slot: number | string
  loot_item_id: string | null
}

export interface LockViolation {
  rank: number
  slot: number
  item_name: string
}

export const LOCKED_RANK_LABEL = 'Locked rank'

// Off-spec and roll awards never lock (owner scope D3). Awards that carry no
// reason (addon awards) do lock.
const LOCKING_AWARD_REASONS: ReadonlySet<string> = new Set(['', 'score', 'loot_council', 'override'])

export function shouldLockForReason(reason: string | null | undefined): boolean {
  if (reason === null || reason === undefined) return true
  return LOCKING_AWARD_REASONS.has(reason)
}

/**
 * The live list row an award locks: copy 1 is the highest-ranked row of the
 * item, copy 2 the next one down (rank descending, then slot ascending, the
 * same tie-break the remove-item route uses). When that row already holds a
 * lock, a second award of the item on another night would collide with it,
 * so the highest-ranked unlocked row is used instead. Never mutates the input.
 */
export function pickLockTarget<T extends LockCandidateRow>(
  liveRows: readonly T[],
  lootItemId: string,
  awardCopy: number,
  lockedKeys?: ReadonlySet<string>,
): T | null {
  if (!Number.isInteger(awardCopy) || awardCopy < 1) return null

  const sorted = liveRows
    .filter(row => row.loot_item_id === lootItemId)
    .sort((a, b) => Number(b.rank) - Number(a.rank) || Number(a.slot) - Number(b.slot))

  const numbered = sorted[awardCopy - 1]
  if (!numbered) return null
  if (!lockedKeys?.has(positionKey(Number(numbered.rank), Number(numbered.slot)))) return numbered

  return sorted.find(row => !lockedKeys.has(positionKey(Number(row.rank), Number(row.slot)))) ?? null
}

/**
 * The locks a set of live rows no longer satisfies. A lock holds while a live
 * row has the same rank, slot and item. Ordered rank descending then slot
 * ascending, because the SQL function raises the first of this order.
 */
export function findLockViolations(
  locks: readonly LockedPosition[],
  liveItems: readonly ListPosition[],
): LockViolation[] {
  const liveKeys = new Set<string>()
  for (const item of liveItems) {
    if (!item.loot_item_id) continue
    liveKeys.add(`${positionKey(Number(item.rank), Number(item.slot))}:${item.loot_item_id}`)
  }

  return locks
    .filter(lock => !liveKeys.has(`${positionKey(Number(lock.rank), Number(lock.slot))}:${lock.loot_item_id}`))
    .map(lock => ({ rank: Number(lock.rank), slot: Number(lock.slot), item_name: lock.item_name }))
    .sort((a, b) => b.rank - a.rank || a.slot - b.slot)
}

/** The refusal message, identical in save_submission_items and every route. */
export function lockViolationMessage(violation: { rank: number; item_name: string }): string {
  return `Rank ${violation.rank} is locked to ${violation.item_name}`
}

/** Hover text for the lock icon in the editor and officer review. */
export function lockedRankTitle(lockedAt: string): string {
  const date = new Date(lockedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `Awarded from this rank on ${date}. Locked for this tier.`
}
