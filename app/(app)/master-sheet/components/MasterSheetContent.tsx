'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { paginatedSelect } from '@/utils/supabase/paginate'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { computeScore, computeAttendance, resolveAttendanceWindow, type ItemPriority, type AttendanceResult } from '@/domain/scoring'
import { calculateDonationsBatch } from '@/lib/donations/batch'
import { getSpecRoles } from '@/domain/loot/spec-role-mapping'
import { formatRankingsForGargul } from '@/domain/loot/gargul-dft'
import { applyGlobalReceiveSkip } from '@/domain/loot/apply-receive-skip'
import { buildTeamVisibility } from '@/domain/loot/apply-team-filter'
import { getBossOrder, normalizeBossName } from '@/utils/bossOrder'
import { getBossImage } from '@/utils/bossImages'
import { getRaidIcon, getRaidShorthand } from '@/utils/raidIcons'
import { resolvePhaseGroups, getPhaseGroupShortLabel, type PhaseGroup } from '@/domain/expansion/phase-groups'
import { toDateString } from '@/utils/date'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { ExpansionGuard } from '@/app/components/ExpansionGuard'
import { TierTabsSkeleton, MasterSheetContentSkeleton, Skeleton } from '@/components/ui/skeletons'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { HugeiconsIcon } from '@hugeicons/react'
import { ScrollIcon, ArrowUpRight01Icon, InformationCircleIcon } from '@hugeicons/core-free-icons'
import { HorizontalScroll } from '@/components/ui/horizontal-scroll'
import { Heading } from '@/components/ui/typography'
import type { LootListAggregateItem } from '@/app/components/LootListSummaryView'

const ScoreBreakdownModal = dynamic(() => import('@/app/components/ScoreBreakdownModal'), { loading: () => null })
const ScoreComparisonModal = dynamic(() => import('@/app/components/ScoreComparisonModal'), { loading: () => null })
const LootListSummaryView = dynamic(() => import('@/app/components/LootListSummaryView'), { loading: () => null })
import { refreshWowheadTooltips } from '@/lib/wowhead'
import { trackClientEvent, usePagePerf } from '@/utils/analytics/client'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { VirtualizedMasterSheet } from './VirtualizedMasterSheet'
const ItemCandidateModal = dynamic(() => import('./ItemCandidateModal').then(mod => ({ default: mod.ItemCandidateModal })), { loading: () => null })
import { RaidModeView } from './RaidModeView'
import type { PlayerRanking, LootItem as BossLootItem } from './BossSection'
import { useRaidTeam } from '@/app/hooks/useRaidTeam'
import { resolveRaidDays } from '@/domain/raid-team/settings'
import { TeamSelector } from '@/app/components/TeamSelector'

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


interface MasterSheetContentProps {
  // Server-rendered heading from page.tsx. Acts as the LCP target until the
  // tier data loads and the dynamic phase/tier-shorthand heading takes over.
  serverHeading?: React.ReactNode
}

