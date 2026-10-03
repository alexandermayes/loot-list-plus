// Dashboard "others want this", "you're #N" and ties: only raiders with an
// active membership count, GH #326.
//
// A raider who left the guild can still hold a legacy approved list. Left
// unfiltered, that list inflates "N others want this", can push "you're #N"
// down, hide an item from the low-competition quick wins, or appear under
// "Tied with". These two pure helpers take an already-computed set of
// characters without an active membership (findInvalidCharacterIds) and
// apply it before counting, same as the master sheet and the Summary view.

/**
 * Whether a character counts as competition for an item. The viewer's own
 * character always counts, even if a membership lookup reported it inactive
 * (a stale read should never hide the viewer's own entries). A missing
 * character id (null, undefined, or empty string) never counts.
 */
export function isActiveCompetitor(
  characterId: string | null | undefined,
  inactiveCharacterIds: ReadonlySet<string>,
  viewerCharacterId: string,
): boolean {
  if (!characterId) return false
  if (characterId === viewerCharacterId) return true
  return !inactiveCharacterIds.has(characterId)
}

/**
 * Builds the dashboard's per-item competition map: how many other active
 * raiders want this item, and the viewer's rank among them.
 *
 * Entries without an active membership are dropped first (the viewer's own
 * entries are always kept). The remaining loop is unchanged from the
 * dashboard's original logic: raiders are counted once each, and the
 * viewer's rank uses their best (highest) entry for the item, so a raider
 * listing the same item twice (main spec and off spec) never counts as a
 * competitor above themselves (GH #58).
 *
 * `entries` is not mutated. `inactiveCharacterIds` may be an array or a Set.
 */
export function buildItemCompetition(
  entries: Array<{ loot_item_id: string; character_id: string | null; rank: number }>,
  viewerCharacterId: string,
  inactiveCharacterIds: Iterable<string>,
): Record<string, { totalWanting: number; userRank: number }> {
  const inactive = inactiveCharacterIds instanceof Set ? inactiveCharacterIds : new Set(inactiveCharacterIds)

  const activeEntries = entries.filter(e => isActiveCompetitor(e.character_id, inactive, viewerCharacterId))

  const itemMap = new Map<string, Array<{ character_id: string; rank: number }>>()
  for (const e of activeEntries) {
    const list = itemMap.get(e.loot_item_id) || []
    list.push({ character_id: e.character_id as string, rank: e.rank })
    itemMap.set(e.loot_item_id, list)
  }

  const competitionMap: Record<string, { totalWanting: number; userRank: number }> = {}

  for (const [itemId, itemEntries] of itemMap) {
    const uniqueCharacters = new Set(itemEntries.map(entry => entry.character_id))
    const othersCount = uniqueCharacters.size - (uniqueCharacters.has(viewerCharacterId) ? 1 : 0)

    // A user can have the same item ranked twice (mainspec + offspec). Use
    // their highest rank: the scoring engine awards loot off the best
    // entry, so the "you're #N" against the guild should match (GH #58).
    const userBestRank = itemEntries.reduce<number | null>(
      (best, e) => (e.character_id === viewerCharacterId && (best === null || e.rank > best) ? e.rank : best),
      null,
    )
    const userRank = userBestRank !== null
      ? itemEntries
        .filter(e => e.rank > userBestRank)
        .reduce((acc, e) => {
          acc.add(e.character_id)
          return acc
        }, new Set<string>()).size + 1
      : uniqueCharacters.size

    competitionMap[itemId] = { totalWanting: othersCount, userRank }
  }

  return competitionMap
}
