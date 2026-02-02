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
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  size = 'default'
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        'inline-flex rounded-xl bg-background-elevated border border-border p-1',
        className
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'font-medium transition-all',
            size === 'sm' ? 'px-3 py-1.5 text-[12px] rounded-lg' : 'px-4 py-2 text-[13px] rounded-lg',
            value === option.value
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
