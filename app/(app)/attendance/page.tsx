'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Card } from '@/components/ui/card'
import { calculateAttendanceScore, getRankModifier } from '@/utils/calculations'

interface RaidEvent {
  id: string
  raid_date: string
  notes: string | null
}

interface AttendanceRecord {
  raid_event_id: string
  signed_up: boolean
  attended: boolean
  no_call_no_show: boolean
  raid_event: {
    raid_date: string
    notes: string | null
  }
}

export default function AttendancePage() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [activeCharacter, setActiveCharacter] = useState<any>(null)
  const [guildId, setGuildId] = useState<string | null>(null)
  const [attendanceScore, setAttendanceScore] = useState(0)
  const [roleModifier, setRoleModifier] = useState(0)
  const [memberRole, setMemberRole] = useState('')
  const [guildSettings, setGuildSettings] = useState<any>(null)
  const [expansionStartDate, setExpansionStartDate] = useState<string | null>(null)

  const supabase = createClient()
  const router = useRouter()

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Attendance'
  }, [])

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)

      // Get active character
      const { data: activeCharData } = await supabase
        .from('user_active_characters')
        .select('active_character_id, active_guild_id')
        .eq('user_id', user.id)
        .single()

      if (!activeCharData?.active_character_id || !activeCharData?.active_guild_id) {
        setLoading(false)
        return
      }

      // Get character details
      const { data: characterData } = await supabase
        .from('characters')
        .select('id, name, class:wow_classes(name, color_hex)')
        .eq('id', activeCharData.active_character_id)
        .single()

      if (!characterData) {
        setLoading(false)
        return
      }

      setActiveCharacter(characterData)
      setGuildId(activeCharData.active_guild_id)

      // Load guild settings
      const { data: settingsData } = await supabase
        .from('guild_settings')
        .select('*')
        .eq('guild_id', activeCharData.active_guild_id)
        .single()

      if (settingsData) {
        setGuildSettings(settingsData)
      }

      // Get current expansion's raid start date
      const { data: guildData } = await supabase
        .from('guilds')
        .select('active_expansion_id')
        .eq('id', activeCharData.active_guild_id)
        .single()

      let raidStartDate: string | null = null
      if (guildData?.active_expansion_id) {
        const { data: expansionData } = await supabase
          .from('expansions')
          .select('raid_start_date')
          .eq('id', guildData.active_expansion_id)
          .single()

        raidStartDate = expansionData?.raid_start_date || null
        setExpansionStartDate(raidStartDate)
      }

      // Get character's role in the guild
      const { data: membershipData } = await supabase
        .from('character_guild_memberships')
        .select('role')
        .eq('character_id', characterData.id)
        .eq('guild_id', activeCharData.active_guild_id)
        .single()

      const role = membershipData?.role || 'Member'
      setMemberRole(role)

      // Calculate role modifier using guild settings
      const modifier = getRankModifier(role, settingsData || {})
      setRoleModifier(modifier)

      // Get raid events (last 8 weeks OR expansion start date, whichever is more recent)
      const eightWeeksAgo = new Date()
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)

      // Use expansion start date as lower bound if set
      const lowerBound = raidStartDate
        ? new Date(Math.max(new Date(raidStartDate).getTime(), eightWeeksAgo.getTime()))
        : eightWeeksAgo

      // Get attendance records for this character
      const { data: recordsData } = await supabase
        .from('attendance_records')
        .select(`
          raid_event_id,
          signed_up,
          attended,
          no_call_no_show,
          raid_event:raid_events!inner (
            raid_date,
            notes,
            guild_id
          )
        `)
        .eq('character_id', characterData.id)
        .eq('raid_event.guild_id', activeCharData.active_guild_id)
        .gte('raid_event.raid_date', lowerBound.toISOString().split('T')[0])
        .order('raid_event.raid_date', { ascending: false })

      if (recordsData) {
        setAttendanceRecords(recordsData as any)
      }

      // Calculate attendance score using guild settings
      const weeks = settingsData?.rolling_attendance_weeks || 4
      const periodStart = new Date()
      periodStart.setDate(periodStart.getDate() - (weeks * 7))

      // Use expansion start date as lower bound if set
      const scoreLowerBound = raidStartDate
        ? new Date(Math.max(new Date(raidStartDate).getTime(), periodStart.getTime()))
        : periodStart

      const { data: recentRaids } = await supabase
        .from('raid_events')
        .select('id')
        .eq('guild_id', activeCharData.active_guild_id)
        .gte('raid_date', scoreLowerBound.toISOString().split('T')[0])

      if (recentRaids && recentRaids.length > 0) {
        const raidIds = recentRaids.map(r => r.id)

        const { data: recentRecords } = await supabase
          .from('attendance_records')
          .select('signed_up, attended, no_call_no_show')
          .eq('character_id', characterData.id)
          .in('raid_event_id', raidIds)

        if (recentRecords && recentRecords.length > 0) {
          const score = calculateAttendanceScore(recentRecords, recentRaids.length, settingsData || {})
          setAttendanceScore(score)
        }
      }

      setLoading(false)
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  return (
      <div className="p-8 space-y-6 font-poppins">
        {/* Header */}
        <div>
          <h1 className="text-[42px] font-bold text-white leading-tight">My Attendance</h1>
          <p className="text-[#a1a1a1] mt-1 text-base">Track your raid attendance and view your attendance score</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
              <p className="text-[#a1a1a1] text-sm mb-1">
                {guildSettings?.rolling_attendance_weeks || 4}-Week Attendance Score
              </p>
              <p className={`text-[42px] font-bold leading-none ${
                attendanceScore >= (guildSettings?.max_attendance_bonus || 8) * 0.75 ? 'text-green-400' :
                attendanceScore >= (guildSettings?.max_attendance_bonus || 8) * 0.5 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {attendanceScore.toFixed(guildSettings?.decimal_places || 2)} <span className="text-[18px] text-[#a1a1a1]">/ {(guildSettings?.max_attendance_bonus || 8).toFixed(guildSettings?.decimal_places || 2)}</span>
              </p>
            </div>

            <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
              <p className="text-[#a1a1a1] text-sm mb-1">Role Modifier</p>
              <p className={`text-[42px] font-bold leading-none ${roleModifier < 0 ? 'text-red-400' : 'text-green-400'}`}>
                {roleModifier >= 0 ? '+' : ''}{roleModifier}
              </p>
              <p className="text-[#a1a1a1] text-sm mt-2">{memberRole}</p>
            </div>

            <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
              <p className="text-[#a1a1a1] text-sm mb-1">Total Raids</p>
              <p className="text-[42px] font-bold text-white leading-none">
                {attendanceRecords.length}
              </p>
              <p className="text-[#a1a1a1] text-sm mt-2">Last 8 weeks</p>
            </div>
          </div>

          {/* Attendance History */}
          <Card>
            <div className="p-4 bg-secondary border-b border-border">
              <h2 className="text-foreground font-semibold">Attendance History (Last 8 Weeks)</h2>
            </div>
            <div className="overflow-x-auto">
              {attendanceRecords.length === 0 ? (
                <div className="p-8 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No attendance records yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="bg-secondary/50 text-muted-foreground text-sm">
                      <th className="text-left p-3">Date</th>
                      <th className="text-center p-3">Signed Up</th>
                      <th className="text-center p-3">Attended</th>
                      <th className="text-center p-3">No Call/No Show</th>
                      <th className="text-right p-3">Points Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {attendanceRecords.map((record) => {
                      const signupWeight = guildSettings?.signup_weight || 0.25
                      const attendWeight = 1 - signupWeight
                      const points = record.no_call_no_show
                        ? 0
                        : (record.signed_up ? signupWeight : 0) + (record.attended ? attendWeight : 0)

                      return (
                        <tr key={record.raid_event_id} className="hover:bg-accent">
                          <td className="p-3">
                            <p className="text-foreground font-medium">
                              {new Date(record.raid_event.raid_date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                            {record.raid_event.notes && (
                              <p className="text-muted-foreground text-sm">{record.raid_event.notes}</p>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {record.signed_up ? (
                              <span className="text-green-400">✓</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {record.attended ? (
                              <span className="text-green-400">✓</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {record.no_call_no_show ? (
                              <span className="text-red-400">✗</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <span className={`font-bold ${
                              points === 0 ? 'text-red-400' :
                              points === 1.0 ? 'text-green-400' :
                              'text-yellow-400'
                            }`}>
                              +{points.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </Card>

          {/* Info Card */}
          <Card className="p-4">
            <h3 className="text-foreground font-semibold mb-2">How Attendance Affects Loot</h3>
            <p className="text-muted-foreground text-sm mb-3">
              <strong className="text-primary">Loot Score</strong> = Item Rank + Attendance ({guildSettings?.rolling_attendance_weeks || 4}-week) + Role Modifier
            </p>
            <div className="text-muted-foreground text-xs space-y-1">
              {guildSettings?.use_signups && (
                <p>• Signed up on time: +{(guildSettings?.signup_weight || 0.25).toFixed(2)} points</p>
              )}
              <p>• Full attendance: +{(1 - (guildSettings?.signup_weight || 0.25)).toFixed(2)} points</p>
              <p>• Maximum {guildSettings?.rolling_attendance_weeks || 4}-week score: {(guildSettings?.max_attendance_bonus || 8).toFixed(guildSettings?.decimal_places || 2)} points</p>
              <p>• No-call, no-show: Resets attendance to 0</p>
            </div>
          </Card>
      </div>
  )
}
