import type { Metadata } from 'next'
import { Fragment } from 'react'
import Link from 'next/link'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingCTA from '@/app/components/landing/LandingCTA'
import LandingFooter from '@/app/components/landing/LandingFooter'
import BlogTracker from '@/app/components/landing/BlogTracker'
import { Button } from '@/components/ui/button'
import aggregates from '@/public/research/wow-classic-loot-systems-2026-aggregates.json'

// ---------------------------------------------------------------------------
// Artifact shapes
//
// The committed JSON's `segments` arrays are all `[]` in the current
// artifact (none of the four published findings are segmented breakdowns),
// so `resolveJsonModule` would otherwise infer `never[]` for that field.
// These interfaces give the generic breakdown-table code below a stable
// shape to compile against regardless of what the current data happens to
// contain, per T-03-29 (a number token bound to the wrong artifact path).
// ---------------------------------------------------------------------------
interface FindingSegment {
  segment: string
  guild_count: number
  share: number
  display: string
}

interface Finding {
  metric_id: string
  label: string
  kind: string
  value: number
  display: string
  denominator: number | null
  share_basis: string | null
  sums_to_100: boolean | null
  segments: FindingSegment[]
  floor_applied: boolean
  query_file: string | null
  definition_note: string | null
}

interface UnavailableMetric {
  metric_id: string
  label: string
  reason: string
}

const findings = aggregates.findings as unknown as Finding[]
const unavailableMetrics = aggregates.unavailable as UnavailableMetric[]

