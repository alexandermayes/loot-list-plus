'use client'

import React, { useState, useRef, useMemo, useCallback, useEffect, memo } from 'react'
import SearchableItemSelect from '@/app/components/SearchableItemSelect'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { ExpansionGuard } from '@/app/components/ExpansionGuard'
import { TierTabsSkeleton, LootListContentSkeleton, Skeleton } from '@/components/ui/skeletons'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { useConfirm } from '@/components/ui/confirm-modal'
import { Heading, Text, LabelText } from '@/components/ui/typography'
import { normalizeBossName } from '@/utils/bossOrder'
import { getRaidIcon, getRaidShorthand } from '@/utils/raidIcons'
import { CheckFilledIcon, ClockFilledIcon, AlertFilledIcon, CancelFilledIcon } from '@/components/ui/icons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { HugeiconsIcon } from '@hugeicons/react'
import { InformationCircleIcon } from '@hugeicons/core-free-icons'
import { useLootList, type LootItem } from '@/app/contexts/LootListContext'
import { getPhaseGroupShortLabel } from '@/domain/expansion/phase-groups'
import { isTokenSlot } from '@/data/token-class-mapping'
import { useNotification } from '@/app/contexts/NotificationContext'
import { trackClientEvent, usePagePerf } from '@/utils/analytics/client'
import { ClassificationBadge } from '@/components/ui/classification-badge'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { BisImportModal } from '@/app/components/BisImportModal'
import { HorizontalScroll } from '@/components/ui/horizontal-scroll'
import ItemLink from '@/app/components/ItemLink'

// Helper function for rank colors - defined outside component for stability
const getRankColor = (rank: number) => {
  if (rank >= 48) return 'from-red-900 to-red-700' // Bracket 1
  if (rank >= 45) return 'from-orange-900 to-orange-700' // Bracket 2
  if (rank >= 42) return 'from-yellow-900 to-yellow-700' // Bracket 3
  if (rank >= 39) return 'from-amber-900 to-amber-700' // Bracket 4
  if (rank >= 25) return 'from-green-900 to-green-700' // No Bracket (Main-spec)
  return 'from-blue-900 to-blue-700' // Off-spec
}

// Solid background color for mobile cards (no gradient needed)
const getRankBgColor = (rank: number) => {
  if (rank >= 48) return 'bg-red-800'
  if (rank >= 45) return 'bg-orange-800'
  if (rank >= 42) return 'bg-yellow-800'
  if (rank >= 39) return 'bg-amber-800'
  if (rank >= 25) return 'bg-green-800'
  return 'bg-blue-800'
}

// Type for tracking which items have errors
type ItemError = {
  rank: number
  slot: 1 | 2
  itemId: string
  errorType: 'allocation' | 'duplicate_type' | 'duplicate_slot' | 'reserved_companion'
  message: string
}

// RankRow component - defined outside main component to prevent remounting on parent re-renders
interface RankRowProps {
  rank: number
  lootItems: LootItem[]
  selectedItemId1: string | undefined
  selectedItemId2: string | undefined
  selectedItems: Set<string>
  duplicateItems: string[]
  onItemSelect: (rank: number, slot: number, itemId: string) => void
  /** Errors affecting slot 1 */
  slot1Errors?: ItemError[]
  /** Errors affecting slot 2 */
  slot2Errors?: ItemError[]
  /** Set of wowhead_ids that the user already owns (imported from WowSims) */
  ownedWowheadIds?: Set<number>
  /** When true, shows remove buttons instead of edit controls */
  isApproved?: boolean
  /** Called when user removes an item from an approved list */
  onRemoveItem?: (lootItemId: string, itemName: string) => void
  /** Item ID currently being removed */
  removingItemId?: string | null
  /** Items that were removed from this rank (keyed by rank-slot) */
  removedRankings?: Record<string, string>
  /** Called when user restores a removed item */
  onRestoreItem?: (lootItemId: string, itemName: string) => void
}

const RankRow = memo(function RankRow({
  rank,
  lootItems,
  selectedItemId1,
  selectedItemId2,
  selectedItems,
  duplicateItems,
  onItemSelect,
  slot1Errors = [],
  slot2Errors = [],
  ownedWowheadIds = new Set(),
  isApproved = false,
  onRemoveItem,
  removingItemId,
  removedRankings = {},
  onRestoreItem
}: RankRowProps) {
  const selectedItem1 = selectedItemId1 ? lootItems.find(i => i.id === selectedItemId1) : null
  const selectedItem2 = selectedItemId2 ? lootItems.find(i => i.id === selectedItemId2) : null
  const removedItemId1 = removedRankings[`${rank}-1`]
  const removedItemId2 = removedRankings[`${rank}-2`]
  const removedItem1 = removedItemId1 ? lootItems.find(i => i.id === removedItemId1) : null
  const removedItem2 = removedItemId2 ? lootItems.find(i => i.id === removedItemId2) : null
  const isDuplicate1 = selectedItemId1 && duplicateItems.includes(selectedItemId1)
  const isDuplicate2 = selectedItemId2 && duplicateItems.includes(selectedItemId2)

  // Disable sibling slot if a Reserved item is selected
  const isSlot1DisabledByReserved = selectedItem2?.classification === 'Reserved'
  const isSlot2DisabledByReserved = selectedItem1?.classification === 'Reserved'

  // Check if this row has errors
  const hasSlot1Error = slot1Errors.length > 0
  const hasSlot2Error = slot2Errors.length > 0
  const hasRowError = isDuplicate1 || isDuplicate2 || hasSlot1Error || hasSlot2Error

  // Get unique error messages for display below dropdown
  const slot1ErrorMessages = [...new Set(slot1Errors.map(e => e.message))]
  const slot2ErrorMessages = [...new Set(slot2Errors.map(e => e.message))]

  return (
    <tr className={`border-b border-border ${hasRowError ? 'bg-red-900/20' : ''}`}>
      <td className={`px-3 py-2.5 font-semibold text-[13px] text-foreground bg-gradient-to-r ${getRankColor(rank)}`} rowSpan={1}>
        {rank}
      </td>
      <td className="px-3 py-2.5">
        {!selectedItemId1 && removedItem1 ? (
          <div className="px-3 py-2 bg-background-elevated border border-border rounded-[52px] opacity-50 overflow-hidden group hover:opacity-75 transition-opacity">
            <span className="flex items-center gap-2 min-w-0">
              <span className="truncate min-w-0"><ItemLink name={removedItem1.name} wowheadId={removedItem1.wowhead_id} clickable={false} className="line-through" /></span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-success/20 text-success shrink-0 group-hover:hidden">Removed</span>
              {onRestoreItem && (
                <button
                  onClick={() => onRestoreItem(removedItem1.id, removedItem1.name)}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/20 text-accent shrink-0 hidden group-hover:inline-block hover:bg-accent/30"
                >
                  Undo
                </button>
              )}
            </span>
          </div>
        ) : (
          <div className="space-y-1">
            <SearchableItemSelect
              items={lootItems}
              value={selectedItemId1 || ''}
              onChange={(value) => onItemSelect(rank, 1, value)}
              disabled={selectedItems}
              currentValue={selectedItemId1}
              isSlotDisabled={isSlot1DisabledByReserved}
              hasError={hasSlot1Error}
              ownedWowheadIds={ownedWowheadIds}
              readOnly={isApproved}
              onRemove={isApproved && onRemoveItem && selectedItemId1 ? () => {
                const item = lootItems.find(i => i.id === selectedItemId1)
                if (item) onRemoveItem(item.id, item.name)
              } : undefined}
            />
            {hasSlot1Error && (
              <p className="text-destructive text-[11px] pl-3">
                {slot1ErrorMessages.join(' · ')}
              </p>
            )}
          </div>
        )}
      </td>
      <td className="px-3 py-2.5">
        {selectedItem1 ? (
          <div className="flex items-center gap-2">
            <p className="text-foreground-muted text-[12px]">{normalizeBossName(selectedItem1.boss_name)}</p>
            {selectedItem1.classification && (
              <ClassificationBadge classification={selectedItem1.classification as 'Reserved' | 'Limited' | 'Unlimited'} />
            )}
          </div>
        ) : removedItem1 ? (
          <span className="text-muted-foreground text-[12px]">{normalizeBossName(removedItem1.boss_name)}</span>
        ) : isSlot1DisabledByReserved ? (
          <span className="text-muted-foreground text-[12px] italic">Reserved item in slot 2</span>
        ) : <span className="text-foreground-muted text-[12px]">-</span>}
      </td>
      <td className="px-3 py-2.5">
        {!selectedItemId2 && removedItem2 ? (
          <div className="px-3 py-2 bg-background-elevated border border-border rounded-[52px] opacity-50 overflow-hidden group hover:opacity-75 transition-opacity">
            <span className="flex items-center gap-2 min-w-0">
              <span className="truncate min-w-0"><ItemLink name={removedItem2.name} wowheadId={removedItem2.wowhead_id} clickable={false} className="line-through" /></span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-success/20 text-success shrink-0 group-hover:hidden">Removed</span>
              {onRestoreItem && (
                <button
                  onClick={() => onRestoreItem(removedItem2.id, removedItem2.name)}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/20 text-accent shrink-0 hidden group-hover:inline-block hover:bg-accent/30"
                >
                  Undo
                </button>
              )}
            </span>
          </div>
        ) : (
          <div className="space-y-1">
            <SearchableItemSelect
              items={lootItems}
              value={selectedItemId2 || ''}
              onChange={(value) => onItemSelect(rank, 2, value)}
              disabled={selectedItems}
              currentValue={selectedItemId2}
              isSlotDisabled={isSlot2DisabledByReserved}
              hasError={hasSlot2Error}
              ownedWowheadIds={ownedWowheadIds}
              readOnly={isApproved}
              onRemove={isApproved && onRemoveItem && selectedItemId2 ? () => {
                const item = lootItems.find(i => i.id === selectedItemId2)
                if (item) onRemoveItem(item.id, item.name)
              } : undefined}
            />
            {hasSlot2Error && (
              <p className="text-destructive text-[11px] pl-3">
                {slot2ErrorMessages.join(' · ')}
              </p>
            )}
          </div>
        )}
      </td>
      <td className="px-3 py-2.5">
        {selectedItem2 ? (
          <div className="flex items-center gap-2">
            <p className="text-foreground-muted text-[12px]">{normalizeBossName(selectedItem2.boss_name)}</p>
            {selectedItem2.classification && (
              <ClassificationBadge classification={selectedItem2.classification as 'Reserved' | 'Limited' | 'Unlimited'} />
            )}
          </div>
        ) : removedItem2 ? (
          <span className="text-muted-foreground text-[12px]">{normalizeBossName(removedItem2.boss_name)}</span>
        ) : isSlot2DisabledByReserved ? (
          <span className="text-muted-foreground text-[12px] italic">Reserved item in slot 1</span>
        ) : <span className="text-foreground-muted text-[12px]">-</span>}
      </td>
    </tr>
  )
})

