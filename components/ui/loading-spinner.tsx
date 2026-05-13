import { cn } from '@/lib/utils'

/**
 * Spinner Component - Simple inline spinner for buttons and small contexts
 *
 * Sizes:
 * - sm: 14px - for small buttons
 * - default: 16px - for standard buttons
 * - lg: 20px - for large buttons
 */
interface SpinnerProps {
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

const spinnerSizes = {
  sm: 'w-3.5 h-3.5',
  default: 'w-4 h-4',
  lg: 'w-5 h-5',
}

export function Spinner({ size = 'default', className }: SpinnerProps) {
  return (
    <svg
      className={cn('animate-spin', spinnerSizes[size], className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

/**
 * LoadingSpinner Component - Full loading indicator with loot icon
 *
 * Sizes:
 * - sm: 32px icon - for inline/card loading
 * - default: 48px icon - for content areas
 * - lg: 64px icon - for full page loading
 */
interface LoadingSpinnerProps {
  className?: string
  text?: string
  size?: 'sm' | 'default' | 'lg'
}

const spinnerIconSizes = {
  sm: 'w-5 h-5',
  default: 'w-6 h-6',
  lg: 'w-8 h-8',
}

export function LoadingSpinner({
  className,
  text,
  size = 'default'
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <Spinner size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'} className={spinnerIconSizes[size]} />
      {text && (
        <p className="text-sm text-muted-foreground">{text}</p>
      )}
    </div>
  )
}
