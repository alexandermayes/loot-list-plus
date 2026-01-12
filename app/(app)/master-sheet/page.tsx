'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ItemLink from '@/app/components/ItemLink'
import { calculateAttendanceScore, getRankModifier, calculateLootScore } from '@/utils/calculations'
import { ExternalLink } from 'lucide-react'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { ExpansionGuard } from '@/app/components/ExpansionGuard'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface LootItem {
  id: string
  name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
}

interface PlayerRanking {
  player_name: string
  class_name: string
  class_color: string
  loot_score: number
  rank: number
}

interface ItemRankings {
  item: LootItem
  rankings: PlayerRanking[]
}

export default function MasterSheet() {
  const { activeGuild, loading: guildLoading } = useGuildContext()
  const [allItemRankings, setAllItemRankings] = useState<ItemRankings[]>([])
  const [loading, setLoading] = useState(true)
  const [guildId, setGuildId] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [guildSettings, setGuildSettings] = useState<any>(null)
  const [raidTiers, setRaidTiers] = useState<any[]>([])
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Master Sheet'
  }, [])

  // Define Classic raid tier progression order
  const getRaidTierOrder = (tierName: string): number => {
    const order: Record<string, number> = {
      'Molten Core': 1,
      'MC': 1, // Alternative name
      'Onyxia\'s Lair': 2,
      'Onyxia': 2, // Alternative name
      'Blackwing Lair': 3,
      'BWL': 3, // Alternative name
      'Zul\'Gurub': 4,
      'ZG': 4, // Alternative name
      'Ruins of Ahn\'Qiraj': 5,
      'AQ20': 5, // Alternative name
      'Temple of Ahn\'Qiraj': 6,
      'AQ40': 6, // Alternative name
      'Naxxramas': 7,
      'Naxx': 7 // Alternative name
    }
    return order[tierName] || 999 // Unknown tiers go to the end
  }

  // Calculate attendance score for a user
  const calculateAttendance = async (userId: string): Promise<number> => {
    if (!guildId || !guildSettings) return 0

    const weeks = guildSettings.rolling_attendance_weeks || 4
    const daysAgo = weeks * 7
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - daysAgo)

    const { data: recentRaids } = await supabase
      .from('raid_events')
      .select('id')
      .eq('guild_id', guildId)
      .gte('raid_date', periodStart.toISOString().split('T')[0])

    if (!recentRaids || recentRaids.length === 0) return 0

    const raidIds = recentRaids.map(r => r.id)

    const { data: records } = await supabase
      .from('attendance_records')
      .select('signed_up, attended, no_call_no_show')
      .eq('user_id', userId)
      .in('raid_event_id', raidIds)

    if (!records || records.length === 0) return 0

    return calculateAttendanceScore(records, recentRaids.length, guildSettings)
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
        setLoading(false)
        return
      }

      const { data: memberData } = await supabase
        .from('guild_members')
        .select(`
          guild_id,
          character_name,
          role,
          class:wow_classes(name, color_hex)
        `)
        .eq('user_id', user.id)
        .eq('guild_id', activeGuild.id)
        .single()

      if (memberData) {
        setGuildId(memberData.guild_id)
        setMember({
          character_name: memberData.character_name,
          role: memberData.role,
          class: memberData.class
        })

        // Load guild settings
        const { data: settingsData } = await supabase
          .from('guild_settings')
          .select('*')
          .eq('guild_id', memberData.guild_id)
          .single()

        if (settingsData) {
          setGuildSettings(settingsData)
        }

        // Load raid tiers for active expansion (single join query)
        if (activeGuild?.active_expansion_id) {
          const { data: tiersData } = await supabase
            .from('raid_tiers')
            .select(`
              id,
              name,
              is_active,
              expansion:expansions!inner (
                id,
                name
              )
            `)
            .eq('expansion.id', activeGuild.active_expansion_id)

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
            const activeTier = sortedTiers.find((t: any) => t.is_active) || sortedTiers[0]
            setSelectedTierId(activeTier.id)
          }
        }
      }

      setLoading(false)
    }

    loadData()
  }, [guildLoading, activeGuild])

  // Load all item rankings when tier is selected
  useEffect(() => {
    const loadAllRankings = async () => {
      if (!selectedTierId || !guildId || !guildSettings) {
        setAllItemRankings([])
        return
      }

      setLoading(true)

      try {
        // Get all loot items for this tier
        const { data: itemsData } = await supabase
          .from('loot_items')
          .select('id, name, boss_name, item_slot, wowhead_id')
          .eq('raid_tier_id', selectedTierId)
          .order('boss_name')
          .order('name')

        if (!itemsData || itemsData.length === 0) {
          setAllItemRankings([])
          setLoading(false)
          return
        }

        // Get all ranking submissions for all items at once
        const itemIds = itemsData.map(i => i.id)
        const { data: allRankingsData } = await supabase
          .from('loot_submission_items')
          .select('rank, submission_id, loot_item_id')
          .in('loot_item_id', itemIds)

        if (!allRankingsData || allRankingsData.length === 0) {
          setAllItemRankings(itemsData.map(item => ({ item, rankings: [] })))
          setLoading(false)
          return
        }

        // Get all submissions
        const submissionIds = [...new Set(allRankingsData.map(r => r.submission_id))]
        const { data: subsData } = await supabase
          .from('loot_submissions')
          .select('id, status, user_id')
          .in('id', submissionIds)
          .in('status', ['approved', 'pending'])

        if (!subsData || subsData.length === 0) {
          setAllItemRankings(itemsData.map(item => ({ item, rankings: [] })))
          setLoading(false)
          return
        }

        // Get all member info
        const userIds = [...new Set(subsData.map(s => s.user_id))]
        const { data: membersData } = await supabase
          .from('guild_members')
          .select('user_id, character_name, role, class:wow_classes(name, color_hex)')
          .in('user_id', userIds)

        // Pre-calculate attendance for all users
        const attendanceCache: Record<string, number> = {}
        for (const userId of userIds) {
          attendanceCache[userId] = await calculateAttendance(userId)
        }

        // Build rankings for each item
        const itemRankingsMap: Record<string, ItemRankings> = {}

        for (const item of itemsData) {
          const itemRankingsData = allRankingsData.filter(r => r.loot_item_id === item.id)
          const rankings: PlayerRanking[] = []

          for (const r of itemRankingsData) {
            const sub = subsData.find(s => s.id === r.submission_id)
            if (!sub) continue

            const member = membersData?.find(m => m.user_id === sub.user_id)
            if (!member) continue

            const attendance = attendanceCache[sub.user_id] || 0
            const roleModifier = getRankModifier(member.role, guildSettings)
            const lootScore = calculateLootScore(r.rank, attendance, roleModifier)

            rankings.push({
              player_name: member.character_name || 'Unknown',
              class_name: (member.class as any)?.name || 'Unknown',
              class_color: (member.class as any)?.color_hex || '#888888',
              loot_score: lootScore,
              rank: r.rank
            })
          }

          // Sort by loot score (highest first) and take top 5
          rankings.sort((a, b) => b.loot_score - a.loot_score)
          itemRankingsMap[item.id] = { item, rankings: rankings.slice(0, 5) }
        }

        // Convert to array and sort by boss name
        const sortedItemRankings = itemsData.map(item => itemRankingsMap[item.id])
        setAllItemRankings(sortedItemRankings)

      } catch (err) {
        console.error('Error loading rankings:', err)
        setAllItemRankings([])
      }

      setLoading(false)
    }

    loadAllRankings()
  }, [selectedTierId, guildId, guildSettings])

  // Refresh Wowhead tooltips after items are loaded
  useEffect(() => {
    if (allItemRankings.length > 0 && typeof window !== 'undefined' && (window as any).$WowheadPower) {
      setTimeout(() => {
        (window as any).$WowheadPower.refreshLinks()
      }, 100)
    }
  }, [allItemRankings])

  // Group items by boss
  const groupedByBoss: Record<string, ItemRankings[]> = {}
  allItemRankings.forEach(ir => {
    const boss = ir.item.boss_name
    if (!groupedByBoss[boss]) {
      groupedByBoss[boss] = []
    }
    groupedByBoss[boss].push(ir)
  })

  const selectedTier = raidTiers.find(t => t.id === selectedTierId)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const bossNames = Object.keys(groupedByBoss)

  const scrollToBoss = (bossName: string) => {
    const element = document.getElementById(`boss-${bossName.replace(/\s+/g, '-')}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <ExpansionGuard>
      <div className="p-8 space-y-6 font-poppins">
        {/* Header with Raid Tier Navigation */}
        <div className="space-y-4">
          <div>
            <h1 className="text-[42px] font-bold text-white leading-tight">
              {selectedTier?.name}: Loot Rankings
            </h1>
            <p className="text-[#a1a1a1] text-base">
              Top 5 players for each item
            </p>
          </div>

          {/* Raid Tier Tabs - At Top */}
          {raidTiers.length > 0 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              <span className="text-[#a1a1a1] text-sm font-medium whitespace-nowrap">Raid Tier:</span>
              <div className="flex gap-2">
                {raidTiers.map((tier: any) => (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedTierId(tier.id)}
                    className={`px-5 py-2.5 rounded-[40px] whitespace-nowrap text-[13px] font-medium transition-all ${
                      selectedTierId === tier.id
                        ? 'bg-[rgba(255,128,0,0.2)] border-[0.5px] border-[rgba(255,128,0,0.2)] text-[#ff8000]'
                        : 'bg-[#151515] border border-[rgba(255,255,255,0.1)] text-white hover:bg-[#1a1a1a]'
                    }`}
                  >
                    {tier.name}
                    {tier.is_active && ' ⭐'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Boss Quick Navigation - Sticky */}
          {bossNames.length > 0 && (
            <div className="sticky top-0 z-10 bg-[#0d0e11]/95 backdrop-blur-sm border border-[rgba(255,255,255,0.1)] rounded-xl p-3">
              <div className="flex items-center gap-3 overflow-x-auto">
                <span className="text-[#a1a1a1] text-xs font-medium whitespace-nowrap">Jump to:</span>
                <div className="flex gap-2">
                  {bossNames.map((boss) => (
                    <button
                      key={boss}
                      onClick={() => scrollToBoss(boss)}
                      className="px-3 py-1.5 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[40px] text-xs font-medium text-white whitespace-nowrap transition"
                    >
                      {boss}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Loot Table */}
        {Object.keys(groupedByBoss).length === 0 ? (
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-8 text-center">
            <p className="text-[#a1a1a1]">No loot items found for this raid tier</p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedByBoss).map(([boss, items]) => (
              <div
                key={boss}
                id={`boss-${boss.replace(/\s+/g, '-')}`}
                className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden"
              >
                {/* Boss Header */}
                <div className="bg-gradient-to-r from-red-900 to-red-700 px-6 py-3">
                  <h2 className="text-[18px] font-bold text-white">{boss}</h2>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-[#0d0e11] border-b border-[rgba(255,255,255,0.1)]">
                        <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#a1a1a1]">Item</th>
                        <th className="px-6 py-3 text-left text-[13px] font-semibold text-[#a1a1a1]">Rankings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[rgba(255,255,255,0.1)]">
                      {items.map((ir) => (
                        <tr key={ir.item.id} className={ir.rankings.length === 0 ? 'bg-pink-900/20' : ''}>
                          <td className="px-6 py-3">
                            <ItemLink
                              name={ir.item.name}
                              wowheadId={ir.item.wowhead_id}
                              className="font-medium text-[14px]"
                            />
                            <p className="text-[#a1a1a1] text-[12px] mt-0.5">{ir.item.item_slot}</p>
                          </td>
                          <td className="px-6 py-3">
                            {ir.rankings.length === 0 ? (
                              <span className="text-[#a1a1a1] italic text-[13px]">No rankings</span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {ir.rankings.map((ranking, index) => (
                                  <div
                                    key={index}
                                    className="px-3 py-1 rounded-full text-[13px] font-medium text-white"
                                    style={{ backgroundColor: ranking.class_color }}
                                  >
                                    {ranking.player_name}: {Math.round(ranking.loot_score)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
          <p className="text-[#a1a1a1] text-[13px]">
            <span className="font-semibold text-white">Note:</span> If your rank number is tied you will roll.
            Loot scores = item rank + attendance + role modifiers.
          </p>
        </div>
      </div>
    </ExpansionGuard>
  )
}
