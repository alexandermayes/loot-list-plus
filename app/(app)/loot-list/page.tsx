'use client'

import React, { useState, useMemo, useCallback, useEffect, memo } from 'react'
import SearchableItemSelect from '@/app/components/SearchableItemSelect'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { ExpansionGuard } from '@/app/components/ExpansionGuard'
import { TierTabsSkeleton, LootListContentSkeleton } from '@/components/ui/skeletons'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalBody,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-modal'
import { Heading } from '@/components/ui/typography'
import { normalizeBossName } from '@/utils/bossOrder'
import { getRaidIcon } from '@/utils/raidIcons'
import { StarFilledIcon, CheckFilledIcon, ClockFilledIcon, AlertFilledIcon, CancelFilledIcon } from '@/components/ui/icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { InformationCircleIcon } from '@hugeicons/core-free-icons'
import { useLootList, type LootItem } from '@/app/contexts/LootListContext'
import { ClassificationBadge } from '@/components/ui/classification-badge'

// Helper function for rank colors - defined outside component for stability
const getRankColor = (rank: number) => {
  if (rank >= 48) return 'from-red-900 to-red-700' // Bracket 1
  if (rank >= 45) return 'from-orange-900 to-orange-700' // Bracket 2
  if (rank >= 42) return 'from-yellow-900 to-yellow-700' // Bracket 3
  if (rank >= 39) return 'from-amber-900 to-amber-700' // Bracket 4
  if (rank >= 25) return 'from-green-900 to-green-700' // No Bracket (Main-spec)
  return 'from-blue-900 to-blue-700' // Off-spec
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
  slot2Errors = []
}: RankRowProps) {
  const selectedItem1 = selectedItemId1 ? lootItems.find(i => i.id === selectedItemId1) : null
  const selectedItem2 = selectedItemId2 ? lootItems.find(i => i.id === selectedItemId2) : null
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
        <div className="space-y-1">
          <SearchableItemSelect
            items={lootItems}
            value={selectedItemId1 || ''}
            onChange={(value) => onItemSelect(rank, 1, value)}
            disabled={selectedItems}
            currentValue={selectedItemId1}
            isSlotDisabled={isSlot1DisabledByReserved}
            hasError={hasSlot1Error}
          />
          {hasSlot1Error && (
            <p className="text-destructive text-[11px] pl-3">
              {slot1ErrorMessages.join(' · ')}
            </p>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5">
        {selectedItem1 ? (
          <div className="flex items-center gap-2">
            <p className="text-foreground-muted text-[12px]">{normalizeBossName(selectedItem1.boss_name)}</p>
            {selectedItem1.classification && (
              <ClassificationBadge classification={selectedItem1.classification as 'Reserved' | 'Limited' | 'Unlimited'} />
            )}
          </div>
        ) : isSlot1DisabledByReserved ? (
          <span className="text-muted-foreground text-[12px] italic">Reserved item in slot 2</span>
        ) : <span className="text-foreground-muted text-[12px]">-</span>}
      </td>
      <td className="px-3 py-2.5">
        <div className="space-y-1">
          <SearchableItemSelect
            items={lootItems}
            value={selectedItemId2 || ''}
            onChange={(value) => onItemSelect(rank, 2, value)}
            disabled={selectedItems}
            currentValue={selectedItemId2}
            isSlotDisabled={isSlot2DisabledByReserved}
            hasError={hasSlot2Error}
          />
          {hasSlot2Error && (
            <p className="text-destructive text-[11px] pl-3">
              {slot2ErrorMessages.join(' · ')}
            </p>
          )}
        </div>
      </td>
      <td className="px-3 py-2.5">
        {selectedItem2 ? (
          <div className="flex items-center gap-2">
            <p className="text-foreground-muted text-[12px]">{normalizeBossName(selectedItem2.boss_name)}</p>
            {selectedItem2.classification && (
              <ClassificationBadge classification={selectedItem2.classification as 'Reserved' | 'Limited' | 'Unlimited'} />
            )}
          </div>
        ) : isSlot2DisabledByReserved ? (
          <span className="text-muted-foreground text-[12px] italic">Reserved item in slot 1</span>
        ) : <span className="text-foreground-muted text-[12px]">-</span>}
      </td>
    </tr>
  )
})

