import { EmptyState } from '@/components/ui/empty-state'
import { Castle01Icon } from '@hugeicons/core-free-icons'
import type { GameVersion } from '@/domain/expansion/game'

/**
 * Shown when the active expansion has no open raid tiers -- a brand new
 * expansion (such as WoW Forever before its raids ship) or every current
 * tier disabled. Generic on purpose for Classic guilds; it names no
 * expansion. A Forever guild has no "expansion" of its own to name (D-03),
 * so it gets the GV-C4 wording instead.
 */
interface NoRaidsEmptyStateProps {
  size?: 'compact' | 'default' | 'lg'
  className?: string
  game?: GameVersion
}

export function NoRaidsEmptyState({ size = 'default', className, game = 'classic' }: NoRaidsEmptyStateProps) {
  const description = game === 'forever'
    ? 'WoW Forever has no raids open yet. Loot lists and rankings show up here once raids open.'
    : 'This expansion has no raids open yet. Loot lists and rankings show up here once raids open.'

  return (
    <EmptyState
      icon={Castle01Icon}
      title="No raids yet"
      description={description}
      variant="card"
      size={size}
      className={className}
    />
  )
}
