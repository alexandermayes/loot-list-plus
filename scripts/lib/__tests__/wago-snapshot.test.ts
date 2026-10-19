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
  RetryableHttpError,
  TerminalHttpError,
  USER_AGENT,
  WAGO_BASE_URL,
  parseTable,
  refreshSnapshot,
  resolveBuild,
  trimToManifest,
  withRetry,
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

  it('drops a same-named encounter that sits on another raid map, keeping the raid-map row', () => {
    // A Classic-style "Onyxia" row on map 1 (Eastern Kingdoms) must not be kept
    // or treated as evidence for the Forever boss; the one on map 249 stays.
    const withCollision = {
      ...tables,
      DungeonEncounter: [
        ...tables.DungeonEncounter,
        { ID: 9001, Name_lang: 'Onyxia', MapID: 1, OrderIndex: 0, DifficultyID: 0 },
      ],
    }
    const trimmed = trimToManifest(withCollision, FOREVER_MANIFEST)
    expect(trimmed.DungeonEncounter.map((row) => row.ID)).toEqual([1001, 1002, 1003])
  })

  it('drops a boss-named encounter when no map matches its raid', () => {
    const noMaps = { ...tables, Map: [] }
    expect(trimToManifest(noMaps, FOREVER_MANIFEST).DungeonEncounter).toEqual([])
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

  // A 200 with a header and no rows must not become an "updated" snapshot with
  // empty tables; it is a terminal error, not an outage, so the workflow goes red.
  it.each(['DungeonEncounter', 'Map'] as const)(
    'throws and writes nothing when the untrimmed %s table has no rows',
    async (table) => {
      const header = table === 'DungeonEncounter' ? ENCOUNTER_CSV.split('\n')[0] : MAP_CSV.split('\n')[0]
      const { fetchImpl } = recordingFetch(wagoRoutes(BUILD, { [table]: header }))
      const deps = makeDeps({ fetchImpl })

      await expect(refreshSnapshot(deps)).rejects.toThrow(`${table}: wago returned no rows for build ${BUILD}`)
      expect(deps.writeSnapshot).not.toHaveBeenCalled()
      expect(deps.sleep).not.toHaveBeenCalled()
    },
  )

  it('logs the untrimmed row counts so a reviewer can tell the pull was real', async () => {
    const deps = makeDeps({ fetchImpl: recordingFetch(wagoRoutes(BUILD)).fetchImpl })
    await refreshSnapshot(deps)
    const lines = (deps.log as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]))
    expect(lines).toContain(`pulled 4 encounters, 3 maps, 1 items for build ${BUILD}`)
  })

  it('throws when the built snapshot fails the schema, before any write', async () => {
    const { fetchImpl } = recordingFetch(wagoRoutes(BUILD))
    const deps = makeDeps({ fetchImpl, now: () => 'last tuesday' })
    await expect(refreshSnapshot(deps)).rejects.toThrow(/ReferenceSnapshotSchema/)
    expect(deps.writeSnapshot).not.toHaveBeenCalled()
  })
})

