// @vitest-environment node
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it, expect } from 'vitest'
import {
  ReferenceSnapshotSchema,
  canonicalSnapshotPayload,
  type ReferenceSnapshot,
} from '@/domain/expansion/reference-snapshot-schema'
import type { ExpansionManifest } from '@/domain/expansion/manifest-schema'
import { FOREVER_MANIFEST } from '../forever/manifest'
import {
  PROVISIONAL_CEILING,
  checkProvisionalAllowlist,
  checkVerifiedEncounters,
  findPromotableBosses,
  type ProvisionalAllowlistEntry,
} from '../forever/reference-check'

// Why this test exists: the Forever boss names came from third-party guides and
// are not in wago DungeonEncounter yet (D-12), and the wago service answered 503 on
// every 2026-10-12 probe, so nothing in this phase may wait on it (D-14). The
// committed snapshot starts as a placeholder (build null, empty tables) that
// this test validates strictly; the first successful refresh (plan 02-08/02-09)
// replaces it with real rows. The snapshot is data-only JSON, never generated
// TypeScript, and this file never touches the network.

const REFERENCE_DIR = path.join(__dirname, '..', 'forever', 'reference')
const SNAPSHOT_PATH = path.join(REFERENCE_DIR, 'wago.json')
const ALLOWLIST_PATH = path.join(__dirname, '..', 'forever', 'provisional-allowlist.json')

function readCommittedSnapshot(): unknown {
  return JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8'))
}

const EMPTY_TABLES = { DungeonEncounter: [], Map: [], ItemSparse: [] }

// A well-formed non-null snapshot built in the test. The sha256 is recomputed
// from the canonical payload so the schema accepts it as written by the refresh.
function syntheticSnapshot(overrides: Partial<ReferenceSnapshot> = {}): ReferenceSnapshot {
  const tables = {
    DungeonEncounter: [
      { ID: 1084, Name_lang: 'Onyxia', MapID: 249, OrderIndex: 0, DifficultyID: 0 },
      { ID: 610, Name_lang: 'Ragnaros', MapID: 409, OrderIndex: 1, DifficultyID: 0 },
    ],
    Map: [
      { ID: 249, MapName_lang: "Onyxia's Lair", InstanceType: 2, ExpansionID: 0, Directory: 'OnyxiasLair' },
    ],
    ItemSparse: [{ ID: 17182, Display_lang: 'Sulfuras', InventoryType: 17 }],
  }
  const build = '1.60.1.70009'
  return {
    source: 'https://example.invalid/db2/{table}/csv?build={build}',
    product: FOREVER_MANIFEST.reference.product,
    buildPrefix: FOREVER_MANIFEST.reference.buildPrefix,
    build,
    fetchedAt: '2026-10-20T06:00:00.000Z',
    sha256: createHash('sha256').update(canonicalSnapshotPayload({ build, tables })).digest('hex'),
    tables,
    ...overrides,
  }
}

