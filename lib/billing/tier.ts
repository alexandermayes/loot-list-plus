/**
 * Pure mapping from Stripe subscription state to a guild's subscription_tier.
 * Kept dependency-free so it's trivially unit-testable.
 */

export type SubscriptionTier = 'free' | 'pro'

/**
 * past_due keeps Pro as a grace period while Stripe retries the payment;
 * every terminal or pre-payment state drops back to free.
 */
export function tierForStatus(status: string | null | undefined): SubscriptionTier {
  switch (status) {
    case 'active':
    case 'trialing':
    case 'past_due':
      return 'pro'
    default:
      return 'free'
  }
}

export interface SubscriptionSnapshot {
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  status: string | null
  price_id: string | null
  billing_interval: string | null
  current_period_end: string | null
  cancel_at_period_end: boolean
}

/**
 * Extract the fields we persist from a Stripe subscription object. Typed
 * structurally rather than against Stripe.Subscription because the fields we
 * need moved between Stripe API versions (current_period_end lives on the
 * subscription item in newer versions, on the subscription in older ones).
 */
export function snapshotFromSubscription(sub: {
  id: string
  customer: string | { id: string }
  status: string
  cancel_at_period_end?: boolean
  current_period_end?: number | null
  items?: {
    data?: Array<{
      current_period_end?: number | null
      price?: { id?: string; recurring?: { interval?: string } | null }
    }>
  }
}): SubscriptionSnapshot {
  const item = sub.items?.data?.[0]
  const periodEnd = item?.current_period_end ?? sub.current_period_end ?? null
  return {
    stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null,
    stripe_subscription_id: sub.id,
    status: sub.status,
    price_id: item?.price?.id ?? null,
    billing_interval: item?.price?.recurring?.interval ?? null,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end ?? false,
  }
}
