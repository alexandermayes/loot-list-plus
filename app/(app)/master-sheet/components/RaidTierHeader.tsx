'use client'

import { memo } from 'react'
import { getRaidIcon } from '@/utils/raidIcons'

interface RaidTierHeaderProps {
  tierId: string
  tierName: string
  itemCount: number
  isCollapsed: boolean
  onToggle: (tierId: string) => void
}

/**
 * Memoized raid tier header component.
 */
export const RaidTierHeader = memo(function RaidTierHeader({
  tierId,
  tierName,
  itemCount,
  isCollapsed,
  onToggle,
}: RaidTierHeaderProps) {
  return (
    <button
      onClick={() => onToggle(tierId)}
      className="w-full text-left px-5 py-3 rounded-xl transition-colors bg-background-subtle border border-border hover:bg-muted"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src={getRaidIcon(tierName)}
            alt=""
            width={24}
            height={24}
            className="w-6 h-6 rounded border border-border/50"
          />
          <span className="text-[15px] font-semibold text-foreground">{tierName}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-muted-foreground">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
          </span>
          <svg
            className={`w-4 h-4 text-muted-foreground transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  )
})
