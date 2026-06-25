import { describe, it, expect, vi } from 'vitest'
import { checkSubscriptionTier, requirePro } from '../feature-gate'

// Lightweight supabase mock: chainable query builder
function mockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  }
  return chain as unknown as Parameters<typeof checkSubscriptionTier>[0]
}

// ─── checkSubscriptionTier ────────────────────────────────────

describe('checkSubscriptionTier', () => {
  it('returns isPro:true for pro guild', async () => {
    const sb = mockSupabase({ data: { subscription_tier: 'pro' }, error: null })
    const result = await checkSubscriptionTier(sb, 'guild-1')
    expect(result).toEqual({ tier: 'pro', isPro: true })
  })

  it('returns isPro:false for free guild', async () => {
    const sb = mockSupabase({ data: { subscription_tier: 'free' }, error: null })
    const result = await checkSubscriptionTier(sb, 'guild-1')
    expect(result).toEqual({ tier: 'free', isPro: false })
  })

  it('returns isPro:false when guild not found', async () => {
    const sb = mockSupabase({ data: null, error: { message: 'not found' } })
    const result = await checkSubscriptionTier(sb, 'missing')
    expect(result).toEqual({ tier: 'free', isPro: false })
  })

  it('defaults to free when subscription_tier is null', async () => {
    const sb = mockSupabase({ data: { subscription_tier: null }, error: null })
    const result = await checkSubscriptionTier(sb, 'guild-1')
    expect(result).toEqual({ tier: 'free', isPro: false })
  })
})

// ─── requirePro ───────────────────────────────────────────────

describe('requirePro', () => {
  it('returns isPro:true for pro guild (no error)', async () => {
    const sb = mockSupabase({ data: { subscription_tier: 'pro' }, error: null })
    const result = await requirePro(sb, 'guild-1')
    expect(result.isPro).toBe(true)
    expect('error' in result && result.error).toBeFalsy()
  })

  it('returns error response for free guild', async () => {
    const sb = mockSupabase({ data: { subscription_tier: 'free' }, error: null })
    const result = await requirePro(sb, 'guild-1')
    expect(result.isPro).toBe(false)
    if (!result.isPro) {
      expect(result.error).toBeDefined()
      // NextResponse.json returns a Response-like object
      const body = await result.error.json()
      expect(body.error).toBe('This feature requires a Pro subscription')
      expect(result.error.status).toBe(403)
    }
  })

  it('returns error response when guild not found', async () => {
    const sb = mockSupabase({ data: null, error: { message: 'not found' } })
    const result = await requirePro(sb, 'missing')
    expect(result.isPro).toBe(false)
  })
})
