'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import WelcomeScreen from '@/app/components/WelcomeScreen'
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
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { DashboardDataSkeleton } from '@/components/ui/skeletons'
import { ScrollIcon, StarIcon } from '@hugeicons/core-free-icons'
import { StatusBadge, type SubmissionStatus } from '@/components/ui/status-badge'
import { getRaidIcon } from '@/utils/raidIcons'
import { Heading } from '@/components/ui/typography'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { useGuildContext } from '@/app/contexts/GuildContext'
import ItemLink from '@/app/components/ItemLink'
import { computeScore, computeAttendance, explainScore, getRoleModifierWithLabel, calculateBadLuckBonus, type ItemPriority, type AttendanceResult, type ScoreExplanation } from '@/domain/scoring'
import { getSpecRoles, getRoleDisplayName, type Role } from '@/domain/loot/spec-role-mapping'
import { refreshWowheadTooltips } from '@/lib/wowhead'
import { useNotification } from '@/app/contexts/NotificationContext'
import { trackClientEvent, usePagePerf } from '@/utils/analytics/client'
import { SetupGuide } from './SetupGuide'
import { hasFeature } from '@/domain/guild/feature-flags'
import type { RaidTeam } from '@/domain/raid-team/types'
import { resolveRaidDays, resolveRollingWeeks } from '@/domain/raid-team/settings'

