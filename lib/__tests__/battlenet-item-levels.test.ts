// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response global the fetch mock returns.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { readBaseItemLevel, resolveBaseItemLevels } from '@/lib/battlenet-item-levels'

// Quick task 261027-lzm: the Classic profile equipment response carries no
// per-item level, so the gear writers fill item_level from the Game Data item
// endpoint, cached per item id in item_base_levels. Synthetic ids and the
// token string test-token only: this repo is public.

interface CacheRow {
  wowhead_id: number
  item_level: number
}

interface FakeWorld {
  cached: CacheRow[]
  readError: { code: string } | null
  readThrows: boolean
  upsertError: { code: string } | null
  upsertThrows: boolean
  reads: number[][]
  upserts: { rows: Record<string, unknown>[]; options: unknown }[]
}

let world: FakeWorld

function freshWorld(): FakeWorld {
  return { cached: [], readError: null, readThrows: false, upsertError: null, upsertThrows: false, reads: [], upserts: [] }
}

/** A small fake of the service client: from('item_base_levels') only. */
function fakeClient(): SupabaseClient {
  const client = {
    from(table: string) {
      expect(table).toBe('item_base_levels')
      return {
        select() {
          return {
            in: async (_column: string, ids: number[]) => {
              world.reads.push(ids)
              if (world.readThrows) throw new Error('read boom')
              if (world.readError) return { data: null, error: world.readError }
              return { data: world.cached.filter(row => ids.includes(row.wowhead_id)), error: null }
            },
          }
        },
        upsert: async (rows: Record<string, unknown>[], options: unknown) => {
          world.upserts.push({ rows, options })
          if (world.upsertThrows) throw new Error('upsert boom')
          return { error: world.upsertError }
        },
      }
    },
  }
  return client as unknown as SupabaseClient
}

function itemResponse(level: unknown, status = 200) {
  return new Response(JSON.stringify(level === undefined ? { id: 1 } : { id: 1, level }), { status })
}

describe('readBaseItemLevel', () => {
  it.each([
    [{ level: 489 }, 489],
    [{ level: 1 }, 1],
    [{ level: 1999 }, 1999],
    [{ level: 0 }, null],
    [{ level: 2000 }, null],
    [{ level: 489.5 }, null],
    [{ level: '489' }, null],
    [{ level: null }, null],
    [{}, null],
    [null, null],
    ['text', null],
    [[489], null],
  ])('reads %j as %s', (json, expected) => {
    expect(readBaseItemLevel(json)).toBe(expected)
  })
})

