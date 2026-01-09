'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/app/components/Navigation'
import { calculateAttendanceScore, getRankModifier, calculateLootScore } from '@/utils/calculations'
import { Loader2, ExternalLink } from 'lucide-react'

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
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/')
        return
      }

      setUser(user)

      const { data: memberData } = await supabase
        .from('guild_members')
        .select(`
          guild_id,
          character_name,
          role,
          class:wow_classes(name, color_hex)
        `)
        .eq('user_id', user.id)
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

        // Load raid tiers
        const { data: guildExpansions } = await supabase
          .from('expansions')
          .select('id')
          .eq('guild_id', memberData.guild_id)

        let tiersData: any[] = []
        if (guildExpansions && guildExpansions.length > 0) {
          const expansionIds = guildExpansions.map(e => e.id)
          const { data: tiersResult } = await supabase
            .from('raid_tiers')
            .select('id, name, is_active, expansion_id')
            .in('expansion_id', expansionIds)
            .order('name', { ascending: true })

          if (tiersResult) {
            tiersData = await Promise.all(
              tiersResult.map(async (tier: any) => {
                if (tier.expansion_id) {
                  const { data: expData } = await supabase
                    .from('expansions')
                    .select('id, name')
                    .eq('id', tier.expansion_id)
                    .single()

                  return {
                    ...tier,
                    expansion: expData || null
                  }
                }
                return { ...tier, expansion: null }
              })
            )
          }
        }

        if (tiersData && tiersData.length > 0) {
          setRaidTiers(tiersData)
          const activeTier = tiersData.find((t: any) => t.is_active) || tiersData[0]
          setSelectedTierId(activeTier.id)
        }
      }

      setLoading(false)
    }

    loadData()
  }, [])

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        user={user}
        characterName={member?.character_name}
        className={member?.class?.name}
        classColor={member?.class?.color_hex}
        role={member?.role}
        showBack
        backUrl="/dashboard"
        title="Master Loot Sheet"
      />

      <main className="max-w-7xl mx-auto p-6 pb-24">
        {/* Raid Tier Header */}
        {selectedTier && (
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {selectedTier.name}: Loot Rankings
            </h1>
            <p className="text-muted-foreground">
              Showing all loot items and top 5 players for each
            </p>
          </div>
        )}

        {/* Loot Table */}
        {Object.keys(groupedByBoss).length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center">
            <p className="text-muted-foreground text-lg">No loot items found for this raid tier</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedByBoss).map(([boss, items]) => (
              <div key={boss} className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Boss Header */}
                <div className="bg-gradient-to-r from-red-900 to-red-700 px-6 py-3">
                  <h2 className="text-xl font-bold text-foreground">{boss}</h2>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-accent border-b border-border">
                        <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Loot</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-muted-foreground">Next Up</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {items.map((ir) => (
                        <tr key={ir.item.id} className={ir.rankings.length === 0 ? 'bg-pink-900/20' : 'hover:bg-accent'}>
                          <td className="px-6 py-4">
                            <a
                              href={`https://www.wowhead.com/classic/item=${ir.item.wowhead_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80 font-medium inline-flex items-center gap-2"
                            >
                              {ir.item.name}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                            <p className="text-muted-foreground text-sm">{ir.item.item_slot}</p>
                          </td>
                          <td className="px-6 py-4">
                            {ir.rankings.length === 0 ? (
                              <span className="text-muted-foreground italic">No rankings</span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {ir.rankings.map((ranking, index) => (
                                  <div
                                    key={index}
                                    className="px-3 py-1 rounded text-sm font-medium text-foreground"
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
        <div className="mt-6 bg-card border border-border rounded-xl p-4">
          <p className="text-muted-foreground text-sm">
            <span className="font-semibold text-foreground">Note:</span> If your rank number is tied you will roll.
            Loot scores are calculated from item rank + attendance + role modifiers.
          </p>
        </div>
      </main>

      {/* Raid Tier Tabs - Fixed at Bottom */}
      {raidTiers.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-2xl">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center px-4 py-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
              <span className="text-muted-foreground text-sm font-medium mr-4 whitespace-nowrap">Raid Tiers:</span>
              <div className="flex gap-2">
                {raidTiers.map((tier: any) => (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedTierId(tier.id)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all ${
                      selectedTierId === tier.id
                        ? 'bg-primary text-foreground shadow-lg'
                        : 'bg-card text-muted-foreground hover:bg-secondary'
                    }`}
                  >
                    {tier.name}
                    {tier.is_active && ' ⭐'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
