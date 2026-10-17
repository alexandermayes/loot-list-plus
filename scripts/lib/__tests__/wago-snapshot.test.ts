// @vitest-environment node
import { createHash } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  ReferenceSnapshotSchema,
  canonicalSnapshotPayload,
  type ReferenceSnapshot,
} from '@/domain/expansion/reference-snapshot-schema'
import type { ExpansionManifest } from '@/domain/expansion/manifest-schema'
import { FOREVER_MANIFEST } from '@/data/expansions/forever/manifest'
import type { ProvisionalAllowlistEntry } from '@/data/expansions/forever/reference-check'
import {
  EXPECTED_HEADERS,
  PINNED_TABLES,
  USER_AGENT,
  WAGO_BASE_URL,
  parseTable,
  refreshSnapshot,
  resolveBuild,
  trimToManifest,
  type RefreshDeps,
} from '../wago-snapshot'

// Why this file exists: the snapshot library is the only code in the repo allowed
// to touch the wago service, and it runs only in the scheduled workflow. Every
// test therefore injects fetch and stubs the global one to throw, so a stray live
// call fails loudly instead of quietly hitting a third party. URLs are built from
// WAGO_BASE_URL so this file never holds the host literal (the no-live-fetch scan
// in plan 02-09 reads test sources too).

const liveFetch = vi.fn(() => {
  throw new Error('live network forbidden in tests')
})

beforeAll(() => {
  vi.stubGlobal('fetch', liveFetch)
})

afterAll(() => {
  const calls = liveFetch.mock.calls.length
  vi.unstubAllGlobals()
  expect(calls).toBe(0)
})

const BUILDS_URL = `${WAGO_BASE_URL}/api/builds`
const tableUrl = (table: string, build: string) =>
  `${WAGO_BASE_URL}/db2/${table}/csv?build=${build}`

const PLACEHOLDER: ReferenceSnapshot = {
  source: `${WAGO_BASE_URL}/db2/{table}/csv?build={build}`,
  product: 'wow_classic_beta',
  buildPrefix: '1.60.',
  build: null,
  fetchedAt: null,
  sha256: null,
  tables: { DungeonEncounter: [], Map: [], ItemSparse: [] },
}

const ALLOWLIST: ProvisionalAllowlistEntry[] = [
  { raid: "Onyxia's Lair", bossKey: 'onyxia', name: 'Onyxia' },
  { raid: 'Barrow Deeps', bossKey: 'amethrax', name: 'Amethrax' },
]

// The extra Bit column proves parseTable picks only the expected columns.
const ENCOUNTER_CSV = [
  'ID,Name_lang,MapID,OrderIndex,DifficultyID,Bit',
  '1001,Onyxia,249,0,9,0',
  '1002,"Deepscar  Matriarch",900,1,9,1',
  '1003,"  DEEPSCAR MATRIARCH ",900,2,9,2',
  '1004,Unrelated Boss,1,0,0,3',
].join('\n')

const MAP_CSV = [
  'ID,MapName_lang,InstanceType,ExpansionID,Directory',
  `249,Onyxia’s Lair,2,0,OnyxiasLairInstance`,
  '900,Barrow Deeps,2,2,BarrowDeeps',
  '1,Eastern Kingdoms,0,0,Azeroth',
].join('\n')

const ITEM_CSV = ['ID,Display_lang,InventoryType', '17182,Sulfuras,17'].join('\n')

type Route = (url: string) => Response | Promise<Response>

function recordingFetch(route: Route) {
  const calls: { url: string; headers: Record<string, string> }[] = []
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, headers: { ...(init?.headers as Record<string, string> | undefined) } })
    return route(url)
  }) as typeof fetch
  return { fetchImpl, calls }
}

function wagoRoutes(
  build: string,
  csv: { DungeonEncounter?: string; Map?: string; ItemSparse?: string } = {},
): Route {
  return (url) => {
    if (url === BUILDS_URL) return new Response(JSON.stringify(['1.60.0.68000', build, '1.59.9.99999']))
    if (url === tableUrl('DungeonEncounter', build)) return new Response(csv.DungeonEncounter ?? ENCOUNTER_CSV)
    if (url === tableUrl('Map', build)) return new Response(csv.Map ?? MAP_CSV)
    if (url === tableUrl('ItemSparse', build)) return new Response(csv.ItemSparse ?? ITEM_CSV)
    return new Response('not found', { status: 404 })
  }
}

