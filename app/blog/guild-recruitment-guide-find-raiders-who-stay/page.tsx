import type { Metadata } from 'next'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingCTA from '@/app/components/landing/LandingCTA'
import LandingFooter from '@/app/components/landing/LandingFooter'
import BlogRelatedPosts from '@/app/components/landing/BlogRelatedPosts'
import BlogTracker from '@/app/components/landing/BlogTracker'

export const metadata: Metadata = {
  title:
    'Guild Recruitment Guide: How to Find Raiders Who Actually Stay | LootList+',
  description:
    'Most guild recruitment fills seats with raiders who quit in 4 weeks. Here\'s how to write apps, run trials, and build a roster that survives the tier.',
  keywords: [
    'wow guild recruitment',
    'how to recruit raiders wow',
    'wow classic guild recruitment',
    'guild recruitment post template wow',
    'wow guild trial period',
    'find raiders wow',
    'wow guild application',
    'recruit raiders that stay',
    'guild retention wow',
    'wow guild recruitment tips',
  ],
  alternates: {
    canonical:
      'https://www.getlootlist.com/blog/guild-recruitment-guide-find-raiders-who-stay',
  },
  openGraph: {
    title: 'Guild Recruitment Guide: How to Find Raiders Who Actually Stay',
    description:
      'Most guild recruitment fills seats with raiders who quit in 4 weeks. Here\'s how to write apps, run trials, and build a roster that survives the tier.',
    type: 'article',
    publishedTime: '2026-05-21T00:00:00Z',
    authors: ['LootList+'],
    url: 'https://www.getlootlist.com/blog/guild-recruitment-guide-find-raiders-who-stay',
  },
}

const APP_URL = 'https://www.lootlistplus.com'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline:
    'Guild Recruitment Guide: How to Find Raiders Who Actually Stay',
  description:
    'Most guild recruitment fills seats with raiders who quit in 4 weeks. Here\'s how to write apps, run trials, and build a roster that survives the tier.',
  datePublished: '2026-05-21T00:00:00Z',
  dateModified: '2026-05-21T00:00:00Z',
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
      'https://www.getlootlist.com/blog/guild-recruitment-guide-find-raiders-who-stay',
  },
  wordCount: 2200,
  articleSection: 'Guild Management',
  keywords: [
    'wow guild recruitment',
    'how to recruit raiders wow',
    'wow guild trial period',
    'guild retention wow',
    'wow classic guild recruitment',
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
      name: 'Guild Recruitment Guide: How to Find Raiders Who Actually Stay',
    },
  ],
}

