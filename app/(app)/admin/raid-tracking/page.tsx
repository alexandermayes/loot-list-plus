'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Upload, X, SkipForward } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useGuildContext } from '@/app/contexts/GuildContext'

interface Member {
  character_id: string
  user_id: string
  character_name: string
  class_name: string
  class_color: string
  role: string
}

interface UnlinkedAttendee {
  character_name: string
  status: AttendanceStatus
}

interface RaidEvent {
  id: string
  raid_date: string
  notes: string | null
  is_skipped: boolean
  skip_reason: string | null
}

interface AttendanceStatus {
  signed_up: boolean
  attended: boolean
  no_call_no_show: boolean
  was_late: boolean
  was_benched: boolean
}

type CellState = 'empty' | 'attended' | 'late' | 'benched' | 'signed-up' | 'no-show'

export default function RaidTrackingPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [raidDates, setRaidDates] = useState<RaidEvent[]>([])
  const [attendance, setAttendance] = useState<Record<string, Record<string, AttendanceStatus>>>({})
  const [unlinkedAttendees, setUnlinkedAttendees] = useState<Record<string, UnlinkedAttendee[]>>({})
  const [expandedRaid, setExpandedRaid] = useState<string | null>(null)
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [guildSettings, setGuildSettings] = useState<any>(null)
  const [showSkipModal, setShowSkipModal] = useState<{ raidId: string, date: string } | null>(null)
  const [skipReason, setSkipReason] = useState('')
  const [showImportModal, setShowImportModal] = useState<{ raidId: string, date: string } | null>(null)
  const [importData, setImportData] = useState('')
  const [importType, setImportType] = useState<'signup' | 'attendance'>('signup')

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, isOfficer, loading: guildLoading } = useGuildContext()

  useEffect(() => {
    document.title = 'LootList+ • Raid Tracking'
  }, [])

  useEffect(() => {
    if (guildLoading) return

    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      if (!isOfficer) {
        router.push('/dashboard')
        return
      }

      if (!activeGuild) {
        setLoading(false)
        return
      }

      // Load guild settings (with cache busting)
      const response = await fetch(`/api/guild-settings?guild_id=${activeGuild.id}&t=${Date.now()}`, {
        cache: 'no-store'
      })
      let settings: any = null
      if (response.ok) {
        const data = await response.json()
        settings = data.settings
        setGuildSettings(settings)
        console.log('📅 Loaded guild settings:', {
          raid_days_per_week: settings.raid_days_per_week,
          first_raid_day: settings.first_raid_day,
          second_raid_day: settings.second_raid_day,
          reset_date: settings.reset_date
        })
      }

      // Load guild members
      const { data: membershipsData } = await supabase
        .from('character_guild_memberships')
        .select(`
          character_id,
          role,
          character:characters!inner (
            id,
            name,
            user_id,
            class:wow_classes(name, color_hex)
          )
        `)
        .eq('guild_id', activeGuild.id)
        .eq('is_active', true)

      if (membershipsData) {
        // Get all character IDs
        const characterIds = membershipsData.map((m: any) => m.character_id)

        // Query to find which characters have approved loot submissions
        const { data: approvedSubmissions } = await supabase
          .from('loot_submissions')
          .select('character_id')
          .eq('guild_id', activeGuild.id)
          .eq('status', 'approved')
          .in('character_id', characterIds)

        // Create a Set of character IDs with approved submissions for fast lookup
        const approvedCharacterIds = new Set(approvedSubmissions?.map(s => s.character_id) || [])

        // Filter to only include members with approved loot lists
        const formattedMembers: Member[] = membershipsData
          .filter((m: any) => approvedCharacterIds.has(m.character_id))
          .map((m: any) => ({
            character_id: m.character_id,
            user_id: m.character?.user_id,
            character_name: m.character?.name || 'Unknown',
            class_name: m.character?.class?.name || 'Unknown',
            class_color: m.character?.class?.color_hex || '#888888',
            role: m.role
          }))
          .sort((a, b) => a.character_name.localeCompare(b.character_name))

        console.log(`👥 Loaded ${formattedMembers.length} raiders with approved loot lists (out of ${membershipsData.length} total members)`)
        setMembers(formattedMembers)
      }

      // Generate and load raid dates
      if (settings) {
        await generateRaidDates(activeGuild.id, settings)
      }

      setLoading(false)
    }

    loadData()
  }, [guildLoading, activeGuild, isOfficer])

  const generateRaidDates = async (guildId: string, settings: any) => {
    const { raid_days_per_week, first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day, reset_date } = settings

    console.log('🔧 Generating raid dates with settings:', {
      raid_days_per_week,
      first_raid_day,
      second_raid_day,
      third_raid_day,
      fourth_raid_day,
      fifth_raid_day,
      reset_date
    })

    const raidDays = [first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day]
      .filter(day => day !== null && day !== undefined)
      .slice(0, raid_days_per_week)

    console.log('📋 Raid days of week:', raidDays, '(0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)')

    // Generate dates: from reset_date to today only
    const dates: string[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalize to start of day

    // Use guild reset_date or default to 4 weeks ago if not set
    const startDate = reset_date
      ? new Date(reset_date + 'T00:00:00')
      : new Date(today.getTime() - (4 * 7 * 24 * 60 * 60 * 1000))

    console.log('📅 Date range:', {
      startDate: startDate.toISOString().split('T')[0],
      today: today.toISOString().split('T')[0]
    })

    let currentDate = new Date(startDate)
    while (currentDate <= today) {
      if (raidDays.includes(currentDate.getDay())) {
        dates.push(currentDate.toISOString().split('T')[0])
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    console.log('✅ Generated dates:', dates.length, 'raid days')

    // Load or create raid events
    const { data: existingEvents } = await supabase
      .from('raid_events')
      .select('*')
      .eq('guild_id', guildId)
      .in('raid_date', dates)

    const existingDates = new Set(existingEvents?.map(e => e.raid_date) || [])
    const newDates = dates.filter(d => !existingDates.has(d))

    // Get active expansion tier
    const { data: guildData } = await supabase
      .from('guilds')
      .select('active_expansion_id')
      .eq('id', guildId)
      .single()

    const { data: tierData } = await supabase
      .from('raid_tiers')
      .select('id')
      .eq('expansion_id', guildData?.active_expansion_id)
      .limit(1)
      .single()

    // Create new raid events
    if (newDates.length > 0 && tierData) {
      const newEvents = newDates.map(date => ({
        guild_id: guildId,
        raid_tier_id: tierData.id,
        raid_date: date,
        notes: null,
        is_skipped: false,
        skip_reason: null
      }))

      await supabase.from('raid_events').insert(newEvents)
    }

    // Reload all events, sorted by date DESC (most recent first)
    const { data: allEvents, error: eventsError } = await supabase
      .from('raid_events')
      .select('*')
      .eq('guild_id', guildId)
      .in('raid_date', dates)
      .order('raid_date', { ascending: false })

    console.log('🎯 Loaded raid events:', allEvents?.length || 0, 'events')
    if (eventsError) {
      console.error('❌ Error loading raid events:', eventsError)
    }

    // Filter events to only show ones that match the current raid schedule
    console.log('🔍 Filtering events. Current raid days:', raidDays)
    const filteredEvents = allEvents?.filter(event => {
      const eventDate = new Date(event.raid_date + 'T00:00:00')
      const eventDayOfWeek = eventDate.getDay()
      const matchesSchedule = raidDays.includes(eventDayOfWeek)
      console.log(`  Event ${event.raid_date} (${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][eventDayOfWeek]}, day ${eventDayOfWeek}): ${matchesSchedule ? '✓ KEEP' : '✗ SKIP'}`)
      return matchesSchedule
    }) || []

    console.log('✅ Filtered to', filteredEvents.length, 'events matching current schedule')

    if (filteredEvents && filteredEvents.length > 0) {
      setRaidDates(filteredEvents)

      // Auto-expand the most recent week
      const mostRecentRaid = filteredEvents[0]
      const mostRecentWeekStart = getWeekStart(mostRecentRaid.raid_date, settings.first_raid_day ?? 0)
      console.log('📌 Auto-expanding week:', mostRecentWeekStart)
      setExpandedWeeks(new Set([mostRecentWeekStart]))

      // Auto-expand the first raid day in the most recent week (earliest date in that week)
      const raidsInMostRecentWeek = filteredEvents.filter(r =>
        getWeekStart(r.raid_date, settings.first_raid_day ?? 0) === mostRecentWeekStart
      )
      // Sort by date ascending to get the earliest raid in the week
      raidsInMostRecentWeek.sort((a, b) => a.raid_date.localeCompare(b.raid_date))
      const firstRaidInWeek = raidsInMostRecentWeek[0]

      console.log('📍 Auto-expanding first raid in week:', firstRaidInWeek.raid_date)
      setExpandedRaid(firstRaidInWeek.id)
      await loadRaidAttendance(firstRaidInWeek.id)
    } else {
      console.log('⚠️ No raid events found')
    }
  }

  const getWeekStart = (dateString: string, firstRaidDay: number) => {
    const date = new Date(dateString + 'T00:00:00')
    const currentDay = date.getDay()

    // Calculate how many days to subtract to get to the first raid day of this week
    let daysToSubtract = (currentDay - firstRaidDay + 7) % 7

    const weekStart = new Date(date)
    weekStart.setDate(weekStart.getDate() - daysToSubtract)
    return weekStart.toISOString().split('T')[0]
  }

  const loadRaidAttendance = async (raidId: string) => {
    const { data: records } = await supabase
      .from('attendance_records')
      .select('character_id, character_name, signed_up, attended, no_call_no_show, was_late, was_benched')
      .eq('raid_event_id', raidId)

    const attendanceMap: Record<string, AttendanceStatus> = {}
    const unlinked: UnlinkedAttendee[] = []

    records?.forEach(r => {
      if (r.character_id) {
        // Linked attendee
        attendanceMap[r.character_id] = {
          signed_up: r.signed_up,
          attended: r.attended,
          no_call_no_show: r.no_call_no_show,
          was_late: r.was_late,
          was_benched: r.was_benched
        }
      } else if (r.character_name) {
        // Unlinked attendee (no account yet)
        unlinked.push({
          character_name: r.character_name,
          status: {
            signed_up: r.signed_up,
            attended: r.attended,
            no_call_no_show: r.no_call_no_show,
            was_late: r.was_late,
            was_benched: r.was_benched
          }
        })
      }
    })

    setAttendance(prev => ({ ...prev, [raidId]: attendanceMap }))
    setUnlinkedAttendees(prev => ({ ...prev, [raidId]: unlinked }))
  }

  const toggleRaidExpanded = async (raidId: string) => {
    if (expandedRaid === raidId) {
      setExpandedRaid(null)
    } else {
      setExpandedRaid(raidId)
      if (!attendance[raidId]) {
        await loadRaidAttendance(raidId)
      }
    }
  }

  const getCellState = (status: AttendanceStatus | undefined): CellState => {
    if (!status) return 'empty'
    if (status.no_call_no_show) return 'no-show'
    if (status.attended && status.was_late) return 'late'
    if (status.was_benched) return 'benched'
    if (status.attended) return 'attended'
    if (status.signed_up) return 'signed-up'
    return 'empty'
  }

  const getCellStyle = (state: CellState) => {
    switch (state) {
      case 'attended': return 'bg-green-600/30 border-green-600 text-green-300'
      case 'late': return 'bg-yellow-600/30 border-yellow-600 text-yellow-300'
      case 'benched': return 'bg-orange-600/30 border-orange-600 text-orange-300'
      case 'signed-up': return 'bg-blue-600/30 border-blue-600 text-blue-300'
      case 'no-show': return 'bg-red-600/30 border-red-600 text-red-300'
      default: return 'bg-[#141519] border-[rgba(255,255,255,0.1)]'
    }
  }

  const getCellLabel = (state: CellState) => {
    switch (state) {
      case 'attended': return 'Attended'
      case 'late': return 'Late'
      case 'benched': return 'Benched'
      case 'signed-up': return 'Signed Up'
      case 'no-show': return 'No-Show'
      default: return 'Not Set'
    }
  }

  const cycleAttendanceState = async (raidId: string, characterId: string, userId: string) => {
    const current = attendance[raidId]?.[characterId]
    const currentState = getCellState(current)

    let newStatus: AttendanceStatus
    switch (currentState) {
      case 'empty':
        newStatus = { signed_up: false, attended: true, no_call_no_show: false, was_late: false, was_benched: false }
        break
      case 'attended':
        newStatus = { signed_up: false, attended: true, no_call_no_show: false, was_late: true, was_benched: false }
        break
      case 'late':
        newStatus = { signed_up: false, attended: false, no_call_no_show: false, was_late: false, was_benched: true }
        break
      case 'benched':
        newStatus = { signed_up: true, attended: false, no_call_no_show: false, was_late: false, was_benched: false }
        break
      case 'signed-up':
        newStatus = { signed_up: false, attended: false, no_call_no_show: true, was_late: false, was_benched: false }
        break
      case 'no-show':
        newStatus = { signed_up: false, attended: false, no_call_no_show: false, was_late: false, was_benched: false }
        break
    }

    setAttendance(prev => ({
      ...prev,
      [raidId]: {
        ...(prev[raidId] || {}),
        [characterId]: newStatus
      }
    }))

    await supabase
      .from('attendance_records')
      .upsert({
        raid_event_id: raidId,
        character_id: characterId,
        user_id: userId,
        ...newStatus
      }, {
        onConflict: 'raid_event_id,character_id'
      })
  }

  const toggleSkipDay = async (raidId: string, currentSkipped: boolean) => {
    if (!currentSkipped) {
      const raid = raidDates.find(r => r.id === raidId)
      if (raid) {
        setShowSkipModal({ raidId, date: raid.raid_date })
      }
    } else {
      await supabase
        .from('raid_events')
        .update({ is_skipped: false, skip_reason: null })
        .eq('id', raidId)

      setRaidDates(prev => prev.map(r =>
        r.id === raidId ? { ...r, is_skipped: false, skip_reason: null } : r
      ))
    }
  }

  const confirmSkipDay = async () => {
    if (!showSkipModal) return

    await supabase
      .from('raid_events')
      .update({ is_skipped: true, skip_reason: skipReason || 'Holiday/Cancelled' })
      .eq('id', showSkipModal.raidId)

    setRaidDates(prev => prev.map(r =>
      r.id === showSkipModal.raidId ? { ...r, is_skipped: true, skip_reason: skipReason || 'Holiday/Cancelled' } : r
    ))

    setShowSkipModal(null)
    setSkipReason('')
  }

  const importSignups = async () => {
    if (!showImportModal || !activeGuild) return

    // Parse names - support both comma-separated and newline-separated formats
    const names = importData
      .trim()
      .split(/[\n,]+/)  // Split by newlines OR commas
      .map(name => name.trim())
      .filter(name => name.length > 0)

    console.log(`📥 Importing ${names.length} names:`, names)

    const linkedUpdates: any[] = []
    const unlinkedUpdates: any[] = []
    let matchedCount = 0
    let unmatchedCount = 0

    names.forEach(name => {
      const member = members.find(m =>
        m.character_name.toLowerCase() === name.toLowerCase()
      )

      if (member) {
        // Character exists in guild - create linked record
        matchedCount++
        linkedUpdates.push({
          raid_event_id: showImportModal.raidId,
          character_id: member.character_id,
          user_id: member.user_id,
          guild_id: activeGuild.id,
          signed_up: importType === 'signup',
          attended: importType === 'attendance',
          no_call_no_show: false,
          was_late: false,
          was_benched: false
        })
      } else {
        // Character doesn't exist - create unlinked record
        unmatchedCount++
        unlinkedUpdates.push({
          raid_event_id: showImportModal.raidId,
          guild_id: activeGuild.id,
          character_name: name,
          character_id: null,
          user_id: null,
          signed_up: importType === 'signup',
          attended: importType === 'attendance',
          no_call_no_show: false,
          was_late: false,
          was_benched: false
        })
      }
    })

    // Insert linked records (with character_id)
    if (linkedUpdates.length > 0) {
      await supabase
        .from('attendance_records')
        .upsert(linkedUpdates, { onConflict: 'raid_event_id,character_id' })
    }

    // Insert unlinked records (without character_id, will need different conflict handling)
    if (unlinkedUpdates.length > 0) {
      // First, delete any existing unlinked records with the same character_name for this raid
      await supabase
        .from('attendance_records')
        .delete()
        .eq('raid_event_id', showImportModal.raidId)
        .is('character_id', null)
        .in('character_name', unlinkedUpdates.map(u => u.character_name))

      // Then insert the new unlinked records
      await supabase
        .from('attendance_records')
        .insert(unlinkedUpdates)
    }

    await loadRaidAttendance(showImportModal.raidId)
    setShowImportModal(null)
    setImportData('')
    setImportType('signup')

    const typeLabel = importType === 'signup' ? 'signups' : 'attendance'
    if (matchedCount > 0 || unmatchedCount > 0) {
      alert(
        `Import complete!\n\n` +
        `✓ ${matchedCount} matched ${typeLabel}\n` +
        `⚠ ${unmatchedCount} unmatched (will be linked if they join)`
      )
    } else {
      alert('No data to import')
    }
  }

  const getAttendanceCount = (raidId: string) => {
    const raidAttendance = attendance[raidId] || {}
    return Object.values(raidAttendance).filter(a => a.attended).length
  }

  const getSignupCount = (raidId: string) => {
    const raidAttendance = attendance[raidId] || {}
    return Object.values(raidAttendance).filter(a => a.signed_up).length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  // Check if reset date is in the future
  const resetDateInFuture = guildSettings?.reset_date && guildSettings.reset_date > today

  // Group raids by week (starting on the first raid day from settings)
  const firstRaidDay = guildSettings?.first_raid_day ?? 0 // Default to Sunday if not set

  const toggleWeekExpanded = (weekStart: string) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(weekStart)) {
        newSet.delete(weekStart)
      } else {
        newSet.add(weekStart)
      }
      return newSet
    })
  }

  const getWeekLabel = (weekStartDate: string) => {
    const date = new Date(weekStartDate + 'T00:00:00')
    return `Week of ${date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })}`
  }

  const raidsByWeek = raidDates.reduce((acc, raid) => {
    const weekStart = getWeekStart(raid.raid_date, firstRaidDay)
    if (!acc[weekStart]) {
      acc[weekStart] = []
    }
    // Deduplicate: only add if this raid_date doesn't already exist in this week
    const alreadyExists = acc[weekStart].some(r => r.raid_date === raid.raid_date)
    if (!alreadyExists) {
      acc[weekStart].push(raid)
    } else {
      console.log('⚠️ Skipping duplicate raid event:', raid.raid_date)
    }
    return acc
  }, {} as Record<string, RaidEvent[]>)

  // Sort raids within each week by date ascending (earliest first)
  Object.keys(raidsByWeek).forEach(weekStart => {
    raidsByWeek[weekStart].sort((a, b) => a.raid_date.localeCompare(b.raid_date))
  })

  const weekKeys = Object.keys(raidsByWeek).sort((a, b) => b.localeCompare(a)) // Most recent first

  console.log('📊 Raids by week:', Object.entries(raidsByWeek).map(([week, raids]) =>
    `${week}: ${raids.map(r => r.raid_date).join(', ')}`
  ))

  return (
    <div className="p-8 space-y-6 font-poppins">
      {/* Header */}
      <div>
        <h1 className="text-[42px] font-bold text-white leading-tight">Raid Tracking</h1>
        <p className="text-[#8a8d94] mt-1 text-[14px]">Manage attendance and signups for each raid day</p>
      </div>

      {/* Legend */}
      {!resetDateInFuture && (
        <div className="flex items-center gap-4 text-[13px] flex-wrap">
          <span className="text-[#a1a1a1]">Status Options:</span>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded border bg-green-600/30 border-green-600"></div>
            <span className="text-[#a1a1a1]">Attended</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded border bg-yellow-600/30 border-yellow-600"></div>
            <span className="text-[#a1a1a1]">Late</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded border bg-orange-600/30 border-orange-600"></div>
            <span className="text-[#a1a1a1]">Benched</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded border bg-blue-600/30 border-blue-600"></div>
            <span className="text-[#a1a1a1]">Signed Up</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded border bg-red-600/30 border-red-600"></div>
            <span className="text-[#a1a1a1]">No-Show</span>
          </div>
        </div>
      )}

      {/* Future Raid Start Message */}
      {resetDateInFuture && guildSettings && (
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-8 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 mx-auto bg-[#ff8000]/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-[#ff8000]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-[24px] font-bold text-white">Raids Haven't Started Yet</h3>
            <p className="text-[#a1a1a1] text-[14px]">
              Your first raid week is scheduled to begin on{' '}
              <span className="text-white font-medium">
                {new Date(guildSettings.reset_date + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </p>
            <p className="text-[#666] text-[13px]">
              Once raids begin, you'll be able to track attendance, signups, and manage raid days here.
            </p>
          </div>
        </div>
      )}

      {/* Raid Days Grouped by Week */}
      {!resetDateInFuture && (
        <div className="space-y-6">
        {weekKeys.map((weekStart) => {
          const raids = raidsByWeek[weekStart]
          const isWeekExpanded = expandedWeeks.has(weekStart)

          return (
            <div key={weekStart} className="space-y-3">
              {/* Week Header */}
              <button
                onClick={() => toggleWeekExpanded(weekStart)}
                className="flex items-center gap-3 w-full group"
              >
                {isWeekExpanded ? (
                  <ChevronUp className="w-6 h-6 text-white group-hover:text-[#ff8000] transition flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-6 h-6 text-white group-hover:text-[#ff8000] transition flex-shrink-0" />
                )}
                <h2 className="text-[24px] font-bold text-white group-hover:text-[#ff8000] transition">{getWeekLabel(weekStart)}</h2>
                <div className="flex-1 h-[1px] bg-[rgba(255,255,255,0.1)]"></div>
              </button>

              {/* Raid Days for this week */}
              {isWeekExpanded && raids.map((raid) => {
          const isExpanded = expandedRaid === raid.id
          const isPast = raid.raid_date < today
          const attendedCount = getAttendanceCount(raid.id)
          const signupCount = getSignupCount(raid.id)

          return (
            <div
              key={raid.id}
              className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden"
            >
              {/* Raid Header */}
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleRaidExpanded(raid.id)}
                    className="text-white hover:text-[#ff8000] transition"
                  >
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className={`text-[18px] font-bold ${raid.is_skipped ? 'line-through opacity-50' : 'text-white'}`}>
                        {new Date(raid.raid_date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </h3>
                      {raid.is_skipped && (
                        <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-red-600/30 text-red-300">
                          Skipped: {raid.skip_reason}
                        </span>
                      )}
                      {!isPast && !raid.is_skipped && raid.raid_date === today && (
                        <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-[#ff8000] text-white">
                          Today
                        </span>
                      )}
                    </div>
                    {!raid.is_skipped && (
                      <p className="text-[#666] text-[13px] mt-1">
                        {attendedCount} attended • {signupCount} signed up
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!raid.is_skipped && (
                    <button
                      onClick={() => setShowImportModal({ raidId: raid.id, date: raid.raid_date })}
                      className="px-4 py-2 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[52px] text-white text-[13px] font-medium transition flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Import Data
                    </button>
                  )}
                  <button
                    onClick={() => toggleSkipDay(raid.id, raid.is_skipped)}
                    className={`px-4 py-2 rounded-[52px] text-[13px] font-medium transition ${
                      raid.is_skipped
                        ? 'bg-red-600/30 text-red-300 hover:bg-red-600/40 border border-red-600'
                        : 'bg-[#151515] text-[#666] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)]'
                    }`}
                  >
                    {raid.is_skipped ? 'Unskip' : 'Skip Day'}
                  </button>
                </div>
              </div>

              {/* Expanded Member List */}
              {isExpanded && !raid.is_skipped && (
                <div className="border-t border-[rgba(255,255,255,0.1)] px-6 py-4">
                  {members.length === 0 && (!unlinkedAttendees[raid.id] || unlinkedAttendees[raid.id].length === 0) ? (
                    /* Empty State */
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 bg-[#1a1a1a] rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-[#666]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <h4 className="text-[16px] font-semibold text-white mb-2">No Raiders with Approved Loot Lists</h4>
                      <p className="text-[#666] text-[13px] max-w-md mx-auto">
                        Raiders will appear here once they submit and get their loot lists approved. Use the "Import Data" button to add attendance for this raid day.
                      </p>
                    </div>
                  ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Linked Members */}
                    {members.map(member => {
                      const status = attendance[raid.id]?.[member.character_id]
                      const state = getCellState(status)

                      return (
                        <button
                          key={member.character_id}
                          onClick={() => cycleAttendanceState(raid.id, member.character_id, member.user_id)}
                          className={`px-4 py-3 rounded-lg border transition text-left ${getCellStyle(state)}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium" style={{ color: member.class_color }}>
                                {member.character_name}
                              </p>
                              <p className="text-[11px] text-[#666] mt-0.5">{member.class_name}</p>
                            </div>
                            <span className="text-[12px] font-medium">
                              {getCellLabel(state)}
                            </span>
                          </div>
                        </button>
                      )
                    })}

                    {/* Unlinked Attendees (No Account Yet) */}
                    {unlinkedAttendees[raid.id]?.map((attendee, idx) => {
                      const state = getCellState(attendee.status)

                      return (
                        <div
                          key={`unlinked-${idx}`}
                          className={`px-4 py-3 rounded-lg border opacity-60 text-left ${getCellStyle(state)}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-[#a1a1a1]">
                                  {attendee.character_name}
                                </p>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-yellow-600/30 text-yellow-300 border border-yellow-600/50">
                                  Pending
                                </span>
                              </div>
                              <p className="text-[11px] text-[#666] mt-0.5">No account</p>
                            </div>
                            <span className="text-[12px] font-medium">
                              {getCellLabel(state)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
            </div>
          )
        })}
        </div>
      )}

      {/* Skip Day Modal */}
      {showSkipModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSkipModal(null)}>
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[20px] font-bold text-white">Skip Raid Day</h3>
              <button onClick={() => setShowSkipModal(null)} className="text-[#666] hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[#a1a1a1] text-[14px] mb-4">
              Marking raid on <span className="text-white font-medium">{new Date(showSkipModal.date + 'T00:00:00').toLocaleDateString()}</span> as skipped.
            </p>
            <input
              type="text"
              value={skipReason}
              onChange={e => setSkipReason(e.target.value)}
              placeholder="Reason (e.g., Holiday, Cancelled)..."
              className="w-full px-4 py-2 bg-[#0d0e11] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-[14px] focus:outline-none focus:border-[#ff8000] mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowSkipModal(null)}
                className="flex-1 px-4 py-2 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[52px] text-white text-[14px] font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmSkipDay}
                className="flex-1 px-4 py-2 bg-[#ff8000] hover:bg-[#ff9500] rounded-[52px] text-white text-[14px] font-medium transition"
              >
                Skip Day
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowImportModal(null)}>
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[20px] font-bold text-white">Import Data</h3>
              <button onClick={() => setShowImportModal(null)} className="text-[#666] hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[#a1a1a1] text-[14px] mb-4">
              Import data for <span className="text-white font-medium">{new Date(showImportModal.date + 'T00:00:00').toLocaleDateString()}</span>
            </p>

            {/* Import Type Selector */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setImportType('signup')}
                className={`flex-1 px-4 py-2 rounded-lg text-[14px] font-medium transition ${
                  importType === 'signup'
                    ? 'bg-[#ff8000] text-white'
                    : 'bg-[#151515] text-[#666] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)]'
                }`}
              >
                Signups
              </button>
              <button
                onClick={() => setImportType('attendance')}
                className={`flex-1 px-4 py-2 rounded-lg text-[14px] font-medium transition ${
                  importType === 'attendance'
                    ? 'bg-[#ff8000] text-white'
                    : 'bg-[#151515] text-[#666] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)]'
                }`}
              >
                Attendance
              </button>
            </div>

            <textarea
              value={importData}
              onChange={e => setImportData(e.target.value)}
              placeholder={
                importType === 'signup'
                  ? `Paste signup names (comma-separated or one per line)\n\nExample:\nHeadjaws, Calonise, Leroyspankin, Nardziz\n\nOr:\nHeadjaws\nCalonise\nLeroyspankin\n\nMatched names will be linked to accounts.\nUnmatched names will be tracked and linked if they join later.`
                  : `Paste attendance names (comma-separated or one per line)\n\nExample:\nHeadjaws, Calonise, Leroyspankin\n\nOr:\nHeadjaws\nCalonise\nLeroyspankin\n\nMatched names will be linked to accounts.\nUnmatched names will be tracked and linked if they join later.`
              }
              className="w-full h-64 px-4 py-3 bg-[#0d0e11] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-[14px] focus:outline-none focus:border-[#ff8000] mb-4 font-mono"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowImportModal(null)}
                className="flex-1 px-4 py-2 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[52px] text-white text-[14px] font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={importSignups}
                className="flex-1 px-4 py-2 bg-[#ff8000] hover:bg-[#ff9500] rounded-[52px] text-white text-[14px] font-medium transition"
              >
                Import {importType === 'signup' ? 'Signups' : 'Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
