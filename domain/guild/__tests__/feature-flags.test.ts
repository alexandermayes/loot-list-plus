import { describe, it, expect } from 'vitest'
import { hasFeature, isPro } from '../feature-flags'

// ─── hasFeature ───────────────────────────────────────────────

describe('hasFeature', () => {
  it('returns false for null guild', () => {
    expect(hasFeature(null, 'raid_teams')).toBe(false)
  })

  it('returns false for undefined guild', () => {
    expect(hasFeature(undefined, 'raid_teams')).toBe(false)
  })

  it('returns false for free tier guild', () => {
    expect(hasFeature({ subscription_tier: 'free' }, 'raid_teams')).toBe(false)
  })

  it('returns true for pro tier guild', () => {
    expect(hasFeature({ subscription_tier: 'pro' }, 'raid_teams')).toBe(true)
  })

  it('returns false when subscription_tier is missing (defaults to free)', () => {
    expect(hasFeature({}, 'raid_teams')).toBe(false)
  })

  it('returns false for unknown tier value', () => {
    expect(hasFeature({ subscription_tier: 'enterprise' }, 'raid_teams')).toBe(false)
  })
})

// ─── isPro ────────────────────────────────────────────────────

describe('isPro', () => {
  it('returns false for null guild', () => {
    expect(isPro(null)).toBe(false)
  })

  it('returns false for undefined guild', () => {
    expect(isPro(undefined)).toBe(false)
  })

  it('returns false for free tier', () => {
    expect(isPro({ subscription_tier: 'free' })).toBe(false)
  })

  it('returns true for pro tier', () => {
    expect(isPro({ subscription_tier: 'pro' })).toBe(true)
  })

  it('returns false when subscription_tier is missing', () => {
    expect(isPro({})).toBe(false)
  })
})