export default function LootList() {
  const {
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
    tierSubmissionStatuses,
    selectedTierId,
    selectedTierDeadline,
    enforceSlotRestrictions,
    isLoading,
    isContentLoading,
    isSaving,
    hasChanges,
    setSelectedTierId,
    handleItemSelect,
    clearAllRankings,
    saveSubmission
  } = useLootList()

  // Local UI state
  const [showInstructionsModal, setShowInstructionsModal] = useState(false)
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set())

  const { confirm, ConfirmDialog } = useConfirm()

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Loot List'
  }, [])

  // Helper to check if we're past the submission deadline
  const isPastDeadline = (): boolean => {
    if (!selectedTierDeadline) return false
    return new Date() > new Date(selectedTierDeadline)
  }

  const handleClearList = useCallback(() => {
    confirm({
      title: 'Clear all rankings',
      description: 'Are you sure you want to clear all ranked items? This cannot be undone.',
      confirmLabel: 'Clear All',
      variant: 'danger',
      onConfirm: () => clearAllRankings()
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success/10 border-success text-foreground'
      case 'pending': return 'bg-yellow-500/10 border-yellow-500 text-foreground'
      case 'needs_revision': return 'bg-orange-500/10 border-orange-500 text-foreground'
      case 'rejected': return 'bg-destructive/10 border-destructive text-foreground'
      default: return 'bg-background-elevated border-border text-muted-foreground'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved'
      case 'pending': return 'Pending'
      case 'needs_revision': return 'Needs Revision'
      case 'rejected': return 'Rejected'
      default: return 'Draft'
    }
  }

  const rankedCount = Object.keys(rankings).length
  const selectedItems = useMemo(() => new Set(Object.values(rankings)), [rankings])
  const duplicateItems = useMemo(() =>
    Object.values(rankings).filter((itemId, index, arr) => arr.indexOf(itemId) !== index),
    [rankings]
  )

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
      { bracketName: 'Bracket 1 (50-48)', allocationPoints: 0, maxPoints: 3, ranks: [50, 49, 48], violations: [], itemErrors: [] },
      { bracketName: 'Bracket 2 (47-45)', allocationPoints: 0, maxPoints: 3, ranks: [47, 46, 45], violations: [], itemErrors: [] },
      { bracketName: 'Bracket 3 (44-42)', allocationPoints: 0, maxPoints: 3, ranks: [44, 43, 42], violations: [], itemErrors: [] },
      { bracketName: 'Bracket 4 (41-39)', allocationPoints: 0, maxPoints: 3, ranks: [41, 40, 39], violations: [], itemErrors: [] },
    ]

    brackets.forEach(bracket => {
      const itemTypesInBracket: Record<string, { count: number; items: Array<{ rank: number; slot: 1 | 2; itemId: string }> }> = {}
      const itemSlotsInBracket: Record<string, { count: number; items: Array<{ rank: number; slot: 1 | 2; itemId: string }> }> = {}
      const allocationItems: Array<{ rank: number; slot: 1 | 2; itemId: string; cost: number }> = []

      bracket.ranks.forEach(rank => {
        const item1Id = rankings[`${rank}-1`]
        const item2Id = rankings[`${rank}-2`]

        // Check slot 1
        if (item1Id) {
          const item = lootItems.find(i => i.id === item1Id)
          if (item) {
            // Track allocation cost items
            const cost = item.allocation_cost || 0
            bracket.allocationPoints += cost
            if (cost > 0) {
              allocationItems.push({ rank, slot: 1, itemId: item1Id, cost })
            }

            // Track item types for duplicate detection
            if (item.item_type) {
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
          const item = lootItems.find(i => i.id === item2Id)
          if (item) {
            // Track allocation cost items
            const cost = item.allocation_cost || 0
            bracket.allocationPoints += cost
            if (cost > 0) {
              allocationItems.push({ rank, slot: 2, itemId: item2Id, cost })
            }

            // Track item types for duplicate detection
            if (item.item_type) {
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
              const item1 = lootItems.find(i => i.id === item1Id)
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
      Object.entries(itemTypesInBracket).forEach(([type, data]) => {
        if (data.count > 1) {
          bracket.violations.push(`Duplicate ${type} (${data.count} selected)`)
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
        Object.entries(itemSlotsInBracket).forEach(([slot, data]) => {
          if (data.count > 1) {
            bracket.violations.push(`Multiple ${slot} items (${data.count} selected) - only 1 allowed per bracket`)
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
  }, [rankings, lootItems, enforceSlotRestrictions])
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
                {isLoading ? 'Loading raid tiers...' : `Rank your preferred items for ${raidTiers.find(t => t.id === selectedTierId)?.name || 'this raid tier'}`}
                {viewingExpansionId && (
                  <span className="ml-2 px-3 py-1 bg-blue-950/50 border border-blue-600/50 text-blue-300 text-xs font-medium rounded-full">
                    Viewing Past: {guildExpansions.find(e => e.expansion_id === viewingExpansionId)?.expansion_name}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* How to Rank Button */}
              <Button variant="secondary" onClick={() => setShowInstructionsModal(true)}>
                <HugeiconsIcon icon={InformationCircleIcon} size={18} />
                How to Rank
              </Button>
            </div>
          </div>
        </div>

        {/* Expansion Selector */}
        {guildExpansions.length > 1 && (
          <div className="px-4 sm:px-6 lg:px-8 py-1.5 bg-background">
            <div className="flex gap-2 overflow-x-auto">
              {guildExpansions.map((expansion) => {
                const isViewing = viewingExpansionId === expansion.expansion_id
                const isCurrent = expansion.is_current && !viewingExpansionId

                return (
                  <button
                    key={expansion.expansion_id}
                    onClick={() => setViewingExpansion(expansion.is_current ? null : expansion.expansion_id)}
                    className={`px-5 py-2.5 rounded-[40px] whitespace-nowrap text-[13px] font-medium transition-all border ${
                      isViewing || isCurrent
                        ? 'bg-accent/20 border-accent/20 text-accent'
                        : 'bg-background-elevated border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{expansion.expansion_name}</span>
                      {expansion.is_current && <StarFilledIcon size={14} />}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Raid Tier Tabs - Sticky */}
        {isLoading ? (
          <div className="sticky top-0 z-20 px-4 sm:px-6 lg:px-8 py-1.5 bg-background">
            <TierTabsSkeleton />
          </div>
        ) : raidTiers.length > 0 && (
          <div className="sticky top-0 z-20 px-4 sm:px-6 lg:px-8 py-1.5 bg-background">
            <div className="flex items-center gap-3 overflow-x-auto">
              <div className="flex gap-2">
                {raidTiers.map((tier) => {
                  const status = tierSubmissionStatuses[tier.id]
                  const hasSubmission = !!status
                  const statusColor = hasSubmission
                    ? status.status === 'approved'
                      ? 'text-green-400'
                      : status.status === 'pending'
                      ? 'text-yellow-400'
                      : status.status === 'needs_revision'
                      ? 'text-orange-400'
                      : status.status === 'rejected'
                      ? 'text-red-400'
                      : 'text-gray-400'
                    : ''

                  return (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTierId(tier.id)}
                      className={`px-5 py-2.5 rounded-[40px] whitespace-nowrap text-[13px] font-medium transition-all border ${
                        selectedTierId === tier.id
                          ? 'bg-accent/20 border-accent/20 text-accent'
                          : 'bg-background-elevated border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{tier.name}</span>
                        {tier.is_active && <StarFilledIcon size={14} />}
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
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="px-4 sm:px-6 lg:px-8 pt-1.5 pb-6 space-y-6">
        {/* Content Loading State */}
        {(isLoading || isContentLoading) ? (
          <LootListContentSkeleton />
        ) : (
        <>
        {/* Status Banner */}
        {selectedTierId && (
          <div className={`rounded-xl p-4 sm:p-6 border ${submission ? getStatusColor(submission.status) : getStatusColor('draft')}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={getRaidIcon(raidTiers.find(t => t.id === selectedTierId)?.name || '')}
                  alt=""
                  className="w-10 h-10 rounded-lg border-2 border-border/50 shadow-md"
                />
                <div>
                  <h2 className="font-semibold text-lg text-foreground">{raidTiers.find(t => t.id === selectedTierId)?.name || 'Raid Tier'}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {submission ? getStatusLabel(submission.status) : 'Draft'}
                    {submission?.submitted_at && (
                      <span> · Submitted {new Date(submission.submitted_at).toLocaleDateString()}</span>
                    )}
                    {selectedTierDeadline && !isPastDeadline() && (
                      <span> · Due {new Date(selectedTierDeadline).toLocaleString()}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                <span className="text-sm opacity-75">{rankedCount} items ranked</span>
                {/* Clear List Button */}
                {rankedCount > 0 && (
                  <Button variant="destructive" onClick={handleClearList} size="sm" className="sm:size-default">
                    <span className="hidden sm:inline">Clear List</span>
                    <span className="sm:hidden">Clear</span>
                  </Button>
                )}
                {/* Submit for Review Button */}
                <Button
                  onClick={() => saveSubmission(true)}
                  disabled={
                    rankedCount === 0 ||
                    duplicateItems.length > 0 ||
                    hasValidationErrors ||
                    (!hasChanges && (submission?.status === 'approved' || submission?.status === 'pending'))
                  }
                  loading={isSaving}
                >
                  Submit for Review
                </Button>
              </div>
            </div>
            {submission?.review_notes && (
              <div className="mt-3 p-4 bg-black/20 rounded-xl">
                <p className="text-sm"><strong>Officer Notes:</strong> {submission.review_notes}</p>
              </div>
            )}
          </div>
        )}


        {/* Deadline Warning */}
        {selectedTierDeadline && isPastDeadline() && (
          <div className="bg-yellow-900/50 border border-yellow-500 rounded-xl p-4 text-yellow-200">
            <div className="flex items-start gap-3">
              <span className="text-xl">⏰</span>
              <div>
                <p className="font-semibold mb-1">Submission deadline passed</p>
                <p className="text-sm">
                  The deadline for this raid tier was {new Date(selectedTierDeadline).toLocaleString()}.
                  You can still submit changes, but they will require officer approval before being visible on the master sheet.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate Warning */}
        {duplicateItems.length > 0 && (
          <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 text-red-300">
            <strong>Warning:</strong> You have selected the same item multiple times. Each item can only appear once.
          </div>
        )}

        {/* Bracket 1 (50-48) */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-red-500/10 border-l-4 border-l-red-800/60 px-4 py-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Bracket 1 (50-48)</h2>
                {(() => {
                  const validation = getBracketValidation('Bracket 1 (50-48)')
                  return validation ? (
                    <p className={`text-[12px] font-medium mt-1 ${validation.violations.length > 0 ? 'text-red-200' : 'text-red-200'}`}>
                      Allocation Points: {validation.allocationPoints}/{validation.maxPoints}
                    </p>
                  ) : (
                    <p className="text-red-200 text-[12px] mt-1">Max 3 allocation points per bracket</p>
                  )
                })()}
              </div>
              {(() => {
                const validation = getBracketValidation('Bracket 1 (50-48)')
                const bracketName = 'Bracket 1 (50-48)'
                const isExpanded = expandedErrors.has(bracketName)
                return validation && validation.violations.length > 0 ? (
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => toggleErrorExpanded(bracketName)}
                      className="flex items-center gap-2 bg-red-500 hover:bg-red-600 border-2 border-red-300 px-3 py-1.5 rounded-lg font-bold text-foreground shadow-lg animate-pulse transition-colors cursor-pointer"
                    >
                      <span className="text-sm whitespace-nowrap">
                        {validation.violations.length} {validation.violations.length === 1 ? 'Error' : 'Errors'}
                      </span>
                      <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                    </button>
                    {isExpanded && (
                      <div className="bg-red-600 border-2 border-red-400 rounded-lg px-3 py-2 shadow-lg max-w-md">
                        <ul className="space-y-1 text-sm font-semibold text-foreground">
                          {validation.violations.map((violation, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="text-base">⚠️</span>
                              <span>{violation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null
              })()}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '64px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
              </colgroup>
              <thead>
                <tr className="bg-background-subtle border-b border-border">
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Rank</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #1</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #2</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
                </tr>
              </thead>
              <tbody>
                {bracket1.map(rank => (
                  <RankRow
                    key={rank}
                    rank={rank}
                    lootItems={lootItems}
                    selectedItemId1={rankings[`${rank}-1`]}
                    selectedItemId2={rankings[`${rank}-2`]}
                    selectedItems={selectedItems}
                    duplicateItems={duplicateItems}
                    onItemSelect={handleItemSelect}
                    slot1Errors={getSlotErrors(rank, 1)}
                    slot2Errors={getSlotErrors(rank, 2)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bracket 2 (47-45) */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-orange-500/10 border-l-4 border-l-orange-800/60 px-4 py-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Bracket 2 (47-45)</h2>
                {(() => {
                  const validation = getBracketValidation('Bracket 2 (47-45)')
                  return validation ? (
                    <p className={`text-[12px] font-medium mt-1 ${validation.violations.length > 0 ? 'text-orange-200' : 'text-orange-200'}`}>
                      Allocation Points: {validation.allocationPoints}/{validation.maxPoints}
                    </p>
                  ) : (
                    <p className="text-orange-200 text-[12px] mt-1">Max 3 allocation points per bracket</p>
                  )
                })()}
              </div>
              {(() => {
                const validation = getBracketValidation('Bracket 2 (47-45)')
                const bracketName = 'Bracket 2 (47-45)'
                const isExpanded = expandedErrors.has(bracketName)
                return validation && validation.violations.length > 0 ? (
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => toggleErrorExpanded(bracketName)}
                      className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 border-2 border-orange-300 px-3 py-1.5 rounded-lg font-bold text-foreground shadow-lg animate-pulse transition-colors cursor-pointer"
                    >
                      <span className="text-sm whitespace-nowrap">
                        {validation.violations.length} {validation.violations.length === 1 ? 'Error' : 'Errors'}
                      </span>
                      <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                    </button>
                    {isExpanded && (
                      <div className="bg-orange-600 border-2 border-orange-400 rounded-lg px-3 py-2 shadow-lg max-w-md">
                        <ul className="space-y-1 text-sm font-semibold text-foreground">
                          {validation.violations.map((violation, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="text-base">⚠️</span>
                              <span>{violation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null
              })()}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '64px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
              </colgroup>
              <thead>
                <tr className="bg-background-subtle border-b border-border">
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Rank</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #1</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #2</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
                </tr>
              </thead>
              <tbody>
                {bracket2.map(rank => (
                  <RankRow
                    key={rank}
                    rank={rank}
                    lootItems={lootItems}
                    selectedItemId1={rankings[`${rank}-1`]}
                    selectedItemId2={rankings[`${rank}-2`]}
                    selectedItems={selectedItems}
                    duplicateItems={duplicateItems}
                    onItemSelect={handleItemSelect}
                    slot1Errors={getSlotErrors(rank, 1)}
                    slot2Errors={getSlotErrors(rank, 2)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bracket 3 (44-42) */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-yellow-500/10 border-l-4 border-l-yellow-800/60 px-4 py-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Bracket 3 (44-42)</h2>
                {(() => {
                  const validation = getBracketValidation('Bracket 3 (44-42)')
                  return validation ? (
                    <p className={`text-[12px] font-medium mt-1 ${validation.violations.length > 0 ? 'text-yellow-200' : 'text-yellow-200'}`}>
                      Allocation Points: {validation.allocationPoints}/{validation.maxPoints}
                    </p>
                  ) : (
                    <p className="text-yellow-200 text-[12px] mt-1">Max 3 allocation points per bracket</p>
                  )
                })()}
              </div>
              {(() => {
                const validation = getBracketValidation('Bracket 3 (44-42)')
                const bracketName = 'Bracket 3 (44-42)'
                const isExpanded = expandedErrors.has(bracketName)
                return validation && validation.violations.length > 0 ? (
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => toggleErrorExpanded(bracketName)}
                      className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-600 border-2 border-yellow-300 px-3 py-1.5 rounded-lg font-bold text-foreground shadow-lg animate-pulse transition-colors cursor-pointer"
                    >
                      <span className="text-sm whitespace-nowrap">
                        {validation.violations.length} {validation.violations.length === 1 ? 'Error' : 'Errors'}
                      </span>
                      <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                    </button>
                    {isExpanded && (
                      <div className="bg-yellow-600 border-2 border-yellow-400 rounded-lg px-3 py-2 shadow-lg max-w-md">
                        <ul className="space-y-1 text-sm font-semibold text-foreground">
                          {validation.violations.map((violation, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="text-base">⚠️</span>
                              <span>{violation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null
              })()}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '64px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
              </colgroup>
              <thead>
                <tr className="bg-background-subtle border-b border-border">
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Rank</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #1</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #2</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
                </tr>
              </thead>
              <tbody>
                {bracket3.map(rank => (
                  <RankRow
                    key={rank}
                    rank={rank}
                    lootItems={lootItems}
                    selectedItemId1={rankings[`${rank}-1`]}
                    selectedItemId2={rankings[`${rank}-2`]}
                    selectedItems={selectedItems}
                    duplicateItems={duplicateItems}
                    onItemSelect={handleItemSelect}
                    slot1Errors={getSlotErrors(rank, 1)}
                    slot2Errors={getSlotErrors(rank, 2)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bracket 4 (41-39) */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-amber-500/10 border-l-4 border-l-amber-800/60 px-4 py-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-foreground">Bracket 4 (41-39)</h2>
                {(() => {
                  const validation = getBracketValidation('Bracket 4 (41-39)')
                  return validation ? (
                    <p className={`text-[12px] font-medium mt-1 ${validation.violations.length > 0 ? 'text-amber-200' : 'text-amber-200'}`}>
                      Allocation Points: {validation.allocationPoints}/{validation.maxPoints}
                    </p>
                  ) : (
                    <p className="text-amber-200 text-[12px] mt-1">Max 3 allocation points per bracket</p>
                  )
                })()}
              </div>
              {(() => {
                const validation = getBracketValidation('Bracket 4 (41-39)')
                const bracketName = 'Bracket 4 (41-39)'
                const isExpanded = expandedErrors.has(bracketName)
                return validation && validation.violations.length > 0 ? (
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => toggleErrorExpanded(bracketName)}
                      className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 border-2 border-amber-300 px-3 py-1.5 rounded-lg font-bold text-foreground shadow-lg animate-pulse transition-colors cursor-pointer"
                    >
                      <span className="text-sm whitespace-nowrap">
                        {validation.violations.length} {validation.violations.length === 1 ? 'Error' : 'Errors'}
                      </span>
                      <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                    </button>
                    {isExpanded && (
                      <div className="bg-amber-600 border-2 border-amber-400 rounded-lg px-3 py-2 shadow-lg max-w-md">
                        <ul className="space-y-1 text-sm font-semibold text-foreground">
                          {validation.violations.map((violation, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="text-base">⚠️</span>
                              <span>{violation}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : null
              })()}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '64px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
              </colgroup>
              <thead>
                <tr className="bg-background-subtle border-b border-border">
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Rank</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #1</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #2</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
                </tr>
              </thead>
              <tbody>
                {bracket4.map(rank => (
                  <RankRow
                    key={rank}
                    rank={rank}
                    lootItems={lootItems}
                    selectedItemId1={rankings[`${rank}-1`]}
                    selectedItemId2={rankings[`${rank}-2`]}
                    selectedItems={selectedItems}
                    duplicateItems={duplicateItems}
                    onItemSelect={handleItemSelect}
                    slot1Errors={getSlotErrors(rank, 1)}
                    slot2Errors={getSlotErrors(rank, 2)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* No Bracket (38-25) - Main-spec */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-green-500/10 border-l-4 border-l-green-800/60 px-4 py-2">
            <h2 className="text-[15px] font-semibold text-foreground">No Bracket (38-25) - Main-spec</h2>
            <p className="text-green-200 text-[12px]">Still considered main-spec priority</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '64px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
              </colgroup>
              <thead>
                <tr className="bg-background-subtle border-b border-border">
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Rank</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #1</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #2</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
                </tr>
              </thead>
              <tbody>
                {noBracket.map(rank => (
                  <RankRow
                    key={rank}
                    rank={rank}
                    lootItems={lootItems}
                    selectedItemId1={rankings[`${rank}-1`]}
                    selectedItemId2={rankings[`${rank}-2`]}
                    selectedItems={selectedItems}
                    duplicateItems={duplicateItems}
                    onItemSelect={handleItemSelect}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Off-spec (24-1) */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-blue-500/10 border-l-4 border-l-blue-800/60 px-4 py-2">
            <h2 className="text-[15px] font-semibold text-foreground">Off-spec (24-1)</h2>
            <p className="text-blue-200 text-[12px]">Off-spec items to support guild flexibility</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col style={{ width: '64px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
                <col style={{ width: '320px' }} />
                <col style={{ width: '160px' }} />
              </colgroup>
              <thead>
                <tr className="bg-background-subtle border-b border-border">
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Rank</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #1</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Loot #2</th>
                  <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Details</th>
                </tr>
              </thead>
              <tbody>
                {offSpec.map(rank => (
                  <RankRow
                    key={rank}
                    rank={rank}
                    lootItems={lootItems}
                    selectedItemId1={rankings[`${rank}-1`]}
                    selectedItemId2={rankings[`${rank}-2`]}
                    selectedItems={selectedItems}
                    duplicateItems={duplicateItems}
                    onItemSelect={handleItemSelect}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* How to Rank Modal */}
        <Modal open={showInstructionsModal} onClose={() => setShowInstructionsModal(false)} size="lg">
          <ModalHeader onClose={() => setShowInstructionsModal(false)}>
            <ModalTitle>How to rank</ModalTitle>
          </ModalHeader>
          <ModalBody className="space-y-4">
            {/* Core Structure */}
            <div>
              <h4 className="text-foreground font-semibold text-sm mb-2">Core Structure</h4>
              <p className="text-muted-foreground text-sm">
                The system uses <span className="font-semibold text-foreground">50 desirability levels</span> (Level 50 being most desirable),
                with each level containing <span className="font-semibold text-foreground">2 item slots</span> divided into 6 brackets.
              </p>
            </div>

            {/* Brackets */}
            <div>
              <h4 className="text-foreground font-semibold text-sm mb-2">Bracket Framework</h4>
              <ul className="text-muted-foreground text-sm space-y-1">
                <li>• <span className="font-semibold text-destructive">Bracket 1:</span> Levels 50, 49, 48</li>
                <li>• <span className="font-semibold text-accent">Bracket 2:</span> Levels 47, 46, 45</li>
                <li>• <span className="font-semibold text-warning">Bracket 3:</span> Levels 44, 43, 42</li>
                <li>• <span className="font-semibold text-yellow-400">Bracket 4:</span> Levels 41, 40, 39</li>
                <li>• <span className="font-semibold text-success">No Bracket:</span> Levels 38-25 (Still main-spec priority)</li>
                <li>• <span className="font-semibold text-info">Off-spec:</span> Levels 24-1 (Enhances guild flexibility)</li>
              </ul>
            </div>

            {/* Key Rules */}
            <div>
              <h4 className="text-foreground font-semibold text-sm mb-2">Key Rules (Brackets 1-4)</h4>
              <ul className="text-muted-foreground text-sm space-y-2">
                <li>
                  <span className="font-semibold text-foreground">1. Allocation Point Limit:</span> Maximum 3 points per bracket.
                  <ul className="ml-4 mt-1 space-y-0.5">
                    <li>- <span className="text-destructive">Reserved items</span> cost 1 point</li>
                    <li>- <span className="text-warning">Limited items</span> cost 1 point</li>
                    <li>- <span className="text-success">Unlimited items</span> cost 0 points</li>
                  </ul>
                </li>
                <li>
                  <span className="font-semibold text-foreground">2. Type Restriction:</span> Brackets 1-4 may only contain 1 item of a type
                  (no duplicate weapon types in same bracket).
                </li>
                <li>
                  <span className="font-semibold text-foreground">3. Reserved Items:</span> Must be the sole entry at that desirability level
                  (cannot have another item in the same rank).
                </li>
                <li>
                  <span className="font-semibold text-foreground">4. Equal Priority:</span> Both item slots per level receive equal priority when filled.
                </li>
                <li>
                  <span className="font-semibold text-foreground">5. Dual Weapons:</span> Two identical non-unique weapons are permitted if not hand-specific
                  (e.g., two of the same dagger).
                </li>
                <li>
                  <span className="font-semibold text-foreground">6. Off-spec Importance:</span> Completing off-spec selections enhances guild flexibility
                  and is encouraged.
                </li>
              </ul>
            </div>

            {/* Important Notes */}
            <div className="bg-info/10 border border-info/30 rounded-xl p-4">
              <h4 className="text-info font-semibold text-sm mb-2">Important Notes</h4>
              <ul className="text-info text-sm space-y-1">
                <li>• Each item can only be selected once across all ranks</li>
                <li>• Items in "No Bracket" don't guarantee unavailability - they indicate other classes receive priority</li>
                <li>• <span className="text-destructive font-semibold">If your rank number is tied, you will roll</span></li>
              </ul>
            </div>
          </ModalBody>
        </Modal>

        {/* Confirm Modal */}
        {ConfirmDialog}
        </>
        )}
        </div>
      </div>
    </ExpansionGuard>
  )
}
