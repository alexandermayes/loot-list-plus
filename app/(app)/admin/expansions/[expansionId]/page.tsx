'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, Tick01Icon } from '@hugeicons/core-free-icons'
import { getExpansionVisuals } from '@/utils/expansionVisuals'
import { getRaidIcon } from '@/utils/raidIcons'
import { Button } from '@/components/ui/button'

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
  const [deadlineInputs, setDeadlineInputs] = useState<Record<string, string>>({})

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, loading: guildLoading, isOfficer } = useGuildContext()
  const { showNotification } = useNotification()

  useEffect(() => {
    if (expansion) {
      document.title = `LootList+ • ${expansion.expansion_name} Raid Tiers`
    }
  }, [expansion])

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
      'Sunwell Plateau': 33, 'Sunwell': 33, 'SWP': 33,
      // WotLK
      'Vault of Archavon': 40, 'VoA': 40,
      'Obsidian Sanctum': 41, 'OS': 41,
      'Eye of Eternity': 42, 'EoE': 42,
      'Naxxramas (10)': 43, 'Naxxramas (25)': 44,
      'Ulduar': 50,
      'Trial of the Crusader': 60, 'ToC': 60,
      'Trial of the Grand Crusader': 61, 'ToGC': 61,
      'Onyxia\'s Lair (10)': 62, 'Onyxia\'s Lair (25)': 63,
      'Icecrown Citadel': 70, 'ICC': 70,
      'Ruby Sanctum': 80, 'RS': 80
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
        showNotification('error', 'Couldn\'t load expansion. Check your connection and try again.')
        setLoading(false)
        return
      }

      const exp = expansions?.find((e: Expansion) => e.expansion_id === expansionId)
      if (!exp) {
        showNotification('error', 'Expansion not found')
        setLoading(false)
        return
      }

      setExpansion(exp)

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
      showNotification('error', 'Couldn\'t load data. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleGuildActive = async (tierId: string, currentValue: boolean) => {
    setUpdating(tierId)

    try {
      console.log('Toggling is_guild_active for tier:', tierId, 'from', currentValue, 'to', !currentValue)

      const { data, error } = await supabase
        .from('raid_tiers')
        .update({ is_guild_active: !currentValue })
        .eq('id', tierId)
        .select()

      if (error) {
        // Check if it's a column not found error
        if (error.message?.includes('is_guild_active') || error.code === '42703') {
          showNotification('error', 'Please run the database migration to enable this feature. See migrations/add_is_guild_active_to_raid_tiers.sql')
        } else {
          throw error
        }
        return
      }

      // Check if any rows were actually updated
      if (!data || data.length === 0) {
        showNotification('error', 'Update failed - no rows affected. Check RLS policies.')
        return
      }

      showNotification('success', !currentValue ? 'Raid activated for guild' : 'Raid deactivated for guild')
      await loadData()
    } catch (error: any) {
      console.error('Toggle error:', error)
      showNotification('error', error.message || 'Couldn\'t update raid. Try again.')
    } finally {
      setUpdating(null)
    }
  }

  const handleToggleMasterSheetVisibility = async (tierId: string, currentValue: boolean) => {
    setUpdating(tierId)

    try {
      const { data, error } = await supabase
        .from('raid_tiers')
        .update({ master_sheet_visible: !currentValue })
        .eq('id', tierId)
        .select()

      if (error) throw error

      // Check if any rows were actually updated
      if (!data || data.length === 0) {
        showNotification('error', 'Update failed - no rows affected. Check RLS policies.')
        return
      }

      showNotification('success', !currentValue ? 'Rankings now visible to players' : 'Rankings hidden from players')
      await loadData()
    } catch (error: any) {
      console.error('Toggle visibility error:', error)
      showNotification('error', error.message || 'Couldn\'t update visibility. Try again.')
    } finally {
      setUpdating(null)
    }
  }

  const handleToggleCurrent = async (tierId: string, currentValue: boolean) => {
    if (!activeGuild) return
    setUpdating(tierId)

    try {
      // Toggle the is_active state for this tier
      const { error } = await supabase
        .from('raid_tiers')
        .update({ is_active: !currentValue })
        .eq('id', tierId)

      if (error) throw error

      showNotification('success', !currentValue ? 'Raid tier marked as current' : 'Raid tier unmarked as current')
      await loadData()
    } catch (error: any) {
      showNotification('error', error.message || 'Couldn\'t update raid tier. Try again.')
    } finally {
      setUpdating(null)
    }
  }

  const handleUpdateDeadline = async (tierId: string, deadline: string | null) => {
    setUpdating(tierId)

    try {
      const { error } = await supabase
        .from('raid_tiers')
        .update({ submission_deadline: deadline || null })
        .eq('id', tierId)

      if (error) throw error

      showNotification('success', deadline ? 'Submission deadline updated' : 'Submission deadline cleared')
      await loadData()
    } catch (error: any) {
      showNotification('error', error.message || 'Couldn\'t update deadline. Try again.')
    } finally {
      setUpdating(null)
    }
  }

  if (loading || guildLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <p className="text-foreground-muted">Loading...</p>
      </div>
    )
  }

  if (!expansion) {
    return (
      <div className="p-8">
        <button
          onClick={() => router.push('/admin/expansions')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition mb-6"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Back to Expansions
        </button>
        <p className="text-foreground-muted">Expansion not found</p>
      </div>
    )
  }

  const visuals = getExpansionVisuals(expansion.expansion_name)
  const activeGuildRaids = raidTiers.filter(t => t.is_guild_active).length
  const currentRaids = raidTiers.filter(t => t.is_guild_active && t.is_active).length

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Back Button */}
      <Button
        variant="secondary"
        onClick={() => router.push('/admin/expansions')}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
        Back to Expansions
      </Button>

      {/* Expansion Header */}
      <div
        className="relative overflow-hidden rounded-xl border p-6"
        style={{
          background: visuals.bgColor,
          borderColor: expansion.is_current ? visuals.accentColor : visuals.borderColor
        }}
      >
        <div
          className="absolute inset-0 opacity-20"
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
                className="text-2xl font-bold"
                style={{ color: visuals.textColor }}
              >
                {expansion.expansion_name}
              </h1>
              {expansion.is_current && (
                <span
                  className="px-3 py-1 text-xs font-semibold rounded-full"
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
              {raidTiers.length} raid tiers • {activeGuildRaids} active for guild{currentRaids > 0 && ` • ${currentRaids} current`}
            </p>
          </div>
        </div>
      </div>

      {/* Raid Tiers Section */}
      <div>
        <h2 className="text-[20px] font-semibold text-foreground mb-4">Raid Tiers</h2>

        {raidTiers.length === 0 ? (
          <div className="p-8 bg-background-elevated border border-border rounded-xl text-center">
            <p className="text-foreground-muted">No raid tiers found for this expansion</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {raidTiers.map((tier) => (
              <div
                key={tier.id}
                className={`bg-background-elevated border rounded-xl p-5 transition ${
                  tier.is_guild_active
                    ? 'border-border'
                    : 'border-border opacity-60'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <img
                      src={getRaidIcon(tier.name)}
                      alt={tier.name}
                      className="w-8 h-8 rounded-lg border-2 border-border/50 shadow-md"
                    />
                    <h3 className="text-foreground font-semibold text-[16px]">{tier.name}</h3>
                  </div>
                </div>

                {/* Active for Guild Toggle */}
                <div className="flex items-center justify-between p-3 bg-background-subtle rounded-lg mb-3">
                  <div>
                    <p className="text-foreground text-[13px] font-medium mb-0.5">Active for guild</p>
                    <p className="text-muted-foreground text-[11px]">
                      {tier.is_guild_active
                        ? 'Appears in raid dropdowns'
                        : 'Hidden from raid selectors'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleGuildActive(tier.id, tier.is_guild_active)}
                    disabled={updating === tier.id}
                    className={`relative w-12 h-6 rounded-full transition ${
                      tier.is_guild_active ? 'bg-accent' : 'bg-border-strong'
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
                    {/* Current Raid Toggle */}
                    <div className="flex items-center justify-between p-3 bg-background-subtle rounded-lg mb-3">
                      <div>
                        <p className="text-foreground text-[13px] font-medium mb-0.5">Current raid</p>
                        <p className="text-muted-foreground text-[11px]">
                          {tier.is_active
                            ? 'Marked as a current progression raid'
                            : 'Not marked as current'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggleCurrent(tier.id, tier.is_active)}
                        disabled={updating === tier.id}
                        className={`relative w-12 h-6 rounded-full transition ${
                          tier.is_active ? 'bg-green-600' : 'bg-border-strong'
                        } disabled:opacity-50`}
                      >
                        <div
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                            tier.is_active ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                    {/* Master Sheet Visibility Toggle */}
                    <div className="flex items-center justify-between p-3 bg-background-subtle rounded-lg mb-3">
                      <div>
                        <p className="text-foreground text-[13px] font-medium mb-0.5">Show rankings to players</p>
                        <p className="text-muted-foreground text-[11px]">
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
                            : 'bg-muted text-muted-foreground border border-border'
                        } disabled:opacity-50`}
                      >
                        {tier.master_sheet_visible ? 'Visible' : 'Hidden'}
                      </button>
                    </div>

                    {/* Submission Deadline */}
                    <div className="p-3 bg-background-subtle rounded-lg">
                      <p className="text-foreground text-[13px] font-medium mb-2">Submission deadline</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="datetime-local"
                          value={deadlineInputs[tier.id] || ''}
                          onChange={(e) => setDeadlineInputs({
                            ...deadlineInputs,
                            [tier.id]: e.target.value
                          })}
                          className="flex-1 px-3 py-2 bg-background-elevated border border-border rounded-lg text-foreground text-[12px] focus:outline-none focus:border-accent transition"
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleUpdateDeadline(tier.id, deadlineInputs[tier.id] || null)}
                          disabled={updating === tier.id}
                        >
                          {deadlineInputs[tier.id] ? 'Save' : 'Clear'}
                        </Button>
                      </div>
                      {tier.submission_deadline && (
                        <p className="text-muted-foreground text-[11px] mt-2">
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
