import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Cancels a guild's live Stripe subscriptions before the guild itself is
 * deleted, in the pattern of resume-paused.ts: every Stripe dependency
 * arrives through an injected structural port (StripeCancelPort), this
 * module never imports the `stripe` package, and nothing here ever rejects
 * or throws - a Stripe failure is reported in the outcome, not raised,
 * because the caller (the delete route) must decide whether to block the
 * delete rather than have that decision made by an uncaught exception.
 *
 * A guild that never subscribed, or a complimentary guild whose tier was
 * set by hand with no guild_subscriptions row (or a row with no stored
 * Stripe customer), never reaches Stripe at all - see the D-03 checks at
 * the top of cancelGuildSubscriptions. Cancellation is immediate with
 * Stripe's defaults (no invoice_now, no prorate): no further charge, no
 * refund of the unused period, and finalized-invoice collection stops
 * (OD-1 A). The guild id filter in cancellableSubscriptionIds is strict
 * equality, not "any non-empty guild_id" as in resume-paused.ts, because
 * here another guild's live subscription can share the same Stripe
 * customer and must survive.
 */

/** Subscription ids that are considered to have ended and need no cancel. */
export const ENDED_SUBSCRIPTION_STATUSES = ['canceled', 'incomplete_expired'] as const

/** Stripe cancellation_details.comment on every cancel this module makes. Visible only in the Stripe Dashboard, never user-facing. */
export const GUILD_DELETE_CANCELLATION_COMMENT = 'Guild deleted'

/** User-facing texts for endGuildBillingBeforeDelete's failure branches (COPY C-3 to C-5, plus the reused delete-failed text). */
export const GUILD_DELETE_BILLING_ERRORS = {
  deleteFailed: "Couldn't delete guild. Try again.",
  cancelFailed: "Couldn't cancel this guild's Premium subscription, so the guild wasn't deleted. Try again in a few minutes.",
  billingUnavailable: "Billing is unavailable right now, so this guild can't be deleted yet. Try again later.",
  canceledButNotDeleted: "This guild's Premium subscription was cancelled, but the guild couldn't be deleted. Try again.",
} as const

/**
 * The shape this module reads off a Stripe subscription. Optional and
 * nullable throughout so a real `Stripe.Subscription` satisfies it
 * structurally with no cast (the same approach as resume-paused.ts's
 * PausedSubscriptionLike).
 */
export interface CancellableSubscriptionLike {
  id: string
  status: string
  metadata?: { [key: string]: string } | null
}

/**
 * Filter a list of subscriptions down to the ones that belong to this guild
 * and are still live. Input order is preserved. Ownership is strict
 * equality against `guildId` (not "any truthy guild_id"): a customer can
 * hold more than one guild's subscription, and another guild's must never
 * be touched by this guild's delete.
 */
export function cancellableSubscriptionIds(
  subs: CancellableSubscriptionLike[] | null | undefined,
  guildId: string
): string[] {
  if (!subs) return []
  return subs
    .filter((sub) => sub.metadata?.guild_id === guildId)
    .filter((sub) => !(ENDED_SUBSCRIPTION_STATUSES as readonly string[]).includes(sub.status))
    .map((sub) => sub.id)
}

/**
 * The minimal Stripe surface cancelGuildSubscriptions needs. A real Stripe
 * instance (from getStripe()) satisfies this structurally with no cast, the
 * same way a Stripe instance satisfies StripeResumePort in resume-paused.ts
 * (quick task 260921-w4u).
 */
export interface StripeCancelPort {
  subscriptions: {
    list(params: { customer: string; limit: number }): Promise<{
      data: CancellableSubscriptionLike[]
      has_more: boolean
    }>
    cancel(id: string, params: { cancellation_details: { comment: string } }): Promise<unknown>
  }
}

/** The guild_subscriptions columns cancelGuildSubscriptions and endGuildBillingBeforeDelete read. */
export interface GuildSubscriptionRowLike {
  stripe_customer_id: string | null
  status: string | null
}

/**
 * Outcome of one cancelGuildSubscriptions call. `result` is `failed` when
 * the listing failed, any individual cancel failed, or the listing was
 * truncated (has_more true, meaning more than 100 live subscriptions on one
 * customer - cancel what was listed and report failure so the delete is
 * blocked rather than silently leaving one behind). Otherwise `canceled`
 * when at least one subscription was cancelled, else `nothing_to_cancel`.
 */
export interface CancelOutcome {
  result: 'nothing_to_cancel' | 'canceled' | 'failed' | 'not_configured'
  canceled: string[]
  failed: string[]
  listFailed: boolean
  truncated: boolean
}