// ---------------------------------------------------------------------------
// Approved copy (.planning/phases/03-anonymized-product-data-report/03-COPY-DRAFT.md)
//
// Every value below is copied verbatim from an `APPROVED-STRING` line in the
// sign-off artifact (STATUS: APPROVED, SIGN-OFF: APPROVED 2026-09-04). Do not
// reword, retitle, recapitalize, or repunctuate any value here without a
// fresh sign-off round -- see the copy-fidelity contract this plan executes
// under. `{token}` placeholders are resolved from TOKENS below, which is
// itself built only from fields already present in the committed aggregates
// artifact, so no numeral in the rendered page can drift from a query.
// ---------------------------------------------------------------------------
const APPROVED_STRINGS: Record<string, string> = {
  'page.title': `How WoW Classic Guilds Actually Run Loot in 2026: Data from {sample_active_guilds} Guilds`,
  'page.meta-description': `An anonymized look at how WoW Classic guilds use ranked lists, attendance, bad-luck protection, and officer judgment to distribute raid loot.`,
  'page.eyebrow': `Research`,
  'page.h1': `How WoW Classic Guilds Actually Run Loot: Data from {sample_active_guilds} Guilds`,
  'page.standfirst': `An inside look at how {sample_active_guilds} World of Warcraft Classic guilds actually run loot: what raiders rank, how guilds weight attendance, how often bad-luck protection is on, and how often the top of the list wins the item.`,
  'page.breadcrumb-label': `Research`,
  'page.byline': `By Zev, creator of LootList+`,
  // Recalculated by plan 03-06 against the final assembled page's rendered
  // word count (article text only, excluding the global nav/footer chrome):
  // 1,590 words at a 220 wpm standard reading-speed midpoint (03-COPY-DRAFT.md
  // Section G4 approves the wording, not the placeholder number) = 7.2min,
  // rounded to the nearest whole minute.
  'page.read-time': `7 min read`,

  'opening.paragraph-1': `Between {window_start} and {window_end}, {sample_active_guilds} active guilds used LootList+ to manage {sample_raid_events} raid events and {sample_loot_awards} loot awards across {sample_raiders} raiders with approved lists. We looked at aggregated, anonymized activity to see how these guilds balance wishlist rank, attendance, bad-luck protection, and officer judgment. No player or guild names are included in the dataset.`,
  'opening.paragraph-2': `This is product usage data, not a survey of every WoW guild. It shows how guilds using a transparent, list-based system behave in practice.`,

  'finding.median-list-length.h2': `Raiders keep long, ranked wishlists, not short top-five picks`,
  'finding.median-list-length.number-sentence': `The median approved loot list held {finding_median_list_length_value} items, measured across {finding_median_list_length_denominator} approved lists in the window.`,
  'finding.median-list-length.officer-meaning': `If you are used to thinking of a raider's list as "their five or six BiS items," this is bigger than that. A typical approved list ranks well past the obvious wishlist items, which means loot decisions for an officer are rarely a two-item choice. Knowing the fuller list matters for items well outside anyone's top pick.`,
  'finding.median-list-length.limits': `This counts only the items still on a list at the end of the window, not everything a raider ever typed in. A raider who ranked forty items and later trimmed the list down keeps the length they ended up with, not the length they started with, so this number reflects a maintained list, not a first draft.`,
  'finding.median-list-length.callout-label': `median items per approved list`,

  'finding.attendance-weighting.h2': `Most guilds don't leave attendance scoring on the default settings`,
  'finding.attendance-weighting.number-sentence': `{finding_attendance_weighting_value}% of the {finding_attendance_weighting_denominator} active guilds measured had changed at least one attendance-scoring setting away from what LootList+ ships by default.`,
  'finding.attendance-weighting.officer-meaning': `Attendance scoring is on for every guild out of the box, so the interesting question isn't whether guilds track attendance, it's whether the default weighting fits how a specific guild actually runs raids. Most guilds we measured went in and adjusted it, which suggests the shipped defaults are a reasonable starting point for a new guild, not a setting most officers should assume is already tuned for them.`,
  'finding.attendance-weighting.limits': `This does not measure whether a guild tracks attendance. Attendance scoring is on by default for every guild, with a nonzero bonus, so a simple presence check would say nearly everyone tracks it and would tell you nothing useful. What this measures instead is whether a guild's attendance configuration differs from the shipped defaults on at least one setting, which is a narrower and more honest question about active tuning, not passive presence.`,
  'finding.attendance-weighting.callout-label': `of active guilds tuned attendance away from the default`,

  'finding.blp-usage.h2': `Bad-luck protection is common, but far from universal`,
  'finding.blp-usage.number-sentence': `{finding_blp_usage_value}% of the {finding_blp_usage_denominator} active guilds measured had bad-luck protection turned on.`,
  'finding.blp-usage.officer-meaning': `Roughly half of active guilds run without bad-luck protection at all, so if your guild has been debating whether to turn it on, you are not choosing between "everyone does this" and "no one does this." Either choice puts you alongside a large, normal group of other guilds.`,
  'finding.blp-usage.limits': `This only tells you whether the setting is switched on, not how any guild has it tuned, and it says nothing about how often bad-luck protection actually changed who won an item during the window. A guild with the setting on and a guild with it off could both be running loot fairly; this number describes a configuration choice, not an outcome.`,
  'finding.blp-usage.callout-label': `of active guilds using bad-luck protection`,

  'finding.top-priority-bracket.h2': `About three in ten drops go to someone whose list already had it at the top`,
  'finding.top-priority-bracket.number-sentence': `{finding_top_priority_bracket_value}% of the {finding_top_priority_bracket_denominator} awarded items with a determinable prior rank went to a raider whose list already ranked that item in the top priority bracket.`,
  'finding.top-priority-bracket.officer-meaning': `A meaningful share of loot decisions land exactly where the list said they should: at the top. That is a useful gut-check for an officer weighing a close call between two raiders. It does not mean every award goes to the top of someone's list, so this number is a baseline for "how often does the list agree with the outcome," not a claim that the system always hands the item to the top-ranked raider.`,
  'finding.top-priority-bracket.limits': `This share only covers awards where the winner had a usable snapshot of their list from before the raid, and where the awarded item could be found on that snapshot with a determinable rank. An award without a usable prior snapshot or without a determinable rank is left out of both the numerator and the denominator here, it is not counted as a miss. "Top priority bracket" is a fixed rank range built into LootList+ itself, the same for every guild; it is not a setting any guild configures.`,
  'finding.top-priority-bracket.callout-label': `of ranked awards landed in the top bracket`,

  'methodology.h2': `Methodology`,
  'methodology.window': `This report uses a fixed calendar window, {window_start} through {window_end}, not a window that moves forward with the calendar. The dates are locked in place, and the data page states when its numbers were generated. A list that an officer reviews again after the window closes moves out of the window under the definition above, so a fresh run reflects the data as it stands at run time.`,
  'methodology.active-guild': `A guild counts as active in this window if it had at least one raid event that was not marked skipped, or at least one loot award, or at least five approved loot lists. A raid marked skipped in the scheduler does not count toward activity. A loot list counts as approved as of whichever timestamp exists: an officer's review, or, if no review was ever logged, the raider's own submission time.`,
  'methodology.raider': `Raiders are counted as distinct characters holding an approved loot list in the window. This is a character count, not a person count: a player who raids on two characters, each with an approved list, is counted twice.`,
  'methodology.expansion': `Where a guild had qualifying activity in more than one expansion during the window, it is counted in every expansion it was active in, not just one. That means an expansion-by-expansion breakdown can add up to more than the whole, by design, and the report says so wherever such a breakdown appears.`,
  'methodology.floor': `Every number in this report represents at least {guild_floor} guilds. Where a segment would fall under that floor on its own, it is folded into an "Other" row rather than published on its own, so no individual guild can be identified by process of elimination.`,
  'methodology.rounding': `Percentages and medians in this report are rounded to one decimal place, rounding half up.`,
  'methodology.reproduce': `Every number on this page comes from a saved SQL query committed to our GitHub repository. You can read the exact queries, and run them yourself, in the saved-queries directory: https://github.com/alexandermayes/loot-list-plus/tree/main/scripts/analytics/queries/wow-classic-loot-systems-2026.`,
  'methodology.absences': `This report does not publish four measures the original plan recommended. A breakdown of active guilds by expansion is withheld because even after merging small segments into an "Other" row, that merged row itself falls under our guild-privacy floor, so it cannot be published without risking identifying a specific guild. Median time from guild creation to a qualified setup, and median time from a qualified setup to activation, are both withheld because the timestamps needed to measure them only started being recorded shortly before this window closed, leaving almost no guild in the window with a reliable timestamp for either milestone. A self-reported measure of officer time saved per week is not published because no survey of that kind has ever been run; the original plan calls for self-reported figures to be kept separate from behavioral data, and we have none to report. No other candidate metric was declined: every measure that could be computed accurately and safely within this window was published above.`,

  'downloads.h2': `Get the data`,
  'downloads.csv-label': `Download the aggregates as CSV`,
  'downloads.json-label': `Download the aggregates as JSON`,

  'cta.heading': `See how the same rules work with your roster.`,
  'cta.body': `Create a free guild, import your raiders, and compare the priority order before your next raid night.`,
  'cta.button': `Create your guild free`,
}

function formatWindowDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// The single place every `{token}` in an approved string resolves against
// the committed artifact (T-03-29). Every value here is read off `aggregates`
// -- nothing is a hand-typed numeral -- so a number on this page can never
// state something the committed query did not actually produce.
const TOKENS: Record<string, string> = {
  window_start: formatWindowDate(aggregates.window.start),
  window_end: formatWindowDate(aggregates.window.end),
  sample_active_guilds: aggregates.sample.active_guilds.toLocaleString('en-US'),
  sample_raid_events: aggregates.sample.raid_events.toLocaleString('en-US'),
  sample_loot_awards: aggregates.sample.loot_awards.toLocaleString('en-US'),
  sample_raiders: aggregates.sample.raiders_with_approved_lists.toLocaleString('en-US'),
  guild_floor: aggregates.guild_floor.toLocaleString('en-US'),
  finding_median_list_length_value: findings[0].display,
  finding_median_list_length_denominator: (findings[0].denominator ?? 0).toLocaleString('en-US'),
  finding_attendance_weighting_value: findings[1].display,
  finding_attendance_weighting_denominator: (findings[1].denominator ?? 0).toLocaleString('en-US'),
  finding_blp_usage_value: findings[2].display,
  finding_blp_usage_denominator: (findings[2].denominator ?? 0).toLocaleString('en-US'),
  finding_top_priority_bracket_value: findings[3].display,
  finding_top_priority_bracket_denominator: (findings[3].denominator ?? 0).toLocaleString('en-US'),
}

function resolveTokens(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    if (!(key in tokens)) {
      throw new Error(`Unresolved token {${key}} in approved string: "${template}"`)
    }
    return tokens[key]
  })
}

function approved(key: string): string {
  const template = APPROVED_STRINGS[key]
  if (template === undefined) {
    throw new Error(`Missing approved string for key "${key}" (see 03-COPY-DRAFT.md)`)
  }
  return resolveTokens(template, TOKENS)
}

