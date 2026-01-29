import { Badge } from './badge'
import { cn } from '@/lib/utils'

/**
 * ClassificationBadge Component - LootList+ Design System
 *
 * Used to display item classifications in loot lists:
 * - Reserved: High-value items that cost 1 allocation point and must be alone at a rank
 * - Limited: Items that cost 1 allocation point
 * - Unlimited: Items that cost 0 allocation points (free picks)
 */

type Classification = 'Reserved' | 'Limited' | 'Unlimited'

interface ClassificationBadgeProps {
  classification: Classification
  className?: string
  /** Show compact version without text, just the letter */
  compact?: boolean
}

const classificationConfig: Record<Classification, {
  label: string
  letter: string
  className: string
}> = {
  Reserved: {
    label: 'Reserved',
    letter: 'R',
    className: 'bg-destructive/15 text-destructive border-destructive/30 font-semibold'
  },
  Limited: {
    label: 'Limited',
    letter: 'L',
    className: 'bg-warning/15 text-warning border-warning/30 font-semibold'
  },
  Unlimited: {
    label: 'Unlimited',
    letter: 'U',
    className: 'bg-success/15 text-success border-success/30 font-medium'
  },
}

export function ClassificationBadge({ classification, className, compact = false }: ClassificationBadgeProps) {
  const config = classificationConfig[classification]

  if (!config) return null

  return (
    <Badge
      variant="outline"
      className={cn(
        config.className,
        compact ? 'px-1.5 text-[10px]' : 'px-2 py-0.5 text-[11px]',
        className
      )}
    >
      {compact ? config.letter : config.label}
    </Badge>
  )
}

export type { Classification }
