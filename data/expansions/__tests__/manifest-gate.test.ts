// @vitest-environment node
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { ExpansionManifestSchema, type ExpansionManifest } from '@/domain/expansion/manifest-schema'
import { FOREVER_MANIFEST } from '../forever/manifest'
import { EXPANSION_GAMES, FOREVER_EXPANSION_NAME } from '@/domain/expansion/game'
import { EXPANSION_PHASES } from '@/data/expansion-phases'
import { getExpansionCatalog } from '@/data/expansions/catalogs'
import { EXPANSION_REGISTRY } from '@/data/expansions/registry'
import shippedNamesFixture from '@/data/expansions/forever/__fixtures__/shipped-names.json'
import legacyExceptionsFixture from '@/data/expansions/__fixtures__/legacy-token-exceptions.json'
import {
  catalogFromLegacy,
  catalogFromManifest,
  checkBossKeys,
  checkDuplicateIds,
  checkNames,
  checkPhaseCoverage,
  checkRaidNames,
  checkShippedNames,
  checkSizeOrder,
  checkTokenClasses,
  legacyTokenViolations,
  validateExpansion,
  type GateCatalog,
  type GateError,
  type GateItem,
  type LegacyTokenException,
} from '@/data/expansions/validate'

// Why this gate exists: raid tiers are joined by name in several places
// (GH-269: name-keyed joins that silently mis-matched, GH-279: a phase list
// naming a raid the catalog does not call that, seeding a NULL phase). The
// Forever manifest is the single source of Forever raid names, so a typo or an
// unknown key must fail CI here rather than reach a guild. Plan 02-06 extends
// this file with the cross-catalog rules from data/expansions/validate.ts.
//
// The expected names, sizes and boss order below are transcribed by hand from
// the plan and the 2026-09-13 todo, not read back from the manifest, so this is
// a real guard rather than a restatement of the data (same pattern as
// data/__tests__/classic-wow-raids.test.ts).

const EXPECTED_RAID_NAMES = ['Barrow Deeps', 'Hyjal Summit', "Onyxia's Lair"]
const EXPECTED_RAID_SIZES = [10, 20, 40]
const EXPECTED_BARROW_DEEPS_BOSSES = [
  'Deepscar Matriarch',
  'Khalith the Dreadspinner',
  'Amethrax',
  'Ravus and Darlissa',
  'Elder Tangleclaw',
  'Well of Sorrow',
  "Del'lynar Songwood",
  'Sonya Darkhallow',
]

const EM_DASH = String.fromCharCode(0x2014)

function clone(): ExpansionManifest {
  return structuredClone(FOREVER_MANIFEST)
}

function failureCodes(candidate: unknown): string[] {
  const result = ExpansionManifestSchema.safeParse(candidate)
  return result.success ? [] : result.error.issues.map((issue) => issue.code)
}

