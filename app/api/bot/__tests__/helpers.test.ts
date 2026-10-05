// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { checkBotAuth, resolveGuildFromDiscord, requireBotLookupAccess } from '../_helpers'

const BOT_KEY = 'test-bot-key'

function request(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/bot/priority', { headers })
}

beforeEach(() => {
  vi.stubEnv('BOT_API_KEY', BOT_KEY)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('checkBotAuth', () => {
  it('returns null for a correct token with either case of the Bot scheme', async () => {
    expect(checkBotAuth(request({ authorization: `Bot ${BOT_KEY}` }))).toBeNull()
    expect(checkBotAuth(request({ authorization: `bot ${BOT_KEY}` }))).toBeNull()
  })

  it('returns 401 for a wrong token of the same length and of a different length', async () => {
    const sameLength = checkBotAuth(request({ authorization: `Bot ${'x'.repeat(BOT_KEY.length)}` }))
    expect(sameLength?.status).toBe(401)
    const body1 = await sameLength!.json()
    expect(body1).toEqual({ error: 'Unauthorized' })

    const differentLength = checkBotAuth(request({ authorization: 'Bot short' }))
    expect(differentLength?.status).toBe(401)
  })

  it('returns 401 for a missing header or a Bearer scheme', async () => {
    expect(checkBotAuth(request())?.status).toBe(401)
    expect(checkBotAuth(request({ authorization: `Bearer ${BOT_KEY}` }))?.status).toBe(401)
  })

  it('returns 503 when BOT_API_KEY is unset', async () => {
    vi.unstubAllEnvs()
    const res = checkBotAuth(request({ authorization: `Bot ${BOT_KEY}` }))
    expect(res?.status).toBe(503)
    const body = await res!.json()
    expect(body).toEqual({ error: 'Bot integration not configured' })
  })
})

type Row = Record<string, unknown>
interface Filter {
  type: 'eq'
  col: string
  val: unknown
}
interface RecordedCall {
  select: string
  filters: Filter[]
  orders: Array<{ col: string; ascending: boolean }>
  limit?: number
}

function makeGuildsClient(rows: Row[], options?: { fail?: boolean }) {
  const calls: RecordedCall[] = []
  const call: RecordedCall = { select: '', filters: [], orders: [] }
  calls.push(call)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    select(cols: string) {
      call.select = cols
      return builder
    },
    eq(col: string, val: unknown) {
      call.filters.push({ type: 'eq', col, val })
      return builder
    },
    order(col: string, opts?: { ascending?: boolean }) {
      call.orders.push({ col, ascending: opts?.ascending !== false })
      return builder
    },
    limit(n: number) {
      call.limit = n
      return builder
    },
    maybeSingle() {
      if (options?.fail) return Promise.resolve({ data: null, error: { message: 'boom' } })
      let filtered = rows.filter((row) => call.filters.every((f) => row[f.col] === f.val))
      for (let i = call.orders.length - 1; i >= 0; i--) {
        const { col, ascending } = call.orders[i]
        filtered = filtered.slice().sort((a, b) => {
          const av = a[col] as string
          const bv = b[col] as string
          if (av === bv) return 0
          const cmp = av < bv ? -1 : 1
          return ascending ? cmp : -cmp
        })
      }
      if (call.limit != null) filtered = filtered.slice(0, call.limit)
      return Promise.resolve({ data: filtered[0] ?? null, error: null })
    },
  }
  return { client: { from: () => builder }, calls }
}

describe('resolveGuildFromDiscord', () => {
  it('records eq discord_server_id, eq is_active true, order created_at then id ascending, and limit 1', async () => {
    const { client, calls } = makeGuildsClient([
      { id: 'g1', name: 'Guild One', active_expansion_id: 'exp1', is_active: true, discord_server_id: 'd1', created_at: '2020-01-01' },
    ])
    const result = await resolveGuildFromDiscord(client as never, 'd1')
    expect(result).toEqual({ id: 'g1', name: 'Guild One', active_expansion_id: 'exp1' })
    expect(calls[0].filters).toEqual([
      { type: 'eq', col: 'discord_server_id', val: 'd1' },
      { type: 'eq', col: 'is_active', val: true },
    ])
    expect(calls[0].orders).toEqual([
      { col: 'created_at', ascending: true },
      { col: 'id', ascending: true },
    ])
    expect(calls[0].limit).toBe(1)
  })

  it('returns the first row ordered by created_at then id', async () => {
    const { client } = makeGuildsClient([
      { id: 'g2', name: 'Newer', active_expansion_id: null, is_active: true, discord_server_id: 'd1', created_at: '2020-02-01' },
      { id: 'g1', name: 'Older', active_expansion_id: 'exp1', is_active: true, discord_server_id: 'd1', created_at: '2020-01-01' },
    ])
    const result = await resolveGuildFromDiscord(client as never, 'd1')
    expect(result?.id).toBe('g1')
  })

  it('returns null for no row', async () => {
    const { client } = makeGuildsClient([])
    const result = await resolveGuildFromDiscord(client as never, 'unknown')
    expect(result).toBeNull()
  })

  it('throws when the query errors', async () => {
    const { client } = makeGuildsClient([], { fail: true })
    await expect(resolveGuildFromDiscord(client as never, 'd1')).rejects.toThrow()
  })
})

describe('requireBotLookupAccess', () => {
  const GUILD = { id: 'g1', name: 'Guild One' }

  it('resolves null for a pro guild', async () => {
    const { client, calls } = makeGuildsClient([{ id: 'g1', subscription_tier: 'pro' }])
    const result = await requireBotLookupAccess(client as never, GUILD)
    expect(result).toBeNull()
    expect(calls[0].filters).toEqual([{ type: 'eq', col: 'id', val: 'g1' }])
  })

  it('resolves a 403 premium_required response for a free guild, falling back to the default origin', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    const { client } = makeGuildsClient([{ id: 'g1', subscription_tier: 'free' }])
    const result = await requireBotLookupAccess(client as never, GUILD)
    expect(result).not.toBeNull()
    expect(result?.status).toBe(403)
    const body = await result!.json()
    expect(body).toEqual({
      error: 'premium_required',
      guild_name: 'Guild One',
      premium_url: 'https://www.getlootlist.com/premium',
    })
  })

  it('uses the stubbed app origin, with a trailing slash removed', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://preview.example.test//')
    const { client } = makeGuildsClient([{ id: 'g1', subscription_tier: 'free' }])
    const result = await requireBotLookupAccess(client as never, GUILD)
    const body = await result!.json()
    expect(body.premium_url).toBe('https://preview.example.test/premium')
  })

  it('rejects on a read error, with no response', async () => {
    const { client } = makeGuildsClient([], { fail: true })
    await expect(requireBotLookupAccess(client as never, GUILD)).rejects.toThrow()
  })
})
