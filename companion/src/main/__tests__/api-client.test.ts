// @vitest-environment node
// Runs in the root vitest suite. companion/tsconfig.json excludes
// __tests__, so the companion typecheck never needs vitest's types.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClient } from '../api-client'
import type { PendingAwardRequest } from '../addon-format'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

function client(): ApiClient {
  const api = new ApiClient('https://lootlist.test')
  api.setAuth({ token: 'sync-token', guildId: 'g1' })
  return api
}

function award(wowheadId: number): PendingAwardRequest {
  return {
    wowhead_id: wowheadId,
    character_name: 'Thrall',
    awarded_at: '2026-09-20T20:00:00Z',
    awarded_date: '2026-09-20',
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('ApiClient.submitAwards (GH #320)', () => {
  it('A1 only a 2xx is accepted: ok, 500 and a thrown fetch give accepted [0] and one outcome per input', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(200, { data: { id: 'a1' } }))
      .mockResolvedValueOnce(json(500, { error: 'boom' }))
      .mockRejectedValueOnce(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)

    const result = await client().submitAwards([award(1), award(2), award(3)])

    expect(result).toEqual({
      processed: 1,
      errors: 2,
      accepted: [0],
      outcomes: [
        { status: 200, error: null },
        { status: 500, error: 'boom' },
        { status: null, error: 'network down' },
      ],
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://lootlist.test/api/addon/loot-award')
    expect(JSON.parse(init.body)).toMatchObject({ guild_id: 'g1' })
  })

  it('A2 a 200 already_recorded repeat is an accept', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(json(200, { data: { id: 'a1' } }))
        .mockResolvedValueOnce(json(200, { data: { already_recorded: true } })),
    )

    const result = await client().submitAwards([award(1), award(2)])

    expect(result).toEqual({
      processed: 2,
      errors: 0,
      accepted: [0, 1],
      outcomes: [
        { status: 200, error: null },
        { status: 200, error: null },
      ],
    })
  })

  // regression for #320
  it('A4 a rejection carries the status and the JSON error string, truncated to 200; a non-JSON body gives null (GH #320 follow-up)', async () => {
    const longError = 'x'.repeat(250)
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(json(404, { error: 'No loot item found for wowhead_id 20928' }))
        .mockResolvedValueOnce(new Response('Bad Gateway', { status: 502, headers: { 'Content-Type': 'text/plain' } }))
        .mockResolvedValueOnce(json(400, { error: longError })),
    )

    const result = await client().submitAwards([award(20928), award(2), award(3)])

    expect(result.accepted).toEqual([])
    expect(result.outcomes[0]).toEqual({ status: 404, error: 'No loot item found for wowhead_id 20928' })
    expect(result.outcomes[1]).toEqual({ status: 502, error: null })
    expect(result.outcomes[2].status).toBe(400)
    expect(result.outcomes[2].error).toHaveLength(200)
    expect(result.outcomes[2].error).toBe('x'.repeat(200))
  })

  it('A5 a thrown non-Error value gives status null and error null (GH #320 follow-up)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce('nope'))

    const result = await client().submitAwards([award(1)])

    expect(result).toEqual({
      processed: 0,
      errors: 1,
      accepted: [],
      outcomes: [{ status: null, error: null }],
    })
  })
})

describe('ApiClient.submitAttendance (GH #320)', () => {
  it('A3 accepted holds input indices: a 500 then a 200 give accepted [1] and matching outcomes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(500, { error: 'boom' }))
      .mockResolvedValueOnce(json(200, { data: {} }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await client().submitAttendance([
      { raid_date: '2026-09-20', raid_name: "Temple of Ahn'Qiraj", attended: ['Thrall'] },
      { raid_date: '2026-09-21', raid_name: "Temple of Ahn'Qiraj", attended: ['Thrall'] },
    ])

    expect(result).toEqual({
      processed: 1,
      errors: 1,
      accepted: [1],
      outcomes: [
        { status: 500, error: 'boom' },
        { status: 200, error: null },
      ],
    })
    expect(fetchMock.mock.calls[0][0]).toBe('https://lootlist.test/api/addon/attendance')
  })
})

/**
 * FIX-02: when GET /api/addon/guild-data answers 500 (a database read failed),
 * the companion must surface an error rather than syncing an empty guild.
 */
describe('ApiClient.getGuildData', () => {
  function stubFetch(body: unknown, status: number) {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }))
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('C1 rejects with the route error message when guild-data answers 500', async () => {
    const fetchMock = stubFetch({ error: 'Internal server error' }, 500)
    await expect(client().getGuildData()).rejects.toThrow('Internal server error')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url] = fetchMock.mock.calls[0] as unknown as [string]
    expect(url).toBe('https://lootlist.test/api/addon/guild-data?guild_id=g1')
  })

  it('C2 rejects with a generic message when a failed response carries no JSON body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>bad gateway</html>', { status: 502 })))
    await expect(client().getGuildData()).rejects.toThrow('Unknown error')
  })

  it('C3 resolves the body of a 200, BLP included', async () => {
    const body = {
      guildId: 'g1',
      guildName: 'Test Guild',
      expansionId: 'exp-1',
      phase: 4,
      settings: {},
      items: [],
      members: [],
      priorities: {},
      blp: { c1: { li1: 2 } },
      attendance: {},
    }
    stubFetch(body, 200)
    await expect(client().getGuildData()).resolves.toEqual(body)
  })
})
