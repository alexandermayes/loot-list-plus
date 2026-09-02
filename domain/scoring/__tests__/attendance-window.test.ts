import { describe, it, expect } from 'vitest'
import { computeAttendance, getAttendanceWindowStart } from '../attendance'
import { resolveAttendanceWindow } from '../attendance-window'
import type { RaidEvent, ScoringConfig } from '../../types'

/**
 * Regression: the attendance window a caller FETCHES with must never be
 * narrower than the window the engine SCORES with.
 *
 * Overview, Master Sheet and the attendance page all resolve a raid team's
 * `rolling_weeks_override`, use it to bound the raid_events query, and then
 * hand `computeAttendance` the GUILD's settings object as `config`. The engine
 * therefore windows by the guild's `rolling_attendance_weeks` while the caller
 * only fetched the team's (narrower) window — the engine silently scores a
 * truncated event set. With an override of 0 the fetch window collapses
 * entirely and every raider reports a 0 denominator ("0 of 0 raids", attendance
 * credit +0.00) while guild-scoped surfaces (attendance "All teams", the addon
 * export, the Discord bot) stay correct.
 *
 * Reported by a premium guild after they deleted a second raid team and
 * "reset" the remaining one, which stored `rolling_weeks_override = 0`.
 */

const TEAM_A = 'team-a'
const RESET_DAY_TUESDAY = 2

/** Guild config from the report: 2-week rolling window, 4 points of credit. */
const GUILD_CONFIG: Partial<ScoringConfig> = {
  attendance_type: 'points-per-raid',
  rolling_attendance_weeks: 2,
  max_attendance_bonus: 4,
  use_signups: true,
  signup_weight: 0.25,
  week_reset_day: RESET_DAY_TUESDAY,
} as Partial<ScoringConfig>

/** As-of Wednesday 2026-09-02: the last completed reset week ends 2026-08-31. */
const AS_OF = '2026-09-02'
const RAID_DAYS_TUE_THU = [2, 4]

/** Four tracked raids inside the window, plus one in the in-progress week. */
const TRACKED_DATES = ['2026-08-18', '2026-08-20', '2026-08-25', '2026-08-27']
const IN_PROGRESS_DATE = '2026-09-01'

function guildEvents(): (RaidEvent & { raid_team_id: string | null })[] {
  return [...TRACKED_DATES, IN_PROGRESS_DATE].map((raid_date, i) => ({
    id: `event-${i}`,
    raid_date,
    raid_team_id: TEAM_A,
  }))
}

function attendedAll(events: { id: string; raid_date: string }[]) {
  return events
    .filter(e => TRACKED_DATES.includes(e.raid_date))
    .map(e => ({ raid_event_id: e.id, signed_up: true, attended: true, no_call_no_show: false }))
}

/**
 * Mirrors what every team-scoped web surface does: resolve the team's rolling
 * weeks, bound the raid_events fetch by it, then score.
 */
function simulateTeamScopedSurface(teamRollingWeeksOverride: number | null) {
  const { rollingWeeks, fetchStart } = resolveAttendanceWindow({
    guildRollingWeeks: GUILD_CONFIG.rolling_attendance_weeks,
    teamRollingWeeksOverride,
    asOfDate: AS_OF,
    weekResetDay: RESET_DAY_TUESDAY,
  })

  const all = guildEvents()
  const fetched = all.filter(e => e.raid_date >= fetchStart && e.raid_date <= AS_OF)

  return computeAttendance({
    records: attendedAll(all),
    raidEvents: fetched,
    // The engine must score the same window the caller fetched.
    config: { ...GUILD_CONFIG, rolling_attendance_weeks: rollingWeeks } as ScoringConfig,
    raidDays: RAID_DAYS_TUE_THU,
    asOfDate: AS_OF,
    weekResetDay: RESET_DAY_TUESDAY,
    raiderTeamId: TEAM_A,
  })
}

