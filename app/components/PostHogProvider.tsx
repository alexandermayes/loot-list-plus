'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, Suspense, ReactNode } from 'react'
import { createClient } from '@/utils/supabase/client'

// Initialize PostHog once
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  try {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      // Use reverse proxy to bypass ad blockers
      api_host: '/a',
      ui_host: 'https://us.i.posthog.com',
      person_profiles: 'identified_only',
      capture_pageview: false, // We manually capture pageviews
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
      bootstrap: {
        featureFlags: {},
      },
      // Start with recording disabled to prevent adblocker-induced flicker.
      // Enable after confirming the recorder script can load.
      disable_session_recording: true,
      loaded: (ph) => {
        // Test if the recorder script is accessible (not blocked by adblocker)
        fetch('/a/static/recorder.js?v=check', { method: 'HEAD' })
          .then((res) => {
            if (res.ok) (ph as any).set_config({ disable_session_recording: false })
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

// User identification component
function PostHogIdentify() {
  const posthog = usePostHog()
  const supabase = createClient()

  useEffect(() => {
    const identifyUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (user && posthog) {
        // Get user preferences for additional context
        const { data: prefs } = await supabase
          .from('user_preferences')
          .select('preferred_display_name, discord_id')
          .eq('user_id', user.id)
          .single()

        posthog.identify(user.id, {
          email: user.email,
          discord_id: prefs?.discord_id,
          display_name: prefs?.preferred_display_name,
          created_at: user.created_at,
        })
      }
    }

    identifyUser()

    // Re-identify on auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string, session: { user?: { id: string } } | null) => {
      if (event === 'SIGNED_IN' && session?.user) {
        identifyUser()
      } else if (event === 'SIGNED_OUT') {
        posthog?.reset()
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
