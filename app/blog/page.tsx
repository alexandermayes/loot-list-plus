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
}

const posts = [
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
    <main className="bg-background overflow-x-hidden">
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
