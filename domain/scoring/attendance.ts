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

const DEFAULT_WEEK_RESET_DAY = 2 // Tuesday (NA WoW reset)

/**
 * Last day of the most recently completed reset week, relative to `asOf`.
 *
 * A reset week runs [resetDay, resetDay + 6 days]. We return the day just
 * before the most recent reset boundary on/before `asOf`, then step back one
 * more day so that today itself (or any day in the in-progress reset week)
 * never appears in the scoring window. This is the "only count finished
 * weeks + 1-day delay" rule the engine enforces.
 */
function lastCompletedResetWeekEnd(asOf: Date, resetDay: number): Date {
  const dow = asOf.getDay()
  const daysSinceReset = (dow - resetDay + 7) % 7
  const end = new Date(asOf)
  end.setDate(asOf.getDate() - daysSinceReset - 1)
  return end
}

/**
 * Last day (YYYY-MM-DD) of the most recently completed reset week, relative
 * to `asOfDate`. Use this to drop in-progress-week events from any attendance
 * summary that consumers compute outside of `computeAttendance` — e.g. the
 * addon export endpoint, which ships a pre-summarized `{records, totalRaids}`
 * payload to the WoW client.
 */
export function getAttendanceWindowEnd(asOfDate: string | undefined, weekResetDay?: number | null): string {
  const asOf = asOfDate ? parseDateLocal(asOfDate) : new Date()
  const resetDay = weekResetDay ?? DEFAULT_WEEK_RESET_DAY
  return formatDate(lastCompletedResetWeekEnd(asOf, resetDay))
}

function weekKey(dateStr: string, resetDay: number): string {
  const d = parseDateLocal(dateStr)
  const dow = d.getDay()
  const daysSinceReset = (dow - resetDay + 7) % 7
  const startOfWeek = new Date(d)
  startOfWeek.setDate(d.getDate() - daysSinceReset)
  return formatDate(startOfWeek)
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
  const resetDay = input.weekResetDay ?? DEFAULT_WEEK_RESET_DAY

  // 1. Rolling window
  // Right edge is the last day of the last completed reset week relative to
  // today. The in-progress reset week (and "today") never count, so officers
  // can finish entering attendance for a night's raid without it shifting
  // priorities until the next reset.
  const asOf = input.asOfDate ? parseDateLocal(input.asOfDate) : new Date()
  const windowEnd = lastCompletedResetWeekEnd(asOf, resetDay)
  let windowStart = new Date(windowEnd)
  windowStart.setDate(windowStart.getDate() - config.rolling_attendance_weeks * 7 + 1)
  // Clamp to expansion's raid start date so pre-expansion events (e.g., blanks
  // auto-created by /api/raid-events/ensure before the expansion launched)
  // don't inflate the denominator.
  if (input.raidStartDate) {
    const startDate = parseDateLocal(input.raidStartDate)
    if (startDate > windowStart) windowStart = startDate
  }
  const windowStartStr = formatDate(windowStart)
  const windowEndStr = formatDate(windowEnd)

  // Filter events to window
  let eventsInWindow = input.raidEvents.filter(e =>
    e.raid_date >= windowStartStr && e.raid_date <= windowEndStr
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
      e.raid_date >= windowStartStr && e.raid_date <= windowEndStr
    )
    // Only consider fill-in events on dates WITHOUT a team event (avoid double-counting)
    const teamDates = new Set(dedupedEvents.map(e => e.raid_date))
    const extraFillIns = fillInsInWindow.filter(e =>
      !teamDates.has(e.raid_date) && fillInRecordIds.has(e.id)
    )

    if (extraFillIns.length > 0) {
      // Count attended team events per week
      const teamAttendedPerWeek = new Map<string, number>()
      for (const event of dedupedEvents) {
        const week = weekKey(event.raid_date, resetDay)
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
        const week = weekKey(fillIn.raid_date, resetDay)
        const attended = teamAttendedPerWeek.get(week) || 0
        if (attended < cap) {
          fillInCredits++
          teamAttendedPerWeek.set(week, attended + 1)
        }
      }
    }
  }

  // 5b. Apply per-week cap if configured. Caps BOTH the denominator (events
  // counted toward total) AND the numerator (records that earn credit). Per
  // week, prefers to credit attended/benched events over missed ones so a
  // raider hitting the minimum threshold gets full weekly credit.
  let creditedEventIds = dedupedIds
  if (input.weeklyAttendanceCap) {
    const cap = input.weeklyAttendanceCap
    const recordByEventId = new Map(input.records.map(r => [r.raid_event_id, r]))
    const eventsByWeek = new Map<string, RaidEvent[]>()
    for (const event of dedupedEvents) {
      const week = weekKey(event.raid_date, resetDay)
      if (!eventsByWeek.has(week)) eventsByWeek.set(week, [])
      eventsByWeek.get(week)!.push(event)
    }
    // Sort within each week: attended/benched first (most credit), then signed-up,
    // then missed. Within a tier, preserve date order for determinism.
    const eventScore = (e: RaidEvent): number => {
      const r = recordByEventId.get(e.id)
      if (!r) return 0
      if (r.no_call_no_show || r.is_excused) return 0
      if (r.attended || r.was_benched) return 2
      if (r.signed_up) return 1
      return 0
    }
    let cappedTotal = 0
    const kept = new Set<string>()
    for (const events of eventsByWeek.values()) {
      const sorted = [...events].sort((a, b) => {
        const diff = eventScore(b) - eventScore(a)
        return diff !== 0 ? diff : a.raid_date.localeCompare(b.raid_date)
      })
      const keep = sorted.slice(0, cap)
      for (const e of keep) kept.add(e.id)
      cappedTotal += keep.length
    }
    totalRaids = cappedTotal
    creditedEventIds = kept
  }

  // Filter records to only credited events (per-week capped subset of deduped)
  const relevantRecords: AttendanceRecord[] = input.records
    .filter(r => creditedEventIds.has(r.raid_event_id))
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
