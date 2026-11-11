'use client'

/**
 * ScoreSplit
 *
 * Shows the two halves of a loot score, standing (what the raider brings) and
 * interest (how much they want the item), next to the total (D-21). It renders
 * the values and sentences it is handed from explainScore and never recomputes a
 * score, so every surface reads the same numbers.
 *
 * Standing and interest are named with words, never colour alone. A negative
 * standing keeps its minus sign in text-foreground: the sign carries the
 * meaning, and a status colour as text would fail contrast on a light surface.
 *
 * Variants:
 * - tiles: three columns (Overview, comparison cards), sentences below
 * - compact: two columns for the master sheet popover, whose header owns the total
 * - rows: just the two sentences as two lines, for table cells that already show the numbers
 */

export interface ScoreSplitHalf {
  value: number
  sentence: string
}

export interface ScoreSplitProps {
  standing: ScoreSplitHalf
  interest: ScoreSplitHalf
  total: number
  decimalPlaces: number
  variant: 'tiles' | 'compact' | 'rows'
  /** Replaces the word "Total" in tiles, for example "Total for your number 1 pick". */
  totalLabel?: string
  className?: string
}

/**
 * toFixed to the guild's places, without a negative zero such as "-0.00".
 * Exported so a table column that shows a standing next to ScoreSplit's
 * sentences formats it the same way.
 */
export function formatScoreValue(value: number, decimalPlaces: number): string {
  const fixed = value.toFixed(decimalPlaces)
  return Number(fixed) === 0 ? (0).toFixed(decimalPlaces) : fixed
}

const SENTENCE_CLASS = 'text-12 text-foreground-secondary tabular-nums'

function Sentences({ standing, interest, className }: { standing: string; interest: string; className: string }) {
  return (
    <div className={className}>
      <p className={SENTENCE_CLASS}>{standing}</p>
      <p className={SENTENCE_CLASS}>{interest}</p>
    </div>
  )
}

export function ScoreSplit({
  standing,
  interest,
  total,
  decimalPlaces,
  variant,
  totalLabel = 'Total',
  className = '',
}: ScoreSplitProps) {
  const standingText = formatScoreValue(standing.value, decimalPlaces)
  const interestText = formatScoreValue(interest.value, decimalPlaces)

  if (variant === 'rows') {
    return <Sentences standing={standing.sentence} interest={interest.sentence} className={`space-y-1 ${className}`} />
  }

  if (variant === 'compact') {
    return (
      <div className={className}>
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0">
            <div className="text-12 text-muted-foreground">Standing</div>
            <div className="text-16 font-semibold text-foreground tabular-nums">{standingText}</div>
          </div>
          <div className="min-w-0">
            <div className="text-12 text-muted-foreground">Interest</div>
            <div className="text-16 font-semibold text-foreground tabular-nums">{interestText}</div>
          </div>
        </div>
        <Sentences standing={standing.sentence} interest={interest.sentence} className="mt-2 space-y-1" />
      </div>
    )
  }

  // 8px insets (p-2, pl-2) keep each column near 84px at 343px wide, enough for a
  // five character number at 24px; 16px insets would leave it too narrow.
  return (
    <div className={className}>
      <div className="grid grid-cols-3 gap-2">
        <div className="min-w-0 bg-background-subtle border border-border rounded-lg p-2">
          <div className="text-12 uppercase tracking-wide text-muted-foreground">Standing</div>
          <div className="text-24 font-semibold text-foreground tabular-nums">{standingText}</div>
        </div>
        <div className="min-w-0 bg-background-subtle border border-border rounded-lg p-2">
          <div className="text-12 uppercase tracking-wide text-muted-foreground">Interest</div>
          <div className="text-24 font-semibold text-foreground tabular-nums">{interestText}</div>
        </div>
        <div className="min-w-0 border-l border-border pl-2">
          <div className="text-12 uppercase tracking-wide text-muted-foreground">{totalLabel}</div>
          <div className="text-24 font-semibold text-foreground tabular-nums">{formatScoreValue(total, decimalPlaces)}</div>
        </div>
      </div>
      <Sentences standing={standing.sentence} interest={interest.sentence} className="mt-2 space-y-2" />
    </div>
  )
}
