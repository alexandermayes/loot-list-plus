/**
 * Schedule-mismatch detection (GH #119).
 *
 * Finds raid events that the attendance engine silently drops because they
 * fall outside the scored schedule. A guild can be perfectly configured on
 * bonuses yet pointed at the wrong raid days; the engine then quietly ignores
 * those raids, so missing them never hurts anyone's attendance and nobody gets
 * a signal.
 *
 * This MUST mirror what the engine actually scores, or it cries wolf. It uses
 * the same `isDateScheduled` (schedule-history aware) check the engine path
 * relies on, and expects `raidDays` resolved the same way the engine resolves
 * them (`resolveRaidDays(guildSettings, team override)`). That makes it correct
 * for the two setups a naive `configuredRaidDays.includes(dow)` gets wrong:
 *   1. Teams with `raid_days_override` — those raids count; don't flag them.
 *   2. Mid-window schedule changes (`schedule_history`) — old-schedule raids
 *      still count for their period; don't flag them.
 */

import { isDateScheduled } from './schedule-history'
import type { ScheduleHistoryEntry } from './types'

/** Minimal event shape needed for detection. */
export interface ScheduleMismatchEvent {
  id: string
  raid_date: string
  is_bonus?: boolean | null
  is_skipped?: boolean | null
}

export interface ScheduleMismatchResult {
  /** In-window, non-bonus, non-skipped events the engine drops as off-schedule. */
  offScheduleEvents: ScheduleMismatchEvent[]
  /** Distinct day-of-week numbers (0=Sun..6=Sat) those events fall on, ascending. */
  unscheduledDays: number[]
}

/** Parse YYYY-MM-DD as a local date (mirrors utils/date + schedule-history). */
function parseLocalDate(dateString: string): Date {
  const [y, m, d] = dateString.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Detect raid events that fall outside the scored schedule.
 *
 * Caller responsibilities (kept here so the function stays pure and
 * engine-faithful):
 *  - `eventsInWindow`: events already scoped to the rolling attendance window.
 *    Out-of-window events aren't scored, so warning about them is noise.
 *  - `raidDays`: resolved exactly as the engine resolves them — i.e.
 *    `resolveRaidDays(guildSettings, activeTeam?.raid_days_override)`.
 *  - `scheduleHistory`: the active team's `schedule_history` (null for the
 *    guild-level / no-team case, which falls back to flat current days).
 *
 * Returns an empty result when no raid days are configured — the engine
 * applies no day filter in that case, so nothing is dropped.
 */
export function detectScheduleMismatch(
  eventsInWindow: ScheduleMismatchEvent[],
  raidDays: number[],
  scheduleHistory: ScheduleHistoryEntry[] | null,
): ScheduleMismatchResult {
  if (raidDays.length === 0) {
    return { offScheduleEvents: [], unscheduledDays: [] }
  }

  const offScheduleEvents = eventsInWindow.filter(event => {
    // Bonus events are explicitly off-schedule raids the officer created; the
    // engine trusts them. Skipped events aren't scored at all. Both are excluded.
    if (event.is_bonus || event.is_skipped) return false
    const dow = parseLocalDate(event.raid_date).getDay()
    return !isDateScheduled(event.raid_date, dow, raidDays, scheduleHistory)
  })

  const unscheduledDays = [
    ...new Set(offScheduleEvents.map(e => parseLocalDate(e.raid_date).getDay())),
  ].sort((a, b) => a - b)

  return { offScheduleEvents, unscheduledDays }
}
