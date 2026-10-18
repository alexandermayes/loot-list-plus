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
import type { ExpansionMeta, LegacyCatalog } from '@/data/expansions/types'
import { EXPANSION_PHASES, type PhaseDefinition } from '@/data/expansion-phases'
import { getExpansionMeta } from '@/data/expansions/registry'
import { getExpansionCatalog } from '@/data/expansions/catalogs'
import { FOREVER_MANIFEST } from '@/data/expansions/forever/manifest'
import { CLASS_PROFICIENCIES } from '@/data/class-proficiencies'
import { getTokenClasses, isTokenSlot } from '@/data/token-class-mapping'
import { getExpansionGame } from '@/domain/expansion/game'
import { getWowheadDomain } from '@/domain/expansion/wowhead'
import { normalizeCatalogName } from '@/lib/loot/guild-scoped-lookup'
import shippedNamesFixture from '@/data/expansions/forever/__fixtures__/shipped-names.json'
import legacyTokenExceptionsFixture from '@/data/expansions/__fixtures__/legacy-token-exceptions.json'

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

const KNOWN_CLASSES: ReadonlySet<string> = new Set(Object.keys(CLASS_PROFICIENCIES))

/**
 * duplicate-raid-name. Raid names and previousNames share one namespace per
 * expansion, compared through normalizeCatalogName so a curly apostrophe or
 * stray whitespace cannot hide a clash. A previousName that equals another
 * raid's current name would make the sync service rename two tiers onto one.
 */
export function checkRaidNames(cat: GateCatalog): GateError[] {
  const errors: GateError[] = []
  const owner = new Map<string, string>()

  const claim = (raidName: string, label: string, value: string) => {
    const normalized = normalizeCatalogName(value)
    if (normalized === null) {
      errors.push({
        rule: 'duplicate-raid-name',
        message: `${cat.storedName}: raid "${raidName}" has an empty ${label}`,
      })
      return
    }
    const earlier = owner.get(normalized)
    if (earlier === undefined) {
      owner.set(normalized, `${label} "${value}" of raid "${raidName}"`)
    } else {
      errors.push({
        rule: 'duplicate-raid-name',
        message: `${cat.storedName}: ${label} "${value}" of raid "${raidName}" normalizes to the same string as the ${earlier}`,
      })
    }
  }

  for (const raid of cat.raids) {
    claim(raid.name, 'name', raid.name)
    for (const previous of raid.previousNames) claim(raid.name, 'previousName', previous)
  }
  return errors
}

/** duplicate-boss-key. Native boss keys are the sync identity, so one raid cannot repeat one. */
export function checkBossKeys(cat: GateCatalog): GateError[] {
  if (cat.mode !== 'native') return []
  const errors: GateError[] = []
  for (const raid of cat.raids) {
    const seen = new Set<string>()
    for (const boss of raid.bosses) {
      if (boss.key === null) continue
      if (seen.has(boss.key)) {
        errors.push({
          rule: 'duplicate-boss-key',
          message: `${cat.storedName}: raid "${raid.name}" has two bosses keyed "${boss.key}" (second is "${boss.name}")`,
        })
      }
      seen.add(boss.key)
    }
  }
  return errors
}

/** A legacy Token item with no class mapping, as frozen in the exceptions fixture. */
export interface LegacyTokenException {
  slug: string
  raid: string
  boss: string
  wowheadId: string
  name: string
}

/**
 * The legacy Token items getTokenClasses cannot map (research Pitfall 3).
 * getTokenClasses is a substring search over TOKEN_CLASS_MAPPING, so this is
 * exactly the set the seeder writes no loot_item_classes rows for.
 */
export function legacyTokenViolations(cat: GateCatalog): LegacyTokenException[] {
  const found: LegacyTokenException[] = []
  for (const raid of cat.raids) {
    for (const boss of raid.bosses) {
      for (const item of boss.items) {
        if (isTokenSlot(item.slot) && getTokenClasses(item.name) === undefined) {
          found.push({ slug: cat.slug, raid: raid.name, boss: boss.name, wowheadId: item.wowheadId, name: item.name })
        }
      }
    }
  }
  return found
}

function exceptionKey(entry: LegacyTokenException): string {
  return JSON.stringify([entry.slug, entry.raid, entry.boss, entry.wowheadId])
}

