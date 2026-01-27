'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, Calendar01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import Link from 'next/link'
import { getExpansionVisuals } from '@/utils/expansionVisuals'

interface GuildExpansion {
  expansion_id: string
  expansion_name: string
  raid_start_date: string | null
  is_current: boolean
  created_at: string
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
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [raidStartDates, setRaidStartDates] = useState<Record<string, string>>({})

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, loading: guildLoading, isOfficer } = useGuildContext()

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
        setMessage({ type: 'error', text: 'Failed to load expansions' })
      } else {
        setGuildExpansions(expansions || [])

        // Initialize raid start dates
        const dates: Record<string, string> = {}
        expansions?.forEach((exp: GuildExpansion) => {
          if (exp.raid_start_date) {
            dates[exp.expansion_id] = exp.raid_start_date
          }
        })
        setRaidStartDates(dates)
      }

      // Load available expansions
      const response = await fetch('/api/expansions/available')
      if (response.ok) {
        const data = await response.json()
        setAvailableExpansions(data.expansions || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setMessage({ type: 'error', text: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  const handleAddExpansion = async (expansionName: string) => {
    if (!activeGuild) return

    setAdding(true)
    setMessage(null)

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
        setMessage({ type: 'error', text: data.error || 'Failed to add expansion' })
        return
      }

      setMessage({ type: 'success', text: data.message || 'Expansion added successfully!' })
      await loadData()
    } catch (error: any) {
      console.error('Error adding expansion:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to add expansion' })
    } finally {
      setAdding(false)
    }
  }

  const handleSetCurrent = async (expansionId: string) => {
    if (!activeGuild) return

    setUpdating(expansionId)
    setMessage(null)

    try {
      const response = await fetch(`/api/guilds/${activeGuild.id}/expansions/${expansionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setAsCurrent: true })
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to set current expansion' })
        return
      }

      setMessage({ type: 'success', text: data.message || 'Current expansion updated!' })
      await loadData()
    } catch (error: any) {
      console.error('Error setting current expansion:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to update' })
    } finally {
      setUpdating(null)
    }
  }

  const handleUpdateRaidStartDate = async (expansionId: string) => {
    if (!activeGuild || !raidStartDates[expansionId]) return

    setUpdating(expansionId)
    setMessage(null)

    try {
      const response = await fetch(`/api/guilds/${activeGuild.id}/expansions/${expansionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raidStartDate: raidStartDates[expansionId] })
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update raid start date' })
        return
      }

      setMessage({ type: 'success', text: 'Raid start date updated!' })
      await loadData()
    } catch (error: any) {
      console.error('Error updating raid start date:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to update' })
    } finally {
      setUpdating(null)
    }
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
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[42px] font-bold text-foreground mb-2">Manage Expansions</h1>
        <p className="text-[16px] text-foreground-muted">
          Add and manage expansions for your guild. Each expansion maintains its own loot lists and raid data.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-xl ${
          message.type === 'success'
            ? 'bg-green-950/50 border border-green-600/50 text-green-200'
            : 'bg-red-950/50 border border-red-600/50 text-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Guild Expansions */}
      {guildExpansions.length > 0 && (
        <div>
          <h2 className="text-[20px] font-semibold text-foreground mb-4">Your Expansions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sort so current expansion is first */}
            {[...guildExpansions].sort((a, b) => {
              if (a.is_current && !b.is_current) return -1
              if (!a.is_current && b.is_current) return 1
              return 0
            }).map((exp) => {
              const visuals = getExpansionVisuals(exp.expansion_name)
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
                    className="absolute inset-0 opacity-30"
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
                            className="text-[18px] font-semibold truncate"
                            style={{ color: visuals.textColor }}
                          >
                            {exp.expansion_name}
                          </h3>
                          {exp.is_current && (
                            <span
                              className="px-3 py-1 text-[11px] font-semibold rounded-full flex-shrink-0"
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
                        <p className="text-[13px]" style={{ color: `${visuals.textColor}99` }}>
                          Added {new Date(exp.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {!exp.is_current && (
                        <button
                          onClick={() => handleSetCurrent(exp.expansion_id)}
                          disabled={updating === exp.expansion_id}
                          className="px-5 py-2 rounded-[52px] text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                          style={{
                            backgroundColor: visuals.accentColor,
                            color: visuals.bgColor
                          }}
                        >
                          {updating === exp.expansion_id ? 'Setting...' : 'Set as Current'}
                        </button>
                      )}
                    </div>

                    {/* Raid Start Date */}
                    <div
                      className="flex items-end gap-3 pt-4 border-t"
                      style={{ borderColor: `${visuals.borderColor}50` }}
                    >
                      <div className="flex-1">
                        <label
                          className="block text-[13px] font-medium mb-2"
                          style={{ color: visuals.textColor }}
                        >
                          <HugeiconsIcon icon={Calendar01Icon} size={16} className="inline mr-2" style={{ color: visuals.accentColor }} />
                          Raid Start Date
                        </label>
                        <input
                          type="date"
                          value={raidStartDates[exp.expansion_id] || ''}
                          onChange={(e) => setRaidStartDates({
                            ...raidStartDates,
                            [exp.expansion_id]: e.target.value
                          })}
                          className="w-full px-4 py-2 rounded-xl text-[14px] focus:outline-none transition"
                          style={{
                            backgroundColor: `${visuals.bgColor}`,
                            border: `1px solid ${visuals.borderColor}`,
                            color: visuals.textColor
                          }}
                        />
                      </div>
                      <button
                        onClick={() => handleUpdateRaidStartDate(exp.expansion_id)}
                        disabled={updating === exp.expansion_id || !raidStartDates[exp.expansion_id]}
                        className="px-5 py-2 rounded-[52px] text-[13px] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          backgroundColor: 'transparent',
                          border: `1px solid ${visuals.borderColor}`,
                          color: visuals.textColor
                        }}
                      >
                        Save Date
                      </button>
                    </div>

                    {/* Manage Raid Tiers Link */}
                    <Link
                      href={`/admin/expansions/${exp.expansion_id}`}
                      className="flex items-center justify-between mt-4 p-3 rounded-xl transition hover:opacity-80"
                      style={{
                        backgroundColor: `${visuals.accentColor}15`,
                        border: `1px solid ${visuals.accentColor}30`
                      }}
                    >
                      <span
                        className="text-[13px] font-medium"
                        style={{ color: visuals.accentColor }}
                      >
                        Manage Raid Tiers
                      </span>
                      <HugeiconsIcon icon={ArrowRight01Icon} size={16}
                        style={{ color: visuals.accentColor }}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
