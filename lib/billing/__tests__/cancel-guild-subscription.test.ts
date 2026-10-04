import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  cancellableSubscriptionIds,
  cancelGuildSubscriptions,
  endGuildBillingBeforeDelete,
  GUILD_DELETE_CANCELLATION_COMMENT,
  GUILD_DELETE_BILLING_ERRORS,
  type CancellableSubscriptionLike,
} from '../cancel-guild-subscription'

const GUILD_ID = 'g1'

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'log').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('cancellableSubscriptionIds', () => {
  it('M1: is empty for null, undefined and []', () => {
    expect(cancellableSubscriptionIds(null, GUILD_ID)).toEqual([])
    expect(cancellableSubscriptionIds(undefined, GUILD_ID)).toEqual([])
    expect(cancellableSubscriptionIds([], GUILD_ID)).toEqual([])
  })

  it('M2: keeps live statuses, in input order', () => {
    const subs = [
      { id: 'sub_active', status: 'active', metadata: { guild_id: GUILD_ID } },
      { id: 'sub_trialing', status: 'trialing', metadata: { guild_id: GUILD_ID } },
      { id: 'sub_past_due', status: 'past_due', metadata: { guild_id: GUILD_ID } },
      { id: 'sub_unpaid', status: 'unpaid', metadata: { guild_id: GUILD_ID } },
      { id: 'sub_paused', status: 'paused', metadata: { guild_id: GUILD_ID } },
      { id: 'sub_incomplete', status: 'incomplete', metadata: { guild_id: GUILD_ID } },
    ]
    expect(cancellableSubscriptionIds(subs, GUILD_ID)).toEqual([
      'sub_active',
      'sub_trialing',
      'sub_past_due',
      'sub_unpaid',
      'sub_paused',
      'sub_incomplete',
    ])
  })

  it('M3: drops canceled and incomplete_expired', () => {
    const subs = [
      { id: 'sub_canceled', status: 'canceled', metadata: { guild_id: GUILD_ID } },
      { id: 'sub_expired', status: 'incomplete_expired', metadata: { guild_id: GUILD_ID } },
    ]
    expect(cancellableSubscriptionIds(subs, GUILD_ID)).toEqual([])
  })

  it('M4: drops another guild, no metadata, metadata without guild_id, and empty guild_id', () => {
    const subs: CancellableSubscriptionLike[] = [
      { id: 'sub_other', status: 'active', metadata: { guild_id: 'other-guild' } },
      { id: 'sub_none', status: 'active' },
      { id: 'sub_nokey', status: 'active', metadata: { other: 'x' } },
      { id: 'sub_empty', status: 'active', metadata: { guild_id: '' } },
    ]
    expect(cancellableSubscriptionIds(subs, GUILD_ID)).toEqual([])
  })
})

function fakeStripe(opts: {
  listResult?: { data: CancellableSubscriptionLike[]; has_more: boolean }
  listError?: unknown
  cancelErrors?: Record<string, unknown>
} = {}) {
  const list = vi.fn(async () => {
    if (opts.listError) throw opts.listError
    return opts.listResult ?? { data: [], has_more: false }
  })
  const cancel = vi.fn(async (id: string) => {
    if (opts.cancelErrors && opts.cancelErrors[id]) throw opts.cancelErrors[id]
    return {}
  })
  return { subscriptions: { list, cancel } }
}