/**
 * missing-token-class, orphan-token-class, unknown-token-class (GH-269: a
 * token joined by name instead of id mapped to the wrong classes).
 *
 * Native catalogs are strict: every Token-slot item needs a tokenClasses entry
 * (keyed by wowhead_id) holding at least one known class, every entry must name
 * an item, and every class name must exist. Legacy catalogs are held to the
 * frozen fixture: a new unmapped Token fails, and a fixture entry that no
 * longer fails must be removed (legacy-token-exceptions-drift), so the
 * baseline can only shrink.
 */
export function checkTokenClasses(cat: GateCatalog, legacyExceptions: readonly LegacyTokenException[]): GateError[] {
  const errors: GateError[] = []

  if (cat.mode === 'legacy') {
    const frozen = new Map<string, LegacyTokenException>()
    for (const entry of legacyExceptions) {
      if (entry.slug === cat.slug) frozen.set(exceptionKey(entry), entry)
    }
    const current = new Set<string>()
    for (const violation of legacyTokenViolations(cat)) {
      const key = exceptionKey(violation)
      current.add(key)
      if (!frozen.has(key)) {
        errors.push({
          rule: 'missing-token-class',
          message: `${cat.storedName}: Token item "${violation.name}" (wowhead_id ${violation.wowheadId}) under ${violation.raid} / ${violation.boss} has no class mapping and is not in legacy-token-exceptions.json`,
        })
      }
    }
    for (const [key, entry] of frozen) {
      if (!current.has(key)) {
        errors.push({
          rule: 'legacy-token-exceptions-drift',
          message: `${cat.storedName}: legacy-token-exceptions.json lists "${entry.name}" (wowhead_id ${entry.wowheadId}) under ${entry.raid} / ${entry.boss}, but it is no longer an unmapped Token; remove it from the fixture`,
        })
      }
    }
    return errors
  }

  const itemIds = new Set<string>()
  for (const raid of cat.raids) {
    for (const boss of raid.bosses) {
      for (const item of boss.items) {
        itemIds.add(item.wowheadId)
        if (!isTokenSlot(item.slot)) continue
        const classes = cat.tokenClasses[item.wowheadId]
        if (!classes || !classes.some((name) => KNOWN_CLASSES.has(name))) {
          errors.push({
            rule: 'missing-token-class',
            message: `${cat.storedName}: Token item "${item.name}" (wowhead_id ${item.wowheadId}) under ${raid.name} / ${boss.name} has no known class in tokenClasses`,
          })
        }
      }
    }
  }

  for (const [id, classes] of Object.entries(cat.tokenClasses)) {
    if (!itemIds.has(id)) {
      errors.push({
        rule: 'orphan-token-class',
        message: `${cat.storedName}: tokenClasses has an entry for wowhead_id ${id}, which names no item`,
      })
    }
    for (const name of classes) {
      if (!KNOWN_CLASSES.has(name)) {
        errors.push({
          rule: 'unknown-token-class',
          message: `${cat.storedName}: tokenClasses[${id}] names "${name}", which is not a class`,
        })
      }
    }
  }
  return errors
}

export interface NameCheckInput {
  /** The registry key the caller asked about. */
  key: string
  meta: ExpansionMeta
  /** The native manifest, or null for a legacy expansion. */
  manifest: ExpansionManifest | null
  phases: readonly PhaseDefinition[] | undefined
}

/**
 * name-mismatch. Every place that restates an expansion's identity must agree
 * with the registry: the stored name, the game version, the phase-list slug,
 * the manifest header and the Wowhead domain map.
 */
export function checkNames({ key, meta, manifest, phases }: NameCheckInput): GateError[] {
  const errors: GateError[] = []
  const mismatch = (message: string) => errors.push({ rule: 'name-mismatch', message: `${key}: ${message}` })

  if (meta.storedName !== key) {
    mismatch(`the registry key differs from its storedName "${meta.storedName}"`)
  }
  const game = getExpansionGame(key)
  if (meta.game !== game) {
    mismatch(`the registry game is ${String(meta.game)} but getExpansionGame returns ${String(game)}`)
  }
  if (!phases || phases.length === 0) {
    mismatch(`slug "${meta.slug}" has no non-empty EXPANSION_PHASES entry`)
  }
  if (getWowheadDomain(meta.storedName) === null) {
    mismatch(`stored name "${meta.storedName}" has no Wowhead domain`)
  }
  if (manifest) {
    if (manifest.storedName !== meta.storedName) {
      mismatch(`the manifest storedName "${manifest.storedName}" differs from the registry "${meta.storedName}"`)
    }
    if (manifest.slug !== meta.slug) {
      mismatch(`the manifest slug "${manifest.slug}" differs from the registry "${meta.slug}"`)
    }
    if (manifest.gameVersion !== meta.game) {
      mismatch(`the manifest gameVersion "${manifest.gameVersion}" differs from the registry game ${String(meta.game)}`)
    }
  }
  return errors
}

