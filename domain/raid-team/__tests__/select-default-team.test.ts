import { describe, it, expect } from 'vitest'
import { pickDefaultTeam, resolveTeamSelection, ALL_TEAMS_SENTINEL } from '../select-default-team'
import type { RaidTeam } from '../types'

function team(overrides: Partial<RaidTeam> = {}): RaidTeam {
  return {
    id: 'team-1',
    guild_id: 'guild-1',
    name: 'Team A',
    color_hex: '#ff0000',
    is_default: false,
    sort_order: 0,
    raid_days_override: null,
    rolling_weeks_override: null,
    schedule_history: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

// ─── pickDefaultTeam ────────────────────────────────────────

describe('pickDefaultTeam', () => {
  it('returns the team whose is_default is true, even when it is not first in the array', () => {
    const teamA = team({ id: 'a', is_default: false })
    const teamB = team({ id: 'b', is_default: true })
    expect(pickDefaultTeam([teamA, teamB])).toBe(teamB)
  })

  it('returns the first team when no team is marked default, since teams already load in display order', () => {
    const teamA = team({ id: 'a', is_default: false })
    const teamB = team({ id: 'b', is_default: false })
    expect(pickDefaultTeam([teamA, teamB])).toBe(teamA)
  })

  it('returns null for an empty array', () => {
    expect(pickDefaultTeam([])).toBeNull()
  })
})

// ─── resolveTeamSelection ───────────────────────────────────

describe('resolveTeamSelection', () => {
  it('returns the URL param when one is present, ahead of both a stored id and the default team', () => {
    const teamA = team({ id: 'a', is_default: true })
    const teamB = team({ id: 'b' })
    expect(
      resolveTeamSelection({ urlParam: 'b', stored: 'a', teams: [teamA, teamB] })
    ).toBe('b')
  })

  it('returns null when the URL param is the all-teams sentinel', () => {
    const teamA = team({ id: 'a', is_default: true })
    expect(
      resolveTeamSelection({ urlParam: ALL_TEAMS_SENTINEL, stored: 'a', teams: [teamA] })
    ).toBeNull()
  })

  it('returns null when the stored value is the all-teams sentinel, even though teams exist, because that records a deliberate choice', () => {
    const teamA = team({ id: 'a', is_default: true })
    expect(
      resolveTeamSelection({ urlParam: null, stored: ALL_TEAMS_SENTINEL, teams: [teamA] })
    ).toBeNull()
  })

  it('returns the stored id when it matches a team that still exists', () => {
    const teamA = team({ id: 'a', is_default: true })
    const teamB = team({ id: 'b' })
    expect(
      resolveTeamSelection({ urlParam: null, stored: 'b', teams: [teamA, teamB] })
    ).toBe('b')
  })

  it('returns the default team id when there is no stored record at all and teams exist', () => {
    const teamA = team({ id: 'a', is_default: false })
    const teamB = team({ id: 'b', is_default: true })
    expect(
      resolveTeamSelection({ urlParam: null, stored: null, teams: [teamA, teamB] })
    ).toBe('b')
  })

  it('returns the first team id when there is no stored record and no team is marked default', () => {
    const teamA = team({ id: 'a', is_default: false })
    const teamB = team({ id: 'b', is_default: false })
    expect(
      resolveTeamSelection({ urlParam: undefined, stored: undefined, teams: [teamA, teamB] })
    ).toBe('a')
  })

  it('returns the default team id when the stored id names a team that no longer exists, so a deleted team does not strand the officer on All teams', () => {
    const teamA = team({ id: 'a', is_default: true })
    expect(
      resolveTeamSelection({ urlParam: null, stored: 'deleted-team', teams: [teamA] })
    ).toBe('a')
  })

  it('returns null when there are no teams, whatever the stored value', () => {
    expect(
      resolveTeamSelection({ urlParam: null, stored: 'anything', teams: [] })
    ).toBeNull()
  })
})
