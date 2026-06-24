'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense, ReactNode } from 'react'
import { createClient } from '@/utils/supabase/client'

// Defer PostHog initialization until after hydration to avoid blocking FCP/LCP.
// The init runs once on first call to getPostHogInstance().
let posthogInitialized = false

function ensurePostHogInitialized() {
  if (posthogInitialized || typeof window === 'undefined' || !process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  posthogInitialized = true
  try {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: '/a',
      ui_host: 'https://us.i.posthog.com',
      person_profiles: 'always',
      capture_pageview: false,
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      bootstrap: {
        featureFlags: {},
      },
      disable_session_recording: true,
      loaded: (ph) => {
        fetch('/a/static/recorder.js?v=check', { method: 'HEAD' })
          .then((res) => {
            if (res.ok) (ph as { set_config: (config: { disable_session_recording: boolean }) => void }).set_config({ disable_session_recording: false })
          })
          .catch(() => {})
      },
    })
  } catch {
    // PostHog init failed (likely adblocker) - app continues without analytics
  }
}

// Pageview tracker component - needs to be wrapped in Suspense due to useSearchParams
function PostHogPageView() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const posthog = usePostHog()

  useEffect(() => {
    if (pathname && posthog) {
      let url = window.origin + pathname
      if (searchParams?.toString()) {
        url = url + '?' + searchParams.toString()
      }
      posthog.capture('$pageview', { $current_url: url })
    }
  }, [pathname, searchParams, posthog])

  return null
}

// User identification component — uses auth state change events instead of
// calling getUser() on mount, which would add a redundant ~200-400ms network
// round-trip (middleware and GuildContext already handle auth).
function PostHogIdentify() {
  const posthog = usePostHog()
  const supabase = createClient()

  useEffect(() => {
    if (!posthog) return

    const identifyFromSession = async (sessionUser: { id: string; email?: string; created_at?: string }) => {
      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('preferred_display_name, discord_id')
        .eq('user_id', sessionUser.id)
        .single()

      posthog.identify(sessionUser.id, {
        email: sessionUser.email,
        discord_id: prefs?.discord_id,
        display_name: prefs?.preferred_display_name,
        created_at: sessionUser.created_at,
      })
    }

    // Identify from current session without a network call (no round-trip)
    const initIdentify = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) identifyFromSession(session.user)
    }
    initIdentify()

    // Re-identify on auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: { user?: { id: string; email?: string; created_at?: string } } | null) => {
      if (event === 'SIGNED_IN' && session?.user) {
        identifyFromSession(session.user)

        // Distinguish signup from returning sign-in
        if (session.user.created_at) {
          const createdAt = new Date(session.user.created_at).getTime()
          const now = Date.now()
          const isNewUser = now - createdAt < 60_000
          posthog.capture(isNewUser ? 'user_signed_up' : 'user_signed_in', {
            auth_provider: 'discord',
          })
        }
      } else if (event === 'SIGNED_OUT') {
        posthog.reset()
      }
    })

    return () => subscription.unsubscribe()
  }, [posthog, supabase])

  return null
}

interface PostHogProviderProps {
  children: ReactNode
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  // Defer PostHog init to after hydration (useEffect) instead of module load
  useEffect(() => {
    ensurePostHogInitialized()
  }, [])

  // Skip PostHog in development or if key not configured
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    return <>{children}</>
  }

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <PostHogIdentify />
      {children}
    </PHProvider>
  )
}

// Export posthog instance for manual event tracking
export { posthog }
