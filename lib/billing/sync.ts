import { SupabaseClient } from '@supabase/supabase-js'
import { snapshotFromSubscription, tierForStatus } from './tier'

/**
 * Persist a Stripe subscription's state for a guild and keep
 * guilds.subscription_tier — the single field the app gates on — in sync.
 */
export async function syncSubscriptionToGuild(
  serviceSupabase: SupabaseClient,
  guildId: string,
  subscription: Parameters<typeof snapshotFromSubscription>[0]
): Promise<{ tier: string; error?: string }> {
  const snapshot = snapshotFromSubscription(subscription)
  const tier = tierForStatus(snapshot.status)

  const { error: subError } = await serviceSupabase
    .from('guild_subscriptions')
    .upsert(
      { guild_id: guildId, ...snapshot, updated_at: new Date().toISOString() },
      { onConflict: 'guild_id' }
    )

  if (subError) {
    return { tier, error: `guild_subscriptions upsert failed: ${subError.message}` }
  }

  const { error: tierError } = await serviceSupabase
    .from('guilds')
    .update({ subscription_tier: tier })
    .eq('id', guildId)

  if (tierError) {
    return { tier, error: `subscription_tier update failed: ${tierError.message}` }
  }

  return { tier }
}