describe('cancelGuildSubscriptions', () => {
  it('M5: row null -> nothing_to_cancel, no Stripe call', async () => {
    const stripe = fakeStripe()
    const outcome = await cancelGuildSubscriptions(stripe, null, GUILD_ID)
    expect(outcome.result).toBe('nothing_to_cancel')
    expect(stripe.subscriptions.list).not.toHaveBeenCalled()
    expect(stripe.subscriptions.cancel).not.toHaveBeenCalled()
  })

  it('M6: row with null stripe_customer_id -> nothing_to_cancel, no Stripe call', async () => {
    const stripe = fakeStripe()
    const outcome = await cancelGuildSubscriptions(
      stripe,
      { stripe_customer_id: null, status: 'active' },
      GUILD_ID
    )
    expect(outcome.result).toBe('nothing_to_cancel')
    expect(stripe.subscriptions.list).not.toHaveBeenCalled()
  })

  it('M7: active subscription is listed and cancelled with the comment', async () => {
    const stripe = fakeStripe({
      listResult: {
        data: [{ id: 'sub_1', status: 'active', metadata: { guild_id: GUILD_ID } }],
        has_more: false,
      },
    })
    const outcome = await cancelGuildSubscriptions(
      stripe,
      { stripe_customer_id: 'cus_1', status: 'active' },
      GUILD_ID
    )
    expect(stripe.subscriptions.list).toHaveBeenCalledTimes(1)
    expect(stripe.subscriptions.list).toHaveBeenCalledWith({ customer: 'cus_1', limit: 100 })
    expect(stripe.subscriptions.cancel).toHaveBeenCalledTimes(1)
    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_1', {
      cancellation_details: { comment: GUILD_DELETE_CANCELLATION_COMMENT },
    })
    expect(outcome.result).toBe('canceled')
    expect(outcome.canceled).toEqual(['sub_1'])
    expect(outcome.failed).toEqual([])
  })

  it('M8: trialing is cancelled', async () => {
    const stripe = fakeStripe({
      listResult: {
        data: [{ id: 'sub_1', status: 'trialing', metadata: { guild_id: GUILD_ID } }],
        has_more: false,
      },
    })
    const outcome = await cancelGuildSubscriptions(
      stripe,
      { stripe_customer_id: 'cus_1', status: 'trialing' },
      GUILD_ID
    )
    expect(outcome.canceled).toEqual(['sub_1'])
  })

  it('M9: paused is cancelled', async () => {
    const stripe = fakeStripe({
      listResult: {
        data: [{ id: 'sub_1', status: 'paused', metadata: { guild_id: GUILD_ID } }],
        has_more: false,
      },
    })
    const outcome = await cancelGuildSubscriptions(
      stripe,
      { stripe_customer_id: 'cus_1', status: 'paused' },
      GUILD_ID
    )
    expect(outcome.canceled).toEqual(['sub_1'])
  })

  it('M10: a gifted (100% off) active subscription is cancelled like any other', async () => {
    const stripe = fakeStripe({
      listResult: {
        data: [
          // A gifted subscription carries a 100%-off discount object on the
          // real Stripe.Subscription; CancellableSubscriptionLike only
          // declares the fields this module reads, so the extra field
          // needs a double cast rather than widening the interface.
          {
            id: 'sub_1',
            status: 'active',
            metadata: { guild_id: GUILD_ID },
            discount: { coupon: { percent_off: 100 } },
          } as unknown as CancellableSubscriptionLike,
        ],
        has_more: false,
      },
    })
    const outcome = await cancelGuildSubscriptions(
      stripe,
      { stripe_customer_id: 'cus_1', status: 'active' },
      GUILD_ID
    )
    expect(outcome.canceled).toEqual(['sub_1'])
  })

  it('M11: an empty list gives nothing_to_cancel with no cancel call', async () => {
    const stripe = fakeStripe({ listResult: { data: [], has_more: false } })
    const outcome = await cancelGuildSubscriptions(
      stripe,
      { stripe_customer_id: 'cus_1', status: 'active' },
      GUILD_ID
    )
    expect(outcome.result).toBe('nothing_to_cancel')
    expect(stripe.subscriptions.cancel).not.toHaveBeenCalled()
  })

  it('M11b: a list holding only an already-canceled subscription gives nothing_to_cancel', async () => {
    const stripe = fakeStripe({
      listResult: {
        data: [{ id: 'sub_1', status: 'canceled', metadata: { guild_id: GUILD_ID } }],
        has_more: false,
      },
    })
    const outcome = await cancelGuildSubscriptions(
      stripe,
      { stripe_customer_id: 'cus_1', status: 'active' },
      GUILD_ID
    )
    expect(outcome.result).toBe('nothing_to_cancel')
    expect(stripe.subscriptions.cancel).not.toHaveBeenCalled()
  })

  it('M12: another guild live subscription on the same customer is never cancelled', async () => {
    const stripe = fakeStripe({
      listResult: {
        data: [{ id: 'sub_other', status: 'active', metadata: { guild_id: 'other-guild' } }],
        has_more: false,
      },
    })
    const outcome = await cancelGuildSubscriptions(
      stripe,
      { stripe_customer_id: 'cus_1', status: 'active' },
      GUILD_ID
    )
    expect(outcome.result).toBe('nothing_to_cancel')
    expect(stripe.subscriptions.cancel).not.toHaveBeenCalled()
  })

  it('M13: list rejects -> failed, listFailed true, cancel never called, resolves', async () => {
    const stripe = fakeStripe({ listError: new Error('list boom') })
    await expect(
      cancelGuildSubscriptions(stripe, { stripe_customer_id: 'cus_1', status: 'active' }, GUILD_ID)
    ).resolves.toMatchObject({ result: 'failed', listFailed: true })
    expect(stripe.subscriptions.cancel).not.toHaveBeenCalled()
  })

  it('M14: two live subscriptions, first cancel rejects: second is still cancelled', async () => {
    const stripe = fakeStripe({
      listResult: {
        data: [
          { id: 'sub_1', status: 'active', metadata: { guild_id: GUILD_ID } },
          { id: 'sub_2', status: 'active', metadata: { guild_id: GUILD_ID } },
        ],
        has_more: false,
      },
      cancelErrors: { sub_1: new Error('cancel boom') },
    })
    const outcome = await cancelGuildSubscriptions(
      stripe,
      { stripe_customer_id: 'cus_1', status: 'active' },
      GUILD_ID
    )
    expect(outcome.result).toBe('failed')
    expect(outcome.canceled).toEqual(['sub_2'])
    expect(outcome.failed).toEqual(['sub_1'])
  })

  it('M15: has_more true -> listed subscriptions cancelled, result failed, truncated true', async () => {
    const stripe = fakeStripe({
      listResult: {
        data: [{ id: 'sub_1', status: 'active', metadata: { guild_id: GUILD_ID } }],
        has_more: true,
      },
    })
    const outcome = await cancelGuildSubscriptions(
      stripe,
      { stripe_customer_id: 'cus_1', status: 'active' },
      GUILD_ID
    )
    expect(outcome.result).toBe('failed')
    expect(outcome.truncated).toBe(true)
    expect(outcome.canceled).toEqual(['sub_1'])
  })

  it('M16: stripe null - a live row gives not_configured, a canceled row gives nothing_to_cancel, neither throws', async () => {
    await expect(
      cancelGuildSubscriptions(null, { stripe_customer_id: 'cus_1', status: 'active' }, GUILD_ID)
    ).resolves.toMatchObject({ result: 'not_configured' })
    await expect(
      cancelGuildSubscriptions(null, { stripe_customer_id: 'cus_1', status: 'canceled' }, GUILD_ID)
    ).resolves.toMatchObject({ result: 'nothing_to_cancel' })
  })
})

