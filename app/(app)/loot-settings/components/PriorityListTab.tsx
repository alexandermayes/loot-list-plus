'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import ItemLink from '@/app/components/ItemLink'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { Skeleton } from '@/components/ui/skeletons'
import { EmptyState } from '@/components/ui/empty-state'
import { Search01Icon } from '@hugeicons/core-free-icons'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { allRoles, getRoleDisplayName, type Role } from '@/domain/loot/spec-role-mapping'
import { useNotification } from '@/app/contexts/NotificationContext'

// Lazy load the modal to reduce initial bundle size
const PrioListItemModal = dynamic(() => import('@/app/components/PrioListItemModal').then(mod => ({ default: mod.PrioListItemModal })), {
  loading: () => null
})
import { getBossOrder, normalizeBossName } from '@/utils/bossOrder'
import { getBossImage } from '@/utils/bossImages'
import { StarFilledIcon } from '@/components/ui/icons'
import { HorizontalScroll } from '@/components/ui/horizontal-scroll'
import { refreshWowheadTooltips } from '@/lib/wowhead'

interface RaidTier {
  id: string
  name: string
  is_active: boolean
  phase: number | null
}

interface LootItem {
  id: string
  name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
  classification: string
  is_available: boolean
  raid_tier_id: string
  raid_tier_name?: string
}

interface ItemPriority {
  id: string
  item_id: string
  guild_id: string
  raid_tier_id: string
  role_priorities: Record<string, number | null>
  class_priorities: Record<string, number | null>
  character_priorities: Record<string, number | null>
  priority_bonuses: { role: number; class: number; character: number }
  notes: string | null
  loot_item?: LootItem
}

interface Character {
  id: string
  name: string
  class?: {
    name: string
    color_hex: string
  }
}

interface ClassSpec {
  id: string
  class_id: string
  name: string
  combined_name?: string
}

interface WowClass {
  id: string
  name: string
  color_hex: string
}

// Define raid tier progression order (Classic + TBC + WotLK)
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

