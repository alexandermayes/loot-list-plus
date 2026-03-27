'use client'

import { useState } from 'react'
import ItemLink from '@/app/components/ItemLink'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, ArrowUp01Icon, UserMultipleIcon, CheckmarkCircle02Icon } from '@hugeicons/core-free-icons'
import { EmptyState } from '@/components/ui/empty-state'
import { ScrollIcon } from '@hugeicons/core-free-icons'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface LootListPlayer {
  character_id: string
  character_name: string
  class_name: string
  class_color: string
  primary_rank: number  // 1-2 (which slot)
  item_rank: number     // 1-20 (rank within slot)
}

export interface LootListAggregateItem {
  item_id: string
  item_name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
  classification: string
  total_lists: number
  already_awarded: number
  players: LootListPlayer[]
  average_rank: number
}

interface LootListSummaryViewProps {
  items: LootListAggregateItem[]
  loading: boolean
  bosses: string[]
  selectedBoss: string | null
  onBossFilter: (bossName: string | null) => void
}

export default function LootListSummaryView({
  items,
  loading,
  bosses,
  selectedBoss,
  onBossFilter,
}: LootListSummaryViewProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  // Filter items by selected boss
  const filteredItems = selectedBoss
    ? items.filter(item => item.boss_name === selectedBoss)
    : items

  // Sort by demand (most wanted first)
  const sortedItems = [...filteredItems].sort((a, b) => {
    // Primary sort: total lists (descending)
    if (b.total_lists !== a.total_lists) {
      return b.total_lists - a.total_lists
    }
    // Secondary sort: average rank (lower is better, so ascending)
    return a.average_rank - b.average_rank
  })

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Boss filter skeleton */}
        <div className="flex items-center gap-3">
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          <div className="h-9 w-48 bg-muted rounded-[52px] animate-pulse" />
        </div>
        {/* Item card skeletons */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-background-elevated border border-border rounded-xl overflow-hidden animate-pulse">
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="h-5 w-48 bg-muted rounded" />
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-24 bg-muted rounded" />
                      <div className="h-3 w-16 bg-muted rounded" />
                    </div>
                  </div>
                  <div className="h-8 w-16 bg-muted rounded-full" />
                </div>
                {/* Player pills skeleton */}
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="h-7 w-24 bg-muted rounded-full" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ScrollIcon}
        title="No ranked items"
        description="No approved loot lists found for this tier"
        variant="card"
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Boss Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-sm text-muted-foreground">Filter by boss:</span>
          <Select
            value={selectedBoss || ''}
            onChange={(e) => onBossFilter(e.target.value || null)}
            variant="rounded"
            size="sm"
            className="flex-1 sm:flex-initial sm:w-auto"
          >
            <option value="">All bosses</option>
            {bosses.map(boss => (
              <option key={boss} value={boss}>{boss}</option>
            ))}
          </Select>
        </div>
        <span className="text-sm text-muted-foreground sm:ml-auto">
          {sortedItems.length} item{sortedItems.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {sortedItems.map((item) => {
          const isExpanded = expandedItems.has(item.item_id)
          const sortedPlayers = [...item.players].sort((a, b) => {
            if (a.primary_rank !== b.primary_rank) return b.primary_rank - a.primary_rank
            return b.item_rank - a.item_rank
          })
          const displayPlayers = isExpanded ? sortedPlayers : sortedPlayers.slice(0, 3)
          const hasMore = item.players.length > 3

          return (
            <div
              key={item.item_id}
              className="bg-background-elevated border border-border rounded-xl overflow-hidden"
            >
              {/* Item Header */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <ItemLink
                      name={item.item_name}
                      wowheadId={item.wowhead_id}
                      className="font-semibold text-[14px]"
                    />
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[12px] text-muted-foreground">{item.boss_name}</span>
                      <span className="text-[12px] text-muted-foreground">·</span>
                      <span className="text-[12px] text-muted-foreground">{item.item_slot}</span>
                    </div>
                  </div>

                  {/* Stats Badges */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-full">
                      <HugeiconsIcon icon={UserMultipleIcon} size={14} className="text-accent" />
                      <span className="text-[13px] font-medium text-accent">{item.total_lists}</span>
                    </div>
                    {item.already_awarded > 0 && (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-success/10 border border-success/20 rounded-full">
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={14} className="text-success" />
                        <span className="text-[13px] font-medium text-success">{item.already_awarded}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Players List */}
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex flex-wrap gap-2">
                    {displayPlayers.map((player) => (
                        <div
                          key={player.character_id}
                          className="flex items-center gap-1.5 px-2.5 py-1 bg-background-inset border border-border rounded-full"
                        >
                          <span
                            className="text-[12px] font-medium"
                            style={{ color: player.class_color }}
                          >
                            {player.character_name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            #{player.item_rank}
                          </span>
                        </div>
                      ))}
                    {hasMore && !isExpanded && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleExpand(item.item_id)}
                        className="flex items-center gap-1 px-2.5 py-1 h-auto bg-background-inset rounded-full text-[12px] text-muted-foreground hover:text-foreground"
                      >
                        +{item.players.length - 3} more
                        <HugeiconsIcon icon={ArrowDown01Icon} size={12} />
                      </Button>
                    )}
                    {isExpanded && hasMore && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleExpand(item.item_id)}
                        className="flex items-center gap-1 px-2.5 py-1 h-auto bg-background-inset rounded-full text-[12px] text-muted-foreground hover:text-foreground"
                      >
                        Show less
                        <HugeiconsIcon icon={ArrowUp01Icon} size={12} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="bg-background-elevated border border-border rounded-xl p-4">
        <p className="text-foreground-muted text-[12px]">
          <span className="text-foreground">#N</span> = loot list rank (50 is highest priority, 1 is lowest). Sorted by priority within each item.
        </p>
      </div>
    </div>
  )
}
