'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, Calendar01Icon, ArrowRight01Icon, ArrowDown01Icon, ArrowUp01Icon, Settings01Icon } from '@hugeicons/core-free-icons'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/typography'
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
}

interface RaidScheduleState {
  raidDaysPerWeek: number
  raidDays: (number | null)[]
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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

export default function ExpansionsManagementPage() {
  const [guildExpansions, setGuildExpansions] = useState<GuildExpansion[]>([])
  const [availableExpansions, setAvailableExpansions] = useState<AvailableExpansion[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)
  const [raidStartDates, setRaidStartDates] = useState<Record<string, string>>({})
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})
  const [raidSchedules, setRaidSchedules] = useState<Record<string, RaidScheduleState>>({})
  const [originalSchedules, setOriginalSchedules] = useState<Record<string, RaidScheduleState>>({})

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, loading: guildLoading, isOfficer } = useGuildContext()
  const { showNotification } = useNotification()

  useEffect(() => {
    document.title = 'LootList+ • Manage Expansions'
  }, [])

  useEffect(() => {
    if (!guildLoading) {
      if (!isOfficer) {
        router.push('/overview')
        return
      }
      if (activeGuild) {
        loadData()
      }
    }
  }, [guildLoading, activeGuild, isOfficer])

  const loadData = async () => {
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

        // Initialize raid start dates and schedules
        const dates: Record<string, string> = {}
        const schedules: Record<string, RaidScheduleState> = {}
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
        })
        setRaidStartDates(dates)
        setRaidSchedules(schedules)
        setOriginalSchedules(JSON.parse(JSON.stringify(schedules)))
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
  }

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
    } catch (error: any) {
      console.error('Error adding expansion:', error)
      showNotification('error', error.message || 'Couldn\'t add expansion. Try again.')
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
    } catch (error: any) {
      console.error('Error setting current expansion:', error)
      showNotification('error', error.message || 'Couldn\'t update expansion. Try again.')
    } finally {
      setUpdating(null)
    }
  }

  const handleUpdateRaidStartDate = async (expansionId: string) => {
    if (!activeGuild || !raidStartDates[expansionId]) return

    setUpdating(expansionId)

    try {
      const response = await fetch(`/api/guilds/${activeGuild.id}/expansions/${expansionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raidStartDate: raidStartDates[expansionId] })
      })

      const data = await response.json()

      if (!response.ok) {
        showNotification('error', data.error || 'Couldn\'t update raid start date. Try again.')
        return
      }

      showNotification('success', 'Raid start date updated')
      await loadData()
    } catch (error: any) {
      console.error('Error updating raid start date:', error)
      showNotification('error', error.message || 'Couldn\'t update. Try again.')
    } finally {
      setUpdating(null)
    }
  }

  const handleUpdateRaidSchedule = async (expansionId: string) => {
    if (!activeGuild) return

    const schedule = raidSchedules[expansionId]
    if (!schedule) return

    setUpdating(expansionId)

    try {
      const response = await fetch(`/api/guilds/${activeGuild.id}/expansions/${expansionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        showNotification('error', data.error || 'Couldn\'t update raid schedule. Try again.')
        return
      }

      showNotification('success', 'Raid schedule updated')
      // Update original to match current
      setOriginalSchedules(prev => ({
        ...prev,
        [expansionId]: JSON.parse(JSON.stringify(schedule))
      }))
    } catch (error: any) {
      console.error('Error updating raid schedule:', error)
      showNotification('error', error.message || 'Couldn\'t update. Try again.')
    } finally {
      setUpdating(null)
    }
  }

  const hasScheduleChanges = (expansionId: string): boolean => {
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

  if (loading || guildLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-foreground-muted">Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <Heading level={1}>Manage Expansions</Heading>
        <p className="text-muted-foreground mt-1 text-base">
          Add and manage expansions for your guild. Each expansion maintains its own loot lists and raid data.
        </p>
      </div>

      {/* Guild Expansions */}
      {guildExpansions.length > 0 && (
        <div>
          <h2 className="text-[20px] font-semibold text-foreground mb-4">Your Expansions</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sort so current expansion is first */}
            {[...guildExpansions].sort((a, b) => {
              if (a.is_current && !b.is_current) return -1
              if (!a.is_current && b.is_current) return 1
              return 0
            }).map((exp) => {
              const visuals = getExpansionVisuals(exp.expansion_name)
              const isExpanded = expandedCards[exp.expansion_id] || false
              const schedule = raidSchedules[exp.expansion_id]
              const hasChanges = hasScheduleChanges(exp.expansion_id)

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
                    <div
                      className="pt-4 border-t"
                      style={{ borderColor: `${visuals.borderColor}40` }}
                    >
                      {/* Accordion Header - clickable summary */}
                      <button
                        onClick={() => toggleExpanded(exp.expansion_id)}
                        className="w-full flex items-center justify-between p-3 rounded-lg transition hover:bg-black/5"
                      >
                        <div className="flex items-center gap-2">
                          <HugeiconsIcon
                            icon={Settings01Icon}
                            size={16}
                            style={{ color: `${visuals.textColor}80` }}
                          />
                          <span className="text-sm font-medium" style={{ color: visuals.textColor }}>
                            Raid Schedule
                          </span>
                          <span className="text-sm" style={{ color: `${visuals.textColor}60` }}>
                            — {getRaidScheduleSummary(exp)}
                          </span>
                        </div>
                        <HugeiconsIcon
                          icon={isExpanded ? ArrowUp01Icon : ArrowDown01Icon}
                          size={16}
                          style={{ color: `${visuals.textColor}60` }}
                        />
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && schedule && (
                        <div className="mt-3 p-4 rounded-lg bg-background-elevated border border-border space-y-4">
                          {/* Raid Start Date */}
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              <HugeiconsIcon icon={Calendar01Icon} size={14} className="inline mr-2 text-muted-foreground" />
                              Raid Start Date
                            </label>
                            <div className="flex items-center gap-3">
                              <input
                                type="date"
                                value={raidStartDates[exp.expansion_id] || ''}
                                onChange={(e) => setRaidStartDates({
                                  ...raidStartDates,
                                  [exp.expansion_id]: e.target.value
                                })}
                                className="flex-1 px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                              />
                              <Button
                                onClick={() => handleUpdateRaidStartDate(exp.expansion_id)}
                                disabled={updating === exp.expansion_id || !raidStartDates[exp.expansion_id]}
                                variant="secondary"
                                size="sm"
                              >
                                Save
                              </Button>
                            </div>
                          </div>

                          {/* Raid Days Per Week */}
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Days Per Week
                            </label>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((num) => (
                                <button
                                  key={num}
                                  onClick={() => updateRaidDaysPerWeek(exp.expansion_id, num)}
                                  className={`w-10 h-10 rounded-lg text-sm font-medium transition ${
                                    schedule.raidDaysPerWeek === num
                                      ? 'bg-accent text-white'
                                      : 'bg-background border border-border text-foreground hover:border-accent/50'
                                  }`}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Raid Day Selectors */}
                          <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                              Raid Days
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              {Array.from({ length: schedule.raidDaysPerWeek }).map((_, idx) => (
                                <div key={idx}>
                                  <label className="block text-xs text-muted-foreground mb-1">
                                    {idx === 0 ? 'First' : idx === 1 ? 'Second' : idx === 2 ? 'Third' : idx === 3 ? 'Fourth' : 'Fifth'} Day
                                  </label>
                                  <select
                                    value={schedule.raidDays[idx] ?? ''}
                                    onChange={(e) => updateRaidDay(exp.expansion_id, idx, parseInt(e.target.value))}
                                    className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                                  >
                                    {DAY_NAMES.map((day, dayIdx) => (
                                      <option key={dayIdx} value={dayIdx}>
                                        {day}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Save Schedule Button */}
                          <div className="pt-2 border-t border-border">
                            <Button
                              onClick={() => handleUpdateRaidSchedule(exp.expansion_id)}
                              disabled={updating === exp.expansion_id || !hasChanges}
                              variant="primary"
                              size="sm"
                              loading={updating === exp.expansion_id}
                            >
                              Save Schedule
                            </Button>
                            {hasChanges && (
                              <span className="ml-3 text-xs text-muted-foreground">
                                Unsaved changes
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Manage Raid Tiers Link */}
                    <Link
                      href={`/admin/expansions/${exp.expansion_id}`}
                      className="flex items-center justify-between mt-4 p-3 rounded-lg transition hover:bg-black/5"
                      style={{
                        border: `1px solid ${visuals.borderColor}40`
                      }}
                    >
                      <span
                        className="text-sm font-medium"
                        style={{ color: visuals.textColor }}
                      >
                        Manage Raid Tiers
                      </span>
                      <HugeiconsIcon icon={ArrowRight01Icon} size={16}
                        style={{ color: `${visuals.textColor}60` }}
                      />
                    </Link>
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
          <h2 className="text-[20px] font-semibold text-foreground mb-4">Add Expansion</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {addableExpansions.map((exp) => {
              const visuals = getExpansionVisuals(exp.name)
              return (
                <div
                  key={exp.name}
                  className="relative overflow-hidden rounded-xl border group cursor-pointer transition-all duration-200 hover:scale-[1.02]"
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
                      className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all group-hover:scale-110"
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
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110"
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
              <p className="text-foreground-muted">Adding expansion... This may take a moment.</p>
            </div>
          )}
        </div>
      )}

      {guildExpansions.length === 0 && addableExpansions.length === 0 && (
        <div className="p-12 bg-background-elevated border border-border rounded-xl text-center">
          <p className="text-foreground-muted text-[16px]">No expansions available to add</p>
        </div>
      )}
    </div>
  )
}
