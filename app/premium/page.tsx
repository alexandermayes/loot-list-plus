import type { Metadata } from 'next'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingFooter from '@/app/components/landing/LandingFooter'
import FloatingParticles from '@/app/components/landing/FloatingParticles'
import PremiumHero from '@/app/components/landing/PremiumHero'
import PremiumFeatures from '@/app/components/landing/PremiumFeatures'
import PremiumPricing from '@/app/components/landing/PremiumPricing'

export const metadata: Metadata = {
  title: 'LootList+ Premium — Raid Teams & Activity Feed',
  description:
    'Upgrade your guild to LootList+ Premium: run multiple raid teams with separate schedules and attendance, get a full officer activity feed, and support development.',
  alternates: {
    canonical: 'https://www.getlootlist.com/premium',
  },
  openGraph: {
    title: 'LootList+ Premium',
    description:
      'Multiple raid teams, officer activity feed, and priority support — $4.99/month or $39/year per guild.',
    type: 'website',
    url: 'https://www.getlootlist.com/premium',
  },
}

export default function PremiumPage() {
  return (
    <main className="relative bg-[#080808] overflow-x-hidden min-h-screen">
      <FloatingParticles />
      <LandingNav />
      <PremiumHero />
      <PremiumFeatures />
      <PremiumPricing />
      <LandingFooter />
    </main>
  )
}
