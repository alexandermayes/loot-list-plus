import type { QuoteAuthor } from '@/app/components/landing/LandingValueProps'

// ---------------------------------------------------------------------------
// Interview-sourced content only (D-03).
//
// Every field below is a value a guild states in its written interview
// answers. Nothing in this module may be populated from LootList+'s own
// production database: the interview is the single consent surface a guild
// agreed to when it approved its quote and figures for publication. A
// proof-strip stat, a narrative detail, or a quote pulled from product usage
// data instead of the interview record would cross that consent boundary
// without the guild's knowledge, which is exactly what D-03 forbids.
// ---------------------------------------------------------------------------

/**
 * The rendered H1 has two shapes depending on whether the interview supplied
 * a measurable before/after admin-time figure. The `preferred` variant
 * cannot be selected without both figures it needs, so a case study can
 * never render the time-based headline with an invented or missing number.
 */
export type CaseStudyTitle =
  | { variant: 'preferred'; beforeAdminTime: string; afterAdminTime: string }
  | { variant: 'fallback' }

/**
 * The proof strip's four candidate stats. Every member is optional per
 * D-05: a stat the interview did not collect is omitted entirely rather
 * than rendered as "N/A", a placeholder, or an invented value.
 */
export interface CaseStudyProofStrip {
  rosterSize?: string
  expansionTier?: string
  adminTimeDelta?: string
  monthsUsing?: string
}

/**
 * One published or fixture case study. Every interview-sourced field is
 * required (UI-SPEC E7 "partial"): an entry missing one fails
 * `npm run typecheck` rather than reaching a runtime partial-render state.
 */
export interface CaseStudy {
  slug: string
  isFixture: boolean
  title: CaseStudyTitle
  proofStrip: CaseStudyProofStrip
  guild: string
  size: string
  expansionTier: string
  oldProcess: string
  oldProcessCost: string
  oldProcessFailure: string
  timePeriod: string
  verifiedResult: string
  beforeNarrative: string
  afterNarrative: string
  quote: string
  limitation: string
  interviewedMonthYear: string
  publishedIso: string
  author: QuoteAuthor
}
