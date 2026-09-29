import { describe, it, expect } from 'vitest'
import {
  parseGiftCodeArgs,
  normalizeGiftCode,
  generateGiftCode,
  resolveGift,
  giftMetadata,
  buildCouponParams,
  buildPromotionCodeParams,
  isLiveKey,
  GiftCodeArgError,
  GIFT_CODE_ALPHABET,
  GIFT_CODE_PREFIX,
  redactStripeSecrets,
} from '../gift-code'

// ─── parseGiftCodeArgs ──────────────────────────────────────

describe('parseGiftCodeArgs', () => {
  it('returns the D-02/D-03 defaults for no flags', () => {
    expect(parseGiftCodeArgs([])).toEqual({
      code: null,
      months: null,
      expiresInDays: 30,
      maxRedemptions: 1,
      dryRun: false,
      assumeYes: false,
      help: false,
    })
  })

  it('parses --expires-in-days 7 (space form)', () => {
    expect(parseGiftCodeArgs(['--expires-in-days', '7']).expiresInDays).toBe(7)
  })

  it('parses --expires-in-days=7 (equals form)', () => {
    expect(parseGiftCodeArgs(['--expires-in-days=7']).expiresInDays).toBe(7)
  })

  it('parses --months 3', () => {
    expect(parseGiftCodeArgs(['--months', '3']).months).toBe(3)
  })

  it('parses --dry-run and --yes as booleans', () => {
    const options = parseGiftCodeArgs(['--dry-run', '--yes'])
    expect(options.dryRun).toBe(true)
    expect(options.assumeYes).toBe(true)
  })

  it.each(['0', '-5', 'abc', '2.5'])('throws GiftCodeArgError naming the flag for --months %s', (value) => {
    expect(() => parseGiftCodeArgs(['--months', value])).toThrow(GiftCodeArgError)
    expect(() => parseGiftCodeArgs(['--months', value])).toThrow(/--months/)
  })

  it('throws GiftCodeArgError for a numeric flag with a missing value', () => {
    expect(() => parseGiftCodeArgs(['--months'])).toThrow(GiftCodeArgError)
    expect(() => parseGiftCodeArgs(['--months'])).toThrow(/--months/)
  })

  it('throws GiftCodeArgError for an unrecognised flag', () => {
    expect(() => parseGiftCodeArgs(['--bogus'])).toThrow(GiftCodeArgError)
  })
})

// ─── normalizeGiftCode ──────────────────────────────────────

describe('normalizeGiftCode', () => {
  it('trims and uppercases', () => {
    expect(normalizeGiftCode(' giftabc ')).toBe('GIFTABC')
  })

  it('rejects a hyphen', () => {
    expect(() => normalizeGiftCode('GIFT-ABC')).toThrow(GiftCodeArgError)
  })

  it('rejects a too-short code', () => {
    expect(() => normalizeGiftCode('GI')).toThrow(GiftCodeArgError)
  })

  it('rejects a too-long code', () => {
    expect(() => normalizeGiftCode('A'.repeat(41))).toThrow(GiftCodeArgError)
  })
})

// ─── generateGiftCode ───────────────────────────────────────

describe('generateGiftCode', () => {
  it('returns the exact expected string with an injected deterministic index function', () => {
    // Always picks index 0 -> the first alphabet character, repeated.
    const code = generateGiftCode(() => 0)
    expect(code).toBe(`GIFT${GIFT_CODE_ALPHABET[0].repeat(8)}`)
  })

  it('produces 200 codes matching the pattern with no ambiguous characters in the generated suffix', () => {
    // The fixed GIFT_CODE_PREFIX itself contains "I" by design; the ambiguity
    // guarantee (from GIFT_CODE_ALPHABET) applies to the random suffix only.
    const codes = Array.from({ length: 200 }, () => generateGiftCode())
    const ambiguous = /[0O1ILU]/

    for (const code of codes) {
      expect(code).toMatch(/^GIFT[A-Z0-9]{8}$/)
      const suffix = code.slice(GIFT_CODE_PREFIX.length)
      expect(ambiguous.test(suffix)).toBe(false)
    }
  })
})

// ─── resolveGift ────────────────────────────────────────────

describe('resolveGift', () => {
  it('sets expiresAt to nowMs/1000 + expiresInDays * 86400', () => {
    const nowMs = Date.UTC(2026, 0, 1)
    const gift = resolveGift(
      { code: 'GIFTABCD', months: null, expiresInDays: 30, maxRedemptions: 1, dryRun: false, assumeYes: false, help: false },
      nowMs
    )
    expect(gift.expiresAt).toBe(Math.floor(nowMs / 1000) + 30 * 86400)
  })
})

