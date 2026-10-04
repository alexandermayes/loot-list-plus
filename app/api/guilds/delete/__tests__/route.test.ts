// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getStripe } from '@/lib/billing/stripe'
import { GUILD_DELETE_BILLING_ERRORS } from '@/lib/billing/cancel-guild-subscription'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))
vi.mock('@/utils/analytics/server', () => ({
  trackApiError: vi.fn(),
}))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/lib/billing/stripe', () => ({ getStripe: vi.fn(), getPriceId: vi.fn() }))

/**
 * One recording Supabase stand-in. rpc(name, args) records the call and
 * resolves { error } from the test's option. from('guilds').select().eq()
 * .single() resolves the test's guild row (or null). Every update and
 * delete, in call order, is recorded with its eq filters. Every other
 * awaited chain resolves the shape the route expects with empty data.
 */
function createMockSupabase(opts: {
  guild?: { id: string; created_by: string; name: string } | null
  guildError?: unknown
  rpcError?: unknown
  characters?: { id: string }[]
  memberships?: { guild_id: string }[]
  activeChar?: { active_guild_id: string | null } | null
  log?: string[]
} = {}) {
  const rpcCalls: { name: string; args: unknown }[] = []
  const log = opts.log ?? []
  // Every update and delete, in call order, with the eq filters applied to it.
  const writes: { table: string; op: 'update' | 'delete'; payload?: unknown; filters: [string, unknown][] }[] = []

  function buildBuilder(table: string) {
    let current: (typeof writes)[number] | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        if (current) current.filters.push([column, value])
        return builder
      },
      in: () => builder,
      limit: () => builder,
      update: (payload: unknown) => {
        current = { table, op: 'update', payload, filters: [] }
        writes.push(current)
        return builder
      },
      delete: () => {
        current = { table, op: 'delete', filters: [] }
        writes.push(current)
        return builder
      },
      single: () => {
        if (table === 'guilds') {
          return Promise.resolve({ data: opts.guild ?? null, error: opts.guildError ?? null })
        }
        return Promise.resolve({ data: null, error: null })
      },
      maybeSingle: () => {
        if (table === 'user_active_characters') {
          return Promise.resolve({ data: opts.activeChar ?? null, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      },
      then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
        if (table === 'characters') {
          return Promise.resolve({ data: opts.characters ?? [], error: null }).then(resolve, reject)
        }
        if (table === 'character_guild_memberships') {
          return Promise.resolve({ data: opts.memberships ?? [], error: null }).then(resolve, reject)
        }
        return Promise.resolve({ data: [], error: null }).then(resolve, reject)
      },
    }
    return builder
  }

  const supabase = {
    from: (table: string) => buildBuilder(table),
    rpc: (name: string, args: unknown) => {
      rpcCalls.push({ name, args })
      log.push(`rpc:${name}`)
      return Promise.resolve({ error: opts.rpcError ?? null })
    },
  }
  return { supabase, rpcCalls, writes, log }
}

interface BillingOpts {
  subRow?: unknown
  subError?: unknown
  subs?: unknown[]
  listRejects?: boolean
  cancelRejects?: boolean
}

/** The service-role (guild_subscriptions read) and Stripe fakes, sharing the same ordered log as the session rpc recorder. */
function setupBillingMocks(opts: BillingOpts = {}, log: string[] = []) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serviceClient: any = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            if (table === 'guild_subscriptions') {
              log.push('read:guild_subscriptions')
              return { data: opts.subRow ?? null, error: opts.subError ?? null }
            }
            return { data: null, error: null }
          },
        }),
      }),
    }),
  }
  vi.mocked(createServiceRoleClient).mockReturnValue(serviceClient)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripe: any = {
    subscriptions: {
      list: async () => {
        log.push('stripe:list')
        if (opts.listRejects) throw new Error('list boom')
        return { data: opts.subs ?? [], has_more: false }
      },
      cancel: async (id: string) => {
        log.push(`stripe:cancel:${id}`)
        if (opts.cancelRejects) throw new Error('cancel boom')
        return {}
      },
    },
  }
  vi.mocked(getStripe).mockReturnValue(stripe)

  return { log }
}

const LIVE_ROW = { stripe_customer_id: 'cus_1', status: 'active' }
const LIVE_SUB = { id: 'guild-1-sub', status: 'active', metadata: { guild_id: 'guild-1', user_id: 'user-1' } }

