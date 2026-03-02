'use client'

import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { calculateAttendanceScore, getRankModifier, calculateLootScore, calculatePriorityBonus, getTrialPenalty, calculateBadLuckBonus, type ItemPriority } from '@/utils/calculations'
import { getSpecRoles } from '@/utils/spec-role-mapping'
import { getBossOrder, normalizeBossName } from '@/utils/bossOrder'
import { getBossImage } from '@/utils/bossImages'
import { getRaidIcon, getRaidShorthand } from '@/utils/raidIcons'
import { StarFilledIcon } from '@/components/ui/icons'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { ExpansionGuard } from '@/app/components/ExpansionGuard'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { TierTabsSkeleton, MasterSheetContentSkeleton } from '@/components/ui/skeletons'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { HugeiconsIcon } from '@hugeicons/react'
import { ScrollIcon, ArrowUpRight01Icon, InformationCircleIcon, ArrowUp01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons'
import { HorizontalScroll } from '@/components/ui/horizontal-scroll'
import { Heading } from '@/components/ui/typography'
import ScoreBreakdownModal from '@/app/components/ScoreBreakdownModal'
import ScoreComparisonModal from '@/app/components/ScoreComparisonModal'
import LootListSummaryView, { LootListAggregateItem } from '@/app/components/LootListSummaryView'
import { refreshWowheadTooltips } from '@/lib/wowhead'
import { trackClientEvent } from '@/utils/analytics/client'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { VirtualizedMasterSheet } from './components/VirtualizedMasterSheet'
import type { PlayerRanking } from './components/BossSection'

interface LootItem {
  id: string
  name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
  raid_tier_id?: string
  is_loot_council?: boolean
}

// PlayerRanking type imported from ./components/BossSection

interface ItemRankings {
  item: LootItem
  rankings: PlayerRanking[]
}

interface MemberInfo {
  character_name: string
  role: string
  class?: { id?: string; name: string; color_hex: string }
}

interface GuildSettings {
  guild_id?: string
  rolling_attendance_weeks?: number
  raid_days_per_week?: number
  first_raid_day?: number | null
  second_raid_day?: number | null
  third_raid_day?: number | null
  fourth_raid_day?: number | null
  fifth_raid_day?: number | null
  decimal_places?: number
  blp_enabled?: boolean
  new_member_mode?: 'raw' | 'fair' | 'minimum_gate'
  minimum_raid_days?: number
  // Fields used by ScoreBreakdownModal
  attendance_mode?: string
  attendance_max_score?: number
  attendance_breakpoints?: { threshold: number; percentage: number }[]
  rank_modifier_gm?: number
  rank_modifier_officer?: number
  rank_modifier_member?: number
  bad_luck_bonus_per_loss?: number
  bad_luck_bonus_max?: number
  priority_bonus_role?: number
  priority_bonus_class_spec?: number
  priority_bonus_character?: number
  trial_penalty_enabled?: boolean
  trial_penalty_value?: number
  // Allow additional fields from guild_settings table
  [key: string]: unknown
}

interface RaidTierExpansion {
  id: string
  name: string
}

interface RaidTierRow {
  id: string
  name: string
  phase: number | null
  is_active: boolean
  is_guild_active: boolean
  master_sheet_visible: boolean
  expansion: RaidTierExpansion | RaidTierExpansion[]
}

interface RaidTier {
  id: string
  name: string
  phase: number
  is_active: boolean
  is_guild_active: boolean
  master_sheet_visible: boolean
  expansion: RaidTierExpansion
}

interface CharacterClass {
  name: string
  color_hex: string
}

interface CharacterSpec {
  id: string
  name: string
}

interface CharacterGuildMembership {
  role: string
  membership_status: string
  is_active?: boolean
  guild_id?: string
}

interface CharacterWithRelations {
  id: string
  name: string | null
  user_id: string
  spec_id: string | null
  class: CharacterClass | CharacterClass[]
  spec: CharacterSpec | CharacterSpec[] | null
  character_guild_memberships: CharacterGuildMembership[]
}

interface AggregateCharacterRow {
  id: string
  name: string | null
  class: CharacterClass | CharacterClass[]
}

export default function MasterSheet() {
  return (
    <Suspense fallback={<MasterSheetContentSkeleton />}>
      <MasterSheetContent />
    </Suspense>
  )
}

function MasterSheetContent() {
  const { activeGuild, activeCharacter, loading: guildLoading, isOfficer } = useGuildContext()
  const { showNotification } = useNotification()
  const [allItemRankings, setAllItemRankings] = useState<ItemRankings[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [contentReady, setContentReady] = useState(false)
  const [guildId, setGuildId] = useState<string | null>(null)
  const [member, setMember] = useState<MemberInfo | null>(null)
  const [guildSettings, setGuildSettings] = useState<GuildSettings | null>(null)
  const [raidTiers, setRaidTiers] = useState<RaidTier[]>([])
  const [phases, setPhases] = useState<number[]>([])
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null)
  const [masterSheetVisible, setMasterSheetVisible] = useState<boolean>(false)
  const [hasApprovedSubmission, setHasApprovedSubmission] = useState<boolean>(false)
  const [itemPriorities, setItemPriorities] = useState<Record<string, ItemPriority>>({})
  const [collapsedBosses, setCollapsedBosses] = useState<Set<string>>(new Set())
  const [collapsedRaidTiers, setCollapsedRaidTiers] = useState<Set<string>>(new Set())
  const [isExporting, setIsExporting] = useState(false)
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false)
  const [showScoreComparison, setShowScoreComparison] = useState(false)
  const [comparisonData, setComparisonData] = useState<{
    itemName: string
    userRanking: PlayerRanking | null
    winnerRanking: PlayerRanking | null
  }>({ itemName: '', userRanking: null, winnerRanking: null })
  // Officer aggregate view state
  const [viewMode, setViewMode] = useState<'rankings' | 'aggregate'>('rankings')
  const [aggregateItems, setAggregateItems] = useState<LootListAggregateItem[]>([])
  const [aggregateLoading, setAggregateLoading] = useState(false)
  const [aggregateBossFilter, setAggregateBossFilter] = useState<string | null>(null)

  const supabase = createClient()
  const searchParams = useSearchParams()
  const scrollPendingRef = useRef<string | null>(null)

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Loot Rankings'
    trackClientEvent('master_sheet_viewed')
  }, [])

  // Fade in content after loading to avoid wowhead tooltip flash
  useEffect(() => {
    if (!initialLoading && !contentLoading) {
      const timer = setTimeout(() => setContentReady(true), 150)
      return () => clearTimeout(timer)
    } else {
      setContentReady(false)
    }
  }, [initialLoading, contentLoading])

  // Define raid tier progression order (Classic + TBC + WotLK)
  const getRaidTierOrder = (tierName: string): number => {
    const order: Record<string, number> = {
      // Classic
      'Molten Core': 1, 'MC': 1,
      'Onyxia\'s Lair': 2, 'Onyxia': 2,
      'Blackwing Lair': 3, 'BWL': 3,
      'Zul\'Gurub': 4, 'ZG': 4,
      'Ruins of Ahn\'Qiraj': 5, 'AQ20': 5,
      'Temple of Ahn\'Qiraj': 6, 'AQ40': 6,
      'Naxxramas': 7, 'Naxx': 7,
      // TBC
      'Karazhan': 10, 'Kara': 10,
      'Gruul\'s Lair': 11, 'Gruul': 11,
      'Magtheridon\'s Lair': 12, 'Magtheridon': 12, 'Mag': 12,
      'Serpentshrine Cavern': 20, 'SSC': 20,
      'Tempest Keep: The Eye': 21, 'Tempest Keep': 21, 'The Eye': 21, 'TK': 21,
      'Hyjal Summit': 30, 'Mount Hyjal': 30, 'Hyjal': 30,
      'Black Temple': 31, 'BT': 31,
      'Zul\'Aman': 32, 'ZA': 32,
      'Sunwell Plateau': 33, 'Sunwell': 33, 'SWP': 33,
      // WotLK
      'Vault of Archavon': 40, 'VoA': 40,
      'Obsidian Sanctum': 41, 'OS': 41,
      'Eye of Eternity': 42, 'EoE': 42,
      'Naxxramas (10)': 43, 'Naxxramas (25)': 44,
      'Ulduar': 50,
      'Trial of the Crusader': 60, 'ToC': 60,
      'Trial of the Grand Crusader': 61, 'ToGC': 61,
      'Onyxia\'s Lair (10)': 62, 'Onyxia\'s Lair (25)': 63,
      'Icecrown Citadel': 70, 'ICC': 70,
      'Ruby Sanctum': 80, 'RS': 80
    }
    return order[tierName] || 999 // Unknown tiers go to the end
  }

  // Batched attendance calculation for multiple characters
  // Instead of N queries per character, this fetches all data in bulk (5 queries total)
  const calculateAttendanceBatch = async (
    characters: Array<{ id: string; user_id: string }>
  ): Promise<Record<string, { score: number; raidsAttended: number }>> => {
    if (!guildId || !guildSettings || characters.length === 0) {
      return {}
    }

    const characterIds = characters.map(c => c.id)
    const weeks = guildSettings.rolling_attendance_weeks || 4
    const daysAgo = weeks * 7
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - daysAgo)
    const periodStartStr = periodStart.toISOString().split('T')[0]

    const newMemberMode = guildSettings.new_member_mode || 'raw'

    // Query 1: Fetch ALL memberships in one query (for join dates in fair/minimum_gate modes)
    let membershipsByCharacter = new Map<string, { joined_at: string | null }>()
    if (newMemberMode === 'fair' || newMemberMode === 'minimum_gate') {
      const { data: memberships } = await supabase
        .from('character_guild_memberships')
        .select('character_id, joined_at')
        .in('character_id', characterIds)
        .eq('guild_id', guildId)

      if (memberships) {
        for (const m of memberships) {
          membershipsByCharacter.set(m.character_id, { joined_at: m.joined_at })
        }
      }
    }

    // Query 2: Fetch expansion raid day config ONCE
    let raidDays: number[] = []
    if (activeGuild?.active_expansion_id) {
      const { data: expansionData } = await supabase
        .from('expansions')
        .select('raid_days_per_week, first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day')
        .eq('id', activeGuild.active_expansion_id)
        .single()

      if (expansionData) {
        raidDays = [
          expansionData.first_raid_day,
          expansionData.second_raid_day,
          expansionData.third_raid_day,
          expansionData.fourth_raid_day,
          expansionData.fifth_raid_day
        ].filter((day): day is number => day !== null && day !== undefined)
          .slice(0, expansionData.raid_days_per_week || 2)
      }
    }

    // Fall back to guild settings if no expansion raid days
    if (raidDays.length === 0) {
      raidDays = [
        guildSettings.first_raid_day,
        guildSettings.second_raid_day,
        guildSettings.third_raid_day,
        guildSettings.fourth_raid_day,
        guildSettings.fifth_raid_day
      ].filter((day): day is number => day !== null && day !== undefined)
        .slice(0, guildSettings.raid_days_per_week || 2)
    }

    // Query 3: Fetch ALL raid events ONCE
    const todayStr = new Date().toISOString().split('T')[0]
    const { data: recentRaids } = await supabase
      .from('raid_events')
      .select('id, raid_date')
      .eq('guild_id', guildId)
      .eq('is_skipped', false)
      .gte('raid_date', periodStartStr)
      .lte('raid_date', todayStr)

    if (!recentRaids || recentRaids.length === 0) {
      return Object.fromEntries(characterIds.map(id => [id, { score: 0, raidsAttended: 0 }]))
    }

    // Filter to only raids on configured raid days
    type RaidEventRecord = { id: string; raid_date: string }
    const filteredRaids = raidDays.length > 0
      ? recentRaids.filter((event: RaidEventRecord) => {
          const eventDate = new Date(event.raid_date + 'T00:00:00')
          return raidDays.includes(eventDate.getDay())
        })
      : recentRaids

    if (filteredRaids.length === 0) {
      return Object.fromEntries(characterIds.map(id => [id, { score: 0, raidsAttended: 0 }]))
    }

    const raidIds = filteredRaids.map((r: RaidEventRecord) => r.id)

    // Query 4: Fetch ALL attendance records for ALL characters in ONE query
    const { data: allAttendanceRecords } = await supabase
      .from('attendance_records')
      .select('character_id, user_id, raid_event_id, signed_up, attended, no_call_no_show')
      .in('character_id', characterIds)
      .in('raid_event_id', raidIds)

    // Build lookup: character_id -> Set of raid_event_ids with attendance
    const attendanceByCharacter = new Map<string, Array<{
      raid_event_id: string
      signed_up: boolean
      attended: boolean
      no_call_no_show: boolean
    }>>()

    for (const record of allAttendanceRecords || []) {
      if (!record.character_id) continue
      if (!attendanceByCharacter.has(record.character_id)) {
        attendanceByCharacter.set(record.character_id, [])
      }
      attendanceByCharacter.get(record.character_id)!.push(record)
    }

    // Process each character in memory (no more queries)
    const results: Record<string, { score: number; raidsAttended: number }> = {}

    for (const character of characters) {
      // Determine effective start date for this character
      let effectiveStartDate = periodStart
      if (newMemberMode === 'fair' || newMemberMode === 'minimum_gate') {
        const membership = membershipsByCharacter.get(character.id)
        if (membership?.joined_at) {
          const memberJoinDate = new Date(membership.joined_at)
          if (memberJoinDate > periodStart) {
            effectiveStartDate = memberJoinDate
          }
        }
      }

      // Filter raids to those after effective start date
      const effectiveRaids = filteredRaids.filter((r: RaidEventRecord) => {
        const raidDate = new Date(r.raid_date + 'T00:00:00')
        return raidDate >= effectiveStartDate
      })

      if (effectiveRaids.length === 0) {
        results[character.id] = { score: 0, raidsAttended: 0 }
        continue
      }

      // Get attendance records for this character
      const characterAttendance = attendanceByCharacter.get(character.id) || []
      const raidIdsWithAttendance = new Set(characterAttendance.map(a => a.raid_event_id))

      // Deduplicate by date, preferring IDs that have attendance records
      const deduplicatedRaidEvents: RaidEventRecord[] = Array.from(
        effectiveRaids.reduce((map: Map<string, RaidEventRecord>, event: RaidEventRecord) => {
          const existing = map.get(event.raid_date)
          if (!existing) {
            map.set(event.raid_date, event)
          } else if (raidIdsWithAttendance.has(event.id) && !raidIdsWithAttendance.has(existing.id)) {
            map.set(event.raid_date, event)
          }
          return map
        }, new Map<string, RaidEventRecord>()).values()
      )

      const totalRaids = deduplicatedRaidEvents.length
      const deduplicatedRaidIds = new Set(deduplicatedRaidEvents.map((r: RaidEventRecord) => r.id))

      // Filter attendance to only deduplicated raids
      const relevantRecords = characterAttendance.filter(a => deduplicatedRaidIds.has(a.raid_event_id))

      if (relevantRecords.length === 0) {
        results[character.id] = { score: 0, raidsAttended: 0 }
        continue
      }

      const score = calculateAttendanceScore(relevantRecords, totalRaids, guildSettings)
      const raidsAttended = relevantRecords.filter(r => r.attended).length
      results[character.id] = { score, raidsAttended }
    }

    return results
  }

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      // Wait for guild context to load
      if (guildLoading) {
        return
      }

      if (!activeGuild) {
        setInitialLoading(false)
        return
      }

      if (!activeCharacter) {
        setInitialLoading(false)
        return
      }

      try {
        setGuildId(activeGuild.id)
        setMember({
          character_name: activeCharacter.name,
          role: 'Member', // Can be updated if needed from character_guild_memberships
          class: activeCharacter.class
        })

        // Load guild settings
        const { data: settingsData } = await supabase
          .from('guild_settings')
          .select('*')
          .eq('guild_id', activeGuild.id)
          .single()

        if (settingsData) {
          setGuildSettings(settingsData)
        }

        // Load raid tiers for active expansion (single join query)
        // Officers can see all tiers (including disabled ones), members only see active tiers
        // Filter by current_phase to only show unlocked phases
        let loadedTierIds: string[] = []
        if (activeGuild?.active_expansion_id) {
          // Get current_phase from expansion to filter tiers
          const { data: expansionData } = await supabase
            .from('expansions')
            .select('current_phase')
            .eq('id', activeGuild.active_expansion_id)
            .single()

          const currentPhase = expansionData?.current_phase ?? 1

          let tiersQuery = supabase
            .from('raid_tiers')
            .select(`
              id,
              name,
              phase,
              is_active,
              is_guild_active,
              master_sheet_visible,
              expansion:expansions!inner (
                id,
                name
              )
            `)
            .eq('expansion.id', activeGuild.active_expansion_id)
            .lte('phase', currentPhase)
            .or('is_guild_active.eq.true,is_guild_active.is.null')

          const { data: tiersData } = await tiersQuery

          if (tiersData && tiersData.length > 0) {
            // Transform data to ensure expansion is a single object (Supabase returns it as array)
            const transformedData: RaidTier[] = tiersData.map((tier: RaidTierRow) => ({
              ...tier,
              phase: tier.phase ?? 0,
              expansion: Array.isArray(tier.expansion) ? tier.expansion[0] : tier.expansion
            }))

            // Sort by Classic raid progression order
            const sortedTiers = transformedData.sort((a: RaidTier, b: RaidTier) => {
              return getRaidTierOrder(a.name) - getRaidTierOrder(b.name)
            })

            setRaidTiers(sortedTiers)
            loadedTierIds = sortedTiers.map(t => t.id)

            // Extract unique phases from tiers
            const uniquePhases = [...new Set<number>(sortedTiers.map((t: RaidTier) => t.phase).filter((p: number | null): p is number => p !== null))]
            uniquePhases.sort((a, b) => a - b)
            setPhases(uniquePhases)

            // Only set default phase if we don't have one selected yet
            if (selectedPhase === null && uniquePhases.length > 0) {
              // Check if there's a phase in the query params first
              const phaseFromUrl = searchParams.get('phase')
              if (phaseFromUrl && uniquePhases.includes(parseInt(phaseFromUrl))) {
                setSelectedPhase(parseInt(phaseFromUrl))
              } else {
                // Otherwise use phase with an active tier or first phase
                const activeTierPhase = sortedTiers.find((t: RaidTier) => t.is_active)?.phase
                setSelectedPhase(activeTierPhase ?? uniquePhases[0])
              }
            }
          }
        }

        // Check if current character has an approved submission for any active tier in this expansion
        // Officers bypass this check
        if (!isOfficer && activeCharacter?.id && loadedTierIds.length > 0) {
          const { data: approvedSubs } = await supabase
            .from('loot_submissions')
            .select('id')
            .eq('character_id', activeCharacter.id)
            .eq('status', 'approved')
            .in('raid_tier_id', loadedTierIds)
            .limit(1)

          setHasApprovedSubmission(!!(approvedSubs && approvedSubs.length > 0))
        } else if (isOfficer) {
          setHasApprovedSubmission(true)
        }
      } catch (error) {
        console.error('Error loading master sheet data:', error)
      } finally {
        setInitialLoading(false)
      }
    }

    loadData().catch(console.error)
  }, [guildLoading, activeGuild, activeCharacter, isOfficer])

  // Get tiers for the currently selected phase (memoized to prevent infinite loops)
  const phaseTiers = useMemo(() => {
    return raidTiers.filter(t => t.phase === selectedPhase)
  }, [raidTiers, selectedPhase])

  // Update master sheet visibility when selected phase changes
  // Master sheet is visible if ANY tier in the phase has it visible
  useEffect(() => {
    if (phaseTiers.length > 0) {
      const anyVisible = phaseTiers.some((t: RaidTier) => t.master_sheet_visible)
      setMasterSheetVisible(anyVisible)
    } else if (selectedPhase !== null && phases.length > 0 && !phases.includes(selectedPhase)) {
      // Selected phase doesn't exist, reset to first available phase
      setSelectedPhase(phases[0])
    }
  }, [selectedPhase, phaseTiers, phases])

  // Load all item rankings when phase is selected
  useEffect(() => {
    const loadAllRankings = async () => {
      // Get active tier IDs for this phase
      const activeTierIds = phaseTiers
        .filter(t => t.is_guild_active !== false)
        .map(t => t.id)

      if (selectedPhase === null || !guildId || !guildSettings || activeTierIds.length === 0) {
        setAllItemRankings([])
        return
      }

      // Only load rankings if master sheet is visible OR user is an officer
      // Also require an approved submission for non-officers (prevents gaming)
      if ((!masterSheetVisible || !hasApprovedSubmission) && !isOfficer) {
        setAllItemRankings([])
        setContentLoading(false)
        return
      }

      setContentLoading(true)

      try {
        // Get all loot items for all active tiers in this phase
        const { data: itemsData } = await supabase
          .from('loot_items')
          .select('id, name, boss_name, item_slot, wowhead_id, raid_tier_id, is_loot_council')
          .in('raid_tier_id', activeTierIds)
          .eq('is_available', true)
          .order('boss_name')
          .order('name')

        if (!itemsData || itemsData.length === 0) {
          setAllItemRankings([])
          setContentLoading(false)
          return
        }

        const itemIds = itemsData.map((i: { id: string }) => i.id)

        // PERFORMANCE: Parallelize independent queries that only need itemIds
        // These queries don't depend on each other, so run them concurrently
        const [
          rankingsResult,
          lootHistoryResult,
          blpResult,
          prioritiesResults
        ] = await Promise.all([
          // Query 1: Get all ranking submissions for all items
          supabase
            .from('loot_submission_items')
            .select('rank, slot, submission_id, loot_item_id')
            .in('loot_item_id', itemIds)
            .limit(10000),

          // Query 2: Load loot history to filter out characters who already received items
          supabase
            .from('loot_history')
            .select('character_id, loot_item_id')
            .eq('guild_id', guildId)
            .in('loot_item_id', itemIds)
            .limit(10000),

          // Query 3: Fetch BLP data (if enabled)
          guildSettings.blp_enabled
            ? fetch(`/api/blp?guild_id=${guildId}&item_ids=${itemIds.join(',')}`)
                .then(res => res.ok ? res.json() : { data: {} })
                .catch(() => ({ data: {} }))
            : Promise.resolve({ data: {} }),

          // Query 4: Load item priorities for all tiers in parallel
          Promise.all(
            activeTierIds.map(tierId =>
              fetch(`/api/prio-list?guild_id=${guildId}&raid_tier_id=${tierId}`)
                .then(res => res.ok ? res.json() : { priorities: [] })
                .catch(() => ({ priorities: [] }))
            )
          )
        ])

        const { data: allRankingsData, error: rankingsError } = rankingsResult
        const { data: lootHistoryData } = lootHistoryResult
        const blpDataMap: Record<string, number> = blpResult.data || {}

        // Merge priorities from all tiers
        const prioritiesMap: Record<string, ItemPriority> = {}
        for (const prioData of prioritiesResults) {
          for (const prio of prioData.priorities || []) {
            prioritiesMap[prio.item_id] = prio
          }
        }
        setItemPriorities(prioritiesMap)

        // Create a Set of "characterId-itemId" pairs for fast lookup
        const receivedItemsSet = new Set<string>(
          (lootHistoryData || []).map((h: { character_id: string; loot_item_id: string }) => `${h.character_id}-${h.loot_item_id}`)
        )

        if (rankingsError) {
          console.error('Error loading rankings:', rankingsError)
          showNotification('error', 'Couldn\'t load rankings. Check your connection and try again.')
          setAllItemRankings(itemsData.map((item: LootItem) => ({ item, rankings: [] })))
          setContentLoading(false)
          return
        }

        if (!allRankingsData || allRankingsData.length === 0) {
          setAllItemRankings(itemsData.map((item: LootItem) => ({ item, rankings: [] })))
          setContentLoading(false)
          return
        }

        // Get all submissions (only approved lists show on master sheet)
        const submissionIds = [...new Set(allRankingsData.map((r: { submission_id: string }) => r.submission_id))]

        const { data: subsData, error: subsError } = await supabase
          .from('loot_submissions')
          .select('id, status, character_id')
          .in('id', submissionIds)
          .eq('status', 'approved')

        if (subsError) {
          console.error('Error loading submissions:', subsError)
        }

        if (!subsData || subsData.length === 0) {
          setAllItemRankings(itemsData.map((item: LootItem) => ({ item, rankings: [] })))
          setContentLoading(false)
          return
        }

        // Get all character info (filter out nulls)
        const characterIds = [...new Set(subsData.map((s: { character_id: string | null }) => s.character_id).filter((id: string | null) => id !== null))]

        if (characterIds.length === 0) {
          setAllItemRankings(itemsData.map((item: LootItem) => ({ item, rankings: [] })))
          setContentLoading(false)
          return
        }

        const { data: charactersData, error: charError } = await supabase
          .from('characters')
          .select(`
            id,
            name,
            user_id,
            spec_id,
            class:wow_classes(name, color_hex),
            spec:class_specs(id, name),
            character_guild_memberships(role, membership_status, is_active, guild_id)
          `)
          .in('id', characterIds)

        if (charError) {
          console.error('Error loading characters:', charError)
          setAllItemRankings(itemsData.map((item: LootItem) => ({ item, rankings: [] })))
          setContentLoading(false)
          return
        }

        // Pre-calculate attendance for all characters in a single batched query
        // This replaces N individual queries with just 4 bulk queries total
        const attendanceCache = await calculateAttendanceBatch(
          (charactersData || []).map((c: CharacterWithRelations) => ({ id: c.id, user_id: c.user_id }))
        )

        // Determine minimum raids required for eligibility
        const minimumRaidDays = guildSettings.minimum_raid_days || 2
        const isMinimumGateMode = guildSettings.new_member_mode === 'minimum_gate'

        // Build rankings for each item
        type SubmissionData = { id: string; status: string; character_id: string | null }
        type RankingData = { rank: number; slot: number; submission_id: string; loot_item_id: string }
        const itemRankingsMap: Record<string, ItemRankings> = {}

        // Create lookup maps for O(1) access (performance optimization - replaces O(n²) nested .find() calls)
        const subsById = new Map<string, SubmissionData>(subsData.map((s: SubmissionData) => [s.id, s]))
        const characterById = new Map<string, CharacterWithRelations>(charactersData?.map((c: CharacterWithRelations) => [c.id, c]) || [])

        for (const item of itemsData) {
          const itemRankingsData = allRankingsData.filter((r: RankingData) => r.loot_item_id === item.id)
          const rankings: PlayerRanking[] = []

          for (const r of itemRankingsData) {
            const sub = subsById.get(r.submission_id)
            if (!sub) continue

            const character = sub.character_id ? characterById.get(sub.character_id) : undefined
            if (!character) continue

            // Skip if character has already received this item
            if (receivedItemsSet.has(`${character.id}-${item.id}`)) continue

            const attendanceData = attendanceCache[character.id] || { score: 0, raidsAttended: 0 }
            const attendance = attendanceData.score
            const raidsAttended = attendanceData.raidsAttended
            // Find membership for the current guild (may not exist for approved submissions without membership)
            const guildMembership = character.character_guild_memberships?.find(
              (m: CharacterGuildMembership) => m.guild_id === activeGuild!.id
            )
            const characterRole = guildMembership?.role || 'Member'
            const roleModifier = getRankModifier(characterRole, guildSettings)

            // Calculate priority bonus
            const itemPriority = prioritiesMap[item.id]
            const charClass = Array.isArray(character.class) ? character.class[0] : character.class
            const charSpec = Array.isArray(character.spec) ? character.spec[0] : character.spec
            const specId = character.spec_id || null
            const specName = charSpec?.name || null
            const className = charClass?.name || null

            // Determine the character's role based on their spec
            let specRole: string | null = null
            if (specName && className) {
              const fullSpecName = className === specName ? className : `${className} ${specName}`
              const roles = getSpecRoles(fullSpecName)
              specRole = roles.length > 0 ? roles[0] : null
            }

            const priorityBonus = calculatePriorityBonus(
              itemPriority,
              character.id,
              specId,
              specRole
            )

            // Calculate BLP bonus from tracked passes
            const blpKey = `${character.id}-${item.id}`
            const timesPassed = blpDataMap[blpKey] || 0
            const badLuckBonus = calculateBadLuckBonus(timesPassed, guildSettings)

            // Get membership status and calculate trial penalty
            const membershipStatus = guildMembership?.membership_status || 'full'
            const trialPenalty = getTrialPenalty(membershipStatus, guildSettings)
            const isTrial = membershipStatus === 'trial'

            const lootScore = calculateLootScore(r.rank, attendance, roleModifier, badLuckBonus, priorityBonus, trialPenalty)

            // Determine eligibility based on minimum_gate mode
            const isEligible = !isMinimumGateMode || raidsAttended >= minimumRaidDays

            rankings.push({
              player_name: character.name || 'Unknown',
              class_name: charClass?.name || 'Unknown',
              class_color: charClass?.color_hex || '#888888',
              loot_score: lootScore,
              rank: r.rank,
              attendance_score: attendance,
              role_modifier: roleModifier,
              priority_bonus: priorityBonus,
              bad_luck_bonus: badLuckBonus,
              trial_penalty: trialPenalty,
              is_trial: isTrial,
              character_id: character.id,
              raids_attended: raidsAttended,
              is_eligible: isEligible,
            })
          }

          // Sort by loot score (highest first) - store all for export, slice during render
          rankings.sort((a, b) => b.loot_score - a.loot_score)
          itemRankingsMap[item.id] = { item, rankings }
        }

        // Convert to array and sort by boss name
        const sortedItemRankings = itemsData.map((item: LootItem) => itemRankingsMap[item.id])
        setAllItemRankings(sortedItemRankings)

      } catch (err) {
        console.error('Error loading rankings:', err)
        showNotification('error', 'Couldn\'t load master sheet data. Check your connection and try again.')
        setAllItemRankings([])
      }

      setContentLoading(false)
    }

    loadAllRankings()
  }, [selectedPhase, phaseTiers, guildId, guildSettings, masterSheetVisible, hasApprovedSubmission, isOfficer])

  // Refresh Wowhead tooltips after items are loaded
  // Uses centralized debounced refresh to prevent excessive API calls
  useEffect(() => {
    if (allItemRankings.length > 0) {
      refreshWowheadTooltips(true) // Immediate on initial load
    }
  }, [allItemRankings])

  // Load aggregate loot list data when officer switches to aggregate view
  useEffect(() => {
    const loadAggregateData = async () => {
      // Get active tier IDs for this phase
      const activeTierIds = phaseTiers
        .filter(t => t.is_guild_active !== false)
        .map(t => t.id)

      if (viewMode !== 'aggregate' || selectedPhase === null || !guildId || !isOfficer || activeTierIds.length === 0) {
        return
      }

      setAggregateLoading(true)

      try {
        // Get all loot items for all active tiers in this phase
        const { data: itemsData } = await supabase
          .from('loot_items')
          .select('id, name, boss_name, item_slot, wowhead_id, classification, raid_tier_id, is_loot_council')
          .in('raid_tier_id', activeTierIds)
          .eq('is_available', true)
          .order('boss_name')
          .order('name')

        if (!itemsData || itemsData.length === 0) {
          setAggregateItems([])
          setAggregateLoading(false)
          return
        }

        const itemIds = itemsData.map((i: { id: string }) => i.id)

        // Get all submission items for these items
        const { data: submissionItemsData } = await supabase
          .from('loot_submission_items')
          .select('loot_item_id, rank, slot, submission_id')
          .in('loot_item_id', itemIds)
          .limit(10000)

        if (!submissionItemsData || submissionItemsData.length === 0) {
          setAggregateItems([])
          setAggregateLoading(false)
          return
        }

        // Get approved submissions only
        type SubmissionItemData = { loot_item_id: string; rank: number; slot: number; submission_id: string }
        const submissionIds = [...new Set(submissionItemsData.map((si: SubmissionItemData) => si.submission_id))]
        const { data: submissionsData } = await supabase
          .from('loot_submissions')
          .select('id, character_id, status')
          .in('id', submissionIds)
          .eq('status', 'approved')

        if (!submissionsData || submissionsData.length === 0) {
          setAggregateItems([])
          setAggregateLoading(false)
          return
        }

        type AggregateSubmission = { id: string; character_id: string | null; status: string }
        const approvedSubmissionIds = new Set(submissionsData.map((s: AggregateSubmission) => s.id))

        // Get character info
        const characterIds = [...new Set(submissionsData.map((s: AggregateSubmission) => s.character_id).filter((id: string | null) => id !== null))]
        const { data: charactersData } = await supabase
          .from('characters')
          .select('id, name, class:wow_classes(name, color_hex)')
          .in('id', characterIds)

        // Get loot history for awarded count
        const { data: lootHistoryData } = await supabase
          .from('loot_history')
          .select('loot_item_id')
          .eq('guild_id', guildId)
          .in('loot_item_id', itemIds)

        // Count awards per item
        const awardedCounts: Record<string, number> = {}
        for (const h of lootHistoryData || []) {
          awardedCounts[h.loot_item_id] = (awardedCounts[h.loot_item_id] || 0) + 1
        }

        // Build aggregate data
        const aggregateMap: Record<string, LootListAggregateItem> = {}

        for (const item of itemsData) {
          aggregateMap[item.id] = {
            item_id: item.id,
            item_name: item.name,
            boss_name: item.boss_name,
            item_slot: item.item_slot,
            wowhead_id: item.wowhead_id,
            classification: item.classification || 'common',
            total_lists: 0,
            already_awarded: awardedCounts[item.id] || 0,
            players: [],
            average_rank: 0,
          }
        }

        // Populate players for each item

        // Create lookup maps for O(1) access (performance optimization)
        const submissionsById = new Map<string, AggregateSubmission>(submissionsData.map((s: AggregateSubmission) => [s.id, s]))
        const aggregateCharacterById = new Map<string, AggregateCharacterRow>(charactersData?.map((c: AggregateCharacterRow) => [c.id, c]) || [])

        for (const si of submissionItemsData) {
          if (!approvedSubmissionIds.has(si.submission_id)) continue

          const submission = submissionsById.get(si.submission_id)
          if (!submission) continue

          const character = submission.character_id ? aggregateCharacterById.get(submission.character_id) : undefined
          if (!character) continue

          const aggregate = aggregateMap[si.loot_item_id]
          if (!aggregate) continue

          const charClass = Array.isArray(character.class) ? character.class[0] : character.class

          aggregate.players.push({
            character_id: character.id,
            character_name: character.name || 'Unknown',
            class_name: charClass?.name || 'Unknown',
            class_color: charClass?.color_hex || '#888888',
            primary_rank: si.slot,
            item_rank: si.rank,
          })
        }

        // Calculate totals and averages
        for (const item of Object.values(aggregateMap)) {
          item.total_lists = item.players.length
          if (item.players.length > 0) {
            const totalRank = item.players.reduce((sum, p) => sum + p.item_rank, 0)
            item.average_rank = totalRank / item.players.length
          }
        }

        // Filter out items with no loot lists and convert to array
        const aggregateArray = Object.values(aggregateMap).filter(item => item.total_lists > 0)
        setAggregateItems(aggregateArray)

      } catch (err) {
        console.error('Error loading aggregate data:', err)
        showNotification('error', 'Couldn\'t load aggregate data. Try refreshing the page.')
        setAggregateItems([])
      }

      setAggregateLoading(false)
    }

    loadAggregateData()
  }, [viewMode, selectedPhase, phaseTiers, guildId, isOfficer])

  // Handle phase switching from query params
  useEffect(() => {
    const phaseParam = searchParams.get('phase')
    const itemId = searchParams.get('item')

    // If we have a phase parameter, switch to it and store scroll target
    if (phaseParam && phases.length > 0) {
      const phaseNum = parseInt(phaseParam)
      const phaseExists = phases.includes(phaseNum)
      if (phaseExists && phaseNum !== selectedPhase) {
        if (itemId) {
          scrollPendingRef.current = itemId
        }
        setSelectedPhase(phaseNum)
      } else if (phaseExists && phaseNum === selectedPhase && itemId) {
        // Already on correct phase, just need to scroll
        scrollPendingRef.current = itemId
      }
    } else if (itemId && !phaseParam) {
      // No phase specified, just scroll to item
      scrollPendingRef.current = itemId
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, selectedPhase, phases.length])

  // Scroll to item when items are loaded
  useEffect(() => {
    const itemId = scrollPendingRef.current

    if (itemId && allItemRankings.length > 0) {
      // Check if the item exists in current rankings
      const itemExists = allItemRankings.some(ir => ir.item.id === itemId)

      if (itemExists) {
        const timer = setTimeout(() => {
          const element = document.getElementById(`item-${itemId}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            // Highlight the item briefly
            element.classList.add('ring-2', 'ring-accent')
            setTimeout(() => {
              element.classList.remove('ring-2', 'ring-accent')
            }, 2000)

            // Clear the pending scroll
            scrollPendingRef.current = null
          }
        }, 600)

        return () => clearTimeout(timer)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItemRankings.length])

  // Group items by raid tier first, then by boss within each tier (memoized for performance)
  const groupedByRaidTier = useMemo(() => {
    const grouped: Record<string, { tier: typeof phaseTiers[0], items: ItemRankings[] }> = {}
    allItemRankings.forEach(ir => {
      const tierId = ir.item.raid_tier_id || 'unknown'
      if (!grouped[tierId]) {
        const tier = phaseTiers.find(t => t.id === tierId)
        grouped[tierId] = { tier: tier || { id: tierId, name: 'Unknown', phase: 0, is_active: false, is_guild_active: false, master_sheet_visible: false, expansion: { id: '', name: '' } }, items: [] }
      }
      grouped[tierId].items.push(ir)
    })
    return grouped
  }, [allItemRankings, phaseTiers])

  // Group items by boss within each tier (memoized for performance)
  const groupedByBoss = useMemo(() => {
    const grouped: Record<string, ItemRankings[]> = {}
    allItemRankings.forEach(ir => {
      const boss = normalizeBossName(ir.item.boss_name)
      if (!grouped[boss]) {
        grouped[boss] = []
      }
      grouped[boss].push(ir)
    })
    return grouped
  }, [allItemRankings])

  // Sort raid tiers by progression order (memoized)
  const sortedRaidTiers = useMemo(() =>
    Object.values(groupedByRaidTier).sort((a, b) =>
      getRaidTierOrder(a.tier.name) - getRaidTierOrder(b.tier.name)
    ),
    [groupedByRaidTier]
  )

  // Compute max rankings count across all items for consistent column widths
  const maxRankingsCount = useMemo(() => {
    let max = 0
    for (const { items } of sortedRaidTiers) {
      for (const ir of items) {
        if (ir.rankings.length > max) max = ir.rankings.length
      }
    }
    return max
  }, [sortedRaidTiers])

  // Check if any tier in the selected phase is disabled (for officer warning)
  const hasDisabledTiers = useMemo(() => phaseTiers.some(t => t.is_guild_active === false), [phaseTiers])
  // Get active tiers for display in header
  const activePhaseTiers = useMemo(() => phaseTiers.filter(t => t.is_guild_active !== false), [phaseTiers])

  const bossNames = useMemo(() => Object.keys(groupedByBoss).sort((a, b) => getBossOrder(a) - getBossOrder(b)), [groupedByBoss])

  const scrollToBoss = useCallback((bossName: string) => {
    const element = document.getElementById(`boss-${bossName.replace(/\s+/g, '-')}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const toggleBossCollapse = useCallback((bossName: string) => {
    setCollapsedBosses(prev => {
      const newSet = new Set(prev)
      if (newSet.has(bossName)) {
        newSet.delete(bossName)
      } else {
        newSet.add(bossName)
      }
      return newSet
    })
  }, [])

  const toggleRaidTierCollapse = useCallback((tierId: string) => {
    setCollapsedRaidTiers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tierId)) {
        newSet.delete(tierId)
      } else {
        newSet.add(tierId)
      }
      return newSet
    })
  }, [])

  const collapseAll = useCallback(() => {
    setCollapsedBosses(new Set(bossNames))
    setCollapsedRaidTiers(new Set(sortedRaidTiers.map(rt => rt.tier.id)))
  }, [bossNames, sortedRaidTiers])

  const expandAll = useCallback(() => {
    setCollapsedBosses(new Set())
    setCollapsedRaidTiers(new Set())
  }, [])

  // Handle comparison modal (for virtualized list)
  const handleCompare = useCallback((itemName: string, userRanking: PlayerRanking, winnerRanking: PlayerRanking) => {
    setComparisonData({
      itemName,
      userRanking,
      winnerRanking,
    })
    setShowScoreComparison(true)
    trackClientEvent('score_comparison_viewed')
  }, [])

  // Generate Gargul DFT export from rankings data (memoized callback)
  // DFT format: "itemId^DFTFC Header:\ncoloredPlayerLines;" per item.
  // After WoW EditBox escaping (| -> ||), Gargul's parser:
  //   strsub(line, 12) skips the 11-char escaped color prefix (||cffXXXXXX)
  //   gsub("|r: ", "") strips the color reset, then explode(line, "|") splits name from score.
  // DFT sorts descending (highest score first) and supports a custom header label.
  const formatRankingsForGargul = useCallback((rankings: ItemRankings[]): string => {
    const dp = guildSettings?.decimal_places ?? 2
    return rankings
      .filter(ir => ir.rankings.length > 0)
      .map(ir => {
        const itemId = ir.item.wowhead_id
        const playerLines = ir.rankings.map(r => {
          const colorHex = r.class_color.replace('#', '')
          return `|cff${colorHex} ${r.player_name}|r: ${r.loot_score.toFixed(dp)}`
        }).join('\n')
        return `"${itemId}^DFTFC LootList+ Score:\n${playerLines};"`
      })
      .join('\n')
  }, [guildSettings?.decimal_places])

  // Fetch rankings for a single tier
  const fetchTierRankings = async (tierId: string): Promise<ItemRankings[]> => {
    if (!guildId || !guildSettings || !activeGuild) return []

    // Get all loot items for this tier
    const { data: itemsData } = await supabase
      .from('loot_items')
      .select('id, name, boss_name, item_slot, wowhead_id, is_loot_council')
      .eq('raid_tier_id', tierId)
      .eq('is_available', true)
      .order('boss_name')
      .order('name')

    if (!itemsData || itemsData.length === 0) return []

    type TierLootItem = { id: string; name: string; boss_name: string; item_slot: string; wowhead_id: number; is_loot_council?: boolean }
    const itemIds = itemsData.map((i: TierLootItem) => i.id)

    // Fetch ranking submissions AND independent data (priorities, loot history, BLP) in parallel
    // These only depend on itemIds/tierId, not on each other
    const [
      { data: allRankingsData },
      prioritiesMap,
      { data: lootHistoryData },
      tierBlpDataMap,
    ] = await Promise.all([
      // Get all ranking submissions for all items at once
      supabase
        .from('loot_submission_items')
        .select('rank, slot, submission_id, loot_item_id')
        .in('loot_item_id', itemIds)
        .limit(10000),

      // Load item priorities for this tier
      (async (): Promise<Record<string, ItemPriority>> => {
        try {
          const prioResponse = await fetch(
            `/api/prio-list?guild_id=${guildId}&raid_tier_id=${tierId}`
          )
          if (prioResponse.ok) {
            const prioData = await prioResponse.json()
            const map: Record<string, ItemPriority> = {}
            for (const prio of prioData.priorities || []) {
              map[prio.item_id] = prio
            }
            return map
          }
        } catch (err) {
          console.error('Error loading item priorities:', err)
          showNotification('warning', 'Couldn\'t load item priorities. Some data may be missing.')
        }
        return {}
      })(),

      // Load loot history to filter out characters who already received items
      supabase
        .from('loot_history')
        .select('character_id, loot_item_id')
        .eq('guild_id', guildId)
        .in('loot_item_id', itemIds)
        .limit(10000),

      // Fetch BLP data for all items in this tier
      (async (): Promise<Record<string, number>> => {
        if (!guildSettings.blp_enabled) return {}
        try {
          const blpResponse = await fetch(
            `/api/blp?guild_id=${guildId}&item_ids=${itemIds.join(',')}`
          )
          if (blpResponse.ok) {
            const blpResult = await blpResponse.json()
            return blpResult.data || {}
          }
        } catch (err) {
          console.error('Error loading BLP data:', err)
          showNotification('warning', 'Couldn\'t load BLP data. Some data may be missing.')
        }
        return {}
      })(),
    ])

    if (!allRankingsData || allRankingsData.length === 0) {
      return itemsData.map((item: TierLootItem) => ({ item, rankings: [] }))
    }

    // Get all submissions (only approved lists)
    type TierRankingData = { rank: number; slot: number; submission_id: string; loot_item_id: string }
    const submissionIds = [...new Set(allRankingsData.map((r: TierRankingData) => r.submission_id))]
    const { data: subsData } = await supabase
      .from('loot_submissions')
      .select('id, status, character_id')
      .in('id', submissionIds)
      .eq('status', 'approved')

    if (!subsData || subsData.length === 0) {
      return itemsData.map((item: TierLootItem) => ({ item, rankings: [] }))
    }

    // Get all character info
    type TierSubmissionData = { id: string; status: string; character_id: string | null }
    const characterIds = [...new Set(subsData.map((s: TierSubmissionData) => s.character_id).filter((id: string | null) => id !== null))]
    if (characterIds.length === 0) {
      return itemsData.map((item: TierLootItem) => ({ item, rankings: [] }))
    }

    const { data: charactersData } = await supabase
      .from('characters')
      .select(`
        id,
        name,
        user_id,
        spec_id,
        class:wow_classes(name, color_hex),
        spec:class_specs(id, name),
        character_guild_memberships(role, membership_status, is_active, guild_id)
      `)
      .in('id', characterIds)

    if (!charactersData) {
      return itemsData.map((item: TierLootItem) => ({ item, rankings: [] }))
    }

    const receivedItemsSet = new Set<string>(
      (lootHistoryData || []).map((h: { character_id: string; loot_item_id: string }) => `${h.character_id}-${h.loot_item_id}`)
    )

    // Pre-calculate attendance for all characters in a single batched query
    const attendanceCache = await calculateAttendanceBatch(
      charactersData.map((c: CharacterWithRelations) => ({ id: c.id, user_id: c.user_id }))
    )

    // Determine minimum raids required for eligibility
    const minimumRaidDays = guildSettings.minimum_raid_days || 2
    const isMinimumGateMode = guildSettings.new_member_mode === 'minimum_gate'

    // Build rankings for each item
    const results: ItemRankings[] = []

    // Create lookup maps for O(1) access (performance optimization)
    const tierSubsById = new Map<string, TierSubmissionData>(subsData.map((s: TierSubmissionData) => [s.id, s]))
    const tierCharacterById = new Map<string, CharacterWithRelations>(charactersData.map((c: CharacterWithRelations) => [c.id, c]))

    for (const item of itemsData) {
      const itemRankingsData = allRankingsData.filter((r: TierRankingData) => r.loot_item_id === item.id)
      const rankings: PlayerRanking[] = []

      for (const r of itemRankingsData) {
        const sub = tierSubsById.get(r.submission_id)
        if (!sub) continue

        const character = sub.character_id ? tierCharacterById.get(sub.character_id) : undefined
        if (!character) continue

        // Skip if character has already received this item
        if (receivedItemsSet.has(`${character.id}-${item.id}`)) continue

        const attendanceData = attendanceCache[character.id] || { score: 0, raidsAttended: 0 }
        const attendance = attendanceData.score
        const raidsAttended = attendanceData.raidsAttended
        const guildMembership = character.character_guild_memberships?.find(
          (m: CharacterGuildMembership) => m.guild_id === activeGuild.id
        )
        const characterRole = guildMembership?.role || 'Member'
        const roleModifier = getRankModifier(characterRole, guildSettings)

        // Calculate priority bonus
        const itemPriority = prioritiesMap[item.id]
        const charClass = Array.isArray(character.class) ? character.class[0] : character.class
        const charSpec = Array.isArray(character.spec) ? character.spec[0] : character.spec
        const specId = character.spec_id || null
        const specName = charSpec?.name || null
        const className = charClass?.name || null

        let specRole: string | null = null
        if (specName && className) {
          const fullSpecName = className === specName ? className : `${className} ${specName}`
          const roles = getSpecRoles(fullSpecName)
          specRole = roles.length > 0 ? roles[0] : null
        }

        const priorityBonus = calculatePriorityBonus(
          itemPriority,
          character.id,
          specId,
          specRole
        )

        // Calculate BLP bonus from tracked passes
        const tierBlpKey = `${character.id}-${item.id}`
        const tierTimesPassed = tierBlpDataMap[tierBlpKey] || 0
        const badLuckBonus = calculateBadLuckBonus(tierTimesPassed, guildSettings)

        // Calculate trial penalty
        const membershipStatus = guildMembership?.membership_status || 'full'
        const trialPenalty = getTrialPenalty(membershipStatus, guildSettings)
        const isTrial = membershipStatus === 'trial'

        const lootScore = calculateLootScore(r.rank, attendance, roleModifier, badLuckBonus, priorityBonus, trialPenalty)

        // Determine eligibility based on minimum_gate mode
        const isEligible = !isMinimumGateMode || raidsAttended >= minimumRaidDays

        rankings.push({
          player_name: character.name || 'Unknown',
          class_name: charClass?.name || 'Unknown',
          class_color: charClass?.color_hex || '#888888',
          loot_score: lootScore,
          rank: r.rank,
          attendance_score: attendance,
          role_modifier: roleModifier,
          priority_bonus: priorityBonus,
          bad_luck_bonus: badLuckBonus,
          trial_penalty: trialPenalty,
          is_trial: isTrial,
          character_id: character.id,
          raids_attended: raidsAttended,
          is_eligible: isEligible,
        })
      }

      // Sort by loot score (highest first)
      rankings.sort((a, b) => b.loot_score - a.loot_score)
      results.push({ item, rankings })
    }

    return results
  }

  const handleExportToGargul = async () => {
    if (!guildId || !guildSettings || raidTiers.length === 0) {
      showNotification('error', 'Couldn\'t export data. Check your guild settings.')
      return
    }

    setIsExporting(true)

    try {
      // Fetch rankings for all active raid tiers in parallel
      const tierResults = await Promise.all(
        raidTiers.map(tier => fetchTierRankings(tier.id))
      )
      const allTiersRankings = tierResults.flat()

      const exportData = formatRankingsForGargul(allTiersRankings)

      if (!exportData) {
        showNotification('warning', 'No ranked items found to export. Make sure submissions are approved.')
        return
      }

      try {
        await navigator.clipboard.writeText(exportData)
      } catch {
        // Clipboard API can fail if page loses focus during the async fetch.
        // Fall back to the legacy execCommand approach.
        const textarea = document.createElement('textarea')
        textarea.value = exportData
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      const itemCount = exportData.split(';').filter(s => s.includes('^')).length
      trackClientEvent('gargul_export_completed', { item_count: itemCount, tier_count: raidTiers.length })
      showNotification('success', `Copied ${itemCount} items from ${raidTiers.length} raid tiers to clipboard`)
    } catch (err) {
      console.error('Export error:', err)
      showNotification('error', 'Couldn\'t export data. Try again.')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <ExpansionGuard>
      <div className="font-poppins">
        {/* Header - Always visible */}
        <div className="p-4 sm:p-6 lg:p-8 pb-1.5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <Heading level={1}>
                Loot Rankings{!initialLoading && selectedPhase !== null && <span className="text-muted-foreground"> · P{selectedPhase}{activePhaseTiers.length > 0 ? ` ${activePhaseTiers.map(t => getRaidShorthand(t.name)).join(', ')}` : ''}</span>}
              </Heading>
              <p className="text-muted-foreground mt-1 text-base">
                {viewMode === 'aggregate' && isOfficer
                  ? 'Most wanted items across the guild'
                  : 'All ranked players for each item'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                variant="outline"
                onClick={() => { setShowScoreBreakdown(true); trackClientEvent('score_breakdown_viewed') }}
              >
                <HugeiconsIcon icon={InformationCircleIcon} size={18} />
                <span className="hidden sm:inline">How scores work</span>
                <span className="sm:hidden">Scores</span>
              </Button>
              {isOfficer && (
                <Button
                  onClick={handleExportToGargul}
                  disabled={contentLoading || raidTiers.length === 0 || isExporting}
                  loading={isExporting}
                  loadingText="Exporting..."
                  className="bg-violet-600 hover:bg-violet-500 text-white border-0 shadow-lg"
                >
                  <Image src="/icons/gargul.png" alt="Gargul" width={20} height={20} priority />
                  <span className="hidden sm:inline">Export to Gargul</span>
                  <span className="sm:hidden">Export</span>
                  <HugeiconsIcon icon={ArrowUpRight01Icon} size={16} />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Phase Tabs - Sticky */}
        {initialLoading ? (
          <div className="sticky top-0 z-20 px-4 sm:px-6 lg:px-8 py-2.5 bg-background">
            <TierTabsSkeleton />
          </div>
        ) : phases.length > 0 && (
          <div className="sticky top-14 sm:top-0 z-20 px-4 sm:px-6 lg:px-8 py-2.5 bg-background">
            <div className="flex items-center gap-3">
              {/* Mobile: Dropdown selector */}
              <div className="sm:hidden flex-1">
                <Select
                  variant="rounded"
                  size="sm"
                  value={selectedPhase ?? ''}
                  onChange={(e) => setSelectedPhase(parseInt(e.target.value))}
                  className="w-full bg-background-elevated font-medium"
                >
                  {phases.map((phase) => {
                    const tiersInPhase = raidTiers.filter(t => t.phase === phase)
                    const activeTiersInPhase = tiersInPhase.filter(t => t.is_guild_active !== false)
                    const hasActiveTier = tiersInPhase.some(t => t.is_active)
                    const allDisabled = tiersInPhase.every(t => t.is_guild_active === false)
                    const raidNames = activeTiersInPhase.map(t => getRaidShorthand(t.name)).join(', ')
                    return (
                      <option key={phase} value={phase}>
                        P{phase} {raidNames}{hasActiveTier ? ' ★' : ''}{allDisabled ? ' (Off)' : ''}
                      </option>
                    )
                  })}
                </Select>
              </div>
              {/* Desktop: Horizontal tabs */}
              <HorizontalScroll containerClassName="hidden sm:flex flex-1 min-w-0">
                <div className="flex gap-2 pr-3">
                  {phases.map((phase) => {
                    const tiersInPhase = raidTiers.filter(t => t.phase === phase)
                    const activeTiersInPhase = tiersInPhase.filter(t => t.is_guild_active !== false)
                    const hasActiveTier = tiersInPhase.some(t => t.is_active)
                    const allDisabled = tiersInPhase.every(t => t.is_guild_active === false)
                    const isSelected = selectedPhase === phase
                    const raidNames = activeTiersInPhase.map(t => getRaidShorthand(t.name)).join(', ')
                    // Get the first active tier for the icon, or first tier if none active
                    const iconTier = activeTiersInPhase[0] || tiersInPhase[0]
                    return (
                      <Button
                        key={phase}
                        variant="ghost"
                        onClick={() => setSelectedPhase(phase)}
                        className={`px-5 py-2.5 rounded-[40px] whitespace-nowrap text-[13px] font-medium transition-all border ${
                          isSelected
                            ? allDisabled
                              ? 'bg-muted/50 border-border text-muted-foreground'
                              : 'bg-accent/20 border-accent/20 text-accent hover:bg-accent/30'
                            : allDisabled
                              ? 'bg-background-elevated/50 border-border/50 text-muted-foreground hover:bg-muted/50 opacity-60'
                              : 'bg-background-elevated border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                            isSelected
                              ? allDisabled
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-accent/30 text-accent'
                              : allDisabled
                                ? 'bg-foreground/5 text-muted-foreground'
                                : 'bg-foreground/10 text-foreground-secondary'
                          }`}>P{phase}</span>
                          {iconTier && (
                            <img
                              src={getRaidIcon(iconTier.name)}
                              alt=""
                              className="w-5 h-5 rounded border border-border/50"
                            />
                          )}
                          <span>{raidNames}</span>
                          {hasActiveTier && <StarFilledIcon size={14} />}
                          {allDisabled && <span className="text-[10px] uppercase tracking-wide">Off</span>}
                        </span>
                      </Button>
                    )
                  })}
                </div>
              </HorizontalScroll>
              {/* Officer View Toggle */}
              {isOfficer && (
                <>
                  {/* Mobile: Dropdown */}
                  <div className="sm:hidden">
                    <Select
                      variant="rounded"
                      size="sm"
                      value={viewMode}
                      onChange={(e) => setViewMode(e.target.value as 'rankings' | 'aggregate')}
                      className="bg-background-elevated font-medium"
                    >
                      <option value="rankings">Rankings</option>
                      <option value="aggregate">Summary</option>
                    </Select>
                  </div>
                  {/* Desktop: Toggle buttons */}
                  <SegmentedControl
                    options={[
                      { value: 'rankings', label: 'Rankings' },
                      { value: 'aggregate', label: 'Summary' }
                    ]}
                    value={viewMode}
                    onChange={setViewMode}
                    className="hidden sm:inline-flex flex-shrink-0"
                  />
                </>
              )}
            </div>
          </div>
        )}

        {/* Boss Quick Navigation - Sticky below tier tabs (rankings view only) */}
        {!initialLoading && !contentLoading && bossNames.length > 0 && viewMode === 'rankings' && (
          <div className="sticky top-[116px] sm:top-[60px] z-10 px-4 sm:px-6 lg:px-8 py-2.5 bg-background">
            {/* Mobile: Dropdown + Expand/Collapse */}
            <div className="sm:hidden flex gap-2">
              <Select
                variant="rounded"
                size="sm"
                onChange={(e) => {
                  if (e.target.value) scrollToBoss(e.target.value)
                  e.target.value = '' // Reset to placeholder
                }}
                defaultValue=""
                className="flex-1 bg-background-elevated font-medium"
              >
                <option value="" disabled>Jump to boss...</option>
                {bossNames.map((boss) => (
                  <option key={boss} value={boss}>{boss}</option>
                ))}
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={expandAll}
              >
                Expand
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={collapseAll}
              >
                Collapse
              </Button>
            </div>
            {/* Desktop: Horizontal chips + Expand/Collapse */}
            <div className="hidden sm:flex gap-3 items-center">
              {/* Boss chips container with horizontal scroll */}
              <HorizontalScroll containerClassName="flex-1 min-w-0">
                <div className="flex gap-2">
                  {bossNames.map((boss) => (
                    <Button
                      key={boss}
                      variant="outline"
                      size="sm"
                      onClick={() => scrollToBoss(boss)}
                    >
                      {getBossImage(boss) && (
                        <img
                          src={getBossImage(boss)!}
                          alt=""
                          className="w-4 h-4 rounded border border-border/50"
                        />
                      )}
                      {boss}
                    </Button>
                  ))}
                </div>
              </HorizontalScroll>
              {/* Expand/Collapse buttons */}
              <div className="flex-shrink-0 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={expandAll}
                >
                  Expand all
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={collapseAll}
                >
                  Collapse all
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="px-4 sm:px-6 lg:px-8 pt-1.5 pb-6 space-y-6">

        {/* Content Loading State */}
        {(initialLoading || contentLoading) ? (
          <MasterSheetContentSkeleton />
        ) : (
        <div className={`transition-opacity duration-200 ${contentReady ? 'opacity-100' : 'opacity-0'}`}>
        {/* Master Sheet Access Gates */}
        {!isOfficer && !hasApprovedSubmission ? (
          <div className="bg-background-elevated border border-border rounded-xl p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Submit your loot list first</h3>
              <p className="text-muted-foreground">
                You need an approved loot list before you can view the master sheet. Submit your list and wait for officer approval.
              </p>
            </div>
          </div>
        ) : !masterSheetVisible && !isOfficer ? (
          <div className="bg-background-elevated border border-border rounded-xl p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🔒</span>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Master sheet not available</h3>
              <p className="text-muted-foreground">
                The loot rankings for this raid tier are currently hidden. Officers will make them visible once the submission deadline has passed.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Officer Viewing Hidden Sheet Badge */}
            {!masterSheetVisible && isOfficer && (
              <div className="bg-blue-950/50 border border-blue-600/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">👁️</span>
                  <div>
                    <p className="text-blue-200 font-semibold">Officer preview</p>
                    <p className="text-blue-300 text-sm">
                      The master sheet is currently hidden from members. Only officers can see these rankings.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Officer Viewing Disabled Tiers Badge */}
            {hasDisabledTiers && isOfficer && (
              <div className="bg-amber-950/50 border border-amber-600/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <p className="text-amber-200 font-semibold">Some raid tiers disabled</p>
                    <p className="text-amber-300 text-sm">
                      One or more raid tiers in this phase are disabled. Their items won't appear in member views.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Aggregate View (Officer Only) */}
            {viewMode === 'aggregate' && isOfficer ? (
              <LootListSummaryView
                items={aggregateItems}
                loading={aggregateLoading}
                bosses={[...new Set(aggregateItems.map(i => i.boss_name))].sort()}
                selectedBoss={aggregateBossFilter}
                onBossFilter={setAggregateBossFilter}
              />
            ) : (
            <>
            {/* Loot Table */}
            {sortedRaidTiers.length === 0 ? (
              <EmptyState
                icon={ScrollIcon}
                title="No loot items yet"
                description="Items will appear here once loot is configured for this raid tier."
                variant="card"
              />
            ) : (
              <VirtualizedMasterSheet
                sortedRaidTiers={sortedRaidTiers}
                collapsedRaidTiers={collapsedRaidTiers}
                collapsedBosses={collapsedBosses}
                onToggleRaidTierCollapse={toggleRaidTierCollapse}
                onToggleBossCollapse={toggleBossCollapse}
                activeCharacterId={activeCharacter?.id}
                guildSettings={guildSettings ?? undefined}
                onCompare={handleCompare}
                maxRankingsCount={maxRankingsCount}
              />
            )}
            </>
            )}
          </>
        )}
        </div>
        )}

        {/* Legend (rankings view only) */}
        {viewMode === 'rankings' && (
        <div className="bg-background-elevated border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-foreground-muted text-[12px]">
              Scores = item rank + attendance + role modifiers + priority bonuses + trial penalty. Ties go to roll. <span className="inline-flex items-center gap-1"><span className="text-yellow-400">(T)</span> = Trial member <InfoTooltip content="Trial members receive a score penalty configured by officers. The penalty is removed when promoted to full member." iconSize={12} /></span>{guildSettings?.new_member_mode === 'minimum_gate' && <> <span className="inline-flex items-center gap-1"><span className="text-red-400">⊘</span> = Ineligible <InfoTooltip content={`Must attend ${guildSettings?.minimum_raid_days || 2}+ raids before becoming eligible for loot. Score still tracks in the background.`} iconSize={12} /></span></>}
            </p>
            {Object.keys(itemPriorities).length > 0 && (
              <p className="text-foreground-muted text-[12px]">
                {Object.keys(itemPriorities).length} items with priority
              </p>
            )}
          </div>
        </div>
        )}

        {/* Score Breakdown Modal */}
        <ScoreBreakdownModal
          open={showScoreBreakdown}
          onClose={() => setShowScoreBreakdown(false)}
          guildSettings={guildSettings}
        />

        {/* Score Comparison Modal */}
        <ScoreComparisonModal
          open={showScoreComparison}
          onClose={() => setShowScoreComparison(false)}
          itemName={comparisonData.itemName}
          userRanking={comparisonData.userRanking}
          winnerRanking={comparisonData.winnerRanking}
        />
        </div>
      </div>
    </ExpansionGuard>
  )
}
