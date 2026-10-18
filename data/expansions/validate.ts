/**
 * The manifest gate: pure rules that run in Vitest over every expansion in the
 * registry that has data (EXPN-04).
 *
 * Why it exists: the failure mode is always a silent wrong row in a guild.
 * GH-269 was a name-keyed token join that mis-matched, GH-279 was a phase list
 * naming a raid the catalog does not call that, so the tier seeded with a NULL
 * phase and never showed. Each rule below names the class of mistake it stops.
 *
 * Strict for native manifests, ratcheted for legacy adapters: the native
 * Forever manifest must satisfy every rule outright, while the five legacy
 * catalogs legitimately share a wowhead_id across bosses (intended multi-boss
 * loot pools) and carry Token items with no class mapping. Legacy data is held
 * at its current shape (duplicate triples fail; the token exceptions are frozen
 * in a fixture that may only shrink) instead of being let through by a weaker
 * rule.
 *
 * Tests only: this file imports catalogs.ts, which loads every legacy raid
 * catalog, so no runtime code may import it.
 */
import type { ExpansionManifest } from '@/domain/expansion/manifest-schema'
import type { LegacyCatalog } from '@/data/expansions/types'
import { EXPANSION_PHASES, type PhaseDefinition } from '@/data/expansion-phases'
import { getExpansionMeta } from '@/data/expansions/registry'
import { getExpansionCatalog } from '@/data/expansions/catalogs'
import { FOREVER_MANIFEST } from '@/data/expansions/forever/manifest'

export type GateRule =
  | 'duplicate-id'
  | 'duplicate-raid-name'
  | 'duplicate-boss-key'
  | 'missing-token-class'
  | 'orphan-token-class'
  | 'unknown-token-class'
  | 'legacy-token-exceptions-drift'
  | 'phase-coverage'
  | 'name-mismatch'
  | 'size-order'
  | 'shipped-name-changed'

export interface GateError {
  rule: GateRule
  message: string
}

export interface GateItem {
  wowheadId: string
  name: string
  slot: string
}

export interface GateBoss {
  name: string
  /** The manifest slug; null for legacy bosses, which have none. */
  key: string | null
  items: GateItem[]
}

export interface GateRaid {
  name: string
  previousNames: string[]
  /** Raid size; null for legacy raids, which do not record one. */
  size: number | null
  bosses: GateBoss[]
}

export interface GateCatalog {
  storedName: string
  slug: string
  mode: 'native' | 'legacy'
  raids: GateRaid[]
  /** Native only: wowhead_id to the class names that may use the token. */
  tokenClasses: Record<string, string[]>
}

/** A manifest as the gate sees it: native, items empty by schema, so no items here. */
export function catalogFromManifest(manifest: ExpansionManifest): GateCatalog {
  return {
    storedName: manifest.storedName,
    slug: manifest.slug,
    mode: 'native',
    raids: manifest.raids.map((raid) => ({
      name: raid.name,
      previousNames: [...raid.previousNames],
      size: raid.size,
      bosses: raid.bosses.map((boss) => ({ name: boss.name, key: boss.key, items: [] })),
    })),
    tokenClasses: Object.fromEntries(
      Object.entries(manifest.tokenClasses).map(([id, classes]) => [id, [...classes]]),
    ),
  }
}

export function catalogFromLegacy(storedName: string, slug: string, catalog: LegacyCatalog): GateCatalog {
  return {
    storedName,
    slug,
    mode: 'legacy',
    raids: catalog.raids.map((raid) => ({
      name: raid.name,
      previousNames: [],
      size: null,
      bosses: raid.bosses.map((boss) => ({
        name: boss.name,
        key: null,
        items: boss.lootItems.map((item) => ({ wowheadId: item.wowheadId, name: item.name, slot: item.slot })),
      })),
    })),
    tokenClasses: {},
  }
}

/**
 * duplicate-id. Native: a wowhead_id may appear once in the whole catalog.
 * Legacy: the same id under two different bosses is an intended loot pool, so
 * only an identical (raid, boss, wowhead_id) triple fails.
 */
