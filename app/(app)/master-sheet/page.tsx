'use client'

import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ItemLink from '@/app/components/ItemLink'
import { calculateAttendanceScore, getRankModifier, calculateLootScore, calculatePriorityBonus, getTrialPenalty, type ItemPriority } from '@/utils/calculations'
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

interface LootItem {
  id: string
  name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
  raid_tier_id?: string
}

interface PlayerRanking {
  player_name: string
  class_name: string
  class_color: string
  loot_score: number
  rank: number
  // Breakdown components for score comparison
  attendance_score: number
  role_modifier: number
  priority_bonus: number
  bad_luck_bonus: number
  trial_penalty: number
  is_trial: boolean
  character_id: string
  // Minimum gate eligibility (only relevant when new_member_mode === 'minimum_gate')
  raids_attended: number
  is_eligible: boolean
}

interface ItemRankings {
  item: LootItem
  rankings: PlayerRanking[]
}

export default function MasterSheet() {
  const { activeGuild, activeCharacter, loading: guildLoading, isOfficer } = useGuildContext()
  const { showNotification } = useNotification()
  const [allItemRankings, setAllItemRankings] = useState<ItemRankings[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [guildId, setGuildId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [guildSettings, setGuildSettings] = useState<any>(null)
  const [raidTiers, setRaidTiers] = useState<any[]>([])
  const [phases, setPhases] = useState<number[]>([])
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null)
  const [masterSheetVisible, setMasterSheetVisible] = useState<boolean>(false)
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const scrollPendingRef = useRef<string | null>(null)

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Loot Rankings'
  }, [])

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

  // Calculate attendance score for a character (or user for backward compatibility)
  // Returns both the score and the number of raids attended (for minimum_gate eligibility)
  const calculateAttendance = async (userId: string, characterId?: string): Promise<{ score: number; raidsAttended: number }> => {
    if (!guildId || !guildSettings) return { score: 0, raidsAttended: 0 }

    const weeks = guildSettings.rolling_attendance_weeks || 4
    const daysAgo = weeks * 7
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - daysAgo)

    console.log('📊 [MasterSheet] calculateAttendance for character:', characterId, 'user:', userId)
    console.log('📊 [MasterSheet] Rolling weeks:', weeks, 'Period start:', periodStart.toISOString().split('T')[0])

    // New member policy: check how to handle new members
    const newMemberMode = guildSettings.new_member_mode || 'raw'
    let effectiveStartDate = periodStart
    let memberJoinDate: Date | null = null

    // For 'fair' and 'minimum_gate' modes, use join date filtering
    if ((newMemberMode === 'fair' || newMemberMode === 'minimum_gate') && characterId) {
      const { data: membership } = await supabase
        .from('character_guild_memberships')
        .select('joined_at')
        .eq('character_id', characterId)
        .eq('guild_id', guildId)
        .single()

      if (membership?.joined_at) {
        memberJoinDate = new Date(membership.joined_at)
        // Use the later of periodStart or joinedAt
        if (memberJoinDate > periodStart) {
          effectiveStartDate = memberJoinDate
          console.log('📊 [MasterSheet] New member (' + newMemberMode + ' mode) - using join date:', membership.joined_at)
        }
      }
    }

    const periodStartStr = effectiveStartDate.toISOString().split('T')[0]
    console.log('📊 [MasterSheet] New member mode:', newMemberMode, 'Effective period start:', periodStartStr)

    // Get expansion's raid day configuration
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

    console.log('📊 [MasterSheet] Configured raid days:', raidDays)

    const { data: recentRaids, error: raidError } = await supabase
      .from('raid_events')
      .select('id, raid_date')
      .eq('guild_id', guildId)
      .gte('raid_date', periodStartStr)

    console.log('📊 [MasterSheet] Recent raids found:', recentRaids?.length, 'Error:', raidError)

    if (!recentRaids || recentRaids.length === 0) return { score: 0, raidsAttended: 0 }

    // Filter to only raids on configured raid days
    type RaidEventRecord = { id: string; raid_date: string }
    const filteredRaids = raidDays.length > 0
      ? recentRaids.filter((event: RaidEventRecord) => {
          const eventDate = new Date(event.raid_date + 'T00:00:00')
          return raidDays.includes(eventDate.getDay())
        })
      : recentRaids

    console.log('📊 [MasterSheet] Filtered to', filteredRaids.length, 'raids on configured days')

    if (filteredRaids.length === 0) return { score: 0, raidsAttended: 0 }

    const raidIds = filteredRaids.map((r: RaidEventRecord) => r.id)

    // Check which raid IDs have attendance for this character
    let raidIdsWithAttendance = new Set<string>()
    if (characterId) {
      const { data: existingAttendance } = await supabase
        .from('attendance_records')
        .select('raid_event_id')
        .eq('character_id', characterId)
        .in('raid_event_id', raidIds)
      raidIdsWithAttendance = new Set(existingAttendance?.map((r: { raid_event_id: string }) => r.raid_event_id) || [])
    }

    // Deduplicate by date, preferring IDs that have attendance records
    // This handles the case where there are duplicate raid events for the same date
    const deduplicatedRaidEvents: RaidEventRecord[] = Array.from(
      filteredRaids.reduce((map: Map<string, RaidEventRecord>, event: RaidEventRecord) => {
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
    const deduplicatedRaidIds = deduplicatedRaidEvents.map((r: RaidEventRecord) => r.id)

    console.log('📊 [MasterSheet] Deduplicated to', totalRaids, 'raids')

    // Try character-based attendance first, fall back to user-based
    let records
    if (characterId) {
      const { data } = await supabase
        .from('attendance_records')
        .select('signed_up, attended, no_call_no_show')
        .eq('character_id', characterId)
        .in('raid_event_id', deduplicatedRaidIds)
      records = data
    }

    // Fall back to user-based if no character records found
    if (!records || records.length === 0) {
      const { data } = await supabase
        .from('attendance_records')
        .select('signed_up, attended, no_call_no_show')
        .eq('user_id', userId)
        .in('raid_event_id', deduplicatedRaidIds)
      records = data
    }

    if (!records || records.length === 0) {
      console.log('📊 [MasterSheet] No attendance records found for character:', characterId)
      return { score: 0, raidsAttended: 0 }
    }

    const score = calculateAttendanceScore(records, totalRaids, guildSettings)
    // Count how many raids this character actually attended
    const raidsAttended = records.filter((r: { attended: boolean }) => r.attended).length
    console.log('📊 [MasterSheet] Attendance score for', characterId, ':', score, '(records:', records.length, 'totalRaids:', totalRaids, 'raidsAttended:', raidsAttended, ')')
    return { score, raidsAttended }
  }

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      // Wait for guild context to load
      if (guildLoading) {
        return
      }

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/')
        return
      }

      setUser(user)

      if (!activeGuild) {
        setInitialLoading(false)
        return
      }

      if (!activeCharacter) {
        setInitialLoading(false)
        return
      }

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
      if (activeGuild?.active_expansion_id) {
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

        // Only filter to active tiers for non-officers
        if (!isOfficer) {
          tiersQuery = tiersQuery.eq('is_guild_active', true)
        }

        const { data: tiersData } = await tiersQuery

        if (tiersData && tiersData.length > 0) {
          // Transform data to ensure expansion is a single object (Supabase returns it as array)
          const transformedData = tiersData.map((tier: any) => ({
            ...tier,
            expansion: Array.isArray(tier.expansion) ? tier.expansion[0] : tier.expansion
          }))

          // Sort by Classic raid progression order
          const sortedTiers = transformedData.sort((a: any, b: any) => {
            return getRaidTierOrder(a.name) - getRaidTierOrder(b.name)
          })

          setRaidTiers(sortedTiers)

          // Extract unique phases from tiers
          const uniquePhases = [...new Set(sortedTiers.map((t: any) => t.phase).filter((p: number | null) => p !== null))] as number[]
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
              const activeTierPhase = sortedTiers.find((t: any) => t.is_active)?.phase
              setSelectedPhase(activeTierPhase ?? uniquePhases[0])
            }
          }
        }
      }

      setInitialLoading(false)
    }

    loadData()
  }, [guildLoading, activeGuild, activeCharacter, isOfficer])

  // Get tiers for the currently selected phase (memoized to prevent infinite loops)
  const phaseTiers = useMemo(() => {
    return raidTiers.filter(t => t.phase === selectedPhase)
  }, [raidTiers, selectedPhase])

  // Update master sheet visibility when selected phase changes
  // Master sheet is visible if ANY tier in the phase has it visible
  useEffect(() => {
    if (phaseTiers.length > 0) {
      const anyVisible = phaseTiers.some((t: any) => t.master_sheet_visible)
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
      if (!masterSheetVisible && !isOfficer) {
        setAllItemRankings([])
        setContentLoading(false)
        return
      }

      setContentLoading(true)

      try {
        // Get all loot items for all active tiers in this phase
        const { data: itemsData } = await supabase
          .from('loot_items')
          .select('id, name, boss_name, item_slot, wowhead_id, raid_tier_id')
          .in('raid_tier_id', activeTierIds)
          .eq('is_available', true)
          .order('boss_name')
          .order('name')

        if (!itemsData || itemsData.length === 0) {
          setAllItemRankings([])
          setContentLoading(false)
          return
        }

        // Get all ranking submissions for all items at once
        const itemIds = itemsData.map((i: { id: string }) => i.id)
        const { data: allRankingsData, error: rankingsError } = await supabase
          .from('loot_submission_items')
          .select('rank, slot, submission_id, loot_item_id')
          .in('loot_item_id', itemIds)

        if (rankingsError) {
          console.error('Error loading rankings:', rankingsError)
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
            character_guild_memberships!inner(role, membership_status)
          `)
          .in('id', characterIds)
          .eq('character_guild_memberships.guild_id', activeGuild!.id)

        if (charError) {
          console.error('Error loading characters:', charError)
          setAllItemRankings(itemsData.map((item: LootItem) => ({ item, rankings: [] })))
          setContentLoading(false)
          return
        }

        // Load item priorities for all tiers in this phase
        let prioritiesMap: Record<string, ItemPriority> = {}
        try {
          for (const tierId of activeTierIds) {
            const prioResponse = await fetch(
              `/api/prio-list?guild_id=${guildId}&raid_tier_id=${tierId}`
            )
            if (prioResponse.ok) {
              const prioData = await prioResponse.json()
              for (const prio of prioData.priorities || []) {
                prioritiesMap[prio.item_id] = prio
              }
            }
          }
        } catch (err) {
          console.error('Error loading item priorities:', err)
        }
        setItemPriorities(prioritiesMap)

        // Load loot history to filter out characters who already received items
        const { data: lootHistoryData } = await supabase
          .from('loot_history')
          .select('character_id, loot_item_id')
          .eq('guild_id', guildId)
          .in('loot_item_id', itemIds)

        // Create a Set of "characterId-itemId" pairs for fast lookup
        const receivedItemsSet = new Set<string>(
          (lootHistoryData || []).map((h: { character_id: string; loot_item_id: string }) => `${h.character_id}-${h.loot_item_id}`)
        )

        // Pre-calculate attendance for all characters in parallel
        type CharacterData = { id: string; user_id: string; name: string | null; spec_id: string | null }
        const attendanceCache: Record<string, { score: number; raidsAttended: number }> = {}
        const attendancePromises = (charactersData || []).map(async (character: CharacterData) => {
          const attendance = await calculateAttendance(character.user_id, character.id)
          return { id: character.id, attendance }
        })
        const attendanceResults = await Promise.all(attendancePromises)
        attendanceResults.forEach(({ id, attendance }) => {
          attendanceCache[id] = attendance
        })

        // Determine minimum raids required for eligibility
        const minimumRaidDays = guildSettings.minimum_raid_days || 2
        const isMinimumGateMode = guildSettings.new_member_mode === 'minimum_gate'

        // Build rankings for each item
        type SubmissionData = { id: string; status: string; character_id: string | null }
        type RankingData = { rank: number; slot: number; submission_id: string; loot_item_id: string }
        const itemRankingsMap: Record<string, ItemRankings> = {}

        for (const item of itemsData) {
          const itemRankingsData = allRankingsData.filter((r: RankingData) => r.loot_item_id === item.id)
          const rankings: PlayerRanking[] = []

          for (const r of itemRankingsData) {
            const sub = subsData.find((s: SubmissionData) => s.id === r.submission_id)
            if (!sub) continue

            const character = charactersData?.find((c: CharacterData) => c.id === sub.character_id)
            if (!character) continue

            // Skip if character has already received this item
            if (receivedItemsSet.has(`${character.id}-${item.id}`)) continue

            const attendanceData = attendanceCache[character.id] || { score: 0, raidsAttended: 0 }
            const attendance = attendanceData.score
            const raidsAttended = attendanceData.raidsAttended
            const characterRole = (character as any).character_guild_memberships?.[0]?.role || 'Member'
            const roleModifier = getRankModifier(characterRole, guildSettings)

            // Calculate priority bonus
            const itemPriority = prioritiesMap[item.id]
            const specId = (character as any).spec_id || null
            const specName = (character as any).spec?.name || null
            const className = (character.class as any)?.name || null

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

            const badLuckBonus = 0 // TODO: implement bad luck tracking

            // Get membership status and calculate trial penalty
            const membershipStatus = (character as any).character_guild_memberships?.[0]?.membership_status || 'full'
            const trialPenalty = getTrialPenalty(membershipStatus, guildSettings)
            const isTrial = membershipStatus === 'trial'

            const lootScore = calculateLootScore(r.rank, attendance, roleModifier, badLuckBonus, priorityBonus, trialPenalty)

            // Determine eligibility based on minimum_gate mode
            const isEligible = !isMinimumGateMode || raidsAttended >= minimumRaidDays

            rankings.push({
              player_name: character.name || 'Unknown',
              class_name: (character.class as any)?.name || 'Unknown',
              class_color: (character.class as any)?.color_hex || '#888888',
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
        setAllItemRankings([])
      }

      setContentLoading(false)
    }

    loadAllRankings()
  }, [selectedPhase, phaseTiers, guildId, guildSettings, masterSheetVisible, isOfficer])

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
          .select('id, name, boss_name, item_slot, wowhead_id, classification, raid_tier_id')
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
        type AggregateCharacter = { id: string; name: string | null }
        for (const si of submissionItemsData) {
          if (!approvedSubmissionIds.has(si.submission_id)) continue

          const submission = submissionsData.find((s: AggregateSubmission) => s.id === si.submission_id)
          if (!submission) continue

          const character = charactersData?.find((c: AggregateCharacter) => c.id === submission.character_id)
          if (!character) continue

          const aggregate = aggregateMap[si.loot_item_id]
          if (!aggregate) continue

          aggregate.players.push({
            character_id: character.id,
            character_name: character.name || 'Unknown',
            class_name: (character.class as any)?.name || 'Unknown',
            class_color: (character.class as any)?.color_hex || '#888888',
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
        grouped[tierId] = { tier: tier || { id: tierId, name: 'Unknown', phase: 0 }, items: [] }
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

  // Generate Gargul DFT export format from rankings data (memoized callback)
  const formatRankingsForGargul = useCallback((rankings: ItemRankings[]): string => {
    return rankings.map(ir => {
      const itemId = ir.item.wowhead_id

      if (ir.rankings.length === 0) {
        return `"${itemId}^DFTFC Priority:\nFree Roll;"`
      }

      const playerLines = ir.rankings.map(r => {
        // Convert #RRGGBB to RRGGBB (strip #)
        const colorHex = r.class_color.replace('#', '')
        return `|cff${colorHex}${r.player_name}|r: ${r.loot_score.toFixed(guildSettings?.decimal_places ?? 2)}`
      }).join('\n')

      return `"${itemId}^DFTFC Priority:\n${playerLines};"`
    }).join('\n')
  }, [guildSettings?.decimal_places])

  // Fetch rankings for a single tier
  const fetchTierRankings = async (tierId: string): Promise<ItemRankings[]> => {
    if (!guildId || !guildSettings || !activeGuild) return []

    // Get all loot items for this tier
    const { data: itemsData } = await supabase
      .from('loot_items')
      .select('id, name, boss_name, item_slot, wowhead_id')
      .eq('raid_tier_id', tierId)
      .eq('is_available', true)
      .order('boss_name')
      .order('name')

    if (!itemsData || itemsData.length === 0) return []

    // Get all ranking submissions for all items at once
    type TierLootItem = { id: string; name: string; boss_name: string; item_slot: string; wowhead_id: number }
    const itemIds = itemsData.map((i: TierLootItem) => i.id)
    const { data: allRankingsData } = await supabase
      .from('loot_submission_items')
      .select('rank, slot, submission_id, loot_item_id')
      .in('loot_item_id', itemIds)

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
        character_guild_memberships!inner(role, membership_status)
      `)
      .in('id', characterIds)
      .eq('character_guild_memberships.guild_id', activeGuild.id)

    if (!charactersData) {
      return itemsData.map((item: TierLootItem) => ({ item, rankings: [] }))
    }

    // Load item priorities for this tier
    let prioritiesMap: Record<string, ItemPriority> = {}
    try {
      const prioResponse = await fetch(
        `/api/prio-list?guild_id=${guildId}&raid_tier_id=${tierId}`
      )
      if (prioResponse.ok) {
        const prioData = await prioResponse.json()
        for (const prio of prioData.priorities || []) {
          prioritiesMap[prio.item_id] = prio
        }
      }
    } catch (err) {
      console.error('Error loading item priorities:', err)
    }

    // Load loot history to filter out characters who already received items
    const { data: lootHistoryData } = await supabase
      .from('loot_history')
      .select('character_id, loot_item_id')
      .eq('guild_id', guildId)
      .in('loot_item_id', itemIds)

    const receivedItemsSet = new Set<string>(
      (lootHistoryData || []).map((h: { character_id: string; loot_item_id: string }) => `${h.character_id}-${h.loot_item_id}`)
    )

    // Pre-calculate attendance for all characters
    type TierCharacterData = { id: string; user_id: string; name: string | null; spec_id: string | null }
    const attendanceCache: Record<string, { score: number; raidsAttended: number }> = {}
    const attendancePromises = charactersData.map(async (character: TierCharacterData) => {
      const attendance = await calculateAttendance(character.user_id, character.id)
      return { id: character.id, attendance }
    })
    const attendanceResults = await Promise.all(attendancePromises)
    attendanceResults.forEach(({ id, attendance }) => {
      attendanceCache[id] = attendance
    })

    // Determine minimum raids required for eligibility
    const minimumRaidDays = guildSettings.minimum_raid_days || 2
    const isMinimumGateMode = guildSettings.new_member_mode === 'minimum_gate'

    // Build rankings for each item
    const results: ItemRankings[] = []

    for (const item of itemsData) {
      const itemRankingsData = allRankingsData.filter((r: TierRankingData) => r.loot_item_id === item.id)
      const rankings: PlayerRanking[] = []

      for (const r of itemRankingsData) {
        const sub = subsData.find((s: TierSubmissionData) => s.id === r.submission_id)
        if (!sub) continue

        const character = charactersData.find((c: TierCharacterData) => c.id === sub.character_id)
        if (!character) continue

        // Skip if character has already received this item
        if (receivedItemsSet.has(`${character.id}-${item.id}`)) continue

        const attendanceData = attendanceCache[character.id] || { score: 0, raidsAttended: 0 }
        const attendance = attendanceData.score
        const raidsAttended = attendanceData.raidsAttended
        const characterRole = (character as any).character_guild_memberships?.[0]?.role || 'Member'
        const roleModifier = getRankModifier(characterRole, guildSettings)

        // Calculate priority bonus
        const itemPriority = prioritiesMap[item.id]
        const specId = (character as any).spec_id || null
        const specName = (character as any).spec?.name || null
        const className = (character.class as any)?.name || null

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

        const badLuckBonus = 0 // TODO: implement bad luck tracking

        // Calculate trial penalty
        const membershipStatus = (character as any).character_guild_memberships?.[0]?.membership_status || 'full'
        const trialPenalty = getTrialPenalty(membershipStatus, guildSettings)
        const isTrial = membershipStatus === 'trial'

        const lootScore = calculateLootScore(r.rank, attendance, roleModifier, badLuckBonus, priorityBonus, trialPenalty)

        // Determine eligibility based on minimum_gate mode
        const isEligible = !isMinimumGateMode || raidsAttended >= minimumRaidDays

        rankings.push({
          player_name: character.name || 'Unknown',
          class_name: (character.class as any)?.name || 'Unknown',
          class_color: (character.class as any)?.color_hex || '#888888',
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
      showNotification('error', 'Unable to export - missing data')
      return
    }

    setIsExporting(true)

    try {
      // Fetch rankings for all active raid tiers
      const allTiersRankings: ItemRankings[] = []

      for (const tier of raidTiers) {
        const tierRankings = await fetchTierRankings(tier.id)
        allTiersRankings.push(...tierRankings)
      }

      const exportData = formatRankingsForGargul(allTiersRankings)
      await navigator.clipboard.writeText(exportData)
      showNotification('success', `Exported ${allTiersRankings.length} items from ${raidTiers.length} raid tiers to clipboard`)
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
                  : 'Top 5 players for each item'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowScoreBreakdown(true)}
              >
                <HugeiconsIcon icon={InformationCircleIcon} size={18} />
                <span className="hidden sm:inline">How Scores Work</span>
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
                variant="secondary"
                size="sm"
                onClick={expandAll}
              >
                Expand
              </Button>
              <Button
                variant="secondary"
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
                      variant="secondary"
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
                  variant="secondary"
                  size="sm"
                  onClick={expandAll}
                >
                  Expand All
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={collapseAll}
                >
                  Collapse All
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
        <>
        {/* Master Sheet Hidden Warning */}
        {!masterSheetVisible && !isOfficer ? (
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
                title="No loot items found"
                description="No items found for this raid tier"
                variant="card"
              />
            ) : (
          <div className="space-y-4">
            {sortedRaidTiers.map(({ tier, items: tierItems }) => {
              const isRaidTierCollapsed = collapsedRaidTiers.has(tier.id)

              // Group items by boss within this tier
              const tierGroupedByBoss: Record<string, ItemRankings[]> = {}
              tierItems.forEach(ir => {
                const boss = normalizeBossName(ir.item.boss_name)
                if (!tierGroupedByBoss[boss]) {
                  tierGroupedByBoss[boss] = []
                }
                tierGroupedByBoss[boss].push(ir)
              })

              const tierBossNames = Object.keys(tierGroupedByBoss).sort((a, b) => getBossOrder(a) - getBossOrder(b))

              return (
                <div key={tier.id} className="space-y-3">
                  {/* Raid Tier Header Bar */}
                  <button
                    onClick={() => toggleRaidTierCollapse(tier.id)}
                    className="w-full text-left px-5 py-3 rounded-xl transition-colors bg-background-subtle border border-border hover:bg-muted"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={getRaidIcon(tier.name)}
                          alt=""
                          className="w-6 h-6 rounded border border-border/50"
                        />
                        <span className="text-[15px] font-semibold text-foreground">{tier.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[12px] text-muted-foreground">
                          {tierItems.length} item{tierItems.length !== 1 ? 's' : ''}
                        </span>
                        <svg
                          className={`w-4 h-4 text-muted-foreground transition-transform ${isRaidTierCollapsed ? '' : 'rotate-90'}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Bosses within this raid tier */}
                  {!isRaidTierCollapsed && (
                    <div className="space-y-3">
                      {tierBossNames.map((boss) => {
                        const items = tierGroupedByBoss[boss]
                        const isCollapsed = collapsedBosses.has(boss)
                        return (
                          <div
                            key={boss}
                            id={`boss-${boss.replace(/\s+/g, '-')}`}
                            className="bg-background-elevated border border-border rounded-xl overflow-hidden scroll-mt-[140px]"
                          >
                            {/* Boss Header - Clickable */}
                            <Button
                              variant="ghost"
                              onClick={() => toggleBossCollapse(boss)}
                              className="w-full px-5 py-3 flex items-center justify-between hover:bg-muted transition-colors !rounded-none"
                            >
                              <div className="flex items-center gap-3">
                                {getBossImage(boss) && (
                                  <img
                                    src={getBossImage(boss)!}
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

                            {/* Items Table - Collapsible */}
                            {!isCollapsed && (
                              <div className="border-t border-border overflow-x-auto">
                                <table className="w-full min-w-[800px]">
                                  <thead>
                                    <tr className="bg-background-subtle">
                                      <th className="px-5 py-2.5 text-left text-[12px] font-medium text-foreground-muted w-[280px]">Item</th>
                                      <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted w-[100px]">Slot</th>
                                      <th className="px-3 py-2.5 text-center text-[12px] font-medium text-foreground-muted w-[120px]">#1</th>
                                      <th className="px-3 py-2.5 text-center text-[12px] font-medium text-foreground-muted w-[120px]">#2</th>
                                      <th className="px-3 py-2.5 text-center text-[12px] font-medium text-foreground-muted w-[120px]">#3</th>
                                      <th className="px-3 py-2.5 text-center text-[12px] font-medium text-foreground-muted w-[120px]">#4</th>
                                      <th className="px-3 py-2.5 text-center text-[12px] font-medium text-foreground-muted w-[120px]">#5</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border">
                                    {items.map((ir) => (
                                      <tr
                                        key={ir.item.id}
                                        id={`item-${ir.item.id}`}
                                        className={`transition-all hover:bg-muted ${ir.rankings.length === 0 ? 'bg-destructive/10' : ''}`}
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
                                        {[0, 1, 2, 3, 4].map((index) => {
                                          const ranking = ir.rankings[index]
                                          const isCurrentUser = ranking && activeCharacter?.id === ranking.character_id
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
                                                  onClick={canCompare ? () => {
                                                    setComparisonData({
                                                      itemName: ir.item.name,
                                                      userRanking: ranking,
                                                      winnerRanking: ir.rankings[0],
                                                    })
                                                    setShowScoreComparison(true)
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
                                                      <span className="text-destructive text-[10px] ml-0.5" title={`Ineligible: ${ranking.raids_attended}/${guildSettings?.minimum_raid_days || 2} raids attended`}>⊘</span>
                                                    )}
                                                  </span>
                                                  <span className="text-[11px] text-foreground-muted">
                                                    {ranking.loot_score.toFixed(guildSettings?.decimal_places ?? 2)}
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
                                        })}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
            )}
            </>
            )}
          </>
        )}
        </>
        )}

        {/* Legend (rankings view only) */}
        {viewMode === 'rankings' && (
        <div className="bg-background-elevated border border-border rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-foreground-muted text-[12px]">
              Scores = item rank + attendance + role modifiers + priority bonuses + trial penalty. Ties go to roll. <span className="text-yellow-400">(T)</span> = Trial member.{guildSettings?.new_member_mode === 'minimum_gate' && <> <span className="text-red-400">⊘</span> = Ineligible (needs {guildSettings?.minimum_raid_days || 2}+ raids).</>}
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
