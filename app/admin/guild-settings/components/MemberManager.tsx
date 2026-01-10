'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect } from 'react'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserX, Shield, User } from 'lucide-react'

interface Member {
  id: string
  user_id: string
  character_name: string
  role: string
  is_active: boolean
  joined_at: string
  joined_via: string
  class: {
    name: string
    color_hex: string
  } | null
}

export default function MemberManager() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const supabase = createClient()
  const { activeGuild } = useGuildContext()

  useEffect(() => {
    if (activeGuild) {
      loadMembers()
    }
  }, [activeGuild])

  const loadMembers = async () => {
    if (!activeGuild) return

    setLoading(true)
    try {
      const { data: membersData, error } = await supabase
        .from('guild_members')
        .select(`
          id,
          user_id,
          character_name,
          role,
          is_active,
          joined_at,
          joined_via,
          class:wow_classes(name, color_hex)
        `)
        .eq('guild_id', activeGuild.id)
        .order('role', { ascending: false })
        .order('character_name', { ascending: true })

      if (error) throw error

      setMembers(membersData as any || [])
    } catch (error) {
      console.error('Error loading members:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleChangeRole = async (memberId: string, currentRole: string) => {
    const newRole = currentRole === 'Officer' ? 'Member' : 'Officer'

    if (!confirm(`Change this member's role to ${newRole}?`)) return

    try {
      const { error } = await supabase
        .from('guild_members')
        .update({ role: newRole })
        .eq('id', memberId)

      if (error) throw error

      setMessage({ type: 'success', text: `Role updated to ${newRole}` })
      await loadMembers()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update role' })
    }
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    // Check if this is the last officer
    const officers = members.filter(m => m.role === 'Officer')
    const memberToRemove = members.find(m => m.id === memberId)

    if (memberToRemove?.role === 'Officer' && officers.length === 1) {
      setMessage({
        type: 'error',
        text: 'Cannot remove the last officer. Promote another member to officer first.'
      })
      return
    }

    if (!confirm(`Remove ${memberName} from the guild? They can rejoin with an invite code.`)) return

    try {
      const { error } = await supabase
        .from('guild_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error

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
    <Card>
      <CardHeader>
        <CardTitle>Guild Members</CardTitle>
        <CardDescription>
          Manage your guild members - change roles or remove members
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
          <p className="text-muted-foreground text-center py-4">Loading members...</p>
        ) : members.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No members found</p>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="p-4 bg-secondary rounded-lg flex items-center justify-between"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-background">
                    {member.role === 'Officer' ? (
                      <Shield className="w-5 h-5 text-yellow-400" />
                    ) : (
                      <User className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{member.character_name}</p>
                      {member.role === 'Officer' && (
                        <span className="px-2 py-0.5 bg-yellow-950/50 text-yellow-200 text-xs rounded">
                          Officer
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {member.class && (
                        <span style={{ color: member.class.color_hex }}>
                          {member.class.name}
                        </span>
                      )}
                      <span>Joined via {getJoinedViaText(member.joined_via)}</span>
                      <span>{new Date(member.joined_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleChangeRole(member.id, member.role)}
                    size="sm"
                    variant="outline"
                  >
                    {member.role === 'Officer' ? 'Demote to Member' : 'Promote to Officer'}
                  </Button>
                  <Button
                    onClick={() => handleRemoveMember(member.id, member.character_name)}
                    size="sm"
                    variant="outline"
                    className="text-red-400 hover:text-red-300"
                  >
                    <UserX className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            Total Members: {members.length} (Officers: {members.filter(m => m.role === 'Officer').length})
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