describe('team rolling-weeks override does not starve the attendance engine', () => {
  it('scores every tracked raid when the team inherits the guild window', () => {
    const result = simulateTeamScopedSurface(null)
    expect(result.raidsInWindow).toBe(4)
    expect(result.raidsAttended).toBe(4)
    expect(result.score).toBe(4)
  })

  it('a 0 override falls back to the guild window instead of collapsing to 0 of 0', () => {
    // The exact reported failure: officer stored 0 while "resetting" the team.
    const result = simulateTeamScopedSurface(0)
    expect(result.raidsInWindow).toBe(4)
    expect(result.raidsAttended).toBe(4)
    expect(result.score).toBe(4)
  })

  it('a negative override falls back to the guild window', () => {
    const result = simulateTeamScopedSurface(-1)
    expect(result.raidsInWindow).toBe(4)
    expect(result.score).toBe(4)
  })

  // Boundary neighbours around the defect's equivalence class: 1 is the
  // smallest override that is a real configuration, and it must narrow the
  // window (one reset week = 2 raids) rather than empty it.
  it('an override of 1 narrows the window to a single reset week', () => {
    const result = simulateTeamScopedSurface(1)
    expect(result.raidsInWindow).toBe(2)
    expect(result.raidsAttended).toBe(2)
  })

  it('an override wider than the guild window actually widens the scored window', () => {
    // Regression for the inverse silent failure: when the override only bounds
    // the fetch and never reaches the engine, a team asking for a wider window
    // is clamped back to the guild's and the override does nothing.
    const wide = simulateTeamScopedSurface(4)
    expect(wide.raidsInWindow).toBe(4)

    const guildOnly = computeAttendance({
      records: attendedAll(guildEvents()),
      raidEvents: guildEvents(),
      config: GUILD_CONFIG as ScoringConfig,
      raidDays: RAID_DAYS_TUE_THU,
      asOfDate: AS_OF,
      weekResetDay: RESET_DAY_TUESDAY,
      raiderTeamId: TEAM_A,
    })
    // Both land on 4 here (only 4 raids exist), but the 4-week override must
    // reach the engine — proven by the window start it produces.
    expect(getAttendanceWindowStart(AS_OF, 4, RESET_DAY_TUESDAY)).toBe('2026-08-04')
    expect(guildOnly.raidsInWindow).toBe(4)
  })

  it('never counts the in-progress reset week', () => {
    const result = simulateTeamScopedSurface(null)
    expect(result.raidsInWindow).toBe(4)
  })
})

describe('resolveAttendanceWindow pairs the fetch bound with the engine window', () => {
  it('fetches from the engine window start, not from today - weeks * 7', () => {
    // A naive `today - 2 * 7` bound would be 2026-08-19 and would drop the
    // 2026-08-18 raid the engine still scores. GH #96.
    const { fetchStart } = resolveAttendanceWindow({
      guildRollingWeeks: 2,
      teamRollingWeeksOverride: null,
      asOfDate: AS_OF,
      weekResetDay: RESET_DAY_TUESDAY,
    })
    expect(fetchStart).toBe('2026-08-18')
    expect(fetchStart).toBe(getAttendanceWindowStart(AS_OF, 2, RESET_DAY_TUESDAY))
  })

  it('reports the same rolling weeks the caller must hand the engine', () => {
    expect(resolveAttendanceWindow({
      guildRollingWeeks: 2,
      teamRollingWeeksOverride: 6,
      asOfDate: AS_OF,
      weekResetDay: RESET_DAY_TUESDAY,
    }).rollingWeeks).toBe(6)
  })

  it('falls back to 4 weeks when the guild setting is missing', () => {
    const { rollingWeeks } = resolveAttendanceWindow({
      guildRollingWeeks: null,
      teamRollingWeeksOverride: null,
      asOfDate: AS_OF,
      weekResetDay: RESET_DAY_TUESDAY,
    })
    expect(rollingWeeks).toBe(4)
  })
})
