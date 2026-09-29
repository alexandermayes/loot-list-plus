import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getStripe } from '@/lib/billing/stripe'
import { syncSubscriptionToGuild } from '@/lib/billing/sync'
import { syncPremiumDiscordRole } from '@/lib/billing/discord-premium'
import { trackEvent } from '@/utils/analytics/server'
import { paymentMethodCustomerId, resumePausedSubscriptions } from '@/lib/billing/resume-paused'
import { notifyTrialEnding } from '@/lib/billing/trial-ending'

/**
 * POST /api/webhooks/stripe
 * Stripe webhook: keeps guild_subscriptions and guilds.subscription_tier in
 * sync with Stripe. Configure the endpoint in Stripe with events:
 *   checkout.session.completed
 *   customer.subscription.updated
 *   customer.subscription.deleted
 *   customer.subscription.paused
 *   customer.subscription.resumed
 *   payment_method.attached
 *   customer.subscription.trial_will_end
 *
 * paused and resumed matter because a trial that ends with no payment
 * method moves to status 'paused' rather than emitting a plain update.
 * Without these cases the event falls through to default, the tier never
 * syncs, and the guild stays on 'pro' for free.
 *
 * payment_method.attached matters for the other direction: it fires when an
 * officer finally attaches a card to a subscription that trial-ended into
 * 'paused', and is what resumes it (see the case below). Stripe delivers
 * only the events an endpoint is explicitly subscribed to, so this line is
 * a description of a Dashboard setting on endpoint we_1U8UUlFV7dhwtnIjYXou6I5i
 * that must actually exist - without it, the case below never runs in
 * production no matter how correct the code is.
 *
 * customer.subscription.trial_will_end fires three days before a trial
 * ends (or immediately for trials under three days) and warns the
 * purchaser on Discord before a card-less trial pauses Premium. Same
 * caveat as above: this line is a description of a Dashboard setting on
 * we_1U8UUlFV7dhwtnIjYXou6I5i that must actually exist.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe()
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    const payload = await request.text()
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    let subscription: Stripe.Subscription | null = null

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && session.subscription) {
          const subId =
            typeof session.subscription === 'string' ? session.subscription : session.subscription.id
          subscription = await stripe.subscriptions.retrieve(subId)
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed': {
        subscription = event.data.object as Stripe.Subscription
        break
      }
      case 'payment_method.attached': {
        const paymentMethod = event.data.object as Stripe.PaymentMethod
        const customerId = paymentMethodCustomerId(paymentMethod)
        if (!customerId) {
          // Reachable per the SDK's own `customer: string | Customer | null`
          // union, not a defensive hypothetical - nothing to resume without
          // a customer to look subscriptions up against.
          console.error(`Stripe webhook ${event.type}: payment method ${paymentMethod.id} has no customer`)
          return NextResponse.json({ received: true })
        }

        // Wrapped in its own try/catch, same as syncPremiumDiscordRole above:
        // the imported resume helper already contracts not to throw (this is
        // the belt to that module's own braces), but a throw reaching the
        // route's outer catch would answer 500, and a 500 makes Stripe retry
        // the *entire* event with backoff and eventually disable the
        // endpoint - taking down tier sync for every guild over a recovery
        // that is optional by construction.
        try {
          const outcome = await resumePausedSubscriptions(stripe, customerId)
          if (outcome.listFailed) {
            console.error(`Stripe webhook ${event.type}: subscriptions.list failed for customer ${customerId}`)
          } else if (outcome.paused === 0) {
            console.log(`Stripe webhook ${event.type}: customer ${customerId} had no paused subscriptions (portal likely resumed it already)`)
          } else {
            console.log(`Stripe webhook ${event.type}: customer ${customerId} had ${outcome.paused} paused subscription(s), resumed [${outcome.resumed.join(', ')}]`)
          }
        } catch (err) {
          console.error(`Stripe webhook ${event.type}: resume helper threw for customer ${customerId}`, err)
        }
        return NextResponse.json({ received: true })
      }
      case 'customer.subscription.trial_will_end': {
        const trialSubscription = event.data.object as Stripe.Subscription

        // Does NOT fall through into the shared `subscription` variable
        // below: those cases exist to run syncSubscriptionToGuild and
        // syncPremiumDiscordRole, and a trial_will_end subscription is still
        // 'trialing', so the tier they would write is the tier already
        // stored. Routing this through that path would spend a DB write and
        // a Discord role call to change nothing, and would put a
        // notification failure on the same code path as tier sync. Same
        // early-return structure payment_method.attached uses above, for
        // the same reason.
        const serviceSupabase = createServiceRoleClient()

        // Wrapped in its own try/catch even though notifyTrialEnding
        // already contracts not to throw - belt to that module's braces,
        // matching the precedent set twice already in this file. A throw
        // escaping to the outer catch would answer 500, and a 500 makes
        // Stripe retry the whole event with backoff and eventually disable
        // the endpoint, taking down tier sync for every guild over a
        // notification that is optional by construction.
        try {
          const outcome = await notifyTrialEnding(serviceSupabase, stripe, trialSubscription)
          console.log(
            `Stripe webhook ${event.type}: subscription ${trialSubscription.id} -> sent=${outcome.sent} reason=${outcome.reason}`
          )
        } catch (err) {
          console.error(`Stripe webhook ${event.type}: notifyTrialEnding threw for subscription ${trialSubscription.id}`, err)
        }
        return NextResponse.json({ received: true })
      }
      default:
        // Not a subscription-lifecycle event we track — acknowledge and move on
        return NextResponse.json({ received: true })
    }

    if (!subscription) {
      return NextResponse.json({ received: true })
    }

    const guildId = subscription.metadata?.guild_id
    if (!guildId) {
      // A subscription without our metadata isn't ours to sync; don't retry.
      console.error(`Stripe webhook ${event.type}: subscription ${subscription.id} has no guild_id metadata`)
      return NextResponse.json({ received: true })
    }

    const serviceSupabase = createServiceRoleClient()
    const { tier, error } = await syncSubscriptionToGuild(serviceSupabase, guildId, subscription)

    // Community Discord perk: grant/revoke the Premium role for the purchaser.
    // Awaited so the sync completes before we respond, but wrapped in its own
    // try/catch so a Discord problem never turns a successful DB sync into a
    // 500 that Stripe would retry - the daily reconciliation cron is the
    // safety net for anything this call misses.
    if (!error) {
      try {
        await syncPremiumDiscordRole(
          serviceSupabase,
          guildId,
          subscription.metadata?.user_id ?? null,
          tier === 'pro'
        )
      } catch (discordError) {
        console.error(`Stripe webhook ${event.type}: Discord role sync failed for guild ${guildId}, reconciliation cron will catch it`, discordError)
      }
    }

    // A completed checkout is a new Premium subscription — the conversion
    // event for the acquisition funnel (guild-scoped distinct id; no user
    // context exists inside a webhook).
    if (!error && event.type === 'checkout.session.completed') {
      const item = subscription.items?.data?.[0]
      trackEvent({
        event: 'premium_subscription_started',
        userId: `guild:${guildId}`,
        guildId,
        properties: {
          billing_period: item?.price?.recurring?.interval ?? null,
          price: item?.price?.unit_amount != null ? item.price.unit_amount / 100 : null,
          trialing: subscription.status === 'trialing',
        },
      })
    }

    if (error) {
      // 500 so Stripe retries — the DB write failed, not the event parsing.
      console.error(`Stripe webhook ${event.type} for guild ${guildId}:`, error)
      return NextResponse.json({ error }, { status: 500 })
    }

    console.log(`Stripe webhook ${event.type}: guild ${guildId} -> ${tier}`)
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Error handling Stripe webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
