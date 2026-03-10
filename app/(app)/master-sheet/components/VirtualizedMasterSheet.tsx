'use client'

import { useMemo, useCallback, useRef } from 'react'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { BossSection, type ItemRankings, type PlayerRanking } from './BossSection'
import { RaidTierHeader } from './RaidTierHeader'
import { normalizeBossName } from '@/utils/bossOrder'
import { getBossOrder } from '@/utils/bossOrder'

interface RaidTier {
  id: string
  name: string
  phase: number
}

interface SortedRaidTier {
  tier: RaidTier
  items: ItemRankings[]
}

// Virtual list item types
type VirtualItem =
  | { type: 'raid-tier-header'; tier: RaidTier; itemCount: number }
  | { type: 'boss-section'; boss: string; items: ItemRankings[]; tierId: string }

interface VirtualizedMasterSheetProps {
  sortedRaidTiers: SortedRaidTier[]
  collapsedRaidTiers: Set<string>
  collapsedBosses: Set<string>
  onToggleRaidTierCollapse: (tierId: string) => void
  onToggleBossCollapse: (boss: string) => void
  activeCharacterId?: string
  guildSettings?: {
    decimal_places?: number
    minimum_raid_days?: number
  }
  onCompare?: (itemName: string, userRanking: PlayerRanking, winnerRanking: PlayerRanking) => void
  maxRankingsCount?: number
}

/**
 * Virtualized master sheet that only renders visible sections.
 * Flattens the raid tier + boss structure for efficient windowed rendering.
 */
export function VirtualizedMasterSheet({
  sortedRaidTiers,
  collapsedRaidTiers,
  collapsedBosses,
  onToggleRaidTierCollapse,
  onToggleBossCollapse,
  activeCharacterId,
  guildSettings,
  onCompare,
  maxRankingsCount,
}: VirtualizedMasterSheetProps) {
  const listRef = useRef<HTMLDivElement>(null)

  // Flatten the structure into a single list for virtualization
  const flattenedItems = useMemo(() => {
    const items: VirtualItem[] = []

    for (const { tier, items: tierItems } of sortedRaidTiers) {
      // Add raid tier header
      items.push({
        type: 'raid-tier-header',
        tier,
        itemCount: tierItems.length,
      })

      // If raid tier is collapsed, skip boss sections
      if (collapsedRaidTiers.has(tier.id)) {
        continue
      }

      // Group items by boss within this tier
      const tierGroupedByBoss: Record<string, ItemRankings[]> = {}
      tierItems.forEach((ir) => {
        const boss = normalizeBossName(ir.item.boss_name)
        if (!tierGroupedByBoss[boss]) {
          tierGroupedByBoss[boss] = []
        }
        tierGroupedByBoss[boss].push(ir)
      })

      // Sort boss names and add boss sections
      const tierBossNames = Object.keys(tierGroupedByBoss).sort(
        (a, b) => getBossOrder(a) - getBossOrder(b)
      )

      for (const boss of tierBossNames) {
        items.push({
          type: 'boss-section',
          boss,
          items: tierGroupedByBoss[boss],
          tierId: tier.id,
        })
      }
    }

    return items
  }, [sortedRaidTiers, collapsedRaidTiers])

  // Estimate item heights based on type and collapse state
  const estimateSize = useCallback(
    (index: number) => {
      const item = flattenedItems[index]
      if (item.type === 'raid-tier-header') {
        return 60 // Header height
      }
      // Boss section: header (56px) + table if not collapsed
      const isCollapsed = collapsedBosses.has(item.boss)
      if (isCollapsed) {
        return 60 // Just the boss header
      }
      // Header + table header + rows (estimated 52px per row)
      const itemCount = item.items.length
      return 60 + 44 + itemCount * 52
    },
    [flattenedItems, collapsedBosses]
  )

  const virtualizer = useWindowVirtualizer({
    count: flattenedItems.length,
    estimateSize,
    overscan: 3,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const totalSize = virtualizer.getTotalSize()

  // If we have few items, render without virtualization
  if (flattenedItems.length < 10) {
    return (
      <div ref={listRef} className="space-y-4">
        {flattenedItems.map((item, index) =>
          item.type === 'raid-tier-header' ? (
            <RaidTierHeader
              key={`tier-${item.tier.id}`}
              tierId={item.tier.id}
              tierName={item.tier.name}
              itemCount={item.itemCount}
              isCollapsed={collapsedRaidTiers.has(item.tier.id)}
              onToggle={onToggleRaidTierCollapse}
            />
          ) : (
            <BossSection
              key={`boss-${item.tierId}-${item.boss}`}
              boss={item.boss}
              items={item.items}
              isCollapsed={collapsedBosses.has(item.boss)}
              onToggleCollapse={onToggleBossCollapse}
              activeCharacterId={activeCharacterId}
              guildSettings={guildSettings}
              onCompare={onCompare}
              maxRankingsCount={maxRankingsCount}
            />
          )
        )}
      </div>
    )
  }

  return (
    <div ref={listRef}>
      <div
        style={{
          height: totalSize,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualItems.map((virtualItem) => {
          const item = flattenedItems[virtualItem.index]
          const key =
            item.type === 'raid-tier-header'
              ? `tier-${item.tier.id}`
              : `boss-${item.tierId}-${item.boss}`

          return (
            <div
              key={key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="pb-3"
            >
              {item.type === 'raid-tier-header' ? (
                <RaidTierHeader
                  tierId={item.tier.id}
                  tierName={item.tier.name}
                  itemCount={item.itemCount}
                  isCollapsed={collapsedRaidTiers.has(item.tier.id)}
                  onToggle={onToggleRaidTierCollapse}
                />
              ) : (
                <BossSection
                  boss={item.boss}
                  items={item.items}
                  isCollapsed={collapsedBosses.has(item.boss)}
                  onToggleCollapse={onToggleBossCollapse}
                  activeCharacterId={activeCharacterId}
                  guildSettings={guildSettings}
                  onCompare={onCompare}
                  maxRankingsCount={maxRankingsCount}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export type { SortedRaidTier, ItemRankings, PlayerRanking }
