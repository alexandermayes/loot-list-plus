'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar } from 'lucide-react'
import Sidebar from '@/app/components/Sidebar'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface RaidEvent {
  id: string
  raid_date: string
  notes: string | null
}

interface Member {
  id: string
  user_id: string
  character_name: string
  class_name: string
  class_color: string
  role: string
}

interface AttendanceRecord {
  user_id: string
  signed_up: boolean
  attended: boolean
  no_call_no_show: boolean
}

export default function RaidTrackingPage() {
  const [raidEvents, setRaidEvents] = useState<RaidEvent[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [selectedRaid, setSelectedRaid] = useState<RaidEvent | null>(null)
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({})
  const [memberScores, setMemberScores] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isOfficer, setIsOfficer] = useState(false)
  const [guildId, setGuildId] = useState<string | null>(null)
  const [showNewRaidForm, setShowNewRaidForm] = useState(false)
  const [newRaidDate, setNewRaidDate] = useState('')
  const [user, setUser] = useState<any>(null)

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

      // Check if officer
      const { data: memberData } = await supabase
        .from('guild_members')
        .select('role, guild_id')
        .eq('user_id', user.id)
        .single()

      if (!memberData || memberData.role !== 'Officer') {
        router.push('/dashboard')
        return
      }

      setIsOfficer(true)
      setGuildId(memberData.guild_id)

      // Get raid events (last 8 weeks)
      const eightWeeksAgo = new Date()
      eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)

      const { data: eventsData } = await supabase
        .from('raid_events')
        .select('id, raid_date, notes')
        .eq('guild_id', memberData.guild_id)
        .gte('raid_date', eightWeeksAgo.toISOString().split('T')[0])
        .order('raid_date', { ascending: false })

      if (eventsData) {
        setRaidEvents(eventsData)
        if (eventsData.length > 0) {
          setSelectedRaid(eventsData[0])
        }
      }

      // Get all guild members
      const { data: membersData } = await supabase
        .from('guild_members')
        .select('id, user_id, character_name, role, class:wow_classes(name, color_hex)')
        .eq('guild_id', memberData.guild_id)
        .eq('is_active', true)

      if (membersData) {
        const formatted = membersData.map(m => ({
          id: m.id,
          user_id: m.user_id,
          character_name: m.character_name || 'Unknown',
          class_name: (m.class as any)?.name || 'Unknown',
          class_color: (m.class as any)?.color_hex || '#888888',
          role: m.role
        }))
        setMembers(formatted)
      }

      // Calculate attendance scores for all members
      await calculateAllScores(memberData.guild_id, membersData || [])

      setLoading(false)
    }

    loadData()
  }, [])

  const calculateAllScores = async (guildId: string, members: any[]) => {
    const fourWeeksAgo = new Date()
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

    // Get raids in last 4 weeks
    const { data: recentRaids } = await supabase
      .from('raid_events')
      .select('id')
      .eq('guild_id', guildId)
      .gte('raid_date', fourWeeksAgo.toISOString().split('T')[0])

    if (!recentRaids || recentRaids.length === 0) {
      setMemberScores({})
      return
    }

    const raidIds = recentRaids.map(r => r.id)

    // Get all attendance records for these raids
    const { data: records } = await supabase
      .from('attendance_records')
      .select('user_id, signed_up, attended, no_call_no_show')
      .in('raid_event_id', raidIds)

    const scores: Record<string, number> = {}

    members.forEach(m => {
      const userRecords = records?.filter(r => r.user_id === m.user_id) || []

      // Check for any no-call-no-show
      const hasNCNS = userRecords.some(r => r.no_call_no_show)

      if (hasNCNS) {
        scores[m.user_id] = 0
      } else {
        let score = 0
        userRecords.forEach(r => {
          if (r.signed_up) score += 0.25
          if (r.attended) score += 0.75
        })
        scores[m.user_id] = Math.min(score, 8) // Cap at 8
      }
    })

    setMemberScores(scores)
  }

  useEffect(() => {
    const loadAttendance = async () => {
      if (!selectedRaid) return

      const { data: records } = await supabase
        .from('attendance_records')
        .select('user_id, signed_up, attended, no_call_no_show')
        .eq('raid_event_id', selectedRaid.id)

      const attendanceMap: Record<string, AttendanceRecord> = {}
      records?.forEach(r => {
        attendanceMap[r.user_id] = {
          user_id: r.user_id,
          signed_up: r.signed_up,
          attended: r.attended,
          no_call_no_show: r.no_call_no_show
        }
      })
      setAttendance(attendanceMap)
    }

    loadAttendance()
  }, [selectedRaid])

  const createRaid = async () => {
    if (!newRaidDate || !guildId) return

    setSaving(true)

    const { data: tierData } = await supabase
      .from('raid_tiers')
      .select('id')
      .eq('is_active', true)
      .single()

    const { data: newRaid, error } = await supabase
      .from('raid_events')
      .insert({
        guild_id: guildId,
        raid_tier_id: tierData?.id,
        raid_date: newRaidDate
      })
      .select()
      .single()

    if (newRaid) {
      setRaidEvents(prev => [newRaid, ...prev])
      setSelectedRaid(newRaid)
      setShowNewRaidForm(false)
      setNewRaidDate('')
    }

    setSaving(false)
  }

  const updateAttendance = async (userId: string, field: 'signed_up' | 'attended' | 'no_call_no_show', value: boolean) => {
    if (!selectedRaid) return

    const current = attendance[userId] || { user_id: userId, signed_up: false, attended: false, no_call_no_show: false }
    const updated = { ...current, [field]: value }

    // If marking as no-call-no-show, uncheck others
    if (field === 'no_call_no_show' && value) {
      updated.signed_up = false
      updated.attended = false
    }

    // If marking signed_up or attended, uncheck no-call-no-show
    if ((field === 'signed_up' || field === 'attended') && value) {
      updated.no_call_no_show = false
    }

    setAttendance(prev => ({ ...prev, [userId]: updated }))

    // Upsert to database
    await supabase
      .from('attendance_records')
      .upsert({
        raid_event_id: selectedRaid.id,
        user_id: userId,
        signed_up: updated.signed_up,
        attended: updated.attended,
        no_call_no_show: updated.no_call_no_show
      }, {
        onConflict: 'raid_event_id,user_id'
      })

    // Recalculate scores
    if (guildId) {
      await calculateAllScores(guildId, members)
    }
  }

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

  if (!isOfficer) return null

  return (
    <div className="min-h-screen bg-[#151515]">
      <Sidebar user={user} currentView="raid-tracking" />

      <main className="ml-[208px] min-h-screen bg-[#0a0a0a] border-l border-[rgba(255,255,255,0.1)] p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-foreground">Raid Tracking & Attendance</h1>
          <Button
            onClick={() => setShowNewRaidForm(true)}
            variant="default"
          >
            + New Raid
          </Button>
        </div>

        <div className="max-w-6xl mx-auto">
        {/* New Raid Form */}
        {showNewRaidForm && (
          <Card className="p-4 mb-6">
            <h3 className="text-foreground font-semibold mb-3">Create New Raid</h3>
            <div className="flex gap-4">
              <input
                type="date"
                value={newRaidDate}
                onChange={(e) => setNewRaidDate(e.target.value)}
                className="px-4 py-2 bg-input border border-border rounded-lg text-foreground"
              />
              <Button
                onClick={createRaid}
                disabled={saving || !newRaidDate}
                variant="default"
              >
                {saving ? 'Creating...' : 'Create'}
              </Button>
              <Button
                onClick={() => setShowNewRaidForm(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Raid List */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="p-4 bg-secondary">
                <h2 className="text-foreground font-semibold">Raid Events</h2>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {raidEvents.length > 0 ? (
                  raidEvents.map(raid => (
                    <button
                      key={raid.id}
                      onClick={() => setSelectedRaid(raid)}
                      className={`w-full text-left p-4 border-b border-border hover:bg-accent transition ${
                        selectedRaid?.id === raid.id ? 'bg-accent border-l-4 border-l-primary' : ''
                      }`}
                    >
                      <p className="text-foreground font-medium">
                        {new Date(raid.raid_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </p>
                      {raid.notes && <p className="text-muted-foreground text-sm">{raid.notes}</p>}
                    </button>
                  ))
                ) : (
                  <EmptyState
                    icon={Calendar}
                    title="No raids yet"
                    description="Create your first raid to start tracking attendance"
                  />
                )}
              </div>
            </div>
          </div>

          {/* Attendance Grid */}
          <div className="lg:col-span-3">
            {selectedRaid ? (
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 bg-secondary">
                  <h2 className="text-foreground font-semibold">
                    {new Date(selectedRaid.raid_date).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-secondary/50 text-muted-foreground text-sm">
                        <th className="text-left p-3">Player</th>
                        <th className="text-left p-3">Role</th>
                        <th className="text-center p-3">Signed Up<br/><span className="text-xs">(+0.25)</span></th>
                        <th className="text-center p-3">Attended<br/><span className="text-xs">(+0.75)</span></th>
                        <th className="text-center p-3">NCNS<br/><span className="text-xs">(reset)</span></th>
                        <th className="text-center p-3">4-Week Score</th>
                        <th className="text-center p-3">Modifier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {members.map(member => {
                        const record = attendance[member.user_id] || { signed_up: false, attended: false, no_call_no_show: false }
                        const score = memberScores[member.user_id] || 0
                        const modifier = getRoleModifier(member.role)

                        return (
                          <tr key={member.id} className="hover:bg-accent">
                            <td className="p-3">
                              <p className="text-foreground font-medium">{member.character_name}</p>
                              <p className="text-sm" style={{ color: member.class_color }}>{member.class_name}</p>
                            </td>
                            <td className="p-3 text-muted-foreground">{member.role}</td>
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={record.signed_up}
                                onChange={(e) => updateAttendance(member.user_id, 'signed_up', e.target.checked)}
                                className="w-5 h-5 rounded bg-input border-border text-green-500 focus:ring-green-500"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={record.attended}
                                onChange={(e) => updateAttendance(member.user_id, 'attended', e.target.checked)}
                                className="w-5 h-5 rounded bg-input border-border text-green-500 focus:ring-green-500"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={record.no_call_no_show}
                                onChange={(e) => updateAttendance(member.user_id, 'no_call_no_show', e.target.checked)}
                                className="w-5 h-5 rounded bg-input border-border text-red-500 focus:ring-red-500"
                              />
                            </td>
                            <td className="p-3 text-center">
                              <span className={`font-bold ${score >= 6 ? 'text-green-400' : score >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
                                {score.toFixed(2)}
                              </span>
                              <span className="text-muted-foreground"> / 8</span>
                            </td>
                            <td className="p-3 text-center">
                              <span className={modifier < 0 ? 'text-red-400' : 'text-muted-foreground'}>
                                {modifier >= 0 ? '+' : ''}{modifier}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <Card className="p-8">
                <EmptyState
                  icon={Calendar}
                  title="Select a raid"
                  description="Choose a raid from the list to manage attendance"
                />
              </Card>
            )}

            {/* Legend */}
            <div className="mt-4 bg-card border border-border rounded-xl p-4">
              <h3 className="text-foreground font-semibold mb-2">Loot Score Formula</h3>
              <p className="text-muted-foreground text-sm">
                <strong className="text-primary">Loot Score</strong> = Item Rank + Attendance (4-week) + Role Modifier
              </p>
              <div className="mt-2 text-muted-foreground text-xs space-y-1">
                <p>• Signed up on time: +0.25 pts</p>
                <p>• Full attendance: +0.75 pts</p>
                <p>• No-call, no-show: Resets attendance to 0</p>
                <p>• New Yiker / Yiker: -1 modifier</p>
                <p>• Alt Yiker: -2 modifier</p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  )
}
