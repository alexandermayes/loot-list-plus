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
 * Reserve runs became a Premium feature on 2026-08-27. Guilds that had
 * already created a reserve run before the cutoff are grandfathered in
 * forever — never claw a feature back from someone who was using it.
 */
const RESERVE_GRANDFATHER_CUTOFF = '2026-08-27T00:00:00Z'

async function guildHasReserveAccess(
  supabase: SupabaseClient,
  guildId: string
): Promise<boolean> {
  const { isPro } = await checkSubscriptionTier(supabase, guildId)
  if (isPro) return true
  const { data } = await supabase
    .from('reserve_runs')
    .select('id')
    .eq('guild_id', guildId)
    .lt('created_at', RESERVE_GRANDFATHER_CUTOFF)
    .limit(1)
  return (data?.length ?? 0) > 0
}

/**
 * Require reserve-run access: the guild (or, for personal runs, any of the
 * user's guilds) must be Premium or grandfathered.
 */
export async function requireReserveAccess(
  supabase: SupabaseClient,
  userId: string,
  guildId?: string | null
): Promise<{ allowed: true; error?: undefined } | { allowed: false; error: NextResponse }> {
  const denied = {
    allowed: false as const,
    error: NextResponse.json(
      { error: 'Reserve runs are a LootList+ Premium feature. Upgrade your guild to create new runs.', code: 'premium_required' },
      { status: 403 }
    ),
  }

  if (guildId) {
    return (await guildHasReserveAccess(supabase, guildId)) ? { allowed: true } : denied
  }

  // Personal (guild-less) run: qualify through any of the user's guilds
  const { data: chars } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', userId)
  if (!chars || chars.length === 0) return denied

  const { data: memberships } = await supabase
    .from('character_guild_memberships')
    .select('guild_id')
    .in('character_id', chars.map((c) => c.id))
    .eq('is_active', true)
  const guildIds = [...new Set((memberships ?? []).map((m) => m.guild_id))]
  for (const gid of guildIds) {
    if (await guildHasReserveAccess(supabase, gid)) return { allowed: true }
  }
  return denied
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
