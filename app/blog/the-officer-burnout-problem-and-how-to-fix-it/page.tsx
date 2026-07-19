import type { Metadata } from 'next'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingCTA from '@/app/components/landing/LandingCTA'
import LandingFooter from '@/app/components/landing/LandingFooter'
import BlogRelatedPosts from '@/app/components/landing/BlogRelatedPosts'
import BlogTracker from '@/app/components/landing/BlogTracker'

export const metadata: Metadata = {
  title:
    'The Officer Burnout Problem (and How to Fix It)',
  description:
    'Guild officers burn out quietly and take the guild down with them. Here\'s why it happens, what accelerates it, and how to build an officer structure that lasts.',
  keywords: [
    'wow guild officer burnout',
    'wow officer tips',
    'guild management burnout',
    'wow guild officer guide',
    'wow guild leadership',
    'how to be a guild officer',
    'wow guild management',
    'wow classic guild tips',
    'guild officer responsibilities',
    'wow raid leader burnout',
  ],
  alternates: {
    canonical:
      'https://www.getlootlist.com/blog/the-officer-burnout-problem-and-how-to-fix-it',
  },
  openGraph: {
    title: 'The Officer Burnout Problem (and How to Fix It)',
    description:
      'Guild officers burn out quietly and take the guild down with them. Here\'s why it happens and how to build an officer structure that lasts.',
    type: 'article',
    publishedTime: '2026-04-19T00:00:00Z',
    authors: ['LootList+'],
    url: 'https://www.getlootlist.com/blog/the-officer-burnout-problem-and-how-to-fix-it',
  },
}

