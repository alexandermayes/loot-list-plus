import type { Metadata } from 'next'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingCTA from '@/app/components/landing/LandingCTA'
import LandingFooter from '@/app/components/landing/LandingFooter'
import BlogRelatedPosts from '@/app/components/landing/BlogRelatedPosts'
import BlogTracker from '@/app/components/landing/BlogTracker'

export const metadata: Metadata = {
  title:
    'How to Handle Loot Drama Without Losing Raiders',
  description:
    'Loot drama kills more guilds than bad mechanics. Here\'s how to prevent it, defuse it when it happens, and build a system raiders actually trust.',
  keywords: [
    'wow loot drama',
    'wow guild drama loot',
    'how to handle loot drama wow',
    'wow classic loot dispute',
    'guild loot conflict',
    'wow loot system fairness',
    'wow guild officer loot tips',
    'prevent loot drama wow',
    'wow classic guild management',
    'loot council drama wow',
  ],
  alternates: {
    canonical:
      'https://www.getlootlist.com/blog/how-to-handle-loot-drama-without-losing-raiders',
  },
  openGraph: {
    title: 'How to Handle Loot Drama Without Losing Raiders',
    description:
      'Loot drama kills more guilds than bad mechanics. Here\'s how to prevent it, defuse it when it happens, and build a system raiders actually trust.',
    type: 'article',
    publishedTime: '2026-05-07T00:00:00Z',
    authors: ['LootList+'],
    url: 'https://www.getlootlist.com/blog/how-to-handle-loot-drama-without-losing-raiders',
  },
}