function makeDeps(overrides: Partial<RefreshDeps> & Pick<RefreshDeps, 'fetchImpl'>): RefreshDeps & {
  writeSnapshot: ReturnType<typeof vi.fn>
} {
  const writeSnapshot = vi.fn()
  return {
    sleep: vi.fn(async () => {}),
    random: () => 0.5,
    now: () => '2026-10-16T22:00:00.000Z',
    readCommitted: () => PLACEHOLDER,
    writeSnapshot,
    manifest: FOREVER_MANIFEST,
    allowlist: ALLOWLIST,
    log: vi.fn(),
    ...overrides,
  } as RefreshDeps & { writeSnapshot: ReturnType<typeof vi.fn> }
}

describe('resolveBuild', () => {
  it('accepts a flat list of version strings', () => {
    expect(resolveBuild(['1.60.1.9', '1.60.1.70009', '2.0.0.1'], '1.60.', 'wow_classic_beta')).toBe('1.60.1.70009')
  })

  it('accepts a list of objects with a version field', () => {
    const list = [{ version: '1.60.0.68000' }, { version: '1.60.1.70009' }, { version: '1.60.1.9' }]
    expect(resolveBuild(list, '1.60.', 'wow_classic_beta')).toBe('1.60.1.70009')
  })

  it('accepts an object keyed by product', () => {
    const keyed = {
      wow: [{ version: '1.60.9.99999' }],
      wow_classic_beta: [{ version: '1.60.1.9' }, { version: '1.60.1.70009' }],
    }
    expect(resolveBuild(keyed, '1.60.', 'wow_classic_beta')).toBe('1.60.1.70009')
  })

  it('compares the last segment numerically, never the first listed or the lexicographic maximum', () => {
    // Lexicographically '1.60.1.9' > '1.60.1.70009', and 1.60.0.68000 is listed first.
    expect(resolveBuild(['1.60.0.68000', '1.60.1.9', '1.60.1.70009'], '1.60.', 'wow_classic_beta')).toBe(
      '1.60.1.70009',
    )
  })

  it('throws naming the prefix when no build matches', () => {
    expect(() => resolveBuild(['1.59.0.1', '2.0.0.1'], '1.60.', 'wow_classic_beta')).toThrow(
      'no build starting with "1.60."',
    )
  })

  it('throws naming the prefix when the product is absent from a keyed list', () => {
    expect(() => resolveBuild({ wow: ['1.60.1.1'] }, '1.60.', 'wow_classic_beta')).toThrow(
      'no build starting with "1.60."',
    )
  })

  it('throws on a payload that is not a list or an object', () => {
    expect(() => resolveBuild('nope', '1.60.', 'wow_classic_beta')).toThrow(/unrecognised builds list/)
  })
})

describe('parseTable', () => {
  it('handles a BOM, CRLF and a quoted Name_lang with a comma and an apostrophe', () => {
    const csv = '﻿ID,Name_lang,MapID,OrderIndex,DifficultyID\r\n7,"Lord, of O\'Neill",3,1,9\r\n8,Plain,3,2,9\r\n'
    expect(parseTable(csv, 'DungeonEncounter')).toEqual([
      { ID: 7, Name_lang: "Lord, of O'Neill", MapID: 3, OrderIndex: 1, DifficultyID: 9 },
      { ID: 8, Name_lang: 'Plain', MapID: 3, OrderIndex: 2, DifficultyID: 9 },
    ])
  })

  it('keeps only the expected columns', () => {
    const [row] = parseTable(ENCOUNTER_CSV, 'DungeonEncounter')
    expect(Object.keys(row).sort()).toEqual([...EXPECTED_HEADERS.DungeonEncounter].sort())
  })

  it('names every missing expected header', () => {
    const csv = 'ID,MapID,OrderIndex,DifficultyID\n1,2,3,4'
    expect(() => parseTable(csv, 'DungeonEncounter')).toThrow('missing expected header(s) Name_lang')
  })

  it('treats a header-only CSV as zero rows, not as an error', () => {
    expect(parseTable('ID,Display_lang,InventoryType\n', 'ItemSparse')).toEqual([])
  })

  it('throws on a non-integer ID', () => {
    const csv = 'ID,Display_lang,InventoryType\n12x,Sword,13'
    expect(() => parseTable(csv, 'ItemSparse')).toThrow(/ItemSparse.*ID.*integer/)
  })

  it('throws on a fractional integer column', () => {
    const csv = 'ID,Display_lang,InventoryType\n12,Sword,1.5'
    expect(() => parseTable(csv, 'ItemSparse')).toThrow(/InventoryType.*integer/)
  })

  it('throws on a CSV with no header at all', () => {
    expect(() => parseTable('', 'Map')).toThrow(/missing expected header/)
  })
})

