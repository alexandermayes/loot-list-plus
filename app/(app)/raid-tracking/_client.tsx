'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import { PlusSignIcon } from '@hugeicons/core-free-icons'
import nextDynamic from 'next/dynamic'

const LootHistoryTab = nextDynamic(() => import('./components/LootHistoryTab'), {
  loading: () => (
    <div className="min-h-[400px] space-y-4 p-4">
      <div className="flex gap-3">
        <div className="h-9 w-48 bg-muted rounded-[52px] animate-pulse" />
        <div className="h-9 w-32 bg-muted rounded-[52px] animate-pulse" />
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-b-0">
            <div className="w-8 h-8 bg-muted rounded animate-pulse shrink-0" />
            <div className="h-4 w-40 bg-muted rounded animate-pulse flex-1" />
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
})
import { RaidTrackingPageSkeleton } from '@/components/ui/skeletons'
import { Heading, Text } from '@/components/ui/typography'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { useConfirm } from '@/components/ui/confirm-modal'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { trackClientEvent } from '@/utils/analytics/client'
import { parseDate, toDateString } from '@/utils/date'
import { useRaidTeam } from '@/app/hooks/useRaidTeam'
import { isDateScheduled } from '@/domain/raid-team/schedule-history'
import { resolveRaidDays } from '@/domain/raid-team/settings'
import { TeamSelector } from '@/app/components/TeamSelector'
import { paginatedSelect } from '@/utils/supabase/paginate'
import type {
  Member,
  RaidLootEntry,
  LootItem,
  RaidEvent,
  AttendanceStatus,
  UnlinkedAttendee,
} from './components/types'
import { getCellState, type CellState } from './components/cell-state'
import { SkipDayModal } from './components/SkipDayModal'
import { BonusRaidModal } from './components/BonusRaidModal'
import { ReassignLootModal } from './components/ReassignLootModal'
import { LootItemSelectionModal } from './components/LootItemSelectionModal'
import { AttendeeResolutionModal } from './components/AttendeeResolutionModal'
import { ImportModal } from './components/ImportModal'
import { RaidCard } from './components/RaidCard'
import { WeekGroup } from './components/WeekGroup'

export default function RaidTrackingPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [raidDates, setRaidDates] = useState<RaidEvent[]>([])
  const [attendance, setAttendance] = useState<Record<string, Record<string, AttendanceStatus>>>({})
  const [unlinkedAttendees, setUnlinkedAttendees] = useState<Record<string, UnlinkedAttendee[]>>({})
  const [raidLoot, setRaidLoot] = useState<Record<string, RaidLootEntry[]>>({})
  const [raidSummaryCounts, setRaidSummaryCounts] = useState<Record<string, { attended: number; signedUp: number; loot: number }>>({})
  const [expandedRaids, setExpandedRaids] = useState<Set<string>>(new Set())
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [guildSettings, setGuildSettings] = useState<any>(null)
  const [showSkipModal, setShowSkipModal] = useState<{ raidId: string, date: string } | null>(null)
  const [skipReason, setSkipReason] = useState('')
  const [showImportModal, setShowImportModal] = useState<{ raidId: string, date: string, isEdit: boolean } | null>(null)
  const [showBonusModal, setShowBonusModal] = useState(false)
  const [bonusDate, setBonusDate] = useState('')
  const [bonusNotes, setBonusNotes] = useState('')
  const [creatingBonus, setCreatingBonus] = useState(false)

  // Unified import form state
  const [attendanceData, setAttendanceData] = useState('')
  const [lootData, setLootData] = useState('')
  const [signupsData, setSignupsData] = useState('')
  // Track initial values to detect changes
  const [initialAttendanceData, setInitialAttendanceData] = useState('')
  const [initialLootData, setInitialLootData] = useState('')
  const [initialSignupsData, setInitialSignupsData] = useState('')

  const [lootItems, setLootItems] = useState<LootItem[]>([])
  const [pendingLootImports, setPendingLootImports] = useState<{ date: string, itemId: number, characterName: string, matchedItem?: any, matchedCharacter?: any, needsItemSelection?: boolean }[]>([])
  const [showLootSelectionModal, setShowLootSelectionModal] = useState<{ index: number, itemId: number, characterName: string } | null>(null)
  const [lootSearchQuery, setLootSearchQuery] = useState('')
  const [characterAliases, setCharacterAliases] = useState<{ id: string; alias_name: string; character_id: string }[]>([])
  const [showAttendeeResolutionModal, setShowAttendeeResolutionModal] = useState<{ index: number; name: string } | null>(null)
  const [unmatchedAttendeeNames, setUnmatchedAttendeeNames] = useState<string[]>([])
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('')
  const [rememberAlias, setRememberAlias] = useState(true)
  const [resolvedAttendees, setResolvedAttendees] = useState<Map<string, { member: Member; remember: boolean }>>(new Map())
  const [pendingImportData, setPendingImportData] = useState<{ attendanceNames: string[]; signupNames: string[] } | null>(null)
  const [importing, setImporting] = useState(false)
  const [postingDiscord, setPostingDiscord] = useState<string | null>(null)
  const [linkingWcl, setLinkingWcl] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'tracking' | 'history'>('tracking')

  // Reassign loot modal state
  const [reassignModal, setReassignModal] = useState<{
    raidId: string
    lootEntries: RaidLootEntry[]
    currentMember: Member
  } | null>(null)

  // For legacy compatibility
  const [importData, setImportData] = useState('')
  const [importType, setImportType] = useState<'attendance' | 'loot' | 'signup'>('attendance')

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, hasPermission, loading: guildLoading, currentExpansion, user } = useGuildContext()
  const { showNotification } = useNotification()
  const { confirm, ConfirmDialog } = useConfirm()
  const { activeTeamId, activeTeam, teams, hasTeams, setTeam } = useRaidTeam()

  useEffect(() => {
    document.title = activeTab === 'tracking' ? 'LootList+ • Raid Tracking' : 'LootList+ • Loot History'
  }, [activeTab])

  useEffect(() => {
    if (activeGuild?.id) trackClientEvent('admin_raid_tracking_viewed', { guild_id: activeGuild.id })
  }, [activeGuild?.id])

  // Populate form when opening edit modal - pre-fill attendance and loot from saved data
  useEffect(() => {
    if (showImportModal?.isEdit) {
      const raidId = showImportModal.raidId
      const raidDate = showImportModal.date

      // Pre-fill attendance from saved attendance records
      const raidAttendance = attendance[raidId]
      if (raidAttendance) {
        const attendedNames: string[] = []
        Object.entries(raidAttendance).forEach(([characterId, status]) => {
          if (status.attended) {
            const member = members.find(m => m.character_id === characterId)
            if (member) attendedNames.push(member.character_name)
          }
        })
        // Also include unlinked attendees
        const unlinked = unlinkedAttendees[raidId] || []
        unlinked.forEach(u => {
          if (u.status?.attended && u.character_name) attendedNames.push(u.character_name)
        })
        const attendanceStr = attendedNames.join('\n')
        setAttendanceData(attendanceStr)
        setInitialAttendanceData(attendanceStr)
      } else {
        setAttendanceData('')
        setInitialAttendanceData('')
      }

      // Pre-fill signups from saved attendance records (signed_up flag)
      if (raidAttendance) {
        const signedUpNames: string[] = []
        Object.entries(raidAttendance).forEach(([characterId, status]) => {
          if (status.signed_up) {
            const member = members.find(m => m.character_id === characterId)
            if (member) signedUpNames.push(member.character_name)
          }
        })
        const unlinked = unlinkedAttendees[raidId] || []
        unlinked.forEach(u => {
          if (u.status?.signed_up && u.character_name) signedUpNames.push(u.character_name)
        })
        const signupsStr = signedUpNames.join('\n')
        setSignupsData(signupsStr)
        setInitialSignupsData(signupsStr)
      } else {
        setSignupsData('')
        setInitialSignupsData('')
      }

      // Pre-fill loot so users can see existing data
      const lootEntries = raidLoot[raidId] || []
      const formattedDate = raidDate.replace(/-/g, '/').split('/').reverse().join('/')
      const lootLines = lootEntries.map(entry =>
        `${formattedDate};[${entry.item_wowhead_id}];${entry.character_name}`
      )
      const lootStr = lootLines.join('\n')
      setLootData(lootStr)
      setInitialLootData(lootStr)
    }
  }, [showImportModal, raidLoot, attendance, unlinkedAttendees, members])

  useEffect(() => {
    if (guildLoading) return

    const loadData = async () => {
      if (!hasPermission('manage_attendance')) {
        router.push('/overview')
        return
      }

      if (!activeGuild || !currentExpansion) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // Load guild settings (with cache busting)
        const response = await fetch(`/api/guild-settings?guild_id=${activeGuild.id}&t=${Date.now()}`, {
          cache: 'no-store'
        })
        let settings: any = null
        if (response.ok) {
          const data = await response.json()
          settings = data.settings
          setGuildSettings(settings)
        }

        // Build raider list from guild memberships (all active members).
        // Previously this used approved loot submissions, which meant characters
        // without an approved list were invisible in raid tracking.
        const membersResponse = await fetch(`/api/guild-members?guild_id=${activeGuild.id}`)
        const membersResult = membersResponse.ok ? await membersResponse.json() : null

        if (membersResult?.members && membersResult.members.length > 0) {
          const formattedMembers: Member[] = []
          for (const member of membersResult.members) {
            for (const char of member.characters || []) {
              formattedMembers.push({
                character_id: char.id,
                user_id: member.user_id,
                character_name: char.name || 'Unknown',
                class_name: char.class?.name || 'Unknown',
                class_color: char.class?.color_hex || '#888888',
                role: member.role || 'Member'
              })
            }
          }

          // Filter roster to team members when a team is selected
          let filteredMembers = formattedMembers
          if (activeTeamId) {
            const { data: teamMembers } = await supabase
              .from('raid_team_members')
              .select('character_id')
              .eq('raid_team_id', activeTeamId)
            if (teamMembers) {
              const teamCharIds = new Set(teamMembers.map((m: { character_id: string }) => m.character_id))
              filteredMembers = formattedMembers.filter(m => teamCharIds.has(m.character_id))
            }
          }

          filteredMembers.sort((a: Member, b: Member) => a.character_name.localeCompare(b.character_name))
          setMembers(filteredMembers)
        }

        // Load character aliases for this guild
        const { data: aliasData } = await supabase
          .from('character_aliases')
          .select('id, alias_name, character_id')
          .eq('guild_id', activeGuild.id)

        if (aliasData) {
          setCharacterAliases(aliasData)
        }

        // Auto-link any unlinked attendance records that now match guild members.
        // Awaited so linking completes before loadRaidAttendance reads records.
        await fetch('/api/attendance/auto-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guild_id: activeGuild.id })
        }).catch(() => {}) // Silently ignore — filtering fix in loadRaidAttendance handles display

        // Generate and load raid dates
        if (settings) {
          await generateRaidDates(activeGuild.id, settings, currentExpansion)
        }
      } catch (error) {
        console.error('Error loading raid tracking data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData().catch(console.error)
  }, [guildLoading, activeGuild, hasPermission, currentExpansion, activeTeamId])

  const generateRaidDates = async (guildId: string, settings: any, expansion: any) => {
    // Use expansion raid schedule if available, fall back to guild settings for backwards compatibility
    const raidScheduleSource = expansion?.raid_days_per_week != null ? expansion : settings
    const { raid_days_per_week, first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day } = raidScheduleSource

    const baseRaidDays = [first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day]
      .filter(day => day !== null && day !== undefined)
      .slice(0, raid_days_per_week)
    // Apply team raid day overrides if a team is selected
    const raidDays = activeTeam?.raid_days_override
      ? resolveRaidDays({
          raid_days_per_week: raid_days_per_week || 2,
          first_raid_day: first_raid_day ?? null,
          second_raid_day: second_raid_day ?? null,
          third_raid_day: third_raid_day ?? null,
          fourth_raid_day: fourth_raid_day ?? null,
          fifth_raid_day: fifth_raid_day ?? null,
        }, activeTeam.raid_days_override)
      : baseRaidDays

    // Generate dates: from expansion raid_start_date to today only
    const dates: string[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalize to start of day

    // Use expansion raid_start_date, fall back to guild creation date
    const startDate = expansion?.raid_start_date
      ? parseDate(expansion.raid_start_date)
      : activeGuild?.created_at
        ? new Date(activeGuild.created_at)
        : new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000))

    let currentDate = new Date(startDate)
    currentDate.setHours(0, 0, 0, 0) // Normalize to start of day
    while (currentDate <= today) {
      const dateStr = toDateString(currentDate)
      if (isDateScheduled(dateStr, currentDate.getDay(), raidDays, activeTeam?.schedule_history ?? null)) {
        dates.push(dateStr)
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Ensure raid events exist for all scheduled dates (server-side, bypasses RLS)
    // This single API call checks existing events, looks up the tier, creates missing
    // events, and returns all events in the date range.
    let allEvents: any[] = []
    if (dates.length > 0) {
      try {
        const res = await fetch('/api/raid-events/ensure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guild_id: guildId,
            dates,
            expansion_id: expansion?.expansion_id,
            raid_team_id: activeTeamId || undefined,
          })
        })
        if (res.ok) {
          const result = await res.json()
          allEvents = result.events || []
        } else {
          const err = await res.json().catch(() => ({}))
          console.error('Failed to ensure raid events:', err)
        }
      } catch (e) {
        console.error('Failed to ensure raid events:', e)
      }
    }

    // Filter events by team when a team is selected
    if (activeTeamId) {
      allEvents = (allEvents || []).filter((e: any) => e.raid_team_id === activeTeamId)
    }

    // Check which events have attendance records (needed for filtering + dedup)
    const allEventIds = (allEvents || []).map((e: RaidEvent) => e.id)
    let eventsWithAttendance = new Set<string>()
    if (allEventIds.length > 0) {
      // Paginate to bypass the 1000-row PostgREST cap; otherwise events with
      // attendance silently disappear from the dedup/visibility check.
      const attendanceCheck = await paginatedSelect<{ raid_event_id: string }>((from, to) =>
        supabase
          .from('attendance_records')
          .select('raid_event_id')
          .in('raid_event_id', allEventIds)
          .order('id', { ascending: true })
          .range(from, to)
      )
      eventsWithAttendance = new Set(attendanceCheck.map((r) => r.raid_event_id))
    }

    // Filter events: show scheduled raid days only.
    // When a team is selected: strictly filter to team's raid days.
    // When "All teams": also include off-schedule events that have attendance data.
    // Bonus events (officer-created off-schedule raids) are always kept.
    const filteredEvents = (allEvents || []).filter((event: RaidEvent) => {
      if (event.is_bonus) return true
      const eventDate = parseDate(event.raid_date)
      if (activeTeamId) {
        return isDateScheduled(event.raid_date, eventDate.getDay(), raidDays, activeTeam?.schedule_history ?? null)
      }
      if (eventsWithAttendance.has(event.id)) return true
      return isDateScheduled(event.raid_date, eventDate.getDay(), raidDays, activeTeam?.schedule_history ?? null)
    })

    // Deduplicate by date - prefer events that already have attendance records
    let deduplicatedEvents = filteredEvents
    if (filteredEvents.length > 0) {
      const dateMap = new Map<string, typeof filteredEvents[0]>()
      filteredEvents.forEach((event: RaidEvent) => {
        const existing = dateMap.get(event.raid_date)
        if (!existing) {
          dateMap.set(event.raid_date, event)
        } else if (eventsWithAttendance.has(event.id) && !eventsWithAttendance.has(existing.id)) {
          // Prefer the event that has attendance records
          dateMap.set(event.raid_date, event)
        }
      })

      deduplicatedEvents = Array.from(dateMap.values())
        .sort((a, b) => b.raid_date.localeCompare(a.raid_date)) // Maintain DESC order

    }

    if (deduplicatedEvents && deduplicatedEvents.length > 0) {
      setRaidDates(deduplicatedEvents)

      // Batch-fetch summary counts for all raid headers (attended/signed-up/loot).
      // Paginate both reads — they easily exceed the 1000-row PostgREST cap on
      // active guilds (~30 events with ~30 records each already breaks 1000).
      const dedupEventIds = deduplicatedEvents.map((e: RaidEvent) => e.id)
      try {
        const [summaryRecords, lootCounts] = await Promise.all([
          paginatedSelect<{ raid_event_id: string; attended: boolean; signed_up: boolean }>(
            (from, to) =>
              supabase
                .from('attendance_records')
                .select('raid_event_id, attended, signed_up')
                .in('raid_event_id', dedupEventIds)
                .order('id', { ascending: true })
                .range(from, to)
          ),
          paginatedSelect<{ raid_event_id: string }>((from, to) =>
            supabase
              .from('loot_history')
              .select('raid_event_id')
              .in('raid_event_id', dedupEventIds)
              .order('id', { ascending: true })
              .range(from, to)
          ),
        ])

        const counts: Record<string, { attended: number; signedUp: number; loot: number }> = {}
        for (const id of dedupEventIds) {
          counts[id] = { attended: 0, signedUp: 0, loot: 0 }
        }
        for (const r of summaryRecords) {
          if (!counts[r.raid_event_id]) counts[r.raid_event_id] = { attended: 0, signedUp: 0, loot: 0 }
          if (r.attended) counts[r.raid_event_id].attended++
          if (r.signed_up) counts[r.raid_event_id].signedUp++
        }
        for (const r of lootCounts) {
          if (counts[r.raid_event_id]) counts[r.raid_event_id].loot++
        }
        setRaidSummaryCounts(counts)
      } catch {
        // Not critical - headers will show 0 until expanded
      }

      // Auto-expand the two most recent weeks (covers "this week + last week")
      const effectiveFirstRaidDay = raidScheduleSource.first_raid_day ?? 0
      const topWeekStarts: string[] = []
      for (const event of deduplicatedEvents) {
        const ws = getWeekStart(event.raid_date, effectiveFirstRaidDay)
        if (!topWeekStarts.includes(ws)) {
          topWeekStarts.push(ws)
          if (topWeekStarts.length === 2) break
        }
      }
      const mostRecentWeekStart = topWeekStarts[0]
      setExpandedWeeks(new Set(topWeekStarts))

      // Auto-expand the first raid day in the most recent week (earliest date in that week)
      const raidsInMostRecentWeek = deduplicatedEvents.filter((r: RaidEvent) =>
        getWeekStart(r.raid_date, effectiveFirstRaidDay) === mostRecentWeekStart
      )
      // Sort by date ascending to get the earliest raid in the week
      raidsInMostRecentWeek.sort((a: RaidEvent, b: RaidEvent) => a.raid_date.localeCompare(b.raid_date))
      const firstRaidInWeek = raidsInMostRecentWeek[0]

      setExpandedRaids(new Set([firstRaidInWeek.id]))
      await loadRaidAttendance(firstRaidInWeek.id)
    }
  }

  const getWeekStart = (dateString: string, firstRaidDay: number) => {
    const date = parseDate(dateString)
    const currentDay = date.getDay()

    // Calculate how many days to subtract to get to the first raid day of this week
    let daysToSubtract = (currentDay - firstRaidDay + 7) % 7

    const weekStart = new Date(date)
    weekStart.setDate(weekStart.getDate() - daysToSubtract)
    return toDateString(weekStart)
  }

  const loadRaidAttendance = async (raidId: string) => {
    // Load attendance records
    const { data: records } = await supabase
      .from('attendance_records')
      .select('character_id, character_name, signed_up, attended, no_call_no_show, was_late, was_benched, is_excused')
      .eq('raid_event_id', raidId)

    const attendanceMap: Record<string, AttendanceStatus> = {}
    const unlinked: UnlinkedAttendee[] = []

    // Build set of character_ids that have linked records in THIS raid
    const linkedCharIdsInRaid = new Set(
      records?.filter((r: any) => r.character_id).map((r: any) => r.character_id)
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    records?.forEach((r: any) => {
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
        // Unlinked attendee - only skip if a linked record for this member already exists
        // in this raid (prevents duplicates when both linked and unlinked records exist)
        const matchedMember = members.find(
          m => m.character_name.toLowerCase() === r.character_name.toLowerCase()
        )
        if (!matchedMember || !linkedCharIdsInRaid.has(matchedMember.character_id)) {
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
      }
    })

    setAttendance(prev => ({ ...prev, [raidId]: attendanceMap }))
    setUnlinkedAttendees(prev => ({ ...prev, [raidId]: unlinked }))

    // Load loot history for this raid event
    try {
      // First query: get loot records with item info (no character join to avoid null FK issues)
      const { data: lootRecords, error: lootError } = await supabase
        .from('loot_history')
        .select(`
          id,
          awarded_date,
          character_name,
          character_id,
          loot_items (
            name,
            wowhead_id
          )
        `)
        .eq('raid_event_id', raidId)
        .order('awarded_date', { ascending: false })

      if (!lootError && lootRecords) {
        // Get character IDs that are not null
        const characterIds = lootRecords
          .map((r: { character_id: string | null }) => r.character_id)
          .filter((id: string | null): id is string => id !== null)

        // Fetch character info separately if there are linked characters
        let characterMap: Record<string, { name: string, color_hex: string }> = {}
        if (characterIds.length > 0) {
          const { data: characters } = await supabase
            .from('characters')
            .select('id, name, wow_classes(color_hex)')
            .in('id', characterIds)

          if (characters) {
            characters.forEach((char: any) => {
              characterMap[char.id] = {
                name: char.name,
                color_hex: char.wow_classes?.color_hex || '#888888'
              }
            })
          }
        }

        const lootEntries: RaidLootEntry[] = lootRecords.map((r: any) => {
          const charInfo = r.character_id ? characterMap[r.character_id] : null
          return {
            id: r.id,
            // Use linked character name, or fall back to unlinked character_name
            character_name: charInfo?.name || r.character_name || 'Unknown',
            character_class_color: charInfo?.color_hex || '#888888',
            item_name: r.loot_items?.name || 'Unknown Item',
            item_wowhead_id: r.loot_items?.wowhead_id || 0,
            awarded_date: r.awarded_date
          }
        })
        setRaidLoot(prev => ({ ...prev, [raidId]: lootEntries }))
      } else {
        setRaidLoot(prev => ({ ...prev, [raidId]: [] }))
      }
    } catch (e) {
      console.error('Loot history loading exception:', e)
      showNotification('error', 'Couldn\'t load loot history for this raid. Try again.')
      setRaidLoot(prev => ({ ...prev, [raidId]: [] }))
    }
  }

  const toggleRaidExpanded = useCallback(async (raidId: string) => {
    setExpandedRaids(prev => {
      const next = new Set(prev)
      if (next.has(raidId)) {
        next.delete(raidId)
      } else {
        next.add(raidId)
      }
      return next
    })

    // Load attendance if not already loaded
    if (!attendance[raidId]) {
      await loadRaidAttendance(raidId)
    }
  }, [attendance, loadRaidAttendance])

  const setAttendanceStatus = async (raidId: string, characterId: string, userId: string, state: CellState) => {
    const current = attendance[raidId]?.[characterId]
    const preserveSignedUp = current?.signed_up || false

    let newStatus: AttendanceStatus
    switch (state) {
      case 'attended':
        newStatus = { signed_up: preserveSignedUp, attended: true, no_call_no_show: false, was_late: false, was_benched: false, is_excused: false }
        break
      case 'late':
        newStatus = { signed_up: preserveSignedUp, attended: true, no_call_no_show: false, was_late: true, was_benched: false, is_excused: false }
        break
      case 'standby':
        newStatus = { signed_up: preserveSignedUp, attended: false, no_call_no_show: false, was_late: false, was_benched: true, is_excused: false }
        break
      case 'no-show':
        newStatus = { signed_up: preserveSignedUp, attended: false, no_call_no_show: true, was_late: false, was_benched: false, is_excused: false }
        break
      case 'excused':
        newStatus = { signed_up: preserveSignedUp, attended: false, no_call_no_show: false, was_late: false, was_benched: false, is_excused: true }
        break
      case 'empty':
      default:
        newStatus = { signed_up: preserveSignedUp, attended: false, no_call_no_show: false, was_late: false, was_benched: false, is_excused: false }
        break
    }

    // Optimistic update
    setAttendance(prev => ({
      ...prev,
      [raidId]: {
        ...(prev[raidId] || {}),
        [characterId]: newStatus
      }
    }))

    // Save to database via API (bypasses RLS)
    const payload = {
      raid_event_id: raidId,
      character_id: characterId,
      user_id: userId,
      ...newStatus
    }
    const res = await fetch('/api/attendance/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guild_id: activeGuild?.id,
        action: 'upsert',
        records: [payload],
        onConflict: 'raid_event_id,character_id'
      })
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      console.error('Failed to save attendance:', errBody)
      showNotification('error', errBody.error || 'Couldn\'t save attendance. Try again.')
      await loadRaidAttendance(raidId)
    }
  }

  const cycleStatus = (raidId: string, characterId: string, userId: string) => {
    const current = attendance[raidId]?.[characterId]
    const currentState = getCellState(current)
    const cycle: CellState[] = ['empty', 'attended', 'late', 'standby', 'no-show', 'excused']
    const currentIdx = cycle.indexOf(currentState)
    const nextState = cycle[(currentIdx + 1) % cycle.length]
    setAttendanceStatus(raidId, characterId, userId, nextState)
  }

  const markAllAttended = async (raidId: string, raidMembers: Member[]) => {
    for (const member of raidMembers) {
      const state = getCellState(attendance[raidId]?.[member.character_id])
      if (state === 'empty') {
        await setAttendanceStatus(raidId, member.character_id, member.user_id, 'attended')
      }
    }
  }

  const toggleSignup = async (raidId: string, characterId: string, userId: string) => {
    const current = attendance[raidId]?.[characterId]
    const newSignedUp = !current?.signed_up

    // Optimistic update
    setAttendance(prev => ({
      ...prev,
      [raidId]: {
        ...(prev[raidId] || {}),
        [characterId]: {
          signed_up: newSignedUp,
          attended: current?.attended || false,
          no_call_no_show: current?.no_call_no_show || false,
          was_late: current?.was_late || false,
          was_benched: current?.was_benched || false
        }
      }
    }))

    // Save to database via API (bypasses RLS)
    const res = await fetch('/api/attendance/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guild_id: activeGuild?.id,
        action: 'upsert',
        records: [{
          raid_event_id: raidId,
          character_id: characterId,
          user_id: userId,
          signed_up: newSignedUp,
          attended: current?.attended || false,
          no_call_no_show: current?.no_call_no_show || false,
          was_late: current?.was_late || false,
          was_benched: current?.was_benched || false
        }],
        onConflict: 'raid_event_id,character_id'
      })
    })

    if (!res.ok) {
      console.error('Failed to toggle signup')
      showNotification('error', 'Couldn\'t save signup status. Try again.')
      await loadRaidAttendance(raidId)
    }
  }

  const removeFromAttendance = (raidId: string, characterId: string) => {
    confirm({
      title: 'Remove from raid',
      description: 'Remove this character from attendance tracking for this raid?',
      confirmLabel: 'Remove',
      variant: 'danger',
      onConfirm: async () => {
        const res = await fetch('/api/attendance/bulk', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guild_id: activeGuild?.id, raid_event_id: raidId, character_id: characterId })
        })

        if (!res.ok) {
          console.error('Failed to remove from raid')
          showNotification('error', 'Couldn\'t remove from raid. Try again.')
          return
        }

        // Update local state
        setAttendance(prev => {
          const newState = { ...prev }
          if (newState[raidId]) {
            const raidAttendance = { ...newState[raidId] }
            delete raidAttendance[characterId]
            newState[raidId] = raidAttendance
          }
          return newState
        })

        showNotification('success', 'Removed from raid')
      }
    })
  }

  const reassignLoot = async (lootId: string, newCharacterId: string, newCharacterName: string) => {
    if (!reassignModal) return

    const res = await fetch('/api/loot-history/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guild_id: activeGuild?.id,
        id: lootId,
        updates: {
          character_id: newCharacterId,
          character_name: null,
          notes: `Reassigned from ${reassignModal.currentMember.character_name}`
        }
      })
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      console.error('Failed to reassign loot:', errBody)
      showNotification('error', errBody.error || 'Couldn\'t reassign loot. Try again.')
      return
    }

    // Reload loot for this raid
    await loadRaidAttendance(reassignModal.raidId)
    setReassignModal(null)
    showNotification('success', `Loot reassigned to ${newCharacterName}`)
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

  const openBonusModal = () => {
    setBonusDate(toDateString(new Date()))
    setBonusNotes('')
    setShowBonusModal(true)
  }

  const submitBonusRaidDay = async () => {
    if (!activeGuild || !currentExpansion || !bonusDate || creatingBonus) return
    setCreatingBonus(true)
    try {
      const res = await fetch('/api/raid-events/bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_id: activeGuild.id,
          expansion_id: currentExpansion.expansion_id,
          raid_date: bonusDate,
          raid_team_id: activeTeamId || null,
          notes: bonusNotes.trim() || null,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        showNotification('error', body.error || "Couldn't add bonus raid day. Try again.")
        return
      }
      const newEvent = body.event as RaidEvent
      setRaidDates(prev => {
        if (prev.some(r => r.id === newEvent.id)) return prev
        return [newEvent, ...prev].sort((a, b) => b.raid_date.localeCompare(a.raid_date))
      })
      // Auto-expand the week containing the new event so officers can see it
      const firstRaidDayForExpand = currentExpansion?.first_raid_day ?? guildSettings?.first_raid_day ?? 0
      const weekStart = getWeekStart(newEvent.raid_date, firstRaidDayForExpand)
      setExpandedWeeks(prev => new Set(prev).add(weekStart))
      showNotification('success', 'Bonus raid day added')
      setShowBonusModal(false)
    } catch (err) {
      showNotification('error', err instanceof Error ? err.message : "Couldn't add bonus raid day. Try again.")
    } finally {
      setCreatingBonus(false)
    }
  }

  const handlePostToDiscord = async (raidId: string) => {
    if (!activeGuild || postingDiscord) return
    setPostingDiscord(raidId)
    try {
      const response = await fetch('/api/discord/post-raid-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: activeGuild.id, raid_event_id: raidId }),
      })
      const data = await response.json()
      if (!response.ok) {
        showNotification('error', data.error || 'Couldn\'t post to Discord. Try again.')
        return
      }
      showNotification('success', 'Raid summary posted to Discord. Your raiders can see it.')
    } catch {
      showNotification('error', 'Couldn\'t post to Discord. Check your connection.')
    } finally {
      setPostingDiscord(null)
    }
  }

  const handleLinkWcl = async (raidId: string) => {
    if (!activeGuild || linkingWcl) return
    setLinkingWcl(raidId)
    try {
      const response = await fetch('/api/wcl/link-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: activeGuild.id, raid_event_id: raidId }),
      })
      const data = await response.json()
      if (!response.ok) {
        showNotification('error', data.error || 'Couldn\'t link WCL report. Try again.')
        return
      }
      if (!data.linked) {
        showNotification('info', data.message || 'No matching report found for this date.')
        return
      }
      // Update local state with the report code
      setRaidDates(prev => prev.map(r =>
        r.id === raidId ? { ...r, wcl_report_code: data.report_code } : r
      ))
      showNotification('success', 'Warcraft Logs report linked.')
    } catch {
      showNotification('error', 'Couldn\'t link WCL report. Check your connection.')
    } finally {
      setLinkingWcl(null)
    }
  }

  const handleImportClick = async (raid: RaidEvent, hasImportedData: boolean) => {
    await loadLootItems()

    if (hasImportedData) {
      if (!attendance[raid.id]) {
        await loadRaidAttendance(raid.id)
      }
      setLootData('')
      setShowImportModal({ raidId: raid.id, date: raid.raid_date, isEdit: true })
    } else {
      setAttendanceData('')
      setLootData('')
      setSignupsData('')
      setInitialAttendanceData('')
      setInitialLootData('')
      setInitialSignupsData('')
      setShowImportModal({ raidId: raid.id, date: raid.raid_date, isEdit: false })
    }
  }

  const deleteLootEntry = (lootId: string, raidId: string) => {
    confirm({
      title: 'Remove loot entry',
      description: 'Are you sure you want to remove this loot entry? This will restore the item to the master sheet.',
      confirmLabel: 'Remove',
      variant: 'danger',
      onConfirm: async () => {
        const res = await fetch('/api/loot-history/bulk', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guild_id: activeGuild?.id, ids: [lootId] })
        })

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          showNotification('error', errBody.error || 'Couldn\'t delete loot entry. Try again.')
          return
        }

        // Update local state
        setRaidLoot(prev => ({
          ...prev,
          [raidId]: prev[raidId]?.filter(l => l.id !== lootId) || []
        }))
      }
    })
  }

  const importSignups = async () => {
    if (!showImportModal || !activeGuild) return

    // Parse names - support both comma-separated and newline-separated formats
    const names = importData
      .trim()
      .split(/[\n,]+/)  // Split by newlines OR commas
      .map(name => name.trim())
      .filter(name => name.length > 0)

    const linkedUpdates: any[] = []
    const unlinkedUpdates: any[] = []
    let matchedCount = 0
    let unmatchedCount = 0
    const seenCharIds = new Set<string>()
    const seenNames = new Set<string>()

    names.forEach(name => {
      const member = members.find(m =>
        m.character_name.toLowerCase() === name.toLowerCase()
      )

      if (member) {
        if (seenCharIds.has(member.character_id)) return
        seenCharIds.add(member.character_id)
        matchedCount++
        linkedUpdates.push({
          raid_event_id: showImportModal.raidId,
          character_id: member.character_id,
          user_id: member.user_id,
          signed_up: importType === 'signup',
          attended: importType === 'attendance',
          no_call_no_show: false,
          was_late: false,
          was_benched: false
        })
      } else {
        const nameLower = name.toLowerCase()
        if (seenNames.has(nameLower)) return
        seenNames.add(nameLower)
        unmatchedCount++
        unlinkedUpdates.push({
          raid_event_id: showImportModal.raidId,
          character_name: name,
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
      await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_id: activeGuild.id,
          action: 'upsert',
          records: linkedUpdates,
          onConflict: 'raid_event_id,character_id'
        })
      })
    }

    // Insert unlinked records (without character_id, will need different conflict handling)
    if (unlinkedUpdates.length > 0) {
      // First, delete any existing unlinked records with the same character_name for this raid
      await fetch('/api/attendance/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_id: activeGuild.id,
          raid_event_id: showImportModal.raidId,
          character_id_is_null: true,
          character_names: unlinkedUpdates.map((u: any) => u.character_name)
        })
      })

      // Then insert the new unlinked records
      await fetch('/api/attendance/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_id: activeGuild.id,
          action: 'insert',
          records: unlinkedUpdates
        })
      })
    }

    await loadRaidAttendance(showImportModal.raidId)
    setShowImportModal(null)
    setImportData('')
    setImportType('signup')

    const typeLabel = importType === 'signup' ? 'signups' : 'attendance'
    if (matchedCount > 0 || unmatchedCount > 0) {
      showNotification('success', `Import complete: ${matchedCount} matched ${typeLabel}, ${unmatchedCount} unmatched`)
    } else {
      showNotification('warning', 'No data to import')
    }
  }

  // Load all loot items for the current expansion
  // Returns the items array so callers can use it immediately (since setState is async)
  const loadLootItems = async (): Promise<typeof lootItems> => {
    if (!activeGuild || !currentExpansion) {
      return []
    }

    // Get all raid tiers for this expansion
    const { data: tiers } = await supabase
      .from('raid_tiers')
      .select('id')
      .eq('expansion_id', currentExpansion.expansion_id)

    if (!tiers || tiers.length === 0) return []

    const tierIds = tiers.map((t: { id: string }) => t.id)

    // Get all loot items for these tiers
    const { data: items } = await supabase
      .from('loot_items')
      .select('id, name, wowhead_id, boss_name, raid_tier_id')
      .in('raid_tier_id', tierIds)
      .order('name')

    if (items) {
      setLootItems(items)
      return items
    }
    return []
  }

  // Preview functions to show match counts
  // Parse MRT/attendance data - handles formats like:
  // "21/01/2026 01:58:11 - Throne of Thunder6" (header - skipped)
  // "Alphafold    x" -> "Alphafold"
  // "Brewenjoyer    x" -> "Brewenjoyer"
  const parseMRTNames = (data: string): string[] => {
    return data
      .trim()
      .split(/[\n,;]+/)
      .map(entry => {
        const line = entry.trim()
        // Skip header lines (contain date pattern or " - ")
        if (line.match(/\d{2}\/\d{2}\/\d{4}/) || line.includes(' - ')) {
          return ''
        }
        // Strip the "x" marker and any surrounding whitespace
        // Handle formats: "Name    x", "Name"
        return line
          .replace(/\s+x\s*$/i, '')  // Remove trailing "x" with whitespace
          .trim()
      })
      .filter(name => name.length > 0 && name.length <= 50)
  }

  // Resolve a character name to a member via direct match or alias
  const resolveCharacterName = (name: string): Member | null => {
    const nameLower = name.toLowerCase()
    // Direct name match
    const direct = members.find(m => m.character_name.toLowerCase() === nameLower)
    if (direct) return direct
    // Alias match
    const alias = characterAliases.find(a => a.alias_name === nameLower)
    if (alias) {
      const aliasedMember = members.find(m => m.character_id === alias.character_id)
      if (aliasedMember) return aliasedMember
    }
    return null
  }

  const parseAttendancePreview = (data: string) => {
    if (!data.trim()) return { total: 0, matched: 0, aliasMatched: 0, unmatched: 0 }

    const names = parseMRTNames(data)

    let matched = 0
    let aliasMatched = 0
    let unmatched = 0

    names.forEach(name => {
      const nameLower = name.toLowerCase()
      const directMatch = members.find(m => m.character_name.toLowerCase() === nameLower)
      if (directMatch) {
        matched++
      } else {
        const alias = characterAliases.find(a => a.alias_name === nameLower)
        if (alias && members.find(m => m.character_id === alias.character_id)) {
          aliasMatched++
        } else {
          unmatched++
        }
      }
    })

    return { total: names.length, matched, aliasMatched, unmatched }
  }

  const parseLootPreview = (data: string) => {
    if (!data.trim()) return { total: 0, linked: 0, unlinked: 0, failed: 0, items: [] as string[] }

    const lines = data
      .trim()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    let linked = 0    // Item found, character is guild member
    let unlinked = 0  // Item found, character not in guild (will import as unlinked)
    let failed = 0    // Item not found in database
    const itemNames: string[] = []

    lines.forEach(line => {
      const parts = line.split(';')
      if (parts.length !== 3) {
        failed++
        return
      }

      const [, itemIdStr, characterName] = parts
      const itemIdMatch = itemIdStr.match(/\[(\d+)\]/)
      if (!itemIdMatch) {
        failed++
        return
      }

      const itemId = parseInt(itemIdMatch[1])
      const matchedItem = lootItems.find(item => item.wowhead_id === itemId)
      const charName = characterName.trim()

      if (matchedItem) {
        // Check if character is a guild member (direct or alias)
        const matchedCharacter = resolveCharacterName(charName)

        if (matchedCharacter) {
          linked++
          itemNames.push(`${charName} → ${matchedItem.name}`)
        } else {
          unlinked++
          itemNames.push(`${charName} → ${matchedItem.name} (unlinked)`)
        }
      } else {
        failed++
        itemNames.push(`${charName} → Item #${itemId} (not found)`)
      }
    })

    return { total: lines.length, linked, unlinked, failed, items: itemNames }
  }

  const parseSignupsPreview = (data: string) => {
    return parseAttendancePreview(data)
  }

  // Handle closing the import modal with confirmation if there's unsaved data
  const handleCloseImportModal = () => {
    const hasUnsavedData =
      (attendanceData.trim() && attendanceData !== initialAttendanceData) ||
      (lootData.trim() && lootData !== initialLootData) ||
      (signupsData.trim() && signupsData !== initialSignupsData)

    if (hasUnsavedData) {
      confirm({
        title: 'Discard import data?',
        description: 'Closing now will lose everything you\'ve entered. Nothing has been saved yet.',
        confirmLabel: 'Discard and close',
        cancelLabel: 'Keep editing',
        variant: 'warning',
        onConfirm: () => {
          setShowImportModal(null)
          setAttendanceData('')
          setLootData('')
          setSignupsData('')
        }
      })
      return
    }

    setShowImportModal(null)
    setAttendanceData('')
    setLootData('')
    setSignupsData('')
  }

  // Clear all saved attendance and loot data for a raid
  const clearRaidData = async () => {
    if (!showImportModal || !activeGuild) return

    const confirmed = window.confirm(
      'Are you sure you want to clear ALL attendance and loot data for this raid? This cannot be undone.'
    )
    if (!confirmed) return

    setImporting(true)

    try {
      // Delete all attendance records for this raid
      const attendanceRes = await fetch('/api/attendance/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: activeGuild.id, raid_event_id: showImportModal.raidId })
      })

      if (!attendanceRes.ok) {
        console.error('❌ Clear attendance error')
        showNotification('error', 'Couldn\'t clear attendance data. Try again.')
      }

      // Delete all loot history for this raid
      const lootRes = await fetch('/api/loot-history/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: activeGuild.id, raid_event_id: showImportModal.raidId })
      })

      if (!lootRes.ok) {
        console.error('❌ Clear loot error')
        showNotification('error', 'Couldn\'t clear loot data. Try again.')
      }

      // Clear local state
      setAttendance(prev => {
        const newState = { ...prev }
        delete newState[showImportModal.raidId]
        return newState
      })
      setUnlinkedAttendees(prev => {
        const newState = { ...prev }
        delete newState[showImportModal.raidId]
        return newState
      })
      setRaidLoot(prev => {
        const newState = { ...prev }
        delete newState[showImportModal.raidId]
        return newState
      })

      // Clear form fields
      setAttendanceData('')
      setLootData('')
      setSignupsData('')

      showNotification('success', 'Raid data cleared successfully')
    } catch (e) {
      console.error('❌ Clear raid data error:', e)
      showNotification('error', 'Couldn\'t clear raid data. Try again.')
    } finally {
      setImporting(false)
    }
  }

  // Resolve a name using direct match, alias, or manual resolution from the modal
  // Resolve with an explicit map to avoid stale React state
  const resolveNameForImport = (name: string, resolved?: Map<string, { member: Member; remember: boolean }>): Member | null => {
    const map = resolved ?? resolvedAttendees
    const entry = map.get(name.toLowerCase())
    if (entry) return entry.member
    return resolveCharacterName(name)
  }

  // Unified import function - detects unmatched names and shows resolution modal
  const importAllRaidData = async () => {
    if (!showImportModal || !activeGuild) return

    // Collect all names from attendance, signups, and loot
    const attendanceNames = attendanceData.trim() ? parseMRTNames(attendanceData) : []
    const signupNames = (guildSettings?.use_signups && signupsData.trim()) ? parseMRTNames(signupsData) : []

    // Also collect character names from loot data
    const lootCharNames: string[] = []
    if (lootData.trim()) {
      const lines = lootData.trim().split('\n').map(l => l.trim()).filter(l => l.length > 0)
      for (const line of lines) {
        const parts = line.split(';')
        if (parts.length === 3) lootCharNames.push(parts[2].trim())
      }
    }

    // Deduplicate all names and find truly unmatched ones
    const allNames = [...new Set([...attendanceNames, ...signupNames, ...lootCharNames])]
    const unmatched = allNames.filter(name => !resolveNameForImport(name))

    if (unmatched.length > 0) {
      // Store pending data and show resolution modal
      setPendingImportData({ attendanceNames, signupNames })
      setUnmatchedAttendeeNames(unmatched)
      setShowAttendeeResolutionModal({ index: 0, name: unmatched[0] })
      setAttendeeSearchQuery('')
      setRememberAlias(true)
      return
    }

    // No unmatched names, proceed directly
    await executeImport()
  }

  // Execute the actual import after all names are resolved
  // Accepts resolvedMap directly to avoid stale state from React batching
  const executeImport = async (resolvedMap?: Map<string, { member: Member; remember: boolean }>) => {
    if (!showImportModal || !activeGuild) return

    setImporting(true)

    const results = {
      attendance: { success: 0, failed: 0 },
      loot: { success: 0, failed: 0, errors: [] as string[] },
      signups: { success: 0, failed: 0 }
    }

    // Import Attendance — only if attendance data was actually provided AND
    // the user changed it from the pre-fill. In edit mode the text field is
    // pre-populated with only "attended" names, which excludes no-show /
    // benched / excused members. If we ran the import with unchanged
    // pre-fill data, those non-attended statuses would be deleted (the
    // import treats the paste as the authoritative list and removes
    // everyone else). Skipping unchanged data fixes the "loot-only edit
    // resets attendance" bug.
    const attendanceChanged = !showImportModal.isEdit || attendanceData !== initialAttendanceData
    if (attendanceData.trim() && attendanceChanged) {
      const names = parseMRTNames(attendanceData)
      const namesLower = names.map(n => n.toLowerCase())

      const linkedUpdates: any[] = []
      const unlinkedUpdates: any[] = []
      const linkedCharacterIds: string[] = []
      const seenCharacterIds = new Set<string>()
      const seenUnlinkedNames = new Set<string>()

      names.forEach(name => {
        const member = resolveNameForImport(name, resolvedMap)

        if (member) {
          // Deduplicate by character_id to prevent "ON CONFLICT DO UPDATE cannot affect a row a second time"
          // This can happen when both a character name and its alias appear in the attendance list
          if (seenCharacterIds.has(member.character_id)) return
          seenCharacterIds.add(member.character_id)
          linkedCharacterIds.push(member.character_id)
          linkedUpdates.push({
            raid_event_id: showImportModal.raidId,
            character_id: member.character_id,
            user_id: member.user_id,
            signed_up: guildSettings?.use_signups || false,
            attended: true,
            no_call_no_show: false,
            was_late: false,
            was_benched: false
          })
          results.attendance.success++
        } else {
          const nameLower = name.toLowerCase()
          if (seenUnlinkedNames.has(nameLower)) return
          seenUnlinkedNames.add(nameLower)
          unlinkedUpdates.push({
            raid_event_id: showImportModal.raidId,
            character_name: name,
            signed_up: guildSettings?.use_signups || false,
            attended: true,
            no_call_no_show: false,
            was_late: false,
            was_benched: false
          })
          results.attendance.failed++
        }
      })

      // When editing, first remove attendance for members not in the new list
      if (showImportModal.isEdit) {
        const { data: currentRecords } = await supabase
          .from('attendance_records')
          .select('id, character_id, character_name')
          .eq('raid_event_id', showImportModal.raidId)

        if (currentRecords) {
          type AttendanceRecord = { id: string; character_id: string | null; character_name: string | null }
          const linkedToRemove = currentRecords
            .filter((r: AttendanceRecord) => r.character_id && !linkedCharacterIds.includes(r.character_id))
            .map((r: AttendanceRecord) => r.id)

          const unlinkedToRemove = currentRecords
            .filter((r: AttendanceRecord) => !r.character_id && r.character_name && !namesLower.includes(r.character_name.toLowerCase()))
            .map((r: AttendanceRecord) => r.id)

          const idsToRemove = [...linkedToRemove, ...unlinkedToRemove]

          if (idsToRemove.length > 0) {
            await fetch('/api/attendance/bulk', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ guild_id: activeGuild.id, ids: idsToRemove })
            })
          }
        }
      }

      if (linkedUpdates.length > 0) {
        const attendanceRes = await fetch('/api/attendance/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guild_id: activeGuild.id,
            action: 'upsert',
            records: linkedUpdates,
            onConflict: 'raid_event_id,character_id'
          })
        })
        if (!attendanceRes.ok) {
          const err = await attendanceRes.json().catch(() => ({}))
          console.error('Attendance save failed:', err)
          showNotification('error', err.error || 'Failed to save attendance. Try again.')
        }
      }

      // For unlinked attendees, selectively delete stale records and upsert current ones.
      // Only delete unlinked records whose names are NOT in the new import data,
      // rather than nuking all unlinked records (which caused data loss when names
      // were filtered from the pre-fill due to matching a newly-linked member).
      const newUnlinkedNames = new Set(unlinkedUpdates.map(u => u.character_name?.toLowerCase()))
      type UnlinkedRecord = { id: string; character_name: string | null }
      const { data: existingUnlinked } = await supabase
        .from('attendance_records')
        .select('id, character_name')
        .eq('raid_event_id', showImportModal.raidId)
        .is('character_id', null)

      const staleIds = (existingUnlinked as UnlinkedRecord[] || [])
        .filter(r => r.character_name && !newUnlinkedNames.has(r.character_name.toLowerCase()))
        .map(r => r.id)

      if (staleIds.length > 0) {
        await fetch('/api/attendance/bulk', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guild_id: activeGuild.id, ids: staleIds })
        })
      }

      if (unlinkedUpdates.length > 0) {
        // Delete existing unlinked records that will be re-inserted (to avoid duplicates)
        const refreshIds = (existingUnlinked as UnlinkedRecord[] || [])
          .filter(r => r.character_name && newUnlinkedNames.has(r.character_name.toLowerCase()))
          .map(r => r.id)

        if (refreshIds.length > 0) {
          await fetch('/api/attendance/bulk', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guild_id: activeGuild.id, ids: refreshIds })
          })
        }

        await fetch('/api/attendance/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guild_id: activeGuild.id,
            action: 'insert',
            records: unlinkedUpdates
          })
        })
      }
    }

    // Import Signups (if enabled and data provided, and changed from pre-fill)
    const signupsChanged = !showImportModal.isEdit || signupsData !== initialSignupsData
    if (guildSettings?.use_signups && signupsData.trim() && signupsChanged) {
      const names = parseMRTNames(signupsData)
      const signupCharacterIds: string[] = []
      const unlinkedSignupNames: string[] = []

      for (const name of names) {
        const member = resolveNameForImport(name, resolvedMap)

        if (member) {
          signupCharacterIds.push(member.character_id)
          results.signups.success++
        } else {
          unlinkedSignupNames.push(name)
          results.signups.failed++
        }
      }

      // For unlinked signup names, update existing unlinked records (from attendance)
      // or insert new ones (signup-only names not in attendance data)
      for (const name of unlinkedSignupNames) {
        const { data: existing } = await supabase
          .from('attendance_records')
          .select('id')
          .eq('raid_event_id', showImportModal.raidId)
          .eq('character_name', name)
          .is('character_id', null)
          .limit(1)

        if (existing && existing.length > 0) {
          await fetch('/api/attendance/bulk', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              guild_id: activeGuild.id,
              updates: { signed_up: true },
              filters: { id: existing[0].id }
            })
          })
        } else {
          await fetch('/api/attendance/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              guild_id: activeGuild.id,
              action: 'insert',
              records: [{
                raid_event_id: showImportModal.raidId,
                character_name: name,
                signed_up: true,
                attended: false,
                no_call_no_show: false,
                was_late: false,
                was_benched: false
              }]
            })
          })
        }
      }

      if (signupCharacterIds.length > 0) {
        await fetch('/api/attendance/bulk', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guild_id: activeGuild.id,
            updates: { signed_up: true },
            filters: { raid_event_id: showImportModal.raidId, character_ids: signupCharacterIds }
          })
        })
      }
    }

    // Import Loot
    if (lootData.trim()) {
      let itemsToUse = lootItems
      if (itemsToUse.length === 0) {
        itemsToUse = await loadLootItems()
      }

      if (itemsToUse.length === 0) {
        results.loot.errors.push('Could not load loot items database. Please try again.')
        showNotification('error', 'Couldn\'t import loot. Items database not available.')
        setImporting(false)
        setShowImportModal(null)
        return
      }

      // Clear existing loot for this raid event before re-importing to prevent duplicates
      if (showImportModal.isEdit) {
        await fetch('/api/loot-history/bulk', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guild_id: activeGuild.id, raid_event_id: showImportModal.raidId })
        })
      }

      const lines = lootData
        .trim()
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)

      // Parse all lines first, collecting valid items for bulk insert
      const bulkItems: { loot_item_id: string; raid_tier_id: string; raid_event_id: string; awarded_date: string; character_id?: string; character_name?: string; notes?: string }[] = []
      const itemNameMap: Map<number, string> = new Map() // index -> charName for error mapping

      for (const line of lines) {
        const parts = line.split(';')
        if (parts.length !== 3) {
          results.loot.failed++
          results.loot.errors.push(`Invalid format: ${line}`)
          continue
        }

        const [, itemIdStr, characterName] = parts
        const itemIdMatch = itemIdStr.match(/\[(\d+)\]/)
        if (!itemIdMatch) {
          results.loot.failed++
          results.loot.errors.push(`Invalid item ID: ${itemIdStr}`)
          continue
        }

        const itemId = parseInt(itemIdMatch[1])
        const matchedItem = itemsToUse.find(item => item.wowhead_id === itemId)
        const matchedCharacter = resolveNameForImport(characterName.trim(), resolvedMap)

        if (!matchedItem) {
          results.loot.failed++
          const { data: directLookup } = await supabase
            .from('loot_items')
            .select('id, name, raid_tier_id')
            .eq('wowhead_id', itemId)
            .limit(1)

          if (directLookup && directLookup.length > 0) {
            results.loot.errors.push(`Item #${itemId} (${directLookup[0].name}) exists but not in current expansion`)
          } else {
            results.loot.errors.push(`Item #${itemId} not in database - may need to add to loot tables`)
          }
          continue
        }

        const charName = characterName.trim()
        const itemData: typeof bulkItems[number] = {
          loot_item_id: matchedItem.id,
          raid_tier_id: matchedItem.raid_tier_id,
          raid_event_id: showImportModal.raidId,
          awarded_date: showImportModal.date,
          character_name: charName,
          notes: 'Imported from Gargul',
        }
        if (matchedCharacter) {
          itemData.character_id = matchedCharacter.character_id
        }
        itemNameMap.set(bulkItems.length, charName)
        bulkItems.push(itemData)
      }

      // Bulk insert via API (bypasses RLS, verifies officer server-side)
      if (bulkItems.length > 0) {
        try {
          const res = await fetch('/api/loot-history/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ guild_id: activeGuild.id, items: bulkItems })
          })

          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}))
            results.loot.errors.push(errBody.error || 'Loot import failed. Check permissions.')
            results.loot.failed += bulkItems.length
          } else {
            const { results: bulkResults } = await res.json()
            for (const r of bulkResults) {
              if (r.success) {
                results.loot.success++
              } else {
                results.loot.failed++
                const charName = itemNameMap.get(r.index) || 'Unknown'
                if (r.error === 'duplicate') {
                  results.loot.errors.push(`${charName} already has that item`)
                } else {
                  results.loot.errors.push(`${charName}: ${r.error}`)
                }
              }
            }
          }
        } catch {
          results.loot.errors.push('Network error during loot import')
          results.loot.failed += bulkItems.length
        }
      }
    }

    // Save any aliases that were marked "remember"
    const mapToSave = resolvedMap ?? resolvedAttendees
    const aliasesToSave = Array.from(mapToSave.entries())
      .filter(([, v]) => v.remember)
      .map(([aliasName, v]) => ({ alias_name: aliasName, character_id: v.member.character_id }))

    if (aliasesToSave.length > 0 && activeGuild) {
      try {
        const res = await fetch('/api/character-aliases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guild_id: activeGuild.id, aliases: aliasesToSave })
        })
        if (res.ok) {
          const { aliases: savedAliases } = await res.json()
          if (savedAliases) {
            setCharacterAliases(prev => {
              const existing = new Map(prev.map(a => [a.alias_name, a]))
              for (const sa of savedAliases) {
                existing.set(sa.alias_name, sa)
              }
              return Array.from(existing.values())
            })
          }
        }
      } catch (e) {
        console.error('Failed to save aliases:', e)
      }
    }

    // Reload attendance data and update summary counts for this raid
    const importedRaidId = showImportModal.raidId
    await loadRaidAttendance(importedRaidId)

    // Refresh summary count for this raid so collapsed headers show correct numbers
    try {
      const [{ data: summaryRecords }, { data: lootRecords }] = await Promise.all([
        supabase
          .from('attendance_records')
          .select('raid_event_id, attended, signed_up')
          .eq('raid_event_id', importedRaidId),
        supabase
          .from('loot_history')
          .select('raid_event_id')
          .eq('raid_event_id', importedRaidId)
      ])
      const attended = summaryRecords?.filter((r: { attended: boolean }) => r.attended).length || 0
      const signedUp = summaryRecords?.filter((r: { signed_up: boolean }) => r.signed_up).length || 0
      const loot = lootRecords?.length || 0
      setRaidSummaryCounts(prev => ({ ...prev, [importedRaidId]: { attended, signedUp, loot } }))
    } catch {
      // Non-critical
    }

    setImporting(false)
    setShowImportModal(null)
    setAttendanceData('')
    setLootData('')
    setSignupsData('')

    // Clean up resolution state
    setResolvedAttendees(new Map())
    setPendingImportData(null)
    setUnmatchedAttendeeNames([])

    // Show results
    const parts: string[] = []

    if (attendanceData.trim()) {
      parts.push(`Attendance: ${results.attendance.success} matched${results.attendance.failed > 0 ? `, ${results.attendance.failed} unmatched` : ''}`)
    }

    if (lootData.trim()) {
      parts.push(`Loot: ${results.loot.success} recorded${results.loot.failed > 0 ? `, ${results.loot.failed} failed` : ''}`)
    }

    if (guildSettings?.use_signups && signupsData.trim()) {
      parts.push(`Signups: ${results.signups.success} matched${results.signups.failed > 0 ? `, ${results.signups.failed} unmatched` : ''}`)
    }

    const hasErrors = results.attendance.failed > 0 || results.loot.failed > 0 || results.signups.failed > 0
    showNotification(hasErrors ? 'warning' : 'success', `Import complete. ${parts.join(' | ')}`)
  }

  // Parse Gargul loot export format: DATE;[ITEM_ID];CHARACTER_NAME
  const parseLootImportData = () => {
    if (!showImportModal) return []

    const lines = lootData
      .trim()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)

    const raidDate = showImportModal.date // e.g., "2024-12-15"

    const parsed: typeof pendingLootImports = []

    lines.forEach((line, index) => {
      // Format: DATE;[ITEM_ID];CHARACTER_NAME
      // Example: 12/15/2024;[16859];Lukasdnmd
      const parts = line.split(';')
      if (parts.length !== 3) {
        console.warn(`Line ${index + 1}: Invalid format - expected DATE;[ITEM_ID];CHARACTER_NAME`)
        return
      }

      const [dateStr, itemIdStr, characterName] = parts

      // Parse item ID from brackets [16859] -> 16859
      const itemIdMatch = itemIdStr.match(/\[(\d+)\]/)
      if (!itemIdMatch) {
        console.warn(`Line ${index + 1}: Could not parse item ID from "${itemIdStr}"`)
        return
      }
      const itemId = parseInt(itemIdMatch[1])

      // Validate date matches raid day (optional warning)
      // Convert MM/DD/YYYY to YYYY-MM-DD for comparison
      const dateParts = dateStr.split('/')
      if (dateParts.length === 3) {
        const importDate = `${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`
        if (importDate !== raidDate) {
          console.warn(`Line ${index + 1}: Date mismatch - import date ${importDate} vs raid date ${raidDate}`)
        }
      }

      // Try to match item by wowhead_id
      const matchedItem = lootItems.find(item => item.wowhead_id === itemId)

      // Try to match character by name (direct + alias + resolved)
      const matchedCharacter = resolveNameForImport(characterName.trim())

      parsed.push({
        date: dateStr,
        itemId,
        characterName: characterName.trim(),
        matchedItem,
        matchedCharacter,
        needsItemSelection: !matchedItem
      })
    })

    return parsed
  }

  // Import loot to loot_history
  const importLoot = async () => {
    if (!showImportModal || !activeGuild) return

    setImporting(true)

    // Parse the data first
    const parsedData = parseLootImportData()

    // Check for unmatched items
    const unmatchedItems = parsedData.filter(p => p.needsItemSelection)
    if (unmatchedItems.length > 0) {
      setPendingLootImports(parsedData)
      setImporting(false)
      // Show selection modal for first unmatched item
      const firstUnmatched = unmatchedItems[0]
      const index = parsedData.findIndex(p => p === firstUnmatched)
      setShowLootSelectionModal({ index, itemId: firstUnmatched.itemId, characterName: firstUnmatched.characterName })
      return
    }

    // All items matched, proceed with import
    await processLootImport(parsedData)
  }

  // Process the actual loot import
  const processLootImport = async (parsedData: typeof pendingLootImports) => {
    if (!showImportModal || !activeGuild) return

    setImporting(true)

    // Clear existing loot for this raid event before re-importing
    // This prevents duplicates when re-importing updated loot data
    if (showImportModal.isEdit) {
      await fetch('/api/loot-history/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: activeGuild.id, raid_event_id: showImportModal.raidId })
      })
    }

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Collect valid items for bulk insert
    const bulkItems: { loot_item_id: string; raid_tier_id: string; raid_event_id: string; awarded_date: string; character_id?: string; character_name?: string; notes?: string }[] = []
    const entryMap: Map<number, typeof parsedData[number]> = new Map()

    for (const entry of parsedData) {
      if (!entry.matchedItem) {
        errorCount++
        errors.push(`${entry.characterName}: Item ID ${entry.itemId} not found`)
        continue
      }

      const characterId = entry.matchedCharacter?.character_id
      if (!characterId) {
        errorCount++
        errors.push(`${entry.characterName}: Character not found in guild`)
        continue
      }

      entryMap.set(bulkItems.length, entry)
      bulkItems.push({
        loot_item_id: entry.matchedItem.id,
        raid_tier_id: entry.matchedItem.raid_tier_id,
        raid_event_id: showImportModal.raidId,
        awarded_date: showImportModal.date,
        character_id: characterId,
        notes: `Imported from Gargul - Item ID: ${entry.itemId}`,
      })
    }

    if (bulkItems.length > 0) {
      try {
        const res = await fetch('/api/loot-history/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guild_id: activeGuild.id, items: bulkItems })
        })

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}))
          errors.push(errBody.error || 'Loot import failed. Check permissions.')
          errorCount += bulkItems.length
        } else {
          const { results: bulkResults } = await res.json()
          for (const r of bulkResults) {
            const entry = entryMap.get(r.index)
            if (r.success) {
              successCount++
              // BLP is now updated server-side in /api/loot-history/bulk
            } else {
              errorCount++
              const name = entry?.characterName || 'Unknown'
              if (r.error === 'duplicate') {
                errors.push(`${name}: Already received ${entry?.matchedItem?.name || 'that item'}`)
              } else {
                errors.push(`${name}: ${r.error}`)
              }
            }
          }
        }
      } catch {
        errors.push('Network error during loot import')
        errorCount += bulkItems.length
      }
    }

    setImporting(false)
    setPendingLootImports([])
    setShowImportModal(null)
    setImportData('')
    setImportType('attendance')

    if (successCount > 0) {
      trackClientEvent('loot_item_imported', {
        guild_id: activeGuild.id,
        item_count: successCount,
      })
    }

    // Show results
    showNotification(
      errorCount > 0 ? 'warning' : 'success',
      `Loot import complete. ${successCount} items recorded${errorCount > 0 ? `, ${errorCount} errors` : ''}`
    )
  }

  // Handle item selection for unmatched items
  const handleLootItemSelection = (selectedItem: typeof lootItems[0]) => {
    if (!showLootSelectionModal) return

    const updatedPending = [...pendingLootImports]
    updatedPending[showLootSelectionModal.index] = {
      ...updatedPending[showLootSelectionModal.index],
      matchedItem: selectedItem,
      needsItemSelection: false
    }
    setPendingLootImports(updatedPending)

    // Check if there are more unmatched items
    const nextUnmatched = updatedPending.findIndex((p, i) => i > showLootSelectionModal.index && p.needsItemSelection)
    if (nextUnmatched !== -1) {
      const next = updatedPending[nextUnmatched]
      setShowLootSelectionModal({ index: nextUnmatched, itemId: next.itemId, characterName: next.characterName })
      setLootSearchQuery('')
    } else {
      // All items matched, proceed with import
      setShowLootSelectionModal(null)
      setLootSearchQuery('')
      processLootImport(updatedPending)
    }
  }

  // Skip unmatched item
  const skipLootItemSelection = () => {
    if (!showLootSelectionModal) return

    const updatedPending = pendingLootImports.filter((_, i) => i !== showLootSelectionModal.index)
    setPendingLootImports(updatedPending)

    // Check if there are more unmatched items
    const nextUnmatched = updatedPending.findIndex(p => p.needsItemSelection)
    if (nextUnmatched !== -1) {
      const next = updatedPending[nextUnmatched]
      setShowLootSelectionModal({ index: nextUnmatched, itemId: next.itemId, characterName: next.characterName })
      setLootSearchQuery('')
    } else if (updatedPending.length > 0) {
      // All remaining items matched, proceed with import
      setShowLootSelectionModal(null)
      setLootSearchQuery('')
      processLootImport(updatedPending)
    } else {
      // No items left
      setShowLootSelectionModal(null)
      setLootSearchQuery('')
      setPendingLootImports([])
    }
  }

  // Attendee resolution modal handlers
  const handleAttendeeResolution = (member: Member) => {
    const currentName = showAttendeeResolutionModal?.name
    if (!currentName) return

    // Build new map synchronously so we can pass it to executeImport
    const newResolved = new Map(resolvedAttendees)
    newResolved.set(currentName.toLowerCase(), { member, remember: rememberAlias })
    setResolvedAttendees(newResolved)

    // Advance to next unmatched name
    const currentIndex = showAttendeeResolutionModal.index
    const nextIndex = currentIndex + 1
    if (nextIndex < unmatchedAttendeeNames.length) {
      setShowAttendeeResolutionModal({ index: nextIndex, name: unmatchedAttendeeNames[nextIndex] })
      setAttendeeSearchQuery('')
      setRememberAlias(true)
    } else {
      // All resolved - pass the map directly to avoid stale state
      setShowAttendeeResolutionModal(null)
      setAttendeeSearchQuery('')
      executeImport(newResolved)
    }
  }

  const skipAttendeeResolution = () => {
    if (!showAttendeeResolutionModal) return

    const currentIndex = showAttendeeResolutionModal.index
    const nextIndex = currentIndex + 1
    if (nextIndex < unmatchedAttendeeNames.length) {
      setShowAttendeeResolutionModal({ index: nextIndex, name: unmatchedAttendeeNames[nextIndex] })
      setAttendeeSearchQuery('')
      setRememberAlias(true)
    } else {
      setShowAttendeeResolutionModal(null)
      setAttendeeSearchQuery('')
      executeImport(resolvedAttendees)
    }
  }

  const skipAllAttendeeResolution = () => {
    setShowAttendeeResolutionModal(null)
    setAttendeeSearchQuery('')
    executeImport(resolvedAttendees)
  }

  const cancelAttendeeResolution = () => {
    setShowAttendeeResolutionModal(null)
    setAttendeeSearchQuery('')
    setResolvedAttendees(new Map())
    setPendingImportData(null)
    setUnmatchedAttendeeNames([])
  }

  // Simple string similarity: longest common substring ratio
  const nameSimilarity = (a: string, b: string): number => {
    const al = a.toLowerCase()
    const bl = b.toLowerCase()
    if (al === bl) return 1
    let longest = 0
    for (let i = 0; i < al.length; i++) {
      for (let j = 0; j < bl.length; j++) {
        let k = 0
        while (i + k < al.length && j + k < bl.length && al[i + k] === bl[j + k]) k++
        if (k > longest) longest = k
      }
    }
    return longest / Math.max(al.length, bl.length)
  }

  const getAttendanceCount = useCallback((raidId: string) => {
    // Use full attendance data if loaded, otherwise fall back to summary counts
    if (attendance[raidId]) {
      const linkedCount = Object.values(attendance[raidId]).filter(a => a.attended).length
      const unlinkedCount = (unlinkedAttendees[raidId] || []).filter(u => u.status.attended).length
      return linkedCount + unlinkedCount
    }
    return raidSummaryCounts[raidId]?.attended || 0
  }, [attendance, unlinkedAttendees, raidSummaryCounts])

  const getSignupCount = useCallback((raidId: string) => {
    if (attendance[raidId]) {
      const linkedCount = Object.values(attendance[raidId]).filter(a => a.signed_up).length
      const unlinkedCount = (unlinkedAttendees[raidId] || []).filter(u => u.status.signed_up).length
      return linkedCount + unlinkedCount
    }
    return raidSummaryCounts[raidId]?.signedUp || 0
  }, [attendance, unlinkedAttendees, raidSummaryCounts])

  const getLootCount = useCallback((raidId: string) => {
    if (raidLoot[raidId]) return raidLoot[raidId].length
    return raidSummaryCounts[raidId]?.loot || 0
  }, [raidLoot, raidSummaryCounts])

  // Group raids by week (prefer expansion schedule, fall back to guild settings)
  const firstRaidDay = currentExpansion?.first_raid_day ?? guildSettings?.first_raid_day ?? 0

  const toggleWeekExpanded = useCallback((weekStart: string) => {
    setExpandedWeeks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(weekStart)) {
        newSet.delete(weekStart)
      } else {
        newSet.add(weekStart)
      }
      return newSet
    })
  }, [])

  const todayWeekStart = useMemo(
    () => getWeekStart(toDateString(new Date()), firstRaidDay),
    [firstRaidDay]
  )

  const getWeekLabel = useCallback((weekStartDate: string) => {
    const start = parseDate(weekStartDate)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    const sameMonth =
      start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
    const startStr = start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    const endStr = sameMonth
      ? String(end.getDate())
      : end.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    const currentYear = new Date().getFullYear()
    const showYear =
      start.getFullYear() !== currentYear || end.getFullYear() !== currentYear
    return showYear ? `${startStr} – ${endStr}, ${end.getFullYear()}` : `${startStr} – ${endStr}`
  }, [])

  const getWeekRelativeTag = useCallback(
    (weekStartDate: string): 'this' | 'last' | null => {
      if (weekStartDate === todayWeekStart) return 'this'
      const prev = parseDate(todayWeekStart)
      prev.setDate(prev.getDate() - 7)
      if (toDateString(prev) === weekStartDate) return 'last'
      return null
    },
    [todayWeekStart]
  )

  // Memoize expensive raid grouping computation
  const { raidsByWeek, weekKeys } = useMemo(() => {
    const grouped = raidDates.reduce((acc, raid) => {
      const weekStart = getWeekStart(raid.raid_date, firstRaidDay)
      if (!acc[weekStart]) {
        acc[weekStart] = []
      }
      // Deduplicate: only add if this raid_date doesn't already exist in this week
      const alreadyExists = acc[weekStart].some(r => r.raid_date === raid.raid_date)
      if (!alreadyExists) {
        acc[weekStart].push(raid)
      }
      return acc
    }, {} as Record<string, RaidEvent[]>)

    // Sort raids within each week by date ascending (earliest first)
    Object.keys(grouped).forEach(weekStart => {
      grouped[weekStart].sort((a, b) => a.raid_date.localeCompare(b.raid_date))
    })

    const keys = Object.keys(grouped).sort((a, b) => b.localeCompare(a)) // Most recent first
    return { raidsByWeek: grouped, weekKeys: keys }
  }, [raidDates, firstRaidDay])

  // Compute upcoming raid dates (next week only) for the preview section
  const upcomingRaidDates = useMemo(() => {
    const raidScheduleSource = currentExpansion?.raid_days_per_week != null ? currentExpansion : guildSettings
    if (!raidScheduleSource) return []

    const { raid_days_per_week, first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day } = raidScheduleSource
    const configuredRaidDays = [first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day]
      .filter(day => day !== null && day !== undefined)
      .slice(0, raid_days_per_week)

    if (configuredRaidDays.length === 0) return []

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Find next 7 days of raid dates starting from tomorrow
    const upcoming: string[] = []
    const cursor = new Date(tomorrow)
    const limit = new Date(tomorrow)
    limit.setDate(limit.getDate() + 7)

    while (cursor < limit) {
      if (configuredRaidDays.includes(cursor.getDay())) {
        upcoming.push(toDateString(cursor))
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    // Filter out any dates that already exist in raidDates (already tracked)
    const existingDates = new Set(raidDates.map(r => r.raid_date))
    return upcoming.filter(d => !existingDates.has(d))
  }, [currentExpansion, guildSettings, raidDates])

  // Memoize import preview computations (run on every keystroke in the import modal)
  const attendancePreview = useMemo(() => {
    return attendanceData.trim() ? parseAttendancePreview(attendanceData) : null
  }, [attendanceData, members, characterAliases])

  const lootPreview = useMemo(() => {
    return lootData.trim() ? parseLootPreview(lootData) : null
  }, [lootData, lootItems, members, characterAliases])

  const signupsPreview = useMemo(() => {
    return signupsData.trim() ? parseSignupsPreview(signupsData) : null
  }, [signupsData, members, characterAliases])

  // Memoize loot item filtering for the selection modal (avoids re-filtering 1000+ items on every keystroke)
  const filteredLootItems = useMemo(() => {
    if (lootSearchQuery.length === 0) return lootItems
    const q = lootSearchQuery.toLowerCase()
    return lootItems.filter(item =>
      item.name.toLowerCase().includes(q) ||
      item.boss_name.toLowerCase().includes(q)
    )
  }, [lootItems, lootSearchQuery])

  // Memoize member filtering/sorting for the attendee resolution modal
  const filteredResolutionMembers = useMemo(() => {
    const searchTarget = showAttendeeResolutionModal?.name || ''
    const filtered = attendeeSearchQuery.length === 0
      ? members
      : members.filter(m =>
          m.character_name.toLowerCase().includes(attendeeSearchQuery.toLowerCase()) ||
          m.class_name.toLowerCase().includes(attendeeSearchQuery.toLowerCase())
        )
    if (attendeeSearchQuery.length > 0) return filtered.slice(0, 40)
    return [...filtered]
      .sort((a, b) => nameSimilarity(b.character_name, searchTarget) - nameSimilarity(a.character_name, searchTarget))
      .slice(0, 40)
  }, [members, attendeeSearchQuery, showAttendeeResolutionModal?.name])

  if (loading) {
    return <RaidTrackingPageSkeleton />
  }

  const today = toDateString(new Date())

  // Check if raid start date is in the future
  const raidStartDateInFuture = currentExpansion?.raid_start_date && currentExpansion.raid_start_date > today

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-poppins">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <Heading level={1}>Raid Tracking</Heading>
          <p className="text-muted-foreground mt-1 text-base">
            {activeTab === 'tracking' ? 'Manage attendance and signups for each raid day' : 'View loot distribution history'}
            {currentExpansion && (
              <span className="text-accent ml-2">• {currentExpansion.expansion_name}</span>
            )}
          </p>
        </div>

        {/* Team filter + Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {hasTeams && (
          <TeamSelector
            teams={teams}
            activeTeamId={activeTeamId}
            onTeamChange={setTeam}
            className="w-40"
          />
        )}
        {activeTab === 'tracking' && !raidStartDateInFuture && (
          <Button
            variant="outline"
            onClick={openBonusModal}
            className="self-start"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={16} />
            <span className="hidden sm:inline">Add bonus raid day</span>
            <span className="sm:hidden">Bonus day</span>
          </Button>
        )}
        <SegmentedControl
          options={[
            { value: 'tracking', label: 'Tracking' },
            { value: 'history', label: 'Loot history' }
          ]}
          value={activeTab}
          onChange={setActiveTab}
          className="self-start"
        />
        </div>
      </div>

      {/* Warning: no team selected in a team-enabled guild */}
      {hasTeams && !activeTeamId && activeTab === 'tracking' && (
        <Alert variant="warning">
          <AlertDescription>
            No team selected. New raid events will be unassigned. Select a team above to track team-specific attendance.
          </AlertDescription>
        </Alert>
      )}

      {/* Tracking Tab Content */}
      {activeTab === 'tracking' && (
        <>
      {/* Legend */}
      {!raidStartDateInFuture && (
        <div className="flex items-center gap-3 sm:gap-4 text-[12px] sm:text-[13px] flex-wrap">
          <span className="text-muted-foreground">Status:</span>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded bg-background-elevated border border-border border-l-2 border-l-success"></div>
            <span className="text-muted-foreground">Attended</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded bg-background-elevated border border-border border-l-2 border-l-warning"></div>
            <span className="text-muted-foreground">Late</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded bg-background-elevated border border-border border-l-2 border-l-orange-500"></div>
            <span className="text-muted-foreground">Standby</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded bg-background-elevated border border-border border-l-2 border-l-destructive"></div>
            <span className="text-muted-foreground">No show</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded bg-background-elevated border border-border border-l-2 border-l-muted-foreground"></div>
            <span className="text-muted-foreground">Excused</span>
          </div>
          {guildSettings?.use_signups && (
            <>
              <span className="text-border">|</span>
              <div className="flex items-center gap-1">
                <Checkbox checked disabled className="h-4 w-4 opacity-60" />
                <span className="text-muted-foreground">Signed Up</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Future Raid Start Message */}
      {raidStartDateInFuture && currentExpansion && (
        <div className="bg-background-elevated border border-border rounded-xl p-8 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-16 h-16 mx-auto bg-accent/20 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-[24px] font-bold text-foreground">{currentExpansion.expansion_name} raids haven't started yet</h3>
            <p className="text-muted-foreground text-[14px]">
              Your first raid week for <span className="text-accent">{currentExpansion.expansion_name}</span> is scheduled to begin on{' '}
              <span className="text-foreground font-medium">
                {parseDate(currentExpansion.raid_start_date || '2026-01-01').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </span>
            </p>
            <p className="text-foreground-muted text-[13px]">
              Once raids begin, you'll be able to track attendance, signups, and manage raid days here.
            </p>
          </div>
        </div>
      )}

      {/* Raid Days Grouped by Week */}
      {!raidStartDateInFuture && (
        <div className="space-y-6">

        {/* Upcoming Week Preview */}
        {upcomingRaidDates.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-[24px] font-bold text-muted-foreground">Coming up</h2>
              <div className="flex-1 h-[1px] bg-foreground/10"></div>
            </div>

            <div className="space-y-2">
              {upcomingRaidDates.map(dateStr => {
                const date = parseDate(dateStr)
                const formatted = date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })
                return (
                  <div key={dateStr} className="bg-background-elevated/50 border border-dashed border-border rounded-xl px-5 py-4">
                    <p className="text-[14px] text-muted-foreground">
                      <span className="font-medium text-foreground">{formatted}</span>
                      {' '}— available for tracking on the day
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {weekKeys.map((weekStart) => {
          const raids = raidsByWeek[weekStart]
          const isWeekExpanded = expandedWeeks.has(weekStart)
          const nonSkippedRaids = raids.filter((r) => !r.is_skipped)
          const weekAttended = nonSkippedRaids.reduce(
            (sum, r) => sum + getAttendanceCount(r.id),
            0
          )
          const weekLoot = nonSkippedRaids.reduce(
            (sum, r) => sum + getLootCount(r.id),
            0
          )

          return (
            <WeekGroup
              key={weekStart}
              weekStart={weekStart}
              label={getWeekLabel(weekStart)}
              relativeTag={getWeekRelativeTag(weekStart)}
              isExpanded={isWeekExpanded}
              raidCount={nonSkippedRaids.length}
              attendedCount={weekAttended}
              lootCount={weekLoot}
              onToggle={toggleWeekExpanded}
            >
              {raids.map((raid) => {
                const isExpanded = expandedRaids.has(raid.id)
                const attendedCount = getAttendanceCount(raid.id)
                const signupCount = getSignupCount(raid.id)
                const lootCount = getLootCount(raid.id)
                const hasImportedData = attendedCount > 0 || lootCount > 0

                return (
                  <RaidCard
                    key={raid.id}
                    raid={raid}
                    isExpanded={isExpanded}
                    isPast={raid.raid_date < today}
                    today={today}
                    hasImportedData={hasImportedData}
                    attendedCount={attendedCount}
                    signupCount={signupCount}
                    lootCount={lootCount}
                    members={members}
                    attendanceMap={attendance[raid.id]}
                    loot={raidLoot[raid.id]}
                    unlinkedAttendees={unlinkedAttendees[raid.id]}
                    useSignups={!!guildSettings?.use_signups}
                    canPostDiscord={!!guildSettings?.raid_summary_channel_id}
                    canLinkWcl={!!guildSettings?.wcl_guild_url && !raid.wcl_report_code}
                    isPostingDiscord={postingDiscord === raid.id}
                    isLinkingWcl={linkingWcl === raid.id}
                    onToggleExpanded={toggleRaidExpanded}
                    onImport={handleImportClick}
                    onPostToDiscord={handlePostToDiscord}
                    onLinkWcl={handleLinkWcl}
                    onSkipDay={toggleSkipDay}
                    onCycleStatus={cycleStatus}
                    onSetAttendanceStatus={setAttendanceStatus}
                    onToggleSignup={toggleSignup}
                    onRemoveFromAttendance={removeFromAttendance}
                    onMarkAllAttended={markAllAttended}
                    onOpenReassign={setReassignModal}
                    onDeleteLootEntry={deleteLootEntry}
                  />
                )
              })}
            </WeekGroup>
          )
        })}
        </div>
      )}
        </>
      )}

      {/* Loot History Tab Content */}
      {activeTab === 'history' && (
        <LootHistoryTab />
      )}

      <BonusRaidModal
        open={showBonusModal}
        date={bonusDate}
        notes={bonusNotes}
        maxDate={today}
        creating={creatingBonus}
        activeTeamId={activeTeamId}
        hasTeams={hasTeams}
        onDateChange={setBonusDate}
        onNotesChange={setBonusNotes}
        onCancel={() => setShowBonusModal(false)}
        onSubmit={submitBonusRaidDay}
      />

      <SkipDayModal
        open={!!showSkipModal}
        date={showSkipModal?.date ?? null}
        reason={skipReason}
        onReasonChange={setSkipReason}
        onCancel={() => setShowSkipModal(null)}
        onConfirm={confirmSkipDay}
      />

      <ImportModal
        target={showImportModal}
        attendanceData={attendanceData}
        lootData={lootData}
        signupsData={signupsData}
        initialAttendanceData={initialAttendanceData}
        initialLootData={initialLootData}
        initialSignupsData={initialSignupsData}
        attendancePreview={attendancePreview}
        lootPreview={lootPreview}
        signupsPreview={signupsPreview}
        importing={importing}
        useSignups={!!guildSettings?.use_signups}
        onAttendanceChange={setAttendanceData}
        onLootChange={setLootData}
        onSignupsChange={setSignupsData}
        onClose={handleCloseImportModal}
        onClearFields={() => {
          setAttendanceData('')
          setLootData('')
          setSignupsData('')
        }}
        onClearSavedData={clearRaidData}
        onImport={importAllRaidData}
      />

      <LootItemSelectionModal
        target={showLootSelectionModal}
        searchQuery={lootSearchQuery}
        filteredItems={filteredLootItems}
        onSearchQueryChange={setLootSearchQuery}
        onSelect={handleLootItemSelection}
        onSkip={skipLootItemSelection}
      />

      <AttendeeResolutionModal
        target={showAttendeeResolutionModal}
        totalUnmatched={unmatchedAttendeeNames.length}
        searchQuery={attendeeSearchQuery}
        filteredMembers={filteredResolutionMembers}
        rememberAlias={rememberAlias}
        onSearchQueryChange={setAttendeeSearchQuery}
        onResolve={handleAttendeeResolution}
        onSkip={skipAttendeeResolution}
        onSkipAll={skipAllAttendeeResolution}
        onCancel={cancelAttendeeResolution}
        onRememberAliasChange={setRememberAlias}
      />

      <ReassignLootModal
        target={reassignModal}
        members={members}
        onClose={() => setReassignModal(null)}
        onReassign={reassignLoot}
      />

      {ConfirmDialog}
    </div>
  )
}
