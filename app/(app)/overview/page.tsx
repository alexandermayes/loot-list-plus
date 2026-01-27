'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import WelcomeScreen from '@/app/components/WelcomeScreen'
import { HugeiconsIcon } from '@hugeicons/react'
import { UserIcon, CheckmarkCircle01Icon, AlertCircleIcon, Award01Icon, Cancel01Icon, Add01Icon } from '@hugeicons/core-free-icons'

// Lazy load modal to reduce initial bundle size
const CreateCharacterModal = dynamic(() => import('@/app/components/CreateCharacterModal').then(mod => ({ default: mod.CreateCharacterModal })), {
  loading: () => null
})
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { DashboardContentSkeleton } from '@/components/ui/skeletons'
import { ScrollIcon, StarIcon } from '@hugeicons/core-free-icons'
import { StatusBadge, type SubmissionStatus } from '@/components/ui/status-badge'
import { useGuildContext } from '@/app/contexts/GuildContext'
import ItemLink from '@/app/components/ItemLink'
import { calculateAttendanceScore, getRankModifier, calculateLootScore } from '@/utils/calculations'

// Get WoWhead class icon URL
function getClassIconUrl(className: string | undefined): string {
  if (!className) return ''
  const classNameLower = className.toLowerCase().replace(' ', '')
  return `https://wow.zamimg.com/images/wow/icons/large/classicon_${classNameLower}.jpg`
}

