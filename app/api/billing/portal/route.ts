import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { getStripe } from '@/lib/billing/stripe'

/**
 * POST /api/billing/portal
 * Create a Stripe customer-portal session so officers can manage or cancel
 * the guild's Premium subscription. Officers with manage_settings only.
 *
 * Body: { guild_id: string }
 * Returns: { url }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { guild_id } = (await request.json()) as { guild_id?: string }
    if (!guild_id) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json({ error: 'Billing is not configured' }, { status: 503 })
    }

    const serviceSupabase = createServiceRoleClient()
    const { hasPermission } = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_settings')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Officers only' }, { status: 403 })
    }

    const { data: sub } = await serviceSupabase
      .from('guild_subscriptions')
      .select('stripe_customer_id')
      .eq('guild_id', guild_id)
      .maybeSingle()

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: 'No billing account for this guild' }, { status: 404 })
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${request.nextUrl.origin}/guild-settings`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Error in POST /api/billing/portal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
