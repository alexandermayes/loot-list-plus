import type { Metadata } from 'next'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingCTA from '@/app/components/landing/LandingCTA'
import LandingFooter from '@/app/components/landing/LandingFooter'
import BlogRelatedPosts from '@/app/components/landing/BlogRelatedPosts'
import BlogTracker from '@/app/components/landing/BlogTracker'

export const metadata: Metadata = {
  title:
    'DKP Is Dead: What Classic Guilds Use in 2026 | LootList+',
  description:
    'DKP had its time, but Classic guilds in 2026 have moved on. Here\'s what replaced it, why, and what the best guilds are running today.',
  keywords: [
    'wow dkp',
    'dkp alternative',
    'wow classic loot system 2026',
    'wow classic loot council',
    'epgp vs dkp',
    'wow loot priority list',
    'wow guild loot system',
    'wow classic guild management',
    'loot list wow',
    'best wow loot system',
  ],
  alternates: {
    canonical:
      'https://www.getlootlist.com/blog/dkp-is-dead-what-classic-guilds-use-in-2026',
  },
  openGraph: {
    title: 'DKP Is Dead: What Classic Guilds Use in 2026',
    description:
      'DKP had its time, but Classic guilds in 2026 have moved on. Here\'s what replaced it and what the best guilds are running today.',
    type: 'article',
    publishedTime: '2026-04-02T00:00:00Z',
    authors: ['LootList+'],
    url: 'https://www.getlootlist.com/blog/dkp-is-dead-what-classic-guilds-use-in-2026',
  },
}

