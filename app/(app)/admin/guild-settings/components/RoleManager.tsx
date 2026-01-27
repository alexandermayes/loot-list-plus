'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { Add01Icon, Delete01Icon, Shield01Icon, UserIcon, Edit01Icon, Tick01Icon, Cancel01Icon, CrownIcon, ArrowUp01Icon, ArrowDown01Icon } from 'hugeicons-react'

interface GuildRole {
  id: string
  guild_id: string
  name: string
  color_hex: string
  position: number
  is_default: boolean
  created_at: string
}

export default function RoleManager() {
  const [roles, setRoles] = useState<GuildRole[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [newRoleName, setNewRoleName] = useState('')
  const [isAddingRole, setIsAddingRole] = useState(false)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [editingRoleName, setEditingRoleName] = useState('')

  const supabase = createClient()
  const { activeGuild } = useGuildContext()

  useEffect(() => {
    if (activeGuild) {
      loadRoles()
    }
  }, [activeGuild])

  const loadRoles = async () => {
    if (!activeGuild) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('guild_roles')
        .select('*')
        .eq('guild_id', activeGuild.id)
        .order('position', { ascending: false })

      if (error) {
        console.error('Error loading roles:', error)
        // Check if it's because the table doesn't exist
        if (error.message?.includes('relation "public.guild_roles" does not exist')) {
          setMessage({
            type: 'error',
            text: 'Guild roles table not found. Please run the migration in Supabase SQL Editor.'
          })
        } else {
          setMessage({ type: 'error', text: `Failed to load roles: ${error.message}` })
        }
        return
      }

      setRoles(data || [])
    } catch (error: any) {
      console.error('Error loading roles:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to load roles' })
    } finally {
      setLoading(false)
    }
  }

  const handleAddRole = async () => {
    if (!activeGuild || !newRoleName.trim()) {
      setMessage({ type: 'error', text: 'Role name is required' })
      return
    }

    if (roles.length >= 10) {
      setMessage({ type: 'error', text: 'Maximum of 10 roles allowed' })
      return
    }

    try {
      // Find minimum position among custom roles and Member (below Officer at 50)
      const customRoles = roles.filter(r => r.position < 50)
      const minPosition = customRoles.length > 0 ? Math.min(...customRoles.map(r => r.position)) : 0

      // Add new role below all existing custom roles
      const newPosition = minPosition - 1

      const { error } = await supabase
        .from('guild_roles')
        .insert({
          guild_id: activeGuild.id,
          name: newRoleName.trim(),
          color_hex: '#a1a1a1', // All custom roles use Member color
          position: newPosition,
          is_default: false
        })

      if (error) throw error

      setMessage({ type: 'success', text: 'Role created successfully' })
      setNewRoleName('')
      setIsAddingRole(false)
      await loadRoles()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to create role' })
    }
  }

  const handleStartEditRole = (role: GuildRole) => {
    setEditingRoleId(role.id)
    setEditingRoleName(role.name)
  }

  const handleSaveEditRole = async (roleId: string) => {
    if (!editingRoleName.trim()) {
      setMessage({ type: 'error', text: 'Role name is required' })
      return
    }

    try {
      const { error } = await supabase
        .from('guild_roles')
        .update({
          name: editingRoleName.trim()
        })
        .eq('id', roleId)

      if (error) throw error

      setMessage({ type: 'success', text: 'Role updated successfully' })
      setEditingRoleId(null)
      setEditingRoleName('')
      await loadRoles()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update role' })
    }
  }

  const handleCancelEdit = () => {
    setEditingRoleId(null)
    setEditingRoleName('')
  }

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Delete the "${roleName}" role? Members with this role will need to be reassigned.`)) return

    try {
      const { error } = await supabase
        .from('guild_roles')
        .delete()
        .eq('id', roleId)

      if (error) throw error

      setMessage({ type: 'success', text: 'Role deleted successfully' })
      await loadRoles()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete role' })
    }
  }

  const handleMoveRole = async (role: GuildRole, direction: 'up' | 'down') => {
    try {
      // Get moveable roles (everything except position 100 and 50)
      const moveableRoles = roles.filter(r => r.position !== 100 && r.position !== 50)
      const currentIndex = moveableRoles.findIndex(r => r.id === role.id)

      if (direction === 'up' && currentIndex === 0) return // Already at top of moveable roles
      if (direction === 'down' && currentIndex === moveableRoles.length - 1) return // Already at bottom

      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
      const swapRole = moveableRoles[swapIndex]

      // Swap positions
      const updates = [
        supabase
          .from('guild_roles')
          .update({ position: swapRole.position })
          .eq('id', role.id),
        supabase
          .from('guild_roles')
          .update({ position: role.position })
          .eq('id', swapRole.id)
      ]

      const results = await Promise.all(updates)

      if (results.some(r => r.error)) {
        throw new Error('Failed to update positions')
      }

      await loadRoles()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to reorder roles' })
    }
  }

  const getRoleIcon = (position: number) => {
    if (position === 100) return <CrownIcon className="w-4 h-4" />
    if (position === 50) return <Shield01Icon className="w-4 h-4" />
    return <UserIcon className="w-4 h-4" />
  }

  return (
    <div className="p-6 space-y-4">
      {message && (
        <div className={`p-3 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-950/50 border border-green-600/50 text-green-200'
            : 'bg-red-950/50 border border-red-600/50 text-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {loading ? (
        <p className="text-[#a1a1a1] text-center py-4">Loading roles...</p>
      ) : (
        <>
          <div className="space-y-2">
            {roles.map((role) => {
              const isEditing = editingRoleId === role.id

              return (
                <div
                  key={role.id}
                  className="p-3 bg-[#0d0e11] border border-[rgba(255,255,255,0.1)] rounded-lg"
                >
                  {isEditing ? (
                    // Edit mode
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editingRoleName}
                        onChange={(e) => setEditingRoleName(e.target.value)}
                        placeholder="Role name"
                        maxLength={50}
                        className="w-full px-3 py-2 bg-[#151515] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-[13px] focus:outline-none focus:border-[rgba(255,255,255,0.3)]"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEditRole(role.id)}
                          className="flex-1 px-3 py-2 bg-white text-black rounded-lg text-[13px] font-medium hover:bg-gray-100 transition flex items-center justify-center gap-2"
                        >
                          <Tick01Icon className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 px-3 py-2 bg-[#151515] text-white rounded-lg text-[13px] font-medium hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] transition flex items-center justify-center gap-2"
                        >
                          <Cancel01Icon className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: role.color_hex + '20', border: `1px solid ${role.color_hex}` }}
                        >
                          <span style={{ color: role.color_hex }}>
                            {getRoleIcon(role.position)}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium text-[14px]">{role.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Move up/down buttons - only for Member and custom roles (not position 100 or 50) */}
                        {role.position !== 100 && role.position !== 50 && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleMoveRole(role, 'up')}
                              disabled={roles.filter(r => r.position !== 100 && r.position !== 50).findIndex(r => r.id === role.id) === 0}
                              className="p-2 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-lg text-white hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ArrowUp01Icon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoveRole(role, 'down')}
                              disabled={roles.filter(r => r.position !== 100 && r.position !== 50).findIndex(r => r.id === role.id) === roles.filter(r => r.position !== 100 && r.position !== 50).length - 1}
                              className="p-2 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-lg text-white hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <ArrowDown01Icon className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                        <button
                          onClick={() => handleStartEditRole(role)}
                          className="p-2 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-lg text-white hover:text-white transition"
                        >
                          <Edit01Icon className="w-4 h-4" />
                        </button>
                        {!role.is_default && (
                          <button
                            onClick={() => handleDeleteRole(role.id, role.name)}
                            className="p-2 bg-[#151515] hover:bg-red-950/50 border border-[rgba(255,255,255,0.1)] hover:border-red-600/30 rounded-lg text-red-400 hover:text-red-300 transition"
                          >
                            <Delete01Icon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {!isAddingRole && roles.length < 10 && (
            <button
              onClick={() => setIsAddingRole(true)}
              className="w-full p-3 bg-[#151515] hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-[13px] font-medium transition flex items-center justify-center gap-2"
            >
              <Add01Icon className="w-4 h-4" />
              Add Custom Role
            </button>
          )}

          {isAddingRole && (
            <div className="p-4 bg-[#0d0e11] border border-[rgba(255,255,255,0.1)] rounded-lg space-y-3">
              <div>
                <label className="block text-[13px] text-[#a1a1a1] mb-2">Role Name</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., Raider, Trial, Core"
                  maxLength={50}
                  className="w-full px-3 py-2 bg-[#151515] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-[13px] focus:outline-none focus:border-[rgba(255,255,255,0.3)]"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAddRole}
                  className="flex-1 px-4 py-2 bg-white text-black rounded-lg text-[13px] font-medium hover:bg-gray-100 transition"
                >
                  Create Role
                </button>
                <button
                  onClick={() => {
                    setIsAddingRole(false)
                    setNewRoleName('')
                  }}
                  className="flex-1 px-4 py-2 bg-[#151515] text-white rounded-lg text-[13px] font-medium hover:bg-[#1a1a1a] border border-[rgba(255,255,255,0.1)] transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-[rgba(255,255,255,0.1)]">
            <p className="text-[11px] text-[#a1a1a1]">
              Total Roles: {roles.length} / 10
            </p>
          </div>
        </>
      )}
    </div>
  )
}
