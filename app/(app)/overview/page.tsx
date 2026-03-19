'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import WelcomeScreen from '@/app/components/WelcomeScreen'
import { SetupChecklist } from '@/app/components/SetupChecklist'
import { HugeiconsIcon } from '@hugeicons/react'
import { UserIcon, CheckmarkCircle01Icon, AlertCircleIcon, Award01Icon, Cancel01Icon, Add01Icon, Calendar03Icon, Shield01Icon, AnalyticsUpIcon } from '@hugeicons/core-free-icons'

// Lazy load modals to reduce initial bundle size
const CreateCharacterModal = dynamic(() => import('@/app/components/CreateCharacterModal').then(mod => ({ default: mod.CreateCharacterModal })), {
  loading: () => null
})
const OnboardingModal = dynamic(() => import('@/app/components/OnboardingModal'), {
  loading: () => null
})
const GuardianConversionModal = dynamic(() => import('@/app/components/GuardianConversionModal'), {
  loading: () => null
})
const GuardianConversionBanner = dynamic(() => import('@/app/components/GuardianConversionBanner'), {
  loading: () => null
})
import { parseDate, toDateString } from '@/utils/date'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { DashboardContentSkeleton } from '@/components/ui/skeletons'
import { ScrollIcon, StarIcon } from '@hugeicons/core-free-icons'
import { StatusBadge, type SubmissionStatus } from '@/components/ui/status-badge'
import { Heading } from '@/components/ui/typography'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { useGuildContext } from '@/app/contexts/GuildContext'
import ItemLink from '@/app/components/ItemLink'
import { computeScore, computeAttendance, getRoleModifierWithLabel, calculateBadLuckBonus, type ItemPriority, type AttendanceResult } from '@/domain/scoring'
import { getSpecRoles, getRoleDisplayName, type Role } from '@/domain/loot/spec-role-mapping'
import { refreshWowheadTooltips } from '@/lib/wowhead'
import { useNotification } from '@/app/contexts/NotificationContext'
import { trackClientEvent } from '@/utils/analytics/client'

// Get next N raid dates from configured raid days
function getNextRaidDates(raidDays: number[], timezone: string, count = 2): Date[] {
  const dates: Date[] = []
  const now = new Date()
  // Iterate forward from today up to 14 days to find next raid dates
  for (let i = 0; i < 14 && dates.length < count; i++) {
    const candidate = new Date(now)
    candidate.setDate(candidate.getDate() + i)
    if (raidDays.includes(candidate.getDay())) {
      dates.push(candidate)
    }
  }
  return dates
}

// Get ISO week key for grouping dates by week (e.g. "2026-07")
function getISOWeekKey(date: Date): string {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const yearStart = new Date(d.getFullYear(), 0, 4)
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getFullYear()}-${String(weekNum).padStart(2, '0')}`
}

// Get WoWhead class icon URL
function getClassIconUrl(className: string | undefined): string {
  if (!className) return ''
  const classNameLower = className.toLowerCase().replace(' ', '')
  return `https://wow.zamimg.com/images/wow/icons/large/classicon_${classNameLower}.jpg`
}

// Get random WoW-themed greeting (returns [prefix, suffix] to allow coloring the name separately)
const GREETINGS = [
  ['Welcome back, ', '.'],
  ['Well met, ', '.'],
  ['Greetings, ', '.'],
  ["Lok'tar Ogar, ", '.'],
  ['Strength and honor, ', '.'],
  ['Light be with you, ', '.'],
  ['Victory or death, ', '.'],
  ['Ready for raid, ', '?'],
  ['May your loot be epic, ', '.'],
  ['Time to hunt some purples, ', '.'],
  ['Zug zug, ', '.'],
  ['For glory, ', '.'],
  ['The hunt begins, ', '.'],
  ["Let's get that loot, ", '.'],
] as const

function getRandomGreetingIndex(): number {
  return Math.floor(Math.random() * GREETINGS.length)
}

interface RaidTier {
  id: string
  name: string
  is_active: boolean
  phase?: number
}

interface Character {
  id: string
  name: string
  realm: string | null
  level: number | null
  is_main: boolean
  class?: {
    name: string
    color_hex: string
  }
}

interface LootSubmission {
  id: string
  character_id: string
  raid_tier_id: string | null
  expansion_id: string | null
  phase: number | null
  status: string
  updated_at: string
  character: Character
  raid_tier: RaidTier
  phase_label: string
}

interface TiedCharacter {
  name: string
  class_color: string
}

interface LootPriorityItem {
  item_id: string
  item_name: string
  wowhead_id: number
  character_name: string
  character_id: string
  rank: number
  loot_score: number // rank + attendance + modifiers
  tied_characters: TiedCharacter[] // Characters with same rank
  classification: string
  boss_name: string
  raid_tier_id: string
  is_loot_council?: boolean
}

interface ReceivedItem {
  id: string
  item_name: string
  wowhead_id: number
  boss_name: string
  classification: string
  awarded_date: string
  raid_tier_name: string
}

