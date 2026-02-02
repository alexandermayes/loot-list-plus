'use client'

export const dynamic = 'force-dynamic'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowDown01Icon, ArrowUp01Icon, Upload01Icon, Cancel01Icon } from '@hugeicons/core-free-icons'
import LootHistoryTab from './components/LootHistoryTab'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
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
import { useConfirm } from '@/components/ui/confirm-modal'
import { SegmentedControl } from '@/components/ui/segmented-control'

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
  const [raidLoot, setRaidLoot] = useState<Record<string, RaidLootEntry[]>>({})
  const [expandedRaid, setExpandedRaid] = useState<string | null>(null)
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
  const [activeTab, setActiveTab] = useState<'tracking' | 'history'>('tracking')

  // For legacy compatibility
  const [importData, setImportData] = useState('')
  const [importType, setImportType] = useState<'attendance' | 'loot' | 'signup'>('attendance')

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, isOfficer, loading: guildLoading, currentExpansion } = useGuildContext()
  const { showNotification } = useNotification()
  const { confirm, ConfirmDialog } = useConfirm()

  useEffect(() => {
    document.title = activeTab === 'tracking' ? 'LootList+ • Raid Tracking' : 'LootList+ • Loot History'
  }, [activeTab])

  // Populate form when opening edit modal
  useEffect(() => {
    if (showImportModal?.isEdit) {
      const raidId = showImportModal.raidId
      const raidDate = showImportModal.date
      const raidAttendance = attendance[raidId] || {}

      console.log('📝 Pre-filling edit modal for raid:', raidId)
      console.log('📝 raidLoot state:', raidLoot)
      console.log('📝 raidLoot[raidId]:', raidLoot[raidId])

      // Pre-fill attendance
      const attendedNames = members
        .filter(m => raidAttendance[m.character_id]?.attended)
        .map(m => m.character_name)
      const unlinkedNames = (unlinkedAttendees[raidId] || [])
        .filter(u => u.status.attended)
        .map(u => u.character_name)
      setAttendanceData([...attendedNames, ...unlinkedNames].join('\n'))

      // Pre-fill signups
      const signedUpNames = members
        .filter(m => raidAttendance[m.character_id]?.signed_up)
        .map(m => m.character_name)
      const unlinkedSignups = (unlinkedAttendees[raidId] || [])
        .filter(u => u.status.signed_up)
        .map(u => u.character_name)
      setSignupsData([...signedUpNames, ...unlinkedSignups].join('\n'))

      // Pre-fill loot (convert back to Gargul format: DATE;[ITEM_ID];CHARACTER)
      const lootEntries = raidLoot[raidId] || []
      console.log('📝 Loot entries to pre-fill:', lootEntries.length)
      const formattedDate = raidDate.replace(/-/g, '/').split('/').reverse().join('/')
      const lootLines = lootEntries.map(entry =>
        `${formattedDate};[${entry.item_wowhead_id}];${entry.character_name}`
      )
      console.log('📝 Formatted loot lines:', lootLines)
      setLootData(lootLines.join('\n'))
    }
  }, [showImportModal, attendance, unlinkedAttendees, members, raidLoot])

  useEffect(() => {
    if (guildLoading) return

    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }

      if (!isOfficer) {
        router.push('/overview')
        return
      }

      if (!activeGuild || !currentExpansion) {
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
          second_raid_day: settings.second_raid_day
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
        await generateRaidDates(activeGuild.id, settings, currentExpansion)
      }

      setLoading(false)
    }

    loadData()
  }, [guildLoading, activeGuild, isOfficer, currentExpansion])

  const generateRaidDates = async (guildId: string, settings: any, expansion: any) => {
    // Use expansion raid schedule if available, fall back to guild settings for backwards compatibility
    const raidScheduleSource = expansion?.raid_days_per_week != null ? expansion : settings
    const { raid_days_per_week, first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day } = raidScheduleSource

    console.log('🔧 Generating raid dates with schedule:', {
      source: expansion?.raid_days_per_week != null ? 'expansion' : 'guild_settings',
      raid_days_per_week,
      first_raid_day,
      second_raid_day,
      third_raid_day,
      fourth_raid_day,
      fifth_raid_day,
      expansion_name: expansion?.expansion_name,
      raid_start_date: expansion?.raid_start_date
    })

    const raidDays = [first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day]
      .filter(day => day !== null && day !== undefined)
      .slice(0, raid_days_per_week)

    console.log('📋 Raid days of week:', raidDays, '(0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat)')

    // Generate dates: from expansion raid_start_date to today only
    const dates: string[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalize to start of day

    // Use expansion raid_start_date or default to 4 weeks ago if not set
    const startDate = expansion?.raid_start_date
      ? new Date(expansion.raid_start_date + 'T00:00:00')
      : new Date(today.getTime() - (4 * 7 * 24 * 60 * 60 * 1000))

    console.log('📅 Date range for', expansion?.expansion_name + ':', {
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
    // Load attendance records
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

    // Load loot history for this raid event
    try {
      console.log('🎁 Loading loot for raid:', raidId)

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

      console.log('🎁 Loot query result:', { lootRecords, lootError })

      if (!lootError && lootRecords) {
        // Get character IDs that are not null
        const characterIds = lootRecords
          .map(r => r.character_id)
          .filter((id): id is string => id !== null)

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
        console.log('🎁 Processed loot entries:', lootEntries.length)
        setRaidLoot(prev => ({ ...prev, [raidId]: lootEntries }))
      } else {
        console.log('❌ Loot history query error:', lootError)
        setRaidLoot(prev => ({ ...prev, [raidId]: [] }))
      }
    } catch (e) {
      console.log('❌ Loot history loading exception:', e)
      setRaidLoot(prev => ({ ...prev, [raidId]: [] }))
    }
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
      case 'attended': return 'bg-success/30 border-success text-success'
      case 'late': return 'bg-yellow-500/30 border-yellow-500 text-yellow-400'
      case 'benched': return 'bg-orange-500/30 border-orange-500 text-orange-400'
      case 'signed-up': return 'bg-accent/30 border-accent text-accent'
      case 'no-show': return 'bg-destructive/30 border-destructive text-destructive'
      default: return 'bg-background-elevated border-border'
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
  const loadLootItems = async () => {
    console.log('📦 loadLootItems called', { activeGuild: activeGuild?.id, currentExpansion: currentExpansion?.expansion_id })
    if (!activeGuild || !currentExpansion) {
      console.log('❌ Missing guild or expansion')
      return
    }

    // Get all raid tiers for this expansion
    const { data: tiers } = await supabase
      .from('raid_tiers')
      .select('id')
      .eq('expansion_id', currentExpansion.expansion_id)

    console.log('📦 Found tiers:', tiers?.length || 0)
    if (!tiers || tiers.length === 0) return

    const tierIds = tiers.map(t => t.id)

    // Get all loot items for these tiers
    const { data: items } = await supabase
      .from('loot_items')
      .select('id, name, wowhead_id, boss_name')
      .in('raid_tier_id', tierIds)
      .order('name')

    console.log('📦 Loaded loot items:', items?.length || 0)
    if (items) {
      setLootItems(items)
    }
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

  // Unified import function - imports all data at once
  const importAllRaidData = async () => {
    console.log('📥 importAllRaidData called', { showImportModal, activeGuild: activeGuild?.id })
    console.log('📥 Data to import:', {
      attendance: attendanceData.trim().slice(0, 100),
      loot: lootData.trim().slice(0, 100),
      signups: signupsData.trim().slice(0, 100)
    })

    if (!showImportModal || !activeGuild) {
      console.log('❌ Import aborted: missing modal or guild')
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

      console.log('📥 Parsed attendance names:', names)
      console.log('📥 Is edit mode:', showImportModal.isEdit)

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
            signed_up: false,
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
            signed_up: false,
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
        // Get all current attendance records for this raid
        const { data: currentRecords } = await supabase
          .from('attendance_records')
          .select('id, character_id, character_name')
          .eq('raid_event_id', showImportModal.raidId)

        if (currentRecords) {
          // Find linked records to remove (character_id not in new list)
          const linkedToRemove = currentRecords
            .filter(r => r.character_id && !linkedCharacterIds.includes(r.character_id))
            .map(r => r.id)

          // Find unlinked records to remove (character_name not in new list)
          const unlinkedToRemove = currentRecords
            .filter(r => !r.character_id && r.character_name && !namesLower.includes(r.character_name.toLowerCase()))
            .map(r => r.id)

          const idsToRemove = [...linkedToRemove, ...unlinkedToRemove]

          if (idsToRemove.length > 0) {
            console.log('📥 Removing', idsToRemove.length, 'attendance records no longer in list')
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
        console.log('📥 Upserting linked attendance:', linkedUpdates.length, 'records')
        const { error: upsertError } = await supabase
          .from('attendance_records')
          .upsert(linkedUpdates, { onConflict: 'raid_event_id,character_id' })
        if (upsertError) {
          console.error('❌ Attendance upsert error:', upsertError)
        } else {
          console.log('✅ Attendance upsert successful')
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
        console.log('📥 Inserting unlinked attendance:', unlinkedUpdates.length, 'records')

        const { error: insertError, data: insertData } = await supabase
          .from('attendance_records')
          .insert(unlinkedUpdates)
          .select()

        if (insertError) {
          console.error('❌ Unlinked attendance insert error:', insertError.message, insertError.code, insertError.details, insertError.hint)
        } else {
          console.log('✅ Unlinked attendance inserted:', insertData?.length, 'records')
        }
      }
    }

    // Import Signups (if enabled and data provided)
    if (guildSettings?.use_signups && signupsData.trim()) {
      const names = parseMRTNames(signupsData)

      const linkedUpdates: any[] = []
      const unlinkedUpdates: any[] = []

      names.forEach(name => {
        const member = members.find(m =>
          m.character_name.toLowerCase() === name.toLowerCase()
        )

        if (member) {
          linkedUpdates.push({
            raid_event_id: showImportModal.raidId,
            character_id: member.character_id,
            user_id: member.user_id,
            signed_up: true,
            attended: false,
            no_call_no_show: false,
            was_late: false,
            was_benched: false
          })
          results.signups.success++
        } else {
          unlinkedUpdates.push({
            raid_event_id: showImportModal.raidId,
            character_name: name,
            signed_up: true,
            attended: false,
            no_call_no_show: false,
            was_late: false,
            was_benched: false
          })
          results.signups.failed++
        }
      })

      // For signups, we need to update existing records or insert new ones
      for (const update of linkedUpdates) {
        await supabase
          .from('attendance_records')
          .upsert({
            ...update,
            // Preserve attended status if record exists
          }, { onConflict: 'raid_event_id,character_id' })
      }
    }

    // Import Loot
    if (lootData.trim()) {
      console.log('📥 Starting loot import...')
      console.log('📥 Available loot items:', lootItems.length)

      const { data: { user } } = await supabase.auth.getUser()
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

      console.log('📥 Loot lines to process:', lines.length)

      for (const line of lines) {
        console.log('📥 Processing line:', line)
        const parts = line.split(';')
        if (parts.length !== 3) {
          results.loot.failed++
          results.loot.errors.push(`Invalid format: ${line}`)
          console.log('❌ Invalid format (expected 3 parts, got', parts.length, ')')
          continue
        }

        const [, itemIdStr, characterName] = parts
        const itemIdMatch = itemIdStr.match(/\[(\d+)\]/)
        if (!itemIdMatch) {
          results.loot.failed++
          results.loot.errors.push(`Invalid item ID: ${itemIdStr}`)
          console.log('❌ Invalid item ID format:', itemIdStr)
          continue
        }

        const itemId = parseInt(itemIdMatch[1])
        console.log('📥 Looking for item with wowhead_id:', itemId)
        const matchedItem = lootItems.find(item => item.wowhead_id === itemId)
        const matchedCharacter = members.find(m =>
          m.character_name.toLowerCase() === characterName.trim().toLowerCase()
        )

        if (!matchedItem) {
          results.loot.failed++
          results.loot.errors.push(`Item #${itemId} not found for ${characterName.trim()}`)
          console.log('❌ Item not found in lootItems')
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
          console.log('✅ Matched item:', matchedItem.name, 'to linked character:', matchedCharacter.character_name)
        } else {
          // Unlinked character - use character_name
          insertData.character_name = charName
          console.log('⚠️ Matched item:', matchedItem.name, 'to unlinked character:', charName)
        }

        const { error } = await supabase
          .from('loot_history')
          .insert(insertData)

        if (error) {
          console.log('❌ Loot insert error:', error.message, error.code)
          if (error.code === '23505') {
            results.loot.errors.push(`${characterName.trim()} already has ${matchedItem.name}`)
          } else {
            results.loot.errors.push(`${characterName.trim()}: ${error.message}`)
          }
          results.loot.failed++
        } else {
          console.log('✅ Loot insert successful')
          results.loot.success++
        }
      }
    }

    // Reload attendance data
    console.log('📥 Reloading attendance data...')
    await loadRaidAttendance(showImportModal.raidId)
    console.log('📥 Import complete! Results:', results)

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
    showNotification(hasErrors ? 'warning' : 'success', `Import complete! ${parts.join(' | ')}`)
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

    // Get current user for awarded_by
    const { data: { user } } = await supabase.auth.getUser()

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
      }
    }

    setImporting(false)
    setPendingLootImports([])
    setShowImportModal(null)
    setImportData('')
    setImportType('attendance')

    // Show results
    showNotification(
      errorCount > 0 ? 'warning' : 'success',
      `Loot import complete! ${successCount} items recorded${errorCount > 0 ? `, ${errorCount} errors` : ''}`
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

  const getAttendanceCount = (raidId: string) => {
    const raidAttendance = attendance[raidId] || {}
    const linkedCount = Object.values(raidAttendance).filter(a => a.attended).length
    const unlinkedCount = (unlinkedAttendees[raidId] || []).filter(u => u.status.attended).length
    return linkedCount + unlinkedCount
  }

  const getSignupCount = (raidId: string) => {
    const raidAttendance = attendance[raidId] || {}
    const linkedCount = Object.values(raidAttendance).filter(a => a.signed_up).length
    const unlinkedCount = (unlinkedAttendees[raidId] || []).filter(u => u.status.signed_up).length
    return linkedCount + unlinkedCount
  }

  const getLootCount = (raidId: string) => {
    return raidLoot[raidId]?.length || 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    )
  }

  const today = new Date().toISOString().split('T')[0]

  // Check if raid start date is in the future
  const raidStartDateInFuture = currentExpansion?.raid_start_date && currentExpansion.raid_start_date > today

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
            { value: 'history', label: 'Loot History' }
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
          <span className="text-muted-foreground">Status Options:</span>
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
            <span className="text-muted-foreground">Benched</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded border bg-accent/30 border-accent"></div>
            <span className="text-muted-foreground">Signed Up</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 rounded border bg-destructive/30 border-destructive"></div>
            <span className="text-muted-foreground">No-Show</span>
          </div>
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
            <h3 className="text-[24px] font-bold text-foreground">{currentExpansion.expansion_name} Raids Haven't Started Yet</h3>
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
                  <HugeiconsIcon icon={ArrowUp01Icon} size={24} className="text-foreground group-hover:text-accent transition flex-shrink-0" />
                ) : (
                  <HugeiconsIcon icon={ArrowDown01Icon} size={24} className="text-foreground group-hover:text-accent transition flex-shrink-0" />
                )}
                <h2 className="text-[24px] font-bold text-foreground group-hover:text-accent transition">{getWeekLabel(weekStart)}</h2>
                <div className="flex-1 h-[1px] bg-foreground/10"></div>
              </button>

              {/* Raid Days for this week */}
              {isWeekExpanded && raids.map((raid) => {
          const isExpanded = expandedRaid === raid.id
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
                  <button
                    onClick={() => toggleRaidExpanded(raid.id)}
                    className="text-foreground hover:text-accent transition"
                  >
                    {isExpanded ? <HugeiconsIcon icon={ArrowUp01Icon} size={20} /> : <HugeiconsIcon icon={ArrowDown01Icon} size={20} />}
                  </button>
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
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {!raid.is_skipped && (
                    <button
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
                      className={`px-3 sm:px-4 py-2 rounded-[52px] text-[12px] sm:text-[13px] font-medium transition flex items-center gap-1 sm:gap-2 ${
                        hasImportedData
                          ? 'bg-success/20 hover:bg-success/30 border border-success/50 text-success'
                          : 'bg-background-elevated hover:bg-muted border border-border text-foreground'
                      }`}
                    >
                      <HugeiconsIcon icon={Upload01Icon} size={16} />
                      <span className="hidden sm:inline">{hasImportedData ? 'Edit Import' : 'Import Data'}</span>
                      <span className="sm:hidden">{hasImportedData ? 'Edit' : 'Import'}</span>
                    </button>
                  )}
                  <button
                    onClick={() => toggleSkipDay(raid.id, raid.is_skipped)}
                    className={`px-3 sm:px-4 py-2 rounded-[52px] text-[12px] sm:text-[13px] font-medium transition ${
                      raid.is_skipped
                        ? 'bg-destructive/30 text-destructive hover:bg-destructive/40 border border-destructive'
                        : 'bg-background-elevated text-foreground-muted hover:bg-muted border border-border'
                    }`}
                  >
                    {raid.is_skipped ? 'Unskip' : 'Skip Day'}
                  </button>
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
                      <h4 className="text-[16px] font-semibold text-foreground mb-2">No Raiders with Approved Loot Lists</h4>
                      <p className="text-foreground-muted text-[13px] max-w-md mx-auto">
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
                              <p className="text-[11px] text-foreground-muted mt-0.5">{member.class_name}</p>
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
                                <p className="font-medium text-muted-foreground">
                                  {attendee.character_name}
                                </p>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-yellow-500/30 text-yellow-400 border border-yellow-500/50">
                                  Pending
                                </span>
                              </div>
                              <p className="text-[11px] text-foreground-muted mt-0.5">No account</p>
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

                  {/* Loot Section */}
                  {raidLoot[raid.id] && raidLoot[raid.id].length > 0 && (
                    <div className="mt-6 pt-6 border-t border-border">
                      <h4 className="text-[14px] font-semibold text-foreground mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Loot Awarded ({raidLoot[raid.id].length} items)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {raidLoot[raid.id].map(loot => (
                          <div
                            key={loot.id}
                            className="flex items-center justify-between px-4 py-2.5 bg-muted border border-border-strong rounded-lg group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className="font-medium text-[13px] truncate"
                                style={{ color: loot.character_class_color }}
                              >
                                {loot.character_name}
                              </span>
                              <span className="text-foreground-muted text-[12px]">→</span>
                              <span className="text-[13px] truncate">
                                <ItemLink name={loot.item_name} wowheadId={loot.item_wowhead_id} />
                              </span>
                            </div>
                            <button
                              onClick={() => deleteLootEntry(loot.id, raid.id)}
                              className="p-1.5 text-foreground-muted hover:text-destructive hover:bg-destructive/10 rounded-md transition opacity-0 group-hover:opacity-100"
                              title="Remove loot entry"
                            >
                              <HugeiconsIcon icon={Cancel01Icon} size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
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
          <label className="block text-sm text-muted-foreground mb-2">Reason for skipping</label>
          <input
            type="text"
            value={skipReason}
            onChange={e => setSkipReason(e.target.value)}
            placeholder="e.g., Holiday, Cancelled, Not enough signups..."
            className="w-full px-4 py-3 bg-transparent border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-accent transition placeholder:text-muted-foreground"
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowSkipModal(null)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={confirmSkipDay}>
            Skip Day
          </Button>
        </ModalFooter>
      </Modal>

      {/* Import Modal - Unified Form */}
      <Modal
        open={!!showImportModal}
        onClose={() => {
          setShowImportModal(null)
          setAttendanceData('')
          setLootData('')
          setSignupsData('')
        }}
        size="xl"
      >
        <ModalHeader onClose={() => setShowImportModal(null)}>
          <ModalTitle>{showImportModal?.isEdit ? 'Edit Raid Data' : 'Import Raid Data'}</ModalTitle>
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
                <label className="block text-md font-semibold text-foreground">
                  Attendance <span className="text-accent">*</span>
                </label>
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
              <textarea
                value={attendanceData}
                onChange={e => setAttendanceData(e.target.value)}
                placeholder="Paste character names (comma-separated or one per line)&#10;&#10;Example:&#10;Headjaws&#10;Calonise&#10;Leroyspankin"
                className="w-full h-44 px-4 py-3 bg-transparent border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-accent font-mono placeholder:text-muted-foreground resize-none"
              />
            </div>

            {/* Loot Section */}
            <div className="space-y-3">
              <div>
                <label className="block text-md font-semibold text-foreground">
                  Loot <span className="text-accent">*</span>
                </label>
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
              <textarea
                value={lootData}
                onChange={e => setLootData(e.target.value)}
                placeholder="DATE;[ITEM_ID];CHARACTER&#10;&#10;Example:&#10;12/15/2024;[16859];Lukasdnmd&#10;12/15/2024;[18203];Headjaws"
                className="w-full h-44 px-4 py-3 bg-transparent border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-accent font-mono placeholder:text-muted-foreground resize-none"
              />
            </div>
          </div>

          {/* Signups Section - Only if enabled */}
          {guildSettings?.use_signups && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-md font-semibold text-foreground">
                    Signups <span className="text-muted-foreground text-sm font-normal">(optional)</span>
                  </label>
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
              <textarea
                value={signupsData}
                onChange={e => setSignupsData(e.target.value)}
                placeholder="Paste character names (comma-separated or one per line)&#10;&#10;Example: Headjaws, Calonise, Leroyspankin, Nardziz"
                className="w-full h-24 px-4 py-3 bg-transparent border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-accent font-mono placeholder:text-muted-foreground resize-none"
              />
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => {
              setShowImportModal(null)
              setAttendanceData('')
              setLootData('')
              setSignupsData('')
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={importAllRaidData}
            disabled={importing || (!attendanceData.trim() && !lootData.trim())}
            loading={importing}
          >
            {showImportModal?.isEdit ? 'Save Changes' : 'Import All'}
          </Button>
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
          <input
            type="text"
            value={lootSearchQuery}
            onChange={e => setLootSearchQuery(e.target.value)}
            placeholder="Search for item by name..."
            className="w-full px-4 py-3 bg-transparent border border-border rounded-xl text-foreground text-sm focus:outline-none focus:border-accent placeholder:text-muted-foreground"
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
                <button
                  key={item.id}
                  onClick={() => handleLootItemSelection(item)}
                  className="w-full px-4 py-3 bg-background-elevated hover:bg-muted border border-border rounded-xl text-left transition"
                >
                  <p className="text-foreground text-sm font-medium">{item.name}</p>
                  <p className="text-muted-foreground text-xs">{item.boss_name} • ID: {item.wowhead_id}</p>
                </button>
              ))}
            {lootItems.filter(item =>
              lootSearchQuery.length === 0 ||
              item.name.toLowerCase().includes(lootSearchQuery.toLowerCase())
            ).length === 0 && (
              <p className="text-muted-foreground text-sm text-center py-4">No items found</p>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={skipLootItemSelection}>
            Skip This Item
          </Button>
        </ModalFooter>
      </Modal>

      {ConfirmDialog}
    </div>
  )
}
