/**
 * Remove ranking entries for characters who have already been awarded the
 * underlying physical item (matched by `wowhead_id`), applied globally across
 * a flattened list of tier results.
 *
 * Why this is its own helper: the master-sheet Gargul export fetches rankings
 * per-tier via `Promise.all`. Each per-tier fetch used to build its own skip
 * map from loot history and filter rankings inside that tier — which double-
 * counted awards for items that drop in more than one raid (e.g. Nether
 * Vortex from SSC + TK share wowhead 30183). One award would skip the
 * character in BOTH tiers' fetches, removing them from the prio entirely
 * even though they ranked twice (wanting two drops). Applying the skip
 * globally after concatenation guarantees one award removes exactly one
 * ranking — the character's highest-ranked entry across all tiers.
 */

export interface ReceiveSkipRanking {
  character_id: string
  rank: number
  slot?: number | null
}

export interface ReceiveSkipItemRankings<R extends ReceiveSkipRanking> {
  item: { wowhead_id: number }
  rankings: R[]
}

/**
 * The entries an award skips: per key, the first N entries by rank
 * descending then slot ascending, where N is the received count for that key.
 * Shared by applyGlobalReceiveSkip and the master sheet, so a raider with two
 * copies of one item on their list (GH #293) loses their best-ranked copy,
 * across every row of the item, for each award.
 */
export function pickReceivedEntries<E extends { key: string; rank: number; slot?: number | null }>(
  entries: readonly E[],
  receivedByKey: ReadonlyMap<string, number>,
): Set<E> {
  const picked = new Set<E>()
  if (receivedByKey.size === 0) return picked

  const groups = new Map<string, E[]>()
  for (const entry of entries) {
    if (!receivedByKey.get(entry.key)) continue
    const group = groups.get(entry.key)
    if (group) group.push(entry)
    else groups.set(entry.key, [entry])
  }

  for (const [key, group] of groups) {
    const received = receivedByKey.get(key) || 0
    group.sort((a, b) => b.rank - a.rank || (a.slot ?? 0) - (b.slot ?? 0))
    for (let i = 0; i < received && i < group.length; i++) picked.add(group[i])
  }
  return picked
}

/**
 * @param tierResults  Flattened list of `{ item, rankings }` across every tier.
 * @param receivedByCharAndWowhead  Map of `${character_id}-${wowhead_id}` ->
 *   number of times the character has been awarded that wowhead.
 * @returns A new array with the same shape; ranking entries for awarded
 *   characters are removed in `rank` descending order, slot 1 before slot 2
 *   on a tie (their top picks go first, mirroring the legacy per-tier skip
 *   semantics).
 */
export function applyGlobalReceiveSkip<R extends ReceiveSkipRanking, T extends ReceiveSkipItemRankings<R>>(
  tierResults: readonly T[],
  receivedByCharAndWowhead: ReadonlyMap<string, number>,
): T[] {
  if (receivedByCharAndWowhead.size === 0) return tierResults.slice()

  const entries = tierResults.flatMap(ir => ir.rankings.map(ranking => ({
    key: `${ranking.character_id}-${ir.item.wowhead_id}`,
    rank: ranking.rank,
    slot: ranking.slot,
    ranking,
  })))
  const toRemove = new Set([...pickReceivedEntries(entries, receivedByCharAndWowhead)].map(e => e.ranking))

  if (toRemove.size === 0) return tierResults.slice()
  return tierResults.map(ir => ({
    ...ir,
    rankings: ir.rankings.filter(r => !toRemove.has(r)),
  })) as T[]
}