// MobileRankCard - stacked card layout for mobile (replaces table row below sm: breakpoint)
const MobileRankCard = memo(function MobileRankCard({
  rank,
  lootItems,
  selectedItemId1,
  selectedItemId2,
  selectedItems,
  duplicateItems,
  onItemSelect,
  slot1Errors = [],
  slot2Errors = [],
  ownedWowheadIds = new Set(),
  isApproved = false,
  onRemoveItem,
  removingItemId,
  removedRankings = {},
  onRestoreItem
}: RankRowProps) {
  const selectedItem1 = selectedItemId1 ? lootItems.find(i => i.id === selectedItemId1) : null
  const selectedItem2 = selectedItemId2 ? lootItems.find(i => i.id === selectedItemId2) : null
  const removedItemId1 = removedRankings[`${rank}-1`]
  const removedItemId2 = removedRankings[`${rank}-2`]
  const removedItem1 = removedItemId1 ? lootItems.find(i => i.id === removedItemId1) : null
  const removedItem2 = removedItemId2 ? lootItems.find(i => i.id === removedItemId2) : null
  const isDuplicate1 = selectedItemId1 && duplicateItems.includes(selectedItemId1)
  const isDuplicate2 = selectedItemId2 && duplicateItems.includes(selectedItemId2)

  const isSlot1DisabledByReserved = selectedItem2?.classification === 'Reserved'
  const isSlot2DisabledByReserved = selectedItem1?.classification === 'Reserved'

  const hasSlot1Error = slot1Errors.length > 0
  const hasSlot2Error = slot2Errors.length > 0
  const hasCardError = isDuplicate1 || isDuplicate2 || hasSlot1Error || hasSlot2Error

  const slot1ErrorMessages = [...new Set(slot1Errors.map(e => e.message))]
  const slot2ErrorMessages = [...new Set(slot2Errors.map(e => e.message))]

  const renderSlot = (
    slotNum: 1 | 2,
    selectedItemId: string | undefined,
    selectedItem: typeof selectedItem1,
    removedItem: typeof removedItem1,
    isSlotDisabledByReserved: boolean,
    otherSlotReservedLabel: string,
    hasError: boolean,
    errorMessages: string[],
    onRestore?: typeof onRestoreItem
  ) => (
    <div className="px-3 py-2.5 border-t border-border/50">
      <p className="text-[11px] text-muted-foreground font-medium mb-1.5">Slot {slotNum}</p>
      {!selectedItemId && removedItem ? (
        <div className="px-3 py-2 bg-background-elevated border border-border rounded-lg opacity-50 group">
          <span className="flex items-center gap-2 min-w-0">
            <span className="truncate min-w-0"><ItemLink name={removedItem.name} wowheadId={removedItem.wowhead_id} clickable={false} className="line-through" /></span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-success/20 text-success shrink-0 group-hover:hidden">Removed</span>
            {onRestore && (
              <button
                onClick={() => onRestore(removedItem.id, removedItem.name)}
                className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/20 text-accent shrink-0 hidden group-hover:inline-block hover:bg-accent/30"
              >
                Undo
              </button>
            )}
          </span>
        </div>
      ) : (
        <div className="space-y-1.5">
          <SearchableItemSelect
            items={lootItems}
            value={selectedItemId || ''}
            onChange={(value) => onItemSelect(rank, slotNum, value)}
            disabled={selectedItems}
            currentValue={selectedItemId}
            isSlotDisabled={isSlotDisabledByReserved}
            hasError={hasError}
            ownedWowheadIds={ownedWowheadIds}
            readOnly={isApproved}
            onRemove={isApproved && onRemoveItem && selectedItemId ? () => {
              const item = lootItems.find(i => i.id === selectedItemId)
              if (item) onRemoveItem(item.id, item.name)
            } : undefined}
            mobile
          />
          {/* Boss + classification inline below the select */}
          {selectedItem ? (
            <div className="flex items-center gap-2 pl-1">
              <p className="text-foreground-muted text-[11px]">{normalizeBossName(selectedItem.boss_name)}</p>
              {selectedItem.classification && (
                <ClassificationBadge classification={selectedItem.classification as 'Reserved' | 'Limited' | 'Unlimited'} />
              )}
            </div>
          ) : isSlotDisabledByReserved ? (
            <p className="text-muted-foreground text-[11px] italic pl-1">{otherSlotReservedLabel}</p>
          ) : null}
          {hasError && (
            <p className="text-destructive text-[11px] pl-1">
              {errorMessages.join(' · ')}
            </p>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className={`bg-card border border-border rounded-lg overflow-hidden ${hasCardError ? 'border-destructive/50 bg-red-900/10' : ''}`}>
      {/* Rank header */}
      <div className={`px-3 py-2 flex items-center gap-2`}>
        <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-[12px] font-bold text-white ${getRankBgColor(rank)}`}>
          {rank}
        </span>
        <span className="text-[13px] text-muted-foreground">Rank {rank}</span>
      </div>
      {renderSlot(1, selectedItemId1, selectedItem1, removedItem1, isSlot1DisabledByReserved, 'Reserved item in slot 2', hasSlot1Error, slot1ErrorMessages, onRestoreItem)}
      {renderSlot(2, selectedItemId2, selectedItem2, removedItem2, isSlot2DisabledByReserved, 'Reserved item in slot 1', hasSlot2Error, slot2ErrorMessages, onRestoreItem)}
    </div>
  )
})

// BracketSection - shared component for rendering a bracket with both desktop table and mobile cards
interface BracketSectionProps {
  name: string
  headerBgClass: string
  borderColorClass: string
  textColorClass: string
  tooltipContent: string
  subtitle?: string
  showAllocationPoints?: boolean
  ranks: number[]
  lootItems: LootItem[]
  disabledItems: Set<string>
  rankings: Record<string, string>
  duplicateItems: string[]
  onItemSelect: (rank: number, slot: number, itemId: string) => void
  getSlotErrors: (rank: number, slot: 1 | 2) => ItemError[]
  ownedWowheadIds: Set<number>
  isApproved: boolean
  onRemoveItem: (lootItemId: string, itemName: string) => void
  removingItemId: string | null
  removedRankings: Record<string, string>
  onRestoreItem: (lootItemId: string, itemName: string) => void
  validation?: { allocationPoints: number; maxPoints: number; violations: string[] }
  maxAllocationPoints?: number
  expandedErrors: Set<string>
  toggleErrorExpanded: (bracketName: string) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

function BracketSection({
  name,
  headerBgClass,
  borderColorClass,
  textColorClass,
  tooltipContent,
  subtitle,
  showAllocationPoints = false,
  ranks,
  lootItems,
  disabledItems,
  rankings,
  duplicateItems,
  onItemSelect,
  getSlotErrors,
  ownedWowheadIds,
  isApproved,
  onRemoveItem,
  removingItemId,
  removedRankings,
  onRestoreItem,
  validation,
  maxAllocationPoints,
  expandedErrors,
  toggleErrorExpanded,
  isCollapsed,
  onToggleCollapse,
}: BracketSectionProps) {
  const isExpanded = expandedErrors.has(name)
  const hasViolations = validation && validation.violations.length > 0

  // Count how many ranks have at least one item selected
  const rankedInSection = ranks.filter(r =>
    rankings[`${r}-1`] || rankings[`${r}-2`]
  ).length

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header - tappable on mobile for collapse */}
      <div
        className={`${headerBgClass} border-l-4 ${borderColorClass} px-4 py-2 sm:cursor-default cursor-pointer`}
        onClick={() => onToggleCollapse()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className="text-[15px] font-semibold text-foreground inline-flex items-center gap-1.5">
              {name} <InfoTooltip content={tooltipContent} />
            </h2>
            {showAllocationPoints && validation ? (
              <p className={`text-[12px] font-medium mt-1 ${textColorClass}`}>
                Allocation Points: {validation.allocationPoints}/{validation.maxPoints} <InfoTooltip content={`Reserved and Limited items cost 1 point each. Unlimited items cost 0. You can spend up to ${validation.maxPoints} points per bracket.`} iconSize={12} />
              </p>
            ) : showAllocationPoints ? (
              <p className={`${textColorClass} text-[12px] mt-1`}>Max {maxAllocationPoints ?? 3} allocation points per bracket</p>
            ) : subtitle ? (
              <p className={`${textColorClass} text-[12px]`}>{subtitle}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            {/* Error button (desktop + mobile) */}
            {hasViolations && (
              <div className="flex flex-col items-end gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleErrorExpanded(name)
                  }}
                  className="flex items-center gap-2"
                >
                  <span className="whitespace-nowrap">
                    {validation!.violations.length} {validation!.violations.length === 1 ? 'Error' : 'Errors'}
                  </span>
                  <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                </Button>
                {isExpanded && (
                  <Alert variant="destructive" className="max-w-md px-3 py-2">
                    <AlertDescription>
                      <ul className="space-y-1 text-sm text-foreground">
                        {validation!.violations.map((violation, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <span className="text-destructive">•</span>
                            <span>{violation}</span>
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
            {/* Collapse chevron (mobile only) */}
            <div className="sm:hidden flex items-center gap-2">
              {isCollapsed && (
                <span className="text-[12px] text-muted-foreground">{rankedInSection} ranked</span>
              )}
              <svg
                className={`w-4 h-4 text-muted-foreground transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Content - collapsible on mobile */}
      <div className={`sm:block ${isCollapsed ? 'hidden' : 'block'}`}>
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto max-h-[70vh] overflow-y-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '64px' }} />
              <col style={{ width: '320px' }} />
              <col style={{ width: '160px' }} />
              <col style={{ width: '320px' }} />
              <col style={{ width: '160px' }} />
            </colgroup>
            <thead className="sticky top-0 z-10">
              <tr className="bg-background-subtle border-b border-border">
                <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted bg-background-subtle">Rank</th>
                <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted bg-background-subtle">Loot #1</th>
                <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted bg-background-subtle">Details</th>
                <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted bg-background-subtle">Loot #2</th>
                <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted bg-background-subtle">Details</th>
              </tr>
            </thead>
            <tbody>
              {ranks.map(rank => (
                <RankRow
                  key={rank}
                  rank={rank}
                  lootItems={lootItems}
                  selectedItemId1={rankings[`${rank}-1`]}
                  selectedItemId2={rankings[`${rank}-2`]}
                  selectedItems={disabledItems}
                  duplicateItems={duplicateItems}
                  onItemSelect={onItemSelect}
                  slot1Errors={getSlotErrors(rank, 1)}
                  slot2Errors={getSlotErrors(rank, 2)}
                  ownedWowheadIds={ownedWowheadIds}
                  isApproved={isApproved}
                  onRemoveItem={onRemoveItem}
                  removingItemId={removingItemId}
                  removedRankings={removedRankings}
                  onRestoreItem={onRestoreItem}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="sm:hidden space-y-2 p-2">
          {ranks.map(rank => (
            <MobileRankCard
              key={rank}
              rank={rank}
              lootItems={lootItems}
              selectedItemId1={rankings[`${rank}-1`]}
              selectedItemId2={rankings[`${rank}-2`]}
              selectedItems={disabledItems}
              duplicateItems={duplicateItems}
              onItemSelect={onItemSelect}
              slot1Errors={getSlotErrors(rank, 1)}
              slot2Errors={getSlotErrors(rank, 2)}
              ownedWowheadIds={ownedWowheadIds}
              isApproved={isApproved}
              onRemoveItem={onRemoveItem}
              removingItemId={removingItemId}
              removedRankings={removedRankings}
              onRestoreItem={onRestoreItem}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function LootListContent() {
  const {
    activeGuild,
    activeCharacter,
    guildExpansions,
    viewingExpansionId,
    setViewingExpansion
  } = useGuildContext()

  // Get all data and actions from context
  const {
    lootItems,
    submission,
    rankings,
    raidTiers,
    phaseTiers,
    phases,
    resolvedGroups,
    phaseSubmissionStatuses,
    selectedPhase,
    phaseDeadline,
    enforceSlotRestrictions,
    bracketLimits,
    equippedWowheadIds,
    isLoading,
    isContentLoading,
    isSaving,
    isImportingBis,
    hasChanges,
    originalStatus,
    removedItems,
    setSelectedPhase,
    handleItemSelect,
    clearAllRankings,
    saveSubmission,
    importBisItems,
    refreshGear,
    removeApprovedItem,
    restoreRemovedItem
  } = useLootList()

  const [removingItemId, setRemovingItemId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)

  // Build a set of removed item IDs keyed by rank-slot for display
  const removedRankings = useMemo(() => {
    const map: Record<string, string> = {}
    for (const item of removedItems) {
      map[`${item.rank}-${item.slot}`] = item.loot_item_id
    }
    return map
  }, [removedItems])

  const handleRemoveApprovedItem = (lootItemId: string, itemName: string) => {
    confirm({
      title: `Remove ${itemName}?`,
      description: 'This removes the item from your approved list. Your list stays approved.',
      confirmLabel: 'Remove item',
      variant: 'warning',
      onConfirm: async () => {
        setRemovingItemId(lootItemId)
        const success = await removeApprovedItem(lootItemId, itemName)
        if (success) {
          showNotification('success', `${itemName} removed from your list.`)
        } else {
          showNotification('error', 'Couldn\'t remove item. Try again.')
        }
        setRemovingItemId(null)
      },
    })
  }

  const handleRestoreItem = async (lootItemId: string, itemName: string) => {
    const success = await restoreRemovedItem(lootItemId)
    if (success) {
      showNotification('success', `${itemName} restored to your list.`)
    } else {
      showNotification('error', 'Couldn\'t restore item. Try again.')
    }
  }

  // Local UI state
  const [showInstructionsModal, setShowInstructionsModal] = useState(false)
  const [showBisImportModal, setShowBisImportModal] = useState(false)
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set())
  const [showUnrankedPanel, setShowUnrankedPanel] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [contentReady, setContentReady] = useState(false)
  const hasLoadedOnce = useRef(false)
  // Mobile collapsible brackets - No Bracket and Off-spec start collapsed
  const [collapsedBrackets, setCollapsedBrackets] = useState<Set<string>>(
    new Set(['No bracket (38-25) - Main-spec', 'Off-spec (24-1)'])
  )
  const moreMenuRef = React.useRef<HTMLDivElement>(null)

  const { confirm, ConfirmDialog } = useConfirm()
  const { showNotification } = useNotification()

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Loot List'
  }, [])

  // Fade in content after loading to avoid wowhead tooltip flash
  useEffect(() => {
    if (!isLoading && !isContentLoading) {
      hasLoadedOnce.current = true
      const timer = setTimeout(() => setContentReady(true), 50)
      return () => clearTimeout(timer)
    } else {
      // Only show skeleton/fade on initial load, not phase switches
      if (!hasLoadedOnce.current) {
        setContentReady(false)
      }
      setIsEditing(false)
    }
  }, [isLoading, isContentLoading])

  // Track page view and load performance
  useEffect(() => {
    if (activeGuild?.id) trackClientEvent('loot_list_page_viewed', { guild_id: activeGuild.id })
  }, [activeGuild?.id])
  usePagePerf('loot_list', isLoading || isContentLoading)

  // Close More menu when clicking outside
  useEffect(() => {
    if (!showMoreMenu) return
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showMoreMenu])

  // Helper to check if we're past the submission deadline
  const isPastDeadline = (): boolean => {
    if (!phaseDeadline) return false
    return new Date() > new Date(phaseDeadline)
  }

  const handleClearList = useCallback(() => {
    confirm({
      title: 'Clear all rankings',
      description: 'Are you sure you want to clear all ranked items? This cannot be undone.',
      confirmLabel: 'Clear all',
      variant: 'danger',
      onConfirm: () => {
        clearAllRankings()
      }
    })
  }, [confirm, clearAllRankings])

  const toggleErrorExpanded = useCallback((bracketName: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev)
      if (newSet.has(bracketName)) {
        newSet.delete(bracketName)
      } else {
        newSet.add(bracketName)
      }
      return newSet
    })
  }, [])

  const toggleBracketCollapsed = useCallback((bracketName: string) => {
    setCollapsedBrackets(prev => {
      const newSet = new Set(prev)
      if (newSet.has(bracketName)) {
        newSet.delete(bracketName)
      } else {
        newSet.add(bracketName)
      }
      return newSet
    })
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success/10 border-success text-foreground'
      case 'pending': return 'bg-warning/10 border-warning text-foreground'
      case 'needs_revision': return 'bg-destructive/10 border-destructive text-foreground'
      case 'rejected': return 'bg-destructive/10 border-destructive text-foreground'
      default: return 'bg-background-elevated border-border text-muted-foreground'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved'
      case 'pending': return 'Pending'
      case 'needs_revision': return 'Needs revision'
      case 'rejected': return 'Rejected'
      default: return 'Draft'
    }
  }

  const rankedCount = Object.keys(rankings).length

  // Check if either item column is completely empty
  const emptyColumn = useMemo(() => {
    let hasSlot1 = false
    let hasSlot2 = false
    for (const key of Object.keys(rankings)) {
      const slot = key.split('-')[1]
      if (slot === '1') hasSlot1 = true
      if (slot === '2') hasSlot2 = true
      if (hasSlot1 && hasSlot2) return null
    }
    if (!hasSlot1 && !hasSlot2) return null // empty list, no warning needed
    if (!hasSlot1) return 'Item #1'
    return 'Item #2'
  }, [rankings])

  // Create bracket-specific disabled sets for tokens
  // Tokens can be selected once per bracket section (Brackets 1-4, No Bracket, Off-spec)
  // Non-tokens are disabled everywhere once selected, except One-Hand weapons
  // which dual-wielders can list twice.
  const { bracket14DisabledItems, noBracketDisabledItems, offSpecDisabledItems } = useMemo(() => {
    // Create a map of itemId -> item_slot for checking if an item is a token
    const itemSlotMap = new Map(lootItems.map(item => [item.id, item.item_slot]))

    // Separate items by bracket section based on rank
    // Rankings key format: "{rank}-{slot}" e.g., "50-1", "38-2"
    const bracket14Tokens = new Set<string>()   // Tokens selected in ranks 39-50
    const noBracketTokens = new Set<string>()   // Tokens selected in ranks 25-38
    const offSpecTokens = new Set<string>()     // Tokens selected in ranks 1-24
    const nonTokenCounts = new Map<string, number>() // count per non-token itemId

    Object.entries(rankings).forEach(([key, itemId]) => {
      const rank = parseInt(key.split('-')[0])
      const slot = itemSlotMap.get(itemId)
      const isToken = slot ? isTokenSlot(slot) : false

      if (isToken) {
        // Tokens go into their bracket-specific set
        if (rank >= 39) {
          bracket14Tokens.add(itemId)
        } else if (rank >= 25) {
          noBracketTokens.add(itemId)
        } else {
          offSpecTokens.add(itemId)
        }
      } else {
        // Non-tokens: track how many times they appear.
        // One-Hand items are allowed up to 2 occurrences (dual-wielders).
        nonTokenCounts.set(itemId, (nonTokenCounts.get(itemId) || 0) + 1)
      }
    })

    // A non-token item is fully used (disabled) once it hits its per-slot cap.
    const nonTokenItems = new Set<string>()
    nonTokenCounts.forEach((count, itemId) => {
      const slot = itemSlotMap.get(itemId)
      const maxAllowed = slot === 'One-Hand' ? 2 : 1
      if (count >= maxAllowed) nonTokenItems.add(itemId)
    })

    // Build disabled sets for each section
    // Non-tokens are always disabled, tokens only disabled within their section
    return {
      bracket14DisabledItems: new Set([...nonTokenItems, ...bracket14Tokens]),
      noBracketDisabledItems: new Set([...nonTokenItems, ...noBracketTokens]),
      offSpecDisabledItems: new Set([...nonTokenItems, ...offSpecTokens]),
    }
  }, [rankings, lootItems])

  // Legacy: Keep selectedItems for duplicate detection (checks ALL selected items)
  const selectedItems = useMemo(() => new Set(Object.values(rankings)), [rankings])
  // Token-aware duplicate detection:
  // - Non-token items are duplicates if they appear more than once globally,
  //   except One-Hand items which dual-wielders can list up to twice.
  // - Token items are duplicates if they appear more than once in the SAME bracket section.
  const duplicateItems = useMemo(() => {
    // If loot items haven't loaded yet, we can't determine token vs non-token.
    // Skip duplicate detection entirely to avoid false positives.
    if (lootItems.length === 0) return []

    const itemSlotMap = new Map(lootItems.map(item => [item.id, item.item_slot]))

    // Track token appearances per bracket section
    const bracket14Tokens: string[] = []
    const noBracketTokens: string[] = []
    const offSpecTokens: string[] = []
    const nonTokenItemIds: string[] = []

    Object.entries(rankings).forEach(([key, itemId]) => {
      const rank = parseInt(key.split('-')[0])
      const slot = itemSlotMap.get(itemId)

      // If we can't resolve the item's slot (e.g. item not in current tier data),
      // skip it rather than misclassifying it as a non-token
      if (!slot) return

      if (isTokenSlot(slot)) {
        if (rank >= 39) bracket14Tokens.push(itemId)
        else if (rank >= 25) noBracketTokens.push(itemId)
        else offSpecTokens.push(itemId)
      } else {
        nonTokenItemIds.push(itemId)
      }
    })

    const dupes: string[] = []

    // Non-token items: count occurrences and flag when exceeding the per-slot cap.
    // One-Hand items allow up to 2 (dual-wield); everything else caps at 1.
    const nonTokenCounts = new Map<string, number>()
    nonTokenItemIds.forEach(itemId => {
      nonTokenCounts.set(itemId, (nonTokenCounts.get(itemId) || 0) + 1)
    })
    nonTokenCounts.forEach((count, itemId) => {
      const slot = itemSlotMap.get(itemId)
      const maxAllowed = slot === 'One-Hand' ? 2 : 1
      if (count > maxAllowed) dupes.push(itemId)
    })

    // Token items: only flag duplicates within the same bracket section
    ;[bracket14Tokens, noBracketTokens, offSpecTokens].forEach(sectionTokens => {
      sectionTokens.forEach((itemId, index, arr) => {
        if (arr.indexOf(itemId) !== index) dupes.push(itemId)
      })
    })

    return dupes
  }, [rankings, lootItems])

  // Filter items by spec type for different bracket sections
  // Items CASCADE down: Brackets 1-4 ⊆ No Bracket ⊆ Off-spec
  //
  // Bracket filtering rules:
  // - Brackets 1-4: PRIMARY + UNALLOCATED
  // - No Bracket: PRIMARY + SECONDARY + UNALLOCATED + PRIMARY-ONLY (no secondary = open)
  // - Off-spec: same as No Bracket
  const { bracket14Items, noBracketItems, offSpecItems } = useMemo(() => {
    // LC items are included in every pool so they appear in dropdowns (as non-selectable),
    // but excluded from rankable filtering logic
    const lcItems = lootItems.filter(item => item.is_loot_council)

    // Brackets 1-4: PRIMARY + UNALLOCATED
    const bracket14Items = [
      ...lootItems.filter(item =>
        !item.is_loot_council && (
          item.character_spec_type === 'primary' ||
          !item.is_allocated  // false or undefined = unallocated
        )
      ),
      ...lcItems,
    ]

    // No Bracket: PRIMARY + SECONDARY + UNALLOCATED + PRIMARY-ONLY
    // If an item has primary assignments but no secondary filled in,
    // it's open here for all characters who can equip it.
    const noBracketItems = [
      ...lootItems.filter(item =>
        !item.is_loot_council && (
          item.character_spec_type === 'primary' ||
          item.character_spec_type === 'secondary' ||
          !item.is_allocated ||
          item.has_primary_only === true  // no secondary filled = open
        )
      ),
      ...lcItems,
    ]

    // Off-spec: same rules as No Bracket
    const offSpecItems = noBracketItems

    return { bracket14Items, noBracketItems, offSpecItems }
  }, [lootItems])

  // Compute unranked items (all spec items not yet on the list, excluding LC items)
  const unrankedItems = useMemo(() => {
    const rankedItemIds = new Set(Object.values(rankings))
    return lootItems.filter(item => !rankedItemIds.has(item.id) && !item.is_loot_council)
  }, [lootItems, rankings])

  // Group unranked items by boss for display
  const unrankedByBoss = useMemo(() => {
    const byBoss: Record<string, LootItem[]> = {}
    unrankedItems.forEach(item => {
      const boss = normalizeBossName(item.boss_name || 'Unknown')
      if (!byBoss[boss]) {
        byBoss[boss] = []
      }
      byBoss[boss].push(item)
    })
    return byBoss
  }, [unrankedItems])

  // PERFORMANCE: Create Map for O(1) item lookups instead of O(n) .find() calls.
  // Uses bracket14Items (not all lootItems) so validation only counts items visible in brackets 1-4.
  // Rankings can reference items no longer in bracket14Items (e.g., allocation changed after save),
  // which appear as empty "Select item" in the UI but would cause phantom validation errors.
  const bracket14ItemsById = useMemo(() => {
    return new Map(bracket14Items.map(item => [item.id, item]))
  }, [bracket14Items])

  // Bracket validation
  type BracketValidation = {
    bracketName: string
    allocationPoints: number
    maxPoints: number
    ranks: number[]
    violations: string[]
    itemErrors: ItemError[]
  }

  const bracketValidations = useMemo((): BracketValidation[] => {
    const brackets: BracketValidation[] = [
      { bracketName: 'Bracket 1 (50-48)', allocationPoints: 0, maxPoints: bracketLimits.maxAllocationPoints ?? 3, ranks: [50, 49, 48], violations: [], itemErrors: [] },
      { bracketName: 'Bracket 2 (47-45)', allocationPoints: 0, maxPoints: bracketLimits.maxAllocationPoints ?? 3, ranks: [47, 46, 45], violations: [], itemErrors: [] },
      { bracketName: 'Bracket 3 (44-42)', allocationPoints: 0, maxPoints: bracketLimits.maxAllocationPoints ?? 3, ranks: [44, 43, 42], violations: [], itemErrors: [] },
      { bracketName: 'Bracket 4 (41-39)', allocationPoints: 0, maxPoints: bracketLimits.maxAllocationPoints ?? 3, ranks: [41, 40, 39], violations: [], itemErrors: [] },
    ]

    brackets.forEach(bracket => {
      const itemTypesInBracket: Record<string, { count: number; items: Array<{ rank: number; slot: 1 | 2; itemId: string }> }> = {}
      const itemSlotsInBracket: Record<string, { count: number; items: Array<{ rank: number; slot: 1 | 2; itemId: string }> }> = {}
      const allocationItems: Array<{ rank: number; slot: 1 | 2; itemId: string; cost: number }> = []

      bracket.ranks.forEach(rank => {
        const item1Id = rankings[`${rank}-1`]
        const item2Id = rankings[`${rank}-2`]

        // Check slot 1
        // Use bracket14ItemsById so validation only counts items visible in brackets 1-4.
        // Rankings can reference items no longer in bracket14Items (e.g., allocation changed),
        // which appear as empty "Select item" in the UI but would cause phantom validation errors.
        if (item1Id) {
          const item = bracket14ItemsById.get(item1Id)
          if (item) {
            // Track allocation cost items
            const cost = item.allocation_cost || 0
            bracket.allocationPoints += cost
            if (cost > 0) {
              allocationItems.push({ rank, slot: 1, itemId: item1Id, cost })
            }

            // Track item types for duplicate detection (skip tokens — different tokens are distinct items)
            if (item.item_type && item.item_type !== 'Token') {
              if (!itemTypesInBracket[item.item_type]) {
                itemTypesInBracket[item.item_type] = { count: 0, items: [] }
              }
              itemTypesInBracket[item.item_type].count++
              itemTypesInBracket[item.item_type].items.push({ rank, slot: 1, itemId: item1Id })
            }

            // Track item slots for duplicate detection (if enabled)
            if (enforceSlotRestrictions && item.item_slot) {
              if (!itemSlotsInBracket[item.item_slot]) {
                itemSlotsInBracket[item.item_slot] = { count: 0, items: [] }
              }
              itemSlotsInBracket[item.item_slot].count++
              itemSlotsInBracket[item.item_slot].items.push({ rank, slot: 1, itemId: item1Id })
            }
          }
        }

        // Check slot 2
        if (item2Id) {
          const item = bracket14ItemsById.get(item2Id)
          if (item) {
            // Track allocation cost items
            const cost = item.allocation_cost || 0
            bracket.allocationPoints += cost
            if (cost > 0) {
              allocationItems.push({ rank, slot: 2, itemId: item2Id, cost })
            }

            // Track item types for duplicate detection (skip tokens — different tokens are distinct items)
            if (item.item_type && item.item_type !== 'Token') {
              if (!itemTypesInBracket[item.item_type]) {
                itemTypesInBracket[item.item_type] = { count: 0, items: [] }
              }
              itemTypesInBracket[item.item_type].count++
              itemTypesInBracket[item.item_type].items.push({ rank, slot: 2, itemId: item2Id })
            }

            // Track item slots for duplicate detection (if enabled)
            if (enforceSlotRestrictions && item.item_slot) {
              if (!itemSlotsInBracket[item.item_slot]) {
                itemSlotsInBracket[item.item_slot] = { count: 0, items: [] }
              }
              itemSlotsInBracket[item.item_slot].count++
              itemSlotsInBracket[item.item_slot].items.push({ rank, slot: 2, itemId: item2Id })
            }

            // Check if Reserved item has a companion
            if (item1Id) {
              const item1 = bracket14ItemsById.get(item1Id)
              if (item1?.classification === 'Reserved' || item.classification === 'Reserved') {
                bracket.violations.push(`Reserved items must be alone at rank ${rank}`)
                // Add errors to both slots
                bracket.itemErrors.push({
                  rank, slot: 1, itemId: item1Id,
                  errorType: 'reserved_companion',
                  message: 'Remove one item from this rank'
                })
                bracket.itemErrors.push({
                  rank, slot: 2, itemId: item2Id,
                  errorType: 'reserved_companion',
                  message: 'Remove one item from this rank'
                })
              }
            }
          }
        }
      })

      // Check allocation points and mark affected items
      if (bracket.allocationPoints > bracket.maxPoints) {
        bracket.violations.push(`Too many allocation points: ${bracket.allocationPoints}/${bracket.maxPoints}`)
        // Mark all items that contribute to allocation as errors
        allocationItems.forEach(item => {
          bracket.itemErrors.push({
            ...item,
            errorType: 'allocation',
            message: `Remove a Limited or Reserved item`
          })
        })
      }

      // Check for duplicate item types and mark affected items
      const maxCategory = bracketLimits.maxCategory ?? 1
      Object.entries(itemTypesInBracket).forEach(([type, data]) => {
        if (data.count > maxCategory) {
          bracket.violations.push(`Too many ${type} items (${data.count}/${maxCategory})`)
          data.items.forEach(item => {
            bracket.itemErrors.push({
              ...item,
              errorType: 'duplicate_type',
              message: `Change one ${type} item`
            })
          })
        }
      })

      // Check for duplicate item slots and mark affected items (if enforcement is enabled)
      if (enforceSlotRestrictions) {
        const maxTokens = bracketLimits.maxTokens ?? 1
        Object.entries(itemSlotsInBracket).forEach(([slot, data]) => {
          if (data.count > maxTokens) {
            bracket.violations.push(`Too many ${slot} items (${data.count}/${maxTokens})`)
            data.items.forEach(item => {
              bracket.itemErrors.push({
                ...item,
                errorType: 'duplicate_slot',
                message: `Change one ${slot} item`
              })
            })
          }
        })
      }
    })

    return brackets.filter(b => b.violations.length > 0 || b.allocationPoints > 0)
  }, [rankings, bracket14ItemsById, enforceSlotRestrictions, bracketLimits])
  const hasValidationErrors = bracketValidations.some(b => b.violations.length > 0)

  // Get validation for a specific bracket by name
  const getBracketValidation = (bracketName: string) => {
    return bracketValidations.find(b => b.bracketName === bracketName)
  }

  // Get errors for a specific rank and slot
  const getSlotErrors = useCallback((rank: number, slot: 1 | 2): ItemError[] => {
    const allErrors: ItemError[] = []
    bracketValidations.forEach(bracket => {
      bracket.itemErrors.forEach(error => {
        if (error.rank === rank && error.slot === slot) {
          allErrors.push(error)
        }
      })
    })
    return allErrors
  }, [bracketValidations])

  // Group ranks by brackets (matching Google Sheet structure)
  const bracket1 = Array.from({ length: 3 }, (_, i) => 50 - i) // 50-48
  const bracket2 = Array.from({ length: 3 }, (_, i) => 47 - i) // 47-45
  const bracket3 = Array.from({ length: 3 }, (_, i) => 44 - i) // 44-42
  const bracket4 = Array.from({ length: 3 }, (_, i) => 41 - i) // 41-39
  const noBracket = Array.from({ length: 14 }, (_, i) => 38 - i) // 38-25
  const offSpec = Array.from({ length: 24 }, (_, i) => 24 - i) // 24-1

  return (
    <ExpansionGuard>
      <div className="font-poppins">
        {/* Header - Always visible */}
        <div className="p-4 sm:p-6 lg:p-8 pb-1.5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <Heading level={1}>
                Loot Lists{activeCharacter && (
                  <> for <span style={{ color: activeCharacter.class?.color_hex }}>{activeCharacter.name}</span></>
                )}
              </Heading>
              <p className="text-muted-foreground mt-1 text-base">
                {isLoading ? 'Loading phases...' : (() => {
                  const group = resolvedGroups.find(g => g.canonicalPhase === selectedPhase)
                  const label = group ? getPhaseGroupShortLabel(group).replace(/^P/, 'Phase ').replace(/\+P/g, '+') : `Phase ${selectedPhase}`
                  return `Rank your preferred items for ${label}${phaseTiers.length > 0 ? ` (${phaseTiers.map(t => t.name).join(', ')})` : ''}`
                })()}
                {viewingExpansionId && (
                  <span className="ml-2 px-3 py-1 bg-blue-950/50 border border-blue-600/50 text-blue-300 text-xs font-medium rounded-full">
                    Viewing Past: {guildExpansions.find(e => e.expansion_id === viewingExpansionId)?.expansion_name}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Expansion Selector - Dropdown */}
              {guildExpansions.length > 1 && (
                <Select
                  variant="rounded"
                  value={viewingExpansionId || guildExpansions.find(e => e.is_current)?.expansion_id || ''}
                  onChange={(e) => {
                    const expansion = guildExpansions.find(exp => exp.expansion_id === e.target.value)
                    setViewingExpansion(expansion?.is_current ? null : e.target.value)
                  }}
                >
                  {guildExpansions.map((expansion) => (
                    <option key={expansion.expansion_id} value={expansion.expansion_id}>
                      {expansion.expansion_name}{expansion.is_current ? ' ★' : ''}
                    </option>
                  ))}
                </Select>
              )}
              {/* How to Rank Button */}
              <Button variant="outline" onClick={() => setShowInstructionsModal(true)}>
                <HugeiconsIcon icon={InformationCircleIcon} size={18} />
                <span className="hidden sm:inline">How to rank</span>
                <span className="sm:hidden">Info</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Sticky Header: Phase Tabs + Status Banner pinned together */}
        <div className="sticky top-14 sm:top-0 z-20 bg-background">
        {isLoading ? (
          <div className="px-4 sm:px-6 lg:px-8 py-1.5">
            <TierTabsSkeleton />
          </div>
        ) : phases.length > 0 && (
          <div className="px-4 sm:px-6 lg:px-8 py-1.5">
            {/* Mobile: Dropdown selector */}
            <div className="sm:hidden">
              <Select
                variant="rounded"
                size="sm"
                value={selectedPhase ?? ''}
                onChange={(e) => setSelectedPhase(parseInt(e.target.value))}
              >
                {resolvedGroups.map((group) => {
                  const status = phaseSubmissionStatuses[group.canonicalPhase]
                  const statusEmoji = status?.status === 'approved' ? ' ✓' :
                                      status?.status === 'pending' ? ' ⏳' :
                                      status?.status === 'needs_revision' ? ' ⚠' :
                                      status?.status === 'rejected' ? ' ✗' : ''
                  const phaseSet = new Set(group.phases)
                  const tiersInGroup = raidTiers.filter(t => t.phase != null && phaseSet.has(t.phase))
                  const activeTiersInGroup = tiersInGroup.filter(t => t.is_guild_active !== false)
                  const hasActiveTier = tiersInGroup.some(t => t.is_guild_active)
                  const raidNames = activeTiersInGroup.map(t => getRaidShorthand(t.name)).join(', ')
                  return (
                    <option key={group.canonicalPhase} value={group.canonicalPhase}>
                      {getPhaseGroupShortLabel(group)} {raidNames}{hasActiveTier ? ' ★' : ''}{statusEmoji}
                    </option>
                  )
                })}
              </Select>
            </div>
            {/* Desktop: Horizontal scroll tabs */}
            <div className="hidden sm:block">
              <HorizontalScroll>
                <div className="flex gap-2">
                  {resolvedGroups.map((group) => {
                    const status = phaseSubmissionStatuses[group.canonicalPhase]
                    const hasSubmission = !!status
                    const statusColor = hasSubmission
                      ? status.status === 'approved'
                        ? 'text-success'
                        : status.status === 'pending'
                        ? 'text-warning'
                        : status.status === 'needs_revision'
                        ? 'text-warning'
                        : status.status === 'rejected'
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                      : ''
                    const phaseSet = new Set(group.phases)
                    const tiersInGroup = raidTiers.filter(t => t.phase != null && phaseSet.has(t.phase))
                    const activeTiersInGroup = tiersInGroup.filter(t => t.is_guild_active !== false)
                    const hasActiveTier = tiersInGroup.some(t => t.is_guild_active)
                    const raidNames = activeTiersInGroup.map(t => getRaidShorthand(t.name)).join(', ')

                    // Get the first active tier for the icon, or first tier if none active
                    const iconTier = activeTiersInGroup[0] || tiersInGroup[0]

                    return (
                      <Button
                        key={group.canonicalPhase}
                        variant={selectedPhase === group.canonicalPhase ? 'accent-subtle' : 'outline'}
                        onClick={() => setSelectedPhase(group.canonicalPhase)}
                        className="px-4 py-2.5 rounded-[40px] whitespace-nowrap text-[13px] font-medium"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            selectedPhase === group.canonicalPhase
                              ? 'bg-accent/30 text-accent'
                              : 'bg-foreground/10 text-foreground-secondary'
                          }`}>{getPhaseGroupShortLabel(group)}</span>
                          {iconTier && (
                            <img
                              src={getRaidIcon(iconTier.name)}
                              alt=""
                              className="w-5 h-5 rounded border border-border/50"
                            />
                          )}
                          <span>{raidNames}</span>

                          {hasSubmission && (
                            <span className={statusColor}>
                              {status.status === 'approved' ? <CheckFilledIcon size={14} /> :
                               status.status === 'pending' ? <ClockFilledIcon size={14} /> :
                               status.status === 'needs_revision' ? <AlertFilledIcon size={14} /> :
                               status.status === 'rejected' ? <CancelFilledIcon size={14} /> :
                               <span className="w-2 h-2 rounded-full bg-current inline-block" />}
                            </span>
                          )}
                        </div>
                      </Button>
                    )
                  })}
                </div>
              </HorizontalScroll>
            </div>
          </div>
        )}

        {/* Status Banner skeleton - reserves space during loading to prevent CLS (initial load only) */}
        {(isLoading || isContentLoading) && !hasLoadedOnce.current && (
          <div className="px-4 sm:px-6 lg:px-8 pb-2">
            <div className="rounded-xl p-4 sm:p-6 border border-border bg-background-elevated">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-56" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-10 w-24 rounded-[40px]" />
                  <Skeleton className="h-10 w-32 rounded-[40px]" />
                </div>
              </div>
            </div>
          </div>
        )}
        {/* Status Banner - inside sticky header */}
        {!isLoading && !isContentLoading && selectedPhase !== null && (
          <div className="px-4 sm:px-6 lg:px-8 pb-2">
            <div className={`rounded-xl p-4 sm:p-6 border ${submission ? getStatusColor(submission.status) : getStatusColor('draft')}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Show first active tier's raid icon, or first tier if none active */}
                  {phaseTiers.length > 0 && (
                    <img
                      src={getRaidIcon(phaseTiers.find(t => t.is_guild_active)?.name || phaseTiers[0]?.name || '')}
                      alt=""
                      className="w-10 h-10 rounded-lg border-2 border-border/50 shadow-md"
                    />
                  )}
                  <div>
                    <h2 className="font-semibold text-lg text-foreground">
                      {(() => {
                        const group = resolvedGroups.find(g => g.canonicalPhase === selectedPhase)
                        return group ? getPhaseGroupShortLabel(group).replace(/^P/, 'Phase ').replace(/\+P/g, '+') : `Phase ${selectedPhase}`
                      })()}
                      {phaseTiers.length > 0 && (
                        <span className="font-normal text-muted-foreground text-sm ml-2">
                          ({phaseTiers.filter(t => t.is_guild_active).map(t => t.name).join(', ') || 'No active raids'})
                        </span>
                      )}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {submission ? getStatusLabel(submission.status) : 'Draft'}
                      {submission?.submitted_at && (
                        <span> · Submitted {new Date(submission.submitted_at).toLocaleDateString()}</span>
                      )}
                      {phaseDeadline && !isPastDeadline() && (
                        <span> · Due {new Date(phaseDeadline).toLocaleString()}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className="text-sm opacity-75">{rankedCount} items ranked</span>
                  {/* More Menu Dropdown */}
                  <div className="relative" ref={moreMenuRef}>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowMoreMenu(!showMoreMenu)}
                      className="w-10 h-10"
                      aria-label="More actions"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <circle cx="5" cy="12" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="19" cy="12" r="2" />
                      </svg>
                    </Button>
                    {showMoreMenu && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-background-elevated border border-border rounded-lg shadow-lg z-50 overflow-hidden">
                        <Button
                          variant="ghost"
                          className="w-full justify-start !rounded-none"
                          onClick={() => {
                            setShowUnrankedPanel(!showUnrankedPanel)
                            setShowMoreMenu(false)
                          }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Show {unrankedItems.length} unranked
                        </Button>
                        {rankedCount > 0 && (
                          <Button
                            variant="destructive-ghost"
                            className="w-full justify-start !rounded-none"
                            onClick={() => {
                              handleClearList()
                              setShowMoreMenu(false)
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Clear list
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Approved + not editing: show Edit list button */}
                  {originalStatus === 'approved' && !hasChanges && !isEditing ? (
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      Edit list
                    </Button>
                  ) : (
                    <>
                      {/* Import BIS Button - hidden when list is approved */}
                      {originalStatus !== 'approved' && (
                        <Button
                          variant="outline"
                          onClick={() => setShowBisImportModal(true)}
                        >
                          Import BIS
                        </Button>
                      )}
                      {/* Submit for Review / Done editing Button */}
                      {isEditing && !hasChanges ? (
                        <Button onClick={() => setIsEditing(false)}>
                          Done editing
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            if (emptyColumn && rankedCount > 0) {
                              confirm({
                                title: `Missing ${emptyColumn} selections`,
                                description: `Your ${emptyColumn} column is completely empty. Filling both columns gives you a backup option if your first choice is taken.`,
                                confirmLabel: 'Submit anyway',
                                cancelLabel: 'Keep editing',
                                variant: 'default',
                                onConfirm: () => saveSubmission(true),
                              })
                              return
                            }
                            saveSubmission(true)
                          }}
                          disabled={
                            rankedCount === 0 ||
                            duplicateItems.length > 0 ||
                            hasValidationErrors ||
                            (!hasChanges && (originalStatus === 'approved' || originalStatus === 'pending'))
                          }
                          loading={isSaving}
                        >
                          {hasChanges && (originalStatus === 'approved' || originalStatus === 'pending') ? 'Resubmit for review' : 'Submit for review'}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
              {submission?.review_notes && (
                <div className="mt-3 p-4 bg-black/20 rounded-xl">
                  <p className="text-sm"><strong>Officer Notes:</strong> {submission.review_notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
        </div>

        {/* Deadline Warning - outside flex container so it matches status banner width */}
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-in-out"
          style={{ gridTemplateRows: !isLoading && !isContentLoading && phaseDeadline && isPastDeadline() ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className="px-4 sm:px-6 lg:px-8 pb-2">
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl px-4 py-3 text-yellow-200/80">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm">⏰</span>
                  <p className="text-sm">
                    Deadline for Phase {selectedPhase} passed {phaseDeadline ? new Date(phaseDeadline).toLocaleDateString() : ''}. Changes will require officer approval.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Duplicate Warning - outside flex container so sidebar aligns with brackets */}
        {!isLoading && !isContentLoading && (
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-in-out px-4 sm:px-6 lg:px-8"
          style={{ gridTemplateRows: duplicateItems.length > 0 ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className="pb-4">
              <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 text-red-300">
                <strong>Warning:</strong> You have duplicate items on your list. Most items can only appear once. One-handed weapons can appear up to twice for dual-wielders. Tokens can appear once per bracket section.
              </div>
            </div>
          </div>
        </div>
        )}

        {/* First-time guidance - outside flex container so sidebar aligns with brackets */}
        {!isLoading && !isContentLoading && Object.keys(rankings).length === 0 && (
          <div className="px-4 sm:px-6 lg:px-8 pb-4">
            <div className="bg-background-elevated border border-border rounded-xl px-4 py-3">
              <p className="text-sm text-foreground-secondary">
                <span className="text-foreground font-medium">Click any empty slot</span> to pick an item, rank from 50 (highest) to 1, then hit Submit for officer review.
              </p>
            </div>
          </div>
        )}

        {/* Main Content - Flex container for loot list and sidebar */}
        <div className={`flex items-start px-4 sm:px-6 lg:px-8 pt-1.5 pb-6 ${showUnrankedPanel ? 'gap-6' : ''}`}>
        {/* Loot List Content */}
        <div className={`flex-1 min-w-0 space-y-6 transition-all duration-300 ${showUnrankedPanel ? 'pr-0' : ''}`}>
        {/* Content Loading State (initial load only — phase switches keep showing previous content) */}
        {(isLoading || isContentLoading) && !hasLoadedOnce.current ? (
          <LootListContentSkeleton />
        ) : (
        <div className={`space-y-4 transition-opacity duration-200 ${contentReady ? 'opacity-100' : 'opacity-0'}`}>

        {/* Bracket Sections */}
        {([
          {
            name: 'Bracket 1 (50-48)',
            headerBgClass: 'bg-red-500/10',
            borderColorClass: 'border-l-red-800/60',
            textColorClass: 'text-red-200',
            tooltipContent: 'Highest priority tier. Reserved and Limited items here cost allocation points. Max 3 points per bracket.',
            showAllocationPoints: true,
            ranks: bracket1,
            lootItems: bracket14Items,
            disabledItems: bracket14DisabledItems,
          },
          {
            name: 'Bracket 2 (47-45)',
            headerBgClass: 'bg-orange-500/10',
            borderColorClass: 'border-l-orange-800/60',
            textColorClass: 'text-orange-200',
            tooltipContent: 'Second priority tier. Same allocation point rules as Bracket 1.',
            showAllocationPoints: true,
            ranks: bracket2,
            lootItems: bracket14Items,
            disabledItems: bracket14DisabledItems,
          },
          {
            name: 'Bracket 3 (44-42)',
            headerBgClass: 'bg-yellow-500/10',
            borderColorClass: 'border-l-yellow-800/60',
            textColorClass: 'text-yellow-200',
            tooltipContent: 'Third priority tier. Same allocation point rules as Brackets 1-2.',
            showAllocationPoints: true,
            ranks: bracket3,
            lootItems: bracket14Items,
            disabledItems: bracket14DisabledItems,
          },
          {
            name: 'Bracket 4 (41-39)',
            headerBgClass: 'bg-amber-500/10',
            borderColorClass: 'border-l-amber-800/60',
            textColorClass: 'text-amber-200',
            tooltipContent: 'Fourth priority tier. Same allocation point rules as Brackets 1-3.',
            showAllocationPoints: true,
            ranks: bracket4,
            lootItems: bracket14Items,
            disabledItems: bracket14DisabledItems,
          },
          {
            name: 'No bracket (38-25) - Main-spec',
            headerBgClass: 'bg-green-500/10',
            borderColorClass: 'border-l-green-800/60',
            textColorClass: 'text-green-200',
            tooltipContent: 'Standard priority list with no allocation point limits. Items here are still main-spec priority.',
            subtitle: 'Still considered main-spec priority',
            ranks: noBracket,
            lootItems: noBracketItems,
            disabledItems: noBracketDisabledItems,
          },
          {
            name: 'Off-spec (24-1)',
            headerBgClass: 'bg-blue-500/10',
            borderColorClass: 'border-l-blue-800/60',
            textColorClass: 'text-blue-200',
            tooltipContent: 'Items for your secondary spec or role. Lower priority than main-spec but helps with guild flexibility.',
            subtitle: 'Off-spec items to support guild flexibility',
            ranks: offSpec,
            lootItems: offSpecItems,
            disabledItems: offSpecDisabledItems,
          },
        ] as const).map((bracket) => (
          <BracketSection
            key={bracket.name}
            name={bracket.name}
            headerBgClass={bracket.headerBgClass}
            borderColorClass={bracket.borderColorClass}
            textColorClass={bracket.textColorClass}
            tooltipContent={bracket.tooltipContent}
            subtitle={'subtitle' in bracket ? bracket.subtitle : undefined}
            showAllocationPoints={'showAllocationPoints' in bracket ? bracket.showAllocationPoints : false}
            ranks={bracket.ranks}
            lootItems={bracket.lootItems}
            disabledItems={bracket.disabledItems}
            rankings={rankings}
            duplicateItems={duplicateItems}
            onItemSelect={handleItemSelect}
            getSlotErrors={getSlotErrors}
            ownedWowheadIds={equippedWowheadIds}
            isApproved={originalStatus === 'approved' && !hasChanges && !isEditing}
            onRemoveItem={handleRemoveApprovedItem}
            removingItemId={removingItemId}
            removedRankings={removedRankings}
            onRestoreItem={handleRestoreItem}
            validation={getBracketValidation(bracket.name)}
            maxAllocationPoints={bracketLimits.maxAllocationPoints}
            expandedErrors={expandedErrors}
            toggleErrorExpanded={toggleErrorExpanded}
            isCollapsed={collapsedBrackets.has(bracket.name)}
            onToggleCollapse={() => toggleBracketCollapsed(bracket.name)}
          />
        ))}

        {/* How to Rank Modal */}
        <Modal open={showInstructionsModal} onClose={() => setShowInstructionsModal(false)} size="lg">
          <ModalHeader onClose={() => setShowInstructionsModal(false)}>
            <ModalTitle>How to rank</ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-5">
            {/* Overview */}
            <div>
              <LabelText size="xs" className="mb-2 block">Overview</LabelText>
              <Text size="sm" color="muted">
                The system uses <Text as="span" size="sm" weight="semibold" color="default">50 desirability levels</Text> (level 50 = most desirable),
                with each level containing <Text as="span" size="sm" weight="semibold" color="default">2 item slots</Text>, divided into 6 brackets.
              </Text>
            </div>

            {/* Bracket reference */}
            <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <LabelText size="xs">Bracket reference</LabelText>
              </div>
              <div className="divide-y divide-border">
                {[
                  { name: 'Bracket 1', levels: '50, 49, 48', color: 'bg-red-500', note: null },
                  { name: 'Bracket 2', levels: '47, 46, 45', color: 'bg-accent', note: null },
                  { name: 'Bracket 3', levels: '44, 43, 42', color: 'bg-yellow-500', note: null },
                  { name: 'Bracket 4', levels: '41, 40, 39', color: 'bg-yellow-400', note: null },
                  { name: 'No Bracket', levels: '38 – 25', color: 'bg-success', note: 'Main-spec priority' },
                  { name: 'Off-spec', levels: '24 – 1', color: 'bg-info', note: 'Guild flexibility' },
                ].map((bracket) => (
                  <div key={bracket.name} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${bracket.color} shrink-0`} />
                    <span className="text-sm font-semibold text-foreground w-24 shrink-0">{bracket.name}</span>
                    <span className="text-sm text-muted-foreground font-mono">{bracket.levels}</span>
                    {bracket.note && (
                      <span className="text-xs text-muted-foreground ml-auto">{bracket.note}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 bg-background-subtle border-t border-border flex items-center gap-3 flex-wrap">
                <Text as="span" size="sm" color="muted">Max 3 pts per bracket:</Text>
                <span className="flex items-center gap-1.5">
                  <ClassificationBadge classification="Reserved" compact /> <Text as="span" size="xs" color="muted">= 1 pt</Text>
                </span>
                <span className="flex items-center gap-1.5">
                  <ClassificationBadge classification="Limited" compact /> <Text as="span" size="xs" color="muted">= 1 pt</Text>
                </span>
                <span className="flex items-center gap-1.5">
                  <ClassificationBadge classification="Unlimited" compact /> <Text as="span" size="xs" color="muted">= 0 pts</Text>
                </span>
              </div>
            </div>

            {/* Rules for Brackets 1-4 */}
            <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <LabelText size="xs">Rules for Brackets 1-4</LabelText>
              </div>
              <div className="divide-y divide-border">
                {[
                  { num: 1, title: 'Allocation point limit', desc: 'Maximum 3 points per bracket. Reserved and Limited items cost 1 point each. Unlimited items cost 0.' },
                  { num: 2, title: 'Type restriction', desc: 'Only 1 item of a given type per bracket. No duplicate weapon types in the same bracket.' },
                  { num: 3, title: 'Reserved items', desc: 'Must be the sole entry at that desirability level. Cannot share a rank with another item.' },
                  { num: 4, title: 'Equal priority', desc: 'Both item slots at a level receive equal priority when filled.' },
                  { num: 5, title: 'Dual weapons', desc: 'Two identical non-unique weapons are allowed if not hand-specific (e.g., two of the same dagger).' },
                  { num: 6, title: 'Off-spec importance', desc: 'Completing off-spec selections enhances guild flexibility and is encouraged.' },
                ].map((rule) => (
                  <div key={rule.num} className="flex items-start gap-3 px-4 py-3">
                    <span className="flex items-center justify-center w-5 h-5 rounded-md bg-accent/15 text-accent text-xs font-bold shrink-0 mt-0.5">
                      {rule.num}
                    </span>
                    <div>
                      <Text as="span" size="sm" weight="semibold">{rule.title}</Text>
                      <Text size="sm" color="muted" className="mt-0.5">{rule.desc}</Text>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Important notes */}
            <Alert variant="info">
              <AlertDescription>
                <Text as="span" size="sm" weight="semibold" className="block mb-2">Important notes</Text>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">&bull;</span>
                    <span>Each item can only be selected once across all ranks</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">&bull;</span>
                    <span>Items in &quot;No Bracket&quot; don&apos;t guarantee unavailability. They indicate other classes receive priority.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0">&bull;</span>
                    <span className="text-destructive font-semibold">If your rank number is tied, you will roll</span>
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
          </ModalBody>
        </Modal>

        {/* Confirm Modal */}
        {ConfirmDialog}

        {/* BIS Import Modal */}
        {activeCharacter && (
          <BisImportModal
            isOpen={showBisImportModal}
            onClose={() => setShowBisImportModal(false)}
            characterId={activeCharacter.id}
            characterName={activeCharacter.name}
            hasGearImported={equippedWowheadIds.size > 0}
            gearItemCount={equippedWowheadIds.size}
            rankedCount={rankedCount}
            onImportBis={importBisItems}
            onGearImported={refreshGear}
            isImportingBis={isImportingBis}
          />
        )}
        </div>
        )}
        </div>

        {/* Unranked Items Sidebar */}
        <div
          className={`shrink-0 transition-all duration-300 ease-out ${
            showUnrankedPanel ? 'w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'
          }`}
        >
          <div className="w-80 bg-background-elevated border border-border rounded-xl flex flex-col sticky top-14 sm:top-0 max-h-[calc(100vh-4.5rem)]">
            {/* Panel Header */}
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-semibold text-foreground">Unranked items</h3>
                <p className="text-xs text-muted-foreground">{unrankedItems.length} items not on your list</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowUnrankedPanel(false)}
                className="w-8 h-8"
                aria-label="Close panel"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>

            {/* Panel Content - Scrollable */}
            <div className="flex-1 overflow-y-auto">
              {unrankedItems.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-muted-foreground text-sm">All items are ranked</p>
                </div>
              ) : (
                Object.keys(unrankedByBoss).sort().map(boss => (
                  <div key={boss}>
                    {/* Boss Header */}
                    <div className="px-4 py-2 bg-muted border-b border-border sticky top-0 z-10">
                      <p className="text-xs font-semibold text-foreground uppercase tracking-wide">{boss}</p>
                    </div>
                    {/* Boss Items */}
                    <div>
                      {unrankedByBoss[boss].map(item => (
                        <div key={item.id} className="px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/30">
                          <div className="flex items-center gap-2">
                            <span className="flex-1 min-w-0">
                              <ItemLink name={item.name} wowheadId={item.wowhead_id} clickable={true} />
                            </span>
                            {item.classification && item.classification !== 'Unlimited' && (
                              <ClassificationBadge
                                classification={item.classification as 'Reserved' | 'Limited' | 'Unlimited'}
                                compact
                              />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">{item.item_slot}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </ExpansionGuard>
  )
}
