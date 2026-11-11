'use client'

import { cn } from '@/lib/utils'

export interface SegmentedControlOption<T extends string> {
  value: T
  label: string
}

interface SegmentedControlProps<T extends string> {
  options: SegmentedControlOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'default'
  /** Disables every option, e.g. while the change is being saved */
  disabled?: boolean
  /**
   * Visual variant for the active state
   * - accent: Orange highlight (default, on-brand)
   * - primary: White/light highlight (neutral)
   */
  variant?: 'accent' | 'primary'
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'default',
  disabled = false,
  variant = 'accent'
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex rounded-[40px] bg-background-elevated border border-border-strong p-0.5',
        className
      )}
    >
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          onClick={() => onChange(option.value)}
          disabled={disabled}
          aria-pressed={value === option.value}
          className={cn(
            'font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed',
            size === 'sm' ? 'px-3 py-1.5 text-12 rounded-[40px]' : 'px-5 py-2.5 text-13 rounded-[40px]',
            value === option.value
              ? variant === 'accent'
                ? 'bg-accent/20 text-accent hover:bg-accent/30'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
