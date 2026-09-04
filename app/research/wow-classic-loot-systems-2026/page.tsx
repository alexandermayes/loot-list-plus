import type { Metadata } from 'next'
import Link from 'next/link'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingCTA from '@/app/components/landing/LandingCTA'
import LandingFooter from '@/app/components/landing/LandingFooter'
import BlogTracker from '@/app/components/landing/BlogTracker'
import aggregates from '@/public/research/wow-classic-loot-systems-2026-aggregates.json'

const META_DESCRIPTION =
  'An anonymized look at how WoW Classic guilds use ranked lists, attendance, bad-luck protection, and officer judgment to distribute raid loot.'

// The build-time JSON import above is the D-05 mechanism: this page can
// never state a number the committed query in
// scripts/analytics/queries/wow-classic-loot-systems-2026/ did not
// actually produce, because there is no request-time fetch anywhere on
// this page.
const HEADLINE = `How WoW Classic Guilds Actually Run Loot in 2026: Data from ${aggregates.sample.active_guilds.toLocaleString('en-US')} Guilds`

export const metadata: Metadata = {
  title: HEADLINE,
  description: META_DESCRIPTION,
  keywords: [
    'wow classic loot data',
    'wow classic guild statistics',
    'wow classic loot systems',
    'wow classic raid attendance',
    'wow classic bad luck protection',
  ],
  alternates: {
    canonical: 'https://www.getlootlist.com/research/wow-classic-loot-systems-2026',
  },
  openGraph: {
    title: HEADLINE,
    description: META_DESCRIPTION,
    type: 'article',
    publishedTime: '2026-09-04T00:00:00Z',
    authors: ['LootList+'],
    url: 'https://www.getlootlist.com/research/wow-classic-loot-systems-2026',
  },
  // Publication gate, not a page setting: main auto-deploys to production
  // about 12 seconds after merge, and the visible copy on this page is
  // still a draft until the plan 03-03 copy sign-off gate clears. Plan
  // 03-05 removes this directive and adds the sitemap entry in the same
  // commit.
  robots: {
    index: false,
    follow: false,
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: HEADLINE,
  description: META_DESCRIPTION,
  datePublished: '2026-09-04T00:00:00Z',
  dateModified: '2026-09-04T00:00:00Z',
  author: {
    '@type': 'Person',
    '@id': 'https://www.getlootlist.com/about#creator',
    name: 'Zev',
    description: 'Creator of LootList+ and guild officer and raid lead',
    url: 'https://www.getlootlist.com/about',
  },
  publisher: {
    '@type': 'Organization',
    name: 'LootList+',
    url: 'https://www.getlootlist.com',
    logo: {
      '@type': 'ImageObject',
      url: 'https://www.getlootlist.com/lootlist-icon.svg',
    },
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': 'https://www.getlootlist.com/research/wow-classic-loot-systems-2026',
  },
  articleSection: 'Guild Management',
  keywords: [
    'wow classic loot data',
    'wow classic guild statistics',
    'wow classic loot systems',
  ],
}

const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://www.getlootlist.com',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: HEADLINE,
    },
  ],
}

function formatWindowDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function ResearchReportPage() {
  const windowStart = formatWindowDate(aggregates.window.start)
  const windowEnd = formatWindowDate(aggregates.window.end)

  return (
    <main className="bg-background overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #0f0e12 0%, #080808 40%)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <LandingNav />

      <article className="relative pt-32 pb-20 px-6 md:px-12 lg:px-20">
        <BlogTracker slug="wow-classic-loot-systems-2026" title={HEADLINE} />
        <div className="max-w-3xl mx-auto">
          <nav className="mb-8 text-sm text-foreground-secondary">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <span className="mx-2 text-foreground-muted">/</span>
            <span className="text-foreground-muted">Research</span>
          </nav>

          <header className="mb-12">
            <p className="text-lg text-accent mb-3">Research</p>
            <h1 className="text-4xl font-bold text-foreground leading-tight mb-4">
              {HEADLINE}
            </h1>
            <p className="text-lg text-foreground-secondary leading-relaxed">
              {META_DESCRIPTION}
            </p>
            <div className="flex items-center gap-4 mt-6 text-sm text-foreground-muted">
              <span>
                By{' '}
                <a
                  href="/about"
                  className="text-foreground-secondary hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  Zev
                </a>
                , creator of LootList+
              </span>
              <span>&middot;</span>
              <time dateTime="2026-09-04">September 4, 2026</time>
              <span>&middot;</span>
              <span>4 min read</span>
            </div>
          </header>

          <div className="prose prose-invert prose-lg max-w-none [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:text-foreground-secondary [&_p]:leading-relaxed [&_p]:mb-4 [&_li]:text-foreground-secondary [&_li]:leading-relaxed [&_ul]:mb-4 [&_ol]:mb-4 [&_strong]:text-foreground [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent/80">
            <p>
              Between {windowStart} and {windowEnd}, {aggregates.sample.active_guilds.toLocaleString('en-US')} active
              guilds used LootList+ to manage {aggregates.sample.raid_events.toLocaleString('en-US')} raid events
              and {aggregates.sample.loot_awards.toLocaleString('en-US')} loot awards across{' '}
              {aggregates.sample.raiders_with_approved_lists.toLocaleString('en-US')} raiders with approved lists.
              We analyzed aggregated, anonymized activity to see how Classic guilds balance wishlist rank,
              attendance, bad-luck protection, and officer judgment. No player or guild names are included in the
              dataset.
            </p>
            <p>
              This is product usage data, not a survey of every WoW guild. It shows how guilds using a transparent,
              list-based system behave in practice.
            </p>
          </div>
        </div>
      </article>

      <LandingCTA />
      <LandingFooter />
    </main>
  )
}
