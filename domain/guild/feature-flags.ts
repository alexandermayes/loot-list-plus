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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hasFeature(
  guild: any,
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isPro(guild: any): boolean {
  if (!guild) return false
  return (String(guild.subscription_tier || 'free')) === 'pro'
}
