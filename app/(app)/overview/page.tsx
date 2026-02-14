'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import WelcomeScreen from '@/app/components/WelcomeScreen'
import { HugeiconsIcon } from '@hugeicons/react'
import { UserIcon, CheckmarkCircle01Icon, AlertCircleIcon, Award01Icon, Cancel01Icon, Add01Icon } from '@hugeicons/core-free-icons'

// Lazy load modals to reduce initial bundle size
const CreateCharacterModal = dynamic(() => import('@/app/components/CreateCharacterModal').then(mod => ({ default: mod.CreateCharacterModal })), {
  loading: () => null
})
const OnboardingModal = dynamic(() => import('@/app/components/OnboardingModal'), {
  loading: () => null
})
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { DashboardContentSkeleton } from '@/components/ui/skeletons'
import { ScrollIcon, StarIcon } from '@hugeicons/core-free-icons'
import { StatusBadge, type SubmissionStatus } from '@/components/ui/status-badge'
import { Heading } from '@/components/ui/typography'
import { useGuildContext } from '@/app/contexts/GuildContext'
import ItemLink from '@/app/components/ItemLink'
import { calculateAttendanceScore, getRankModifier, calculateLootScore } from '@/utils/calculations'
import { refreshWowheadTooltips } from '@/lib/wowhead'
import { useNotification } from '@/app/contexts/NotificationContext'

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
  raid_tier_id: string
  status: string
  updated_at: string
  character: Character
  raid_tier: RaidTier
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
  const { activeGuild, activeMember, activeCharacter, userGuilds, loading: guildLoading, isOfficer, currentExpansion, characterMemberships } = useGuildContext()
  const { showNotification } = useNotification()
  const [raidTiers, setRaidTiers] = useState<RaidTier[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
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

  // Stats state
  const [stats, setStats] = useState({
    completedLists: 0,
    pendingReviews: 0,
    actionsNeeded: 0
  })

  // Guild settings for display formatting
  const [decimalPlaces, setDecimalPlaces] = useState<number>(2)

  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Overview'
  }, [])

  // Check for create_character query param (from guild join flow)
  useEffect(() => {
    if (searchParams.get('create_character') === 'true') {
      setShowCreateCharacterModal(true)
      // Clean up the URL
      router.replace('/overview', { scroll: false })
    }
  }, [searchParams, router])

  // Refresh Wowhead tooltips when loot priority or received items load
  // Uses centralized debounced refresh to prevent excessive API calls
  useEffect(() => {
    if (lootPriority.length > 0 || receivedItems.length > 0) {
      refreshWowheadTooltips()
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

  const handleCloseOnboarding = () => {
    localStorage.setItem('lootlist_onboarding_seen', 'true')
    setShowOnboarding(false)
  }

  // Set greeting based on active character name (falls back to profile name)
  useEffect(() => {
    const initGreeting = async () => {
      if (greetingIndex === null) {
        setGreetingIndex(getRandomGreetingIndex())
      }
      if (activeCharacter?.name) {
        setGreetingName(activeCharacter.name)
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setGreetingName(user?.user_metadata?.custom_claims?.global_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'User')
      }
    }
    initGreeting()
  }, [activeCharacter])

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
      // Check if logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)

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
        const { data: tiersData, error: tiersError } = await supabase
          .from('raid_tiers')
          .select('id, name, is_active')
          .eq('expansion_id', expansionId)
          .eq('is_guild_active', true)

        if (tiersError) {
          console.error('Error loading raid tiers:', tiersError)
          setRaidTiers([])
        } else {
          setRaidTiers(tiersData || [])
        }

        // Load all dashboard data (pass raid tiers to filter by expansion)
        await loadDashboardData(user.id, activeGuild.id, tiersData || [])
      } catch (error) {
        console.error('Error loading overview data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData().catch(console.error)
  }, [guildLoading, activeGuild, activeCharacter, currentExpansion])

  // Function to load all dashboard data for current character
  const loadDashboardData = async (userId: string, guildId: string, currentExpansionTiers: RaidTier[]) => {
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

      // Get tier IDs for current expansion only
      const currentExpansionTierIds = currentExpansionTiers.map(t => t.id)

      // Get submissions for CURRENT CHARACTER ONLY for current expansion tiers
      const { data: submissions, error: submissionsError } = await supabase
        .from('loot_submissions')
        .select('id, character_id, guild_id, raid_tier_id, status, updated_at')
        .eq('character_id', activeCharacter.id)
        .eq('guild_id', guildId)
        .in('raid_tier_id', currentExpansionTierIds)
        .order('updated_at', { ascending: false })

      if (submissionsError) {
        console.error('Error loading submissions:', submissionsError)
      }

      // Get raid tier data separately to avoid join issues
      const submissionRaidTierIds = submissions?.map((s: { raid_tier_id: string }) => s.raid_tier_id) || []
      let raidTierMap: Record<string, RaidTier> = {}

      if (submissionRaidTierIds.length > 0) {
        const { data: tiers } = await supabase
          .from('raid_tiers')
          .select('id, name, is_active')
          .in('id', submissionRaidTierIds)

        if (tiers) {
          raidTierMap = Object.fromEntries(tiers.map((t: { id: string; name: string; is_active: boolean | null }) => [t.id, t]))
        }
      }

      // Transform submissions for current character
      const transformedSubmissions: LootSubmission[] = (submissions || []).map((sub: { id: string; character_id: string; raid_tier_id: string; status: string; updated_at: string }) => ({
        id: sub.id,
        character_id: sub.character_id,
        raid_tier_id: sub.raid_tier_id,
        status: sub.status,
        updated_at: sub.updated_at,
        character: currentCharacter,
        raid_tier: raidTierMap[sub.raid_tier_id] || { id: sub.raid_tier_id, name: 'Unknown', is_active: false }
      }))

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

      // Try to get guild settings and attendance (may not be set up yet)
      try {
        const { data: guildSettings, error: settingsError } = await supabase
          .from('guild_settings')
          .select('attendance_type, rolling_attendance_weeks, use_signups, signup_weight, max_attendance_bonus, max_attendance_threshold, middle_attendance_bonus, middle_attendance_threshold, bottom_attendance_bonus, bottom_attendance_threshold, rank_modifiers, decimal_places, new_member_mode')
          .eq('guild_id', activeGuild.id)
          .single()

        if (guildSettings && !settingsError) {
          // Set decimal places for display formatting
          setDecimalPlaces(guildSettings.decimal_places ?? 2)

          // Try to get attendance records
          const rollingWeeks = guildSettings.rolling_attendance_weeks || 4
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - (rollingWeeks * 7))

          // New member policy: check how to handle new members
          const newMemberMode = guildSettings.new_member_mode || 'raw'
          let effectiveStartDate = startDate

          // For 'fair' and 'minimum_gate' modes, use join date filtering
          if ((newMemberMode === 'fair' || newMemberMode === 'minimum_gate') && characterId) {
            const { data: membership } = await supabase
              .from('character_guild_memberships')
              .select('joined_at')
              .eq('character_id', characterId)
              .eq('guild_id', activeGuild.id)
              .single()

            if (membership?.joined_at) {
              const joinedAt = new Date(membership.joined_at)
              // Use the later of startDate or joinedAt
              if (joinedAt > startDate) {
                effectiveStartDate = joinedAt
              }
            }
          }

          const startDateStr = effectiveStartDate.toISOString().split('T')[0]

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
              (guildSettings as any).first_raid_day,
              (guildSettings as any).second_raid_day,
              (guildSettings as any).third_raid_day,
              (guildSettings as any).fourth_raid_day,
              (guildSettings as any).fifth_raid_day
            ].filter((day): day is number => day !== null && day !== undefined)
              .slice(0, (guildSettings as any).raid_days_per_week || 2)
          }

          // First get raid events for the period
          const { data: raidEventsData, error: raidError } = await supabase
            .from('raid_events')
            .select('id, raid_date')
            .eq('guild_id', activeGuild.id)
            .gte('raid_date', startDateStr)

          // Filter to only raids on configured raid days
          const filteredRaidEvents = raidDays.length > 0 && raidEventsData
            ? raidEventsData.filter((event: { id: string; raid_date: string }) => {
                const eventDate = new Date(event.raid_date + 'T00:00:00')
                return raidDays.includes(eventDate.getDay())
              })
            : raidEventsData

          if (filteredRaidEvents && filteredRaidEvents.length > 0) {
            // Handle duplicate raid events - prefer IDs with attendance records
            const raidEventIds = filteredRaidEvents.map((r: { id: string }) => r.id)

            // Check which raid IDs have attendance for this character
            const { data: existingAttendance } = await supabase
              .from('attendance_records')
              .select('raid_event_id')
              .eq('character_id', characterId)
              .in('raid_event_id', raidEventIds)

            const raidIdsWithAttendance = new Set(existingAttendance?.map((r: { raid_event_id: string }) => r.raid_event_id) || [])

            // Deduplicate by date, preferring IDs that have attendance records
            type RaidEvent = { id: string; raid_date: string }
            const deduplicatedRaidEvents: RaidEvent[] = Array.from(
              filteredRaidEvents.reduce((map: Map<string, RaidEvent>, event: RaidEvent) => {
                const existing = map.get(event.raid_date)
                if (!existing) {
                  map.set(event.raid_date, event)
                } else if (raidIdsWithAttendance.has(event.id) && !raidIdsWithAttendance.has(existing.id)) {
                  map.set(event.raid_date, event)
                }
                return map
              }, new Map<string, RaidEvent>()).values()
            )

            const totalRaids = deduplicatedRaidEvents.length
            const deduplicatedRaidIds = deduplicatedRaidEvents.map((r: RaidEvent) => r.id)

            // Now fetch attendance records using the deduplicated raid IDs
            const { data: attendanceRecords, error: attError } = await supabase
              .from('attendance_records')
              .select('signed_up, attended, no_call_no_show')
              .eq('character_id', characterId)
              .in('raid_event_id', deduplicatedRaidIds)

            if (!attError && attendanceRecords && attendanceRecords.length > 0 && totalRaids > 0) {
              attendanceScore = calculateAttendanceScore(
                attendanceRecords,
                totalRaids,
                guildSettings
              )
            }
          }

          roleModifier = getRankModifier('Member', guildSettings)
        }
      } catch (error) {
        // Attendance system not set up yet, use rank only
      }

      // Get all loot submission items for this character in the active guild
      const { data: submissionItems } = await supabase
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
        .select('id, name, wowhead_id, boss_name, classification, raid_tier_id')
        .in('id', itemIds)

      if (!items) {
        setLootPriority([])
        return
      }

      // Build priority items with character's rank and competition info
      const priorityItems: LootPriorityItem[] = []

      // Collect all item/rank pairs we need to check for ties (BATCHED - avoids N+1)
      type LootItemData = { id: string; name: string; wowhead_id: number; boss_name: string; classification: string | null; raid_tier_id: string }
      const itemRankPairs = items
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

        allSameRankSubmissions = (batchedSubmissions || []) as typeof allSameRankSubmissions
      }

      // Group submissions by item_id for quick lookup
      const submissionsByItem = new Map<string, typeof allSameRankSubmissions>()
      for (const sub of allSameRankSubmissions) {
        const existing = submissionsByItem.get(sub.loot_item_id) || []
        existing.push(sub)
        submissionsByItem.set(sub.loot_item_id, existing)
      }

      for (const item of items) {
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

          // Calculate loot score for this item
          const lootScore = calculateLootScore(charRanking.rank, attendanceScore, roleModifier)

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
            raid_tier_id: item.raid_tier_id
          })
        }
      }

      // Sort by loot score (HIGHEST score = highest priority) and take top 5
      const topPriority = priorityItems
        .sort((a, b) => b.loot_score - a.loot_score)
        .slice(0, 5)

      setLootPriority(topPriority)

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
                          {activeCharacter.spec?.name && activeCharacter.class?.name
                            ? `${activeCharacter.spec.name} ${activeCharacter.class.name}`
                            : activeCharacter.spec?.name || activeCharacter.class?.name}
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

          {/* Loot Priority and Received Items Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Next in Line - Top Items */}
            <div className="bg-background-elevated border border-border rounded-xl p-6">
              <div className="flex items-center gap-4 mb-6">
                <HugeiconsIcon icon={Award01Icon} size={32} className="text-accent flex-shrink-0" />
                <div>
                  <h2 className="text-[24px] font-bold text-foreground">Next in line</h2>
                  <p className="text-sm text-muted-foreground mt-1">Your highest priority items</p>
                </div>
              </div>
              {lootPriority.length === 0 ? (
                <EmptyState
                  icon={ScrollIcon}
                  title="No priority items yet"
                  description="Submit your loot list to see your priorities here"
                  size="compact"
                />
              ) : (
                <div className="space-y-3">
                  {lootPriority.map((item, index) => (
                    <div
                      key={item.item_id}
                      onClick={() => router.push(`/master-sheet?tier=${item.raid_tier_id}&item=${item.item_id}`)}
                      className="bg-background-inset border border-border rounded-xl p-4 hover:border-accent/50 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center">
                          <span className="text-accent font-bold text-lg">#{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <ItemLink name={item.item_name} wowheadId={item.wowhead_id} clickable={true} showIcon={true} />
                            {item.classification && item.classification !== 'Unlimited' && (
                              <span className="text-xs px-2 py-0.5 bg-accent/20 text-accent rounded-full border border-accent/30">
                                {item.classification}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span>{item.boss_name}</span>
                            <span>•</span>
                            <span className="font-semibold text-foreground">{item.loot_score.toFixed(decimalPlaces)}</span>
                            {item.tied_characters.length > 0 && (
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
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recently Received Items */}
            <div className="bg-background-elevated border border-border rounded-xl p-6">
              <div className="flex items-center gap-4 mb-6">
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={32} className="text-success flex-shrink-0" />
                <div>
                  <h2 className="text-[24px] font-bold text-foreground">Recently received</h2>
                  <p className="text-sm text-muted-foreground mt-1">Your recent loot awards</p>
                </div>
              </div>
              {receivedItems.length === 0 ? (
                <EmptyState
                  icon={StarIcon}
                  title="No loot received yet"
                  description="Your awarded items will appear here"
                  size="compact"
                />
              ) : (
                <div className="space-y-3">
                  {receivedItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-background-elevated border border-border rounded-xl p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-success/20 rounded-full flex items-center justify-center">
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} className="text-success" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <ItemLink name={item.item_name} wowheadId={item.wowhead_id} clickable={true} showIcon={true} />
                            {item.classification && item.classification !== 'Unlimited' && (
                              <span className="text-xs px-2 py-0.5 bg-success/20 text-success rounded-full border border-success/30">
                                {item.classification}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <span>{item.boss_name}</span>
                            <span>•</span>
                            <span>{item.raid_tier_name}</span>
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
            <div className="bg-background-elevated border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[24px] font-bold text-foreground">Actions needed</h2>
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
        onClose={() => setShowCreateCharacterModal(false)}
        suggestedName={activeCharacter?.name}
      />

      {/* Onboarding Modal for new users */}
      <OnboardingModal
        open={showOnboarding}
        onClose={handleCloseOnboarding}
      />
    </div>
  )
}