/**
 * Cancel every live Stripe subscription of `guildId` on the customer stored
 * in `row`. Never rejects: a per-element try/catch around each cancel call
 * means one bad subscription cannot abort the others, and the outer
 * try/catch around the listing call turns a Stripe outage into a reported
 * failure instead of an uncaught rejection.
 */
export async function cancelGuildSubscriptions(
  stripe: StripeCancelPort | null,
  row: GuildSubscriptionRowLike | null,
  guildId: string
): Promise<CancelOutcome> {
  const notConfiguredOrNothing: CancelOutcome = {
    result: 'nothing_to_cancel',
    canceled: [],
    failed: [],
    listFailed: false,
    truncated: false,
  }

  // D-03: no row, or a row with no stored customer (never subscribed, or a
  // complimentary guild whose tier was set by hand) - no Stripe call.
  if (!row || !row.stripe_customer_id) {
    return notConfiguredOrNothing
  }

  const isEnded = row.status
    ? (ENDED_SUBSCRIPTION_STATUSES as readonly string[]).includes(row.status)
    : false

  // Billing not configured (getStripe() returned null): an ended row is
  // nothing_to_cancel, anything else blocks the delete as not_configured.
  if (!stripe) {
    return isEnded ? notConfiguredOrNothing : { ...notConfiguredOrNothing, result: 'not_configured' }
  }

  let data: CancellableSubscriptionLike[]
  let hasMore: boolean
  try {
    const result = await stripe.subscriptions.list({ customer: row.stripe_customer_id, limit: 100 })
    data = result.data
    hasMore = result.has_more
  } catch (err) {
    console.error('cancelGuildSubscriptions: subscriptions.list failed', { guildId, error: err })
    return { result: 'failed', canceled: [], failed: [], listFailed: true, truncated: false }
  }

  const ids = cancellableSubscriptionIds(data, guildId)
  const canceled: string[] = []
  const failed: string[] = []

  for (const id of ids) {
    try {
      await stripe.subscriptions.cancel(id, {
        cancellation_details: { comment: GUILD_DELETE_CANCELLATION_COMMENT },
      })
      canceled.push(id)
    } catch (err) {
      console.error('cancelGuildSubscriptions: subscriptions.cancel failed', { guildId, subscriptionId: id, error: err })
      failed.push(id)
    }
  }

  const truncated = hasMore
  const result: CancelOutcome['result'] =
    failed.length > 0 || truncated ? 'failed' : canceled.length > 0 ? 'canceled' : 'nothing_to_cancel'

  return { result, canceled, failed, listFailed: false, truncated }
}

/** endGuildBillingBeforeDelete's two outcome shapes: proceed to delete_guild with the cancelled ids, or stop with a status and error text. */
export type GuildDeleteBillingResult =
  | { ok: true; canceled: string[] }
  | { ok: false; status: 500 | 502 | 503; error: string }

/**
 * Read the guild's stored subscription row and end its billing before the
 * caller deletes the guild. Never throws: every branch (a DB read error, a
 * thrown read, a Stripe failure) maps to a GuildDeleteBillingResult so the
 * route can answer the right status without its own try/catch around this
 * call.
 */
export async function endGuildBillingBeforeDelete(
  serviceSupabase: SupabaseClient,
  stripe: StripeCancelPort | null,
  guildId: string
): Promise<GuildDeleteBillingResult> {
  try {
    const { data, error } = await serviceSupabase
      .from('guild_subscriptions')
      .select('stripe_customer_id, status')
      .eq('guild_id', guildId)
      .maybeSingle()

    if (error) {
      console.error('endGuildBillingBeforeDelete: guild_subscriptions read failed', { guildId, error })
      return { ok: false, status: 500, error: GUILD_DELETE_BILLING_ERRORS.deleteFailed }
    }

    const outcome = await cancelGuildSubscriptions(stripe, data as GuildSubscriptionRowLike | null, guildId)

    if (outcome.result === 'failed') {
      console.error('endGuildBillingBeforeDelete: cancellation failed', { guildId, outcome })
      return { ok: false, status: 502, error: GUILD_DELETE_BILLING_ERRORS.cancelFailed }
    }
    if (outcome.result === 'not_configured') {
      console.error('endGuildBillingBeforeDelete: billing not configured for a live subscription', { guildId })
      return { ok: false, status: 503, error: GUILD_DELETE_BILLING_ERRORS.billingUnavailable }
    }

    if (outcome.canceled.length > 0) {
      console.log('endGuildBillingBeforeDelete: cancelled subscriptions before delete', { guildId, canceled: outcome.canceled })
    }

    return { ok: true, canceled: outcome.canceled }
  } catch (err) {
    console.error('endGuildBillingBeforeDelete: unexpected error', { guildId, error: err })
    return { ok: false, status: 500, error: GUILD_DELETE_BILLING_ERRORS.deleteFailed }
  }
}
