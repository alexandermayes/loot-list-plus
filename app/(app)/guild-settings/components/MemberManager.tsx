'use client'

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { useGuildMembers } from '@/app/hooks/use-api'
import { hasFeature } from '@/domain/guild/feature-flags'
import { HugeiconsIcon } from '@hugeicons/react'
import { UserBlock01Icon, Time01Icon, CheckmarkSquare01Icon, Search01Icon, SortingAZ02Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useConfirm } from '@/components/ui/confirm-modal'
import { ROLE_POSITIONS } from '@/domain/guild/roles'

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
  raid_team?: { id: string; name: string; color: string } | null
}

type SortMode = 'role' | 'class' | 'team' | 'alpha'

function getJoinedAgo(joinedAt: string): string {
  const joined = new Date(joinedAt)
  const now = new Date()
  const days = Math.floor((now.getTime() - joined.getTime()) / (1000 * 60 * 60 * 24))
  if (days === 0) return 'today'
  if (days === 1) return '1d ago'
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  const years = Math.floor(days / 365)
  return `${years}y ago`
}

export default function MemberManager() {
  const [roles, setRoles] = useState<GuildRole[]>([])
  const [guildCreatorId, setGuildCreatorId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<SortMode>('role')
  const [expandedUserIds, setExpandedUserIds] = useState<Set<string>>(new Set())
  const [rankOverrides, setRankOverrides] = useState<Record<string, number>>({})
  const [rankBonusesEnabled, setRankBonusesEnabled] = useState<boolean>(true)
  const [savingOverrides, setSavingOverrides] = useState<boolean>(false)

  const supabase = createClient()
  const { activeGuild, user } = useGuildContext()
  const currentUserId = user?.id ?? null
  const { showNotification } = useNotification()
  const { confirm, ConfirmDialog } = useConfirm()

  const { data: membersData, isLoading: loading, mutate: refreshMembers } = useGuildMembers(
    activeGuild?.id || null,
    { includeStats: true }
  )

  // Raid teams for the team assignment dropdown
  interface RaidTeamOption { id: string; name: string; color_hex: string }
  const [raidTeams, setRaidTeams] = useState<RaidTeamOption[]>([])
  const showTeamAssignment = hasFeature(activeGuild, 'raid_teams')

  useEffect(() => {
    if (!activeGuild?.id || !showTeamAssignment) return
    supabase
      .from('raid_teams')
      .select('id, name, color_hex')
      .eq('guild_id', activeGuild.id)
      .order('sort_order', { ascending: true })
      .then(({ data }: { data: RaidTeamOption[] | null }) => {
        setRaidTeams(data || [])
      })
  }, [activeGuild?.id, showTeamAssignment])

  const handleTeamChange = useCallback(async (member: Member, teamId: string | null) => {
    const mainChar = member.mainCharacter
    if (!mainChar) return

    const newTeam = teamId ? raidTeams.find(t => t.id === teamId) : null
    const optimisticData = {
      ...membersData,
      members: membersData!.members.map((m: any) =>
        m.user_id === member.user_id
          ? { ...m, raid_team: newTeam ? { id: newTeam.id, name: newTeam.name, color: newTeam.color_hex } : null }
          : m
      )
    }

    try {
      await refreshMembers(async () => {
        // Remove from current team
        if (member.raid_team?.id) {
          await fetch(`/api/raid-teams/${member.raid_team.id}/members`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ character_ids: [mainChar.id] }),
          })
        }
        // Add to new team
        if (teamId) {
          const res = await fetch(`/api/raid-teams/${teamId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ character_ids: [mainChar.id] }),
          })
          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.error || 'Failed to assign team')
          }
        }
        return optimisticData
      }, { optimisticData, rollbackOnError: true, revalidate: false })
      const teamName = teamId ? raidTeams.find(t => t.id === teamId)?.name : null
      showNotification('success', teamName ? `${mainChar.name} assigned to ${teamName}` : `${mainChar.name} removed from team`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update team'
      showNotification('error', message)
    }
  }, [raidTeams, membersData, refreshMembers, showNotification])

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
      discordName: m.discordName,
      raid_team: m.raid_team ?? null,
    }))
  }, [membersData])

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

  useEffect(() => {
    if (activeGuild) loadRoles()
  }, [activeGuild])

  useEffect(() => {
    if (!activeGuild?.id) return
    let cancelled = false
    supabase
      .from('guild_settings')
      .select('character_rank_overrides, guild_rank_bonuses_enabled')
      .eq('guild_id', activeGuild.id)
      .maybeSingle()
      .then(({ data }: { data: { character_rank_overrides: unknown; guild_rank_bonuses_enabled: boolean | null } | null }) => {
        if (cancelled) return
        const raw = (data?.character_rank_overrides ?? {}) as Record<string, unknown>
        const sanitized: Record<string, number> = {}
        for (const [id, value] of Object.entries(raw)) {
          const num = typeof value === 'number' ? value : Number(value)
          if (Number.isFinite(num)) sanitized[id] = num
        }
        setRankOverrides(sanitized)
        setRankBonusesEnabled(data?.guild_rank_bonuses_enabled !== false)
      })
    return () => { cancelled = true }
  }, [activeGuild?.id])

  const persistOverrides = useCallback(async (next: Record<string, number>) => {
    if (!activeGuild?.id) return
    setSavingOverrides(true)
    try {
      const res = await fetch('/api/guild-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guild_id: activeGuild.id,
          settings: { character_rank_overrides: next },
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Couldn\'t save bonus. Try again.')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Couldn\'t save bonus. Try again.'
      showNotification('error', message)
    } finally {
      setSavingOverrides(false)
    }
  }, [activeGuild?.id, showNotification])

  const handleOverrideCommit = useCallback((characterId: string, rawValue: string) => {
    setRankOverrides(prev => {
      const next = { ...prev }
      const trimmed = rawValue.trim()
      if (trimmed === '') {
        if (!(characterId in next)) return prev
        delete next[characterId]
      } else {
        const num = Number(trimmed)
        if (!Number.isFinite(num)) return prev
        if (next[characterId] === num) return prev
        next[characterId] = num
      }
      persistOverrides(next)
      return next
    })
  }, [persistOverrides])

  const toggleExpanded = useCallback((userId: string) => {
    setExpandedUserIds(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }, [])

  const loadRoles = async () => {
    if (!activeGuild) return
    try {
      const { data, error } = await supabase
        .from('guild_roles')
        .select('*')
        .eq('guild_id', activeGuild.id)
        .order('position', { ascending: true })

      if (error) {
        if (error.message?.includes('relation "public.guild_roles" does not exist')) {
          setRoles([
            { id: '1', name: 'Member', color_hex: '#a1a1a1', position: 0, is_default: true },
            { id: '2', name: 'Officer', color_hex: '#fbbf24', position: 50, is_default: true },
            { id: '3', name: 'Guild Master', color_hex: '#ff8000', position: 100, is_default: true }
          ] as GuildRole[])
        }
        return
      }
      setRoles(data || [])
    } catch {
      setRoles([
        { id: '1', name: 'Member', color_hex: '#a1a1a1', position: 0, is_default: true },
        { id: '2', name: 'Officer', color_hex: '#fbbf24', position: 50, is_default: true },
        { id: '3', name: 'Guild Master', color_hex: '#ff8000', position: 100, is_default: true }
      ] as GuildRole[])
    }
  }

  // Sort + group
  const getName = (m: Member) => m.mainCharacter?.name || m.discordName
  const getClassName = (m: Member) => m.mainCharacter?.class?.name || 'Unknown'
  const getTeamName = (m: Member) => m.raid_team?.name || ''
  const getRolePosition = (m: Member) => roles.find(r => r.name === m.role)?.position || 0

  const sortedMembers = useMemo(() => {
    const sorted = [...members]
    switch (sortMode) {
      case 'role':
        sorted.sort((a, b) => {
          const diff = getRolePosition(b) - getRolePosition(a)
          return diff !== 0 ? diff : getName(a).localeCompare(getName(b))
        })
        break
      case 'class':
        sorted.sort((a, b) => {
          const diff = getClassName(a).localeCompare(getClassName(b))
          return diff !== 0 ? diff : getName(a).localeCompare(getName(b))
        })
        break
      case 'team':
        sorted.sort((a, b) => {
          const aTeam = getTeamName(a)
          const bTeam = getTeamName(b)
          // Unassigned last
          if (!aTeam && bTeam) return 1
          if (aTeam && !bTeam) return -1
          const diff = aTeam.localeCompare(bTeam)
          return diff !== 0 ? diff : getName(a).localeCompare(getName(b))
        })
        break
      case 'alpha':
        sorted.sort((a, b) => getName(a).localeCompare(getName(b)))
        break
    }
    return sorted
  }, [members, roles, sortMode])

  // Search filter
  const filteredMembers = useMemo(() => {
    if (!search.trim()) return sortedMembers
    const q = search.toLowerCase()
    return sortedMembers.filter(m => {
      const mainName = m.mainCharacter?.name?.toLowerCase() || ''
      const discord = m.discordName?.toLowerCase() || ''
      const altNames = m.characters.map(c => c.name.toLowerCase())
      return mainName.includes(q) || discord.includes(q) || altNames.some(n => n.includes(q))
    })
  }, [sortedMembers, search])

  // Section grouping
  const sections = useMemo(() => {
    if (search.trim()) return [{ label: null, members: filteredMembers }]

    const groups: { label: string | null; members: Member[] }[] = []
    let currentLabel: string | null = null
    let currentGroup: Member[] = []

    for (const m of filteredMembers) {
      let label: string
      switch (sortMode) {
        case 'role':
          label = m.role
          break
        case 'class':
          label = getClassName(m)
          break
        case 'team':
          label = getTeamName(m) || 'Unassigned'
          break
        case 'alpha':
          return [{ label: null, members: filteredMembers }]
      }

      if (label !== currentLabel) {
        if (currentGroup.length > 0) groups.push({ label: currentLabel, members: currentGroup })
        currentLabel = label
        currentGroup = [m]
      } else {
        currentGroup.push(m)
      }
    }
    if (currentGroup.length > 0) groups.push({ label: currentLabel, members: currentGroup })
    return groups
  }, [filteredMembers, sortMode, search])

  // Permissions
  const currentUserPosition = useMemo(() => {
    if (!currentUserId) return 0
    const m = members.find(m => m.user_id === currentUserId)
    if (!m) return 0
    return roles.find(r => r.name === m.role)?.position || 0
  }, [currentUserId, members, roles])

  const isCurrentUserCreator = currentUserId === guildCreatorId

  const getAssignableRoles = (targetUserId: string, targetCurrentRole: string) => {
    const targetPosition = roles.find(r => r.name === targetCurrentRole)?.position || 0
    return roles.filter(role => {
      if (isCurrentUserCreator) return true
      if (role.position >= ROLE_POSITIONS.GUILD_MASTER) return false
      if (role.position >= currentUserPosition) return false
      if (targetPosition >= currentUserPosition) return false
      return true
    })
  }

  const canModifyMember = (targetUserId: string, targetRole: string) => {
    if (isCurrentUserCreator) return true
    if (targetUserId === guildCreatorId) return false
    return (roles.find(r => r.name === targetRole)?.position || 0) < currentUserPosition
  }

  // --- Actions (unchanged logic) ---
  const executeRoleChange = async (userId: string, newRole: string) => {
    const member = members.find(m => m.user_id === userId)
    if (!member) { showNotification('error', 'Member not found'); return }
    const characterIds = member.characters.map(c => c.id)
    let updatedMembers = membersData!.members.map((m: any) =>
      m.user_id === userId ? { ...m, role: newRole } : m
    )
    if (newRole === 'Guild Master') {
      updatedMembers = updatedMembers.map((m: any) =>
        m.role === 'Guild Master' && m.user_id !== userId ? { ...m, role: 'Officer' } : m
      )
    }
    const optimisticData = { ...membersData, members: updatedMembers }
    try {
      await refreshMembers(async () => {
        const res = await fetch('/api/guild-members', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ guild_id: activeGuild!.id, target_user_id: userId, character_ids: characterIds, new_role: newRole })
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Couldn\'t update role. Try again.')
        showNotification('success', `Role changed to ${newRole}`)
        return optimisticData
      }, { optimisticData, rollbackOnError: true, revalidate: false })
    } catch (error: any) { showNotification('error', error.message || 'Couldn\'t update role. Try again.') }
  }

  const handleChangeRole = (userId: string, newRole: string) => {
    if (newRole === 'Guild Master') {
      const currentGM = members.find(m => m.role === 'Guild Master' && m.user_id !== userId)
      const target = members.find(m => m.user_id === userId)
      confirm({
        title: 'Promote to Guild Master',
        description: currentGM
          ? `Promote ${target?.characters[0]?.name || 'this member'} to Guild Master? ${currentGM?.characters[0]?.name || 'the current Guild Master'} will be demoted to Officer.`
          : `Promote ${target?.characters[0]?.name || 'this member'} to Guild Master?`,
        confirmLabel: 'Promote', variant: 'danger',
        onConfirm: () => executeRoleChange(userId, newRole)
      })
      return
    }
    executeRoleChange(userId, newRole)
  }

  const handleRemoveMember = (userId: string, memberName: string) => {
    confirm({
      title: 'Remove member',
      description: `Remove ${memberName} from the guild? They can rejoin with an invite code.`,
      confirmLabel: 'Remove', variant: 'danger',
      onConfirm: async () => {
        const member = members.find(m => m.user_id === userId)
        if (!member) { showNotification('error', 'Member not found'); return }
        const characterIds = member.characters.map(c => c.id)
        const optimisticData = { ...membersData, members: membersData!.members.filter((m: any) => m.user_id !== userId) }
        try {
          await refreshMembers(async () => {
            const res = await fetch(`/api/guild-members?guild_id=${activeGuild!.id}&target_user_id=${userId}&character_ids=${characterIds.join(',')}`, { method: 'DELETE' })
            if (!res.ok) throw new Error((await res.json()).error || 'Couldn\'t remove member. Try again.')
            showNotification('success', `${memberName} removed from guild`)
            return optimisticData
          }, { optimisticData, rollbackOnError: true, revalidate: false })
        } catch (error: any) { showNotification('error', error.message || 'Couldn\'t remove member. Try again.') }
      }
    })
  }

  const handleToggleTrialStatus = (userId: string, memberName: string, currentStatus: 'trial' | 'full') => {
    const newStatus = currentStatus === 'trial' ? 'full' : 'trial'
    confirm({
      title: newStatus === 'trial' ? 'Set as trial' : 'Promote member',
      description: `${newStatus === 'trial' ? 'Set' : 'Promote'} ${memberName} ${newStatus === 'trial' ? 'to trial status' : 'to full member'}? This affects their loot priority score.`,
      confirmLabel: newStatus === 'trial' ? 'Set as trial' : 'Promote',
      variant: newStatus === 'trial' ? 'warning' : 'default',
      onConfirm: async () => {
        const member = members.find(m => m.user_id === userId)
        if (!member) { showNotification('error', 'Member not found'); return }
        const characterIds = member.characters.map(c => c.id)
        const optimisticData = {
          ...membersData,
          members: membersData!.members.map((m: any) =>
            m.user_id === userId ? { ...m, membership_status: newStatus, trial_started_at: newStatus === 'trial' ? new Date().toISOString() : m.trial_started_at } : m
          )
        }
        try {
          await refreshMembers(async () => {
            const res = await fetch('/api/guild-members/trial-status', {
              method: 'PUT', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ guild_id: activeGuild!.id, target_user_id: userId, character_ids: characterIds, new_status: newStatus })
            })
            if (!res.ok) throw new Error((await res.json()).error || 'Couldn\'t update trial status. Try again.')
            showNotification('success', `${memberName} ${newStatus === 'trial' ? 'set as trial' : 'promoted to full member'}`)
            return optimisticData
          }, { optimisticData, rollbackOnError: true, revalidate: false })
        } catch (error: any) { showNotification('error', error.message || 'Couldn\'t update trial status. Try again.') }
      }
    })
  }

  const officerCount = members.filter(m => (roles.find(r => r.name === m.role)?.position || 0) >= 50).length
  const trialCount = members.filter(m => m.membership_status === 'trial').length

  return (
    <div className="p-4 space-y-3">
      {/* Toolbar: search + sort */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
            size="sm"
          />
        </div>
        <Select
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as SortMode)}
          size="sm"
          className="w-[110px] flex-shrink-0"
        >
          <option value="role">By role</option>
          <option value="class">By class</option>
          <option value="team">By team</option>
          <option value="alpha">A-Z</option>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-4">Loading members...</p>
      ) : members.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No members found</p>
      ) : filteredMembers.length === 0 ? (
        <p className="text-muted-foreground text-center py-4">No members matching &quot;{search}&quot;</p>
      ) : (
        <div className="space-y-1">
          {sections.map((section, si) => (
            <div key={si}>
              {/* Section header */}
              {section.label && (
                <div className="flex items-center gap-2 px-1 pt-2 pb-1">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{section.members.length}</span>
                  <div className="flex-1 border-t border-border/50" />
                </div>
              )}

              {/* Member rows */}
              {section.members.map((member) => {
                const mainChar = member.mainCharacter
                const hasCharacters = member.characters.length > 0
                const displayName = mainChar?.name || member.discordName
                const isGuildOwner = member.user_id === guildCreatorId
                const canModify = canModifyMember(member.user_id, member.role)
                const assignableRoles = getAssignableRoles(member.user_id, member.role)
                const classColor = mainChar?.class?.color_hex || '#666'
                const isExpanded = expandedUserIds.has(member.user_id)
                const memberHasAnyOverride = member.characters.some(c => c.id in rankOverrides)

                return (
                  <div key={member.user_id}>
                  <div
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-background-elevated/50 transition-colors group"
                  >
                    {hasCharacters && canModify ? (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(member.user_id)}
                        className="p-0.5 -ml-1 text-muted-foreground hover:text-foreground transition-colors"
                        title={isExpanded ? 'Hide characters' : 'Show characters'}
                        aria-expanded={isExpanded}
                      >
                        <HugeiconsIcon
                          icon={ArrowRight01Icon}
                          size={14}
                          className={`transition-transform ${isExpanded ? 'rotate-90' : ''} ${memberHasAnyOverride ? 'text-accent' : ''}`}
                        />
                      </button>
                    ) : (
                      <span className="w-[14px]" />
                    )}
                    {/* Class icon */}
                    {mainChar?.class?.name ? (
                      <img
                        src={`https://wow.zamimg.com/images/wow/icons/large/classicon_${mainChar.class.name.toLowerCase().replace(' ', '')}.jpg`}
                        alt={mainChar.class.name}
                        className="w-5 h-5 rounded-full flex-shrink-0 border border-border/50"
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full flex-shrink-0 bg-muted" />
                    )}

                    {/* Name + meta */}
                    <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
                      <span
                        className="font-semibold text-[13px] truncate"
                        style={{ color: classColor }}
                      >
                        {displayName}
                      </span>
                      {isGuildOwner && (
                        <span className="px-1 py-px rounded text-[9px] font-semibold bg-accent/15 text-accent leading-tight">
                          Owner
                        </span>
                      )}
                      {member.membership_status === 'trial' && (
                        <span className="px-1 py-px rounded text-[9px] font-semibold bg-warning/15 text-warning leading-tight">
                          Trial
                        </span>
                      )}
                      {mainChar?.spec && mainChar?.class && (
                        <span className="text-muted-foreground text-[11px] hidden sm:inline">
                          {mainChar.spec.name !== mainChar.class.name
                            ? `${mainChar.spec.name} ${mainChar.class.name}`
                            : mainChar.class.name}
                        </span>
                      )}
                      {!hasCharacters && (
                        <span className="text-muted-foreground text-[11px] italic">No characters</span>
                      )}
                      {member.characters.length > 1 && (
                        <span className="text-muted-foreground text-[11px]">
                          +{member.characters.length - 1} alt{member.characters.length > 2 ? 's' : ''}
                        </span>
                      )}
                      {member.raid_team && sortMode !== 'team' && (
                        <span className="text-[10px] font-medium" style={{ color: member.raid_team.color }}>
                          {member.raid_team.name}
                        </span>
                      )}
                      {member.joined_at && (
                        <span className="text-muted-foreground/60 text-[10px] hidden md:inline">
                          {getJoinedAgo(member.joined_at)}
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
                      {canModify && (
                        <button
                          onClick={() => handleToggleTrialStatus(member.user_id, displayName, member.membership_status)}
                          className={`p-1 rounded transition-colors ${member.membership_status === 'trial' ? 'text-success hover:bg-success/10' : 'text-muted-foreground hover:text-warning hover:bg-warning/10'} opacity-0 group-hover:opacity-100`}
                          title={member.membership_status === 'trial' ? 'Promote to full member' : 'Set as trial'}
                        >
                          <HugeiconsIcon icon={member.membership_status === 'trial' ? CheckmarkSquare01Icon : Time01Icon} size={14} />
                        </button>
                      )}
                      {canModify && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id, displayName)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                          title="Remove from guild"
                        >
                          <HugeiconsIcon icon={UserBlock01Icon} size={14} />
                        </button>
                      )}
                      {showTeamAssignment && raidTeams.length > 0 && mainChar && (
                        <Select
                          value={member.raid_team?.id || ''}
                          onChange={(e) => handleTeamChange(member, e.target.value || null)}
                          size="sm"
                          className="w-[120px] text-[12px]"
                        >
                          <option value="" className="bg-background-elevated">No team</option>
                          {raidTeams.map(team => (
                            <option key={team.id} value={team.id} className="bg-background-elevated">{team.name}</option>
                          ))}
                        </Select>
                      )}
                      {canModify && assignableRoles.length > 0 ? (
                        <Select
                          value={member.role}
                          onChange={(e) => handleChangeRole(member.user_id, e.target.value)}
                          size="sm"
                          className="w-[130px] text-[12px]"
                        >
                          {!assignableRoles.find(r => r.name === member.role) && (
                            <option value={member.role} className="bg-background-elevated">{member.role}</option>
                          )}
                          {assignableRoles.map(role => (
                            <option key={role.id} value={role.name} className="bg-background-elevated">{role.name}</option>
                          ))}
                        </Select>
                      ) : (
                        <span className="text-[11px] text-muted-foreground px-1.5 w-[130px] text-right">{member.role}</span>
                      )}
                    </div>
                  </div>
                  {isExpanded && hasCharacters && canModify && (
                    <div className="ml-6 mb-1 px-3 py-2 rounded-md bg-background-subtle border border-border/60 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-foreground-secondary">
                          Per-character rank bonus
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Replaces the {member.role} bonus for that character. Leave blank to use the role bonus.
                        </p>
                      </div>
                      <div className="space-y-1">
                        {member.characters.map(char => {
                          const charClassColor = char.class?.color_hex || '#666'
                          const overrideValue = rankOverrides[char.id]
                          const hasOverride = char.id in rankOverrides
                          return (
                            <div key={char.id} className="flex items-center gap-2 py-0.5">
                              {char.class?.name ? (
                                <img
                                  src={`https://wow.zamimg.com/images/wow/icons/large/classicon_${char.class.name.toLowerCase().replace(' ', '')}.jpg`}
                                  alt={char.class.name}
                                  className="w-4 h-4 rounded-full flex-shrink-0 outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
                                />
                              ) : (
                                <div className="w-4 h-4 rounded-full flex-shrink-0 bg-muted" />
                              )}
                              <span
                                className="text-[12px] font-medium truncate"
                                style={{ color: charClassColor }}
                              >
                                {char.name}
                              </span>
                              {char.is_main && (
                                <span className="text-[10px] text-muted-foreground">main</span>
                              )}
                              <div className="ml-auto flex items-center gap-1.5">
                                {hasOverride && (
                                  <span className="text-[10px] text-accent tabular-nums">
                                    override
                                  </span>
                                )}
                                <Input
                                  variant="pill"
                                  size="sm"
                                  type="number"
                                  inputMode="numeric"
                                  step="0.1"
                                  defaultValue={hasOverride ? String(overrideValue) : ''}
                                  placeholder={rankBonusesEnabled ? 'role bonus' : 'disabled'}
                                  disabled={savingOverrides || !rankBonusesEnabled}
                                  onBlur={(e) => handleOverrideCommit(char.id, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      (e.target as HTMLInputElement).blur()
                                    }
                                  }}
                                  className="w-[88px] text-right tabular-nums"
                                  aria-label={`Rank bonus override for ${char.name}`}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {!rankBonusesEnabled && (
                        <p className="text-[10px] text-warning">
                          Guild rank bonuses are disabled. Enable them in loot settings to apply these overrides.
                        </p>
                      )}
                    </div>
                  )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      <div className="pt-2 border-t border-border">
        <p className="text-[11px] text-muted-foreground">
          {members.length} members • {officerCount} officers • {trialCount} trials
        </p>
      </div>

      {ConfirmDialog}
    </div>
  )
}
