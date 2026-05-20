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
}

export interface ReceiveSkipItemRankings<R extends ReceiveSkipRanking> {
  item: { wowhead_id: number }
  rankings: R[]
}

/**
 * @param tierResults  Flattened list of `{ item, rankings }` across every tier.
 * @param receivedByCharAndWowhead  Map of `${character_id}-${wowhead_id}` ->
 *   number of times the character has been awarded that wowhead.
 * @returns A new array with the same shape; ranking entries for awarded
 *   characters are removed in `rank` descending order (their top picks go
 *   first, mirroring the legacy per-tier skip semantics).
 */
export function applyGlobalReceiveSkip<R extends ReceiveSkipRanking, T extends ReceiveSkipItemRankings<R>>(
  tierResults: readonly T[],
  receivedByCharAndWowhead: ReadonlyMap<string, number>,
): T[] {
  if (receivedByCharAndWowhead.size === 0) return tierResults.slice()

  type Indexed = { ranking: R; wowheadId: number }
  const groups = new Map<string, Indexed[]>()
  for (const ir of tierResults) {
    const wowheadId = ir.item.wowhead_id
    for (const ranking of ir.rankings) {
      const key = `${ranking.character_id}-${wowheadId}`
      let bucket = groups.get(key)
      if (!bucket) {
        bucket = []
        groups.set(key, bucket)
      }
      bucket.push({ ranking, wowheadId })
    }
  }

  const toRemove = new Set<R>()
  for (const [key, bucket] of groups) {
    const received = receivedByCharAndWowhead.get(key) || 0
    if (received <= 0) continue
    bucket.sort((a, b) => b.ranking.rank - a.ranking.rank)
    for (let i = 0; i < received && i < bucket.length; i++) {
      toRemove.add(bucket[i].ranking)
    }
  }

  if (toRemove.size === 0) return tierResults.slice()
  return tierResults.map(ir => ({
    ...ir,
    rankings: ir.rankings.filter(r => !toRemove.has(r)),
  })) as T[]
}
