import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { getStripe, getPriceId } from '@/lib/billing/stripe'

/**
 * POST /api/billing/checkout
 * Create a Stripe Checkout session to upgrade a guild to LootList+ Premium.
 * Officers with manage_settings only.
 *
 * Body: { guild_id: string, interval: 'monthly' | 'annual' }
 * Returns: { url } — the Stripe-hosted checkout page
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { guild_id, interval } = (await request.json()) as {
      guild_id?: string
      interval?: string
    }

    if (!guild_id || (interval !== 'monthly' && interval !== 'annual')) {
      return NextResponse.json(
        { error: 'guild_id and interval (monthly|annual) are required' },
        { status: 400 }
      )
    }

    const stripe = getStripe()
    const priceId = getPriceId(interval)
    if (!stripe || !priceId) {
      return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 })
    }

    const serviceSupabase = createServiceRoleClient()
    const { hasPermission } = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_settings')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Officers only' }, { status: 403 })
    }

    const { data: guild } = await serviceSupabase
      .from('guilds')
      .select('id, name, subscription_tier')
      .eq('id', guild_id)
      .single()

    if (!guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 })
    }
    if (guild.subscription_tier === 'pro') {
      return NextResponse.json({ error: 'This guild already has Premium' }, { status: 400 })
    }

    // Reuse the guild's Stripe customer if it has one from a past subscription
    const { data: existingSub } = await serviceSupabase
      .from('guild_subscriptions')
      .select('stripe_customer_id')
      .eq('guild_id', guild_id)
      .maybeSingle()

    const origin = request.nextUrl.origin
    const session = await stripe.checkout.sessions.create({
      // Managed Payments (Link as merchant of record) is enabled by default
      // on this account, but it replaces the branded Checkout with Link's
      // own UI. Deliberately disabled: LootList+ is the merchant of record
      // and Checkout renders with the account's branding.
      managed_payments: { enabled: false },
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      customer: existingSub?.stripe_customer_id || undefined,
      customer_email: existingSub?.stripe_customer_id ? undefined : user.email,
      allow_promotion_codes: true,
      metadata: { guild_id, guild_name: guild.name },
      subscription_data: { metadata: { guild_id } },
      success_url: `${origin}/guild-settings?billing=success`,
      cancel_url: `${origin}/premium?billing=cancelled`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error in POST /api/billing/checkout:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
