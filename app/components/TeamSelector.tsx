'use client'

import { Select } from '@/components/ui/select'
import type { RaidTeam } from '@/domain/raid-team/types'

interface TeamSelectorProps {
  teams: RaidTeam[]
  activeTeamId: string | null
  onTeamChange: (teamId: string | null) => void
  className?: string
}

/**
 * Dropdown for selecting a raid team on pages that support team filtering.
 * Only rendered for Pro guilds with at least one team.
 *
 * Shows "All teams" as the default (null) option.
 */
export function TeamSelector({ teams, activeTeamId, onTeamChange, className }: TeamSelectorProps) {
  if (teams.length === 0) return null

  return (
    <Select
      variant="rounded"
      value={activeTeamId || ''}
      onChange={(e) => onTeamChange(e.target.value || null)}
      className={className}
    >
      <option value="">All teams</option>
      {teams.map(team => (
        <option key={team.id} value={team.id}>
          {team.name}
        </option>
      ))}
    </Select>
  )
}
