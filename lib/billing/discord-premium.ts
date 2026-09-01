import { SupabaseClient } from '@supabase/supabase-js'
import { discordFetch } from '@/lib/discord'

/**
 * Premium perks in the LootList+ community Discord: subscribers get the
 * Premium role, which unlocks #premium-lounge.
 *
 * Awaited by the Stripe webhook inside its own try/catch, so a Discord
 * failure never turns a successful DB sync into a 500 that Stripe would
 * retry. The daily reconciliation cron (`/api/cron/sync-discord-premium`)
 * is the safety net for anything this call misses.
 *
 * Before revoking, this checks whether the resolved purchaser still owns
 * another guild at the pro tier (comped guilds included). A purchaser
 * holding Premium on two guilds keeps the role when only one subscription
 * ends; the role only comes off once the last pro guild does.
 *
 * The member might not be in the community server; that's fine (404 →
 * skip, no error logged).
 */
export async function syncPremiumDiscordRole(
  serviceSupabase: SupabaseClient,
  guildId: string,
  purchaserUserId: string | null,
  isPro: boolean
): Promise<void> {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN
    const communityGuildId = process.env.DISCORD_COMMUNITY_GUILD_ID
    const premiumRoleId = process.env.DISCORD_PREMIUM_ROLE_ID
    if (!botToken || !communityGuildId || !premiumRoleId) return

    // Prefer the recorded purchaser; fall back to the guild creator for
    // subscriptions from before purchaser metadata existed.
    let userId = purchaserUserId
    if (!userId) {
      const { data: guild } = await serviceSupabase
        .from('guilds')
        .select('created_by')
        .eq('id', guildId)
        .maybeSingle()
      userId = guild?.created_by ?? null
    }
    if (!userId) return

    const { data: prefs } = await serviceSupabase
      .from('user_preferences')
      .select('discord_id')
      .eq('user_id', userId)
      .maybeSingle()
    if (!prefs?.discord_id) return

    if (!isPro) {
      // Multi-guild guard: if the purchaser still owns another guild at the
      // pro tier (comped guilds count, since this keys on subscription_tier
      // alone), leave the role alone. syncSubscriptionToGuild has already
      // written this guild's new tier by the time we run, so excluding it
      // via .neq is what stops this guild from voting for itself.
      const { data: otherProGuild } = await serviceSupabase
        .from('guilds')
        .select('id')
        .eq('created_by', userId)
        .eq('subscription_tier', 'pro')
        .neq('id', guildId)
        .limit(1)
        .maybeSingle()
      if (otherProGuild) return
    }

    const url = `https://discord.com/api/v10/guilds/${communityGuildId}/members/${prefs.discord_id}/roles/${premiumRoleId}`
    const res = await discordFetch(url, {
      method: isPro ? 'PUT' : 'DELETE',
      headers: {
        Authorization: `Bot ${botToken}`,
        'X-Audit-Log-Reason': isPro ? 'LootList+ Premium subscription started' : 'LootList+ Premium subscription ended',
      },
    })

    // 204 = done; 404 = member not in the community server - both fine
    if (!res.ok && res.status !== 404) {
      console.error('Discord premium role sync failed', {
        communityGuildId,
        action: isPro ? 'grant' : 'revoke',
        status: res.status,
      })
    }
  } catch (err) {
    console.error('Discord premium role sync error', err)
  }
}
