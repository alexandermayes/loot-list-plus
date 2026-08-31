import type { Metadata } from 'next'
import Link from 'next/link'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingFooter from '@/app/components/landing/LandingFooter'

const APP_URL = 'https://www.lootlistplus.com'

export const metadata: Metadata = {
  title: 'About LootList+: Built by a World of Warcraft Guild',
  description:
    'LootList+ was built by a World of Warcraft guild to replace fragile loot spreadsheets with ranked lists, attendance, and transparent priority scores.',
  alternates: {
    canonical: 'https://www.getlootlist.com/about',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  '@id': 'https://www.getlootlist.com/about',
  url: 'https://www.getlootlist.com/about',
  name: 'About LootList+',
  mainEntity: { '@id': 'https://www.getlootlist.com/#organization' },
  author: {
    '@type': 'Person',
    '@id': 'https://www.getlootlist.com/about#creator',
    name: 'Zev',
    description:
      'Product designer, guild officer, and raid lead. Creator of LootList+.',
    url: 'https://www.getlootlist.com/about',
  },
}

function Section({ heading, children }: { heading?: string; children: React.ReactNode }) {
  return (
    <section className="mb-12">
      {heading && (
        <h2 className="font-poppins font-bold text-[24px] md:text-[28px] text-white mb-4">{heading}</h2>
      )}
      {children}
    </section>
  )
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="font-poppins text-[15px] text-[#bababa] leading-relaxed mb-4">{children}</p>
}

export default function AboutPage() {
  return (
    <main className="relative bg-[#080808] overflow-x-hidden min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingNav />

      <article className="max-w-3xl mx-auto px-6 md:px-12 pt-16 md:pt-24 pb-20">
        <header className="mb-12">
          <h1 className="font-poppins font-bold text-[32px] md:text-[44px] leading-[1.1] text-white">
            Built by a raid team that was tired of running loot from a spreadsheet.
          </h1>
        </header>

        <Section>
          <Body>
            LootList+ started inside Big Yikes after years of running DFT-style loot lists
            through spreadsheets, Discord channels, and addon exports. The underlying idea
            worked: raiders told us what they wanted, attendance mattered, and everyone could
            understand the rules. The administration was the problem.
          </Body>
          <Body>
            One broken formula, one stale attendance tab, or one officer stepping away could
            make the entire system feel unreliable. LootList+ keeps the fairness of ranked
            lists and replaces the fragile parts with a product the whole guild can inspect.
          </Body>
        </Section>

        <Section heading="What LootList+ does">
          <Body>
            Raiders submit ranked loot lists. Officers track attendance and configure the
            rules their guild actually uses. LootList+ combines those inputs into an
            item-specific Loot Score, so every drop has a visible priority order and every
            score can be explained.
          </Body>
          <Body>
            It supports Classic Era, The Burning Crusade, Wrath of the Lich King, Cataclysm,
            and Mists of Pandaria, with Discord, Warcraft Logs, Battle.net, WowSims, and
            in-game distribution workflows.
          </Body>
        </Section>

        <Section heading="What we believe">
          <ul className="space-y-3">
            {[
              'Raiders should have agency over the items they care about.',
              'Attendance should matter in a way everyone can verify.',
              'Officers should keep judgment without relying on private math.',
              'A loot system should reduce drama and administration, not create more of both.',
              'Comparisons should be honest. If another system fits a guild better, we will say so.',
            ].map((belief) => (
              <li key={belief} className="flex items-start gap-3 font-poppins text-[15px] text-[#bababa] leading-relaxed">
                <span className="text-[#9940ec] shrink-0 mt-0.5">✦</span>
                {belief}
              </li>
            ))}
          </ul>
        </Section>

        <Section heading="Who built it">
          <Body>
            LootList+ was created by Zev, a product designer, guild officer, and raid lead
            who spent six years using and maintaining loot-list systems in active WoW guilds.
            It is developed in public view through its{' '}
            <Link href="/changelog" className="text-white underline hover:text-[#9940ec] transition-colors">changelog</Link>,
            community feedback, and{' '}
            <a href="https://github.com/alexandermayes/loot-list-plus" className="text-white underline hover:text-[#9940ec] transition-colors">GitHub repository</a>,
            and it continues to run real raid nights.
          </Body>
        </Section>

        <Section heading="Free core plan, optional Premium">
          <Body>
            Core LootList+ features are free. Premium is for guilds that run multiple raid
            teams, host reserve runs, or need a complete officer activity feed. One subscription covers the whole
            guild for $4.99 per month or $39 per year. See the full breakdown on the{' '}
            <Link href="/pricing" className="text-white underline hover:text-[#9940ec] transition-colors">pricing page</Link>.
          </Body>
        </Section>

        <section className="mt-16 text-center bg-[#0c0b0e] border border-[#383838] rounded-[20px] p-10">
          <h2 className="font-poppins font-bold text-[24px] md:text-[28px] text-white mb-3">
            Try it with your own roster.
          </h2>
          <p className="font-poppins text-[15px] text-[#bababa] leading-relaxed mb-6 max-w-md mx-auto">
            Create a guild, configure the rules, and see what the priority order looks like
            with real data.
          </p>
          <a
            href={APP_URL}
            className="inline-flex items-center justify-center px-5 py-3 rounded-[60px] bg-white font-poppins font-semibold text-[16px] text-black no-underline hover:bg-white/90 transition-colors"
          >
            Create your guild free
          </a>
        </section>
      </article>

      <LandingFooter />
    </main>
  )
}
