import { Button } from '@/components/ui/button'
import type { CaseStudyProofStrip } from '@/data/case-studies/types'
import { Card } from '@/components/ui/card'

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
 * The three sizes a proof-strip figure can render at, all on the page's
 * locked type scale (04-UI-SPEC.md Typography: 16, 20, 32, 42). No fourth
 * size is ever introduced by this rule.
 */
export type ProofFigureSizeClass = 'text-5xl' | 'text-4xl' | 'text-2xl'

/**
 * A figure on this page is a phrase a guild wrote in its interview answers
 * (D-03), so phrase-length figures are the normal case, not an edge case.
 * The 42px focal size stays reserved for the short numeral-led answers it
 * was designed for; a longer figure steps down through the type scale
 * instead of overflowing its card (G-04-1).
 *
 * Rules, applied in order against the trimmed figure:
 * 1. Short tier (42px): the first character is an ASCII digit AND the
 *    trimmed length is at most 8.
 * 2. Middle tier (32px): the trimmed length is at most 16 AND the longest
 *    whitespace-delimited word is at most 9 characters. The longest-word
 *    condition matters because a single long word, not the total length,
 *    is what breaks a roughly 142px-wide card.
 * 3. Long tier (20px): everything else.
 *
 * The three class names below are written as verbatim string literals so
 * Tailwind's content scan emits their CSS; a concatenated or computed class
 * name would compile to an unstyled figure.
 */
export function proofFigureSizeClass(figure: string): ProofFigureSizeClass {
  const trimmed = figure.trim()

  if (/^[0-9]/.test(trimmed) && trimmed.length <= 8) {
    return 'text-5xl'
  }

  const longestWord = trimmed
    .split(/\s+/)
    .reduce((max, word) => Math.max(max, word.length), 0)

  if (trimmed.length <= 16 && longestWord <= 9) {
    return 'text-4xl'
  }

  return 'text-2xl'
}

/**
 * The proof strip is the page's primary visual anchor (04-UI-SPEC.md Focal
 * Point): accent figures rendered directly under the lead paragraph, sized
 * by `proofFigureSizeClass` so a short numeral still lands at the 42px
 * focal size while a phrase-length answer steps down instead of clipping.
 * Candidate blocks are built in a fixed order (roster, expansion,
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {blocks.map((block) => (
        // min-w-0 lets the grid item shrink below its content's intrinsic
        // width instead of forcing the track wider; break-words wraps a
        // single word longer than the card instead of letting it spill.
        // Together these are the backstop that keeps any future interview
        // answer, of any length, inside its card even if it falls outside
        // every tier proofFigureSizeClass tunes for.
        <div key={block.key} className="p-4 rounded-xl bg-background-elevated min-w-0 break-words">
          {/* Plain div, not a <p>: this is the single largest, most
              saturated element on the page below the H1 (04-UI-SPEC.md
              Focal Point), and a <p> risks losing the accent colour to a
              future prose-wrapper rule the way the research report page's
              own stat callout comment explains. data-proof-figure is the
              stable selector tests count blocks by, since the size class
              itself is now length-dependent. */}
          <div
            data-proof-figure={block.key}
            className={`${proofFigureSizeClass(block.figure)} font-bold text-accent`}
          >
            {block.figure}
          </div>
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

/**
 * The credible-limitation section, sourced from interview question nine.
 * Standard body treatment only: no accent colour and no destructive
 * colour, because an honest limitation is a credibility feature rather
 * than a warning (04-UI-SPEC.md Color). This is a deliberate contract
 * decision, not a styling preference -- colouring an honest limitation
 * like an error would present the page's credibility feature as a problem
 * notice. The box grows with its content and the paragraph is never
 * shortened.
 */
export function LimitationSection({ heading, body }: { heading: string; body: string }) {
  return (
    <Card className="my-12 p-8">
      <div className="text-2xl font-bold text-foreground mb-4">{heading}</div>
      <p className="text-lg text-foreground-secondary leading-relaxed">{body}</p>
    </Card>
  )
}

/**
 * The single contextual conversion ask. Composed in `page.tsx` as a
 * sibling after the limitation section, outside any prose wrapper, for
 * the reason the research report page records: a wrapper's
 * underlined-accent link rule would turn this filled accent button into
 * invisible text. Plain anchor, no click handler -- it sits inside the
 * `article`, so `BlogTracker`'s existing click delegation already reports
 * the click (T-04-14).
 */
export function ContextualCta({
  heading,
  body,
  buttonLabel,
  href,
}: {
  heading: string
  body: string
  buttonLabel: string
  href: string
}) {
  return (
    <Card className="my-12 p-8 flex flex-col items-start gap-4">
      <div className="text-2xl font-bold text-foreground">{heading}</div>
      <p className="text-lg text-foreground-secondary">{body}</p>
      <Button asChild variant="accent" size="lg" className="font-bold">
        <a href={href}>{buttonLabel}</a>
      </Button>
    </Card>
  )
}
