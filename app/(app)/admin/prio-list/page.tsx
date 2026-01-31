'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import ItemLink from '@/app/components/ItemLink'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { ExpansionGuard } from '@/app/components/ExpansionGuard'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Button } from '@/components/ui/button'
import { Heading } from '@/components/ui/typography'
import { allRoles, getRoleDisplayName, type Role } from '@/utils/spec-role-mapping'

// Lazy load the modal to reduce initial bundle size
const PrioListItemModal = dynamic(() => import('@/app/components/PrioListItemModal').then(mod => ({ default: mod.PrioListItemModal })), {
  loading: () => null
})
import { getBossOrder, normalizeBossName } from '@/utils/bossOrder'
import { getBossImage } from '@/utils/bossImages'
import { StarFilledIcon } from '@/components/ui/icons'
import { HorizontalScroll } from '@/components/ui/horizontal-scroll'
import { refreshWowheadTooltips } from '@/lib/wowhead'

interface LootItem {
  id: string
  name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
  classification: string
  is_available: boolean
  raid_tier_id: string
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

export default function AdminPrioList() {
  const [lootItems, setLootItems] = useState<LootItem[]>([])
  const [priorities, setPriorities] = useState<Record<string, ItemPriority>>({})
  const [characters, setCharacters] = useState<Character[]>([])
  const [classSpecs, setClassSpecs] = useState<ClassSpec[]>([])
  const [wowClasses, setWowClasses] = useState<WowClass[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTier, setFilterTier] = useState<string>('all')
  const [raidTiers, setRaidTiers] = useState<any[]>([])
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<LootItem | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [collapsedBosses, setCollapsedBosses] = useState<Set<string>>(new Set())

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, loading: guildLoading, isOfficer } = useGuildContext()

  // Set page title
  useEffect(() => {
    document.title = 'LootList+ • Priority List'
  }, [])

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      if (guildLoading || !activeGuild) return

      if (!isOfficer) {
        router.push('/overview')
        return
      }

      setInitialLoading(true)

      try {
        // Load raid tiers for active expansion
        if (activeGuild.active_expansion_id) {
          const { data: tiersData } = await supabase
            .from('raid_tiers')
            .select('id, name, is_active')
            .eq('expansion_id', activeGuild.active_expansion_id)
            .eq('is_guild_active', true)

          if (tiersData && tiersData.length > 0) {
            // Sort by progression order
            const sortedTiers = tiersData.sort((a, b) =>
              getRaidTierOrder(a.name) - getRaidTierOrder(b.name)
            )
            setRaidTiers(sortedTiers)
            // Set initial tier to active or first
            const activeTier = sortedTiers.find(t => t.is_active) || sortedTiers[0]
            setSelectedTierId(activeTier.id)
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
          setClassSpecs(specsData.map(spec => ({
            ...spec,
            combined_name: spec.wow_classes?.name === spec.name
              ? spec.name
              : `${spec.wow_classes?.name} ${spec.name}`
          })))
        }

        // Load all characters in the guild (for individual priority)
        const { data: memberships } = await supabase
          .from('character_guild_memberships')
          .select(`
            character:characters(
              id,
              name,
              class:wow_classes(name, color_hex)
            )
          `)
          .eq('guild_id', activeGuild.id)
          .eq('is_active', true)

        if (memberships) {
          const chars = memberships
            .map(m => {
              const char = m.character as any
              if (!char) return null
              // Handle both array and single object returns from Supabase
              const charData = Array.isArray(char) ? char[0] : char
              if (!charData) return null
              return {
                id: charData.id,
                name: charData.name,
                class: Array.isArray(charData.class) ? charData.class[0] : charData.class
              } as Character
            })
            .filter((c): c is Character => c !== null)
          setCharacters(chars.sort((a, b) => a.name.localeCompare(b.name)))
        }

      } catch (error) {
        console.error('Error loading data:', error)
      }

      setInitialLoading(false)
    }