// Get next N raid dates from configured raid days
function getNextRaidDates(raidDays: number[], timezone: string, count = 2): Date[] {
  const dates: Date[] = []

  // Determine "today" in the guild's timezone so we pick the correct day-of-week
  let todayInTz: Date
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' })
    const [y, m, d] = fmt.format(new Date()).split('-').map(Number)
    todayInTz = new Date(y, m - 1, d)
  } catch {
    // Invalid timezone — fall back to browser local time
    todayInTz = new Date()
    todayInTz.setHours(0, 0, 0, 0)
  }

  for (let i = 0; i < 14 && dates.length < count; i++) {
    const candidate = new Date(todayInTz)
    candidate.setDate(todayInTz.getDate() + i)
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

// Greeting tuples: [prefix, suffix]
type Greeting = readonly [string, string]

// Generic greetings (any faction/class)
const GENERIC_GREETINGS: Greeting[] = [
  ['Welcome back, ', ''],
  ['Ready for raid, ', '?'],
  ['May your loot be epic, ', ''],
  ['Time to hunt some purples, ', ''],
  ['The hunt begins, ', ''],
  ["Let's get that loot, ", ''],
  ['Good to see you, ', ''],
  ['Locked in and ready, ', ''],
  ['The council recognizes ', ''],
  ['Raid night awaits, ', ''],
  ['Loot awaits, ', ''],
  ['Back for more, ', '?'],
  ['Another raid day, ', ''],
  ['Eyes on the prize, ', ''],
  ['First pull soon, ', ''],
  ['Flasks up, ', ''],
  ['Bis or bust, ', ''],
  ['Your list is waiting, ', ''],
  ['Welcome to prog night, ', ''],
  ['Clear the instance, ', ''],
]

// Horde-only greetings
const HORDE_GREETINGS: Greeting[] = [
  ["Lok'tar Ogar, ", ''],
  ['Strength and honor, ', ''],
  ['Victory or death, ', ''],
  ['For the Horde, ', ''],
  ['Blood and thunder, ', ''],
  ['Spirits guide you, ', ''],
  ['Time is money, ', ''],
  ['Honor guide your blade, ', ''],
  ['Orgrimmar stands behind you, ', ''],
  ['Thunder Bluff welcomes you, ', ''],
  ['The Dark Lady watches over you, ', ''],
  ['We are the Horde, ', ''],
  ['No mercy, ', ''],
  ['Glory or death, ', ''],
  ['The ancestors watch, ', ''],
  ['Thrall would be proud, ', ''],
  ['For Orgrimmar, ', ''],
  ['War drums are beating, ', ''],
  ['The Horde needs you, ', ''],
  ['Warchief approves, ', ''],
]

// Alliance-only greetings
const ALLIANCE_GREETINGS: Greeting[] = [
  ['Well met, ', ''],
  ['Light be with you, ', ''],
  ['For the Alliance, ', ''],
  ['By the Light, ', ''],
  ['Glory to the Alliance, ', ''],
  ['Honor and glory, ', ''],
  ['Stand as one, ', ''],
  ['Keep your feet on the ground, ', ''],
  ['May the Light protect you, ', ''],
  ['Stormwind salutes you, ', ''],
  ['Walk with the Naaru, ', ''],
  ["King's honor, ", ''],
  ['Live to serve, ', ''],
  ['Light guide your path, ', ''],
  ['For Khaz Modan, ', ''],
  ['Strength in unity, ', ''],
  ['The Alliance stands strong, ', ''],
  ['Varian would be proud, ', ''],
  ['For Azeroth, ', ''],
  ['The Light prevails, ', ''],
]

// Class-specific greetings (keyed by class name)
const CLASS_GREETINGS: Record<string, Greeting[]> = {
  Warrior: [
    ['Charge in, ', ''],
    ['No retreat, ', ''],
    ['Arms or fury, ', '?'],
    ['Shields up, ', ''],
    ['Recklessness engaged, ', ''],
    ['Execute phase coming, ', ''],
  ],
  Paladin: [
    ['The Light protects, ', ''],
    ['Bubble hearth later, ', ''],
    ['Justice demands it, ', ''],
    ['Lay on Hands ready, ', ''],
    ['Blessings up, ', ''],
    ['Retribution awaits, ', ''],
  ],
  Hunter: [
    ['All loot is hunter loot, ', ''],
    ['Lock and load, ', ''],
    ['Eyes of the beast, ', ''],
    ['Misdirect on the tank, ', ''],
    ['Feign death ready, ', ''],
    ['Steady shot, ', ''],
  ],
  Rogue: [
    ['Sneaking in, ', ''],
    ['From the shadows, ', ''],
    ['Tricks on you, ', ''],
    ['Vanish is up, ', ''],
    ['Cloak and dagger, ', ''],
    ['Backstab ready, ', ''],
  ],
  Priest: [
    ['Stay in the light, ', ''],
    ["Don't forget to shield, ", ''],
    ['Fortitude up, ', ''],
    ['Prayer of mending on, ', ''],
    ['Spirit shell ready, ', ''],
    ['Mind control resisted, ', ''],
  ],
  'Death Knight': [
    ['Suffer well, ', ''],
    ['The chill of death awaits, ', ''],
    ['Rise up, ', ''],
    ['Army of the dead standing by, ', ''],
    ['Grip them close, ', ''],
    ['Runeblades sharpened, ', ''],
  ],
  Shaman: [
    ['The elements call, ', ''],
    ['Totems down, ', ''],
    ['Storm, earth and fire, ', ''],
    ['Heroism ready, ', ''],
    ['Chain heal bouncing, ', ''],
    ['Ankh is off cooldown, ', ''],
  ],
  Mage: [
    ['Conjure up some luck, ', ''],
    ['Portals are extra, ', ''],
    ['Int food ready, ', ''],
    ['Blink and you miss it, ', ''],
    ['Spellsteal on cooldown, ', ''],
    ['Arcane intellect up, ', ''],
  ],
  Warlock: [
    ['Your soul is mine, ', ''],
    ['Summoning stone is up, ', ''],
    ['Fear nothing, ', ''],
    ['Soulstone ready, ', ''],
    ['Healthstone in your bags, ', ''],
    ['Curses applied, ', ''],
  ],
  Druid: [
    ['Nature calls, ', ''],
    ['Innervate ready, ', ''],
    ['Wild growth, ', ''],
    ['Bear form engaged, ', ''],
    ['Rebirth is off cooldown, ', ''],
    ['Shapeshifting in, ', ''],
  ],
}

// Time-of-day greetings (small chance to appear)
function getTimeGreeting(): Greeting | null {
  const hour = new Date().getHours()
  if (hour < 6) return ['Burning the midnight oil, ', '']
  if (hour < 8) return ['Early bird gets the loot, ', '']
  if (hour >= 23) return ['Late night grind, ', '?']
  return null
}

// Pick a random greeting weighted toward specificity: class > faction > generic
function pickGreeting(faction?: string, className?: string): Greeting {
  // 20% chance to show a time-of-day greeting if one applies
  const timeGreet = getTimeGreeting()
  if (timeGreet && Math.random() < 0.2) return timeGreet

  const pool: Greeting[] = []

  // Always include generic
  pool.push(...GENERIC_GREETINGS)

  // Add faction-specific
  if (faction === 'Horde') {
    pool.push(...HORDE_GREETINGS)
  } else if (faction === 'Alliance') {
    pool.push(...ALLIANCE_GREETINGS)
  }

  // Add class-specific (doubled to weight them higher)
  const classGreets = className ? CLASS_GREETINGS[className] : undefined
  if (classGreets) {
    pool.push(...classGreets, ...classGreets)
  }

  return pool[Math.floor(Math.random() * pool.length)]
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
  character_id: string
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

export default function DashboardContent() {
  const { activeGuild, activeMember, activeCharacter, userGuilds, loading: guildLoading, isOfficer, hasPermission, currentExpansion, characterMemberships, user, refreshCharacters } = useGuildContext()
  const { showNotification } = useNotification()
  const [raidTiers, setRaidTiers] = useState<RaidTier[]>([])
  const [loading, setLoading] = useState(true)
  const [insightsLoading, setInsightsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [greeting, setGreeting] = useState<Greeting | null>(null)
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
  const [showFirstLootCelebration, setShowFirstLootCelebration] = useState(false)

  // Stats state
  const [stats, setStats] = useState({
    completedLists: 0,
    pendingReviews: 0,
    actionsNeeded: 0
  })

  // Loot list deadline for empty state messaging
  const [lootListDeadline, setLootListDeadline] = useState<string | null>(null)
  const [phaseDeadlines, setPhaseDeadlines] = useState<Record<string, string | null>>({})

  // Guild settings for display formatting
  const [decimalPlaces, setDecimalPlaces] = useState<number>(2)

  // Widget state — score explanation from the engine + BLP range (which is item-dependent)
  const [scoreExplanation, setScoreExplanation] = useState<ScoreExplanation | null>(null)
  const [blpInfo, setBlpInfo] = useState<{ enabled: boolean; range: { min: number; max: number } | null }>({ enabled: false, range: null })

  const [attendanceData, setAttendanceData] = useState<{
    percentage: number
    attended: number
    total: number
    tierInfo?: { current: string; nextTier: string; raidsNeeded: number; nextBonus: number }
    missedRaids?: { date: string; status: string }[]
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

  // Team membership for the active character (Pro guilds only)
  const [characterTeams, setCharacterTeams] = useState<Pick<RaidTeam, 'id' | 'name' | 'color_hex' | 'raid_days_override' | 'rolling_weeks_override'>[]>([])
  const [teamCharacterIds, setTeamCharacterIds] = useState<Set<string> | null>(null)

  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Overview'
  }, [])

  // Fetch teams for the active character
  useEffect(() => {
    if (!activeCharacter?.id || !activeGuild?.id || !hasFeature(activeGuild, 'raid_teams')) {
      setCharacterTeams([])
      setTeamCharacterIds(null)
      return
    }
    let cancelled = false
    supabase
      .from('raid_team_members')
      .select('raid_team_id, raid_teams (id, name, color_hex, raid_days_override, rolling_weeks_override)')
      .eq('character_id', activeCharacter.id)
      .eq('guild_id', activeGuild.id)
      .then(({ data }: { data: any[] | null }) => {
        if (!cancelled && data) {
          const teams = data
            .map(m => m.raid_teams)
            .filter(Boolean) as Pick<RaidTeam, 'id' | 'name' | 'color_hex' | 'raid_days_override' | 'rolling_weeks_override'>[]
          setCharacterTeams(teams)
        }
      })
    return () => { cancelled = true }
  }, [activeCharacter?.id, activeGuild?.id, activeGuild?.subscription_tier, supabase])

  // Fetch character IDs of all members on the active character's raid teams
  useEffect(() => {
    if (characterTeams.length === 0 || !activeGuild?.id) {
      setTeamCharacterIds(null)
      return
    }
    let cancelled = false
    const teamIds = characterTeams.map(t => t.id)
    supabase
      .from('raid_team_members')
      .select('character_id')
      .eq('guild_id', activeGuild.id)
      .in('raid_team_id', teamIds)
      .then(({ data }: { data: Array<{ character_id: string }> | null }) => {
        if (cancelled) return
        setTeamCharacterIds(new Set((data || []).map(m => m.character_id)))
      })
    return () => { cancelled = true }
  }, [characterTeams, activeGuild?.id, supabase])

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

  // Track page view and load performance
  useEffect(() => {
    if (activeGuild?.id) trackClientEvent('overview_page_viewed', { guild_id: activeGuild.id })
  }, [activeGuild?.id])
  usePagePerf('overview', loading)

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
    if (!greeting) {
      setGreeting(pickGreeting(activeGuild?.faction, activeCharacter?.class?.name))
    }
    if (activeCharacter?.name) {
      setGreetingName(activeCharacter.name)
      return
    }
    if (user) {
      setGreetingName(user?.user_metadata?.custom_claims?.global_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'User')
    }
  }, [activeCharacter, activeGuild, user])

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
        // Fire all independent queries in parallel: tiers, deadlines, and dashboard data
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
            .single(),
          // Start dashboard data loading in parallel — it only needs
          // activeCharacter, guildId, and expansionId (not tier results)
          loadDashboardData(user.id, activeGuild.id, [], expansionId),
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
          const allPhaseDeadlines = expansionDeadlineData.phase_deadlines as Record<string, string | null>
          setPhaseDeadlines(allPhaseDeadlines)
          // Find the nearest future deadline across all phases
          const deadlines = Object.values(allPhaseDeadlines)
            .filter((d): d is string => d !== null)
            .sort()
          const now = new Date().toISOString()
          const nextDeadline = deadlines.find(d => d > now) || deadlines[deadlines.length - 1] || null
          setLootListDeadline(nextDeadline)
        } else {
          setPhaseDeadlines({})
          setLootListDeadline(null)
        }
      } catch (error) {
        console.error('Error loading overview data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData().catch(console.error)
  }, [user, guildLoading, activeGuild, activeCharacter, currentExpansion, characterTeams])

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

      // Build a phase-to-tier-names map for display labels
      const phaseTierNames: Record<number, string[]> = {}
      for (const tier of currentExpansionTiers) {
        if (tier.phase != null) {
          if (!phaseTierNames[tier.phase]) phaseTierNames[tier.phase] = []
          phaseTierNames[tier.phase].push(tier.name)
        }
      }

      // Fast path: submissions query for stats (renders immediately)
      // Slow path: loot priority + received items (load in background, render progressively)
      const submissionsResult = await supabase
        .from('loot_submissions')
        .select('id, character_id, guild_id, raid_tier_id, expansion_id, phase, status, updated_at')
        .eq('character_id', activeCharacter.id)
        .eq('guild_id', guildId)
        .eq('expansion_id', expansionId)
        .order('updated_at', { ascending: false })

      // Fire slow queries in background — they'll update their own state when done
      setInsightsLoading(true)
      Promise.all([
        loadLootPriority([activeCharacter.id]),
        loadReceivedItems(activeCharacter.id)
      ]).finally(() => setInsightsLoading(false))

      // Process submissions result (stats + actions)
      const { data: submissions, error: submissionsError } = submissionsResult
      if (submissionsError) {
        console.error('Error loading submissions:', submissionsError)
      }

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

      const actions = transformedSubmissions.filter(s =>
        s.status === 'draft' || s.status === 'needs_revision'
      )
      setActionsNeeded(actions)

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
      let missedRaids: { date: string; status: string }[] = []
      let trialPenaltyValue = 0
      let baseExplanation: ScoreExplanation | null = null
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

      // Start all independent fetches in parallel: submission items, guild settings, membership, expansion, raid events
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
            .select('raid_start_date, raid_days_per_week, first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day, timezone')
            .eq('id', activeGuild.active_expansion_id)
            .single()
        : Promise.resolve({ data: null, error: null })

      // Start raid events query eagerly with a generous 12-week window.
      // We'll filter client-side to the actual rolling_attendance_weeks once settings arrive.
      // This eliminates a sequential round-trip (previously waited for settings first).
      const maxRollingWeeks = 12
      const eagerPeriodStart = new Date()
      eagerPeriodStart.setDate(eagerPeriodStart.getDate() - (maxRollingWeeks * 7))
      const todayStr = toDateString(new Date())

      // Fetch team events + unassigned events for denominator.
      // Fill-in credit is handled separately via all guild events.
      const activeTeam = characterTeams.length > 0 ? characterTeams[0] : null
      const raidEventsPromise = activeTeam
        ? supabase
            .from('raid_events')
            .select('id, raid_date, raid_team_id')
            .eq('guild_id', activeGuild.id)
            .eq('is_skipped', false)
            .gte('raid_date', toDateString(eagerPeriodStart))
            .lte('raid_date', todayStr)
            .or(`raid_team_id.eq.${activeTeam.id},raid_team_id.is.null`)
        : supabase
            .from('raid_events')
            .select('id, raid_date, raid_team_id')
            .eq('guild_id', activeGuild.id)
            .eq('is_skipped', false)
            .gte('raid_date', toDateString(eagerPeriodStart))
            .lte('raid_date', todayStr)

      // Await all independent fetches in parallel (5 queries instead of 3 + 1 sequential)
      const [settingsResult, membershipResult, expansionDataResult, raidEventsResult] = await Promise.all([
        guildSettingsPromise,
        membershipPromise,
        expansionDataPromise,
        raidEventsPromise
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
          const raidDaySource = expansionData || guildSettings
          if (raidDaySource) {
            const baseSettings = {
              raid_days_per_week: (raidDaySource as any).raid_days_per_week || 2,
              first_raid_day: (raidDaySource as any).first_raid_day ?? null,
              second_raid_day: (raidDaySource as any).second_raid_day ?? null,
              third_raid_day: (raidDaySource as any).third_raid_day ?? null,
              fourth_raid_day: (raidDaySource as any).fourth_raid_day ?? null,
              fifth_raid_day: (raidDaySource as any).fifth_raid_day ?? null,
            }
            // Apply team raid day overrides if character is on a team
            raidDays = activeTeam?.raid_days_override
              ? resolveRaidDays(baseSettings, activeTeam.raid_days_override)
              : resolveRaidDays(baseSettings, null)
            if (expansionData) {
              savedTimezone = (expansionData as any).timezone || 'UTC'
            }
          }
          savedRaidDays = raidDays

          // Apply team rolling weeks override if applicable
          const rollingWeeks = activeTeam?.rolling_weeks_override != null
            ? resolveRollingWeeks(guildSettings.rolling_attendance_weeks || 4, activeTeam.rolling_weeks_override)
            : guildSettings.rolling_attendance_weeks || 4
          const actualPeriodStart = new Date()
          actualPeriodStart.setDate(actualPeriodStart.getDate() - (rollingWeeks * 7))
          const actualPeriodStartStr = toDateString(actualPeriodStart)

          const raidEventsData = (raidEventsResult.data || []).filter(
            (e: { raid_date: string }) => e.raid_date >= actualPeriodStartStr
          )

          // Fetch ALL character attendance records (guild-wide, not just team events)
          // so we can detect fill-in attendance on other teams' events
          const { data: allCharRecords } = await supabase
            .from('attendance_records')
            .select('raid_event_id, signed_up, attended, no_call_no_show, was_late, was_benched, is_excused, points_override')
            .eq('character_id', characterId)

          type AttRecord = { raid_event_id: string; signed_up: boolean; attended: boolean; no_call_no_show: boolean; was_late?: boolean; was_benched?: boolean; is_excused?: boolean; points_override?: number | null }
          const charRecords: AttRecord[] = allCharRecords || []
          const teamEventIds = new Set(raidEventsData.map((r: { id: string }) => r.id))

          // Records on team events (for primary scoring)
          const teamRecords = charRecords.filter((r: AttRecord) => teamEventIds.has(r.raid_event_id))

          // Fill-in: records on events NOT in team events (other teams' events)
          let fillInEvents: { id: string; raid_date: string }[] = []
          let fillInRecords: { raid_event_id: string; attended: boolean }[] = []
          const raidDaysPerWeek = raidDays.length || (raidDaySource as any)?.raid_days_per_week || 2

          if (activeTeam) {
            const fillInRecordCandidates = charRecords.filter((r: AttRecord) => !teamEventIds.has(r.raid_event_id) && r.attended)
            if (fillInRecordCandidates.length > 0) {
              // Fetch the events for these fill-in records to get dates
              const fillInEventIds = fillInRecordCandidates.map(r => r.raid_event_id)
              const { data: fillInEventData } = await supabase
                .from('raid_events')
                .select('id, raid_date')
                .in('id', fillInEventIds)
                .eq('is_skipped', false)
              fillInEvents = fillInEventData || []
              fillInRecords = fillInRecordCandidates.map(r => ({ raid_event_id: r.raid_event_id, attended: r.attended }))
            }
          }

          // Compute attendance via engine (handles windowing, dedup, new member mode, fill-in credit)
          const newMemberMode = (guildSettings.new_member_mode || 'raw') as 'raw' | 'fair' | 'minimum_gate'
          const raidStartDate = (expansionData as { raid_start_date?: string | null } | null)?.raid_start_date || undefined
          const attendanceResult = computeAttendance({
            records: teamRecords,
            raidEvents: raidEventsData || [],
            config: guildSettings,
            raidDays,
            memberJoinedAt: membership?.joined_at ? toDateString(new Date(membership.joined_at)) : undefined,
            newMemberMode,
            asOfDate: todayStr,
            raidStartDate,
            fillInEvents: fillInEvents.length > 0 ? fillInEvents : undefined,
            fillInRecords: fillInRecords.length > 0 ? fillInRecords : undefined,
            weeklyAttendanceCap: activeTeam ? raidDaysPerWeek : undefined,
          })

          attendanceScore = attendanceResult.score
          attendedRaidCount = attendanceResult.raidsAttended
          totalRaidCount = attendanceResult.raidsInWindow

          // Build missed raids list — only events that count toward this character's attendance
          // Skip on the initial pass when teams haven't loaded yet (prevents flash)
          const teamsResolved = !hasFeature(activeGuild, 'raid_teams') || characterTeams.length > 0
          if (totalRaidCount > 0 && teamsResolved) {
            const recordByEvent = new Map<string, AttRecord>()
            for (const r of teamRecords) recordByEvent.set(r.raid_event_id, r)

            // Start with events relevant to this character's team (or all guild events if no team)
            let relevantEvents = (raidEventsData as { id: string; raid_date: string }[])
              .filter(e => !activeTeam || teamEventIds.has(e.id))
            if (raidDays.length > 0) {
              relevantEvents = relevantEvents.filter(e => {
                const [y, m, d] = e.raid_date.split('-').map(Number)
                return raidDays.includes(new Date(y, m - 1, d).getDay())
              })
            }
            // Deduplicate by date — prefer events with attendance records
            const byDate = new Map<string, { id: string; raid_date: string }>()
            for (const e of relevantEvents) {
              const existing = byDate.get(e.raid_date)
              if (!existing) {
                byDate.set(e.raid_date, e)
              } else if (recordByEvent.has(e.id) && !recordByEvent.has(existing.id)) {
                byDate.set(e.raid_date, e)
              }
            }

            missedRaids = Array.from(byDate.values())
              .filter(e => {
                const rec = recordByEvent.get(e.id)
                if (!rec) return true
                if (rec.no_call_no_show) return true
                if (rec.is_excused) return true
                if (rec.was_late) return true
                if (rec.was_benched) return true
                if (!rec.attended) return true
                return false
              })
              .map(e => {
                const rec = recordByEvent.get(e.id)
                let status = 'absent'
                if (rec?.no_call_no_show) status = 'no_show'
                else if (rec?.is_excused) status = 'excused'
                else if (rec?.was_benched) status = 'benched'
                else if (rec?.was_late) status = 'late'
                return { date: e.raid_date, status }
              })
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 8)
          }

          // Compute spec roles for role bonus display
          const specName = activeCharacter?.spec?.name || null
          const className = activeCharacter?.class?.name || null
          let specRoles: string[] = []
          if (specName && className) {
            const fullSpecName = className === specName ? className : `${specName} ${className}`
            specRoles = getSpecRoles(fullSpecName)
            specRole = specRoles.length > 0 ? specRoles[0] : null
          }

          // Use engine for modifier display values + explanation
          const baseInput = {
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
          }
          const dummyScore = computeScore(baseInput)
          roleModifier = dummyScore.components.rankModifier
          roleBonus = dummyScore.components.roleBonus
          trialPenaltyValue = dummyScore.components.trialPenalty

          // Generate contract-driven explanation for the score widget
          baseExplanation = explainScore(dummyScore, baseInput)

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

          // Filter out current character and build tied characters list.
          // Team filtering is applied at render time so it responds to
          // teamCharacterIds loading without re-running this query.
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
                character_id: submission?.character_id || '',
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
      // Score explanation from the engine (contract-driven)
      setScoreExplanation(baseExplanation)

      // BLP range is item-dependent (varies across the player's list), so computed separately
      const blpValues = Object.values(blpData).map(tp => calculateBadLuckBonus(tp, savedGuildSettings || {}))
      setBlpInfo({
        enabled: !!savedGuildSettings?.blp_enabled,
        range: savedGuildSettings?.blp_enabled && blpValues.length > 0
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
        tierInfo,
        missedRaids: missedRaids.length > 0 ? missedRaids : undefined,
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

      // First loot celebration — one-time confetti per character
      if (transformedItems.length > 0 && activeCharacter) {
        const celebKey = `lootlist_first_loot_${activeCharacter.id}`
        if (typeof window !== 'undefined' && !localStorage.getItem(celebKey)) {
          localStorage.setItem(celebKey, 'true')
          setShowFirstLootCelebration(true)
          setTimeout(() => setShowFirstLootCelebration(false), 3000)
        }
      }

    } catch (error) {
      console.error('Error loading received items:', error)
      showNotification('error', 'Couldn\'t load your received items. Try refreshing the page.')
      setReceivedItems([])
    }
  }

  // Show welcome screen if no active guild (after loading completes)
  // Dev preview: ?welcome=true forces the welcome screen for testing
  const forceWelcome = process.env.NODE_ENV === 'development' && searchParams.get('welcome') === 'true'
  if ((!guildLoading && !activeGuild) || forceWelcome) {
    return <WelcomeScreen />
  }

  // Dynamic contextual subtitle for the overview greeting
  // Memoized, deterministic subtitle — avoids flicker as data loads in.
  // Picks the highest-priority contextual line rather than rolling randomly.
  const contextualSubtitle = useMemo(() => {
    const charName = activeCharacter?.name || 'adventurer'

    // Priority 1: Raid night imminent
    if (nextRaidDates.length > 0) {
      const next = nextRaidDates[0]
      const now = new Date()
      const diffHours = (next.getTime() - now.getTime()) / (1000 * 60 * 60)
      if (diffHours > 0 && diffHours <= 24) return 'Raid night is today. Flasks ready?'
      if (diffHours > 24 && diffHours <= 48) return 'Raid night is tomorrow.'
    }

    // Priority 2: Deadline approaching
    if (lootListDeadline) {
      const deadline = new Date(lootListDeadline)
      const diffDays = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (diffDays > 0 && diffDays <= 3) {
        return `Loot List deadline in ${diffDays} day${diffDays === 1 ? '' : 's'}.`
      }
    }

    // Priority 3: Officer actions waiting
    if (hasPermission('manage_submissions') && actionsNeeded.length > 0) {
      return `${actionsNeeded.length} submission${actionsNeeded.length === 1 ? '' : 's'} waiting for review.`
    }

    // Priority 4: #1 priority item
    if (lootPriority.length > 0) {
      return `#1 priority: ${lootPriority[0].item_name}`
    }

    // Priority 5: Items received
    if (receivedItems.length > 0) {
      return `${receivedItems.length} item${receivedItems.length === 1 ? '' : 's'} received this tier. Keep it up.`
    }

    return `Viewing loot for ${charName}`
  }, [activeCharacter?.name, nextRaidDates, lootListDeadline, hasPermission, actionsNeeded.length, lootPriority, receivedItems.length])

  // Hero section (greeting + character card) can render as soon as guild context is ready.
  // Dashboard data sections below the hero wait for the full data load.
  const heroReady = !guildLoading && !!activeGuild
  const dataLoading = loading || guildLoading

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-poppins">
      {/* First loot celebration */}
      {showFirstLootCelebration && (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 flex items-center justify-center">
            <p
              className="text-3xl sm:text-5xl font-black tracking-wider animate-fade-in"
              style={{
                color: '#a335ee',
                textShadow: '0 0 40px rgba(163, 53, 238, 0.5), 0 0 80px rgba(163, 53, 238, 0.2)',
              }}
            >
              Grats!
            </p>
          </div>
          {Array.from({ length: 40 }, (_, i) => (
            <span
              key={i}
              className="absolute text-lg"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                animation: `loot-rain ${2 + Math.random() * 2}s ease-in ${Math.random() * 1}s forwards`,
              }}
            >
              {['✨', '🎉', '⭐', '💜', '🟣', '💎'][Math.floor(Math.random() * 6)]}
            </span>
          ))}
          <style>{`
            @keyframes loot-rain {
              0% { transform: translateY(0) rotate(0deg); opacity: 1; }
              80% { opacity: 1; }
              100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
            }
          `}</style>
        </div>
      )}

      {/* Header - Always visible but stable during loading */}
      <div>
        <Heading level={1}>
          {!heroReady || !greeting || !greetingName
            ? 'Welcome back!'
            : <>{greeting[0]}<span style={{ color: activeCharacter?.class?.color_hex || undefined }}>{greetingName}</span>{greeting[1]}</>
          }
        </Heading>
        <p className="text-muted-foreground mt-1 text-base">
          {!heroReady || (activeCharacter && insightsLoading)
            ? 'Loading your dashboard...'
            : activeCharacter
              ? contextualSubtitle
              : activeGuild
                ? `Welcome back to ${activeGuild.name}`
                : 'Loading your dashboard...'}
        </p>
        {(characterTeams.length > 0 || (activeCharacter && raidTiers.length > 0)) && (
          <div className="flex items-center gap-2 flex-wrap mt-4">
            {characterTeams.map(team => (
              <span
                key={team.id}
                className="inline-flex items-center gap-2 h-7 px-3 rounded-full border border-border bg-background-elevated"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full border border-border/50 shrink-0"
                  style={{ backgroundColor: team.color_hex }}
                />
                <span className="text-xs text-foreground">{team.name}</span>
              </span>
            ))}
            {activeCharacter && raidTiers.length > 0 && (() => {
              const phases = [...new Set(raidTiers.map(t => t.phase).filter((p): p is number => p != null))].sort((a, b) => a - b)
              if (phases.length === 0) return null

              const phaseStatus: Record<number, string | undefined> = {}
              for (const sub of allSubmissions) {
                if (sub.phase != null) phaseStatus[sub.phase] = sub.status
              }

              const statusTextColor = (status?: string) => {
                if (status === 'approved') return 'text-success'
                if (status === 'pending') return 'text-yellow-500'
                if (status === 'needs_revision') return 'text-destructive'
                return 'text-muted-foreground'
              }

              const statusLabel = (status?: string) => {
                if (status === 'approved') return 'Approved'
                if (status === 'pending') return 'Pending'
                if (status === 'needs_revision') return 'Revise'
                if (status === 'draft') return 'Draft'
                return 'Not started'
              }

              return (
                <>
                  {phases.map(phase => {
                    const tiersInPhase = raidTiers.filter(t => t.phase === phase)
                    const iconTier = tiersInPhase[0]
                    const tierNames = tiersInPhase.map(t => t.name).join(', ')
                    const status = phaseStatus[phase]

                    return (
                      <button
                        key={phase}
                        onClick={() => router.push(`/loot-list?phase=${phase}`)}
                        className="inline-flex items-center gap-2 h-7 pl-1.5 pr-3 rounded-full border border-border bg-background-elevated hover:border-accent/40 transition-colors cursor-pointer"
                      >
                        <span className="px-1.5 py-0.5 rounded bg-accent/20 text-accent text-[10px] font-bold">P{phase}</span>
                        {iconTier && (
                          <img
                            src={getRaidIcon(iconTier.name)}
                            alt=""
                            className="w-4 h-4 rounded border border-border/50"
                          />
                        )}
                        <span className="text-xs text-foreground">{tierNames}</span>
                        <span className="text-xs text-muted-foreground/60" aria-hidden="true">·</span>
                        <span className={`text-xs ${statusTextColor(status)}`}>{statusLabel(status)}</span>
                      </button>
                    )
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/loot-list')}
                    className="h-7 px-3 text-xs rounded-full"
                  >
                    View all lists
                  </Button>
                </>
              )
            })()}
          </div>
        )}
      </div>

      {/* Officer banner: unconverted Feral Druids in guild */}
      {heroReady && hasPermission('manage_loot') && activeGuild && (
        <GuardianConversionBanner guildId={activeGuild.id} />
      )}

      {/* Setup guide for new guild admins */}
      {heroReady && hasPermission('manage_settings') && activeGuild && (
        <SetupGuide
          guildId={activeGuild.id}
          guildName={activeGuild.name}
          guildIconUrl={activeGuild.icon_url}
          hasExpansion={!!activeGuild.active_expansion_id}
        />
      )}

      {/* Guild context loading is handled by the page-level loading.tsx skeleton */}
      {guildLoading ? null : (
        <>
          {/* Error Message (e.g., no expansion set) */}
          {error && (
            <div className="bg-background-elevated border border-accent/30 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <div className="text-accent mt-0.5">&#x26A0;&#xFE0F;</div>
                <div className="flex-1">
                  <p className="text-foreground font-semibold text-base">Action required</p>
                  <p className="text-muted-foreground text-sm mt-1">{error}</p>
                  {hasPermission('manage_settings') && (
                    <Button className="mt-3" onClick={() => router.push('/expansions')}>
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
              className="bg-background-elevated border border-border rounded-xl p-6 hover:border-accent/50 transition-colors cursor-pointer"
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


          {/* Insights: load progressively (don't block stats above) */}
          {insightsLoading ? (
            activeCharacter && !dataLoading ? <DashboardDataSkeleton /> : null
          ) : (
          <>

          {/* Insights Row */}
          {activeCharacter && (scoreExplanation || attendanceData) && (
            <div className={`grid grid-cols-1 ${trialData?.isTrial ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-3'} gap-4`}>
              {/* Widget 1: Score Breakdown (contract-driven from explainScore) */}
              {scoreExplanation && (
                <div className="bg-background-elevated border border-border rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <HugeiconsIcon icon={AnalyticsUpIcon} size={18} className="text-accent" />
                    <h3 className="text-[15px] font-semibold text-foreground">Score breakdown</h3>
                  </div>
                  <div className="space-y-2.5">
                    {scoreExplanation.lines
                      .filter(line => line.key !== 'itemRank' && line.key !== 'badLuckBonus')
                      .map(line => {
                        const contextLabel = line.key === 'rankModifier' && line.context?.rankName
                          ? ` (${line.context.rankName})`
                          : line.key === 'roleBonus' && line.context?.matchedRole
                            ? ` (${getRoleDisplayName(line.context.matchedRole as Role)})`
                            : ''

                        return (
                          <div key={line.key} className="flex items-center justify-between">
                            <span className="text-[13px] text-foreground-secondary inline-flex items-center gap-1.5">
                              {line.label}
                              {contextLabel && <span className="text-muted-foreground">{contextLabel}</span>}
                              <InfoTooltip content={line.detail} />
                            </span>
                            <span className={`text-[13px] font-medium tabular-nums ${line.value >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                              {line.value >= 0 ? '+' : ''}{line.value.toFixed(decimalPlaces)}
                            </span>
                          </div>
                        )
                      })}
                    <div className="border-t border-border pt-2 mt-2">
                      <p className="text-[11px] text-muted-foreground">
                        Base score before item ranking
                        {blpInfo.enabled && (
                          <span className="inline-flex items-center gap-1 ml-1">
                            &middot; BLP applied per item
                            <InfoTooltip content="Bad luck protection varies per item. When loot is awarded through raid tracking and you don't win, your BLP for that item increases. Resets when you receive it." />
                          </span>
                        )}
                      </p>
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
                    <p className="text-[11px] text-muted-foreground mt-2 tabular-nums">
                      {attendanceData.tierInfo.raidsNeeded > 0
                        ? `${attendanceData.tierInfo.raidsNeeded} more raid${attendanceData.tierInfo.raidsNeeded !== 1 ? 's' : ''} to reach ${attendanceData.tierInfo.nextTier} tier (+${attendanceData.tierInfo.nextBonus.toFixed(decimalPlaces)})`
                        : `${attendanceData.tierInfo.current} tier`}
                    </p>
                  )}
                  {/* Missed raids breakdown */}
                  {attendanceData.missedRaids && attendanceData.missedRaids.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-[11px] font-semibold text-muted-foreground mb-2">Missed raids</p>
                      <div className="space-y-1">
                        {attendanceData.missedRaids.map((r, i) => {
                          const statusLabels: Record<string, { label: string; color: string }> = {
                            absent: { label: 'Absent', color: 'text-destructive' },
                            no_show: { label: 'No show', color: 'text-destructive' },
                            late: { label: 'Late', color: 'text-warning' },
                            benched: { label: 'Benched', color: 'text-muted-foreground' },
                            excused: { label: 'Excused', color: 'text-muted-foreground' },
                          }
                          const info = statusLabels[r.status] || statusLabels.absent
                          const [y, m, d] = r.date.split('-').map(Number)
                          const date = new Date(y, m - 1, d)
                          const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          const dayStr = date.toLocaleDateString('en-US', { weekday: 'short' })
                          return (
                            <div key={i} className="flex items-center justify-between text-[11px]">
                              <span className="text-foreground-secondary">{dayStr} {dateStr}</span>
                              <span className={info.color}>{info.label}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
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
                  description={`Submit your Loot List and get it approved to see where you rank.${lootListDeadline ? ` Deadline: ${new Date(lootListDeadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}.` : ''}`}
                  size="compact"
                  action={{ label: "Create my list", onClick: () => router.push('/loot-list'), variant: "primary" }}
                />
              ) : (
                <div className="space-y-2 sm:space-y-3">
                  {lootPriority.map((item, index) => (
                    <div
                      key={item.item_id}
                      onClick={() => router.push(`/master-sheet?tier=${item.raid_tier_id}&item=${item.item_id}`)}
                      className="bg-background-inset border border-border rounded-xl p-3 sm:p-4 hover:border-accent/50 transition-colors cursor-pointer"
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
                                <span className="font-semibold text-foreground tabular-nums">{item.loot_score.toFixed(decimalPlaces)}</span>
                              </>
                            )}
                            {!item.is_loot_council && itemBlpData[item.item_id] && (
                              <>
                                <span>•</span>
                                <span className="text-accent font-medium tabular-nums" title={`Passed ${itemBlpData[item.item_id].timesPassed} time${itemBlpData[item.item_id].timesPassed !== 1 ? 's' : ''}`}>
                                  +{itemBlpData[item.item_id].bonus.toFixed(decimalPlaces)} BLP
                                </span>
                              </>
                            )}
                          </div>
                          {!item.is_loot_council && (() => {
                            // If the user is on a raid team, filter tied chars to team members only
                            const teamFilteredTied = teamCharacterIds
                              ? item.tied_characters.filter(c => teamCharacterIds.has(c.character_id))
                              : item.tied_characters
                            const shown = teamFilteredTied.slice(0, 2)
                            const remaining = teamFilteredTied.length - shown.length
                            const rank = competitionData[item.item_id]?.userRank
                            if (rank == null && teamFilteredTied.length === 0) return null
                            return (
                              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground flex-wrap mt-1">
                                {rank != null && (
                                  <span className={rank === 1 ? 'text-success font-medium' : ''}>
                                    you&apos;re #{rank}
                                  </span>
                                )}
                                {rank != null && teamFilteredTied.length > 0 && <span>•</span>}
                                {teamFilteredTied.length > 0 && (
                                  <>
                                    <span className="text-warning">Tied with:</span>
                                    {shown.map((char, idx) => (
                                      <span key={idx} className="flex items-center gap-1">
                                        <span style={{ color: char.class_color }} className="font-semibold">
                                          {char.name}
                                        </span>
                                        {idx < shown.length - 1 && <span className="text-muted-foreground">,</span>}
                                      </span>
                                    ))}
                                    {remaining > 0 && (
                                      <span className="text-muted-foreground">+{remaining} other{remaining !== 1 ? 's' : ''}</span>
                                    )}
                                  </>
                                )}
                              </div>
                            )
                          })()}
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
                  title="Nothing in your bags yet"
                  description="Awarded items show up here after raid night"
                  size="compact"
                  action={{ label: "View Master Sheet", onClick: () => router.push('/master-sheet'), variant: "outline" }}
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
                    className="bg-background-inset border border-border rounded-xl p-4 hover:border-accent/50 transition-colors cursor-pointer"
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

        </>
      )}

      {/* Create Character Modal */}
      <CreateCharacterModal
        isOpen={showCreateCharacterModal}
        onClose={() => setShowCreateCharacterModal(false)}
        suggestedName={activeCharacter?.name}
        required={!activeCharacter}
      />

      {/* Onboarding Modal for new users */}
      <OnboardingModal
        open={showOnboarding}
        onClose={handleCloseOnboarding}
        isOfficer={hasPermission('manage_loot')}
        guildName={activeGuild?.name}
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