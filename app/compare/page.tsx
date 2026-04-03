import type { Metadata } from 'next'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingCTA from '@/app/components/landing/LandingCTA'
import LandingFooter from '@/app/components/landing/LandingFooter'

export const metadata: Metadata = {
  title: 'LootList+ vs TMB, DKP, EPGP, and Loot Council | LootList+',
  description:
    'An honest comparison of WoW Classic loot systems. See how LootList+ stacks up against That\'s My BiS, DKP, EPGP, and traditional loot council.',
  keywords: [
    'lootlist vs tmb',
    'thatsmybis alternative',
    'wow loot system comparison',
    'dkp vs epgp vs loot council',
    'best wow classic loot system',
    'wow guild loot management',
    'loot priority list wow',
  ],
  alternates: {
    canonical: 'https://www.getlootlist.com/compare',
  },
  openGraph: {
    title: 'LootList+ vs TMB, DKP, EPGP, and Loot Council',
    description:
      'An honest comparison of WoW Classic loot systems. See how LootList+ stacks up against the alternatives.',
    type: 'article',
    url: 'https://www.getlootlist.com/compare',
  },
}

const APP_URL = 'https://www.lootlistplus.com'

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'LootList+ vs TMB, DKP, EPGP, and Loot Council',
  description:
    'An honest comparison of WoW Classic loot systems. See how LootList+ stacks up against the alternatives.',
  datePublished: '2026-04-03T00:00:00Z',
  dateModified: '2026-04-03T00:00:00Z',
  author: {
    '@type': 'Person',
    name: 'Zev',
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
    '@id': 'https://www.getlootlist.com/compare',
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
      name: 'Compare Loot Systems',
    },
  ],
}

// Feature comparison data
type CellValue = boolean | string
interface Feature {
  name: string
  lootlist: CellValue
  tmb: CellValue
  dkp: CellValue
  epgp: CellValue
  council: CellValue
}

const features: Feature[] = [
  { name: 'Ranked loot lists', lootlist: true, tmb: true, dkp: false, epgp: false, council: false },
  { name: 'Automated scoring formula', lootlist: true, tmb: false, dkp: true, epgp: true, council: false },
  { name: 'Built-in attendance tracking', lootlist: true, tmb: false, dkp: false, epgp: false, council: false },
  { name: 'Attendance affects loot priority', lootlist: true, tmb: false, dkp: true, epgp: true, council: false },
  { name: 'Score breakdown per item', lootlist: true, tmb: false, dkp: false, epgp: false, council: false },
  { name: 'Bad luck protection', lootlist: true, tmb: false, dkp: false, epgp: false, council: false },
  { name: 'Bracket system with guardrails', lootlist: true, tmb: false, dkp: false, epgp: false, council: false },
  { name: 'Master Sheet (compiled rankings)', lootlist: true, tmb: false, dkp: false, epgp: false, council: false },
  { name: 'First-party in-game addon', lootlist: true, tmb: 'third-party', dkp: true, epgp: true, council: false },
  { name: 'Free to use', lootlist: true, tmb: true, dkp: true, epgp: true, council: true },
]

function Check() {
  return <span className="text-emerald-400 text-lg">&#10003;</span>
}
function Cross() {
  return <span className="text-red-400/60 text-lg">&#10005;</span>
}
function Partial({ label }: { label: string }) {
  return <span className="text-yellow-400 text-xs font-medium">{label}</span>
}