const APP_URL = 'https://www.lootlistplus.com'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'DKP Is Dead: What Classic Guilds Use in 2026',
  description:
    'DKP had its time, but Classic guilds in 2026 have moved on. Here\'s what replaced it, why, and what the best guilds are running today.',
  datePublished: '2026-04-02T00:00:00Z',
  dateModified: '2026-04-02T00:00:00Z',
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
      'https://www.getlootlist.com/blog/dkp-is-dead-what-classic-guilds-use-in-2026',
  },
  wordCount: 1800,
  articleSection: 'Guild Management',
  keywords: [
    'wow dkp',
    'dkp alternative',
    'wow classic loot system',
    'wow loot priority list',
    'wow guild loot system',
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
      name: 'DKP Is Dead: What Classic Guilds Use in 2026',
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
        <BlogTracker slug="dkp-is-dead-what-classic-guilds-use-in-2026" title="DKP Is Dead: What Classic Guilds Use in 2026" />
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
            <span className="text-foreground-muted">Loot Systems</span>
          </nav>

          {/* Header */}
          <header className="mb-12">
            <p className="text-sm font-medium text-accent mb-3">Guide</p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4">
              DKP Is Dead: What Classic Guilds Use in 2026
            </h1>
            <p className="text-lg text-foreground-secondary leading-relaxed">
              DKP had a good run. It carried guilds through Molten Core, Black
              Temple, and every expansion in between. But Classic guilds in 2026
              have largely moved on, and for good reason.
            </p>
            <div className="flex items-center gap-4 mt-6 text-sm text-foreground-muted">
              <time dateTime="2026-04-02">April 2, 2026</time>
              <span>&middot;</span>
              <span>8 min read</span>
            </div>
          </header>

          {/* Content */}
          <div className="prose prose-invert prose-lg max-w-none [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:text-foreground-secondary [&_p]:leading-relaxed [&_p]:mb-4 [&_li]:text-foreground-secondary [&_li]:leading-relaxed [&_ul]:mb-4 [&_ol]:mb-4 [&_strong]:text-foreground [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent/80">
            <p>
              If you&apos;re starting a Classic guild today and your first
              instinct is to set up DKP, pause. Not because DKP is a bad idea
              in theory, but because the problems it was designed to solve have
              better solutions now. And the problems DKP creates? Those
              haven&apos;t gone away.
            </p>

            <h2>What DKP Got Right</h2>
            <p>
              Credit where it&apos;s due. DKP solved a real problem when it was
              invented: it gave guilds a way to reward consistent raiders over
              casual ones. Show up, earn points. Spend points on loot. Simple,
              transparent, and better than anything that came before it.
            </p>
            <p>
              The core insight was correct: attendance and commitment should
              translate into loot priority. A raider who shows up every Tuesday
              and Thursday for two months has earned something that a raider who
              appears for farm night shouldn&apos;t be able to roll over.
            </p>
            <p>
              DKP turned that into math, and math feels fair. At least at first.
            </p>

            <h2>Where DKP Falls Apart</h2>
            <p>
              The longer a guild runs DKP, the more its flaws start to show. And
              by 2026, Classic guilds have seen these patterns play out enough
              times to know they&apos;re not edge cases. They&apos;re built into
              the system.
            </p>

            <h3>Hoarding</h3>
            <p>
              The rational DKP strategy is to spend as little as possible.
              Raiders sit on their points for weeks or months waiting for their
              one bis item, letting upgrades rot or go to offspecs. This is
              objectively bad for your raid&apos;s progression, but the system
              incentivizes it.
            </p>

            <h3>Inflation</h3>
            <p>
              Points accumulate faster than they drain. Veterans amass pools of
              DKP that new recruits can never catch up to. Some guilds do
              periodic resets or decay systems, but those create their own set of
              complaints. You&apos;re patching the symptom, not the cause.
            </p>

            <h3>The knowledge gap</h3>
            <p>
              Newer raiders don&apos;t always know what to spend on. They burn
              DKP on marginal upgrades while a veteran waits and snipes the
              trophy item. The system punishes inexperience, which is a rough
              look when you&apos;re trying to build your roster.
            </p>

            <h3>Management overhead</h3>
            <p>
              Someone has to track all of this. Every raid, every loot event,
              every point adjustment. DKP bots and addons help, but they break,
              they lose data, and they still require an officer to babysit.
              That&apos;s time officers could spend on, you know, actually
              leading the raid.
            </p>

            <h2>What Replaced DKP</h2>
            <p>
              There isn&apos;t one system that universally replaced DKP. What
              happened instead is that guilds realized they had a spectrum of
              options, each trading off transparency against flexibility. Here
              are the main ones Classic guilds are running in 2026.
            </p>

            <h3>Loot Council</h3>
            <p>
              The most popular system in competitive guilds. A panel of officers
              decides who gets each item based on performance, attendance, and
              upgrade value. It&apos;s flexible and generally produces good loot
              distribution.
            </p>
            <p>
              The downside: it&apos;s only as good as your officers. Bias creeps
              in, even unintentionally. And the lack of transparency breeds
              suspicion. &quot;Why did the GM&apos;s friend get the weapon over
              me?&quot; is a question that kills guilds, whether or not the
              answer is legitimate.
            </p>

            <h3>EPGP</h3>
            <p>
              Effort Points / Gear Points. A refinement of DKP that factors in
              what you&apos;ve received, not just what you&apos;ve earned. Your
              priority is your EP divided by your GP, so spending on loot
              actually costs you priority. It fixes the hoarding problem
              elegantly.
            </p>
            <p>
              EPGP is better than DKP in most ways, but it still suffers from
              the management burden and the inflation problem (just slower). And
              the ratio math confuses some raiders, which works against the
              transparency that point systems are supposed to provide.
            </p>

            <h3>Soft Reserve</h3>
            <p>
              Each raider picks 1-2 items they want per raid. If the item drops,
              only reservers can roll on it. Simple, low overhead, and popular
              for pugs and casual guilds.
            </p>
            <p>
              For serious progression, soft reserve falls short. It
              doesn&apos;t reward attendance, doesn&apos;t consider upgrade
              value, and gives the same chance to someone who shows up once a
              month as someone who&apos;s been there every week.
            </p>

            <h3>Priority lists (ranked loot lists)</h3>
            <p>
              The approach that&apos;s been gaining the most traction. Each
              raider submits a ranked list of the items they want, before the
              raid. When an item drops, the raider who ranked it highest on
              their list, weighted by attendance and other factors, gets it.
            </p>
            <p>
              This solves most of DKP&apos;s problems at once. There&apos;s no
              hoarding because you declare your priorities in advance. No
              inflation because there are no points to accumulate. No knowledge
              gap because every raider has to think about what they actually need
              before the first pull. And the priority order is visible to
              everyone, so there&apos;s no &quot;why did they get it&quot;
              arguments.
            </p>

            <h2>Why Priority Lists Are Winning</h2>
            <p>
              The shift toward priority lists tracks with a broader change in how
              Classic guilds operate in 2026. Rosters are smaller, expectations
              are higher, and raiders have less patience for systems that feel
              opaque or gameable.
            </p>
            <p>
              Priority lists work because they align incentives correctly:
            </p>
            <ul>
              <li>
                <strong>Raiders think about gear before raid night.</strong> This
                means fewer impulse rolls, fewer &quot;wait, that&apos;s
                actually bis for me&quot; moments, and faster loot distribution
                during the raid.
              </li>
              <li>
                <strong>Attendance matters without points.</strong> When your
                attendance multiplies your list ranking, showing up consistently
                directly improves your position. No hoarding required.
              </li>
              <li>
                <strong>The math is visible.</strong> Everyone can see where they
                stand before the item drops. The decision is already made. This
                eliminates most loot drama at the source.
              </li>
              <li>
                <strong>Officers spend less time on loot.</strong> No points to
                track per raid, no council deliberation per item. The system runs
                itself once it&apos;s set up.
              </li>
            </ul>

            <h2>What the Best Guilds Get Right</h2>
            <p>
              Regardless of system, the guilds that don&apos;t have loot
              problems tend to share a few traits:
            </p>
            <ol>
              <li>
                <strong>Rules are public before they matter.</strong> Every
                raider knows how loot works before they join, not after
                they&apos;ve lost a roll.
              </li>
              <li>
                <strong>Data is transparent.</strong> Attendance records, loot
                history, priority scores. If a raider can&apos;t check the
                numbers themselves, the system doesn&apos;t feel fair, no matter
                how fair it actually is.
              </li>
              <li>
                <strong>Attendance is the foundation.</strong> Every good loot
                system weights attendance heavily. The method of weighting
                differs, but the principle is universal: show up, get rewarded.
              </li>
              <li>
                <strong>The system is automated.</strong> Manual tracking breaks
                down. The officer who was running the spreadsheet quits the game,
                and suddenly the guild has no loot data from the last three
                weeks. Tools that handle this automatically don&apos;t take
                breaks.
              </li>
            </ol>

            <h2>Making the Switch</h2>
            <p>
              If your guild is still running DKP and you&apos;re seeing the
              hoarding and inflation problems, you don&apos;t need to blow
              everything up overnight. Here&apos;s a practical path:
            </p>
            <ol>
              <li>
                <strong>Acknowledge the problems openly.</strong> If your
                officers are already talking about DKP issues, bring the
                conversation to the guild. Raiders respect honesty more than
                pretending the system is fine.
              </li>
              <li>
                <strong>Trial the new system for one raid tier.</strong> A clean
                reset at the start of a new tier is the natural time to change
                loot systems. Everyone starts fresh, which removes the
                &quot;but I had 500 DKP saved&quot; objections.
              </li>
              <li>
                <strong>Use a tool, not a spreadsheet.</strong> If you&apos;re
                switching systems, don&apos;t rebuild the management overhead
                in a new format. Use something purpose-built.{' '}
                <a href={APP_URL}>LootList+</a> handles priority lists,
                attendance tracking, and score calculation in one place, so the
                switch is simpler than maintaining what you had before.
              </li>
              <li>
                <strong>Give it a full tier before judging.</strong> Any loot
                system feels weird for the first few weeks. The real test is
                whether, after 6-8 weeks, your raiders feel the system is fair
                and your officers aren&apos;t burning out maintaining it.
              </li>
            </ol>

            <h2>The Bottom Line</h2>
            <p>
              DKP was a smart solution to a 2004 problem. But the Classic
              community in 2026 has iterated past it. The core principle
              still holds: reward the people who show up. The mechanism
              has evolved.
            </p>
            <p>
              If you&apos;re building or rebuilding a loot system today,
              start with what you want it to accomplish: transparency,
              fairness, low officer overhead, and alignment between showing
              up and getting gear. Then pick the system that delivers those
              outcomes with the least friction.
            </p>
            <p>
              For most Classic guilds in 2026, that&apos;s a priority list
              system backed by automated attendance tracking. Not because
              it&apos;s trendy, but because it solves the problems that DKP
              couldn&apos;t.
            </p>
            <p>
              Ready to move on from DKP?{' '}
              <a href={APP_URL}>LootList+</a> gives your guild priority
              lists, attendance tracking, and transparent scoring. Set it up
              before your next raid tier and let the system do the work.
            </p>
          </div>
        </div>
      </article>

      <BlogRelatedPosts currentSlug="dkp-is-dead-what-classic-guilds-use-in-2026" />
      <LandingCTA />
      <LandingFooter />
    </main>
  )
}
