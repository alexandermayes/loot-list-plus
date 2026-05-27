'use client'

import type { ReactNode } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface WeekGroupProps {
  weekStart: string
  label: string
  relativeTag: 'this' | 'last' | null
  isExpanded: boolean
  raidCount: number
  attendedCount: number
  lootCount: number
  onToggle: (weekStart: string) => void
  children?: ReactNode
}

export function WeekGroup({
  weekStart,
  label,
  relativeTag,
  isExpanded,
  raidCount,
  attendedCount,
  lootCount,
  onToggle,
  children,
}: WeekGroupProps) {
  const hasSummary = raidCount > 0

  return (
    <div className="space-y-3">
      <Button
        variant="ghost"
        onClick={() => onToggle(weekStart)}
        className="flex items-center gap-3 w-full group p-0 h-auto hover:bg-transparent"
      >
        {isExpanded ? (
          <HugeiconsIcon
            icon={ArrowUp01Icon}
            size={24}
            className="text-foreground group-hover:text-accent transition-colors flex-shrink-0"
          />
        ) : (
          <HugeiconsIcon
            icon={ArrowDown01Icon}
            size={24}
            className="text-foreground group-hover:text-accent transition-colors flex-shrink-0"
          />
        )}
        <h2 className="text-[24px] font-bold text-foreground group-hover:text-accent transition-colors">
          {label}
        </h2>
        {relativeTag && (
          <Badge variant="accent-subtle" className="flex-shrink-0">
            {relativeTag === 'this' ? 'This week' : 'Last week'}
          </Badge>
        )}
        {!isExpanded && hasSummary && (
          <span className="text-[13px] text-foreground-muted tabular-nums flex-shrink-0">
            {raidCount} {raidCount === 1 ? 'raid' : 'raids'} • {attendedCount} attended
            {lootCount > 0 && <span className="text-[#a335ee]"> • {lootCount} loot</span>}
          </span>
        )}
        <div className="flex-1 h-[1px] bg-foreground/10" />
      </Button>

      {isExpanded && children}
    </div>
  )
}
