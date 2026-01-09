'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import Navigation from '@/app/components/Navigation'

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

  useEffect(() => {
    const loadData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      setUser(user)

      // Check if officer
      const { data: memberData } = await supabase
        .from('guild_members')
        .select('role, guild_id')
        .eq('user_id', user.id)
        .single()

      if (!memberData || memberData.role !== 'Officer') {
        router.push('/dashboard')
        return
      }

      setGuildId(memberData.guild_id)

      // Load expansions
      const { data: expansionsData } = await supabase
        .from('expansions')
        .select('id, name')
        .eq('guild_id', memberData.guild_id)
        .order('name', { ascending: true })

      if (expansionsData) {
        setExpansions(expansionsData)
      }

      // Load raid tiers
      await loadRaidTiers(memberData.guild_id)

      setLoading(false)
    }

    loadData()
  }, [])

  const loadRaidTiers = async (guildId: string) => {
    try {
      // First get all expansions for this guild
      const { data: guildExpansions, error: expError } = await supabase
        .from('expansions')
        .select('id')
        .eq('guild_id', guildId)

      if (expError) {
        console.error('Error loading expansions:', expError)
        setRaidTiers([])
        return
      }

      if (!guildExpansions || guildExpansions.length === 0) {
        console.log('No expansions found for guild')
        setRaidTiers([])
        return
      }

      const expansionIds = guildExpansions.map(e => e.id)

      // Get raid tiers for these expansions
      const { data: tiersData, error } = await supabase
        .from('raid_tiers')
        .select('id, name, is_active, expansion_id')
        .in('expansion_id', expansionIds)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error loading raid tiers:', error)
        setRaidTiers([])
        return
      }

      if (!tiersData || tiersData.length === 0) {
        setRaidTiers([])
        return
      }

      // Manually fetch expansion names
      const tiersWithExpansions = await Promise.all(
        tiersData.map(async (tier: any) => {
          if (tier.expansion_id) {
            const { data: expData } = await supabase
              .from('expansions')
              .select('id, name')
              .eq('id', tier.expansion_id)
              .single()
            
            return {
              ...tier,
              expansion: expData || null
            }
          }
          return { ...tier, expansion: null }
        })
      )
      setRaidTiers(tiersWithExpansions as any)
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
        await loadRaidTiers(guildId)
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
        await loadRaidTiers(guildId)
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
      await loadRaidTiers(guildId)
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update active tier' })
    }
  }

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
        showBack
        backUrl="/admin"
        title="Manage Raid Tiers"
      />

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {message && (
          <div className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-success/20 border border-success text-success-foreground'
              : 'bg-error/20 border border-error text-error-foreground'
          }`}>
            {message.text}
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              {editingTier ? 'Edit Raid Tier' : 'Add New Raid Tier'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-foreground mb-2">Raid Tier Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Molten Core, Blackwing Lair, AQ40"
                  className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-foreground mb-2">Expansion</label>
                {expansions.length > 0 ? (
                  <select
                    value={formData.expansion_id}
                    onChange={(e) => setFormData({ ...formData, expansion_id: e.target.value })}
                    className="w-full px-3 py-2 bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  >
                    <option value="">Select an expansion</option>
                    {expansions.map(exp => (
                      <option key={exp.id} value={exp.id}>{exp.name}</option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 bg-warning/20 border border-warning rounded-lg text-warning-foreground text-sm">
                    No expansions found. Please create an expansion first.
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-5 h-5"
                />
                <label className="text-foreground">Set as active raid tier</label>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 rounded-lg font-semibold transition"
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
                  className="px-6 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-foreground font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Raid Tiers List */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Raid Tiers</h2>
            <button
              onClick={() => {
                setShowAddForm(true)
                setEditingTier(null)
                setFormData({ name: '', expansion_id: '', is_active: false })
              }}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold transition"
            >
              + Add Raid Tier
            </button>
          </div>

          {raidTiers.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No raid tiers found. Create your first one above.</p>
          ) : (
            <div className="space-y-3">
              {raidTiers.map((tier) => (
                <div
                  key={tier.id}
                  className="bg-secondary rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-foreground font-semibold">{tier.name}</h3>
                        {tier.is_active && (
                          <span className="px-2 py-1 bg-success/20 text-success-foreground text-xs rounded-full">
                            Active ⭐
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm">{tier.expansion?.name || 'No expansion'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!tier.is_active && (
                      <button
                        onClick={() => handleSetActive(tier.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-foreground text-sm font-semibold transition"
                      >
                        Set Active
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(tier)}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-foreground text-sm font-semibold transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(tier.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-foreground text-sm font-semibold transition"
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
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Quick Add Common Raids</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['Molten Core', 'Blackwing Lair', 'AQ40', 'Naxxramas', 'Onyxia', 'ZG', 'AQ20', 'MC'].map(raidName => (
              <button
                key={raidName}
                onClick={() => {
                  setFormData({ ...formData, name: raidName })
                  setShowAddForm(true)
                  setEditingTier(null)
                }}
                className="px-3 py-2 bg-secondary hover:bg-secondary/80 rounded-lg text-foreground text-sm transition"
              >
                {raidName}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
