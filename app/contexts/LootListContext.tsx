'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useGuildContext } from './GuildContext'
import { useNotification } from './NotificationContext'
import {
  useRaidTiers,
  usePhaseLootItems,
  usePhaseSubmission,
  usePhaseSubmissionStatuses,
  useCharacterGear,
  invalidatePhaseSubmissionStatuses,
  invalidateCharacterGear,
  type LootItem,
  type PhaseLootItem,
  type LootSubmission,
  type RaidTier,
  type EquippedItem
} from '@/app/hooks/use-api'
import { refreshWowheadTooltips } from '@/lib/wowhead'
import { preloadItemIcons } from '@/data/item-icons'

// Define raid tier progression order (Classic + TBC + WotLK)
const RAID_TIER_ORDER: Record<string, number> = {
  // Classic
  'Molten Core': 1, 'MC': 1,
  "Onyxia's Lair": 2, 'Onyxia': 2,
  'Blackwing Lair': 3, 'BWL': 3,
  "Zul'Gurub": 4, 'ZG': 4,
  "Ruins of Ahn'Qiraj": 5, 'AQ20': 5,
  "Temple of Ahn'Qiraj": 6, 'AQ40': 6,
  'Naxxramas': 7, 'Naxx': 7,
  // TBC
  'Karazhan': 10, 'Kara': 10,
  "Gruul's Lair": 11, 'Gruul': 11,
  "Magtheridon's Lair": 12, 'Magtheridon': 12, 'Mag': 12,
  'Serpentshrine Cavern': 20, 'SSC': 20,
  'Tempest Keep: The Eye': 21, 'Tempest Keep': 21, 'The Eye': 21, 'TK': 21,
  'Hyjal Summit': 30, 'Mount Hyjal': 30, 'Hyjal': 30,
  'Black Temple': 31, 'BT': 31,
  "Zul'Aman": 32, 'ZA': 32,
  'Sunwell Plateau': 33, 'Sunwell': 33, 'SWP': 33,
  // WotLK
  'Vault of Archavon': 40, 'VoA': 40,
  'Obsidian Sanctum': 41, 'OS': 41,
  'Eye of Eternity': 42, 'EoE': 42,
  'Naxxramas (10)': 43, 'Naxxramas (25)': 44,
  'Ulduar': 50,
  'Trial of the Crusader': 60, 'ToC': 60,
  'Trial of the Grand Crusader': 61, 'ToGC': 61,
  "Onyxia's Lair (10)": 62, "Onyxia's Lair (25)": 63,
  'Icecrown Citadel': 70, 'ICC': 70,
  'Ruby Sanctum': 80, 'RS': 80
}

function getRaidTierOrder(tierName: string): number {
  return RAID_TIER_ORDER[tierName] || 999
}

interface BisImportResult {
  success: boolean
  importedCount: number
  error?: string
  code?: string
}

// Separate interface for data (changes frequently, triggers re-renders)
interface LootListDataContextType {
  // Data
  lootItems: PhaseLootItem[]
  submission: LootSubmission | null
  rankings: Record<string, string>
  raidTiers: RaidTier[]
  phaseTiers: RaidTier[] // Tiers within the current phase (for grouping items by raid)
  phases: number[] // Available phases for the expansion
  phaseSubmissionStatuses: Record<number, { status: string; submitted_at: string | null }>
  selectedPhase: number | null
  phaseDeadline: string | null
  enforceSlotRestrictions: boolean
  equippedItems: EquippedItem[]
  equippedWowheadIds: Set<number>

  // Loading states
  isLoading: boolean
  isContentLoading: boolean
  isSaving: boolean
  isImportingBis: boolean
  isGearLoading: boolean

  // Computed
  hasChanges: boolean
  initialRankings: Record<string, string>
  originalStatus: string | null
}

// Separate interface for actions (stable functions, rarely trigger re-renders)
interface LootListActionsContextType {
  setSelectedPhase: (phase: number) => void
  handleItemSelect: (rank: number, slot: number, itemId: string) => void
  clearAllRankings: () => void
  saveSubmission: (submit: boolean) => Promise<void>
  refreshData: () => void
  importBisItems: () => Promise<BisImportResult>
  refreshGear: () => void
}

// Combined type for backward compatibility
interface LootListContextType extends LootListDataContextType, LootListActionsContextType {}

