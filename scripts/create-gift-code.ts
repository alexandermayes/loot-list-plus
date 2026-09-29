#!/usr/bin/env tsx
/**
 * Mints a single-use, expiring, 100%-off Stripe promotion code that an
 * operator can hand to a guild as free Premium.
 *
 * The code defaults to single-use and expiring in 30 days (D-03), and is
 * tagged with gift metadata so it's distinguishable from marketing promo
 * codes in the Stripe dashboard (GIFT-06). A live-mode key requires an
 * explicit confirmation before anything is created (GIFT-03).
 *
 * Usage: npm run gift:code -- [--code CODE] [--months N] [--expires-in-days N]
 *          [--max-redemptions N] [--dry-run] [--yes] [--help]
 *
 * Examples:
 *   npm run gift:code -- --dry-run
 *   npm run gift:code -- --months 3 --expires-in-days 14
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import Stripe from 'stripe'
import { createInterface } from 'node:readline/promises'
import {
  parseGiftCodeArgs,
  resolveGift,
  buildCouponParams,
  buildPromotionCodeParams,
  isLiveKey,
  redactStripeSecrets,
  GiftCodeArgError,
} from './lib/gift-code'

const CONFIRMATION_WORD = 'create'

const USAGE = `
Mint a single-use, expiring, 100%-off Stripe gift promotion code.

Usage: npm run gift:code -- [options]

Options:
  --code CODE             Use this code instead of generating one (4-40 letters/digits)
  --months N              Coupon repeats for N months instead of forever (D-02)
  --expires-in-days N     Promotion code expires in N days (default 30)
  --max-redemptions N     Maximum redemptions (default 1)
  --dry-run               Print what would be created; make no Stripe API call
  --yes                   Skip the live-mode confirmation prompt
  --help                  Show this message

Examples:
  npm run gift:code -- --dry-run
  npm run gift:code -- --months 3 --expires-in-days 14
`.trim()

function printSummary(gift: ReturnType<typeof resolveGift>, live: boolean) {
  const duration =
    gift.months !== null ? `repeating (${gift.months} month${gift.months === 1 ? '' : 's'})` : 'forever'

  console.log('')
  console.log('='.repeat(50))
  console.log(`Mode:              ${live ? 'LIVE' : 'TEST'}`)
  console.log(`Code:              ${gift.code}`)
  console.log(`Percent off:       100%`)
  console.log(`Duration:          ${duration}`)
  console.log(`Expires:           ${new Date(gift.expiresAt * 1000).toISOString()}`)
  console.log(`Max redemptions:   ${gift.maxRedemptions}`)
  console.log('='.repeat(50))
}

/**
 * Live-mode confirmation gate (GIFT-03, PD-1). Runs strictly before any
 * network call, so a refused run makes zero requests. `--yes` bypasses the
 * prompt; otherwise a TTY gets an interactive confirmation, and a
 * non-interactive session (piped, CI, agent-driven) is refused outright
 * rather than hanging or silently proceeding.
 */
async function confirmLiveMode(assumeYes: boolean): Promise<void> {
  console.log('')
  console.log('!'.repeat(60))
  console.log('!! LIVE MODE: this will create a real, working 100% off')
  console.log('!! promotion code in the production Stripe account.')
  console.log('!'.repeat(60))

  if (assumeYes) {
    console.log('Live-mode gate bypassed by --yes.')
    return
  }

  if (!process.stdin.isTTY) {
    console.error('Refusing to run against a live key without --yes (stdin is not a terminal).')
    process.exit(1)
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  let answer: string
  try {
    answer = await rl.question(`Type "${CONFIRMATION_WORD}" to continue: `)
  } finally {
    rl.close()
  }

  if (answer.trim().toLowerCase() !== CONFIRMATION_WORD) {
    console.error('Confirmation not received. Aborting.')
    process.exit(1)
  }
}

async function main() {
  const args = parseGiftCodeArgs(process.argv.slice(2))

  if (args.help) {
    console.log(USAGE)
    return
  }

  const key = process.env.STRIPE_SECRET_KEY || ''
  if (!key) {
    console.error('Missing STRIPE_SECRET_KEY. Set it in .env.local or the environment.')
    process.exit(1)
  }

  const live = isLiveKey(key)
  const gift = resolveGift(args, Date.now())

  printSummary(gift, live)

  if (args.dryRun) {
    console.log('')
    console.log('Dry run: no Stripe API call was made.')
    return
  }

  if (live) {
    await confirmLiveMode(args.assumeYes)
  }

  const stripe = new Stripe(key)

  // Uniqueness pre-check (PD-3): a collision either fails the second create
  // below (leaving an orphaned coupon) or succeeds into an ambiguous pair.
  // One cheap read before coupons.create removes both outcomes.
  const existing = await stripe.promotionCodes.list({ code: gift.code, limit: 1 })
  if (existing.data.length > 0) {
    console.error(
      `Code "${gift.code}" is already in use (existing promotion code id: ${existing.data[0].id}). ` +
        'Choose a different --code or omit it to generate a fresh one.'
    )
    process.exit(1)
  }

  const coupon = await stripe.coupons.create(buildCouponParams(gift))

  let promotionCode: Stripe.PromotionCode
  try {
    promotionCode = await stripe.promotionCodes.create(buildPromotionCodeParams(gift, coupon.id))
  } catch (error) {
    console.error(
      `Promotion code creation failed. Coupon ${coupon.id} was already created and is now unattached ` +
        '— delete it from the Stripe dashboard.'
    )
    throw error
  }

  const duration =
    gift.months !== null ? `repeating (${gift.months} month${gift.months === 1 ? '' : 's'})` : 'forever'

  console.log('')
  console.log('*'.repeat(50))
  console.log(`GIFT CODE: ${promotionCode.code}`)
  console.log('*'.repeat(50))
  console.log(`Grants:            100% off Premium, ${duration}`)
  console.log(`Expires:           ${new Date(gift.expiresAt * 1000).toISOString()}`)
  console.log(`Redemptions left:  ${gift.maxRedemptions}`)
  console.log('')
  console.log('Have the recipient paste this code into the promotion code field at checkout.')
  console.log('This code is a bearer credential — send it directly to the recipient, not to a public channel.')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    const key = process.env.STRIPE_SECRET_KEY || ''

    if (error instanceof GiftCodeArgError) {
      console.error(redactStripeSecrets(error.message, key))
    } else {
      const message = error instanceof Error ? error.message : String(error)
      console.error(redactStripeSecrets(message, key))
      if (error instanceof Error && error.stack) {
        console.error(redactStripeSecrets(error.stack, key))
      }
    }

    process.exit(1)
  })