describe('FOREVER_MANIFEST content', () => {
  it('parses under the strict schema and the parse output deep-equals the constant', () => {
    // Every defaulted field is written out in the constant, so a parse that
    // adds or drops anything shows up here.
    expect(ExpansionManifestSchema.parse(FOREVER_MANIFEST)).toEqual(FOREVER_MANIFEST)
  })

  it('lists exactly three raids in size order with plain names', () => {
    expect(FOREVER_MANIFEST.raids.map((raid) => raid.name)).toEqual(EXPECTED_RAID_NAMES)
    expect(FOREVER_MANIFEST.raids.map((raid) => raid.size)).toEqual(EXPECTED_RAID_SIZES)
  })

  it('carries the eight guide-sourced Barrow Deeps bosses in guide order', () => {
    const barrowDeeps = FOREVER_MANIFEST.raids[0]
    expect(barrowDeeps.bosses.map((boss) => boss.name)).toEqual(EXPECTED_BARROW_DEEPS_BOSSES)
  })

  it('gives Hyjal Summit no bosses and Onyxia\'s Lair a single Onyxia', () => {
    const [, hyjal, onyxia] = FOREVER_MANIFEST.raids
    expect(hyjal.bosses).toEqual([])
    expect(onyxia.bosses.map((boss) => boss.name)).toEqual(['Onyxia'])
  })

  it('keeps every boss sourced: provisional bosses carry no verifiedBy and no encounter id, verified bosses carry both', () => {
    for (const raid of FOREVER_MANIFEST.raids) {
      for (const boss of raid.bosses) {
        expect(boss.source.length).toBeGreaterThan(0)
        if (boss.verification === 'provisional') {
          expect(boss).not.toHaveProperty('verifiedBy')
          expect(boss.encounterId).toBeNull()
        } else {
          expect(boss.verifiedBy).toBe('wago-dungeon-encounter')
          expect(boss.encounterId).not.toBeNull()
        }
      }
    }
  })

  it('keys bosses by a kebab-case slug, never a wowhead id', () => {
    for (const raid of FOREVER_MANIFEST.raids) {
      for (const boss of raid.bosses) {
        expect(boss.key).toMatch(/^[a-z0-9-]+$/)
        expect(boss.key).not.toMatch(/^\d+$/)
      }
    }
  })

  it('stores opens_on as data only, with empty previous names and no map id yet', () => {
    for (const raid of FOREVER_MANIFEST.raids) {
      expect(raid.opens_on).toBe('2026-12-09')
      expect(raid.previousNames).toEqual([])
      expect(raid.mapId).toBeNull()
    }
  })

  it('ties the manifest identity to the game module', () => {
    expect(FOREVER_MANIFEST.storedName).toBe(FOREVER_EXPANSION_NAME)
    expect(FOREVER_MANIFEST.gameVersion).toBe(EXPANSION_GAMES.Forever)
    expect(FOREVER_MANIFEST.slug).toBe('forever')
    expect(FOREVER_MANIFEST.reference).toEqual({ product: 'wow_classic_beta', buildPrefix: '1.60.' })
  })

  it('has no items or token classes until a later phase widens the schema', () => {
    expect(FOREVER_MANIFEST.items).toEqual({})
    expect(FOREVER_MANIFEST.tokenClasses).toEqual({})
  })

  it('writes no em dash and no (Forever) suffix into user-facing names', () => {
    for (const raid of FOREVER_MANIFEST.raids) {
      expect(raid.name).not.toContain(EM_DASH)
      expect(raid.name).not.toContain('(Forever)')
      for (const boss of raid.bosses) {
        expect(boss.name).not.toContain(EM_DASH)
      }
    }
  })
})

