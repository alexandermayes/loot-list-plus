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
  description: 'Learn about LootList+, the loot management system built for WoW Classic guilds. Fair loot distribution, attendance tracking, and Discord integration.',
  alternates: {
    canonical: 'https://www.getlootlist.com/about',
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