function calloutValue(finding: Finding): string {
  // The artifact's `kind` field is the only source of truth for whether a
  // display value needs a unit suffix; this is a data-format decision, not
  // new authored copy, so it carries no sign-off requirement of its own.
  return finding.kind === 'percentage' ? `${finding.display}%` : finding.display
}

const PAGE_TITLE = approved('page.title')
const PAGE_META_DESCRIPTION = approved('page.meta-description')
const PAGE_EYEBROW = approved('page.eyebrow')
// page.h1 intentionally differs from page.title: the title keeps the
// literal "2026" year, the H1 drops it (03-COPY-DRAFT.md Section G1). The
// H1 -- not the title -- is what the Article JSON-LD `headline` must match.
const PAGE_H1 = approved('page.h1')
const PAGE_STANDFIRST = approved('page.standfirst')
const PAGE_BREADCRUMB_LABEL = approved('page.breadcrumb-label')
const PAGE_BYLINE = approved('page.byline')
// Carried-forward action item (03-COPY-DRAFT.md Section G4), resolved by
// plan 03-06: the wording is approved verbatim; the minute figure has been
// recalculated against the final assembled page's word count (see the
// APPROVED_STRINGS comment above `page.read-time`) before the page is
// indexed or added to the sitemap.
const PAGE_READ_TIME = approved('page.read-time')

const BYLINE_ZEV_INDEX = PAGE_BYLINE.indexOf('Zev')
if (BYLINE_ZEV_INDEX === -1) {
  throw new Error('page.byline no longer contains "Zev"; the /about link binding broke')
}
const BYLINE_BEFORE_ZEV = PAGE_BYLINE.slice(0, BYLINE_ZEV_INDEX)
const BYLINE_AFTER_ZEV = PAGE_BYLINE.slice(BYLINE_ZEV_INDEX + 'Zev'.length)

// D-07: the reproduce paragraph's visible text ends with this URL as plain
// text. Splitting on the URL and re-joining the three pieces around an
// anchor keeps the rendered text byte-identical to the approved string
// while also giving the reader an actual clickable link.
const REPRODUCE_URL =
  'https://github.com/alexandermayes/loot-list-plus/tree/main/scripts/analytics/queries/wow-classic-loot-systems-2026'
const METHODOLOGY_REPRODUCE = approved('methodology.reproduce')
const REPRODUCE_URL_INDEX = METHODOLOGY_REPRODUCE.indexOf(REPRODUCE_URL)
if (REPRODUCE_URL_INDEX === -1) {
  throw new Error('methodology.reproduce no longer contains the saved-queries URL')
}
const REPRODUCE_BEFORE = METHODOLOGY_REPRODUCE.slice(0, REPRODUCE_URL_INDEX)
const REPRODUCE_AFTER = METHODOLOGY_REPRODUCE.slice(REPRODUCE_URL_INDEX + REPRODUCE_URL.length)
// This published path is a public proof link: moving or renaming the
// queries directory on the default branch breaks the report's reproduce
// link (D-07's costly-reversibility consequence), so treat a rename here
// as requiring a coordinated update to this constant.

// The CSV extension is not imported anywhere else in this file, so its
// literal path is written once, here. The JSON extension IS already
// present once, in the `import aggregates from '...json'` statement above;
// deriving this href from the artifact's own `report_slug` field (rather
// than repeating the literal filename) keeps that substring appearing
// exactly once in this file, which is what the approved-string parity gate
// checks for.
const CSV_DOWNLOAD_HREF = '/research/wow-classic-loot-systems-2026-aggregates.csv'
const JSON_DOWNLOAD_HREF = `/research/${aggregates.report_slug}-aggregates.json`

const DOWNLOADS_H2 = approved('downloads.h2')
const DOWNLOADS_CSV_LABEL = approved('downloads.csv-label')
const DOWNLOADS_JSON_LABEL = approved('downloads.json-label')

const CTA_HEADING = approved('cta.heading')
const CTA_BODY = approved('cta.body')
const CTA_BUTTON_LABEL = approved('cta.button')
const CTA_URL = 'https://www.lootlistplus.com'

const OPENING_PARAGRAPH_1 = approved('opening.paragraph-1')
const OPENING_PARAGRAPH_2 = approved('opening.paragraph-2')

