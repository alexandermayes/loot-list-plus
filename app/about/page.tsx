import type { Metadata } from 'next'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingHero from '@/app/components/landing/LandingHero'
import LandingFeatures from '@/app/components/landing/LandingFeatures'
import LandingHowItWorks from '@/app/components/landing/LandingHowItWorks'
import LandingAppPreview from '@/app/components/landing/LandingAppPreview'
import LandingValueProps from '@/app/components/landing/LandingValueProps'
import LandingCTA from '@/app/components/landing/LandingCTA'
import LandingFooter from '@/app/components/landing/LandingFooter'

export const metadata: Metadata = {
  title: 'About LootList+',
  description: 'LootList+ is a free, transparent loot-management system for World of Warcraft Classic guilds. Raiders submit ranked loot lists, officers track attendance, and the platform calculates item-priority scores to help guilds distribute raid loot fairly.',
  alternates: {
    // /about renders the same marketing landing as the homepage; canonicalize
    // to the homepage so Google consolidates the duplicate instead of splitting
    // authority between two near-identical URLs.
    canonical: 'https://www.getlootlist.com',
  },
}

export default function AboutPage() {
  return (
    <main className="bg-background overflow-x-hidden">
      <LandingNav />
      <LandingHero />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingAppPreview />
      <LandingValueProps />
      <LandingCTA />
      <LandingFooter />
    </main>
  )
}
