'use client'

import { cn } from '@/lib/utils'
import { Button } from './button'
import { HugeiconsIcon } from '@hugeicons/react'
import { AlertCircleIcon } from '@hugeicons/core-free-icons'

/**
 * ErrorState Component - Consistent error state messaging
 *
 * Sizes:
 * - compact: Minimal padding, smaller text - for inline/table contexts
 * - default: Standard padding and sizing - for content areas
 * - lg: Larger padding and icon - for full page/prominent error states
 *
 * Variants:
 * - default: No background, just centered content
 * - card: With elevated background and border
 */

interface ErrorStateProps {
  /** Error message to display */
  message: string
  /** Optional retry handler - shows "Try again" button when provided */
  onRetry?: () => void
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
    message: 'text-sm font-medium',
    button: 'mt-3',
  },
  default: {
    container: 'py-8',
    iconContainer: 'p-3 mb-4',
    iconSize: 24,
    message: 'text-base font-semibold',
    button: 'mt-4',
  },
  lg: {
    container: 'py-12',
    iconContainer: 'p-4 mb-5',
    iconSize: 32,
    message: 'text-lg font-semibold',
    button: 'mt-5',
  },
}

export function ErrorState({
  message,
  onRetry,
  size = 'default',
  variant = 'default',
  className,
}: ErrorStateProps) {
  const config = sizeConfig[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        config.container,
        variant === 'card' &&
          'bg-background-elevated border border-border rounded-xl',
        className
      )}
    >
      <div className={cn('rounded-full bg-destructive/10', config.iconContainer)}>
        <HugeiconsIcon
          icon={AlertCircleIcon}
          size={config.iconSize}
          className="text-destructive"
        />
      </div>
      <p className={cn('text-foreground max-w-sm', config.message)}>
        {message}
      </p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size={size === 'compact' ? 'sm' : 'default'}
          className={config.button}
        >
          Try again
        </Button>
      )}
    </div>
  )
}
