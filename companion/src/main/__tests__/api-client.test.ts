// @vitest-environment node
// Runs in the root vitest suite. companion/tsconfig.json excludes
// __tests__, so the companion typecheck never needs vitest's types.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ApiClient } from '../api-client'

/**
 * FIX-02: when GET /api/addon/guild-data answers 500 (a database read failed),
 * the companion must surface an error rather than syncing an empty guild.
 */

function clientWithAuth(): ApiClient {
  const client = new ApiClient('https://example.test')
  client.setAuth({ token: 'sync-token', guildId: 'g1' })
  return client
}

function stubFetch(body: unknown, status: number) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('ApiClient.getGuildData', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('C1 rejects with the route error message when guild-data answers 500', async () => {
    const fetchMock = stubFetch({ error: 'Internal server error' }, 500)
    await expect(clientWithAuth().getGuildData()).rejects.toThrow('Internal server error')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url] = fetchMock.mock.calls[0] as unknown as [string]
    expect(url).toBe('https://example.test/api/addon/guild-data?guild_id=g1')
  })

  it('C2 rejects with a generic message when a failed response carries no JSON body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<html>bad gateway</html>', { status: 502 })))
    await expect(clientWithAuth().getGuildData()).rejects.toThrow('Unknown error')
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
    await expect(clientWithAuth().getGuildData()).resolves.toEqual(body)
  })
})
