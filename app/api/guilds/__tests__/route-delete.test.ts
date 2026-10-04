// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DELETE } from '../route'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getStripe } from '@/lib/billing/stripe'
import { GUILD_DELETE_BILLING_ERRORS } from '@/lib/billing/cancel-guild-subscription'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/app/services/expansionSeeder', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/app/services/expansionSeeder')>()),
  seedExpansionForGuild: vi.fn(),
}))
vi.mock('@/utils/cache', () => ({
  getCached: vi.fn(),
  invalidateCache: vi.fn(),
  cacheKeys: { userGuilds: vi.fn((userId: string) => `cache:guilds:${userId}`) },
}))
vi.mock('@/lib/cache/user-bundle', () => ({ revalidateUserBundle: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({
  trackApiError: vi.fn(),
  trackEvent: vi.fn(),
  setUserMilestone: vi.fn(),
}))
vi.mock('@/utils/analytics/funnel', () => ({ evaluateGuildFunnel: vi.fn() }))
vi.mock('@/lib/discord-server-access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/discord-server-access')>()),
  checkUserManagesDiscordServer: vi.fn(),
}))
vi.mock('@/lib/billing/stripe', () => ({ getStripe: vi.fn(), getPriceId: vi.fn() }))

const GUILD_ID = 'g1'
const USER_ID = 'user-1'
const DELETE_FAILED = "Couldn't delete guild. Try again."
const C2 = 'Only the guild master can delete this guild.'

const LIVE_ROW = { stripe_customer_id: 'cus_1', status: 'active' }
const LIVE_SUB = { id: 'sub_1', status: 'active', metadata: { guild_id: GUILD_ID, user_id: USER_ID } }

interface TestOpts {
  noUser?: boolean
  isMaster?: boolean
  masterError?: unknown
  subRow?: unknown
  subError?: unknown
  subs?: unknown[]
  listRejects?: boolean
  cancelRejects?: boolean
  deleteError?: unknown
  stripeNull?: boolean
}

