/**
 * Client-safe lookup from a raid tier's stored name to the Forever manifest raid.
 *
 * Imports only the manifest data, its types (type-only, so zod never reaches a
 * client bundle) and normalizeCatalogName. Safe to use from server code, the
 * admin script and the setup guide alike.
 */
import { FOREVER_MANIFEST } from '@/data/expansions/forever/manifest'
import type { ManifestRaid } from '@/domain/expansion/manifest-schema'
import { normalizeCatalogName } from '@/lib/loot/guild-scoped-lookup'

export interface ManifestRaidMatch {
  raid: ManifestRaid
  index: number
  via: 'name' | 'alias'
}

/**
 * Finds the manifest raid that a tier name refers to.
 *
 * The comparison is normalized, never exact, so a curly apostrophe, a case
 * change or doubled spaces cannot create a second tier. A match on the raid's
 * own name is 'name'; a match on one of its previousNames is 'alias' (D-09).
 * The first raid in manifest order wins. Names are compared as strings held in
 * arrays, never used to index an object, so 'constructor' and '__proto__' are
 * plain misses.
 */
export function findManifestRaid(
  tierName: unknown,
  raids: readonly ManifestRaid[] = FOREVER_MANIFEST.raids
): ManifestRaidMatch | null {
  const wanted = normalizeCatalogName(tierName)
  if (wanted === null) return null

  for (let index = 0; index < raids.length; index++) {
    const raid = raids[index]
    if (normalizeCatalogName(raid.name) === wanted) {
      return { raid, index, via: 'name' }
    }
    if (raid.previousNames.some(previous => normalizeCatalogName(previous) === wanted)) {
      return { raid, index, via: 'alias' }
    }
  }
  return null
}

/**
 * Resolves a list of tier names to their manifest raids: unique by manifest
 * index, sorted by index (manifest order is size order, D-07), skipping names
 * that match nothing. Matching is normalized, never exact, so a curly
 * apostrophe or case change cannot produce a second entry.
 */
export function foreverRaidsForTierNames(
  tierNames: readonly unknown[],
  raids: readonly ManifestRaid[] = FOREVER_MANIFEST.raids
): Array<{ raid: ManifestRaid; index: number }> {
  const byIndex = new Map<number, { raid: ManifestRaid; index: number }>()
  for (const tierName of tierNames) {
    const match = findManifestRaid(tierName, raids)
    if (match && !byIndex.has(match.index)) {
      byIndex.set(match.index, { raid: match.raid, index: match.index })
    }
  }
  return [...byIndex.values()].sort((a, b) => a.index - b.index)
}
