import type { Metadata } from 'next'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingFooter from '@/app/components/landing/LandingFooter'
import { Heading, Text } from '@/components/ui/typography'
import { PremiumCTA } from '@/app/components/PremiumCTA'

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

const PREMIUM_FEATURES = [
  {
    title: 'Multiple raid teams',
    description:
      'Split your roster into separate raid groups, each with its own schedule, attendance tracking, and loot views. Built for guilds running more than one raid night.',
  },
  {
    title: 'Officer activity feed',
    description:
      'A full audit log of everything that changes in your guild — loot awards, roster moves, setting changes — with who did it and when.',
  },
  {
    title: 'Priority support',
    description:
      'A dedicated supporter role in Discord and first-in-line help when something goes wrong on raid night.',
  },
  {
    title: 'Support development',
    description:
      'LootList+ is built by one person. Premium keeps the servers running and the features coming for every guild, free tier included.',
  },
]

export default function PremiumPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <LandingNav />

      <main className="flex-1">
        <section className="max-w-4xl mx-auto px-6 md:px-12 pt-16 pb-12 text-center">
          <Heading level={1}>LootList+ Premium</Heading>
          <Text color="muted" size="lg" className="mt-4 max-w-2xl mx-auto">
            Everything your guild already uses stays free. Premium adds the tools
            multi-team guilds ask for — for less than one raider&apos;s consumables budget.
          </Text>
          <div className="mt-6 flex items-baseline justify-center gap-2">
            <span className="text-4xl font-bold text-foreground">$39</span>
            <span className="text-muted-foreground">/year per guild</span>
            <span className="text-muted-foreground text-sm ml-2">(or $4.99/month)</span>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 md:px-12 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {PREMIUM_FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-background-elevated border border-border rounded-xl p-6"
              >
                <Heading level={3}>{feature.title}</Heading>
                <Text color="muted" className="mt-2">
                  {feature.description}
                </Text>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-6 md:px-12 pb-20">
          <PremiumCTA />
          <Text color="muted" size="sm" className="mt-6 text-center">
            One subscription covers your whole guild. Cancel anytime — you keep
            Premium until the end of the billing period.
          </Text>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}
