'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useSWRConfig } from 'swr'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { getExpansionVisuals } from '@/utils/expansionVisuals'
import { getRaidIcon, getRaidShorthand } from '@/utils/raidIcons'
import { resolvePhaseGroups, isMergedGroup, type PhaseGroup } from '@/domain/expansion/phase-groups'
import { Button } from '@/components/ui/button'
import { DateTimePicker } from '@/components/ui/date-time-picker'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeletons'

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
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-success/20 text-success border border-success/40">
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
              <DateTimePicker
                value={deadlineInput}
                onChange={(e) => onDeadlineInputChange(e.target.value)}
                variant="rounded"
                size="sm"
                className="flex-1"
              />
              <Button
                variant="outline"
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
  const [phaseGroupsConfig, setPhaseGroupsConfig] = useState<number[][] | null>(null)
  const [mergeMode, setMergeMode] = useState<'display' | 'selecting'>('display')
  const [newGroupSelection, setNewGroupSelection] = useState<Set<number>>(new Set())
  const [mergeError, setMergeError] = useState<{ message: string; characters?: string[] } | null>(null)

  const supabase = createClient()
  const router = useRouter()
  const { mutate } = useSWRConfig()
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
        const sortedTiers = (tiersData || []).map((tier: { id: string; name: string; phase: number | null; is_guild_active: boolean | null; master_sheet_visible: boolean | null }) => ({
          ...tier,
          is_guild_active: tier.is_guild_active ?? true,
          master_sheet_visible: tier.master_sheet_visible ?? true
})).sort((a: RaidTier, b: RaidTier) => {
          return getRaidTierOrder(a.name) - getRaidTierOrder(b.name)
        })
        setRaidTiers(sortedTiers)
      }

      // Load phase deadlines and current_phase from expansion
      const { data: expansionData, error: expansionError } = await supabase
        .from('expansions')
        .select('phase_deadlines, current_phase, phase_groups')
        .eq('id', expansionId)
        .single()

      if (!expansionError && expansionData) {
        setCurrentPhase(expansionData.current_phase || 1)
        setPhaseGroupsConfig(expansionData.phase_groups as number[][] | null)

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
    if (!activeGuild) return
    setUpdating(tierId)

    try {
      const res = await fetch('/api/raid-tiers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: activeGuild.id, tier_id: tierId, updates: { is_guild_active: !currentValue } }),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        showNotification('error', errBody.error || 'Couldn\'t update raid. Try again.')
        return
      }

      showNotification('success', !currentValue ? 'Raid added to loot lists' : 'Raid removed from loot lists')
      mutate((key: string) => typeof key === 'string' && (key.startsWith('/api/raid-tiers') || key.startsWith('/api/loot-items')), undefined, { revalidate: true })
      await loadData()
    } catch (error: any) {
      console.error('Toggle error:', error)
      showNotification('error', error.message || 'Couldn\'t update raid. Try again.')
    } finally {
      setUpdating(null)
    }
  }

  const handleToggleMasterSheetVisibility = async (tierId: string, currentValue: boolean) => {
    if (!activeGuild) return
    setUpdating(tierId)

    try {
      const res = await fetch('/api/raid-tiers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: activeGuild.id, tier_id: tierId, updates: { master_sheet_visible: !currentValue } }),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        showNotification('error', errBody.error || 'Couldn\'t update visibility. Try again.')
        return
      }

      showNotification('success', !currentValue ? 'Rankings now visible to players' : 'Rankings hidden from players')
      mutate((key: string) => typeof key === 'string' && (key.startsWith('/api/raid-tiers') || key.startsWith('/api/loot-items')), undefined, { revalidate: true })
      await loadData()
    } catch (error: any) {
      console.error('Toggle visibility error:', error)
      showNotification('error', error.message || 'Couldn\'t update visibility. Try again.')
    } finally {
      setUpdating(null)
    }
  }

  const handleUpdatePhaseDeadline = async (phase: number) => {
    if (!activeGuild) return
    setUpdating(`phase-${phase}`)

    try {
      // Get current phase_deadlines from expansion (read is fine via client)
      const { data: currentData } = await supabase
        .from('expansions')
        .select('phase_deadlines')
        .eq('id', expansionId)
        .single()

      const currentDeadlines = (currentData?.phase_deadlines || {}) as Record<string, string | null>
      const deadlineValue = phaseDeadlineInputs[phase] || null

      const updatedDeadlines = {
        ...currentDeadlines,
        [phase.toString()]: deadlineValue
      }

      const res = await fetch(`/api/guilds/${activeGuild.id}/expansions/${expansionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phaseDeadlines: updatedDeadlines }),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.error || 'Failed to update')
      }

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
        throw new Error(data.error || 'Couldn\'t set current phase. Try again.')
      }

      showNotification('success', `Phase ${phase} is now current`)
      mutate((key: string) => typeof key === 'string' && (key.startsWith('/api/raid-tiers') || key.startsWith('/api/loot-items')), undefined, { revalidate: true })
      await loadData()
    } catch (error: any) {
      showNotification('error', error.message || 'Couldn\'t set current phase. Try again.')
    } finally {
      setUpdating(null)
    }
  }

  // Compute available phases from tiers and resolved groups
  const availablePhases = [...new Set(raidTiers.map(t => t.phase).filter((p): p is number => p != null))].sort((a, b) => a - b)
  const currentResolvedGroups = resolvePhaseGroups(phaseGroupsConfig, availablePhases)

  // Shared save function — takes the full config directly (no state dependency)
  const savePhaseGroups = async (config: number[][] | null) => {
    if (!activeGuild) return
    setUpdating('merge')
    setMergeError(null)

    try {
      const response = await fetch(`/api/guilds/${activeGuild.id}/expansions/${expansionId}/phase-groups`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase_groups: config })
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409 && data.conflicting_characters) {
          setMergeError({
            message: data.error,
            characters: data.conflicting_characters
          })
        } else {
          showNotification('error', data.error || 'Couldn\'t update phase groups. Try again.')
        }
        return
      }

      setPhaseGroupsConfig(data.phase_groups)
      setMergeMode('display')
      setNewGroupSelection(new Set())
      showNotification('success', config ? 'Phase groups updated' : 'Phases split into separate lists')
      mutate((key: string) => typeof key === 'string' && (key.startsWith('/api/raid-tiers') || key.startsWith('/api/loot-items')), undefined, { revalidate: true })
    } catch (error: any) {
      showNotification('error', error.message || 'Couldn\'t update phase groups. Try again.')
    } finally {
      setUpdating(null)
    }
  }

  const handleCreateMergeGroup = async () => {
    const selectedPhases = [...newGroupSelection].sort((a, b) => a - b)
    if (selectedPhases.length < 2) return

    // Remove selected phases from any existing single-phase groups, keep other merged groups
    const currentGroups = phaseGroupsConfig
      ? phaseGroupsConfig.filter(g => !g.some(p => newGroupSelection.has(p)))
      : availablePhases.filter(p => !newGroupSelection.has(p)).map(p => [p])

    // Add the new merged group + any unassigned phases as individual groups
    const newGroups = [...currentGroups, selectedPhases]
    const assignedPhases = new Set(newGroups.flat())
    for (const p of availablePhases) {
      if (!assignedPhases.has(p)) newGroups.push([p])
    }
    newGroups.sort((a, b) => a[0] - b[0])

    const allSingle = newGroups.every(g => g.length === 1)
    await savePhaseGroups(allSingle ? null : newGroups)
  }

  const handleUnmergeGroup = async (groupPhases: number[]) => {
    // Remove this group, split its phases back to individual
    const currentGroups = phaseGroupsConfig || []
    const groupKey = JSON.stringify(groupPhases.slice().sort((a, b) => a - b))
    const newGroups = currentGroups.filter(
      g => JSON.stringify(g.slice().sort((a, b) => a - b)) !== groupKey
    )
    // Add back as individual phases
    for (const phase of groupPhases) {
      newGroups.push([phase])
    }
    newGroups.sort((a, b) => a[0] - b[0])

    const allSingle = newGroups.every(g => g.length === 1)
    await savePhaseGroups(allSingle ? null : newGroups)
  }

  const handleToggleNewGroupPhase = (phase: number) => {
    setMergeError(null)
    setNewGroupSelection(prev => {
      const next = new Set(prev)
      if (next.has(phase)) {
        next.delete(phase)
      } else {
        next.add(phase)
      }
      return next
    })
  }

  if (loading || guildLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Back button skeleton */}
        <Skeleton className="h-10 w-20 rounded-lg" />
        {/* Expansion header skeleton */}
        <div className="rounded-xl border border-border p-6 bg-background-elevated">
          <div className="flex items-start gap-4">
            <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="h-4 w-64" />
              <div className="flex gap-4 mt-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        </div>
        {/* Phase cards skeleton */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-background-elevated border border-border rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded" />
                    <Skeleton className="h-5 w-40" />
                  </div>
                  <Skeleton className="h-8 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
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
        variant="outline"
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

      {/* Current Phase + Phase Merging */}
      {uniquePhases.length > 0 && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-background-elevated border border-border rounded-xl p-5">
          <h2 className="text-[18px] font-semibold text-foreground mb-2">Current phase</h2>
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
                  variant={isCurrent ? 'primary' : isUnlocked ? 'outline' : 'ghost'}
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

        {/* Phase Merging */}
        {uniquePhases.length > 1 && (
        <div className="bg-background-elevated border border-border rounded-xl p-5">
          <h2 className="text-[18px] font-semibold text-foreground mb-2">Phase merging</h2>
          <p className="text-muted-foreground text-sm mb-4">
            Combine phases so raiders rank items from multiple raids on one list.
          </p>

          {mergeError && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm">
              <p className="text-destructive font-medium">{mergeError.message}</p>
              {mergeError.characters && mergeError.characters.length > 0 && (
                <p className="text-muted-foreground mt-1">
                  Affected raiders: {mergeError.characters.join(', ')}
                </p>
              )}
            </div>
          )}

          {mergeMode === 'display' ? (
            <>
              {/* Display current merge groups */}
              <div className="flex flex-wrap gap-2">
                {currentResolvedGroups
                  .filter(g => g.phases.some(p => currentPhase !== null && p <= currentPhase))
                  .map((group) => {
                    const merged = isMergedGroup(group)
                    return (
                      <div
                        key={group.canonicalPhase}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg ${
                          merged
                            ? 'bg-accent/10 border border-accent/30'
                            : 'bg-background-subtle border border-border'
                        }`}
                      >
                        {group.phases.map((phase, i) => (
                          <span key={phase} className="flex items-center gap-1.5">
                            {i > 0 && <span className={`text-xs font-medium ${merged ? 'text-accent' : 'text-muted-foreground'}`}>+</span>}
                            <span className={`text-sm font-semibold ${merged ? 'text-accent' : 'text-foreground'}`}>
                              P{phase}
                            </span>
                          </span>
                        ))}
                        {merged && (
                          <button
                            onClick={() => handleUnmergeGroup(group.phases)}
                            disabled={updating === 'merge'}
                            className="ml-1.5 p-0.5 text-accent/50 hover:text-accent transition-colors disabled:opacity-50"
                            title="Unmerge these phases"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    )
                  })}
              </div>

              {/* Create merge group button */}
              {(() => {
                const unlockedPhases = availablePhases.filter(p => currentPhase !== null && p <= currentPhase)
                const alreadyMergedPhases = new Set(
                  currentResolvedGroups.filter(g => isMergedGroup(g)).flatMap(g => g.phases)
                )
                const unmergedCount = unlockedPhases.filter(p => !alreadyMergedPhases.has(p)).length
                // Need at least 2 unmerged phases to create a new group
                return unmergedCount >= 2 ? (
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMergeMode('selecting')
                        setNewGroupSelection(new Set())
                        setMergeError(null)
                      }}
                    >
                      Create merge group
                    </Button>
                  </div>
                ) : null
              })()}
            </>
          ) : (
            <>
              {/* Selection mode — pick phases for a new merge group */}
              <div className="flex flex-wrap gap-2">
                {availablePhases
                  .filter(p => currentPhase !== null && p <= currentPhase)
                  .map((phase) => {
                    const tiersInPhase = raidTiers.filter(t => t.phase === phase)
                    const raidNames = tiersInPhase.map(t => getRaidShorthand(t.name)).join(', ')
                    const isChecked = newGroupSelection.has(phase)
                    // Check if this phase is already in an existing merged group
                    const existingGroup = currentResolvedGroups.find(
                      g => isMergedGroup(g) && g.phases.includes(phase)
                    )
                    const isDisabled = !!existingGroup

                    if (isDisabled) {
                      return (
                        <div
                          key={phase}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background-subtle/50 border border-transparent opacity-50"
                          title={`Merged with P${existingGroup!.phases.filter(p => p !== phase).join(', P')}`}
                        >
                          <input type="checkbox" disabled className="w-4 h-4 rounded border-border" />
                          <span className="text-sm font-semibold text-foreground">P{phase}</span>
                        </div>
                      )
                    }

                    return (
                      <label
                        key={phase}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-accent/10 border border-accent/20'
                            : 'bg-background-subtle border border-transparent hover:bg-muted'
                        }`}
                        title={raidNames}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleNewGroupPhase(phase)}
                          className="w-4 h-4 rounded border-border accent-accent"
                        />
                        <span className="text-sm font-semibold text-foreground">P{phase}</span>
                      </label>
                    )
                  })}
              </div>

              {/* Selection mode footer */}
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  {newGroupSelection.size >= 2
                    ? `Merge ${newGroupSelection.size} phases into one loot list`
                    : newGroupSelection.size === 1
                      ? 'Select at least 2 phases to merge'
                      : 'Select phases to merge'
                  }
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMergeMode('display')
                      setNewGroupSelection(new Set())
                      setMergeError(null)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCreateMergeGroup}
                    disabled={newGroupSelection.size < 2 || updating === 'merge'}
                    loading={updating === 'merge'}
                  >
                    Merge {newGroupSelection.size} phases
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
        )}
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
