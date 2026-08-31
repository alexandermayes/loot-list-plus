import type { Metadata } from 'next'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingHero from '@/app/components/landing/LandingHero'
import LandingBelowFold from '@/app/components/landing/LandingBelowFold'
import FloatingParticles from '@/app/components/landing/FloatingParticles'
import { updates } from '@/lib/updates-data'

function getRecentFeatures(): string {
  const features: string[] = []
  for (const entry of updates) {
    for (const item of entry.items) {
      if (item.category === 'feature') {
        features.push(item.title.replace(/^New blog post: /, ''))
        if (features.length >= 3) return `${features[0]}, ${features[1]}, and more`
      }
    }
  }
  if (features.length === 0) return 'See what\'s new'
  return features.join(', ')
}

export const metadata: Metadata = {
  title: 'Loot Lists, Attendance & Loot Score Tracking | LootList+',
  description: 'Rank loot lists, track attendance, and calculate transparent item priority for your World of Warcraft guild. Create your guild free with Discord.',
  alternates: {
    canonical: 'https://www.getlootlist.com',
  },
  openGraph: {
    title: 'LootList+ - Loot Management for World of Warcraft Guilds',
    description: 'LootList+ is a transparent loot management system for World of Warcraft guilds. Track attendance, manage priority lists, and streamline loot distribution.',
    url: 'https://www.getlootlist.com',
    siteName: 'LootList+',
    locale: 'en_US',
    type: 'website',
    images: [{
      url: 'https://www.getlootlist.com/og-image.jpg',
      width: 2400,
      height: 1264,
      alt: 'LootList+ - Loot Management for World of Warcraft Guilds',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LootList+ - Loot Management for World of Warcraft Guilds',
    description: 'A transparent loot management system for World of Warcraft guilds.',
    images: ['https://www.getlootlist.com/og-image.jpg'],
  },
}

export default function LandingPage() {
  return (
    <>
      <main className="relative bg-[#080808] overflow-x-hidden">
        <FloatingParticles />
        <LandingNav />
        <LandingHero recentFeatures={getRecentFeatures()} />
        <LandingBelowFold />
      </main>
    </>
  )
}
