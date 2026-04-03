/**
 * Feature gating based on guild subscription tier.
 *
 * For now, subscription_tier is set manually in the DB.
 * When Stripe integration is added, this will read from the
 * subscriptions table instead.
 */

export type SubscriptionTier = 'free' | 'pro'

export type ProFeature = 'raid_teams'

const PRO_FEATURES: ProFeature[] = ['raid_teams']

/**
 * Check if a guild has access to a Pro feature.
 */
export function hasFeature(
  guild: { subscription_tier?: string } | null | undefined,
  feature: ProFeature
): boolean {
  if (!guild) return false
  const tier = (guild.subscription_tier || 'free') as SubscriptionTier
  if (tier === 'pro') return PRO_FEATURES.includes(feature)
  return false
}

/**
 * Check if a guild is on the Pro tier.
 */
export function isPro(guild: { subscription_tier?: string } | null | undefined): boolean {
  if (!guild) return false
  return (guild.subscription_tier || 'free') === 'pro'
}
