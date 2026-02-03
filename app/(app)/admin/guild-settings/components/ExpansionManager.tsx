'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useCallback } from 'react'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, ArrowRight01Icon, ArrowDown01Icon, ArrowUp01Icon, Settings01Icon, Globe02Icon, RepeatIcon, CalendarCheckIn01Icon, Layers01Icon } from '@hugeicons/core-free-icons'
import { getRaidIcon, getRaidShorthand } from '@/utils/raidIcons'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { DatePicker } from '@/components/ui/date-picker'
import { getExpansionVisuals } from '@/utils/expansionVisuals'

interface GuildExpansion {
  expansion_id: string
  expansion_name: string
  raid_start_date: string | null
  is_current: boolean
  created_at: string
  raid_days_per_week: number | null
  first_raid_day: number | null
  second_raid_day: number | null
  third_raid_day: number | null
  fourth_raid_day: number | null
  fifth_raid_day: number | null
  timezone: string
}

interface RaidScheduleState {
  raidDaysPerWeek: number
  raidDays: (number | null)[]
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'US Eastern (New York)' },
  { value: 'America/Chicago', label: 'US Central (Chicago)' },
  { value: 'America/Denver', label: 'US Mountain (Denver)' },
  { value: 'America/Los_Angeles', label: 'US Pacific (Los Angeles)' },
  { value: 'Europe/London', label: 'UK (London)' },
  { value: 'Europe/Paris', label: 'Central Europe (Paris)' },
  { value: 'Europe/Berlin', label: 'Central Europe (Berlin)' },
  { value: 'Australia/Sydney', label: 'Australia Eastern (Sydney)' },
  { value: 'Australia/Perth', label: 'Australia Western (Perth)' },
  { value: 'Asia/Tokyo', label: 'Japan (Tokyo)' },
  { value: 'Asia/Seoul', label: 'Korea (Seoul)' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'UTC', label: 'UTC' },
]

const getBrowserTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'America/New_York'
  }
}

const getDayName = (dayIndex: number | null): string => {
  if (dayIndex === null || dayIndex < 0 || dayIndex > 6) return ''
  return DAY_NAMES[dayIndex]
}

const getRaidScheduleSummary = (exp: GuildExpansion): string => {
  const days: string[] = []
  if (exp.first_raid_day !== null) days.push(getDayName(exp.first_raid_day))
  if (exp.second_raid_day !== null) days.push(getDayName(exp.second_raid_day))
  if (exp.third_raid_day !== null) days.push(getDayName(exp.third_raid_day))
  if (exp.fourth_raid_day !== null) days.push(getDayName(exp.fourth_raid_day))
  if (exp.fifth_raid_day !== null) days.push(getDayName(exp.fifth_raid_day))

  if (days.length === 0) return 'No schedule set'
  return `${days.length} day${days.length > 1 ? 's' : ''}/week: ${days.join(', ')}`
}

interface AvailableExpansion {
  name: string
  hasData: boolean
}

interface ExpansionTierInfo {
  currentPhase: number | null
  activeRaids: { name: string; phase: number | null }[]
}

