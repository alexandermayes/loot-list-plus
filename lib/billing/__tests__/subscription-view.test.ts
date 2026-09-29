import { describe, it, expect } from 'vitest'
import { billingViewState, trialEligible } from '../subscription-view'

describe('billingViewState', () => {
  it('is pro for a complimentary Pro guild with no subscription row', () => {
    expect(billingViewState(true, undefined)).toBe('pro')
  })

  it('is pro for a Pro guild with an active row', () => {
    expect(billingViewState(true, { status: 'active', stripe_customer_id: 'cus_123' })).toBe('pro')
  })

  it('is pro even with a stale paused row - tier wins over the row', () => {
    expect(billingViewState(true, { status: 'paused', stripe_customer_id: 'cus_123' })).toBe('pro')
  })

  it('is loading while the lookup has not resolved', () => {
    expect(billingViewState(false, undefined)).toBe('loading')
  })

  it('is free when the lookup resolved with no row', () => {
    expect(billingViewState(false, null)).toBe('free')
  })

  it('is paused when the row is paused and carries a customer id', () => {
    expect(billingViewState(false, { status: 'paused', stripe_customer_id: 'cus_123' })).toBe('paused')
  })

  it('is free when paused but missing a customer id - the portal would 404', () => {
    expect(billingViewState(false, { status: 'paused', stripe_customer_id: null })).toBe('free')
  })

  it('is free for a canceled row', () => {
    expect(billingViewState(false, { status: 'canceled', stripe_customer_id: 'cus_123' })).toBe('free')
  })

  it('is free for a row with a null status', () => {
    expect(billingViewState(false, { status: null, stripe_customer_id: 'cus_123' })).toBe('free')
  })
})

describe('trialEligible', () => {
  it('is true when the row is undefined', () => {
    expect(trialEligible(undefined)).toBe(true)
  })

  it('is true when the row is null', () => {
    expect(trialEligible(null)).toBe(true)
  })

  it('is true when the row exists but has no stripe_subscription_id', () => {
    expect(trialEligible({ stripe_subscription_id: null })).toBe(true)
  })

  it('is false when the row carries a stripe_subscription_id', () => {
    expect(trialEligible({ stripe_subscription_id: 'sub_123' })).toBe(false)
  })
})
