/**
 * Pure helpers for scripts/create-gift-code.ts: flag parsing, validation,
 * code generation, expiry math, Stripe param builders, and secret
 * redaction. No dotenv, no Stripe client construction, no console output,
 * no top-level side effects, so this module can be unit tested without
 * loading .env.local or risking a stray API call (PD-4).
 */

import type Stripe from 'stripe'
import { randomInt } from 'node:crypto'

/** Unambiguous uppercase alphabet: excludes 0/O, 1/I/L and U (Crockford's exclusions), PD-2. */
export const GIFT_CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'
export const GIFT_CODE_PREFIX = 'GIFT'
export const GIFT_CODE_RANDOM_LENGTH = 8

/** The single error type for every operator-input failure, so the CLI can print it without a stack trace. */
export class GiftCodeArgError extends Error {}

export type GiftCodeOptions = {
  code: string | null
  months: number | null
  expiresInDays: number
  maxRedemptions: number
  dryRun: boolean
  assumeYes: boolean
  help: boolean
}

const VALID_FLAGS = [
  '--code',
  '--months',
  '--expires-in-days',
  '--max-redemptions',
  '--dry-run',
  '--yes',
  '--help',
]

/**
 * Parses a flag value as an integer of at least 1, throwing GiftCodeArgError
 * naming the flag and the rejected value for anything non-numeric, zero,
 * negative, or fractional (GIFT-02).
 */
function parsePositiveInt(flag: string, value: string): number {
  const trimmed = value.trim()
  if (!/^-?\d+$/.test(trimmed)) {
    throw new GiftCodeArgError(`Flag "${flag}" requires a whole number, got "${value}"`)
  }
  const parsed = Number(trimmed)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new GiftCodeArgError(`Flag "${flag}" requires a whole number of at least 1, got "${value}"`)
  }
  return parsed
}

/**
 * Parses CLI flags for the gift-code script. Accepts both `--flag value`
 * and `--flag=value` forms. Takes argv as a parameter rather than reading
 * process.argv directly so tests can drive it (GIFT-01).
 */
export function parseGiftCodeArgs(argv: string[]): GiftCodeOptions {
  const options: GiftCodeOptions = {
    code: null,
    months: null,
    expiresInDays: 30,
    maxRedemptions: 1,
    dryRun: false,
    assumeYes: false,
    help: false,
  }

  let i = 0
  while (i < argv.length) {
    const raw = argv[i]
    let flag = raw
    let inlineValue: string | null = null

    const eqIndex = raw.indexOf('=')
    if (raw.startsWith('--') && eqIndex !== -1) {
      flag = raw.slice(0, eqIndex)
      inlineValue = raw.slice(eqIndex + 1)
    }

    if (!VALID_FLAGS.includes(flag)) {
      throw new GiftCodeArgError(`Unrecognized flag "${flag}". Valid flags: ${VALID_FLAGS.join(', ')}`)
    }

    const readValue = (): string => {
      if (inlineValue !== null) return inlineValue
      const next = argv[i + 1]
      if (next === undefined) {
        throw new GiftCodeArgError(`Flag "${flag}" requires a value`)
      }
      i += 1
      return next
    }

    switch (flag) {
      case '--code':
        options.code = readValue()
        break
      case '--months':
        options.months = parsePositiveInt(flag, readValue())
        break
      case '--expires-in-days':
        options.expiresInDays = parsePositiveInt(flag, readValue())
        break
      case '--max-redemptions':
        options.maxRedemptions = parsePositiveInt(flag, readValue())
        break
      case '--dry-run':
        options.dryRun = true
        break
      case '--yes':
        options.assumeYes = true
        break
      case '--help':
        options.help = true
        break
    }

    i += 1
  }

  return options
}

const GIFT_CODE_PATTERN = /^[A-Z0-9]{4,40}$/

/**
 * Normalizes an operator-supplied code: trims, uppercases, and requires
 * `[A-Z0-9]{4,40}`. Deliberately stricter than Stripe — rejecting locally
 * with a clear message beats a round-trip API error and a possible
 * orphaned coupon (PD-2).
 */
export function normalizeGiftCode(raw: string): string {
  const normalized = raw.trim().toUpperCase()
  if (!GIFT_CODE_PATTERN.test(normalized)) {
    throw new GiftCodeArgError(
      `Invalid code "${raw}": only letters and digits are accepted, 4-40 characters long`
    )
  }
  return normalized
}

