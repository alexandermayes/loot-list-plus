import type { Metadata } from 'next'
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

export const metadata: Metadata = {
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

export default function LandingPage() {
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
