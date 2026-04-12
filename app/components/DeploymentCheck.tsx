'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Detects when a new deployment has gone live and forces a hard reload.
 *
 * After a Vercel deployment, the old client JS bundle can't render the new RSC
 * payloads. Client-side navigation appears to work (the fetch succeeds) but
 * the UI doesn't update because the chunk hashes have changed.
 *
 * This component captures the build ID on mount, then re-checks it on every
 * client-side navigation. If the ID changes, it triggers a full page reload
 * so the browser fetches the new JS bundle.
 */
export function DeploymentCheck() {
  const pathname = usePathname()
  const initialBuildId = useRef<string | null>(null)
  const checkCount = useRef(0)

  useEffect(() => {
    // Fetch the build ID on mount to establish the baseline
    fetch('/api/version')
      .then(res => res.json())
      .then(data => {
        initialBuildId.current = data.buildId
      })
      .catch(() => {
        // Non-critical, silently ignore
      })
  }, [])

  useEffect(() => {
    // Skip the first render (mount)
    if (checkCount.current === 0) {
      checkCount.current++
      return
    }

    // Don't check if we never got the initial build ID
    if (!initialBuildId.current) return

    fetch('/api/version')
      .then(res => res.json())
      .then(data => {
        if (data.buildId && data.buildId !== initialBuildId.current) {
          // New deployment detected. Hard reload to get the new JS bundle.
          window.location.reload()
        }
      })
      .catch(() => {
        // Network error, silently ignore
      })
  }, [pathname])

  return null
}