const APP_URL = 'https://www.lootlistplus.com'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'How to Handle Loot Drama Without Losing Raiders',
  description:
    'Loot drama kills more guilds than bad mechanics. Here\'s how to prevent it, defuse it when it happens, and build a system raiders actually trust.',
  datePublished: '2026-05-07T00:00:00Z',
  dateModified: '2026-05-07T00:00:00Z',
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
      'https://www.getlootlist.com/blog/how-to-handle-loot-drama-without-losing-raiders',
  },
  wordCount: 2100,
  articleSection: 'Guild Management',
  keywords: [
    'wow loot drama',
    'wow guild drama loot',
    'how to handle loot drama wow',
    'prevent loot drama wow',
    'wow classic guild management',
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
      name: 'How to Handle Loot Drama Without Losing Raiders',
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
        <BlogTracker slug="how-to-handle-loot-drama-without-losing-raiders" title="How to Handle Loot Drama Without Losing Raiders" />
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
              How to Handle Loot Drama Without Losing Raiders
            </h1>
            <p className="text-lg text-foreground-secondary leading-relaxed">
              A contested item drops. Two raiders both think they deserve
              it. One of them is about to be unhappy. What happens next
              determines whether your guild loses a raider, gains a grudge,
              or handles it clean and moves on. Here&apos;s how to be the
              guild that moves on.
            </p>
            <div className="flex items-center gap-4 mt-6 text-sm text-foreground-muted">
              <time dateTime="2026-05-07">May 7, 2026</time>
              <span>&middot;</span>
              <span>9 min read</span>
            </div>
          </header>

          {/* Content */}
          <div className="prose prose-invert prose-lg max-w-none [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:text-foreground-secondary [&_p]:leading-relaxed [&_p]:mb-4 [&_li]:text-foreground-secondary [&_li]:leading-relaxed [&_ul]:mb-4 [&_ol]:mb-4 [&_strong]:text-foreground [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent/80">
            <p>
              Loot drama has killed more guilds than Kael&apos;thas ever
              did. It&apos;s the reason officers dread certain drops. It&apos;s
              the reason raiders keep mental scorecards of who got what and
              when. It&apos;s the reason your best player whispers you after
              the raid to say they&apos;re &quot;thinking about their
              options.&quot;
            </p>
            <p>
              The thing about loot drama is that it almost never happens
              in the moment. The drop, the decision, the announcement.
              That takes 30 seconds. The drama happens in the two hours
              after the raid, in Discord DMs, in whisper chains between
              raiders who feel like the system screwed them. By the time
              you hear about it, the damage is already done.
            </p>

            <h2>Why Loot Drama Happens</h2>
            <p>
              It&apos;s easy to blame the raiders. &quot;They&apos;re being
              entitled.&quot; Sometimes that&apos;s true. But most loot
              drama comes from structural problems, not personality
              problems. Fix the structure and the drama drops to near zero.
            </p>

            <h3>The system is opaque</h3>
            <p>
              If a raider can&apos;t see why they lost an item, they fill
              in the blanks themselves. And they always fill them in badly.
              &quot;The loot officer gave it to their friend.&quot;
              &quot;Council is biased toward melee.&quot; &quot;I&apos;ve
              been here longer and I got nothing.&quot; These might all be
              wrong, but if the raider can&apos;t verify that, the
              suspicion festers.
            </p>
            <p>
              Transparency is the single most effective drama prevention
              tool. When every raider can see{' '}
              <a href="/blog/loot-priority-lists-vs-loot-council">
                the scores, the rankings, and the math
              </a>, there&apos;s nothing to speculate about. The system
              made the call. You can disagree with the system, but you
              can&apos;t accuse it of favoritism.
            </p>

            <h3>The rules changed mid-tier</h3>
            <p>
              Nothing destroys trust faster than a rule change that
              benefits someone specific. &quot;We&apos;re adding a new
              priority for tanks this phase&quot; sounds reasonable until
              the main tank is an officer who just happens to want the
              next big weapon drop. Even if the change is genuinely good
              for the guild, the timing makes it look corrupt.
            </p>
            <p>
              Rule changes should happen between tiers, not during them.
              If you absolutely must change something mid-tier, post it
              publicly, explain why, and show that it doesn&apos;t
              retroactively benefit anyone on the council.
            </p>

            <h3>Someone feels invisible</h3>
            <p>
              The raider who shows up every week, never complains, and
              quietly does their job is the most dangerous person to
              ignore. They don&apos;t cause drama because they&apos;re
              not the type. But when they finally lose an item to someone
              with worse attendance, they don&apos;t argue about it in
              Discord. They just stop signing up. You lose them without
              a fight because there was never a fight to have.
            </p>
            <p>
              Systems that reward{' '}
              <a href="/blog/why-attendance-tracking-matters-more-than-loot-rules">
                consistent attendance
              </a>{' '}
              prevent this. When showing up every week translates directly
              to loot priority, the quiet reliable raider knows their
              effort is recognized. They don&apos;t need to ask for it.
            </p>

            <h2>The 5 Most Common Loot Disputes (and How to Handle Each)</h2>

            <h3>1. &quot;I&apos;ve been here longer, I should get priority&quot;</h3>
            <p>
              This is a fairness argument, and it&apos;s not unreasonable.
              The fix: make tenure visible in the system. If your scoring
              includes attendance over a rolling window, long-tenured
              raiders naturally accumulate priority. Show them the numbers.
              If they&apos;ve genuinely attended more, they&apos;ll see
              it reflected. If they haven&apos;t, the numbers make the
              case for you.
            </p>

            <h3>2. &quot;That item is a bigger upgrade for me&quot;</h3>
            <p>
              This is the classic council debate. One player argues the
              item is a 15% upgrade for them and a 5% sidegrade for the
              other person. The problem: you can&apos;t adjudicate
              everyone&apos;s gear assessment in real time.
            </p>
            <p>
              With a priority list system, this resolves itself. If the
              item is truly more important to the first raider, they
              ranked it higher. If they didn&apos;t, that&apos;s on them.
              The system respects what raiders said they wanted, not what
              they claim after the fact.
            </p>

            <h3>3. &quot;The officers always gear themselves first&quot;</h3>
            <p>
              This accusation sticks because it&apos;s sometimes true and
              always hard to disprove. Even fair councils look suspicious
              when officers consistently receive loot early in a tier.
            </p>
            <p>
              The fix is structural: use a system where officer loot
              decisions are visible to the guild. If scores determine the
              outcome, anyone can verify. Some guilds go further and have
              officers sit out of council votes for items they want.
              Either way, the answer is transparency, not trust.
            </p>

            <h3>4. &quot;I didn&apos;t know that item was available&quot;</h3>
            <p>
              This happens when the loot system isn&apos;t self-service.
              If wishlists are collected via DMs or a spreadsheet that
              not everyone checks, some raiders miss items they would have
              ranked highly. They find out after the item goes to someone
              else.
            </p>
            <p>
              The fix: make the item database browsable and let raiders
              manage their own lists. When every item is visible and every
              raider can rank whatever they want, nobody can claim they
              didn&apos;t know.
            </p>

            <h3>5. &quot;The new trial got loot before me&quot;</h3>
            <p>
              Trials getting loot before veterans is a lightning rod for
              drama. Some guilds ban trial loot entirely; others give
              trials full access. Both extremes create problems (trials
              with no incentive to stay vs. veterans feeling disrespected).
            </p>
            <p>
              The middle ground: trials can rank items but take a score
              penalty that decays over time. They can still win
              uncontested items, but in a head-to-head with a veteran of
              equal attendance, the veteran wins. The penalty is visible,
              the trial knows exactly when it expires, and veterans can
              see it&apos;s there.
            </p>

            <h2>How to Defuse Drama After It Starts</h2>
            <p>
              Prevention is better, but sometimes you&apos;re already in
              the middle of it. A raider is upset, they&apos;re venting
              in officer chat or DMs, and you need to handle it before
              it spreads.
            </p>

            <h3>Respond fast</h3>
            <p>
              The longer a grievance sits unanswered, the worse it gets.
              The raider starts talking to other raiders. The narrative
              calcifies. A 30-minute response window is the difference
              between a conversation and a faction war. You don&apos;t
              need a perfect answer. You need acknowledgment: &quot;I
              hear you, let me look at the numbers and get back to
              you.&quot;
            </p>

            <h3>Show the data</h3>
            <p>
              If your system is transparent, the data is your best
              argument. Pull up the score comparison. Show both
              candidates&apos; rankings, attendance, and modifiers. Walk
              through why the system produced this outcome. Most raiders
              accept the result once they understand how it was calculated.
              The ones who don&apos;t are usually arguing with the rules,
              not the outcome, and that&apos;s a conversation you can
              have between tiers.
            </p>

            <h3>Don&apos;t overturn decisions</h3>
            <p>
              If you reverse a loot decision because someone complained,
              you&apos;ve just taught the guild that complaining works.
              Every future decision will be contested. Stand by the
              system unless there was a genuine error (wrong score,
              misidentified item, officer mistake). If the system worked
              as intended and the outcome is unpopular, the conversation
              is about changing the rules for next time, not undoing this
              decision.
            </p>

            <h3>Follow up privately</h3>
            <p>
              After the initial conversation, check in with the
              unhappy raider a day or two later. Not about the item.
              About them. &quot;How are you feeling about things?&quot;
              This small gesture prevents the slow disengagement that
              costs you a raider three weeks later. Most people just want
              to know someone noticed they were upset.
            </p>

            <h2>Building a Drama-Resistant System</h2>
            <p>
              The best way to handle loot drama is to build a system where
              it rarely happens. That system has three properties:
            </p>
            <ul>
              <li>
                <strong>Transparent.</strong> Every score, every ranking,
                every attendance record is visible to every raider. No
                black boxes, no &quot;trust the council.&quot;
              </li>
              <li>
                <strong>Self-service.</strong> Raiders manage their own
                lists. They can see what they&apos;re competing for and
                against whom. No surprises.
              </li>
              <li>
                <strong>Consistent.</strong> The same rules apply to
                everyone, every week, regardless of who&apos;s on council
                that night. A system that produces different outcomes
                depending on which officer is running it isn&apos;t a
                system. It&apos;s a coin flip.
              </li>
            </ul>
            <p>
              <a href={APP_URL}>LootList+</a> is built around these three
              principles. Raiders rank their own items, scores calculate
              from attendance and ranking data, and every decision is
              visible to the guild with a full score breakdown. When
              someone asks &quot;why didn&apos;t I get that item?&quot;
              the answer is one click away. That click is the difference
              between drama and a shrug.
            </p>
          </div>
        </div>
      </article>

      <BlogRelatedPosts currentSlug="how-to-handle-loot-drama-without-losing-raiders" />
      <LandingCTA />
      <LandingFooter />
    </main>
  )
}
