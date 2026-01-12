'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import WelcomeScreen from '@/app/components/WelcomeScreen'
import { ClipboardList, FileBarChart, Settings, ClipboardCheck, TrendingUp, Users, Award, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ActionCard } from '@/components/ui/action-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useGuildContext } from '@/app/contexts/GuildContext'

interface RaidTier {
  id: string
  name: string
  is_active: boolean
  expansion: {
    name: string
  }
}

interface Deadline {
  deadline_at: string
  is_locked: boolean
}

export default function Dashboard() {
  const { activeGuild, activeMember, userGuilds, loading: guildLoading, isOfficer } = useGuildContext()
  const [raidTier, setRaidTier] = useState<RaidTier | null>(null)
  const [raidTiers, setRaidTiers] = useState<RaidTier[]>([])
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null)
  const [deadline, setDeadline] = useState<Deadline | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Stats state
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    approvedSubmissions: 0,
    pendingSubmissions: 0,
    rejectedSubmissions: 0,
    totalMembers: 0,
    totalGuildSubmissions: 0,
    yourSubmissions: 0
  })

  const supabase = createClient()
  const router = useRouter()

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Dashboard'
  }, [])

  // Define Classic raid tier progression order
  const getRaidTierOrder = (tierName: string): number => {
    const order: Record<string, number> = {
      'Molten Core': 1,
      'MC': 1,
      'Onyxia\'s Lair': 2,
      'Onyxia': 2,
      'Blackwing Lair': 3,
      'BWL': 3,
      'Zul\'Gurub': 4,
      'ZG': 4,
      'Ruins of Ahn\'Qiraj': 5,
      'AQ20': 5,
      'Temple of Ahn\'Qiraj': 6,
      'AQ40': 6,
      'Naxxramas': 7,
      'Naxx': 7
    }
    return order[tierName] || 999
  }

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

      // If no active guild, redirect to guild select (but only if we have user guilds)
      if (!activeGuild && userGuilds.length === 0) {
        router.push('/guild-select')
        return
      }

      // If we have guilds but no active guild, something went wrong
      if (!activeGuild && userGuilds.length > 0) {
        console.error('Dashboard: Have guilds but no active guild!', userGuilds)
        // Don't redirect, show error or loading state
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

      // Get raid tiers for active expansion only (single join query)
      const { data: tiersData, error: tiersError } = await supabase
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

      if (tiersError) {
        console.error('Error loading raid tiers:', tiersError)
        setRaidTiers([])
      } else {
        // Transform data to ensure expansion is a single object (Supabase returns it as array)
        const transformedData: RaidTier[] = (tiersData || []).map(tier => ({
          ...tier,
          expansion: Array.isArray(tier.expansion) ? tier.expansion[0] : tier.expansion
        }))

        // Sort by Classic raid progression order
        const sortedTiers = transformedData.sort((a, b) => {
          return getRaidTierOrder(a.name) - getRaidTierOrder(b.name)
        })

        setRaidTiers(sortedTiers)

        // Default to active tier, or first tier if none active
        const activeTier = sortedTiers?.find(t => t.is_active) || sortedTiers?.[0]
        if (activeTier) {
          setSelectedTierId(activeTier.id)
          setRaidTier(activeTier as any)

          // Get deadline for selected tier
          const { data: deadlineData } = await supabase
            .from('loot_deadlines')
            .select('deadline_at, is_locked')
            .eq('raid_tier_id', activeTier.id)
            .single()

          if (deadlineData) {
            setDeadline(deadlineData)
          } else {
            setDeadline(null)
          }
        } else {
          setSelectedTierId(null)
          setRaidTier(null)
        }
      }

      // Load stats if we have active guild and raid tier
      if (activeGuild && selectedTierId) {
        await loadStats(activeGuild.id, selectedTierId, user.id)
      }

      setLoading(false)
    }

    loadData()
  }, [guildLoading, activeGuild])

  // Function to load dashboard stats
  const loadStats = async (guildId: string, tierId: string, userId: string) => {
    try {
      // Get guild members count
      const { count: membersCount } = await supabase
        .from('guild_members')
        .select('*', { count: 'exact', head: true })
        .eq('guild_id', guildId)

      // Get all submissions for this tier
      const { data: allSubmissions } = await supabase
        .from('loot_submissions')
        .select('id, status, member_id')
        .eq('raid_tier_id', tierId)

      // Get your submissions
      const yourSubs = allSubmissions?.filter(s => s.member_id === activeMember?.id) || []

      // Count by status
      const approved = allSubmissions?.filter(s => s.status === 'approved').length || 0
      const pending = allSubmissions?.filter(s => s.status === 'pending').length || 0
      const rejected = allSubmissions?.filter(s => s.status === 'rejected').length || 0

      setStats({
        totalSubmissions: allSubmissions?.length || 0,
        approvedSubmissions: approved,
        pendingSubmissions: pending,
        rejectedSubmissions: rejected,
        totalMembers: membersCount || 0,
        totalGuildSubmissions: allSubmissions?.length || 0,
        yourSubmissions: yourSubs.length
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  // Load tier data when selection changes
  useEffect(() => {
    const loadTierData = async () => {
      if (!selectedTierId || !activeGuild || raidTiers.length === 0 || !user) return

      const selectedTier = raidTiers.find((t: any) => t.id === selectedTierId)
      if (selectedTier) {
        setRaidTier(selectedTier as any)

        // Get deadline for selected tier
        const { data: deadlineData } = await supabase
          .from('loot_deadlines')
          .select('deadline_at, is_locked')
          .eq('raid_tier_id', selectedTierId)
          .single()

        if (deadlineData) {
          setDeadline(deadlineData)
        } else {
          setDeadline(null)
        }

        // Reload stats for new tier
        await loadStats(activeGuild.id, selectedTierId, user.id)
      }
    }

    loadTierData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTierId, raidTiers, activeGuild])

  const getDaysUntilDeadline = () => {
    if (!deadline) return null
    const now = new Date()
    const deadlineDate = new Date(deadline.deadline_at)
    const diff = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  if (loading || guildLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // Get class info from userGuilds
  const currentMembership = userGuilds.find(g => g.guild.id === activeGuild?.id)
  const classInfo = currentMembership?.class

  const daysLeft = getDaysUntilDeadline()

  return (
    <>
      {!activeGuild ? (
        <WelcomeScreen />
      ) : (
        <div className="p-8 space-y-6 font-poppins">
            {/* Header */}
            <div>
              <h1 className="text-[42px] font-bold text-white leading-tight">Overview</h1>
              <p className="text-[#a1a1a1] mt-1 text-base">Welcome back! Here's what's happening with {activeGuild?.name}</p>
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

            {/* Raid Tier Selector */}
            {raidTiers.length > 0 && (
              <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#a1a1a1]">Current Raid Tier</p>
                      <p className="text-[18px] font-semibold text-white">{raidTier?.name || 'Select a tier'}</p>
                    </div>
                    <select
                      value={selectedTierId || ''}
                      onChange={(e) => setSelectedTierId(e.target.value)}
                      className="min-w-[200px] px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] cursor-pointer select-custom"
                    >
                      {raidTiers.map((tier: any) => (
                        <option key={tier.id} value={tier.id} className="bg-[#151515] text-white">
                          {tier.name} {tier.is_active && '⭐'}
                        </option>
                      ))}
                    </select>
                  </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Your Submissions */}
              <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#a1a1a1]">Your Submissions</p>
                      <p className="text-[42px] font-bold text-white mt-2 leading-none">{stats.yourSubmissions}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <ClipboardList className="w-6 h-6 text-blue-500" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <p className="text-sm text-[#a1a1a1]">For {raidTier?.name}</p>
                  </div>
              </div>

              {/* Total Guild Submissions */}
              <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#a1a1a1]">Guild Submissions</p>
                      <p className="text-[42px] font-bold text-white mt-2 leading-none">{stats.totalGuildSubmissions}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                      <FileBarChart className="w-6 h-6 text-purple-500" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#a1a1a1]" />
                    <p className="text-sm text-[#a1a1a1]">Across all members</p>
                  </div>
              </div>

              {/* Guild Members */}
              <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#a1a1a1]">Guild Members</p>
                      <p className="text-[42px] font-bold text-white mt-2 leading-none">{stats.totalMembers}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Users className="w-6 h-6 text-green-500" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#a1a1a1]" />
                    <p className="text-sm text-[#a1a1a1]">Active raiders</p>
                  </div>
              </div>

              {/* Deadline Countdown */}
              <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#a1a1a1]">Deadline</p>
                      {deadline ? (
                        <>
                          <p className="text-[42px] font-bold text-white mt-2 leading-none">
                            {daysLeft !== null && daysLeft >= 0 ? `${daysLeft}d` : 'Expired'}
                          </p>
                        </>
                      ) : (
                        <p className="text-[24px] font-medium text-[#a1a1a1] mt-2 leading-none">Not set</p>
                      )}
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      deadline && daysLeft !== null && daysLeft < 3 ? 'bg-red-500/20' : 'bg-orange-500/20'
                    }`}>
                      <Clock className={`w-6 h-6 ${
                        deadline && daysLeft !== null && daysLeft < 3 ? 'text-red-500' : 'text-orange-500'
                      }`} />
                    </div>
                  </div>
                  <div className="mt-4">
                    {deadline ? (
                      <p className="text-sm text-[#a1a1a1]">
                        {deadline.is_locked ? '🔒 Locked' : '📝 Accepting submissions'}
                      </p>
                    ) : (
                      <p className="text-sm text-[#a1a1a1]">No deadline set</p>
                    )}
                  </div>
              </div>
            </div>

            {/* Submission Status Breakdown */}
            <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
                <h2 className="text-[24px] font-bold text-white mb-6">Submission Status</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Approved */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#a1a1a1]">Approved</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-[24px] font-bold text-white">{stats.approvedSubmissions}</p>
                        <p className="text-sm text-[#a1a1a1]">
                          ({stats.totalSubmissions > 0 ? Math.round((stats.approvedSubmissions / stats.totalSubmissions) * 100) : 0}%)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Pending */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-6 h-6 text-yellow-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#a1a1a1]">Pending Review</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-[24px] font-bold text-white">{stats.pendingSubmissions}</p>
                        <p className="text-sm text-[#a1a1a1]">
                          ({stats.totalSubmissions > 0 ? Math.round((stats.pendingSubmissions / stats.totalSubmissions) * 100) : 0}%)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rejected */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                      <XCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-[#a1a1a1]">Rejected</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-[24px] font-bold text-white">{stats.rejectedSubmissions}</p>
                        <p className="text-sm text-[#a1a1a1]">
                          ({stats.totalSubmissions > 0 ? Math.round((stats.rejectedSubmissions / stats.totalSubmissions) * 100) : 0}%)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
                <h2 className="text-[24px] font-bold text-white mb-6">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => router.push('/loot-list')}
                    className="p-5 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-xl transition text-left"
                  >
                    <ClipboardList className="w-8 h-8 text-[#ff8000] mb-2" />
                    <p className="font-semibold text-white text-base">Submit Loot List</p>
                    <p className="text-sm text-[#a1a1a1] mt-1">Add your preferred items</p>
                  </button>

                  <button
                    onClick={() => router.push('/master-sheet')}
                    className="p-5 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-xl transition text-left"
                  >
                    <FileBarChart className="w-8 h-8 text-purple-500 mb-2" />
                    <p className="font-semibold text-white text-base">View Master Sheet</p>
                    <p className="text-sm text-[#a1a1a1] mt-1">See all guild submissions</p>
                  </button>

                  {isOfficer && (
                    <button
                      onClick={() => router.push('/admin')}
                      className="p-5 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-xl transition text-left"
                    >
                      <Settings className="w-8 h-8 text-[#ff8000] mb-2" />
                      <p className="font-semibold text-white text-base">Admin Panel</p>
                      <p className="text-sm text-[#a1a1a1] mt-1">Manage submissions & settings</p>
                    </button>
                  )}
                </div>
            </div>

            {/* Guild Info Card */}
            <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
                <h2 className="text-[24px] font-bold text-white mb-6">Guild Information</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-[#a1a1a1] text-sm mb-1">Guild Name</p>
                    <p className="text-white font-semibold text-[18px]">{activeGuild?.name}</p>
                  </div>
                  <div>
                    <p className="text-[#a1a1a1] text-sm mb-1">Realm</p>
                    <p className="text-white font-semibold text-[18px]">{activeGuild?.realm || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-[#a1a1a1] text-sm mb-1">Faction</p>
                    <p className="text-white font-semibold text-[18px]">{activeGuild?.faction}</p>
                  </div>
                  <div>
                    <p className="text-[#a1a1a1] text-sm mb-1">Your Role</p>
                    <span className="inline-block bg-[#151515] border border-[rgba(255,255,255,0.1)] rounded-xl text-white text-base px-3 py-1">{activeMember?.role}</span>
                  </div>
                </div>
            </div>
          </div>
        )}
    </>
  )
}