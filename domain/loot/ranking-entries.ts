// Ranking entries when one raider lists an item more than once (GH #293, #331).
//
// A raider can hold two entries for one item (a non-unique ring twice, a
// token for main spec and off-spec). Views must key entries per entry, not per
// raider, and must compare raiders by their best entry so a raider never ties
// with or contests themselves.

/** A stable React key for one entry: raider, rank and slot. */
export function rankingEntryKey(r: { character_id: string; rank: number; slot?: number | null }): string {
  return `${r.character_id}:${r.rank}:${r.slot ?? 0}`
}

/**
 * The first entry per raider, in the given order. Pass rankings sorted best
 * first to get each raider's best entry; raider order is preserved.
 */
export function bestEntryPerCharacter<T extends { character_id: string }>(rankings: readonly T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const r of rankings) {
    if (seen.has(r.character_id)) continue
    seen.add(r.character_id)
    out.push(r)
  }
  return out
}

/**
 * Summary counts for one item: the number of lists (distinct raiders) and the
 * mean of each list's best rank (highest rank number).
 */
export function aggregateListStats(
  players: readonly { character_id: string; item_rank: number }[],
): { total_lists: number; average_rank: number } {
  const bestByCharacter = new Map<string, number>()
  for (const p of players) {
    const best = bestByCharacter.get(p.character_id)
    if (best === undefined || p.item_rank > best) bestByCharacter.set(p.character_id, p.item_rank)
  }
  const total_lists = bestByCharacter.size
  if (total_lists === 0) return { total_lists: 0, average_rank: 0 }
  let sum = 0
  for (const rank of bestByCharacter.values()) sum += rank
  return { total_lists, average_rank: sum / total_lists }
}
