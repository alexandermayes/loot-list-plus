'use client'

import dynamic from 'next/dynamic'
import { type ReactNode } from 'react'

// PostHog ships ~58KB gzipped of analytics code. We don't need it on the
// LCP-critical path — defer it to after first paint via a client-only
// dynamic import. Children render synchronously; PostHog mounts as a
// sibling effects-only component once its chunk arrives. Safe because
// nothing in the app reads usePostHog() — the provider is purely for
// init, pageview, and identify side effects.
const PostHogEffects = dynamic(
  () => import('./PostHogProvider').then((m) => ({ default: m.PostHogProvider })),
  { ssr: false, loading: () => null },
)

export function PostHogProviderDeferred({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <PostHogEffects>{null}</PostHogEffects>
    </>
  )
}
