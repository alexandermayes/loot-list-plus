import type { Metadata } from 'next'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingCTA from '@/app/components/landing/LandingCTA'
import LandingFooter from '@/app/components/landing/LandingFooter'
import BlogRelatedPosts from '@/app/components/landing/BlogRelatedPosts'
import BlogTracker from '@/app/components/landing/BlogTracker'

export const metadata: Metadata = {
  title:
    'How to Onboard New Raiders Without Killing Morale | LootList+',
  description:
    'New raiders quit in the first two weeks more than at any other point. Here\'s how to run a guild onboarding process that keeps them excited instead of overwhelmed.',
  keywords: [
    'wow guild onboarding',
    'new raider trial period',
    'wow guild recruitment',
    'wow trial raider',
    'how to run a guild',
    'wow guild management',
    'guild morale',
    'wow raid roster',
    'loot list wow',
    'wow classic guild guide',
  ],
  alternates: {
    canonical:
      'https://www.getlootlist.com/blog/how-to-onboard-new-raiders-without-killing-morale',
  },
  openGraph: {
    title: 'How to Onboard New Raiders Without Killing Morale',
    description:
      'New raiders quit in the first two weeks more than at any other point. Here\'s how to onboard them without overwhelming them.',
    type: 'article',
    publishedTime: '2026-04-10T00:00:00Z',
    authors: ['LootList+'],
    url: 'https://www.getlootlist.com/blog/how-to-onboard-new-raiders-without-killing-morale',
  },
}