// Get random WoW-themed greeting
function getRandomGreeting(username: string): string {
  const greetings = [
    `Welcome back, ${username}!`,
    `Well met, ${username}!`,
    `Greetings, ${username}!`,
    `Lok'tar Ogar, ${username}!`,
    `Strength and honor, ${username}!`,
    `Light be with you, ${username}!`,
    `Victory or death, ${username}!`,
    `Ready for raid, ${username}?`,
    `May your loot be legendary, ${username}!`,
    `Time to hunt some purples, ${username}!`,
    `Zug zug, ${username}!`,
    `For glory, ${username}!`,
    `The hunt begins, ${username}!`,
    `Let's get that loot, ${username}!`
  ]

  return greetings[Math.floor(Math.random() * greetings.length)]
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
  const { activeGuild, activeMember, activeCharacter, userGuilds, loading: guildLoading, isOfficer, currentExpansion, characterMemberships } = useGuildContext()
  const [raidTiers, setRaidTiers] = useState<RaidTier[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [greeting, setGreeting] = useState<string>('')

  // New dashboard state
  const [allSubmissions, setAllSubmissions] = useState<LootSubmission[]>([]) // For current character
  const [lootPriority, setLootPriority] = useState<LootPriorityItem[]>([])
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([])
  const [actionsNeeded, setActionsNeeded] = useState<LootSubmission[]>([])
  const [dismissedActions, setDismissedActions] = useState<Set<string>>(new Set())
  const [showCreateCharacterModal, setShowCreateCharacterModal] = useState(false)

  // Stats state
  const [stats, setStats] = useState({
    completedLists: 0,
    pendingReviews: 0,
    actionsNeeded: 0
  })

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
  useEffect(() => {
    if ((lootPriority.length > 0 || receivedItems.length > 0) && typeof window !== 'undefined' && (window as any).$WowheadPower) {
      const timer = setTimeout(() => {
        try {
          (window as any).$WowheadPower.refreshLinks()
        } catch (e) {
          console.error('Failed to refresh Wowhead links:', e)
        }
      }, 100)

      return () => clearTimeout(timer)
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

  // Set greeting once when component mounts
  useEffect(() => {
    const initGreeting = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const username = user?.user_metadata?.custom_claims?.global_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'User'
        setGreeting(getRandomGreeting(username))
      }
    }
    initGreeting()
  }, []) // Empty dependency array - only run once on mount

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
        setError('⚠️ Your guild needs to select an expansion. Ask an officer to go to Manage Expansions.')
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

      setLoading(false)
    }

    loadData()
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
      const submissionRaidTierIds = submissions?.map(s => s.raid_tier_id) || []
      let raidTierMap: Record<string, RaidTier> = {}

      if (submissionRaidTierIds.length > 0) {
        const { data: tiers } = await supabase
          .from('raid_tiers')
          .select('id, name, is_active')
          .in('id', submissionRaidTierIds)

        if (tiers) {
          raidTierMap = Object.fromEntries(tiers.map(t => [t.id, t]))
        }
      }

      // Transform submissions for current character
      const transformedSubmissions: LootSubmission[] = (submissions || []).map(sub => ({
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

      // Load loot priority items for current character
      await loadLootPriority([activeCharacter.id])

      // Load received items for current character
      await loadReceivedItems(activeCharacter.id)

    } catch (error) {
      console.error('Error loading dashboard data:', error)
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
          .select('attendance_type, rolling_attendance_weeks, use_signups, signup_weight, max_attendance_bonus, max_attendance_threshold, middle_attendance_bonus, middle_attendance_threshold, bottom_attendance_bonus, bottom_attendance_threshold, rank_modifiers')
          .eq('guild_id', activeGuild.id)
          .single()

        if (guildSettings && !settingsError) {
          // Try to get attendance records
          const rollingWeeks = guildSettings.rolling_attendance_weeks || 4
          const startDate = new Date()
          startDate.setDate(startDate.getDate() - (rollingWeeks * 7))

          const { data: attendanceRecords, error: attError } = await supabase
            .from('attendance_records')
            .select('signed_up, attended, no_call_no_show')
            .eq('character_id', characterId)
            .gte('created_at', startDate.toISOString())

          // Only proceed if no error (empty data is fine, errors are not)
          if (!attError) {
            const { data: totalRaidsData } = await supabase
              .from('raid_events')
              .select('raid_date')
              .eq('guild_id', activeGuild.id)
              .gte('raid_date', startDate.toISOString())

            const uniqueRaids = new Set(totalRaidsData?.map(r => r.raid_date) || [])
            const totalRaids = uniqueRaids.size

            if (attendanceRecords && attendanceRecords.length > 0 && totalRaids > 0) {
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
      const itemIds = [...new Set(submissionItems.map(si => si.loot_item_id))]

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

      for (const item of items) {
        // Find this character's ranking for this item
        const charRanking = submissionItems.find(si => si.loot_item_id === item.id)

        if (charRanking) {
          // Get characters with the same rank (for tie detection) within this guild
          const { data: sameRankSubmissions } = await supabase
            .from('loot_submission_items')
            .select(`
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
            .eq('loot_item_id', item.id)
            .eq('rank', charRanking.rank)
            .eq('submission.guild_id', activeGuild.id)
            .eq('submission.status', 'approved')

          // Filter out current character and build tied characters list
          const tiedCharacters: TiedCharacter[] = (sameRankSubmissions || [])
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
    <div className="p-8 space-y-6 font-poppins">
      {/* Header - Always visible but stable during loading */}
      <div>
        <h1 className="text-[42px] font-bold text-foreground leading-tight">
          {isLoading ? 'Welcome back!' : (greeting || 'Welcome back!')}
        </h1>
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
                  <p className="text-foreground font-semibold text-base">Action Required</p>
                  <p className="text-muted-foreground text-sm mt-1">{error}</p>
                  {isOfficer && (
                    <button
                      onClick={() => router.push('/admin/expansions')}
                      className="mt-3 px-5 py-3 text-base bg-primary hover:bg-primary/90 text-primary-foreground rounded-[52px] font-medium transition"
                    >
                      Go to Manage Expansions
                    </button>
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
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-muted border border-border-strong rounded-full flex items-center justify-center">
                  <HugeiconsIcon icon={Add01Icon} size={32} className="text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h2 className="text-[24px] font-bold text-foreground">
                    Create Your First Character
                  </h2>
                  <p className="text-muted-foreground text-sm mt-1">
                    Add a character to start submitting loot lists and tracking your priority
                  </p>
                </div>
                <button className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-[52px] text-[13px] font-medium transition">
                  Create Character
                </button>
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
                      className="w-16 h-16 rounded-full border border-border"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-[#ff8000] to-[#ff6000] rounded-full flex items-center justify-center border border-border">
                      <HugeiconsIcon icon={UserIcon} size={32} className="text-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Current Character</p>
                    <h2 className="text-[24px] font-bold" style={{ color: activeCharacter.class?.color_hex || '#fff' }}>
                      {activeCharacter.name}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:flex-1">
                {/* Completed Lists */}
                <div className="bg-background-elevated border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Completed Lists</p>
                      <p className="text-[42px] font-bold text-foreground mt-2 leading-none">{stats.completedLists}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                      <HugeiconsIcon icon={CheckmarkCircle01Icon} size={24} className="text-green-500" />
                    </div>
                  </div>
                </div>

                {/* Pending Reviews */}
                <div className="bg-background-elevated border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending Reviews</p>
                      <p className="text-[42px] font-bold text-foreground mt-2 leading-none">{stats.pendingReviews}</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <HugeiconsIcon icon={AlertCircleIcon} size={24} className="text-yellow-500" />
                    </div>
                  </div>
                </div>

                {/* Actions Needed */}
                <div className="bg-background-elevated border border-border rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Actions Needed</p>
                      <p className="text-[42px] font-bold text-foreground mt-2 leading-none">{visibleActionsCount}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                      <HugeiconsIcon icon={AlertCircleIcon} size={24} className="text-orange-500" />
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
                  <h2 className="text-[24px] font-bold text-foreground">Next in Line</h2>
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
                            <span className="font-semibold text-foreground">{item.loot_score.toFixed(1)}</span>
                            {item.tied_characters.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-yellow-400">Tied with:</span>
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
                <HugeiconsIcon icon={CheckmarkCircle01Icon} size={32} className="text-green-500 flex-shrink-0" />
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
                        <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                          <HugeiconsIcon icon={CheckmarkCircle01Icon} size={20} className="text-green-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <ItemLink name={item.item_name} wowheadId={item.wowhead_id} clickable={true} showIcon={true} />
                            {item.classification && item.classification !== 'Unlimited' && (
                              <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full border border-green-500/30">
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
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
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
                      <div className="ml-4 flex items-center gap-2">
                        <button
                          onClick={(e) => handleDismissAction(e, submission.id)}
                          className="p-2 bg-background-elevated hover:bg-red-950/50 border border-border hover:border-red-600/30 rounded-lg text-muted-foreground hover:text-red-400 transition"
                          title="Dismiss"
                        >
                          <HugeiconsIcon icon={Cancel01Icon} size={16} />
                        </button>
                        <button className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-[52px] text-sm font-medium transition">
                          {submission.status === 'draft' ? 'Continue' : 'Revise'}
                        </button>
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
    </div>
  )
}