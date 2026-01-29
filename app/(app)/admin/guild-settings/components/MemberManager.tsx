'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useMemo } from 'react'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { useGuildMembers, invalidateGuildMembers } from '@/app/hooks/use-api'
import { HugeiconsIcon } from '@hugeicons/react'
import { UserBlock01Icon, Shield01Icon, UserIcon, CrownIcon } from '@hugeicons/core-free-icons'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

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
  characters: Character[]
  mainCharacter: Character | null
  discordName: string
}

export default function MemberManager() {
  const [roles, setRoles] = useState<GuildRole[]>([])

  const supabase = createClient()
  const { activeGuild } = useGuildContext()
  const { showNotification } = useNotification()

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
      characters: m.characters,
      mainCharacter: m.mainCharacter,
      discordName: m.discordName
    }))
  }, [membersData])

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

      showNotification('success', `Role updated to ${newRole}`)
      // Invalidate the SWR cache to refetch
      await refreshMembers()
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to update role')
    }
  }

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from the guild? They can rejoin with an invite code.`)) return

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

      showNotification('success', `${memberName} has been removed from the guild`)
      // Invalidate the SWR cache to refetch
      await refreshMembers()
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to remove member')
    }
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
    <div className="p-6 space-y-4">
      {loading ? (
        <p className="text-muted-foreground text-center py-4">Loading members...</p>
      ) : members.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No members found</p>
      ) : (
        <div className="space-y-3">
          {sortedMembers.map((member) => {
            const mainChar = member.mainCharacter
            const hasCharacters = member.characters.length > 0
            const displayName = mainChar?.name || member.discordName

            // Get role info from roles array to determine icon by position
            const memberRoleInfo = roles.find(r => r.name === member.role)
            const rolePosition = memberRoleInfo?.position || 0

            // Determine icon based on position (not name)
            const getRoleIcon = () => {
              if (rolePosition === 100) return <HugeiconsIcon icon={CrownIcon} size={20} className="text-accent" />
              if (rolePosition === 50) return <HugeiconsIcon icon={Shield01Icon} size={20} className="text-yellow-400" />
              return <HugeiconsIcon icon={UserIcon} size={20} className="text-muted-foreground" />
            }

            return (
              <div
                key={member.user_id}
                className="p-4 bg-background-inset border border-border rounded-xl hover:border-border-strong transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background-elevated border border-border flex-shrink-0">
                      {getRoleIcon()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-foreground text-[15px] whitespace-nowrap" style={{ color: mainChar?.class?.color_hex || '#fff' }}>
                          {displayName}
                          {mainChar?.spec && mainChar?.class && (
                            <span className="text-muted-foreground text-[13px] font-normal ml-2">
                              • {mainChar.spec.name} {mainChar.class.name}
                            </span>
                          )}
                        </p>
                        {mainChar?.is_main && (
                          <span className="px-2 py-0.5 bg-accent/20 text-accent text-[11px] rounded border border-accent/30 flex-shrink-0">
                            Main
                          </span>
                        )}
                      </div>

                      {/* Show no characters message or list alt characters */}
                      {!hasCharacters ? (
                        <p className="text-foreground-muted text-[13px] italic">No characters</p>
                      ) : member.characters.length > 1 ? (
                        <div className="space-y-1">
                          {member.characters
                            .filter(char => char.id !== mainChar?.id)
                            .map((char) => (
                              <div key={char.id} className="flex items-center gap-2 text-[13px]">
                                <span style={{ color: char.class?.color_hex || '#a1a1a1' }} className="font-medium">
                                  {char.name}
                                </span>
                                {char.spec && char.class && (
                                  <span className="text-muted-foreground">
                                    • {char.spec.name} {char.class.name}
                                  </span>
                                )}
                              </div>
                            ))}
                        </div>
                      ) : null}

                      <div className="flex items-center gap-3 text-[13px] text-muted-foreground mt-2">
                        <span>{getJoinedViaText(member.joined_via)}</span>
                        <span>•</span>
                        <span>{new Date(member.joined_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.user_id, e.target.value)}
                      size="sm"
                      className="w-[140px]"
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.name} className="bg-background-elevated">
                          {role.name}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={() => handleRemoveMember(member.user_id, displayName)}
                      className="text-destructive hover:text-destructive"
                    >
                      <HugeiconsIcon icon={UserBlock01Icon} size={18} />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="pt-4 border-t border-border">
        <p className="text-[13px] text-muted-foreground">
          Total Members: {members.length} (Officers: {members.filter(m => {
            const roleInfo = roles.find(r => r.name === m.role)
            return (roleInfo?.position || 0) >= 50
          }).length})
        </p>
      </div>
    </div>
  )
}
