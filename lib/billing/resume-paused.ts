/**
 * Decides which paused Stripe subscriptions a newly attached payment method
 * should revive, and owns the error handling around that decision. Both live
 * here, rather than inline in the webhook route, so the filter and the three
 * control-flow properties the plan depends on (empty list is a no-op, one
 * failing resume does not abort the rest, nothing ever throws) are
 * unit-testable without the `stripe` module. See resume-paused.test.ts.
 */

/**
 * The shape this module reads off a Stripe subscription. Optional and
 * nullable throughout so a real `Stripe.Subscription` satisfies it
 * structurally with no cast.
 */
export interface PausedSubscriptionLike {
  id: string
  metadata?: { [key: string]: string } | null
}

/**
 * Resolve the customer id off a Stripe PaymentMethod. `customer` arrives as
 * a bare id string, an expanded object carrying `id`, or null - the same
 * three-shape union `snapshotFromSubscription` handles in `tier.ts`, for the
 * same reason (Stripe sends the expanded form when the event was created
 * with expansion). An empty string returns null rather than '' because
 * passing '' to `subscriptions.list` would make the call malformed, not
 * merely return an empty result.
 */
export function paymentMethodCustomerId(pm: {
  customer?: string | { id: string } | null
}): string | null {
  const customer = pm.customer
  if (typeof customer === 'string') {
    return customer.length > 0 ? customer : null
  }
  if (customer && typeof customer === 'object') {
    return customer.id
  }
  return null
}

/**
 * Filter a list of paused subscriptions down to the ones we own, by id.
 * Ownership mirrors the webhook's existing guard at route.ts:74-79: only
 * `app/api/billing/checkout/route.ts` writes `metadata.guild_id`, so a
 * non-empty value there is the same "is this ours" test applied to a write
 * instead of a read. Input order is preserved (the log line and the tests
 * read better that way) and nothing is deduplicated - two subscriptions
 * sharing a `guild_id` are still two distinct Stripe objects and each needs
 * its own resume call.
 */
export function resumableSubscriptionIds(
  subs: PausedSubscriptionLike[] | null | undefined
): string[] {
  if (!subs) return []
  return subs.filter((sub) => Boolean(sub.metadata?.guild_id)).map((sub) => sub.id)
}

/**
 * The minimal Stripe surface `resumePausedSubscriptions` needs. Exists so
 * the orchestrator's failure behaviour can be exercised against a fake that
 * throws on purpose - the one thing a mocked `stripe` module could not
 * honestly prove, since asserting a mock returns what we told it to return
 * is a tautology.
 */
export interface StripeResumePort {
  subscriptions: {
    list(params: {
      customer: string
      status: 'paused'
      limit: number
    }): Promise<{ data: PausedSubscriptionLike[] }>
    resume(id: string): Promise<unknown>
  }
}

/**
 * Outcome of one `resumePausedSubscriptions` call, shaped for logging.
 * `paused` is reported pre-ownership-filter on purpose: the difference
 * between `paused: 0` and `paused: 1, resumed: []` is the difference
 * between the billing portal having already resumed the subscription and
 * us having correctly declined to touch someone else's, and the log line
 * needs to tell those two apart.
 */
export interface ResumeOutcome {
  customerId: string
  paused: number
  resumed: string[]
  failed: string[]
  listFailed: boolean
}

/**
 * Resume every paused subscription that belongs to `customerId` and carries
 * our `metadata.guild_id`. Contracts to never reject and never throw: a
 * Stripe failure here must not become a 500 that makes Stripe retry the
 * whole webhook delivery and eventually disable the endpoint over a
 * recovery path that is optional by construction.
 *
 * The `status: 'paused'` filter passed to `list` is the entire safety
 * argument, not an efficiency filter - it is why this never calls resume on
 * a subscription Stripe already resumed (which errors), and therefore why
 * the change is correct whether or not the billing portal resumes on its
 * own. `limit: 100` is a considered stop, not pagination forgotten: a
 * customer with more than 100 paused subscriptions is a data incident that
 * wants a human, and the `paused` count in the returned outcome makes that
 * situation visible rather than silent the moment it happens.
 */
export async function resumePausedSubscriptions(
  stripe: StripeResumePort,
  customerId: string
): Promise<ResumeOutcome> {
  let data: PausedSubscriptionLike[]
  try {
    const result = await stripe.subscriptions.list({
      customer: customerId,
      status: 'paused',
      limit: 100,
    })
    data = result.data
  } catch (err) {
    console.error(`resumePausedSubscriptions: subscriptions.list failed for customer ${customerId}:`, err)
    return { customerId, paused: 0, resumed: [], failed: [], listFailed: true }
  }

  const ids = resumableSubscriptionIds(data)
  const resumed: string[] = []
  const failed: string[] = []

  // Caught inside the loop, not around it: the subscriptions are independent
  // Stripe objects, so one failing resume (an invoice that needs to be paid
  // first, a price that has since been archived) must not abort the
  // recovery of the others. No second argument to resume(): billing_cycle_anchor
  // already defaults to 'now', which generates no prorations.
  for (const id of ids) {
    try {
      await stripe.subscriptions.resume(id)
      resumed.push(id)
    } catch (err) {
      console.error(`resumePausedSubscriptions: subscriptions.resume failed for subscription ${id}:`, err)
      failed.push(id)
    }
  }

  return { customerId, paused: data.length, resumed, failed, listFailed: false }
}
