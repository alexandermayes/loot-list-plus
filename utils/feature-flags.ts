'use client'

import { usePostHog } from 'posthog-js/react'
import { useEffect, useState } from 'react'

/**
 * Client-side hook for feature flags.
 * Returns false while loading, then the flag value.
 */
export function useFeatureFlag(flagKey: string): boolean {
  const posthogClient = usePostHog()
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (!posthogClient) return

    setEnabled(posthogClient.isFeatureEnabled(flagKey) ?? false)

    const unsubscribe = posthogClient.onFeatureFlags(() => {
      setEnabled(posthogClient.isFeatureEnabled(flagKey) ?? false)
    })

    return () => { unsubscribe?.() }
  }, [posthogClient, flagKey])

  return enabled
}

/**
 * Get feature flag value with optional payload.
 * Useful for multivariate flags.
 */
export function useFeatureFlagPayload(flagKey: string): unknown {
  const posthogClient = usePostHog()
  const [payload, setPayload] = useState<unknown>(null)

  useEffect(() => {
    if (!posthogClient) return

    setPayload(posthogClient.getFeatureFlagPayload(flagKey))

    const unsubscribe = posthogClient.onFeatureFlags(() => {
      setPayload(posthogClient.getFeatureFlagPayload(flagKey))
    })

    return () => { unsubscribe?.() }
  }, [posthogClient, flagKey])

  return payload
}