export default function PriorityListTab() {
  const [lootItems, setLootItems] = useState<LootItem[]>([])
  const [priorities, setPriorities] = useState<Record<string, ItemPriority>>({})
  const [characters, setCharacters] = useState<Character[]>([])
  const [classSpecs, setClassSpecs] = useState<ClassSpec[]>([])
  const [wowClasses, setWowClasses] = useState<WowClass[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [raidTiers, setRaidTiers] = useState<RaidTier[]>([])
  const [selectedPhase, setSelectedPhase] = useState<number | null>(null)
  const [selectedItem, setSelectedItem] = useState<LootItem | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [collapsedBosses, setCollapsedBosses] = useState<Set<string>>(new Set())
  const [collapsedRaids, setCollapsedRaids] = useState<Set<string>>(new Set())

  const supabase = createClient()
  const { activeGuild, loading: guildLoading, isOfficer } = useGuildContext()
  const { showNotification } = useNotification()

  // Get unique phases from raid tiers
  const availablePhases = useMemo(() => {
    const phases = new Set<number>()
    raidTiers.forEach(tier => {
      if (tier.phase !== null) phases.add(tier.phase)
    })
    return Array.from(phases).sort((a, b) => a - b)
  }, [raidTiers])

  // Get tiers for the currently selected phase
  const phaseTiers = useMemo(() => {
    return raidTiers.filter(t => t.phase === selectedPhase)
  }, [raidTiers, selectedPhase])

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      if (guildLoading || !activeGuild) return

      setInitialLoading(true)

      try {
        // Load raid tiers for active expansion
        if (activeGuild.active_expansion_id) {
          const { data: tiersData, error: tiersError } = await supabase
            .from('raid_tiers')
            .select('id, name, is_active, phase')
            .eq('expansion_id', activeGuild.active_expansion_id)
            .eq('is_guild_active', true)

          if (tiersError) {
            console.error('Error loading raid tiers:', tiersError)
          }

          if (tiersData && tiersData.length > 0) {
            // Sort by progression order
            const sortedTiers = tiersData.sort((a: RaidTier, b: RaidTier) =>
              getRaidTierOrder(a.name) - getRaidTierOrder(b.name)
            )
            setRaidTiers(sortedTiers)
            // Set initial phase to current (active tier's phase) or first available
            const activeTier = sortedTiers.find((t: RaidTier) => t.is_active) || sortedTiers[0]
            const initialPhase = activeTier?.phase ?? sortedTiers[0]?.phase ?? 1
            setSelectedPhase(initialPhase)
          }
        }

        // Load WoW classes
        const { data: classesData } = await supabase
          .from('wow_classes')
          .select('*')
          .order('name')

        if (classesData) {
          setWowClasses(classesData)
        }

        // Load class specs
        const { data: specsData } = await supabase
          .from('class_specs')
          .select('*, wow_classes(name)')
          .order('name')

        if (specsData) {
          setClassSpecs(specsData.map((spec: { id: string; class_id: string; name: string; wow_classes?: { name: string } | null }) => ({
            ...spec,
            combined_name: spec.wow_classes?.name === spec.name
              ? spec.name
              : `${spec.wow_classes?.name} ${spec.name}`
          })))
        }

        // Load all characters in the guild (for individual priority)
        // Uses guild-members API with service role to bypass RLS on character_guild_memberships
        const membersResponse = await fetch(`/api/guild-members?guild_id=${activeGuild.id}`)
        if (membersResponse.ok) {
          const membersData = await membersResponse.json()
          if (membersData?.members) {
            const chars: Character[] = []
            for (const member of membersData.members) {
              for (const char of member.characters || []) {
                chars.push({
                  id: char.id,
                  name: char.name,
                  class: char.class || null
                })
              }
            }
            setCharacters(chars.sort((a: Character, b: Character) => a.name.localeCompare(b.name)))
          }
        }

      } catch (error) {
        console.error('Error loading data:', error)
        showNotification('error', 'Couldn\'t load priority list data. Check your connection and try again.')
      }

      setInitialLoading(false)
    }

    loadData()
  }, [guildLoading, activeGuild])

  // Load items and priorities when phase changes
  useEffect(() => {
    const loadItemsAndPriorities = async () => {
      if (selectedPhase === null || !activeGuild || phaseTiers.length === 0) return

      setContentLoading(true)

      try {
        // Get tier IDs for this phase
        const tierIds = phaseTiers.map(t => t.id)

        // Load loot items for all tiers in this phase
        const { data: itemsData } = await supabase
          .from('loot_items')
          .select('id, name, boss_name, item_slot, wowhead_id, classification, is_available, raid_tier_id')
          .in('raid_tier_id', tierIds)
          .eq('is_available', true)
          .order('boss_name')
          .order('name')

        if (itemsData) {
          // Add raid tier name to each item for grouping
          const itemsWithTierName = itemsData.map((item: LootItem) => ({
            ...item,
            raid_tier_name: phaseTiers.find((t: RaidTier) => t.id === item.raid_tier_id)?.name
          }))
          setLootItems(itemsWithTierName)
        }

        // Load existing priorities for all tiers in this phase
        const allPriorities: Record<string, ItemPriority> = {}
        for (const tier of phaseTiers) {
          const response = await fetch(
            `/api/prio-list?guild_id=${activeGuild.id}&raid_tier_id=${tier.id}`
          )

          if (response.ok) {
            const data = await response.json()
            for (const prio of data.priorities || []) {
              allPriorities[prio.item_id] = prio
            }
          }
        }
        setPriorities(allPriorities)
      } catch (error) {
        console.error('Error loading items and priorities:', error)
        showNotification('error', 'Couldn\'t load items and priorities. Try again.')
      }

      setContentLoading(false)
    }

    loadItemsAndPriorities()
  }, [selectedPhase, activeGuild, phaseTiers])

  // Refresh Wowhead tooltips
  useEffect(() => {
    if (lootItems.length > 0) {
      refreshWowheadTooltips(true)
    }
  }, [lootItems])

  // Filter items by search
  const filteredItems = useMemo(() => {
    return lootItems.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.boss_name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [lootItems, searchTerm])

  // Group items by raid tier, then by boss (normalize names to merge multi-boss encounters like Opera Event)
  const groupedByRaidTier = useMemo(() => {
    const groups: Record<string, Record<string, LootItem[]>> = {}
    filteredItems.forEach(item => {
      const tierName = item.raid_tier_name || 'Unknown Raid'
      const boss = normalizeBossName(item.boss_name)
      if (!groups[tierName]) {
        groups[tierName] = {}
      }
      if (!groups[tierName][boss]) {
        groups[tierName][boss] = []
      }
      groups[tierName][boss].push(item)
    })
    return groups
  }, [filteredItems])

  // Flat list of all bosses for navigation (grouped by boss name)
  const groupedByBoss = useMemo(() => {
    const groups: Record<string, LootItem[]> = {}
    filteredItems.forEach(item => {
      const boss = normalizeBossName(item.boss_name)
      if (!groups[boss]) {
        groups[boss] = []
      }
      groups[boss].push(item)
    })
    return groups
  }, [filteredItems])

  const toggleBossCollapse = (bossName: string) => {
    setCollapsedBosses(prev => {
      const newSet = new Set(prev)
      if (newSet.has(bossName)) {
        newSet.delete(bossName)
      } else {
        newSet.add(bossName)
      }
      return newSet
    })
  }

  const toggleRaidCollapse = (raidName: string) => {
    setCollapsedRaids(prev => {
      const newSet = new Set(prev)
      if (newSet.has(raidName)) {
        newSet.delete(raidName)
      } else {
        newSet.add(raidName)
      }
      return newSet
    })
  }

  const collapseAll = () => {
    const bossNames = Object.keys(groupedByBoss).sort((a, b) => getBossOrder(a) - getBossOrder(b))
    setCollapsedBosses(new Set(bossNames))
  }

  const expandAll = () => {
    setCollapsedBosses(new Set())
  }

  const handleEditItem = (item: LootItem) => {
    setSelectedItem(item)
    setShowModal(true)
  }

  const handleSavePriority = async (priority: Partial<ItemPriority>) => {
    if (!selectedItem || !activeGuild) return

    try {
      const response = await fetch('/api/prio-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_id: activeGuild.id,
          item_id: selectedItem.id,
          raid_tier_id: selectedItem.raid_tier_id,
          ...priority
        })
      })

      if (response.ok) {
        const data = await response.json()
        setPriorities(prev => ({
          ...prev,
          [selectedItem.id]: data.priority
        }))
        setShowModal(false)
        setSelectedItem(null)
      }
    } catch (error) {
      console.error('Error saving priority:', error)
      showNotification('error', 'Couldn\'t save priority. Try again.')
    }
  }

  const handleClearPriority = async (itemId: string, raidTierId: string) => {
    if (!activeGuild) return

    try {
      const response = await fetch(
        `/api/prio-list?guild_id=${activeGuild.id}&item_id=${itemId}&raid_tier_id=${raidTierId}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setPriorities(prev => {
          const newPriorities = { ...prev }
          delete newPriorities[itemId]
          return newPriorities
        })
      }
    } catch (error) {
      console.error('Error clearing priority:', error)
      showNotification('error', 'Couldn\'t clear priority. Try again.')
    }
  }

  // Get priority summary for an item
  const getPrioritySummary = (itemId: string) => {
    const priority = priorities[itemId]
    if (!priority) return null

    const parts: string[] = []

    // Role priorities
    const rolePrios = Object.entries(priority.role_priorities || {})
      .filter(([_, rank]) => rank !== null)
      .sort(([, a], [, b]) => (a as number) - (b as number))

    if (rolePrios.length > 0) {
      parts.push(`Roles: ${rolePrios.map(([role, rank]) => `${getRoleDisplayName(role as Role)}(${rank})`).join(', ')}`)
    }

    // Class priorities
    const classPrios = Object.entries(priority.class_priorities || {})
      .filter(([_, rank]) => rank !== null)
      .sort(([, a], [, b]) => (a as number) - (b as number))

    if (classPrios.length > 0) {
      parts.push(`${classPrios.length} spec(s)`)
    }

    // Character priorities
    const charPrios = Object.entries(priority.character_priorities || {})
      .filter(([_, rank]) => rank !== null)
      .sort(([, a], [, b]) => (a as number) - (b as number))

    if (charPrios.length > 0) {
      parts.push(`${charPrios.length} raider(s)`)
    }

    return parts.join(' | ')
  }

  if (initialLoading) {
    return (
      <div className="space-y-6">
        {/* Phase tabs skeleton */}
        <div className="hidden sm:flex gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-[40px]" />
          ))}
        </div>
        {/* Stats grid skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-background-elevated border border-border rounded-xl p-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-12 mt-1" />
            </div>
          ))}
        </div>
        {/* Search + boss nav skeleton */}
        <div className="hidden sm:flex gap-3">
          <div className="flex-shrink-0 bg-background-elevated border border-border rounded-xl p-3">
            <Skeleton className="h-9 w-[160px] rounded-[52px]" />
          </div>
          <div className="flex-1 bg-background-elevated border border-border rounded-xl p-3">
            <div className="flex gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-28 rounded-[40px] flex-shrink-0" />
              ))}
            </div>
          </div>
        </div>
        {/* Boss section skeletons */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-12 w-full rounded-xl" />
            <div className="space-y-1">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-11 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Show message if no phases are available
  if (availablePhases.length === 0) {
    return (
      <div className="bg-background-elevated border border-border rounded-xl p-8 text-center">
        <p className="text-foreground font-medium mb-2">No raid tiers available</p>
        <p className="text-muted-foreground text-sm">
          Enable raid tiers in Guild Settings → Expansions to set up priorities.
        </p>
      </div>
    )
  }

  const bossNames = Object.keys(groupedByBoss).sort((a, b) => getBossOrder(a) - getBossOrder(b))

  return (
    <div className="space-y-6">
      {/* Phase Tabs */}
      {availablePhases.length > 0 && (
        <div>
          {/* Mobile: Dropdown selector */}
          <div className="sm:hidden">
            <Select
              variant="rounded"
              size="sm"
              value={selectedPhase ?? ''}
              onChange={(e) => setSelectedPhase(parseInt(e.target.value))}
            >
              {availablePhases.map((phase) => {
                const isCurrentPhase = phaseTiers.some(t => t.is_active)
                return (
                  <option key={phase} value={phase}>
                    Phase {phase}{selectedPhase === phase && isCurrentPhase ? ' ★' : ''}
                  </option>
                )
              })}
            </Select>
          </div>
          {/* Desktop: Horizontal scroll tabs */}
          <div className="hidden sm:block">
            <HorizontalScroll>
              <div className="flex gap-2 pr-3">
                {availablePhases.map((phase) => {
                  const phaseHasActiveTier = raidTiers.filter(t => t.phase === phase).some(t => t.is_active)
                  return (
                    <Button
                      key={phase}
                      variant={selectedPhase === phase ? 'accent-subtle' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedPhase(phase)}
                      className="rounded-[40px] whitespace-nowrap"
                    >
                      <span className="flex items-center gap-2">
                        Phase {phase}
                        {phaseHasActiveTier && <StarFilledIcon size={14} />}
                      </span>
                    </Button>
                  )
                })}
              </div>
            </HorizontalScroll>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-background-elevated border border-border rounded-xl p-4">
          <p className="text-muted-foreground text-sm">Total Items</p>
          <p className="text-2xl font-bold text-foreground">{filteredItems.length}</p>
        </div>
        <div className="bg-background-elevated border border-border rounded-xl p-4">
          <p className="text-muted-foreground text-sm">With Priorities</p>
          <p className="text-2xl font-bold text-success">
            {Object.keys(priorities).length}
          </p>
        </div>
        <div className="bg-background-elevated border border-border rounded-xl p-4">
          <p className="text-muted-foreground text-sm">No Priorities</p>
          <p className="text-2xl font-bold text-warning">
            {filteredItems.length - Object.keys(priorities).filter(id =>
              filteredItems.some(item => item.id === id)
            ).length}
          </p>
        </div>
        <div className="bg-background-elevated border border-border rounded-xl p-4">
          <p className="text-muted-foreground text-sm">Guild Raiders</p>
          <p className="text-2xl font-bold text-accent">{characters.length}</p>
        </div>
      </div>

      {/* Boss Quick Navigation */}
      {!contentLoading && lootItems.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Mobile: Search + Boss dropdown row */}
          <div className="sm:hidden flex gap-2">
            {/* Search input */}
            <div className="flex-1 bg-background-elevated border border-border rounded-xl p-2">
              <div className="relative">
                <Input
                  variant="rounded"
                  size="sm"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search items..."
                  className={searchTerm ? 'pr-7' : ''}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            {/* Boss dropdown */}
            {bossNames.length > 0 && (
              <div className="flex-1 bg-background-elevated border border-border rounded-xl p-2">
                <Select
                  variant="rounded"
                  size="sm"
                  onChange={(e) => {
                    const element = document.getElementById(`prio-boss-${e.target.value.replace(/\s+/g, '-')}`)
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>Jump to boss...</option>
                  {bossNames.map((boss) => (
                    <option key={boss} value={boss}>{boss}</option>
                  ))}
                </Select>
              </div>
            )}
          </div>
          {/* Desktop: Search input */}
          <div className="hidden sm:flex flex-shrink-0 bg-background-elevated border border-border rounded-xl p-3 items-center">
            <div className="relative">
              <Input
                variant="rounded"
                size="sm"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search items..."
                className={`w-full sm:w-[160px] ${searchTerm ? 'pr-7' : ''}`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          {/* Desktop: Boss chips container with horizontal scroll fade */}
          <div className="flex-1 min-w-0 bg-background-elevated border border-border rounded-xl p-3 overflow-hidden hidden sm:block">
            <div
              className="overflow-x-auto scrollbar-hide"
              style={{
                maskImage: 'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)'
              }}
            >
              <div className="flex gap-2 px-3">
                {bossNames.map((boss) => (
                  <Button
                    key={boss}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const element = document.getElementById(`prio-boss-${boss.replace(/\s+/g, '-')}`)
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    }}
                    className="rounded-[40px] whitespace-nowrap"
                  >
                    {boss}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          {/* Expand/Collapse container */}
          <div className="flex-shrink-0 bg-background-elevated border border-border rounded-xl p-3">
            <div className="flex gap-2 h-full items-center">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Content Loading State */}
      {contentLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-12 w-full rounded-xl" />
              <div className="space-y-1">
                {Array.from({ length: 4 }).map((_, j) => (
                  <Skeleton key={j} className="h-11 w-full rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Items by Raid Tier, then by Boss */}
          {Object.keys(groupedByRaidTier).length === 0 ? (
            <EmptyState
              icon={Search01Icon}
              title="No items found"
              description={searchTerm ? `No items matching "${searchTerm}".` : "No items found for this phase."}
              size="default"
              variant="card"
            />
          ) : (
            <div className="space-y-4">
              {/* Sort raid tiers by progression order */}
              {Object.keys(groupedByRaidTier)
                .sort((a, b) => getRaidTierOrder(a) - getRaidTierOrder(b))
                .map((raidName) => {
                  const raidBosses = groupedByRaidTier[raidName]
                  const bossList = Object.keys(raidBosses).sort((a, b) => getBossOrder(a) - getBossOrder(b))
                  const isRaidCollapsed = collapsedRaids.has(raidName)
                  const totalItems = Object.values(raidBosses).reduce((sum, items) => sum + items.length, 0)

                  return (
                    <div key={raidName} className="space-y-3">
                      {/* Raid Header - only show if multiple raids in phase */}
                      {phaseTiers.length > 1 && (
                        <Button
                          variant="ghost"
                          onClick={() => toggleRaidCollapse(raidName)}
                          className="w-full flex items-center justify-start gap-3 px-4 py-2 bg-background-subtle border border-border rounded-lg hover:bg-muted"
                        >
                          <svg
                            className={`w-4 h-4 text-muted-foreground transition-transform ${isRaidCollapsed ? '' : 'rotate-90'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                          <span className="text-[14px] font-semibold text-foreground">{raidName}</span>
                          <span className="text-[12px] text-foreground-muted">
                            {totalItems} item{totalItems !== 1 ? 's' : ''}
                          </span>
                        </Button>
                      )}

                      {/* Bosses within this raid */}
                      {!isRaidCollapsed && (
                        <div className="space-y-3">
                          {bossList.map((boss) => {
                            const isCollapsed = collapsedBosses.has(boss)
                            const bossItems = raidBosses[boss]

                            return (
                              <div
                                key={`${raidName}-${boss}`}
                                id={`prio-boss-${boss.replace(/\s+/g, '-')}`}
                                className="bg-background-elevated border border-border rounded-xl overflow-hidden scroll-mt-[140px]"
                              >
                                {/* Boss Header - Clickable */}
                                <Button
                                  variant="ghost"
                                  onClick={() => toggleBossCollapse(boss)}
                                  className="w-full px-5 py-3 flex items-center justify-between hover:bg-muted rounded-none"
                                >
                                  <div className="flex items-center gap-3">
                                    {getBossImage(boss) && (
                                      <img
                                        src={getBossImage(boss)!}
                                        alt={boss}
                                        className="w-6 h-6 rounded border border-border/50 shadow-sm"
                                      />
                                    )}
                                    <h2 className="text-[15px] font-semibold text-foreground">{boss}</h2>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[12px] text-foreground-muted font-medium">
                                      {bossItems.length} item{bossItems.length !== 1 ? 's' : ''}
                                    </span>
                                    <svg
                                      className={`w-4 h-4 text-muted-foreground transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </div>
                                </Button>

                                {/* Items Table - Collapsible */}
                                {!isCollapsed && (
                                  <div className="border-t border-border overflow-x-auto max-h-[70vh] overflow-y-auto">
                                    <table className="w-full min-w-[600px]">
                                      <thead className="sticky top-0 z-10">
                                        <tr className="bg-background-subtle">
                                          <th className="px-5 py-2.5 text-left text-[12px] font-medium text-foreground-muted bg-background-subtle">Item</th>
                                          <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted w-[100px] bg-background-subtle">Slot</th>
                                          <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted bg-background-subtle">Priority Summary</th>
                                          <th className="px-3 py-2.5 text-center text-[12px] font-medium text-foreground-muted w-[180px] bg-background-subtle">Actions</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border">
                                        {bossItems.map((item) => {
                                          const hasPriority = !!priorities[item.id]
                                          const summary = getPrioritySummary(item.id)

                                          return (
                                            <tr
                                              key={item.id}
                                              className={`transition-colors hover:bg-muted ${hasPriority ? 'bg-green-900/10' : ''}`}
                                            >
                                              <td className="px-5 py-2.5">
                                                <ItemLink
                                                  name={item.name}
                                                  wowheadId={item.wowhead_id}
                                                  className="font-medium text-[13px]"
                                                />
                                              </td>
                                              <td className="px-3 py-2.5 text-[12px] text-foreground-muted">
                                                {item.item_slot}
                                              </td>
                                              <td className="px-3 py-2.5">
                                                {summary ? (
                                                  <span className="text-[12px] text-green-400">{summary}</span>
                                                ) : (
                                                  <span className="text-[12px] text-muted-foreground italic">No priorities set</span>
                                                )}
                                              </td>
                                              <td className="px-3 py-2.5 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                  <Button variant="outline" size="sm" onClick={() => handleEditItem(item)}>
                                                    {hasPriority ? 'Edit' : 'Set Priority'}
                                                  </Button>
                                                  {hasPriority && (
                                                    <Button variant="ghost" size="sm" onClick={() => handleClearPriority(item.id, item.raid_tier_id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                                      Clear
                                                    </Button>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                          )
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
            </div>
          )}

          {/* Legend */}
          <div className="bg-background-elevated border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-foreground-muted text-[12px]">
                Priority 1 = highest. Bonuses are added to loot scores on the master sheet.
              </p>
              <p className="text-foreground-muted text-[12px]">
                {Object.keys(priorities).length} items with priorities
              </p>
            </div>
          </div>
        </>
      )}

      {/* Priority Edit Modal */}
      {showModal && selectedItem && (
        <PrioListItemModal
          item={selectedItem}
          priority={priorities[selectedItem.id]}
          classSpecs={classSpecs}
          wowClasses={wowClasses}
          characters={characters}
          onSave={handleSavePriority}
          onClose={() => {
            setShowModal(false)
            setSelectedItem(null)
          }}
        />
      )}
    </div>
  )
}
