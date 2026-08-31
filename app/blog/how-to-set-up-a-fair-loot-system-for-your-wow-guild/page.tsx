import type { Metadata } from 'next'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingCTA from '@/app/components/landing/LandingCTA'
import LandingFooter from '@/app/components/landing/LandingFooter'
import BlogRelatedPosts from '@/app/components/landing/BlogRelatedPosts'
import BlogTracker from '@/app/components/landing/BlogTracker'

export const metadata: Metadata = {
  title: 'How to Set Up a Fair Loot System for Your WoW Guild',
  description:
    'Compare DKP, EPGP, Loot Council, and Suicide Kings. Learn what makes a loot system fair and how to set one up for your World of Warcraft guild.',
  keywords: [
    'wow loot system',
    'wow guild loot distribution',
    'wow loot council alternative',
    'wow classic loot priority',
    'fair loot system wow',
    'dkp vs epgp',
    'wow guild management',
    'wow classic guild loot',
  ],
  alternates: {
    canonical:
      'https://www.getlootlist.com/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild',
  },
  openGraph: {
    title: 'How to Set Up a Fair Loot System for Your WoW Guild',
    description:
      'Compare DKP, EPGP, Loot Council, and more. A practical guide to loot systems that actually work.',
    type: 'article',
    publishedTime: '2026-03-23T00:00:00Z',
    authors: ['LootList+'],
    url: 'https://www.getlootlist.com/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild',
  },
}

