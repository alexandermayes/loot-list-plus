import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getStripe } from '@/lib/billing/stripe'
import { syncSubscriptionToGuild } from '@/lib/billing/sync'
import { syncPremiumDiscordRole } from '@/lib/billing/discord-premium'
import { trackEvent } from '@/utils/analytics/server'

/**
 * POST /api/webhooks/stripe
 * Stripe webhook: keeps guild_subscriptions and guilds.subscription_tier in
 * sync with Stripe. Configure the endpoint in Stripe with events:
 *   checkout.session.completed
 *   customer.subscription.updated
 *   customer.subscription.deleted
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
      case 'customer.subscription.deleted': {
        subscription = event.data.object as Stripe.Subscription
        break
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

    // Community Discord perk: grant/revoke the Premium role for the purchaser
    if (!error) {
      syncPremiumDiscordRole(
        serviceSupabase,
        guildId,
        subscription.metadata?.user_id ?? null,
        tier === 'pro'
      )
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
