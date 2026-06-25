'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-modal'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, Delete01Icon, Shield01Icon, UserIcon, Edit01Icon, Tick01Icon, Cancel01Icon, CrownIcon, ArrowUp01Icon, ArrowDown01Icon } from '@hugeicons/core-free-icons'
import { Switch } from '@/components/ui/switch'
import { PERMISSIONS, type PermissionCode, ALL_PERMISSION_CODES } from '@/domain/guild/roles'

interface GuildRole {
  id: string
  guild_id: string
  name: string
  color_hex: string
  position: number
  is_default: boolean
  created_at: string
  permissions: string[]
}

interface RoleManagerProps {
  onRolesChanged?: () => void
}

export default function RoleManager({ onRolesChanged }: RoleManagerProps) {
  const [roles, setRoles] = useState<GuildRole[]>([])
  const [loading, setLoading] = useState(true)
  const [newRoleName, setNewRoleName] = useState('')
  const [isAddingRole, setIsAddingRole] = useState(false)
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [editingRoleName, setEditingRoleName] = useState('')
  const [editingPermissions, setEditingPermissions] = useState<string[]>([])

  const supabase = createClient()
  const { activeGuild } = useGuildContext()
  const { showNotification } = useNotification()
  const { confirm, ConfirmDialog } = useConfirm()

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
          showNotification('error', 'Guild roles table not found. Please run the migration in Supabase SQL Editor.')
        } else {
          showNotification('error', error.message || 'Couldn\'t load roles. Try again.')
        }
        return
      }

      setRoles(data || [])
    } catch (error: unknown) {
      console.error('Error loading roles:', error)
      showNotification('error', error instanceof Error ? error.message : 'Couldn\'t load roles. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddRole = async () => {
    if (!activeGuild || !newRoleName.trim()) {
      showNotification('error', 'Role name is required')
      return
    }

    if (roles.length >= 10) {
      showNotification('error', 'Maximum of 10 roles allowed')
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

      showNotification('success', 'Role created')
      setNewRoleName('')
      setIsAddingRole(false)
      await loadRoles()
      onRolesChanged?.()
    } catch (error: unknown) {
      showNotification('error', error instanceof Error ? error.message : 'Couldn\'t create role. Try again.')
    }
  }

  const handleStartEditRole = (role: GuildRole) => {
    setEditingRoleId(role.id)
    setEditingRoleName(role.name)
    setEditingPermissions(role.permissions || [])
  }

  const handleSaveEditRole = async (roleId: string) => {
    if (!editingRoleName.trim()) {
      showNotification('error', 'Role name is required')
      return
    }

    const oldRole = roles.find(r => r.id === roleId)
    try {
      const res = await fetch('/api/guild-roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role_id: roleId,
          guild_id: activeGuild!.id,
          name: editingRoleName.trim(),
          permissions: editingPermissions,
          old_name: oldRole?.name,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Couldn\'t save role')
      }

      showNotification('success', 'Role saved')
      setEditingRoleId(null)
      setEditingRoleName('')
      setEditingPermissions([])
      await loadRoles()
      onRolesChanged?.()
    } catch (error: unknown) {
      showNotification('error', error instanceof Error ? error.message : 'Couldn\'t save role. Try again.')
    }
  }

  const handleCancelEdit = () => {
    setEditingRoleId(null)
    setEditingRoleName('')
    setEditingPermissions([])
  }

  const togglePermission = (perm: PermissionCode) => {
    setEditingPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    )
  }

  const handleDeleteRole = (roleId: string, roleName: string) => {
    confirm({
      title: 'Delete role',
      description: `Delete the "${roleName}" role? Members with this role will need to be reassigned.`,
      confirmLabel: 'Delete',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from('guild_roles')
            .delete()
            .eq('id', roleId)

          if (error) throw error

          showNotification('success', 'Role deleted')
          await loadRoles()
          onRolesChanged?.()
        } catch (error: unknown) {
          showNotification('error', error instanceof Error ? error.message : 'Couldn\'t delete role. Try again.')
        }
      }
    })
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
        throw new Error('Couldn\'t update positions. Try again.')
      }

      await loadRoles()
      onRolesChanged?.()
    } catch (error: unknown) {
      showNotification('error', error instanceof Error ? error.message : 'Couldn\'t reorder roles. Try again.')
    }
  }

  const getRoleIcon = (position: number) => {
    if (position === 100) return <HugeiconsIcon icon={CrownIcon} size={16} />
    if (position === 50) return <HugeiconsIcon icon={Shield01Icon} size={16} />
    return <HugeiconsIcon icon={UserIcon} size={16} />
  }

  return (
    <div className="p-6 space-y-4">
      {loading ? (
        <p className="text-muted-foreground text-center py-4">Loading roles...</p>
      ) : (
        <>
          <div className="space-y-2">
            {roles.map((role) => {
              const isEditing = editingRoleId === role.id

              return (
                <div
                  key={role.id}
                  className="p-3 bg-background-subtle border border-border rounded-lg"
                >
                  {isEditing ? (
                    // Edit mode
                    <div className="space-y-3">
                      <Input
                        type="text"
                        value={editingRoleName}
                        onChange={(e) => setEditingRoleName(e.target.value)}
                        placeholder="Role name"
                        maxLength={50}
                        variant="rounded"
                        size="sm"
                      />
                      {/* Permission toggles */}
                      <div className="space-y-1.5">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Permissions</p>
                        <div className="grid grid-cols-2 gap-1">
                          {ALL_PERMISSION_CODES.map(perm => {
                            const isOfficerRole = role.position >= 50
                            const checked = isOfficerRole || editingPermissions.includes(perm)
                            return (
                              <label
                                key={perm}
                                title={PERMISSIONS[perm].description}
                                className={`flex items-center gap-2 py-1.5 px-2 rounded-md ${isOfficerRole ? 'opacity-50' : 'hover:bg-muted/50 cursor-pointer'}`}
                              >
                                <Switch
                                  checked={checked}
                                  onCheckedChange={() => !isOfficerRole && togglePermission(perm)}
                                  disabled={isOfficerRole}
                                />
                                <span className="text-[12px] text-foreground">{PERMISSIONS[perm].label}</span>
                              </label>
                            )
                          })}
                        </div>
                        {role.position >= 50 && (
                          <p className="text-[10px] text-muted-foreground italic">
                            Officers and Guild Master have all permissions by default.
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {(() => {
                          const origPerms = new Set(role.permissions || [])
                          const editPerms = new Set(editingPermissions)
                          const hasChanges = editingRoleName.trim() !== role.name ||
                            origPerms.size !== editPerms.size ||
                            [...origPerms].some(p => !editPerms.has(p))
                          return (
                            <Button size="sm" onClick={() => handleSaveEditRole(role.id)} className="flex-1" disabled={!hasChanges}>
                              <HugeiconsIcon icon={Tick01Icon} size={16} />
                              Save
                            </Button>
                          )
                        })()}
                        <Button variant="outline" size="sm" onClick={handleCancelEdit} className="flex-1">
                          <HugeiconsIcon icon={Cancel01Icon} size={16} />
                          Cancel
                        </Button>
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
                          <p className="text-foreground font-medium text-[14px]">{role.name}</p>
                          {role.position < 50 && role.permissions && role.permissions.length > 0 && (
                            <p className="text-[11px] text-muted-foreground">
                              {role.permissions.map(p => PERMISSIONS[p as PermissionCode]?.label || p).join(', ')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Move up/down buttons - only for Member and custom roles (not position 100 or 50) */}
                        {role.position !== 100 && role.position !== 50 && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleMoveRole(role, 'up')}
                              disabled={roles.filter(r => r.position !== 100 && r.position !== 50).findIndex(r => r.id === role.id) === 0}
                            >
                              <HugeiconsIcon icon={ArrowUp01Icon} size={16} />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleMoveRole(role, 'down')}
                              disabled={roles.filter(r => r.position !== 100 && r.position !== 50).findIndex(r => r.id === role.id) === roles.filter(r => r.position !== 100 && r.position !== 50).length - 1}
                            >
                              <HugeiconsIcon icon={ArrowDown01Icon} size={16} />
                            </Button>
                          </div>
                        )}
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleStartEditRole(role)}
                        >
                          <HugeiconsIcon icon={Edit01Icon} size={16} />
                        </Button>
                        {!role.is_default && (
                          <Button
                            variant="destructive-outline"
                            size="icon"
                            onClick={() => handleDeleteRole(role.id, role.name)}
                          >
                            <HugeiconsIcon icon={Delete01Icon} size={16} />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {!isAddingRole && roles.length < 10 && (
            <Button variant="outline" onClick={() => setIsAddingRole(true)} className="w-full">
              <HugeiconsIcon icon={Add01Icon} size={16} />
              Add Custom Role
            </Button>
          )}

          {isAddingRole && (
            <div className="p-4 bg-background-subtle border border-border rounded-lg space-y-3">
              <div>
                <Label className="mb-2">Role Name</Label>
                <Input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="e.g., Raider, Trial, Core"
                  maxLength={50}
                  variant="rounded"
                  size="sm"
                />
              </div>

              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddRole} className="flex-1">
                  Create Role
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsAddingRole(false)
                    setNewRoleName('')
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-border">
            <p className="text-[11px] text-muted-foreground">
              Total Roles: {roles.length} / 10
            </p>
          </div>
        </>
      )}

      {ConfirmDialog}
    </div>
  )
}
