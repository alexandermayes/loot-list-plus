'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface RaidTier {
  id: string
  name: string
  is_active: boolean
  expansion: {
    id: string
    name: string
  }
}

interface Expansion {
  id: string
  name: string
}

export default function RaidTiersPage() {
  const [raidTiers, setRaidTiers] = useState<RaidTier[]>([])
  const [expansions, setExpansions] = useState<Expansion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [guildId, setGuildId] = useState<string | null>(null)
  const [activeExpansionId, setActiveExpansionId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingTier, setEditingTier] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    expansion_id: '',
    is_active: false
  })

  const supabase = createClient()
  const router = useRouter()
  const { activeGuild, loading: guildLoading, isOfficer } = useGuildContext()

  // Define Classic raid tier progression order
  const getRaidTierOrder = (tierName: string): number => {
    const order: Record<string, number> = {
      'Molten Core': 1,
      'MC': 1,
      'Onyxia\'s Lair': 2,
      'Onyxia': 2,
      'Blackwing Lair': 3,
      'BWL': 3,
      'Zul\'Gurub': 4,
      'ZG': 4,
      'Ruins of Ahn\'Qiraj': 5,
      'AQ20': 5,
      'Temple of Ahn\'Qiraj': 6,
      'AQ40': 6,
      'Naxxramas': 7,
      'Naxx': 7
    }
    return order[tierName] || 999
  }

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)

      // Check if officer using context
      if (!guildLoading && !isOfficer) {
        router.push('/dashboard')
        return
      }

      if (!activeGuild) {
        setLoading(false)
        return
      }

      setGuildId(activeGuild.id)

      // Load raid tiers (only for active expansion)
      if (activeGuild.active_expansion_id) {
        setActiveExpansionId(activeGuild.active_expansion_id)

        // Load expansion info
        const { data: expData } = await supabase
          .from('expansions')
          .select('id, name')
          .eq('id', activeGuild.active_expansion_id)
          .single()

        if (expData) {
          setExpansions([expData])
        }

        await loadRaidTiers(activeGuild.active_expansion_id)
      }

      setLoading(false)
    }

    if (!guildLoading) {
      loadData()
    }
  }, [guildLoading, activeGuild, isOfficer])

  const loadRaidTiers = async (expansionId: string) => {
    try {
      // Get raid tiers for the active expansion (single join query)
      const { data: tiersData, error } = await supabase
        .from('raid_tiers')
        .select(`
          id,
          name,
          is_active,
          expansion:expansions (
            id,
            name
          )
        `)
        .eq('expansion_id', expansionId)

      if (error) {
        console.error('Error loading raid tiers:', error)
        setRaidTiers([])
        return
      }

      // Transform data to ensure expansion is a single object (Supabase returns it as array)
      const transformedData: RaidTier[] = (tiersData || []).map(tier => ({
        ...tier,
        expansion: Array.isArray(tier.expansion) ? tier.expansion[0] : tier.expansion
      }))

      // Sort by Classic raid progression order
      const sortedTiers = transformedData.sort((a, b) => {
        return getRaidTierOrder(a.name) - getRaidTierOrder(b.name)
      })

      setRaidTiers(sortedTiers)
    } catch (err) {
      console.error('Unexpected error loading raid tiers:', err)
      setRaidTiers([])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guildId || !formData.name || !formData.expansion_id) return

    setSaving(true)
    setMessage(null)

    try {
      if (editingTier) {
        // Update existing tier
        const { error } = await supabase
          .from('raid_tiers')
          .update({
            name: formData.name,
            expansion_id: formData.expansion_id,
            is_active: formData.is_active
          })
          .eq('id', editingTier)

        if (error) throw error
        setMessage({ type: 'success', text: 'Raid tier updated successfully!' })
      } else {
        // Create new tier (no guild_id - it's linked through expansion)
        const { error } = await supabase
          .from('raid_tiers')
          .insert({
            name: formData.name,
            expansion_id: formData.expansion_id,
            is_active: formData.is_active
          })

        if (error) throw error
        setMessage({ type: 'success', text: 'Raid tier created successfully!' })
      }

      // Reload tiers
      if (guildId) {
        await loadRaidTiers(activeExpansionId!)
      }

      // Reset form
      setFormData({ name: '', expansion_id: '', is_active: false })
      setShowAddForm(false)
      setEditingTier(null)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save raid tier' })
    }

    setSaving(false)
  }

  const handleEdit = (tier: RaidTier) => {
    setFormData({
      name: tier.name,
      expansion_id: tier.expansion?.id || '',
      is_active: tier.is_active
    })
    setEditingTier(tier.id)
    setShowAddForm(true)
  }

  const handleDelete = async (tierId: string) => {
    if (!confirm('Are you sure you want to delete this raid tier? This cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('raid_tiers')
        .delete()
        .eq('id', tierId)

      if (error) throw error

      setMessage({ type: 'success', text: 'Raid tier deleted successfully!' })
      if (guildId) {
        await loadRaidTiers(activeExpansionId!)
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete raid tier' })
    }
  }

  const handleSetActive = async (tierId: string) => {
    if (!guildId) return

    try {
      // Get all expansions for this guild
      const { data: guildExpansions } = await supabase
        .from('expansions')
        .select('id')
        .eq('guild_id', guildId)

      if (!guildExpansions || guildExpansions.length === 0) {
        throw new Error('No expansions found')
      }

      const expansionIds = guildExpansions.map(e => e.id)

      // Set all tiers in these expansions to inactive first
      const { error: deactivateError } = await supabase
        .from('raid_tiers')
        .update({ is_active: false })
        .in('expansion_id', expansionIds)

      if (deactivateError) throw deactivateError

      // Set selected tier to active
      const { error: activateError } = await supabase
        .from('raid_tiers')
        .update({ is_active: true })
        .eq('id', tierId)

      if (activateError) throw activateError

      setMessage({ type: 'success', text: 'Active raid tier updated!' })
      await loadRaidTiers(activeExpansionId!)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update active tier' })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const adminTabs = [
    { name: 'Settings', href: '/admin/settings', icon: '⚙️' },
    { name: 'Raid Tiers', href: '/admin/raid-tiers', icon: '🏰' },
    { name: 'Manage Loot', href: '/admin/loot-items', icon: '✅' },
    { name: 'Import', href: '/admin/import', icon: '📥' },
  ]

  const pathname = usePathname()

  return (
      <div className="p-8 space-y-6 font-poppins">
        {/* Header */}
        <div>
          <h1 className="text-[42px] font-bold text-white leading-tight">Loot Master Settings</h1>
          <p className="text-[#a1a1a1] mt-1 text-[14px]">Configure your guild's loot distribution system</p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-[rgba(255,255,255,0.1)] pb-2 overflow-x-auto">
          {adminTabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2 rounded-t-lg whitespace-nowrap text-[13px] font-medium transition-all ${
                pathname === tab.href
                  ? 'bg-[rgba(255,128,0,0.2)] border-[0.5px] border-[rgba(255,128,0,0.2)] text-[#ff8000]'
                  : 'text-[#a1a1a1] hover:text-white hover:bg-[#1a1a1a]'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </Link>
          ))}
        </div>
        {message && (
          <div className={`p-4 rounded-xl ${
            message.type === 'success'
              ? 'bg-green-950/50 border border-green-600/50 text-green-200'
              : 'bg-red-950/50 border border-red-600/50 text-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
            <h2 className="text-[24px] font-bold text-white mb-4">
              {editingTier ? 'Edit Raid Tier' : 'Add New Raid Tier'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-white mb-2 text-[13px] font-medium">Raid Tier Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Molten Core, Blackwing Lair, AQ40"
                  className="w-full px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000]"
                  required
                />
              </div>

              <div>
                <label className="block text-white mb-2 text-[13px] font-medium">Expansion</label>
                {expansions.length > 0 ? (
                  <select
                    value={formData.expansion_id}
                    onChange={(e) => setFormData({ ...formData, expansion_id: e.target.value })}
                    className="w-full px-5 py-3 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] focus:outline-none focus:border-[#ff8000] cursor-pointer select-custom"
                    required
                  >
                    <option value="" className="bg-[#151515] text-white">Select an expansion</option>
                    {expansions.map(exp => (
                      <option key={exp.id} value={exp.id} className="bg-[#151515] text-white">{exp.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-yellow-950/50 border border-yellow-600/50 rounded-xl text-yellow-200 text-[13px]">
                    No expansions found. Please create an expansion first.
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5 rounded border-[#383838] bg-[#151515] text-[#ff8000] focus:ring-[#ff8000]"
                />
                <label className="text-white text-[13px]">Set as active raid tier</label>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-3 bg-white hover:bg-gray-100 text-black disabled:opacity-50 rounded-[40px] font-medium text-[16px] transition"
                >
                  {saving ? 'Saving...' : editingTier ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false)
                    setEditingTier(null)
                    setFormData({ name: '', expansion_id: '', is_active: false })
                  }}
                  className="px-5 py-3 bg-[#151515] hover:bg-[#1a1a1a] rounded-[40px] text-white font-medium text-[16px] transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Raid Tiers List */}
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[24px] font-bold text-white">Raid Tiers</h2>
            <button
              onClick={() => {
                setShowAddForm(true)
                setEditingTier(null)
                setFormData({ name: '', expansion_id: '', is_active: false })
              }}
              className="px-5 py-3 bg-white hover:bg-gray-100 text-black rounded-[40px] font-medium text-[16px] transition"
            >
              + Add Raid Tier
            </button>
          </div>

          {raidTiers.length === 0 ? (
            <p className="text-[#a1a1a1] text-center py-8 text-[13px]">No raid tiers found. Create your first one above.</p>
          ) : (
            <div className="space-y-3">
              {raidTiers.map((tier) => (
                <div
                  key={tier.id}
                  className="bg-[#151515] rounded-xl p-4 flex items-center justify-between border border-[rgba(255,255,255,0.1)]"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold text-[14px]">{tier.name}</h3>
                        {tier.is_active && (
                          <span className="px-2 py-1 bg-green-950/50 text-green-200 text-[10px] rounded-full border border-green-600/50">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-[#a1a1a1] text-[13px]">{tier.expansion?.name || 'No expansion'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!tier.is_active && (
                      <button
                        onClick={() => handleSetActive(tier.id)}
                        className="px-3.5 py-2 bg-[#ff8000] hover:bg-[#e67300] rounded-[40px] text-white text-[13px] font-medium transition"
                      >
                        Set Active
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(tier)}
                      className="px-3.5 py-2 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-[40px] text-white text-[13px] font-medium transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(tier.id)}
                      className="px-3.5 py-2 bg-red-950/50 hover:bg-red-900/50 border border-red-600/50 rounded-[40px] text-red-200 text-[13px] font-medium transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Add Common Tiers */}
        <div className="bg-[#141519] border border-[rgba(255,255,255,0.1)] rounded-xl p-6">
          <h3 className="text-[18px] font-bold text-white mb-4">Quick Add Common Raids</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['Molten Core', 'Onyxia', 'Blackwing Lair', 'ZG', 'AQ20', 'AQ40', 'Naxxramas'].map(raidName => (
              <button
                key={raidName}
                onClick={() => {
                  setFormData({ ...formData, name: raidName })
                  setShowAddForm(true)
                  setEditingTier(null)
                }}
                className="px-3.5 py-2 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-xl text-white text-[13px] transition"
              >
                {raidName}
              </button>
            ))}
          </div>
        </div>
      </div>
  )
}
