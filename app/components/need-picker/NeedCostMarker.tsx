/**
 * What a pick costs, in words and dots (UI-SPEC Color: cost is never traffic
 * light coloured). Big, Medium and Standard are told apart by the word and by
 * three dots filled 3, 2 or 1, both neutral, so meaning never rests on colour.
 * The red, yellow and green item classification badge is deliberately not used
 * for needs.
 */
import { Badge } from '@/components/ui/badge'
import { costForSlot } from '@/domain/loot/need-budget'
import { needCostWord } from '@/domain/loot/need-questions'
import type { NeedSlotKey } from '@/domain/loot/needs'

const DOTS = [1, 2, 3] as const

export function NeedCostMarker({ slot }: { slot: NeedSlotKey }) {
  const cost = costForSlot(slot)
  return (
    // The 12px size sits on the inner word: Badge carries text-xs (11px) and
    // tailwind-merge would drop a text-12 passed beside a text colour.
    <Badge variant="outline" className="gap-2 px-2 py-1 text-foreground-secondary">
      <span className="text-12 font-semibold">{needCostWord(slot)}</span>
      <span aria-hidden="true" className="flex items-center gap-1">
        {DOTS.map((dot) => (
          <span
            key={dot}
            data-filled={dot <= cost ? 'true' : 'false'}
            className={dot <= cost ? 'h-2 w-2 rounded-full bg-foreground-secondary' : 'h-2 w-2 rounded-full bg-muted'}
          />
        ))}
      </span>
    </Badge>
  )
}