export function checkDuplicateIds(cat: GateCatalog): GateError[] {
  const errors: GateError[] = []

  if (cat.mode === 'native') {
    const firstSeen = new Map<string, string>()
    const reported = new Set<string>()
    for (const raid of cat.raids) {
      for (const boss of raid.bosses) {
        for (const item of boss.items) {
          const where = `${raid.name} / ${boss.name}`
          const earlier = firstSeen.get(item.wowheadId)
          if (earlier === undefined) {
            firstSeen.set(item.wowheadId, where)
          } else if (!reported.has(item.wowheadId)) {
            reported.add(item.wowheadId)
            errors.push({
              rule: 'duplicate-id',
              message: `${cat.storedName}: wowhead_id ${item.wowheadId} ("${item.name}") appears under ${earlier} and again under ${where}; a native catalog allows each id once`,
            })
          }
        }
      }
    }
    return errors
  }

  const seen = new Set<string>()
  const reported = new Set<string>()
  for (const raid of cat.raids) {
    for (const boss of raid.bosses) {
      for (const item of boss.items) {
        const triple = JSON.stringify([raid.name, boss.name, item.wowheadId])
        if (!seen.has(triple)) {
          seen.add(triple)
        } else if (!reported.has(triple)) {
          reported.add(triple)
          errors.push({
            rule: 'duplicate-id',
            message: `${cat.storedName}: wowhead_id ${item.wowheadId} ("${item.name}") is listed twice under ${raid.name} / ${boss.name}`,
          })
        }
      }
    }
  }
  return errors
}

/**
 * phase-coverage (GH-279). getRaidPhase does an exact includes(), so the phase
 * list and the catalog must agree on every raid name character for character.
 * Phases must be exactly 1..N in order, none empty, and every catalog raid in
 * exactly one phase with no phase naming a raid the catalog lacks.
 */
export function checkPhaseCoverage(cat: GateCatalog, phases: readonly PhaseDefinition[] | undefined): GateError[] {
  const label = `${cat.storedName} (slug "${cat.slug}")`

  if (!phases || phases.length === 0) {
    // One error and stop: with no list, every raid would otherwise be reported
    // as unphased, which buries the real cause.
    return [{
      rule: 'phase-coverage',
      message: `${label}: EXPANSION_PHASES has no phases for this slug, so every raid would seed with a NULL phase`,
    }]
  }

  const errors: GateError[] = []

  const numbers = phases.map((phase) => phase.phase)
  if (numbers.some((n, index) => n !== index + 1)) {
    errors.push({
      rule: 'phase-coverage',
      message: `${label}: phase numbers are [${numbers.join(', ')}], expected exactly 1..${phases.length} in order`,
    })
  }

  const catalogNames = new Set(cat.raids.map((raid) => raid.name))
  const phaseOf = new Map<string, number[]>()

  for (const phase of phases) {
    if (phase.raids.length === 0) {
      errors.push({ rule: 'phase-coverage', message: `${label}: phase ${phase.phase} lists no raids` })
    }
    for (const raidName of phase.raids) {
      phaseOf.set(raidName, [...(phaseOf.get(raidName) ?? []), phase.phase])
      if (!catalogNames.has(raidName)) {
        errors.push({
          rule: 'phase-coverage',
          message: `${label}: phase ${phase.phase} names "${raidName}", which is not a raid in the catalog (orphan phase-list name)`,
        })
      }
    }
  }

  for (const [raidName, inPhases] of phaseOf) {
    if (inPhases.length > 1) {
      errors.push({
        rule: 'phase-coverage',
        message: `${label}: "${raidName}" is listed in phases ${inPhases.join(' and ')}; a raid belongs to exactly one phase`,
      })
    }
  }

  for (const raid of cat.raids) {
    if (!phaseOf.has(raid.name)) {
      errors.push({
        rule: 'phase-coverage',
        message: `${label}: catalog raid "${raid.name}" is in no phase of EXPANSION_PHASES.${cat.slug}, so it would seed with a NULL phase`,
      })
    }
  }

  return errors
}

/** Inputs a test can replace to prove a rule fires without touching real data. */
export interface GateOverrides {
  catalog?: GateCatalog
  phases?: readonly PhaseDefinition[] | undefined
}

/**
 * Run every rule for one stored expansion name. Expansions with no data yet
 * (the retail "coming soon" rows) have nothing to gate and return no errors.
 */
export function validateExpansion(storedName: string, overrides: GateOverrides = {}): GateError[] {
  const meta = getExpansionMeta(storedName)
  if (!meta) {
    return [{ rule: 'name-mismatch', message: `"${storedName}" is not in EXPANSION_REGISTRY` }]
  }
  if (!meta.hasData) return []

  let cat = overrides.catalog
  if (!cat) {
    if (meta.seedMode === 'sync') {
      cat = catalogFromManifest(FOREVER_MANIFEST)
    } else {
      const legacy = getExpansionCatalog(storedName)
      if (!legacy || legacy.kind !== 'legacy') {
        return [{ rule: 'name-mismatch', message: `${storedName}: the registry says legacy-insert but no legacy catalog resolves` }]
      }
      cat = catalogFromLegacy(storedName, meta.slug, legacy)
    }
  }

  const phases = 'phases' in overrides ? overrides.phases : EXPANSION_PHASES[cat.slug]

  return [
    ...checkDuplicateIds(cat),
    ...checkPhaseCoverage(cat, phases),
  ]
}
