/**
 * The picker's budget sentence and its ten segment meter (D-07, DISC-03).
 *
 * The sentence is the live region: it is announced politely as one whole
 * sentence each time the count changes. When the list is over budget the
 * over-budget sentence takes its place in a warning panel, because it is
 * guidance, not an error, so it never uses the destructive palette. The meter
 * is decoration (aria-hidden); the sentence carries the number.
 *
 * Copy is DRAFT for the owner's 04-19 sign-off.
 */
import { NEED_BUDGET_POINTS } from '@/domain/loot/need-budget'

interface BudgetLineProps {
  /** Points the picked rows cost. */
  used: number
  /** The over-budget sentence, or null while the list fits. */
  overSentence: string | null
}

// The budget is fixed at 10 for every guild (D-06), so the meter has one
// segment per point and the sentence names the limit outright.
const SEGMENTS = Array.from({ length: NEED_BUDGET_POINTS }, (_, index) => index)

export function BudgetLine({ used, overSentence }: BudgetLineProps) {
  return (
    <div>
      <p
        aria-live="polite"
        aria-atomic="true"
        className={
          overSentence === null
            ? 'text-md tabular-nums'
            : 'rounded-lg border border-warning/30 bg-warning/10 p-2 text-md text-foreground'
        }
      >
        {overSentence ?? `${used} of 10 points used.`}
      </p>
      <div data-testid="budget-meter" aria-hidden="true" className="mt-2 flex gap-1">
        {SEGMENTS.map((segment) => (
          <span
            key={segment}
            data-filled={segment < used ? 'true' : 'false'}
            className={segment < used ? 'h-2 flex-1 rounded-full bg-foreground' : 'h-2 flex-1 rounded-full bg-muted'}
          />
        ))}
      </div>
    </div>
  )
}
