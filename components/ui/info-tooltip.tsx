'use client'

import { cn } from '@/lib/utils'

interface InfoTooltipProps {
  content: string
  className?: string
  iconSize?: number
}

export function InfoTooltip({ content, className, iconSize = 14 }: InfoTooltipProps) {
  return (
    <span className={cn('relative inline-flex items-center group/tooltip z-0 hover:z-50', className)}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 16 16"
        fill="none"
        className="text-foreground-secondary cursor-help flex-shrink-0"
        aria-label="More info"
      >
        <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
        <text
          x="8"
          y="11.5"
          textAnchor="middle"
          fill="currentColor"
          fontSize="9"
          fontWeight="600"
          fontFamily="system-ui, sans-serif"
        >
          i
        </text>
      </svg>
      <span
        role="tooltip"
        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[240px] px-3 py-2.5 rounded-lg bg-background-elevated border border-border shadow-lg text-[12px] leading-relaxed text-foreground-secondary opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-opacity duration-150 z-50 pointer-events-none"
      >
        {content}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-border" />
      </span>
    </span>
  )
}