export default function ComparePage() {
  return (
    <main className="bg-background overflow-x-hidden">
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
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm text-foreground-secondary">
            <a href="/" className="hover:text-foreground transition-colors">Home</a>
            <span className="mx-2 text-foreground-muted">/</span>
            <span className="text-foreground-muted">Compare</span>
          </nav>

          {/* Header */}
          <header className="mb-16">
            <p className="text-sm font-medium text-accent mb-3">Comparison</p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight mb-4">
              How LootList+ compares to other loot systems
            </h1>
            <p className="text-lg text-foreground-secondary leading-relaxed">
              An honest look at the loot systems Classic guilds use today, what they get right, where they fall short, and why we built something different.
            </p>
          </header>

          {/* Comparison Chart */}
          <div className="mb-20">
            <h2 className="text-2xl font-bold text-foreground mb-2">Feature comparison</h2>
            <p className="text-foreground-secondary mb-8">How LootList+ stacks up against the most common loot systems in Classic.</p>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-background-subtle border-b border-border">
                    <th className="text-left py-3 px-4 font-semibold text-foreground min-w-[220px]">Feature</th>
                    <th className="text-center py-3 px-3 font-semibold text-accent min-w-[90px]">LootList+</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground-secondary min-w-[90px]">TMB</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground-secondary min-w-[90px]">DKP</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground-secondary min-w-[90px]">EPGP</th>
                    <th className="text-center py-3 px-3 font-semibold text-foreground-secondary min-w-[90px]">Loot Council</th>
                  </tr>
                </thead>
                <tbody>
                  {features.map((f, i) => (
                    <tr key={f.name} className={`border-b border-border/50 ${i % 2 === 0 ? 'bg-background' : 'bg-background-subtle/30'}`}>
                      <td className="py-3 px-4 text-foreground">{f.name}</td>
                      <td className="py-3 px-3 text-center">{f.lootlist === true ? <Check /> : f.lootlist === false ? <Cross /> : <Partial label={String(f.lootlist)} />}</td>
                      <td className="py-3 px-3 text-center">{f.tmb === true ? <Check /> : f.tmb === false ? <Cross /> : <Partial label={String(f.tmb)} />}</td>
                      <td className="py-3 px-3 text-center">{f.dkp === true ? <Check /> : f.dkp === false ? <Cross /> : <Partial label={String(f.dkp)} />}</td>
                      <td className="py-3 px-3 text-center">{f.epgp === true ? <Check /> : f.epgp === false ? <Cross /> : <Partial label={String(f.epgp)} />}</td>
                      <td className="py-3 px-3 text-center">{f.council === true ? <Check /> : f.council === false ? <Cross /> : <Partial label={String(f.council)} />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Q&A Interview */}
          <div className="prose prose-invert prose-lg max-w-none [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:text-foreground-secondary [&_p]:leading-relaxed [&_p]:mb-4 [&_li]:text-foreground-secondary [&_li]:leading-relaxed [&_ul]:mb-4 [&_ol]:mb-4 [&_strong]:text-foreground [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent/80">

            <h2>Q&A with Zev, creator of LootList+</h2>

            <p className="!text-foreground-muted !text-base !italic">
              Zev is a guild officer and raid lead who built LootList+ after years of managing loot across spreadsheets, Discord channels, and broken addon configs. Here&apos;s a straight conversation about why LootList+ exists and how it stacks up.
            </p>

            {/* Q1 */}
            <h3 className="!text-accent">
              Let&apos;s start with the obvious question. What&apos;s wrong with the loot systems guilds already use?
            </h3>
            <p>
              Nothing&apos;s &quot;wrong&quot; with them, they just solve part of the problem. DKP tracks attendance but creates hoarding. EPGP fixes hoarding but ignores what raiders actually want. Loot council gives officers total control but zero transparency. TMB lets raiders rank items but doesn&apos;t help you decide who gets what.
            </p>
            <p>
              Every guild I&apos;ve been in ended up duct-taping 2 or 3 of these together. TMB for wishlists, a spreadsheet for attendance, Discord for loot council discussions. It works until it doesn&apos;t, and it usually stops working when someone feels like they got screwed.
            </p>

            {/* Q2 */}
            <h3 className="!text-accent">
              So where does LootList+ fit?
            </h3>
            <p>
              LootList+ is the system I wished existed. Raiders rank the items they want, just like TMB. But then the system actually computes who should get each item based on their rank, attendance, guild rank, role, and other factors. Every raider can see their score, see how it&apos;s calculated, and understand exactly why they&apos;re #1 or #5 for a given item.
            </p>
            <p>
              It&apos;s the transparency of DKP, the wishlist functionality of TMB, and the flexibility of loot council, without the drama of any of them.
            </p>

            {/* Q3 */}
            <h3 className="!text-accent">
              What about TMB specifically? A lot of guilds use it and it works fine.
            </h3>
            <p>
              TMB is solid for what it does. If all you need is &quot;who wants this item,&quot; TMB answers that. But it stops there. When Thunderfury binding drops and 4 people have it ranked #1, TMB just shows you a list. Your officers still have to figure out who gets it, and that conversation happens in a Discord channel or someone&apos;s head.
            </p>
            <p>
              LootList+ shows you a score for each of those 4 people with a full breakdown. &quot;Player A has it ranked higher, has 95% attendance, and has been passed twice before. Player B ranked it lower and missed 3 raids last month.&quot; The decision still belongs to your officers, but now there&apos;s a framework backing it up. And when the raider who didn&apos;t get it asks why, you have an answer that isn&apos;t &quot;the officers decided.&quot;
            </p>

            {/* Q4 */}
            <h3 className="!text-accent">
              TMB doesn&apos;t track attendance at all?
            </h3>
            <p>
              No. If you use TMB, you need a separate system for attendance. Most guilds use a spreadsheet. Some use a DKP addon. Some just eyeball it. LootList+ tracks attendance natively with support for different statuses like attended, late, benched, excused, no-show. And it rolls directly into your loot score. Show up consistently, your score reflects it. Miss raids, same thing. No spreadsheet needed.
            </p>

            {/* Q5 */}
            <h3 className="!text-accent">
              What about DKP? Some guilds still swear by it.
            </h3>
            <p>
              DKP solved attendance back in 2005 and that part still works. The problem is the bidding and hoarding. Raiders sit on their points for months waiting for one specific item, then blow their whole stack. Meanwhile, upgrades that would&apos;ve helped the raid rot because nobody wants to &quot;waste&quot; DKP on them.
            </p>
            <p>
              LootList+ gives you the attendance tracking that makes DKP good without the point economy that makes it weird. Your score is computed, not spent. Getting an item doesn&apos;t drain a bank. It just updates your history and bad luck protection adjusts naturally.
            </p>

            {/* Q6 */}
            <h3 className="!text-accent">
              And EPGP?
            </h3>
            <p>
              EPGP fixed the hoarding problem by decaying points over time. Smart. But it still doesn&apos;t account for what raiders actually want. Two people with the same EP/GP ratio could both &quot;deserve&quot; an item equally, but one of them has it as their #1 priority and the other has it at #30. EPGP can&apos;t see that.
            </p>
            <p>
              LootList+ combines the decay concept (rolling attendance windows) with item-level priority (ranked lists). You get the fairness of EPGP with the specificity of wishlists.
            </p>

            {/* Q7 */}
            <h3 className="!text-accent">
              Some people just want pure loot council with no formulas. Isn&apos;t LootList+ too rigid for that?
            </h3>
            <p>
              Not really. The score is a recommendation, not a mandate. Officers still make the final call. But having a computed score means your loot council starts from data, not vibes. And every setting is configurable. You can adjust attendance weight, rank modifiers, role bonuses, bad luck protection, trial penalties. If you want a lighter touch, dial things down. The system adapts to how your guild runs, not the other way around.
            </p>
            <p>
              The guilds that tell me they don&apos;t need a formula are usually the same guilds that have loot drama in Discord after every raid night. A score doesn&apos;t remove officer judgment. It gives it a foundation.
            </p>

            {/* Q8 */}
            <h3 className="!text-accent">
              What about bad luck protection? That seems unique.
            </h3>
            <p>
              It is. If a raider has been passed on an item multiple times, their score for that item goes up automatically. It&apos;s a small incremental bonus, configurable, that prevents the &quot;I&apos;ve been waiting 3 months&quot; frustration. No other loot system I&apos;ve seen does this.
            </p>

            {/* Q9 */}
            <h3 className="!text-accent">
              What&apos;s the bracket system?
            </h3>
            <p>
              Raiders rank 50 items. The top slots are organized into brackets with allocation point limits. Reserved items (the big ones, weapons, tier tokens) cost more points. Limited items cost less. This forces raiders to make real choices instead of putting every weapon in their top 5. It mirrors how loot council officers think. &quot;You can&apos;t have everything, so tell me what you actually care about.&quot;
            </p>

            {/* Q10 */}
            <h3 className="!text-accent">
              What would you say to someone who&apos;s happy with their current system?
            </h3>
            <p>
              If your guild has zero loot drama, your officers aren&apos;t burned out, and nobody questions how decisions are made, keep doing what you&apos;re doing. But if you&apos;ve ever had a raider quit because they felt the system was unfair, or an officer spend an hour after raid explaining a loot decision, or you&apos;ve got 3 tabs of spreadsheets open during raid night, LootList+ is built for exactly that.
            </p>
            <p>
              It&apos;s free to try. Set up your guild, import your roster, and see what it looks like with real data. That&apos;s usually when it clicks.
            </p>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <p className="text-foreground-secondary mb-6">
              See it for yourself. Set up your guild in under 5 minutes.
            </p>
            <a
              href={APP_URL}
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white font-poppins font-semibold text-base text-black no-underline hover:bg-white/90 transition-colors"
            >
              Start for free
            </a>
          </div>
        </div>
      </article>

      <LandingCTA />
      <LandingFooter />
    </main>
  )
}
