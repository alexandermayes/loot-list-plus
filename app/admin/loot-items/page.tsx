'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/app/components/Navigation'
import ItemLink from '@/app/components/ItemLink'

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
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editingItemData, setEditingItemData] = useState<LootItem | null>(null)
  const [primarySpecs, setPrimarySpecs] = useState<Set<string>>(new Set())
  const [secondarySpecs, setSecondarySpecs] = useState<Set<string>>(new Set())
  const [savingClasses, setSavingClasses] = useState(false)
  const [selectedClass, setSelectedClass] = useState<string>('')
  const [selectedSpec, setSelectedSpec] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTier, setFilterTier] = useState<string>('all')
  const [raidTiers, setRaidTiers] = useState<any[]>([])

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

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

    const { data: memberData } = await supabase
      .from('guild_members')
      .select('guild_id, character_name, role, class:wow_classes(name, color_hex)')
      .eq('user_id', user.id)
      .single()

    if (!memberData || memberData.role !== 'Officer') {
      router.push('/dashboard')
      return
    }

    setMember(memberData)

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

    // Load raid tiers for filtering
    const { data: guildExpansions } = await supabase
      .from('expansions')
      .select('id')
      .eq('guild_id', memberData.guild_id)

    if (guildExpansions && guildExpansions.length > 0) {
      const expansionIds = guildExpansions.map((e: any) => e.id)
      const { data: tiersData } = await supabase
        .from('raid_tiers')
        .select('id, name')
        .in('expansion_id', expansionIds)
        .order('name')

      if (tiersData) {
        setRaidTiers(tiersData)
      }
    }

    // Load all loot items
    await loadLootItems(memberData.guild_id)
    setLoading(false)
  }

  const loadLootItems = async (guildId: string) => {
    // Get guild's raid tiers
    const { data: guildExpansions } = await supabase
      .from('expansions')
      .select('id')
      .eq('guild_id', guildId)

    if (!guildExpansions || guildExpansions.length === 0) return

    const expansionIds = guildExpansions.map((e: any) => e.id)
    const { data: tiersData } = await supabase
      .from('raid_tiers')
      .select('id')
      .in('expansion_id', expansionIds)

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

  const openClassEditor = async (item: LootItem) => {
    setEditingItem(item.id)
    setEditingItemData(item)

    // Load existing spec relations
    const { data: specRelations } = await supabase
      .from('loot_item_classes')
      .select('spec_id, spec_type')
      .eq('loot_item_id', item.id)
      .not('spec_id', 'is', null)

    if (specRelations) {
      const primary = new Set(specRelations.filter(r => r.spec_type === 'primary' && r.spec_id).map(r => r.spec_id!))
      const secondary = new Set(specRelations.filter(r => r.spec_type === 'secondary' && r.spec_id).map(r => r.spec_id!))
      setPrimarySpecs(primary)
      setSecondarySpecs(secondary)
    } else {
      setPrimarySpecs(new Set())
      setSecondarySpecs(new Set())
    }
  }

  const togglePrimarySpec = (specId: string) => {
    const newPrimary = new Set(primarySpecs)
    if (newPrimary.has(specId)) {
      newPrimary.delete(specId)
    } else {
      newPrimary.add(specId)
      // Remove from secondary if it was there
      const newSecondary = new Set(secondarySpecs)
      newSecondary.delete(specId)
      setSecondarySpecs(newSecondary)
    }
    setPrimarySpecs(newPrimary)
  }

  const toggleSecondarySpec = (specId: string) => {
    const newSecondary = new Set(secondarySpecs)
    if (newSecondary.has(specId)) {
      newSecondary.delete(specId)
    } else {
      newSecondary.add(specId)
      // Remove from primary if it was there
      const newPrimary = new Set(primarySpecs)
      newPrimary.delete(specId)
      setPrimarySpecs(newPrimary)
    }
    setSecondarySpecs(newSecondary)
  }

  const saveClassRestrictions = async () => {
    if (!editingItem) return

    setSavingClasses(true)

    try {
      // Delete existing relations
      const { error: deleteError } = await supabase
        .from('loot_item_classes')
        .delete()
        .eq('loot_item_id', editingItem)

      if (deleteError) {
        console.error('Error deleting existing relations:', deleteError)
        alert(`Error deleting existing relations: ${deleteError.message}`)
        setSavingClasses(false)
        return
      }

      // Insert new spec relations
      const relations = [
        ...Array.from(primarySpecs).map(specId => {
          const spec = classSpecs.find(s => s.id === specId)
          return {
            loot_item_id: editingItem,
            class_id: spec?.class_id,
            spec_id: specId,
            spec_type: 'primary'
          }
        }),
        ...Array.from(secondarySpecs).map(specId => {
          const spec = classSpecs.find(s => s.id === specId)
          return {
            loot_item_id: editingItem,
            class_id: spec?.class_id,
            spec_id: specId,
            spec_type: 'secondary'
          }
        })
      ].filter(r => r.class_id !== undefined) // Filter out invalid relations

      if (relations.length > 0) {
        const { error: insertError } = await supabase
          .from('loot_item_classes')
          .insert(relations)

        if (insertError) {
          console.error('Error inserting class restrictions:', insertError)
          alert(`Error saving class restrictions: ${insertError.message || 'Unknown error'}`)
          setSavingClasses(false)
          return
        }
      }

      closeClassEditor()
    } catch (error) {
      console.error('Unexpected error:', error)
      alert('Unexpected error saving class restrictions')
    }

    setSavingClasses(false)
  }

  const addPrimarySpec = () => {
    if (selectedSpec) {
      const newPrimary = new Set(primarySpecs)
      newPrimary.add(selectedSpec)
      setPrimarySpecs(newPrimary)

      // Remove from secondary if it was there
      const newSecondary = new Set(secondarySpecs)
      newSecondary.delete(selectedSpec)
      setSecondarySpecs(newSecondary)

      setSelectedSpec('')
    }
  }

  const addSecondarySpec = () => {
    if (selectedSpec) {
      const newSecondary = new Set(secondarySpecs)
      newSecondary.add(selectedSpec)
      setSecondarySpecs(newSecondary)

      // Remove from primary if it was there
      const newPrimary = new Set(primarySpecs)
      newPrimary.delete(selectedSpec)
      setPrimarySpecs(newPrimary)

      setSelectedSpec('')
    }
  }

  const removePrimarySpec = (specId: string) => {
    const newPrimary = new Set(primarySpecs)
    newPrimary.delete(specId)
    setPrimarySpecs(newPrimary)
  }

  const removeSecondarySpec = (specId: string) => {
    const newSecondary = new Set(secondarySpecs)
    newSecondary.delete(specId)
    setSecondarySpecs(newSecondary)
  }

  const getSpecName = (specId: string) => {
    const spec = classSpecs.find(s => s.id === specId)
    if (!spec) return ''
    const wowClass = classes.find(c => c.id === spec.class_id)
    return `${wowClass?.name} - ${spec.name}`
  }

  const getSpecColor = (specId: string) => {
    const spec = classSpecs.find(s => s.id === specId)
    if (!spec) return '#888888'
    const wowClass = classes.find(c => c.id === spec.class_id)
    return wowClass?.color_hex || '#888888'
  }

  const closeClassEditor = () => {
    setEditingItem(null)
    setEditingItemData(null)
    setPrimarySpecs(new Set())
    setSecondarySpecs(new Set())
    setSelectedClass('')
    setSelectedSpec('')
  }

  const availableSpecs = selectedClass
    ? classSpecs.filter(s => s.class_id === selectedClass)
    : []

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
                  <th className="px-4 py-3 text-left text-sm font-semibold text-muted-foreground">Actions</th>
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
                      <button
                        onClick={() => openClassEditor(item)}
                        className="px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded text-foreground text-sm font-medium"
                      >
                        Edit Classes
                      </button>
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

      {/* Class Editor Modal */}
      {editingItem && editingItemData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-900 to-purple-700 px-6 py-4 sticky top-0">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{editingItemData.name}</h2>
                  <p className="text-purple-200 text-sm mt-1">
                    {editingItemData.boss_name} • {editingItemData.item_slot}
                  </p>
                </div>
                <button
                  onClick={closeClassEditor}
                  className="text-foreground hover:text-muted-foreground"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Instructions */}
              <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                <p className="text-blue-200 text-sm">
                  <strong>Primary Specs:</strong> Can select this item as main-spec (counts toward bracket allocation)<br />
                  <strong>Secondary Specs:</strong> Can select this item as off-spec (no allocation cost)
                </p>
              </div>

              {/* Add Spec Selector */}
              <div className="bg-secondary rounded-lg p-4">
                <h3 className="text-foreground font-semibold mb-3">Add Spec</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <select
                    value={selectedClass}
                    onChange={(e) => {
                      setSelectedClass(e.target.value)
                      setSelectedSpec('')
                    }}
                    className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select Class...</option>
                    {classes.map(wowClass => (
                      <option key={wowClass.id} value={wowClass.id}>{wowClass.name}</option>
                    ))}
                  </select>

                  <select
                    value={selectedSpec}
                    onChange={(e) => setSelectedSpec(e.target.value)}
                    disabled={!selectedClass}
                    className="px-3 py-2 bg-gray-600 border border-gray-500 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    <option value="">Select Spec...</option>
                    {availableSpecs.map(spec => (
                      <option key={spec.id} value={spec.id}>{spec.name}</option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <button
                      onClick={addPrimarySpec}
                      disabled={!selectedSpec}
                      className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:opacity-50 rounded-lg text-foreground text-sm font-medium"
                    >
                      + Primary
                    </button>
                    <button
                      onClick={addSecondarySpec}
                      disabled={!selectedSpec}
                      className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:opacity-50 rounded-lg text-foreground text-sm font-medium"
                    >
                      + Secondary
                    </button>
                  </div>
                </div>
              </div>

              {/* Primary Specs List */}
              <div>
                <h3 className="text-foreground font-semibold mb-2">Primary Specs ({primarySpecs.size})</h3>
                <div className="flex flex-wrap gap-2">
                  {primarySpecs.size === 0 ? (
                    <p className="text-muted-foreground text-sm">No primary specs selected</p>
                  ) : (
                    Array.from(primarySpecs).map(specId => (
                      <div
                        key={`primary-badge-${specId}`}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-foreground text-sm font-medium border-2 border-success bg-success/20"
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getSpecColor(specId) }}
                        />
                        <span>{getSpecName(specId)}</span>
                        <button
                          onClick={() => removePrimarySpec(specId)}
                          className="ml-1 hover:text-red-300"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Secondary Specs List */}
              <div>
                <h3 className="text-foreground font-semibold mb-2">Secondary Specs ({secondarySpecs.size})</h3>
                <div className="flex flex-wrap gap-2">
                  {secondarySpecs.size === 0 ? (
                    <p className="text-muted-foreground text-sm">No secondary specs selected</p>
                  ) : (
                    Array.from(secondarySpecs).map(specId => (
                      <div
                        key={`secondary-badge-${specId}`}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-foreground text-sm font-medium border-2 border-warning bg-warning/20"
                      >
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getSpecColor(specId) }}
                        />
                        <span>{getSpecName(specId)}</span>
                        <button
                          onClick={() => removeSecondarySpec(specId)}
                          className="ml-1 hover:text-red-300"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border px-6 py-4 bg-accent flex gap-3 justify-end">
              <button
                onClick={closeClassEditor}
                disabled={savingClasses}
                className="px-4 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-foreground font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={saveClassRestrictions}
                disabled={savingClasses}
                className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-purple-800 rounded-lg text-primary-foreground font-medium transition"
              >
                {savingClasses ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
