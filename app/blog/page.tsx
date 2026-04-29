import type { Metadata } from 'next'
import Link from 'next/link'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingCTA from '@/app/components/landing/LandingCTA'
import LandingFooter from '@/app/components/landing/LandingFooter'

export const metadata: Metadata = {
  title: 'Blog | LootList+',
  description:
    'Guides and tips for WoW guild management, loot systems, and raid organization.',
  alternates: {
    canonical: 'https://www.getlootlist.com/blog',
  },
  openGraph: {
    title: 'Blog | LootList+',
    description:
      'Guides and tips for WoW guild management, loot systems, and raid organization.',
    url: 'https://www.getlootlist.com/blog',
    type: 'website',
  },
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
      name: 'Blog',
    },
  ],
}

const posts = [
  {
    slug: 'loot-priority-lists-vs-loot-council',
    title: 'Loot Priority Lists vs Loot Council: An Honest Comparison',
    description:
      'Two of the most popular loot systems in WoW, compared honestly. When priority lists win, when council wins, and when you should use both.',
    date: 'April 28, 2026',
    readTime: '9 min read',
    tag: 'Guide',
  },
  {
    slug: 'the-officer-burnout-problem-and-how-to-fix-it',
    title: 'The Officer Burnout Problem (and How to Fix It)',
    description:
      'Guild officers burn out quietly and take the guild down with them. Here\'s why it happens, what accelerates it, and how to build an officer structure that lasts.',
    date: 'April 19, 2026',
    readTime: '8 min read',
    tag: 'Guide',
  },
  {
    slug: 'how-to-onboard-new-raiders-without-killing-morale',
    title: 'How to Onboard New Raiders Without Killing Morale',
    description:
      'New raiders quit in the first two weeks more than at any other point. Here\'s how to run a guild onboarding process that keeps them excited instead of overwhelmed.',
    date: 'April 10, 2026',
    readTime: '8 min read',
    tag: 'Guide',
  },
  {
    slug: 'dkp-is-dead-what-classic-guilds-use-in-2026',
    title: 'DKP Is Dead: What Classic Guilds Use in 2026',
    description:
      'DKP had its time, but Classic guilds in 2026 have moved on. Here\'s what replaced it, why, and what the best guilds are running today.',
    date: 'April 2, 2026',
    readTime: '8 min read',
    tag: 'Guide',
  },
  {
    slug: 'why-attendance-tracking-matters-more-than-loot-rules',
    title: 'Why Attendance Tracking Matters More Than Loot Rules',
    description:
      'Your loot system is only as good as your attendance data. If you\'re spending hours debating DKP vs EPGP but tracking attendance in a spreadsheet that\'s three weeks out of date, you\'re solving the wrong problem.',
    date: 'March 26, 2026',
    readTime: '7 min read',
    tag: 'Guide',
  },
  {
    slug: 'how-to-set-up-a-fair-loot-system-for-your-wow-guild',
    title: 'How to Set Up a Fair Loot System for Your WoW Guild',
    description:
      'Compare DKP, EPGP, Loot Council, Suicide Kings, and more. A practical guide to building a loot system your raiders actually trust.',
    date: 'March 23, 2026',
    readTime: '8 min read',
    tag: 'Guide',
  },
]

export default function BlogIndex() {
  return (
    <main className="bg-background overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #0f0e12 0%, #080808 40%)' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <LandingNav />

      <section className="relative pt-32 pb-20 px-6 md:px-12 lg:px-20">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Blog
          </h1>
          <p className="text-lg text-foreground-secondary mb-12">
            Guides and tips for WoW guild management, loot systems, and raid
            organization.
          </p>

          <div className="space-y-6">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="block group"
              >
                <article className="p-6 rounded-xl border border-border bg-background-elevated hover:border-accent/40 transition-colors">
                  <p className="text-sm font-medium text-accent mb-2">
                    {post.tag}
                  </p>
                  <h2 className="text-xl font-semibold text-foreground group-hover:text-accent transition-colors mb-2">
                    {post.title}
                  </h2>
                  <p className="text-foreground-secondary text-[15px] leading-relaxed mb-4">
                    {post.description}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-foreground-muted">
                    <time>{post.date}</time>
                    <span>·</span>
                    <span>{post.readTime}</span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <LandingCTA />
      <LandingFooter />
    </main>
  )
}
