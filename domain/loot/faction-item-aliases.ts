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
 *
 * GH #290 — export direction. The lookup helpers above resolve an inbound id
 * (an in-game addon reporting what a raider actually looted) to the catalog
 * row. Some exporters need the opposite: given a catalog row, also emit it
 * under the other faction's id, because the consumer keys its own data by
 * the exact id it saw in-game and has no alias table of its own.
 *
 * This applies ONLY to the LootList+ addon exports (guild-data for the
 * companion, export-string for the addon), which key items and member ranks
 * by exact wowhead_id (see companion/src/main/sync-engine.ts and
 * ScoreEngine.lua) with no linking of their own. `withFactionVariants` below
 * mirrors each faction-variant row under the sibling id, unless that id is
 * already present in the input (exact rows win — nothing is mirrored,
 * added or overwritten for an id the guild's data already holds).
 *
 * Gargul's two exports (domain/loot/gargul-dft.ts, domain/reserve/gargul-export.ts)
 * must NOT use withFactionVariants: Gargul links 19002/19003 and 18422/18423
 * itself (Data/ItemLinks.lua) and sums or lists every linked id together, so
 * a mirrored entry there would double-count. See the doc comments on those
 * two files for the specifics.
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

/**
 * Bidirectional faction-variant map, derived from FACTION_ITEM_ALIASES: each
 * Horde key maps to [its Alliance id], and each Alliance id maps to the
 * Horde keys that alias to it. Frozen, with frozen arrays. Used by
 * `withFactionVariants` (export direction, GH #290) — NOT by the lookup
 * helpers above, which stay resolution-direction (Horde -> Alliance) only.
 */
export const FACTION_ITEM_VARIANTS: Readonly<Record<number, readonly number[]>> = (() => {
  const variants: Record<number, number[]> = {}
  for (const [hordeStr, allianceId] of Object.entries(FACTION_ITEM_ALIASES)) {
    const hordeId = Number(hordeStr)
    variants[hordeId] = [allianceId]
    variants[allianceId] = [...(variants[allianceId] ?? []), hordeId]
  }
  for (const key of Object.keys(variants)) {
    Object.freeze(variants[Number(key)])
  }
  return Object.freeze(variants)
})()

/**
 * Returns the other faction's ids for `wowheadId` (both directions), or an
 * empty array when it is not part of any known faction-variant pair.
 */
export function factionVariantIds(wowheadId: number): readonly number[] {
  return FACTION_ITEM_VARIANTS[wowheadId] ?? []
}

/**
 * Mirrors each faction-variant row in `rows` under the sibling faction's id,
 * for exporters (the LootList+ addon exports, GH #290) whose consumer keys
 * data by the exact wowhead_id it saw in-game, with no alias table of its
 * own.
 *
 * For each row, in input order: the row is kept, then — if its wowhead_id is
 * a positive number with known variants — a shallow copy is inserted
 * directly after it for each variant id that is NOT already present among
 * the *input* rows' wowhead_ids ("exact rows win": a guild that already
 * holds both faction copies gets no mirror, no duplicate and no overwrite
 * for that id).
 *
 * Mirroring every source row (not just the first) — rather than de-duping
 * to a single mirrored block — keeps a last-wins keyed consumer (Lua tables
 * indexed by wowhead_id, JS objects assigned by key) consistent: if the
 * input holds the same wowhead_id twice with different values, the mirror
 * id resolves to whichever one the consumer's exact id would have resolved
 * to (the last one).
 *
 * Never mutates the input array or its rows; always returns a new array.
 */
export function withFactionVariants<T extends { wowhead_id: number | null }>(
  rows: readonly T[]
): T[] {
  const presentIds = new Set<number>()
  for (const row of rows) {
    if (typeof row.wowhead_id === 'number') presentIds.add(row.wowhead_id)
  }

  const result: T[] = []
  for (const row of rows) {
    result.push(row)
    if (typeof row.wowhead_id !== 'number' || row.wowhead_id <= 0) continue
    for (const variantId of factionVariantIds(row.wowhead_id)) {
      if (presentIds.has(variantId)) continue
      result.push({ ...row, wowhead_id: variantId })
    }
  }
  return result
}
