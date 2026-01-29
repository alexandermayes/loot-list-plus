'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useGuildContext } from './GuildContext'
import { useNotification } from './NotificationContext'
import {
  useLootItems,
  useRaidTiers,
  useLootSubmission,
  useTierSubmissionStatuses,
  invalidateTierSubmissionStatuses,
  type LootItem,
  type LootSubmission,
  type RaidTier
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

interface LootListContextType {
  // Data
  lootItems: LootItem[]
  submission: LootSubmission | null
  rankings: Record<string, string>
  raidTiers: RaidTier[]
  tierSubmissionStatuses: Record<string, { status: string; submitted_at: string | null }>
  selectedTierId: string | null
  selectedTierDeadline: string | null
  enforceSlotRestrictions: boolean

  // Loading states
  isLoading: boolean
  isContentLoading: boolean
  isSaving: boolean

  // Computed
  hasChanges: boolean
  initialRankings: Record<string, string>
  originalStatus: string | null

  // Actions
  setSelectedTierId: (tierId: string) => void
  handleItemSelect: (rank: number, slot: number, itemId: string) => void
  clearAllRankings: () => void
  saveSubmission: (submit: boolean) => Promise<void>
  refreshData: () => void
}

const LootListContext = createContext<LootListContextType | null>(null)

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
  const [selectedTierId, setSelectedTierIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('tier')
    }
    return null
  })
  const [rankings, setRankings] = useState<Record<string, string>>({})
  const [initialRankings, setInitialRankings] = useState<Record<string, string>>({})
  const [originalStatus, setOriginalStatus] = useState<string | null>(null)
  const [enforceSlotRestrictions, setEnforceSlotRestrictions] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [initialLoadComplete, setInitialLoadComplete] = useState(false)

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

  // Get tier IDs for status fetching
  const tierIds = useMemo(() => sortedTiers.map(t => t.id), [sortedTiers])

  const { data: statusesData } = useTierSubmissionStatuses(
    activeCharacter?.id || null,
    activeGuild?.id || null,
    tierIds
  )

  const { data: itemsData, isLoading: itemsLoading } = useLootItems(
    selectedTierId,
    activeCharacter?.id || null
  )

  const { data: submissionData, isLoading: submissionLoading, mutate: mutateSubmission } = useLootSubmission(
    activeCharacter?.id || null,
    selectedTierId,
    activeGuild?.id || null
  )

  // Keep submissionDataRef in sync (must be after submissionData is declared)
  useEffect(() => {
    submissionDataRef.current = submissionData || null
  }, [submissionData])

  // Set initial tier from URL or first available
  useEffect(() => {
    if (guildLoading || sortedTiers.length === 0) return

    const tierIdFromUrl = searchParams.get('tier')

    if (tierIdFromUrl && sortedTiers.some(t => t.id === tierIdFromUrl)) {
      if (selectedTierId !== tierIdFromUrl) {
        setSelectedTierIdState(tierIdFromUrl)
      }
    } else if (!selectedTierId || !sortedTiers.some(t => t.id === selectedTierId)) {
      const defaultTier = sortedTiers.find(t => t.is_active) || sortedTiers[0]
      setSelectedTierIdState(defaultTier.id)
      const params = new URLSearchParams(searchParams.toString())
      params.set('tier', defaultTier.id)
      router.replace(`?${params.toString()}`, { scroll: false })
    }
  }, [guildLoading, sortedTiers, searchParams, selectedTierId, router])

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

  // Helper to change tier and update URL
  const setSelectedTierId = useCallback((tierId: string) => {
    setSelectedTierIdState(tierId)
    setInitialLoadComplete(false)
    // Reset local changes flag so fresh data loads for new tier
    localChangesRef.current = false
    lastSavedRankingsRef.current = null
    const params = new URLSearchParams(searchParams.toString())
    params.set('tier', tierId)
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

  // Check for changes
  const hasChanges = useMemo(() => {
    const currentKeys = Object.keys(rankings).sort()
    const initialKeys = Object.keys(initialRankings).sort()
    if (currentKeys.length !== initialKeys.length) return true
    return currentKeys.some(key => rankings[key] !== initialRankings[key])
  }, [rankings, initialRankings])

  // Auto-save function - uses refs to avoid dependency cycles
  const doAutoSave = useCallback(async () => {
    if (!activeCharacter || !selectedTierId || !activeGuild?.id) return
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

      if (!submissionId) {
        // Create new submission
        const { data: newSub, error: subError } = await supabase
          .from('loot_submissions')
          .insert({
            character_id: activeCharacter.id,
            guild_id: activeGuild.id,
            raid_tier_id: selectedTierId,
            status: targetStatus,
            submitted_at: null
          })
          .select()
          .single()

        if (subError) throw new Error(subError.message)
        submissionId = newSub.id
      } else {
        // Update existing
        const { error: updateError } = await supabase
          .from('loot_submissions')
          .update({ status: targetStatus, updated_at: new Date().toISOString() })
          .eq('id', submissionId)

        if (updateError) throw new Error(updateError.message)
      }

      // Delete existing rankings
      await supabase
        .from('loot_submission_items')
        .delete()
        .eq('submission_id', submissionId)

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
        const { error: itemsError } = await supabase
          .from('loot_submission_items')
          .upsert(rankingsToInsert, { onConflict: 'submission_id,rank,slot', ignoreDuplicates: false })

        if (itemsError) throw new Error(itemsError.message)
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
  }, [activeCharacter, selectedTierId, activeGuild?.id, supabase, showNotification])

  // Keep autoSave ref up to date
  const autoSaveRef = useRef(doAutoSave)
  useEffect(() => {
    autoSaveRef.current = doAutoSave
  }, [doAutoSave])

  // Auto-save when rankings change (debounced)
  // Uses ref to avoid re-triggering when callback is recreated
  useEffect(() => {
    if (!activeCharacter || !selectedTierId || !activeGuild?.id || !initialLoadComplete) {
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
      return
    }

    const timer = setTimeout(() => {
      autoSaveRef.current()
    }, 1000) // 1 second debounce

    return () => {
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankings, activeCharacter?.id, selectedTierId, activeGuild?.id, initialLoadComplete])

  // Save submission (manual save/submit)
  const saveSubmission = useCallback(async (submit: boolean) => {
    if (!activeCharacter || !selectedTierId || !activeGuild?.id) return

    setIsSaving(true)

    try {
      let submissionId = submissionData?.submission?.id

      if (!submissionId) {
        const { data: newSub, error: subError } = await supabase
          .from('loot_submissions')
          .insert({
            character_id: activeCharacter.id,
            guild_id: activeGuild.id,
            raid_tier_id: selectedTierId,
            status: submit ? 'pending' : 'draft',
            submitted_at: submit ? new Date().toISOString() : null
          })
          .select()
          .single()

        if (subError) throw subError
        submissionId = newSub.id
      } else {
        const { error: updateError } = await supabase
          .from('loot_submissions')
          .update({
            status: submit ? 'pending' : 'draft',
            submitted_at: submit ? new Date().toISOString() : submissionData?.submission?.submitted_at,
            updated_at: new Date().toISOString()
          })
          .eq('id', submissionId)

        if (updateError) throw updateError
      }

      // Delete and re-insert rankings
      await supabase
        .from('loot_submission_items')
        .delete()
        .eq('submission_id', submissionId)

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
        const { error: itemsError } = await supabase
          .from('loot_submission_items')
          .insert(rankingsToInsert)

        if (itemsError) throw itemsError
      }

      showNotification('success', submit ? 'Loot list submitted for review' : 'Draft saved')

      // Update initial state to reflect saved state
      setInitialRankings({ ...rankings })
      setOriginalStatus(submit ? 'pending' : 'draft')

      // Store what we saved so the sync effect doesn't overwrite local state
      lastSavedRankingsRef.current = { ...rankings }
      lastSavedRef.current = new Date()
      localChangesRef.current = false

      // Only invalidate tier statuses (for the tab badges) - this is lightweight
      if (activeCharacter && activeGuild && tierIds.length > 0) {
        invalidateTierSubmissionStatuses(activeCharacter.id, activeGuild.id, tierIds)
      }
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Couldn\'t save. Try again.')
    }

    setIsSaving(false)
  }, [activeCharacter, selectedTierId, activeGuild, rankings, submissionData, supabase, showNotification, tierIds])

  // Refresh data - clears local changes to allow fresh data to load
  const refreshData = useCallback(() => {
    localChangesRef.current = false
    lastSavedRankingsRef.current = null
    mutateSubmission()
  }, [mutateSubmission])

  // Get selected tier deadline
  const selectedTierDeadline = useMemo(() => {
    const tier = sortedTiers.find(t => t.id === selectedTierId)
    return tier?.submission_deadline || null
  }, [sortedTiers, selectedTierId])

  // Loading states
  const isLoading = guildLoading || tiersLoading
  const isContentLoading = itemsLoading || submissionLoading

  const value: LootListContextType = {
    // Data
    lootItems: itemsData?.items || [],
    submission: submissionData?.submission || null,
    rankings,
    raidTiers: sortedTiers,
    tierSubmissionStatuses: statusesData?.statuses || {},
    selectedTierId,
    selectedTierDeadline,
    enforceSlotRestrictions,

    // Loading states
    isLoading,
    isContentLoading,
    isSaving,

    // Computed
    hasChanges,
    initialRankings,
    originalStatus,

    // Actions
    setSelectedTierId,
    handleItemSelect,
    clearAllRankings,
    saveSubmission,
    refreshData
  }

  return (
    <LootListContext.Provider value={value}>
      {children}
    </LootListContext.Provider>
  )
}

export function useLootList() {
  const context = useContext(LootListContext)
  if (!context) {
    throw new Error('useLootList must be used within a LootListProvider')
  }
  return context
}

// Re-export types for external use
export type { LootItem }
