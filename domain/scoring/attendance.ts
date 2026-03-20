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
  const windowStart = new Date(asOf)
  windowStart.setDate(windowStart.getDate() - config.rolling_attendance_weeks * 7)
  const windowStartStr = formatDate(windowStart)
  const asOfStr = formatDate(asOf)

  // Filter events to window
  let eventsInWindow = input.raidEvents.filter(e =>
    e.raid_date >= windowStartStr && e.raid_date <= asOfStr
  )

  // 2. Raid-day filter
  if (input.raidDays.length > 0) {
    eventsInWindow = eventsInWindow.filter(e => {
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

  const totalRaids = dedupedEvents.length

  // 5. Score
  const score = relevantRecords.length > 0
    ? calculateAttendanceScore(relevantRecords, totalRaids, config)
    : 0

  // Count attended (excluding NCNS)
  let raidsAttended = 0
  for (const r of relevantRecords) {
    if (!r.no_call_no_show && r.attended) raidsAttended++
  }

  // 6. Eligibility check (minimum_gate mode)
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
