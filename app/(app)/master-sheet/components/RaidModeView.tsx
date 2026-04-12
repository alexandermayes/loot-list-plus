'use client'

import { useState, useMemo, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import ItemLink from '@/app/components/ItemLink'
import type { ItemRankings, PlayerRanking, LootItem } from './BossSection'

interface RaidTier {
  id: string
  name: string
  phase: number
}

interface SortedRaidTier {
  tier: RaidTier
  items: ItemRankings[]
}

interface RaidModeViewProps {
  sortedRaidTiers: SortedRaidTier[]
  onItemClick: (item: LootItem, rankings: PlayerRanking[]) => void
  decimalPlaces?: number
}

export function RaidModeView({ sortedRaidTiers, onItemClick, decimalPlaces = 2 }: RaidModeViewProps) {
  const [search, setSearch] = useState('')

  // Flatten all items across all tiers for search
  const allItems = useMemo(() => {
    const items: ItemRankings[] = []
    for (const { items: tierItems } of sortedRaidTiers) {
      for (const ir of tierItems) {
        items.push(ir)
      }
    }
    return items
  }, [sortedRaidTiers])

  // Filter by search
  const filteredItems = useMemo(() => {
    if (!search.trim()) return allItems
    const q = search.toLowerCase()
    return allItems.filter(ir =>
      ir.item.name.toLowerCase().includes(q) ||
      ir.item.boss_name.toLowerCase().includes(q) ||
      ir.item.item_slot.toLowerCase().includes(q)
    )
  }, [allItems, search])

  const handleItemClick = useCallback((ir: ItemRankings) => {
    onItemClick(ir.item, ir.rankings)
  }, [onItemClick])

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="sticky top-[112px] sm:top-[56px] z-10 bg-background py-2">
        <Input
          type="text"
          placeholder="Search items, bosses, or slots..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          variant="pill"
          className="max-w-md"
          autoFocus
        />
        <p className="text-[11px] text-muted-foreground mt-1">
          {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
          {search && ` matching "${search}"`}
          {' '}&middot; Click any item to see all candidates
        </p>
      </div>

      {/* Item list */}
      <div className="space-y-1">
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {search ? `No items matching "${search}"` : 'No items available.'}
          </div>
        ) : (
          filteredItems.map((ir) => (
            <RaidModeItem
              key={ir.item.id}
              ir={ir}
              decimalPlaces={decimalPlaces}
              onClick={handleItemClick}
            />
          ))
        )}
      </div>
    </div>
  )
}

interface RaidModeItemProps {
  ir: ItemRankings
  decimalPlaces: number
  onClick: (ir: ItemRankings) => void
}

function RaidModeItem({ ir, decimalPlaces, onClick }: RaidModeItemProps) {
  const top3 = ir.rankings.slice(0, 3)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(ir)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(ir) }}
      className="flex items-center gap-4 px-4 py-2.5 bg-background-elevated border border-border rounded-lg cursor-pointer hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Item info */}
      <div className="min-w-0 w-[260px] shrink-0">
        <ItemLink
          name={ir.item.name}
          wowheadId={ir.item.wowhead_id}
          className="text-[13px] font-medium"
          clickable={false}
        />
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[11px] text-muted-foreground">{ir.item.boss_name}</span>
          <span className="text-[11px] text-muted-foreground">&middot;</span>
          <span className="text-[11px] text-muted-foreground">{ir.item.item_slot}</span>
        </div>
      </div>

      {/* Top 3 candidates */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {ir.item.is_loot_council ? (
          <span className="text-[12px] font-medium px-2.5 py-0.5 rounded bg-accent/20 text-accent">Loot Council</span>
        ) : top3.length === 0 ? (
          <span className="text-[12px] text-muted-foreground">No candidates</span>
        ) : (
          top3.map((r, i) => (
            <div key={r.character_id} className="flex items-baseline gap-1.5 min-w-0">
              <span className="text-[11px] text-muted-foreground font-medium">#{i + 1}</span>
              <span
                className="text-[13px] font-medium truncate"
                style={{ color: r.class_color }}
              >
                {r.player_name}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                {r.loot_score.toFixed(decimalPlaces)}
              </span>
              {r.is_trial && <span className="text-[9px] text-warning">(T)</span>}
              {!r.is_eligible && <span className="text-[9px] text-destructive">⊘</span>}
            </div>
          ))
        )}
      </div>

      {/* Total candidates count */}
      <div className="text-[11px] text-muted-foreground shrink-0 tabular-nums w-[60px] text-right">
        {ir.rankings.length > 0 && `${ir.rankings.length} total`}
      </div>
    </div>
  )
}
