'use client'

import { memo } from 'react'
import ItemLink from '@/app/components/ItemLink'
import { Button } from '@/components/ui/button'
import { getBossImage } from '@/utils/bossImages'

interface LootItem {
  id: string
  name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
  raid_tier_id?: string
  is_loot_council?: boolean
}

interface PlayerRanking {
  player_name: string
  class_name: string
  class_color: string
  loot_score: number
  rank: number
  attendance_score: number
  role_modifier: number
  priority_bonus: number
  bad_luck_bonus: number
  trial_penalty: number
  is_trial: boolean
  character_id: string
  raids_attended: number
  is_eligible: boolean
}

interface ItemRankings {
  item: LootItem
  rankings: PlayerRanking[]
}

interface BossSectionProps {
  boss: string
  items: ItemRankings[]
  isCollapsed: boolean
  onToggleCollapse: (boss: string) => void
  activeCharacterId?: string
  guildSettings?: {
    decimal_places?: number
    minimum_raid_days?: number
  }
  onCompare?: (itemName: string, userRanking: PlayerRanking, winnerRanking: PlayerRanking) => void
  maxRankingsCount?: number
}

/**
 * Memoized boss section component to prevent unnecessary re-renders.
 * Only re-renders when its specific props change.
 */
export const BossSection = memo(function BossSection({
  boss,
  items,
  isCollapsed,
  onToggleCollapse,
  activeCharacterId,
  guildSettings,
  onCompare,
  maxRankingsCount = 5,
}: BossSectionProps) {
  const bossImage = getBossImage(boss)
  const decimalPlaces = guildSettings?.decimal_places ?? 2
  const minimumRaidDays = guildSettings?.minimum_raid_days || 2
  const columnCount = maxRankingsCount || 5
  const columnIndices = Array.from({ length: columnCount }, (_, i) => i)

  return (
    <div
      id={`boss-${boss.replace(/\s+/g, '-')}`}
      className="bg-background-elevated border border-border rounded-xl overflow-hidden scroll-mt-[140px]"
    >
      {/* Boss Header - Clickable */}
      <Button
        variant="ghost"
        onClick={() => onToggleCollapse(boss)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-muted transition-colors !rounded-none"
      >
        <div className="flex items-center gap-3">
          {bossImage && (
            <img
              src={bossImage}
              alt={boss}
              className="w-6 h-6 rounded border border-border/50 shadow-sm"
            />
          )}
          <h2 className="text-[15px] font-semibold text-foreground">{boss}</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-foreground-muted font-medium">
            {items.length} item{items.length !== 1 ? 's' : ''}
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
      </Button>

      {/* Items - Collapsible */}
      {!isCollapsed && (
        <>
          {/* Mobile Cards */}
          <div className="sm:hidden border-t border-border divide-y divide-border">
            {items.map((ir) => (
              <div key={ir.item.id} className={`px-4 py-3 space-y-2 ${!ir.item.is_loot_council && ir.rankings.length === 0 ? 'bg-destructive/10' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <ItemLink
                      name={ir.item.name}
                      wowheadId={ir.item.wowhead_id}
                      className="font-medium text-[13px]"
                    />
                    <p className="text-[11px] text-foreground-muted mt-0.5">{ir.item.item_slot}</p>
                  </div>
                </div>
                {ir.item.is_loot_council ? (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-accent/20 text-accent">Loot Council</span>
                ) : ir.rankings.length > 0 ? (
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {ir.rankings.map((ranking, index) => {
                      const isCurrentUser = activeCharacterId === ranking.character_id
                      const canCompare = isCurrentUser && index > 0 && ir.rankings[0]
                      return (
                        <div
                          key={index}
                          className={`flex items-baseline gap-1 ${canCompare ? 'cursor-pointer' : ''}`}
                          onClick={canCompare && onCompare ? () => onCompare(ir.item.name, ranking, ir.rankings[0]) : undefined}
                        >
                          <span className="text-[11px] text-foreground-muted">#{index + 1}</span>
                          <span
                            className={`text-[12px] font-medium ${isCurrentUser ? 'underline decoration-dotted underline-offset-2' : ''}`}
                            style={{ color: ranking.class_color }}
                          >
                            {ranking.player_name}
                            {ranking.is_trial && <span className="text-warning text-[9px] ml-0.5">(T)</span>}
                            {!ranking.is_eligible && <span className="text-destructive text-[9px] ml-0.5">⊘</span>}
                          </span>
                          <span className="text-[10px] text-foreground-muted">{ranking.loot_score.toFixed(decimalPlaces)}</span>
                          {canCompare && <span className="text-[9px] text-accent">Why?</span>}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">No one has ranked this item</p>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block border-t border-border overflow-x-auto max-h-[70vh] overflow-y-auto">
            <table className="w-full" style={{ minWidth: `${380 + columnCount * 120}px` }}>
              <thead className="sticky top-0 z-10">
                <tr className="bg-background-subtle">
                  <th className="px-5 py-2.5 text-left text-[12px] font-medium text-foreground-muted w-[280px] bg-background-subtle">Item</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted w-[100px] bg-background-subtle">Slot</th>
                  {columnIndices.map((i) => (
                    <th key={i} className="px-3 py-2.5 text-center text-[12px] font-medium text-foreground-muted w-[120px] bg-background-subtle">#{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((ir) => (
                  <ItemRow
                    key={ir.item.id}
                    itemRanking={ir}
                    activeCharacterId={activeCharacterId}
                    decimalPlaces={decimalPlaces}
                    minimumRaidDays={minimumRaidDays}
                    onCompare={onCompare}
                    columnCount={columnCount}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
})

interface ItemRowProps {
  itemRanking: ItemRankings
  activeCharacterId?: string
  decimalPlaces: number
  minimumRaidDays: number
  onCompare?: (itemName: string, userRanking: PlayerRanking, winnerRanking: PlayerRanking) => void
  columnCount: number
}

/**
 * Memoized item row component.
 */
const ItemRow = memo(function ItemRow({
  itemRanking: ir,
  activeCharacterId,
  decimalPlaces,
  minimumRaidDays,
  onCompare,
  columnCount,
}: ItemRowProps) {
  const columnIndices = Array.from({ length: columnCount }, (_, i) => i)
  return (
    <tr
      id={`item-${ir.item.id}`}
      className={`transition-colors hover:bg-muted ${!ir.item.is_loot_council && ir.rankings.length === 0 ? 'bg-destructive/10' : ''}`}
    >
      <td className="px-5 py-2.5">
        <ItemLink
          name={ir.item.name}
          wowheadId={ir.item.wowhead_id}
          className="font-medium text-[13px]"
        />
      </td>
      <td className="px-3 py-2.5 text-[12px] text-foreground-muted">
        {ir.item.item_slot}
      </td>
      {ir.item.is_loot_council ? (
        <>
          <td className="px-3 py-2.5">
            <span className="text-[12px] font-medium px-2.5 py-0.5 rounded bg-accent/20 text-accent">Loot Council</span>
          </td>
          {columnCount > 1 && <td colSpan={columnCount - 1} />}
        </>
      ) : (
        columnIndices.map((index) => {
          const ranking = ir.rankings[index]
          const isCurrentUser = ranking && activeCharacterId === ranking.character_id
          const canCompare = isCurrentUser && index > 0 && ir.rankings[0]
          return (
            <td key={index} className="px-3 py-2.5 text-center">
              {ranking ? (
                <div
                  className={`flex flex-col items-center ${
                    isCurrentUser ? 'relative' : ''
                  } ${
                    canCompare ? 'cursor-pointer hover:bg-accent/10 rounded-lg p-1 -m-1 transition-colors' : ''
                  } ${
                    !ranking.is_eligible ? 'opacity-50' : ''
                  }`}
                  onClick={canCompare && onCompare ? () => {
                    onCompare(ir.item.name, ranking, ir.rankings[0])
                  } : undefined}
                >
                  <span
                    className={`text-[13px] font-medium ${isCurrentUser ? 'underline decoration-dotted underline-offset-2' : ''}`}
                    style={{ color: ranking.class_color }}
                  >
                    {ranking.player_name}
                    {ranking.is_trial && (
                      <span className="text-warning text-[10px] ml-0.5" title="Trial member">(T)</span>
                    )}
                    {!ranking.is_eligible && (
                      <span className="text-destructive text-[10px] ml-0.5" title={`Ineligible: ${ranking.raids_attended}/${minimumRaidDays} raids attended`}>⊘</span>
                    )}
                  </span>
                  <span className="text-[11px] text-foreground-muted">
                    {ranking.loot_score.toFixed(decimalPlaces)}
                  </span>
                  {canCompare && (
                    <span className="text-[10px] text-accent mt-0.5">Why?</span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </td>
          )
        })
      )}
    </tr>
  )
})

export type { ItemRankings, PlayerRanking, LootItem }
