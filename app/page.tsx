import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import type { Metadata } from 'next'

// Login page (client component for Supabase OAuth)
import LoginPage from '@/app/components/LoginPage'

export const metadata: Metadata = {
  title: 'LootList+ \u2219 Sign up',
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

  // Check auth server-side and redirect if logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is logged in and there's an invite code, show the login page with modal
  // Otherwise redirect to overview as normal
  const hasInviteCode = next?.includes('code=')
  if (user && !hasInviteCode) {
    redirect('/overview')
  }

  // Show login page for unauthenticated users on app domain
  // Pass next param as prop to avoid useSearchParams + Suspense flicker
  return <LoginPage nextParam={next || null} isAuthenticated={!!user} authError={error || null} />
}
