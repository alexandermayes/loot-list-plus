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
import { User, Mail, Shield, Calendar, Trophy, Settings, CheckCircle, XCircle } from 'lucide-react'

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [preferences, setPreferences] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)

      // Get guild member info
      const { data: memberData } = await supabase
        .from('guild_members')
        .select(`
          *,
          class:wow_classes(name, color_hex),
          guild:guilds(name, realm, faction)
        `)
        .eq('user_id', user.id)
        .single()

      if (memberData) {
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

  if (loading) return <LoadingSpinner fullScreen />

  const avatarUrl = user?.user_metadata?.avatar_url
    ? (user.user_metadata.avatar_url.startsWith('http')
        ? user.user_metadata.avatar_url.replace('.gif', '.png') + '?size=256'
        : `https://cdn.discordapp.com/avatars/${user.user_metadata.provider_id}/${user.user_metadata.avatar_url}.png?size=256`)
    : 'https://cdn.discordapp.com/embed/avatars/0.png'

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Profile"
        showBack
        action={{
          label: "Settings",
          onClick: () => router.push('/profile/settings'),
          variant: "outline"
        }}
      />

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Profile Overview */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-6">
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-24 h-24 rounded-full border-4 border-border"
              />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-foreground">
                    {user?.user_metadata?.custom_claims?.global_name || user?.user_metadata?.full_name || member?.character_name || 'User'}
                  </h2>
                  <Badge variant="secondary">{member?.role || 'Member'}</Badge>
                </div>
                {member?.class && (
                  <p className="text-lg mb-2" style={{ color: member.class.color_hex }}>
                    {member.class.name}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
            </div>
          </CardContent>
        </Card>

        {/* Bio Section */}
        {preferences?.bio && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-foreground">{preferences.bio}</p>
            </CardContent>
          </Card>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Discord Information
              {preferences?.discord_guild_member && (
                <Badge variant="default" className="ml-auto">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Guild Verified
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Discord Display Name</p>
                <p className="text-foreground font-medium">
                  {user?.user_metadata?.custom_claims?.global_name || 'N/A'}
                </p>
              </div>
              {(preferences?.show_discord_username !== false) && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Discord Username</p>
                  <p className="text-foreground font-medium">
                    {user?.user_metadata?.full_name || user?.user_metadata?.name || 'N/A'}
                  </p>
                </div>
              )}
              {(preferences?.show_email !== false) && user?.email && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <p className="text-foreground font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {user.email}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground mb-1">Member Since</p>
                <p className="text-foreground font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {new Date(user?.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Raw User Data (Debug) */}
        <Card>
          <CardHeader>
            <CardTitle>Debug: Available User Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm text-foreground mb-2">user.user_metadata:</h4>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                  {JSON.stringify(user?.user_metadata, null, 2)}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold text-sm text-foreground mb-2">Guild Member Data:</h4>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                  {JSON.stringify(member, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