// Create separate contexts for data and actions
// This prevents components that only use actions from re-rendering when data changes
const LootListDataContext = createContext<LootListDataContextType | null>(null)
const LootListActionsContext = createContext<LootListActionsContextType | null>(null)

export function LootListProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const { showNotification } = useNotification()
  const {
    activeGuild,
    activeCharacter,
    loading: guildLoading,
    currentExpansion,
    viewingExpansionId
  } = useGuildContext()

  // Local state
  const [selectedPhase, setSelectedPhaseState] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const phaseParam = params.get('phase')
      return phaseParam ? parseInt(phaseParam) : null
    }
    return null
  })
  const [rankings, setRankings] = useState<Record<string, string>>({})
  const [initialRankings, setInitialRankings] = useState<Record<string, string>>({})
  const [originalStatus, setOriginalStatus] = useState<string | null>(null)
  const [enforceSlotRestrictions, setEnforceSlotRestrictions] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isImportingBis, setIsImportingBis] = useState(false)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)
  const [expansionPhaseDeadlines, setExpansionPhaseDeadlines] = useState<Record<string, string | null>>({})

  // Refs for stable callbacks and preventing save loops
  // Using refs instead of state for autosave tracking to prevent re-renders that close dropdowns
  const rankingsRef = useRef(rankings)
  const initialRankingsRef = useRef(initialRankings)
  const savingInProgressRef = useRef(false)
  const lastSavedRankingsRef = useRef<Record<string, string> | null>(null) // Last saved rankings object (for value comparison)
  const submissionDataRef = useRef<{ submission: LootSubmission | null; rankings: Record<string, string> } | null>(null)
  const lastSavedRef = useRef<Date | null>(null)
  const localChangesRef = useRef(false) // Track if user made local changes - prevents sync effect from overwriting

  // Helper to compare rankings objects by value (key-order independent)
  const rankingsEqual = (a: Record<string, string>, b: Record<string, string>): boolean => {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false
    return keysA.every(key => a[key] === b[key])
  }

  // Keep refs in sync
  useEffect(() => {
    rankingsRef.current = rankings
  }, [rankings])

  useEffect(() => {
    initialRankingsRef.current = initialRankings
  }, [initialRankings])

  // Get expansion ID
  const targetExpansionId = viewingExpansionId || currentExpansion?.expansion_id

  // SWR hooks for data fetching
  const { data: tiersData, isLoading: tiersLoading } = useRaidTiers(
    targetExpansionId || null,
    activeGuild?.id || null
  )

  // Sort tiers by raid progression order
  const sortedTiers = useMemo(() => {
    if (!tiersData?.tiers) return []
    return [...tiersData.tiers].sort((a, b) => getRaidTierOrder(a.name) - getRaidTierOrder(b.name))
  }, [tiersData?.tiers])

  // Get unique phases from tiers (sorted)
  const phases = useMemo(() => {
    const phaseSet = new Set<number>()
    sortedTiers.forEach(t => {
      if (t.phase !== undefined && t.phase !== null) {
        phaseSet.add(t.phase)
      }
    })
    return Array.from(phaseSet).sort((a, b) => a - b)
  }, [sortedTiers])

  // Get tiers within the selected phase (for grouping items by raid)
  const phaseTiers = useMemo(() => {
    if (selectedPhase === null) return []
    return sortedTiers.filter(t => t.phase === selectedPhase)
  }, [sortedTiers, selectedPhase])

  // Fetch phase submission statuses
  const { data: statusesData } = usePhaseSubmissionStatuses(
    activeCharacter?.id || null,
    activeGuild?.id || null,
    targetExpansionId || null
  )

  // Fetch loot items for the selected phase
  const { data: itemsData, isLoading: itemsLoading } = usePhaseLootItems(
    targetExpansionId || null,
    selectedPhase,
    activeCharacter?.id || null,
    activeGuild?.id || null
  )

  // Fetch submission for the selected phase
  const { data: submissionData, isLoading: submissionLoading, mutate: mutateSubmission } = usePhaseSubmission(
    activeCharacter?.id || null,
    targetExpansionId || null,
    selectedPhase,
    activeGuild?.id || null
  )

  // Fetch equipped items for the character (from WowSims import)
  const { data: gearData, isLoading: gearLoading, mutate: mutateGear } = useCharacterGear(
    activeCharacter?.id || null
  )

  // Create a Set of wowhead IDs for quick lookup (includes both WowSims imports and loot history awards)
  const equippedWowheadIds = useMemo(() => {
    const ids = new Set<number>()
    // Add items from WowSims import
    if (gearData?.items) {
      for (const item of gearData.items) {
        ids.add(item.wowhead_id)
      }
    }
    // Add items from loot history (raid tracking awards)
    if (gearData?.awarded_items) {
      for (const item of gearData.awarded_items) {
        ids.add(item.wowhead_id)
      }
    }
    return ids
  }, [gearData?.items, gearData?.awarded_items])

  // Keep submissionDataRef in sync (must be after submissionData is declared)
  useEffect(() => {
    submissionDataRef.current = submissionData || null
  }, [submissionData])

  // Set initial phase from URL or first available
  useEffect(() => {
    if (guildLoading || phases.length === 0) return

    const phaseFromUrl = searchParams.get('phase')
    const parsedPhase = phaseFromUrl ? parseInt(phaseFromUrl) : null

    if (parsedPhase !== null && phases.includes(parsedPhase)) {
      if (selectedPhase !== parsedPhase) {
        setSelectedPhaseState(parsedPhase)
      }
    } else if (selectedPhase === null || !phases.includes(selectedPhase)) {
      // Default to first available phase
      const defaultPhase = phases[0]
      setSelectedPhaseState(defaultPhase)
      const params = new URLSearchParams(searchParams.toString())
      params.set('phase', defaultPhase.toString())
      router.replace(`?${params.toString()}`, { scroll: false })
    }
  }, [guildLoading, phases, searchParams, selectedPhase, router])

  // Load guild settings for slot restrictions
  useEffect(() => {
    if (!activeGuild?.id) return

    const loadSettings = async () => {
      const { data } = await supabase
        .from('guild_settings')
        .select('enforce_slot_restrictions')
        .eq('guild_id', activeGuild.id)
        .single()
      setEnforceSlotRestrictions(data?.enforce_slot_restrictions ?? true)
    }
    loadSettings()
  }, [activeGuild?.id, supabase])

  // Load phase deadlines from expansion
  useEffect(() => {
    if (!targetExpansionId) {
      setExpansionPhaseDeadlines({})
      return
    }

    const loadPhaseDeadlines = async () => {
      const { data } = await supabase
        .from('expansions')
        .select('phase_deadlines')
        .eq('id', targetExpansionId)
        .single()

      if (data?.phase_deadlines) {
        setExpansionPhaseDeadlines(data.phase_deadlines as Record<string, string | null>)
      } else {
        setExpansionPhaseDeadlines({})
      }
    }
    loadPhaseDeadlines()
  }, [targetExpansionId, supabase])

  // Sync rankings from submission data
  // Only overwrite local rankings on initial load or tier switch, not after our own saves
  useEffect(() => {
    // Don't sync while we're actively saving - prevents race conditions
    if (savingInProgressRef.current) {
      return
    }

    // Don't overwrite local changes the user made - they take priority
    if (localChangesRef.current) {
      // Just update metadata if we have submission data
      if (submissionData) {
        setOriginalStatus(submissionData.submission?.status || null)
        setInitialLoadComplete(true)
      }
      return
    }

    if (submissionData) {
      const serverRankings = submissionData.rankings || {}

      // Check if server data matches what we just saved (avoid overwriting local state)
      if (lastSavedRankingsRef.current && rankingsEqual(lastSavedRankingsRef.current, serverRankings)) {
        // Server confirmed our save, just update metadata but keep local rankings
        setOriginalStatus(submissionData.submission?.status || null)
        setInitialLoadComplete(true)
        return
      }

      // Initial load or tier switch - sync everything
      setRankings(serverRankings)
      setInitialRankings(serverRankings)
      setOriginalStatus(submissionData.submission?.status || null)
      setInitialLoadComplete(true)
      // Reset saved ref since we're loading fresh data
      lastSavedRankingsRef.current = null
    } else if (submissionData === null) {
      setRankings({})
      setInitialRankings({})
      setOriginalStatus(null)
      setInitialLoadComplete(true)
      lastSavedRankingsRef.current = null
    }
  }, [submissionData])

  // Preload icons and refresh Wowhead tooltips when items load
  useEffect(() => {
    if (!itemsLoading && itemsData?.items?.length) {
      // Preload all item icons so they're cached before user interacts
      const wowheadIds = itemsData.items.map(item => item.wowhead_id)
      preloadItemIcons(wowheadIds)
      refreshWowheadTooltips(true)
    }
  }, [itemsLoading, itemsData?.items])

  // Helper to change phase and update URL
  const setSelectedPhase = useCallback((phase: number) => {
    setSelectedPhaseState(phase)
    setInitialLoadComplete(false)
    // Reset local changes flag so fresh data loads for new phase
    localChangesRef.current = false
    lastSavedRankingsRef.current = null
    const params = new URLSearchParams(searchParams.toString())
    params.set('phase', phase.toString())
    window.history.replaceState(null, '', `?${params.toString()}`)
  }, [searchParams])

  // Handle item selection
  const handleItemSelect = useCallback((rank: number, slot: number, itemId: string) => {
    // Mark that user made local changes - prevents sync effect from overwriting
    localChangesRef.current = true

    const key = `${rank}-${slot}`
    if (itemId === '') {
      setRankings(prev => {
        const newRankings = { ...prev }
        delete newRankings[key]
        return newRankings
      })
    } else {
      setRankings(prev => ({ ...prev, [key]: itemId }))
    }
  }, [])

  // Clear all rankings
  const clearAllRankings = useCallback(() => {
    localChangesRef.current = true
    setRankings({})
  }, [])

  // Import BIS items into rankings
  const importBisItems = useCallback(async (): Promise<BisImportResult> => {
    if (!activeCharacter || selectedPhase === null || !targetExpansionId || !activeGuild?.id) {
      return { success: false, importedCount: 0, error: 'No character or phase selected' }
    }

    setIsImportingBis(true)

    try {
      // Fetch BIS items for all tiers in the phase
      const response = await fetch(
        `/api/bis-items?expansion_id=${targetExpansionId}&phase=${selectedPhase}&character_id=${activeCharacter.id}&guild_id=${activeGuild.id}`
      )
      const data = await response.json()

      if (!response.ok) {
        return {
          success: false,
          importedCount: 0,
          error: data.error || 'Failed to fetch BIS items',
          code: data.code
        }
      }

      if (!data.items || data.items.length === 0) {
        return {
          success: false,
          importedCount: 0,
          error: 'No BIS items found for your spec in this raid',
          code: 'NO_ITEMS'
        }
      }

      // Build maps of valid item IDs for this tier
      const validItems = new Map<string, number>() // id -> wowhead_id
      const itemClassifications = new Map<string, string | undefined>() // id -> classification
      for (const item of (itemsData?.items || [])) {
        validItems.set(item.id, item.wowhead_id)
        itemClassifications.set(item.id, item.classification)
      }

      // Sort BIS items by priority (BIS first, then alt)
      const sortedBisItems = [...data.items].sort((a: any, b: any) => {
        if (a.priority !== b.priority) {
          return a.priority === 'bis' ? -1 : 1
        }
        return 0
      })

      // Fill both columns starting from rank 50 (top/highest priority)
      // Pattern: rank 50 slot 1, rank 50 slot 2, rank 49 slot 1, rank 49 slot 2, etc.
      // Skip items that the user already owns (based on equipped gear from WowSims import)
      // Reserved items must be alone at their rank (no companion item)
      const newRankings: Record<string, string> = {}
      let rank = 50
      let slot = 1
      let importedCount = 0
      let skippedOwned = 0

      for (const bisItem of sortedBisItems) {
        // Skip if item not available in this tier
        const wowheadId = validItems.get(bisItem.loot_item_id)
        if (wowheadId === undefined) continue

        // Skip items the user already owns (imported from WowSims)
        if (equippedWowheadIds.has(wowheadId)) {
          skippedOwned++
          continue
        }

        // Stop if we've filled all ranks down to 1
        if (rank < 1) break

        const classification = itemClassifications.get(bisItem.loot_item_id)
        const isReserved = classification === 'Reserved'

        // Reserved items must be alone at their rank
        if (isReserved) {
          // If we're at slot 2, move to slot 1 of next rank
          if (slot === 2) {
            slot = 1
            rank--
          }
          if (rank < 1) break

          // Place Reserved item in slot 1
          newRankings[`${rank}-1`] = bisItem.loot_item_id
          importedCount++

          // Move to next rank (Reserved items get their own rank)
          rank--
          slot = 1
        } else {
          // Normal item placement
          newRankings[`${rank}-${slot}`] = bisItem.loot_item_id
          importedCount++

          // Move to next slot: 1 -> 2, then 2 -> 1 (next rank down)
          if (slot === 1) {
            slot = 2
          } else {
            slot = 1
            rank--
          }
        }
      }

      // Mark that user made local changes
      localChangesRef.current = true

      // Set the new rankings
      setRankings(newRankings)

      return { success: true, importedCount }
    } catch (error) {
      console.error('Error importing BIS items:', error)
      return {
        success: false,
        importedCount: 0,
        error: error instanceof Error ? error.message : 'Failed to import BIS items'
      }
    } finally {
      setIsImportingBis(false)
    }
  }, [activeCharacter, selectedPhase, targetExpansionId, activeGuild?.id, itemsData?.items, equippedWowheadIds])

  // Check for changes
  const hasChanges = useMemo(() => {
    const currentKeys = Object.keys(rankings).sort()
    const initialKeys = Object.keys(initialRankings).sort()
    if (currentKeys.length !== initialKeys.length) return true
    return currentKeys.some(key => rankings[key] !== initialRankings[key])
  }, [rankings, initialRankings])

  // Auto-save function - uses refs to avoid dependency cycles
  const doAutoSave = useCallback(async () => {
    if (!activeCharacter || selectedPhase === null || !targetExpansionId || !activeGuild?.id) return
    if (savingInProgressRef.current) return

    // Enforce minimum 2 second interval between saves
    const now = Date.now()
    if (lastSavedRef.current && (now - lastSavedRef.current.getTime()) < 2000) {
      return
    }

    const currentRankings = rankingsRef.current

    // Skip if we already saved this exact state (use value comparison, not JSON)
    if (lastSavedRankingsRef.current && rankingsEqual(lastSavedRankingsRef.current, currentRankings)) {
      return
    }

    // Check if there are actual changes from initial
    const initial = initialRankingsRef.current
    if (rankingsEqual(initial, currentRankings)) {
      return
    }

    savingInProgressRef.current = true

    // Get current submission data from ref
    const currentSubmissionData = submissionDataRef.current

    // Determine target status
    let targetStatus = currentSubmissionData?.submission?.status || 'draft'
    if (['approved', 'pending'].includes(targetStatus)) {
      targetStatus = 'draft'
    }

    try {
      // Verify membership
      const { data: membership, error: membershipError } = await supabase
        .from('character_guild_memberships')
        .select('id, is_active')
        .eq('character_id', activeCharacter.id)
        .eq('guild_id', activeGuild.id)
        .maybeSingle()

      if (membershipError || !membership?.is_active) {
        showNotification('error', 'Your character needs to rejoin this guild.')
        return
      }

      let submissionId = currentSubmissionData?.submission?.id

      // Use upsert to handle race conditions and unique constraint
      console.log('[doAutoSave] Upserting submission:', {
        character_id: activeCharacter.id,
        guild_id: activeGuild.id,
        expansion_id: targetExpansionId,
        phase: selectedPhase,
        status: targetStatus,
        existingId: submissionId
      })

      const { data: upsertedSub, error: subError } = await supabase
        .from('loot_submissions')
        .upsert({
          ...(submissionId ? { id: submissionId } : {}),
          character_id: activeCharacter.id,
          guild_id: activeGuild.id,
          expansion_id: targetExpansionId,
          phase: selectedPhase,
          status: targetStatus,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'character_id,guild_id,expansion_id,phase'
        })
        .select()
        .single()

      if (subError) {
        console.error('[doAutoSave] Failed to upsert submission:', subError)
        throw new Error(subError.message)
      }
      console.log('[doAutoSave] Upserted submission:', upsertedSub.id)
      submissionId = upsertedSub.id

      // Delete existing rankings
      console.log('[doAutoSave] Deleting existing items for submission:', submissionId)
      const { error: deleteError, count: deleteCount } = await supabase
        .from('loot_submission_items')
        .delete()
        .eq('submission_id', submissionId)

      if (deleteError) {
        console.error('[doAutoSave] Failed to delete items:', deleteError)
        throw new Error(`Failed to delete items: ${deleteError.message}`)
      }
      console.log('[doAutoSave] Deleted items, rows affected:', deleteCount)

      // Insert new rankings
      const rankingsToInsert = Object.entries(currentRankings).map(([key, loot_item_id]) => {
        const [rankStr, slotStr] = key.split('-')
        return {
          submission_id: submissionId,
          loot_item_id,
          rank: parseInt(rankStr),
          slot: parseInt(slotStr)
        }
      })

      if (rankingsToInsert.length > 0) {
        console.log('[doAutoSave] Upserting items:', rankingsToInsert.length, 'for submission:', submissionId)
        const { data: upsertedItems, error: itemsError } = await supabase
          .from('loot_submission_items')
          .upsert(rankingsToInsert, { onConflict: 'submission_id,rank,slot', ignoreDuplicates: false })
          .select()

        if (itemsError) {
          console.error('[doAutoSave] Failed to upsert items:', itemsError)
          throw new Error(itemsError.message)
        }
        console.log('[doAutoSave] Items upserted:', upsertedItems?.length)

        // Verify items were actually saved
        const { data: verifyItems, error: verifyError } = await supabase
          .from('loot_submission_items')
          .select('id, submission_id, rank, slot')
          .eq('submission_id', submissionId)

        console.log('[doAutoSave] Verification:', {
          requestedCount: rankingsToInsert.length,
          upsertedCount: upsertedItems?.length,
          verifiedCount: verifyItems?.length,
          verifyError
        })
      }

      // Mark this state as saved (store object copy for value comparison)
      lastSavedRankingsRef.current = { ...currentRankings }
      initialRankingsRef.current = currentRankings
      lastSavedRef.current = new Date()

      // Clear local changes flag - save is complete
      localChangesRef.current = false

      // Update local state to match saved state (without triggering SWR refetch)
      setInitialRankings({ ...currentRankings })
    } catch (error) {
      console.error('Auto-save failed:', error)
      showNotification('error', error instanceof Error ? error.message : 'Auto-save failed')
    } finally {
      savingInProgressRef.current = false
    }
  }, [activeCharacter, selectedPhase, targetExpansionId, activeGuild?.id, supabase, showNotification])

  // Keep autoSave ref up to date
  const autoSaveRef = useRef(doAutoSave)
  useEffect(() => {
    autoSaveRef.current = doAutoSave
  }, [doAutoSave])

  // Auto-save when rankings change (debounced)
  // Uses ref to avoid re-triggering when callback is recreated
  useEffect(() => {
    if (!activeCharacter || selectedPhase === null || !targetExpansionId || !activeGuild?.id || !initialLoadComplete) {
      console.log('[autoSave effect] Skipping - missing required data:', {
        hasCharacter: !!activeCharacter,
        selectedPhase,
        targetExpansionId,
        hasGuild: !!activeGuild?.id,
        initialLoadComplete
      })
      return
    }

    // Skip if rankings match what we last saved (no new changes)
    const lastSaved = lastSavedRankingsRef.current
    if (lastSaved) {
      const currentKeys = Object.keys(rankings)
      const savedKeys = Object.keys(lastSaved)
      const matchesLastSaved = currentKeys.length === savedKeys.length &&
          currentKeys.every(key => rankings[key] === lastSaved[key])
      if (matchesLastSaved) {
        console.log('[autoSave effect] Skipping - matches last saved')
        return
      }
    }

    // Also skip if rankings match initial state (nothing to save)
    const initial = initialRankingsRef.current
    const currentKeys = Object.keys(rankings)
    const initialKeys = Object.keys(initial)
    const matchesInitial = currentKeys.length === initialKeys.length &&
        currentKeys.every(key => rankings[key] === initial[key])
    if (matchesInitial) {
      console.log('[autoSave effect] Skipping - matches initial state')
      return
    }

    console.log('[autoSave effect] Changes detected, starting 1s debounce timer')
    const timer = setTimeout(() => {
      console.log('[autoSave effect] Timer fired, calling doAutoSave')
      autoSaveRef.current()
    }, 1000) // 1 second debounce

    return () => {
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankings, activeCharacter?.id, selectedPhase, targetExpansionId, activeGuild?.id, initialLoadComplete])

  // Save submission (manual save/submit)
  const saveSubmission = useCallback(async (submit: boolean) => {
    if (!activeCharacter || selectedPhase === null || !targetExpansionId || !activeGuild?.id) return

    setIsSaving(true)

    try {
      let submissionId = submissionData?.submission?.id

      // Use upsert to handle race conditions and unique constraint
      const newStatus = submit ? 'pending' : 'draft'
      console.log('[saveSubmission] Upserting submission:', {
        character_id: activeCharacter.id,
        guild_id: activeGuild.id,
        expansion_id: targetExpansionId,
        phase: selectedPhase,
        status: newStatus,
        existingId: submissionId
      })

      const { data: upsertedSub, error: subError } = await supabase
        .from('loot_submissions')
        .upsert({
          ...(submissionId ? { id: submissionId } : {}),
          character_id: activeCharacter.id,
          guild_id: activeGuild.id,
          expansion_id: targetExpansionId,
          phase: selectedPhase,
          status: newStatus,
          submitted_at: submit ? new Date().toISOString() : (submissionData?.submission?.submitted_at || null),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'character_id,guild_id,expansion_id,phase'
        })
        .select()
        .single()

      if (subError) {
        console.error('[saveSubmission] Failed to upsert submission:', subError)
        throw subError
      }
      console.log('[saveSubmission] Upserted submission:', upsertedSub.id)
      submissionId = upsertedSub.id

      // Delete and re-insert rankings
      console.log('[saveSubmission] Deleting existing items for submission:', submissionId)
      const { error: deleteError } = await supabase
        .from('loot_submission_items')
        .delete()
        .eq('submission_id', submissionId)

      if (deleteError) {
        console.error('[saveSubmission] Failed to delete items:', deleteError)
        throw new Error(`Failed to delete items: ${deleteError.message}`)
      }

      const rankingsToInsert = Object.entries(rankings).map(([key, loot_item_id]) => {
        const [rankStr, slotStr] = key.split('-')
        return {
          submission_id: submissionId,
          loot_item_id,
          rank: parseInt(rankStr),
          slot: parseInt(slotStr)
        }
      })

      if (rankingsToInsert.length > 0) {
        console.log('[saveSubmission] Inserting items:', rankingsToInsert.length, 'for submission:', submissionId)
        const { data: insertedItems, error: itemsError } = await supabase
          .from('loot_submission_items')
          .insert(rankingsToInsert)
          .select()

        if (itemsError) {
          console.error('[saveSubmission] Failed to insert items:', itemsError)
          throw itemsError
        }
        console.log('[saveSubmission] Items inserted successfully:', insertedItems?.length)

        // Verify items were actually saved by querying them back
        const { data: verifyItems, error: verifyError } = await supabase
          .from('loot_submission_items')
          .select('id, submission_id, rank, slot, loot_item_id')
          .eq('submission_id', submissionId)

        console.log('[saveSubmission] Verification query:', {
          requestedCount: rankingsToInsert.length,
          insertedCount: insertedItems?.length,
          verifiedCount: verifyItems?.length,
          verifyError
        })

        if (verifyItems && verifyItems.length !== rankingsToInsert.length) {
          console.warn('[saveSubmission] Item count mismatch! Some items may not have been saved.')
        }
      }

      showNotification('success', submit ? 'Loot list submitted for review' : 'Draft saved')

      // Update initial state to reflect saved state
      setInitialRankings({ ...rankings })
      setOriginalStatus(submit ? 'pending' : 'draft')

      // Store what we saved so the sync effect doesn't overwrite local state
      lastSavedRankingsRef.current = { ...rankings }
      lastSavedRef.current = new Date()
      localChangesRef.current = false

      // Invalidate phase statuses (for the tab badges)
      if (activeCharacter && activeGuild && targetExpansionId) {
        invalidatePhaseSubmissionStatuses(activeCharacter.id, activeGuild.id, targetExpansionId)
      }
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Couldn\'t save. Try again.')
    }

    setIsSaving(false)
  }, [activeCharacter, selectedPhase, targetExpansionId, activeGuild, rankings, submissionData, supabase, showNotification])

  // Refresh data - clears local changes to allow fresh data to load
  const refreshData = useCallback(() => {
    localChangesRef.current = false
    lastSavedRankingsRef.current = null
    mutateSubmission()
  }, [mutateSubmission])

  // Refresh character gear data
  const refreshGear = useCallback(() => {
    if (activeCharacter?.id) {
      invalidateCharacterGear(activeCharacter.id)
      mutateGear()
    }
  }, [activeCharacter?.id, mutateGear])

  // Get phase deadline - prefer expansion's phase_deadlines, fall back to tier deadline
  const phaseDeadline = useMemo(() => {
    if (selectedPhase === null) return null
    // First check expansion's phase_deadlines
    const phaseKey = selectedPhase.toString()
    if (expansionPhaseDeadlines[phaseKey]) {
      return expansionPhaseDeadlines[phaseKey]
    }
    // Fall back to deadline from the first tier in the phase
    const tier = phaseTiers[0]
    return tier?.submission_deadline || null
  }, [selectedPhase, expansionPhaseDeadlines, phaseTiers])

  // Loading states
  const isLoading = guildLoading || tiersLoading
  const isContentLoading = itemsLoading || submissionLoading

  // Filter loot items to only include those from active tiers
  // This is a client-side safety filter in case the API cache is stale
  const filteredLootItems = useMemo(() => {
    const items = itemsData?.items || []
    if (items.length === 0) return items

    // Get IDs of active tiers in the current phase
    const activeTierIds = new Set(
      phaseTiers
        .filter(t => t.is_guild_active !== false)
        .map(t => t.id)
    )

    // If no active tiers info, return all items (fallback)
    if (activeTierIds.size === 0 && phaseTiers.length > 0) {
      return items
    }

    // Filter items to only those from active tiers
    return items.filter(item => activeTierIds.has(item.raid_tier_id))
  }, [itemsData?.items, phaseTiers])

  // Memoize data value to prevent unnecessary re-renders
  // This object changes when data state changes
  const dataValue = useMemo<LootListDataContextType>(() => ({
    lootItems: filteredLootItems,
    submission: submissionData?.submission || null,
    rankings,
    raidTiers: sortedTiers,
    phaseTiers,
    phases,
    phaseSubmissionStatuses: statusesData?.phaseStatuses || {},
    selectedPhase,
    phaseDeadline,
    enforceSlotRestrictions,
    equippedItems: gearData?.items || [],
    equippedWowheadIds,
    isLoading,
    isContentLoading,
    isSaving,
    isImportingBis,
    isGearLoading: gearLoading,
    hasChanges,
    initialRankings,
    originalStatus
  }), [
    filteredLootItems,
    submissionData?.submission,
    rankings,
    sortedTiers,
    phaseTiers,
    phases,
    statusesData?.phaseStatuses,
    selectedPhase,
    phaseDeadline,
    enforceSlotRestrictions,
    gearData?.items,
    equippedWowheadIds,
    isLoading,
    isContentLoading,
    isSaving,
    isImportingBis,
    gearLoading,
    hasChanges,
    initialRankings,
    originalStatus
  ])

  // Memoize actions value - these are stable functions that rarely change
  // Components using only actions won't re-render when data changes
  const actionsValue = useMemo<LootListActionsContextType>(() => ({
    setSelectedPhase,
    handleItemSelect,
    clearAllRankings,
    saveSubmission,
    refreshData,
    importBisItems,
    refreshGear
  }), [
    setSelectedPhase,
    handleItemSelect,
    clearAllRankings,
    saveSubmission,
    refreshData,
    importBisItems,
    refreshGear
  ])

  return (
    <LootListDataContext.Provider value={dataValue}>
      <LootListActionsContext.Provider value={actionsValue}>
        {children}
      </LootListActionsContext.Provider>
    </LootListDataContext.Provider>
  )
}

// Hook for components that only need data (most common use case)
export function useLootListData() {
  const context = useContext(LootListDataContext)
  if (!context) {
    throw new Error('useLootListData must be used within a LootListProvider')
  }
  return context
}

// Hook for components that only need actions (prevents re-renders from data changes)
export function useLootListActions() {
  const context = useContext(LootListActionsContext)
  if (!context) {
    throw new Error('useLootListActions must be used within a LootListProvider')
  }
  return context
}

// Combined hook for backward compatibility
// Components using this will re-render on any context change
export function useLootList(): LootListContextType {
  const data = useLootListData()
  const actions = useLootListActions()
  return { ...data, ...actions }
}

// Re-export types for external use
export type { LootItem, PhaseLootItem }