/**
 * size-order (D-07). Native raid sizes must strictly increase in manifest
 * order (10, 20, 40): sort_order follows manifest order, so a tie or a
 * decrease would present the raids out of progression.
 */
export function checkSizeOrder(cat: GateCatalog): GateError[] {
  if (cat.mode !== 'native') return []
  const errors: GateError[] = []
  let previous: GateRaid | null = null
  for (const raid of cat.raids) {
    if (raid.size === null) continue
    if (previous && previous.size !== null && raid.size <= previous.size) {
      errors.push({
        rule: 'size-order',
        message: `${cat.storedName}: raid "${raid.name}" (size ${raid.size}) follows "${previous.name}" (size ${previous.size}); sizes must strictly increase in manifest order`,
      })
    }
    previous = raid
  }
  return errors
}

/**
 * shipped-name-changed (D-09). A raid name that has reached a guild is a
 * raid_tiers.name join key; renaming it without previousNames would make sync
 * insert a second tier beside the shipped one. Compared through
 * normalizeCatalogName so alias spelling does not matter.
 */
export function checkShippedNames(cat: GateCatalog, shippedNames: readonly string[]): GateError[] {
  const known = new Set<string>()
  for (const raid of cat.raids) {
    for (const name of [raid.name, ...raid.previousNames]) {
      const normalized = normalizeCatalogName(name)
      if (normalized !== null) known.add(normalized)
    }
  }
  const errors: GateError[] = []
  for (const shipped of shippedNames) {
    const normalized = normalizeCatalogName(shipped)
    if (normalized === null || !known.has(normalized)) {
      errors.push({
        rule: 'shipped-name-changed',
        message: `${cat.storedName}: shipped raid name "${shipped}" is neither a raid name nor a previousName; rename a raid by adding the old name to previousNames`,
      })
    }
  }
  return errors
}

/** Inputs a test can replace to prove a rule fires without touching real data. */
export interface GateOverrides {
  catalog?: GateCatalog
  phases?: readonly PhaseDefinition[] | undefined
  meta?: ExpansionMeta
  manifest?: ExpansionManifest
  shippedNames?: readonly string[]
  legacyExceptions?: readonly LegacyTokenException[]
}

/**
 * Run every rule for one stored expansion name. Expansions with no data yet
 * (the retail "coming soon" rows) have nothing to gate and return no errors.
 */
export function validateExpansion(storedName: string, overrides: GateOverrides = {}): GateError[] {
  const meta = overrides.meta ?? getExpansionMeta(storedName)
  if (!meta) {
    return [{ rule: 'name-mismatch', message: `"${storedName}" is not in EXPANSION_REGISTRY` }]
  }
  if (!meta.hasData) return []

  // The manifest is only read for a sync-mode expansion, so a legacy one never
  // sees a manifest override by accident.
  const manifest = meta.seedMode === 'sync' ? (overrides.manifest ?? FOREVER_MANIFEST) : null

  let cat = overrides.catalog
  if (!cat) {
    if (manifest) {
      cat = catalogFromManifest(manifest)
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
    ...checkNames({ key: storedName, meta, manifest, phases }),
    ...checkRaidNames(cat),
    ...checkBossKeys(cat),
    ...checkDuplicateIds(cat),
    ...checkTokenClasses(cat, overrides.legacyExceptions ?? legacyTokenExceptionsFixture),
    ...checkPhaseCoverage(cat, phases),
    ...checkSizeOrder(cat),
    ...(cat.mode === 'native' ? checkShippedNames(cat, overrides.shippedNames ?? shippedNamesFixture) : []),
  ]
}
