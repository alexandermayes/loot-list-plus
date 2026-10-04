import { SupabaseClient } from '@supabase/supabase-js'
import { snapshotFromSubscription, tierForStatus } from './tier'

/**
 * Persist a Stripe subscription's state for a guild and keep
 * guilds.subscription_tier — the single field the app gates on — in sync.
 *
 * The guild lookup before the upsert exists because a webhook event can
 * arrive after its guild was deleted: deleting a Premium guild now cancels
 * its Stripe subscription first (lib/billing/cancel-guild-subscription.ts),
 * so the customer.subscription.deleted event that follows routinely finds
 * no guild row to sync against. Without this check the upsert would fail on
 * guild_subscriptions_guild_id_fkey, the route would answer 500, and Stripe
 * would retry the event with backoff until it eventually disables the
 * endpoint over an acknowledgement that was never going anywhere.
 *
 * The upsert's own '23503' (foreign key violation) is treated the same way,
 * for the narrower race where the guild is deleted between the lookup above
 * and this upsert.
 */
export async function syncSubscriptionToGuild(
  serviceSupabase: SupabaseClient,
  guildId: string,
  subscription: Parameters<typeof snapshotFromSubscription>[0]
): Promise<{ tier: string; error?: string; guildMissing?: true }> {
  const snapshot = snapshotFromSubscription(subscription)
  const tier = tierForStatus(snapshot.status)

  const { data: guild, error: guildError } = await serviceSupabase
    .from('guilds')
    .select('id')
    .eq('id', guildId)
    .maybeSingle()

  if (guildError) {
    return { tier, error: `guild lookup failed: ${guildError.message}` }
  }

  if (!guild) {
    return { tier, guildMissing: true }
  }

  const { error: subError } = await serviceSupabase
    .from('guild_subscriptions')
    .upsert(
      { guild_id: guildId, ...snapshot, updated_at: new Date().toISOString() },
      { onConflict: 'guild_id' }
    )

  if (subError) {
    if (subError.code === '23503') {
      return { tier, guildMissing: true }
    }
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
