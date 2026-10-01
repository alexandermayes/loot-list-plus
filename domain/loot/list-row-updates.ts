// Per-row updates after removing or restoring one copy of an item (GH #293, #331).
//
// A loot list can hold two copies of one item (a non-unique ring, a token
// listed per gear slot). Removing or restoring one copy must update only that
// cell, so local state is updated by position (rank and slot), not by item id.

/** The rankings key format, "{rank}-{slot}"; also the raider's removingItemId. */
export function positionKey(rank: number, slot: number): string {
  return `${rank}-${slot}`
}

/**
 * Rankings without the copy at `position` when it holds `lootItemId`. With no
 * position, without every copy of the item (legacy fallback). Never mutates
 * the input.
 */
export function removeRankingAt(
  rankings: Record<string, string>,
  lootItemId: string,
  position?: { rank: number; slot: number },
): Record<string, string> {
  if (position) {
    const key = positionKey(position.rank, position.slot)
    if (rankings[key] !== lootItemId) return { ...rankings }
    const next = { ...rankings }
    delete next[key]
    return next
  }
  const next: Record<string, string> = {}
  for (const [key, id] of Object.entries(rankings)) {
    if (id !== lootItemId) next[key] = id
  }
  return next
}

/** One copy of an item in the officer review; also its removingItemId. */
export function detailRowKey(lootItemId: string, rank: number, slot: number): string {
  return `${lootItemId}-${rank}-${slot}`
}

interface DetailRow {
  rank: number
  slot: number
  loot_item?: { id: string } | null
}

interface DetailTarget {
  lootItemId: string
  rank: number
  slot: number
}

function matches(row: DetailRow, target: DetailTarget): boolean {
  return row.loot_item?.id === target.lootItemId
    && Number(row.rank) === target.rank
    && Number(row.slot) === target.slot
}

/** The rows minus the single row of the targeted copy. */
export function withoutDetailRow<T extends DetailRow>(rows: readonly T[], target: DetailTarget): T[] {
  const index = rows.findIndex(row => matches(row, target))
  if (index === -1) return [...rows]
  return [...rows.slice(0, index), ...rows.slice(index + 1)]
}

/** The rows with only the targeted copy copied with removed_at null. */
export function restoreDetailRow<T extends DetailRow & { removed_at?: string | null }>(
  rows: readonly T[],
  target: DetailTarget,
): T[] {
  const index = rows.findIndex(row => matches(row, target))
  return rows.map((row, i) => (i === index ? { ...row, removed_at: null } : row))
}
