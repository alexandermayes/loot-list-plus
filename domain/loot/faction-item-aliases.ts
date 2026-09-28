/**
 * Faction-variant item aliases (GH #277).
 *
 * The Classic catalog (data/classic-wow-raids.ts) lists only the Alliance
 * copy of each faction-variant quest head: Head of Nefarian (19003, Blackwing
 * Lair) and Head of Onyxia (18423, Onyxia's Lair). Horde guilds loot the
 * Horde copies, 19002 and 18422, which have no catalog row of their own.
 *
 * User decision D-01: do NOT add Horde rows to the catalog and do NOT add a
 * migration. Instead (D-02, D-03), map the Horde id onto the catalog's
 * Alliance id here, and apply that map at every place that resolves an
 * external wowhead_id to a loot_items row.
 *
 * The exact id is always tried first, and the alias only second, so a
 * catalog id already present in a guild's data is never rewritten, and a
 * guild that added the Horde copy by hand keeps matching its own row.
 *
 * data/__tests__/classic-catalog-completeness.test.ts enforces that this map
 * is complete: it independently derives the same-name faction-variant
 * siblings from wow-classic-items and asserts that set equals these keys
 * exactly, so a future package update surfaces any new pair loudly instead
 * of silently 404ing for a guild.
 */

/** Horde wowhead id -> Alliance catalog wowhead id. */
export const FACTION_ITEM_ALIASES: Readonly<Record<number, number>> = Object.freeze({
  18422: 18423, // Head of Onyxia (Horde) -> Head of Onyxia (Alliance, catalog)
  19002: 19003, // Head of Nefarian (Horde) -> Head of Nefarian (Alliance, catalog)
})

/**
 * Returns the candidate wowhead ids to try, in lookup order: the given id
 * first, then its faction-alias target if one exists. Alliance catalog ids
 * never alias back to anything, so a non-Horde id always yields a
 * single-element array.
 */
export function wowheadIdCandidates(wowheadId: number): number[] {
  const alias = FACTION_ITEM_ALIASES[wowheadId]
  return alias === undefined ? [wowheadId] : [wowheadId, alias]
}

/**
 * Finds the first item in `items` whose wowhead_id matches the exact
 * wowheadId, falling back to its faction alias if the exact id has no
 * match. Rows with a null wowhead_id are ignored. Returns undefined when
 * neither candidate matches.
 */
export function findByWowheadId<T extends { wowhead_id: number | null }>(
  items: readonly T[],
  wowheadId: number
): T | undefined {
  for (const candidate of wowheadIdCandidates(wowheadId)) {
    const match = items.find(item => item.wowhead_id === candidate)
    if (match) return match
  }
  return undefined
}

/**
 * Awaits `lookup` for each candidate wowhead id in order (exact id first,
 * then its faction alias), returning the first non-null/undefined result
 * without invoking `lookup` again. Returns null when every candidate
 * misses.
 */
export async function resolveByWowheadId<T>(
  wowheadId: number,
  lookup: (candidate: number) => PromiseLike<T | null | undefined>
): Promise<T | null> {
  for (const candidate of wowheadIdCandidates(wowheadId)) {
    const result = await lookup(candidate)
    if (result !== null && result !== undefined) return result
  }
  return null
}