function fakeService(opts: {
  data?: unknown
  error?: unknown
  throws?: unknown
} = {}) {
  const calls: { table: string; columns?: string; filter?: [string, unknown] }[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase: any = {
    from: (table: string) => ({
      select: (columns: string) => ({
        eq: (column: string, value: unknown) => ({
          maybeSingle: async () => {
            calls.push({ table, columns, filter: [column, value] })
            if (opts.throws) throw opts.throws
            return { data: opts.data ?? null, error: opts.error ?? null }
          },
        }),
      }),
    }),
  }
  return { supabase, calls }
}

describe('endGuildBillingBeforeDelete', () => {
  it('M17: reads guild_subscriptions with stripe_customer_id, status and eq(guild_id)', async () => {
    const { supabase, calls } = fakeService({ data: null })
    await endGuildBillingBeforeDelete(supabase, fakeStripe(), GUILD_ID)
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('guild_subscriptions')
    expect(calls[0].columns).toContain('stripe_customer_id')
    expect(calls[0].columns).toContain('status')
    expect(calls[0].filter).toEqual(['guild_id', GUILD_ID])
  })

  it('M18: read error -> 500 deleteFailed, no Stripe call', async () => {
    const { supabase } = fakeService({ error: { message: 'read error' } })
    const stripe = fakeStripe()
    const result = await endGuildBillingBeforeDelete(supabase, stripe, GUILD_ID)
    expect(result).toEqual({ ok: false, status: 500, error: GUILD_DELETE_BILLING_ERRORS.deleteFailed })
    expect(stripe.subscriptions.list).not.toHaveBeenCalled()
  })

  it('M19: no row -> ok true, canceled []', async () => {
    const { supabase } = fakeService({ data: null })
    const result = await endGuildBillingBeforeDelete(supabase, fakeStripe(), GUILD_ID)
    expect(result).toEqual({ ok: true, canceled: [] })
  })

  it('M20: live subscription -> ok true, canceled [sub_1]', async () => {
    const { supabase } = fakeService({ data: { stripe_customer_id: 'cus_1', status: 'active' } })
    const stripe = fakeStripe({
      listResult: {
        data: [{ id: 'sub_1', status: 'active', metadata: { guild_id: GUILD_ID } }],
        has_more: false,
      },
    })
    const result = await endGuildBillingBeforeDelete(supabase, stripe, GUILD_ID)
    expect(result).toEqual({ ok: true, canceled: ['sub_1'] })
  })

  it('M21: cancel failure -> 502 cancelFailed', async () => {
    const { supabase } = fakeService({ data: { stripe_customer_id: 'cus_1', status: 'active' } })
    const stripe = fakeStripe({
      listResult: {
        data: [{ id: 'sub_1', status: 'active', metadata: { guild_id: GUILD_ID } }],
        has_more: false,
      },
      cancelErrors: { sub_1: new Error('cancel boom') },
    })
    const result = await endGuildBillingBeforeDelete(supabase, stripe, GUILD_ID)
    expect(result).toEqual({ ok: false, status: 502, error: GUILD_DELETE_BILLING_ERRORS.cancelFailed })
  })

  it('M22: stripe null with a live row -> 503 billingUnavailable', async () => {
    const { supabase } = fakeService({ data: { stripe_customer_id: 'cus_1', status: 'active' } })
    const result = await endGuildBillingBeforeDelete(supabase, null, GUILD_ID)
    expect(result).toEqual({ ok: false, status: 503, error: GUILD_DELETE_BILLING_ERRORS.billingUnavailable })
  })

  it('M23: the read throws -> 500, the call resolves', async () => {
    const { supabase } = fakeService({ throws: new Error('boom') })
    await expect(endGuildBillingBeforeDelete(supabase, fakeStripe(), GUILD_ID)).resolves.toMatchObject({
      ok: false,
      status: 500,
    })
  })
})