export default function MasterSheetContent({ serverHeading }: MasterSheetContentProps = {}) {
  const { activeGuild, activeCharacter, loading: guildLoading, hasPermission } = useGuildContext()
  const canManageLoot = hasPermission('manage_loot')
  // Granular permission for trusted non-officers to bypass the per-tier
  // master_sheet_visible = false gate (GH #45). Doesn't grant officer
  // actions — only viewing.
  const canViewMasterSheet = hasPermission('view_master_sheet')
  const { showNotification } = useNotification()
  const router = useRouter()
  const [allItemRankings, setAllItemRankings] = useState<ItemRankings[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(true)
  const [contentReady, setContentReady] = useState(false)
  const [guildId, setGuildId] = useState<string | null>(null)
  const [member, setMember] = useState<MemberInfo | null>(null)
  const [guildSettings, setGuildSettings] = useState<GuildSettings | null>(null)
  const [raidTiers, setRaidTiers] = useState<RaidTier[]>([])
  const [phases, setPhases] = useState<number[]>([])
  const [resolvedGroups, setResolvedGroups] = useState<PhaseGroup[]>([])
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null)
  const [masterSheetVisible, setMasterSheetVisible] = useState<boolean>(false)
  // Phases this character has an approved submission for. The gate is
  // per-phase, not per-expansion (GH #202) — an approved P1 list must not
  // unlock the P3 rankings.
  const [approvedPhases, setApprovedPhases] = useState<Set<number>>(new Set())
  const [itemPriorities, setItemPriorities] = useState<Record<string, ItemPriority>>({})
  const [collapsedBosses, setCollapsedBosses] = useState<Set<string>>(new Set())
  const [collapsedRaidTiers, setCollapsedRaidTiers] = useState<Set<string>>(new Set())
  const [mostRecentRaidEventId, setMostRecentRaidEventId] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false)
  const [showScoreComparison, setShowScoreComparison] = useState(false)
  const [comparisonData, setComparisonData] = useState<{
    itemName: string
    userRanking: PlayerRanking | null
    winnerRanking: PlayerRanking | null
  }>({ itemName: '', userRanking: null, winnerRanking: null })
  // Officer aggregate view state
  const [viewMode, setViewMode] = useState<'rankings' | 'aggregate' | 'raid'>('rankings')
  const [aggregateItems, setAggregateItems] = useState<LootListAggregateItem[]>([])
  const [aggregateLoading, setAggregateLoading] = useState(false)
  const [aggregateBossFilter, setAggregateBossFilter] = useState<string | null>(null)
  // Loot history: character_id-wowhead_id -> count of times received
  const [lootReceivedCounts, setLootReceivedCounts] = useState<Map<string, number>>(new Map())

  const supabase = createClient()
  const searchParams = useSearchParams()
  const scrollPendingRef = useRef<string | null>(null)
  const { activeTeamId, activeTeam, teams, hasTeams, setTeam } = useRaidTeam()

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Loot Rankings'
    trackClientEvent('master_sheet_viewed')
  }, [])
  usePagePerf('master_sheet', !contentReady)

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
  // Bulk-fetches data (4 queries), then uses computeAttendance() per character
  const calculateAttendanceBatch = async (
    characters: Array<{ id: string; user_id: string }>
  ): Promise<Record<string, AttendanceResult>> => {
    if (!guildId || !guildSettings || characters.length === 0) {
      return {}
    }

    const characterIds = characters.map(c => c.id)
    const newMemberMode = (guildSettings.new_member_mode || 'raw') as 'raw' | 'fair' | 'minimum_gate'

    // Query 1: Fetch ALL memberships in one query (for join dates in fair/minimum_gate modes)
    const membershipsByCharacter = new Map<string, { joined_at: string | null }>()
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

    // Query 2: Fetch expansion raid day config ONCE, resolve with team overrides
    const raidDaySource = activeGuild?.active_expansion_id
      ? (await supabase
          .from('expansions')
          .select('raid_start_date, raid_days_per_week, first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day')
          .eq('id', activeGuild.active_expansion_id)
          .single()).data
      : null
    const raidStartDate: string | null = (raidDaySource as { raid_start_date?: string | null } | null)?.raid_start_date || null

    const baseSettings = {
      raid_days_per_week: (raidDaySource || guildSettings).raid_days_per_week || 2,
      first_raid_day: (raidDaySource || guildSettings).first_raid_day ?? null,
      second_raid_day: (raidDaySource || guildSettings).second_raid_day ?? null,
      third_raid_day: (raidDaySource || guildSettings).third_raid_day ?? null,
      fourth_raid_day: (raidDaySource || guildSettings).fourth_raid_day ?? null,
      fifth_raid_day: (raidDaySource || guildSettings).fifth_raid_day ?? null,
    }
    // Apply team raid day overrides if a team is selected
    const raidDays = resolveRaidDays(baseSettings, activeTeam?.raid_days_override)
    const raidDaysPerWeek = raidDays.length || baseSettings.raid_days_per_week
    // Weekly attendance cap: clamp guild minimum to this team's effective raid days
    const weeklyMin = (guildSettings as { weekly_attendance_minimum?: number | null }).weekly_attendance_minimum
    const weeklyCap = activeTeamId
      ? Math.min(weeklyMin ?? raidDaysPerWeek, raidDaysPerWeek)
      : undefined

    // Query 3: Fetch raid events — team+unassigned for denominator.
    //
    // Use the engine's window start (last completed reset week minus N weeks)
    // instead of the naive `today - N*7`. The naive version drops events
    // between the engine's actual windowStart and `today - N*7` — events
    // that the engine considers in-window but never received as input. The
    // result was attendance scores in the master sheet computing on a
    // subset of the raids the engine should have seen, producing bonuses
    // that didn't match the dashboard. GH #96.
    const todayStr = toDateString(new Date())
    const resetDay = (guildSettings as { week_reset_day?: number | null }).week_reset_day ?? null
    // One resolution for both the query bound and the engine config — see
    // resolveAttendanceWindow. Passing the guild's rolling_attendance_weeks to
    // the engine while bounding the query by a team override made the engine
    // score a wider window than we fetched (and read 0 of 0 at an override
    // of 0).
    const { rollingWeeks: weeks, fetchStart: periodStartStr } = resolveAttendanceWindow({
      guildRollingWeeks: guildSettings.rolling_attendance_weeks,
      teamRollingWeeksOverride: activeTeam?.rolling_weeks_override,
      asOfDate: todayStr,
      weekResetDay: resetDay,
    })

    let raidEventsQuery = supabase
      .from('raid_events')
      .select('id, raid_date, is_bonus, raid_team_id')
      .eq('guild_id', guildId)
      .eq('is_skipped', false)
      .gte('raid_date', periodStartStr)
      .lte('raid_date', todayStr)
    if (activeTeamId) {
      raidEventsQuery = raidEventsQuery.or(`raid_team_id.eq.${activeTeamId},raid_team_id.is.null`)
    }
    const { data: recentRaids } = await raidEventsQuery

    if (!recentRaids || recentRaids.length === 0) {
      return Object.fromEntries(characterIds.map(id => [id, { score: 0, raidsAttended: 0, raidsInWindow: 0, isEligible: true }]))
    }

    // Track most recent raid event for award attribution
    const sorted = [...recentRaids].sort((a: { raid_date: string }, b: { raid_date: string }) => b.raid_date.localeCompare(a.raid_date))
    if (sorted.length > 0) setMostRecentRaidEventId(sorted[0].id)

    const raidIds = recentRaids.map((r: { id: string }) => r.id)

    // Query 4: Fetch ALL attendance records for ALL characters in ONE query.
    // Paginated because characterIds × raidIds easily exceeds the 1000-row
    // PostgREST cap (e.g. 40 raiders × 28 raids in a 4-week window = 1,120).
    // Silent truncation here corrupts the scores shown on the master sheet.
    type RawAttendanceRecord = {
      character_id: string | null
      user_id: string | null
      raid_event_id: string
      signed_up: boolean
      attended: boolean
      no_call_no_show: boolean
      was_late: boolean
      was_benched: boolean
      is_excused: boolean
      points_override: number | null
    }
    const allAttendanceRecords = await paginatedSelect<RawAttendanceRecord>((start, end) =>
      supabase
        .from('attendance_records')
        .select('character_id, user_id, raid_event_id, signed_up, attended, no_call_no_show, was_late, was_benched, is_excused, points_override')
        .in('character_id', characterIds)
        .in('raid_event_id', raidIds)
        .order('id', { ascending: true })
        .range(start, end)
    )

    // Query 4b: Raid team membership per character — drives team-aware scoring
    const { data: teamMembers } = await supabase
      .from('raid_team_members')
      .select('character_id, raid_team_id')
      .eq('guild_id', guildId)
      .in('character_id', characterIds)
    const teamIdByCharacterId = new Map<string, string>()
    for (const m of teamMembers ?? []) teamIdByCharacterId.set(m.character_id, m.raid_team_id)

    // Build lookup: character_id -> attendance records
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

    // Fill-in credit: fetch all guild attendance for fill-in detection (team mode only)
    const fillInEventMap = new Map<string, { id: string; raid_date: string }>()
    const fillInRecordsByChar: Record<string, { raid_event_id: string; attended: boolean }[]> = {}
    if (activeTeamId) {
      // Paginated — same truncation risk as Query 4 above (and on a guild with
      // long history, this set is even bigger because there's no event-id filter).
      const allGuildAtt = await paginatedSelect<{
        raid_event_id: string
        character_id: string | null
        attended: boolean
      }>((start, end) =>
        supabase
          .from('attendance_records')
          .select('raid_event_id, character_id, attended')
          .in('character_id', characterIds)
          .eq('attended', true)
          .order('id', { ascending: true })
          .range(start, end)
      )
      const teamEventIdSet = new Set(raidIds)
      const otherEventIds = new Set<string>()
      for (const rec of (allGuildAtt || [])) {
        if (rec.character_id && !teamEventIdSet.has(rec.raid_event_id)) {
          otherEventIds.add(rec.raid_event_id)
          if (!fillInRecordsByChar[rec.character_id]) fillInRecordsByChar[rec.character_id] = []
          fillInRecordsByChar[rec.character_id].push({ raid_event_id: rec.raid_event_id, attended: true })
        }
      }
      if (otherEventIds.size > 0) {
        const { data: fillInEventData } = await supabase
          .from('raid_events')
          .select('id, raid_date')
          .in('id', Array.from(otherEventIds))
          .eq('is_skipped', false)
        for (const e of (fillInEventData || [])) {
          fillInEventMap.set(e.id, e)
        }
      }
    }

    // Compute attendance per character using the engine
    const results: Record<string, AttendanceResult> = {}

    for (const character of characters) {
      const membership = membershipsByCharacter.get(character.id)
      const characterRecords = attendanceByCharacter.get(character.id) || []

      const charFillInRecords = fillInRecordsByChar[character.id] || []
      const charFillInEvents = charFillInRecords
        .map(r => fillInEventMap.get(r.raid_event_id))
        .filter(Boolean) as { id: string; raid_date: string }[]

      const result = computeAttendance({
        records: characterRecords,
        raidEvents: recentRaids,
        config: { ...guildSettings, rolling_attendance_weeks: weeks },
        raidDays,
        memberJoinedAt: membership?.joined_at ? toDateString(new Date(membership.joined_at)) : undefined,
        newMemberMode,
        asOfDate: todayStr,
        raidStartDate: raidStartDate || undefined,
        fillInEvents: charFillInEvents.length > 0 ? charFillInEvents : undefined,
        fillInRecords: charFillInRecords.length > 0 ? charFillInRecords : undefined,
        weeklyAttendanceCap: weeklyCap,
        weekResetDay: (guildSettings as { week_reset_day?: number | null }).week_reset_day ?? undefined,
        raiderTeamId: teamIdByCharacterId.get(character.id) ?? null,
      })

      results[character.id] = result
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

        // Kick off the three independent initial-load queries in parallel.
        // Previously these ran sequentially along with the raid_tiers query
        // (4 round-trips, ~800ms). Now only raid_tiers waits — it needs the
        // expansion's current_phase to filter, so it runs in a second batch.
        const expansionId = activeGuild?.active_expansion_id
        const [
          { data: settingsData },
          { data: expansionData },
          approvedSubsResult,
        ] = await Promise.all([
          supabase
            .from('guild_settings')
            .select('*')
            .eq('guild_id', activeGuild.id)
            .single(),
          expansionId
            ? supabase
                .from('expansions')
                .select('current_phase, phase_groups')
                .eq('id', expansionId)
                .single()
            : Promise.resolve({ data: null as null | { current_phase: number | null; phase_groups: unknown } }),
          // Pre-fetch the approved phases so the gate doesn't block initial
          // render. Selects every approved phase rather than a bare existence
          // check: the gate is evaluated per selected phase (GH #202).
          // Officers bypass this entirely.
          !canManageLoot && activeCharacter?.id && expansionId
            ? supabase
                .from('loot_submissions')
                .select('phase')
                .eq('character_id', activeCharacter.id)
                .eq('guild_id', activeGuild.id)
                .eq('expansion_id', expansionId)
                .eq('status', 'approved')
            : Promise.resolve({ data: null as null | { phase: number | null }[] }),
        ])

        if (settingsData) {
          setGuildSettings(settingsData)
        }

        // Load raid tiers for active expansion (single join query)
        // Officers can see all tiers (including disabled ones), members only see active tiers
        // Filter by current_phase to only show unlocked phases
        let loadedTierIds: string[] = []
        if (expansionId) {
          const currentPhase = expansionData?.current_phase ?? 1
          const phaseGroupsConfig = (expansionData?.phase_groups as number[][] | null) || null

          const tiersQuery = supabase
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
            .eq('expansion.id', expansionId)
            .lte('phase', currentPhase)
            .eq('is_guild_active', true)

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

            // Extract unique phases from tiers and resolve groups
            const uniquePhases = [...new Set<number>(sortedTiers.map((t: RaidTier) => t.phase).filter((p: number | null): p is number => p !== null))]
            uniquePhases.sort((a, b) => a - b)
            setPhases(uniquePhases)

            // Resolve phase groups for this expansion
            const groups = resolvePhaseGroups(phaseGroupsConfig, uniquePhases)
            setResolvedGroups(groups)
            const canonicalPhases = groups.map(g => g.canonicalPhase)

            // Only set default phase if we don't have one selected yet
            if (selectedPhase === null && canonicalPhases.length > 0) {
              // Check if there's a phase in the query params first
              const phaseFromUrl = searchParams.get('phase')
              if (phaseFromUrl && canonicalPhases.includes(parseInt(phaseFromUrl))) {
                setSelectedPhase(parseInt(phaseFromUrl))
              } else {
                // Otherwise use phase with an active tier or first canonical phase
                const activeTierPhase = sortedTiers.find((t: RaidTier) => t.is_active)?.phase
                const activeTierCanonical = activeTierPhase != null
                  ? groups.find(g => g.phases.includes(activeTierPhase))?.canonicalPhase
                  : undefined
                setSelectedPhase(activeTierCanonical ?? canonicalPhases[0])
              }
            }
          }
        }

        // Wire up the approved-phase set from the parallel batch. Officers
        // bypass the gate entirely (see hasApprovedSubmission below).
        const approvedSubs = (approvedSubsResult as { data: { phase: number | null }[] | null }).data
        setApprovedPhases(
          new Set(
            (approvedSubs || [])
              .map(s => s.phase)
              .filter((p): p is number => p != null),
          ),
        )
      } catch (error) {
        console.error('Error loading master sheet data:', error)
      } finally {
        setInitialLoading(false)
      }
    }

    loadData().catch(console.error)
  }, [guildLoading, activeGuild, activeCharacter, canManageLoot])

  // Get tiers for the currently selected phase group (memoized to prevent infinite loops)
  const phaseTiers = useMemo(() => {
    const group = resolvedGroups.find(g => g.canonicalPhase === selectedPhase)
    if (!group) return raidTiers.filter(t => t.phase === selectedPhase)
    const phaseSet = new Set(group.phases)
    return raidTiers.filter(t => t.phase != null && phaseSet.has(t.phase))
  }, [raidTiers, selectedPhase, resolvedGroups])

  // Whether the raider has earned the right to see THIS phase's rankings.
  // Scoped to the selected phase group, so an approved list for an earlier
  // phase no longer unlocks a later one (GH #202). Merged phases share a
  // group, so an approved list for any phase in the group counts.
  const hasApprovedSubmission = useMemo(() => {
    if (canManageLoot) return true
    if (selectedPhase === null) return false
    const group = resolvedGroups.find(g => g.canonicalPhase === selectedPhase)
    const groupPhases = group ? group.phases : [selectedPhase]
    return groupPhases.some(p => approvedPhases.has(p))
  }, [canManageLoot, selectedPhase, resolvedGroups, approvedPhases])

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
        setContentLoading(false)
        return
      }

      // Only load rankings if master sheet is visible OR the user is an
      // officer OR the user has the view-hidden permission. Non-officers
      // without the permission still need an approved submission, to prevent
      // raiders from gaming the list by scoping out competitors before
      // submitting their own.
      if ((!masterSheetVisible || !hasApprovedSubmission) && !canManageLoot && !canViewMasterSheet) {
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

        // PERFORMANCE: Parallelize independent queries that only need itemIds.
        // Query 1 (visibility) routes through a service-role API because RLS on
        // `loot_submission_items` / `loot_submissions` / `characters` silently
        // drops rows when a CGM is inactive — that's caused master sheet
        // raiders to vanish multiple times. The API returns rankings +
        // approved submissions + characters + memberships in one trip.
        const visibilityPromise = (async (): Promise<{
          rankings: { rank: number; slot: number; submission_id: string; loot_item_id: string }[]
          submissions: { id: string; status: string; character_id: string | null }[]
          characters: CharacterWithRelations[]
          memberships: (CharacterGuildMembership & { character_id: string })[]
          error?: string
        }> => {
          try {
            const res = await fetch('/api/master-sheet/visibility', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ guild_id: guildId, item_ids: itemIds }),
            })
            if (!res.ok) {
              const body = await res.json().catch(() => ({}))
              return { rankings: [], submissions: [], characters: [], memberships: [], error: body.error || `HTTP ${res.status}` }
            }
            const payload = await res.json()
            return {
              rankings: payload.rankings || [],
              submissions: payload.submissions || [],
              characters: payload.characters || [],
              memberships: payload.memberships || [],
            }
          } catch (err) {
            return { rankings: [], submissions: [], characters: [], memberships: [], error: err instanceof Error ? err.message : 'unknown' }
          }
        })()

        const [
          visibility,
          lootHistoryResult,
          blpResult,
          prioritiesResults
        ] = await Promise.all([
          visibilityPromise,

          // Load loot history to filter out characters who already received items.
          // Match by wowhead_id (not loot_item_id) so awards from other tiers with the same physical item are caught.
          // Paginated + ordered to defeat Supabase's 1000-row cap — see utils/supabase/paginate.
          paginatedSelect<{ character_id: string; loot_item: { wowhead_id: number } | null }>((start, end) =>
            supabase
              .from('loot_history')
              .select('character_id, loot_item:loot_items(wowhead_id)')
              .eq('guild_id', guildId)
              .order('id', { ascending: true })
              .range(start, end)
          ).then(data => ({ data })),

          // BLP data (if enabled)
          guildSettings.blp_enabled
            ? fetch(`/api/blp?guild_id=${guildId}&item_ids=${itemIds.join(',')}`)
                .then(res => res.ok ? res.json() : { data: {} })
                .catch(() => ({ data: {} }))
            : Promise.resolve({ data: {} }),

          // Item priorities for all tiers in parallel
          Promise.all(
            activeTierIds.map(tierId =>
              fetch(`/api/prio-list?guild_id=${guildId}&raid_tier_id=${tierId}`)
                .then(res => res.ok ? res.json() : { priorities: [] })
                .catch(() => ({ priorities: [] }))
            )
          )
        ])

        const allRankingsData = visibility.rankings
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

        // Count how many times each character received each item (by wowhead_id)
        // Using wowhead_id ensures awards from other tiers with the same physical item are matched
        // This handles duplicate items (e.g., same tier token for MS and OS)
        // so we only remove the correct number of entries, not all of them
        const wowheadIdSet = new Set(itemsData.map((i: LootItem) => i.wowhead_id))
        const receivedItemCounts = new Map<string, number>()
        for (const h of (lootHistoryData || []) as { character_id: string; loot_item: { wowhead_id: number } | null }[]) {
          const wowheadId = h.loot_item?.wowhead_id
          if (wowheadId == null || !wowheadIdSet.has(wowheadId)) continue
          const key = `${h.character_id}-${wowheadId}`
          receivedItemCounts.set(key, (receivedItemCounts.get(key) || 0) + 1)
        }
        setLootReceivedCounts(receivedItemCounts)

        if (visibility.error) {
          console.error('Error loading master-sheet visibility:', visibility.error)
          showNotification('error', 'Couldn\'t load rankings. Check your connection and try again.')
          setAllItemRankings(itemsData.map((item: LootItem) => ({ item, rankings: [] })))
          setContentLoading(false)
          return
        }

        if (allRankingsData.length === 0) {
          setAllItemRankings(itemsData.map((item: LootItem) => ({ item, rankings: [] })))
          setContentLoading(false)
          return
        }

        let subsData = visibility.submissions
        let charactersData = visibility.characters
        const membershipsData = visibility.memberships

        // Team filter: when a team is selected, scope the master sheet to that
        // team's members. The RLS-bypassing visibility API above returns every
        // approved-list raider in the guild; this narrows the visible set
        // without re-introducing the silent-drop bug (anyone in the team shows
        // up even with inactive CGM). Unassigned raiders (on no team) are kept
        // so new members who haven't been rostered yet don't vanish — see
        // buildTeamVisibility and issue #165.
        if (activeTeamId && charactersData.length > 0) {
          const { data: teamMembers } = await supabase
            .from('raid_team_members')
            .select('character_id, raid_team_id')
            .eq('guild_id', guildId)
          const isTeamVisible = buildTeamVisibility(teamMembers || [], activeTeamId)
          charactersData = charactersData.filter(c => isTeamVisible(c.id))
          subsData = subsData.filter(s => !!s.character_id && isTeamVisible(s.character_id))
        }

        if (subsData.length === 0 || charactersData.length === 0) {
          setAllItemRankings(itemsData.map((item: LootItem) => ({ item, rankings: [] })))
          setContentLoading(false)
          return
        }

        // Build membership lookup by character_id
        const membershipByCharId = new Map<string, CharacterGuildMembership>(
          (membershipsData || []).map((m: CharacterGuildMembership & { character_id: string }) => [m.character_id, m])
        )

        // Pre-calculate attendance for all characters in a single batched query
        // This replaces N individual queries with just 4 bulk queries total
        const attendanceCache = await calculateAttendanceBatch(
          (charactersData || []).map((c: CharacterWithRelations) => ({ id: c.id, user_id: c.user_id }))
        )

        // Pre-calculate donation bonus for all characters in one query.
        // Short-circuits to all-zeros when donation_bonuses_enabled is false.
        const donationCache = await calculateDonationsBatch(
          supabase,
          guildId,
          guildSettings,
          (charactersData || []).map((c: CharacterWithRelations) => c.id),
        )

        // Determine minimum raids required for eligibility
        // Eligibility is now computed by computeAttendance() via attendanceCache

        // Build rankings for each item
        type SubmissionData = { id: string; status: string; character_id: string | null }
        type RankingData = { rank: number; slot: number; submission_id: string; loot_item_id: string }
        const itemRankingsMap: Record<string, ItemRankings> = {}

        // Create lookup maps for O(1) access (performance optimization - replaces O(n²) nested .find() calls)
        const subsById = new Map<string, SubmissionData>(subsData.map((s: SubmissionData) => [s.id, s]))
        const characterById = new Map<string, CharacterWithRelations>(charactersData?.map((c: CharacterWithRelations) => [c.id, c]) || [])

        // Track remaining awards to skip per character+item (mutable copy)
        const remainingSkips = new Map(receivedItemCounts)

        for (const item of itemsData) {
          // Sort by rank descending so highest-ranked entries are skipped first when awarded
          const itemRankingsData = allRankingsData
            .filter((r: RankingData) => r.loot_item_id === item.id)
            .sort((a: RankingData, b: RankingData) => b.rank - a.rank)
          const rankings: PlayerRanking[] = []

          for (const r of itemRankingsData) {
            const sub = subsById.get(r.submission_id)
            if (!sub) continue

            const character = sub.character_id ? characterById.get(sub.character_id) : undefined
            if (!character) continue

            // Skip if character has already received this item (matched by wowhead_id)
            // Only skip as many entries as times awarded (handles duplicate tokens for MS/OS)
            const skipKey = `${character.id}-${item.wowhead_id}`
            const skipsLeft = remainingSkips.get(skipKey) || 0
            if (skipsLeft > 0) {
              remainingSkips.set(skipKey, skipsLeft - 1)
              continue
            }

            const attendanceData = attendanceCache[character.id] || { score: 0, raidsAttended: 0, raidsInWindow: 0, isEligible: true }
            const guildMembership = membershipByCharId.get(character.id)
            const charClass = Array.isArray(character.class) ? character.class[0] : character.class
            const charSpec = Array.isArray(character.spec) ? character.spec[0] : character.spec
            const specName = charSpec?.name || null
            const className = charClass?.name || null
            let specRoles: string[] = []
            if (specName && className) {
              const fullSpecName = className === specName ? className : `${specName} ${className}`
              specRoles = getSpecRoles(fullSpecName)
            }

            const membershipStatus = guildMembership?.membership_status || 'full'
            const blpKey = `${character.id}-${item.id}`
            const scoreResult = computeScore({
              itemRank: r.rank,
              character: {
                characterId: character.id,
                specId: character.spec_id || null,
                specRoles,
                guildRank: guildMembership?.role || 'Member',
                membershipStatus,
              },
              attendance: attendanceData,
              config: guildSettings,
              itemPriority: prioritiesMap[item.id] || null,
              timesPassed: blpDataMap[blpKey] || 0,
              donationBonus: donationCache[character.id] ?? 0,
              asOfDate: toDateString(new Date()),
            })

            rankings.push({
              player_name: character.name || 'Unknown',
              class_name: charClass?.name || 'Unknown',
              class_color: charClass?.color_hex || '#888888',
              loot_score: scoreResult.total,
              rank: r.rank,
              attendance_score: scoreResult.components.attendanceScore,
              role_modifier: scoreResult.components.rankModifier,
              role_bonus: scoreResult.components.roleBonus,
              priority_bonus: scoreResult.components.priorityBonus,
              bad_luck_bonus: scoreResult.components.badLuckBonus,
              trial_penalty: scoreResult.components.trialPenalty,
              donation_bonus: scoreResult.components.donationBonus,
              raider_bonus: scoreResult.components.raiderBonus,
              is_trial: membershipStatus === 'trial',
              character_id: character.id,
              raids_attended: attendanceData.raidsAttended,
              is_eligible: attendanceData.isEligible,
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
  }, [selectedPhase, phaseTiers, guildId, guildSettings, masterSheetVisible, hasApprovedSubmission, canManageLoot, canViewMasterSheet, activeTeamId])

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

      if (viewMode !== 'aggregate' || selectedPhase === null || !guildId || !canManageLoot || activeTierIds.length === 0) {
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

        // Get all submission items for these items (paginated + ordered to defeat Supabase's 1000-row cap)
        const submissionItemsData = await paginatedSelect<{ loot_item_id: string; rank: number; slot: number; submission_id: string }>(
          (start, end) =>
            supabase
              .from('loot_submission_items')
              .select('loot_item_id, rank, slot, submission_id')
              .in('loot_item_id', itemIds)
              .is('removed_at', null)
              .order('id', { ascending: true })
              .range(start, end)
        )

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

        // Team filter: scope the Summary to the active team's members, keeping
        // unassigned raiders, so it matches the Rankings view and Gargul
        // export. See buildTeamVisibility and issue #165.
        let isTeamVisible: (characterId: string) => boolean = () => true
        if (activeTeamId) {
          const { data: teamMembers } = await supabase
            .from('raid_team_members')
            .select('character_id, raid_team_id')
            .eq('guild_id', guildId)
          isTeamVisible = buildTeamVisibility(teamMembers || [], activeTeamId)
        }

        // Get loot history for awarded count (match by wowhead_id so cross-tier awards are counted)
        // Paginated + ordered to defeat Supabase's 1000-row response cap.
        const wowheadIdSet = new Set(itemsData.map((i: { wowhead_id: number }) => i.wowhead_id))
        const lootHistoryData = await paginatedSelect<{ loot_item: { wowhead_id: number } | null }>(
          (start, end) =>
            supabase
              .from('loot_history')
              .select('loot_item:loot_items(wowhead_id)')
              .eq('guild_id', guildId)
              .order('id', { ascending: true })
              .range(start, end)
        )

        // Count awards per wowhead_id
        const awardedCounts: Record<number, number> = {}
        for (const h of (lootHistoryData || []) as { loot_item: { wowhead_id: number } | null }[]) {
          const wowheadId = h.loot_item?.wowhead_id
          if (wowheadId == null || !wowheadIdSet.has(wowheadId)) continue
          awardedCounts[wowheadId] = (awardedCounts[wowheadId] || 0) + 1
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
            already_awarded: awardedCounts[item.wowhead_id] || 0,
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
          if (!isTeamVisible(character.id)) continue

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
  }, [viewMode, selectedPhase, phaseTiers, guildId, canManageLoot, activeTeamId])

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
  // Minimum of 5 columns to prevent layout shift when data loads (skeleton assumes 5)
  const maxRankingsCount = useMemo(() => {
    let max = 0
    for (const { items } of sortedRaidTiers) {
      for (const ir of items) {
        if (ir.rankings.length > max) max = ir.rankings.length
      }
    }
    return Math.max(max, 5)
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

  // Handle item candidate modal (officer-only)
  const [candidateModalData, setCandidateModalData] = useState<{
    item: BossLootItem
    rankings: PlayerRanking[]
  } | null>(null)

  const handleItemClick = useCallback((item: BossLootItem, rankings: PlayerRanking[]) => {
    setCandidateModalData({ item, rankings })
    trackClientEvent('item_candidate_modal_viewed')
  }, [])

  // Build set of character IDs that already received the selected item
  const candidateReceivedIds = useMemo(() => {
    if (!candidateModalData) return new Set<string>()
    const wowheadId = candidateModalData.item.wowhead_id
    const ids = new Set<string>()
    // Keys are `${character_id}-${wowhead_id}` — match candidates by checking their specific key
    for (const r of candidateModalData.rankings) {
      const key = `${r.character_id}-${wowheadId}`
      if (lootReceivedCounts.has(key)) {
        ids.add(r.character_id)
      }
    }
    return ids
  }, [candidateModalData, lootReceivedCounts])

  // Build the Gargul DFT export string. See `formatRankingsForGargul` in
  // domain/loot/gargul-dft.ts — it groups rows that share a wowhead id (e.g.
  // Nether Vortex from SSC + TK) into a single Gargul block, but preserves
  // every ranking so a raider who deliberately ranked both copies (weapon +
  // belt) gets prio on both drops.
  const buildGargulExport = useCallback((rankings: ItemRankings[]): string => {
    return formatRankingsForGargul(rankings, guildSettings?.decimal_places ?? 2)
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
    // These only depend on itemIds/tierId, not on each other. Rankings/subs/
    // chars/memberships go through the service-role visibility API so RLS on
    // loot_submission_items / loot_submissions / characters can't silently
    // hide CGM-orphaned raiders. See the matching block in loadAllRankings.
    type TierRankingData = { rank: number; slot: number; submission_id: string; loot_item_id: string }
    type TierSubmissionData = { id: string; status: string; character_id: string | null }

    const tierVisibilityPromise = (async (): Promise<{
      rankings: TierRankingData[]
      submissions: TierSubmissionData[]
      characters: CharacterWithRelations[]
      memberships: (CharacterGuildMembership & { character_id: string })[]
      error?: string
    }> => {
      try {
        const res = await fetch('/api/master-sheet/visibility', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guild_id: guildId, item_ids: itemIds }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          return { rankings: [], submissions: [], characters: [], memberships: [], error: body.error || `HTTP ${res.status}` }
        }
        const payload = await res.json()
        return {
          rankings: payload.rankings || [],
          submissions: payload.submissions || [],
          characters: payload.characters || [],
          memberships: payload.memberships || [],
        }
      } catch (err) {
        return { rankings: [], submissions: [], characters: [], memberships: [], error: err instanceof Error ? err.message : 'unknown' }
      }
    })()

    const [
      tierVisibility,
      prioritiesMap,
      tierBlpDataMap,
    ] = await Promise.all([
      tierVisibilityPromise,

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

      // Loot-history-based skip is applied globally by the caller after all
      // tier fetches complete — see `handleExportToGargul`. Doing it per tier
      // double-counted awards for wowheads that span tiers (e.g. Nether
      // Vortex in SSC + TK), removing the character from both blocks.

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

    if (tierVisibility.error) {
      console.error('Error loading master-sheet visibility (tier):', tierVisibility.error)
      return itemsData.map((item: TierLootItem) => ({ item, rankings: [] }))
    }

    const allRankingsData = tierVisibility.rankings
    if (allRankingsData.length === 0) {
      return itemsData.map((item: TierLootItem) => ({ item, rankings: [] }))
    }

    let subsData = tierVisibility.submissions
    let charactersData = tierVisibility.characters
    const tierMembershipsData = tierVisibility.memberships

    // Team filter: scope to the selected team's members, but keep unassigned
    // raiders (on no team) so new members who haven't been rostered yet still
    // export — see buildTeamVisibility and the matching block in loadAllRankings.
    if (activeTeamId && charactersData.length > 0) {
      const { data: teamMembers } = await supabase
        .from('raid_team_members')
        .select('character_id, raid_team_id')
        .eq('guild_id', guildId)
      const isTeamVisible = buildTeamVisibility(teamMembers || [], activeTeamId)
      charactersData = charactersData.filter(c => isTeamVisible(c.id))
      subsData = subsData.filter(s => !!s.character_id && isTeamVisible(s.character_id))
    }

    if (subsData.length === 0 || charactersData.length === 0) {
      return itemsData.map((item: TierLootItem) => ({ item, rankings: [] }))
    }

    // Build membership lookup by character_id
    const tierMembershipByCharId = new Map<string, CharacterGuildMembership>(
      (tierMembershipsData || []).map((m: CharacterGuildMembership & { character_id: string }) => [m.character_id, m])
    )

    // Pre-calculate attendance for all characters in a single batched query
    const attendanceCache = await calculateAttendanceBatch(
      charactersData.map((c: CharacterWithRelations) => ({ id: c.id, user_id: c.user_id }))
    )

    // Pre-calculate donation bonus for all characters in one query.
    const donationCache = await calculateDonationsBatch(
      supabase,
      guildId,
      guildSettings,
      charactersData.map((c: CharacterWithRelations) => c.id),
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
      // Sort by rank descending so the caller's global receive-skip drops the
      // highest-ranked entries first (their top picks leave the prio).
      const itemRankingsData = allRankingsData
        .filter((r: TierRankingData) => r.loot_item_id === item.id)
        .sort((a: TierRankingData, b: TierRankingData) => b.rank - a.rank)
      const rankings: PlayerRanking[] = []

      for (const r of itemRankingsData) {
        const sub = tierSubsById.get(r.submission_id)
        if (!sub) continue

        const character = sub.character_id ? tierCharacterById.get(sub.character_id) : undefined
        if (!character) continue

        const attendanceData = attendanceCache[character.id] || { score: 0, raidsAttended: 0, raidsInWindow: 0, isEligible: true }
        const guildMembership = tierMembershipByCharId.get(character.id)
        const charClass = Array.isArray(character.class) ? character.class[0] : character.class
        const charSpec = Array.isArray(character.spec) ? character.spec[0] : character.spec
        const specName = charSpec?.name || null
        const className = charClass?.name || null
        let specRoles: string[] = []
        if (specName && className) {
          const fullSpecName = className === specName ? className : `${specName} ${className}`
          specRoles = getSpecRoles(fullSpecName)
        }

        const membershipStatus = guildMembership?.membership_status || 'full'
        const tierBlpKey = `${character.id}-${item.id}`
        const scoreResult = computeScore({
          itemRank: r.rank,
          character: {
            characterId: character.id,
            specId: character.spec_id || null,
            specRoles,
            guildRank: guildMembership?.role || 'Member',
            membershipStatus,
          },
          attendance: attendanceData,
          config: guildSettings,
          itemPriority: prioritiesMap[item.id] || null,
          timesPassed: tierBlpDataMap[tierBlpKey] || 0,
          donationBonus: donationCache[character.id] ?? 0,
          asOfDate: toDateString(new Date()),
        })

        rankings.push({
          player_name: character.name || 'Unknown',
          class_name: charClass?.name || 'Unknown',
          class_color: charClass?.color_hex || '#888888',
          loot_score: scoreResult.total,
          rank: r.rank,
          attendance_score: scoreResult.components.attendanceScore,
          role_modifier: scoreResult.components.rankModifier,
          role_bonus: scoreResult.components.roleBonus,
          priority_bonus: scoreResult.components.priorityBonus,
          bad_luck_bonus: scoreResult.components.badLuckBonus,
          trial_penalty: scoreResult.components.trialPenalty,
          donation_bonus: scoreResult.components.donationBonus,
          raider_bonus: scoreResult.components.raiderBonus,
          is_trial: membershipStatus === 'trial',
          character_id: character.id,
          raids_attended: attendanceData.raidsAttended,
          is_eligible: attendanceData.isEligible,
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
      // Fetch per-tier rankings in parallel with the guild-wide loot history.
      // The skip-already-awarded rule is applied globally below — see
      // `applyGlobalReceiveSkip`. Doing it inside `fetchTierRankings` used to
      // double-count awards for wowheads that span tiers (Nether Vortex in
      // SSC + TK), and one award would drop the raider from both blocks.
      const [tierResults, lootHistoryData] = await Promise.all([
        Promise.all(raidTiers.map(tier => fetchTierRankings(tier.id))),
        paginatedSelect<{ character_id: string; loot_item: { wowhead_id: number } | null }>((start, end) =>
          supabase
            .from('loot_history')
            .select('character_id, loot_item:loot_items(wowhead_id)')
            .eq('guild_id', guildId)
            .order('id', { ascending: true })
            .range(start, end)
        ),
      ])

      const receivedByCharAndWowhead = new Map<string, number>()
      for (const h of lootHistoryData) {
        const wowheadId = h.loot_item?.wowhead_id
        if (wowheadId == null) continue
        const key = `${h.character_id}-${wowheadId}`
        receivedByCharAndWowhead.set(key, (receivedByCharAndWowhead.get(key) || 0) + 1)
      }

      const allTiersRankings = applyGlobalReceiveSkip(tierResults.flat(), receivedByCharAndWowhead)

      const exportData = buildGargulExport(allTiersRankings)

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
    <ExpansionGuard serverHeading={serverHeading}>
      <div className="font-poppins">
        {/* Header - Always visible */}
        <div className="p-4 sm:p-6 lg:p-8 pb-1.5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            {initialLoading && serverHeading ? (
              serverHeading
            ) : (
              <div>
                <Heading level={1}>
                  Loot Rankings{!initialLoading && selectedPhase !== null && <span className="text-muted-foreground"> · P{selectedPhase}{activePhaseTiers.length > 0 ? ` ${activePhaseTiers.map(t => getRaidShorthand(t.name)).join(', ')}` : ''}</span>}
                </Heading>
                <p className="text-muted-foreground mt-1 text-base">
                  {viewMode === 'aggregate' && canManageLoot
                    ? 'Most wanted items across the guild'
                    : 'All ranked players for each item'}
                </p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {hasTeams && (
                <TeamSelector
                  teams={teams}
                  activeTeamId={activeTeamId}
                  onTeamChange={setTeam}
                  className="w-40"
                />
              )}
              <Button
                variant="outline"
                onClick={() => { setShowScoreBreakdown(true); trackClientEvent('score_breakdown_viewed') }}
              >
                <HugeiconsIcon icon={InformationCircleIcon} size={18} />
                <span className="hidden sm:inline">How scores work</span>
                <span className="sm:hidden">Scores</span>
              </Button>
              {canManageLoot && (
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
          <div className="sticky top-14 sm:top-0 z-20 px-4 sm:px-6 lg:px-8 py-2.5 bg-background">
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
                  {resolvedGroups.map((group) => {
                    const phaseSet = new Set(group.phases)
                    const tiersInGroup = raidTiers.filter(t => t.phase != null && phaseSet.has(t.phase))
                    const activeTiersInGroup = tiersInGroup.filter(t => t.is_guild_active !== false)
                    const allDisabled = tiersInGroup.every(t => t.is_guild_active === false)
                    const raidNames = activeTiersInGroup.map(t => getRaidShorthand(t.name)).join(', ')
                    return (
                      <option key={group.canonicalPhase} value={group.canonicalPhase}>
                        {getPhaseGroupShortLabel(group)} {raidNames}{allDisabled ? ' (Off)' : ''}
                      </option>
                    )
                  })}
                </Select>
              </div>
              {/* Desktop: Horizontal tabs */}
              <HorizontalScroll containerClassName="hidden sm:flex flex-1 min-w-0">
                <div className="flex gap-2 pr-3">
                  {resolvedGroups.map((group) => {
                    const phaseSet = new Set(group.phases)
                    const tiersInGroup = raidTiers.filter(t => t.phase != null && phaseSet.has(t.phase))
                    const activeTiersInGroup = tiersInGroup.filter(t => t.is_guild_active !== false)
                    const allDisabled = tiersInGroup.every(t => t.is_guild_active === false)
                    const isSelected = selectedPhase === group.canonicalPhase
                    const raidNames = activeTiersInGroup.map(t => getRaidShorthand(t.name)).join(', ')
                    // Get the first active tier for the icon, or first tier if none active
                    const iconTier = activeTiersInGroup[0] || tiersInGroup[0]
                    return (
                      <Button
                        key={group.canonicalPhase}
                        variant="ghost"
                        onClick={() => setSelectedPhase(group.canonicalPhase)}
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
                          }`}>{getPhaseGroupShortLabel(group)}</span>
                          {iconTier && (
                            <img
                              src={getRaidIcon(iconTier.name)}
                              alt=""
                              width={20}
                              height={20}
                              className="w-5 h-5 rounded border border-border/50"
                            />
                          )}
                          <span>{raidNames}</span>
                          {allDisabled && <span className="text-[10px] uppercase tracking-wide">Off</span>}
                        </span>
                      </Button>
                    )
                  })}
                </div>
              </HorizontalScroll>
              {/* Officer View Toggle */}
              {canManageLoot && (
                <>
                  {/* Mobile: Dropdown */}
                  <div className="sm:hidden">
                    <Select
                      variant="rounded"
                      size="sm"
                      value={viewMode}
                      onChange={(e) => setViewMode(e.target.value as 'rankings' | 'aggregate' | 'raid')}
                      className="bg-background-elevated font-medium"
                    >
                      <option value="rankings">Rankings</option>
                      <option value="aggregate">Summary</option>
                      <option value="raid">Raid mode</option>
                    </Select>
                  </div>
                  {/* Desktop: Toggle buttons */}
                  <SegmentedControl
                    options={[
                      { value: 'rankings', label: 'Rankings' },
                      { value: 'aggregate', label: 'Summary' },
                      { value: 'raid', label: 'Raid mode' },
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
        {/* Skeleton placeholder during loading to prevent CLS */}
        {(initialLoading || contentLoading) && viewMode === 'rankings' && (
          <div className="sticky top-[112px] sm:top-[56px] z-20 px-4 sm:px-6 lg:px-8 py-2.5 bg-background">
            <div className="hidden sm:flex gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-28 rounded-[40px] flex-shrink-0" />
              ))}
            </div>
            <div className="sm:hidden flex gap-2">
              <Skeleton className="h-9 flex-1 rounded-lg" />
              <Skeleton className="h-9 w-20 rounded-[40px]" />
              <Skeleton className="h-9 w-22 rounded-[40px]" />
            </div>
          </div>
        )}
        {!initialLoading && !contentLoading && bossNames.length > 0 && viewMode === 'rankings' && (
          <div className="sticky top-[112px] sm:top-[56px] z-20 px-4 sm:px-6 lg:px-8 py-2.5 bg-background">
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
                          width={16}
                          height={16}
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
        {(initialLoading || contentLoading || !contentReady) ? (
          <MasterSheetContentSkeleton />
        ) : (
        <div className="animate-fade-in">
        {/* Master Sheet Access Gates */}
        {!canManageLoot && !canViewMasterSheet && !hasApprovedSubmission ? (
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
        ) : !masterSheetVisible && !canManageLoot && !canViewMasterSheet ? (
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
            {/* Hidden-sheet preview banner — shown to anyone bypassing the
                visibility gate (officers + roles granted view_master_sheet). */}
            {!masterSheetVisible && (canManageLoot || canViewMasterSheet) && (
              <div className="bg-blue-950/50 border border-blue-600/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">👁️</span>
                  <div>
                    <p className="text-blue-200 font-semibold">Hidden sheet preview</p>
                    <p className="text-blue-300 text-sm">
                      The master sheet is currently hidden from raiders. You can see these rankings because of your role.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Officer Viewing Disabled Tiers Badge */}
            {hasDisabledTiers && canManageLoot && (
              <div className="bg-amber-950/50 border border-amber-600/50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <p className="text-amber-200 font-semibold">Some raid tiers disabled</p>
                    <p className="text-amber-300 text-sm">
                      One or more raid tiers in this phase are disabled. Their items won&apos;t appear in member views.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Aggregate View (Officer Only) */}
            {viewMode === 'aggregate' && canManageLoot ? (
              <LootListSummaryView
                items={aggregateItems}
                loading={aggregateLoading}
                bosses={[...new Set(aggregateItems.map(i => i.boss_name))].sort()}
                selectedBoss={aggregateBossFilter}
                onBossFilter={setAggregateBossFilter}
              />
            ) : viewMode === 'raid' && canManageLoot ? (
              <RaidModeView
                sortedRaidTiers={sortedRaidTiers}
                onItemClick={handleItemClick}
                decimalPlaces={guildSettings?.decimal_places}
              />
            ) : (
            <>
            {/* Loot Table */}
            {sortedRaidTiers.length === 0 ? (
              <EmptyState
                icon={ScrollIcon}
                title="No rankings yet"
                description={canManageLoot
                  ? "Rankings show up once raiders submit their Loot Lists and you approve them."
                  : "Rankings show up after you submit your Loot List and an Officer approves it."
                }
                variant="card"
                action={canManageLoot
                  ? { label: 'View submissions', onClick: () => router.push('/master-loot'), variant: 'primary' as const }
                  : hasApprovedSubmission ? undefined : { label: 'Create my loot list', onClick: () => router.push('/loot-list'), variant: 'primary' as const }
                }
              />
            ) : (
              <VirtualizedMasterSheet
                sortedRaidTiers={sortedRaidTiers}
                collapsedRaidTiers={collapsedRaidTiers}
                collapsedBosses={collapsedBosses}
                onToggleRaidTierCollapse={toggleRaidTierCollapse}
                onToggleBossCollapse={toggleBossCollapse}
                activeCharacterId={activeCharacter?.id}
                isOfficer={canManageLoot}
                guildSettings={guildSettings ?? undefined}
                onCompare={handleCompare}
                onItemClick={canManageLoot ? handleItemClick : undefined}
                maxRankingsCount={maxRankingsCount}
              />
            )}
            </>
            )}
          </>
        )}
        </div>
        )}

        {/* Legend (rankings view only, hidden during loading to prevent CLS) */}
        {viewMode === 'rankings' && contentReady && !initialLoading && !contentLoading && (
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

        {/* Item Candidate Modal (officer-only) */}
        {canManageLoot && (
          <ItemCandidateModal
            open={!!candidateModalData}
            onClose={() => setCandidateModalData(null)}
            item={candidateModalData?.item ?? null}
            rankings={candidateModalData?.rankings ?? []}
            priority={candidateModalData?.item ? (itemPriorities[candidateModalData.item.id] ?? null) : null}
            receivedCharacterIds={candidateReceivedIds}
            guildSettings={guildSettings ?? {}}
            guildId={guildId}
            isOfficer={canManageLoot}
            raidTierId={candidateModalData?.item?.raid_tier_id}
            mostRecentRaidEventId={mostRecentRaidEventId}
          />
        )}
        </div>
      </div>
    </ExpansionGuard>
  )
}