describe('resolveBaseItemLevels', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    world = freshWorld()
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('resolves cache hits from the cache, never fetches and upserts nothing', async () => {
    world.cached = [
      { wowhead_id: 101, item_level: 463 },
      { wowhead_id: 102, item_level: 476 },
    ]

    const levels = await resolveBaseItemLevels(fakeClient(), 'us', 'test-token', [101, 102])

    expect(levels).toEqual(
      new Map([
        [101, 463],
        [102, 476],
      ]),
    )
    expect(fetchMock).not.toHaveBeenCalled()
    expect(world.upserts).toEqual([])
  })

  it('fetches a missing id once with the bearer token and static-classic namespace, then upserts one row', async () => {
    fetchMock.mockImplementation(async () => itemResponse(489))

    const levels = await resolveBaseItemLevels(fakeClient(), 'us', 'test-token', [101])

    expect(levels).toEqual(new Map([[101, 489]]))
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://us.api.blizzard.com/data/wow/item/101?locale=en_US')
    expect(init.headers).toEqual({
      Authorization: 'Bearer test-token',
      'Battlenet-Namespace': 'static-classic-us',
    })
    expect(world.upserts).toHaveLength(1)
    expect(world.upserts[0].options).toEqual({ onConflict: 'wowhead_id' })
    expect(world.upserts[0].rows).toEqual([
      { wowhead_id: 101, item_level: 489, fetched_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/) },
    ])
  })

  it('takes cached ids from the cache and fetches only the misses', async () => {
    world.cached = [{ wowhead_id: 101, item_level: 463 }]
    fetchMock.mockImplementation(async () => itemResponse(489))

    const levels = await resolveBaseItemLevels(fakeClient(), 'us', 'test-token', [101, 102])

    expect(levels).toEqual(
      new Map([
        [101, 463],
        [102, 489],
      ]),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain('/data/wow/item/102?')
    expect(world.upserts[0].rows).toEqual([expect.objectContaining({ wowhead_id: 102, item_level: 489 })])
  })

  it('gives no entry and upserts nothing for a 404 or any non-OK status', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/item/101?')) return itemResponse(489, 404)
      if (url.includes('/item/102?')) return itemResponse(489, 500)
      return itemResponse(489, 403)
    })

    const levels = await resolveBaseItemLevels(fakeClient(), 'us', 'test-token', [101, 102, 103])

    expect(levels.size).toBe(0)
    expect(world.upserts).toEqual([])
  })

  it.each([
    ['zero', 0],
    ['above the range', 2000],
    ['a fraction', 489.5],
    ['a string', '489'],
    ['null', null],
    ['missing', undefined],
  ])('gives no entry for a bad level (%s)', async (_label, level) => {
    fetchMock.mockImplementation(async () => itemResponse(level))

    const levels = await resolveBaseItemLevels(fakeClient(), 'us', 'test-token', [101])

    expect(levels.size).toBe(0)
    expect(world.upserts).toEqual([])
  })

  it('reads and fetches each duplicate id once', async () => {
    fetchMock.mockImplementation(async () => itemResponse(470))

    const levels = await resolveBaseItemLevels(fakeClient(), 'us', 'test-token', [101, 101, 102])

    expect(levels).toEqual(
      new Map([
        [101, 470],
        [102, 470],
      ]),
    )
    expect(world.reads).toEqual([[101, 102]])
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not reject when a fetch throws, and the other ids still resolve', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/item/101?')) throw new Error('network down')
      return itemResponse(489)
    })

    const levels = await resolveBaseItemLevels(fakeClient(), 'us', 'test-token', [101, 102])

    expect(levels).toEqual(new Map([[102, 489]]))
    expect(world.upserts[0].rows).toEqual([expect.objectContaining({ wowhead_id: 102 })])
  })

  it('does not reject when a timeout aborts the fetch, and passes an abort signal to it', async () => {
    fetchMock.mockImplementation(async (_url: string, init: { signal?: AbortSignal }) => {
      expect(init.signal).toBeInstanceOf(AbortSignal)
      const error = new Error('The operation was aborted due to timeout')
      error.name = 'TimeoutError'
      throw error
    })

    const levels = await resolveBaseItemLevels(fakeClient(), 'us', 'test-token', [101])

    expect(levels.size).toBe(0)
  })

  it('does not reject when the response body is not JSON', async () => {
    fetchMock.mockImplementation(async () => new Response('not json', { status: 200 }))

    await expect(resolveBaseItemLevels(fakeClient(), 'us', 'test-token', [101])).resolves.toEqual(new Map())
  })

  it('treats a cache read error as all misses and fetches the ids', async () => {
    world.readError = { code: '42P01' }
    fetchMock.mockImplementation(async () => itemResponse(489))

    const levels = await resolveBaseItemLevels(fakeClient(), 'us', 'test-token', [101, 102])

    expect(levels).toEqual(
      new Map([
        [101, 489],
        [102, 489],
      ]),
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('treats a thrown cache read as all misses', async () => {
    world.readThrows = true
    fetchMock.mockImplementation(async () => itemResponse(489))

    const levels = await resolveBaseItemLevels(fakeClient(), 'us', 'test-token', [101])

    expect(levels).toEqual(new Map([[101, 489]]))
  })

  it('does not reject on a returned upsert error and still returns the fetched levels', async () => {
    world.upsertError = { code: '42501' }
    fetchMock.mockImplementation(async () => itemResponse(489))

    const levels = await resolveBaseItemLevels(fakeClient(), 'us', 'test-token', [101])

    expect(levels).toEqual(new Map([[101, 489]]))
  })

  it('does not reject on a thrown upsert and still returns the fetched levels', async () => {
    world.upsertThrows = true
    fetchMock.mockImplementation(async () => itemResponse(489))

    const levels = await resolveBaseItemLevels(fakeClient(), 'us', 'test-token', [101])

    expect(levels).toEqual(new Map([[101, 489]]))
  })

  it('skips invalid ids with no request', async () => {
    fetchMock.mockImplementation(async () => itemResponse(489))

    const levels = await resolveBaseItemLevels(fakeClient(), 'us', 'test-token', [0, -1, 1.5, Number.NaN, 2147483648, 101])

    expect(levels).toEqual(new Map([[101, 489]]))
    expect(world.reads).toEqual([[101]])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('resolves an empty or all-invalid list to an empty Map with no read and no fetch', async () => {
    expect(await resolveBaseItemLevels(fakeClient(), 'us', 'test-token', [])).toEqual(new Map())
    expect(await resolveBaseItemLevels(fakeClient(), 'us', 'test-token', [0, -1, 1.5, Number.NaN])).toEqual(new Map())
    expect(world.reads).toEqual([])
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses the eu host and namespace for eu, and falls back to us for an unknown region', async () => {
    fetchMock.mockImplementation(async () => itemResponse(489))

    await resolveBaseItemLevels(fakeClient(), 'eu', 'test-token', [101])
    await resolveBaseItemLevels(fakeClient(), 'kr/../evil', 'test-token', [102])
    await resolveBaseItemLevels(fakeClient(), 'constructor', 'test-token', [103])

    const calls = fetchMock.mock.calls
    expect(calls[0][0]).toBe('https://eu.api.blizzard.com/data/wow/item/101?locale=en_US')
    expect(calls[0][1].headers['Battlenet-Namespace']).toBe('static-classic-eu')
    expect(calls[1][0]).toBe('https://us.api.blizzard.com/data/wow/item/102?locale=en_US')
    expect(calls[1][1].headers['Battlenet-Namespace']).toBe('static-classic-us')
    expect(calls[2][0]).toBe('https://us.api.blizzard.com/data/wow/item/103?locale=en_US')
    expect(calls[2][1].headers['Battlenet-Namespace']).toBe('static-classic-us')
  })

  it('never has more than 4 requests in flight with 9 missing ids', async () => {
    let inFlight = 0
    let peak = 0
    fetchMock.mockImplementation(async () => {
      inFlight += 1
      peak = Math.max(peak, inFlight)
      await new Promise(resolve => setTimeout(resolve, 5))
      inFlight -= 1
      return itemResponse(489)
    })

    const ids = [201, 202, 203, 204, 205, 206, 207, 208, 209]
    const levels = await resolveBaseItemLevels(fakeClient(), 'us', 'test-token', ids)

    expect(levels.size).toBe(9)
    expect(fetchMock).toHaveBeenCalledTimes(9)
    expect(peak).toBeLessThanOrEqual(4)
    expect(peak).toBeGreaterThan(1)
  })

  it('never logs the token', async () => {
    world.readError = { code: '42P01' }
    world.upsertError = { code: '42501' }
    fetchMock.mockImplementation(async () => itemResponse(489))

    await resolveBaseItemLevels(fakeClient(), 'us', 'test-token', [101])

    const logged = JSON.stringify(vi.mocked(console.error).mock.calls)
    expect(logged).not.toContain('test-token')
  })
})
