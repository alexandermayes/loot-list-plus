import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import type { Metadata } from 'next'

// Landing sections (all 'use client' — SSR renders initial state, then hydrates)
import LandingNav from '@/app/components/landing/LandingNav'
import LandingHero from '@/app/components/landing/LandingHero'
import LandingFeatures from '@/app/components/landing/LandingFeatures'
import LandingHowItWorks from '@/app/components/landing/LandingHowItWorks'
import LandingAppPreview from '@/app/components/landing/LandingAppPreview'
import LandingValueProps from '@/app/components/landing/LandingValueProps'
import LandingCTA from '@/app/components/landing/LandingCTA'
import LandingFooter from '@/app/components/landing/LandingFooter'
import LandingCompare from '@/app/components/landing/LandingCompare'
import FloatingParticles from '@/app/components/landing/FloatingParticles'

// Login page (client component for Supabase OAuth)
import LoginPage from '@/app/components/LoginPage'

// Hostnames that should show the marketing landing page
const LANDING_PAGE_HOSTS = [
  'getlootlist.com',
  'www.getlootlist.com',
  'localhost',
]

function isLandingHost(host: string): boolean {
  const hostname = host.split(':')[0] // strip port for localhost
  return LANDING_PAGE_HOSTS.includes(hostname)
}

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers()
  const host = headersList.get('host') || ''

  if (isLandingHost(host)) {
    return {
      title: 'LootList+ - Loot Management for WoW Classic Guilds',
      description: 'The ultimate loot management system for World of Warcraft Classic guilds. Track attendance, manage loot priority lists, and streamline raid loot distribution with Discord integration.',
      alternates: {
        canonical: 'https://www.getlootlist.com',
      },
      openGraph: {
        title: 'LootList+ - Loot Management for WoW Classic Guilds',
        description: 'The ultimate loot management system for World of Warcraft Classic guilds. Track attendance, manage priority lists, and streamline loot distribution.',
        url: 'https://www.getlootlist.com',
        siteName: 'LootList+',
        locale: 'en_US',
        type: 'website',
        images: [{
          url: 'https://www.getlootlist.com/og-image.png',
          width: 1200,
          height: 630,
          alt: 'LootList+ - Loot Management for WoW Classic Guilds',
        }],
      },
      twitter: {
        card: 'summary_large_image',
        title: 'LootList+ - Loot Management for WoW Classic Guilds',
        description: 'The ultimate loot management system for World of Warcraft Classic guilds.',
        images: ['https://www.getlootlist.com/og-image.png'],
      },
    }
  }

  // App domain: login page should not be indexed
  return {
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
}

export default async function Home({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const headersList = await headers()
  const host = headersList.get('host') || ''
  const { next, error } = await searchParams

  // Show marketing landing page on getlootlist.com
  if (isLandingHost(host)) {
    return (
      <>
      <link rel="preload" href="/images/landing/dashboard-preview.webp" as="image" type="image/webp" />
      <main className="relative bg-[#080808] overflow-x-hidden">
        <FloatingParticles />
        <LandingNav />
        <LandingHero />
        <LandingAppPreview />
        <LandingFeatures />
        <LandingCompare />
        <LandingHowItWorks />
        <LandingValueProps />
        <LandingCTA />
        <LandingFooter />
      </main>
      </>
    )
  }

  // For app domain: check auth server-side and redirect if logged in
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
