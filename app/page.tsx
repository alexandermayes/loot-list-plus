import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import type { Metadata } from 'next'

// Login page (client component for Supabase OAuth)
import LoginPage from '@/app/components/LoginPage'

export const metadata: Metadata = {
  title: 'Sign up \u2219 LootList+',
  description: 'Sign in to LootList+ with Discord to manage your guild\'s loot.',
  alternates: {
    canonical: 'https://lootlistplus.com',
  },
  robots: {
    index: false,
    follow: true,
  },
}

export default async function Home({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams

  // Only check auth if cookies suggest a session exists.
  // This saves 200-500ms TTFB for unauthenticated visitors (the majority).
  const cookieStore = await cookies()
  const hasAuthCookie = cookieStore.getAll().some(c => /^sb-.*-auth-token/.test(c.name))

  let user = null
  if (hasAuthCookie) {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    user = authUser

    // If user is logged in and there's no invite code, redirect to overview
    const hasInviteCode = next?.includes('code=')
    if (user && !hasInviteCode) {
      redirect('/overview')
    }
  }

  // Show login page for unauthenticated users on app domain
  // Pass next param as prop to avoid useSearchParams + Suspense flicker
  return <LoginPage nextParam={next || null} isAuthenticated={!!user} authError={error || null} />
}
