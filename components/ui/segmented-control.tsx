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
  variant = 'accent'
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex rounded-[40px] bg-background-elevated border border-border p-0.5',
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'font-medium transition-all',
            size === 'sm' ? 'px-3 py-1.5 text-[12px] rounded-[40px]' : 'px-5 py-2 text-[13px] rounded-[40px]',
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
