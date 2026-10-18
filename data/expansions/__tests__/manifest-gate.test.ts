import { describe, it, expect } from 'vitest'
import { ExpansionManifestSchema, type ExpansionManifest } from '@/domain/expansion/manifest-schema'
import { FOREVER_MANIFEST } from '../forever/manifest'
import { EXPANSION_GAMES, FOREVER_EXPANSION_NAME } from '@/domain/expansion/game'
import { EXPANSION_PHASES } from '@/data/expansion-phases'
import { getExpansionCatalog } from '@/data/expansions/catalogs'
import {
  catalogFromLegacy,
  catalogFromManifest,
  checkDuplicateIds,
  validateExpansion,
  type GateCatalog,
  type GateError,
  type GateItem,
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

  it('keeps every boss provisional with a source note and no confirmed encounter id', () => {
    for (const raid of FOREVER_MANIFEST.raids) {
      for (const boss of raid.bosses) {
        expect(boss.verification).toBe('provisional')
        expect(boss).not.toHaveProperty('verifiedBy')
        expect(boss.source.length).toBeGreaterThan(0)
        expect(boss.encounterId).toBeNull()
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