function failureMessages(candidate: unknown): string[] {
  const result = ReferenceSnapshotSchema.safeParse(candidate)
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe('committed placeholder snapshot (D-14)', () => {
  it('parses under ReferenceSnapshotSchema', () => {
    const result = ReferenceSnapshotSchema.safeParse(readCommittedSnapshot())
    expect(result.success).toBe(true)
  })

  it('is a placeholder: build, fetchedAt and sha256 are null and every table is empty', () => {
    const snapshot = ReferenceSnapshotSchema.parse(readCommittedSnapshot())
    expect(snapshot.build).toBeNull()
    expect(snapshot.fetchedAt).toBeNull()
    expect(snapshot.sha256).toBeNull()
    expect(snapshot.tables).toEqual(EMPTY_TABLES)
  })

  it('carries the manifest reference product and build prefix', () => {
    const snapshot = ReferenceSnapshotSchema.parse(readCommittedSnapshot())
    expect(snapshot.product).toBe(FOREVER_MANIFEST.reference.product)
    expect(snapshot.buildPrefix).toBe(FOREVER_MANIFEST.reference.buildPrefix)
  })

  it('records the source URL template the rows will come from', () => {
    const snapshot = ReferenceSnapshotSchema.parse(readCommittedSnapshot())
    expect(snapshot.source).toContain('{table}')
    expect(snapshot.source).toContain('{build}')
  })

  it('is two-space indented JSON with a trailing newline', () => {
    const raw = readFileSync(SNAPSHOT_PATH, 'utf8')
    expect(raw).toBe(`${JSON.stringify(JSON.parse(raw), null, 2)}\n`)
  })

  it('holds a matching sha256 when a real build has been committed', () => {
    // Vacuous while the placeholder is committed; binds the first real pull.
    const snapshot = ReferenceSnapshotSchema.parse(readCommittedSnapshot())
    if (snapshot.build === null) return
    const expected = createHash('sha256').update(canonicalSnapshotPayload(snapshot)).digest('hex')
    expect(snapshot.sha256).toBe(expected)
  })

  it('keeps the reference directory data-only: nothing but JSON is generated from fetched data', () => {
    const files = readdirSync(REFERENCE_DIR)
    expect(files.length).toBeGreaterThan(0)
    for (const file of files) expect(file.endsWith('.json')).toBe(true)
  })
})

describe('ReferenceSnapshotSchema strictness and provenance invariants', () => {
  it('accepts a well-formed non-null snapshot', () => {
    expect(failureMessages(syntheticSnapshot())).toEqual([])
  })

  it('rejects build null with a non-empty table', () => {
    const candidate = {
      ...syntheticSnapshot(),
      build: null,
      fetchedAt: null,
      sha256: null,
    }
    expect(failureMessages(candidate).length).toBeGreaterThan(0)
  })

  it('rejects build null with a set fetchedAt or sha256', () => {
    const placeholder = { ...syntheticSnapshot(), build: null, tables: EMPTY_TABLES }
    expect(failureMessages({ ...placeholder, fetchedAt: null, sha256: 'a'.repeat(64) }).length).toBeGreaterThan(0)
    expect(failureMessages({ ...placeholder, fetchedAt: '2026-10-20T06:00:00.000Z', sha256: null }).length).toBeGreaterThan(0)
  })

  it('rejects a set build whose sha256 is null', () => {
    expect(failureMessages(syntheticSnapshot({ sha256: null })).length).toBeGreaterThan(0)
  })

  it('rejects a set build whose fetchedAt is null', () => {
    expect(failureMessages(syntheticSnapshot({ fetchedAt: null })).length).toBeGreaterThan(0)
  })

  it('rejects a build outside the buildPrefix', () => {
    expect(failureMessages(syntheticSnapshot({ build: '1.59.0.1' })).length).toBeGreaterThan(0)
  })

  it('rejects a malformed sha256', () => {
    expect(failureMessages(syntheticSnapshot({ sha256: 'ABC' })).length).toBeGreaterThan(0)
    expect(failureMessages(syntheticSnapshot({ sha256: 'A'.repeat(64) })).length).toBeGreaterThan(0)
  })

  it('rejects a non-ISO fetchedAt', () => {
    expect(failureMessages(syntheticSnapshot({ fetchedAt: 'yesterday' })).length).toBeGreaterThan(0)
  })

  it('rejects an empty source', () => {
    expect(failureMessages(syntheticSnapshot({ source: '' })).length).toBeGreaterThan(0)
  })

  it('rejects an unknown top-level key', () => {
    expect(failureMessages({ ...syntheticSnapshot(), extra: 1 }).length).toBeGreaterThan(0)
  })

  it('rejects an unknown table, an unknown column and a non-integer id', () => {
    const base = syntheticSnapshot()
    expect(failureMessages({ ...base, tables: { ...base.tables, Spell: [] } }).length).toBeGreaterThan(0)
    expect(
      failureMessages({
        ...base,
        tables: {
          ...base.tables,
          DungeonEncounter: [{ ...base.tables.DungeonEncounter[0], Extra: 1 }],
        },
      }).length,
    ).toBeGreaterThan(0)
    expect(
      failureMessages({
        ...base,
        tables: {
          ...base.tables,
          DungeonEncounter: [{ ...base.tables.DungeonEncounter[0], ID: 1.5 }],
        },
      }).length,
    ).toBeGreaterThan(0)
  })
})

describe('canonicalSnapshotPayload (the sha256 input)', () => {
  it('matches the sha256 of a synthetic snapshot recomputed with node:crypto', () => {
    const snapshot = syntheticSnapshot()
    const recomputed = createHash('sha256').update(canonicalSnapshotPayload(snapshot)).digest('hex')
    expect(snapshot.sha256).toBe(recomputed)
    expect(recomputed).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is identical for two snapshots whose rows differ only in order', () => {
    const a = syntheticSnapshot()
    const reordered = {
      build: a.build,
      tables: {
        ItemSparse: a.tables.ItemSparse,
        Map: a.tables.Map,
        DungeonEncounter: [...a.tables.DungeonEncounter].reverse(),
      },
    }
    expect(canonicalSnapshotPayload(reordered)).toBe(canonicalSnapshotPayload(a))
  })

  it('is identical when row keys are written in a different order', () => {
    const a = syntheticSnapshot()
    const shuffledKeys = {
      build: a.build,
      tables: {
        ...a.tables,
        DungeonEncounter: a.tables.DungeonEncounter.map((row) => ({
          DifficultyID: row.DifficultyID,
          OrderIndex: row.OrderIndex,
          MapID: row.MapID,
          Name_lang: row.Name_lang,
          ID: row.ID,
        })),
      },
    }
    expect(canonicalSnapshotPayload(shuffledKeys)).toBe(canonicalSnapshotPayload(a))
  })

  it('never includes fetchedAt, so a re-pull of the same data hashes the same (research Pitfall 4)', () => {
    const early = syntheticSnapshot({ fetchedAt: '2026-10-20T06:00:00.000Z' })
    const late = syntheticSnapshot({ fetchedAt: '2026-11-03T06:00:00.000Z' })
    expect(canonicalSnapshotPayload(early)).toBe(canonicalSnapshotPayload(late))
    expect(canonicalSnapshotPayload(early)).not.toContain('2026-10-20')
  })

  it('changes when the build or a row changes', () => {
    const base = syntheticSnapshot()
    const otherBuild = { build: '1.60.2.70100', tables: base.tables }
    const otherRow = {
      build: base.build,
      tables: {
        ...base.tables,
        DungeonEncounter: [{ ...base.tables.DungeonEncounter[0], Name_lang: 'Other' }, base.tables.DungeonEncounter[1]],
      },
    }
    expect(canonicalSnapshotPayload(otherBuild)).not.toBe(canonicalSnapshotPayload(base))
    expect(canonicalSnapshotPayload(otherRow)).not.toBe(canonicalSnapshotPayload(base))
  })
})

function readAllowlist(): ProvisionalAllowlistEntry[] {
  return JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8')) as ProvisionalAllowlistEntry[]
}

function provisionalBosses(manifest: ExpansionManifest) {
  return manifest.raids.flatMap((raid) =>
    raid.bosses
      .filter((boss) => boss.verification === 'provisional')
      .map((boss) => ({ raid: raid.name, bossKey: boss.key, name: boss.name })),
  )
}

// Returns a copy of the Forever manifest with the edit applied to one raid's
// boss list, so a test never mutates the committed constant.
function withRaidBosses(
  raidName: string,
  edit: (bosses: ExpansionManifest['raids'][number]['bosses']) => ExpansionManifest['raids'][number]['bosses'],
): ExpansionManifest {
  return {
    ...FOREVER_MANIFEST,
    raids: FOREVER_MANIFEST.raids.map((raid) =>
      raid.name === raidName ? { ...raid, bosses: edit(raid.bosses) } : raid,
    ),
  }
}

function snapshotWithOnyxia(name = 'Onyxia'): ReferenceSnapshot {
  const base = syntheticSnapshot()
  const tables = {
    ...base.tables,
    DungeonEncounter: [{ ID: 1084, Name_lang: name, MapID: 249, OrderIndex: 0, DifficultyID: 0 }],
  }
  const build = base.build as string
  return {
    ...base,
    tables,
    sha256: createHash('sha256').update(canonicalSnapshotPayload({ build, tables })).digest('hex'),
  }
}

describe('provisional allowlist ratchet (D-15)', () => {
  it('holds exactly the nine provisional manifest bosses, in manifest order', () => {
    const allowlist = readAllowlist()
    expect(allowlist).toHaveLength(9)
    expect(allowlist).toEqual(provisionalBosses(FOREVER_MANIFEST))
    expect(allowlist.every((entry) => entry.raid && entry.bossKey && entry.name)).toBe(true)
  })

  it('PROVISIONAL_CEILING equals the allowlist size today', () => {
    expect(PROVISIONAL_CEILING).toBe(9)
    expect(readAllowlist()).toHaveLength(PROVISIONAL_CEILING)
  })

  it('passes for the committed manifest and allowlist', () => {
    expect(checkProvisionalAllowlist(FOREVER_MANIFEST, readAllowlist())).toEqual([])
  })

  it('names a provisional boss that was dropped from the allowlist', () => {
    const allowlist = readAllowlist()
    const dropped = allowlist[2]
    const errors = checkProvisionalAllowlist(
      FOREVER_MANIFEST,
      allowlist.filter((entry) => entry !== dropped),
    )
    expect(errors.some((error) => error.includes(dropped.bossKey))).toBe(true)
  })

  it('rejects a stale entry for a boss that is not in the manifest', () => {
    const stale = { raid: 'Barrow Deeps', bossKey: 'not-a-boss', name: 'Not A Boss' }
    const errors = checkProvisionalAllowlist(FOREVER_MANIFEST, [...readAllowlist(), stale])
    expect(errors.some((error) => error.includes('not-a-boss'))).toBe(true)
  })

  it('rejects an allowlist entry for a boss that has been promoted to verified', () => {
    const promoted = withRaidBosses("Onyxia's Lair", (bosses) =>
      bosses.map((boss) => ({
        ...boss,
        verification: 'verified' as const,
        verifiedBy: 'wago-dungeon-encounter' as const,
        encounterId: 1084,
      })),
    )
    const errors = checkProvisionalAllowlist(promoted, readAllowlist())
    expect(errors.some((error) => error.includes('onyxia'))).toBe(true)
  })

  it('rejects a ten-entry allowlist against the ceiling of 9', () => {
    const extra = { raid: 'Barrow Deeps', bossKey: 'extra', name: 'Extra' }
    const errors = checkProvisionalAllowlist(FOREVER_MANIFEST, [...readAllowlist(), extra])
    expect(errors.some((error) => error.includes('PROVISIONAL_CEILING'))).toBe(true)
  })

  it('tells the author to lower the ceiling to 8 after one promotion', () => {
    const promoted = withRaidBosses("Onyxia's Lair", (bosses) =>
      bosses.map((boss) => ({
        ...boss,
        verification: 'verified' as const,
        verifiedBy: 'wago-dungeon-encounter' as const,
        encounterId: 1084,
      })),
    )
    const allowlist = readAllowlist().filter((entry) => entry.bossKey !== 'onyxia')
    expect(allowlist).toHaveLength(8)
    const errors = checkProvisionalAllowlist(promoted, allowlist)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('PROVISIONAL_CEILING')
    expect(errors[0]).toContain('8')
    // Lowering the ceiling in the same PR clears it.
    expect(checkProvisionalAllowlist(promoted, allowlist, 8)).toEqual([])
  })

  it('allows the D-15 growth exception only with a reviewed ceiling raise', () => {
    const grown = withRaidBosses('Hyjal Summit', () => [
      {
        key: 'new-hyjal-boss',
        name: 'New Hyjal Boss',
        verification: 'provisional' as const,
        source: 'owner input 2026-10-21',
        encounterId: null,
      },
    ])
    const allowlist = [...readAllowlist(), { raid: 'Hyjal Summit', bossKey: 'new-hyjal-boss', name: 'New Hyjal Boss' }]
    expect(allowlist).toHaveLength(10)
    expect(checkProvisionalAllowlist(grown, allowlist, 10)).toEqual([])
    const unraised = checkProvisionalAllowlist(grown, allowlist)
    expect(unraised.length).toBeGreaterThan(0)
    expect(unraised.some((error) => error.includes('PROVISIONAL_CEILING'))).toBe(true)
  })
})

describe('promotion forced by a snapshot (D-15)', () => {
  it('no allowlisted boss is promotable against the committed snapshot', () => {
    const snapshot = ReferenceSnapshotSchema.parse(readCommittedSnapshot())
    const promotable = findPromotableBosses(FOREVER_MANIFEST, readAllowlist(), snapshot)
    expect(
      promotable,
      `Promote ${promotable.map((p) => p.bossKey).join(', ')} in data/expansions/forever/manifest.ts ` +
        '(verification verified, verifiedBy wago-dungeon-encounter, encounterId set), remove them from ' +
        `data/expansions/forever/provisional-allowlist.json and lower PROVISIONAL_CEILING by ${promotable.length}, ` +
        'all in the same PR as the snapshot (D-15).',
    ).toEqual([])
  })

  it('reports Onyxia with its encounter ID when the snapshot names it', () => {
    const found = findPromotableBosses(FOREVER_MANIFEST, readAllowlist(), snapshotWithOnyxia())
    expect(found).toHaveLength(1)
    expect(found[0]).toMatchObject({ bossKey: 'onyxia', encounterId: 1084 })
  })

  it('matches a case or spacing variant of the name', () => {
    const found = findPromotableBosses(FOREVER_MANIFEST, readAllowlist(), snapshotWithOnyxia('  ONYXIA '))
    expect(found.map((entry) => entry.bossKey)).toEqual(['onyxia'])
  })

  it('does not report a boss that is not on the allowlist', () => {
    const found = findPromotableBosses(FOREVER_MANIFEST, [], snapshotWithOnyxia())
    expect(found).toEqual([])
  })

  it('does not report a boss whose name is not in the snapshot', () => {
    const found = findPromotableBosses(FOREVER_MANIFEST, readAllowlist(), snapshotWithOnyxia('Nefarian'))
    expect(found).toEqual([])
  })
})

describe('checkVerifiedEncounters', () => {
  const verifiedOnyxia = withRaidBosses("Onyxia's Lair", (bosses) =>
    bosses.map((boss) => ({
      ...boss,
      verification: 'verified' as const,
      verifiedBy: 'wago-dungeon-encounter' as const,
      encounterId: 1084,
    })),
  )

  it('passes when the snapshot holds the verified boss encounter ID', () => {
    expect(checkVerifiedEncounters(verifiedOnyxia, snapshotWithOnyxia())).toEqual([])
  })

  it('fails against the empty committed snapshot', () => {
    const empty = ReferenceSnapshotSchema.parse(readCommittedSnapshot())
    const errors = checkVerifiedEncounters(verifiedOnyxia, empty)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('onyxia')
    expect(errors[0]).toContain('1084')
  })

  it('ignores provisional bosses and owner-verified bosses', () => {
    const ownerVerified = withRaidBosses("Onyxia's Lair", (bosses) =>
      bosses.map((boss) => ({ ...boss, verification: 'verified' as const, verifiedBy: 'owner' as const })),
    )
    const empty = ReferenceSnapshotSchema.parse(readCommittedSnapshot())
    expect(checkVerifiedEncounters(FOREVER_MANIFEST, empty)).toEqual([])
    expect(checkVerifiedEncounters(ownerVerified, empty)).toEqual([])
  })
})

describe('no live fetch from this plan (prohibition 1)', () => {
  // Scope: the TypeScript files this plan owns. The only network-touching
  // module is scripts/lib/wago-snapshot.ts (plan 02-08). The patterns are built
  // from fragments so this file does not match its own scan.
  const WAGO_HOST = ['wago', 'tools'].join('.')
  const FETCH_CALL = ['fetch', '('].join('')
  const OWNED_TS_FILES = [
    path.join(__dirname, '..', '..', '..', 'domain', 'expansion', 'reference-snapshot-schema.ts'),
    path.join(__dirname, '..', 'forever', 'reference-check.ts'),
    __filename,
  ]

  it('holds neither the wago host nor a fetch call in any owned .ts file', () => {
    for (const file of OWNED_TS_FILES) {
      const source = readFileSync(file, 'utf8')
      expect(source.includes(WAGO_HOST), `${path.basename(file)} names the wago host`).toBe(false)
      expect(source.includes(FETCH_CALL), `${path.basename(file)} calls fetch`).toBe(false)
    }
  })

  it('keeps the wago host out of the barrel and only in the placeholder JSON', () => {
    expect(readFileSync(SNAPSHOT_PATH, 'utf8')).toContain(WAGO_HOST)
    const barrel = readFileSync(path.join(__dirname, '..', '..', '..', 'domain', 'expansion', 'index.ts'), 'utf8')
    expect(barrel.includes(WAGO_HOST)).toBe(false)
  })
})
