'use client'

import { memo, useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import ItemLink from '@/app/components/ItemLink'
import { Button } from '@/components/ui/button'
import { getBossImage } from '@/utils/bossImages'
// Lazy-load boss quotes to keep initial bundle small
let _bossQuotes: typeof import('@/data/boss-quotes') | null = null
async function loadBossQuote(boss: string): Promise<string | null> {
  if (!_bossQuotes) {
    _bossQuotes = await import('@/data/boss-quotes')
  }
  return _bossQuotes.getBossQuote(boss)
}
import type { ScoreResult, ScoreComponents, ScoringConfig } from '@/domain/types'
import { explainScore } from '@/domain/scoring/explain'


interface LootItem {
  id: string
  name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
  raid_tier_id?: string
  is_loot_council?: boolean
  classification?: string
}

interface PlayerRanking {
  player_name: string
  class_name: string
  class_color: string
  loot_score: number
  rank: number
  attendance_score: number
  role_modifier: number
  role_bonus: number
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

/** Reconstruct a ScoreResult from the flat PlayerRanking fields */
function rankingToScoreResult(r: PlayerRanking): ScoreResult {
  const components: ScoreComponents = {
    itemRank: r.rank,
    attendanceScore: r.attendance_score,
    rankModifier: r.role_modifier,
    roleBonus: r.role_bonus,
    badLuckBonus: r.bad_luck_bonus,
    priorityBonus: r.priority_bonus,
    trialPenalty: r.trial_penalty,
  }
  return { total: r.loot_score, components }
}

/** Officer-only score breakdown popover — shows explainScore() lines on hover */
function ScoreBreakdownPopover({
  ranking,
  config,
  decimalPlaces,
  onMouseEnter,
  onMouseLeave,
  anchorRef,
}: {
  ranking: PlayerRanking
  config: Partial<ScoringConfig>
  decimalPlaces: number
  onMouseEnter: () => void
  onMouseLeave: () => void
  anchorRef: HTMLElement | null
}) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!anchorRef) return
    const rect = anchorRef.getBoundingClientRect()
    setPosition({
      top: rect.bottom + 4,
      left: rect.left + rect.width / 2,
    })
  }, [anchorRef])

  if (!position) return null

  const result = rankingToScoreResult(ranking)
  const explanation = explainScore(result, config)

  return createPortal(
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="fixed z-[9999] bg-background-elevated border border-border rounded-lg shadow-lg p-3 w-56"
      style={{ top: position.top, left: position.left, transform: 'translateX(-50%)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-semibold" style={{ color: ranking.class_color }}>
          {ranking.player_name}
        </span>
        <span className="text-[12px] font-bold text-foreground">{explanation.total.toFixed(decimalPlaces)}</span>
      </div>
      <div className="space-y-1">
        {explanation.lines.map(line => (
          <div key={line.key} className="flex items-center justify-between">
            <span className="text-[11px] text-foreground-secondary">{line.label}</span>
            <span className={`text-[11px] font-medium ${line.value >= 0 ? 'text-foreground' : 'text-destructive'}`}>
              {line.value >= 0 ? '+' : ''}{line.value.toFixed(decimalPlaces)}
            </span>
          </div>
        ))}
      </div>
      {ranking.is_trial && (
        <p className="text-[10px] text-warning mt-1.5 pt-1.5 border-t border-border">Trial member</p>
      )}
      {!ranking.is_eligible && (
        <p className="text-[10px] text-destructive mt-1.5 pt-1.5 border-t border-border">Ineligible (min raids not met)</p>
      )}
    </div>,
    document.body
  )
}

interface BossSectionProps {
  boss: string
  items: ItemRankings[]
  isCollapsed: boolean
  onToggleCollapse: (boss: string) => void
  activeCharacterId?: string
  isOfficer?: boolean
  guildSettings?: Partial<ScoringConfig> & {
    decimal_places?: number
    minimum_raid_days?: number
  }
  onCompare?: (itemName: string, userRanking: PlayerRanking, winnerRanking: PlayerRanking) => void
  onItemClick?: (item: LootItem, rankings: PlayerRanking[]) => void
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
  isOfficer,
  guildSettings,
  onCompare,
  onItemClick,
  maxRankingsCount = 5,
}: BossSectionProps) {
  const bossImage = getBossImage(boss)
  const [bossQuote, setBossQuote] = useState<string | null>(null)
  const decimalPlaces = guildSettings?.decimal_places ?? 2

  // Lazy-load boss quote when section is expanded
  useEffect(() => {
    if (!isCollapsed && bossQuote === null) {
      loadBossQuote(boss).then(setBossQuote)
    }
  }, [isCollapsed, boss])
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
              width={24}
              height={24}
              className="w-6 h-6 rounded border border-border/50 shadow-sm"
            />
          )}
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">{boss}</h2>
            {bossQuote && !isCollapsed && (
              <p className="text-[11px] italic text-muted-foreground/60 mt-0.5">&quot;{bossQuote}&quot;</p>
            )}
          </div>
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
                      className={`font-medium text-[13px] ${isOfficer && onItemClick ? 'cursor-pointer' : ''}`}
                      onClick={isOfficer && onItemClick ? (e: React.MouseEvent) => {
                        e.preventDefault()
                        onItemClick(ir.item, ir.rankings)
                      } : undefined}
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
                          <span className="text-[10px] text-foreground-muted inline-flex items-center gap-0.5">
                            {ranking.loot_score.toFixed(decimalPlaces)}
                            {(() => {
                              const topScore = ir.rankings[0]?.loot_score ?? 0
                              const isTiedAtTop = ir.rankings.length > 1
                                && Math.abs(ranking.loot_score - topScore) < 0.01
                                && Math.abs(ir.rankings[1].loot_score - topScore) < 0.01
                              if (isTiedAtTop) return <span className="text-[8px] font-medium text-warning px-0.5 rounded bg-warning/15">tied</span>
                              if (index === 0 && ir.rankings[1]) {
                                const gap = ranking.loot_score - ir.rankings[1].loot_score
                                const threshold = Math.max(1, topScore * 0.1)
                                if (gap > 0.01 && gap <= threshold) return <span className="text-[8px] text-muted-foreground/70" title={`${gap.toFixed(decimalPlaces)} point lead over #2`}>+{gap.toFixed(decimalPlaces)}</span>
                              }
                              return null
                            })()}
                          </span>
                          {canCompare && <span className="text-[9px] text-accent">Why?</span>}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <span className="text-[11px] text-muted-foreground">No one has ranked this item</span>
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
                    isOfficer={isOfficer}
                    guildSettings={guildSettings}
                    decimalPlaces={decimalPlaces}
                    minimumRaidDays={minimumRaidDays}
                    onCompare={onCompare}
                    onItemClick={onItemClick}
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
  isOfficer?: boolean
  guildSettings?: Partial<ScoringConfig> & { decimal_places?: number; minimum_raid_days?: number }
  decimalPlaces: number
  minimumRaidDays: number
  onCompare?: (itemName: string, userRanking: PlayerRanking, winnerRanking: PlayerRanking) => void
  onItemClick?: (item: LootItem, rankings: PlayerRanking[]) => void
  columnCount: number
}