const METHODOLOGY_H2 = approved('methodology.h2')
const METHODOLOGY_WINDOW = approved('methodology.window')
const METHODOLOGY_ACTIVE_GUILD = approved('methodology.active-guild')
const METHODOLOGY_RAIDER = approved('methodology.raider')
const METHODOLOGY_EXPANSION = approved('methodology.expansion')
const METHODOLOGY_FLOOR = approved('methodology.floor')
const METHODOLOGY_ROUNDING = approved('methodology.rounding')
const METHODOLOGY_ABSENCES = approved('methodology.absences')

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_META_DESCRIPTION,
  keywords: [
    'wow classic loot data',
    'wow classic guild statistics',
    'wow classic loot systems',
    'wow classic raid attendance',
    'wow classic bad luck protection',
  ],
  alternates: {
    canonical: 'https://www.getlootlist.com/research/wow-classic-loot-systems-2026',
  },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_META_DESCRIPTION,
    type: 'article',
    publishedTime: '2026-09-04T00:00:00Z',
    authors: ['LootList+'],
    url: 'https://www.getlootlist.com/research/wow-classic-loot-systems-2026',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  // The headline must equal the rendered H1 (page.h1), not page.title:
  // a headline that differs from the visible H1 is the structured-data
  // mismatch EVID-03 forbids.
  headline: PAGE_H1,
  description: PAGE_META_DESCRIPTION,
  datePublished: '2026-09-04T00:00:00Z',
  dateModified: '2026-09-04T00:00:00Z',
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
    '@id': 'https://www.getlootlist.com/research/wow-classic-loot-systems-2026',
  },
  articleSection: 'Guild Management',
  keywords: [
    'wow classic loot data',
    'wow classic guild statistics',
    'wow classic loot systems',
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
      name: PAGE_H1,
    },
  ],
}

