import type { Metadata } from 'next'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingCTA from '@/app/components/landing/LandingCTA'
import LandingFooter from '@/app/components/landing/LandingFooter'
import BlogRelatedPosts from '@/app/components/landing/BlogRelatedPosts'
import BlogTracker from '@/app/components/landing/BlogTracker'

export const metadata: Metadata = {
  title:
    'Why Attendance Tracking Matters More Than Loot Rules',
  description:
    'Your loot system is only as good as your attendance data. Learn why tracking attendance consistently is the single most important thing a WoW guild can do for fair loot.',
  keywords: [
    'wow attendance tracking',
    'wow raid attendance',
    'wow guild attendance',
    'wow classic raid tracking',
    'wow loot fairness',
    'wow guild management',
    'raid attendance system',
    'wow dkp attendance',
  ],
  alternates: {
    canonical:
      'https://www.getlootlist.com/blog/why-attendance-tracking-matters-more-than-loot-rules',
  },
  openGraph: {
    title: 'Why Attendance Tracking Matters More Than Loot Rules',
    description:
      'Your loot system is only as good as your attendance data. Here\'s why attendance is the foundation of fair loot.',
    type: 'article',
    publishedTime: '2026-03-26T00:00:00Z',
    authors: ['LootList+'],
    url: 'https://www.getlootlist.com/blog/why-attendance-tracking-matters-more-than-loot-rules',
  },
}

const APP_URL = 'https://www.lootlistplus.com'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Why Attendance Tracking Matters More Than Loot Rules',
  description:
    'Your loot system is only as good as your attendance data. Learn why tracking attendance consistently is the single most important thing a WoW guild can do for fair loot.',
  datePublished: '2026-03-26T00:00:00Z',
  dateModified: '2026-03-26T00:00:00Z',
  author: {
    '@type': 'Organization',
    name: 'LootList+',
    url: 'https://www.getlootlist.com',
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
    '@id':
      'https://www.getlootlist.com/blog/why-attendance-tracking-matters-more-than-loot-rules',
  },
  wordCount: 1500,
  articleSection: 'Guild Management',
  keywords: [
    'wow attendance tracking',
    'wow raid attendance',
    'wow guild attendance',
    'wow classic raid tracking',
    'wow loot fairness',
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
      name: 'Blog',
      item: 'https://www.getlootlist.com/blog',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Why Attendance Tracking Matters More Than Loot Rules',
    },
  ],
}