function request(body: unknown) {
  return new Request('http://localhost/api/guilds/delete', {
    method: 'POST',
    body: JSON.stringify(body),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any
}

const GUILD_ID = 'guild-1'
const USER_ID = 'user-1'
const guildRow = { id: GUILD_ID, created_by: USER_ID, name: 'Test Guild' }

describe('POST /api/guilds/delete', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID }, error: null } as never)
    // Default: no subscription row, no Stripe call needed.
    setupBillingMocks()
  })

  it('T1: returns 401 with no rpc call when there is no authenticated user', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: null, error: new Error('no session') } as never)
    const { supabase, rpcCalls } = createMockSupabase()
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const res = await POST(request({ guild_id: GUILD_ID }))

    expect(res.status).toBe(401)
    expect(rpcCalls).toEqual([])
  })

  it('T2: returns 400 when guild_id is missing', async () => {
    const { supabase, rpcCalls } = createMockSupabase()
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const res = await POST(request({}))

    expect(res.status).toBe(400)
    expect(rpcCalls).toEqual([])
  })

  it('T3: returns 404 when the guild read returns no row, no subscription read, no Stripe call (P4)', async () => {
    const log: string[] = []
    const { supabase, rpcCalls } = createMockSupabase({ guild: null, log })
    setupBillingMocks({}, log)
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const res = await POST(request({ guild_id: GUILD_ID }))

    expect(res.status).toBe(404)
    expect(rpcCalls).toEqual([])
    expect(log).toEqual([])
  })

  it('T4: returns 403 with no rpc call, no subscription read, no Stripe call (P4) when the caller did not create the guild', async () => {
    const log: string[] = []
    const { supabase, rpcCalls } = createMockSupabase({ guild: { ...guildRow, created_by: 'someone-else' }, log })
    setupBillingMocks({}, log)
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const res = await POST(request({ guild_id: GUILD_ID }))

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Only the guild creator can delete the guild' })
    expect(rpcCalls).toEqual([])
    expect(log).toEqual([])
  })

  it('T5: returns 500 with the existing text and writes nothing when delete_guild fails', async () => {
    const { supabase, rpcCalls, writes } = createMockSupabase({ guild: guildRow, rpcError: { message: 'boom' } })
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const res = await POST(request({ guild_id: GUILD_ID }))

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Couldn't delete guild. Try again." })
    expect(rpcCalls).toEqual([{ name: 'delete_guild', args: { p_guild_id: GUILD_ID } }])
    expect(writes).toEqual([])
  })

  it('T6: returns 200 success when delete_guild succeeds, calling rpc exactly once', async () => {
    const { supabase, rpcCalls, writes } = createMockSupabase({
      guild: guildRow,
      characters: [{ id: 'char-1' }],
      memberships: [{ guild_id: 'other-guild' }],
      activeChar: { active_guild_id: 'other-guild' },
    })
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const res = await POST(request({ guild_id: GUILD_ID }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, message: 'Guild deleted successfully', has_other_guilds: true })
    expect(rpcCalls).toEqual([{ name: 'delete_guild', args: { p_guild_id: GUILD_ID } }])
    expect(writes).toEqual([])
  })

  it('T6b: clears the active guild when it was the deleted guild', async () => {
    const { supabase, writes } = createMockSupabase({
      guild: guildRow,
      characters: [],
      activeChar: { active_guild_id: GUILD_ID },
    })
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const res = await POST(request({ guild_id: GUILD_ID }))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ success: true, has_other_guilds: false })
    expect(writes).toEqual([
      { table: 'user_active_characters', op: 'update', payload: expect.objectContaining({ active_guild_id: null }), filters: [['user_id', USER_ID]] },
    ])
  })

  it('P1: live subscription is cancelled before delete_guild, 200 with the existing body', async () => {
    const log: string[] = []
    const { supabase, rpcCalls, writes } = createMockSupabase({ guild: guildRow, log })
    setupBillingMocks({ subRow: LIVE_ROW, subs: [LIVE_SUB] }, log)
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const res = await POST(request({ guild_id: GUILD_ID }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, message: 'Guild deleted successfully', has_other_guilds: false })
    expect(log).toEqual(['read:guild_subscriptions', 'stripe:list', `stripe:cancel:${LIVE_SUB.id}`, 'rpc:delete_guild'])
    expect(rpcCalls).toEqual([{ name: 'delete_guild', args: { p_guild_id: GUILD_ID } }])
    expect(writes).toEqual([])
  })

  it('P2: cancel rejects -> 502 C-3, no rpc call, no writes', async () => {
    const log: string[] = []
    const { supabase, rpcCalls, writes } = createMockSupabase({ guild: guildRow, log })
    setupBillingMocks({ subRow: LIVE_ROW, subs: [LIVE_SUB], cancelRejects: true }, log)
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const res = await POST(request({ guild_id: GUILD_ID }))

    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ error: GUILD_DELETE_BILLING_ERRORS.cancelFailed })
    expect(rpcCalls).toEqual([])
    expect(writes).toEqual([])
  })

  it('P3: cancel succeeds, delete_guild errors -> 500 C-5, writes []', async () => {
    const log: string[] = []
    const { supabase, writes } = createMockSupabase({ guild: guildRow, rpcError: { message: 'db boom' }, log })
    setupBillingMocks({ subRow: LIVE_ROW, subs: [LIVE_SUB] }, log)
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const res = await POST(request({ guild_id: GUILD_ID }))

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: GUILD_DELETE_BILLING_ERRORS.canceledButNotDeleted })
    expect(writes).toEqual([])
  })
})
