'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { mutate as swrMutate } from 'swr'
import { createClient } from '@/utils/supabase/client'
import { useGuildContext } from './GuildContext'
import { useNotification } from './NotificationContext'
import { trackClientEvent } from '@/utils/analytics/client'
import { notifySubmissionChanged } from '@/app/hooks/usePendingSubmissionCount'
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
import { buildSlotCoverageMap, computeUpgradeTier } from '@/domain/loot/slot-normalization'
// preloadItemIcons is lazy-loaded (190KB module) - only imported when items are ready
import {
  createBracketStates,
  findNextValidSlot,
  findNextNoBracketSlot,
  placeInBracket,
  type BracketItem,
  type BracketLimits,
  DEFAULT_MAX_ALLOCATION_POINTS,
  DEFAULT_MAX_TOKENS,
  DEFAULT_MAX_CATEGORY,
} from '@/domain/loot/bracket-validation'
import { resolvePhaseGroups, type PhaseGroup } from '@/domain/expansion/phase-groups'

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
  phaseTiers: RaidTier[] // Tiers within the current phase group (for grouping items by raid)
  phases: number[] // Available phases for the expansion (raw, for backward compat)
  resolvedGroups: PhaseGroup[] // Phase groups (merged or individual)
  phaseSubmissionStatuses: Record<number, { status: string; submitted_at: string | null }>
  selectedPhase: number | null // Canonical phase of the selected group
  phaseDeadline: string | null
  enforceSlotRestrictions: boolean
  bracketLimits: BracketLimits
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
  removedItems: Array<{ loot_item_id: string; rank: number; slot: number }>
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
  removeApprovedItem: (lootItemId: string, itemName: string) => Promise<boolean>
  restoreRemovedItem: (lootItemId: string) => Promise<boolean>
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
  const [bracketLimits, setBracketLimits] = useState<BracketLimits>({
    maxAllocationPoints: DEFAULT_MAX_ALLOCATION_POINTS,
    maxTokens: DEFAULT_MAX_TOKENS,
    maxCategory: DEFAULT_MAX_CATEGORY,
  })
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

  // --- Bootstrap fast path ---
  //
  // On first mount we fetch a single `/api/loot-list/bootstrap` endpoint
  // that returns tiers + items + submission + rankings in one round-trip,
  // collapsing the previous 3-step waterfall (tiers → phase → items →
  // submission). Until this fetch resolves, we gate the individual SWR
  // hooks below with null keys so they don't duplicate the work. Once
  // bootstrap finishes, we mutate the SWR cache with the returned data
  // and flip `bootstrapReady`, which activates the hooks with real keys
  // — they immediately hit cache and return the same data that the
  // bootstrap request just fetched.
  const [bootstrapReady, setBootstrapReady] = useState(false)
  const bootstrapInFlightRef = useRef(false)
  const bootstrapFiredForRef = useRef<string | null>(null)

  useEffect(() => {
    if (guildLoading) return
    if (!targetExpansionId || !activeGuild?.id || !activeCharacter?.id) return

    // Re-fire bootstrap when the guild/character/expansion combo
    // changes — otherwise a guild switch would leave us showing stale
    // cached data for the previous guild.
    const scopeKey = `${targetExpansionId}:${activeGuild.id}:${activeCharacter.id}`
    if (bootstrapFiredForRef.current === scopeKey) return
    if (bootstrapInFlightRef.current) return

    bootstrapInFlightRef.current = true
    bootstrapFiredForRef.current = scopeKey

    const phaseHint = (() => {
      if (typeof window === 'undefined') return ''
      const p = new URLSearchParams(window.location.search).get('phase')
      return p ? `&phase=${encodeURIComponent(p)}` : ''
    })()

    const url = `/api/loot-list/bootstrap?expansion_id=${targetExpansionId}&guild_id=${activeGuild.id}&character_id=${activeCharacter.id}${phaseHint}`

    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Bootstrap failed: ${res.status}`)
        return res.json()
      })
      .then((data: {
        tiers: RaidTier[]
        current_phase: number
        phase_groups: number[][] | null
        selected_phase: number | null
        selected_phases: number[]
        items: PhaseLootItem[]
        submission: LootSubmission | null
        rankings: Record<string, string>
        removedItems: Array<{ loot_item_id: string; rank: number; slot: number }>
      }) => {
        // Seed the SWR cache for each of the three hooks with the shapes
        // they expect. `revalidate: false` prevents SWR from immediately
        // re-fetching the same data we just received.
        const tiersKey = `/api/raid-tiers?expansion_id=${targetExpansionId}&guild_id=${activeGuild.id}`
        swrMutate(
          tiersKey,
          {
            tiers: data.tiers,
            current_phase: data.current_phase,
            phase_groups: data.phase_groups,
          },
          { revalidate: false }
        )

        if (data.selected_phase !== null && data.selected_phases.length > 0) {
          const sortedPhases = [...data.selected_phases].sort((a, b) => a - b)
          const phaseParam = sortedPhases.length === 1
            ? `phase=${sortedPhases[0]}`
            : `phases=${sortedPhases.join(',')}`
          const itemsKey = `/api/loot-items?expansion_id=${targetExpansionId}&${phaseParam}&character_id=${activeCharacter.id}&guild_id=${activeGuild.id}`
          swrMutate(itemsKey, { items: data.items }, { revalidate: false })

          const submissionKey = `/api/loot-submissions?character_id=${activeCharacter.id}&expansion_id=${targetExpansionId}&phase=${data.selected_phase}&guild_id=${activeGuild.id}`
          swrMutate(
            submissionKey,
            {
              submission: data.submission,
              rankings: data.rankings,
              removedItems: data.removedItems,
            },
            { revalidate: false }
          )

          // Adopt the server-resolved phase if the client hasn't already
          // picked one (e.g. first render, no URL hint).
          setSelectedPhaseState((prev) => (prev === null ? data.selected_phase : prev))
        }

        setBootstrapReady(true)
      })
      .catch((err) => {
        // If bootstrap fails, fall back to the individual SWR hooks by
        // flipping the gate. This keeps the page working at the cost of
        // the waterfall we were trying to avoid.
        console.error('Loot list bootstrap failed, falling back to individual hooks:', err)
        setBootstrapReady(true)
      })
      .finally(() => {
        bootstrapInFlightRef.current = false
      })
  }, [guildLoading, targetExpansionId, activeGuild?.id, activeCharacter?.id])

  // SWR hooks for data fetching. The args are gated on `bootstrapReady`
  // so they return null keys on first render — this prevents duplicate
  // fetches alongside the bootstrap request.
  const { data: tiersData, isLoading: tiersLoading } = useRaidTiers(
    bootstrapReady ? (targetExpansionId || null) : null,
    bootstrapReady ? (activeGuild?.id || null) : null
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

  // Resolve phase groups (merged or individual)
  const resolvedGroups = useMemo(() => {
    return resolvePhaseGroups(tiersData?.phase_groups || null, phases)
  }, [tiersData?.phase_groups, phases])

  // Get all phases in the selected group (for multi-phase item loading)
  const selectedPhases = useMemo(() => {
    if (selectedPhase === null) return null
    const group = resolvedGroups.find(g => g.canonicalPhase === selectedPhase)
    return group ? group.phases : [selectedPhase]
  }, [selectedPhase, resolvedGroups])

  // Get tiers within the selected phase group (for grouping items by raid)
  const phaseTiers = useMemo(() => {
    if (!selectedPhases) return []
    const phaseSet = new Set(selectedPhases)
    return sortedTiers.filter(t => t.phase !== undefined && t.phase !== null && phaseSet.has(t.phase))
  }, [sortedTiers, selectedPhases])

  // Fetch phase submission statuses
  const { data: statusesData } = usePhaseSubmissionStatuses(
    activeCharacter?.id || null,
    activeGuild?.id || null,
    targetExpansionId || null
  )

  // Fetch loot items for the selected phase group (may span multiple phases)
  const { data: itemsData, isLoading: itemsLoading } = usePhaseLootItems(
    bootstrapReady ? (targetExpansionId || null) : null,
    bootstrapReady ? selectedPhases : null,
    bootstrapReady ? (activeCharacter?.id || null) : null,
    bootstrapReady ? (activeGuild?.id || null) : null
  )

  // Fetch submission for the selected phase
  const { data: submissionData, isLoading: submissionLoading, mutate: mutateSubmission } = usePhaseSubmission(
    bootstrapReady ? (activeCharacter?.id || null) : null,
    bootstrapReady ? (targetExpansionId || null) : null,
    bootstrapReady ? selectedPhase : null,
    bootstrapReady ? (activeGuild?.id || null) : null
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

  // Set initial phase from URL or first available (uses canonical phases from groups)
  useEffect(() => {
    if (guildLoading || resolvedGroups.length === 0) return

    const canonicalPhases = resolvedGroups.map(g => g.canonicalPhase)
    const phaseFromUrl = searchParams.get('phase')
    const parsedPhase = phaseFromUrl ? parseInt(phaseFromUrl) : null

    if (parsedPhase !== null && canonicalPhases.includes(parsedPhase)) {
      if (selectedPhase !== parsedPhase) {
        setSelectedPhaseState(parsedPhase)
      }
    } else if (selectedPhase === null || !canonicalPhases.includes(selectedPhase)) {
      // Default to first available group's canonical phase
      const defaultPhase = canonicalPhases[0]
      setSelectedPhaseState(defaultPhase)
      const params = new URLSearchParams(searchParams.toString())
      params.set('phase', defaultPhase.toString())
      router.replace(`?${params.toString()}`, { scroll: false })
    }
  }, [guildLoading, resolvedGroups, searchParams, selectedPhase, router])

  // Load guild settings and phase deadlines in parallel
  // These were previously separate useEffects causing sequential fetches
  useEffect(() => {
    if (!activeGuild?.id) return

    const loadSettingsAndDeadlines = async () => {
      const settingsPromise = supabase
        .from('guild_settings')
        .select('enforce_slot_restrictions, max_allocation_points_per_bracket, max_tokens_per_bracket, max_category_per_bracket')
        .eq('guild_id', activeGuild.id)
        .single()

      const deadlinesPromise = targetExpansionId
        ? supabase
            .from('expansions')
            .select('phase_deadlines')
            .eq('id', targetExpansionId)
            .single()
        : Promise.resolve({ data: null })

      const [settingsResult, deadlinesResult] = await Promise.all([settingsPromise, deadlinesPromise])

      setEnforceSlotRestrictions(settingsResult.data?.enforce_slot_restrictions ?? true)
      setBracketLimits({
        maxAllocationPoints: settingsResult.data?.max_allocation_points_per_bracket ?? DEFAULT_MAX_ALLOCATION_POINTS,
        maxTokens: settingsResult.data?.max_tokens_per_bracket ?? DEFAULT_MAX_TOKENS,
        maxCategory: settingsResult.data?.max_category_per_bracket ?? DEFAULT_MAX_CATEGORY,
      })

      if (deadlinesResult.data?.phase_deadlines) {
        setExpansionPhaseDeadlines(deadlinesResult.data.phase_deadlines as Record<string, string | null>)
      } else {
        setExpansionPhaseDeadlines({})
      }
    }
    loadSettingsAndDeadlines()
  }, [activeGuild?.id, targetExpansionId, supabase])

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
      // Lazy-load the icon module, then preload item icons
      const wowheadIds = itemsData.items.map(item => item.wowhead_id)
      import('@/data/item-icons').then(({ preloadItemIcons }) => {
        preloadItemIcons(wowheadIds)
      })
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

  // Import BIS items into rankings using smart bracket-aware placement
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
          error: data.error || 'Couldn\'t fetch BIS items. Try again.',
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

      // Build item lookup map with all fields needed for bracket validation
      const itemsById = new Map<string, BracketItem>()
      const validWowheadIds = new Map<string, number>() // id -> wowhead_id
      const lcItemIds = new Set<string>() // Loot Council items (not rankable)
      for (const item of (itemsData?.items || [])) {
        itemsById.set(item.id, {
          id: item.id,
          classification: item.classification,
          item_type: item.item_type,
          item_slot: item.item_slot,
          allocation_cost: item.allocation_cost,
        })
        validWowheadIds.set(item.id, item.wowhead_id)
        if (item.is_loot_council) lcItemIds.add(item.id)
      }

      // Build slot coverage from equipped gear for upgrade-tier sorting
      const slotCoverage = buildSlotCoverageMap(gearData?.items || [])

      // Sort BIS items by upgrade tier (biggest upgrades first)
      const sortedBisItems = [...data.items].sort((a: any, b: any) => {
        const tierA = computeUpgradeTier(a.slot, a.priority, slotCoverage)
        const tierB = computeUpgradeTier(b.slot, b.priority, slotCoverage)
        if (tierA !== tierB) return tierA - tierB
        if (a.priority !== b.priority) return a.priority === 'bis' ? -1 : 1
        return (a.slot as string).localeCompare(b.slot as string)
      })

      // Initialize bracket states for smart placement
      const bracketStates = createBracketStates(bracketLimits)
      const noBracketPlacements = new Map<string, string>() // "rank-slot" -> itemId
      const newRankings: Record<string, string> = {}
      let importedCount = 0

      for (const bisItem of sortedBisItems) {
        // Skip if item not available in this tier's loot table
        const wowheadId = validWowheadIds.get(bisItem.loot_item_id)
        if (wowheadId === undefined) continue

        // Skip items the user already owns (imported from WowSims)
        if (equippedWowheadIds.has(wowheadId)) {
          continue
        }

        const item = itemsById.get(bisItem.loot_item_id)
        if (!item) continue

        // Skip Loot Council items (not rankable by raiders)
        if (lcItemIds.has(bisItem.loot_item_id)) continue

        // Try to find a valid slot in brackets first
        const bracketSlot = findNextValidSlot(item, bracketStates, enforceSlotRestrictions, itemsById, bracketLimits)

        if (bracketSlot) {
          // Place in bracket
          const { bracketIndex, rank, slot } = bracketSlot
          placeInBracket(item, bracketStates[bracketIndex], rank, slot)
          newRankings[`${rank}-${slot}`] = item.id
          importedCount++
        } else {
          // Brackets are full or can't fit this item - try No Bracket zone
          const noBracketSlot = findNextNoBracketSlot(item, noBracketPlacements, itemsById)

          if (noBracketSlot) {
            const { rank, slot } = noBracketSlot
            noBracketPlacements.set(`${rank}-${slot}`, item.id)
            newRankings[`${rank}-${slot}`] = item.id
            importedCount++
          }
          // If no slot found anywhere, skip this item
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
        error: error instanceof Error ? error.message : 'Couldn\'t import BIS items. Try again.'
      }
    } finally {
      setIsImportingBis(false)
    }
  }, [activeCharacter, selectedPhase, targetExpansionId, activeGuild?.id, itemsData?.items, equippedWowheadIds, enforceSlotRestrictions, bracketLimits, gearData?.items])

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
      submissionId = upsertedSub.id

      // Atomic save: DELETE + INSERT in a single transaction via RPC
      const itemsJson = Object.entries(currentRankings).map(([key, loot_item_id]) => {
        const [rankStr, slotStr] = key.split('-')
        return { loot_item_id, rank: parseInt(rankStr), slot: parseInt(slotStr) }
      })

      const { error: saveError } = await supabase.rpc('save_submission_items', {
        p_submission_id: submissionId,
        p_items: itemsJson,
      })

      if (saveError) {
        console.error('[doAutoSave] Failed to save items:', saveError)
        throw new Error(saveError.message)
      }

      // Mark this state as saved (store object copy for value comparison)
      lastSavedRankingsRef.current = { ...currentRankings }
      initialRankingsRef.current = currentRankings
      lastSavedRef.current = new Date()

      // Clear local changes flag - save is complete
      localChangesRef.current = false

      // Update local state to match saved state (without triggering SWR refetch)
      setInitialRankings({ ...currentRankings })
      setOriginalStatus(targetStatus)
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
  }, [rankings, activeCharacter?.id, selectedPhase, targetExpansionId, activeGuild?.id, initialLoadComplete])

  // Save submission (manual save/submit)
  const saveSubmission = useCallback(async (submit: boolean) => {
    if (!activeCharacter || selectedPhase === null || !targetExpansionId || !activeGuild?.id) return

    setIsSaving(true)

    try {
      let submissionId = submissionData?.submission?.id

      // Always save items as draft first (validation happens server-side on submit)
      const { data: upsertedSub, error: subError } = await supabase
        .from('loot_submissions')
        .upsert({
          ...(submissionId ? { id: submissionId } : {}),
          character_id: activeCharacter.id,
          guild_id: activeGuild.id,
          expansion_id: targetExpansionId,
          phase: selectedPhase,
          status: 'draft',
          submitted_at: submissionData?.submission?.submitted_at || null,
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
      submissionId = upsertedSub.id

      // Atomic save: DELETE + INSERT in a single transaction via RPC
      const itemsJson = Object.entries(rankings).map(([key, loot_item_id]) => {
        const [rankStr, slotStr] = key.split('-')
        return { loot_item_id, rank: parseInt(rankStr), slot: parseInt(slotStr) }
      })

      const { error: saveError } = await supabase.rpc('save_submission_items', {
        p_submission_id: submissionId,
        p_items: itemsJson,
      })

      if (saveError) {
        console.error('[saveSubmission] Failed to save items:', saveError)
        throw new Error(saveError.message)
      }

      // If submitting, call the server-side validation + promotion API
      if (submit) {
        const response = await fetch('/api/loot-submissions/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submission_id: submissionId })
        })

        if (!response.ok) {
          const data = await response.json()
          if (data.violations) {
            const violationMsg = data.violations.map((v: any) => `${v.bracket}: ${v.detail}`).join('. ')
            throw new Error(`Bracket rules violated. ${violationMsg}`)
          }
          throw new Error(data.error || 'Couldn\'t submit list')
        }
      }

      const finalStatus = submit ? 'pending' : 'draft'

      showNotification('success', submit ? 'Loot List submitted. Officers will review it.' : 'Draft saved. Pick up where you left off anytime.')
      trackClientEvent(submit ? 'loot_list_submitted' : 'loot_list_saved', {
        character_id: activeCharacter.id,
        phase: selectedPhase,
        item_count: Object.keys(rankings).length
      })

      // Notify officers when submitting (fire and forget)
      if (submit && activeGuild) {
        fetch('/api/discord/notify-officers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guild_id: activeGuild.id,
            character_id: activeCharacter.id,
            character_name: activeCharacter.name,
            phase: selectedPhase,
            guild_name: activeGuild.name
          })
        }).catch(err => console.error('Failed to notify officers:', err))
      }

      // Update initial state to reflect saved state
      setInitialRankings({ ...rankings })
      setOriginalStatus(finalStatus)

      // Store what we saved so the sync effect doesn't overwrite local state
      lastSavedRankingsRef.current = { ...rankings }
      lastSavedRef.current = new Date()
      localChangesRef.current = false

      // Optimistically update the SWR submission data so the status banner updates immediately
      mutateSubmission(
        { submission: { ...submissionData?.submission, ...upsertedSub, status: finalStatus } as any, rankings },
        false // don't revalidate — we already have the correct data
      )

      // Invalidate phase statuses (for the tab badges)
      if (activeCharacter && activeGuild && targetExpansionId) {
        invalidatePhaseSubmissionStatuses(activeCharacter.id, activeGuild.id, targetExpansionId)
      }

      // Update sidebar badge count immediately (for officers viewing the nav)
      if (submit) {
        notifySubmissionChanged()
      }
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : 'Couldn\'t save. Try again.')
    }

    setIsSaving(false)
  }, [activeCharacter, selectedPhase, targetExpansionId, activeGuild, rankings, submissionData, supabase, showNotification, mutateSubmission])

  // Refresh data - clears local changes to allow fresh data to load
  const refreshData = useCallback(() => {
    localChangesRef.current = false
    lastSavedRankingsRef.current = null
    mutateSubmission()
  }, [mutateSubmission])

  // Remove a single item from an approved submission without changing its status
  const removeApprovedItem = useCallback(async (lootItemId: string, itemName: string): Promise<boolean> => {
    const submissionId = submissionDataRef.current?.submission?.id
    if (!submissionId || !activeGuild?.id) {
      console.error('[removeApprovedItem] Missing submissionId or guildId', { submissionId, guildId: activeGuild?.id })
      return false
    }

    try {
      const response = await fetch('/api/loot-submissions/remove-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_id: activeGuild.id,
          submission_id: submissionId,
          loot_item_id: lootItemId,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        console.error('[removeApprovedItem] API error:', response.status, data)
        return false
      }

      // Remove from local rankings state
      setRankings(prev => {
        const newRankings = { ...prev }
        for (const [key, value] of Object.entries(newRankings)) {
          if (value === lootItemId) {
            delete newRankings[key]
          }
        }
        return newRankings
      })

      // Refresh from server to get clean state
      localChangesRef.current = false
      lastSavedRankingsRef.current = null
      mutateSubmission()
      return true
    } catch {
      return false
    }
  }, [activeGuild?.id, mutateSubmission])

  // Restore a previously removed item on an approved submission
  const restoreRemovedItem = useCallback(async (lootItemId: string): Promise<boolean> => {
    const submissionId = submissionDataRef.current?.submission?.id
    if (!submissionId || !activeGuild?.id) {
      console.error('[restoreRemovedItem] Missing submissionId or guildId', { submissionId, guildId: activeGuild?.id })
      return false
    }

    try {
      const response = await fetch('/api/loot-submissions/remove-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_id: activeGuild.id,
          submission_id: submissionId,
          loot_item_id: lootItemId,
          restore: true,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        console.error('[restoreRemovedItem] API error:', response.status, text)
        return false
      }

      localChangesRef.current = false
      lastSavedRankingsRef.current = null
      mutateSubmission()
      return true
    } catch (err) {
      console.error('[restoreRemovedItem] Network error:', err)
      return false
    }
  }, [activeGuild?.id, mutateSubmission])

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
  // We count bootstrap as "loading" until it resolves so the skeleton
  // stays up during the single bootstrap round-trip. Once bootstrap
  // finishes and seeds the SWR cache, the individual hooks return
  // immediately and neither tiersLoading nor itemsLoading flips true.
  const isLoading = guildLoading || !bootstrapReady || tiersLoading
  const isContentLoading = !bootstrapReady || itemsLoading || submissionLoading

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
    resolvedGroups,
    phaseSubmissionStatuses: statusesData?.phaseStatuses || {},
    selectedPhase,
    phaseDeadline,
    enforceSlotRestrictions,
    bracketLimits,
    equippedItems: gearData?.items || [],
    equippedWowheadIds,
    isLoading,
    isContentLoading,
    isSaving,
    isImportingBis,
    isGearLoading: gearLoading,
    hasChanges,
    initialRankings,
    originalStatus,
    removedItems: submissionData?.removedItems || []
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
    bracketLimits,
    gearData?.items,
    equippedWowheadIds,
    isLoading,
    isContentLoading,
    isSaving,
    isImportingBis,
    gearLoading,
    hasChanges,
    initialRankings,
    originalStatus,
    submissionData?.removedItems
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
    refreshGear,
    removeApprovedItem,
    restoreRemovedItem
  }), [
    setSelectedPhase,
    handleItemSelect,
    clearAllRankings,
    saveSubmission,
    refreshData,
    importBisItems,
    refreshGear,
    removeApprovedItem,
    restoreRemovedItem
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