describe('trimToManifest', () => {
  const tables = {
    DungeonEncounter: parseTable(ENCOUNTER_CSV, 'DungeonEncounter'),
    Map: parseTable(MAP_CSV, 'Map'),
    ItemSparse: parseTable(ITEM_CSV, 'ItemSparse'),
  }

  it('keeps manifest boss names in any case or spacing and drops unrelated rows', () => {
    const trimmed = trimToManifest(tables, FOREVER_MANIFEST)
    expect(trimmed.DungeonEncounter.map((row) => row.ID)).toEqual([1001, 1002, 1003])
  })

  it('keeps Map rows by manifest raid name, curly apostrophe included', () => {
    const trimmed = trimToManifest(tables, FOREVER_MANIFEST)
    expect(trimmed.Map.map((row) => row.ID)).toEqual([249, 900])
  })

  it('returns ItemSparse [] while the manifest has no items', () => {
    expect(trimToManifest(tables, FOREVER_MANIFEST).ItemSparse).toEqual([])
  })

  it('keeps rows by manifest mapId and item id', () => {
    const manifest = {
      ...FOREVER_MANIFEST,
      raids: FOREVER_MANIFEST.raids.map((raid, index) => (index === 1 ? { ...raid, mapId: 1 } : raid)),
      // The schema forbids items today; a cast proves the rule is ready for them.
      items: { '17182': undefined as never },
    } satisfies ExpansionManifest
    const trimmed = trimToManifest(tables, manifest)
    expect(trimmed.DungeonEncounter.map((row) => row.ID)).toContain(1004)
    expect(trimmed.Map.map((row) => row.ID)).toContain(1)
    expect(trimmed.ItemSparse.map((row) => row.ID)).toEqual([17182])
  })

  it('sorts rows by ID', () => {
    const shuffled = { ...tables, Map: [...tables.Map].reverse() }
    expect(trimToManifest(shuffled, FOREVER_MANIFEST).Map.map((row) => row.ID)).toEqual([249, 900])
  })
})

