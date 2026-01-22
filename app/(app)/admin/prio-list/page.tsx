'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import ItemLink from '@/app/components/ItemLink'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { ExpansionGuard } from '@/app/components/ExpansionGuard'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { allRoles, getRoleDisplayName, type Role } from '@/utils/spec-role-mapping'

// Lazy load the modal to reduce initial bundle size
const PrioListItemModal = dynamic(() => import('@/app/components/PrioListItemModal').then(mod => ({ default: mod.PrioListItemModal })), {
  loading: () => null
})
import { getBossOrder, normalizeBossName } from '@/utils/bossOrder'
import { getBossImage } from '@/utils/bossImages'

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

export default function AdminPrioList() {
  const [lootItems, setLootItems] = useState<LootItem[]>([])
  const [priorities, setPriorities] = useState<Record<string, ItemPriority>>({})
  const [characters, setCharacters] = useState<Character[]>([])
  const [classSpecs, setClassSpecs] = useState<ClassSpec[]>([])
  const [wowClasses, setWowClasses] = useState<WowClass[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTier, setFilterTier] = useState<string>('all')
  const [raidTiers, setRaidTiers] = useState<any[]>([])
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<LootItem | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [collapsedBosses, setCollapsedBosses] = useState<Set<string>>(new Set())
  const [tierScrollState, setTierScrollState] = useState({ left: false, right: true })
  const tierScrollRef = useRef<HTMLDivElement>(null)

  // Handle tier scroll to show/hide fades
  const handleTierScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const scrollLeft = el.scrollLeft
    const maxScroll = el.scrollWidth - el.clientWidth
    setTierScrollState({
      left: scrollLeft > 5,
      right: scrollLeft < maxScroll - 5
    })
  }, [])

  // Check initial tier scroll state
  useEffect(() => {
    const el = tierScrollRef.current
    if (el) {
      const maxScroll = el.scrollWidth - el.clientWidth
      setTierScrollState({
        left: el.scrollLeft > 5,
        right: maxScroll > 5
      })
    }
  }, [raidTiers])

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
        router.push('/dashboard')
        return
      }

      setLoading(true)

      try {
        // Load raid tiers for active expansion
        if (activeGuild.active_expansion_id) {
          const { data: tiersData } = await supabase
            .from('raid_tiers')
            .select('id, name, is_active')
            .eq('expansion_id', activeGuild.active_expansion_id)
            .order('name')

          if (tiersData && tiersData.length > 0) {
            setRaidTiers(tiersData)
            // Set initial tier to active or first
            const activeTier = tiersData.find(t => t.is_active) || tiersData[0]
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

      setLoading(false)
    }

    loadData()
  }, [guildLoading, activeGuild, isOfficer])

  // Load items and priorities when tier changes
  useEffect(() => {
    const loadItemsAndPriorities = async () => {
      if (!selectedTierId || !activeGuild) return

      setLoading(true)

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

      setLoading(false)
    }

    loadItemsAndPriorities()
  }, [selectedTierId, activeGuild])

  // Refresh Wowhead tooltips
  useEffect(() => {
    if (lootItems.length > 0 && typeof window !== 'undefined' && (window as any).$WowheadPower) {
      setTimeout(() => {
        (window as any).$WowheadPower.refreshLinks()
      }, 100)
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

  if (loading && lootItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const bossNames = Object.keys(groupedByBoss).sort((a, b) => getBossOrder(a) - getBossOrder(b))

  return (
    <ExpansionGuard>
      <div className="p-8 space-y-6 font-poppins">
        {/* Header */}
        <div>
          <h1 className="text-[42px] font-bold text-white leading-tight">Priority List</h1>
          <p className="text-[#a1a1a1] mt-1 text-[14px]">
            Set role, class, and individual raider priorities for each item
          </p>
        </div>

        {/* Raid Tier Tabs */}
        {raidTiers.length > 0 && (
          <div
            ref={tierScrollRef}
            onScroll={handleTierScroll}
            className="overflow-x-auto pb-2 scrollbar-hide"
            style={{
              maskImage: `linear-gradient(to right, ${tierScrollState.left ? 'transparent' : 'black'}, black ${tierScrollState.left ? '24px' : '0px'}, black calc(100% - ${tierScrollState.right ? '24px' : '0px'}), ${tierScrollState.right ? 'transparent' : 'black'})`,
              WebkitMaskImage: `linear-gradient(to right, ${tierScrollState.left ? 'transparent' : 'black'}, black ${tierScrollState.left ? '24px' : '0px'}, black calc(100% - ${tierScrollState.right ? '24px' : '0px'}), ${tierScrollState.right ? 'transparent' : 'black'})`
            }}
          >
            <div className="flex gap-2 pr-3">
              {raidTiers.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setSelectedTierId(tier.id)}
                  className={`px-5 py-2.5 rounded-[40px] whitespace-nowrap text-[13px] font-medium transition-all ${
                    selectedTierId === tier.id
                      ? 'bg-[rgba(255,128,0,0.2)] border-[0.5px] border-[rgba(255,128,0,0.2)] text-[#ff8000]'
                      : 'bg-[#151515] border border-[rgba(255,255,255,0.1)] text-white hover:bg-[#1a1a1a]'
                  }`}
                >
                  {tier.name}
                  {tier.is_active && ' ⭐'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
          <label className="block text-[13px] font-medium text-white mb-2">Search Items</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or boss..."
            className="w-full md:w-1/2 px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000]"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
            <p className="text-[#a1a1a1] text-sm">Total Items</p>
            <p className="text-2xl font-bold text-white">{filteredItems.length}</p>
          </div>
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
            <p className="text-[#a1a1a1] text-sm">With Priorities</p>
            <p className="text-2xl font-bold text-green-400">
              {Object.keys(priorities).length}
            </p>
          </div>
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
            <p className="text-[#a1a1a1] text-sm">No Priorities</p>
            <p className="text-2xl font-bold text-yellow-400">
              {filteredItems.length - Object.keys(priorities).filter(id =>
                filteredItems.some(item => item.id === id)
              ).length}
            </p>
          </div>
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
            <p className="text-[#a1a1a1] text-sm">Guild Raiders</p>
            <p className="text-2xl font-bold text-blue-400">{characters.length}</p>
          </div>
        </div>

        {/* Boss Quick Navigation */}
        {bossNames.length > 0 && (
          <div className="sticky top-0 z-10">
            <div className="flex gap-3">
              {/* Boss chips container with horizontal scroll fade */}
              <div className="flex-1 min-w-0 bg-[#0d0e11]/95 backdrop-blur-sm border border-[rgba(255,255,255,0.1)] rounded-xl p-3 overflow-hidden">
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
                        className="px-3 py-1.5 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[40px] text-xs font-medium text-white whitespace-nowrap transition"
                      >
                        {boss}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Expand/Collapse container */}
              <div className="flex-shrink-0 bg-[#0d0e11]/95 backdrop-blur-sm border border-[rgba(255,255,255,0.1)] rounded-xl p-3">
                <div className="flex gap-2 h-full items-center">
                  <button
                    onClick={expandAll}
                    className="px-3 py-1.5 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[40px] text-xs font-medium text-[#a1a1a1] hover:text-white whitespace-nowrap transition"
                  >
                    Expand All
                  </button>
                  <button
                    onClick={collapseAll}
                    className="px-3 py-1.5 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[40px] text-xs font-medium text-[#a1a1a1] hover:text-white whitespace-nowrap transition"
                  >
                    Collapse All
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Items by Boss */}
        {bossNames.length === 0 ? (
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-8 text-center">
            <p className="text-[#a1a1a1]">No items found for this raid tier</p>
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
                  className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl overflow-hidden"
                >
                  {/* Boss Header - Clickable */}
                  <button
                    onClick={() => toggleBossCollapse(boss)}
                    className="w-full px-5 py-3 flex items-center justify-between hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getBossImage(boss) && (
                        <img
                          src={getBossImage(boss)!}
                          alt={boss}
                          className="w-6 h-6 rounded"
                        />
                      )}
                      <h2 className="text-[15px] font-semibold text-white">{boss}</h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] text-[#666] font-medium">
                        {bossItems.length} item{bossItems.length !== 1 ? 's' : ''}
                      </span>
                      <svg
                        className={`w-4 h-4 text-[#a1a1a1] transition-transform ${isCollapsed ? '' : 'rotate-90'}`}
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
                    <div className="border-t border-[rgba(255,255,255,0.1)]">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-[#0d0e11]">
                            <th className="px-5 py-2.5 text-left text-[12px] font-medium text-[#666]">Item</th>
                            <th className="px-3 py-2.5 text-left text-[12px] font-medium text-[#666] w-[100px]">Slot</th>
                            <th className="px-3 py-2.5 text-left text-[12px] font-medium text-[#666]">Priority Summary</th>
                            <th className="px-3 py-2.5 text-center text-[12px] font-medium text-[#666] w-[180px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgba(255,255,255,0.05)]">
                          {bossItems.map((item) => {
                            const hasPriority = !!priorities[item.id]
                            const summary = getPrioritySummary(item.id)

                            return (
                              <tr
                                key={item.id}
                                className={`transition-all hover:bg-[#1a1a1a] ${hasPriority ? 'bg-green-900/10' : ''}`}
                              >
                                <td className="px-5 py-2.5">
                                  <ItemLink
                                    name={item.name}
                                    wowheadId={item.wowhead_id}
                                    className="font-medium text-[13px]"
                                  />
                                </td>
                                <td className="px-3 py-2.5 text-[12px] text-[#666]">
                                  {item.item_slot}
                                </td>
                                <td className="px-3 py-2.5">
                                  {summary ? (
                                    <span className="text-[12px] text-green-400">{summary}</span>
                                  ) : (
                                    <span className="text-[12px] text-[#444] italic">No priorities set</span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => handleEditItem(item)}
                                      className="px-3 py-1.5 bg-[#151515] hover:bg-[#1a1a1a] border border-[#383838] text-white text-[11px] font-medium rounded-[52px] transition"
                                    >
                                      {hasPriority ? 'Edit' : 'Set Priority'}
                                    </button>
                                    {hasPriority && (
                                      <button
                                        onClick={() => handleClearPriority(item.id)}
                                        className="px-3 py-1.5 bg-[#151515] hover:bg-red-900/30 border border-[#383838] hover:border-red-600/50 text-[#a1a1a1] hover:text-red-400 text-[11px] font-medium rounded-[52px] transition"
                                      >
                                        Clear
                                      </button>
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
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <p className="text-[#666] text-[12px]">
              Priority 1 = highest. Bonuses are added to loot scores on the master sheet.
            </p>
            <p className="text-[#666] text-[12px]">
              {Object.keys(priorities).length} items with priorities
            </p>
          </div>
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
