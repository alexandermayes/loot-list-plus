import { EmptyState } from '@/components/ui/empty-state'
import { Castle01Icon } from '@hugeicons/core-free-icons'

/**
 * Shown when the active expansion has no open raid tiers -- a brand new
 * expansion (such as WoW Forever before its raids ship) or every current
 * tier disabled. Generic on purpose; it names no expansion.
 */
interface NoRaidsEmptyStateProps {
  size?: 'compact' | 'default' | 'lg'
  className?: string
}

export function NoRaidsEmptyState({ size = 'default', className }: NoRaidsEmptyStateProps) {
  return (
    <EmptyState
      icon={Castle01Icon}
      title="No raids yet"
      description="This expansion has no raids open yet. Loot lists and rankings show up here once raids open."
      variant="card"
      size={size}
      className={className}
    />
  )
}