/**
 * Generates a gift code: GIFT_CODE_PREFIX plus GIFT_CODE_RANDOM_LENGTH draws
 * from GIFT_CODE_ALPHABET. The randomIndex parameter defaults to
 * crypto.randomInt for unbiased selection; it is injectable so tests can
 * pin the output (PD-2).
 */
export function generateGiftCode(randomIndex: (max: number) => number = (max) => randomInt(max)): string {
  let suffix = ''
  for (let i = 0; i < GIFT_CODE_RANDOM_LENGTH; i++) {
    suffix += GIFT_CODE_ALPHABET[randomIndex(GIFT_CODE_ALPHABET.length)]
  }
  return `${GIFT_CODE_PREFIX}${suffix}`
}

export type ResolvedGift = {
  code: string
  months: number | null
  expiresAt: number
  maxRedemptions: number
}

/**
 * Resolves the final gift shape from parsed options: the operator-supplied
 * code (normalized) or a generated one, and expiresAt as a Unix second
 * timestamp — Stripe reads `expires_at` as seconds, not milliseconds.
 */
export function resolveGift(
  opts: GiftCodeOptions,
  nowMs: number,
  generate: () => string = generateGiftCode
): ResolvedGift {
  const code = opts.code !== null ? normalizeGiftCode(opts.code) : generate()
  const expiresAt = Math.floor(nowMs / 1000) + opts.expiresInDays * 86400
  return {
    code,
    months: opts.months,
    expiresAt,
    maxRedemptions: opts.maxRedemptions,
  }
}

/**
 * Metadata tagging script-created gifts so they're filterable and
 * distinguishable from marketing promo codes in the Stripe dashboard
 * (GIFT-06, D-04). Stripe metadata values must be strings.
 */
export function giftMetadata(gift: ResolvedGift): Record<string, string> {
  return {
    lootlist_gift: 'true',
    created_by: 'scripts/create-gift-code.ts',
    expires_at_iso: new Date(gift.expiresAt * 1000).toISOString(),
  }
}

/**
 * Builds the Stripe coupon params for a gift: always 100% off. Duration is
 * 'forever' by default (D-02); when `gift.months` is set, the coupon
 * repeats for that many months instead.
 */
export function buildCouponParams(gift: ResolvedGift): Stripe.CouponCreateParams {
  const base: Stripe.CouponCreateParams = {
    percent_off: 100,
    name: `LootList+ Premium gift (${gift.code})`,
    metadata: giftMetadata(gift),
    duration: 'forever',
  }

  if (gift.months !== null) {
    return {
      ...base,
      duration: 'repeating',
      duration_in_months: gift.months,
    }
  }

  return base
}

/**
 * Builds the Stripe promotion code params for a gift: single-use AND
 * expiring, both, always (D-03), tagged with gift metadata (GIFT-06).
 */
export function buildPromotionCodeParams(gift: ResolvedGift, couponId: string): Stripe.PromotionCodeCreateParams {
  return {
    promotion: { type: 'coupon', coupon: couponId },
    code: gift.code,
    max_redemptions: gift.maxRedemptions,
    expires_at: gift.expiresAt,
    metadata: giftMetadata(gift),
  }
}

/** True when the key has the `sk_live_` prefix. */
export function isLiveKey(key: string): boolean {
  return key.startsWith('sk_live_')
}

const STRIPE_KEY_PATTERN = /sk_(?:live|test)_[A-Za-z0-9*_-]+/g
const REDACTED_PLACEHOLDER = 'sk_***redacted***'

/**
 * Redacts Stripe secret-key material from arbitrary text. Performs two
 * replacements in order: first every literal occurrence of `secret` (when
 * it is a non-empty string), then every match of a Stripe secret-key shape
 * — the `sk_` prefix, `live` or `test`, an underscore, then key characters.
 * The pattern pass matters most: Stripe's own authentication errors echo a
 * partially-masked key that still carries real leading and trailing
 * characters, so scrubbing only the literal value would still leak them
 * (GIFT-04).
 */
export function redactStripeSecrets(text: string, secret?: string): string {
  let result = text
  if (secret) {
    result = result.split(secret).join(REDACTED_PLACEHOLDER)
  }
  result = result.replace(STRIPE_KEY_PATTERN, REDACTED_PLACEHOLDER)
  return result
}
