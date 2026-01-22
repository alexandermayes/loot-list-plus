'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { UserX, Shield, User, Crown } from 'lucide-react'

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
  const [members, setMembers] = useState<Member[]>([])
  const [roles, setRoles] = useState<GuildRole[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const supabase = createClient()
  const { activeGuild } = useGuildContext()

  useEffect(() => {
    if (activeGuild) {
      loadRoles()
      loadMembers()
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
            { id: '2', name: 'Officer', color_hex: '#fbbf24', position: 1, is_default: true },
            { id: '3', name: 'Guild Master', color_hex: '#ff8000', position: 2, is_default: true }
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
        { id: '2', name: 'Officer', color_hex: '#fbbf24', position: 1, is_default: true },
        { id: '3', name: 'Guild Master', color_hex: '#ff8000', position: 2, is_default: true }
      ] as GuildRole[])
    }
  }

  const loadMembers = async () => {
    if (!activeGuild) return

    setLoading(true)
    try {
      // Get all character guild memberships with character and user data
      // This is the source of truth for the new character-based system
      const { data: charMembershipsData, error: charMemError } = await supabase
        .from('character_guild_memberships')
        .select(`
          id,
          character_id,
          role,
          joined_at,
          joined_via,
          character:characters (
            id,
            user_id,
            name,
            is_main,
            class:wow_classes (
              name,
              color_hex
            ),
            spec:class_specs (
              name
            )
          )
        `)
        .eq('guild_id', activeGuild.id)
        .eq('is_active', true)

      if (charMemError) throw charMemError

      if (!charMembershipsData || charMembershipsData.length === 0) {
        setMembers([])
        return
      }

      // Group characters by user_id
      const userCharacterMap = new Map<string, {
        characters: Character[]
        role: string
        joined_at: string
        joined_via: string
      }>()

      for (const membership of charMembershipsData) {
        const char = Array.isArray(membership.character) ? membership.character[0] : membership.character
        if (!char) continue

        const userId = char.user_id
        const existing = userCharacterMap.get(userId)

        const charData: Character = {
          id: char.id,
          name: char.name,
          is_main: char.is_main,
          class: Array.isArray(char.class) ? char.class[0] : char.class,
          spec: Array.isArray(char.spec) ? char.spec[0] : char.spec
        }

        if (existing) {
          existing.characters.push(charData)
          // Use highest role position for the user
          const existingRoleInfo = roles.find(r => r.name === existing.role)
          const newRoleInfo = roles.find(r => r.name === membership.role)
          if ((newRoleInfo?.position || 0) > (existingRoleInfo?.position || 0)) {
            existing.role = membership.role
          }
        } else {
          userCharacterMap.set(userId, {
            characters: [charData],
            role: membership.role,
            joined_at: membership.joined_at,
            joined_via: membership.joined_via
          })
        }
      }

      // Get all user IDs
      const userIds = Array.from(userCharacterMap.keys())

      // Get user metadata for Discord names via API
      const displayNamesResponse = await fetch('/api/guild-members/display-names', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds })
      })

      let userMetadataMap = new Map<string, string>()
      if (displayNamesResponse.ok) {
        const { displayNames } = await displayNamesResponse.json()
        userMetadataMap = new Map(Object.entries(displayNames))
      } else {
        console.error('Failed to fetch display names')
      }

      // Build members array
      const membersArray: Member[] = Array.from(userCharacterMap.entries()).map(([userId, data]) => {
        // Sort characters - main first, then alphabetically
        data.characters.sort((a, b) => {
          if (a.is_main && !b.is_main) return -1
          if (!a.is_main && b.is_main) return 1
          return a.name.localeCompare(b.name)
        })

        const mainChar = data.characters.find(c => c.is_main) || data.characters[0] || null
        const discordName = userMetadataMap.get(userId) || 'Unknown User'

        return {
          user_id: userId,
          role: data.role,
          joined_at: data.joined_at,
          joined_via: data.joined_via,
          characters: data.characters,
          mainCharacter: mainChar,
          discordName
        }
      })

      // Sort by role hierarchy based on position (higher position = higher rank) then by name
      membersArray.sort((a, b) => {
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

      setMembers(membersArray)
    } catch (error) {
      console.error('Error loading members:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    try {
      // Get all character IDs for this user in this guild
      const member = members.find(m => m.user_id === userId)
      if (!member) throw new Error('Member not found')

      const characterIds = member.characters.map(c => c.id)

      // Update all character memberships for this user in this guild
      const { error } = await supabase
        .from('character_guild_memberships')
        .update({ role: newRole })
        .eq('guild_id', activeGuild!.id)
        .in('character_id', characterIds)

      if (error) throw error

      // Also update guild_members for backwards compatibility
      await supabase
        .from('guild_members')
        .update({ role: newRole })
        .eq('guild_id', activeGuild!.id)
        .eq('user_id', userId)

      setMessage({ type: 'success', text: `Role updated to ${newRole}` })
      await loadMembers()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update role' })
    }
  }

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from the guild? They can rejoin with an invite code.`)) return

    try {
      // Get all character IDs for this user in this guild
      const member = members.find(m => m.user_id === userId)
      if (!member) throw new Error('Member not found')

      const characterIds = member.characters.map(c => c.id)

      // Remove all character memberships for this user in this guild
      const { error } = await supabase
        .from('character_guild_memberships')
        .update({ is_active: false })
        .eq('guild_id', activeGuild!.id)
        .in('character_id', characterIds)

      if (error) throw error

      // Also update guild_members for backwards compatibility
      await supabase
        .from('guild_members')
        .update({ is_active: false })
        .eq('guild_id', activeGuild!.id)
        .eq('user_id', userId)

      setMessage({ type: 'success', text: `${memberName} has been removed from the guild` })
      await loadMembers()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to remove member' })
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
        <p className="text-[#a1a1a1] text-center py-4">Loading members...</p>
      ) : members.length === 0 ? (
        <p className="text-[#a1a1a1] text-center py-4">No members found</p>
      ) : (
        <div className="space-y-3">
          {members.map((member) => {
            const mainChar = member.mainCharacter
            const hasCharacters = member.characters.length > 0
            const displayName = mainChar?.name || member.discordName

            // Get role info from roles array to determine icon by position
            const memberRoleInfo = roles.find(r => r.name === member.role)
            const rolePosition = memberRoleInfo?.position || 0

            // Determine icon based on position (not name)
            const getRoleIcon = () => {
              if (rolePosition === 100) return <Crown className="w-5 h-5 text-[#ff8000]" />
              if (rolePosition === 50) return <Shield className="w-5 h-5 text-yellow-400" />
              return <User className="w-5 h-5 text-[#a1a1a1]" />
            }

            return (
              <div
                key={member.user_id}
                className="p-4 bg-[#0d0e11] border border-[rgba(255,255,255,0.1)] rounded-lg hover:bg-[#151519] transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#151515] border border-[rgba(255,255,255,0.1)] flex-shrink-0">
                      {getRoleIcon()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-semibold text-white text-[15px] whitespace-nowrap" style={{ color: mainChar?.class?.color_hex || '#fff' }}>
                          {displayName}
                          {mainChar?.spec && mainChar?.class && (
                            <span className="text-[#a1a1a1] text-[13px] font-normal ml-2">
                              • {mainChar.spec.name} {mainChar.class.name}
                            </span>
                          )}
                        </p>
                        {mainChar?.is_main && (
                          <span className="px-2 py-0.5 bg-[#ff8000]/20 text-[#ff8000] text-[11px] rounded border border-[#ff8000]/30 flex-shrink-0">
                            Main
                          </span>
                        )}
                      </div>

                      {/* Show no characters message or list alt characters */}
                      {!hasCharacters ? (
                        <p className="text-[#666] text-[13px] italic">No characters</p>
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
                                  <span className="text-[#a1a1a1]">
                                    • {char.spec.name} {char.class.name}
                                  </span>
                                )}
                              </div>
                            ))}
                        </div>
                      ) : null}

                      <div className="flex items-center gap-3 text-[13px] text-[#a1a1a1] mt-2">
                        <span>{getJoinedViaText(member.joined_via)}</span>
                        <span>•</span>
                        <span>{new Date(member.joined_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={member.role}
                      onChange={(e) => handleChangeRole(member.user_id, e.target.value)}
                      className="px-5 py-2.5 bg-[#151515] border border-[#383838] rounded-[52px] text-white text-[13px] font-medium focus:outline-none focus:border-[#ff8000] cursor-pointer select-custom transition"
                    >
                      {roles.map((role) => (
                        <option key={role.id} value={role.name} className="bg-[#151515]">
                          {role.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleRemoveMember(member.user_id, displayName)}
                      className="p-2 bg-[#151515] hover:bg-red-950/50 border border-[rgba(255,255,255,0.1)] hover:border-red-600/30 rounded-lg text-red-400 hover:text-red-300 transition"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="pt-4 border-t border-[rgba(255,255,255,0.1)]">
        <p className="text-[13px] text-[#a1a1a1]">
          Total Members: {members.length} (Officers: {members.filter(m => m.role === 'Officer').length})
        </p>
      </div>
    </div>
  )
}
