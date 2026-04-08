import { getPostHogServerClient } from './analytics/posthog-server'

export async function getFeatureFlag(
  flagKey: string,
  distinctId: string
): Promise<boolean> {
  const ph = getPostHogServerClient()
  if (!ph) return false
  try {
    const result = await ph.isFeatureEnabled(flagKey, distinctId)
    return result ?? false
  } catch {
    return false
  }
}

export async function getFeatureFlagPayload(
  flagKey: string,
  distinctId: string
): Promise<unknown> {
  const ph = getPostHogServerClient()
  if (!ph) return null
  try {
    return await ph.getFeatureFlagPayload(flagKey, distinctId)
  } catch {
    return null
  }
}
