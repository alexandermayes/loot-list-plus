import type { Metadata } from 'next'
import { Fragment } from 'react'
import Link from 'next/link'
import LandingNav from '@/app/components/landing/LandingNav'
import LandingCTA from '@/app/components/landing/LandingCTA'
import LandingFooter from '@/app/components/landing/LandingFooter'
import BlogTracker from '@/app/components/landing/BlogTracker'
import { QuoteCard } from '@/app/components/landing/LandingValueProps'
import { listRoutableCaseStudies, requireCaseStudy } from '@/data/case-studies'
import type { CaseStudy } from '@/data/case-studies/types'
import { ProofStrip, NarrativePanels, LimitationSection, ContextualCta, buildBylineMeta } from './sections'

// ---------------------------------------------------------------------------
// Approved copy (draft, this task only)
//
// These four templates are copy under sign-off, not final approved wording:
// this task exists to prove the whole architecture end to end on a dev-only
// fixture, ahead of the actual interview and the copy sign-off gate. The
// artifact of record for the final wording is 04-COPY-DRAFT.md; plan 04-03
// runs the parity gate over the full key set once real, interview-approved
// content exists. Every `{token}` below is normalized to a snake_case name
// (the sprint plan's human-readable brace labels, e.g. `{old system}`, are
// not valid `\w+` identifiers, so they are renamed here mechanically -- this
// is an identifier rename, not a change to any approved wording).
// ---------------------------------------------------------------------------
const APPROVED_STRINGS: Record<string, string> = {
  'page.title': `How {guild} Cut Weekly Loot Admin from {before_admin_time} to {after_admin_time}`,
  'page.h1-preferred': `How {guild} Cut Weekly Loot Admin from {before_admin_time} to {after_admin_time}`,
  'page.h1-fallback': `How {guild} Made Every Loot Decision Explainable`,
  'page.meta-description': `How {guild}, a {size}-player {expansion_tier} guild, replaced {old_process} with ranked lists, attendance-weighted scores, and visible loot decisions.`,
  'page.lead': `{guild} is a {size}-player {expansion_tier} guild. Before LootList+, its officers used {old_process}. The system took {old_process_cost} and created {old_process_failure}. After {time_period} with LootList+, the guild {verified_result}.`,
  'proofstrip.roster-caption': `Roster size`,
  'proofstrip.expansion-caption': `Expansion and tier`,
  'proofstrip.metric-caption': `Weekly admin time saved`,
  'proofstrip.tenure-caption': `Months using LootList+`,
  'narrative.before-label': `Before LootList+`,
  'narrative.after-label': `After LootList+`,
  'page.eyebrow': `Case Study`,
  'page.breadcrumb-label': `Customers`,
  'page.byline': `By Zev, creator of LootList+`,
  'limitation.h2': `What still needs work`,
  'cta.heading': `See how the same rules work with your roster.`,
  'cta.body': `Create a free guild, import your raiders, and compare the priority order before your next raid night.`,
  'cta.button': `Create your guild free`,
}

function resolveTokens(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => {
    if (!(key in tokens)) {
      throw new Error(`Unresolved token {${key}} in approved string: "${template}"`)
    }
    return tokens[key]
  })
}

function approved(key: string, tokens: Record<string, string>): string {
  const template = APPROVED_STRINGS[key]
  if (template === undefined) {
    throw new Error(`Missing approved string for key "${key}" (see 04-COPY-DRAFT.md)`)
  }
  return resolveTokens(template, tokens)
}

// No guild value can appear on this page without first existing on the
// case-study entry: the token map is built from the entry alone, never a
// hand-typed literal (RESEARCH.md Pattern 2).
function tokensFor(entry: CaseStudy): Record<string, string> {
  return {
    guild: entry.guild,
    size: entry.size,
    expansion_tier: entry.expansionTier,
    old_process: entry.oldProcess,
    old_process_cost: entry.oldProcessCost,
    old_process_failure: entry.oldProcessFailure,
    time_period: entry.timePeriod,
    verified_result: entry.verifiedResult,
    before_admin_time: entry.title.variant === 'preferred' ? entry.title.beforeAdminTime : '',
    after_admin_time: entry.title.variant === 'preferred' ? entry.title.afterAdminTime : '',
  }
}

// The H1 (and, for this route, the browser title -- see generateMetadata)
// are always the SAME resolved string, computed once here, so the two can
// never disagree (EVID-04 success criterion 2). The `preferred` variant
// cannot be selected without both admin-time figures it needs (CaseStudyTitle
// in data/case-studies/types.ts), so this never renders a half-resolved
// time-based headline.
function resolveH1(entry: CaseStudy, tokens: Record<string, string>): string {
  const key = entry.title.variant === 'preferred' ? 'page.h1-preferred' : 'page.h1-fallback'
  return approved(key, tokens)
}

function canonicalUrl(slug: string): string {
  return `https://www.getlootlist.com/customers/${slug}`
}

// Exported so the eyebrow omit rule (04-COPY-DRAFT.md Section F item 1) is
// directly testable with an empty value, not only through the always-
// non-empty committed approved string. Whether the eyebrow appears is
// carried by the copy artifact's resolved value, not by a separate code
// flag: an empty approved value renders neither the element nor its
// spacing.
export function Eyebrow({ value }: { value: string }) {
  if (!value) return null
  return <p className="text-lg text-accent mb-3">{value}</p>
}

