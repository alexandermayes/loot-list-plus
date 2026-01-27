'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import { Calendar01Icon, ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { calculateAttendanceScore, getRankModifier } from '@/utils/calculations'

interface RaidEvent {
  id: string
  raid_date: string
  is_skipped: boolean
  notes: string | null
}

interface AttendanceRecord {
  raid_event_id: string
  signed_up: boolean
  attended: boolean
  no_call_no_show: boolean
  was_late?: boolean
  was_benched?: boolean
  raid_event: {
    raid_date: string
    notes: string | null
  }
}

interface GuildRaider {
  id: string
  name: string
  role: string
  className: string
  classColor: string
  attendanceScore: number
  attendance: Map<string, AttendanceStatus>
}

interface AttendanceStatus {
  signed_up: boolean
  attended: boolean
  no_call_no_show: boolean
  was_late?: boolean
  was_benched?: boolean
}

interface WeekGroup {
  weekStart: string
  label: string
  isMostRecent: boolean
  raids: RaidEvent[]
}

export default function AttendancePage() {
  // Personal attendance state
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

  // Guild attendance state
  const [guildRaiders, setGuildRaiders] = useState<GuildRaider[]>([])
  const [guildRaidEvents, setGuildRaidEvents] = useState<RaidEvent[]>([])
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const supabase = createClient()
  const router = useRouter()

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Attendance'
  }, [])

  // Get the start of a week based on first raid day
  const getWeekStart = (dateString: string, firstRaidDay: number) => {
    const date = new Date(dateString + 'T00:00:00')
    const currentDay = date.getDay()
    let daysToSubtract = (currentDay - firstRaidDay + 7) % 7
    const weekStart = new Date(date)
    weekStart.setDate(weekStart.getDate() - daysToSubtract)
    return weekStart.toISOString().split('T')[0]
  }

  // Calculate the most recent tracked week (the week just before current week)
  const mostRecentTrackedWeek = useMemo(() => {
    const firstRaidDay = guildSettings?.first_raid_day ?? 0
    const today = new Date()
    const currentDay = today.getDay()
    const daysToSubtract = (currentDay - firstRaidDay + 7) % 7
    const currentWeekStartDate = new Date(today)
    currentWeekStartDate.setDate(currentWeekStartDate.getDate() - daysToSubtract)
    // Go back one week to get the most recent completed/tracked week
    currentWeekStartDate.setDate(currentWeekStartDate.getDate() - 7)
    return currentWeekStartDate.toISOString().split('T')[0]
  }, [guildSettings])

  // Group raid events by week
  const raidsByWeek = useMemo((): WeekGroup[] => {
    if (guildRaidEvents.length === 0) return []

    const firstRaidDay = guildSettings?.first_raid_day ?? 0
    const grouped: Record<string, RaidEvent[]> = {}

    guildRaidEvents.forEach(raid => {
      const weekStart = getWeekStart(raid.raid_date, firstRaidDay)
      if (!grouped[weekStart]) {
        grouped[weekStart] = []
      }
      grouped[weekStart].push(raid)
    })

    // Sort weeks descending (most recent first) and raids within each week ascending
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([weekStart, raids]) => ({
        weekStart,
        label: new Date(weekStart + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isMostRecent: weekStart === mostRecentTrackedWeek,
        raids: raids.sort((a, b) => a.raid_date.localeCompare(b.raid_date))
      }))
  }, [guildRaidEvents, guildSettings, mostRecentTrackedWeek])

  // Sort raiders
  const sortedRaiders = useMemo(() => {
    return [...guildRaiders].sort((a, b) => {
      if (sortBy === 'score') {
        return sortDirection === 'desc'
          ? b.attendanceScore - a.attendanceScore
          : a.attendanceScore - b.attendanceScore
      }
      return sortDirection === 'desc'
        ? b.name.localeCompare(a.name)
        : a.name.localeCompare(b.name)
    })
  }, [guildRaiders, sortBy, sortDirection])

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

      // Calculate rolling attendance window
      // The window is the X PREVIOUS completed weeks, NOT including the current week
      const weeks = settingsData?.rolling_attendance_weeks || 4
      const firstRaidDay = settingsData?.first_raid_day ?? 0

      // Calculate the start of the current week
      const today = new Date()
      const currentDay = today.getDay()
      const daysToSubtract = (currentDay - firstRaidDay + 7) % 7
      const currentWeekStartDate = new Date(today)
      currentWeekStartDate.setDate(currentWeekStartDate.getDate() - daysToSubtract)
      currentWeekStartDate.setHours(0, 0, 0, 0)

      // Period ends at the start of current week (exclusive - last day of previous week)
      const periodEnd = new Date(currentWeekStartDate)
      periodEnd.setDate(periodEnd.getDate() - 1) // Last day of previous week

      // Period starts X weeks before the current week
      const periodStart = new Date(currentWeekStartDate)
      periodStart.setDate(periodStart.getDate() - (weeks * 7))

      // Use expansion start date as lower bound if set
      const lowerBound = raidStartDate
        ? new Date(Math.max(new Date(raidStartDate).getTime(), periodStart.getTime()))
        : periodStart

      // Get raid events in the rolling window (previous X completed weeks only)
      const { data: raidEventsData } = await supabase
        .from('raid_events')
        .select('id, raid_date, is_skipped, notes')
        .eq('guild_id', activeCharData.active_guild_id)
        .gte('raid_date', lowerBound.toISOString().split('T')[0])
        .lte('raid_date', periodEnd.toISOString().split('T')[0])
        .eq('is_skipped', false)
        .order('raid_date', { ascending: true })

      // Filter to only show raid days that match the guild's configured schedule
      const raidDays = [
        settingsData?.first_raid_day,
        settingsData?.second_raid_day,
        settingsData?.third_raid_day,
        settingsData?.fourth_raid_day,
        settingsData?.fifth_raid_day
      ].filter(day => day !== null && day !== undefined)
        .slice(0, settingsData?.raid_days_per_week || 2)

      const filteredRaidEvents = (raidEventsData || []).filter(event => {
        const eventDate = new Date(event.raid_date + 'T00:00:00')
        return raidDays.includes(eventDate.getDay())
      })

      setGuildRaidEvents(filteredRaidEvents)

      // Get attendance records for personal view (use same tracked window)
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
        .lte('raid_event.raid_date', periodEnd.toISOString().split('T')[0])
        .order('raid_event.raid_date', { ascending: false })

      if (recordsData) {
        setAttendanceRecords(recordsData as any)
      }

      // Calculate personal attendance score using filtered events
      if (filteredRaidEvents.length > 0) {
        const raidIds = filteredRaidEvents.map(r => r.id)

        const { data: recentRecords } = await supabase
          .from('attendance_records')
          .select('signed_up, attended, no_call_no_show')
          .eq('character_id', characterData.id)
          .in('raid_event_id', raidIds)

        if (recentRecords && recentRecords.length > 0) {
          const score = calculateAttendanceScore(recentRecords, filteredRaidEvents.length, settingsData || {})
          setAttendanceScore(score)
        }
      }

      // Load guild-wide attendance data
      await loadGuildAttendance(activeCharData.active_guild_id, filteredRaidEvents, settingsData)

      setLoading(false)
    }

    loadData()
  }, [])

  const loadGuildAttendance = async (guildId: string, raidEvents: RaidEvent[], settings: any) => {
    // Get all active guild members with approved loot submissions
    const { data: membershipsData } = await supabase
      .from('character_guild_memberships')
      .select(`
        character_id,
        role,
        character:characters!inner (
          id,
          name,
          class:wow_classes(name, color_hex)
        )
      `)
      .eq('guild_id', guildId)
      .eq('is_active', true)

    if (!membershipsData) return

    // Get characters with approved loot submissions (active raiders)
    const characterIds = membershipsData.map((m: any) => m.character_id)
    const { data: approvedSubmissions } = await supabase
      .from('loot_submissions')
      .select('character_id')
      .eq('guild_id', guildId)
      .eq('status', 'approved')
      .in('character_id', characterIds)

    const approvedCharacterIds = new Set(approvedSubmissions?.map(s => s.character_id) || [])

    // Filter to only active raiders
    const activeRaiders = membershipsData.filter((m: any) => approvedCharacterIds.has(m.character_id))

    if (activeRaiders.length === 0 || raidEvents.length === 0) {
      setGuildRaiders([])
      return
    }

    // Get all attendance records for these raid events
    const raidEventIds = raidEvents.map(r => r.id)
    const { data: allAttendance } = await supabase
      .from('attendance_records')
      .select('raid_event_id, character_id, signed_up, attended, no_call_no_show, was_late, was_benched')
      .in('raid_event_id', raidEventIds)

    // Build attendance map: characterId -> raidEventId -> status
    const attendanceByCharacter: Record<string, Map<string, AttendanceStatus>> = {}
    allAttendance?.forEach(record => {
      if (!record.character_id) return
      if (!attendanceByCharacter[record.character_id]) {
        attendanceByCharacter[record.character_id] = new Map()
      }
      attendanceByCharacter[record.character_id].set(record.raid_event_id, {
        signed_up: record.signed_up,
        attended: record.attended,
        no_call_no_show: record.no_call_no_show,
        was_late: record.was_late,
        was_benched: record.was_benched
      })
    })

    // Calculate attendance score for each raider
    const raiders: GuildRaider[] = activeRaiders.map((m: any) => {
      const char = m.character as any
      const charAttendance = attendanceByCharacter[m.character_id] || new Map()

      // Get records for score calculation
      const records = Array.from(charAttendance.values()).map(status => ({
        signed_up: status.signed_up,
        attended: status.attended,
        no_call_no_show: status.no_call_no_show
      }))

      const score = calculateAttendanceScore(records, raidEvents.length, settings || {})

      return {
        id: m.character_id,
        name: char.name,
        role: m.role || 'Member',
        className: char.class?.name || 'Unknown',
        classColor: char.class?.color_hex || '#ffffff',
        attendanceScore: score,
        attendance: charAttendance
      }
    })

    setGuildRaiders(raiders)
  }

  const getAttendanceState = (status: AttendanceStatus | undefined): string => {
    if (!status) return 'empty'
    if (status.no_call_no_show) return 'no-show'
    if (status.was_benched) return 'benched'
    if (status.was_late) return 'late'
    if (status.attended) return 'attended'
    if (status.signed_up) return 'signed-up'
    return 'empty'
  }

  const getCellStyle = (state: string): string => {
    switch (state) {
      case 'attended': return 'bg-green-600/30 text-green-300'
      case 'late': return 'bg-yellow-600/30 text-yellow-300'
      case 'benched': return 'bg-orange-600/30 text-orange-300'
      case 'signed-up': return 'bg-blue-600/30 text-blue-300'
      case 'no-show': return 'bg-red-600/30 text-red-300'
      default: return 'bg-[#1a1a1a] text-[#505050]'
    }
  }

  const getCellLabel = (state: string): string => {
    switch (state) {
      case 'attended': return 'A'
      case 'late': return 'L'
      case 'benched': return 'B'
      case 'signed-up': return 'S'
      case 'no-show': return 'X'
      default: return '-'
    }
  }

  const formatShortDate = (dateString: string): string => {
    const date = new Date(dateString + 'T00:00:00')
    const dayLetter = ['Su', 'M', 'T', 'W', 'Th', 'F', 'Sa'][date.getDay()]
    return `${dayLetter} ${date.getMonth() + 1}/${date.getDate()}`
  }

  const toggleSort = (column: 'score' | 'name') => {
    if (sortBy === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortDirection(column === 'score' ? 'desc' : 'asc')
    }
  }

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
        <h1 className="text-[42px] font-bold text-white leading-tight">Attendance</h1>
        <p className="text-[#a1a1a1] mt-1 text-base">Track raid attendance and view attendance scores</p>
      </div>

      {/* Personal Summary Cards */}
      {activeCharacter && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[14px] font-medium" style={{ color: (activeCharacter.class as any)?.color_hex || '#fff' }}>
              {activeCharacter.name}
            </span>
            <span className="text-[#666] text-[13px]">• Your Attendance</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
              <p className="text-[#a1a1a1] text-sm mb-1">
                Attendance Credit (Previous {guildSettings?.rolling_attendance_weeks || 4} Weeks)
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
              <p className={`text-[42px] font-bold leading-none ${roleModifier < 0 ? 'text-red-400' : roleModifier > 0 ? 'text-green-400' : 'text-white'}`}>
                {roleModifier >= 0 ? '+' : ''}{roleModifier}
              </p>
              <p className="text-[#a1a1a1] text-sm mt-2">{memberRole}</p>
            </div>

            <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
              <p className="text-[#a1a1a1] text-sm mb-1">Tracked Raids</p>
              <p className="text-[42px] font-bold text-white leading-none">
                {guildRaidEvents.length}
              </p>
              <p className="text-[#a1a1a1] text-sm mt-2">Previous {guildSettings?.rolling_attendance_weeks || 4} completed weeks</p>
            </div>
          </div>
        </>
      )}

      {/* Guild Attendance Table */}
      <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[rgba(255,255,255,0.1)] flex items-center justify-between">
          <h2 className="text-white font-semibold">Guild Attendance</h2>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[#666]">Sort:</span>
            <button
              onClick={() => toggleSort('score')}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition flex items-center gap-1 ${
                sortBy === 'score' ? 'bg-[#ff8000]/20 text-[#ff8000]' : 'bg-[#1a1a1a] text-[#a1a1a1] hover:text-white'
              }`}
            >
              Credit
              {sortBy === 'score' && (sortDirection === 'desc' ? <HugeiconsIcon icon={ArrowDown01Icon} size={12} /> : <HugeiconsIcon icon={ArrowUp01Icon} size={12} />)}
            </button>
            <button
              onClick={() => toggleSort('name')}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition flex items-center gap-1 ${
                sortBy === 'name' ? 'bg-[#ff8000]/20 text-[#ff8000]' : 'bg-[#1a1a1a] text-[#a1a1a1] hover:text-white'
              }`}
            >
              Name
              {sortBy === 'name' && (sortDirection === 'desc' ? <HugeiconsIcon icon={ArrowDown01Icon} size={12} /> : <HugeiconsIcon icon={ArrowUp01Icon} size={12} />)}
            </button>
          </div>
        </div>

        {guildRaiders.length === 0 ? (
          <div className="p-8 text-center">
            <HugeiconsIcon icon={Calendar01Icon} size={48} className="text-[#505050] mx-auto mb-3" />
            <p className="text-[#666]">No active raiders found</p>
            <p className="text-[#505050] text-sm mt-1">Raiders need approved loot submissions to appear here</p>
          </div>
        ) : guildRaidEvents.length === 0 ? (
          <div className="p-8 text-center">
            <HugeiconsIcon icon={Calendar01Icon} size={48} className="text-[#505050] mx-auto mb-3" />
            <p className="text-[#666]">No raid events in the attendance window</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max">
              {/* Header row with week groupings */}
              <thead>
                <tr className="bg-[#0d0e11]">
                  <th className="sticky left-0 z-20 bg-[#0d0e11] px-4 py-2 text-left text-[11px] font-medium text-[#666] min-w-[160px]">
                    Character
                  </th>
                  <th className="sticky left-[160px] z-20 bg-[#0d0e11] px-3 py-2 text-left text-[11px] font-medium text-[#666] min-w-[100px]">
                    Role
                  </th>
                  <th className="sticky left-[260px] z-20 bg-[#0d0e11] px-3 py-2 text-center text-[11px] font-medium text-[#666] min-w-[70px]">
                    Credit
                  </th>
                  {/* Week grouping headers */}
                  {raidsByWeek.map(week => (
                    <th
                      key={week.weekStart}
                      colSpan={week.raids.length}
                      className={`px-2 py-2 text-center text-[11px] font-medium border-l border-[rgba(255,255,255,0.05)] ${
                        week.isMostRecent ? 'bg-green-900/20 text-green-400' : 'bg-blue-900/10 text-blue-300'
                      }`}
                    >
                      Week of {week.label}
                    </th>
                  ))}
                </tr>
                {/* Sub-header for individual dates */}
                <tr className="bg-[#0d0e11]/80">
                  <th className="sticky left-0 z-20 bg-[#0d0e11]/80 px-4 py-1.5" />
                  <th className="sticky left-[160px] z-20 bg-[#0d0e11]/80 px-3 py-1.5" />
                  <th className="sticky left-[260px] z-20 bg-[#0d0e11]/80 px-3 py-1.5" />
                  {raidsByWeek.flatMap(week =>
                    week.raids.map(raid => (
                      <th
                        key={raid.id}
                        className={`px-2 py-1.5 text-center text-[10px] font-normal min-w-[50px] border-l border-[rgba(255,255,255,0.05)] ${
                          week.isMostRecent ? 'bg-green-900/10 text-green-300/70' : 'bg-blue-900/5 text-blue-200/50'
                        }`}
                      >
                        {formatShortDate(raid.raid_date)}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
                {sortedRaiders.map(raider => (
                  <tr key={raider.id} className="hover:bg-[#1a1a1a] transition">
                    <td className="sticky left-0 z-10 bg-[#141519] group-hover:bg-[#1a1a1a] px-4 py-2.5">
                      <span className="font-medium text-[13px]" style={{ color: raider.classColor }}>
                        {raider.name}
                      </span>
                    </td>
                    <td className="sticky left-[160px] z-10 bg-[#141519] group-hover:bg-[#1a1a1a] px-3 py-2.5 text-[12px] text-[#a1a1a1]">
                      {raider.role}
                    </td>
                    <td className="sticky left-[260px] z-10 bg-[#141519] group-hover:bg-[#1a1a1a] px-3 py-2.5 text-center">
                      <span className={`font-semibold text-[13px] ${
                        raider.attendanceScore >= (guildSettings?.max_attendance_bonus || 8) * 0.75 ? 'text-green-400' :
                        raider.attendanceScore >= (guildSettings?.max_attendance_bonus || 8) * 0.5 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {raider.attendanceScore.toFixed(guildSettings?.decimal_places || 2)}
                      </span>
                    </td>
                    {raidsByWeek.flatMap(week =>
                      week.raids.map(raid => {
                        const status = raider.attendance.get(raid.id)
                        const state = getAttendanceState(status)
                        return (
                          <td
                            key={raid.id}
                            className={`px-2 py-2.5 text-center border-l border-[rgba(255,255,255,0.05)] ${
                              week.isMostRecent ? 'bg-green-900/5' : 'bg-blue-900/5'
                            }`}
                          >
                            <span
                              className={`inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-medium ${getCellStyle(state)}`}
                              title={state === 'empty' ? 'No record' : state.replace('-', ' ')}
                            >
                              {getCellLabel(state)}
                            </span>
                          </td>
                        )
                      })
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-[12px]">
        <span className="text-[#666]">Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-green-600/30 text-green-300 text-[10px] font-medium">A</span>
          <span className="text-[#a1a1a1]">Attended</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-yellow-600/30 text-yellow-300 text-[10px] font-medium">L</span>
          <span className="text-[#a1a1a1]">Late</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-orange-600/30 text-orange-300 text-[10px] font-medium">B</span>
          <span className="text-[#a1a1a1]">Benched</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-600/30 text-blue-300 text-[10px] font-medium">S</span>
          <span className="text-[#a1a1a1]">Signed up only</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-red-600/30 text-red-300 text-[10px] font-medium">X</span>
          <span className="text-[#a1a1a1]">No-show</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-[#1a1a1a] text-[#505050] text-[10px] font-medium">-</span>
          <span className="text-[#a1a1a1]">No record</span>
        </div>
      </div>

      {/* Color coding explanation */}
      <div className="flex items-center gap-4 text-[12px] text-[#666]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-900/20 border border-green-600/30" />
          <span>Most recent tracked week</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-900/10 border border-blue-600/20" />
          <span>Previous tracked weeks</span>
        </div>
      </div>
    </div>
  )
}
