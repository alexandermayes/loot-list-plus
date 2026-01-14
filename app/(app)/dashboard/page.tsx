'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import WelcomeScreen from '@/app/components/WelcomeScreen'
import { User, CheckCircle2, AlertCircle, Trophy } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
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
  const { activeGuild, activeMember, activeCharacter, userGuilds, loading: guildLoading, isOfficer } = useGuildContext()
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

  // Stats state
  const [stats, setStats] = useState({
    completedLists: 0,
    pendingReviews: 0,
    actionsNeeded: 0
  })

  const supabase = createClient()
  const router = useRouter()

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Dashboard'
  }, [])

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

      // If no active guild, redirect to guild select
      if (!activeGuild && userGuilds.length === 0) {
        router.push('/guild-select')
        return
      }

      // If we have guilds but no active guild, show error
      if (!activeGuild && userGuilds.length > 0) {
        console.error('Dashboard: Have guilds but no active guild!', userGuilds)
        setLoading(false)
        return
      }

      // Ensure we have an active guild before proceeding
      if (!activeGuild) {
        setLoading(false)
        return
      }

      // Check if guild has active expansion set
      if (!activeGuild.active_expansion_id) {
        setRaidTiers([])
        setError('⚠️ Your guild needs to select an expansion. Ask an officer to go to Guild Settings.')
        setLoading(false)
        return
      }

      // Get raid tiers for active expansion
      const { data: tiersData, error: tiersError } = await supabase
        .from('raid_tiers')
        .select('id, name, is_active')
        .eq('expansion_id', activeGuild.active_expansion_id)

      if (tiersError) {
        console.error('Error loading raid tiers:', tiersError)
        setRaidTiers([])
      } else {
        setRaidTiers(tiersData || [])
      }

      // Load all dashboard data
      await loadDashboardData(user.id, activeGuild.id)

      setLoading(false)
    }

    loadData()
  }, [guildLoading, activeGuild, activeCharacter])

  // Function to load all dashboard data for current character
  const loadDashboardData = async (userId: string, guildId: string) => {
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


      // Get submissions for CURRENT CHARACTER ONLY across all tiers
      const { data: submissions, error: submissionsError } = await supabase
        .from('loot_submissions')
        .select('id, character_id, guild_id, raid_tier_id, status, updated_at')
        .eq('character_id', activeCharacter.id)
        .eq('guild_id', guildId)
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

      // Get all loot submission items for this character
      const { data: submissionItems } = await supabase
        .from('loot_submission_items')
        .select(`
          loot_item_id,
          rank,
          slot,
          submission:loot_submissions!inner (
            id,
            character_id,
            status
          )
        `)
        .eq('submission.character_id', characterId)
        .in('submission.status', ['approved', 'pending'])

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
          // Get characters with the same rank (for tie detection)
          const { data: sameRankSubmissions } = await supabase
            .from('loot_submission_items')
            .select(`
              submission:loot_submissions!inner (
                id,
                character_id,
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
            .in('submission.status', ['approved', 'pending'])

          // Filter out current character and build tied characters list
          const tiedCharacters: TiedCharacter[] = (sameRankSubmissions || [])
            .filter(sub => sub.submission?.character_id !== characterId)
            .map(sub => {
              const char = Array.isArray(sub.submission?.character)
                ? sub.submission.character[0]
                : sub.submission?.character
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

  if (loading || guildLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      approved: 'bg-green-500/20 text-green-400 border-green-500/30',
      needs_revision: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    return styles[status as keyof typeof styles] || styles.draft
  }

  const getStatusText = (status: string) => {
    const text = {
      draft: 'Draft',
      pending: 'Pending',
      approved: 'Approved',
      needs_revision: 'Needs Revision',
      rejected: 'Rejected'
    }
    return text[status as keyof typeof text] || status
  }

  return (
    <>
      {!activeGuild ? (
        <WelcomeScreen />
      ) : (
        <div className="p-8 space-y-6 font-poppins">
          {/* Header */}
          <div>
            <h1 className="text-[42px] font-bold text-white leading-tight">
              {greeting}
            </h1>
            <p className="text-[#a1a1a1] mt-1 text-base">
              {activeCharacter ? `Viewing data for ${activeCharacter.name}` : `Welcome back to ${activeGuild?.name}`}
            </p>
          </div>

          {/* Error Message (e.g., no expansion set) */}
          {error && (
            <div className="bg-[#141519] border border-[rgba(255,128,0,0.3)] rounded-xl p-6">
              <div className="flex items-start gap-3">
                <div className="text-[#ff8000] mt-0.5">⚠️</div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-base">Action Required</p>
                  <p className="text-[#a1a1a1] text-sm mt-1">{error}</p>
                  {isOfficer && (
                    <button
                      onClick={() => router.push('/admin/guild-settings')}
                      className="mt-3 px-5 py-3 text-base bg-white hover:bg-gray-100 text-black rounded-[52px] font-medium transition"
                    >
                      Go to Guild Settings
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Current Character Info Card with Stats */}
          {activeCharacter && (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Character Info Card */}
              <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 lg:w-1/3">
                <div className="flex items-center gap-4">
                  {activeCharacter.class?.name ? (
                    <img
                      src={getClassIconUrl(activeCharacter.class.name)}
                      alt={activeCharacter.class.name}
                      className="w-16 h-16 rounded-full border border-border"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-[#ff8000] to-[#ff6000] rounded-full flex items-center justify-center border border-border">
                      <User className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-[#a1a1a1]">Current Character</p>
                    <h2 className="text-[24px] font-bold" style={{ color: activeCharacter.class?.color_hex || '#fff' }}>
                      {activeCharacter.name}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      {(activeCharacter.spec || activeCharacter.class) && (
                        <span className="text-sm text-[#a1a1a1]">
                          {activeCharacter.spec?.name && activeCharacter.class?.name
                            ? `${activeCharacter.spec.name} ${activeCharacter.class.name}`
                            : activeCharacter.spec?.name || activeCharacter.class?.name}
                        </span>
                      )}
                      {activeCharacter.level && (
                        <span className="text-sm text-[#a1a1a1]">Level {activeCharacter.level}</span>
                      )}
                      {activeCharacter.realm && (
                        <span className="text-sm text-[#a1a1a1]">{activeCharacter.realm}</span>
                      )}
                      {activeCharacter.is_main && (
                        <span className="px-2 py-0.5 bg-[#ff8000]/20 text-[#ff8000] text-xs rounded-full border border-[#ff8000]/30">
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
                <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#a1a1a1]">Completed Lists</p>
                      <p className="text-[42px] font-bold text-white mt-2 leading-none">{stats.completedLists}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                  </div>
                </div>

                {/* Pending Reviews */}
                <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#a1a1a1]">Pending Reviews</p>
                      <p className="text-[42px] font-bold text-white mt-2 leading-none">{stats.pendingReviews}</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-yellow-500" />
                    </div>
                  </div>
                </div>

                {/* Actions Needed */}
                <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#a1a1a1]">Actions Needed</p>
                      <p className="text-[42px] font-bold text-white mt-2 leading-none">{stats.actionsNeeded}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-orange-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loot Priority and Received Items Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Next in Line - Top Items */}
            <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
              <div className="flex items-center gap-4 mb-6">
                <Trophy className="w-8 h-8 text-[#ff8000] flex-shrink-0" />
                <div>
                  <h2 className="text-[24px] font-bold text-white">Next in Line</h2>
                  <p className="text-sm text-[#a1a1a1] mt-1">Your highest priority items</p>
                </div>
              </div>
              {lootPriority.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#a1a1a1] text-sm">No priority items yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {lootPriority.map((item, index) => (
                    <div
                      key={item.item_id}
                      onClick={() => router.push(`/master-sheet?tier=${item.raid_tier_id}&item=${item.item_id}`)}
                      className="bg-[#151515] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 hover:border-[#ff8000]/50 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-[#ff8000]/20 rounded-full flex items-center justify-center">
                          <span className="text-[#ff8000] font-bold text-lg">#{index + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <ItemLink name={item.item_name} wowheadId={item.wowhead_id} clickable={true} showIcon={true} />
                            {item.classification && item.classification !== 'Unlimited' && (
                              <span className="text-xs px-2 py-0.5 bg-[#ff8000]/20 text-[#ff8000] rounded-full border border-[#ff8000]/30">
                                {item.classification}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-[#a1a1a1] flex-wrap">
                            <span>{item.boss_name}</span>
                            <span>•</span>
                            <span className="font-semibold text-white">{item.loot_score.toFixed(1)}</span>
                            {item.tied_characters.length > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-yellow-400">Tied with:</span>
                                {item.tied_characters.map((char, idx) => (
                                  <span key={idx} className="flex items-center gap-1">
                                    <span style={{ color: char.class_color }} className="font-semibold">
                                      {char.name}
                                    </span>
                                    {idx < item.tied_characters.length - 1 && <span className="text-[#a1a1a1]">,</span>}
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
            <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
              <div className="flex items-center gap-4 mb-6">
                <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0" />
                <div>
                  <h2 className="text-[24px] font-bold text-white">Recently Received</h2>
                  <p className="text-sm text-[#a1a1a1] mt-1">Your recent loot awards</p>
                </div>
              </div>
              {receivedItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[#a1a1a1] text-sm">No loot received yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {receivedItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-[#151515] border border-[rgba(255,255,255,0.1)] rounded-xl p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
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
                          <div className="flex items-center gap-2 text-xs text-[#a1a1a1] flex-wrap">
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
          {actionsNeeded.length > 0 && (
            <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[24px] font-bold text-white">Actions Needed</h2>
              </div>
              <div className="space-y-4">
                {actionsNeeded.map(submission => (
                  <div
                    key={submission.id}
                    className="bg-[#151515] border border-[rgba(255,255,255,0.1)] rounded-xl p-4 hover:border-[#ff8000]/50 transition cursor-pointer"
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
                          <span className="text-[#a1a1a1] text-sm">•</span>
                          <span className="text-white text-sm">{submission.raid_tier.name}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(submission.status)}`}>
                            {getStatusText(submission.status)}
                          </span>
                        </div>
                        <p className="text-[#a1a1a1] text-sm mt-1">
                          {submission.status === 'draft'
                            ? 'Complete and submit your loot list'
                            : 'Address feedback and resubmit'}
                        </p>
                      </div>
                      <div className="ml-4">
                        <button className="px-4 py-2 bg-[#ff8000] hover:bg-[#ff9000] text-white rounded-[52px] text-sm font-medium transition">
                          {submission.status === 'draft' ? 'Continue' : 'Revise'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </>
  )
}