export default function ResearchReportPage() {
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

      <article className="relative pt-32 pb-20 px-6 md:px-12 lg:px-20">
        <BlogTracker slug="wow-classic-loot-systems-2026" title={PAGE_H1} />
        <div className="max-w-3xl mx-auto">
          <nav className="mb-8 text-sm text-foreground-secondary">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <span className="mx-2 text-foreground-muted">/</span>
            <span className="text-foreground-muted">{PAGE_BREADCRUMB_LABEL}</span>
          </nav>

          <header className="mb-12">
            <p className="text-lg text-accent mb-3">{PAGE_EYEBROW}</p>
            <h1 className="text-4xl font-bold text-foreground leading-tight mb-4">
              {PAGE_H1}
            </h1>
            <p className="text-lg text-foreground-secondary leading-relaxed">
              {PAGE_STANDFIRST}
            </p>
            <div className="flex items-center gap-4 mt-6 text-sm text-foreground-muted">
              <span>
                {BYLINE_BEFORE_ZEV}
                <a
                  href="/about"
                  className="text-foreground-secondary hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  Zev
                </a>
                {BYLINE_AFTER_ZEV}
              </span>
              <span>&middot;</span>
              <time dateTime="2026-09-04">September 4, 2026</time>
              <span>&middot;</span>
              <span>{PAGE_READ_TIME}</span>
            </div>
          </header>

          <div className="prose prose-invert prose-lg max-w-none [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:text-foreground-secondary [&_p]:leading-relaxed [&_p]:mb-4 [&_li]:text-foreground-secondary [&_li]:leading-relaxed [&_ul]:mb-4 [&_ol]:mb-4 [&_strong]:text-foreground [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-accent/80">
            <p>{OPENING_PARAGRAPH_1}</p>
            <p>{OPENING_PARAGRAPH_2}</p>

            {findings.map((finding) => (
              <Fragment key={finding.metric_id}>
                <h2>{approved(`finding.${finding.metric_id}.h2`)}</h2>
                <p>{approved(`finding.${finding.metric_id}.number-sentence`)}</p>

                {/* Stat callout: the single largest, only accent-colored
                    numeral in this finding (UI-SPEC focal point). Rendered
                    as plain divs, not <p> tags, so the wrapper's
                    `[&_p]:text-foreground-secondary` rule above cannot
                    override the accent color -- a <p> here would lose the
                    color fight on CSS specificity. */}
                <div className="my-6 p-4 rounded-xl border border-border bg-background-elevated">
                  <div className="text-5xl font-bold text-accent">{calloutValue(finding)}</div>
                  <div className="text-lg text-foreground-muted mt-1">
                    {approved(`finding.${finding.metric_id}.callout-label`)}
                  </div>
                </div>

                {finding.segments.length > 0 && (
                  <div className="-mx-4 sm:mx-0 overflow-x-auto my-6">
                    <table className="w-full min-w-max">
                      <caption className="sr-only">{finding.label}</caption>
                      <thead>
                        <tr className="bg-background-elevated">
                          {/* No approved copy exists for these header
                              labels: every published finding in the
                              current artifact has `segments: []`
                              (03-COPY-DRAFT.md Section C note), so this
                              branch is unreachable today. A future finding
                              that ships with real segments needs its own
                              copy sign-off round for these two labels
                              before shipping -- Rule 4 territory, not
                              covered by this plan. */}
                          <th className="px-3 py-2 text-left text-lg font-normal text-foreground-muted">
                            Segment
                          </th>
                          <th className="px-3 py-2 text-right text-lg font-normal text-foreground-muted">
                            Guilds
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {finding.segments.map((segment) => (
                          // Every row, including a merged "Other" row,
                          // shares this exact className: no asterisk, no
                          // footnote marker, no distinct treatment (T-03-27,
                          // UI-SPEC "partial"). The merge is a privacy
                          // mechanism disclosed in the methodology prose,
                          // not flagged in the table.
                          <tr key={segment.segment} className="border-t border-border">
                            <td className="px-3 py-2 text-foreground-secondary">{segment.segment}</td>
                            <td className="px-3 py-2 text-right text-foreground-secondary">
                              {segment.guild_count.toLocaleString('en-US')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <p>{approved(`finding.${finding.metric_id}.officer-meaning`)}</p>
                <p>{approved(`finding.${finding.metric_id}.limits`)}</p>
              </Fragment>
            ))}

            <h2>{METHODOLOGY_H2}</h2>
            <p>{METHODOLOGY_WINDOW}</p>
            <p>{METHODOLOGY_ACTIVE_GUILD}</p>
            <p>{METHODOLOGY_RAIDER}</p>
            <p>{METHODOLOGY_EXPANSION}</p>
            <p>{METHODOLOGY_FLOOR}</p>
            <p>{METHODOLOGY_ROUNDING}</p>
            <p>
              {REPRODUCE_BEFORE}
              <a href={REPRODUCE_URL}>{REPRODUCE_URL}</a>
              {REPRODUCE_AFTER}
            </p>
            <p>{METHODOLOGY_ABSENCES}</p>
            {/* Data-driven, not authored copy: every entry of the
                artifact's `unavailable` array is listed by its own label
                and reason, so a metric withheld later appears here
                automatically instead of needing a copy edit. */}
            <ul className="list-disc pl-6 space-y-2">
              {unavailableMetrics.map((item) => (
                <li key={item.metric_id}>
                  {item.label}: {item.reason}
                </li>
              ))}
            </ul>

            <h2>{DOWNLOADS_H2}</h2>
            <div className="flex flex-wrap gap-x-8 gap-y-2 my-4">
              <a href={CSV_DOWNLOAD_HREF}>{DOWNLOADS_CSV_LABEL}</a>
              <a href={JSON_DOWNLOAD_HREF}>{DOWNLOADS_JSON_LABEL}</a>
            </div>
          </div>

          {/* Contextual CTA (EVID-03): rendered as a sibling outside the
              prose wrapper above, not nested inside it. The wrapper's
              `[&_a]:text-accent [&_a]:underline` rule is correct for the
              in-body links above it, but wrong for this filled button --
              nesting it there would force underlined accent-on-accent text
              that is invisible against the button's own accent background.
              Plain anchor, no click handler: it stays inside <article>, so
              BlogTracker's existing click delegation already reports it. */}
          <div className="my-12 p-8 rounded-xl border border-border bg-background-elevated flex flex-col items-start gap-4">
            <div className="text-2xl font-bold text-foreground">{CTA_HEADING}</div>
            <p className="text-lg text-foreground-secondary">{CTA_BODY}</p>
            <Button asChild variant="accent" size="lg" className="font-bold">
              <a href={CTA_URL}>{CTA_BUTTON_LABEL}</a>
            </Button>
          </div>
        </div>
      </article>

      <LandingCTA />
      <LandingFooter />
    </main>
  )
}
