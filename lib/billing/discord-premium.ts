import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Premium perks in the LootList+ community Discord: subscribers get the
 * Premium role, which unlocks #premium-lounge. Called fire-and-forget from
 * the Stripe webhook — Discord being down must never fail billing sync.
 *
 * The member might not be in the community server; that's fine (404 → skip).
 * Known edge: a user who purchased Premium for two guilds loses the role
 * when either subscription ends. Acceptable at current scale.
 */

const COMMUNITY_GUILD_ID = process.env.DISCORD_COMMUNITY_GUILD_ID
const PREMIUM_ROLE_ID = process.env.DISCORD_PREMIUM_ROLE_ID

export async function syncPremiumDiscordRole(
  serviceSupabase: SupabaseClient,
  guildId: string,
  purchaserUserId: string | null,
  isPro: boolean
): Promise<void> {
  try {
    const botToken = process.env.DISCORD_BOT_TOKEN
    if (!botToken || !COMMUNITY_GUILD_ID || !PREMIUM_ROLE_ID) return

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

    const url = `https://discord.com/api/v10/guilds/${COMMUNITY_GUILD_ID}/members/${prefs.discord_id}/roles/${PREMIUM_ROLE_ID}`
    const res = await fetch(url, {
      method: isPro ? 'PUT' : 'DELETE',
      headers: {
        Authorization: `Bot ${botToken}`,
        'X-Audit-Log-Reason': isPro ? 'LootList+ Premium subscription started' : 'LootList+ Premium subscription ended',
      },
    })

    // 204 = done; 404 = member not in the community server — both fine
    if (!res.ok && res.status !== 404) {
      const body = await res.text().catch(() => '')
      console.error('Discord premium role sync failed', res.status, body.slice(0, 200))
    }
  } catch (err) {
    console.error('Discord premium role sync error', err)
  }
}
