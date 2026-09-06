import type { CaseStudyProofStrip } from '@/data/case-studies/types'

// ---------------------------------------------------------------------------
// Pure presentational Server Components for the case-study template.
//
// Every visible string arrives as a prop, never as a literal typed in this
// module: the sign-off artifact (04-COPY-DRAFT.md) stays the single source
// of wording, and each component stays unit-testable in isolation against
// arbitrary entry-shaped input, not only the committed fixture (see the
// omit-rule tests in app/customers/[slug]/__tests__/page.test.tsx).
// ---------------------------------------------------------------------------

export interface ProofStripCaptions {
  roster: string
  expansion: string
  metric: string
  tenure: string
}

interface ProofStripBlockDef {
  key: string
  figure: string | undefined
  caption: string
}

/**
 * The proof strip is the page's primary visual anchor (04-UI-SPEC.md Focal
 * Point): four 42px accent figures rendered directly under the lead
 * paragraph. Candidate blocks are built in a fixed order (roster, expansion,
 * admin-time delta, months using), then filtered before render, so a stat
 * the interview never collected produces no block at all (D-05) rather than
 * a placeholder, a dash, or an inferred value. A three-block strip is a
 * correct render, not a degraded one, regardless of which position was
 * omitted (T-04-13).
 */
export function ProofStrip({
  stats,
  captions,
}: {
  stats: CaseStudyProofStrip
  captions: ProofStripCaptions
}) {
  const candidates: ProofStripBlockDef[] = [
    { key: 'roster', figure: stats.rosterSize, caption: captions.roster },
    { key: 'expansion', figure: stats.expansionTier, caption: captions.expansion },
    { key: 'metric', figure: stats.adminTimeDelta, caption: captions.metric },
    { key: 'tenure', figure: stats.monthsUsing, caption: captions.tenure },
  ]

  // Filtering before rendering is the whole mechanism behind D-05: an
  // absent or empty figure never reaches the JSX below, so there is no
  // branch that could render a not-applicable marker in its place.
  const blocks = candidates.filter(
    (candidate): candidate is ProofStripBlockDef & { figure: string } =>
      typeof candidate.figure === 'string' && candidate.figure.length > 0
  )

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      {blocks.map((block) => (
        <div key={block.key} className="p-4 rounded-xl bg-background-elevated">
          {/* Plain div, not a <p>: this is the single largest, most
              saturated element on the page below the H1 (04-UI-SPEC.md
              Focal Point), and a <p> risks losing the accent colour to a
              future prose-wrapper rule the way the research report page's
              own stat callout comment explains. */}
          <div className="text-5xl font-bold text-accent">{block.figure}</div>
          <div className="text-lg text-foreground-muted mt-1">{block.caption}</div>
        </div>
      ))}
    </div>
  )
}

export interface NarrativePanelsProps {
  beforeLabel: string
  afterLabel: string
  beforeNarrative: string
  afterNarrative: string
}

/**
 * The before-and-after account that substantiates the proof strip's
 * numbers with the guild's own words (04-UI-SPEC.md Focal Point, priority
 * 2). Both panels are required by the template -- a story missing either
 * does not ship as a case study -- so there is no single-panel branch to
 * build and no clipping anywhere: cutting the guild's approved words would
 * misrepresent what was approved.
 */
export function NarrativePanels({
  beforeLabel,
  afterLabel,
  beforeNarrative,
  afterNarrative,
}: NarrativePanelsProps) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="p-6 rounded-xl bg-background-elevated space-y-4">
        <div className="text-2xl font-bold text-foreground">{beforeLabel}</div>
        <p className="text-lg text-foreground-secondary leading-relaxed">{beforeNarrative}</p>
      </div>
      <div className="p-6 rounded-xl bg-background-elevated space-y-4">
        <div className="text-2xl font-bold text-foreground">{afterLabel}</div>
        <p className="text-lg text-foreground-secondary leading-relaxed">{afterNarrative}</p>
      </div>
    </div>
  )
}

export interface BylineMetaItem {
  key: string
  value: string
}

/**
 * Ordered list of defined byline meta items for an entry: the interview
 * month/year, then the expansion and tier. An item the interview did not
 * collect is dropped along with its separator here, rather than leaving a
 * blank slot or a stranded middot for the caller to render (same omit rule
 * as the proof strip -- see 04-UI-SPEC.md E6 "partial"). Accepts a
 * loosely-typed subset of the entry rather than the full `CaseStudy` type
 * so this omit path stays testable with a reduced-field object, matching
 * the plan's proof-strip test convention rather than requiring a second
 * fixture entry.
 */
export function buildBylineMeta(entry: {
  interviewedMonthYear?: string
  expansionTier?: string
}): BylineMetaItem[] {
  const candidates: BylineMetaItem[] = [
    { key: 'interviewed', value: entry.interviewedMonthYear ?? '' },
    { key: 'expansion-tier', value: entry.expansionTier ?? '' },
  ]
  return candidates.filter((item) => item.value.length > 0)
}
