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
import { FOREVER_MANIFEST } from '../forever/manifest'

// Why this test exists: the Forever boss names came from third-party guides and
// are not in wago DungeonEncounter yet (D-12), and wago.tools answered 503 on
// every 2026-10-12 probe, so nothing in this phase may wait on it (D-14). The
// committed snapshot starts as a placeholder (build null, empty tables) that
// this test validates strictly; the first successful refresh (plan 02-08/02-09)
// replaces it with real rows. The snapshot is data-only JSON, never generated
// TypeScript, and this file never touches the network.

const REFERENCE_DIR = path.join(__dirname, '..', 'forever', 'reference')
const SNAPSHOT_PATH = path.join(REFERENCE_DIR, 'wago.json')

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
