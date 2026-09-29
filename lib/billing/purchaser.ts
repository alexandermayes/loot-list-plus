import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolves a guild's Premium purchaser and their linked Discord id. Shared
 * by `lib/billing/discord-premium.ts` (grant/revoke the community Premium
 * role) and `lib/billing/trial-ending.ts` (warn the purchaser before their
 * trial ends), both billing-plus-Discord concerns, which is why this lives
 * in a neutral module rather than as an export on a feature-named one -
 * `trial-ending.ts` importing from a module named for the Premium-role
 * feature would be an import edge describing something untrue about the
 * dependency.
 */

export interface Purchaser {
  userId: string
  discordId: string
}

/**
 * Resolve the purchaser's user id and linked `discord_id`. Preferred source
 * is `purchaserUserId` (typically `subscription.metadata.user_id`);
 * falls back to `guilds.created_by` for subscriptions that predate
 * purchaser metadata. Returns null when a user id can't be resolved at all,
 * or when the resolved user has no linked `discord_id` - there is nothing
 * either caller can do with just one half of the pair.
 */
export async function resolvePurchaser(
  serviceSupabase: SupabaseClient,
  guildId: string,
  purchaserUserId: string | null
): Promise<Purchaser | null> {
  let userId = purchaserUserId
  if (!userId) {
    const { data: guild } = await serviceSupabase
      .from('guilds')
      .select('created_by')
      .eq('id', guildId)
      .maybeSingle()
    userId = guild?.created_by ?? null
  }
  if (!userId) return null

  const { data: prefs } = await serviceSupabase
    .from('user_preferences')
    .select('discord_id')
    .eq('user_id', userId)
    .maybeSingle()
  if (!prefs?.discord_id) return null

  return { userId, discordId: prefs.discord_id }
}
