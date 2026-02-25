import { PostHog } from 'posthog-node'

let client: PostHog | null = null

function getClient(): PostHog | null {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null
  if (!client) {
    client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return client
}

export async function getFeatureFlag(
  flagKey: string,
  distinctId: string
): Promise<boolean> {
  const ph = getClient()
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
  const ph = getClient()
  if (!ph) return null
  try {
    return await ph.getFeatureFlagPayload(flagKey, distinctId)
  } catch {
    return null
  }
}
