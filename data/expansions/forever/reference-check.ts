/**
 * Pure reference checks for the Forever manifest (EXPN-06, EXPN-01; D-12, D-14, D-15).
 *
 * Every Forever boss ships provisional because its name came from third-party
 * guides and is not in wago DungeonEncounter yet. These checks keep that
 * visible and make a future wago hit force a promotion:
 *
 * - checkProvisionalAllowlist is the ratchet: the allowlist must list exactly
 *   the provisional manifest bosses, and its size must equal PROVISIONAL_CEILING.
 * - findPromotableBosses reports allowlisted bosses a snapshot now confirms.
 * - checkVerifiedEncounters makes a 'wago-dungeon-encounter' verification
 *   honest: the cited encounter must exist, belong to the boss's raid and
 *   carry the boss's name.
 *
 * Boss names alone are not evidence: the pinned product also carries the
 * Classic encounters, and Forever reuses names such as "Onyxia". Every match
 * is therefore scoped to the raid's map (see raidMapIds).
 *
 * No I/O and no network. Manifest and snapshot types are imported type-only so
 * zod never loads here; the reference test reads the JSON files.
 */
import type { ExpansionManifest } from '@/domain/expansion/manifest-schema'
import type { ReferenceSnapshot } from '@/domain/expansion/reference-snapshot-schema'
import { normalizeCatalogName } from '@/lib/loot/guild-scoped-lookup'

export interface ProvisionalAllowlistEntry {
  raid: string
  bossKey: string
  name: string
}

export interface PromotableBoss extends ProvisionalAllowlistEntry {
  encounterId: number
}

/**
 * D-15 as amended 2026-10-14. The ceiling records the allowlist size and only
 * moves down: lower it in the same PR as each promotion. The one explicit
 * exception is the owner's Oct 21 input (D-12), which may add provisional
 * bosses (Hyjal Summit has none today) only through a reviewed raise of this
 * constant in the same PR as the manifest edit.
 */
export const PROVISIONAL_CEILING = 9

type ManifestRaid = ExpansionManifest['raids'][number]
type SnapshotTables = ReferenceSnapshot['tables']

/**
 * The wago Map.IDs that count as this raid. A pinned manifest mapId is
 * authoritative and wins outright. Until one is pinned (all Forever raids are
 * null today) the raid's name or a previous name is joined to Map.MapName_lang.
 * Classic and Forever can share a map name, so pin mapId once it is known.
 */
export function raidMapIds(raid: ManifestRaid, maps: SnapshotTables['Map']): Set<number> {
  if (raid.mapId !== null) return new Set([raid.mapId])
  const names = new Set<string>()
  for (const name of [raid.name, ...raid.previousNames]) {
    const normalized = normalizeCatalogName(name)
    if (normalized !== null) names.add(normalized)
  }
  const ids = new Set<number>()
  for (const row of maps) {
    const normalized = normalizeCatalogName(row.MapName_lang)
    if (normalized !== null && names.has(normalized)) ids.add(row.ID)
  }
  return ids
}

function entryId(raid: string, bossKey: string): string {
  return `${raid}/${bossKey}`
}

function provisionalBossIds(manifest: ExpansionManifest): Map<string, string> {
  const ids = new Map<string, string>()
  for (const raid of manifest.raids) {
    for (const boss of raid.bosses) {
      if (boss.verification === 'provisional') ids.set(entryId(raid.name, boss.key), boss.key)
    }
  }
  return ids
}

export function checkProvisionalAllowlist(
  manifest: ExpansionManifest,
  allowlist: readonly ProvisionalAllowlistEntry[],
  ceiling: number = PROVISIONAL_CEILING,
): string[] {
  const errors: string[] = []
  const provisional = provisionalBossIds(manifest)
  const listed = new Set(allowlist.map((entry) => entryId(entry.raid, entry.bossKey)))

  for (const [id, bossKey] of provisional) {
    if (!listed.has(id)) {
      errors.push(`provisional boss "${bossKey}" (${id}) is missing from the provisional allowlist`)
    }
  }
  for (const entry of allowlist) {
    const id = entryId(entry.raid, entry.bossKey)
    if (!provisional.has(id)) {
      errors.push(
        `allowlist entry "${entry.bossKey}" (${id}) is not a currently provisional manifest boss; remove it`,
      )
    }
  }

  if (allowlist.length < ceiling) {
    errors.push(
      `the allowlist holds ${allowlist.length} entries but PROVISIONAL_CEILING is ${ceiling}; ` +
        `lower PROVISIONAL_CEILING to ${allowlist.length} in the same PR as the promotion (D-15)`,
    )
  } else if (allowlist.length > ceiling) {
    errors.push(
      `the allowlist holds ${allowlist.length} entries, above PROVISIONAL_CEILING ${ceiling}; ` +
        'growth needs the reviewed D-15 exception: raise PROVISIONAL_CEILING in the same PR as the manifest edit',
    )
  }
  return errors
}

export function findPromotableBosses(
  manifest: ExpansionManifest,
  allowlist: readonly ProvisionalAllowlistEntry[],
  snapshot: ReferenceSnapshot,
): PromotableBoss[] {
  const provisional = provisionalBossIds(manifest)
  const mapIdsByRaid = new Map<string, Set<number>>()
  for (const raid of manifest.raids) {
    mapIdsByRaid.set(raid.name, raidMapIds(raid, snapshot.tables.Map))
  }

  const found: PromotableBoss[] = []
  for (const entry of allowlist) {
    if (!provisional.has(entryId(entry.raid, entry.bossKey))) continue
    const name = normalizeCatalogName(entry.name)
    const raidMaps = mapIdsByRaid.get(entry.raid)
    if (name === null || raidMaps === undefined) continue

    // The first row in table order wins, as before; only rows on the raid's map count.
    const row = snapshot.tables.DungeonEncounter.find(
      (candidate) => raidMaps.has(candidate.MapID) && normalizeCatalogName(candidate.Name_lang) === name,
    )
    if (row !== undefined) found.push({ ...entry, encounterId: row.ID })
  }
  return found
}

export function checkVerifiedEncounters(
  manifest: ExpansionManifest,
  snapshot: ReferenceSnapshot,
): string[] {
  const rowsById = new Map(snapshot.tables.DungeonEncounter.map((row) => [row.ID, row]))
  const errors: string[] = []
  for (const raid of manifest.raids) {
    const raidMaps = raidMapIds(raid, snapshot.tables.Map)
    for (const boss of raid.bosses) {
      if (boss.verification !== 'verified' || boss.verifiedBy !== 'wago-dungeon-encounter') continue
      const row = boss.encounterId === null ? undefined : rowsById.get(boss.encounterId)
      if (row === undefined) {
        errors.push(
          `verified boss "${boss.key}" (${raid.name}) cites DungeonEncounter id ${boss.encounterId ?? 'null'}, ` +
            'which is not in the committed snapshot',
        )
        continue
      }
      if (!raidMaps.has(row.MapID)) {
        errors.push(
          `verified boss "${boss.key}" (${raid.name}) cites DungeonEncounter id ${row.ID}, ` +
            `which is on map ${row.MapID}, not a map of this raid`,
        )
      }
      if (normalizeCatalogName(row.Name_lang) !== normalizeCatalogName(boss.name)) {
        errors.push(
          `verified boss "${boss.key}" (${raid.name}) cites DungeonEncounter id ${row.ID}, ` +
            `whose name does not match "${boss.name}"`,
        )
      }
    }
  }
  return errors
}