const APP_URL = 'https://www.lootlistplus.com'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Onboard New Raiders Without Killing Morale',
  description:
    'New raiders quit in the first two weeks more than at any other point. Here\'s how to run a guild onboarding process that keeps them excited instead of overwhelmed.',
  datePublished: '2026-04-10T00:00:00Z',
  dateModified: '2026-04-10T00:00:00Z',
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
      'https://www.getlootlist.com/blog/how-to-onboard-new-raiders-without-killing-morale',
  },
  wordCount: 1800,
  articleSection: 'Guild Management',
  keywords: [
    'wow guild onboarding',
    'new raider trial period',
    'wow guild recruitment',
    'wow trial raider',
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
      name: 'How to Onboard New Raiders Without Killing Morale',
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
        <BlogTracker slug="how-to-onboard-new-raiders-without-killing-morale" title="How to Onboard New Raiders Without Killing Morale" />
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
              How to Onboard New Raiders Without Killing Morale
            </h1>
            <p className="text-lg text-foreground-secondary leading-relaxed">
              Most new raiders decide whether they&apos;re staying in your
              guild before their second raid. The first two weeks are the
              highest-leverage moment in guild management, and most officers
              waste them on rules lectures and vibes.
            </p>
            <div className="flex items-center gap-4 mt-6 text-sm text-foreground-muted">
              <time dateTime="2026-04-10">April 10, 2026</time>
              <span>&middot;</span>
              <span>8 min read</span>
            </div>
          </header>

          {/* Content */}
          <div className="prose prose-invert prose-lg max-w-none [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:text-foreground-secondary [&_p]:leading-relaxed [&_p]:mb-4 [&_li]:text-foreground-secondary [&_li]:leading-relaxed [&_ul]:mb-4 [&_ol]:mb-4 [&_strong]:text-foreground [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent/80">
            <p>
              Recruit a new raider, invite them to Discord, link them the guild
              rules doc, and hope for the best. That&apos;s the standard
              onboarding flow in most Classic guilds, and it&apos;s why so many
              recruits ghost after their first or second raid. Not because your
              guild is bad. Because the first two weeks are confusing, lonely,
              and full of small moments where the new raider is silently
              deciding whether this is worth it.
            </p>
            <p>
              Onboarding is the part of guild management with the highest
              return on attention and the lowest amount of attention paid. A
              recruit who feels grounded by the end of week one will carry your
              roster for months. One who feels lost will quietly drop out, and
              you&apos;ll never get a clear answer about why.
            </p>

            <h2>Why New Raiders Quit</h2>
            <p>
              Before you fix anything, it helps to be honest about why recruits
              leave in the first two weeks. It&apos;s almost never the reason
              they give in a goodbye message. Here are the real ones.
            </p>

            <h3>They don&apos;t know anyone</h3>
            <p>
              A new raider joins a Discord full of inside jokes and long
              conversations about an officer drama they have no context for.
              Nobody greets them. Nobody pings them into a group. They sit in a
              voice channel on raid night listening to people call each other
              names they don&apos;t recognize. It&apos;s not hostile. It&apos;s
              just that everyone else already has their people.
            </p>

            <h3>They don&apos;t understand how loot works</h3>
            <p>
              You sent them the rules doc. They read it. They still don&apos;t
              know what it means in practice. When the first item drops, they
              have no idea whether they&apos;re supposed to roll, reserve,
              wait, speak up, or stay quiet. They pick wrong, get corrected,
              and now they feel stupid in front of strangers.
            </p>

            <h3>They can&apos;t see their progress</h3>
            <p>
              Your guild has a trial period. They don&apos;t know how long it
              is, what counts, or whether they&apos;re doing well. Is their
              parse good enough? Is their attendance being tracked? Are the
              officers even paying attention? When the feedback loop is
              invisible, raiders assume the worst.
            </p>

            <h3>Their first raid felt like an audition</h3>
            <p>
              Being benched on your first raid night tells a recruit they were
              brought in to fill a slot, not to be part of a team. So does
              sitting in voice while officers talk over them, or having their
              mistakes called out publicly while veterans get a pass for the
              same thing. Recruits notice. They don&apos;t always say anything.
              They just stop logging in.
            </p>

            <h2>What Onboarding Is Actually For</h2>
            <p>
              The goal of onboarding isn&apos;t to test whether a recruit is
              good enough. You already decided that when you invited them. The
              goal is to give them enough context, social footing, and
              confidence that they can be themselves by the end of week two.
            </p>
            <p>
              That means three things have to happen:
            </p>
            <ul>
              <li>
                <strong>They learn how your guild operates.</strong> Not just
                the rules, but the rhythm. When raids start, how pulls are
                called, how loot is distributed, what the loot chat shorthand
                means. The rules doc doesn&apos;t convey any of this.
              </li>
              <li>
                <strong>They meet actual people.</strong> Not the officer who
                interviewed them. Other raiders. Ideally a few, by name, in
                context. If they can ping one person the day after their first
                raid and ask a dumb question, you&apos;ve won.
              </li>
              <li>
                <strong>They can see where they stand.</strong> How long is
                the trial, what are officers watching, what&apos;s the bar for
                going full member. Raiders who can see the finish line tend to
                actually reach it.
              </li>
            </ul>

            <h2>A Week-One Playbook That Works</h2>
            <p>
              Here&apos;s what a good onboarding process looks like in practice.
              You don&apos;t have to do all of this, but the more of it you do,
              the better your retention gets.
            </p>

            <h3>Day zero: a real welcome</h3>
            <p>
              Before the recruit joins Discord, post a short message in your
              general channel: name, class, what they&apos;re known for, when
              they start. When they join, someone who isn&apos;t an officer
              should greet them. A recruit who hears from a regular raider in
              the first 24 hours treats the guild differently from one who
              only hears from officers.
            </p>
            <p>
              Pin a short onboarding message in a dedicated channel with the
              five things they actually need for their first raid: invite time,
              summon location, addons required, loot system in one sentence,
              and who to ping if they&apos;re stuck. Nothing more. Save the
              philosophy for later.
            </p>

            <h3>Before the first raid</h3>
            <p>
              Have them submit their loot list before they show up. This is
              the single highest-leverage thing you can do in their first week.
              Ranking their items forces them to think about what they
              actually want, which makes the first raid feel like a game plan
              instead of a lottery. It also gives officers something to react
              to, which is a much better first interaction than &quot;please
              read the rules doc.&quot;
            </p>
            <p>
              If you use a tool like <a href={APP_URL}>LootList+</a>, the new
              raider can set up their list themselves and see exactly how the
              scoring works before they ever pull a boss. The system does the
              explaining so an officer doesn&apos;t have to.
            </p>

            <h3>First raid: seat them, don&apos;t test them</h3>
            <p>
              Unless your roster physically cannot fit them, put the new
              raider in for the first pull. Sitting a recruit on night one
              sends a clear message: you&apos;re not one of us yet. The
              progression cost of one questionable DPS on a farm boss is
              basically zero. The morale cost of benching a new raider is
              enormous.
            </p>
            <p>
              Assign a buddy. An existing raider, not an officer, whose job is
              to answer questions in whispers during the raid and keep an eye
              on whether the new person looks lost. This is a low-effort ask
              for a veteran and a massive quality-of-life upgrade for the
              recruit.
            </p>
            <p>
              Call out one positive thing publicly after the raid. Not
              flattery. Something specific: a clean interrupt, a good
              positioning call, a correct defensive cooldown. Recruits
              remember the first time an officer said something nice about
              their play. It signals that they&apos;re being watched in a
              good way, not just being graded.
            </p>

            <h3>The first loot moment</h3>
            <p>
              The first time a new raider gets an item, or doesn&apos;t,
              shapes their entire relationship with your loot system. If they
              can see why they didn&apos;t win it, they accept it. If the
              decision looks arbitrary, they assume the system is rigged.
            </p>
            <p>
              This is why transparency matters more for new raiders than for
              anyone else. Veterans have trust banked up. Recruits don&apos;t.
              Any loot system that can&apos;t explain itself clearly to a new
              raider will produce churn. If the raider can pull up a score
              breakdown and see why the item went where it did, the drama
              never starts.
            </p>

            <h2>Trial Periods Done Right</h2>
            <p>
              Most guilds have a trial period. Most trial periods are vague,
              which defeats the point. A good trial is a contract: here&apos;s
              what we&apos;re looking for, here&apos;s how long you have to
              demonstrate it, here&apos;s what happens at the end.
            </p>
            <p>
              Three things a trial period needs:
            </p>
            <ol>
              <li>
                <strong>A fixed length.</strong> Two weeks, three weeks, a
                full tier. Whatever you pick, say it out loud on day one.
                Trial periods that quietly extend for months are a guild
                culture red flag.
              </li>
              <li>
                <strong>A specific bar.</strong> &quot;Good attitude and solid
                performance&quot; is not a bar. &quot;80% attendance in the
                trial window, keeping up on damage on your assigned role,
                and showing willingness to take feedback&quot; is a bar. The
                more specific, the less it feels like a popularity contest.
              </li>
              <li>
                <strong>A real decision at the end.</strong> Promote them,
                extend them with a clear reason, or cut them. What kills trust
                is trials that never end. Raiders who feel permanently on
                probation start looking for the exit.
              </li>
            </ol>
            <p>
              If your scoring system supports it, trial raiders should be able
              to see their own progress. Knowing their attendance is at 6 of 7
              raids and their trial window ends in one week is much better than
              guessing whether anyone is paying attention.
            </p>

            <h2>The Small Things That Add Up</h2>
            <p>
              A lot of onboarding is just the default behavior an officer
              builds into the first two weeks without having to think about it.
              Some things worth building in:
            </p>
            <ul>
              <li>
                <strong>Ping the new raider by name in voice once per raid.</strong>
                {' '}A simple &quot;hey, great kick there&quot; is worth more
                than any written welcome message.
              </li>
              <li>
                <strong>Include them in post-raid chat.</strong> If your guild
                hangs out for 15 minutes after clearing, the new raider should
                be invited, not awkwardly waiting for the summon that
                isn&apos;t coming.
              </li>
              <li>
                <strong>Send a quick check-in on day three.</strong> Something
                like, &quot;Hey, how&apos;s week one feeling? Anything
                confusing?&quot; The answers will tell you more about your
                guild than any exit survey.
              </li>
              <li>
                <strong>Don&apos;t schedule meetings.</strong> Recruits hate
                &quot;hop in voice so we can chat&quot; messages from
                officers. If you need to talk to them, do it in writing first.
              </li>
            </ul>

            <h2>When Onboarding Fails</h2>
            <p>
              If a recruit drops out in the first two weeks, the instinct is
              to assume they weren&apos;t a fit. Sometimes that&apos;s true.
              More often, something in the first week felt off to them and
              they couldn&apos;t articulate it. A short message to anyone who
              leaves early, asking what they would change about the first two
              weeks, will teach you more about your guild than a year of
              officer meetings.
            </p>
            <p>
              You don&apos;t need a full exit interview. Just: &quot;Hey, no
              hard feelings, would love any honest feedback on what didn&apos;t
              land.&quot; A surprising number of people will tell you.
            </p>

            <h2>The Bottom Line</h2>
            <p>
              Onboarding isn&apos;t a checklist. It&apos;s the set of small
              choices your officers make during a new raider&apos;s first week
              that decide whether they stay. Most of those choices cost
              nothing. Greet them by name, seat them in the first pull, give
              them a buddy, make the trial specific, and let them see where
              they stand.
            </p>
            <p>
              The guilds with the best retention aren&apos;t the ones with the
              strictest standards. They&apos;re the ones where a recruit feels
              grounded by day four and stops being a recruit, in their head,
              before the trial period is even over.
            </p>
            <p>
              Want to make the first week easier?{' '}
              <a href={APP_URL}>LootList+</a> handles trial tracking, visible
              scores, and transparent loot decisions, so new raiders can see
              exactly where they stand from day one. The system answers the
              hard questions so your officers don&apos;t have to.
            </p>
          </div>
        </div>
      </article>

      <BlogRelatedPosts currentSlug="how-to-onboard-new-raiders-without-killing-morale" />
      <LandingCTA />
      <LandingFooter />
    </main>
  )
}
