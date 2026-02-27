'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, ArrowUp01Icon, Upload01Icon, Cancel01Icon, MoreVerticalIcon, DiscordIcon } from '@hugeicons/core-free-icons'
import LootHistoryTab from './components/LootHistoryTab'
import { RaidTrackingPageSkeleton } from '@/components/ui/skeletons'
import { Heading } from '@/components/ui/typography'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import ItemLink from '@/app/components/ItemLink'
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
} from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useConfirm } from '@/components/ui/confirm-modal'
import { SegmentedControl } from '@/components/ui/segmented-control'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { Search01Icon } from '@hugeicons/core-free-icons'
import { trackClientEvent } from '@/utils/analytics/client'

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

interface RaidLootEntry {
  id: string
  character_name: string
  character_class_color: string
  item_name: string
  item_wowhead_id: number
  awarded_date: string
}

interface RaidEvent {
  id: string
  raid_date: string
  notes: string | null
  is_skipped: boolean
  skip_reason: string | null
  wcl_report_code: string | null
}

interface AttendanceStatus {
  signed_up: boolean
  attended: boolean
  no_call_no_show: boolean
  was_late: boolean
  was_benched: boolean
}

type CellState = 'attended' | 'late' | 'standby' | 'no-show' | 'empty'

export default function RaidTrackingPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [raidDates, setRaidDates] = useState<RaidEvent[]>([])
  const [attendance, setAttendance] = useState<Record<string, Record<string, AttendanceStatus>>>({})
  const [unlinkedAttendees, setUnlinkedAttendees] = useState<Record<string, UnlinkedAttendee[]>>({})
  const [raidLoot, setRaidLoot] = useState<Record<string, RaidLootEntry[]>>({})
  const [expandedRaids, setExpandedRaids] = useState<Set<string>>(new Set())
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [guildSettings, setGuildSettings] = useState<any>(null)
  const [showSkipModal, setShowSkipModal] = useState<{ raidId: string, date: string } | null>(null)
  const [skipReason, setSkipReason] = useState('')
  const [showImportModal, setShowImportModal] = useState<{ raidId: string, date: string, isEdit: boolean } | null>(null)

  // Unified import form state
  const [attendanceData, setAttendanceData] = useState('')
  const [lootData, setLootData] = useState('')
  const [signupsData, setSignupsData] = useState('')

  const [lootItems, setLootItems] = useState<{ id: string, name: string, wowhead_id: number, boss_name: string }[]>([])
  const [pendingLootImports, setPendingLootImports] = useState<{ date: string, itemId: number, characterName: string, matchedItem?: any, matchedCharacter?: any, needsItemSelection?: boolean }[]>([])
  const [showLootSelectionModal, setShowLootSelectionModal] = useState<{ index: number, itemId: number, characterName: string } | null>(null)
  const [lootSearchQuery, setLootSearchQuery] = useState('')
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
  const { activeGuild, isOfficer, loading: guildLoading, currentExpansion, user } = useGuildContext()
  const { showNotification } = useNotification()
  const { confirm, ConfirmDialog } = useConfirm()

  useEffect(() => {
    document.title = activeTab === 'tracking' ? 'LootList+ • Raid Tracking' : 'LootList+ • Loot History'
  }, [activeTab])

  useEffect(() => {
    if (activeGuild?.id) trackClientEvent('admin_raid_tracking_viewed', { guild_id: activeGuild.id })
  }, [activeGuild?.id])

  // Populate form when opening edit modal - only pre-fill loot (not attendance/signups)
  // Attendance and signups are managed via the main UI, import is just for Gargul data
  useEffect(() => {
    if (showImportModal?.isEdit) {
      const raidId = showImportModal.raidId
      const raidDate = showImportModal.date

      // DON'T pre-fill attendance - import is for fresh Gargul data
      setAttendanceData('')
      // DON'T pre-fill signups - import is for fresh data
      setSignupsData('')

      // DO pre-fill loot so users can see existing + add more
      const lootEntries = raidLoot[raidId] || []
      const formattedDate = raidDate.replace(/-/g, '/').split('/').reverse().join('/')
      const lootLines = lootEntries.map(entry =>
        `${formattedDate};[${entry.item_wowhead_id}];${entry.character_name}`
      )
      setLootData(lootLines.join('\n'))
    }
  }, [showImportModal, raidLoot])

  useEffect(() => {
    if (guildLoading) return

    const loadData = async () => {
      if (!isOfficer) {
        router.push('/overview')
        return
      }

      if (!activeGuild || !currentExpansion) {
        setLoading(false)
        return
      }

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

        // Build raider list from loot submissions directly.
        // Submitters may not have active guild memberships, so we can't rely
        // on character_guild_memberships as the sole source of truth.
        const { data: submissionsData } = await supabase
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
          .eq('guild_id', activeGuild.id)
          .eq('status', 'approved')

        // Fetch roles from guild-members API (uses service role to see all members)
        const membersResponse = await fetch(`/api/guild-members?guild_id=${activeGuild.id}`)
        const membersResult = membersResponse.ok ? await membersResponse.json() : null

        // Build a role lookup by character_id from the API response
        const roleByCharacterId: Record<string, string> = {}
        if (membersResult?.members) {
          for (const member of membersResult.members) {
            for (const char of member.characters || []) {
              roleByCharacterId[char.id] = member.role || 'Member'
            }
          }
        }

        if (submissionsData && submissionsData.length > 0) {
          // Deduplicate by character_id (a user might have multiple submissions)
          const seen = new Set<string>()
          const formattedMembers: Member[] = submissionsData
            .filter((s: any) => {
              if (seen.has(s.character_id)) return false
              seen.add(s.character_id)
              return true
            })
            .map((s: any) => ({
              character_id: s.character_id,
              user_id: s.character?.user_id,
              character_name: s.character?.name || 'Unknown',
              class_name: s.character?.class?.name || 'Unknown',
              class_color: s.character?.class?.color_hex || '#888888',
              role: roleByCharacterId[s.character_id] || 'Member'
            }))
            .sort((a: Member, b: Member) => a.character_name.localeCompare(b.character_name))

          setMembers(formattedMembers)
        }

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
  }, [guildLoading, activeGuild, isOfficer, currentExpansion])

  const generateRaidDates = async (guildId: string, settings: any, expansion: any) => {
    // Use expansion raid schedule if available, fall back to guild settings for backwards compatibility
    const raidScheduleSource = expansion?.raid_days_per_week != null ? expansion : settings
    const { raid_days_per_week, first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day } = raidScheduleSource

    const raidDays = [first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day]
      .filter(day => day !== null && day !== undefined)
      .slice(0, raid_days_per_week)

    // Generate dates: from expansion raid_start_date to today only
    const dates: string[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalize to start of day

    // Use expansion raid_start_date, fall back to guild creation date
    const startDate = expansion?.raid_start_date
      ? new Date(expansion.raid_start_date + 'T00:00:00')
      : activeGuild?.created_at
        ? new Date(activeGuild.created_at)
        : new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000))

    let currentDate = new Date(startDate)
    currentDate.setHours(0, 0, 0, 0) // Normalize to start of day
    while (currentDate <= today) {
      if (raidDays.includes(currentDate.getDay())) {
        dates.push(currentDate.toISOString().split('T')[0])
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Load or create raid events
    const { data: existingEvents } = await supabase
      .from('raid_events')
      .select('*')
      .eq('guild_id', guildId)
      .in('raid_date', dates)

    const existingDates = new Set(existingEvents?.map((e: { raid_date: string }) => e.raid_date) || [])
    const newDates = dates.filter(d => !existingDates.has(d))

    // Get active expansion tier (use current phase)
    const { data: guildData } = await supabase
      .from('guilds')
      .select('active_expansion_id')
      .eq('id', guildId)
      .single()

    let tierData: { id: string } | null = null
    if (guildData?.active_expansion_id) {
      const { data: expData } = await supabase
        .from('expansions')
        .select('current_phase')
        .eq('id', guildData.active_expansion_id)
        .single()

      const currentPhase = expData?.current_phase || 1

      const { data: phraseTier } = await supabase
        .from('raid_tiers')
        .select('id')
        .eq('expansion_id', guildData.active_expansion_id)
        .eq('phase', currentPhase)
        .or('is_guild_active.eq.true,is_guild_active.is.null')
        .limit(1)
        .single()

      tierData = phraseTier
    }

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

    if (eventsError) {
      console.error('❌ Error loading raid events:', eventsError)
    }

    // Filter events to only show ones that match the current raid schedule
    const filteredEvents = allEvents?.filter((event: RaidEvent) => {
      const eventDate = new Date(event.raid_date + 'T00:00:00')
      const eventDayOfWeek = eventDate.getDay()
      return raidDays.includes(eventDayOfWeek)
    }) || []

    // Deduplicate by date - prefer events that already have attendance records
    let deduplicatedEvents = filteredEvents
    if (filteredEvents.length > 0) {
      // Get all raid event IDs
      const eventIds = filteredEvents.map((e: RaidEvent) => e.id)

      // Check which have attendance records
      const { data: attendanceCheck } = await supabase
        .from('attendance_records')
        .select('raid_event_id')
        .in('raid_event_id', eventIds)

      const eventsWithAttendance = new Set(attendanceCheck?.map((r: { raid_event_id: string }) => r.raid_event_id) || [])
      // Deduplicate by date, preferring events with attendance
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

      // Auto-expand the most recent week
      const mostRecentRaid = deduplicatedEvents[0]
      const mostRecentWeekStart = getWeekStart(mostRecentRaid.raid_date, settings.first_raid_day ?? 0)
      setExpandedWeeks(new Set([mostRecentWeekStart]))

      // Auto-expand the first raid day in the most recent week (earliest date in that week)
      const raidsInMostRecentWeek = deduplicatedEvents.filter((r: RaidEvent) =>
        getWeekStart(r.raid_date, settings.first_raid_day ?? 0) === mostRecentWeekStart
      )
      // Sort by date ascending to get the earliest raid in the week
      raidsInMostRecentWeek.sort((a: RaidEvent, b: RaidEvent) => a.raid_date.localeCompare(b.raid_date))
      const firstRaidInWeek = raidsInMostRecentWeek[0]

      setExpandedRaids(new Set([firstRaidInWeek.id]))
      await loadRaidAttendance(firstRaidInWeek.id)
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
    // Load attendance records
    const { data: records } = await supabase
      .from('attendance_records')
      .select('character_id, character_name, signed_up, attended, no_call_no_show, was_late, was_benched')
      .eq('raid_event_id', raidId)

    const attendanceMap: Record<string, AttendanceStatus> = {}
    const unlinked: UnlinkedAttendee[] = []

    // Build set of linked member names for duplicate detection
    const linkedMemberNames = new Set(members.map(m => m.character_name.toLowerCase()))

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
        // Unlinked attendee - only add if name doesn't match a linked member
        // (prevents duplicates from appearing when both linked and unlinked records exist)
        if (!linkedMemberNames.has(r.character_name.toLowerCase())) {
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
          loot_items!inner (
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

  const getCellState = (status: AttendanceStatus | undefined): CellState => {
    if (!status) return 'empty'
    if (status.no_call_no_show) return 'no-show'
    if (status.attended && status.was_late) return 'late'
    if (status.was_benched) return 'standby'
    if (status.attended) return 'attended'
    return 'empty'
  }

  const getCellStyle = (state: CellState) => {
    switch (state) {
      case 'attended': return 'bg-background-elevated border border-border border-l-2 border-l-success'
      case 'late': return 'bg-background-elevated border border-border border-l-2 border-l-warning'
      case 'standby': return 'bg-background-elevated border border-border border-l-2 border-l-warning'
      case 'no-show': return 'bg-background-elevated border border-border border-l-2 border-l-destructive'
      default: return 'bg-background-elevated border border-border'
    }
  }


  const setAttendanceStatus = async (raidId: string, characterId: string, userId: string, state: CellState) => {
    const current = attendance[raidId]?.[characterId]
    const preserveSignedUp = current?.signed_up || false

    let newStatus: AttendanceStatus
    switch (state) {
      case 'attended':
        newStatus = { signed_up: preserveSignedUp, attended: true, no_call_no_show: false, was_late: false, was_benched: false }
        break
      case 'late':
        newStatus = { signed_up: preserveSignedUp, attended: true, no_call_no_show: false, was_late: true, was_benched: false }
        break
      case 'standby':
        newStatus = { signed_up: preserveSignedUp, attended: false, no_call_no_show: false, was_late: false, was_benched: true }
        break
      case 'no-show':
        newStatus = { signed_up: preserveSignedUp, attended: false, no_call_no_show: true, was_late: false, was_benched: false }
        break
      case 'empty':
      default:
        newStatus = { signed_up: preserveSignedUp, attended: false, no_call_no_show: false, was_late: false, was_benched: false }
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

    // Save to database
    const payload = {
      raid_event_id: raidId,
      character_id: characterId,
      user_id: userId,
      ...newStatus
    }
    const { data, error } = await supabase
      .from('attendance_records')
      .upsert(payload, {
        onConflict: 'raid_event_id,character_id'
      })
      .select()

    if (error) {
      console.error('Failed to save attendance:', JSON.stringify(error, null, 2))
      showNotification('error', error.message || 'Couldn\'t save attendance. Try again.')
      await loadRaidAttendance(raidId)
    } else if (!data || data.length === 0) {
      console.error('No rows returned from upsert - possible RLS issue')
      showNotification('error', 'Couldn\'t save attendance. Check your permissions and try again.')
      await loadRaidAttendance(raidId)
    }
  }

  const cycleStatus = (raidId: string, characterId: string, userId: string) => {
    const current = attendance[raidId]?.[characterId]
    const currentState = getCellState(current)
    const cycle: CellState[] = ['empty', 'attended', 'late', 'standby', 'no-show']
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

    // Save to database
    const { error } = await supabase
      .from('attendance_records')
      .upsert({
        raid_event_id: raidId,
        character_id: characterId,
        user_id: userId,
        signed_up: newSignedUp,
        attended: current?.attended || false,
        no_call_no_show: current?.no_call_no_show || false,
        was_late: current?.was_late || false,
        was_benched: current?.was_benched || false
      }, {
        onConflict: 'raid_event_id,character_id'
      })

    if (error) {
      console.error('Failed to toggle signup:', error)
      showNotification('error', 'Couldn\'t save signup status. Try again.')
      // Revert local state on error
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
        const { error } = await supabase
          .from('attendance_records')
          .delete()
          .eq('raid_event_id', raidId)
          .eq('character_id', characterId)

        if (error) {
          console.error('Failed to remove from raid:', error)
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

    const { error } = await supabase
      .from('loot_history')
      .update({
        character_id: newCharacterId,
        character_name: null, // Clear unlinked name if switching to linked
        notes: `Reassigned from ${reassignModal.currentMember.character_name}`
      })
      .eq('id', lootId)

    if (error) {
      console.error('Failed to reassign loot:', error)
      showNotification('error', 'Couldn\'t reassign loot. Try again.')
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
      showNotification('success', 'Raid summary posted to Discord.')
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

  const deleteLootEntry = (lootId: string, raidId: string) => {
    confirm({
      title: 'Remove loot entry',
      description: 'Are you sure you want to remove this loot entry? This will restore the item to the master sheet.',
      confirmLabel: 'Remove',
      variant: 'danger',
      onConfirm: async () => {
        const { error } = await supabase
          .from('loot_history')
          .delete()
          .eq('id', lootId)

        if (error) {
          showNotification('error', error.message || 'Couldn\'t delete loot entry. Try again.')
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
      .select('id, name, wowhead_id, boss_name')
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
      .split(/\n/)
      .map(line => {
        // Skip header lines (contain date pattern or " - ")
        if (line.match(/\d{2}\/\d{2}\/\d{4}/) || line.includes(' - ')) {
          return ''
        }
        // Strip the "x" marker and any surrounding whitespace
        // Handle formats: "Name    x", "Name,", "Name"
        return line
          .replace(/\s+x\s*$/i, '')  // Remove trailing "x" with whitespace
          .replace(/,\s*$/, '')       // Remove trailing comma
          .trim()
      })
      .filter(name => name.length > 0 && name.length <= 50)
  }

  const parseAttendancePreview = (data: string) => {
    if (!data.trim()) return { total: 0, matched: 0, unmatched: 0 }

    const names = parseMRTNames(data)

    let matched = 0
    let unmatched = 0

    names.forEach(name => {
      const member = members.find(m =>
        m.character_name.toLowerCase() === name.toLowerCase()
      )
      if (member) matched++
      else unmatched++
    })

    return { total: names.length, matched, unmatched }
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
        // Check if character is a guild member
        const matchedCharacter = members.find(m =>
          m.character_name.toLowerCase() === charName.toLowerCase()
        )

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
    return parseAttendancePreview(data) // Same logic
  }

  // Handle closing the import modal with confirmation if there's unsaved data
  const handleCloseImportModal = () => {
    const hasUnsavedData = attendanceData.trim() || lootData.trim() || signupsData.trim()

    if (hasUnsavedData) {
      confirm({
        title: 'Discard changes?',
        description: 'You have unsaved data in the form. Are you sure you want to close without importing?',
        confirmLabel: 'Discard',
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
    if (!showImportModal) return

    const confirmed = window.confirm(
      'Are you sure you want to clear ALL attendance and loot data for this raid? This cannot be undone.'
    )
    if (!confirmed) return

    setImporting(true)

    try {
      // Delete all attendance records for this raid
      const { error: attendanceError } = await supabase
        .from('attendance_records')
        .delete()
        .eq('raid_event_id', showImportModal.raidId)

      if (attendanceError) {
        console.error('❌ Clear attendance error:', attendanceError)
        showNotification('error', 'Couldn\'t clear attendance data. Try again.')
      }

      // Delete all loot history for this raid
      const { error: lootError } = await supabase
        .from('loot_history')
        .delete()
        .eq('raid_event_id', showImportModal.raidId)

      if (lootError) {
        console.error('❌ Clear loot error:', lootError)
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

  // Unified import function - imports all data at once
  const importAllRaidData = async () => {
    if (!showImportModal || !activeGuild) {
      return
    }

    setImporting(true)

    const results = {
      attendance: { success: 0, failed: 0 },
      loot: { success: 0, failed: 0, errors: [] as string[] },
      signups: { success: 0, failed: 0 }
    }

    // Import Attendance
    if (attendanceData.trim() || showImportModal.isEdit) {
      const names = parseMRTNames(attendanceData)
      const namesLower = names.map(n => n.toLowerCase())

      const linkedUpdates: any[] = []
      const unlinkedUpdates: any[] = []
      const linkedCharacterIds: string[] = []

      names.forEach(name => {
        const member = members.find(m =>
          m.character_name.toLowerCase() === name.toLowerCase()
        )

        if (member) {
          linkedCharacterIds.push(member.character_id)
          linkedUpdates.push({
            raid_event_id: showImportModal.raidId,
            character_id: member.character_id,
            user_id: member.user_id,
            signed_up: guildSettings?.use_signups || false, // Auto-set signed_up if enabled
            attended: true,
            no_call_no_show: false,
            was_late: false,
            was_benched: false
          })
          results.attendance.success++
        } else {
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

      // Mark members with loot lists NOT in the import as No Show
      const importedCharacterIds = new Set(linkedCharacterIds)
      const noShowUpdates: any[] = []

      members.forEach(member => {
        if (!importedCharacterIds.has(member.character_id)) {
          noShowUpdates.push({
            raid_event_id: showImportModal.raidId,
            character_id: member.character_id,
            user_id: member.user_id,
            signed_up: false,
            attended: false,
            no_call_no_show: true,
            was_late: false,
            was_benched: false
          })
        }
      })

      if (noShowUpdates.length > 0) {
        linkedUpdates.push(...noShowUpdates)
      }

      // When editing, first remove attendance for members not in the new list
      if (showImportModal.isEdit) {
        // Get all current attendance records for this raid
        const { data: currentRecords } = await supabase
          .from('attendance_records')
          .select('id, character_id, character_name')
          .eq('raid_event_id', showImportModal.raidId)

        if (currentRecords) {
          type AttendanceRecord = { id: string; character_id: string | null; character_name: string | null }
          // Find linked records to remove (character_id not in new list)
          const linkedToRemove = currentRecords
            .filter((r: AttendanceRecord) => r.character_id && !linkedCharacterIds.includes(r.character_id))
            .map((r: AttendanceRecord) => r.id)

          // Find unlinked records to remove (character_name not in new list)
          const unlinkedToRemove = currentRecords
            .filter((r: AttendanceRecord) => !r.character_id && r.character_name && !namesLower.includes(r.character_name.toLowerCase()))
            .map((r: AttendanceRecord) => r.id)

          const idsToRemove = [...linkedToRemove, ...unlinkedToRemove]

          if (idsToRemove.length > 0) {
            const { error: removeError } = await supabase
              .from('attendance_records')
              .delete()
              .in('id', idsToRemove)

            if (removeError) {
              console.error('❌ Remove attendance error:', removeError)
            }
          }
        }
      }

      if (linkedUpdates.length > 0) {
        const { error: upsertError } = await supabase
          .from('attendance_records')
          .upsert(linkedUpdates, { onConflict: 'raid_event_id,character_id' })
        if (upsertError) {
          console.error('Attendance upsert error:', upsertError)
        }
      }

      // For unlinked attendees, delete existing and re-insert
      // First delete all unlinked records for this raid
      const { error: deleteUnlinkedError } = await supabase
        .from('attendance_records')
        .delete()
        .eq('raid_event_id', showImportModal.raidId)
        .is('character_id', null)

      if (deleteUnlinkedError) {
        console.error('❌ Delete unlinked error:', deleteUnlinkedError)
      }

      if (unlinkedUpdates.length > 0) {
        const { error: insertError } = await supabase
          .from('attendance_records')
          .insert(unlinkedUpdates)

        if (insertError) {
          console.error('Unlinked attendance insert error:', insertError.message, insertError.code, insertError.details, insertError.hint)
        }
      }
    }

    // Import Signups (if enabled and data provided)
    // Note: This runs AFTER attendance import, so all members already have records created
    // We only need to update the signed_up field, preserving all other attendance statuses
    if (guildSettings?.use_signups && signupsData.trim()) {
      const names = parseMRTNames(signupsData)
      const signupCharacterIds: string[] = []

      for (const name of names) {
        const member = members.find(m =>
          m.character_name.toLowerCase() === name.toLowerCase()
        )

        if (member) {
          signupCharacterIds.push(member.character_id)
          results.signups.success++
        } else {
          // Unlinked signup (character not in guild) - upsert with signup flag
          await supabase
            .from('attendance_records')
            .upsert({
              raid_event_id: showImportModal.raidId,
              character_name: name,
              signed_up: true,
              attended: false,
              no_call_no_show: false,
              was_late: false,
              was_benched: false
            })
          results.signups.failed++ // Counts as "failed" match but successful import
        }
      }

      // Batch update signed_up for all linked members in signup list
      // This preserves their attendance status (attended, no_call_no_show, etc.)
      if (signupCharacterIds.length > 0) {
        const { error } = await supabase
          .from('attendance_records')
          .update({ signed_up: true })
          .eq('raid_event_id', showImportModal.raidId)
          .in('character_id', signupCharacterIds)

        if (error) {
          console.error('Signup update error:', error)
        }
      }
    }

    // Import Loot
    if (lootData.trim()) {
      // Get the items to use for matching - reload if state is empty
      // We use the returned value because React state updates are async
      let itemsToUse = lootItems
      if (itemsToUse.length === 0) {
        itemsToUse = await loadLootItems()
      }

      if (itemsToUse.length === 0) {
        results.loot.errors.push('Could not load loot items database. Please try again.')
        showNotification('error', 'Couldn\'t import loot. Items database not available.')
        // Don't continue with loot import
        setImporting(false)
        setShowImportModal(null)
        return
      }

      const { data: eventData } = await supabase
        .from('raid_events')
        .select('raid_tier_id')
        .eq('id', showImportModal.raidId)
        .single()

      const lines = lootData
        .trim()
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)

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
        // Use itemsToUse instead of lootItems state
        const matchedItem = itemsToUse.find(item => item.wowhead_id === itemId)
        const matchedCharacter = members.find(m =>
          m.character_name.toLowerCase() === characterName.trim().toLowerCase()
        )

        if (!matchedItem) {
          results.loot.failed++
          // Check if item exists by fetching from DB directly
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

        // Build insert object - supports both linked and unlinked characters
        const insertData: any = {
          loot_item_id: matchedItem.id,
          guild_id: activeGuild.id,
          raid_tier_id: eventData?.raid_tier_id,
          raid_event_id: showImportModal.raidId,
          awarded_date: showImportModal.date,
          awarded_by: user?.id,
          notes: `Imported from Gargul`
        }

        if (matchedCharacter) {
          // Linked character - use character_id
          insertData.character_id = matchedCharacter.character_id
        } else {
          // Unlinked character - use character_name
          insertData.character_name = charName
        }

        const { error } = await supabase
          .from('loot_history')
          .insert(insertData)

        if (error) {
          if (error.code === '23505') {
            results.loot.errors.push(`${characterName.trim()} already has ${matchedItem.name}`)
          } else {
            results.loot.errors.push(`${characterName.trim()}: ${error.message}`)
          }
          results.loot.failed++
        } else {
          results.loot.success++
        }
      }
    }

    // Reload attendance data
    await loadRaidAttendance(showImportModal.raidId)

    setImporting(false)
    setShowImportModal(null)
    setAttendanceData('')
    setLootData('')
    setSignupsData('')

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

      // Try to match character by name
      const matchedCharacter = members.find(m =>
        m.character_name.toLowerCase() === characterName.trim().toLowerCase()
      )

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

    // Get the raid event to find the raid_tier_id
    const raidEvent = raidDates.find(r => r.id === showImportModal.raidId)

    // Get the raid tier ID from the event
    const { data: eventData } = await supabase
      .from('raid_events')
      .select('raid_tier_id')
      .eq('id', showImportModal.raidId)
      .single()

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    for (const entry of parsedData) {
      if (!entry.matchedItem) {
        errorCount++
        errors.push(`${entry.characterName}: Item ID ${entry.itemId} not found`)
        continue
      }

      // For characters not in the guild, we still track the loot
      // but we won't have a character_id - we'll track by name
      const characterId = entry.matchedCharacter?.character_id

      if (!characterId) {
        // Character not found - for now skip, but could track by name in notes
        errorCount++
        errors.push(`${entry.characterName}: Character not found in guild`)
        continue
      }

      // Insert into loot_history
      const { error } = await supabase
        .from('loot_history')
        .insert({
          character_id: characterId,
          loot_item_id: entry.matchedItem.id,
          guild_id: activeGuild.id,
          raid_tier_id: eventData?.raid_tier_id,
          raid_event_id: showImportModal.raidId,
          awarded_date: showImportModal.date,
          awarded_by: user?.id,
          notes: `Imported from Gargul - Item ID: ${entry.itemId}`
        })

      if (error) {
        // Check if it's a duplicate (item already awarded to this character)
        if (error.code === '23505') {
          errors.push(`${entry.characterName}: Already received ${entry.matchedItem.name}`)
        } else {
          errors.push(`${entry.characterName}: ${error.message}`)
        }
        errorCount++
      } else {
        successCount++

        // Update BLP (Bad Luck Protection) - fire and forget
        fetch('/api/blp/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guild_id: activeGuild.id,
            loot_item_id: entry.matchedItem.id,
            winner_character_id: characterId,
            raid_event_id: showImportModal.raidId
          })
        }).catch(err => console.error('BLP update failed:', err))
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

  const getAttendanceCount = useCallback((raidId: string) => {
    const raidAttendance = attendance[raidId] || {}
    const linkedCount = Object.values(raidAttendance).filter(a => a.attended).length
    const unlinkedCount = (unlinkedAttendees[raidId] || []).filter(u => u.status.attended).length
    return linkedCount + unlinkedCount
  }, [attendance, unlinkedAttendees])

  const getSignupCount = useCallback((raidId: string) => {
    const raidAttendance = attendance[raidId] || {}
    const linkedCount = Object.values(raidAttendance).filter(a => a.signed_up).length
    const unlinkedCount = (unlinkedAttendees[raidId] || []).filter(u => u.status.signed_up).length
    return linkedCount + unlinkedCount
  }, [attendance, unlinkedAttendees])

  const getLootCount = useCallback((raidId: string) => {
    return raidLoot[raidId]?.length || 0
  }, [raidLoot])

  // Group raids by week (starting on the first raid day from settings)
  const firstRaidDay = guildSettings?.first_raid_day ?? 0 // Default to Sunday if not set

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

  const getWeekLabel = useCallback((weekStartDate: string) => {
    const date = new Date(weekStartDate + 'T00:00:00')
    return `Week of ${date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })}`
  }, [])

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
        upcoming.push(cursor.toISOString().split('T')[0])
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    // Filter out any dates that already exist in raidDates (already tracked)
    const existingDates = new Set(raidDates.map(r => r.raid_date))
    return upcoming.filter(d => !existingDates.has(d))
  }, [currentExpansion, guildSettings, raidDates])

  if (loading) {
    return <RaidTrackingPageSkeleton />
  }

  const today = new Date().toISOString().split('T')[0]

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

        {/* Tabs */}
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

      {/* Tracking Tab Content */}
      {activeTab === 'tracking' && (
        <>
      {/* Legend */}
      {!raidStartDateInFuture && (
        <div className="flex items-center gap-3 sm:gap-4 text-[12px] sm:text-[13px] flex-wrap">
          <span className="text-muted-foreground">Status:</span>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded border bg-success/30 border-success"></div>
            <span className="text-muted-foreground">Attended</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded border bg-yellow-500/30 border-yellow-500"></div>
            <span className="text-muted-foreground">Late</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded border bg-orange-500/30 border-orange-500"></div>
            <span className="text-muted-foreground">Standby</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded border bg-destructive/30 border-destructive"></div>
            <span className="text-muted-foreground">No Show</span>
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
                {new Date(currentExpansion.raid_start_date + 'T00:00:00').toLocaleDateString('en-US', {
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
                const date = new Date(dateStr + 'T00:00:00')
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

          return (
            <div key={weekStart} className="space-y-3">
              {/* Week Header */}
              <Button
                variant="ghost"
                onClick={() => toggleWeekExpanded(weekStart)}
                className="flex items-center gap-3 w-full group p-0 h-auto hover:bg-transparent"
              >
                {isWeekExpanded ? (
                  <HugeiconsIcon icon={ArrowUp01Icon} size={24} className="text-foreground group-hover:text-accent transition flex-shrink-0" />
                ) : (
                  <HugeiconsIcon icon={ArrowDown01Icon} size={24} className="text-foreground group-hover:text-accent transition flex-shrink-0" />
                )}
                <h2 className="text-[24px] font-bold text-foreground group-hover:text-accent transition">{getWeekLabel(weekStart)}</h2>
                <div className="flex-1 h-[1px] bg-foreground/10"></div>
              </Button>

              {/* Raid Days for this week */}
              {isWeekExpanded && raids.map((raid) => {
          const isExpanded = expandedRaids.has(raid.id)
          const isPast = raid.raid_date < today
          const attendedCount = getAttendanceCount(raid.id)
          const signupCount = getSignupCount(raid.id)
          const lootCount = getLootCount(raid.id)
          const hasImportedData = attendedCount > 0 || lootCount > 0

          return (
            <div
              key={raid.id}
              className="bg-background-elevated border border-border rounded-xl overflow-hidden"
            >
              {/* Raid Header */}
              <div className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleRaidExpanded(raid.id)}
                    className="text-foreground hover:text-accent transition h-auto w-auto p-0"
                  >
                    {isExpanded ? <HugeiconsIcon icon={ArrowUp01Icon} size={20} /> : <HugeiconsIcon icon={ArrowDown01Icon} size={20} />}
                  </Button>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className={`text-[18px] font-bold ${raid.is_skipped ? 'line-through opacity-50' : 'text-foreground'}`}>
                        {new Date(raid.raid_date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </h3>
                      {raid.is_skipped && (
                        <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-destructive/30 text-destructive">
                          Skipped: {raid.skip_reason}
                        </span>
                      )}
                      {!isPast && !raid.is_skipped && raid.raid_date === today && (
                        <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-accent text-foreground">
                          Today
                        </span>
                      )}
                      {hasImportedData && !raid.is_skipped && (
                        <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-success/30 text-success border border-success/50">
                          Imported
                        </span>
                      )}
                    </div>
                    {!raid.is_skipped && (
                      <p className="text-foreground-muted text-[13px] mt-1">
                        {attendedCount} attended • {signupCount} signed up
                        {lootCount > 0 && <span className="text-[#a335ee]"> • {lootCount} loot</span>}
                        {raid.wcl_report_code && (
                          <span> • <a
                            href={`https://classic.warcraftlogs.com/reports/${raid.wcl_report_code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#e35e15] hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >WCL Report</a></span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!raid.is_skipped && (
                    <Button
                      variant={hasImportedData ? 'outline' : 'outline'}
                      size="sm"
                      onClick={async () => {
                        await loadLootItems() // Load items for loot matching

                        if (hasImportedData) {
                          // Load attendance data first if not already loaded
                          if (!attendance[raid.id]) {
                            await loadRaidAttendance(raid.id)
                          }

                          // Need to get fresh data after loading
                          // We'll use a setTimeout to let state update, or we read directly
                          // For now, just open the modal and let useEffect handle it
                          setLootData('')
                          setShowImportModal({ raidId: raid.id, date: raid.raid_date, isEdit: true })
                        } else {
                          // Clear all form fields for new import
                          setAttendanceData('')
                          setLootData('')
                          setSignupsData('')
                          setShowImportModal({ raidId: raid.id, date: raid.raid_date, isEdit: false })
                        }
                      }}
                      className={hasImportedData ? 'border-success/50 text-success hover:bg-success/20' : ''}
                    >
                      <HugeiconsIcon icon={Upload01Icon} size={16} />
                      <span className="hidden sm:inline">{hasImportedData ? 'Edit import' : 'Import data'}</span>
                      <span className="sm:hidden">{hasImportedData ? 'Edit' : 'Import'}</span>
                    </Button>
                  )}
                  {!raid.is_skipped && hasImportedData && guildSettings?.raid_summary_channel_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePostToDiscord(raid.id)}
                      loading={postingDiscord === raid.id}
                      className="border-[#5865F2]/50 text-[#5865F2] hover:bg-[#5865F2]/10"
                    >
                      <HugeiconsIcon icon={DiscordIcon} size={16} />
                      <span className="hidden sm:inline">Post to Discord</span>
                      <span className="sm:hidden">Discord</span>
                    </Button>
                  )}
                  {!raid.is_skipped && hasImportedData && guildSettings?.wcl_guild_url && !raid.wcl_report_code && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleLinkWcl(raid.id)}
                      loading={linkingWcl === raid.id}
                      className="border-[#e35e15]/50 text-[#e35e15] hover:bg-[#e35e15]/10"
                    >
                      <span className="hidden sm:inline">Link WCL</span>
                      <span className="sm:hidden">WCL</span>
                    </Button>
                  )}
                  <Button
                    variant={raid.is_skipped ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => toggleSkipDay(raid.id, raid.is_skipped)}
                    className={raid.is_skipped ? 'bg-destructive/30 hover:bg-destructive/40' : ''}
                  >
                    {raid.is_skipped ? 'Unskip' : 'Skip day'}
                  </Button>
                </div>
              </div>

              {/* Expanded Member List */}
              {isExpanded && !raid.is_skipped && (
                <div className="border-t border-border px-4 sm:px-6 py-4">
                  {members.length === 0 && (!unlinkedAttendees[raid.id] || unlinkedAttendees[raid.id].length === 0) ? (
                    /* Empty State */
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <h4 className="text-[16px] font-semibold text-foreground mb-2">No raiders with loot lists</h4>
                      <p className="text-foreground-muted text-[13px] max-w-md mx-auto">
                        Guild members with loot submissions will appear here. Use the "Import data" button to add attendance for this raid day.
                      </p>
                    </div>
                  ) : (
                  <>
                  {/* Mark all attended button */}
                  {members.some(m => getCellState(attendance[raid.id]?.[m.character_id]) === 'empty') && (
                    <div className="flex justify-end mb-2">
                      <Button variant="success-outline" size="sm" onClick={() => markAllAttended(raid.id, members)}>
                        Mark all attended
                      </Button>
                    </div>
                  )}

                  {/* Click-row raider list */}
                  <div className="space-y-1">
                    {/* Linked Members */}
                    {members.map(member => {
                      const status = attendance[raid.id]?.[member.character_id]
                      const state = getCellState(status)
                      const isSignedUp = status?.signed_up || false
                      const memberLoot = raidLoot[raid.id]?.filter(l =>
                        l.character_name.toLowerCase() === member.character_name.toLowerCase()
                      ) || []

                      return (
                        <div
                          key={member.character_id}
                          className={`flex flex-col rounded-lg transition-colors ${getCellStyle(state)}`}
                        >
                          <div className="flex items-center">
                            {/* Clickable area - cycles status */}
                            <button
                              type="button"
                              onClick={() => cycleStatus(raid.id, member.character_id, member.user_id)}
                              className="flex items-center gap-2 min-w-0 flex-1 px-3 py-2 text-left cursor-pointer hover:bg-muted/50 rounded-l-lg transition-colors"
                            >
                              <span
                                className="font-medium text-[13px] truncate"
                                style={{ color: member.class_color }}
                              >
                                {member.character_name}
                              </span>

                              {/* Desktop: Inline Loot Items (names only, no interactive elements inside button) */}
                              {memberLoot.length > 0 && (
                                <span className="hidden sm:flex items-center gap-2 text-[12px] min-w-0">
                                  <span className="text-muted-foreground">→</span>
                                  {memberLoot.map(loot => (
                                    <span key={loot.id} className="min-w-0">
                                      <ItemLink name={loot.item_name} wowheadId={loot.item_wowhead_id} className="text-[12px] truncate" />
                                    </span>
                                  ))}
                                </span>
                              )}

                              <span className="flex-1" />

                              {/* Status pill */}
                              {state === 'attended' && <span className="text-[11px] font-medium text-success bg-success/15 px-2 py-0.5 rounded-full flex-shrink-0">Attended</span>}
                              {state === 'late' && <span className="text-[11px] font-medium text-warning bg-warning/15 px-2 py-0.5 rounded-full flex-shrink-0">Late</span>}
                              {state === 'standby' && <span className="text-[11px] font-medium text-warning bg-warning/15 px-2 py-0.5 rounded-full flex-shrink-0">Standby</span>}
                              {state === 'no-show' && <span className="text-[11px] font-medium text-destructive bg-destructive/15 px-2 py-0.5 rounded-full flex-shrink-0">No Show</span>}
                              {isSignedUp && <span className="text-[11px] font-medium text-accent bg-accent/15 px-2 py-0.5 rounded-full flex-shrink-0">Signed up</span>}
                            </button>

                            {/* Three-dot menu (outside click target) */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 mr-1">
                                  <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setAttendanceStatus(raid.id, member.character_id, member.user_id, 'attended')}
                                  className={state === 'attended' ? 'bg-muted' : ''}
                                >
                                  Mark as attended
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setAttendanceStatus(raid.id, member.character_id, member.user_id, 'late')}
                                  className={state === 'late' ? 'bg-muted' : ''}
                                >
                                  Mark as late
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setAttendanceStatus(raid.id, member.character_id, member.user_id, 'standby')}
                                  className={state === 'standby' ? 'bg-muted' : ''}
                                >
                                  Mark as standby
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setAttendanceStatus(raid.id, member.character_id, member.user_id, 'no-show')}
                                  className={state === 'no-show' ? 'bg-muted' : ''}
                                >
                                  Mark as no show
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setAttendanceStatus(raid.id, member.character_id, member.user_id, 'empty')}
                                  className={state === 'empty' ? 'bg-muted' : ''}
                                >
                                  Clear status
                                </DropdownMenuItem>
                                {guildSettings?.use_signups && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => toggleSignup(raid.id, member.character_id, member.user_id)}>
                                      {isSignedUp ? 'Remove signup' : 'Mark as signed up'}
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {memberLoot.length > 0 && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => setReassignModal({ raidId: raid.id, lootEntries: memberLoot, currentMember: member })}>
                                      Reassign loot
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => removeFromAttendance(raid.id, member.character_id)}
                                  className="text-destructive"
                                >
                                  Remove from raid
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Mobile: Loot items on separate line */}
                          {memberLoot.length > 0 && (
                            <div className="flex items-center gap-2 text-[12px] sm:hidden px-3 pb-2 flex-wrap">
                              <span className="text-muted-foreground">→</span>
                              {memberLoot.map(loot => (
                                <div key={loot.id} className="flex items-center gap-1">
                                  <ItemLink name={loot.item_name} wowheadId={loot.item_wowhead_id} className="text-[12px]" />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => { e.stopPropagation(); deleteLootEntry(loot.id, raid.id) }}
                                    className="text-destructive hover:text-destructive/80 h-5 w-5 p-0"
                                    title="Remove loot"
                                  >
                                    <HugeiconsIcon icon={Cancel01Icon} size={14} />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Unlinked Attendees (No Account Yet) - filter out any that match linked members */}
                    {unlinkedAttendees[raid.id]
                      ?.filter(attendee =>
                        !members.some(m => m.character_name.toLowerCase() === attendee.character_name.toLowerCase())
                      )
                      .map((attendee, idx) => {
                      const state = getCellState(attendee.status)

                      return (
                        <div
                          key={`unlinked-${idx}`}
                          className={`flex items-center px-3 py-2 rounded-lg opacity-60 ${getCellStyle(state)}`}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="font-medium text-muted-foreground text-[13px] truncate" title={`${attendee.character_name} (account not linked)`}>
                              {attendee.character_name}
                            </span>
                            <span className="flex-1" />
                            {state === 'attended' && <span className="text-[11px] font-medium text-success bg-success/15 px-2 py-0.5 rounded-full flex-shrink-0">Attended</span>}
                            {state === 'late' && <span className="text-[11px] font-medium text-warning bg-warning/15 px-2 py-0.5 rounded-full flex-shrink-0">Late</span>}
                            {state === 'standby' && <span className="text-[11px] font-medium text-warning bg-warning/15 px-2 py-0.5 rounded-full flex-shrink-0">Standby</span>}
                            {state === 'no-show' && <span className="text-[11px] font-medium text-destructive bg-destructive/15 px-2 py-0.5 rounded-full flex-shrink-0">No Show</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  </>
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
        </>
      )}

      {/* Loot History Tab Content */}
      {activeTab === 'history' && (
        <LootHistoryTab />
      )}

      {/* Skip Day Modal */}
      <Modal open={!!showSkipModal} onClose={() => setShowSkipModal(null)} size="sm">
        <ModalHeader onClose={() => setShowSkipModal(null)}>
          <ModalTitle>Skip raid day</ModalTitle>
          {showSkipModal && (
            <ModalDescription>
              {new Date(showSkipModal.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </ModalDescription>
          )}
        </ModalHeader>
        <ModalBody>
          <Label className="mb-2">Reason for skipping</Label>
          <Input
            variant="rounded"
            size="sm"
            value={skipReason}
            onChange={e => setSkipReason(e.target.value)}
            placeholder="e.g., Holiday, Cancelled, Not enough signups..."
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowSkipModal(null)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmSkipDay}>
            Skip day
          </Button>
        </ModalFooter>
      </Modal>

      {/* Import Modal - Unified Form */}
      <Modal
        open={!!showImportModal}
        onClose={handleCloseImportModal}
        size="xl"
      >
        <ModalHeader onClose={handleCloseImportModal}>
          <ModalTitle>{showImportModal?.isEdit ? 'Edit raid data' : 'Import raid data'}</ModalTitle>
          {showImportModal && (
            <ModalDescription>
              {new Date(showImportModal.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </ModalDescription>
          )}
        </ModalHeader>
        <ModalBody className="space-y-6">
          {/* Attendance & Loot Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Attendance Section */}
            <div className="space-y-3">
              <div>
                <Label className="text-md font-semibold">
                  Attendance <span className="text-accent">*</span>
                </Label>
                <p className="text-muted-foreground text-sm">Who attended this raid day</p>
              </div>
              {attendanceData.trim() && (() => {
                const preview = parseAttendancePreview(attendanceData)
                return (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-success">{preview.matched} matched</span>
                    {preview.unmatched > 0 && (
                      <span className="text-warning">{preview.unmatched} unmatched</span>
                    )}
                  </div>
                )
              })()}
              <Textarea
                variant="rounded"
                value={attendanceData}
                onChange={e => setAttendanceData(e.target.value)}
                placeholder="Paste character names (comma-separated or one per line)&#10;&#10;Example:&#10;Headjaws&#10;Calonise&#10;Leroyspankin"
                className="h-44 font-mono resize-none"
              />
            </div>

            {/* Loot Section */}
            <div className="space-y-3">
              <div>
                <Label className="text-md font-semibold">
                  Loot <span className="text-accent">*</span>
                </Label>
                <p className="text-muted-foreground text-sm">Gargul export format</p>
              </div>
              {lootData.trim() && (() => {
                const preview = parseLootPreview(lootData)
                return (
                  <div className="flex items-center gap-2 text-sm">
                    {preview.linked > 0 && (
                      <span className="text-success">{preview.linked} linked</span>
                    )}
                    {preview.unlinked > 0 && (
                      <span className="text-warning">{preview.unlinked} unlinked</span>
                    )}
                    {preview.failed > 0 && (
                      <span className="text-destructive">{preview.failed} failed</span>
                    )}
                  </div>
                )
              })()}
              <Textarea
                variant="rounded"
                value={lootData}
                onChange={e => setLootData(e.target.value)}
                placeholder="DATE;[ITEM_ID];CHARACTER&#10;&#10;Example:&#10;12/15/2024;[16859];Lukasdnmd&#10;12/15/2024;[18203];Headjaws"
                className="h-44 font-mono resize-none"
              />
            </div>
          </div>

          {/* Signups Section - Only if enabled */}
          {guildSettings?.use_signups && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-md font-semibold">
                    Signups <span className="text-muted-foreground text-sm font-normal">(optional)</span>
                  </Label>
                  <p className="text-muted-foreground text-sm">Who signed up for this raid</p>
                </div>
                {signupsData.trim() && (() => {
                  const preview = parseSignupsPreview(signupsData)
                  return (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-success">{preview.matched} matched</span>
                      {preview.unmatched > 0 && (
                        <span className="text-warning">{preview.unmatched} unmatched</span>
                      )}
                    </div>
                  )
                })()}
              </div>
              <Textarea
                variant="rounded"
                value={signupsData}
                onChange={e => setSignupsData(e.target.value)}
                placeholder="Paste character names (comma-separated or one per line)&#10;&#10;Example: Headjaws, Calonise, Leroyspankin, Nardziz"
                className="h-24 font-mono resize-none"
              />
            </div>
          )}
        </ModalBody>
        <ModalFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setAttendanceData('')
                setLootData('')
                setSignupsData('')
              }}
              disabled={importing || (!attendanceData.trim() && !lootData.trim() && !signupsData.trim())}
            >
              Clear fields
            </Button>
            <Button
              variant="destructive"
              onClick={clearRaidData}
              disabled={importing}
            >
              Clear saved data
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCloseImportModal}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={importAllRaidData}
              disabled={importing || (!attendanceData.trim() && !lootData.trim())}
              loading={importing}
            >
              {showImportModal?.isEdit ? 'Save changes' : 'Import all'}
            </Button>
          </div>
        </ModalFooter>
      </Modal>

      {/* Loot Item Selection Modal */}
      <Modal open={!!showLootSelectionModal} onClose={skipLootItemSelection} size="default" zIndex={60}>
        <ModalHeader>
          <ModalTitle>Item not found</ModalTitle>
          {showLootSelectionModal && (
            <ModalDescription>
              Could not find item ID <span className="text-accent font-mono">[{showLootSelectionModal.itemId}]</span> for{' '}
              <span className="text-foreground font-medium">{showLootSelectionModal.characterName}</span>
            </ModalDescription>
          )}
        </ModalHeader>
        <ModalBody className="space-y-4">
          <Input
            variant="rounded"
            size="sm"
            value={lootSearchQuery}
            onChange={e => setLootSearchQuery(e.target.value)}
            placeholder="Search for item by name..."
            autoFocus
          />

          <div className="max-h-64 overflow-y-auto space-y-1">
            {lootItems
              .filter(item =>
                lootSearchQuery.length === 0 ||
                item.name.toLowerCase().includes(lootSearchQuery.toLowerCase()) ||
                item.boss_name.toLowerCase().includes(lootSearchQuery.toLowerCase())
              )
              .slice(0, 20)
              .map(item => (
                <Button
                  key={item.id}
                  variant="ghost"
                  onClick={() => handleLootItemSelection(item)}
                  className="w-full px-4 py-3 h-auto bg-background-elevated hover:bg-muted border border-border rounded-xl text-left justify-start"
                >
                  <div>
                    <p className="text-foreground text-sm font-medium">{item.name}</p>
                    <p className="text-muted-foreground text-xs">{item.boss_name} • ID: {item.wowhead_id}</p>
                  </div>
                </Button>
              ))}
            {lootItems.filter(item =>
              lootSearchQuery.length === 0 ||
              item.name.toLowerCase().includes(lootSearchQuery.toLowerCase())
            ).length === 0 && (
              <EmptyState
                icon={Search01Icon}
                title="No items found"
                description="Try a different search term."
                size="compact"
              />
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={skipLootItemSelection}>
            Skip this item
          </Button>
        </ModalFooter>
      </Modal>

      {/* Reassign Loot Modal */}
      <Modal open={!!reassignModal} onClose={() => setReassignModal(null)} size="sm">
        <ModalHeader onClose={() => setReassignModal(null)}>
          <ModalTitle>Reassign loot</ModalTitle>
          <ModalDescription>
            {reassignModal?.lootEntries.length === 1 ? (
              <ItemLink
                name={reassignModal.lootEntries[0].item_name}
                wowheadId={reassignModal.lootEntries[0].item_wowhead_id}
              />
            ) : (
              <span>{reassignModal?.lootEntries.length} items from {reassignModal?.currentMember.character_name}</span>
            )}
          </ModalDescription>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {reassignModal?.lootEntries.map(loot => (
              <div key={loot.id} className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <ItemLink name={loot.item_name} wowheadId={loot.item_wowhead_id} />
                </div>
                <Select
                  variant="rounded"
                  value=""
                  onChange={(e) => {
                    const member = members.find(m => m.character_id === e.target.value)
                    if (member && reassignModal) {
                      reassignLoot(loot.id, member.character_id, member.character_name)
                    }
                  }}
                >
                  <option value="" disabled>Select new owner...</option>
                  {members
                    .filter(m => m.character_id !== reassignModal?.currentMember.character_id)
                    .map(m => (
                      <option key={m.character_id} value={m.character_id}>
                        {m.character_name} ({m.class_name})
                      </option>
                    ))
                  }
                </Select>
              </div>
            ))}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setReassignModal(null)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>

      {ConfirmDialog}
    </div>
  )
}