export default function Dashboard() {
  return (
    <Suspense fallback={<DashboardContentSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardContent() {
  const { activeGuild, activeMember, activeCharacter, userGuilds, loading: guildLoading, isOfficer, currentExpansion, characterMemberships, user, refreshCharacters } = useGuildContext()
  const { showNotification } = useNotification()
  const [raidTiers, setRaidTiers] = useState<RaidTier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [greetingIndex, setGreetingIndex] = useState<number | null>(null)
  const [greetingName, setGreetingName] = useState<string>('')

  // New dashboard state
  const [allSubmissions, setAllSubmissions] = useState<LootSubmission[]>([]) // For current character
  const [lootPriority, setLootPriority] = useState<LootPriorityItem[]>([])
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([])
  const [actionsNeeded, setActionsNeeded] = useState<LootSubmission[]>([])
  const [dismissedActions, setDismissedActions] = useState<Set<string>>(new Set())
  const [showCreateCharacterModal, setShowCreateCharacterModal] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showGuardianConversion, setShowGuardianConversion] = useState(false)
  const [guardianSpecId, setGuardianSpecId] = useState<string | null>(null)

  // Stats state
  const [stats, setStats] = useState({
    completedLists: 0,
    pendingReviews: 0,
    actionsNeeded: 0
  })

  // Loot list deadline for empty state messaging
  const [lootListDeadline, setLootListDeadline] = useState<string | null>(null)

  // Guild settings for display formatting
  const [decimalPlaces, setDecimalPlaces] = useState<number>(2)

  // Widget state
  const [scoreBreakdown, setScoreBreakdown] = useState<{
    attendanceScore: number
    roleModifier: number
    roleName: string
    roleBonus: number
    roleLabel: string | null
    trialPenalty: number
    blpRange: { min: number; max: number } | null
    blpEnabled: boolean
  } | null>(null)

  const [attendanceData, setAttendanceData] = useState<{
    percentage: number
    attended: number
    total: number
    tierInfo?: { current: string; nextTier: string; raidsNeeded: number; nextBonus: number }
  } | null>(null)

  const [trialData, setTrialData] = useState<{
    isTrial: boolean
    startedAt: string | null
    weeksCompleted: number
    weeksRequired: number
    autoPromote: boolean
  } | null>(null)

  const [nextRaidDates, setNextRaidDates] = useState<Date[]>([])

  const [competitionData, setCompetitionData] = useState<Record<string, {
    totalWanting: number
    userRank: number
  }>>({})

  // Quick-win widget state
  const [attendanceTrend, setAttendanceTrend] = useState<number[]>([])
  const [lootEfficiency, setLootEfficiency] = useState<{ received: number; total: number } | null>(null)
  const [itemBlpData, setItemBlpData] = useState<Record<string, { timesPassed: number; bonus: number }>>({})
  const [lowCompetitionItems, setLowCompetitionItems] = useState<Array<{
    item_id: string
    item_name: string
    wowhead_id: number
    boss_name: string
    competitors: number
  }>>([])

  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Overview'
  }, [])

  // Preload LCP image (class icon) as soon as character data is available
  useEffect(() => {
    const className = activeCharacter?.class?.name
    if (!className) return
    const url = getClassIconUrl(className)
    if (!url) return
    // Avoid duplicate preload links
    const existing = document.querySelector(`link[rel="preload"][href="${url}"]`)
    if (existing) return
    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = url
    link.fetchPriority = 'high'
    document.head.appendChild(link)
    return () => { link.remove() }
  }, [activeCharacter?.class?.name])

  // Track page view
  useEffect(() => {
    if (activeGuild?.id) trackClientEvent('overview_page_viewed', { guild_id: activeGuild.id })
  }, [activeGuild?.id])

  // Check for create_character query param (from guild join flow)
  useEffect(() => {
    if (searchParams.get('create_character') === 'true') {
      setShowCreateCharacterModal(true)
      // Clean up the URL
      router.replace('/overview', { scroll: false })
    }
  }, [searchParams, router])

  // Auto-open character creation modal for users who joined a guild but have no character
  useEffect(() => {
    if (activeGuild && !activeCharacter && !guildLoading) {
      setShowCreateCharacterModal(true)
    }
  }, [activeGuild, activeCharacter, guildLoading])

  // Refresh Wowhead tooltips when loot priority or received items load
  // Deferred to idle callback to avoid blocking LCP paint
  useEffect(() => {
    if (lootPriority.length > 0 || receivedItems.length > 0) {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => refreshWowheadTooltips())
      } else {
        setTimeout(() => refreshWowheadTooltips(), 200)
      }
    }
  }, [lootPriority, receivedItems])

  // Load dismissed actions from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('dismissedActions')
      if (stored) {
        try {
          setDismissedActions(new Set(JSON.parse(stored)))
        } catch (e) {
          console.error('Failed to parse dismissed actions:', e)
        }
      }
    }
  }, [])

  // Show onboarding modal for first-time users
  useEffect(() => {
    if (typeof window !== 'undefined' && activeGuild && activeCharacter && !loading) {
      const hasSeenOnboarding = localStorage.getItem('lootlist_onboarding_seen')
      if (!hasSeenOnboarding) {
        setShowOnboarding(true)
      }
    }
  }, [activeGuild, activeCharacter, loading])

  // Check if active character is a Feral Druid that needs Guardian conversion
  useEffect(() => {
    if (!activeCharacter || !activeGuild || loading) return
    const isFeral = activeCharacter.spec?.name === 'Feral' && activeCharacter.class?.name === 'Druid'
    if (!isFeral) return
    // Check if already dismissed (field may not exist on older records)
    if (activeCharacter.guardian_conversion_dismissed) return

    // Fetch Guardian spec ID for this class
    async function loadGuardianSpec() {
      const supabaseClient = createClient()
      const { data } = await supabaseClient
        .from('class_specs')
        .select('id')
        .eq('name', 'Guardian')
        .eq('class_id', activeCharacter!.class!.id)
        .single()
      if (data) {
        setGuardianSpecId(data.id)
        setShowGuardianConversion(true)
      }
    }
    loadGuardianSpec()
  }, [activeCharacter, activeGuild, loading])

  const handleCloseOnboarding = () => {
    localStorage.setItem('lootlist_onboarding_seen', 'true')
    setShowOnboarding(false)
  }

  // Set greeting based on active character name (falls back to profile name)
  useEffect(() => {
    if (greetingIndex === null) {
      setGreetingIndex(getRandomGreetingIndex())
    }
    if (activeCharacter?.name) {
      setGreetingName(activeCharacter.name)
      return
    }
    if (user) {
      setGreetingName(user?.user_metadata?.custom_claims?.global_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'User')
    }
  }, [activeCharacter, user])

  // Handle dismissing an action
  const handleDismissAction = (e: React.MouseEvent, submissionId: string) => {
    e.stopPropagation() // Prevent triggering the parent click handler
    const newDismissed = new Set(dismissedActions)
    newDismissed.add(submissionId)
    setDismissedActions(newDismissed)

    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('dismissedActions', JSON.stringify(Array.from(newDismissed)))
    }
  }

  // Calculate visible actions count (excluding dismissed)
  const visibleActionsCount = useMemo(() => {
    return actionsNeeded.filter(submission => !dismissedActions.has(submission.id)).length
  }, [actionsNeeded, dismissedActions])

  useEffect(() => {
    const loadData = async () => {
      if (!user) return

      // Wait for guild context to load
      if (guildLoading) {
        return
      }

      // If no active guild, show WelcomeScreen (don't redirect to preserve sidebar)
      if (!activeGuild) {
        setLoading(false)
        return
      }

      // Check if guild has active expansion set
      if (!activeGuild.active_expansion_id) {
        setRaidTiers([])
        setError('Your guild needs an active expansion. Ask an Officer to set one in expansion settings.')
        setLoading(false)
        return
      }

      // Get raid tiers for current expansion
      const expansionId = currentExpansion?.expansion_id || activeGuild.active_expansion_id
      if (!expansionId) {
        setRaidTiers([])
        setLoading(false)
        return
      }

      try {
        const [tiersResult, deadlineResult] = await Promise.all([
          supabase
            .from('raid_tiers')
            .select('id, name, is_active, phase')
            .eq('expansion_id', expansionId)
            .eq('is_guild_active', true),
          supabase
            .from('expansions')
            .select('phase_deadlines')
            .eq('id', expansionId)
            .single()
        ])

        const { data: tiersData, error: tiersError } = tiersResult
        if (tiersError) {
          console.error('Error loading raid tiers:', tiersError)
          setRaidTiers([])
        } else {
          setRaidTiers(tiersData || [])
        }

        const { data: expansionDeadlineData } = deadlineResult
        if (expansionDeadlineData?.phase_deadlines) {
          // Find the nearest future deadline across all phases
          const deadlines = Object.values(expansionDeadlineData.phase_deadlines as Record<string, string | null>)
            .filter((d): d is string => d !== null)
            .sort()
          const now = new Date().toISOString()
          const nextDeadline = deadlines.find(d => d > now) || deadlines[deadlines.length - 1] || null
          setLootListDeadline(nextDeadline)
        } else {
          setLootListDeadline(null)
        }

        // Load all dashboard data (pass raid tiers and expansion to filter)
        await loadDashboardData(user.id, activeGuild.id, tiersData || [], expansionId)
      } catch (error) {
        console.error('Error loading overview data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData().catch(console.error)
  }, [user, guildLoading, activeGuild, activeCharacter, currentExpansion])

  // Function to load all dashboard data for current character
  const loadDashboardData = async (userId: string, guildId: string, currentExpansionTiers: RaidTier[], expansionId: string) => {
    try {
      if (!activeCharacter) {
        return
      }

      const currentCharacter: Character = {
        id: activeCharacter.id,
        name: activeCharacter.name,
        realm: activeCharacter.realm,
        level: activeCharacter.level,
        is_main: activeCharacter.is_main || false,
        class: activeCharacter.class
      }

      // Get submissions for CURRENT CHARACTER ONLY for current expansion
      const { data: submissions, error: submissionsError } = await supabase
        .from('loot_submissions')
        .select('id, character_id, guild_id, raid_tier_id, expansion_id, phase, status, updated_at')
        .eq('character_id', activeCharacter.id)
        .eq('guild_id', guildId)
        .eq('expansion_id', expansionId)
        .order('updated_at', { ascending: false })

      if (submissionsError) {
        console.error('Error loading submissions:', submissionsError)
      }

      // Build a phase-to-tier-names map for display labels
      const phaseTierNames: Record<number, string[]> = {}
      for (const tier of currentExpansionTiers) {
        if (tier.phase != null) {
          if (!phaseTierNames[tier.phase]) phaseTierNames[tier.phase] = []
          phaseTierNames[tier.phase].push(tier.name)
        }
      }

      // Transform submissions for current character
      type SubmissionRow = { id: string; character_id: string; raid_tier_id: string | null; expansion_id: string | null; phase: number | null; status: string; updated_at: string }
      const transformedSubmissions: LootSubmission[] = (submissions || []).map((sub: SubmissionRow) => {
        const phaseLabel = sub.phase != null && phaseTierNames[sub.phase]
          ? `Phase ${sub.phase}: ${phaseTierNames[sub.phase].join(', ')}`
          : sub.phase != null
            ? `Phase ${sub.phase}`
            : 'Unknown'
        return {
          id: sub.id,
          character_id: sub.character_id,
          raid_tier_id: sub.raid_tier_id,
          expansion_id: sub.expansion_id,
          phase: sub.phase,
          status: sub.status,
          updated_at: sub.updated_at,
          character: currentCharacter,
          raid_tier: { id: sub.raid_tier_id || sub.id, name: phaseLabel, is_active: true },
          phase_label: phaseLabel,
        }
      })

      setAllSubmissions(transformedSubmissions)

      // Calculate stats for CURRENT CHARACTER ONLY
      const completedCount = transformedSubmissions.filter(s => s.status === 'approved').length
      const pendingCount = transformedSubmissions.filter(s => s.status === 'pending').length
      const actionsCount = transformedSubmissions.filter(s =>
        s.status === 'draft' || s.status === 'needs_revision'
      ).length

      setStats({
        completedLists: completedCount,
        pendingReviews: pendingCount,
        actionsNeeded: actionsCount
      })

      // Get actions needed for current character
      const actions = transformedSubmissions.filter(s =>
        s.status === 'draft' || s.status === 'needs_revision'
      )
      setActionsNeeded(actions)

      // Load loot priority and received items in parallel (performance optimization)
      await Promise.all([
        loadLootPriority([activeCharacter.id]),
        loadReceivedItems(activeCharacter.id)
      ])

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      showNotification('error', 'Couldn\'t load dashboard data. Check your connection and try again.')
    }
  }

  // Function to load loot priority items
  const loadLootPriority = async (characterIds: string[]) => {
    try {
      if (characterIds.length === 0 || !activeGuild) return

      const characterId = characterIds[0]

      // Initialize default values for attendance and modifiers
      let attendanceScore = 0
      let roleModifier = 0
      let roleBonus = 0
      let specRole: string | null = null
      let trialPenaltyValue = 0
      let attendedRaidCount = 0
      let totalRaidCount = 0
      let membershipStatus = 'full'
      let trialStartedAt: string | null = null
      let characterRole = 'Member'
      let savedGuildSettings: any = null
      let savedRaidDays: number[] = []
      let savedTimezone = 'UTC'
      let savedDeduplicatedRaidEvents: Array<{ id: string; raid_date: string }> = []
      let savedAttendanceRecords: Array<{ raid_event_id: string; attended: boolean }> = []

      // Start all independent fetches in parallel: submission items, guild settings, membership, expansion
      const submissionItemsPromise = supabase
        .from('loot_submission_items')
        .select(`
          loot_item_id,
          rank,
          slot,
          submission:loot_submissions!inner (
            id,
            character_id,
            guild_id,
            status
          )
        `)
        .eq('submission.character_id', characterId)
        .eq('submission.guild_id', activeGuild.id)
        .eq('submission.status', 'approved')
        .is('removed_at', null)

      const guildSettingsPromise = supabase
        .from('guild_settings')
        .select('*')
        .eq('guild_id', activeGuild.id)
        .single()

      const membershipPromise = characterId
        ? supabase
            .from('character_guild_memberships')
            .select('joined_at, membership_status, trial_started_at, role')
            .eq('character_id', characterId)
            .eq('guild_id', activeGuild.id)
            .single()
        : Promise.resolve({ data: null, error: null })

      const expansionDataPromise = activeGuild?.active_expansion_id
        ? supabase
            .from('expansions')
            .select('raid_days_per_week, first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day, timezone')
            .eq('id', activeGuild.active_expansion_id)
            .single()
        : Promise.resolve({ data: null, error: null })

      // Await all independent fetches in parallel
      const [settingsResult, membershipResult, expansionDataResult] = await Promise.all([
        guildSettingsPromise,
        membershipPromise,
        expansionDataPromise
      ])

      // Try to get guild settings and attendance (may not be set up yet)
      try {
        const guildSettings = settingsResult.error ? null : settingsResult.data

        if (guildSettings) {
          // Set decimal places for display formatting
          setDecimalPlaces(guildSettings.decimal_places ?? 2)
          savedGuildSettings = guildSettings

          const membership = membershipResult.data
          if (membership) {
            membershipStatus = membership.membership_status || 'full'
            trialStartedAt = membership.trial_started_at || null
            characterRole = membership.role || 'Member'
          }

          // Get expansion's raid day configuration
          let raidDays: number[] = []
          const expansionData = expansionDataResult.data
          if (expansionData) {
            raidDays = [
              expansionData.first_raid_day,
              expansionData.second_raid_day,
              expansionData.third_raid_day,
              expansionData.fourth_raid_day,
              expansionData.fifth_raid_day
            ].filter((day): day is number => day !== null && day !== undefined)
              .slice(0, expansionData.raid_days_per_week || 2)
            savedTimezone = (expansionData as any).timezone || 'UTC'
          }

          // Fall back to guild settings if no expansion raid days
          if (raidDays.length === 0) {
            raidDays = [
              (guildSettings as any).first_raid_day,
              (guildSettings as any).second_raid_day,
              (guildSettings as any).third_raid_day,
              (guildSettings as any).fourth_raid_day,
              (guildSettings as any).fifth_raid_day
            ].filter((day): day is number => day !== null && day !== undefined)
              .slice(0, (guildSettings as any).raid_days_per_week || 2)
          }
          savedRaidDays = raidDays

          // Fetch raid events and attendance records for the engine
          const todayStr = toDateString(new Date())
          const rollingWeeks = guildSettings.rolling_attendance_weeks || 4
          const periodStart = new Date()
          periodStart.setDate(periodStart.getDate() - (rollingWeeks * 7))

          const { data: raidEventsData } = await supabase
            .from('raid_events')
            .select('id, raid_date')
            .eq('guild_id', activeGuild.id)
            .eq('is_skipped', false)
            .gte('raid_date', toDateString(periodStart))
            .lte('raid_date', todayStr)

          const raidEventIds = raidEventsData?.map((r: { id: string }) => r.id) || []
          const { data: allAttendanceRecords } = raidEventIds.length > 0
            ? await supabase
                .from('attendance_records')
                .select('raid_event_id, signed_up, attended, no_call_no_show, was_late, was_benched, is_excused, points_override')
                .eq('character_id', characterId)
                .in('raid_event_id', raidEventIds)
            : { data: [] }

          // Compute attendance via engine (handles windowing, dedup, new member mode)
          const newMemberMode = (guildSettings.new_member_mode || 'raw') as 'raw' | 'fair' | 'minimum_gate'
          const attendanceResult = computeAttendance({
            records: allAttendanceRecords || [],
            raidEvents: raidEventsData || [],
            config: guildSettings,
            raidDays,
            memberJoinedAt: membership?.joined_at ? toDateString(new Date(membership.joined_at)) : undefined,
            newMemberMode,
            asOfDate: todayStr,
          })

          attendanceScore = attendanceResult.score
          attendedRaidCount = attendanceResult.raidsAttended
          totalRaidCount = attendanceResult.raidsInWindow

          // Compute spec roles for role bonus display
          const specName = activeCharacter?.spec?.name || null
          const className = activeCharacter?.class?.name || null
          let specRoles: string[] = []
          if (specName && className) {
            const fullSpecName = className === specName ? className : `${specName} ${className}`
            specRoles = getSpecRoles(fullSpecName)
            specRole = specRoles.length > 0 ? specRoles[0] : null
          }

          // Use engine for modifier display values
          const dummyScore = computeScore({
            itemRank: 0,
            character: {
              characterId,
              specId: activeCharacter?.spec?.id || null,
              specRoles,
              guildRank: characterRole,
              membershipStatus,
            },
            attendance: attendanceResult,
            config: guildSettings,
            itemPriority: null,
            timesPassed: 0,
          })
          roleModifier = dummyScore.components.rankModifier
          roleBonus = dummyScore.components.roleBonus
          trialPenaltyValue = dummyScore.components.trialPenalty

          // Get matched role label for display
          const roleResult = getRoleModifierWithLabel(specRoles, guildSettings)
          specRole = roleResult.matchedRole
        }
      } catch (error) {
        // Attendance system not set up yet, use rank only
      }

      // Await the submission items that started fetching in parallel with guild settings
      const { data: submissionItems } = await submissionItemsPromise

      if (!submissionItems || submissionItems.length === 0) {
        setLootPriority([])
        return
      }

      // Get unique loot item IDs
      type SubmissionItemData = { loot_item_id: string; rank: number; slot: number; submission: unknown }
      const itemIds = [...new Set(submissionItems.map((si: SubmissionItemData) => si.loot_item_id))]

      // Fetch item details
      const { data: items } = await supabase
        .from('loot_items')
        .select('id, name, wowhead_id, boss_name, classification, raid_tier_id, is_loot_council')
        .in('id', itemIds)

      if (!items) {
        setLootPriority([])
        return
      }

      // Filter items to tiers that are visible OR whose phase deadline has passed
      let filteredItems = items
      const raidTierIds = [...new Set(items.map((i: { raid_tier_id: string }) => i.raid_tier_id).filter(Boolean))]
      if (raidTierIds.length > 0) {
        // Fetch tier details and phase deadlines in parallel
        const expansionId = currentExpansion?.expansion_id || activeGuild.active_expansion_id
        const [tierDetailsResult, phaseDeadlinesResult] = await Promise.all([
          supabase
            .from('raid_tiers')
            .select('id, phase, master_sheet_visible')
            .in('id', raidTierIds),
          expansionId
            ? supabase
                .from('expansions')
                .select('phase_deadlines')
                .eq('id', expansionId)
                .single()
            : Promise.resolve({ data: null })
        ])

        const { data: tierDetails } = tierDetailsResult
        if (tierDetails) {
          let phaseDeadlines: Record<string, string | null> = {}
          if (phaseDeadlinesResult.data?.phase_deadlines) {
            phaseDeadlines = phaseDeadlinesResult.data.phase_deadlines as Record<string, string | null>
          }

          const now = new Date().toISOString()
          const accessibleTierIds = new Set(
            tierDetails
              .filter((t: { id: string; phase: number | null; master_sheet_visible: boolean | null }) => {
                // Tier is accessible if rankings are visible
                if (t.master_sheet_visible) return true
                // Or if the tier's phase deadline has passed
                if (t.phase != null) {
                  const deadline = phaseDeadlines[t.phase.toString()]
                  if (deadline && deadline < now) return true
                }
                return false
              })
              .map((t: { id: string }) => t.id)
          )
          filteredItems = items.filter((i: { raid_tier_id: string }) => accessibleTierIds.has(i.raid_tier_id))
        }
      }

      if (filteredItems.length === 0) {
        setLootPriority([])
        return
      }

      // Use filtered item IDs for downstream queries
      const filteredItemIds = [...new Set(filteredItems.map((i: { id: string }) => i.id))]

      // Fetch BLP data, competition data, and loot efficiency in parallel
      let blpData: Record<string, number> = {}
      let competitionMap: Record<string, { totalWanting: number; userRank: number }> = {}
      let totalReceivedCount = 0
      const receivedWowheadIds = new Set<number>()
      let prioritiesMap: Record<string, ItemPriority> = {}

      await Promise.all([
        // Priorities: fetch officer-set item priorities for score calculation
        (async () => {
          try {
            const { data: priorities } = await supabase
              .from('guild_item_priorities')
              .select('item_id, role_priorities, class_priorities, character_priorities, priority_bonuses')
              .eq('guild_id', activeGuild.id)
              .in('item_id', filteredItemIds)
            if (priorities) {
              for (const p of priorities) {
                prioritiesMap[p.item_id] = p as ItemPriority
              }
            }
          } catch {
            // Priorities not critical — scores will omit priority bonus
          }
        })(),
        // BLP: fetch times_passed for this character's items
        (async () => {
          if (savedGuildSettings?.blp_enabled) {
            try {
              const { data: blpRecords } = await supabase
                .from('blp_tracking')
                .select('loot_item_id, times_passed')
                .eq('character_id', characterId)
                .in('loot_item_id', filteredItemIds)
              if (blpRecords) {
                for (const rec of blpRecords) {
                  blpData[rec.loot_item_id] = rec.times_passed || 0
                }
              }
            } catch {
              // BLP not critical
            }
          }
        })(),
        // Competition: count others wanting the same items
        (async () => {
          try {
            const { data: allSubmissionsForItems } = await supabase
              .from('loot_submission_items')
              .select(`
                loot_item_id,
                rank,
                submission:loot_submissions!inner (
                  character_id,
                  guild_id,
                  status
                )
              `)
              .in('loot_item_id', filteredItemIds)
              .eq('submission.guild_id', activeGuild.id)
              .eq('submission.status', 'approved')
              .is('removed_at', null)

            if (allSubmissionsForItems) {
              // Group by item, count unique characters, find user's rank position
              const itemMap = new Map<string, Array<{ character_id: string; rank: number }>>()
              for (const sub of allSubmissionsForItems) {
                const submission = Array.isArray((sub as any).submission) ? (sub as any).submission[0] : (sub as any).submission
                if (!submission) continue
                const list = itemMap.get(sub.loot_item_id) || []
                list.push({ character_id: submission.character_id, rank: sub.rank })
                itemMap.set(sub.loot_item_id, list)
              }

              for (const [itemId, entries] of itemMap) {
                const uniqueCharacters = new Set(entries.map(e => e.character_id))
                const othersCount = uniqueCharacters.size - (uniqueCharacters.has(characterId) ? 1 : 0)

                // Find user's rank for this item
                const userEntry = entries.find(e => e.character_id === characterId)
                const userRank = userEntry ? entries
                  .filter(e => e.rank > userEntry.rank)
                  .reduce((acc, e) => {
                    acc.add(e.character_id)
                    return acc
                  }, new Set<string>()).size + 1 : uniqueCharacters.size

                competitionMap[itemId] = { totalWanting: othersCount, userRank }
              }
            }
          } catch {
            // Competition data not critical
          }
        })(),
        // Loot efficiency: count total received items + track which items were received
        // Match by wowhead_id so cross-tier awards (same physical item, different UUID) are detected
        (async () => {
          try {
            const { data, count } = await supabase
              .from('loot_history')
              .select('loot_item:loot_items(wowhead_id)', { count: 'exact' })
              .eq('character_id', characterId)
              .eq('guild_id', activeGuild.id)
            totalReceivedCount = count || 0
            if (data) {
              for (const h of data as { loot_item: { wowhead_id: number } | null }[]) {
                if (h.loot_item?.wowhead_id != null) {
                  receivedWowheadIds.add(h.loot_item.wowhead_id)
                }
              }
            }
          } catch {
            // Not critical
          }
        })()
      ])

      // Build priority items with character's rank and competition info
      const priorityItems: LootPriorityItem[] = []

      // Collect all item/rank pairs we need to check for ties (BATCHED - avoids N+1)
      type LootItemData = { id: string; name: string; wowhead_id: number; boss_name: string; classification: string | null; raid_tier_id: string }
      const itemRankPairs = filteredItems
        .map((item: LootItemData) => {
          const charRanking = submissionItems.find((si: SubmissionItemData) => si.loot_item_id === item.id)
          return charRanking ? { itemId: item.id, rank: charRanking.rank } : null
        })
        .filter((pair: { itemId: string; rank: number } | null): pair is { itemId: string; rank: number } => pair !== null)

      // Batch fetch all same-rank submissions for all items in ONE query
      // Note: Supabase returns joined relations as arrays
      let allSameRankSubmissions: Array<{
        loot_item_id: string
        rank: number
        submission: {
          id: string
          character_id: string
          guild_id: string
          status: string
          character: {
            id: string
            name: string
            class: { color_hex: string } | null
          } | {
            id: string
            name: string
            class: { color_hex: string } | null
          }[] | null
        } | {
          id: string
          character_id: string
          guild_id: string
          status: string
          character: {
            id: string
            name: string
            class: { color_hex: string } | null
          } | {
            id: string
            name: string
            class: { color_hex: string } | null
          }[] | null
        }[] | null
      }> = []

      if (itemRankPairs.length > 0) {
        // Build OR conditions for each item/rank pair
        const orConditions = itemRankPairs
          .map((pair: { itemId: string; rank: number }) => `and(loot_item_id.eq.${pair.itemId},rank.eq.${pair.rank})`)
          .join(',')

        const { data: batchedSubmissions } = await supabase
          .from('loot_submission_items')
          .select(`
            loot_item_id,
            rank,
            submission:loot_submissions!inner (
              id,
              character_id,
              guild_id,
              status,
              character:characters (
                id,
                name,
                class:wow_classes (
                  color_hex
                )
              )
            )
          `)
          .or(orConditions)
          .eq('submission.guild_id', activeGuild.id)
          .eq('submission.status', 'approved')
          .is('removed_at', null)

        allSameRankSubmissions = (batchedSubmissions || []) as typeof allSameRankSubmissions
      }

      // Group submissions by item_id for quick lookup
      const submissionsByItem = new Map<string, typeof allSameRankSubmissions>()
      for (const sub of allSameRankSubmissions) {
        const existing = submissionsByItem.get(sub.loot_item_id) || []
        existing.push(sub)
        submissionsByItem.set(sub.loot_item_id, existing)
      }

      for (const item of filteredItems) {
        // Skip items already received (matched by wowhead_id for cross-tier awards)
        if (receivedWowheadIds.has(item.wowhead_id)) continue

        // Find this character's ranking for this item
        const charRanking = submissionItems.find((si: SubmissionItemData) => si.loot_item_id === item.id)

        if (charRanking) {
          // Get same-rank submissions from our batched results
          const sameRankSubmissions = submissionsByItem.get(item.id) || []

          // Filter out current character and build tied characters list
          const tiedCharacters: TiedCharacter[] = sameRankSubmissions
            .filter(sub => {
              const submission = Array.isArray(sub.submission) ? sub.submission[0] : sub.submission
              return submission?.character_id !== characterId
            })
            .map(sub => {
              const submission = Array.isArray(sub.submission) ? sub.submission[0] : sub.submission
              const char = Array.isArray(submission?.character)
                ? submission.character[0]
                : submission?.character
              const classInfo = Array.isArray(char?.class) ? char.class[0] : char?.class

              return {
                name: char?.name || 'Unknown',
                class_color: classInfo?.color_hex || '#ffffff'
              }
            })

          // Calculate loot score for this item (now includes priority bonus — was hardcoded 0 before)
          const specName = activeCharacter?.spec?.name || null
          const className = activeCharacter?.class?.name || null
          let itemSpecRoles: string[] = []
          if (specName && className) {
            const fullSpecName = className === specName ? className : `${specName} ${className}`
            itemSpecRoles = getSpecRoles(fullSpecName)
          }
          const itemScoreResult = computeScore({
            itemRank: charRanking.rank,
            character: {
              characterId,
              specId: activeCharacter?.spec?.id || null,
              specRoles: itemSpecRoles,
              guildRank: characterRole,
              membershipStatus,
            },
            attendance: { score: attendanceScore },
            config: savedGuildSettings || {},
            itemPriority: prioritiesMap[item.id] || null,
            timesPassed: blpData[item.id] || 0,
          })
          const lootScore = itemScoreResult.total

          priorityItems.push({
            item_id: item.id,
            item_name: item.name,
            wowhead_id: item.wowhead_id,
            character_name: activeCharacter?.name || '',
            character_id: characterId,
            rank: charRanking.rank,
            loot_score: lootScore,
            tied_characters: tiedCharacters,
            classification: item.classification || 'Unlimited',
            boss_name: item.boss_name,
            raid_tier_id: item.raid_tier_id,
            is_loot_council: item.is_loot_council
          })
        }
      }

      // Sort by loot score (HIGHEST score = highest priority) and take top 5
      const topPriority = priorityItems
        .sort((a, b) => b.loot_score - a.loot_score)
        .slice(0, 5)

      setLootPriority(topPriority)

      // Hoist computed values to widget state
      // Score breakdown
      const blpValues = Object.values(blpData).map(tp => calculateBadLuckBonus(tp, savedGuildSettings || {}))
      setScoreBreakdown({
        attendanceScore,
        roleModifier,
        roleName: characterRole,
        roleBonus,
        roleLabel: specRole,
        trialPenalty: trialPenaltyValue,
        blpEnabled: !!savedGuildSettings?.blp_enabled,
        blpRange: savedGuildSettings?.blp_enabled && blpValues.length > 0
          ? { min: Math.min(...blpValues), max: Math.max(...blpValues) }
          : null
      })

      // Attendance snapshot
      const attPercentage = totalRaidCount > 0 ? attendedRaidCount / totalRaidCount : 0
      let tierInfo: { current: string; nextTier: string; raidsNeeded: number; nextBonus: number } | undefined
      if (savedGuildSettings?.attendance_type === 'breakpoint' && totalRaidCount > 0) {
        const thresholds = [
          { name: 'High', threshold: savedGuildSettings.max_attendance_threshold, bonus: savedGuildSettings.max_attendance_bonus },
          { name: 'Mid', threshold: savedGuildSettings.middle_attendance_threshold, bonus: savedGuildSettings.middle_attendance_bonus },
          { name: 'Low', threshold: savedGuildSettings.bottom_attendance_threshold, bonus: savedGuildSettings.bottom_attendance_bonus },
        ]
        let currentTier = 'None'
        let nextTier = thresholds[thresholds.length - 1]
        for (let i = 0; i < thresholds.length; i++) {
          if (attPercentage >= thresholds[i].threshold) {
            currentTier = thresholds[i].name
            nextTier = i > 0 ? thresholds[i - 1] : thresholds[i]
            break
          }
        }
        if (currentTier !== thresholds[0].name) {
          const raidsNeeded = Math.ceil(nextTier.threshold * totalRaidCount) - attendedRaidCount
          tierInfo = {
            current: currentTier,
            nextTier: nextTier.name,
            raidsNeeded: Math.max(0, raidsNeeded),
            nextBonus: nextTier.bonus
          }
        }
      }
      setAttendanceData({
        percentage: Math.round(attPercentage * 100),
        attended: attendedRaidCount,
        total: totalRaidCount,
        tierInfo
      })

      // Trial progress
      if (membershipStatus === 'trial') {
        const weeksRequired = savedGuildSettings?.trial_auto_promote_weeks || 4
        let weeksCompleted = 0
        if (trialStartedAt) {
          const started = new Date(trialStartedAt)
          const now = new Date()
          weeksCompleted = Math.floor((now.getTime() - started.getTime()) / (7 * 24 * 60 * 60 * 1000))
        }
        setTrialData({
          isTrial: true,
          startedAt: trialStartedAt,
          weeksCompleted: Math.min(weeksCompleted, weeksRequired),
          weeksRequired,
          autoPromote: savedGuildSettings?.trial_auto_promote_enabled || false
        })
      } else {
        setTrialData(null)
      }

      // Next raid dates
      if (savedRaidDays.length > 0) {
        setNextRaidDates(getNextRaidDates(savedRaidDays, savedTimezone, 2))
      } else {
        setNextRaidDates([])
      }

      // Competition data
      setCompetitionData(competitionMap)

      // Quick Win 1: Attendance trend sparkline (weekly breakdown)
      if (savedDeduplicatedRaidEvents.length > 0 && savedAttendanceRecords.length > 0) {
        const attendedIds = new Set(
          savedAttendanceRecords.filter(r => r.attended).map(r => r.raid_event_id)
        )
        const weekMap = new Map<string, { total: number; attended: number }>()
        for (const event of savedDeduplicatedRaidEvents) {
          const d = parseDate(event.raid_date)
          const weekKey = getISOWeekKey(d)
          const entry = weekMap.get(weekKey) || { total: 0, attended: 0 }
          entry.total++
          if (attendedIds.has(event.id)) entry.attended++
          weekMap.set(weekKey, entry)
        }
        const sorted = [...weekMap.entries()].sort((a, b) => a[0].localeCompare(b[0]))
        const last8 = sorted.slice(-8)
        setAttendanceTrend(last8.map(([, v]) => v.total > 0 ? v.attended / v.total : 0))
      } else {
        setAttendanceTrend([])
      }

      // Quick Win 2: Loot efficiency
      setLootEfficiency({ received: totalReceivedCount, total: filteredItemIds.length })

      // Quick Win 3: Per-item BLP data for highlights
      if (savedGuildSettings?.blp_enabled && Object.keys(blpData).length > 0) {
        const blpMap: Record<string, { timesPassed: number; bonus: number }> = {}
        for (const [itemId, tp] of Object.entries(blpData)) {
          const bonus = calculateBadLuckBonus(tp, savedGuildSettings || {})
          if (bonus > 0) {
            blpMap[itemId] = { timesPassed: tp, bonus }
          }
        }
        setItemBlpData(blpMap)
      } else {
        setItemBlpData({})
      }

      // Quick Win 4: Low-competition items (not in top 5, 0-1 competitors)
      const topItemIds = new Set(topPriority.map(p => p.item_id))
      const lowComp: Array<{ item_id: string; item_name: string; wowhead_id: number; boss_name: string; competitors: number }> = []
      for (const item of filteredItems) {
        if (topItemIds.has(item.id)) continue
        if (item.is_loot_council) continue // LC items aren't competing
        const comp = competitionMap[item.id]
        const competitors = comp?.totalWanting ?? 0
        if (competitors <= 1) {
          lowComp.push({
            item_id: item.id,
            item_name: item.name,
            wowhead_id: item.wowhead_id,
            boss_name: item.boss_name,
            competitors
          })
        }
      }
      lowComp.sort((a, b) => a.competitors - b.competitors || a.item_name.localeCompare(b.item_name))
      setLowCompetitionItems(lowComp.slice(0, 3))

    } catch (error) {
      console.error('Error loading loot priority:', error)
      showNotification('error', 'Couldn\'t load your loot priority. Try refreshing the page.')
    }
  }

  // Function to load received items (loot history)
  const loadReceivedItems = async (characterId: string) => {
    try {
      if (!characterId || !activeGuild) return

      const { data: historyData, error } = await supabase
        .from('loot_history')
        .select(`
          id,
          awarded_date,
          loot_item:loot_items (
            id,
            name,
            wowhead_id,
            boss_name,
            classification
          ),
          raid_tier:raid_tiers (
            name
          )
        `)
        .eq('character_id', characterId)
        .eq('guild_id', activeGuild.id)
        .order('awarded_date', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error loading received items:', error)
        setReceivedItems([])
        return
      }

      if (!historyData || historyData.length === 0) {
        setReceivedItems([])
        return
      }

      const transformedItems: ReceivedItem[] = historyData.map((h: any) => ({
        id: h.id,
        item_name: h.loot_item?.name || 'Unknown Item',
        wowhead_id: h.loot_item?.wowhead_id || 0,
        boss_name: h.loot_item?.boss_name || 'Unknown Boss',
        classification: h.loot_item?.classification || 'Unlimited',
        awarded_date: h.awarded_date,
        raid_tier_name: h.raid_tier?.name || 'Unknown Tier'
      }))

      setReceivedItems(transformedItems)

    } catch (error) {
      console.error('Error loading received items:', error)
      showNotification('error', 'Couldn\'t load your received items. Try refreshing the page.')
      setReceivedItems([])
    }
  }

  // Show welcome screen if no active guild (after loading completes)
  if (!guildLoading && !activeGuild) {
    return <WelcomeScreen />
  }

  // Determine if we're in a loading state
  const isLoading = loading || guildLoading

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-poppins">
      {/* Header - Always visible but stable during loading */}
      <div>
        <Heading level={1}>
          {isLoading || greetingIndex === null || !greetingName
            ? 'Welcome back!'
            : <>{GREETINGS[greetingIndex][0]}<span style={{ color: activeCharacter?.class?.color_hex || undefined }}>{greetingName}</span>{GREETINGS[greetingIndex][1]}</>
          }
        </Heading>
        <p className="text-muted-foreground mt-1 text-base">
          {isLoading
            ? 'Loading your dashboard...'
            : activeCharacter
              ? `Viewing loot for ${activeCharacter.name}`
              : activeGuild
                ? `Welcome back to ${activeGuild.name}`
                : 'Loading your dashboard...'}
        </p>
      </div>

      {/* Officer banner: unconverted Feral Druids in guild */}
      {!isLoading && isOfficer && activeGuild && (
        <GuardianConversionBanner guildId={activeGuild.id} />
      )}

      {/* Setup checklist for new guilds */}
      {!isLoading && <SetupChecklist />}

      {/* Show skeleton while loading */}
      {isLoading ? (
        <DashboardContentSkeleton />
      ) : (
        <>
          {/* Error Message (e.g., no expansion set) */}
          {error && (
            <div className="bg-background-elevated border border-accent/30 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <div className="text-accent mt-0.5">&#x26A0;&#xFE0F;</div>
                <div className="flex-1">
                  <p className="text-foreground font-semibold text-base">Action required</p>
                  <p className="text-muted-foreground text-sm mt-1">{error}</p>
                  {isOfficer && (
                    <Button className="mt-3" onClick={() => router.push('/admin/expansions')}>
                      Manage expansions
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Create Character CTA - Show when no active character */}
          {!activeCharacter && (
            <div
              onClick={() => setShowCreateCharacterModal(true)}
              className="bg-background-elevated border border-border rounded-xl p-6 hover:border-accent/50 transition cursor-pointer"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="w-16 h-16 bg-muted border border-border-strong rounded-full flex items-center justify-center flex-shrink-0">
                  <HugeiconsIcon icon={Add01Icon} size={32} className="text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h2 className="text-[20px] sm:text-[24px] font-bold text-foreground">
                    Create your first character
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Add a character to start submitting loot lists and tracking your priority
                  </p>
                </div>
                <Button className="w-full sm:w-auto">
                  Create character
                </Button>
              </div>
            </div>
          )}

          {/* Current Character Info Card with Stats */}
          {activeCharacter && (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Character Info Card */}
              <div className="bg-background-elevated border border-border rounded-xl p-6 lg:w-1/3">
                <div className="flex items-center gap-4">
                  {activeCharacter.class?.name ? (
                    <img
                      src={getClassIconUrl(activeCharacter.class.name)}
                      alt={activeCharacter.class.name}
                      width={64}
                      height={64}
                      fetchPriority="high"
                      className="w-16 h-16 rounded-full border-2 border-border/50 shadow-md"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center border-2 border-border/50 shadow-md">
                      <HugeiconsIcon icon={UserIcon} size={32} className="text-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Current character</p>
                    <h2 className="text-[24px] font-bold" style={{ color: activeCharacter.class?.color_hex || '#fff' }}>
                      {activeCharacter.name}
                    </h2>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {(activeCharacter.spec || activeCharacter.class) && (
                        <span className="text-sm text-muted-foreground">
                          {activeCharacter.spec?.name && activeCharacter.class?.name && activeCharacter.spec.name !== activeCharacter.class.name
                            ? `${activeCharacter.spec.name} ${activeCharacter.class.name}`
                            : activeCharacter.class?.name || activeCharacter.spec?.name}
                        </span>
                      )}
                      {activeCharacter.level && (
                        <span className="text-sm text-muted-foreground">Level {activeCharacter.level}</span>
                      )}
                      {activeCharacter.realm && (
                        <span className="text-sm text-muted-foreground">{activeCharacter.realm}</span>
                      )}
                      {activeCharacter.is_main && (
                        <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full border border-accent/30">
                          Main
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-6 lg:flex-1">
                {/* Completed Lists */}
                <div className="bg-background-elevated border border-border rounded-xl p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Completed lists</p>
                      <p className="text-[28px] sm:text-[42px] font-bold text-foreground mt-1 sm:mt-2 leading-none">{stats.completedLists}</p>
                    </div>
                    <div className="hidden sm:flex w-12 h-12 bg-success/20 rounded-full items-center justify-center">
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={24} className="text-success" />
                    </div>
                  </div>
                </div>

                {/* Pending Reviews */}
                <div className="bg-background-elevated border border-border rounded-xl p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Pending reviews</p>
                      <p className="text-[28px] sm:text-[42px] font-bold text-foreground mt-1 sm:mt-2 leading-none">{stats.pendingReviews}</p>
                    </div>
                    <div className="hidden sm:flex w-12 h-12 bg-warning/20 rounded-full items-center justify-center">
                      <HugeiconsIcon icon={AlertCircleIcon} size={24} className="text-warning" />
                    </div>
                  </div>
                </div>

                {/* Actions Needed */}
                <div className="bg-background-elevated border border-border rounded-xl p-3 sm:p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                    <div>
                      <p className="text-xs sm:text-sm text-muted-foreground">Actions needed</p>
                      <p className="text-[28px] sm:text-[42px] font-bold text-foreground mt-1 sm:mt-2 leading-none">{visibleActionsCount}</p>
                    </div>
                    <div className="hidden sm:flex w-12 h-12 bg-warning/20 rounded-full items-center justify-center">
                      <HugeiconsIcon icon={AlertCircleIcon} size={24} className="text-warning" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Insights Row */}
          {activeCharacter && (scoreBreakdown || attendanceData) && (
            <div className={`grid grid-cols-1 ${trialData?.isTrial ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3'} gap-4`}>
              {/* Widget 1: Score Breakdown */}
              {scoreBreakdown && (
                <div className="bg-background-elevated border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <HugeiconsIcon icon={AnalyticsUpIcon} size={18} className="text-accent" />
                    <h3 className="text-[15px] font-semibold text-foreground">Score breakdown</h3>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-foreground-secondary inline-flex items-center gap-1.5">Attendance <InfoTooltip content="Points earned from showing up to raids. Based on a rolling window configured by your officers." /></span>
                      <span className="text-[13px] font-medium text-foreground">+{scoreBreakdown.attendanceScore.toFixed(decimalPlaces)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-foreground-secondary inline-flex items-center gap-1.5">Rank bonus <span className="text-muted-foreground">({scoreBreakdown.roleName})</span> <InfoTooltip content="Guild-configured modifier based on your guild rank. Most members have 0." /></span>
                      <span className={`text-[13px] font-medium ${scoreBreakdown.roleModifier >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                        {scoreBreakdown.roleModifier >= 0 ? '+' : ''}{scoreBreakdown.roleModifier.toFixed(decimalPlaces)}
                      </span>
                    </div>
                    {scoreBreakdown.roleBonus !== 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-foreground-secondary inline-flex items-center gap-1.5">Role bonus {scoreBreakdown.roleLabel && <span className="text-muted-foreground">({getRoleDisplayName(scoreBreakdown.roleLabel as Role)})</span>} <InfoTooltip content="Guild-configured modifier based on your raid role (Tank, Healer, DPS)." /></span>
                        <span className={`text-[13px] font-medium ${scoreBreakdown.roleBonus >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                          {scoreBreakdown.roleBonus >= 0 ? '+' : ''}{scoreBreakdown.roleBonus.toFixed(decimalPlaces)}
                        </span>
                      </div>
                    )}
                    {scoreBreakdown.trialPenalty !== 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] text-foreground-secondary inline-flex items-center gap-1.5">Trial penalty <InfoTooltip content="Score penalty for trial members, giving established raiders priority. Resets when promoted to full member." /></span>
                        <span className="text-[13px] font-medium text-destructive">{scoreBreakdown.trialPenalty.toFixed(decimalPlaces)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-foreground-secondary inline-flex items-center gap-1.5">Bad luck protection <InfoTooltip content="Bonus points that grow the longer you go without receiving loot. Resets on your next item." /></span>
                      <span className="text-[13px] font-medium text-muted-foreground">
                        {scoreBreakdown.blpRange
                          ? `+${scoreBreakdown.blpRange.min.toFixed(decimalPlaces)} to +${scoreBreakdown.blpRange.max.toFixed(decimalPlaces)}`
                          : scoreBreakdown.blpEnabled
                            ? '+0.00'
                            : 'Not enabled'}
                      </span>
                    </div>
                    <div className="border-t border-border pt-2 mt-2">
                      <p className="text-[11px] text-muted-foreground">Base score before item ranking</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Widget 2: Attendance Snapshot */}
              {attendanceData && (
                <div className="bg-background-elevated border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <HugeiconsIcon icon={CheckmarkCircle01Icon} size={18} className="text-accent" />
                    <h3 className="text-[15px] font-semibold text-foreground">Attendance</h3>
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[28px] font-bold text-foreground leading-none">{attendanceData.percentage}%</span>
                    <span className="text-[13px] text-foreground-secondary">{attendanceData.attended} of {attendanceData.total} raids</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-background-inset rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(attendanceData.percentage, 100)}%` }}
                    />
                  </div>
                  {/* Attendance trend sparkline */}
                  {attendanceTrend.length >= 2 && (
                    <div className="mt-3 flex items-center gap-2">
                      <svg viewBox="0 0 100 24" className="w-full h-6" preserveAspectRatio="none">
                        <polyline
                          points={attendanceTrend.map((v, i) => `${(i / (attendanceTrend.length - 1)) * 100},${24 - v * 20 - 2}`).join(' ')}
                          fill="none"
                          stroke="hsl(var(--accent))"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="text-[10px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {attendanceTrend.length}w
                      </span>
                    </div>
                  )}
                  {attendanceData.tierInfo && (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      {attendanceData.tierInfo.raidsNeeded > 0
                        ? `${attendanceData.tierInfo.raidsNeeded} more raid${attendanceData.tierInfo.raidsNeeded !== 1 ? 's' : ''} to reach ${attendanceData.tierInfo.nextTier} tier (+${attendanceData.tierInfo.nextBonus.toFixed(decimalPlaces)})`
                        : `${attendanceData.tierInfo.current} tier`}
                    </p>
                  )}
                  {attendanceData.total === 0 && (
                    <p className="text-[11px] text-muted-foreground mt-2">No raids logged yet</p>
                  )}
                </div>
              )}

              {/* Widget 3: Trial Progress (conditional) OR Widget 4: Upcoming Raids */}
              {trialData?.isTrial ? (
                <div className="bg-background-elevated border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <HugeiconsIcon icon={Shield01Icon} size={18} className="text-warning" />
                    <h3 className="text-[15px] font-semibold text-foreground">Trial progress</h3>
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-[28px] font-bold text-foreground leading-none">
                      Week {trialData.weeksCompleted}
                    </span>
                    <span className="text-[13px] text-foreground-secondary">of {trialData.weeksRequired}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-background-inset rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full bg-warning rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((trialData.weeksCompleted / trialData.weeksRequired) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {trialData.autoPromote
                      ? trialData.weeksCompleted >= trialData.weeksRequired
                        ? 'Eligible for promotion'
                        : `Auto-promote after ${trialData.weeksRequired} weeks`
                      : 'Promotion at officer discretion'}
                  </p>
                </div>
              ) : (
                <div className="bg-background-elevated border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <HugeiconsIcon icon={Calendar03Icon} size={18} className="text-accent" />
                    <h3 className="text-[15px] font-semibold text-foreground">Next raid</h3>
                  </div>
                  {nextRaidDates.length > 0 ? (
                    <div className="space-y-2">
                      {nextRaidDates.map((date, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-accent/10 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                            <span className="text-[10px] font-medium text-accent leading-none">
                              {date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}
                            </span>
                            <span className="text-[16px] font-bold text-foreground leading-tight">
                              {date.getDate()}
                            </span>
                          </div>
                          <span className="text-[13px] text-foreground-secondary">
                            {date.toLocaleDateString(undefined, { weekday: 'long' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[13px] text-muted-foreground">No raid schedule set</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Loot Priority and Received Items Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Next in Line - Top Items */}
            <div className="bg-background-elevated border border-border rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <HugeiconsIcon icon={Award01Icon} size={28} className="text-accent flex-shrink-0 sm:hidden" />
                <HugeiconsIcon icon={Award01Icon} size={32} className="text-accent flex-shrink-0 hidden sm:block" />
                <div>
                  <h2 className="text-[20px] sm:text-[24px] font-bold text-foreground">Next in line</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">Your highest priority items</p>
                </div>
              </div>
              {lootPriority.length === 0 ? (
                <EmptyState
                  icon={ScrollIcon}
                  title="No priority items yet"
                  description={`Submit your loot list and once it's approved, your priorities will show up here after the deadline.${lootListDeadline ? ` Deadline: ${new Date(lootListDeadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}.` : ''}`}
                  size="compact"
                  action={{ label: "Create a list", onClick: () => router.push('/loot-list'), variant: "primary" }}
                />
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {lootPriority.map((item, index) => (
                    <div
                      key={item.item_id}
                      onClick={() => router.push(`/master-sheet?tier=${item.raid_tier_id}&item=${item.item_id}`)}
                      className="bg-background-inset border border-border rounded-xl p-3 sm:p-4 hover:border-accent/50 transition cursor-pointer"
                    >
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-accent/20 rounded-full flex items-center justify-center mt-0.5 sm:mt-0">
                          <span className="text-accent font-bold text-sm sm:text-lg">#{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1 min-w-0">
                            <div className="min-w-0 flex-1">
                              <ItemLink name={item.item_name} wowheadId={item.wowhead_id} clickable={true} showIcon={true} />
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {item.is_loot_council && (
                                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent/20 text-accent flex-shrink-0">Loot Council</span>
                              )}
                              {item.classification && item.classification !== 'Unlimited' && (
                                <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded-full border border-accent/30 flex-shrink-0 whitespace-nowrap">
                                  {item.classification}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground flex-wrap">
                            <span className="truncate max-w-[100px] sm:max-w-none">{item.boss_name}</span>
                            {!item.is_loot_council && (
                              <>
                                <span>•</span>
                                <span className="font-semibold text-foreground">{item.loot_score.toFixed(decimalPlaces)}</span>
                              </>
                            )}
                            {!item.is_loot_council && itemBlpData[item.item_id] && (
                              <>
                                <span>•</span>
                                <span className="text-accent font-medium" title={`Passed ${itemBlpData[item.item_id].timesPassed} time${itemBlpData[item.item_id].timesPassed !== 1 ? 's' : ''}`}>
                                  +{itemBlpData[item.item_id].bonus.toFixed(decimalPlaces)} BLP
                                </span>
                              </>
                            )}
                            {!item.is_loot_council && item.tied_characters.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-warning">Tied with:</span>
                                {item.tied_characters.map((char, idx) => (
                                  <span key={idx} className="flex items-center gap-1">
                                    <span style={{ color: char.class_color }} className="font-semibold">
                                      {char.name}
                                    </span>
                                    {idx < item.tied_characters.length - 1 && <span className="text-muted-foreground">,</span>}
                                  </span>
                                ))}
                              </>
                            )}
                          </div>
                          {!item.is_loot_council && competitionData[item.item_id] && competitionData[item.item_id].totalWanting > 0 && (
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
                              <span>{competitionData[item.item_id].totalWanting} other{competitionData[item.item_id].totalWanting !== 1 ? 's' : ''} want this</span>
                              <span>·</span>
                              <span className={competitionData[item.item_id].userRank === 1 ? 'text-success font-medium' : ''}>
                                you&apos;re #{competitionData[item.item_id].userRank}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Low-competition callout */}
              {lowCompetitionItems.length > 0 && (
                <div className="mt-4 bg-success/5 border border-success/20 rounded-xl p-4">
                  <p className="text-[12px] font-semibold text-success mb-2">Low competition on your list</p>
                  <div className="space-y-1.5">
                    {lowCompetitionItems.map(item => (
                      <div key={item.item_id} className="flex items-center justify-between min-w-0">
                        <div className="min-w-0 flex-1">
                          <ItemLink name={item.item_name} wowheadId={item.wowhead_id} clickable={true} showIcon={true} />
                        </div>
                        <span className="text-[11px] text-muted-foreground ml-2 flex-shrink-0">
                          {item.competitors === 0 ? 'No competition' : '1 other'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recently Received Items */}
            <div className="bg-background-elevated border border-border rounded-xl p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={28} className="text-success flex-shrink-0 sm:hidden" />
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={32} className="text-success flex-shrink-0 hidden sm:block" />
                <div>
                  <h2 className="text-[20px] sm:text-[24px] font-bold text-foreground">Recently received</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                    {lootEfficiency && lootEfficiency.total > 0
                      ? `Won ${lootEfficiency.received} of ${lootEfficiency.total} items`
                      : 'Your recent loot awards'}
                  </p>
                </div>
              </div>
              {receivedItems.length === 0 ? (
                <EmptyState
                  icon={StarIcon}
                  title="No loot received yet"
                  description="Your awarded items will appear here"
                  size="compact"
                  action={{ label: "View master sheet", onClick: () => router.push('/master-sheet'), variant: "outline" }}
                />
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {receivedItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-background-elevated border border-border rounded-xl p-3 sm:p-4"
                    >
                      <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                        <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-success/20 rounded-full flex items-center justify-center mt-0.5 sm:mt-0">
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} className="text-success sm:hidden" />
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} className="text-success hidden sm:block" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1 min-w-0">
                            <div className="min-w-0 flex-1">
                              <ItemLink name={item.item_name} wowheadId={item.wowhead_id} clickable={true} showIcon={true} />
                            </div>
                            {item.classification && item.classification !== 'Unlimited' && (
                              <span className="text-xs px-2 py-0.5 bg-success/20 text-success rounded-full border border-success/30 flex-shrink-0 whitespace-nowrap w-fit">
                                {item.classification}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground flex-wrap">
                            <span className="truncate max-w-[120px] sm:max-w-none">{item.boss_name}</span>
                            <span>•</span>
                            <span className="truncate max-w-[100px] sm:max-w-none">{item.raid_tier_name}</span>
                            <span>•</span>
                            <span>{new Date(item.awarded_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions Needed - Current Character */}
          {actionsNeeded.filter(submission => !dismissedActions.has(submission.id)).length > 0 && (
            <div className="bg-background-elevated border border-border rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h2 className="text-[20px] sm:text-[24px] font-bold text-foreground">Actions needed</h2>
              </div>
              <div className="space-y-4">
                {actionsNeeded.filter(submission => !dismissedActions.has(submission.id)).map(submission => (
                  <div
                    key={submission.id}
                    className="bg-background-inset border border-border rounded-xl p-4 hover:border-accent/50 transition cursor-pointer"
                    onClick={() => router.push('/loot-list')}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className="font-semibold text-base"
                            style={{ color: submission.character.class?.color_hex || '#fff' }}
                          >
                            {submission.character.name}
                          </span>
                          <span className="text-muted-foreground text-sm">•</span>
                          <span className="text-foreground text-sm">{submission.raid_tier.name}</span>
                          <StatusBadge status={submission.status as SubmissionStatus} />
                        </div>
                        <p className="text-muted-foreground text-sm mt-1">
                          {submission.status === 'draft'
                            ? 'Complete and submit your loot list'
                            : 'Address feedback and resubmit'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDismissAction(e, submission.id)}
                          title="Dismiss"
                          className="hover:!bg-destructive/10 hover:text-destructive"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} size={16} />
                        </Button>
                        <Button size="sm">
                          {submission.status === 'draft' ? 'Continue' : 'Revise'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </>
      )}

      {/* Create Character Modal */}
      <CreateCharacterModal
        isOpen={showCreateCharacterModal}
        onClose={() => {
          // Don't allow dismissal if user has no character — they need one to use the app
          if (!activeCharacter) return
          setShowCreateCharacterModal(false)
        }}
        suggestedName={activeCharacter?.name}
      />

      {/* Onboarding Modal for new users */}
      <OnboardingModal
        open={showOnboarding}
        onClose={handleCloseOnboarding}
      />

      {/* Guardian Druid conversion prompt for Feral Druid players */}
      {showGuardianConversion && guardianSpecId && activeCharacter && (
        <GuardianConversionModal
          open={showGuardianConversion}
          onClose={() => setShowGuardianConversion(false)}
          characterId={activeCharacter.id}
          characterName={activeCharacter.name}
          guardianSpecId={guardianSpecId}
          onSpecChanged={refreshCharacters}
        />
      )}
    </div>
  )
}