/**
 * Memoized item row component.
 */
const ItemRow = memo(function ItemRow({
  itemRanking: ir,
  activeCharacterId,
  isOfficer,
  guildSettings,
  decimalPlaces,
  minimumRaidDays,
  onCompare,
  onItemClick,
  columnCount,
}: ItemRowProps) {
  const columnIndices = Array.from({ length: columnCount }, (_, i) => i)
  // Officer score popover state — hover-based, per-cell
  const [hoveredPopover, setHoveredPopover] = useState<{ index: number; anchor: HTMLElement } | null>(null)
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showPopover = useCallback((index: number, anchor: HTMLElement) => {
    if (hideTimeout.current) { clearTimeout(hideTimeout.current); hideTimeout.current = null }
    setHoveredPopover({ index, anchor })
  }, [])

  const scheduleHide = useCallback(() => {
    hideTimeout.current = setTimeout(() => setHoveredPopover(null), 150)
  }, [])

  const cancelHide = useCallback(() => {
    if (hideTimeout.current) { clearTimeout(hideTimeout.current); hideTimeout.current = null }
  }, [])

  return (
    <tr
      id={`item-${ir.item.id}`}
      className={`transition-colors hover:bg-muted ${!ir.item.is_loot_council && ir.rankings.length === 0 ? 'bg-destructive/10' : ''} ${isOfficer && onItemClick ? 'cursor-pointer' : ''}`}
      onClick={isOfficer && onItemClick ? () => onItemClick(ir.item, ir.rankings) : undefined}
    >
      <td className="px-5 py-2.5">
        <ItemLink
          name={ir.item.name}
          wowheadId={ir.item.wowhead_id}
          className={`font-medium text-[13px] ${isOfficer && onItemClick ? 'cursor-pointer' : ''}`}
          onClick={isOfficer && onItemClick ? (e: React.MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            onItemClick(ir.item, ir.rankings)
          } : undefined}
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
                  title={
                    index > 0 && ir.rankings[index - 1] &&
                    ranking.loot_score === ir.rankings[index - 1].loot_score
                      ? 'Tied score — /roll to decide!'
                      : undefined
                  }
                  onClick={canCompare && onCompare ? (e: React.MouseEvent) => {
                    e.stopPropagation()
                    onCompare(ir.item.name, ranking, ir.rankings[0])
                  } : undefined}
                  onMouseEnter={(e) => showPopover(index, e.currentTarget as HTMLElement)}
                  onMouseLeave={scheduleHide}
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
                  <span className="text-[11px] text-foreground-muted inline-flex items-center gap-0.5">
                    {ranking.loot_score.toFixed(decimalPlaces)}
                    {/* Tied badge on all candidates sharing #1 score, close-gap on #1 only */}
                    {(() => {
                      const topScore = ir.rankings[0]?.loot_score ?? 0
                      const isTiedAtTop = ir.rankings.length > 1
                        && Math.abs(ranking.loot_score - topScore) < 0.01
                        && Math.abs(ir.rankings[1].loot_score - topScore) < 0.01
                      if (isTiedAtTop) return <span className="ml-1 text-[9px] font-medium text-warning px-1 py-px rounded bg-warning/15">tied</span>
                      if (index === 0 && ir.rankings[1]) {
                        const gap = ranking.loot_score - ir.rankings[1].loot_score
                        const threshold = Math.max(1, topScore * 0.1)
                        if (gap > 0.01 && gap <= threshold) return <span className="ml-1 text-[9px] text-muted-foreground/70" title={`${gap.toFixed(decimalPlaces)} point lead over #2`}>+{gap.toFixed(decimalPlaces)}</span>
                      }
                      return null
                    })()}
                  </span>
                  {hoveredPopover?.index === index && guildSettings && (
                    <ScoreBreakdownPopover
                      ranking={ranking}
                      config={guildSettings}
                      decimalPlaces={decimalPlaces}
                      onMouseEnter={cancelHide}
                      onMouseLeave={scheduleHide}
                      anchorRef={hoveredPopover.anchor}
                    />
                  )}
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
