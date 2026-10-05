/**
 * Server-side Premium gating for API routes.
 *
 * guilds.subscription_tier is the only entitlement source: it is kept in
 * sync from Stripe by lib/billing/sync.ts, and comped guilds are set to
 * 'pro' by hand. Routes never gate on a client flag, cookie or request
 * field; every check here reads the tier with the service client.
 *
 * Usage:
 *   const access = await requireReserveAccess(serviceSupabase, userId, guildId)
 *   if (!access.allowed) return access.error
 *
 *   const access = await requireReserveRunPremium(serviceSupabase, run, 'manager')
 *   if (!access.allowed) return access.error
 *
 *   const hasAccess = await guildHasPaidAccess(serviceSupabase, guildId, 'reserve_runs')
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

/**
 * Every API surface that can be gated to Premium.
 *
 * 'reserve_runs' keeps the pre-2026-08-27 grandfathering (see
 * RESERVE_GRANDFATHER_CUTOFF above).
 *
 * 'guild_api' is the read-only loot history API for guilds (GH #271).
 * Every request to it must call guildHasPaidAccess with this key before
 * any read: Premium only, with no grandfathering, because no guild has
 * used it yet.
 *
 * Discord bot lookups and addon sync get their own keys when they move
 * to Premium (slices 2 and 3 of the 261004-jgk split).
 */
export type PaidFeature = 'reserve_runs' | 'guild_api'

/**
 * Read a guild's subscription tier with the service client. Throws on a
 * read error so callers fail closed instead of treating a failed lookup
 * as free or as Premium. Any tier value other than 'pro' (including a
 * null column and a missing row) reads as 'free'.
 */
export async function readGuildTier(
  supabase: SupabaseClient,
  guildId: string
): Promise<'pro' | 'free'> {
  const { data, error } = await supabase
    .from('guilds')
    .select('subscription_tier')
    .eq('id', guildId)
    .maybeSingle()

  if (error) {
    throw new Error(`readGuildTier: guild read failed: ${error.message}`)
  }

  return data?.subscription_tier === 'pro' ? 'pro' : 'free'
}

/**
 * Whether a guild has paid access to a feature. A 'pro' guild always
 * has access, for every feature, with no other read. Otherwise, only
 * 'reserve_runs' grants grandfathered access to a free guild that
 * created a reserve run before RESERVE_GRANDFATHER_CUTOFF; every other
 * feature (including 'guild_api') is Premium only. Throws on a read
 * error so callers fail closed.
 */
export async function guildHasPaidAccess(
  supabase: SupabaseClient,
  guildId: string,
  feature: PaidFeature
): Promise<boolean> {
  const tier = await readGuildTier(supabase, guildId)
  if (tier === 'pro') return true

  if (feature !== 'reserve_runs') return false

  const { data, error } = await supabase
    .from('reserve_runs')
    .select('id')
    .eq('guild_id', guildId)
    .lt('created_at', RESERVE_GRANDFATHER_CUTOFF)
    .limit(1)

  if (error) {
    throw new Error(`guildHasPaidAccess: reserve_runs read failed: ${error.message}`)
  }

  return (data?.length ?? 0) > 0
}

/**
 * Whether a user has reserve-run access. With a guildId, this is just
 * guildHasPaidAccess for that guild. Without one (a personal, guild-less
 * run), the user qualifies through any of their active guild
 * memberships: a user with no characters, or whose only memberships are
 * inactive, has no personal access. Throws on a read error so callers
 * fail closed.
 */
export async function userHasReserveAccess(
  supabase: SupabaseClient,
  userId: string,
  guildId?: string | null
): Promise<boolean> {
  if (guildId) {
    return guildHasPaidAccess(supabase, guildId, 'reserve_runs')
  }

  const { data: chars, error: charsError } = await supabase
    .from('characters')
    .select('id')
    .eq('user_id', userId)
  if (charsError) {
    throw new Error(`userHasReserveAccess: characters read failed: ${charsError.message}`)
  }
  if (!chars || chars.length === 0) return false

  const { data: memberships, error: membershipsError } = await supabase
    .from('character_guild_memberships')
    .select('guild_id')
    .in('character_id', chars.map((c) => c.id))
    .eq('is_active', true)
  if (membershipsError) {
    throw new Error(`userHasReserveAccess: memberships read failed: ${membershipsError.message}`)
  }

  const guildIds = [...new Set((memberships ?? []).map((m) => m.guild_id))]
  for (const gid of guildIds) {
    if (await guildHasPaidAccess(supabase, gid, 'reserve_runs')) return true
  }
  return false
}

/**
 * Require reserve-run access: the guild (or, for personal runs, any of the
 * user's guilds) must be Premium or grandfathered. Throws on a read error
 * (no denial body) so a database error never tells a paying guild to
 * upgrade.
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

  const hasAccess = await userHasReserveAccess(supabase, userId, guildId)
  return hasAccess ? { allowed: true } : denied
}

/**
 * Require Premium or reserve grandfathering for a write on an existing
 * reserve run. The run's owner decides, never the caller: a run with no
 * guild qualifies through its creator's active guilds, the same rule its
 * creator met at create time. Denied with C-2 for a manager's write, or
 * C-3 for a guest's sign-up.
 */
export async function requireReserveRunPremium(
  supabase: SupabaseClient,
  run: { guild_id: string | null; created_by: string },
  audience: 'manager' | 'guest'
): Promise<{ allowed: true; error?: undefined } | { allowed: false; error: NextResponse }> {
  const hasAccess = await userHasReserveAccess(supabase, run.created_by, run.guild_id)
  if (hasAccess) return { allowed: true }

  const message =
    audience === 'manager'
      ? 'Reserve runs are a LootList+ Premium feature, so this run is read only until its guild upgrades.'
      : "This run can't take reserves right now because its guild doesn't have LootList+ Premium. Let your raid leader know."

  return {
    allowed: false,
    error: NextResponse.json({ error: message, code: 'premium_required' }, { status: 403 }),
  }
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