    loadData()
  }, [guildLoading, activeGuild, isOfficer])

  // Load items and priorities when tier changes
  useEffect(() => {
    const loadItemsAndPriorities = async () => {
      if (!selectedTierId || !activeGuild) return

      setContentLoading(true)

      try {
        // Load loot items for this tier
        const { data: itemsData } = await supabase
          .from('loot_items')
          .select('id, name, boss_name, item_slot, wowhead_id, classification, is_available, raid_tier_id')
          .eq('raid_tier_id', selectedTierId)
          .eq('is_available', true)
          .order('boss_name')
          .order('name')

        if (itemsData) {
          setLootItems(itemsData)
        }

        // Load existing priorities
        const response = await fetch(
          `/api/prio-list?guild_id=${activeGuild.id}&raid_tier_id=${selectedTierId}`
        )

        if (response.ok) {
          const data = await response.json()
          const prioMap: Record<number, ItemPriority> = {}
          for (const prio of data.priorities || []) {
            prioMap[prio.item_id] = prio
          }
          setPriorities(prioMap)
        }
      } catch (error) {
        console.error('Error loading items and priorities:', error)
      }

      setContentLoading(false)
    }

    loadItemsAndPriorities()
  }, [selectedTierId, activeGuild])

  // Refresh Wowhead tooltips
  // Uses centralized debounced refresh to prevent excessive API calls
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

  // Group items by boss (normalize names to merge multi-boss encounters like Opera Event)
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
    if (!selectedItem || !activeGuild || !selectedTierId) return

    try {
      const response = await fetch('/api/prio-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_id: activeGuild.id,
          item_id: selectedItem.id,
          raid_tier_id: selectedTierId,
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
    }
  }

  const handleClearPriority = async (itemId: string) => {
    if (!activeGuild || !selectedTierId) return

    try {
      const response = await fetch(
        `/api/prio-list?guild_id=${activeGuild.id}&item_id=${itemId}&raid_tier_id=${selectedTierId}`,
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
    }
  }

  const getSpecName = (specId: string) => {
    const spec = classSpecs.find(s => s.id === specId)
    return spec?.combined_name || spec?.name || specId
  }

  const getSpecColor = (specId: string) => {
    const spec = classSpecs.find(s => s.id === specId)
    if (!spec) return '#888888'
    const wowClass = wowClasses.find(c => c.id === spec.class_id)
    return wowClass?.color_hex || '#888888'
  }

  const getCharacterName = (charId: string) => {
    const char = characters.find(c => c.id === charId)
    return char?.name || charId
  }

  const getCharacterColor = (charId: string) => {
    const char = characters.find(c => c.id === charId)
    return (char?.class as any)?.color_hex || '#888888'
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

  if (initialLoading && lootItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const bossNames = Object.keys(groupedByBoss).sort((a, b) => getBossOrder(a) - getBossOrder(b))

  return (
    <ExpansionGuard>
      <div className="font-poppins">
        {/* Header */}
        <div className="p-4 sm:p-6 lg:p-8 pb-1.5">
          <Heading level={1}>Priority List</Heading>
          <p className="text-muted-foreground mt-1 text-base">
            Set role, class, and individual raider priorities for each item
          </p>
        </div>

        {/* Raid Tier Tabs - Sticky */}
        {raidTiers.length > 0 && (
          <div className="sticky top-0 z-20 px-4 sm:px-6 lg:px-8 py-1.5 bg-background">
            {/* Mobile: Dropdown selector */}
            <div className="sm:hidden">
              <select
                value={selectedTierId || ''}
                onChange={(e) => setSelectedTierId(e.target.value)}
                className="w-full px-4 py-2.5 bg-background-elevated border border-border rounded-xl text-[13px] font-medium text-foreground appearance-none cursor-pointer"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '16px',
                  paddingRight: '40px'
                }}
              >
                {raidTiers.map((tier) => (
                  <option key={tier.id} value={tier.id}>
                    {tier.name}{tier.is_active ? ' ★' : ''}
                  </option>
                ))}
              </select>
            </div>
            {/* Desktop: Horizontal scroll tabs */}
            <div className="hidden sm:block">
              <HorizontalScroll>
                <div className="flex gap-2 pr-3">
                  {raidTiers.map((tier) => (
                    <button
                      key={tier.id}
                      onClick={() => setSelectedTierId(tier.id)}
                      className={`px-5 py-2.5 rounded-[40px] whitespace-nowrap text-[13px] font-medium transition-all border ${
                        selectedTierId === tier.id
                          ? 'bg-accent/20 border-accent/20 text-accent'
                          : 'bg-background-elevated border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {tier.name}
                        {tier.is_active && <StarFilledIcon size={14} />}
                      </span>
                    </button>
                  ))}
                </div>
              </HorizontalScroll>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="px-4 sm:px-6 lg:px-8 py-1.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-background-elevated border border-border rounded-xl p-4">
              <p className="text-muted-foreground text-sm">Total Items</p>
              <p className="text-2xl font-bold text-foreground">{filteredItems.length}</p>
            </div>
            <div className="bg-background-elevated border border-border rounded-xl p-4">
              <p className="text-muted-foreground text-sm">With Priorities</p>
              <p className="text-2xl font-bold text-green-400">
                {Object.keys(priorities).length}
              </p>
            </div>
            <div className="bg-background-elevated border border-border rounded-xl p-4">
              <p className="text-muted-foreground text-sm">No Priorities</p>
              <p className="text-2xl font-bold text-yellow-400">
                {filteredItems.length - Object.keys(priorities).filter(id =>
                  filteredItems.some(item => item.id === id)
                ).length}
              </p>
            </div>
            <div className="bg-background-elevated border border-border rounded-xl p-4">
              <p className="text-muted-foreground text-sm">Guild Raiders</p>
              <p className="text-2xl font-bold text-blue-400">{characters.length}</p>
            </div>
          </div>
        </div>

        {/* Boss Quick Navigation - Sticky below tier tabs */}
        {!contentLoading && bossNames.length > 0 && (
          <div className="sticky top-[52px] sm:top-[64px] z-10 px-4 sm:px-6 lg:px-8 py-1.5 bg-background">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Mobile: Search + Boss dropdown row */}
              <div className="sm:hidden flex gap-2">
                {/* Search input */}
                <div className="flex-1 bg-background-elevated border border-border rounded-xl p-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="w-full px-3 py-1.5 bg-background-elevated border border-border rounded-[40px] text-foreground text-xs focus:outline-none focus:border-accent placeholder:text-foreground-muted"
                  />
                </div>
                {/* Boss dropdown */}
                <div className="flex-1 bg-background-elevated border border-border rounded-xl p-2">
                  <select
                    onChange={(e) => {
                      const element = document.getElementById(`boss-${e.target.value.replace(/\s+/g, '-')}`)
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }
                    }}
                    defaultValue=""
                    className="w-full px-3 py-1.5 bg-background-elevated border border-border rounded-[40px] text-foreground text-xs appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 8px center',
                      backgroundSize: '14px',
                      paddingRight: '28px'
                    }}
                  >
                    <option value="" disabled>Jump to boss...</option>
                    {bossNames.map((boss) => (
                      <option key={boss} value={boss}>{boss}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Desktop: Search input */}
              <div className="hidden sm:flex flex-shrink-0 bg-background-elevated border border-border rounded-xl p-3 items-center">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search items..."
                  className="w-full sm:w-[160px] px-3 py-1.5 bg-background-elevated border border-border rounded-[40px] text-foreground text-xs focus:outline-none focus:border-accent placeholder:text-foreground-muted"
                />
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
                      <button
                        key={boss}
                        onClick={() => {
                          const element = document.getElementById(`boss-${boss.replace(/\s+/g, '-')}`)
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }
                        }}
                        className="px-4 py-2 bg-background-inset hover:bg-muted border border-border rounded-[40px] text-sm font-medium text-foreground whitespace-nowrap transition"
                      >
                        {boss}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Expand/Collapse container */}
              <div className="flex-shrink-0 bg-background-elevated border border-border rounded-xl p-3">
                <div className="flex gap-2 h-full items-center">
                  <Button variant="secondary" size="sm" onClick={expandAll}>
                    Expand All
                  </Button>
                  <Button variant="secondary" size="sm" onClick={collapseAll}>
                    Collapse All
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="px-4 sm:px-6 lg:px-8 pt-1.5 pb-6 space-y-6">

        {/* Content Loading State */}
        {contentLoading ? (
          <div className="bg-background-elevated border border-border rounded-xl p-12">
            <div className="flex flex-col items-center justify-center gap-4">
              <LoadingSpinner />
              <p className="text-muted-foreground text-sm">Loading items...</p>
            </div>
          </div>
        ) : (
        <>
        {/* Items by Boss */}
        {bossNames.length === 0 ? (
          <div className="bg-background-elevated border border-border rounded-xl p-8 text-center">
            <p className="text-muted-foreground">No items found for this raid tier</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bossNames.map((boss) => {
              const isCollapsed = collapsedBosses.has(boss)
              const bossItems = groupedByBoss[boss]

              return (
                <div
                  key={boss}
                  id={`boss-${boss.replace(/\s+/g, '-')}`}
                  className="bg-background-elevated border border-border rounded-xl overflow-hidden scroll-mt-[140px]"
                >
                  {/* Boss Header - Clickable */}
                  <button
                    onClick={() => toggleBossCollapse(boss)}
                    className="w-full px-5 py-3 flex items-center justify-between hover:bg-muted transition-colors"
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
                  </button>

                  {/* Items Table - Collapsible */}
                  {!isCollapsed && (
                    <div className="border-t border-border overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead>
                          <tr className="bg-background-subtle">
                            <th className="px-5 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Item</th>
                            <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted w-[100px]">Slot</th>
                            <th className="px-3 py-2.5 text-left text-[12px] font-medium text-foreground-muted">Priority Summary</th>
                            <th className="px-3 py-2.5 text-center text-[12px] font-medium text-foreground-muted w-[180px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {bossItems.map((item) => {
                            const hasPriority = !!priorities[item.id]
                            const summary = getPrioritySummary(item.id)

                            return (
                              <tr
                                key={item.id}
                                className={`transition-all hover:bg-muted ${hasPriority ? 'bg-green-900/10' : ''}`}
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
                                    <Button variant="secondary" size="sm" onClick={() => handleEditItem(item)}>
                                      {hasPriority ? 'Edit' : 'Set Priority'}
                                    </Button>
                                    {hasPriority && (
                                      <Button variant="ghost" size="sm" onClick={() => handleClearPriority(item.id)} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
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
        </div>
      </div>

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
    </ExpansionGuard>
  )
}
