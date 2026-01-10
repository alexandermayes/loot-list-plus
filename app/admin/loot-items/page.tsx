'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/app/components/Navigation'
import ItemLink from '@/app/components/ItemLink'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { ExpansionGuard } from '@/app/components/ExpansionGuard'

interface LootItem {
  id: string
  name: string
  boss_name: string
  item_slot: string
  wowhead_id: number
  classification: string
  item_type: string
  allocation_cost: number
  is_available: boolean
  raid_tier: {
    name: string
  }
}

interface WowClass {
  id: string
  name: string
  color_hex: string
}

interface ClassSpec {
  id: string
  class_id: string
  name: string
}

interface ItemClassRelation {
  class_id: string
  spec_id: string | null
  spec_type: string // 'primary' or 'secondary'
}

export default function AdminLootItems() {
  const [lootItems, setLootItems] = useState<LootItem[]>([])
  const [classes, setClasses] = useState<WowClass[]>([])
  const [classSpecs, setClassSpecs] = useState<ClassSpec[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTier, setFilterTier] = useState<string>('all')
  const [raidTiers, setRaidTiers] = useState<any[]>([])
  // Track specs for each item: { itemId: { primary: Set<specId>, secondary: Set<specId> } }
  const [itemSpecs, setItemSpecs] = useState<Record<string, { primary: Set<string>, secondary: Set<string> }>>({})

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, activeMember, loading: guildLoading, isOfficer } = useGuildContext()

  useEffect(() => {
    if (!guildLoading) {
      loadData()
    }
  }, [guildLoading, activeGuild, isOfficer])

  // Refresh Wowhead tooltips after items are loaded
  useEffect(() => {
    if (lootItems.length > 0 && typeof window !== 'undefined' && (window as any).$WowheadPower) {
      setTimeout(() => {
        (window as any).$WowheadPower.refreshLinks()
      }, 100)
    }
  }, [lootItems])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/')
      return
    }
    setUser(user)

    // Check if officer using context
    if (!isOfficer) {
      router.push('/dashboard')
      return
    }

    if (!activeGuild || !activeMember) {
      setLoading(false)
      return
    }

    setMember(activeMember)

    // Load all WoW classes
    const { data: classesData } = await supabase
      .from('wow_classes')
      .select('*')
      .order('name')

    if (classesData) {
      setClasses(classesData)
    }

    // Load all class specs
    const { data: specsData } = await supabase
      .from('class_specs')
      .select('*')
      .order('name')

    if (specsData) {
      setClassSpecs(specsData)
    }

    // Load raid tiers for filtering (only for active expansion)
    if (activeGuild.active_expansion_id) {
      const { data: tiersData } = await supabase
        .from('raid_tiers')
        .select('id, name')
        .eq('expansion_id', activeGuild.active_expansion_id)
        .order('name')

      if (tiersData) {
        setRaidTiers(tiersData)
      }

      // Load all loot items
      await loadLootItems(activeGuild.active_expansion_id)
    }
    setLoading(false)
  }

  const loadLootItems = async (expansionId: string) => {
    // Get raid tiers for active expansion
    const { data: tiersData } = await supabase
      .from('raid_tiers')
      .select('id')
      .eq('expansion_id', expansionId)

    if (!tiersData || tiersData.length === 0) return

    const tierIds = tiersData.map((t: any) => t.id)

    // Load loot items
    const { data: itemsData } = await supabase
      .from('loot_items')
      .select(`
        id,
        name,
        boss_name,
        item_slot,
        wowhead_id,
        classification,
        item_type,
        allocation_cost,
        is_available,
        raid_tier:raid_tiers(name)
      `)
      .in('raid_tier_id', tierIds)
      .order('name')

    if (itemsData) {
      setLootItems(itemsData as any)

      // Load all spec relations for all items
      const itemIds = itemsData.map((item: any) => item.id)
      const { data: specRelations } = await supabase
        .from('loot_item_classes')
        .select('loot_item_id, spec_id, spec_type')
        .in('loot_item_id', itemIds)
        .not('spec_id', 'is', null)

      // Organize specs by item
      const specs: Record<string, { primary: Set<string>, secondary: Set<string> }> = {}
      itemIds.forEach((id: string) => {
        specs[id] = { primary: new Set(), secondary: new Set() }
      })

      if (specRelations) {
        specRelations.forEach((rel: any) => {
          if (rel.spec_id) {
            if (rel.spec_type === 'primary') {
              specs[rel.loot_item_id].primary.add(rel.spec_id)
            } else if (rel.spec_type === 'secondary') {
              specs[rel.loot_item_id].secondary.add(rel.spec_id)
            }
          }
        })
      }

      setItemSpecs(specs)
    }
  }

  const toggleAvailability = async (itemId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('loot_items')
      .update({ is_available: !currentStatus })
      .eq('id', itemId)

    if (!error) {
      setLootItems(items => items.map(item =>
        item.id === itemId ? { ...item, is_available: !currentStatus } : item
      ))
    }
  }

  const updateClassification = async (itemId: string, classification: string) => {
    const allocationCost = (classification === 'Reserved' || classification === 'Limited') ? 1 : 0

    const { error } = await supabase
      .from('loot_items')
      .update({
        classification,
        allocation_cost: allocationCost
      })
      .eq('id', itemId)

    if (!error) {
      setLootItems(items => items.map(item =>
        item.id === itemId ? { ...item, classification, allocation_cost: allocationCost } : item
      ))
    }
  }

  // Add a spec to an item (immediately saves to database)
  const addSpec = async (itemId: string, specId: string, specType: 'primary' | 'secondary') => {
    const spec = classSpecs.find(s => s.id === specId)
    if (!spec) return

    // Check if spec already exists
    const currentSpecs = itemSpecs[itemId] || { primary: new Set(), secondary: new Set() }
    if (currentSpecs[specType].has(specId)) return

    // Remove from opposite type if it exists there
    const oppositeType = specType === 'primary' ? 'secondary' : 'primary'
    if (currentSpecs[oppositeType].has(specId)) {
      await removeSpec(itemId, specId, oppositeType)
    }

    // Insert into database
    const { error } = await supabase
      .from('loot_item_classes')
      .insert({
        loot_item_id: itemId,
        class_id: spec.class_id,
        spec_id: specId,
        spec_type: specType
      })

    if (!error) {
      // Update local state
      setItemSpecs(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          [specType]: new Set([...prev[itemId][specType], specId])
        }
      }))
    } else {
      console.error('Error adding spec:', error)
    }
  }

  // Remove a spec from an item (immediately deletes from database)
  const removeSpec = async (itemId: string, specId: string, specType: 'primary' | 'secondary') => {
    // Delete from database
    const { error } = await supabase
      .from('loot_item_classes')
      .delete()
      .eq('loot_item_id', itemId)
      .eq('spec_id', specId)
      .eq('spec_type', specType)

    if (!error) {
      // Update local state
      setItemSpecs(prev => {
        const newSpecs = new Set(prev[itemId][specType])
        newSpecs.delete(specId)
        return {
          ...prev,
          [itemId]: {
            ...prev[itemId],
            [specType]: newSpecs
          }
        }
      })
    } else {
      console.error('Error removing spec:', error)
    }
  }

  // Get display name for a spec (e.g., "Paladin Holy" or just "Hunter" for single-spec classes)
  const getSpecName = (specId: string) => {
    const spec = classSpecs.find(s => s.id === specId)
    if (!spec) return ''
    const wowClass = classes.find(c => c.id === spec.class_id)

    // If class name equals spec name, just show class name (e.g., "Hunter" not "Hunter Hunter")
    if (wowClass?.name === spec.name) {
      return wowClass.name
    }

    return `${wowClass?.name} ${spec.name}`
  }

  // Get color for a spec (from class color)
  const getSpecColor = (specId: string) => {
    const spec = classSpecs.find(s => s.id === specId)
    if (!spec) return '#888888'
    const wowClass = classes.find(c => c.id === spec.class_id)
    return wowClass?.color_hex || '#888888'
  }

  // Get all available specs as "Class Spec" options for dropdown
  const getClassSpecOptions = () => {
    return classSpecs
      .map(spec => {
        const wowClass = classes.find(c => c.id === spec.class_id)

        // If class name equals spec name, just show class name
        const label = wowClass?.name === spec.name
          ? wowClass.name
          : `${wowClass?.name} ${spec.name}`

        return {
          id: spec.id,
          label,
          classColor: wowClass?.color_hex || '#888888'
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label))
  }

  const filteredItems = lootItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.boss_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTier = filterTier === 'all' || (item.raid_tier as any)?.name === filterTier
    return matchesSearch && matchesTier
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <ExpansionGuard>
      <div className="min-h-screen bg-background">
      <Navigation
        user={user}
        characterName={member?.character_name}
        className={member?.class?.name}
        classColor={member?.class?.color_hex}
        role={member?.role}
        showBack
        backUrl="/admin"
        title="Manage Loot Items"
      />

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Loot Item Management</h1>
          <p className="text-muted-foreground">
            Manage item availability, classification, and class restrictions for all loot items
          </p>
        </div>

        {/* Filters */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Search Items</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or boss..."
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Filter by Raid</label>
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Raids</option>
                {raidTiers.map(tier => (
                  <option key={tier.id} value={tier.name}>{tier.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-muted-foreground text-sm">Total Items</p>
            <p className="text-2xl font-bold text-foreground">{filteredItems.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-muted-foreground text-sm">Available</p>
            <p className="text-2xl font-bold text-green-400">
              {filteredItems.filter(i => i.is_available).length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-muted-foreground text-sm">Reserved</p>
            <p className="text-2xl font-bold text-red-400">
              {filteredItems.filter(i => i.classification === 'Reserved').length}
            </p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-muted-foreground text-sm">Limited</p>
            <p className="text-2xl font-bold text-yellow-400">
              {filteredItems.filter(i => i.classification === 'Limited').length}
            </p>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-accent border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Available</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Item Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Boss</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Slot</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Raid</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Classification</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Primary Specs</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Secondary Specs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-accent">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleAvailability(item.id, item.is_available)}
                        className={`w-6 h-6 rounded ${
                          item.is_available
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-gray-600 hover:bg-secondary'
                        } flex items-center justify-center`}
                      >
                        {item.is_available && (
                          <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      <ItemLink name={item.name} wowheadId={item.wowhead_id} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.boss_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.item_slot}</td>
                    <td className="px-4 py-3 text-muted-foreground">{(item.raid_tier as any)?.name}</td>
                    <td className="px-4 py-3">
                      <select
                        value={item.classification}
                        onChange={(e) => updateClassification(item.id, e.target.value)}
                        className="px-3 py-1 bg-secondary border border-border rounded text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="Reserved">Reserved</option>
                        <option value="Limited">Limited</option>
                        <option value="Unlimited">Unlimited</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              addSpec(item.id, e.target.value, 'primary')
                            }
                          }}
                          className="w-full px-2 py-1 bg-secondary border border-border rounded text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="">+ Add Primary Spec...</option>
                          {getClassSpecOptions().map(opt => {
                            const isAssigned = itemSpecs[item.id]?.primary.has(opt.id) || itemSpecs[item.id]?.secondary.has(opt.id)
                            return (
                              <option key={opt.id} value={opt.id} disabled={isAssigned} className={isAssigned ? 'text-gray-500' : ''}>
                                {opt.label}
                              </option>
                            )
                          })}
                        </select>
                        {itemSpecs[item.id]?.primary.size > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {Array.from(itemSpecs[item.id].primary).map(specId => (
                              <div
                                key={specId}
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border border-green-600 bg-green-900/30"
                              >
                                <div
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: getSpecColor(specId) }}
                                />
                                <span className="text-foreground">{getSpecName(specId)}</span>
                                <button
                                  onClick={() => removeSpec(item.id, specId, 'primary')}
                                  className="ml-0.5 hover:text-red-400"
                                  title="Remove"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              addSpec(item.id, e.target.value, 'secondary')
                            }
                          }}
                          className="w-full px-2 py-1 bg-secondary border border-border rounded text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-yellow-500"
                        >
                          <option value="">+ Add Secondary Spec...</option>
                          {getClassSpecOptions().map(opt => {
                            const isAssigned = itemSpecs[item.id]?.primary.has(opt.id) || itemSpecs[item.id]?.secondary.has(opt.id)
                            return (
                              <option key={opt.id} value={opt.id} disabled={isAssigned} className={isAssigned ? 'text-gray-500' : ''}>
                                {opt.label}
                              </option>
                            )
                          })}
                        </select>
                        {itemSpecs[item.id]?.secondary.size > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {Array.from(itemSpecs[item.id].secondary).map(specId => (
                              <div
                                key={specId}
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border border-yellow-600 bg-yellow-900/30"
                              >
                                <div
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: getSpecColor(specId) }}
                                />
                                <span className="text-foreground">{getSpecName(specId)}</span>
                                <button
                                  onClick={() => removeSpec(item.id, specId, 'secondary')}
                                  className="ml-0.5 hover:text-red-400"
                                  title="Remove"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No items found matching your filters
          </div>
        )}
      </main>

    </div>
    </ExpansionGuard>
  )
}
