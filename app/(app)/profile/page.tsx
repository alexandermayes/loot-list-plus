'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { ProfileStats } from '@/components/profile/profile-stats'
import { User, Mail, Shield, Calendar, Trophy, Settings, CheckCircle, XCircle, LogOut } from 'lucide-react'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [allGuilds, setAllGuilds] = useState<any[]>([])
  const [preferences, setPreferences] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [leaveGuildId, setLeaveGuildId] = useState<string | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [debugExpanded, setDebugExpanded] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Profile'
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleLeaveGuild = async (guildId: string) => {
    setLeaving(true)
    try {
      const response = await fetch('/api/guilds/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ guild_id: guildId })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to leave guild')
        setLeaving(false)
        return
      }

      // If user has no other guilds, redirect to guild select with full page reload
      if (!data.has_other_guilds) {
        window.location.href = '/guild-select'
        return
      }

      // Refresh the page to show updated guild list
      window.location.reload()
    } catch (err) {
      console.error('Error leaving guild:', err)
      alert('An error occurred while leaving the guild')
      setLeaving(false)
    }
  }

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)

      // Get all guild memberships
      const { data: allMemberships } = await supabase
        .from('guild_members')
        .select(`
          *,
          class:wow_classes(name, color_hex),
          guild:guilds(id, name, realm, faction, created_by)
        `)
        .eq('user_id', user.id)

      if (allMemberships && allMemberships.length > 0) {
        setAllGuilds(allMemberships)
        // Use the first guild for primary display (active guild should be first)
        const memberData = allMemberships[0]
        setMember(memberData)

        // Load user preferences
        const { data: prefsData } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (prefsData) {
          setPreferences(prefsData)
        }

        // Load attendance stats (last 4 weeks)
        const fourWeeksAgo = new Date()
        fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

        const { data: recentRaids } = await supabase
          .from('raid_events')
          .select('id')
          .eq('guild_id', memberData.guild_id)
          .gte('raid_date', fourWeeksAgo.toISOString().split('T')[0])

        let attendanceScore = 0
        let raidsAttended = 0
        const totalRaids = recentRaids?.length || 0

        if (recentRaids && recentRaids.length > 0) {
          const raidIds = recentRaids.map(r => r.id)
          const { data: attendanceRecords } = await supabase
            .from('attendance_records')
            .select('signed_up, attended, no_call_no_show')
            .eq('user_id', user.id)
            .in('raid_event_id', raidIds)

          if (attendanceRecords) {
            const hasNCNS = attendanceRecords.some(r => r.no_call_no_show)
            if (!hasNCNS) {
              attendanceRecords.forEach(r => {
                if (r.signed_up) attendanceScore += 0.25
                if (r.attended) {
                  attendanceScore += 0.75
                  raidsAttended++
                }
              })
              attendanceScore = Math.min(attendanceScore, 8)
            }
          }
        }

        // Load loot submission status
        const { data: activeRaidTier } = await supabase
          .from('raid_tiers')
          .select('id')
          .eq('is_active', true)
          .single()

        let submissionStatus = null
        if (activeRaidTier) {
          const { data: submission } = await supabase
            .from('loot_submissions')
            .select('status')
            .eq('user_id', user.id)
            .eq('raid_tier_id', activeRaidTier.id)
            .single()

          if (submission) {
            submissionStatus = submission.status
          }
        }

        setStats({
          attendanceScore,
          totalRaids,
          raidsAttended,
          lootReceived: 0, // TODO: Implement loot history tracking
          submissionStatus
        })
      }

      setLoading(false)
    }

    loadProfile()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const avatarUrl = user?.user_metadata?.avatar_url
    ? (user.user_metadata.avatar_url.startsWith('http')
        ? user.user_metadata.avatar_url.replace('.gif', '.png') + '?size=256'
        : `https://cdn.discordapp.com/avatars/${user.user_metadata.provider_id}/${user.user_metadata.avatar_url}.png?size=256`)
    : 'https://cdn.discordapp.com/embed/avatars/0.png'

  return (
      <div className="p-8 space-y-6 font-poppins">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[42px] font-bold text-white leading-tight">Profile</h1>
            <p className="text-[#a1a1a1] mt-1 text-base">Manage your account and Discord integration</p>
          </div>
        </div>

        {/* Profile Overview */}
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
          <div className="flex items-start gap-6">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-24 h-24 rounded-full border-4 border-[rgba(255,255,255,0.1)]"
            />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-[24px] font-bold text-white">
                  {user?.user_metadata?.custom_claims?.global_name || user?.user_metadata?.full_name || member?.character_name || 'User'}
                </h2>
                <span className="px-3 py-1 bg-[#151515] border border-[rgba(255,255,255,0.1)] rounded-full text-[#a1a1a1] text-[13px]">
                  {member?.role || 'Member'}
                </span>
              </div>
              {member?.class && (
                <p className="text-[18px] mb-2 font-medium" style={{ color: member.class.color_hex }}>
                  {member.class.name}
                </p>
              )}
              <div className="flex items-center gap-4 text-[13px] text-[#a1a1a1]">
                <div className="flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  <span>{member?.guild?.name || 'No guild'}</span>
                </div>
                {member?.guild?.realm && (
                  <div className="flex items-center gap-1">
                    <Trophy className="w-4 h-4" />
                    <span>{member.guild.realm}</span>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-6 py-3 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[52px] text-white font-medium text-base transition whitespace-nowrap flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          </div>
        </div>

        {/* Bio Section */}
        {preferences?.bio && (
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
            <p className="text-white">{preferences.bio}</p>
          </div>
        )}

        {/* Profile Stats */}
        {stats && (
          <ProfileStats
            attendanceScore={stats.attendanceScore}
            totalRaids={stats.totalRaids}
            raidsAttended={stats.raidsAttended}
            lootReceived={stats.lootReceived}
            submissionStatus={stats.submissionStatus}
            showAttendance={preferences?.show_attendance_stats !== false}
            showLootHistory={preferences?.show_loot_history !== false}
          />
        )}

        {/* Discord Information */}
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.1)]">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-white" />
              <h3 className="text-[18px] font-semibold text-white">Discord Information</h3>
              {preferences?.discord_guild_member && (
                <span className="ml-auto px-3 py-1 bg-green-900/20 border border-green-600 rounded-full text-green-200 text-[13px] flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Guild Verified
                </span>
              )}
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[13px] text-[#a1a1a1] mb-1">Discord Display Name</p>
                <p className="text-white font-medium">
                  {user?.user_metadata?.custom_claims?.global_name || 'N/A'}
                </p>
              </div>
              {(preferences?.show_discord_username !== false) && (
                <div>
                  <p className="text-[13px] text-[#a1a1a1] mb-1">Discord Username</p>
                  <p className="text-white font-medium">
                    {user?.user_metadata?.full_name || user?.user_metadata?.name || 'N/A'}
                  </p>
                </div>
              )}
              {(preferences?.show_email !== false) && user?.email && (
                <div>
                  <p className="text-[13px] text-[#a1a1a1] mb-1">Email</p>
                  <p className="text-white font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {user.email}
                  </p>
                </div>
              )}
              <div>
                <p className="text-[13px] text-[#a1a1a1] mb-1">Member Since</p>
                <p className="text-white font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(user?.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Guilds Section */}
        {allGuilds.length > 0 && (
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[rgba(255,255,255,0.1)]">
              <h3 className="text-[18px] font-semibold text-white">Your Guilds</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {allGuilds.map((membership) => {
                  const isCreator = membership.guild.created_by === user?.id
                  return (
                    <div
                      key={membership.guild.id}
                      className="flex items-center justify-between p-4 bg-[#0d0e11] border border-[rgba(255,255,255,0.1)] rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white">{membership.guild.name}</p>
                          {isCreator && (
                            <span className="px-2 py-0.5 bg-[rgba(255,128,0,0.2)] border border-[rgba(255,128,0,0.3)] rounded text-[#ff8000] text-xs">Creator</span>
                          )}
                        </div>
                        <p className="text-[13px] text-[#a1a1a1]">
                          {membership.guild.realm && `${membership.guild.realm} • ${membership.guild.faction}`}
                        </p>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-[#151515] border border-[rgba(255,255,255,0.1)] rounded text-[#a1a1a1] text-xs">
                          {membership.role}
                        </span>
                      </div>
                      {isCreator ? (
                        <div className="text-right">
                          <span className="block px-3 py-1 border border-[rgba(255,255,255,0.1)] rounded-full text-white text-[13px] mb-1">
                            Guild Creator
                          </span>
                          <p className="text-xs text-[#a1a1a1]">
                            Go to <button onClick={() => router.push('/admin/settings')} className="text-[#ff8000] underline hover:no-underline">Guild Settings</button> to manage
                          </p>
                        </div>
                      ) : (
                        <button
                          onClick={() => setLeaveGuildId(membership.guild.id)}
                          disabled={leaving}
                          className="px-4 py-2 bg-red-900/20 hover:bg-red-900/30 border border-red-600 rounded-[52px] text-red-200 text-[13px] font-medium transition flex items-center gap-2 disabled:opacity-50"
                        >
                          <LogOut className="w-4 h-4" />
                          Leave Guild
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Leave Guild Confirmation Modal */}
        {leaveGuildId && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !leaving && setLeaveGuildId(null)}
          >
            <div
              className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-[20px] font-bold text-white mb-2">Leave Guild?</h3>
              <p className="text-[#a1a1a1] mb-6">
                Are you sure you want to leave this guild? This action cannot be undone.
                {allGuilds.length === 1 && (
                  <span className="block mt-2 text-red-400 font-medium">
                    This is your only guild. You'll need to join another guild to continue using LootList+.
                  </span>
                )}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setLeaveGuildId(null)}
                  disabled={leaving}
                  className="px-5 py-2.5 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[52px] text-white text-[13px] font-medium transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleLeaveGuild(leaveGuildId)
                    setLeaveGuildId(null)
                  }}
                  disabled={leaving}
                  className="px-5 py-2.5 bg-red-900/20 hover:bg-red-900/30 border border-red-600 rounded-[52px] text-red-200 text-[13px] font-medium transition disabled:opacity-50"
                >
                  {leaving ? 'Leaving...' : 'Leave Guild'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Raw User Data (Debug) - Only visible to creator */}
        {(user?.user_metadata?.custom_claims?.global_name === '_zev' ||
          user?.user_metadata?.name === '_zev' ||
          user?.user_metadata?.full_name === '_zev') && (
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 border-b border-[rgba(255,255,255,0.1)] cursor-pointer hover:bg-[#1a1a1a] transition"
              onClick={() => setDebugExpanded(!debugExpanded)}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[18px] font-semibold text-white">Debug: Available User Data</h3>
                <svg
                  className="w-5 h-5 text-white transition-transform"
                  style={{ transform: debugExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
            {debugExpanded && (
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-[13px] text-white mb-2">user.user_metadata:</h4>
                    <pre className="bg-[#0d0e11] p-4 rounded-lg overflow-x-auto text-xs text-[#a1a1a1]">
                      {JSON.stringify(user?.user_metadata, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h4 className="font-semibold text-[13px] text-white mb-2">Guild Member Data:</h4>
                    <pre className="bg-[#0d0e11] p-4 rounded-lg overflow-x-auto text-xs text-[#a1a1a1]">
                      {JSON.stringify(member, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
  )
}
