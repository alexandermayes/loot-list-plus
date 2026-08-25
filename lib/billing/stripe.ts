import Stripe from 'stripe'

/**
 * Server-side Stripe client. Returns null when billing isn't configured so
 * routes can degrade to a clear 503 instead of crashing at import time.
 */
let stripeClient: Stripe | null | undefined

export function getStripe(): Stripe | null {
  if (stripeClient !== undefined) return stripeClient
  const key = process.env.STRIPE_SECRET_KEY
  stripeClient = key ? new Stripe(key) : null
  return stripeClient
}

/** Price IDs for the two LootList+ Premium plans, configured in Stripe. */
export function getPriceId(interval: 'monthly' | 'annual'): string | null {
  return (interval === 'monthly'
    ? process.env.STRIPE_PRICE_MONTHLY
    : process.env.STRIPE_PRICE_ANNUAL) || null
}
