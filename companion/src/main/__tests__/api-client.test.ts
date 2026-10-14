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
  it('A1 only a 2xx is accepted: ok, 500 and a thrown fetch give accepted [0]', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(200, { data: { id: 'a1' } }))
      .mockResolvedValueOnce(json(500, { error: 'boom' }))
      .mockRejectedValueOnce(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)

    const result = await client().submitAwards([award(1), award(2), award(3)])

    expect(result).toEqual({ processed: 1, errors: 2, accepted: [0] })
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

    expect(result).toEqual({ processed: 2, errors: 0, accepted: [0, 1] })
  })
})

describe('ApiClient.submitAttendance (GH #320)', () => {
  it('A3 accepted holds input indices: a 500 then a 200 give accepted [1]', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(500, { error: 'boom' }))
      .mockResolvedValueOnce(json(200, { data: {} }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await client().submitAttendance([
      { raid_date: '2026-09-20', raid_name: "Temple of Ahn'Qiraj", attended: ['Thrall'] },
      { raid_date: '2026-09-21', raid_name: "Temple of Ahn'Qiraj", attended: ['Thrall'] },
    ])

    expect(result).toEqual({ processed: 1, errors: 1, accepted: [1] })
    expect(fetchMock.mock.calls[0][0]).toBe('https://lootlist.test/api/addon/attendance')
  })
})