const APP_URL = 'https://www.lootlistplus.com'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Set Up a Fair Loot System for Your WoW Guild',
  description:
    'Compare DKP, EPGP, Loot Council, and Suicide Kings. Learn what makes a loot system fair and how to set one up for your World of Warcraft guild.',
  datePublished: '2026-03-23T00:00:00Z',
  dateModified: '2026-03-23T00:00:00Z',
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
    '@id': 'https://www.getlootlist.com/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild',
  },
  wordCount: 1450,
  articleSection: 'Guild Management',
  keywords: [
    'wow loot system',
    'wow guild loot distribution',
    'wow loot council alternative',
    'wow classic loot priority',
    'dkp vs epgp',
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
      name: 'How to Set Up a Fair Loot System for Your WoW Guild',
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
        <BlogTracker slug="how-to-set-up-a-fair-loot-system-for-your-wow-guild" title="How to Set Up a Fair Loot System for Your WoW Guild" />
        <div className="max-w-3xl mx-auto">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm text-foreground-secondary">
            <a href="/blog" className="hover:text-foreground transition-colors">
              Blog
            </a>
            <span className="mx-2 text-foreground-muted">/</span>
            <span className="text-foreground-muted">Loot Systems Guide</span>
          </nav>

          {/* Header */}
          <header className="mb-12">
            <p className="text-sm font-medium text-accent mb-3">Guide</p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4">
              How to Set Up a Fair Loot System for Your WoW Guild
            </h1>
            <p className="text-lg text-foreground-secondary leading-relaxed">
              Compare DKP, EPGP, Loot Council, Suicide Kings, and more. A
              practical guide to building a loot system your raiders actually
              trust.
            </p>
            <div className="flex items-center gap-4 mt-6 text-sm text-foreground-muted">
              <span>By <a href="/about" className="text-foreground-secondary hover:text-foreground underline underline-offset-2 transition-colors">Zev</a>, creator of LootList+</span>
              <span>&middot;</span>
              <time dateTime="2026-03-23">March 23, 2026</time>
              <span>·</span>
              <span>8 min read</span>
            </div>
          </header>

          {/* Content */}
          <div className="prose prose-invert prose-lg max-w-none [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:text-foreground-secondary [&_p]:leading-relaxed [&_p]:mb-4 [&_li]:text-foreground-secondary [&_li]:leading-relaxed [&_ul]:mb-4 [&_ol]:mb-4 [&_strong]:text-foreground [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent/80">
            <p>
              Every guild leader has been there. You down a boss after weeks of
              prog, a weapon drops, and suddenly half the raid is tilted because
              the wrong person got it. Loot drama has killed more guilds than
              Hogger ever could. The problem is rarely that people are greedy.
              It&apos;s that the system wasn&apos;t clear, wasn&apos;t consistent, or
              wasn&apos;t fair.
            </p>
            <p>
              This guide breaks down the most common loot systems, where they
              fall apart, and what actually works if you want a system your
              raiders trust.
            </p>

            <h2>Why Loot Drama Happens</h2>
            <p>
              Loot drama almost never starts with the loot itself. It starts with
              expectations. A raider who showed up every week for two months
              watches a trial walk in and win their bis weapon. An officer awards
              loot to their buddy and claims it was &quot;for the good of the
              raid.&quot; Someone rage-quits over a sidegrade because they felt
              overlooked.
            </p>
            <p>The root causes are always the same:</p>
            <ul>
              <li>
                <strong>No clear rules</strong>, or rules that change depending
                on who&apos;s asking
              </li>
              <li>
                <strong>No transparency</strong> into how decisions get made
              </li>
              <li>
                <strong>No tracking</strong> of who got what and when
              </li>
              <li>
                <strong>Attendance isn&apos;t factored in</strong>, so a raider who
                shows up 3 out of 8 weeks has the same shot as the person who
                never misses
              </li>
            </ul>
            <p>
              If your system can&apos;t answer &quot;why did this person get loot over
              me?&quot; with a clear, verifiable answer, you have a drama factory.
            </p>

            <h2>The Common Systems (and Where They Break)</h2>

            <h3>DKP (Dragon Kill Points)</h3>
            <p>
              The OG. Raiders earn points for attendance and spend them to bid on
              items. Simple in theory.
            </p>
            <p>
              <strong>Pros:</strong> Transparent, rewards attendance, raiders
              feel ownership over their points.
            </p>
            <p>
              <strong>Cons:</strong> Point hoarding becomes the meta. Veterans
              sit on massive banks and snipe every good drop. New recruits
              can&apos;t compete for months. Some items go for 1 DKP because nobody
              wants to spend, then the next tier everyone&apos;s broke. It also
              doesn&apos;t account for how much a piece actually matters to
              someone&apos;s performance.
            </p>

            <h3>EPGP (Effort Points / Gear Points)</h3>
            <p>
              An evolution of DKP. You earn EP for attendance and gain GP when
              you receive loot. Your priority is your EP/GP ratio. Decay keeps
              things from stagnating.
            </p>
            <p>
              <strong>Pros:</strong> Better than raw DKP. Decay prevents
              infinite hoarding. The ratio system means getting loot actually
              costs you relative priority.
            </p>
            <p>
              <strong>Cons:</strong> The math is opaque to most raiders. Decay
              percentages feel arbitrary. It still doesn&apos;t capture whether an
              item is a 5% upgrade or a 0.1% sidegrade. Officers spend more time
              configuring decay values than actually raiding.
            </p>

            <h3>Loot Council</h3>
            <p>
              A group of officers decides who gets each piece based on
              performance, attendance, upgrade value, and whatever else they deem
              relevant.
            </p>
            <p>
              <strong>Pros:</strong> In theory, the best possible outcome for
              the raid. Loot goes where it has the most impact.
            </p>
            <p>
              <strong>Cons:</strong> In practice, trust is everything. Even
              honest councils get accused of favoritism. There&apos;s no paper trail
              unless you build one. It&apos;s exhausting for the officers running it.
              And if even one council member plays favorites, the whole system is
              compromised.
            </p>

            <h3>Suicide Kings</h3>
            <p>
              A simple ordered list. When you receive loot, you drop to the
              bottom. Everyone else moves up.
            </p>
            <p>
              <strong>Pros:</strong> Dead simple. No math, no ambiguity about
              who&apos;s next.
            </p>
            <p>
              <strong>Cons:</strong> Encourages passing on small upgrades to save
              your position for bis items. Doesn&apos;t reward attendance at all. A
              raider who took a month off is still wherever they were on the
              list.
            </p>

            <h3>Soft Reserve / MS &gt; OS + Roll</h3>
            <p>
              Common in pugs and casual guilds. Raiders reserve one or two items,
              or just roll main spec over off spec.
            </p>
            <p>
              <strong>Pros:</strong> Low overhead. Works fine for casual content.
            </p>
            <p>
              <strong>Cons:</strong> Falls apart in any serious progression
              environment. No reward for consistency, no tracking, pure RNG.
            </p>

            <h2>What Actually Makes a Fair Loot System</h2>
            <p>
              After running guilds through Classic, TBC, WotLK, Cata, and now
              MoP, the pattern is clear. The systems that survive are the ones
              that nail these fundamentals:
            </p>

            <h3>1. Attendance matters, visibly</h3>
            <p>
              If someone shows up every raid night for two months, they should
              have a meaningful advantage over someone who shows up half the
              time. And that advantage needs to be visible to everyone, not just
              the officers.
            </p>

            <h3>2. Raiders have agency</h3>
            <p>
              People want input into their own gearing. Being told &quot;the council
              decided&quot; with no visibility into why breeds resentment. Let
              raiders express their priorities.
            </p>

            <h3>3. Transparency isn&apos;t optional</h3>
            <p>
              Every raider should be able to see the current standings,
              understand how scores are calculated, and verify that the system is
              working as intended. If your loot system requires trust but
              provides no way to verify, you&apos;re one bad night away from losing
              half your roster.
            </p>

            <h3>4. The system handles edge cases</h3>
            <p>
              Trials, alts, class stacking, limited items like legendaries. A
              good system has clear rules for all of these before they come up,
              not after the drama starts.
            </p>

            <h3>5. It doesn&apos;t eat your officers alive</h3>
            <p>
              If your loot master spends 45 minutes after every raid updating
              spreadsheets, that&apos;s a system problem. Officer burnout is a guild
              killer, and loot admin is one of the biggest contributors.
            </p>

            <h2>How LootList+ Approaches This</h2>
            <p>
              Full disclosure: I&apos;m going to talk about{' '}
              <a href={APP_URL}>LootList+</a> here because it was built
              specifically to solve these problems. But the principles above
              apply regardless of what tool you use.
            </p>
            <p>
              LootList+ combines ranked loot lists and attendance-weighted
              scoring into what it calls a <strong>Loot Score</strong> system.
              Here&apos;s how it works:
            </p>
            <p>
              <strong>Raiders submit ranked loot lists</strong> of up to 50
              items, ordered by personal priority. This gives officers visibility
              into what everyone actually wants, not just what they roll on in
              the moment.
            </p>
            <p>
              <strong>Attendance is tracked and weighted.</strong> Your
              attendance directly affects your Loot Score. Show up consistently,
              your score goes up. Miss raids, it goes down. Everyone can see
              attendance numbers. No arguments about who &quot;deserves&quot; loot more.
            </p>
            <p>
              <strong>Scores are transparent and verifiable.</strong> The Loot
              Score combines list ranking, attendance points, and any modifiers
              (trial penalties, bonuses, etc.) into a single number that everyone
              in the guild can see. When an item drops, the system shows exactly
              who has priority and why.
            </p>
            <p>
              <strong>The Master Sheet</strong> compiles every raider&apos;s list
              into one view. Officers can see at a glance who wants what, what
              the priority order is for any given item, and where potential
              conflicts exist, all before the raid even starts.
            </p>
            <p>
              <strong>
                It supports the expansions people actually play.
              </strong>{' '}
              Classic, TBC, WotLK, Cata, and MoP all have full item databases.
              You&apos;re not manually entering item IDs or linking wowhead URLs.
            </p>
            <p>
              <strong>Officers aren&apos;t buried in spreadsheets.</strong>{' '}
              Attendance syncs, scores calculate automatically, and the priority
              order is right there when loot drops. There&apos;s even a WoW addon
              that handles roll-offs and loot distribution in-game.
            </p>

            <h3>The Attendance Problem, Solved</h3>
            <p>
              One thing that surprised me building this: attendance tracking is
              where most guilds&apos; systems quietly fall apart. They start strong,
              then someone forgets to log a raid, or the spreadsheet breaks, or
              the officer who maintained it quits. Three months later, nobody
              trusts the numbers.
            </p>
            <p>
              LootList+ tracks attendance per raid with support for late joins,
              early leaves, excused absences, and bench time. It feeds directly
              into the Loot Score calculation. No separate spreadsheet, no manual
              entry after the raid. Your attendance record is always current and
              always visible to you.
            </p>

            <h2>Getting Started</h2>
            <p>
              If you&apos;re setting up a loot system from scratch, or replacing one
              that isn&apos;t working, here&apos;s the practical path:
            </p>
            <ol>
              <li>
                <strong>Define your rules before your first raid.</strong> Write
                down how loot priority works, how attendance is tracked, how
                trials are handled, and what happens with limited/reserved items.
              </li>
              <li>
                <strong>Make everything visible.</strong> Whatever system you
                choose, your raiders should be able to see their own standing and
                understand exactly how decisions are made.
              </li>
              <li>
                <strong>
                  Pick a tool that doesn&apos;t require a dedicated officer to
                  maintain.
                </strong>{' '}
                The best system in the world fails if it depends on one
                person&apos;s free time.
              </li>
              <li>
                <strong>Revisit and adjust.</strong> No system is perfect on day
                one. Check in with your raiders after a few weeks and tune what
                isn&apos;t working.
              </li>
            </ol>
            <p>
              If you want to skip the spreadsheet phase entirely,{' '}
              <a href={APP_URL}>LootList+</a> is free to try. Set up your guild,
              import your roster, and have your raiders submit their lists before
              your next raid night. The priority order handles itself from there.
            </p>
            <p>
              Fair loot isn&apos;t about making everyone happy with every drop.
              It&apos;s about making sure everyone understands why decisions were
              made and trusts that the system treats them the same as everyone
              else. Get that right, and the drama takes care of itself.
            </p>
          </div>
        </div>
      </article>

      <BlogRelatedPosts currentSlug="how-to-set-up-a-fair-loot-system-for-your-wow-guild" />
      <LandingCTA />
      <LandingFooter />
    </main>
  )
}