export default function BlogPost() {
  return (
    <main
      className="bg-background overflow-x-hidden"
      style={{ background: 'linear-gradient(180deg, #0f0e12 0%, #080808 40%)' }}
    >
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
        <BlogTracker
          slug="guild-recruitment-guide-find-raiders-who-stay"
          title="Guild Recruitment Guide: How to Find Raiders Who Actually Stay"
        />
        <div className="max-w-3xl mx-auto">
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

          <header className="mb-12">
            <p className="text-sm font-medium text-accent mb-3">Guide</p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4">
              Guild Recruitment Guide: How to Find Raiders Who Actually Stay
            </h1>
            <p className="text-lg text-foreground-secondary leading-relaxed">
              Recruiting a raider is easy. Recruiting one who&apos;s still
              showing up six weeks later is the actual problem. Most guilds
              are great at the first part and terrible at the second.
              Here&apos;s how to fix both ends of the funnel.
            </p>
            <div className="flex items-center gap-4 mt-6 text-sm text-foreground-muted">
              <time dateTime="2026-05-21">May 21, 2026</time>
              <span>&middot;</span>
              <span>10 min read</span>
            </div>
          </header>

          <div className="prose prose-invert prose-lg max-w-none [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:text-foreground-secondary [&_p]:leading-relaxed [&_p]:mb-4 [&_li]:text-foreground-secondary [&_li]:leading-relaxed [&_ul]:mb-4 [&_ol]:mb-4 [&_strong]:text-foreground [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent/80">
            <p>
              Every guild officer has watched it happen. A promising recruit
              joins. They parse purple on week one. They&apos;re online for
              every invite. Then week three hits, attendance slips,
              week four they ghost the Discord, and by week five the
              officer is back on the recruitment forums looking for another
              shadow priest.
            </p>
            <p>
              Recruitment is a retention problem disguised as a sourcing
              problem. Most guilds optimize for filling seats and wonder why
              the seats keep emptying. The guilds that solve this aren&apos;t
              recruiting harder. They&apos;re filtering smarter.
            </p>

            <h2>Why Most Recruits Quit</h2>
            <p>
              Before you can recruit raiders who stay, you have to
              understand why the ones who leave actually leave. It&apos;s
              rarely about loot or progression. Those are the symptoms.
              The real reasons cluster into four categories.
            </p>

            <h3>1. Mismatched expectations</h3>
            <p>
              They thought your guild was a sweaty progression team and you
              run two casual nights a week. Or they thought you were chill
              and you require flask logs and 95+ parses. The first time
              expectations and reality diverge, the recruit starts mentally
              packing their bags.
            </p>
            <p>
              This is your fault, not theirs. Your recruitment post is the
              contract. If it sells a vibe you don&apos;t actually deliver,
              you&apos;ll keep losing people in week three.
            </p>

            <h3>2. No social anchor</h3>
            <p>
              People stay where they have friends. A raider who knows three
              people in your guild by name is dramatically harder to lose
              than one who only knows their officer contact. If your
              onboarding ends at &quot;okay, see you Tuesday,&quot; you
              have no anchor and you&apos;re relying on raid performance to
              keep them. That&apos;s a thin thread.
            </p>

            <h3>3. The trial felt punitive, not welcoming</h3>
            <p>
              Some guilds run trials like a hazing ritual. No loot, no
              voice, no slack on mistakes. The thinking is that trials
              should earn their spot. The result is that trials feel like
              second-class citizens for a month and decide it&apos;s not
              worth it.
            </p>
            <p>
              A trial period is reasonable. A trial period that signals
              &quot;we don&apos;t actually want you yet&quot; isn&apos;t.
              The point of the trial is to evaluate fit, not to test how
              much they&apos;ll tolerate.
            </p>

            <h3>4. They never saw a path to loot</h3>
            <p>
              A new raider needs to see, within their first few weeks, that
              the system will reward them eventually. If your guild gives
              all the gear to the top 10 mains for the first two months of
              a tier, your trials are watching upgrades go elsewhere with
              no visible end to the pattern. Of course they bounce.
            </p>
            <p>
              This is fixable with transparency. When trials can see
              exactly{' '}
              <a href="/blog/how-to-set-up-a-fair-loot-system-for-your-wow-guild">
                how the loot system works
              </a>{' '}
              and what their score path looks like, they can do the math
              themselves. &quot;Three more weeks of attendance and I&apos;m
              competitive on tier tokens&quot; is a reason to stay.
              &quot;I have no idea when I&apos;ll get loot&quot; is a
              reason to leave.
            </p>

            <h2>Writing a Recruitment Post That Filters</h2>
            <p>
              The job of a recruitment post isn&apos;t to attract every
              warm body. It&apos;s to attract the right ones and repel the
              wrong ones. A post that tries to appeal to everyone gets
              clicks from people who would&apos;ve washed out in week two
              anyway.
            </p>

            <h3>Lead with the hard facts</h3>
            <p>
              The first three lines should be unambiguous: server, faction,
              raid days, raid times (with timezone), and current
              progression. If a recruit has to scroll to find any of these,
              you&apos;re wasting their time and yours. People who would
              have applied anyway will. People who can&apos;t make Tuesday
              and Thursday nights will self-select out.
            </p>

            <h3>Be specific about expectations</h3>
            <p>
              Vague language attracts vague applicants. &quot;We expect
              good attendance&quot; means nothing. &quot;We require 90%
              attendance over a rolling 4-week window, with at least one
              week of notice for planned absences&quot; means something.
              The first version recruits people who think they have
              &quot;good attendance.&quot; The second recruits people who
              know what 90% actually means.
            </p>
            <p>
              The same applies to performance. &quot;We want good
              players&quot; is filler. &quot;75th percentile parses on prog
              bosses, 90th by farm&quot; is a filter.
            </p>

            <h3>Describe the loot system explicitly</h3>
            <p>
              Loot system is the second-biggest reason raiders join or
              leave. Don&apos;t hide it. If you run a{' '}
              <a href="/blog/loot-priority-lists-vs-loot-council">
                priority list system
              </a>, say so and explain how it works in two sentences. If
              you run loot council, say that and explain what factors the
              council weighs. Recruits with strong opinions either way will
              self-select.
            </p>

            <h3>Show, don&apos;t hype</h3>
            <p>
              Skip the &quot;we&apos;re a tight-knit family who loves to
              have fun&quot; opener. Every guild claims that. Instead,
              show evidence: how long has the core been together, what was
              your last tier&apos;s clear time, how many of your raiders
              are returning from previous expansions. Specifics signal
              competence. Adjectives signal a template.
            </p>

            <h3>State the trial terms upfront</h3>
            <p>
              Length, expectations, loot access, and what success looks
              like. &quot;2-week trial. Full loot access (no penalty).
              Promotion decision at the end based on attendance and
              performance. We&apos;ll give you direct feedback at the
              halfway mark.&quot; That&apos;s a contract a recruit can
              evaluate. &quot;Trials are at officer discretion&quot;
              isn&apos;t.
            </p>

            <h2>The Application Form That Tells You What You Need</h2>
            <p>
              Most guild applications are too long and ask the wrong
              questions. They want logs, gear profiles, UI screenshots,
              raid history going back four expansions. Half of that is
              information you&apos;ll never actually use to decide.
            </p>
            <p>
              Cut your application to these questions:
            </p>
            <ul>
              <li>
                <strong>Logs from the last 2 tiers.</strong> One link, any
                parse site. You want to see consistency, not their single
                best pull.
              </li>
              <li>
                <strong>Why are you leaving your current guild?</strong>{' '}
                The most predictive single question on any application.
                Look for specifics. &quot;Schedule conflict&quot; is fine.
                &quot;Drama with leadership&quot; needs follow-up.
                &quot;They&apos;re too casual / not progressing&quot; from
                someone with 50th-percentile parses is a red flag.
              </li>
              <li>
                <strong>How many raids do you expect to miss in a typical
                month?</strong> Honest answers help you plan. Recruits who
                say &quot;zero&quot; are either lying or new to having a
                life.
              </li>
              <li>
                <strong>What&apos;s your timezone, and what time zone does
                your work/school run on?</strong> A raider who&apos;s
                logging in at midnight local time will burn out by month
                three.
              </li>
              <li>
                <strong>Anything you want us to know?</strong> A catch-all
                that surfaces things you forgot to ask. The best recruits
                use it to ask thoughtful questions back.
              </li>
            </ul>
            <p>
              That&apos;s it. Five questions, ten minutes to fill out.
              You&apos;ll get more applications and the quality goes up.
              Long forms filter for people willing to fill out long forms,
              not people who will make good raiders.
            </p>

            <h2>Running a Trial That Earns Retention</h2>
            <p>
              The trial period is where most guilds lose recruits they
              actually wanted to keep. The fix isn&apos;t to relax
              standards. It&apos;s to make the trial a real onboarding
              experience instead of a holding pattern.
            </p>

            <h3>Assign a buddy on day one</h3>
            <p>
              Pair every trial with a veteran raider whose job is to
              answer questions, invite them to off-night content, and
              check in mid-week. This is the single highest-leverage thing
              you can do for retention. It&apos;s also the thing 90% of
              guilds skip because nobody volunteered for it.
            </p>
            <p>
              The buddy isn&apos;t evaluating performance. The buddy is
              making sure the trial has at least one person who notices
              when they&apos;re struggling. That&apos;s the social anchor
              we talked about earlier.
            </p>

            <h3>Give them real loot access</h3>
            <p>
              Trials with no loot access feel like extras. Trials with
              loot access feel like raiders. The math people use to
              justify locking out trials (&quot;they might leave with our
              gear&quot;) is almost always smaller than the math of
              losing trials because they had no incentive to stay. Give
              them the same priority everyone else has, maybe with a
              small attendance modifier that decays. Then explain it
              clearly.
            </p>
            <p>
              If your system has a trial penalty, show them when it expires.
              A trial who can see &quot;your -2 trial modifier ends on
              June 18&quot; understands the deal. A trial who feels
              vaguely deprioritized doesn&apos;t.
            </p>

            <h3>Give midpoint feedback</h3>
            <p>
              Halfway through the trial, send a direct message that says
              what they&apos;re doing well and what they need to fix
              before the end. Two bullet points each. Don&apos;t soften
              it; vague feedback is worse than honest feedback. Most
              trials want to know exactly where they stand and never get
              told.
            </p>
            <p>
              This conversation does two things. It gives the recruit a
              concrete path to promotion, and it tells you whether they
              can take feedback. A recruit who responds with &quot;thanks,
              I&apos;ll work on that&quot; and improves is keeper
              material. One who gets defensive about basic feedback will
              be a problem forever.
            </p>

            <h3>Make the promotion decision visible</h3>
            <p>
              When the trial ends, tell them in the moment. Don&apos;t
              leave them wondering whether they&apos;re a raider now. If
              the answer is yes, announce it in guild chat and welcome
              them properly. If the answer is no, tell them privately,
              briefly, and without theater. Either way, they&apos;ll
              respect a clean decision more than a drifting one.
            </p>

            <h2>The First 30 Days Matter Most</h2>
            <p>
              Retention data from a lot of guilds shows the same pattern.
              If a recruit makes it past day 30, they tend to stick around
              for the tier. If they leave, it almost always happens in the
              first 21 days. Which means your onboarding window is short
              and the stakes are high.
            </p>
            <p>
              A few small things move the needle a lot during this window:
            </p>
            <ul>
              <li>
                <strong>Get their character into the guild systems
                immediately.</strong> Loot list, attendance tracker,
                Discord roles, raid signup. Nothing makes a recruit feel
                more like an outsider than waiting three weeks for someone
                to add them to the actual tools.
              </li>
              <li>
                <strong>Mention them in raid recaps.</strong>{' '}
                &quot;Welcome to NewRaider, who picked up their first kill
                with us tonight&quot; takes 5 seconds and creates a moment
                they&apos;ll remember.
              </li>
              <li>
                <strong>Invite them to off-night content.</strong>{' '}
                Achievements, alt runs, M+, whatever your guild does
                outside of raid. The friendships that keep raiders are
                almost always built off-night.
              </li>
              <li>
                <strong>Check in after their first wipe night.</strong>{' '}
                Their first bad raid will happen. How you handle it
                shapes their impression of the guild for months. A casual
                &quot;tough night, we&apos;ll get them tomorrow&quot; in
                DMs goes a long way.
              </li>
            </ul>

            <h2>When You&apos;re Recruiting Constantly</h2>
            <p>
              If you&apos;re always recruiting, the problem isn&apos;t
              recruitment. It&apos;s retention. The leak is somewhere in
              your guild experience and the recruits coming in are
              washing back out before they ever stabilize.
            </p>
            <p>
              When that&apos;s happening, the answer isn&apos;t to post
              harder on the forums. It&apos;s to ask the last five people
              who left why they actually left, and listen for the patterns.
              Was it loot? Was it{' '}
              <a href="/blog/the-officer-burnout-problem-and-how-to-fix-it">
                officer behavior
              </a>? Was it raid leadership? Was it scheduling? Was it that
              your trial process made them feel disposable?
            </p>
            <p>
              Fix the leak. Then recruit. Otherwise you&apos;re pouring
              raiders into a bucket with a hole in the bottom and
              wondering why the bucket is always empty.
            </p>

            <h2>Recruitment Is Just the Beginning</h2>
            <p>
              The guilds with the strongest rosters aren&apos;t recruiting
              more aggressively than everyone else. They&apos;re writing
              clearer posts, asking sharper questions, running trials that
              feel like an actual welcome, and being honest about how
              their loot system works.
            </p>
            <p>
              <a href={APP_URL}>LootList+</a> handles the loot transparency
              part. Trials can see their score path the day they join,
              veterans can see exactly why they got an item or didn&apos;t,
              and officers spend less time defending decisions and more
              time actually leading raids. When the loot question
              answers itself, the rest of retention gets a lot easier.
            </p>
          </div>
        </div>
      </article>

      <BlogRelatedPosts currentSlug="guild-recruitment-guide-find-raiders-who-stay" />
      <LandingCTA />
      <LandingFooter />
    </main>
  )
}
