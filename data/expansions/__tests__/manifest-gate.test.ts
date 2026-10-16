import { describe, it, expect } from 'vitest'
import { ExpansionManifestSchema, type ExpansionManifest } from '@/domain/expansion/manifest-schema'
import { FOREVER_MANIFEST } from '../forever/manifest'
import { EXPANSION_GAMES, FOREVER_EXPANSION_NAME } from '@/domain/expansion/game'

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
