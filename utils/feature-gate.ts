/**
 * Server-side feature gating for API routes.
 *
 * Usage in API routes:
 *   const { isPro, error } = await requirePro(serviceSupabase, guildId)
 *   if (error) return error
 */

import { NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Check if a guild has Pro tier. Returns the guild's subscription_tier.
 */
export async function checkSubscriptionTier(
  supabase: SupabaseClient,
  guildId: string
): Promise<{ tier: string; isPro: boolean }> {
  const { data, error } = await supabase
    .from('guilds')
    .select('subscription_tier')
    .eq('id', guildId)
    .single()

  if (error || !data) {
    return { tier: 'free', isPro: false }
  }

  const tier = data.subscription_tier || 'free'
  return { tier, isPro: tier === 'pro' }
}

/**
 * Require Pro tier for an API route. Returns a NextResponse error if not Pro.
 */
export async function requirePro(
  supabase: SupabaseClient,
  guildId: string
): Promise<{ isPro: true; error?: undefined } | { isPro: false; error: NextResponse }> {
  const { isPro } = await checkSubscriptionTier(supabase, guildId)

  if (!isPro) {
    return {
      isPro: false,
      error: NextResponse.json(
        { error: 'This feature requires a Pro subscription' },
        { status: 403 }
      ),
    }
  }

  return { isPro: true }
}
