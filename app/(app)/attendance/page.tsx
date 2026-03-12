'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/client'
import { trackClientEvent } from '@/utils/analytics/client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Calendar01Icon, ArrowDown01Icon, ArrowUp01Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { AttendanceStatsSkeleton, TableSkeleton } from '@/components/ui/skeletons'
import { ErrorState } from '@/components/ui/error-state'
import { Heading } from '@/components/ui/typography'
import { calculateAttendanceScore, getRankModifier } from '@/utils/calculations'
import { useNotification } from '@/app/contexts/NotificationContext'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { getWclReportUrl } from '@/lib/warcraftlogs'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { parseDate, toDateString } from '@/utils/date'

interface RaidEvent {
  id: string
  raid_date: string
  is_skipped: boolean
  notes: string | null
  wcl_report_code: string | null
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
  isUpcoming: boolean
  raids: RaidEvent[]
}

export default function AttendancePage() {
  // Personal attendance state
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useGuildContext()
  const [activeCharacter, setActiveCharacter] = useState<any>(null)
  const [guildId, setGuildId] = useState<string | null>(null)
  const [attendanceScore, setAttendanceScore] = useState(0)
  const [roleModifier, setRoleModifier] = useState(0)
  const [memberRole, setMemberRole] = useState('')
  const [guildSettings, setGuildSettings] = useState<any>(null)
  const [expansionStartDate, setExpansionStartDate] = useState<string | null>(null)
  const [expansionRaidSchedule, setExpansionRaidSchedule] = useState<{
    raid_days_per_week: number
    first_raid_day: number | null
    second_raid_day: number | null
    third_raid_day: number | null
    fourth_raid_day: number | null
    fifth_raid_day: number | null
    timezone: string
  } | null>(null)

  // Guild attendance state
  const [guildRaiders, setGuildRaiders] = useState<GuildRaider[]>([])
  const [guildRaidEvents, setGuildRaidEvents] = useState<RaidEvent[]>([])
  const [sortBy, setSortBy] = useState<'score' | 'name'>('score')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const supabase = createClient()
  const { showNotification } = useNotification()

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Attendance'
  }, [])

  // Track page view
  useEffect(() => {
    if (guildId) trackClientEvent('attendance_page_viewed', { guild_id: guildId })
  }, [guildId])

  // Get the start of a week based on first raid day
  const getWeekStart = (dateString: string, firstRaidDay: number) => {
    const date = parseDate(dateString)
    const currentDay = date.getDay()
    let daysToSubtract = (currentDay - firstRaidDay + 7) % 7
    const weekStart = new Date(date)
    weekStart.setDate(weekStart.getDate() - daysToSubtract)
    return toDateString(weekStart)
  }

  // Calculate the most recent tracked week (the current week)
  const mostRecentTrackedWeek = useMemo(() => {
    // Use expansion's first raid day, fallback to guild settings
    const firstRaidDay = expansionRaidSchedule?.first_raid_day ?? guildSettings?.first_raid_day ?? 0
    const today = new Date()
    const currentDay = today.getDay()
    const daysToSubtract = (currentDay - firstRaidDay + 7) % 7
    const currentWeekStartDate = new Date(today)
    currentWeekStartDate.setDate(currentWeekStartDate.getDate() - daysToSubtract)
    return toDateString(currentWeekStartDate)
  }, [expansionRaidSchedule, guildSettings])

  // Get configured raid day numbers
  const configuredRaidDays = useMemo(() => {
    const src = expansionRaidSchedule || guildSettings
    if (!src) return []
    return [src.first_raid_day, src.second_raid_day, src.third_raid_day, src.fourth_raid_day, src.fifth_raid_day]
      .filter((d: number | null | undefined) => d !== null && d !== undefined)
      .slice(0, src.raid_days_per_week || 2)
  }, [expansionRaidSchedule, guildSettings])

  // Group raid events by week
  const raidsByWeek = useMemo((): WeekGroup[] => {
    // Use expansion's first raid day, fallback to guild settings
    const firstRaidDay = expansionRaidSchedule?.first_raid_day ?? guildSettings?.first_raid_day ?? 0
    const grouped: Record<string, RaidEvent[]> = {}

    guildRaidEvents.forEach(raid => {
      const weekStart = getWeekStart(raid.raid_date, firstRaidDay)
      if (!grouped[weekStart]) {
        grouped[weekStart] = []
      }
      // Deduplicate: only add if this raid_date doesn't already exist in this week
      const alreadyExists = grouped[weekStart].some(r => r.raid_date === raid.raid_date)
      if (!alreadyExists) {
        grouped[weekStart].push(raid)
      }
    })

    // Generate 1 upcoming week of placeholder raid dates
    if (configuredRaidDays.length > 0) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Scan up to 14 days ahead to find 1 full week of raid days
      const cursor = new Date(tomorrow)
      const limit = new Date(tomorrow)
      limit.setDate(limit.getDate() + 14)

      const existingDates = new Set(guildRaidEvents.map(r => r.raid_date))
      const upcomingByWeek: Record<string, RaidEvent[]> = {}
      let weeksFound = 0

      while (cursor < limit && weeksFound < 1) {
        if (configuredRaidDays.includes(cursor.getDay())) {
          const dateStr = toDateString(cursor)
          if (!existingDates.has(dateStr)) {
            const weekStart = getWeekStart(dateStr, firstRaidDay)
            if (!upcomingByWeek[weekStart]) {
              upcomingByWeek[weekStart] = []
              weeksFound++
            }
            upcomingByWeek[weekStart].push({
              id: `upcoming-${dateStr}`,
              raid_date: dateStr,
              is_skipped: false,
              notes: null,
              wcl_report_code: null,
            })
          }
        }
        cursor.setDate(cursor.getDate() + 1)
      }

      // Fill remaining raid days for the week we found
      const weekKey = Object.keys(upcomingByWeek)[0]
      if (weekKey) {
        const weekStartDate = parseDate(weekKey)
        for (let d = 0; d < 7; d++) {
          const checkDate = new Date(weekStartDate)
          checkDate.setDate(checkDate.getDate() + d)
          const checkStr = toDateString(checkDate)
          if (
            configuredRaidDays.includes(checkDate.getDay()) &&
            !existingDates.has(checkStr) &&
            checkStr > toDateString(today) &&
            !upcomingByWeek[weekKey].some(r => r.raid_date === checkStr)
          ) {
            upcomingByWeek[weekKey].push({
              id: `upcoming-${checkStr}`,
              raid_date: checkStr,
              is_skipped: false,
              notes: null,
              wcl_report_code: null,
            })
          }
        }
        upcomingByWeek[weekKey].sort((a, b) => a.raid_date.localeCompare(b.raid_date))

        // Merge upcoming placeholders into grouped, preserving existing events.
        // Object.assign would OVERWRITE a week group if an upcoming date falls in
        // the same week as an existing event (e.g., Tuesday event + Thursday placeholder
        // when first_raid_day is Tuesday — both map to the same week key).
        Object.entries(upcomingByWeek).forEach(([key, upcomingRaids]) => {
          if (grouped[key]) {
            upcomingRaids.forEach(upcoming => {
              if (!grouped[key].some(existing => existing.raid_date === upcoming.raid_date)) {
                grouped[key].push(upcoming)
              }
            })
          } else {
            grouped[key] = upcomingRaids
          }
        })
      }
    }

    if (Object.keys(grouped).length === 0) return []

    // Sort weeks descending (most recent first) and raids within each week ascending
    const todayStr = toDateString(new Date())
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([weekStart, raids]) => ({
        weekStart,
        label: parseDate(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isMostRecent: weekStart === mostRecentTrackedWeek,
        isUpcoming: raids.every(r => r.raid_date > todayStr),
        raids: raids.sort((a, b) => a.raid_date.localeCompare(b.raid_date))
      }))
  }, [guildRaidEvents, expansionRaidSchedule, guildSettings, mostRecentTrackedWeek, configuredRaidDays])

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
      if (!user) return

      try {
        // Get active character
        const { data: activeCharData } = await supabase
          .from('user_active_characters')
          .select('active_character_id, active_guild_id')
          .eq('user_id', user.id)
          .single()

        if (!activeCharData?.active_character_id || !activeCharData?.active_guild_id) {
          return
        }

        // PERFORMANCE: Parallelize independent queries that only need activeCharData
        const [
          characterResult,
          settingsResult,
          guildResult,
          membershipResult
        ] = await Promise.all([
          // Query 1: Get character details
          supabase
            .from('characters')
            .select('id, name, class:wow_classes(name, color_hex)')
            .eq('id', activeCharData.active_character_id)
            .single(),

          // Query 2: Load guild settings
          supabase
            .from('guild_settings')
            .select('*')
            .eq('guild_id', activeCharData.active_guild_id)
            .single(),

          // Query 3: Get guild data for expansion
          supabase
            .from('guilds')
            .select('active_expansion_id')
            .eq('id', activeCharData.active_guild_id)
            .single(),

          // Query 4: Get character's role in the guild
          supabase
            .from('character_guild_memberships')
            .select('role')
            .eq('character_id', activeCharData.active_character_id)
            .eq('guild_id', activeCharData.active_guild_id)
            .single()
        ])

        // Check critical queries for errors
        if (characterResult.error) {
          console.error('Failed to load character data:', characterResult.error)
          setError("Couldn't load your character data. Check your connection and try again.")
          return
        }

        if (settingsResult.error) {
          console.error('Failed to load guild settings:', settingsResult.error)
          setError("Couldn't load guild settings. Check your connection and try again.")
          return
        }

        const characterData = characterResult.data
        const settingsData = settingsResult.data
        const guildData = guildResult.data
        const membershipData = membershipResult.data

        if (!characterData) {
          return
        }

        setActiveCharacter(characterData)
        setGuildId(activeCharData.active_guild_id)

        if (settingsData) {
          setGuildSettings(settingsData)
        }

        // Get expansion data if guild has an active expansion
        let raidStartDate: string | null = null
        let expansionRaidDays: typeof expansionRaidSchedule = null
        if (guildData?.active_expansion_id) {
          const { data: expansionData } = await supabase
            .from('expansions')
            .select('raid_start_date, raid_days_per_week, first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day, timezone')
            .eq('id', guildData.active_expansion_id)
            .single()

          raidStartDate = expansionData?.raid_start_date || null
          setExpansionStartDate(raidStartDate)

          if (expansionData) {
            expansionRaidDays = {
              raid_days_per_week: expansionData.raid_days_per_week ?? 2,
              first_raid_day: expansionData.first_raid_day,
              second_raid_day: expansionData.second_raid_day,
              third_raid_day: expansionData.third_raid_day,
              fourth_raid_day: expansionData.fourth_raid_day,
              fifth_raid_day: expansionData.fifth_raid_day,
              timezone: expansionData.timezone ?? 'America/New_York'
            }
            setExpansionRaidSchedule(expansionRaidDays)
          }
        }

        const role = membershipData?.role || 'Member'
        setMemberRole(role)

        // Calculate role modifier using guild settings
        const modifier = getRankModifier(role, settingsData || {})
        setRoleModifier(modifier)

        // Calculate rolling attendance window
        // Include current week + X previous weeks
        const weeks = settingsData?.rolling_attendance_weeks || 4
        // Use expansion's first raid day, fallback to guild settings, then default to 0
        const firstRaidDay = expansionRaidDays?.first_raid_day ?? settingsData?.first_raid_day ?? 0

        // Calculate the start of the current week
        const today = new Date()
        const currentDay = today.getDay()
        const daysToSubtract = (currentDay - firstRaidDay + 7) % 7
        const currentWeekStartDate = new Date(today)
        currentWeekStartDate.setDate(currentWeekStartDate.getDate() - daysToSubtract)
        currentWeekStartDate.setHours(0, 0, 0, 0)

        // Period ends at today (include current week)
        const periodEnd = new Date(today)

        // Period starts X weeks before the current week
        const periodStart = new Date(currentWeekStartDate)
        periodStart.setDate(periodStart.getDate() - (weeks * 7))

        // Use expansion start date as lower bound if set
        const lowerBound = raidStartDate
          ? new Date(Math.max(new Date(raidStartDate).getTime(), periodStart.getTime()))
          : periodStart

        // Auto-create missing raid events for scheduled dates in the window.
        // This ensures events exist even if the officer hasn't visited Raid Tracking yet.
        if (guildData?.active_expansion_id) {
          const raidDaysForEnsure = [
            expansionRaidDays?.first_raid_day ?? settingsData?.first_raid_day,
            expansionRaidDays?.second_raid_day ?? settingsData?.second_raid_day,
            expansionRaidDays?.third_raid_day ?? settingsData?.third_raid_day,
            expansionRaidDays?.fourth_raid_day ?? settingsData?.fourth_raid_day,
            expansionRaidDays?.fifth_raid_day ?? settingsData?.fifth_raid_day,
          ].filter((d): d is number => d !== null && d !== undefined)
            .slice(0, expansionRaidDays?.raid_days_per_week ?? settingsData?.raid_days_per_week ?? 2)

          if (raidDaysForEnsure.length > 0) {
            const scheduledDates: string[] = []
            const cursor = new Date(lowerBound)
            cursor.setHours(0, 0, 0, 0)
            const endDate = new Date(today)
            endDate.setHours(23, 59, 59, 999)
            while (cursor <= endDate) {
              if (raidDaysForEnsure.includes(cursor.getDay())) {
                scheduledDates.push(toDateString(cursor))
              }
              cursor.setDate(cursor.getDate() + 1)
            }
            if (scheduledDates.length > 0) {
              try {
                await fetch('/api/raid-events/ensure', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    guild_id: activeCharData.active_guild_id,
                    dates: scheduledDates,
                    expansion_id: guildData.active_expansion_id,
                  }),
                })
              } catch {
                // Non-critical: events may already exist
              }
            }
          }
        }

        // Get raid events in the rolling window (current week + previous X weeks)
        const { data: raidEventsData } = await supabase
          .from('raid_events')
          .select('id, raid_date, is_skipped, notes, wcl_report_code')
          .eq('guild_id', activeCharData.active_guild_id)
          .gte('raid_date', toDateString(lowerBound))
          .lte('raid_date', toDateString(periodEnd))
          .eq('is_skipped', false)
          .order('raid_date', { ascending: true })

        // Filter to only show raid days that match the expansion's configured schedule
        // Use expansion raid days if available, otherwise fall back to guild settings
        const raidDaysSource = expansionRaidDays || settingsData
        const raidDays = [
          raidDaysSource?.first_raid_day,
          raidDaysSource?.second_raid_day,
          raidDaysSource?.third_raid_day,
          raidDaysSource?.fourth_raid_day,
          raidDaysSource?.fifth_raid_day
        ].filter(day => day !== null && day !== undefined)
          .slice(0, raidDaysSource?.raid_days_per_week || 2)

        // Show ALL tracked raid events that have attendance data, regardless of schedule.
        // Only filter empty events (no attendance) to match the current configured schedule.
        // This handles: schedule changes leaving orphan events, while keeping off-schedule tracked raids.
        const allRaidEvents = raidEventsData || []

        // IMPORTANT: Deduplicate by raid_date to handle duplicate entries in database
        // First, find which raid IDs have attendance records, so we prefer those
        const allRaidIds = allRaidEvents.map((e: RaidEvent) => e.id)
        const { data: existingAttendance } = await supabase
          .from('attendance_records')
          .select('raid_event_id')
          .in('raid_event_id', allRaidIds)

        const raidIdsWithAttendance = new Set(existingAttendance?.map((r: { raid_event_id: string }) => r.raid_event_id) || [])

        // Deduplicate: prefer events that have attendance records
        const deduplicatedRaidEvents: RaidEvent[] = Array.from(
          allRaidEvents.reduce((map: Map<string, RaidEvent>, event: RaidEvent) => {
            const existing = map.get(event.raid_date)
            if (!existing) {
              // First event for this date - keep it
              map.set(event.raid_date, event)
            } else if (raidIdsWithAttendance.has(event.id) && !raidIdsWithAttendance.has(existing.id)) {
              // This event has attendance but the existing one doesn't - prefer this one
              map.set(event.raid_date, event)
            }
            return map
          }, new Map<string, RaidEvent>()).values()
        )

        // Filter out empty events that don't match the current raid schedule.
        // Events WITH attendance always show (officer tracked an off-schedule day).
        // Events WITHOUT attendance only show if they match a configured raid day.
        const raidDaySet = new Set(raidDays as number[])
        const filteredRaidEvents = deduplicatedRaidEvents.filter(event => {
          if (raidIdsWithAttendance.has(event.id)) return true
          const eventDay = parseDate(event.raid_date).getDay()
          return raidDaySet.has(eventDay)
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
          .gte('raid_event.raid_date', toDateString(lowerBound))
          .lte('raid_event.raid_date', toDateString(periodEnd))
          .order('raid_event.raid_date', { ascending: false })

        if (recordsData) {
          setAttendanceRecords(recordsData as any)
        }

        // Calculate personal attendance score using deduplicated events
        if (deduplicatedRaidEvents.length > 0) {
          const raidIds = deduplicatedRaidEvents.map((r: RaidEvent) => r.id)

          const { data: recentRecords } = await supabase
            .from('attendance_records')
            .select('signed_up, attended, no_call_no_show')
            .eq('character_id', characterData.id)
            .in('raid_event_id', raidIds)

          if (recentRecords && recentRecords.length > 0) {
            const score = calculateAttendanceScore(recentRecords, deduplicatedRaidEvents.length, settingsData || {})
            setAttendanceScore(score)
          }
        }

        // Load guild-wide attendance data
        await loadGuildAttendance(activeCharData.active_guild_id, deduplicatedRaidEvents, settingsData)
      } catch (error) {
        console.error('Failed to load attendance data:', error)
        setError("Couldn't load attendance data. Check your connection and try again.")
        showNotification('error', "Couldn't load attendance data. Try refreshing the page.")
      } finally {
        setLoading(false)
      }
    }

    loadData().catch((error) => {
      console.error('Unhandled error in loadData:', error)
      setError("Couldn't load attendance data. Check your connection and try again.")
      setLoading(false)
    })
  }, [user])

  const loadGuildAttendance = async (guildId: string, raidEvents: RaidEvent[], settings: any) => {
    try {
      const raidEventIds = raidEvents.map(r => r.id)

      // Build raider list from loot submissions directly.
      // Submitters may not have active guild memberships, so we can't rely
      // on character_guild_memberships as the sole source of truth.
      const [submissionsResult, membersResponse, attendanceResult] = await Promise.all([
        // Query 1: Get all characters with loot submissions
        supabase
          .from('loot_submissions')
          .select(`
            character_id,
            character:characters!inner (
              id,
              name,
              user_id,
              class:wow_classes(name, color_hex)
            )
          `)
          .eq('guild_id', guildId)
          .eq('status', 'approved'),

        // Query 2: Fetch roles from guild-members API (uses service role to see all members)
        fetch(`/api/guild-members?guild_id=${guildId}`).then(r => r.ok ? r.json() : null),

        // Query 3: Get all attendance records for these raid events
        supabase
          .from('attendance_records')
          .select('raid_event_id, character_id, signed_up, attended, no_call_no_show, was_late, was_benched')
          .in('raid_event_id', raidEventIds)
      ])

      const submissionsData = submissionsResult.data
      const allAttendance = attendanceResult.data

      if (!submissionsData || submissionsData.length === 0 || raidEvents.length === 0) {
        setGuildRaiders([])
        return
      }

      // Build role and join date lookups by character_id from API response
      const roleByCharacterId: Record<string, string> = {}
      const joinDateByCharacterId: Record<string, string> = {}
      if (membersResponse?.members) {
        for (const member of membersResponse.members) {
          for (const char of member.characters || []) {
            roleByCharacterId[char.id] = member.role || 'Member'
            if (member.joined_at) joinDateByCharacterId[char.id] = member.joined_at
          }
        }
      }

      // Deduplicate submissions by character_id
      const seen = new Set<string>()
      const activeRaiders = submissionsData.filter((s: any) => {
        if (seen.has(s.character_id)) return false
        seen.add(s.character_id)
        return true
      })

      // Build attendance map: characterId -> raidEventId -> status
      const attendanceByCharacter: Record<string, Map<string, AttendanceStatus>> = {}
      allAttendance?.forEach((record: { raid_event_id: string; character_id: string | null; signed_up: boolean; attended: boolean; no_call_no_show: boolean; was_late?: boolean; was_benched?: boolean }) => {
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
      const raiders: GuildRaider[] = activeRaiders.map((s: any) => {
        const char = s.character as any
        const charAttendance = attendanceByCharacter[s.character_id] || new Map()
        const userId = char.user_id

        // New member policy: check how to handle new members
        const newMemberMode = settings?.new_member_mode || 'raw'
        const joinedAt = joinDateByCharacterId[s.character_id]
        const memberJoinDate = joinedAt ? new Date(joinedAt) : null

        // If member has attendance records before their join date (retroactive import),
        // use the earliest attended raid as their effective start date
        let effectiveStartDate = memberJoinDate
        if (effectiveStartDate && charAttendance.size > 0) {
          const attendedRaidDates = raidEvents
            .filter(r => charAttendance.has(r.id))
            .map(r => parseDate(r.raid_date))
          if (attendedRaidDates.length > 0) {
            const earliestAttendance = new Date(Math.min(...attendedRaidDates.map(d => d.getTime())))
            if (earliestAttendance < effectiveStartDate) {
              effectiveStartDate = earliestAttendance
            }
          }
        }

        // For 'fair' and 'minimum_gate' modes, filter raids to only those after effective start date
        const eligibleRaidEvents = (newMemberMode === 'fair' || newMemberMode === 'minimum_gate') && effectiveStartDate
          ? raidEvents.filter(r => parseDate(r.raid_date) >= effectiveStartDate)
          : raidEvents

        const eligibleRaidIds = new Set(eligibleRaidEvents.map(r => r.id))

        // Get records for score calculation (only for eligible raids)
        const records = Array.from(charAttendance.entries())
          .filter(([raidId]) => eligibleRaidIds.has(raidId))
          .map(([, status]) => ({
            signed_up: status.signed_up,
            attended: status.attended,
            no_call_no_show: status.no_call_no_show
          }))

        const score = calculateAttendanceScore(records, eligibleRaidEvents.length, settings || {})

        return {
          id: s.character_id,
          name: char.name,
          role: roleByCharacterId[s.character_id] || 'Member',
          className: char.class?.name || 'Unknown',
          classColor: char.class?.color_hex || '#ffffff',
          attendanceScore: score,
          attendance: charAttendance
        }
      })

      setGuildRaiders(raiders)
    } catch (error) {
      console.error('Failed to load guild attendance data:', error)
      showNotification('error', "Couldn't load guild attendance data. Try refreshing the page.")
    }
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
      case 'attended': return 'bg-success/30 text-success'
      case 'late': return 'bg-warning/30 text-warning'
      case 'benched': return 'bg-accent/30 text-accent'
      case 'signed-up': return 'bg-accent/30 text-accent'
      case 'no-show': return 'bg-destructive/30 text-destructive'
      default: return 'bg-muted text-foreground-muted'
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
    const date = parseDate(dateString)
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
    trackClientEvent('attendance_tab_changed', { tab_name: column })
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-poppins">
      {/* Header - Always visible */}
      <div>
        <Heading level={1}>Attendance</Heading>
        <p className="text-muted-foreground mt-1 text-base">Track raid attendance and view attendance scores</p>
      </div>

      {/* Show skeleton while loading */}
      {loading ? (
        <>
          <AttendanceStatsSkeleton />
          <TableSkeleton rows={8} cols={6} />
        </>
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={() => window.location.reload()}
          size="lg"
          variant="card"
        />
      ) : (
        <>
          {/* Personal Summary Cards */}
          {activeCharacter && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[14px] font-medium" style={{ color: (activeCharacter.class as any)?.color_hex || '#fff' }}>
              {activeCharacter.name}
            </span>
            <span className="text-foreground-muted text-[13px]">• Your attendance</span>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            <div className="bg-background-elevated border border-border rounded-xl p-3 sm:p-6">
              <p className="text-muted-foreground text-xs sm:text-sm mb-1 inline-flex items-center gap-1">
                <span className="hidden sm:inline">Attendance credit (previous {guildSettings?.rolling_attendance_weeks || 4} weeks)</span>
                <span className="sm:hidden">Credit</span>
                <InfoTooltip content="Points earned from attending raids within the rolling window. Contributes directly to your Loot Score." iconSize={12} />
              </p>
              <p className={`text-[28px] sm:text-[42px] font-bold leading-none ${
                attendanceScore >= (guildSettings?.max_attendance_bonus || 8) * 0.75 ? 'text-success' :
                attendanceScore >= (guildSettings?.max_attendance_bonus || 8) * 0.5 ? 'text-warning' :
                'text-destructive'
              }`}>
                {attendanceScore.toFixed(guildSettings?.decimal_places || 2)} <span className="text-[14px] sm:text-[18px] text-muted-foreground">/ {(guildSettings?.max_attendance_bonus || 8).toFixed(guildSettings?.decimal_places || 2)}</span>
              </p>
            </div>

            <div className="bg-background-elevated border border-border rounded-xl p-3 sm:p-6">
              <p className="text-muted-foreground text-xs sm:text-sm mb-1 inline-flex items-center gap-1">Role modifier <InfoTooltip content="Guild-configured modifier based on your role. Most members have 0." iconSize={12} /></p>
              <p className={`text-[28px] sm:text-[42px] font-bold leading-none ${roleModifier < 0 ? 'text-destructive' : roleModifier > 0 ? 'text-success' : 'text-foreground'}`}>
                {roleModifier >= 0 ? '+' : ''}{roleModifier}
              </p>
              <p className="text-muted-foreground text-xs sm:text-sm mt-2">{memberRole}</p>
            </div>

            <div className="bg-background-elevated border border-border rounded-xl p-3 sm:p-6">
              <p className="text-muted-foreground text-xs sm:text-sm mb-1 inline-flex items-center gap-1">Tracked raids <InfoTooltip content="Total raids logged within the rolling attendance window. Your attendance rate is based on how many of these you attended." iconSize={12} /></p>
              <p className="text-[28px] sm:text-[42px] font-bold text-foreground leading-none">
                {guildRaidEvents.length}
              </p>
              <p className="text-muted-foreground text-xs sm:text-sm mt-2"><span className="hidden sm:inline">Current + previous {guildSettings?.rolling_attendance_weeks || 4} weeks</span><span className="sm:hidden">{guildSettings?.rolling_attendance_weeks || 4}wk window</span></p>
            </div>
          </div>
        </>
      )}

      {/* Guild attendance Table */}
      <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-foreground font-semibold">Guild attendance</h2>
            <p className="text-foreground-muted text-[12px] mt-0.5">
              Current week + previous {guildSettings?.rolling_attendance_weeks || 4} weeks
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[12px] text-foreground-muted">Sort:</span>
            <Button
              variant={sortBy === 'score' ? 'accent-subtle' : 'ghost'}
              size="sm"
              onClick={() => toggleSort('score')}
              className="text-[12px]"
            >
              Credit
              {sortBy === 'score' && (sortDirection === 'desc' ? <HugeiconsIcon icon={ArrowDown01Icon} size={12} /> : <HugeiconsIcon icon={ArrowUp01Icon} size={12} />)}
            </Button>
            <Button
              variant={sortBy === 'name' ? 'accent-subtle' : 'ghost'}
              size="sm"
              onClick={() => toggleSort('name')}
              className="text-[12px]"
            >
              Name
              {sortBy === 'name' && (sortDirection === 'desc' ? <HugeiconsIcon icon={ArrowDown01Icon} size={12} /> : <HugeiconsIcon icon={ArrowUp01Icon} size={12} />)}
            </Button>
          </div>
        </div>

        {guildRaiders.length === 0 ? (
          <div className="p-8 text-center">
            <HugeiconsIcon icon={Calendar01Icon} size={48} className="text-foreground-muted mx-auto mb-3" />
            <p className="text-foreground-muted">No raiders with loot lists</p>
            <p className="text-foreground-muted text-sm mt-1">Guild members with loot submissions will appear here</p>
          </div>
        ) : guildRaidEvents.length === 0 ? (
          <div className="p-8 text-center">
            <HugeiconsIcon icon={Calendar01Icon} size={48} className="text-foreground-muted mx-auto mb-3" />
            <p className="text-foreground-muted">No raid events in the attendance window. Your score updates after first pull.</p>
          </div>
        ) : (
          <div className="-mx-4 sm:mx-0 overflow-x-auto max-h-[calc(100vh-356px)] sm:max-h-[calc(100vh-300px)] overflow-y-auto">
            <table className="w-full min-w-max">
              {/* Header row with week groupings */}
              <thead className="sticky top-14 sm:top-0 z-20">
                <tr className="bg-background-subtle">
                  <th className="sticky left-0 z-20 bg-background-subtle px-2 sm:px-3 py-2 text-left text-[11px] font-medium text-foreground-muted min-w-[80px] sm:min-w-[120px]">
                    Character
                  </th>
                  <th className="sticky left-[80px] sm:left-[120px] z-20 bg-background-subtle px-2 py-2 text-left text-[11px] font-medium text-foreground-muted min-w-[56px] sm:min-w-[80px] hidden sm:table-cell">
                    Role
                  </th>
                  <th className="sticky left-[80px] sm:left-[200px] z-20 bg-background-subtle px-2 py-2 text-center text-[11px] font-medium text-foreground-muted min-w-[48px] sm:min-w-[56px]">
                    Credit
                  </th>
                  {/* Week grouping headers */}
                  {raidsByWeek.map(week => (
                    <th
                      key={week.weekStart}
                      colSpan={week.raids.length}
                      className={`px-2 py-2 text-center text-[11px] font-medium border-l border-border ${
                        week.isUpcoming
                          ? 'bg-muted text-muted-foreground'
                          : week.isMostRecent
                            ? 'bg-success/10 text-success'
                            : 'bg-accent/10 text-accent'
                      }`}
                    >
                      Week of {week.label}
                    </th>
                  ))}
                </tr>
                {/* Sub-header for individual dates */}
                <tr className="bg-background-subtle/80">
                  <th className="sticky left-0 z-20 bg-background-subtle/80 px-2 sm:px-3 py-1.5" />
                  <th className="sticky left-[80px] sm:left-[120px] z-20 bg-background-subtle/80 px-2 py-1.5 hidden sm:table-cell" />
                  <th className="sticky left-[80px] sm:left-[200px] z-20 bg-background-subtle/80 px-2 py-1.5" />
                  {raidsByWeek.flatMap(week =>
                    week.raids.map(raid => (
                      <th
                        key={raid.id}
                        className={`px-2 py-1.5 text-center text-[10px] font-normal min-w-[50px] border-l border-border ${
                          week.isUpcoming
                            ? 'bg-muted/50 text-muted-foreground/50'
                            : week.isMostRecent
                              ? 'bg-success/5 text-success/70'
                              : 'bg-accent/5 text-accent/50'
                        }`}
                      >
                        {raid.wcl_report_code ? (
                          <a
                            href={getWclReportUrl(raid.wcl_report_code, guildSettings?.wcl_guild_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline text-[#e35e15]"
                            title="View WCL report"
                          >
                            {formatShortDate(raid.raid_date)}
                          </a>
                        ) : (
                          formatShortDate(raid.raid_date)
                        )}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sortedRaiders.map(raider => (
                  <tr key={raider.id} className="hover:bg-muted transition-colors">
                    <td className="sticky left-0 z-10 bg-background-elevated px-2 sm:px-3 py-2.5">
                      <span className="font-medium text-[12px] sm:text-[13px]" style={{ color: raider.classColor }}>
                        {raider.name}
                      </span>
                    </td>
                    <td className="sticky left-[80px] sm:left-[120px] z-10 bg-background-elevated px-2 py-2.5 text-[11px] sm:text-[12px] text-muted-foreground hidden sm:table-cell">
                      {raider.role}
                    </td>
                    <td className="sticky left-[80px] sm:left-[200px] z-10 bg-background-elevated px-2 py-2.5 text-center">
                      <span className={`font-semibold text-[13px] ${
                        raider.attendanceScore >= (guildSettings?.max_attendance_bonus || 8) * 0.75 ? 'text-success' :
                        raider.attendanceScore >= (guildSettings?.max_attendance_bonus || 8) * 0.5 ? 'text-warning' :
                        'text-destructive'
                      }`}>
                        {raider.attendanceScore.toFixed(guildSettings?.decimal_places || 2)}
                      </span>
                    </td>
                    {raidsByWeek.flatMap(week =>
                      week.raids.map(raid => {
                        if (week.isUpcoming) {
                          return (
                            <td
                              key={raid.id}
                              className="px-2 py-2.5 text-center border-l border-border bg-muted/30"
                            >
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-medium text-muted-foreground/40">
                                -
                              </span>
                            </td>
                          )
                        }
                        const status = raider.attendance.get(raid.id)
                        const state = getAttendanceState(status)
                        return (
                          <td
                            key={raid.id}
                            className={`px-2 py-2.5 text-center border-l border-border ${
                              week.isMostRecent ? 'bg-success/5' : 'bg-accent/5'
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
            <span className="text-foreground-muted">Legend:</span>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-success/20 text-success text-[10px] font-medium">A</span>
              <span className="text-muted-foreground">Attended</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-warning/20 text-warning text-[10px] font-medium">L</span>
              <span className="text-muted-foreground">Late</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-accent/20 text-accent text-[10px] font-medium">B</span>
              <span className="text-muted-foreground">Benched</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-accent/20 text-accent text-[10px] font-medium">S</span>
              <span className="text-muted-foreground">Signed up only</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-destructive/20 text-destructive text-[10px] font-medium">X</span>
              <span className="text-muted-foreground">No-show</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-muted text-foreground-muted text-[10px] font-medium">-</span>
              <span className="text-muted-foreground">No record</span>
            </div>
          </div>

          {/* Color coding explanation */}
          <div className="flex flex-wrap items-center gap-4 text-[12px] text-foreground-muted">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-success/10 border border-success/30" />
              <span>Current week</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-accent/10 border border-accent/20" />
              <span>Previous tracked weeks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-muted border border-border" />
              <span>Upcoming</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
