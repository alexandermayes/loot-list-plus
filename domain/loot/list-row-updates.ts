// Per-row updates after removing or restoring one copy of an item (GH #293, #331, #354).
//
// A loot list can hold two copies of one item (a non-unique ring, a token
// listed per gear slot). Removing or restoring one copy must update only that
// cell, so local state is updated by position (rank and slot), not by item id.
//
// Since #354 a removed row and a live row can share a rank and slot (the
// database's partial unique index only guards rows that are not removed), so
// the officer review grouping and the remove/restore preference below pick
// the live row first and otherwise the most recently removed row.

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

/** Indices of every row matching `target`, in input order. */
function matchingIndices<T extends DetailRow>(rows: readonly T[], target: DetailTarget): number[] {
  const indices: number[] = []
  rows.forEach((row, i) => {
    if (matches(row, target)) indices.push(i)
  })
  return indices
}

/** Among `indices`, the one whose row has the latest `removed_at` (ties and
 * unparsable values keep input order, i.e. the earliest matching index). */
function latestRemovedIndex<T extends { removed_at?: string | null }>(rows: readonly T[], indices: number[]): number {
  let best = indices[0]
  let bestTime = Date.parse(rows[best]?.removed_at ?? '')
  for (let k = 1; k < indices.length; k++) {
    const i = indices[k]
    const time = Date.parse(rows[i]?.removed_at ?? '')
    if (!Number.isNaN(time) && (Number.isNaN(bestTime) || time > bestTime)) {
      best = i
      bestTime = time
    }
  }
  return best
}

/**
 * The rows minus the single row of the targeted copy. Since #354 a removed
 * row and a live row can share a position: among the matches, prefers the
 * row with no removed_at (the live one, which is what the officer modal
 * shows and what a remove acts on); falls back to the first match.
 */
export function withoutDetailRow<T extends DetailRow & { removed_at?: string | null }>(
  rows: readonly T[],
  target: DetailTarget,
): T[] {
  const indices = matchingIndices(rows, target)
  if (indices.length === 0) return [...rows]
  const liveIndex = indices.find(i => !rows[i].removed_at)
  const index = liveIndex !== undefined ? liveIndex : indices[0]
  return [...rows.slice(0, index), ...rows.slice(index + 1)]
}

/**
 * The rows with only the targeted copy copied with removed_at null. Since
 * #354 a removed row and a live row can share a position: among the
 * matches, prefers the most recently removed row (restoring a live row
 * would be a no-op); falls back to the first match.
 */
export function restoreDetailRow<T extends DetailRow & { removed_at?: string | null }>(
  rows: readonly T[],
  target: DetailTarget,
): T[] {
  const indices = matchingIndices(rows, target)
  let index = indices.length > 0 ? indices[0] : -1
  if (indices.length > 1) {
    const removedIndices = indices.filter(i => rows[i].removed_at)
    if (removedIndices.length > 0) index = latestRemovedIndex(rows, removedIndices)
  }
  return rows.map((row, i) => (i === index ? { ...row, removed_at: null } : row))
}

/**
 * Groups detail rows into one cell per rank and slot (GH #354): a removed
 * row and a live row can now share a position, so the officer review modal
 * must show the live row, falling back to the most recently removed row
 * when every row at that position is removed. Rows with another slot value
 * are ignored. Ranks are returned descending; the input is never mutated.
 */
export function groupDetailRowsByRank<T extends DetailRow & { removed_at?: string | null }>(
  rows: readonly T[],
): Array<{ rank: number; slot1?: T; slot2?: T }> {
  const byRank = new Map<number, { slot1: T[]; slot2: T[] }>()
  for (const row of rows) {
    const rank = Number(row.rank)
    const slot = Number(row.slot)
    if (slot !== 1 && slot !== 2) continue
    if (!byRank.has(rank)) byRank.set(rank, { slot1: [], slot2: [] })
    const bucket = byRank.get(rank) as { slot1: T[]; slot2: T[] }
    if (slot === 1) bucket.slot1.push(row)
    else bucket.slot2.push(row)
  }

  const pickCell = (candidates: T[]): T | undefined => {
    if (candidates.length === 0) return undefined
    const live = candidates.find(row => !row.removed_at)
    if (live) return live
    const indices = candidates.map((_, i) => i)
    return candidates[latestRemovedIndex(candidates, indices)]
  }

  return Array.from(byRank.entries())
    .sort(([a], [b]) => b - a)
    .map(([rank, { slot1, slot2 }]) => ({ rank, slot1: pickCell(slot1), slot2: pickCell(slot2) }))
}
