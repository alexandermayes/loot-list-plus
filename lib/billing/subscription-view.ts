/**
 * Maps a guild's tier plus its stored Stripe subscription row to the state
 * the Premium card renders. Kept dependency-free so the client-side trial
 * rule lives in exactly one place.
 */

/**
 * Structural row shape read by both call sites. Every field is optional so
 * BillingSection's five-column select and usePremiumCheckout's one-column
 * select both satisfy this type without a cast.
 */
export interface BillingSubscriptionLike {
  status?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
}

export type BillingViewState = 'pro' | 'paused' | 'free' | 'loading'

/**
 * Decide which of the four Premium-card states to render.
 *
 * Guard order matters:
 * 1. `guildIsPro` wins unconditionally. Tier (`guilds.subscription_tier`,
 *    synced by the webhook) is the entitlement source of truth, not the
 *    subscription row. This is what keeps a complimentary Pro guild (no row
 *    at all) and any guild carrying a stale paused row on the Pro branch
 *    instead of being shown a downgrade notice.
 * 2. `sub === undefined` means the lookup has not resolved yet; `sub === null`
 *    means it resolved and found no row. Conflating the two would flash the
 *    wrong copy for a frame - the free-tier upsell over a paused guild, or
 *    the 14-day-trial promise over a lapsed one.
 * 3. `'paused'` requires BOTH a paused status AND a truthy
 *    `stripe_customer_id`. `POST /api/billing/portal` 404s when the row has
 *    no customer id, so a paused state whose only action is the portal must
 *    never be entered without one.
 * 4. Every other status - canceled, unpaid, incomplete_expired, a null
 *    status, or a paused row missing its customer id - lands on `'free'` by
 *    design. This change is scoped to the paused case only.
 */
export function billingViewState(
  guildIsPro: boolean,
  sub: BillingSubscriptionLike | null | undefined
): BillingViewState {
  if (guildIsPro) return 'pro'
  if (sub === undefined) return 'loading'
  if (sub?.status === 'paused' && sub?.stripe_customer_id) return 'paused'
  return 'free'
}

/**
 * True when a guild has never had a Stripe subscription and is therefore
 * eligible for the 14-day free trial. Mirrors the server rule at
 * `app/api/billing/checkout/route.ts:69` (`!existingSub?.stripe_subscription_id`).
 * The server remains authoritative - this predicate exists only so
 * client-side copy cannot drift from what checkout will actually grant.
 * A null or absent row means the guild never subscribed, which is the
 * eligible case; a row can also exist with no `stripe_subscription_id` yet
 * from an abandoned checkout, which is eligible for the same reason.
 */
export function trialEligible(sub: BillingSubscriptionLike | null | undefined): boolean {
  return !sub?.stripe_subscription_id
}
