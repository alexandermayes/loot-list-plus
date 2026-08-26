import type { Metadata } from 'next'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingCTA from '@/app/components/landing/LandingCTA'
import LandingFooter from '@/app/components/landing/LandingFooter'
import BlogRelatedPosts from '@/app/components/landing/BlogRelatedPosts'
import BlogTracker from '@/app/components/landing/BlogTracker'

export const metadata: Metadata = {
  title:
    'How to Run Loot in WoW Classic Without a Spreadsheet',
  description:
    'Spreadsheets were the default for Classic loot tracking, but they break at scale. Here\'s how to run a clean loot system without one.',
  keywords: [
    'wow classic loot spreadsheet',
    'wow loot tracking without spreadsheet',
    'wow classic loot system tool',
    'wow guild loot management',
    'wow classic loot addon',
    'loot tracking wow classic',
    'wow guild spreadsheet alternative',
    'wow loot list tool',
    'classic wow loot automation',
    'wow guild management tool',
  ],
  alternates: {
    canonical:
      'https://www.getlootlist.com/blog/how-to-run-loot-without-a-spreadsheet',
  },
  openGraph: {
    title: 'How to Run Loot in WoW Classic Without a Spreadsheet',
    description:
      'Spreadsheets were the default for Classic loot tracking, but they break at scale. Here\'s how to run a clean loot system without one.',
    type: 'article',
    publishedTime: '2026-05-07T00:00:00Z',
    authors: ['LootList+'],
    url: 'https://www.getlootlist.com/blog/how-to-run-loot-without-a-spreadsheet',
  },
}

