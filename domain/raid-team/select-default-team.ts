/**
 * Default team selection and All-teams persistence.
 *
 * In a guild that has raid teams, the ensure route refuses to create
 * unassigned events (commit 3606607). An officer left on "All teams" by
 * default therefore never gets the current week's raid days created at all,
 * even though nothing in the UI told them a team was required (GH-267 Path B).
 * This module resolves which team an officer lands on, and distinguishes a
 * deliberate All-teams choice from having never chosen at all.
 */

import type { RaidTeam } from './types'

/**
 * Persisted marker for a deliberate All-teams choice. An absent localStorage
 * record has to keep meaning "never chose" so auto-selection is safe to
 * apply; without a distinct sentinel, clearing the stored team id to persist
 * "All teams" would be indistinguishable from no record existing at all. No
 * team id can collide with this value because team ids are UUIDs.
 */
export const ALL_TEAMS_SENTINEL = 'all'

/**
 * Pick the team an officer lands on when none has been explicitly chosen:
 * the team marked `is_default`, else the first team in display order, else
 * null when there are no teams.
 */
export function pickDefaultTeam(teams: RaidTeam[]): RaidTeam | null {
  return teams.find((t) => t.is_default) ?? teams[0] ?? null
}

/**
 * Resolve which team id (if any) the officer is viewing, in priority order:
 * an explicit URL param (including a URL All-teams sentinel, which yields
 * null), then a stored choice (including a stored All-teams choice, which
 * also yields null), then the guild's default team when the guild has teams
 * and the officer has never chosen, then null.
 */
export function resolveTeamSelection(input: {
  urlParam: string | null | undefined
  stored: string | null | undefined
  teams: RaidTeam[]
}): string | null {
  const { urlParam, stored, teams } = input

  if (urlParam) {
    return urlParam === ALL_TEAMS_SENTINEL ? null : urlParam
  }

  if (teams.length === 0) return null

  if (stored === ALL_TEAMS_SENTINEL) return null
  if (stored && teams.some((t) => t.id === stored)) return stored

  return pickDefaultTeam(teams)?.id ?? null
}