const APP_URL = 'https://www.lootlistplus.com'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'The Officer Burnout Problem (and How to Fix It)',
  description:
    'Guild officers burn out quietly and take the guild down with them. Here\'s why it happens, what accelerates it, and how to build an officer structure that lasts.',
  datePublished: '2026-04-19T00:00:00Z',
  dateModified: '2026-04-19T00:00:00Z',
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
      'https://www.getlootlist.com/blog/the-officer-burnout-problem-and-how-to-fix-it',
  },
  wordCount: 1900,
  articleSection: 'Guild Management',
  keywords: [
    'wow guild officer burnout',
    'guild management burnout',
    'wow guild leadership',
    'wow officer tips',
    'wow guild management',
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
      name: 'The Officer Burnout Problem (and How to Fix It)',
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
        <BlogTracker slug="the-officer-burnout-problem-and-how-to-fix-it" title="The Officer Burnout Problem (and How to Fix It)" />
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
            <span className="text-foreground-muted">Guild Management</span>
          </nav>

          {/* Header */}
          <header className="mb-12">
            <p className="text-sm font-medium text-accent mb-3">Guide</p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4">
              The Officer Burnout Problem (and How to Fix It)
            </h1>
            <p className="text-lg text-foreground-secondary leading-relaxed">
              The officer who holds everything together quits the game, and
              within two weeks the guild is dead. You&apos;ve seen it happen.
              Maybe you&apos;ve been that officer. Here&apos;s why it keeps
              happening and what guilds can actually do about it.
            </p>
            <div className="flex items-center gap-4 mt-6 text-sm text-foreground-muted">
              <time dateTime="2026-04-19">April 19, 2026</time>
              <span>&middot;</span>
              <span>8 min read</span>
            </div>
          </header>

          {/* Content */}
          <div className="prose prose-invert prose-lg max-w-none [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:text-foreground-secondary [&_p]:leading-relaxed [&_p]:mb-4 [&_li]:text-foreground-secondary [&_li]:leading-relaxed [&_ul]:mb-4 [&_ol]:mb-4 [&_strong]:text-foreground [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent/80">
            <p>
              Officer burnout doesn&apos;t announce itself. There&apos;s no
              dramatic blowup, no guild meeting, no farewell post. What happens
              is quieter: the officer who used to update the spreadsheet every
              Tuesday starts doing it Thursday, then the following Monday, then
              not at all. The one who ran invites stops answering DMs about
              raid spots. The GM logs in less, says less in Discord, and one
              day posts a two-sentence message about needing a break.
            </p>
            <p>
              The guild doesn&apos;t collapse because of the absence. It
              collapses because everything that officer was doing was
              invisible, and now nobody knows how to pick it up. The loot
              data lives in a spreadsheet only they understand. The recruit
              pipeline was a series of DMs only they were having. The raid
              comp decisions were in their head. When they leave, they take
              the guild&apos;s operating system with them.
            </p>

            <h2>Why Officers Burn Out</h2>
            <p>
              It&apos;s easy to say &quot;they took on too much.&quot;
              That&apos;s true, but it&apos;s not useful. The question is why
              they took on too much, and the answer is almost always the same
              set of structural problems.
            </p>

            <h3>The work is invisible</h3>
            <p>
              Raiders see the raid happen. They don&apos;t see the 45 minutes
              the officer spent reconciling attendance data before invites
              went out, or the 20-minute whisper conversation with a recruit
              who had questions about loot rules, or the hour spent adjusting
              the loot spreadsheet because someone pasted data into the wrong
              column.
            </p>
            <p>
              When the work is invisible, nobody says thanks. When nobody says
              thanks, the officer starts asking themselves why they&apos;re
              doing this. That question has a shelf life. After a few weeks of
              asking it, the answer becomes &quot;I shouldn&apos;t be.&quot;
            </p>

            <h3>The work concentrates</h3>
            <p>
              Guilds start with two or three officers who split
              responsibilities roughly evenly. Over time, the most reliable
              officer picks up tasks that other officers drop. Not because
              anyone asks them to. Because the work needs doing and they
              care enough to notice.
            </p>
            <p>
              Six months later, one person is running loot, attendance,
              recruitment, raid comp, and conflict resolution. The other
              officers are still in the channel but functionally inactive.
              The guild doesn&apos;t realize it&apos;s a single point of
              failure until the point fails.
            </p>

            <h3>The tools make it worse</h3>
            <p>
              Most guild management runs on spreadsheets, DMs, and tribal
              knowledge. These tools scale exactly until they don&apos;t.
              A spreadsheet that works for 10 raiders becomes a maintenance
              nightmare at 25. DMs that work for one officer become
              impossible when you try to hand them off to a second person.
            </p>
            <p>
              Every hour an officer spends fighting tools is an hour they
              could spend actually leading. But they keep doing it because
              the alternative is admitting the system is broken and rebuilding
              it from scratch, which is even more work. So they patch, they
              cope, and eventually they quit.
            </p>

            <h3>There&apos;s no off switch</h3>
            <p>
              Raiders log off after the raid and play something else. Officers
              get DMs on off nights about loot disputes, roster questions,
              and recruit applications. The job follows them into every
              channel, every login, every notification. A raider can take a
              week off and nobody notices. An officer takes a week off and
              comes back to a fire.
            </p>

            <h2>What It Costs the Guild</h2>
            <p>
              Officer burnout isn&apos;t a personal problem. It&apos;s a
              guild stability problem. When a key officer burns out, the guild
              loses more than a warm body in the roster:
            </p>
            <ul>
              <li>
                <strong>Institutional knowledge disappears.</strong> How does
                the loot system actually work? What&apos;s the recruit
                pipeline? Which raiders are flight risks? That was all in the
                officer&apos;s head.
              </li>
              <li>
                <strong>Remaining officers inherit the load.</strong> The same
                concentration dynamic starts over, now with fewer people and
                higher stakes.
              </li>
              <li>
                <strong>Raiders lose confidence.</strong> When the officer
                who ran things smoothly is gone and the replacement is
                visibly struggling, raiders start hedging. They check other
                guilds, they stop signing up for non-farm nights, they ask
                fewer questions because nobody seems to have answers.
              </li>
              <li>
                <strong>Recruitment slows.</strong> Good recruits ask about
                guild stability. &quot;Our loot officer just quit&quot; is
                not a compelling pitch.
              </li>
            </ul>

            <h2>How to Actually Fix It</h2>
            <p>
              The answer isn&apos;t &quot;find tougher officers.&quot;
              That&apos;s just finding someone with a longer fuse before the
              same thing happens again. The fix is structural: reduce the
              total amount of officer work, distribute what remains, and make
              the work visible.
            </p>

            <h3>Automate the boring parts</h3>
            <p>
              Most officer hours go to data entry, not decision-making.
              Tracking attendance in a spreadsheet, updating loot records,
              calculating scores, reconciling who was where and when. This is
              exactly the kind of work that a tool should handle.
            </p>
            <p>
              A purpose-built system like <a href={APP_URL}>LootList+</a>
              {' '}eliminates hours of weekly spreadsheet work. Attendance
              is tracked automatically, loot scores calculate themselves,
              and raiders can submit and manage their own loot lists without
              officer involvement. The officer&apos;s job shifts from data
              entry to decision-making, which is the part they actually
              signed up for.
            </p>

            <h3>Distribute ownership with clear boundaries</h3>
            <p>
              &quot;Everyone helps out&quot; is not a plan. Specific people
              own specific things. Write it down. Post it somewhere visible.
              One officer owns loot. One owns recruitment. One owns raid
              logistics. If your guild only has two officers, that&apos;s
              fine. Two people with clear lanes is better than four people
              with vague shared responsibility.
            </p>
            <p>
              The key detail: make the ownership visible to the guild, not
              just to the officers. When raiders know who handles what, they
              stop defaulting every question to the GM. That alone reduces
              the GM&apos;s message volume significantly.
            </p>

            <h3>Make the work visible</h3>
            <p>
              If raiders can&apos;t see what officers do, they can&apos;t
              appreciate it or help. A few ways to surface the work without
              being dramatic about it:
            </p>
            <ul>
              <li>
                <strong>Post attendance after every raid.</strong> Even a
                one-line summary in a dedicated channel (&quot;14/15 raiders
                present, 2 late, 1 excused&quot;) signals that someone is
                tracking it. Raiders who see this tend to take attendance more
                seriously.
              </li>
              <li>
                <strong>Make loot decisions transparent.</strong> If your
                loot system produces a score, show the score. If the decision
                was made by council, post the reasoning. When raiders can see
                the &quot;why,&quot; they stop asking officers to justify
                every call.
              </li>
              <li>
                <strong>Run a weekly &quot;state of the guild&quot;
                message.</strong> Three sentences. What went well, what
                needs work, what&apos;s coming. This takes two minutes to
                write and makes the guild feel managed instead of adrift.
              </li>
            </ul>

            <h3>Build in rotation</h3>
            <p>
              Nobody should run every raid forever. If you have two people
              who can call fights, alternate weeks. If recruitment is
              draining one officer, swap it with another responsibility for
              a tier. The goal is not equal suffering. It&apos;s that no
              single officer goes so long without a break that quitting starts
              to look attractive.
            </p>
            <p>
              This only works if the officer knowledge lives somewhere
              accessible. If the loot system is in one person&apos;s
              spreadsheet with custom formulas nobody else understands, you
              can&apos;t rotate. If it&apos;s in a tool that any officer can
              log into, you can.
            </p>

            <h3>Recognize the work</h3>
            <p>
              This sounds obvious. It almost never happens. A GM who says
              &quot;hey, thanks for handling loot last night, the
              distribution was clean&quot; in officer chat is doing more for
              retention than any rank perk or loot bonus. Officers don&apos;t
              quit because the work is hard. They quit because the work is
              hard and nobody notices.
            </p>

            <h2>Warning Signs to Watch For</h2>
            <p>
              If you&apos;re a GM, watch for these patterns in your officers.
              If you&apos;re an officer, watch for them in yourself.
            </p>
            <ul>
              <li>
                <strong>Delayed admin work.</strong> Attendance updates that
                used to happen same-night are now coming days late.
              </li>
              <li>
                <strong>Shorter responses.</strong> An officer who used to
                write thoughtful replies to recruit questions starts answering
                with one word.
              </li>
              <li>
                <strong>Skipping optional content.</strong> When the officer
                who used to join alt runs and social nights stops showing up,
                the game is becoming a job.
              </li>
              <li>
                <strong>&quot;I&apos;ll just do it myself.&quot;</strong>
                {' '}The moment an officer stops delegating and starts
                absorbing, the clock is ticking.
              </li>
              <li>
                <strong>Venting about raiders.</strong> Frustration with
                individual raiders is normal. Frustration with the guild as
                a whole is a signal.
              </li>
            </ul>
            <p>
              The window between noticing these signs and losing the officer
              is shorter than you think. If you see two or more, have a
              real conversation. Not &quot;are you okay?&quot; but &quot;what
              can we take off your plate this week?&quot; The second question
              actually leads somewhere.
            </p>

            <h2>The Bottom Line</h2>
            <p>
              Officer burnout is a structural problem, not a willpower problem.
              The officers who burn out fastest are usually the ones who care
              the most, which means your guild loses its best leaders first.
              The fix is to reduce the total work through automation,
              distribute what remains across clear roles, and make the work
              visible enough that it gets recognized.
            </p>
            <p>
              The guilds that keep officers for years aren&apos;t the ones
              with the lowest expectations. They&apos;re the ones where the
              tooling handles the repetitive work, the responsibilities are
              shared, and the GM says thanks often enough that the officers
              never have to wonder if anyone notices.
            </p>
            <p>
              Want to take busywork off your officers&apos; plate?{' '}
              <a href={APP_URL}>LootList+</a> automates attendance, loot
              scoring, and list management so your officers can focus on
              leading instead of updating spreadsheets. Set it up before your
              next raid tier and give your officers their evenings back.
            </p>
          </div>
        </div>
      </article>

      <BlogRelatedPosts currentSlug="the-officer-burnout-problem-and-how-to-fix-it" />
      <LandingCTA />
      <LandingFooter />
    </main>
  )
}