// dynamicParams = false: any slug outside generateStaticParams() renders
// the standard Next.js 404 rather than attempting a runtime lookup (V5
// guard, RESEARCH.md Security Domain table).
export const dynamicParams = false

export async function generateStaticParams() {
  return listRoutableCaseStudies().map((entry) => ({ slug: entry.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const entry = requireCaseStudy(slug)
  const tokens = tokensFor(entry)
  const h1 = resolveH1(entry, tokens)
  const description = approved('page.meta-description', tokens)
  const canonical = canonicalUrl(entry.slug)

  return {
    title: h1,
    description,
    alternates: { canonical },
    openGraph: {
      title: h1,
      description,
      type: 'article',
      publishedTime: entry.publishedIso,
      modifiedTime: entry.publishedIso,
      url: canonical,
    },
    // Interim directive while EVID-05 is blocked (D-06). The publish plan
    // removes this key in the same commit that adds the sitemap entry
    // (RESEARCH.md Pitfall 2); setting it to true instead, without also
    // publishing the sitemap entry, is wrong.
    robots: { index: false, follow: false },
  }
}

export default async function CaseStudyPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const entry = requireCaseStudy(slug)
  const tokens = tokensFor(entry)
  const h1 = resolveH1(entry, tokens)
  const description = approved('page.meta-description', tokens)
  const lead = approved('page.lead', tokens)
  const canonical = canonicalUrl(entry.slug)
  const eyebrow = approved('page.eyebrow', tokens)
  const breadcrumbLabel = approved('page.breadcrumb-label', tokens)

  // Report-page index-splitting technique (app/research/wow-classic-loot-
  // systems-2026/page.tsx): turns the word "Zev" inside the approved
  // byline into an anchor to /about without changing a byte of the
  // approved string.
  const byline = approved('page.byline', tokens)
  const bylineZevIndex = byline.indexOf('Zev')
  if (bylineZevIndex === -1) {
    throw new Error('page.byline no longer contains "Zev"; the /about link binding broke')
  }
  const bylineBeforeZev = byline.slice(0, bylineZevIndex)
  const bylineAfterZev = byline.slice(bylineZevIndex + 'Zev'.length)
  const bylineMeta = buildBylineMeta({
    interviewedMonthYear: entry.interviewedMonthYear,
    expansionTier: entry.expansionTier,
  })

  // Article + BreadcrumbList only (D-05, RESEARCH.md Pattern 4). No schema
  // type that asserts a rating or a testimonial score is added here: a
  // guild's praise for LootList+ published on getlootlist.com is exactly
  // the self-serving case Google suppresses.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: h1,
    description,
    datePublished: entry.publishedIso,
    dateModified: entry.publishedIso,
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
      '@id': canonical,
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
        name: h1,
      },
    ],
  }

  return (
    <main className="bg-background overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #0f0e12 0%, #080808 40%)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <LandingNav />

      <article className="relative pt-32 pb-20 px-6 md:px-12 lg:px-20">
        <BlogTracker slug={entry.slug} title={h1} />
        <div className="max-w-3xl mx-auto">
          <nav className="mb-8 text-lg text-foreground-secondary">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <span className="mx-2 text-foreground-muted">/</span>
            <span className="text-foreground-muted">{breadcrumbLabel}</span>
          </nav>

          <header className="mb-12">
            <Eyebrow value={eyebrow} />
            <h1 className="text-4xl font-bold text-foreground leading-tight mb-4">{h1}</h1>
            <p className="text-lg text-foreground-secondary leading-relaxed">{lead}</p>
            <div className="flex items-center gap-2 mt-6 text-lg text-foreground-muted flex-wrap">
              <span>
                {bylineBeforeZev}
                <a
                  href="/about"
                  className="text-foreground-secondary hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  Zev
                </a>
                {bylineAfterZev}
              </span>
              {bylineMeta.map((item) => (
                <Fragment key={item.key}>
                  <span>&middot;</span>
                  <span>{item.value}</span>
                </Fragment>
              ))}
            </div>
          </header>

          {/* Primary anchor (04-UI-SPEC.md Focal Point priority 1): the
              proof strip must out-rank everything below it as soon as a
              reader scrolls past the lead paragraph. Placed at the `lg`
              (24px) gap the spacing scale specifies between the lead and
              the strip. */}
          <div className="mt-6">
            <ProofStrip
              stats={entry.proofStrip}
              captions={{
                roster: approved('proofstrip.roster-caption', tokens),
                expansion: approved('proofstrip.expansion-caption', tokens),
                metric: approved('proofstrip.metric-caption', tokens),
                tenure: approved('proofstrip.tenure-caption', tokens),
              }}
            />
          </div>

          {/* Secondary anchor: the guild's own before-and-after account,
              at the `xl` (32px) section gap. */}
          <div className="mt-8">
            <NarrativePanels
              beforeLabel={approved('narrative.before-label', tokens)}
              afterLabel={approved('narrative.after-label', tokens)}
              beforeNarrative={entry.beforeNarrative}
              afterNarrative={entry.afterNarrative}
            />
          </div>

          <div className="mt-8">
            <QuoteCard quote={entry.quote} author={entry.author} />
          </div>

          <LimitationSection heading={approved('limitation.h2', tokens)} body={entry.limitation} />

          <ContextualCta
            heading={approved('cta.heading', tokens)}
            body={approved('cta.body', tokens)}
            buttonLabel={approved('cta.button', tokens)}
            href="https://www.lootlistplus.com"
          />
        </div>
      </article>

      <LandingCTA />
      <LandingFooter />
    </main>
  )
}
