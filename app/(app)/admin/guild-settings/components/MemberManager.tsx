'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useMemo } from 'react'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { useGuildMembers, invalidateGuildMembers } from '@/app/hooks/use-api'
import { HugeiconsIcon } from '@hugeicons/react'
import { UserBlock01Icon, Shield01Icon, UserIcon, CrownIcon, StarIcon, Time01Icon, CheckmarkSquare01Icon } from '@hugeicons/core-free-icons'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ui/confirm-modal'
import { ROLE_POSITIONS } from '@/utils/roles'

interface Character {
  id: string
  name: string
  is_main: boolean
  class: {
    name: string
    color_hex: string
  } | null
  spec: {
    name: string
  } | null
}

interface GuildRole {
  id: string
  name: string
  color_hex: string
  position: number
  is_default: boolean
}

interface Member {
  user_id: string
  role: string
  joined_at: string
  joined_via: string
  membership_status: 'trial' | 'full'
  trial_started_at: string | null
  characters: Character[]
  mainCharacter: Character | null
  discordName: string
}

export default function MemberManager() {
  const [roles, setRoles] = useState<GuildRole[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [guildCreatorId, setGuildCreatorId] = useState<string | null>(null)

  const supabase = createClient()
  const { activeGuild } = useGuildContext()
  const { showNotification } = useNotification()
  const { confirm, ConfirmDialog } = useConfirm()

  // Use SWR for cached guild members data
  const { data: membersData, isLoading: loading, mutate: refreshMembers } = useGuildMembers(
    activeGuild?.id || null
  )

  // Transform members data
  const members: Member[] = useMemo(() => {
    if (!membersData?.members) return []
    return membersData.members.map((m: any) => ({
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      joined_via: m.joined_via,
      membership_status: m.membership_status || 'full',
      trial_started_at: m.trial_started_at || null,
      characters: m.characters,
      mainCharacter: m.mainCharacter,
      discordName: m.discordName
    }))
  }, [membersData])

  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUserId(user?.id || null)
    }
    loadCurrentUser()
  }, [])

  // Load guild creator
  useEffect(() => {
    const loadGuildCreator = async () => {
      if (!activeGuild) return
      const { data } = await supabase
        .from('guilds')
        .select('created_by')
        .eq('id', activeGuild.id)
        .single()
      setGuildCreatorId(data?.created_by || null)
    }
    loadGuildCreator()
  }, [activeGuild])

  // Load roles
  useEffect(() => {
    if (activeGuild) {
      loadRoles()
    }
  }, [activeGuild])

  const loadRoles = async () => {
    if (!activeGuild) return

    try {
      const { data, error } = await supabase
        .from('guild_roles')
        .select('*')
        .eq('guild_id', activeGuild.id)
        .order('position', { ascending: true })

      if (error) {
        console.error('Error loading roles:', error)
        // If table doesn't exist, fall back to default roles
        if (error.message?.includes('relation "public.guild_roles" does not exist')) {
          console.warn('guild_roles table not found, using default roles')
          setRoles([
            { id: '1', name: 'Member', color_hex: '#a1a1a1', position: 0, is_default: true },
            { id: '2', name: 'Officer', color_hex: '#fbbf24', position: 50, is_default: true },
            { id: '3', name: 'Guild Master', color_hex: '#ff8000', position: 100, is_default: true }
          ] as GuildRole[])
        }
        return
      }

      setRoles(data || [])
    } catch (error: any) {
      console.error('Error loading roles:', error)
      // Fall back to default roles on any error
      setRoles([
        { id: '1', name: 'Member', color_hex: '#a1a1a1', position: 0, is_default: true },
        { id: '2', name: 'Officer', color_hex: '#fbbf24', position: 50, is_default: true },
        { id: '3', name: 'Guild Master', color_hex: '#ff8000', position: 100, is_default: true }
      ] as GuildRole[])
    }
  }

  // Sort members by role position (highest first), then by name
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aRoleInfo = roles.find(r => r.name === a.role)
      const bRoleInfo = roles.find(r => r.name === b.role)
      const aPosition = aRoleInfo?.position || 0
      const bPosition = bRoleInfo?.position || 0

      if (aPosition !== bPosition) {
        return bPosition - aPosition // Higher positions first (100 > 50 > 0)
      }

      const aName = a.mainCharacter?.name || a.discordName
      const bName = b.mainCharacter?.name || b.discordName
      return aName.localeCompare(bName)
    })
  }, [members, roles])

  // Get current user's highest role position
  const currentUserPosition = useMemo(() => {
    if (!currentUserId) return 0
    const currentUserMember = members.find(m => m.user_id === currentUserId)
    if (!currentUserMember) return 0
    const roleInfo = roles.find(r => r.name === currentUserMember.role)
    return roleInfo?.position || 0
  }, [currentUserId, members, roles])

  // Check if current user is the guild creator
  const isCurrentUserCreator = currentUserId === guildCreatorId

  // Get roles that can be assigned by the current user
  const getAssignableRoles = (targetUserId: string, targetCurrentRole: string) => {
    const targetRoleInfo = roles.find(r => r.name === targetCurrentRole)
    const targetPosition = targetRoleInfo?.position || 0

    return roles.filter(role => {
      // Guild creator can assign any role
      if (isCurrentUserCreator) return true

      // Cannot assign Guild Master level roles (position >= 100)
      if (role.position >= ROLE_POSITIONS.GUILD_MASTER) return false

      // Cannot assign roles at or above your own position
      if (role.position >= currentUserPosition) return false

      // Cannot change roles for people at or above your level
      if (targetPosition >= currentUserPosition) return false

      return true
    })
  }

  // Check if current user can modify a member
  const canModifyMember = (targetUserId: string, targetRole: string) => {
    // Cannot modify the guild creator
    if (targetUserId === guildCreatorId) return false

    // Guild creator can modify anyone
    if (isCurrentUserCreator) return true

    // Get target's position
    const targetRoleInfo = roles.find(r => r.name === targetRole)
    const targetPosition = targetRoleInfo?.position || 0

    // Cannot modify people at or above your level
    return targetPosition < currentUserPosition
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      const member = members.find(m => m.user_id === userId)
      if (!member) throw new Error('Member not found')

      const characterIds = member.characters.map(c => c.id)

      const response = await fetch('/api/guild-members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_id: activeGuild!.id,
          target_user_id: userId,
          character_ids: characterIds,
          new_role: newRole
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update role')
      }

      showNotification('success', `Role changed to ${newRole}`)
      // Invalidate the SWR cache to refetch
      await refreshMembers()
    } catch (error: any) {
      showNotification('error', error.message || 'Couldn\'t update role. Try again.')
    }
  }

  const handleRemoveMember = (userId: string, memberName: string) => {
    confirm({
      title: 'Remove member',
      description: `Remove ${memberName} from the guild? They can rejoin with an invite code.`,
      confirmLabel: 'Remove',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const member = members.find(m => m.user_id === userId)
          if (!member) throw new Error('Member not found')

          const characterIds = member.characters.map(c => c.id)

          const response = await fetch(
            `/api/guild-members?guild_id=${activeGuild!.id}&target_user_id=${userId}&character_ids=${characterIds.join(',')}`,
            { method: 'DELETE' }
          )

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to remove member')
          }

          showNotification('success', `${memberName} removed from guild`)
          // Invalidate the SWR cache to refetch
          await refreshMembers()
        } catch (error: any) {
          showNotification('error', error.message || 'Couldn\'t remove member. Try again.')
        }
      }
    })
  }

  const handleToggleTrialStatus = (userId: string, memberName: string, currentStatus: 'trial' | 'full') => {
    const newStatus = currentStatus === 'trial' ? 'full' : 'trial'
    const actionText = newStatus === 'trial' ? 'set as trial' : 'promote to full member'

    confirm({
      title: newStatus === 'trial' ? 'Set as Trial' : 'Promote Member',
      description: `${newStatus === 'trial' ? 'Set' : 'Promote'} ${memberName} ${newStatus === 'trial' ? 'to trial status' : 'to full member'}? This affects their loot priority score.`,
      confirmLabel: newStatus === 'trial' ? 'Set as Trial' : 'Promote',
      variant: newStatus === 'trial' ? 'warning' : 'default',
      onConfirm: async () => {
        try {
          const member = members.find(m => m.user_id === userId)
          if (!member) throw new Error('Member not found')

          const characterIds = member.characters.map(c => c.id)

          const response = await fetch('/api/guild-members/trial-status', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              guild_id: activeGuild!.id,
              target_user_id: userId,
              character_ids: characterIds,
              new_status: newStatus
            })
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to update trial status')
          }

          showNotification('success', `${memberName} ${actionText}`)
          await refreshMembers()
        } catch (error: any) {
          showNotification('error', error.message || 'Couldn\'t update trial status. Try again.')
        }
      }
    })
  }

  const getTrialDuration = (trialStartedAt: string | null) => {
    if (!trialStartedAt) return null
    const start = new Date(trialStartedAt)
    const now = new Date()
    const days = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Today'
    if (days === 1) return '1 day'
    if (days < 7) return `${days} days`
    const weeks = Math.floor(days / 7)
    return weeks === 1 ? '1 week' : `${weeks} weeks`
  }

  const getJoinedViaText = (joinedVia: string) => {
    switch (joinedVia) {
      case 'invite_code':
        return 'Invite Code'
      case 'discord_verify':
        return 'Discord'
      case 'manual':
        return 'Manual'
      default:
        return joinedVia
    }
  }

  return (
    <div className="p-4 space-y-3">
      {loading ? (
        <p className="text-muted-foreground text-center py-4">Loading members...</p>
      ) : members.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No members found</p>
      ) : (
        <div className="space-y-2">
          {sortedMembers.map((member) => {
            const mainChar = member.mainCharacter
            const hasCharacters = member.characters.length > 0
            const displayName = mainChar?.name || member.discordName
            const isGuildOwner = member.user_id === guildCreatorId
            const canModify = canModifyMember(member.user_id, member.role)
            const assignableRoles = getAssignableRoles(member.user_id, member.role)

            // Get role info from roles array to determine icon by position
            const memberRoleInfo = roles.find(r => r.name === member.role)
            const rolePosition = memberRoleInfo?.position || 0

            // Determine icon based on position (not name)
            const getRoleIcon = () => {
              if (rolePosition >= ROLE_POSITIONS.GUILD_MASTER) return <HugeiconsIcon icon={CrownIcon} size={16} className="text-accent" />
              if (rolePosition >= ROLE_POSITIONS.OFFICER) return <HugeiconsIcon icon={Shield01Icon} size={16} className="text-yellow-400" />
              return <HugeiconsIcon icon={UserIcon} size={16} className="text-muted-foreground" />
            }

            return (
              <div
                key={member.user_id}
                className="p-3 bg-background-inset border border-border rounded-lg hover:border-border-strong transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background-elevated border border-border flex-shrink-0">
                      {getRoleIcon()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[13px]" style={{ color: mainChar?.class?.color_hex || '#fff' }}>
                          {displayName}
                        </span>
                        {isGuildOwner && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/20 text-accent">
                            <HugeiconsIcon icon={StarIcon} size={10} />
                            Owner
                          </span>
                        )}
                        {member.membership_status === 'trial' && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-500/20 text-yellow-400">
                            <HugeiconsIcon icon={Time01Icon} size={10} />
                            Trial
                            {member.trial_started_at && (
                              <span className="text-yellow-400/70">• {getTrialDuration(member.trial_started_at)}</span>
                            )}
                          </span>
                        )}
                        {mainChar?.spec && mainChar?.class && (
                          <span className="text-muted-foreground text-[12px]">
                            {mainChar.spec.name} {mainChar.class.name}
                          </span>
                        )}
                        {!hasCharacters && (
                          <span className="text-muted-foreground text-[12px] italic">No characters</span>
                        )}
                        {member.characters.length > 1 && (
                          <span className="text-muted-foreground text-[12px]">
                            +{member.characters.length - 1} alt{member.characters.length > 2 ? 's' : ''}
                          </span>
                        )}
                        <span className="text-muted-foreground text-[11px]">
                          • {getJoinedViaText(member.joined_via)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {canModify && assignableRoles.length > 0 ? (
                      <Select
                        value={member.role}
                        onChange={(e) => handleChangeRole(member.user_id, e.target.value)}
                        size="sm"
                        className="w-[120px]"
                      >
                        {/* Always include current role so the select shows the correct value */}
                        {!assignableRoles.find(r => r.name === member.role) && (
                          <option value={member.role} className="bg-background-elevated">
                            {member.role}
                          </option>
                        )}
                        {assignableRoles.map((role) => (
                          <option key={role.id} value={role.name} className="bg-background-elevated">
                            {role.name}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <span className="text-[12px] text-muted-foreground px-2 w-[120px] text-center">
                        {member.role}
                      </span>
                    )}
                    {canModify && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleToggleTrialStatus(member.user_id, displayName, member.membership_status)}
                        className={`h-9 w-9 p-0 ${member.membership_status === 'trial' ? 'text-success hover:text-success' : 'text-yellow-400 hover:text-yellow-400'}`}
                        title={member.membership_status === 'trial' ? 'Promote to full member' : 'Set as trial'}
                      >
                        <HugeiconsIcon icon={member.membership_status === 'trial' ? CheckmarkSquare01Icon : Time01Icon} size={16} />
                      </Button>
                    )}
                    {canModify ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRemoveMember(member.user_id, displayName)}
                        className="text-destructive hover:text-destructive h-9 w-9 p-0"
                      >
                        <HugeiconsIcon icon={UserBlock01Icon} size={16} />
                      </Button>
                    ) : (
                      <div className="w-18" /> // Spacer to maintain alignment
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="pt-3 border-t border-border">
        <p className="text-[12px] text-muted-foreground">
          Total Members: {members.length} • Officers: {members.filter(m => {
            const roleInfo = roles.find(r => r.name === m.role)
            return (roleInfo?.position || 0) >= 50
          }).length} • Trials: {members.filter(m => m.membership_status === 'trial').length}
        </p>
      </div>

      {ConfirmDialog}
    </div>
  )
}
