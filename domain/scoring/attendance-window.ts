/**
 * Attendance window resolution — pairs the window a caller FETCHES with the
 * window the engine SCORES.
 *
 * Every team-scoped surface (Overview, Master Sheet, attendance page) has to
 * do two things with the same number: bound the `raid_events` query, and tell
 * `computeAttendance` how many rolling weeks to score. Computing those
 * independently is how they drift:
 *
 *   - A team `rolling_weeks_override` narrower than the guild setting bounded
 *     the query but never reached `config.rolling_attendance_weeks`, so the
 *     engine windowed wider than the caller had fetched and silently scored a
 *     truncated event set. At an override of 0 the fetch collapsed entirely
 *     and every raider read "0 of 0 raids" / +0.00 credit, while guild-scoped
 *     surfaces (attendance "All teams", addon export, Discord bot) stayed
 *     correct.
 *   - A naive `today - weeks * 7` lower bound sits LATER than the engine's own
 *     window start (the engine anchors on the last completed reset week), so
 *     it dropped in-window events the engine expected to receive. GH #96.
 *
 * Callers must use BOTH returned values: `fetchStart` for the query and
 * `rollingWeeks` for the engine config.
 */

import { getAttendanceWindowStart } from './attendance'
import { resolveRollingWeeks } from '../raid-team/settings'

export interface AttendanceWindow {
  /**
   * Rolling weeks the engine must score with. Pass as
   * `config.rolling_attendance_weeks` — do not pass the raw guild setting
   * when a team override applied.
   */
  rollingWeeks: number
  /**
   * Earliest `raid_date` to fetch (inclusive). Anchored on the engine's own
   * window start, so it is never later than what the engine will score.
   */
  fetchStart: string
}

export function resolveAttendanceWindow({
  guildRollingWeeks,
  teamRollingWeeksOverride,
  asOfDate,
  weekResetDay,
}: {
  guildRollingWeeks: number | null | undefined
  teamRollingWeeksOverride: number | null | undefined
  asOfDate: string
  weekResetDay?: number | null
}): AttendanceWindow {
  const rollingWeeks = resolveRollingWeeks(guildRollingWeeks || 4, teamRollingWeeksOverride)
  return {
    rollingWeeks,
    fetchStart: getAttendanceWindowStart(asOfDate, rollingWeeks, weekResetDay),
  }
}
