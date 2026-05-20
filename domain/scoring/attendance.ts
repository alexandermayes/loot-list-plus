/**
 * Attendance Engine — centralized attendance computation.
 *
 * Owns rolling window calculation, raid-day filtering, date deduplication,
 * new member mode, and attendance scoring. Replaces ~100 lines of logic
 * duplicated across master-sheet, overview, and attendance pages.
 *
 * Matches the master-sheet implementation (canonical source):
 * - app/(app)/master-sheet/page.tsx lines 248-441
 *
 * Known divergence from overview page:
 * - Master sheet checks for retroactive attendance imports (attendance
 *   records before join date) and adjusts effective start date accordingly.
 *   Overview page does not. This engine matches master sheet behavior.
 *
 * Pure function. No I/O. Takes pre-fetched data, returns computed result.
 */

import type {
  AttendanceInput,
  AttendanceResult,
  AttendanceRecord,
  AttendanceStatus,
  RaidEvent,
  ScoringConfig,
} from '../types'
import { calculateAttendanceScore } from './attendance-score'
import { withDefaults } from './defaults'

// ─── Date helpers (timezone-safe, mirrors utils/date.ts) ────

function parseDateLocal(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// ─── resolveStatus ──────────────────────────────────────────

/**
 * Resolve attendance status from the `status` column (preferred) or
 * legacy boolean flags (fallback during dual-write transition).
 *
 * Single source of truth — replaces 3+ inline implementations.
 *
 * Boolean priority order (first match wins):
 *   no_call_no_show > is_excused > was_benched > (attended && was_late) > attended > signed_up > absent
 */
export function resolveStatus(record: {
  status?: string | null
  attended?: boolean
  was_late?: boolean
  was_benched?: boolean
  no_call_no_show?: boolean
  signed_up?: boolean
  is_excused?: boolean
}): AttendanceStatus {
  // Prefer pre-computed status column if present and valid
  const validStatuses: AttendanceStatus[] = ['attended', 'late', 'benched', 'no_show', 'excused', 'signed_up', 'absent']
  if (record.status && validStatuses.includes(record.status as AttendanceStatus)) {
    return record.status as AttendanceStatus
  }

  // Fallback: resolve from boolean flags
  if (record.no_call_no_show) return 'no_show'
  if (record.is_excused) return 'excused'
  if (record.was_benched) return 'benched'
  if (record.attended && record.was_late) return 'late'
  if (record.attended) return 'attended'
  if (record.signed_up) return 'signed_up'
  return 'absent'
}

// ─── computeAttendance ──────────────────────────────────────

/**
 * Compute attendance score from raw events + records.
 *
 * Pipeline:
 * 1. Apply rolling window (rolling_attendance_weeks * 7 days)
 * 2. Filter by configured raid days
 * 3. Apply new member effective start date (fair/minimum_gate)
 *    - Includes retroactive attendance check (earliest attended raid
 *      can push start date earlier than join date, matching master sheet)
 * 4. Deduplicate by date (prefer events with attendance records)
 * 5. Score using calculateAttendanceScore (3 modes)
 * 6. Check eligibility (minimum_gate mode)
 */
export function computeAttendance(input: AttendanceInput): AttendanceResult {
  const config = withDefaults(input.config)
  const newMemberMode = input.newMemberMode || 'raw'

  // 1. Rolling window
  const asOf = input.asOfDate ? parseDateLocal(input.asOfDate) : new Date()
  let windowStart = new Date(asOf)
  windowStart.setDate(windowStart.getDate() - config.rolling_attendance_weeks * 7)
  // Clamp to expansion's raid start date so pre-expansion events (e.g., blanks
  // auto-created by /api/raid-events/ensure before the expansion launched)
  // don't inflate the denominator.
  if (input.raidStartDate) {
    const startDate = parseDateLocal(input.raidStartDate)
    if (startDate > windowStart) windowStart = startDate
  }
  const windowStartStr = formatDate(windowStart)
  const asOfStr = formatDate(asOf)

  // Filter events to window
  let eventsInWindow = input.raidEvents.filter(e =>
    e.raid_date >= windowStartStr && e.raid_date <= asOfStr
  )

  // 2. Raid-day filter (bonus events bypass it: officers explicitly
  // created them, so we trust them regardless of day-of-week)
  if (input.raidDays.length > 0) {
    eventsInWindow = eventsInWindow.filter(e => {
      if (e.is_bonus) return true
      const d = parseDateLocal(e.raid_date)
      return input.raidDays.includes(d.getDay())
    })
  }

  if (eventsInWindow.length === 0) {
    return { score: 0, raidsAttended: 0, raidsInWindow: 0, isEligible: true }
  }

  // 3. New member effective start date
  let effectiveStart = windowStart
  if (newMemberMode !== 'raw' && input.memberJoinedAt) {
    const joinDate = parseDateLocal(input.memberJoinedAt)
    if (joinDate > windowStart) {
      effectiveStart = joinDate
    }

    // Retroactive attendance check (matches master sheet lines 382-393):
    // If member has attendance records before their join date (from import),
    // use the earliest attended raid as the effective start date
    const eventIdsWithRecords = new Set(input.records.map(r => r.raid_event_id))
    const attendedRaidDates = eventsInWindow
      .filter(e => eventIdsWithRecords.has(e.id))
      .map(e => parseDateLocal(e.raid_date))

    if (attendedRaidDates.length > 0) {
      const earliestAttendance = new Date(Math.min(...attendedRaidDates.map(d => d.getTime())))
      if (earliestAttendance < effectiveStart) {
        effectiveStart = earliestAttendance
      }
    }
  }

  // Filter events to after effective start
  const effectiveEvents = (newMemberMode === 'raw')
    ? eventsInWindow
    : eventsInWindow.filter(e => parseDateLocal(e.raid_date) >= effectiveStart)

  if (effectiveEvents.length === 0) {
    return { score: 0, raidsAttended: 0, raidsInWindow: 0, isEligible: true }
  }

  // Build set of event IDs that have attendance records (for dedup preference)
  const recordEventIds = new Set(input.records.map(r => r.raid_event_id))

  // 4. Deduplicate by date (prefer events with attendance records)
  const byDate = new Map<string, RaidEvent>()
  for (const event of effectiveEvents) {
    const existing = byDate.get(event.raid_date)
    if (!existing) {
      byDate.set(event.raid_date, event)
    } else if (recordEventIds.has(event.id) && !recordEventIds.has(existing.id)) {
      byDate.set(event.raid_date, event)
    }
  }
  const dedupedEvents = Array.from(byDate.values())
  const dedupedIds = new Set(dedupedEvents.map(e => e.id))

  let totalRaids = dedupedEvents.length

  // 5a. Fill-in credit: check for cross-team attendance on weeks where team raids were missed
  let fillInCredits = 0
  if (input.fillInEvents?.length && input.fillInRecords?.length && input.weeklyAttendanceCap) {
    const cap = input.weeklyAttendanceCap
    const fillInRecordIds = new Set(
      input.fillInRecords.filter(r => r.attended).map(r => r.raid_event_id)
    )
    // Filter fill-in events to window (same window as team events)
    const fillInsInWindow = input.fillInEvents.filter(e =>
      e.raid_date >= windowStartStr && e.raid_date <= asOfStr
    )
    // Only consider fill-in events on dates WITHOUT a team event (avoid double-counting)
    const teamDates = new Set(dedupedEvents.map(e => e.raid_date))
    const extraFillIns = fillInsInWindow.filter(e =>
      !teamDates.has(e.raid_date) && fillInRecordIds.has(e.id)
    )

    if (extraFillIns.length > 0) {
      // Group team events + fill-ins by week to apply per-week cap
      const getWeekKey = (dateStr: string): string => {
        const d = parseDateLocal(dateStr)
        // Week starts on the first configured raid day, or Sunday
        const day = d.getDay()
        const startOfWeek = new Date(d)
        startOfWeek.setDate(d.getDate() - day)
        return formatDate(startOfWeek)
      }

      // Count attended team events per week
      const teamAttendedPerWeek = new Map<string, number>()
      for (const event of dedupedEvents) {
        const week = getWeekKey(event.raid_date)
        if (recordEventIds.has(event.id)) {
          // Check if actually attended (not just has a record)
          const rec = input.records.find(r => r.raid_event_id === event.id)
          if (rec && rec.attended && !rec.no_call_no_show) {
            teamAttendedPerWeek.set(week, (teamAttendedPerWeek.get(week) || 0) + 1)
          }
        }
      }

      // For each fill-in event, give credit if the week isn't already at cap
      for (const fillIn of extraFillIns) {
        const week = getWeekKey(fillIn.raid_date)
        const attended = teamAttendedPerWeek.get(week) || 0
        if (attended < cap) {
          fillInCredits++
          teamAttendedPerWeek.set(week, attended + 1)
        }
      }
    }
  }

  // 5b. Apply per-week cap to denominator if configured
  if (input.weeklyAttendanceCap) {
    const cap = input.weeklyAttendanceCap
    const getWeekKey = (dateStr: string): string => {
      const d = parseDateLocal(dateStr)
      const startOfWeek = new Date(d)
      startOfWeek.setDate(d.getDate() - d.getDay())
      return formatDate(startOfWeek)
    }
    const eventsPerWeek = new Map<string, number>()
    for (const event of dedupedEvents) {
      const week = getWeekKey(event.raid_date)
      eventsPerWeek.set(week, (eventsPerWeek.get(week) || 0) + 1)
    }
    // Cap each week's contribution to the denominator
    let cappedTotal = 0
    for (const count of eventsPerWeek.values()) {
      cappedTotal += Math.min(count, cap)
    }
    totalRaids = cappedTotal
  }

  // Filter records to only deduplicated events
  const relevantRecords: AttendanceRecord[] = input.records
    .filter(r => dedupedIds.has(r.raid_event_id))
    .map(r => ({
      signed_up: r.signed_up,
      attended: r.attended,
      no_call_no_show: r.no_call_no_show,
      was_late: r.was_late,
      was_benched: r.was_benched,
      is_excused: r.is_excused,
      points_override: r.points_override,
    }))

  // Add synthetic records for fill-in credits (plain attended, no modifiers)
  const fillInSyntheticRecords: AttendanceRecord[] = Array.from({ length: fillInCredits }, () => ({
    signed_up: false,
    attended: true,
    no_call_no_show: false,
  }))
  const allRecords = [...relevantRecords, ...fillInSyntheticRecords]

  // 6. Score
  const score = allRecords.length > 0
    ? calculateAttendanceScore(allRecords, totalRaids, config)
    : 0

  // Count attended (excluding NCNS), capped at denominator
  let raidsAttended = 0
  for (const r of allRecords) {
    if (!r.no_call_no_show && r.attended) raidsAttended++
  }
  // Never exceed the denominator (handles edge cases with fill-ins or overlapping windows)
  if (totalRaids > 0) {
    raidsAttended = Math.min(raidsAttended, totalRaids)
  }

  // 7. Eligibility check (minimum_gate mode)
  const isEligible = newMemberMode !== 'minimum_gate'
    || !config.minimum_raid_days_enabled
    || raidsAttended >= config.minimum_raid_days

  return {
    score,
    raidsAttended,
    raidsInWindow: totalRaids,
    isEligible,
  }
}