export default function ExpansionManager() {
  const [guildExpansions, setGuildExpansions] = useState<GuildExpansion[]>([])
  const [availableExpansions, setAvailableExpansions] = useState<AvailableExpansion[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [raidStartDates, setRaidStartDates] = useState<Record<string, string>>({})
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})
  const [raidSchedules, setRaidSchedules] = useState<Record<string, RaidScheduleState>>({})
  const [originalSchedules, setOriginalSchedules] = useState<Record<string, RaidScheduleState>>({})
  const [timezones, setTimezones] = useState<Record<string, string>>({})
  const [originalTimezones, setOriginalTimezones] = useState<Record<string, string>>({})
  const [originalRaidStartDates, setOriginalRaidStartDates] = useState<Record<string, string>>({})
  const [expansionTierInfo, setExpansionTierInfo] = useState<Record<string, ExpansionTierInfo>>({})

  const supabase = createClient()
  const { activeGuild, refreshExpansions } = useGuildContext()
  const { showNotification } = useNotification()

  const loadData = useCallback(async () => {
    if (!activeGuild) return

    setLoading(true)
    try {
      // Load guild's expansions
      const { data: expansions, error: expError } = await supabase
        .rpc('get_guild_expansions', { p_guild_id: activeGuild.id })

      if (expError) {
        console.error('Error loading expansions:', expError)
        showNotification('error', 'Couldn\'t load expansions. Check your connection and try again.')
      } else {
        setGuildExpansions(expansions || [])

        // Initialize raid start dates, schedules, and timezones
        const dates: Record<string, string> = {}
        const schedules: Record<string, RaidScheduleState> = {}
        const tzs: Record<string, string> = {}
        expansions?.forEach((exp: GuildExpansion) => {
          if (exp.raid_start_date) {
            dates[exp.expansion_id] = exp.raid_start_date
          }
          // Initialize raid schedule state
          const raidDays: (number | null)[] = [
            exp.first_raid_day,
            exp.second_raid_day,
            exp.third_raid_day,
            exp.fourth_raid_day,
            exp.fifth_raid_day
          ]
          schedules[exp.expansion_id] = {
            raidDaysPerWeek: exp.raid_days_per_week ?? 2,
            raidDays
          }
          // Initialize timezone
          tzs[exp.expansion_id] = exp.timezone || getBrowserTimezone()
        })
        setRaidStartDates(dates)
        setOriginalRaidStartDates(JSON.parse(JSON.stringify(dates)))
        setRaidSchedules(schedules)
        setOriginalSchedules(JSON.parse(JSON.stringify(schedules)))
        setTimezones(tzs)
        setOriginalTimezones(JSON.parse(JSON.stringify(tzs)))

        // Load tier info for each expansion
        const tierInfoMap: Record<string, ExpansionTierInfo> = {}
        for (const exp of (expansions || [])) {
          // Get current phase from expansion
          const { data: expData } = await supabase
            .from('expansions')
            .select('current_phase')
            .eq('id', exp.expansion_id)
            .single()

          // Get active raids for this expansion (only up to current phase)
          const currentPhase = expData?.current_phase
          const { data: tiersData } = await supabase
            .from('raid_tiers')
            .select('name, phase, is_guild_active')
            .eq('expansion_id', exp.expansion_id)
            .eq('is_guild_active', true)
            .lte('phase', currentPhase ?? 99)

          tierInfoMap[exp.expansion_id] = {
            currentPhase: expData?.current_phase || null,
            activeRaids: (tiersData || []).map(t => ({ name: t.name, phase: t.phase }))
          }
        }
        setExpansionTierInfo(tierInfoMap)
      }

      // Load available expansions
      const response = await fetch('/api/expansions/available')
      if (response.ok) {
        const data = await response.json()
        setAvailableExpansions(data.expansions || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      showNotification('error', 'Couldn\'t load data. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [activeGuild, supabase, showNotification])

  useEffect(() => {
    if (activeGuild) {
      loadData()
    }
  }, [activeGuild, loadData])

  const handleAddExpansion = async (expansionName: string) => {
    if (!activeGuild) return

    setAdding(true)

    try {
      const response = await fetch(`/api/guilds/${activeGuild.id}/expansions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expansionName,
          setAsCurrent: guildExpansions.length === 0 // Set as current if it's the first expansion
        })
      })

      const data = await response.json()

      if (!response.ok) {
        showNotification('error', data.error || 'Couldn\'t add expansion. Try again.')
        return
      }

      showNotification('success', data.message || 'Expansion added')
      await loadData()
    } catch (error: unknown) {
      console.error('Error adding expansion:', error)
      const message = error instanceof Error ? error.message : 'Couldn\'t add expansion. Try again.'
      showNotification('error', message)
    } finally {
      setAdding(false)
    }
  }

  const handleSetCurrent = async (expansionId: string) => {
    if (!activeGuild) return

    setUpdating(expansionId)

    try {
      const response = await fetch(`/api/guilds/${activeGuild.id}/expansions/${expansionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setAsCurrent: true })
      })

      const data = await response.json()

      if (!response.ok) {
        showNotification('error', data.error || 'Couldn\'t set current expansion. Try again.')
        return
      }

      showNotification('success', data.message || 'Expansion updated')
      await loadData()
      // Refresh GuildContext so other pages get the updated current expansion
      await refreshExpansions()
    } catch (error: unknown) {
      console.error('Error setting current expansion:', error)
      const message = error instanceof Error ? error.message : 'Couldn\'t update expansion. Try again.'
      showNotification('error', message)
    } finally {
      setUpdating(null)
    }
  }

  const handleSaveAllSettings = async (expansionId: string) => {
    if (!activeGuild) return

    const schedule = raidSchedules[expansionId]
    if (!schedule) return

    setUpdating(expansionId)

    try {
      const response = await fetch(`/api/guilds/${activeGuild.id}/expansions/${expansionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raidStartDate: raidStartDates[expansionId] || null,
          timezone: timezones[expansionId],
          raidDaysPerWeek: schedule.raidDaysPerWeek,
          firstRaidDay: schedule.raidDays[0],
          secondRaidDay: schedule.raidDays[1],
          thirdRaidDay: schedule.raidDays[2],
          fourthRaidDay: schedule.raidDays[3],
          fifthRaidDay: schedule.raidDays[4]
        })
      })

      const data = await response.json()

      if (!response.ok) {
        showNotification('error', data.error || 'Couldn\'t save settings. Try again.')
        return
      }

      showNotification('success', 'Raid schedule saved')
      // Update all originals to match current
      setOriginalRaidStartDates(prev => ({
        ...prev,
        [expansionId]: raidStartDates[expansionId] || ''
      }))
      setOriginalTimezones(prev => ({
        ...prev,
        [expansionId]: timezones[expansionId]
      }))
      setOriginalSchedules(prev => ({
        ...prev,
        [expansionId]: JSON.parse(JSON.stringify(schedule))
      }))
      // Refresh GuildContext so other pages get the updated expansion data
      await refreshExpansions()
    } catch (error: unknown) {
      console.error('Error saving settings:', error)
      const message = error instanceof Error ? error.message : 'Couldn\'t save. Try again.'
      showNotification('error', message)
    } finally {
      setUpdating(null)
    }
  }

  const updateTimezone = (expansionId: string, newTimezone: string) => {
    setTimezones(prev => ({ ...prev, [expansionId]: newTimezone }))
  }

  const hasAnyChanges = (expansionId: string): boolean => {
    // Check raid start date
    const currentDate = raidStartDates[expansionId] || ''
    const originalDate = originalRaidStartDates[expansionId] || ''
    if (currentDate !== originalDate) return true

    // Check timezone
    const currentTz = timezones[expansionId] || ''
    const originalTz = originalTimezones[expansionId] || ''
    if (currentTz !== originalTz) return true

    // Check schedule
    const current = raidSchedules[expansionId]
    const original = originalSchedules[expansionId]
    if (!current || !original) return false
    if (current.raidDaysPerWeek !== original.raidDaysPerWeek) return true
    return current.raidDays.some((day, idx) => day !== original.raidDays[idx])
  }

  const updateRaidDaysPerWeek = (expansionId: string, count: number) => {
    setRaidSchedules(prev => {
      const current = prev[expansionId]
      if (!current) return prev

      // When changing days per week, adjust the raidDays array
      const newRaidDays = [...current.raidDays]
      // Clear days beyond the new count
      for (let i = count; i < 5; i++) {
        newRaidDays[i] = null
      }
      // Ensure we have defaults for active days
      for (let i = 0; i < count; i++) {
        if (newRaidDays[i] === null) {
          // Find next available day
          const usedDays = new Set(newRaidDays.filter(d => d !== null))
          for (let d = 0; d <= 6; d++) {
            if (!usedDays.has(d)) {
              newRaidDays[i] = d
              break
            }
          }
        }
      }

      return {
        ...prev,
        [expansionId]: {
          raidDaysPerWeek: count,
          raidDays: newRaidDays
        }
      }
    })
  }

  const updateRaidDay = (expansionId: string, dayIndex: number, value: number) => {
    setRaidSchedules(prev => {
      const current = prev[expansionId]
      if (!current) return prev

      const newRaidDays = [...current.raidDays]
      newRaidDays[dayIndex] = value

      return {
        ...prev,
        [expansionId]: {
          ...current,
          raidDays: newRaidDays
        }
      }
    })
  }

  const toggleExpanded = (expansionId: string) => {
    setExpandedCards(prev => ({
      ...prev,
      [expansionId]: !prev[expansionId]
    }))
  }

  // Get expansions that can be added (have data and not already added)
  // Handle name variations (e.g., 'Classic' vs 'Classic WoW')
  const addableExpansions = availableExpansions.filter(
    exp => exp.hasData && !guildExpansions.some(ge =>
      ge.expansion_name === exp.name ||
      ge.expansion_name.toLowerCase().startsWith(exp.name.toLowerCase()) ||
      exp.name.toLowerCase().startsWith(ge.expansion_name.toLowerCase())
    )
  )

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-muted-foreground">Loading expansions...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Guild Expansions */}
      {guildExpansions.length > 0 && (
        <div>
          <h3 className="text-[16px] font-semibold text-foreground mb-4">Your Expansions</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Keep expansions in original order (by created_at) */}
            {guildExpansions.map((exp) => {
              const visuals = getExpansionVisuals(exp.expansion_name)
              const isExpanded = expandedCards[exp.expansion_id] || false
              const schedule = raidSchedules[exp.expansion_id]

              return (
                <div
                  key={exp.expansion_id}
                  className="relative overflow-hidden rounded-xl border"
                  style={{
                    background: visuals.bgColor,
                    borderColor: exp.is_current ? visuals.accentColor : visuals.borderColor
                  }}
                >
                  {/* Subtle gradient overlay */}
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{ background: visuals.gradient }}
                  />

                  <div className="relative p-5">
                    <div className="flex items-start gap-4 mb-4">
                      {/* Expansion Icon */}
                      <div
                        className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border"
                        style={{ borderColor: visuals.borderColor }}
                      >
                        <img
                          src={visuals.logoUrl}
                          alt={exp.expansion_name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3
                            className="text-lg font-semibold truncate"
                            style={{ color: visuals.textColor }}
                          >
                            {exp.expansion_name}
                          </h3>
                          {exp.is_current && (
                            <span
                              className="px-3 py-1 text-xs font-semibold rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: `${visuals.accentColor}20`,
                                color: visuals.accentColor,
                                border: `1px solid ${visuals.accentColor}40`
                              }}
                            >
                              CURRENT
                            </span>
                          )}
                        </div>
                        <p className="text-sm" style={{ color: `${visuals.textColor}80` }}>
                          Added {new Date(exp.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {!exp.is_current && (
                        <Button
                          onClick={() => handleSetCurrent(exp.expansion_id)}
                          disabled={updating === exp.expansion_id}
                          variant="primary"
                          size="sm"
                          className="flex-shrink-0"
                          style={{
                            backgroundColor: visuals.accentColor,
                            borderColor: visuals.accentColor
                          }}
                        >
                          {updating === exp.expansion_id ? 'Setting...' : 'Set as Current'}
                        </Button>
                      )}
                    </div>

                    {/* Raid Schedule Accordion */}
                    {(() => {
                      const activeDays = schedule ? schedule.raidDays.slice(0, schedule.raidDaysPerWeek).filter(d => d !== null) : []

                      return (
                        <div
                          className="mt-4 rounded-xl transition-all"
                          style={{
                            backgroundColor: `${visuals.accentColor}10`,
                            border: `1px solid ${visuals.accentColor}30`
                          }}
                        >
                          {/* Accordion Header - clickable summary */}
                          <button
                            onClick={() => toggleExpanded(exp.expansion_id)}
                            className="w-full text-left p-4 rounded-xl transition-colors hover:bg-white/5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <HugeiconsIcon
                                  icon={Settings01Icon}
                                  size={16}
                                  style={{ color: visuals.accentColor }}
                                />
                                <span
                                  className="text-sm font-semibold"
                                  style={{ color: visuals.textColor }}
                                >
                                  Raid Schedule
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {activeDays.length > 0 ? (
                                  activeDays.map((day, idx) => (
                                    <span
                                      key={idx}
                                      className="px-2 py-0.5 text-[10px] font-bold rounded"
                                      style={{
                                        backgroundColor: `${visuals.accentColor}25`,
                                        color: visuals.accentColor
                                      }}
                                    >
                                      {getDayName(day)}
                                    </span>
                                  ))
                                ) : (
                                  <span
                                    className="text-[11px]"
                                    style={{ color: `${visuals.textColor}60` }}
                                  >
                                    Not configured
                                  </span>
                                )}
                                <HugeiconsIcon
                                  icon={isExpanded ? ArrowUp01Icon : ArrowDown01Icon}
                                  size={16}
                                  style={{ color: visuals.accentColor }}
                                />
                              </div>
                            </div>
                            {/* Schedule summary */}
                            {exp.raid_start_date && (
                              <p
                                className="text-[11px] mt-1"
                                style={{ color: `${visuals.textColor}60` }}
                              >
                                Started {new Date(exp.raid_start_date).toLocaleDateString()}
                              </p>
                            )}
                          </button>

                          {/* Expanded Content */}
                          {isExpanded && schedule && (
                            <div className="mx-3 mb-3 p-4 rounded-lg bg-background-elevated border border-border space-y-5">
                              {/* Raid Start Date & Timezone - side by side */}
                              <div className="grid grid-cols-2 gap-4">
                                {/* Raid Start Date */}
                                <div className="space-y-2">
                                  <Label>Raid Start Date</Label>
                                  <DatePicker
                                    value={raidStartDates[exp.expansion_id] || ''}
                                    onChange={(e) => setRaidStartDates({
                                      ...raidStartDates,
                                      [exp.expansion_id]: e.target.value
                                    })}
                                    variant="rounded"
                                  />
                                </div>

                                {/* Timezone */}
                                <div className="space-y-2">
                                  <Label className="flex items-center gap-2">
                                    <HugeiconsIcon icon={Globe02Icon} size={14} className="text-muted-foreground" />
                                    Timezone
                                  </Label>
                                  <Select
                                    value={timezones[exp.expansion_id] || 'America/New_York'}
                                    onChange={(e) => updateTimezone(exp.expansion_id, e.target.value)}
                                    variant="rounded"
                                  >
                                    {COMMON_TIMEZONES.map((tz) => (
                                      <option key={tz.value} value={tz.value}>
                                        {tz.label}
                                      </option>
                                    ))}
                                    {/* Include current timezone if not in common list */}
                                    {timezones[exp.expansion_id] &&
                                     !COMMON_TIMEZONES.find(tz => tz.value === timezones[exp.expansion_id]) && (
                                      <option value={timezones[exp.expansion_id]}>
                                        {timezones[exp.expansion_id]}
                                      </option>
                                    )}
                                  </Select>
                                </div>
                              </div>

                              {/* Raid Days Per Week */}
                              <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                  <HugeiconsIcon icon={RepeatIcon} size={14} className="text-muted-foreground" />
                                  Days Per Week
                                </Label>
                                <SegmentedControl
                                  options={[
                                    { value: '1', label: '1' },
                                    { value: '2', label: '2' },
                                    { value: '3', label: '3' },
                                    { value: '4', label: '4' },
                                    { value: '5', label: '5' }
                                  ]}
                                  value={String(schedule.raidDaysPerWeek)}
                                  onChange={(val) => updateRaidDaysPerWeek(exp.expansion_id, parseInt(val))}
                                  size="sm"
                                />
                              </div>

                              {/* Raid Day Selectors */}
                              <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                  <HugeiconsIcon icon={CalendarCheckIn01Icon} size={14} className="text-muted-foreground" />
                                  Raid Days
                                </Label>
                                <div className="grid grid-cols-2 gap-3">
                                  {Array.from({ length: schedule.raidDaysPerWeek }).map((_, idx) => (
                                    <div key={idx} className="space-y-1">
                                      <label className="block text-xs text-muted-foreground">
                                        {idx === 0 ? 'First' : idx === 1 ? 'Second' : idx === 2 ? 'Third' : idx === 3 ? 'Fourth' : 'Fifth'} Day
                                      </label>
                                      <Select
                                        value={String(schedule.raidDays[idx] ?? '')}
                                        onChange={(e) => updateRaidDay(exp.expansion_id, idx, parseInt(e.target.value))}
                                        variant="rounded"
                                      >
                                        {DAY_NAMES.map((day, dayIdx) => (
                                          <option key={dayIdx} value={dayIdx}>
                                            {day}
                                          </option>
                                        ))}
                                      </Select>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Save Button */}
                              <div className="pt-3 border-t border-border">
                                <Button
                                  onClick={() => handleSaveAllSettings(exp.expansion_id)}
                                  disabled={updating === exp.expansion_id || !hasAnyChanges(exp.expansion_id)}
                                  variant="secondary"
                                  size="sm"
                                  loading={updating === exp.expansion_id}
                                >
                                  Save
                                </Button>
                                {hasAnyChanges(exp.expansion_id) && (
                                  <span className="ml-3 text-xs text-muted-foreground">
                                    Unsaved changes
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })()}

                    {/* Manage Raid Tiers Link - with active raids info */}
                    {(() => {
                      const tierInfo = expansionTierInfo[exp.expansion_id]
                      const activeRaids = tierInfo?.activeRaids || []
                      // Group raids by phase for display
                      const raidsByPhase = activeRaids.reduce((acc, raid) => {
                        const phase = raid.phase || 0
                        if (!acc[phase]) acc[phase] = []
                        acc[phase].push(raid)
                        return acc
                      }, {} as Record<number, typeof activeRaids>)
                      const sortedPhases = Object.keys(raidsByPhase).map(Number).sort((a, b) => a - b)

                      return (
                        <Link
                          href={`/admin/expansions/${exp.expansion_id}`}
                          className="block mt-4 p-4 rounded-xl transition-colors hover:bg-white/5"
                          style={{
                            backgroundColor: `${visuals.accentColor}10`,
                            border: `1px solid ${visuals.accentColor}30`
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <HugeiconsIcon
                                icon={Layers01Icon}
                                size={16}
                                style={{ color: visuals.accentColor }}
                              />
                              <span
                                className="text-sm font-semibold"
                                style={{ color: visuals.textColor }}
                              >
                                Raid Tiers
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {sortedPhases.map((phase) => (
                                <span
                                  key={phase}
                                  className="px-2 py-0.5 text-[10px] font-bold rounded"
                                  style={{
                                    backgroundColor: `${visuals.accentColor}25`,
                                    color: visuals.accentColor
                                  }}
                                >
                                  P{phase}
                                </span>
                              ))}
                              <HugeiconsIcon
                                icon={ArrowRight01Icon}
                                size={16}
                                style={{ color: visuals.accentColor }}
                              />
                            </div>
                          </div>
                          {/* All active raids */}
                          {activeRaids.length > 0 && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {activeRaids.map((raid) => (
                                <div
                                  key={raid.name}
                                  className="flex items-center gap-1 px-2 py-1 rounded-md"
                                  style={{ backgroundColor: `${visuals.borderColor}40` }}
                                >
                                  <img
                                    src={getRaidIcon(raid.name)}
                                    alt={raid.name}
                                    className="w-4 h-4 rounded"
                                  />
                                  <span
                                    className="text-[11px] font-medium"
                                    style={{ color: `${visuals.textColor}90` }}
                                  >
                                    {getRaidShorthand(raid.name)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {activeRaids.length === 0 && (
                            <p
                              className="text-[11px]"
                              style={{ color: `${visuals.textColor}60` }}
                            >
                              Configure phases and active raids
                            </p>
                          )}
                        </Link>
                      )
                    })()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add New Expansion */}
      {addableExpansions.length > 0 && (
        <div>
          <h3 className="text-[16px] font-semibold text-foreground mb-4">Add Expansion</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {addableExpansions.map((exp) => {
              const visuals = getExpansionVisuals(exp.name)
              return (
                <div
                  key={exp.name}
                  className="relative overflow-hidden rounded-xl border group cursor-pointer transition-colors duration-200"
                  style={{
                    background: visuals.bgColor,
                    borderColor: visuals.borderColor
                  }}
                  onClick={() => !adding && handleAddExpansion(exp.name)}
                >
                  {/* Background gradient */}
                  <div
                    className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity"
                    style={{ background: visuals.gradient }}
                  />

                  {/* Artwork background */}
                  {visuals.artworkUrl && (
                    <div className="absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity">
                      <img
                        src={visuals.artworkUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="relative p-5 flex items-center gap-4">
                    {/* Expansion Icon */}
                    <div
                      className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2"
                      style={{ borderColor: visuals.accentColor }}
                    >
                      <img
                        src={visuals.logoUrl}
                        alt={exp.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[16px] font-semibold mb-1 truncate"
                        style={{ color: visuals.textColor }}
                      >
                        {exp.name}
                      </p>
                      <p
                        className="text-[12px]"
                        style={{ color: `${visuals.textColor}80` }}
                      >
                        Click to add this expansion
                      </p>
                    </div>

                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: `${visuals.accentColor}20`,
                        border: `1px solid ${visuals.accentColor}40`
                      }}
                    >
                      <HugeiconsIcon icon={Add01Icon} size={20} style={{ color: visuals.accentColor }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {adding && (
            <div className="mt-4 p-4 bg-background-elevated border border-border rounded-xl text-center">
              <p className="text-muted-foreground">Adding expansion... This may take a moment.</p>
            </div>
          )}
        </div>
      )}

      {guildExpansions.length === 0 && addableExpansions.length === 0 && (
        <div className="p-12 bg-background-elevated border border-border rounded-xl text-center">
          <p className="text-muted-foreground text-[16px]">No expansions available to add</p>
        </div>
      )}
    </div>
  )
}
