'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { ArrowLeft, Calendar, Check } from 'lucide-react'
import { getExpansionVisuals } from '@/utils/expansionVisuals'
import { getRaidIcon } from '@/utils/raidIcons'

interface RaidTier {
  id: string
  name: string
  is_active: boolean
  is_guild_active: boolean
  master_sheet_visible: boolean
  submission_deadline: string | null
}

interface Expansion {
  expansion_id: string
  expansion_name: string
  raid_start_date: string | null
  is_current: boolean
}

export default function ExpansionDetailPage({ params }: { params: Promise<{ expansionId: string }> }) {
  const { expansionId } = use(params)
  const [expansion, setExpansion] = useState<Expansion | null>(null)
  const [raidTiers, setRaidTiers] = useState<RaidTier[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [raidStartDate, setRaidStartDate] = useState('')
  const [deadlineInputs, setDeadlineInputs] = useState<Record<string, string>>({})

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, loading: guildLoading, isOfficer } = useGuildContext()

  useEffect(() => {
    if (expansion) {
      document.title = `LootList+ • ${expansion.expansion_name} Raid Tiers`
    }
  }, [expansion])

  useEffect(() => {
    if (!guildLoading) {
      if (!isOfficer) {
        router.push('/dashboard')
        return
      }
      if (activeGuild) {
        loadData()
      }
    }
  }, [guildLoading, activeGuild, isOfficer, expansionId])

  // Define raid tier progression order
  const getRaidTierOrder = (tierName: string): number => {
    const order: Record<string, number> = {
      // Classic
      'Molten Core': 1, 'MC': 1,
      'Onyxia\'s Lair': 2, 'Onyxia': 2,
      'Blackwing Lair': 3, 'BWL': 3,
      'Zul\'Gurub': 4, 'ZG': 4,
      'Ruins of Ahn\'Qiraj': 5, 'AQ20': 5,
      'Temple of Ahn\'Qiraj': 6, 'AQ40': 6,
      'Naxxramas': 7, 'Naxx': 7,
      // TBC
      'Karazhan': 10, 'Kara': 10,
      'Gruul\'s Lair': 11, 'Gruul': 11,
      'Magtheridon\'s Lair': 12, 'Magtheridon': 12, 'Mag': 12,
      'Serpentshrine Cavern': 20, 'SSC': 20,
      'Tempest Keep: The Eye': 21, 'Tempest Keep': 21, 'The Eye': 21, 'TK': 21,
      'Hyjal Summit': 30, 'Mount Hyjal': 30, 'Hyjal': 30,
      'Black Temple': 31, 'BT': 31,
      'Zul\'Aman': 32, 'ZA': 32,
      'Sunwell Plateau': 33, 'Sunwell': 33, 'SWP': 33
    }
    return order[tierName] || 999
  }

  const loadData = async () => {
    if (!activeGuild) return
    setLoading(true)

    try {
      // Load expansion info
      const { data: expansions, error: expError } = await supabase
        .rpc('get_guild_expansions', { p_guild_id: activeGuild.id })

      if (expError) {
        console.error('Error loading expansion:', expError)
        setMessage({ type: 'error', text: 'Failed to load expansion' })
        setLoading(false)
        return
      }

      const exp = expansions?.find((e: Expansion) => e.expansion_id === expansionId)
      if (!exp) {
        setMessage({ type: 'error', text: 'Expansion not found' })
        setLoading(false)
        return
      }

      setExpansion(exp)
      if (exp.raid_start_date) {
        setRaidStartDate(exp.raid_start_date)
      }

      // Load raid tiers for this expansion
      const { data: tiersData, error: tiersError } = await supabase
        .from('raid_tiers')
        .select('id, name, is_active, is_guild_active, master_sheet_visible, submission_deadline')
        .eq('expansion_id', expansionId)

      if (tiersError) {
        console.error('Error loading raid tiers:', tiersError)
      } else {
        // Sort by progression order
        const sortedTiers = (tiersData || []).map(tier => ({
          ...tier,
          is_guild_active: tier.is_guild_active ?? true
        })).sort((a, b) => {
          return getRaidTierOrder(a.name) - getRaidTierOrder(b.name)
        })
        setRaidTiers(sortedTiers)

        // Initialize deadline inputs
        const deadlines: Record<string, string> = {}
        sortedTiers.forEach(tier => {
          if (tier.submission_deadline) {
            deadlines[tier.id] = new Date(tier.submission_deadline).toISOString().slice(0, 16)
          } else {
            deadlines[tier.id] = ''
          }
        })
        setDeadlineInputs(deadlines)
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setMessage({ type: 'error', text: 'Failed to load data' })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRaidStartDate = async () => {
    if (!activeGuild || !raidStartDate) return

    setUpdating('raid-start')
    setMessage(null)

    try {
      const response = await fetch(`/api/guilds/${activeGuild.id}/expansions/${expansionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raidStartDate })
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update raid start date' })
        return
      }

      setMessage({ type: 'success', text: 'Raid start date updated!' })
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update' })
    } finally {
      setUpdating(null)
    }
  }

  const handleToggleGuildActive = async (tierId: string, currentValue: boolean) => {
    setUpdating(tierId)
    setMessage(null)

    try {
      console.log('Toggling is_guild_active for tier:', tierId, 'from', currentValue, 'to', !currentValue)

      const { data, error } = await supabase
        .from('raid_tiers')
        .update({ is_guild_active: !currentValue })
        .eq('id', tierId)
        .select()

      console.log('Update result:', { data, error })

      if (error) {
        // Check if it's a column not found error
        if (error.message?.includes('is_guild_active') || error.code === '42703') {
          setMessage({
            type: 'error',
            text: 'Please run the database migration to enable this feature. See migrations/add_is_guild_active_to_raid_tiers.sql'
          })
        } else {
          throw error
        }
        return
      }

      // Check if any rows were actually updated
      if (!data || data.length === 0) {
        setMessage({
          type: 'error',
          text: 'Update failed - no rows affected. Check RLS policies.'
        })
        return
      }

      setMessage({
        type: 'success',
        text: !currentValue ? 'Raid activated for guild' : 'Raid deactivated for guild'
      })
      await loadData()
    } catch (error: any) {
      console.error('Toggle error:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to update' })
    } finally {
      setUpdating(null)
    }
  }

  const handleToggleMasterSheetVisibility = async (tierId: string, currentValue: boolean) => {
    setUpdating(tierId)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('raid_tiers')
        .update({ master_sheet_visible: !currentValue })
        .eq('id', tierId)

      if (error) throw error

      setMessage({
        type: 'success',
        text: !currentValue ? 'Rankings now visible to players' : 'Rankings hidden from players'
      })
      await loadData()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update visibility' })
    } finally {
      setUpdating(null)
    }
  }

  const handleSetActive = async (tierId: string) => {
    if (!activeGuild) return
    setUpdating(tierId)
    setMessage(null)

    try {
      // Get all expansions for this guild
      const { data: guildExpansions } = await supabase
        .from('expansions')
        .select('id')
        .eq('guild_id', activeGuild.id)

      if (!guildExpansions || guildExpansions.length === 0) {
        throw new Error('No expansions found')
      }

      const expansionIds = guildExpansions.map(e => e.id)

      // Deactivate all tiers across all expansions
      const { error: deactivateError } = await supabase
        .from('raid_tiers')
        .update({ is_active: false })
        .in('expansion_id', expansionIds)

      if (deactivateError) throw deactivateError

      // Activate the selected tier
      const { error: activateError } = await supabase
        .from('raid_tiers')
        .update({ is_active: true })
        .eq('id', tierId)

      if (activateError) throw activateError

      setMessage({ type: 'success', text: 'Current raid tier updated!' })
      await loadData()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update active tier' })
    } finally {
      setUpdating(null)
    }
  }

  const handleUpdateDeadline = async (tierId: string, deadline: string | null) => {
    setUpdating(tierId)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('raid_tiers')
        .update({ submission_deadline: deadline || null })
        .eq('id', tierId)

      if (error) throw error

      setMessage({
        type: 'success',
        text: deadline ? 'Submission deadline updated' : 'Submission deadline cleared'
      })
      await loadData()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update deadline' })
    } finally {
      setUpdating(null)
    }
  }

  if (loading || guildLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-[#666]">Loading...</p>
      </div>
    )
  }

  if (!expansion) {
    return (
      <div className="p-8">
        <button
          onClick={() => router.push('/admin/expansions')}
          className="flex items-center gap-2 text-[#a1a1a1] hover:text-white transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Expansions
        </button>
        <p className="text-[#666]">Expansion not found</p>
      </div>
    )
  }

  const visuals = getExpansionVisuals(expansion.expansion_name)
  const activeGuildRaids = raidTiers.filter(t => t.is_guild_active).length

  return (
    <div className="p-8 space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push('/admin/expansions')}
        className="flex items-center gap-2 text-[#a1a1a1] hover:text-white transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Expansions
      </button>

      {/* Expansion Header */}
      <div
        className="relative overflow-hidden rounded-xl border p-6"
        style={{
          background: visuals.bgColor,
          borderColor: expansion.is_current ? visuals.accentColor : visuals.borderColor
        }}
      >
        <div
          className="absolute inset-0 opacity-30"
          style={{ background: visuals.gradient }}
        />

        <div className="relative flex items-start gap-4">
          <div
            className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border"
            style={{ borderColor: visuals.borderColor }}
          >
            <img
              src={visuals.logoUrl}
              alt={expansion.expansion_name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1
                className="text-[28px] font-bold"
                style={{ color: visuals.textColor }}
              >
                {expansion.expansion_name}
              </h1>
              {expansion.is_current && (
                <span
                  className="px-3 py-1 text-[11px] font-semibold rounded-full"
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
            <p className="text-[14px]" style={{ color: `${visuals.textColor}99` }}>
              {raidTiers.length} raid tiers • {activeGuildRaids} active for guild
            </p>
          </div>
        </div>

        {/* Raid Start Date */}
        <div
          className="relative flex items-end gap-3 mt-6 pt-4 border-t"
          style={{ borderColor: `${visuals.borderColor}50` }}
        >
          <div className="flex-1">
            <label
              className="block text-[13px] font-medium mb-2"
              style={{ color: visuals.textColor }}
            >
              <Calendar className="w-4 h-4 inline mr-2" style={{ color: visuals.accentColor }} />
              Raid Start Date
            </label>
            <input
              type="date"
              value={raidStartDate}
              onChange={(e) => setRaidStartDate(e.target.value)}
              className="w-full px-4 py-2 rounded-xl text-[14px] focus:outline-none transition"
              style={{
                backgroundColor: visuals.bgColor,
                border: `1px solid ${visuals.borderColor}`,
                color: visuals.textColor
              }}
            />
          </div>
          <button
            onClick={handleUpdateRaidStartDate}
            disabled={updating === 'raid-start' || !raidStartDate}
            className="px-5 py-2 rounded-[52px] text-[13px] font-medium transition disabled:opacity-50"
            style={{
              backgroundColor: 'transparent',
              border: `1px solid ${visuals.borderColor}`,
              color: visuals.textColor
            }}
          >
            {updating === 'raid-start' ? 'Saving...' : 'Save Date'}
          </button>
        </div>
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

      {/* Raid Tiers Section */}
      <div>
        <h2 className="text-[20px] font-semibold text-white mb-4">Raid Tiers</h2>

        {raidTiers.length === 0 ? (
          <div className="p-8 bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl text-center">
            <p className="text-[#666]">No raid tiers found for this expansion</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {raidTiers.map((tier) => (
              <div
                key={tier.id}
                className={`bg-[#141519] border rounded-xl p-5 transition ${
                  tier.is_guild_active
                    ? 'border-[rgba(255,255,255,0.1)]'
                    : 'border-[rgba(255,255,255,0.05)] opacity-60'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <img
                      src={getRaidIcon(tier.name)}
                      alt={tier.name}
                      className="w-8 h-8 rounded border border-[rgba(255,255,255,0.1)]"
                    />
                    <h3 className="text-white font-semibold text-[16px]">{tier.name}</h3>
                    {tier.is_active && (
                      <span className="px-2 py-0.5 bg-green-950/50 text-green-200 text-[10px] rounded-full border border-green-600/50 font-medium">
                        Current
                      </span>
                    )}
                  </div>
                  {tier.is_guild_active && !tier.is_active && (
                    <button
                      onClick={() => handleSetActive(tier.id)}
                      disabled={updating === tier.id}
                      className="px-4 py-2 bg-white hover:bg-gray-100 rounded-[40px] text-black text-[12px] font-medium transition disabled:opacity-50"
                    >
                      {updating === tier.id ? 'Setting...' : 'Set as Current'}
                    </button>
                  )}
                </div>

                {/* Active for Guild Toggle */}
                <div className="flex items-center justify-between p-3 bg-[#0d0e11] rounded-lg mb-3">
                  <div>
                    <p className="text-white text-[13px] font-medium mb-0.5">Active for guild</p>
                    <p className="text-[#a1a1a1] text-[11px]">
                      {tier.is_guild_active
                        ? 'Appears in raid dropdowns'
                        : 'Hidden from raid selectors'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleGuildActive(tier.id, tier.is_guild_active)}
                    disabled={updating === tier.id}
                    className={`relative w-12 h-6 rounded-full transition ${
                      tier.is_guild_active ? 'bg-[#ff8000]' : 'bg-[#383838]'
                    } disabled:opacity-50`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                        tier.is_guild_active ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Only show other controls if guild active */}
                {tier.is_guild_active && (
                  <>
                    {/* Master Sheet Visibility Toggle */}
                    <div className="flex items-center justify-between p-3 bg-[#0d0e11] rounded-lg mb-3">
                      <div>
                        <p className="text-white text-[13px] font-medium mb-0.5">Show rankings to players</p>
                        <p className="text-[#a1a1a1] text-[11px]">
                          {tier.master_sheet_visible
                            ? 'Players can see loot rankings'
                            : 'Rankings hidden from players'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleMasterSheetVisibility(tier.id, tier.master_sheet_visible)}
                        disabled={updating === tier.id}
                        className={`px-3 py-1.5 rounded-[40px] text-[12px] font-medium transition ${
                          tier.master_sheet_visible
                            ? 'bg-green-950/50 text-green-200 border border-green-600/50'
                            : 'bg-[#1a1a1a] text-[#a1a1a1] border border-[rgba(255,255,255,0.1)]'
                        } disabled:opacity-50`}
                      >
                        {tier.master_sheet_visible ? 'Visible' : 'Hidden'}
                      </button>
                    </div>

                    {/* Submission Deadline */}
                    <div className="p-3 bg-[#0d0e11] rounded-lg">
                      <p className="text-white text-[13px] font-medium mb-2">Submission deadline</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="datetime-local"
                          value={deadlineInputs[tier.id] || ''}
                          onChange={(e) => setDeadlineInputs({
                            ...deadlineInputs,
                            [tier.id]: e.target.value
                          })}
                          className="flex-1 px-3 py-2 bg-[#151515] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-[12px] focus:outline-none focus:border-[#ff8000] transition"
                        />
                        <button
                          onClick={() => handleUpdateDeadline(tier.id, deadlineInputs[tier.id] || null)}
                          disabled={updating === tier.id}
                          className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#252525] border border-[rgba(255,255,255,0.1)] rounded-[40px] text-white text-[12px] font-medium transition disabled:opacity-50"
                        >
                          {deadlineInputs[tier.id] ? 'Save' : 'Clear'}
                        </button>
                      </div>
                      {tier.submission_deadline && (
                        <p className="text-[#a1a1a1] text-[11px] mt-2">
                          Current: {new Date(tier.submission_deadline).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
