/**
 * Feature gating based on guild subscription tier.
 *
 * For now, subscription_tier is set manually in the DB.
 * When Stripe integration is added, this will read from the
 * subscriptions table instead.
 */

export type SubscriptionTier = 'free' | 'pro'

export type ProFeature = 'raid_teams' | 'audit_log'

const PRO_FEATURES: ProFeature[] = ['raid_teams', 'audit_log']

/** Minimal shape needed to evaluate gating — any guild_settings-like row. */
type GuildLike = { subscription_tier?: string | null } | null | undefined

/**
 * Check if a guild has access to a Pro feature.
 */
export function hasFeature(
  guild: GuildLike,
  feature: ProFeature
): boolean {
  if (!guild) return false
  const tier = (String(guild.subscription_tier || 'free')) as SubscriptionTier
  if (tier === 'pro') return PRO_FEATURES.includes(feature)
  return false
}

/**
 * Check if a guild is on the Pro tier.
 */
export function isPro(guild: GuildLike): boolean {
  if (!guild) return false
  return (String(guild.subscription_tier || 'free')) === 'pro'
}
