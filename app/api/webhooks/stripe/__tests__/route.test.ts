// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../route'
import { getStripe } from '@/lib/billing/stripe'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { syncPremiumDiscordRole } from '@/lib/billing/discord-premium'
import { trackEvent } from '@/utils/analytics/server'

vi.mock('@/lib/billing/stripe', () => ({ getStripe: vi.fn(), getPriceId: vi.fn() }))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/lib/billing/discord-premium', () => ({ syncPremiumDiscordRole: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), trackApiError: vi.fn() }))
vi.mock('@/lib/billing/trial-ending', () => ({ notifyTrialEnding: vi.fn() }))

const GUILD_ID = 'g-gone'
const USER_ID = 'user-1'

const BASE_SUBSCRIPTION = {
  id: 'sub_1',
  customer: 'cus_1',
  cancel_at_period_end: false,
  metadata: { guild_id: GUILD_ID, user_id: USER_ID },
  items: { data: [{ price: { id: 'price_1', recurring: { interval: 'month' } } }] },
}

function subscription(overrides: Partial<typeof BASE_SUBSCRIPTION & { status: string }>) {
  return { ...BASE_SUBSCRIPTION, status: 'active', ...overrides }
}

interface ServiceOpts {
  guild?: { id: string } | null
  guildLookupError?: unknown
  upsertError?: unknown
}

function createMockService(opts: ServiceOpts = {}) {
  let upsertCalled = false
  let updateCalled = false
  let updatePayload: unknown = null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = {
    from: (table: string) => {
      if (table === 'guilds') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: opts.guild ?? null, error: opts.guildLookupError ?? null }),
            }),
          }),
          update: (payload: unknown) => ({
            eq: () => {
              updateCalled = true
              updatePayload = payload
              return Promise.resolve({ error: null })
            },
          }),
        }
      }
      if (table === 'guild_subscriptions') {
        return {
          upsert: () => {
            upsertCalled = true
            return Promise.resolve({ error: opts.upsertError ?? null })
          },
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
  }

  return {
    supabase,
    get upsertCalled() { return upsertCalled },
    get updateCalled() { return updateCalled },
    get updatePayload() { return updatePayload },
  }
}

function createMockStripe(opts: { retrieveResult?: unknown } = {}) {
  const cancel = vi.fn()
  return {
    webhooks: { constructEvent: vi.fn() },
    subscriptions: {
      retrieve: vi.fn(async () => opts.retrieveResult),
      cancel,
    },
  }
}

function request() {
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': 'sig_test' },
    body: 'raw-body',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_test')
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('POST /api/webhooks/stripe', () => {
  it('W1: customer.subscription.deleted, canceled, guild missing -> 200, no write, Discord revoke, no cancel call', async () => {
    const sub = subscription({ status: 'canceled' })
    const stripe = createMockStripe()
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: sub },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    vi.mocked(getStripe).mockReturnValue(stripe as never)

    const service = createMockService({ guild: null })
    vi.mocked(createServiceRoleClient).mockReturnValue(service.supabase)

    const res = await POST(request())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ received: true })
    expect(service.upsertCalled).toBe(false)
    expect(service.updateCalled).toBe(false)
    expect(syncPremiumDiscordRole).toHaveBeenCalledTimes(1)
    expect(syncPremiumDiscordRole).toHaveBeenCalledWith(service.supabase, GUILD_ID, USER_ID, false)
    expect(stripe.subscriptions.cancel).not.toHaveBeenCalled()
  })

  it('W2: customer.subscription.updated, active, guild missing -> 200, no write, no Discord call, console.error logged', async () => {
    const sub = subscription({ status: 'active' })
    const stripe = createMockStripe()
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: sub },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    vi.mocked(getStripe).mockReturnValue(stripe as never)

    const service = createMockService({ guild: null })
    vi.mocked(createServiceRoleClient).mockReturnValue(service.supabase)

    const res = await POST(request())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ received: true })
    expect(service.upsertCalled).toBe(false)
    expect(service.updateCalled).toBe(false)
    expect(syncPremiumDiscordRole).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ subscriptionId: 'sub_1', guildId: GUILD_ID })
    )
  })

  it('W3: checkout.session.completed, retrieved active, guild missing -> 200, no write, trackEvent not called', async () => {
    const sub = subscription({ status: 'active' })
    const stripe = createMockStripe({ retrieveResult: sub })
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: 'checkout.session.completed',
      data: { object: { mode: 'subscription', subscription: sub.id } },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    vi.mocked(getStripe).mockReturnValue(stripe as never)

    const service = createMockService({ guild: null })
    vi.mocked(createServiceRoleClient).mockReturnValue(service.supabase)

    const res = await POST(request())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ received: true })
    expect(service.upsertCalled).toBe(false)
    expect(service.updateCalled).toBe(false)
    expect(trackEvent).not.toHaveBeenCalled()
  })

  it('W4: guild lookup error -> 500, no upsert', async () => {
    const sub = subscription({ status: 'active' })
    const stripe = createMockStripe()
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: sub },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    vi.mocked(getStripe).mockReturnValue(stripe as never)

    const service = createMockService({ guildLookupError: { message: 'db down' } })
    vi.mocked(createServiceRoleClient).mockReturnValue(service.supabase)

    const res = await POST(request())

    expect(res.status).toBe(500)
    expect(service.upsertCalled).toBe(false)
  })

  it('W5: upsert error code 23503 -> 200, no guilds update', async () => {
    const sub = subscription({ status: 'active' })
    const stripe = createMockStripe()
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: sub },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    vi.mocked(getStripe).mockReturnValue(stripe as never)

    const service = createMockService({ guild: { id: GUILD_ID }, upsertError: { code: '23503', message: 'fk' } })
    vi.mocked(createServiceRoleClient).mockReturnValue(service.supabase)

    const res = await POST(request())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual({ received: true })
    expect(service.updateCalled).toBe(false)
  })

  it('W6: existing guild, active -> upsert and update recorded, syncPremiumDiscordRole isPro true, 200', async () => {
    const sub = subscription({ status: 'active' })
    const stripe = createMockStripe()
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: 'customer.subscription.updated',
      data: { object: sub },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    vi.mocked(getStripe).mockReturnValue(stripe as never)

    const service = createMockService({ guild: { id: GUILD_ID } })
    vi.mocked(createServiceRoleClient).mockReturnValue(service.supabase)

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(service.upsertCalled).toBe(true)
    expect(service.updateCalled).toBe(true)
    expect(service.updatePayload).toEqual({ subscription_tier: 'pro' })
    expect(syncPremiumDiscordRole).toHaveBeenCalledWith(service.supabase, GUILD_ID, USER_ID, true)
  })

  it('W7: existing guild, customer.subscription.deleted -> upsert status canceled, update free, syncPremiumDiscordRole false, 200', async () => {
    const sub = subscription({ status: 'canceled' })
    const stripe = createMockStripe()
    vi.mocked(stripe.webhooks.constructEvent).mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: sub },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    vi.mocked(getStripe).mockReturnValue(stripe as never)

    const service = createMockService({ guild: { id: GUILD_ID } })
    vi.mocked(createServiceRoleClient).mockReturnValue(service.supabase)

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(service.upsertCalled).toBe(true)
    expect(service.updateCalled).toBe(true)
    expect(service.updatePayload).toEqual({ subscription_tier: 'free' })
    expect(syncPremiumDiscordRole).toHaveBeenCalledWith(service.supabase, GUILD_ID, USER_ID, false)
  })
})
