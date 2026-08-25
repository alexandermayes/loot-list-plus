import { describe, it, expect } from 'vitest'
import { tierForStatus, snapshotFromSubscription } from '../tier'

describe('tierForStatus', () => {
  it('grants pro for paying and grace states', () => {
    expect(tierForStatus('active')).toBe('pro')
    expect(tierForStatus('trialing')).toBe('pro')
    expect(tierForStatus('past_due')).toBe('pro')
  })

  it('drops to free for every terminal or pre-payment state', () => {
    expect(tierForStatus('canceled')).toBe('free')
    expect(tierForStatus('unpaid')).toBe('free')
    expect(tierForStatus('incomplete')).toBe('free')
    expect(tierForStatus('incomplete_expired')).toBe('free')
    expect(tierForStatus('paused')).toBe('free')
    expect(tierForStatus(null)).toBe('free')
    expect(tierForStatus(undefined)).toBe('free')
  })
})

describe('snapshotFromSubscription', () => {
  const base = {
    id: 'sub_123',
    customer: 'cus_456',
    status: 'active',
    cancel_at_period_end: false,
  }

  it('reads period end and price from the subscription item (current Stripe API)', () => {
    const snap = snapshotFromSubscription({
      ...base,
      items: {
        data: [{
          current_period_end: 1793577600, // 2026-11-02
          price: { id: 'price_annual', recurring: { interval: 'year' } },
        }],
      },
    })
    expect(snap).toEqual({
      stripe_customer_id: 'cus_456',
      stripe_subscription_id: 'sub_123',
      status: 'active',
      price_id: 'price_annual',
      billing_interval: 'year',
      current_period_end: new Date(1793577600 * 1000).toISOString(),
      cancel_at_period_end: false,
    })
  })

  it('falls back to the top-level period end (older Stripe API versions)', () => {
    const snap = snapshotFromSubscription({
      ...base,
      current_period_end: 1793577600,
      items: { data: [{ price: { id: 'price_monthly', recurring: { interval: 'month' } } }] },
    })
    expect(snap.current_period_end).toBe(new Date(1793577600 * 1000).toISOString())
    expect(snap.billing_interval).toBe('month')
  })

  it('handles an expanded customer object and missing optional fields', () => {
    const snap = snapshotFromSubscription({
      id: 'sub_123',
      customer: { id: 'cus_789' },
      status: 'canceled',
    })
    expect(snap.stripe_customer_id).toBe('cus_789')
    expect(snap.price_id).toBeNull()
    expect(snap.billing_interval).toBeNull()
    expect(snap.current_period_end).toBeNull()
    expect(snap.cancel_at_period_end).toBe(false)
  })
})
