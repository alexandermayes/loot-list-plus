/**
 * Schedule history tracking for raid teams.
 *
 * Records timestamped snapshots of which raid days were active,
 * so that event generation only creates events for days that
 * were actually scheduled at the time. Prevents backfill penalties
 * when teams add or remove raid days mid-tier.
 */

import type { ScheduleHistoryEntry } from './types'

/** Parse YYYY-MM-DD as local date (same as utils/date parseDate) */
function parseLocalDate(dateString: string): Date {
  const [y, m, d] = dateString.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Append a new schedule entry. Returns a new array (does not mutate).
 *
 * - If existing is null, creates a single-entry array.
 * - If the latest entry has the same effective_from, replaces it
 *   (handles officers making multiple edits on the same day).
 * - Otherwise appends and maintains ASC sort.
 */
export function appendScheduleEntry(
  existing: ScheduleHistoryEntry[] | null,
  newDays: number[],
  effectiveDate: string
): ScheduleHistoryEntry[] {
  const entry: ScheduleHistoryEntry = {
    days: [...newDays].sort((a, b) => a - b),
    effective_from: effectiveDate,
  }

  if (!existing || existing.length === 0) {
    return [entry]
  }

  const copy = [...existing]
  const last = copy[copy.length - 1]

  if (last.effective_from === effectiveDate) {
    // Replace same-day entry
    copy[copy.length - 1] = entry
  } else {
    copy.push(entry)
  }

  // Ensure ASC sort (should already be, but defensive)
  copy.sort((a, b) => a.effective_from.localeCompare(b.effective_from))

  return copy
}

/**
 * Check if a specific date should have a raid event based on schedule history.
 *
 * - If no history exists, falls back to currentRaidDays (backward compat).
 * - If the date is before all history entries, returns false (schedule hadn't started).
 * - Otherwise finds the active schedule entry for that date and checks membership.
 */
export function isDateScheduled(
  dateString: string,
  dayOfWeek: number,
  currentRaidDays: number[],
  scheduleHistory: ScheduleHistoryEntry[] | null
): boolean {
  // Backward compat: no history means treat current schedule as always-active
  if (!scheduleHistory || scheduleHistory.length === 0) {
    return currentRaidDays.includes(dayOfWeek)
  }

  // Find the latest entry where effective_from <= dateString
  // History is sorted ASC by effective_from
  let activeEntry: ScheduleHistoryEntry | null = null
  for (let i = scheduleHistory.length - 1; i >= 0; i--) {
    if (scheduleHistory[i].effective_from <= dateString) {
      activeEntry = scheduleHistory[i]
      break
    }
  }

  // Date is before any schedule entry — schedule hadn't started
  if (!activeEntry) {
    return false
  }

  return activeEntry.days.includes(dayOfWeek)
}

/**
 * Filter a list of date strings to only those that were scheduled
 * according to the schedule history.
 *
 * Convenience wrapper over isDateScheduled for bulk filtering.
 */
export function filterDatesByScheduleHistory(
  dates: string[],
  currentRaidDays: number[],
  scheduleHistory: ScheduleHistoryEntry[] | null
): string[] {
  return dates.filter(dateString => {
    const date = parseLocalDate(dateString)
    return isDateScheduled(dateString, date.getDay(), currentRaidDays, scheduleHistory)
  })
}
