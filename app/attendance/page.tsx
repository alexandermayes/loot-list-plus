'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar } from 'lucide-react'
import Sidebar from '@/app/components/Sidebar'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Card } from '@/components/ui/card'

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
  const [guildId, setGuildId] = useState<string | null>(null)
  const [attendanceScore, setAttendanceScore] = useState(0)
  const [roleModifier, setRoleModifier] = useState(0)
  const [memberRole, setMemberRole] = useState('')

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)

      // Get member data
      const { data: memberData } = await supabase
        .from('guild_members')
        .select('role, guild_id')
        .eq('user_id', user.id)
        .single()

      if (!memberData) {
        setLoading(false)
        return
      }

      setGuildId(memberData.guild_id)
      setMemberRole(memberData.role)

      // Calculate role modifier
      const modifier = getRoleModifier(memberData.role)
      setRoleModifier(modifier)

      // Get raid events (last 8 weeks)
      const eightWeeksAgo = new Date()
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)

      // Get attendance records for this user
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
        .eq('user_id', user.id)
        .eq('raid_event.guild_id', memberData.guild_id)
        .gte('raid_event.raid_date', eightWeeksAgo.toISOString().split('T')[0])
        .order('raid_event.raid_date', { ascending: false })

      if (recordsData) {
        setAttendanceRecords(recordsData as any)
      }

      // Calculate 4-week attendance score
      const fourWeeksAgo = new Date()
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

      const { data: recentRaids } = await supabase
        .from('raid_events')
        .select('id')
        .eq('guild_id', memberData.guild_id)
        .gte('raid_date', fourWeeksAgo.toISOString().split('T')[0])

      if (recentRaids && recentRaids.length > 0) {
        const raidIds = recentRaids.map(r => r.id)

        const { data: recentRecords } = await supabase
          .from('attendance_records')
          .select('signed_up, attended, no_call_no_show')
          .eq('user_id', user.id)
          .in('raid_event_id', raidIds)

        if (recentRecords && recentRecords.length > 0) {
          // Check for any no-call-no-show
          const hasNCNS = recentRecords.some(r => r.no_call_no_show)

          if (hasNCNS) {
            setAttendanceScore(0)
          } else {
            let score = 0
            recentRecords.forEach(r => {
              if (r.signed_up) score += 0.25
              if (r.attended) score += 0.75
            })
            setAttendanceScore(Math.min(score, 8)) // Cap at 8
          }
        }
      }

      setLoading(false)
    }

    loadData()
  }, [])

  const getRoleModifier = (role: string) => {
    switch (role) {
      case 'New Yiker':
      case 'Yiker':
        return -1
      case 'Alt Yiker':
        return -2
      default:
        return 0
    }
  }

  if (loading) {
    return <LoadingSpinner fullScreen />
  }

  return (
    <div className="min-h-screen bg-[#151515]">
      <Sidebar user={user} currentView="attendance" />

      <main className="ml-[208px] min-h-screen bg-[#09090c] border-l border-[rgba(255,255,255,0.1)] p-6">
        <h1 className="text-3xl font-bold text-foreground mb-6">My Attendance</h1>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-6">
              <p className="text-muted-foreground text-sm mb-1">4-Week Attendance Score</p>
              <p className={`text-3xl font-bold ${
                attendanceScore >= 6 ? 'text-green-400' :
                attendanceScore >= 4 ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {attendanceScore.toFixed(2)} <span className="text-lg text-muted-foreground">/ 8.00</span>
              </p>
            </Card>

            <Card className="p-6">
              <p className="text-muted-foreground text-sm mb-1">Role Modifier</p>
              <p className={`text-3xl font-bold ${roleModifier < 0 ? 'text-red-400' : 'text-green-400'}`}>
                {roleModifier >= 0 ? '+' : ''}{roleModifier}
              </p>
              <p className="text-muted-foreground text-sm mt-1">{memberRole}</p>
            </Card>

            <Card className="p-6">
              <p className="text-muted-foreground text-sm mb-1">Total Raids</p>
              <p className="text-3xl font-bold text-foreground">
                {attendanceRecords.length}
              </p>
              <p className="text-muted-foreground text-sm mt-1">Last 8 weeks</p>
            </Card>
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
                      const points = record.no_call_no_show
                        ? 0
                        : (record.signed_up ? 0.25 : 0) + (record.attended ? 0.75 : 0)

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
              <strong className="text-primary">Loot Score</strong> = Item Rank + Attendance (4-week) + Role Modifier
            </p>
            <div className="text-muted-foreground text-xs space-y-1">
              <p>• Signed up on time: +0.25 points</p>
              <p>• Full attendance: +0.75 points</p>
              <p>• Maximum 4-week score: 8.00 points</p>
              <p>• No-call, no-show: Resets attendance to 0</p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