// ─── giftMetadata ───────────────────────────────────────────

describe('giftMetadata', () => {
  it('tags the gift with lootlist_gift, created_by, and expires_at_iso', () => {
    const meta = giftMetadata({ code: 'GIFTABCD', months: null, expiresAt: 1893456000, maxRedemptions: 1 })
    expect(meta.lootlist_gift).toBe('true')
    expect(meta.created_by).toBe('scripts/create-gift-code.ts')
    expect(meta.expires_at_iso).toBe(new Date(1893456000 * 1000).toISOString())
  })
})

// ─── buildCouponParams ──────────────────────────────────────

describe('buildCouponParams', () => {
  it('is forever with no duration_in_months when months is null', () => {
    const params = buildCouponParams({ code: 'GIFTABCD', months: null, expiresAt: 1893456000, maxRedemptions: 1 })
    expect(params.percent_off).toBe(100)
    expect(params.duration).toBe('forever')
    expect(params.duration_in_months).toBeUndefined()
  })

  it('is repeating with duration_in_months when months is set', () => {
    const params = buildCouponParams({ code: 'GIFTABCD', months: 3, expiresAt: 1893456000, maxRedemptions: 1 })
    expect(params.duration).toBe('repeating')
    expect(params.duration_in_months).toBe(3)
  })
})

// ─── buildPromotionCodeParams ───────────────────────────────

describe('buildPromotionCodeParams', () => {
  it('returns the resolved code, max_redemptions, expires_at, and gift metadata', () => {
    const gift = { code: 'GIFTABCD', months: null, expiresAt: 1893456000, maxRedemptions: 1 }
    const params = buildPromotionCodeParams(gift, 'coupon_123')
    expect(params.promotion).toEqual({ type: 'coupon', coupon: 'coupon_123' })
    expect(params.code).toBe('GIFTABCD')
    expect(params.max_redemptions).toBe(1)
    expect(params.expires_at).toBe(1893456000)
    expect(params.metadata?.lootlist_gift).toBe('true')
  })
})

// ─── isLiveKey ──────────────────────────────────────────────

describe('isLiveKey', () => {
  it('is true for an sk_live_ prefix', () => {
    expect(isLiveKey('sk_live_abc')).toBe(true)
  })

  it('is false for an sk_test_ prefix', () => {
    expect(isLiveKey('sk_test_abc')).toBe(false)
  })
})

// ─── redactStripeSecrets ────────────────────────────────────

describe('redactStripeSecrets', () => {
  it('does not contain the literal secret value', () => {
    const secret = 'sk_test_abcdefghijklmnop'
    const result = redactStripeSecrets(`Using key ${secret} failed`, secret)
    expect(result).not.toContain(secret)
  })

  it("redacts Stripe's own partially-masked sk_test_ form", () => {
    const result = redactStripeSecrets('Invalid API Key provided: sk_test_*****ABCD')
    expect(result).not.toContain('sk_test_')
    expect(result).not.toContain('ABCD')
  })

  it("redacts an sk_live_ bearing message the same way", () => {
    const result = redactStripeSecrets('Invalid API Key provided: sk_live_*****WXYZ')
    expect(result).not.toContain('sk_live_')
    expect(result).not.toContain('WXYZ')
  })

  it('replaces every key-shaped substring when a message contains multiple', () => {
    const result = redactStripeSecrets('First sk_test_AAAA1111 then sk_live_BBBB2222')
    expect(result).not.toContain('sk_test_AAAA1111')
    expect(result).not.toContain('sk_live_BBBB2222')
  })

  it('returns text with no key-shaped substring unchanged', () => {
    const text = 'Nothing sensitive here'
    expect(redactStripeSecrets(text)).toBe(text)
  })

  it('does not throw when secret is undefined or empty, and pattern-based replacement still applies', () => {
    expect(() => redactStripeSecrets('sk_test_shouldberedacted', undefined)).not.toThrow()
    expect(redactStripeSecrets('sk_test_shouldberedacted', undefined)).not.toContain('sk_test_shouldberedacted')
    expect(() => redactStripeSecrets('sk_test_shouldberedacted', '')).not.toThrow()
    expect(redactStripeSecrets('sk_test_shouldberedacted', '')).not.toContain('sk_test_shouldberedacted')
  })
})
