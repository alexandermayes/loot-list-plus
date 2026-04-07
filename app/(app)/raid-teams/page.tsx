'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useGuildContext } from '@/app/contexts/GuildContext'
import { useNotification } from '@/app/contexts/NotificationContext'
import { hasFeature } from '@/domain/guild/feature-flags'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Heading, Text, LabelText } from '@/components/ui/typography'
import { Modal, ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeletons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, PencilEdit01Icon, UserAdd01Icon, Calendar01Icon, StarIcon, UserMultipleIcon } from '@hugeicons/core-free-icons'
import type { RaidTeam, RaidDaysOverride } from '@/domain/raid-team/types'
import { trackClientEvent } from '@/utils/analytics/client'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface GuildMemberCharacter {
  id: string
  name: string
  class: { name: string; color_hex: string } | null
}

interface TeamMember {
  id: string
  character_id: string
  role: string
  character: GuildMemberCharacter | null
}

export default function RaidTeamsPage() {
  const { activeGuild, isOfficer, loading: guildLoading } = useGuildContext()
  const { showNotification } = useNotification()
  const router = useRouter()

  const [teams, setTeams] = useState<RaidTeam[]>([])
  const [teamMembers, setTeamMembers] = useState<Record<string, TeamMember[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Create team modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')

  // Edit team modal
  const [editingTeam, setEditingTeam] = useState<RaidTeam | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editRollingWeeks, setEditRollingWeeks] = useState('')
  const [editRaidDaysPerWeek, setEditRaidDaysPerWeek] = useState('')
  const [editRaidDays, setEditRaidDays] = useState<(string)[]>(['', '', '', '', ''])

  // Add members modal
  const [addingToTeam, setAddingToTeam] = useState<RaidTeam | null>(null)
  const [allGuildMembers, setAllGuildMembers] = useState<GuildMemberCharacter[]>([])
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<string>>(new Set())
  const [membersLoading, setMembersLoading] = useState(false)

  // Delete confirmation
  const [deletingTeam, setDeletingTeam] = useState<RaidTeam | null>(null)

  // Assign events
  const [assigningEvents, setAssigningEvents] = useState<string | null>(null)
  const [reassignModal, setReassignModal] = useState<RaidTeam | null>(null)
  const [reassignDays, setReassignDays] = useState<Set<number>>(new Set())

  useEffect(() => {
    document.title = 'LootList+ \u2022 Raid Teams'
    if (activeGuild?.id) trackClientEvent('raid_teams_page_viewed', { guild_id: activeGuild.id })
  }, [activeGuild?.id])

  // Redirect non-officers or non-Pro guilds
  useEffect(() => {
    if (!guildLoading && (!isOfficer || !hasFeature(activeGuild, 'raid_teams'))) {
      router.push('/overview')
    }
  }, [guildLoading, isOfficer, activeGuild, router])

  // Load teams
  const loadTeams = useCallback(async () => {
    if (!activeGuild?.id) return
    setLoading(true)

    try {
      const res = await fetch(`/api/raid-teams?guild_id=${activeGuild.id}`)
      const data = await res.json()
      if (data.teams) {
        setTeams(data.teams)
        // Load members for each team
        const membersMap: Record<string, TeamMember[]> = {}
        await Promise.all(data.teams.map(async (team: RaidTeam) => {
          const membersRes = await fetch(`/api/raid-teams/${team.id}/members`)
          const membersData = await membersRes.json()
          membersMap[team.id] = membersData.members || []
        }))
        setTeamMembers(membersMap)
      }
    } catch {
      showNotification('error', "Couldn't load raid teams")
    } finally {
      setLoading(false)
    }
  }, [activeGuild?.id, showNotification])

  useEffect(() => { loadTeams() }, [loadTeams])

  // Create team
  const handleCreateTeam = async () => {
    if (!activeGuild?.id || !newTeamName.trim()) return
    setSaving(true)

    try {
      const res = await fetch('/api/raid-teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guild_id: activeGuild.id, name: newTeamName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        showNotification('error', data.error || 'Failed to create team')
        return
      }
      showNotification('success', `Team "${data.team.name}" created`)
      setShowCreateModal(false)
      setNewTeamName('')
      loadTeams()
    } catch {
      showNotification('error', 'Failed to create team')
    } finally {
      setSaving(false)
    }
  }

  // Update team
  const handleUpdateTeam = async () => {
    if (!editingTeam || !editName.trim()) return
    setSaving(true)

    // Build raid_days_override (only include non-empty fields)
    const dayFields = ['first_raid_day', 'second_raid_day', 'third_raid_day', 'fourth_raid_day', 'fifth_raid_day'] as const
    const raidDaysOverride: RaidDaysOverride = {}
    if (editRaidDaysPerWeek !== '') raidDaysOverride.raid_days_per_week = Number(editRaidDaysPerWeek)
    dayFields.forEach((field, i) => {
      if (editRaidDays[i] !== '') raidDaysOverride[field] = Number(editRaidDays[i])
    })
    const hasOverrides = Object.keys(raidDaysOverride).length > 0

    try {
      const res = await fetch(`/api/raid-teams/${editingTeam.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          color_hex: editColor,
          rolling_weeks_override: editRollingWeeks !== '' ? Number(editRollingWeeks) : null,
          raid_days_override: hasOverrides ? raidDaysOverride : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        showNotification('error', data.error || 'Failed to update team')
        return
      }
      showNotification('success', 'Team updated')
      setEditingTeam(null)
      loadTeams()
    } catch {
      showNotification('error', 'Failed to update team')
    } finally {
      setSaving(false)
    }
  }

  // Delete team
  const handleDeleteTeam = async () => {
    if (!deletingTeam) return
    setSaving(true)

    try {
      const res = await fetch(`/api/raid-teams/${deletingTeam.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        showNotification('error', data.error || 'Failed to delete team')
        return
      }
      showNotification('success', `Team "${deletingTeam.name}" deleted`)
      setDeletingTeam(null)
      loadTeams()
    } catch {
      showNotification('error', 'Failed to delete team')
    } finally {
      setSaving(false)
    }
  }

  // Open edit modal with current team values
  const openEditTeam = (team: RaidTeam) => {
    setEditingTeam(team)
    setEditName(team.name)
    setEditColor(team.color_hex)
    setEditRollingWeeks(team.rolling_weeks_override != null ? String(team.rolling_weeks_override) : '')
    const override = team.raid_days_override
    setEditRaidDaysPerWeek(override?.raid_days_per_week != null ? String(override.raid_days_per_week) : '')
    setEditRaidDays([
      override?.first_raid_day != null ? String(override.first_raid_day) : '',
      override?.second_raid_day != null ? String(override.second_raid_day) : '',
      override?.third_raid_day != null ? String(override.third_raid_day) : '',
      override?.fourth_raid_day != null ? String(override.fourth_raid_day) : '',
      override?.fifth_raid_day != null ? String(override.fifth_raid_day) : '',
    ])
  }

  // Set default team
  const handleSetDefault = async (team: RaidTeam) => {
    if (team.is_default) return
    setSaving(true)

    try {
      const res = await fetch(`/api/raid-teams/${team.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      })
      if (!res.ok) {
        const data = await res.json()
        showNotification('error', data.error || 'Failed to set default')
        return
      }
      showNotification('success', `${team.name} is now the default team`)
      loadTeams()
    } catch {
      showNotification('error', 'Failed to set default')
    } finally {
      setSaving(false)
    }
  }

  // Assign raid events to a team
  const handleAssignEvents = async (targetTeam: RaidTeam, source: 'unassigned' | string) => {
    setAssigningEvents(targetTeam.id)
    try {
      const baseBody = source === 'unassigned'
        ? { mode: 'all_unassigned' as const }
        : { mode: 'from_team' as const, from_team_id: source }
      const body = reassignDays.size > 0
        ? { ...baseBody, days: Array.from(reassignDays) }
        : baseBody

      const res = await fetch(`/api/raid-teams/${targetTeam.id}/assign-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        showNotification('error', data.error || 'Failed to assign events')
        return
      }
      const sourceLabel = source === 'unassigned'
        ? 'unassigned'
        : teams.find(t => t.id === source)?.name || 'other team'
      if (data.assigned === 0) {
        showNotification('info', `No events to move from ${sourceLabel}`)
      } else {
        showNotification('success', `${data.assigned} events moved to ${targetTeam.name}`)
      }
      setReassignModal(null)
    } catch {
      showNotification('error', 'Failed to assign events')
    } finally {
      setAssigningEvents(null)
    }
  }

  // Load guild members for add-member modal
  const openAddMembers = async (team: RaidTeam) => {
    setAddingToTeam(team)
    setSelectedCharacterIds(new Set())
    setMembersLoading(true)

    try {
      const res = await fetch(`/api/guild-members?guild_id=${activeGuild?.id}`)
      const data = await res.json()
      if (data.members) {
        const chars: GuildMemberCharacter[] = []
        for (const member of data.members) {
          for (const char of member.characters || []) {
            chars.push({
              id: char.id,
              name: char.name,
              class: char.class || null,
            })
          }
        }
        // Sort alphabetically
        chars.sort((a, b) => a.name.localeCompare(b.name))
        setAllGuildMembers(chars)

        // Pre-select characters already on this team
        const existingIds = new Set((teamMembers[team.id] || []).map(m => m.character_id))
        setSelectedCharacterIds(existingIds)
      }
    } catch {
      showNotification('error', "Couldn't load guild members")
    } finally {
      setMembersLoading(false)
    }
  }

  // Save member assignments
  const handleSaveMembers = async () => {
    if (!addingToTeam) return
    setSaving(true)

    const existingIds = new Set((teamMembers[addingToTeam.id] || []).map(m => m.character_id))
    const toAdd = [...selectedCharacterIds].filter(id => !existingIds.has(id))
    const toRemove = [...existingIds].filter(id => !selectedCharacterIds.has(id))

    try {
      const promises: Promise<Response>[] = []

      if (toAdd.length > 0) {
        promises.push(fetch(`/api/raid-teams/${addingToTeam.id}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ character_ids: toAdd }),
        }))
      }

      if (toRemove.length > 0) {
        promises.push(fetch(`/api/raid-teams/${addingToTeam.id}/members`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ character_ids: toRemove }),
        }))
      }

      await Promise.all(promises)
      showNotification('success', `Roster updated for ${addingToTeam.name}`)
      setAddingToTeam(null)
      loadTeams()
    } catch {
      showNotification('error', 'Failed to update roster')
    } finally {
      setSaving(false)
    }
  }

  const toggleCharacter = (charId: string) => {
    setSelectedCharacterIds(prev => {
      const next = new Set(prev)
      if (next.has(charId)) next.delete(charId)
      else next.add(charId)
      return next
    })
  }

  const selectAll = () => setSelectedCharacterIds(new Set(allGuildMembers.map(c => c.id)))
  const selectNone = () => setSelectedCharacterIds(new Set())

  if (guildLoading || loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="space-y-3">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Heading level={1}>Raid Teams</Heading>
          <Text color="muted" className="mt-1">Create and manage raid teams, assign roster members</Text>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          Create team
        </Button>
      </div>

      {/* Team list */}
      {teams.length === 0 ? (
        <EmptyState
          icon={UserMultipleIcon}
          title="No raid teams yet"
          description="Create your first team and assign guild members to it."
          size="default"
          variant="card"
          action={{ label: 'Create team', onClick: () => setShowCreateModal(true), variant: 'primary' }}
        />
      ) : (
        <div className="space-y-4">
          {teams.map(team => {
            const members = teamMembers[team.id] || []
            return (
              <div key={team.id} className="bg-background-elevated border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: team.color_hex }} />
                    <Text size="md" className="font-semibold">{team.name}</Text>
                    <Text size="sm" color="muted">{members.length} members</Text>
                    {team.is_default && (
                      <Badge variant="secondary" className="text-accent bg-accent/10 border-accent/20">Default</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!team.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(team)}
                        title="Set as default team"
                      >
                        <HugeiconsIcon icon={StarIcon} size={16} />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReassignModal(team)}
                    >
                      <HugeiconsIcon icon={Calendar01Icon} size={16} />
                      <span className="hidden sm:inline">Events</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openAddMembers(team)}
                    >
                      <HugeiconsIcon icon={UserAdd01Icon} size={16} />
                      <span className="hidden sm:inline">Members</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditTeam(team)}
                    >
                      <HugeiconsIcon icon={PencilEdit01Icon} size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingTeam(team)}
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={16} className="text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Member list */}
                {members.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {members.map(member => (
                      <Text
                        key={member.id}
                        size="base"
                        className="font-medium px-2 py-0.5 rounded-md bg-background-subtle"
                        style={{ color: member.character?.class?.color_hex || '#ffffff' }}
                      >
                        {member.character?.name || 'Unknown'}
                      </Text>
                    ))}
                  </div>
                ) : (
                  <Text size="base" color="muted">No members assigned yet</Text>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Create Team Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} size="sm">
        <ModalHeader onClose={() => setShowCreateModal(false)}>
          <ModalTitle>Create raid team</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Input
            placeholder="Team name"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTeam() }}
            autoFocus
          />
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
          <Button variant="primary" onClick={handleCreateTeam} loading={saving} disabled={!newTeamName.trim()}>
            Create team
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Team Modal */}
      <Modal open={!!editingTeam} onClose={() => setEditingTeam(null)} size="default">
        <ModalHeader onClose={() => setEditingTeam(null)}>
          <ModalTitle>Edit team</ModalTitle>
          <ModalDescription>Configure team name, color, and optional schedule overrides</ModalDescription>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-5">
            {/* Name + Color */}
            <div className="grid grid-cols-[1fr,auto] gap-4">
              <div>
                <LabelText size="xs">Name</LabelText>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateTeam() }}
                  className="mt-1.5"
                />
              </div>
              <div>
                <LabelText size="xs">Color</LabelText>
                <div className="flex items-center gap-2 mt-1.5">
                  <label className="relative w-10 h-10 rounded-lg border border-border cursor-pointer overflow-hidden hover:border-foreground/30 transition-colors">
                    <input
                      type="color"
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                    />
                    <div className="w-full h-full rounded-lg" style={{ backgroundColor: editColor }} />
                  </label>
                </div>
              </div>
            </div>

            {/* Schedule Overrides */}
            <div className="border-t border-border pt-4">
              <LabelText size="xs">Schedule overrides</LabelText>
              <Text size="sm" color="muted" className="mt-0.5 mb-3">
                Leave empty to inherit from guild settings
              </Text>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label size="sm" className="mb-1.5 block">Rolling weeks</Label>
                  <Input
                    type="number"
                    min={0}
                    max={52}
                    placeholder="Guild default"
                    value={editRollingWeeks}
                    onChange={(e) => setEditRollingWeeks(e.target.value)}
                  />
                </div>
                <div>
                  <Label size="sm" className="mb-1.5 block">Raid days/week</Label>
                  <Input
                    type="number"
                    min={0}
                    max={5}
                    placeholder="Guild default"
                    value={editRaidDaysPerWeek}
                    onChange={(e) => setEditRaidDaysPerWeek(e.target.value)}
                  />
                </div>
              </div>

              {/* Individual raid day selects */}
              {Number(editRaidDaysPerWeek || 0) > 0 && (
                <div className="mt-3 space-y-2">
                  {Array.from({ length: Number(editRaidDaysPerWeek) }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Label size="sm" className="w-20 shrink-0">
                        Day {i + 1}
                      </Label>
                      <Select
                        variant="rounded"
                        size="sm"
                        value={editRaidDays[i] || ''}
                        onChange={(e) => {
                          const next = [...editRaidDays]
                          next[i] = e.target.value
                          setEditRaidDays(next)
                        }}
                      >
                        <option value="">Inherit</option>
                        {DAY_NAMES.map((name, dayIdx) => (
                          <option key={dayIdx} value={String(dayIdx)}>{name}</option>
                        ))}
                      </Select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setEditingTeam(null)}>Cancel</Button>
          <Button variant="primary" onClick={handleUpdateTeam} loading={saving} disabled={!editName.trim()}>
            Save changes
          </Button>
        </ModalFooter>
      </Modal>

      {/* Add Members Modal */}
      <Modal open={!!addingToTeam} onClose={() => setAddingToTeam(null)} size="default">
        <ModalHeader onClose={() => setAddingToTeam(null)}>
          <ModalTitle>Manage roster: {addingToTeam?.name}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          {membersLoading ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Button variant="ghost" size="sm" onClick={selectAll}>Select all</Button>
                <Button variant="ghost" size="sm" onClick={selectNone}>Clear</Button>
                <Text size="sm" color="muted" className="ml-auto">
                  {selectedCharacterIds.size} selected
                </Text>
              </div>
              <div className="max-h-80 overflow-y-auto space-y-1">
                {allGuildMembers.map(char => (
                  <div
                    key={char.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted cursor-pointer"
                    onClick={() => toggleCharacter(char.id)}
                  >
                    <Checkbox
                      checked={selectedCharacterIds.has(char.id)}
                      onCheckedChange={() => toggleCharacter(char.id)}
                      variant="accent"
                      size="sm"
                    />
                    <Text
                      size="base"
                      className="font-medium"
                      style={{ color: char.class?.color_hex || '#ffffff' }}
                    >
                      {char.name}
                    </Text>
                    {char.class && (
                      <Text size="xs" color="muted">{char.class.name}</Text>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setAddingToTeam(null)}>Cancel</Button>
          <Button variant="primary" onClick={handleSaveMembers} loading={saving}>
            Save roster
          </Button>
        </ModalFooter>
      </Modal>

      {/* Reassign Events Modal */}
      <Modal open={!!reassignModal} onClose={() => { setReassignModal(null); setReassignDays(new Set()) }} size="sm">
        <ModalHeader onClose={() => { setReassignModal(null); setReassignDays(new Set()) }}>
          <ModalTitle>Assign events to {reassignModal?.name}</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Text color="secondary" className="mb-4">
            Move raid events to this team. Attendance and loot history move with the events.
          </Text>

          {/* Day filter */}
          <div className="mb-4">
            <Text size="sm" className="font-medium mb-2">Filter by day (optional)</Text>
            <div className="flex flex-wrap gap-2">
              {DAY_NAMES.map((name, idx) => {
                const active = reassignDays.has(idx)
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReassignDays(prev => {
                      const next = new Set(prev)
                      if (next.has(idx)) next.delete(idx)
                      else next.add(idx)
                      return next
                    })}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                      active
                        ? 'bg-accent/20 text-accent border-accent/40'
                        : 'bg-background-subtle text-muted-foreground border-border hover:bg-muted'
                    }`}
                  >
                    {name.slice(0, 3)}
                  </button>
                )
              })}
            </div>
            {reassignDays.size > 0 && (
              <Text size="xs" color="muted" className="mt-1.5">
                Only {Array.from(reassignDays).map(d => DAY_NAMES[d]).join(', ')} events will be moved
              </Text>
            )}
          </div>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => reassignModal && handleAssignEvents(reassignModal, 'unassigned')}
              loading={assigningEvents === reassignModal?.id}
            >
              Move {reassignDays.size > 0 ? 'filtered' : 'all'} unassigned events
            </Button>
            {teams.filter(t => t.id !== reassignModal?.id).map(otherTeam => (
              <Button
                key={otherTeam.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => reassignModal && handleAssignEvents(reassignModal, otherTeam.id)}
                loading={assigningEvents === reassignModal?.id}
              >
                Move {reassignDays.size > 0 ? 'filtered' : 'all'} events from {otherTeam.name}
              </Button>
            ))}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => { setReassignModal(null); setReassignDays(new Set()) }}>Close</Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!deletingTeam} onClose={() => setDeletingTeam(null)} size="sm">
        <ModalHeader onClose={() => setDeletingTeam(null)}>
          <ModalTitle>Delete team?</ModalTitle>
        </ModalHeader>
        <ModalBody>
          <Text color="secondary">
            Raid events assigned to <strong>{deletingTeam?.name}</strong> will become unassigned. Attendance records are not affected.
          </Text>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setDeletingTeam(null)}>Keep team</Button>
          <Button variant="destructive" onClick={handleDeleteTeam} loading={saving}>
            Delete team
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
