import { describe, it, expect } from 'vitest'
import { buildTeamVisibility, type RaidTeamMembership } from '../apply-team-filter'

const TEAM_A = 'team-a'
const TEAM_B = 'team-b'

function m(character_id: string, raid_team_id: string): RaidTeamMembership {
  return { character_id, raid_team_id }
}

describe('buildTeamVisibility', () => {
  it('keeps characters rostered on the active team', () => {
    const isVisible = buildTeamVisibility([m('rostered', TEAM_A)], TEAM_A)
    expect(isVisible('rostered')).toBe(true)
  })

  it('keeps unassigned characters (on no team) — the new-member case from #165', () => {
    // `newbie` has an approved list but was never added to any team.
    const isVisible = buildTeamVisibility([m('veteran', TEAM_A)], TEAM_A)
    expect(isVisible('newbie')).toBe(true)
    expect(isVisible('veteran')).toBe(true)
  })

  it('excludes characters rostered only on a different team', () => {
    const isVisible = buildTeamVisibility(
      [m('alice', TEAM_A), m('bob', TEAM_B)],
      TEAM_A,
    )
    expect(isVisible('alice')).toBe(true)
    expect(isVisible('bob')).toBe(false)
  })

  it('keeps a character on multiple teams when one of them is active', () => {
    const isVisible = buildTeamVisibility(
      [m('flex', TEAM_A), m('flex', TEAM_B)],
      TEAM_A,
    )
    expect(isVisible('flex')).toBe(true)
  })

  it('treats everyone as unassigned (visible) when the guild has no team rosters', () => {
    const isVisible = buildTeamVisibility([], TEAM_A)
    expect(isVisible('anyone')).toBe(true)
  })

  it('excludes a different-team member even if they share no rows with the active team', () => {
    const memberships: RaidTeamMembership[] = [m('bob', TEAM_B)]
    const isVisible = buildTeamVisibility(memberships, TEAM_A)
    // bob is assigned (to B) and not on A -> excluded
    expect(isVisible('bob')).toBe(false)
    // someone with no membership row at all -> unassigned -> visible
    expect(isVisible('ghost')).toBe(true)
  })
})
