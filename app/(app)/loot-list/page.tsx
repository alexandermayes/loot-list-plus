'use client'

import React, { useState, useMemo, useCallback, useEffect, memo } from 'react'
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
import { StarFilledIcon, CheckFilledIcon, ClockFilledIcon, AlertFilledIcon, CancelFilledIcon } from '@/components/ui/icons'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { HugeiconsIcon } from '@hugeicons/react'
import { InformationCircleIcon } from '@hugeicons/core-free-icons'
import { useLootList, type LootItem } from '@/app/contexts/LootListContext'
import { getPhaseGroupShortLabel } from '@/utils/phase-groups'
import { isTokenSlot } from '@/data/token-class-mapping'
import { useNotification } from '@/app/contexts/NotificationContext'
import { trackClientEvent } from '@/utils/analytics/client'
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
  ownedWowheadIds = new Set()
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
            ownedWowheadIds={ownedWowheadIds}
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
            ownedWowheadIds={ownedWowheadIds}
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
    equippedWowheadIds,
    isLoading,
    isContentLoading,
    isSaving,
    isImportingBis,
    hasChanges,
    originalStatus,
    setSelectedPhase,
    handleItemSelect,
    clearAllRankings,
    saveSubmission,
    importBisItems,
    refreshGear
  } = useLootList()

  // Local UI state
  const [showInstructionsModal, setShowInstructionsModal] = useState(false)
  const [showBisImportModal, setShowBisImportModal] = useState(false)
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set())
  const [showUnrankedPanel, setShowUnrankedPanel] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [contentReady, setContentReady] = useState(false)
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
      const timer = setTimeout(() => setContentReady(true), 150)
      return () => clearTimeout(timer)
    } else {
      setContentReady(false)
    }
  }, [isLoading, isContentLoading])

  // Track page view
  useEffect(() => {
    if (activeGuild?.id) trackClientEvent('loot_list_page_viewed', { guild_id: activeGuild.id })
  }, [activeGuild?.id])

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

  // Create bracket-specific disabled sets for tokens
  // Tokens can be selected once per bracket section (Brackets 1-4, No Bracket, Off-spec)
  // Non-tokens are disabled everywhere once selected
  const { bracket14DisabledItems, noBracketDisabledItems, offSpecDisabledItems } = useMemo(() => {
    // Create a map of itemId -> item_slot for checking if an item is a token
    const itemSlotMap = new Map(lootItems.map(item => [item.id, item.item_slot]))

    // Separate items by bracket section based on rank
    // Rankings key format: "{rank}-{slot}" e.g., "50-1", "38-2"
    const bracket14Tokens = new Set<string>()   // Tokens selected in ranks 39-50
    const noBracketTokens = new Set<string>()   // Tokens selected in ranks 25-38
    const offSpecTokens = new Set<string>()     // Tokens selected in ranks 1-24
    const nonTokenItems = new Set<string>()     // All non-token items

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
        // Non-tokens are disabled everywhere
        nonTokenItems.add(itemId)
      }
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
  // Non-token items are duplicates if they appear anywhere more than once.
  // Token items are only duplicates if they appear more than once within the SAME bracket section.
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

    // Non-token items: any global duplicate is an error
    nonTokenItemIds.forEach((itemId, index, arr) => {
      if (arr.indexOf(itemId) !== index) dupes.push(itemId)
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
  }, [rankings, bracket14ItemsById, enforceSlotRestrictions])
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
                          {hasActiveTier && <StarFilledIcon size={14} />}
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

        {/* Status Banner skeleton - reserves space during loading to prevent CLS */}
        {(isLoading || isContentLoading) && (
          <div className="px-4 sm:px-6 lg:px-8 pb-2">
            <div className="rounded-xl p-4 sm:p-6 border border-border bg-background-elevated">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
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
                        <button
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
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
                        </button>
                        {rankedCount > 0 && (
                          <button
                            className="w-full px-4 py-2.5 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-2"
                            onClick={() => {
                              handleClearList()
                              setShowMoreMenu(false)
                            }}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Clear list
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {/* Import BIS Button */}
                  <Button
                    variant="outline"
                    onClick={() => setShowBisImportModal(true)}
                  >
                    Import BIS
                  </Button>
                  {/* Submit for Review Button */}
                  <Button
                    onClick={() => saveSubmission(true)}
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
        {!isLoading && !isContentLoading && phaseDeadline && isPastDeadline() && (
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="bg-yellow-900/50 border border-yellow-500 rounded-xl p-4 text-yellow-200">
              <div className="flex items-start gap-3">
                <span className="text-xl">⏰</span>
                <div>
                  <p className="font-semibold mb-1">Submission deadline passed</p>
                  <p className="text-sm">
                    The deadline for Phase {selectedPhase} was {new Date(phaseDeadline).toLocaleString()}.
                    You can still submit changes, but they will require officer approval before being visible on the master sheet.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Flex container for loot list and sidebar */}
        <div className={`flex px-4 sm:px-6 lg:px-8 pt-1.5 pb-6 ${showUnrankedPanel ? 'gap-6' : ''}`}>
        {/* Loot List Content */}
        <div className={`flex-1 min-w-0 space-y-6 transition-all duration-300 ${showUnrankedPanel ? 'pr-0' : ''}`}>
        {/* Content Loading State */}
        {(isLoading || isContentLoading) ? (
          <LootListContentSkeleton />
        ) : (
        <div className={`space-y-4 transition-opacity duration-200 ${contentReady ? 'opacity-100' : 'opacity-0'}`}>

        {/* Duplicate Warning */}
        {duplicateItems.length > 0 && (
          <div className="bg-red-900/50 border border-red-500 rounded-xl p-4 text-red-300">
            <strong>Warning:</strong> You have duplicate items in the same bracket section. Non-token items can only appear once. Tokens can appear once per section.
          </div>
        )}

        {/* Bracket 1 (50-48) */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-red-500/10 border-l-4 border-l-red-800/60 px-4 py-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[15px] font-semibold text-foreground inline-flex items-center gap-1.5">Bracket 1 (50-48) <InfoTooltip content="Highest priority tier. Reserved and Limited items here cost allocation points. Max 3 points per bracket." /></h2>
                {(() => {
                  const validation = getBracketValidation('Bracket 1 (50-48)')
                  return validation ? (
                    <p className={`text-[12px] font-medium mt-1 ${validation.violations.length > 0 ? 'text-red-200' : 'text-red-200'}`}>
                      Allocation Points: {validation.allocationPoints}/{validation.maxPoints} <InfoTooltip content="Reserved and Limited items cost 1 point each. Unlimited items cost 0. You can spend up to 3 points per bracket." iconSize={12} />
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
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => toggleErrorExpanded(bracketName)}
                      className="flex items-center gap-2"
                    >
                      <span className="whitespace-nowrap">
                        {validation.violations.length} {validation.violations.length === 1 ? 'Error' : 'Errors'}
                      </span>
                      <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                    </Button>
                    {isExpanded && (
                      <Alert variant="destructive" className="max-w-md px-3 py-2">
                        <AlertDescription>
                          <ul className="space-y-1 text-sm text-foreground">
                            {validation.violations.map((violation, idx) => (
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
                ) : null
              })()}
            </div>
          </div>
          <div className="overflow-x-auto max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
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
                {bracket1.map(rank => (
                  <RankRow
                    key={rank}
                    rank={rank}
                    lootItems={bracket14Items}
                    selectedItemId1={rankings[`${rank}-1`]}
                    selectedItemId2={rankings[`${rank}-2`]}
                    selectedItems={bracket14DisabledItems}
                    duplicateItems={duplicateItems}
                    onItemSelect={handleItemSelect}
                    slot1Errors={getSlotErrors(rank, 1)}
                    slot2Errors={getSlotErrors(rank, 2)}
                    ownedWowheadIds={equippedWowheadIds}
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
                <h2 className="text-[15px] font-semibold text-foreground inline-flex items-center gap-1.5">Bracket 2 (47-45) <InfoTooltip content="Second priority tier. Same allocation point rules as Bracket 1." /></h2>
                {(() => {
                  const validation = getBracketValidation('Bracket 2 (47-45)')
                  return validation ? (
                    <p className={`text-[12px] font-medium mt-1 ${validation.violations.length > 0 ? 'text-orange-200' : 'text-orange-200'}`}>
                      Allocation Points: {validation.allocationPoints}/{validation.maxPoints} <InfoTooltip content="Reserved and Limited items cost 1 point each. Unlimited items cost 0. You can spend up to 3 points per bracket." iconSize={12} />
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
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => toggleErrorExpanded(bracketName)}
                      className="flex items-center gap-2"
                    >
                      <span className="whitespace-nowrap">
                        {validation.violations.length} {validation.violations.length === 1 ? 'Error' : 'Errors'}
                      </span>
                      <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                    </Button>
                    {isExpanded && (
                      <Alert variant="destructive" className="max-w-md px-3 py-2">
                        <AlertDescription>
                          <ul className="space-y-1 text-sm text-foreground">
                            {validation.violations.map((violation, idx) => (
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
                ) : null
              })()}
            </div>
          </div>
          <div className="overflow-x-auto max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
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
                {bracket2.map(rank => (
                  <RankRow
                    key={rank}
                    rank={rank}
                    lootItems={bracket14Items}
                    selectedItemId1={rankings[`${rank}-1`]}
                    selectedItemId2={rankings[`${rank}-2`]}
                    selectedItems={bracket14DisabledItems}
                    duplicateItems={duplicateItems}
                    onItemSelect={handleItemSelect}
                    slot1Errors={getSlotErrors(rank, 1)}
                    slot2Errors={getSlotErrors(rank, 2)}
                    ownedWowheadIds={equippedWowheadIds}
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
                <h2 className="text-[15px] font-semibold text-foreground inline-flex items-center gap-1.5">Bracket 3 (44-42) <InfoTooltip content="Third priority tier. Same allocation point rules as Brackets 1-2." /></h2>
                {(() => {
                  const validation = getBracketValidation('Bracket 3 (44-42)')
                  return validation ? (
                    <p className={`text-[12px] font-medium mt-1 ${validation.violations.length > 0 ? 'text-yellow-200' : 'text-yellow-200'}`}>
                      Allocation Points: {validation.allocationPoints}/{validation.maxPoints} <InfoTooltip content="Reserved and Limited items cost 1 point each. Unlimited items cost 0. You can spend up to 3 points per bracket." iconSize={12} />
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
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => toggleErrorExpanded(bracketName)}
                      className="flex items-center gap-2"
                    >
                      <span className="whitespace-nowrap">
                        {validation.violations.length} {validation.violations.length === 1 ? 'Error' : 'Errors'}
                      </span>
                      <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                    </Button>
                    {isExpanded && (
                      <Alert variant="destructive" className="max-w-md px-3 py-2">
                        <AlertDescription>
                          <ul className="space-y-1 text-sm text-foreground">
                            {validation.violations.map((violation, idx) => (
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
                ) : null
              })()}
            </div>
          </div>
          <div className="overflow-x-auto max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
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
                {bracket3.map(rank => (
                  <RankRow
                    key={rank}
                    rank={rank}
                    lootItems={bracket14Items}
                    selectedItemId1={rankings[`${rank}-1`]}
                    selectedItemId2={rankings[`${rank}-2`]}
                    selectedItems={bracket14DisabledItems}
                    duplicateItems={duplicateItems}
                    onItemSelect={handleItemSelect}
                    slot1Errors={getSlotErrors(rank, 1)}
                    slot2Errors={getSlotErrors(rank, 2)}
                    ownedWowheadIds={equippedWowheadIds}
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
                <h2 className="text-[15px] font-semibold text-foreground inline-flex items-center gap-1.5">Bracket 4 (41-39) <InfoTooltip content="Fourth priority tier. Same allocation point rules as Brackets 1-3." /></h2>
                {(() => {
                  const validation = getBracketValidation('Bracket 4 (41-39)')
                  return validation ? (
                    <p className={`text-[12px] font-medium mt-1 ${validation.violations.length > 0 ? 'text-amber-200' : 'text-amber-200'}`}>
                      Allocation Points: {validation.allocationPoints}/{validation.maxPoints} <InfoTooltip content="Reserved and Limited items cost 1 point each. Unlimited items cost 0. You can spend up to 3 points per bracket." iconSize={12} />
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
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => toggleErrorExpanded(bracketName)}
                      className="flex items-center gap-2"
                    >
                      <span className="whitespace-nowrap">
                        {validation.violations.length} {validation.violations.length === 1 ? 'Error' : 'Errors'}
                      </span>
                      <span className="text-xs">{isExpanded ? '▼' : '▶'}</span>
                    </Button>
                    {isExpanded && (
                      <Alert variant="destructive" className="max-w-md px-3 py-2">
                        <AlertDescription>
                          <ul className="space-y-1 text-sm text-foreground">
                            {validation.violations.map((violation, idx) => (
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
                ) : null
              })()}
            </div>
          </div>
          <div className="overflow-x-auto max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
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
                {bracket4.map(rank => (
                  <RankRow
                    key={rank}
                    rank={rank}
                    lootItems={bracket14Items}
                    selectedItemId1={rankings[`${rank}-1`]}
                    selectedItemId2={rankings[`${rank}-2`]}
                    selectedItems={bracket14DisabledItems}
                    duplicateItems={duplicateItems}
                    onItemSelect={handleItemSelect}
                    slot1Errors={getSlotErrors(rank, 1)}
                    slot2Errors={getSlotErrors(rank, 2)}
                    ownedWowheadIds={equippedWowheadIds}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* No Bracket (38-25) - Main-spec */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-green-500/10 border-l-4 border-l-green-800/60 px-4 py-2">
            <h2 className="text-[15px] font-semibold text-foreground inline-flex items-center gap-1.5">No bracket (38-25) - Main-spec <InfoTooltip content="Standard priority list with no allocation point limits. Items here are still main-spec priority." /></h2>
            <p className="text-green-200 text-[12px]">Still considered main-spec priority</p>
          </div>
          <div className="overflow-x-auto max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
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
                {noBracket.map(rank => (
                  <RankRow
                    key={rank}
                    rank={rank}
                    lootItems={noBracketItems}
                    selectedItemId1={rankings[`${rank}-1`]}
                    selectedItemId2={rankings[`${rank}-2`]}
                    selectedItems={noBracketDisabledItems}
                    duplicateItems={duplicateItems}
                    onItemSelect={handleItemSelect}
                    ownedWowheadIds={equippedWowheadIds}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Off-spec (24-1) */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-blue-500/10 border-l-4 border-l-blue-800/60 px-4 py-2">
            <h2 className="text-[15px] font-semibold text-foreground inline-flex items-center gap-1.5">Off-spec (24-1) <InfoTooltip content="Items for your secondary spec or role. Lower priority than main-spec but helps with guild flexibility." /></h2>
            <p className="text-blue-200 text-[12px]">Off-spec items to support guild flexibility</p>
          </div>
          <div className="overflow-x-auto max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
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
                {offSpec.map(rank => (
                  <RankRow
                    key={rank}
                    rank={rank}
                    lootItems={offSpecItems}
                    selectedItemId1={rankings[`${rank}-1`]}
                    selectedItemId2={rankings[`${rank}-2`]}
                    selectedItems={offSpecDisabledItems}
                    duplicateItems={duplicateItems}
                    onItemSelect={handleItemSelect}
                    ownedWowheadIds={equippedWowheadIds}
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
