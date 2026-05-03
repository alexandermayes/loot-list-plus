import { cn } from '@/lib/utils'
import { Button } from './button'
import { HugeiconsIcon } from '@hugeicons/react'

/**
 * EmptyState Component - Consistent empty state messaging
 *
 * Sizes:
 * - compact: Minimal padding, smaller text - for inline/table contexts
 * - default: Standard padding and sizing - for content areas
 * - lg: Larger padding and icon - for full page/prominent empty states
 *
 * Variants:
 * - default: No background, just centered content
 * - card: With elevated background and border
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HugeIcon = any

interface EmptyStateProps {
  /** HugeIcon to display */
  icon?: HugeIcon
  /** Main empty state title */
  title: string
  /** Optional description text */
  description?: string
  /** Optional action button */
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'outline' | 'accent'
  }
  /** Size variant */
  size?: 'compact' | 'default' | 'lg'
  /** Visual variant */
  variant?: 'default' | 'card'
  className?: string
}

const sizeConfig = {
  compact: {
    container: 'py-6',
    iconContainer: 'p-2 mb-3',
    iconSize: 20,
    title: 'text-sm font-medium',
    description: 'text-xs mb-3',
  },
  default: {
    container: 'py-8',
    iconContainer: 'p-3 mb-4',
    iconSize: 24,
    title: 'text-base font-semibold',
    description: 'text-sm mb-4',
  },
  lg: {
    container: 'py-12',
    iconContainer: 'p-4 mb-5',
    iconSize: 32,
    title: 'text-lg font-semibold',
    description: 'text-sm mb-5',
  },
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'default',
  variant = 'default',
  className
}: EmptyStateProps) {
  const config = sizeConfig[size]

  return (
    <div className={cn(
      'flex flex-col items-center justify-center text-center',
      config.container,
      variant === 'card' && 'bg-background-elevated border border-border rounded-xl',
      className
    )}>
      {icon && (
        <div className={cn('rounded-full bg-muted', config.iconContainer)}>
          <HugeiconsIcon
            icon={icon}
            size={config.iconSize}
            className="text-muted-foreground"
          />
        </div>
      )}
      <h3 className={cn('text-foreground text-balance', config.title)}>
        {title}
      </h3>
      {description && (
        <p className={cn('text-muted-foreground max-w-sm text-pretty', config.description)}>
          {description}
        </p>
      )}
      {action && (
        <Button
          onClick={action.onClick}
          variant={action.variant || 'outline'}
          size={size === 'compact' ? 'sm' : 'default'}
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}
