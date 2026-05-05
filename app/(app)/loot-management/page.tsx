'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import ItemLink from '@/app/components/ItemLink'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { ExpansionGuard } from '@/app/components/ExpansionGuard'
import { LootItemsPageSkeleton } from '@/components/ui/skeletons'
import { Heading } from '@/components/ui/typography'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/ui/empty-state'
import { Search01Icon } from '@hugeicons/core-free-icons'
import { normalizeBossName } from '@/utils/bossOrder'
import { refreshWowheadTooltips } from '@/lib/wowhead'
import { getRaidIcon } from '@/utils/raidIcons'
import { getBossImage } from '@/utils/bossImages'
import { Checkbox } from '@/components/ui/checkbox'
import { trackClientEvent } from '@/utils/analytics/client'

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
  is_loot_council: boolean
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

export default function AdminLootItems() {
  const [lootItems, setLootItems] = useState<LootItem[]>([])
  const [classes, setClasses] = useState<WowClass[]>([])
  const [classSpecs, setClassSpecs] = useState<ClassSpec[]>([])
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTier, setFilterTier] = useState<string>('all')
  const [raidTiers, setRaidTiers] = useState<any[]>([])
  const tableContainerRef = useRef<HTMLDivElement>(null)
  // Track specs for each item: { itemId: { primary: Set<specId>, secondary: Set<specId> } }
  const [itemSpecs, setItemSpecs] = useState<Record<string, { primary: Set<string>, secondary: Set<string> }>>({})

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, activeMember, loading: guildLoading, hasPermission } = useGuildContext()
  const { showNotification } = useNotification()

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
        is_loot_council,
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

  const loadData = async () => {
    // Check if officer using context
    if (!hasPermission('manage_settings')) {
      router.push('/overview')
      return
    }

    if (!activeGuild || !activeMember) {
      setLoading(false)
      return
    }

    try {
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

        if (tiersData) {
          // Sort by progression order
          const sortedTiers = tiersData.sort((a: { id: string; name: string }, b: { id: string; name: string }) =>
            getRaidTierOrder(a.name) - getRaidTierOrder(b.name)
          )
          setRaidTiers(sortedTiers)
        }

        // Load all loot items
        await loadLootItems(activeGuild.active_expansion_id)
      }
    } catch (error) {
      console.error('Error loading loot items data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Set page title and track view
  useEffect(() => {
    document.title = 'LootList+ • Manage Loot'
    if (activeGuild?.id) trackClientEvent('loot_management_page_viewed', { guild_id: activeGuild.id })
  }, [activeGuild?.id])

  useEffect(() => {
    if (!guildLoading) {
      loadData().catch(console.error)
    }
  }, [guildLoading, activeGuild])

  // Refresh Wowhead tooltips after items are loaded
  // Uses centralized debounced refresh to prevent excessive API calls
  useEffect(() => {
    if (lootItems.length > 0) {
      refreshWowheadTooltips(true)
    }
  }, [lootItems])

  /** Server-side loot item update — bypasses RLS via service role after officer permission check */
  const updateLootItem = async (itemId: string, updates: Record<string, unknown>): Promise<boolean> => {
    if (!activeGuild?.id) return false

    const res = await fetch('/api/loot-items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guild_id: activeGuild.id, item_id: itemId, updates }),
    })

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      showNotification('error', errBody.error || 'Couldn\'t save changes. Try again.')
      return false
    }

    return true
  }

  const toggleAvailability = async (itemId: string, currentStatus: boolean) => {
    const success = await updateLootItem(itemId, { is_available: !currentStatus })
    if (!success) return

    setLootItems(items => items.map(item =>
      item.id === itemId ? { ...item, is_available: !currentStatus } : item
    ))
  }

  const toggleLootCouncil = async (itemId: string, currentStatus: boolean) => {
    const success = await updateLootItem(itemId, { is_loot_council: !currentStatus })
    if (!success) return

    setLootItems(items => items.map(item =>
      item.id === itemId ? { ...item, is_loot_council: !currentStatus } : item
    ))
    showNotification('success', `Item ${!currentStatus ? 'marked as' : 'removed from'} Loot Council`)
  }

  const updateClassification = async (itemId: string, classification: string) => {
    const allocationCost = (classification === 'Reserved' || classification === 'Limited') ? 1 : 0
    const success = await updateLootItem(itemId, { classification, allocation_cost: allocationCost })
    if (!success) return

    setLootItems(items => items.map(item =>
      item.id === itemId ? { ...item, classification, allocation_cost: allocationCost } : item
    ))
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
      showNotification('error', 'Couldn\'t add spec. Try again.')
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
      showNotification('error', 'Couldn\'t remove spec. Try again.')
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

  // Get all available specs as "Class Spec" options for dropdown (memoized)
  const classSpecOptions = useMemo(() => {
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
  }, [classSpecs, classes])

  // Memoized filtered items to prevent recalculation on every render
  const filteredItems = useMemo(() => lootItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.boss_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTier = filterTier === 'all' || (item.raid_tier as any)?.name === filterTier
    return matchesSearch && matchesTier
  }), [lootItems, searchTerm, filterTier])

  // Scroll table to top when filters change
  useEffect(() => {
    tableContainerRef.current?.scrollTo(0, 0)
  }, [searchTerm, filterTier])

  // Memoized stats to prevent multiple filter iterations
  const itemStats = useMemo(() => ({
    total: filteredItems.length,
    available: filteredItems.filter(i => i.is_available).length,
    reserved: filteredItems.filter(i => i.classification === 'Reserved').length,
    limited: filteredItems.filter(i => i.classification === 'Limited').length,
    lootCouncil: filteredItems.filter(i => i.is_loot_council).length,
  }), [filteredItems])

  if (loading) {
    return <LootItemsPageSkeleton />
  }

  return (
    <ExpansionGuard>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 font-poppins">
        {/* Header */}
        <div>
          <Heading level={1}>Loot items</Heading>
          <p className="text-muted-foreground mt-1 text-base">Manage loot items for your guild</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-background-elevated border border-border rounded-xl p-4">
            <p className="text-muted-foreground text-sm">Total items</p>
            <p className="text-2xl font-bold text-foreground">{itemStats.total}</p>
          </div>
          <div className="bg-background-elevated border border-border rounded-xl p-4">
            <p className="text-muted-foreground text-sm">Available</p>
            <p className="text-2xl font-bold text-success">{itemStats.available}</p>
          </div>
          <div className="bg-background-elevated border border-border rounded-xl p-4">
            <p className="text-muted-foreground text-sm">Reserved</p>
            <p className="text-2xl font-bold text-destructive">{itemStats.reserved}</p>
          </div>
          <div className="bg-background-elevated border border-border rounded-xl p-4">
            <p className="text-muted-foreground text-sm">Limited</p>
            <p className="text-2xl font-bold text-warning">{itemStats.limited}</p>
          </div>
          <div className="bg-background-elevated border border-border rounded-xl p-4">
            <p className="text-muted-foreground text-sm">Loot Council</p>
            <p className="text-2xl font-bold text-accent">{itemStats.lootCouncil}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-background-elevated border border-border rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2">Search items</Label>
              <Input
                variant="rounded"
                size="sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or boss..."
              />
            </div>
            <div>
              <Label className="mb-2">Filter by raid</Label>
              <Select
                variant="rounded"
                size="sm"
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
              >
                <option value="all">All raids</option>
                {raidTiers.map(tier => (
                  <option key={tier.id} value={tier.name}>{tier.name}</option>
                ))}
              </Select>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="bg-background-elevated border border-border rounded-xl overflow-hidden">
          <div ref={tableContainerRef} className="-mx-4 sm:mx-0 overflow-x-auto max-h-[calc(100vh-456px)] sm:max-h-[calc(100vh-400px)]">
            <table className="w-full min-w-[900px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-muted border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">Available</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">LC</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">Item Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">Boss</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">Slot</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">Raid</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">Classification</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">Primary Specs</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground bg-muted">Secondary Specs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-muted transition-colors">
                    <td className="px-4 py-3">
                      <Checkbox
                        size="sm"
                        checked={item.is_available}
                        onCheckedChange={() => toggleAvailability(item.id, item.is_available)}
                        aria-label={`Toggle availability for ${item.name}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Checkbox
                        size="sm"
                        variant="accent"
                        checked={item.is_loot_council}
                        onCheckedChange={() => toggleLootCouncil(item.id, item.is_loot_council)}
                        disabled={!item.is_available}
                        aria-label={`Toggle Loot Council for ${item.name}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      <ItemLink name={item.name} wowheadId={item.wowhead_id} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="flex items-center gap-2">
                        {getBossImage(item.boss_name) && (
                          <img
                            src={getBossImage(item.boss_name)!}
                            alt=""
                            className="w-5 h-5 rounded border border-border/50"
                          />
                        )}
                        {normalizeBossName(item.boss_name)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.item_slot}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <img
                          src={getRaidIcon((item.raid_tier as any)?.name || '')}
                          alt=""
                          className="w-5 h-5 rounded border border-border/50"
                        />
                        {(item.raid_tier as any)?.name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        variant="rounded"
                        size="sm"
                        value={item.classification}
                        onChange={(e) => updateClassification(item.id, e.target.value)}
                        className="w-auto min-w-[110px]"
                      >
                        <option value="Reserved">Reserved</option>
                        <option value="Limited">Limited</option>
                        <option value="Unlimited">Unlimited</option>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <Select
                          variant="rounded"
                          size="sm"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              addSpec(item.id, e.target.value, 'primary')
                            }
                          }}
                          className="w-full text-[11px]"
                        >
                          <option value="">+ Add primary spec...</option>
                          {classSpecOptions.map(opt => {
                            const isAssigned = itemSpecs[item.id]?.primary.has(opt.id) || itemSpecs[item.id]?.secondary.has(opt.id)
                            return (
                              <option key={opt.id} value={opt.id} disabled={isAssigned} className={isAssigned ? 'text-muted-foreground' : ''}>
                                {opt.label}
                              </option>
                            )
                          })}
                        </Select>
                        {itemSpecs[item.id]?.primary.size > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {Array.from(itemSpecs[item.id].primary).map(specId => (
                              <div
                                key={specId}
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border border-success bg-success/20"
                              >
                                <div
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: getSpecColor(specId) }}
                                />
                                <span className="text-foreground">{getSpecName(specId)}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeSpec(item.id, specId, 'primary')}
                                  className="ml-0.5 w-4 h-4 p-0 hover:text-destructive"
                                  title="Remove"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-2">
                        <Select
                          variant="rounded"
                          size="sm"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              addSpec(item.id, e.target.value, 'secondary')
                            }
                          }}
                          className="w-full text-[11px]"
                        >
                          <option value="">+ Add secondary spec...</option>
                          {classSpecOptions.map(opt => {
                            const isAssigned = itemSpecs[item.id]?.primary.has(opt.id) || itemSpecs[item.id]?.secondary.has(opt.id)
                            return (
                              <option key={opt.id} value={opt.id} disabled={isAssigned} className={isAssigned ? 'text-muted-foreground' : ''}>
                                {opt.label}
                              </option>
                            )
                          })}
                        </Select>
                        {itemSpecs[item.id]?.secondary.size > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {Array.from(itemSpecs[item.id].secondary).map(specId => (
                              <div
                                key={specId}
                                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border border-warning bg-warning/20"
                              >
                                <div
                                  className="w-1.5 h-1.5 rounded-full"
                                  style={{ backgroundColor: getSpecColor(specId) }}
                                />
                                <span className="text-foreground">{getSpecName(specId)}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => removeSpec(item.id, specId, 'secondary')}
                                  className="ml-0.5 w-4 h-4 p-0 hover:text-destructive"
                                  title="Remove"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </Button>
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
          <EmptyState
            icon={Search01Icon}
            title="No items found"
            description="No items match your filters. Try adjusting your search or filter."
            size="default"
          />
        )}
      </div>
    </ExpansionGuard>
  )
}