describe('refreshSnapshot', () => {
  const BUILD = '1.60.1.70009'

  it('writes one schema-valid snapshot when the committed one is a placeholder, and reports promotable bosses', async () => {
    const { fetchImpl } = recordingFetch(wagoRoutes(BUILD))
    const deps = makeDeps({ fetchImpl })
    const result = await refreshSnapshot(deps)

    expect(result.outcome).toBe('updated')
    expect(deps.writeSnapshot).toHaveBeenCalledTimes(1)
    const written = deps.writeSnapshot.mock.calls[0][0] as ReferenceSnapshot
    expect(ReferenceSnapshotSchema.safeParse(written).success).toBe(true)
    expect(written.build).toBe(BUILD)
    expect(written.fetchedAt).toBe('2026-10-16T22:00:00.000Z')
    expect(written.product).toBe('wow_classic_beta')
    expect(written.buildPrefix).toBe('1.60.')
    expect(written.sha256).toBe(
      createHash('sha256')
        .update(canonicalSnapshotPayload({ build: BUILD, tables: written.tables }))
        .digest('hex'),
    )
    expect(written.tables.DungeonEncounter.map((row) => row.ID)).toEqual([1001, 1002, 1003])
    if (result.outcome !== 'updated') throw new Error('unreachable')
    expect(result.promotable).toEqual([{ ...ALLOWLIST[0], encounterId: 1001 }])
  })

  it('does not write when build and canonical hash equal the committed snapshot, even with a new clock', async () => {
    const first = makeDeps({ fetchImpl: recordingFetch(wagoRoutes(BUILD)).fetchImpl })
    await refreshSnapshot(first)
    const committed = first.writeSnapshot.mock.calls[0][0] as ReferenceSnapshot

    // Same data, rows listed in the opposite order, a later clock.
    const reordered = ENCOUNTER_CSV.split('\n')
    const shuffledCsv = [reordered[0], ...reordered.slice(1).reverse()].join('\n')
    const second = makeDeps({
      fetchImpl: recordingFetch(wagoRoutes(BUILD, { DungeonEncounter: shuffledCsv })).fetchImpl,
      readCommitted: () => committed,
      now: () => '2026-10-23T22:00:00.000Z',
    })
    const result = await refreshSnapshot(second)

    expect(result.outcome).toBe('unchanged')
    expect(second.writeSnapshot).not.toHaveBeenCalled()
  })

  it('writes when only the build changed', async () => {
    const first = makeDeps({ fetchImpl: recordingFetch(wagoRoutes(BUILD)).fetchImpl })
    await refreshSnapshot(first)
    const committed = first.writeSnapshot.mock.calls[0][0] as ReferenceSnapshot

    const newer = '1.60.1.70100'
    const second = makeDeps({
      fetchImpl: recordingFetch(wagoRoutes(newer)).fetchImpl,
      readCommitted: () => committed,
    })
    const result = await refreshSnapshot(second)

    expect(result.outcome).toBe('updated')
    expect(second.writeSnapshot).toHaveBeenCalledTimes(1)
    expect((second.writeSnapshot.mock.calls[0][0] as ReferenceSnapshot).build).toBe(newer)
  })

  it('writes when the data changed under the same build', async () => {
    const first = makeDeps({ fetchImpl: recordingFetch(wagoRoutes(BUILD)).fetchImpl })
    await refreshSnapshot(first)
    const committed = first.writeSnapshot.mock.calls[0][0] as ReferenceSnapshot

    const extra = `${ENCOUNTER_CSV}\n1005,Amethrax,900,3,9,4`
    const second = makeDeps({
      fetchImpl: recordingFetch(wagoRoutes(BUILD, { DungeonEncounter: extra })).fetchImpl,
      readCommitted: () => committed,
    })
    const result = await refreshSnapshot(second)

    expect(result.outcome).toBe('updated')
    expect(second.writeSnapshot).toHaveBeenCalledTimes(1)
  })

  it('sends the USER_AGENT header on every request and builds every URL from WAGO_BASE_URL', async () => {
    const { fetchImpl, calls } = recordingFetch(wagoRoutes(BUILD))
    await refreshSnapshot(makeDeps({ fetchImpl }))

    expect(calls.map((call) => call.url)).toEqual([
      BUILDS_URL,
      ...PINNED_TABLES.map((table) => tableUrl(table, BUILD)),
    ])
    for (const call of calls) expect(call.headers['User-Agent']).toBe(USER_AGENT)
  })

  it('throws with the status in the message on a non-2xx response', async () => {
    const { fetchImpl } = recordingFetch(() => new Response('nope', { status: 404 }))
    const deps = makeDeps({ fetchImpl })
    await expect(refreshSnapshot(deps)).rejects.toThrow(/404/)
    expect(deps.writeSnapshot).not.toHaveBeenCalled()
  })

  it('throws and writes nothing when no build starts with the prefix', async () => {
    const { fetchImpl } = recordingFetch(() => new Response(JSON.stringify(['1.59.0.1'])))
    const deps = makeDeps({ fetchImpl })
    await expect(refreshSnapshot(deps)).rejects.toThrow('no build starting with "1.60."')
    expect(deps.writeSnapshot).not.toHaveBeenCalled()
  })

  it('throws on a missing expected CSV header and writes nothing', async () => {
    const { fetchImpl } = recordingFetch(
      wagoRoutes(BUILD, { DungeonEncounter: 'ID,MapID,OrderIndex,DifficultyID\n1,2,3,4' }),
    )
    const deps = makeDeps({ fetchImpl })
    await expect(refreshSnapshot(deps)).rejects.toThrow('missing expected header(s) Name_lang')
    expect(deps.writeSnapshot).not.toHaveBeenCalled()
  })

  it('throws when the built snapshot fails the schema, before any write', async () => {
    const { fetchImpl } = recordingFetch(wagoRoutes(BUILD))
    const deps = makeDeps({ fetchImpl, now: () => 'last tuesday' })
    await expect(refreshSnapshot(deps)).rejects.toThrow(/ReferenceSnapshotSchema/)
    expect(deps.writeSnapshot).not.toHaveBeenCalled()
  })
})
