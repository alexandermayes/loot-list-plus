'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { getExpansionVisuals } from '@/utils/expansionVisuals'
import { getRaidIcon, getRaidShorthand } from '@/utils/raidIcons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

interface RaidTier {
  id: string
  name: string
  phase: number | null
  is_guild_active: boolean
  master_sheet_visible: boolean
}

interface Expansion {
  expansion_id: string
  expansion_name: string
  raid_start_date: string | null
  is_current: boolean
}

interface CompactRaidToggleProps {
  tier: RaidTier
  updating: string | null
  onToggleActive: (tierId: string, currentValue: boolean) => void
  onToggleRankings: (tierId: string, currentValue: boolean) => void
}

function CompactRaidToggle({
  tier,
  updating,
  onToggleActive,
  onToggleRankings,
}: CompactRaidToggleProps) {
  const isUpdating = updating === tier.id

  return (
    <div
      className={`flex items-center gap-3 p-2.5 rounded-lg transition ${
        tier.is_guild_active
          ? 'bg-background-subtle'
          : 'bg-background-subtle/50 opacity-60'
      }`}
    >
      {/* Icon + Name */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <img
          src={getRaidIcon(tier.name)}
          alt={tier.name}
          className="w-6 h-6 rounded border border-border/50 flex-shrink-0"
        />
        <span className="font-medium text-[13px] text-foreground truncate">
          {getRaidShorthand(tier.name)}
        </span>
      </div>

      {/* Toggles */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <label className="flex items-center gap-1.5 cursor-pointer" title="Include in loot lists">
          <span className="text-[11px] text-muted-foreground">Loot</span>
          <Switch
            checked={tier.is_guild_active}
            onCheckedChange={() => onToggleActive(tier.id, tier.is_guild_active)}
            disabled={isUpdating}
            className="data-[state=checked]:bg-accent scale-90"
          />
        </label>

        <label className="flex items-center gap-1.5 cursor-pointer" title="Show rankings to players">
          <span className="text-[11px] text-muted-foreground">Ranks</span>
          <Switch
            checked={tier.master_sheet_visible && tier.is_guild_active}
            onCheckedChange={() => onToggleRankings(tier.id, tier.master_sheet_visible)}
            disabled={isUpdating || !tier.is_guild_active}
            className="data-[state=checked]:bg-green-600 scale-90"
          />
        </label>
      </div>
    </div>
  )
}

interface PhaseCardProps {
  phase: number
  tiers: RaidTier[]
  deadline: string | null
  deadlineInput: string
  isCurrentPhase: boolean
  isUnlocked: boolean
  updating: string | null
  onDeadlineInputChange: (value: string) => void
  onUpdateDeadline: () => void
  onToggleRaidActive: (tierId: string, currentValue: boolean) => void
  onToggleRaidRankings: (tierId: string, currentValue: boolean) => void
}

function PhaseCard({
  phase,
  tiers,
  deadline,
  deadlineInput,
  isCurrentPhase,
  isUnlocked,
  updating,
  onDeadlineInputChange,
  onUpdateDeadline,
  onToggleRaidActive,
  onToggleRaidRankings,
}: PhaseCardProps) {
  const isUpdatingDeadline = updating === `phase-${phase}`

  return (
    <div
      className={`bg-background-elevated border rounded-xl overflow-hidden transition flex flex-col ${
        isUnlocked ? 'border-border' : 'border-border/50 opacity-70'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="text-[15px] font-semibold text-foreground">
          Phase {phase}
        </h3>
        {isCurrentPhase ? (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-accent/20 text-accent border border-accent/40">
            CURRENT
          </span>
        ) : isUnlocked ? (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-500/20 text-green-400 border border-green-500/40">
            UNLOCKED
          </span>
        ) : (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-muted text-muted-foreground border border-border">
            LOCKED
          </span>
        )}
      </div>

      {/* Content - only show details for unlocked phases */}
      {isUnlocked ? (
        <div className="p-3 space-y-3 flex-1">
          {/* Deadline */}
          <div>
            <label className="block text-[11px] font-medium text-muted-foreground mb-1.5">
              Submission deadline
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="datetime-local"
                value={deadlineInput}
                onChange={(e) => onDeadlineInputChange(e.target.value)}
                variant="rounded"
                size="sm"
                className="flex-1 text-[12px]"
              />
              <Button
                variant="secondary"
                size="sm"
                onClick={onUpdateDeadline}
                disabled={isUpdatingDeadline}
                loading={isUpdatingDeadline}
              >
                Save
              </Button>
            </div>
          </div>

          {/* Raids */}
          <div className="space-y-1.5">
            {tiers.map((tier) => (
              <CompactRaidToggle
                key={tier.id}
                tier={tier}
                updating={updating}
                onToggleActive={onToggleRaidActive}
                onToggleRankings={onToggleRaidRankings}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="p-3 text-muted-foreground text-[12px] flex-1">
          Set current phase to {phase} or higher to configure.
        </div>
      )}
    </div>
  )
}

export default function ExpansionDetailPage({ params }: { params: Promise<{ expansionId: string }> }) {
  const { expansionId } = use(params)
  const [expansion, setExpansion] = useState<Expansion | null>(null)
  const [raidTiers, setRaidTiers] = useState<RaidTier[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [phaseDeadlines, setPhaseDeadlines] = useState<Record<number, string | null>>({})
  const [phaseDeadlineInputs, setPhaseDeadlineInputs] = useState<Record<number, string>>({})
  const [currentPhase, setCurrentPhase] = useState<number | null>(null)

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

      // Load raid tiers for this expansion (only fields we need)
      const { data: tiersData, error: tiersError } = await supabase
        .from('raid_tiers')
        .select('id, name, phase, is_guild_active, master_sheet_visible')
        .eq('expansion_id', expansionId)

      if (tiersError) {
        console.error('Error loading raid tiers:', tiersError)
      } else {
        // Sort by progression order
        const sortedTiers = (tiersData || []).map(tier => ({
          ...tier,
          is_guild_active: tier.is_guild_active ?? true,
          master_sheet_visible: tier.master_sheet_visible ?? true
        })).sort((a, b) => {
          return getRaidTierOrder(a.name) - getRaidTierOrder(b.name)
        })
        setRaidTiers(sortedTiers)
      }

      // Load phase deadlines and current_phase from expansion
      const { data: expansionData, error: expansionError } = await supabase
        .from('expansions')
        .select('phase_deadlines, current_phase')
        .eq('id', expansionId)
        .single()

      if (!expansionError && expansionData) {
        setCurrentPhase(expansionData.current_phase || 1)

        if (expansionData.phase_deadlines) {
          const deadlinesFromDb = expansionData.phase_deadlines as Record<string, string | null>
          const phaseDeadlinesMap: Record<number, string | null> = {}
          const phaseDlInputs: Record<number, string> = {}

          Object.entries(deadlinesFromDb).forEach(([phase, deadline]) => {
            const phaseNum = parseInt(phase)
            phaseDeadlinesMap[phaseNum] = deadline
            if (deadline) {
              phaseDlInputs[phaseNum] = new Date(deadline).toISOString().slice(0, 16)
            } else {
              phaseDlInputs[phaseNum] = ''
            }
          })
          setPhaseDeadlines(phaseDeadlinesMap)
          setPhaseDeadlineInputs(phaseDlInputs)
        }
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
      const { data, error } = await supabase
        .from('raid_tiers')
        .update({ is_guild_active: !currentValue })
        .eq('id', tierId)
        .select()

      if (error) {
        if (error.message?.includes('is_guild_active') || error.code === '42703') {
          showNotification('error', 'Please run the database migration to enable this feature.')
        } else {
          throw error
        }
        return
      }

      if (!data || data.length === 0) {
        showNotification('error', 'Update failed. Check RLS policies.')
        return
      }

      showNotification('success', !currentValue ? 'Raid added to loot lists' : 'Raid removed from loot lists')
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

      if (!data || data.length === 0) {
        showNotification('error', 'Update failed. Check RLS policies.')
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

  const handleUpdatePhaseDeadline = async (phase: number) => {
    setUpdating(`phase-${phase}`)

    try {
      // Get current phase_deadlines from expansion
      const { data: currentData } = await supabase
        .from('expansions')
        .select('phase_deadlines')
        .eq('id', expansionId)
        .single()

      const currentDeadlines = (currentData?.phase_deadlines || {}) as Record<string, string | null>
      const deadlineValue = phaseDeadlineInputs[phase] || null

      // Update the specific phase deadline
      const updatedDeadlines = {
        ...currentDeadlines,
        [phase.toString()]: deadlineValue
      }

      const { error } = await supabase
        .from('expansions')
        .update({ phase_deadlines: updatedDeadlines })
        .eq('id', expansionId)

      if (error) throw error

      showNotification('success', deadlineValue ? `Phase ${phase} deadline updated` : `Phase ${phase} deadline cleared`)
      await loadData()
    } catch (error: any) {
      showNotification('error', error.message || 'Couldn\'t update phase deadline. Try again.')
    } finally {
      setUpdating(null)
    }
  }

  const handleSetCurrentPhase = async (phase: number) => {
    if (!activeGuild) return
    setUpdating(`set-phase-${phase}`)

    try {
      const response = await fetch(`/api/guilds/${activeGuild.id}/expansions/${expansionId}/phase`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set current phase')
      }

      showNotification('success', `Phase ${phase} is now current`)
      await loadData()
    } catch (error: any) {
      showNotification('error', error.message || 'Couldn\'t set current phase. Try again.')
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
        <Button
          variant="ghost"
          onClick={() => router.push('/admin/guild-settings')}
          className="mb-6"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          Back
        </Button>
        <p className="text-foreground-muted">Expansion not found</p>
      </div>
    )
  }

  const visuals = getExpansionVisuals(expansion.expansion_name)
  const activeGuildRaids = raidTiers.filter(t => t.is_guild_active).length

  // Get unique phases
  const uniquePhases = [...new Set(raidTiers.map(t => t.phase).filter((p): p is number => p !== null))].sort((a, b) => a - b)

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Back Button */}
      <Button
        variant="secondary"
        onClick={() => router.push('/admin/guild-settings')}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
        Back
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
              {raidTiers.length} raid tiers • {activeGuildRaids} active for guild
            </p>
          </div>
        </div>
      </div>

      {/* Current Phase Selector */}
      {uniquePhases.length > 0 && (
        <div className="bg-background-elevated border border-border rounded-xl p-5">
          <h2 className="text-[18px] font-semibold text-foreground mb-2">Current Phase</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Select the phase your guild is progressing through. All phases up to this point will be visible for loot list submissions.
          </p>

          <div className="flex flex-wrap gap-2">
            {uniquePhases.map((phase) => {
              const tiersInPhase = raidTiers.filter(t => t.phase === phase)
              const activeTiers = tiersInPhase.filter(t => t.is_guild_active)
              const tierNames = activeTiers.map(t => getRaidShorthand(t.name)).join(', ')
              const isCurrent = currentPhase === phase
              const isUnlocked = currentPhase !== null && phase <= currentPhase
              const isUpdating = updating === `set-phase-${phase}`

              return (
                <Button
                  key={phase}
                  variant={isCurrent ? 'primary' : isUnlocked ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => !isCurrent && handleSetCurrentPhase(phase)}
                  disabled={isUpdating}
                  loading={isUpdating}
                  title={tierNames || 'No active raids'}
                  className={isCurrent ? 'ring-2 ring-accent ring-offset-2 ring-offset-background' : ''}
                >
                  Phase {phase}
                  {isCurrent && ' ✓'}
                </Button>
              )
            })}
          </div>
        </div>
      )}

      {/* Phase Cards */}
      {uniquePhases.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {uniquePhases.map((phase) => {
            const tiersInPhase = raidTiers.filter(t => t.phase === phase)
            const isUnlocked = currentPhase !== null && phase <= currentPhase
            const isCurrent = currentPhase === phase

            return (
              <PhaseCard
                key={phase}
                phase={phase}
                tiers={tiersInPhase}
                deadline={phaseDeadlines[phase] || null}
                deadlineInput={phaseDeadlineInputs[phase] || ''}
                isCurrentPhase={isCurrent}
                isUnlocked={isUnlocked}
                updating={updating}
                onDeadlineInputChange={(value) => setPhaseDeadlineInputs({
                  ...phaseDeadlineInputs,
                  [phase]: value
                })}
                onUpdateDeadline={() => handleUpdatePhaseDeadline(phase)}
                onToggleRaidActive={handleToggleGuildActive}
                onToggleRaidRankings={handleToggleMasterSheetVisibility}
              />
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {raidTiers.length === 0 && (
        <div className="p-8 bg-background-elevated border border-border rounded-xl text-center">
          <p className="text-foreground-muted">No raid tiers found for this expansion</p>
        </div>
      )}
    </div>
  )
}