export default function BlogPost() {
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

      {/* Article */}
      <article className="relative pt-32 pb-20 px-6 md:px-12 lg:px-20">
        <BlogTracker slug="why-attendance-tracking-matters-more-than-loot-rules" title="Why Attendance Tracking Matters More Than Loot Rules" />
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm text-foreground-secondary">
            <a
              href="/blog"
              className="hover:text-foreground transition-colors"
            >
              Blog
            </a>
            <span className="mx-2 text-foreground-muted">/</span>
            <span className="text-foreground-muted">Attendance Tracking</span>
          </nav>

          {/* Header */}
          <header className="mb-12">
            <p className="text-sm font-medium text-accent mb-3">Guide</p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4">
              Why Attendance Tracking Matters More Than Loot Rules
            </h1>
            <p className="text-lg text-foreground-secondary leading-relaxed">
              Your loot system is only as good as your attendance data. If
              you&apos;re spending hours debating DKP vs EPGP but tracking
              attendance in a spreadsheet that&apos;s three weeks out of date,
              you&apos;re solving the wrong problem.
            </p>
            <div className="flex items-center gap-4 mt-6 text-sm text-foreground-muted">
              <time dateTime="2026-03-26">March 26, 2026</time>
              <span>&middot;</span>
              <span>7 min read</span>
            </div>
          </header>

          {/* Content */}
          <div className="prose prose-invert prose-lg max-w-none [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:text-foreground-secondary [&_p]:leading-relaxed [&_p]:mb-4 [&_li]:text-foreground-secondary [&_li]:leading-relaxed [&_ul]:mb-4 [&_ol]:mb-4 [&_strong]:text-foreground [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent/80">
            <p>
              Guild leaders love to debate loot systems. DKP vs EPGP vs Loot
              Council vs whatever hybrid someone cooked up on their server&apos;s
              Discord. But after running guilds across multiple expansions, I can
              tell you the single biggest factor in whether your loot system
              feels fair has nothing to do with the system itself.
            </p>
            <p>
              It&apos;s whether you track attendance consistently.
            </p>

            <h2>The Attendance Gap</h2>
            <p>
              Here&apos;s a scenario every guild leader has seen. Two raiders
              want the same weapon. Raider A has been at every raid for two
              months straight. Raider B shows up maybe half the time, sometimes
              late, sometimes leaves early. Under pure loot council, the
              officers probably give it to Raider A. Under DKP, it depends on
              who hoarded more points. Under rolls, it&apos;s a coin flip.
            </p>
            <p>
              But here&apos;s the thing: in most guilds, when Raider B
              complains, nobody can actually prove that Raider A attended more.
              The attendance data is incomplete, outdated, or just doesn&apos;t
              exist. And without that data, every loot decision becomes a
              judgment call that someone will feel was unfair.
            </p>
            <p>
              Attendance is the one metric that nearly every raider agrees
              should matter. The person who shows up every week should have an
              edge over the person who doesn&apos;t. But if you can&apos;t
              prove it with numbers, you can&apos;t act on it.
            </p>

            <h2>Why Most Guilds Fail at Tracking</h2>
            <p>
              It&apos;s not that guilds don&apos;t try. Most start with
              something: a Google Sheet, a Discord bot, a hastily written note
              after raid. The problem is consistency. Attendance tracking has to
              happen every single raid night, without exception, or the data
              becomes unreliable.
            </p>
            <p>
              Here&apos;s how it usually falls apart:
            </p>
            <ul>
              <li>
                <strong>One person owns it.</strong> The officer who tracks
                attendance takes a break, gets burnt out, or forgets one week.
                Suddenly there&apos;s a gap in the data that nobody fills.
              </li>
              <li>
                <strong>Edge cases pile up.</strong> Someone joined 20 minutes
                late. Someone had to leave after the 5th boss. Someone was
                online but got benched because comp was full. How do you count
                those? Most guilds don&apos;t have rules, so they wing it.
              </li>
              <li>
                <strong>The spreadsheet gets stale.</strong> Three weeks go by
                without an update. Now you&apos;re guessing based on memory,
                which is exactly what attendance tracking was supposed to
                replace.
              </li>
              <li>
                <strong>Nobody can verify the numbers.</strong> Even when
                attendance is tracked, it&apos;s often locked in an officer-only
                sheet. Raiders can&apos;t check their own record, which defeats
                the purpose of transparent loot.
              </li>
            </ul>

            <h2>What Good Attendance Tracking Looks Like</h2>
            <p>
              Good attendance tracking isn&apos;t complicated. It just needs to
              be consistent, complete, and visible.
            </p>

            <h3>1. Every raid, no exceptions</h3>
            <p>
              If a raid happened, attendance gets recorded. Not &quot;when we
              remember&quot; or &quot;for progression nights only.&quot; Every
              farm night, every alt run that counts toward loot. If it affects
              standings, it gets tracked.
            </p>

            <h3>2. Handle the gray areas upfront</h3>
            <p>
              Decide your rules before they come up. Does a late join get full
              credit? Half credit? Is a benched player counted as present? What
              about excused absences? These decisions are less important than
              the fact that you made them in advance and apply them the same way
              every time.
            </p>

            <h3>3. Make it visible to everyone</h3>
            <p>
              Raiders should be able to see their own attendance record and
              everyone else&apos;s. This does two things: it lets people verify
              the data is correct, and it creates social accountability. When
              everyone can see who shows up and who doesn&apos;t, attendance
              tends to improve on its own.
            </p>

            <h3>4. Connect it to loot priority</h3>
            <p>
              Attendance data that doesn&apos;t affect anything is just
              bookkeeping. For it to matter, it needs to feed directly into your
              loot system. Higher attendance should measurably improve your
              position, and that improvement should be visible before loot
              drops, not justified after the fact.
            </p>

            <h2>Attendance and the Loot Score</h2>
            <p>
              This is the core idea behind how{' '}
              <a href={APP_URL}>LootList+</a> handles loot priority. Your Loot
              Score is a combination of where an item falls on your ranked list,
              your attendance points, and any modifiers (trial penalty, officer
              bonus, etc.). Attendance isn&apos;t a tiebreaker. It&apos;s a
              major component of the score.
            </p>
            <p>
              What this means in practice: two raiders want the same item. One
              has it ranked #3 on their list, the other has it ranked #1. But
              the first raider has near-perfect attendance while the second has
              missed a third of the raids. The Loot Score balances these factors
              automatically. Everyone can see the math. No arguments, no
              judgment calls.
            </p>
            <p>
              LootList+ tracks attendance per raid with support for:
            </p>
            <ul>
              <li>
                <strong>Late joins and early leaves</strong>, with configurable
                point values
              </li>
              <li>
                <strong>Benched players</strong> who were online and available
                but sat out for comp
              </li>
              <li>
                <strong>Excused absences</strong> that don&apos;t penalize
                raiders for real life
              </li>
              <li>
                <strong>Automatic score recalculation</strong> when attendance
                is updated, so the priority order is always current
              </li>
            </ul>
            <p>
              The attendance data feeds directly into each raider&apos;s Loot
              Score, which is visible to everyone in the guild. When an item
              drops, the priority order is already settled. No spreadsheets, no
              debates.
            </p>

            <h2>The Compounding Effect</h2>
            <p>
              Here&apos;s what guilds discover after a month or two of
              consistent attendance tracking: the loot arguments mostly stop.
              Not because people stop wanting the same items, but because the
              answer to &quot;why did they get it over me?&quot; is always
              available and always verifiable.
            </p>
            <p>
              Attendance tracking also has a secondary effect that guild leaders
              underestimate: it improves attendance. When raiders know their
              attendance directly affects their loot priority, and they can see
              the number, they show up more consistently. No nagging in Discord
              required.
            </p>
            <p>
              And when attendance improves, progression improves. You&apos;re
              not subbing in undergeared pugs. You&apos;re not adjusting strats
              for a different comp every week. Your core team is there, they
              know the fights, and they know the system rewards them for it.
            </p>

            <h2>Getting Started</h2>
            <p>
              If your guild isn&apos;t tracking attendance consistently today,
              start simple:
            </p>
            <ol>
              <li>
                <strong>Pick one method and stick with it.</strong> Doesn&apos;t
                matter if it&apos;s a spreadsheet, a bot, or a dedicated tool.
                What matters is doing it every raid.
              </li>
              <li>
                <strong>Define your edge cases now.</strong> Late, benched,
                excused. Write it down, post it in your guild Discord, and apply
                it the same way every time.
              </li>
              <li>
                <strong>Make the data public.</strong> If your raiders
                can&apos;t see their own attendance, they have no reason to
                trust that it&apos;s accurate.
              </li>
              <li>
                <strong>Tie it to loot.</strong> Attendance that doesn&apos;t
                affect anything is just a number. Make it count.
              </li>
            </ol>
            <p>
              If you want to skip the spreadsheet entirely,{' '}
              <a href={APP_URL}>LootList+</a> handles attendance tracking,
              score calculation, and loot priority in one place. Set it up
              before your next raid night and let the data speak for itself.
            </p>
            <p>
              The best loot system in the world fails without good attendance
              data. Fix attendance first. The rest gets easier.
            </p>
          </div>
        </div>
      </article>

      <BlogRelatedPosts currentSlug="why-attendance-tracking-matters-more-than-loot-rules" />
      <LandingCTA />
      <LandingFooter />
    </main>
  )
}