describe('ExpansionManifestSchema strictness', () => {
  it('rejects an unknown key on a raid (a previousName typo)', () => {
    const copy = clone() as unknown as { raids: Record<string, unknown>[] }
    copy.raids[0].previousName = 'Old Name'
    expect(failureCodes(copy)).toContain('unrecognized_keys')
  })

  it('rejects an unknown key at the top level', () => {
    const copy = { ...clone(), extra: true }
    expect(failureCodes(copy)).toContain('unrecognized_keys')
  })

  it('rejects a verified boss without verifiedBy', () => {
    const copy = clone() as unknown as { raids: { bosses: Record<string, unknown>[] }[] }
    copy.raids[0].bosses[0].verification = 'verified'
    expect(failureCodes(copy)).toContain('custom')
  })

  it('accepts a verified boss that names who verified it', () => {
    const copy = clone() as unknown as { raids: { bosses: Record<string, unknown>[] }[] }
    copy.raids[0].bosses[0].verification = 'verified'
    copy.raids[0].bosses[0].verifiedBy = 'owner'
    expect(ExpansionManifestSchema.safeParse(copy).success).toBe(true)
  })

  it('rejects a provisional boss that carries verifiedBy', () => {
    const copy = clone() as unknown as { raids: { bosses: Record<string, unknown>[] }[] }
    copy.raids[0].bosses[0].verifiedBy = 'owner'
    expect(failureCodes(copy)).toContain('custom')
  })

  it('rejects a manifest with zero raids', () => {
    const copy = { ...clone(), raids: [] }
    expect(ExpansionManifestSchema.safeParse(copy).success).toBe(false)
  })

  it('rejects a non-numeric item key', () => {
    const copy = { ...clone(), items: { abc: undefined } }
    expect(ExpansionManifestSchema.safeParse(copy).success).toBe(false)
  })

  it('rejects any item entry while the schema refuses items', () => {
    const copy = { ...clone(), items: { '12345': 'Some Item' } }
    expect(ExpansionManifestSchema.safeParse(copy).success).toBe(false)
  })

  it('rejects an opens_on that is not a calendar date', () => {
    const copy = clone() as unknown as { raids: Record<string, unknown>[] }
    copy.raids[0].opens_on = '12/09/2026'
    expect(ExpansionManifestSchema.safeParse(copy).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Cross-catalog gate (plan 02-06). The rules live in data/expansions/validate.ts;
// every case here hands a rule a mutated copy and asserts the rule's name, so a
// rule cannot go quiet and still leave the suite green.
// ---------------------------------------------------------------------------

const EXPANSIONS_WITH_DATA = [
  'Classic',
  'The Burning Crusade',
  'Wrath of the Lich King',
  'Cataclysm',
  'Mists of Pandaria',
  'Forever',
]

function rulesOf(errors: GateError[]): string[] {
  return errors.map((error) => error.rule)
}

function onlyRule(errors: GateError[], rule: GateError['rule']): GateError[] {
  return errors.filter((error) => error.rule === rule)
}

function gateItem(wowheadId: string, name = `Item ${wowheadId}`, slot = 'Head'): GateItem {
  return { wowheadId, name, slot }
}

// One raid, one boss per entry of bossItems. Native bosses carry a slug key.
function handBuilt(mode: GateCatalog['mode'], bossItems: GateItem[][]): GateCatalog {
  return {
    storedName: 'Forever',
    slug: 'forever',
    mode,
    raids: [{
      name: 'Barrow Deeps',
      previousNames: [],
      size: mode === 'native' ? 10 : null,
      bosses: bossItems.map((items, index) => ({
        name: `Boss ${index}`,
        key: mode === 'native' ? `boss-${index}` : null,
        items,
      })),
    }],
    tokenClasses: {},
  }
}

describe('validateExpansion over the real registry', () => {
  it.each(EXPANSIONS_WITH_DATA)('%s: no errors', (storedName) => {
    expect(validateExpansion(storedName)).toEqual([])
  })

  it('returns nothing for a registry row with no data yet', () => {
    expect(validateExpansion('Legion')).toEqual([])
  })

  it('reports a name the registry does not know', () => {
    expect(rulesOf(validateExpansion('Not An Expansion'))).toEqual(['name-mismatch'])
  })
})

describe('duplicate-id', () => {
  it('[E-EXPN-04 adjacency] a native catalog fails when two bosses share a wowhead_id', () => {
    const cat = handBuilt('native', [[gateItem('271940')], [gateItem('271940')]])
    const errors = checkDuplicateIds(cat)
    expect(rulesOf(errors)).toEqual(['duplicate-id'])
    expect(errors[0].message).toContain('271940')
  })

  it('[E-EXPN-04 adjacency] the same id twice in one boss also fails a native catalog, once', () => {
    const cat = handBuilt('native', [[gateItem('271940'), gateItem('271940'), gateItem('271940')]])
    expect(rulesOf(checkDuplicateIds(cat))).toEqual(['duplicate-id'])
  })

  it('[E-EXPN-04 adjacency] a legacy catalog passes when the same id sits under two different bosses', () => {
    const cat = handBuilt('legacy', [[gateItem('271940')], [gateItem('271940')]])
    expect(checkDuplicateIds(cat)).toEqual([])
  })

  it('[E-EXPN-04 adjacency] a legacy catalog fails on an identical (raid, boss, id) triple', () => {
    const cat = handBuilt('legacy', [[gateItem('271940'), gateItem('271940')]])
    expect(rulesOf(checkDuplicateIds(cat))).toEqual(['duplicate-id'])
  })

  it('runs through validateExpansion when a catalog override is supplied', () => {
    const cat = handBuilt('native', [[gateItem('271940')], [gateItem('271940')]])
    expect(onlyRule(validateExpansion('Forever', { catalog: cat }), 'duplicate-id')).toHaveLength(1)
  })

  it('the legacy adapter keeps real cross-boss id sharing legal', () => {
    // Research measured 95 cross-boss duplicates in Classic alone, so this is
    // the proof the legacy scoping is real and not an empty catalog.
    const classic = getExpansionCatalog('Classic')
    if (!classic || classic.kind !== 'legacy') throw new Error('Classic legacy catalog missing')
    const cat = catalogFromLegacy('Classic', 'classic', classic)
    const ids = cat.raids.flatMap((raid) => raid.bosses.flatMap((boss) => boss.items.map((item) => item.wowheadId)))
    expect(new Set(ids).size).toBeLessThan(ids.length)
    expect(checkDuplicateIds(cat)).toEqual([])
  })
})

describe('phase-coverage', () => {
  it('a Forever phase list without Hyjal Summit fails and names the raid', () => {
    const mutated = structuredClone(EXPANSION_PHASES.forever)
    for (const phase of mutated) phase.raids = phase.raids.filter((name) => name !== 'Hyjal Summit')
    const errors = onlyRule(validateExpansion('Forever', { phases: mutated }), 'phase-coverage')
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toContain('Hyjal Summit')
  })

  it('the manifest catalog reads the same names the phase list does', () => {
    const cat = catalogFromManifest(FOREVER_MANIFEST)
    expect(cat.raids.map((raid) => raid.name)).toEqual(EXPANSION_PHASES.forever.flatMap((phase) => phase.raids))
  })
})

// ---------------------------------------------------------------------------
// Remaining rules. Each case hands the rule a mutated copy and names the rule.
// ---------------------------------------------------------------------------

const LEGACY_EXCEPTIONS: LegacyTokenException[] = legacyExceptionsFixture

function legacyCatalogFor(storedName: string): GateCatalog {
  const catalog = getExpansionCatalog(storedName)
  if (!catalog || catalog.kind !== 'legacy') throw new Error(`${storedName} legacy catalog missing`)
  const meta = EXPANSION_REGISTRY[storedName]
  return catalogFromLegacy(storedName, meta.slug, catalog)
}

function legacyStoredNames(): string[] {
  return Object.values(EXPANSION_REGISTRY)
    .filter((meta) => meta.hasData && meta.seedMode === 'legacy-insert')
    .map((meta) => meta.storedName)
}

function exceptionKey(entry: LegacyTokenException): string {
  return JSON.stringify([entry.slug, entry.raid, entry.boss, entry.wowheadId, entry.name])
}

function tokenItem(wowheadId: string, name = 'Fallen Hero'): GateItem {
  return gateItem(wowheadId, name, 'Token')
}

function manifestCopy(): ExpansionManifest {
  return structuredClone(FOREVER_MANIFEST)
}

describe('duplicate-raid-name', () => {
  it('[E-EXPN-04 adjacency] a previousName that normalizes to another raid name fails', () => {
    const copy = manifestCopy()
    copy.raids[1].previousNames = ['barrow deeps']
    const errors = checkRaidNames(catalogFromManifest(copy))
    expect(rulesOf(errors)).toEqual(['duplicate-raid-name'])
    expect(errors[0].message).toContain('Hyjal Summit')
  })

  it('[E-EXPN-04 encoding] a curly apostrophe and extra whitespace do not hide a duplicate', () => {
    const copy = manifestCopy()
    copy.raids[0].name = 'Onyxia\u2019s  Lair'
    expect(rulesOf(checkRaidNames(catalogFromManifest(copy)))).toEqual(['duplicate-raid-name'])
  })

  it('a raid whose previousNames repeats its own name fails', () => {
    const copy = manifestCopy()
    copy.raids[0].previousNames = ['BARROW DEEPS']
    expect(rulesOf(checkRaidNames(catalogFromManifest(copy)))).toEqual(['duplicate-raid-name'])
  })

  it('a blank raid name fails', () => {
    const copy = manifestCopy()
    copy.raids[0].name = '   '
    expect(rulesOf(checkRaidNames(catalogFromManifest(copy)))).toContain('duplicate-raid-name')
  })

  it('runs through validateExpansion for a manifest override', () => {
    const copy = manifestCopy()
    copy.raids[1].previousNames = ['barrow deeps']
    expect(onlyRule(validateExpansion('Forever', { manifest: copy }), 'duplicate-raid-name')).toHaveLength(1)
  })

  it('distinct names and aliases pass', () => {
    const copy = manifestCopy()
    copy.raids[0].previousNames = ['Old Barrow']
    expect(checkRaidNames(catalogFromManifest(copy))).toEqual([])
  })
})

describe('duplicate-boss-key', () => {
  it('two Barrow Deeps bosses keyed amethrax fail', () => {
    const copy = manifestCopy()
    const amethrax = copy.raids[0].bosses.find((boss) => boss.key === 'amethrax')
    if (!amethrax) throw new Error('amethrax missing from the manifest')
    copy.raids[0].bosses.push({ ...amethrax, name: 'Amethrax Again' })
    const errors = checkBossKeys(catalogFromManifest(copy))
    expect(rulesOf(errors)).toEqual(['duplicate-boss-key'])
    expect(errors[0].message).toContain('amethrax')
  })

  it('runs through validateExpansion for a manifest override', () => {
    const copy = manifestCopy()
    copy.raids[0].bosses[1].key = copy.raids[0].bosses[0].key
    expect(onlyRule(validateExpansion('Forever', { manifest: copy }), 'duplicate-boss-key')).toHaveLength(1)
  })

  it('the same key in two different raids is fine', () => {
    const copy = manifestCopy()
    copy.raids[2].bosses[0].key = copy.raids[0].bosses[0].key
    expect(checkBossKeys(catalogFromManifest(copy))).toEqual([])
  })
})

describe('token classes (native, strict)', () => {
  it('missing-token-class: a Token item with no tokenClasses entry fails; adding Warrior passes', () => {
    const cat = handBuilt('native', [[tokenItem('500')]])
    const failing = checkTokenClasses(cat, [])
    expect(rulesOf(failing)).toEqual(['missing-token-class'])
    expect(failing[0].message).toContain('500')

    cat.tokenClasses = { '500': ['Warrior'] }
    expect(checkTokenClasses(cat, [])).toEqual([])
  })

  it('missing-token-class: an empty class list fails the same way', () => {
    const cat = handBuilt('native', [[tokenItem('500')]])
    cat.tokenClasses = { '500': [] }
    expect(rulesOf(checkTokenClasses(cat, []))).toEqual(['missing-token-class'])
  })

  it('a non-Token item needs no class entry', () => {
    const cat = handBuilt('native', [[gateItem('501')]])
    expect(checkTokenClasses(cat, [])).toEqual([])
  })

  it('orphan-token-class: a tokenClasses key that names no item fails', () => {
    const cat = handBuilt('native', [[tokenItem('500')]])
    cat.tokenClasses = { '500': ['Warrior'], '999': ['Mage'] }
    const errors = checkTokenClasses(cat, [])
    expect(rulesOf(errors)).toEqual(['orphan-token-class'])
    expect(errors[0].message).toContain('999')
  })

  it('unknown-token-class: a class name the game does not have fails', () => {
    const cat = handBuilt('native', [[tokenItem('500')]])
    cat.tokenClasses = { '500': ['Warrior', 'Necromancer'] }
    const errors = checkTokenClasses(cat, [])
    expect(rulesOf(errors)).toEqual(['unknown-token-class'])
    expect(errors[0].message).toContain('Necromancer')
  })

  it('a class list holding only unknown names fails both rules', () => {
    const cat = handBuilt('native', [[tokenItem('500')]])
    cat.tokenClasses = { '500': ['Necromancer'] }
    expect(rulesOf(checkTokenClasses(cat, [])).sort()).toEqual(['missing-token-class', 'unknown-token-class'])
  })

  it('runs through validateExpansion when a catalog override is supplied', () => {
    const cat = handBuilt('native', [[tokenItem('500')]])
    expect(onlyRule(validateExpansion('Forever', { catalog: cat }), 'missing-token-class')).toHaveLength(1)
  })

  it('the real manifest has no items, so nothing is missing or orphaned', () => {
    expect(checkTokenClasses(catalogFromManifest(FOREVER_MANIFEST), [])).toEqual([])
  })
})

describe('token classes (legacy, ratcheted against the fixture)', () => {
  it('the frozen fixture totals 33: Wrath of the Lich King 14, Cataclysm 19', () => {
    const count = (slug: string) => LEGACY_EXCEPTIONS.filter((entry) => entry.slug === slug).length
    expect(LEGACY_EXCEPTIONS).toHaveLength(33)
    expect(count('wrath')).toBe(14)
    expect(count('cata')).toBe(19)
  })

  it('the computed violations across every legacy catalog equal the fixture', () => {
    const computed = legacyStoredNames().flatMap((name) => legacyTokenViolations(legacyCatalogFor(name)))
    expect(computed.map(exceptionKey).sort()).toEqual(LEGACY_EXCEPTIONS.map(exceptionKey).sort())
  })

  it.each(legacyStoredNames())('%s: the real catalog satisfies the ratchet', (name) => {
    expect(checkTokenClasses(legacyCatalogFor(name), LEGACY_EXCEPTIONS)).toEqual([])
  })

  it('a fixture missing one entry fails missing-token-class for that item', () => {
    const cat = legacyCatalogFor('Wrath of the Lich King')
    const [dropped, ...rest] = LEGACY_EXCEPTIONS.filter((entry) => entry.slug === 'wrath')
    const errors = checkTokenClasses(cat, rest)
    expect(rulesOf(errors)).toEqual(['missing-token-class'])
    expect(errors[0].message).toContain(dropped.name)
  })

  it('a fixture with a stale extra entry fails legacy-token-exceptions-drift', () => {
    const cat = legacyCatalogFor('Cataclysm')
    const stale: LegacyTokenException = { slug: 'cata', raid: 'Dragon Soul', boss: 'Morchok', wowheadId: '1', name: 'Gone Token' }
    const errors = checkTokenClasses(cat, [...LEGACY_EXCEPTIONS, stale])
    expect(rulesOf(errors)).toEqual(['legacy-token-exceptions-drift'])
    expect(errors[0].message).toContain('Gone Token')
  })

  it('an empty fixture fails every violation, so the ratchet cannot be bypassed', () => {
    expect(checkTokenClasses(legacyCatalogFor('Wrath of the Lich King'), [])).toHaveLength(14)
    expect(checkTokenClasses(legacyCatalogFor('Cataclysm'), [])).toHaveLength(19)
  })

  it('entries for another slug never count against this catalog', () => {
    expect(checkTokenClasses(legacyCatalogFor('Classic'), LEGACY_EXCEPTIONS)).toEqual([])
  })

  it('runs through validateExpansion with a legacy exceptions override', () => {
    const errors = validateExpansion('Cataclysm', { legacyExceptions: [] })
    expect(onlyRule(errors, 'missing-token-class')).toHaveLength(19)
  })
})

describe('phase-coverage (remaining shapes)', () => {
  const FOREVER_RAIDS = ['Barrow Deeps', 'Hyjal Summit', "Onyxia's Lair"]
  const foreverCatalog = () => catalogFromManifest(FOREVER_MANIFEST)

  it('phase numbers [1, 3] fail as a gap', () => {
    const phases = [
      { phase: 1, name: 'Phase 1', raids: FOREVER_RAIDS.slice(0, 2) },
      { phase: 3, name: 'Phase 3', raids: FOREVER_RAIDS.slice(2) },
    ]
    const errors = checkPhaseCoverage(foreverCatalog(), phases)
    expect(rulesOf(errors)).toEqual(['phase-coverage'])
    expect(errors[0].message).toContain('1, 3')
  })

  it('[E-EXPN-04 empty] a phase entry with zero raids fails', () => {
    const phases = [
      { phase: 1, name: 'Phase 1', raids: FOREVER_RAIDS },
      { phase: 2, name: 'Phase 2', raids: [] },
    ]
    const errors = checkPhaseCoverage(foreverCatalog(), phases)
    expect(rulesOf(errors)).toEqual(['phase-coverage'])
    expect(errors[0].message).toContain('phase 2')
  })

  it('a raid listed in two phases fails', () => {
    const phases = [
      { phase: 1, name: 'Phase 1', raids: FOREVER_RAIDS },
      { phase: 2, name: 'Phase 2', raids: ['Hyjal Summit'] },
    ]
    const errors = checkPhaseCoverage(foreverCatalog(), phases)
    expect(rulesOf(errors)).toEqual(['phase-coverage'])
    expect(errors[0].message).toContain('Hyjal Summit')
  })

  it('[E-EXPN-04 encoding] a curly apostrophe in a phase list is an orphan, not a match', () => {
    const curly = "Onyxia\u2019s Lair"
    const phases = [{ phase: 1, name: 'Phase 1', raids: ['Barrow Deeps', 'Hyjal Summit', curly] }]
    const errors = checkPhaseCoverage(foreverCatalog(), phases)
    expect(errors.some((error) => error.message.includes(curly) && error.message.includes('orphan'))).toBe(true)
    expect(errors.some((error) => error.message.includes("catalog raid \"Onyxia's Lair\""))).toBe(true)
  })

  it('a missing phase list gives one error and stops', () => {
    expect(rulesOf(checkPhaseCoverage(foreverCatalog(), undefined))).toEqual(['phase-coverage'])
    expect(rulesOf(checkPhaseCoverage(foreverCatalog(), []))).toEqual(['phase-coverage'])
  })

  it('a catalog raid in no phase fails', () => {
    const phases = [{ phase: 1, name: 'Phase 1', raids: FOREVER_RAIDS.slice(0, 2) }]
    const errors = checkPhaseCoverage(foreverCatalog(), phases)
    expect(rulesOf(errors)).toEqual(['phase-coverage'])
    expect(errors[0].message).toContain("Onyxia's Lair")
  })
})

describe('name-mismatch', () => {
  const foreverMeta = EXPANSION_REGISTRY.Forever
  const phases = EXPANSION_PHASES.forever

  it('every registry row with data satisfies the name checks', () => {
    for (const meta of Object.values(EXPANSION_REGISTRY)) {
      if (!meta.hasData) continue
      const manifest = meta.seedMode === 'sync' ? FOREVER_MANIFEST : null
      expect(checkNames({ key: meta.storedName, meta, manifest, phases: EXPANSION_PHASES[meta.slug] })).toEqual([])
    }
  })

  it('a registry key that differs from storedName fails', () => {
    const errors = checkNames({ key: 'Forever', meta: { ...foreverMeta, storedName: 'Forevr' }, manifest: null, phases })
    expect(onlyRule(errors, 'name-mismatch').some((error) => error.message.includes('Forevr'))).toBe(true)
  })

  it('a registry game that disagrees with getExpansionGame fails', () => {
    const errors = checkNames({ key: 'Forever', meta: { ...foreverMeta, game: 'classic' }, manifest: null, phases })
    expect(rulesOf(errors)).toEqual(['name-mismatch'])
    expect(errors[0].message).toContain('classic')
  })

  it('runs through validateExpansion: Forever with the registry game changed to classic', () => {
    const errors = validateExpansion('Forever', { meta: { ...foreverMeta, game: 'classic' } })
    expect(onlyRule(errors, 'name-mismatch').length).toBeGreaterThan(0)
  })

  it('a slug with no EXPANSION_PHASES entry fails, and so does an empty list', () => {
    const meta = { ...foreverMeta, slug: 'nowhere' }
    expect(rulesOf(checkNames({ key: 'Forever', meta, manifest: null, phases: undefined }))).toEqual(['name-mismatch'])
    expect(rulesOf(checkNames({ key: 'Forever', meta, manifest: null, phases: [] }))).toEqual(['name-mismatch'])
  })

  it('a manifest slug of fever fails', () => {
    const manifest = { ...manifestCopy(), slug: 'fever' }
    const errors = checkNames({ key: 'Forever', meta: foreverMeta, manifest, phases })
    expect(rulesOf(errors)).toEqual(['name-mismatch'])
    expect(errors[0].message).toContain('fever')
    expect(onlyRule(validateExpansion('Forever', { manifest }), 'name-mismatch')).not.toHaveLength(0)
  })

  it('a manifest storedName of WoW Forever fails', () => {
    const manifest = { ...manifestCopy(), storedName: 'WoW Forever' }
    const errors = checkNames({ key: 'Forever', meta: foreverMeta, manifest, phases })
    expect(rulesOf(errors)).toEqual(['name-mismatch'])
    expect(errors[0].message).toContain('WoW Forever')
  })

  it('a manifest gameVersion that differs from the registry game fails', () => {
    const manifest = { ...manifestCopy(), gameVersion: 'classic' as const }
    expect(rulesOf(checkNames({ key: 'Forever', meta: foreverMeta, manifest, phases }))).toEqual(['name-mismatch'])
  })

  it('a stored name with no Wowhead domain fails', () => {
    const meta = { storedName: 'Nowhere', slug: 'nowhere', game: null, seedMode: null, hasData: true }
    const errors = checkNames({ key: 'Nowhere', meta, manifest: null, phases })
    expect(rulesOf(errors)).toEqual(['name-mismatch'])
    expect(errors[0].message).toContain('Wowhead')
  })
})

describe('size-order', () => {
  function withSizes(sizes: number[]): GateCatalog {
    const copy = manifestCopy()
    copy.raids.forEach((raid, index) => { raid.size = sizes[index] })
    return catalogFromManifest(copy)
  }

  it('[E-EXPN-04 ordering] [10, 20, 40] passes', () => {
    expect(checkSizeOrder(withSizes([10, 20, 40]))).toEqual([])
  })

  it('[E-EXPN-04 ordering] a tie [10, 10, 40] fails', () => {
    const errors = checkSizeOrder(withSizes([10, 10, 40]))
    expect(rulesOf(errors)).toEqual(['size-order'])
  })

  it('[E-EXPN-04 ordering] a decrease [20, 10, 40] fails', () => {
    expect(rulesOf(checkSizeOrder(withSizes([20, 10, 40])))).toEqual(['size-order'])
  })

  it('runs through validateExpansion for a manifest override', () => {
    const copy = manifestCopy()
    copy.raids[1].size = 10
    expect(onlyRule(validateExpansion('Forever', { manifest: copy }), 'size-order')).toHaveLength(1)
  })

  it('legacy raids carry no size, so the rule does not apply to them', () => {
    expect(checkSizeOrder(legacyCatalogFor('Classic'))).toEqual([])
  })
})

describe('shipped-name-changed (D-09)', () => {
  // Once a Forever raid name ships, append it to shipped-names.json and never
  // remove it. A rename is made by adding the old name to previousNames.
  const TRANSCRIBED_SHIPPED = ['Barrow Deeps', 'Hyjal Summit', "Onyxia's Lair"]
  const SHIPPED: readonly string[] = shippedNamesFixture

  it('the fixture equals the independent transcription, so neither drifts alone', () => {
    expect(shippedNamesFixture).toEqual(TRANSCRIBED_SHIPPED)
  })

  it('the real manifest keeps every shipped name', () => {
    expect(checkShippedNames(catalogFromManifest(FOREVER_MANIFEST), SHIPPED)).toEqual([])
  })

  it('renaming Barrow Deeps to Barrow Depths with no alias fails', () => {
    const copy = manifestCopy()
    copy.raids[0].name = 'Barrow Depths'
    const errors = checkShippedNames(catalogFromManifest(copy), SHIPPED)
    expect(rulesOf(errors)).toEqual(['shipped-name-changed'])
    expect(errors[0].message).toContain('Barrow Deeps')
    expect(onlyRule(validateExpansion('Forever', { manifest: copy }), 'shipped-name-changed')).toHaveLength(1)
  })

  it('adding previousNames [Barrow Deeps] passes', () => {
    const copy = manifestCopy()
    copy.raids[0].name = 'Barrow Depths'
    copy.raids[0].previousNames = ['Barrow Deeps']
    expect(checkShippedNames(catalogFromManifest(copy), SHIPPED)).toEqual([])
  })

  it('[E-EXPN-04 encoding] a previousName with different case and spacing still matches', () => {
    const copy = manifestCopy()
    copy.raids[0].name = 'Barrow Depths'
    copy.raids[0].previousNames = ['barrow  deeps']
    expect(checkShippedNames(catalogFromManifest(copy), SHIPPED)).toEqual([])
  })

  it('a shipped name listed in the fixture but absent from the manifest fails', () => {
    const errors = checkShippedNames(catalogFromManifest(FOREVER_MANIFEST), [...SHIPPED, 'Sunwell Plateau'])
    expect(rulesOf(errors)).toEqual(['shipped-name-changed'])
  })

  it('the rule only applies to native catalogs', () => {
    expect(onlyRule(validateExpansion('Classic', { shippedNames: ['Nothing Shipped Here'] }), 'shipped-name-changed')).toEqual([])
  })
})

describe('[E-EXPN-04 empty] raids with no bosses', () => {
  it('Hyjal Summit has zero bosses and produces no error anywhere in the gate', () => {
    const hyjal = FOREVER_MANIFEST.raids.find((raid) => raid.name === 'Hyjal Summit')
    expect(hyjal?.bosses).toEqual([])
    expect(validateExpansion('Forever')).toEqual([])
  })

  it('a manifest with zero raids fails the schema', () => {
    expect(ExpansionManifestSchema.safeParse({ ...manifestCopy(), raids: [] }).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// D-06: dates live in data, never in code.
// ---------------------------------------------------------------------------

const REPO_ROOT = path.resolve(__dirname, '../../..')
const SCAN_ROOTS = ['app', 'lib', 'utils', 'domain', 'components', 'data']
const SKIPPED_DIRS = new Set(['node_modules', '.next', '__tests__'])
const MIN_SCANNED_FILES = 50
const MANIFEST_PATH = 'data/expansions/forever/manifest.ts'

// Joined at runtime so this test file never holds the literal itself.
const OPENING_DATE = ['2026', '12', '09'].join('-')

function collectSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return []
  const found: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) found.push(...collectSourceFiles(full))
    } else if (
      entry.isFile() &&
      /\.tsx?$/.test(entry.name) &&
      !/\.test\.tsx?$/.test(entry.name)
    ) {
      found.push(full)
    }
  }
  return found
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1')
}

function holdsOpeningDate(source: string): boolean {
  return stripComments(source).includes(OPENING_DATE)
}

const scannedFiles = SCAN_ROOTS.flatMap((root) => collectSourceFiles(path.join(REPO_ROOT, root))).sort()

describe('opening date stays in data (D-06)', () => {
  it(`scans at least ${MIN_SCANNED_FILES} source files, so the scan is not vacuous`, () => {
    expect(scannedFiles.length).toBeGreaterThanOrEqual(MIN_SCANNED_FILES)
  })

  it('only the Forever manifest holds the opening date literal', () => {
    const holders = scannedFiles
      .filter((file) => holdsOpeningDate(fs.readFileSync(file, 'utf8')))
      .map((file) => path.relative(REPO_ROOT, file).split(path.sep).join('/'))
    expect(holders).toEqual([MANIFEST_PATH])
  })

  it('flags a synthetic source that hard-codes the date', () => {
    const violating = `export const OPENS = new Date('${OPENING_DATE}')\n`
    expect(holdsOpeningDate(violating)).toBe(true)
  })

  it('ignores the date inside comments', () => {
    const commented = `// opens ${OPENING_DATE}\n/* ${OPENING_DATE} */\nexport const X = 1\n`
    expect(holdsOpeningDate(commented)).toBe(false)
  })
})