describe('withRetry', () => {
  function recordingSleep() {
    const delays: number[] = []
    return { delays, sleep: async (ms: number) => void delays.push(ms) }
  }

  it('ends exhausted after 5 attempts of 503, sleeping 2000, 4000, 8000, 16000 ms at random 0.5', async () => {
    const { delays, sleep } = recordingSleep()
    const fn = vi.fn(async () => {
      throw new RetryableHttpError('GET failed with HTTP 503', 503)
    })
    const result = await withRetry(fn, { sleep, random: () => 0.5 })

    expect(result).toEqual({ kind: 'exhausted', attempts: 5, lastStatus: 503 })
    expect(fn).toHaveBeenCalledTimes(5)
    expect(delays).toEqual([2000, 4000, 8000, 16000])
  })

  it('succeeds on attempt 3 after 503, 503, 200', async () => {
    const { delays, sleep } = recordingSleep()
    let call = 0
    const result = await withRetry(
      async () => {
        call += 1
        if (call < 3) throw new RetryableHttpError('HTTP 503', 503)
        return 'body'
      },
      { sleep, random: () => 0.5 },
    )

    expect(result).toEqual({ kind: 'ok', value: 'body', attempts: 3 })
    expect(delays).toEqual([2000, 4000])
  })

  it('uses Retry-After in place of the computed delay, and caps it', async () => {
    const { delays, sleep } = recordingSleep()
    const retryAfter = [7000, 999_000]
    let call = 0
    await withRetry(
      async () => {
        const next = retryAfter[call]
        call += 1
        if (next !== undefined) throw new RetryableHttpError('HTTP 429', 429, next)
        return 'body'
      },
      { sleep, random: () => 0.5 },
    )
    expect(delays).toEqual([7000, 60_000])
  })

  it('never sleeps longer than the cap, jitter included', async () => {
    const { delays, sleep } = recordingSleep()
    await withRetry(
      async () => {
        throw new RetryableHttpError('HTTP 503', 503)
      },
      { attempts: 12, sleep, random: () => 0.999 },
    )
    expect(delays).toHaveLength(11)
    expect(Math.max(...delays)).toBeLessThanOrEqual(60_000)
    expect(delays[delays.length - 1]).toBe(60_000)
  })

  it('jitters each delay by plus or minus 25 percent', async () => {
    const low = recordingSleep()
    const high = recordingSleep()
    const fail = async () => {
      throw new RetryableHttpError('HTTP 503', 503)
    }
    await withRetry(fail, { attempts: 2, sleep: low.sleep, random: () => 0 })
    await withRetry(fail, { attempts: 2, sleep: high.sleep, random: () => 1 })
    expect(low.delays).toEqual([1500])
    expect(high.delays).toEqual([2500])
  })

  it('rethrows a terminal error at once, without sleeping', async () => {
    const { delays, sleep } = recordingSleep()
    const fn = vi.fn(async () => {
      throw new TerminalHttpError('GET failed with HTTP 404', 404)
    })
    await expect(withRetry(fn, { sleep })).rejects.toThrow(/404/)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(delays).toEqual([])
  })

  it('rethrows an error that is not an HTTP error instead of retrying it', async () => {
    const { sleep } = recordingSleep()
    const fn = vi.fn(async () => {
      throw new TypeError('bug in the caller')
    })
    await expect(withRetry(fn, { sleep })).rejects.toThrow('bug in the caller')
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('retry through refreshSnapshot', () => {
  const BUILD = '1.60.1.70009'
  const RETRYABLE_STATUSES = [403, 429, 500, 502, 503, 504]

  /** Answers the builds call from `first` in order, then behaves like wagoRoutes. */
  function buildsThen(first: Array<number | Response | Error>, build = BUILD): { route: Route; buildCalls: () => number } {
    const queue = [...first]
    let buildCalls = 0
    const normal = wagoRoutes(build)
    const route: Route = (url) => {
      if (url !== BUILDS_URL) return normal(url)
      buildCalls += 1
      const next = queue.shift()
      if (next === undefined) return normal(url)
      if (next instanceof Error) throw next
      return typeof next === 'number' ? new Response('unavailable', { status: next }) : next
    }
    return { route, buildCalls: () => buildCalls }
  }

  function sleepDelays(deps: RefreshDeps): number[] {
    return (deps.sleep as ReturnType<typeof vi.fn>).mock.calls.map((call) => call[0] as number)
  }

  it.each(RETRYABLE_STATUSES)('treats %i that never clears as an outage after 5 attempts and writes nothing', async (status) => {
    const { fetchImpl, calls } = recordingFetch(() => new Response('unavailable', { status }))
    const deps = makeDeps({ fetchImpl })
    const result = await refreshSnapshot(deps)

    expect(result).toEqual({ outcome: 'outage', attempts: 5, lastStatus: status })
    expect(calls).toHaveLength(5)
    expect(sleepDelays(deps)).toEqual([2000, 4000, 8000, 16000])
    expect(deps.writeSnapshot).not.toHaveBeenCalled()
  })

  it.each(RETRYABLE_STATUSES)('recovers when %i clears on the third attempt', async (status) => {
    const { route, buildCalls } = buildsThen([status, status])
    const { fetchImpl } = recordingFetch(route)
    const deps = makeDeps({ fetchImpl })
    const result = await refreshSnapshot(deps)

    expect(result.outcome).toBe('updated')
    expect(buildCalls()).toBe(3)
    expect(sleepDelays(deps)).toEqual([2000, 4000])
  })

  it('makes the next sleep Retry-After seconds when the header is present', async () => {
    const throttled = new Response('slow down', { status: 429, headers: { 'Retry-After': '7' } })
    const { route } = buildsThen([throttled])
    const deps = makeDeps({ fetchImpl: recordingFetch(route).fetchImpl })
    await refreshSnapshot(deps)
    expect(sleepDelays(deps)).toEqual([7000])
  })

  it('ignores a Retry-After header it cannot read and falls back to backoff', async () => {
    const odd = new Response('slow down', { status: 503, headers: { 'Retry-After': 'soon' } })
    const { route } = buildsThen([odd])
    const deps = makeDeps({ fetchImpl: recordingFetch(route).fetchImpl })
    await refreshSnapshot(deps)
    expect(sleepDelays(deps)).toEqual([2000])
  })

  it('retries a network error and a timeout', async () => {
    const timeout = new DOMException('The operation timed out.', 'TimeoutError')
    const abort = new DOMException('This operation was aborted', 'AbortError')
    const { route, buildCalls } = buildsThen([new TypeError('fetch failed'), timeout, abort])
    const deps = makeDeps({ fetchImpl: recordingFetch(route).fetchImpl })
    const result = await refreshSnapshot(deps)

    expect(result.outcome).toBe('updated')
    expect(buildCalls()).toBe(4)
    expect(sleepDelays(deps)).toEqual([2000, 4000, 8000])
  })

  it('treats a network error that never clears as an outage with no status', async () => {
    const fetchImpl = (async () => {
      throw new TypeError('fetch failed')
    }) as typeof fetch
    const deps = makeDeps({ fetchImpl })
    const result = await refreshSnapshot(deps)

    expect(result).toEqual({ outcome: 'outage', attempts: 5, lastStatus: null })
    expect(deps.writeSnapshot).not.toHaveBeenCalled()
  })

  it('succeeds on attempt 3 after 403, 403, 200 with the identifying User-Agent on all three requests', async () => {
    const { route } = buildsThen([403, 403])
    const { fetchImpl, calls } = recordingFetch(route)
    const deps = makeDeps({ fetchImpl })
    const result = await refreshSnapshot(deps)

    expect(result.outcome).toBe('updated')
    expect(sleepDelays(deps)).toEqual([2000, 4000])
    const buildRequests = calls.filter((call) => call.url === BUILDS_URL)
    expect(buildRequests).toHaveLength(3)
    for (const call of buildRequests) expect(call.headers['User-Agent']).toBe(USER_AGENT)
  })

  it('never sends a second identity: five 403 responses are an outage and every attempt carries only USER_AGENT', async () => {
    const { fetchImpl, calls } = recordingFetch(() => new Response('forbidden', { status: 403 }))
    const deps = makeDeps({ fetchImpl })
    const result = await refreshSnapshot(deps)

    expect(result).toEqual({ outcome: 'outage', attempts: 5, lastStatus: 403 })
    expect(calls).toHaveLength(5)
    for (const call of calls) expect(call.headers).toEqual({ 'User-Agent': USER_AGENT })
    expect(new Set(calls.map((call) => call.headers['User-Agent']))).toEqual(new Set([USER_AGENT]))
  })

  it.each([403, 503])('returns an outage when %i persists on a table call, writing nothing', async (status) => {
    const normal = wagoRoutes(BUILD)
    const route: Route = (url) =>
      url === tableUrl('ItemSparse', BUILD) ? new Response('unavailable', { status }) : normal(url)
    const { fetchImpl, calls } = recordingFetch(route)
    const deps = makeDeps({ fetchImpl })
    const result = await refreshSnapshot(deps)

    expect(result).toEqual({ outcome: 'outage', attempts: 5, lastStatus: status })
    expect(deps.writeSnapshot).not.toHaveBeenCalled()
    for (const call of calls) expect(call.headers['User-Agent']).toBe(USER_AGENT)
  })

  it.each([400, 401, 404, 410])('throws on a %i from the builds call at once, with no retry and no sleep', async (status) => {
    const { fetchImpl, calls } = recordingFetch(() => new Response('nope', { status }))
    const deps = makeDeps({ fetchImpl })
    await expect(refreshSnapshot(deps)).rejects.toThrow(new RegExp(String(status)))
    expect(calls).toHaveLength(1)
    expect(deps.sleep).not.toHaveBeenCalled()
    expect(deps.writeSnapshot).not.toHaveBeenCalled()
  })

  it('throws on a 404 from a table call instead of reporting an outage', async () => {
    const normal = wagoRoutes(BUILD)
    const route: Route = (url) =>
      url === tableUrl('Map', BUILD) ? new Response('Table not found', { status: 404 }) : normal(url)
    const deps = makeDeps({ fetchImpl: recordingFetch(route).fetchImpl })
    await expect(refreshSnapshot(deps)).rejects.toThrow(/404/)
    expect(deps.sleep).not.toHaveBeenCalled()
    expect(deps.writeSnapshot).not.toHaveBeenCalled()
  })

  it('logs each retry with the attempt, the status and the delay', async () => {
    const { route } = buildsThen([503])
    const deps = makeDeps({ fetchImpl: recordingFetch(route).fetchImpl })
    await refreshSnapshot(deps)
    const lines = (deps.log as ReturnType<typeof vi.fn>).mock.calls.map((call) => String(call[0]))
    expect(lines.some((line) => /attempt 1/.test(line) && /503/.test(line) && /2000/.test(line))).toBe(true)
  })
})