function setupMocks(opts: TestOpts = {}) {
  const log: string[] = []

  vi.mocked(getAuthenticatedUser).mockResolvedValue(
    opts.noUser
      ? { user: null, error: new Error('no session') }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : ({ user: { id: USER_ID }, error: null } as any)
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sessionClient: any = {
    rpc: async (name: string) => {
      log.push(`rpc:${name}`)
      if (name === 'is_guild_master') {
        return { data: opts.masterError ? null : (opts.isMaster ?? true), error: opts.masterError ?? null }
      }
      if (name === 'delete_guild') {
        return { error: opts.deleteError ?? null }
      }
      return { data: null, error: null }
    },
  }
  vi.mocked(createClient).mockResolvedValue(sessionClient)

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

  if (opts.stripeNull) {
    vi.mocked(getStripe).mockReturnValue(null)
  } else {
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
  }

  return { log }
}

function request(body: unknown) {
  return new Request('http://localhost/api/guilds', {
    method: 'DELETE',
    body: JSON.stringify(body),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

describe('DELETE /api/guilds', () => {
  it('D1: no user -> 401, empty log', async () => {
    const { log } = setupMocks({ noUser: true })
    const res = await DELETE(request({ guild_id: GUILD_ID }))
    expect(res.status).toBe(401)
    expect(log).toEqual([])
  })

  it('D2: no guild_id -> 400, empty log', async () => {
    const { log } = setupMocks()
    const res = await DELETE(request({}))
    expect(res.status).toBe(400)
    expect(log).toEqual([])
  })

  it('D3: is_guild_master returns false -> 403 C-2, log exactly [rpc:is_guild_master]', async () => {
    const { log } = setupMocks({ isMaster: false })
    const res = await DELETE(request({ guild_id: GUILD_ID }))
    const body = await res.json()
    expect(res.status).toBe(403)
    expect(body).toEqual({ error: C2 })
    expect(log).toEqual(['rpc:is_guild_master'])
  })

  it('D4: is_guild_master errors -> 500 delete-failed, log exactly [rpc:is_guild_master]', async () => {
    const { log } = setupMocks({ masterError: { message: 'boom' } })
    const res = await DELETE(request({ guild_id: GUILD_ID }))
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body).toEqual({ error: DELETE_FAILED })
    expect(log).toEqual(['rpc:is_guild_master'])
  })

  it('D5: no subscription row -> 200 success, log exactly the three steps', async () => {
    const { log } = setupMocks({ subRow: null })
    const res = await DELETE(request({ guild_id: GUILD_ID }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual({ success: true, message: 'Guild deleted successfully' })
    expect(log).toEqual(['rpc:is_guild_master', 'read:guild_subscriptions', 'rpc:delete_guild'])
  })

  it('D6: active subscription -> cancelled before delete_guild, 200', async () => {
    const { log } = setupMocks({ subRow: LIVE_ROW, subs: [LIVE_SUB] })
    const res = await DELETE(request({ guild_id: GUILD_ID }))
    expect(res.status).toBe(200)
    expect(log).toEqual([
      'rpc:is_guild_master',
      'read:guild_subscriptions',
      'stripe:list',
      'stripe:cancel:sub_1',
      'rpc:delete_guild',
    ])
  })

  it('D7: cancel rejects -> 502 C-3, no delete_guild', async () => {
    const { log } = setupMocks({ subRow: LIVE_ROW, subs: [LIVE_SUB], cancelRejects: true })
    const res = await DELETE(request({ guild_id: GUILD_ID }))
    const body = await res.json()
    expect(res.status).toBe(502)
    expect(body).toEqual({ error: GUILD_DELETE_BILLING_ERRORS.cancelFailed })
    expect(log).not.toContain('rpc:delete_guild')
  })

  it('D8: list rejects -> 502 C-3, no delete_guild', async () => {
    const { log } = setupMocks({ subRow: LIVE_ROW, listRejects: true })
    const res = await DELETE(request({ guild_id: GUILD_ID }))
    const body = await res.json()
    expect(res.status).toBe(502)
    expect(body).toEqual({ error: GUILD_DELETE_BILLING_ERRORS.cancelFailed })
    expect(log).not.toContain('rpc:delete_guild')
  })

  it('D9: cancel succeeds, delete_guild errors -> 500 C-5', async () => {
    const { log } = setupMocks({ subRow: LIVE_ROW, subs: [LIVE_SUB], deleteError: { message: 'db boom' } })
    const res = await DELETE(request({ guild_id: GUILD_ID }))
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body).toEqual({ error: GUILD_DELETE_BILLING_ERRORS.canceledButNotDeleted })
    expect(log).toContain('rpc:delete_guild')
  })

  it('D10: no subscription row, delete_guild errors -> 500 delete-failed', async () => {
    const { log } = setupMocks({ subRow: null, deleteError: { message: 'db boom' } })
    const res = await DELETE(request({ guild_id: GUILD_ID }))
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body).toEqual({ error: DELETE_FAILED })
    expect(log).toContain('rpc:delete_guild')
  })

  it('D11: getStripe returns null, row is live -> 503 C-4, no delete_guild', async () => {
    const { log } = setupMocks({ subRow: LIVE_ROW, stripeNull: true })
    const res = await DELETE(request({ guild_id: GUILD_ID }))
    const body = await res.json()
    expect(res.status).toBe(503)
    expect(body).toEqual({ error: GUILD_DELETE_BILLING_ERRORS.billingUnavailable })
    expect(log).not.toContain('rpc:delete_guild')
  })

  it('D12: subscription read errors -> 500 delete-failed, no Stripe call, no delete_guild', async () => {
    const { log } = setupMocks({ subError: { message: 'read boom' } })
    const res = await DELETE(request({ guild_id: GUILD_ID }))
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body).toEqual({ error: DELETE_FAILED })
    expect(log).not.toContain('stripe:list')
    expect(log).not.toContain('rpc:delete_guild')
  })
})