const APP_URL = 'https://www.lootlistplus.com'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Run Loot in WoW Classic Without a Spreadsheet',
  description:
    'Spreadsheets were the default for Classic loot tracking, but they break at scale. Here\'s how to run a clean loot system without one.',
  datePublished: '2026-05-07T00:00:00Z',
  dateModified: '2026-05-07T00:00:00Z',
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
    '@id':
      'https://www.getlootlist.com/blog/how-to-run-loot-without-a-spreadsheet',
  },
  wordCount: 2000,
  articleSection: 'Loot Systems',
  keywords: [
    'wow classic loot spreadsheet',
    'wow loot tracking without spreadsheet',
    'wow classic loot system tool',
    'wow guild loot management',
    'classic wow loot automation',
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
      name: 'How to Run Loot in WoW Classic Without a Spreadsheet',
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
        <BlogTracker slug="how-to-run-loot-without-a-spreadsheet" title="How to Run Loot in WoW Classic Without a Spreadsheet" />
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
              How to Run Loot in WoW Classic Without a Spreadsheet
            </h1>
            <p className="text-lg text-foreground-secondary leading-relaxed">
              Every Classic guild starts with a spreadsheet. It works fine
              for the first month. Then someone pastes into the wrong cell,
              the formulas break, and the officer who built it is the only
              person who can fix it. There&apos;s a better way.
            </p>
            <div className="flex items-center gap-4 mt-6 text-sm text-foreground-muted">
              <span>By <a href="/about" className="text-foreground-secondary hover:text-foreground underline underline-offset-2 transition-colors">Zev</a>, creator of LootList+</span>
              <span>&middot;</span>
              <time dateTime="2026-05-07">May 7, 2026</time>
              <span>&middot;</span>
              <span>8 min read</span>
            </div>
          </header>

          {/* Content */}
          <div className="prose prose-invert prose-lg max-w-none [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:text-foreground-secondary [&_p]:leading-relaxed [&_p]:mb-4 [&_li]:text-foreground-secondary [&_li]:leading-relaxed [&_ul]:mb-4 [&_ol]:mb-4 [&_strong]:text-foreground [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent/80">
            <p>
              The spreadsheet era of WoW loot management lasted about 20
              years. For most of that time, there was genuinely nothing
              better. Google Sheets was free, everyone could access it, and
              if you were willing to learn INDEX MATCH and conditional
              formatting, you could build something that mostly worked.
            </p>
            <p>
              Mostly. The spreadsheet worked until it didn&apos;t, and when
              it broke, it broke at the worst possible time: right before a
              raid, right after a contested drop, or right when the officer
              who built it decided to take a break from the game.
            </p>

            <h2>Why Spreadsheets Break</h2>
            <p>
              This isn&apos;t about spreadsheets being bad software.
              They&apos;re great at what they do. The problem is that loot
              management isn&apos;t what they do. A spreadsheet is a
              general-purpose grid. Loot management is a specific workflow
              with specific rules, and bending a grid to fit that workflow
              creates problems that compound over time.
            </p>

            <h3>Single point of failure</h3>
            <p>
              The officer who builds the spreadsheet understands it. Nobody
              else does. The formulas reference other sheets, the macros
              are undocumented, and the conditional formatting logic was
              written at 2 AM after a six-hour prog night. When that officer
              takes a break, the spreadsheet becomes read-only. When they
              quit, it becomes a museum exhibit.
            </p>
            <p>
              This is the{' '}
              <a href="/blog/the-officer-burnout-problem-and-how-to-fix-it">
                officer burnout problem
              </a>{' '}
              in miniature. The tool concentrates knowledge in one person,
              which concentrates work in one person, which concentrates risk
              in one person.
            </p>

            <h3>No validation</h3>
            <p>
              A spreadsheet will let a raider rank a cloth item on their
              warrior. It will let someone paste 60 items into a 50-item
              list. It will let an officer type &quot;Thuderfury&quot;
              instead of &quot;Thunderfury&quot; and break the VLOOKUP
              chain. Every manual entry is a chance for human error, and
              in a 25-person guild updating lists every week, those errors
              stack up.
            </p>

            <h3>No history</h3>
            <p>
              When a raider says &quot;I had that item ranked #3 last
              week,&quot; can you prove them wrong? Probably not. Google
              Sheets has version history, but good luck finding the exact
              cell change from four days ago across 25 tabs. The
              spreadsheet captures the current state. It doesn&apos;t
              capture the decisions that led to it.
            </p>

            <h3>Attendance is a separate problem</h3>
            <p>
              Most loot spreadsheets track loot but not attendance.
              Attendance lives in a different sheet, or a Discord bot, or
              the raid leader&apos;s head. Connecting attendance to loot
              priority means manual data entry every week. As we covered in{' '}
              <a href="/blog/why-attendance-tracking-matters-more-than-loot-rules">
                why attendance tracking matters more than loot rules
              </a>, your loot system is only as good as your attendance
              data. If the two live in different tools, one of them is
              always out of date.
            </p>

            <h3>Scales badly</h3>
            <p>
              A 10-person spreadsheet is manageable. A 25-person
              spreadsheet with 50 items each, attendance records, point
              calculations, and historical loot data is a part-time job.
              The officer maintaining it spends more time fighting the tool
              than making loot decisions. That&apos;s backwards.
            </p>

            <h2>What Replaced the Spreadsheet</h2>
            <p>
              The spreadsheet didn&apos;t get replaced by one thing. It
              got replaced by a combination of purpose-built tools, each
              handling a piece of the puzzle better than a grid of cells
              ever could.
            </p>

            <h3>In-game addons</h3>
            <p>
              Addons like Gargul handle the in-raid workflow: distributing
              loot, running soft reserves, tracking who got what during the
              run. They&apos;re good at the moment-to-moment logistics of
              loot distribution. What they don&apos;t do is the strategic
              layer: who should get priority, how attendance factors in,
              what each raider wants.
            </p>

            <h3>Discord bots</h3>
            <p>
              Some guilds use Discord bots for loot wishlists and
              attendance tracking. These work as a basic input layer but
              create data silos. Your attendance is in one bot, your loot
              lists are in another, and your scores are still in a
              spreadsheet connecting the two. You&apos;ve added complexity
              without removing it.
            </p>

            <h3>Purpose-built loot management tools</h3>
            <p>
              This is where the real shift happened. Tools designed
              specifically for WoW guild loot management don&apos;t try to
              be general-purpose. They understand item classifications,
              class restrictions, attendance windows, scoring formulas, and
              the actual workflow of running loot in a raid guild. The
              spreadsheet was a workaround. A purpose-built tool is the
              solution.
            </p>

            <h2>What a Spreadsheet-Free Loot System Looks Like</h2>
            <p>
              Here&apos;s the workflow when you stop fighting a spreadsheet
              and use a tool that was designed for the job:
            </p>

            <h3>Raiders manage their own lists</h3>
            <p>
              Instead of an officer collecting wishlists via DMs and
              pasting them into a sheet, raiders log in and rank items
              themselves. The tool shows them what&apos;s available for
              their class, prevents invalid selections, and saves
              automatically. The officer&apos;s job goes from &quot;data
              entry&quot; to &quot;review and approve.&quot;
            </p>

            <h3>Attendance is automatic</h3>
            <p>
              Instead of manually tracking who was at each raid,
              attendance imports from your raid addon or gets marked in a
              few clicks. The tool calculates attendance percentages,
              handles excused absences, and factors the result into loot
              scores without anyone touching a formula.
            </p>

            <h3>Scores calculate themselves</h3>
            <p>
              Item ranking, attendance, seniority bonuses, trial penalties,
              role modifiers. All computed automatically based on the rules
              your guild sets. When an item drops, you check the score
              board. The winner is clear. No spreadsheet formula debugging
              required.
            </p>

            <h3>Loot decisions happen during the raid</h3>
            <p>
              With a{' '}
              <a href="/blog/loot-priority-lists-vs-loot-council">
                priority list system
              </a>, most loot resolves automatically. The officer opens the
              item, sees the ranked candidates with scores, and awards it.
              Edge cases get a quick council discussion. Either way,
              it&apos;s a 30-second process, not a 5-minute spreadsheet
              lookup.
            </p>

            <h3>History is built in</h3>
            <p>
              Every loot award, every list change, every attendance record
              is logged with a timestamp and who did it. When a raider asks
              &quot;why didn&apos;t I get that item?&quot; the answer is
              one click away: a score comparison showing exactly how the
              numbers broke down.
            </p>

            <h2>The Migration Isn&apos;t as Hard as You Think</h2>
            <p>
              The biggest barrier to ditching the spreadsheet is the
              migration. &quot;We have six months of data in this
              sheet.&quot; Fair. But here&apos;s the thing: most of that
              data doesn&apos;t matter going forward. You need current
              rankings and recent attendance. Historical loot data is nice
              but not critical.
            </p>
            <p>
              A practical migration looks like this:
            </p>
            <ul>
              <li>
                <strong>Week 1:</strong> Set up the tool. Import your raid
                schedule and roster. Officers configure scoring rules to
                match (or improve on) your current system.
              </li>
              <li>
                <strong>Week 2:</strong> Raiders submit their loot lists
                in the new system. Run loot from the new tool while keeping
                the spreadsheet as a backup. Compare results.
              </li>
              <li>
                <strong>Week 3:</strong> If the numbers match and nobody
                is confused, retire the spreadsheet. If something&apos;s
                off, adjust the settings and run another parallel week.
              </li>
            </ul>
            <p>
              Most guilds are fully migrated within two raid resets.
              The spreadsheet sits untouched in the Discord pins as a
              historical artifact.
            </p>

            <h2>The Bottom Line</h2>
            <p>
              Spreadsheets were the best option for a long time. They
              aren&apos;t anymore. The problems they create, concentrated
              knowledge, manual errors, attendance disconnects, scaling
              pain, are all solved by tools built for this specific job.
              The guilds still using spreadsheets in 2026 aren&apos;t doing
              it because the spreadsheet is better. They&apos;re doing it
              because switching feels hard. It&apos;s not.
            </p>
            <p>
              <a href={APP_URL}>LootList+</a> handles loot lists,
              attendance tracking, score calculations, and loot history in
              one place. Raiders submit their own lists, attendance imports
              in clicks, and loot decisions happen in seconds during the
              raid. Set it up before your next tier and stop being the
              guild that runs loot from a spreadsheet.
            </p>
          </div>
        </div>
      </article>

      <BlogRelatedPosts currentSlug="how-to-run-loot-without-a-spreadsheet" />
      <LandingCTA />
      <LandingFooter />
    </main>
  )
}
