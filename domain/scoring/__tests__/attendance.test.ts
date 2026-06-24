import { describe, it, expect } from 'vitest'
import { computeAttendance, resolveStatus } from '../attendance'
import { calculateAttendanceScore } from '../attendance-score'
import type { AttendanceInput, RaidEvent } from '../../types'
import { attended, signedUpOnly, ncns, absent } from './fixtures'

// ─── Helpers ─────────────────────────────────────────────────

function makeEvents(dates: string[]): RaidEvent[] {
  return dates.map((d, i) => ({ id: `event-${i}`, raid_date: d }))
}

function makeRecords(entries: { eventIndex: number; signedUp?: boolean; attended?: boolean; ncns?: boolean }[]) {
  return entries.map(e => ({
    raid_event_id: `event-${e.eventIndex}`,
    signed_up: e.signedUp ?? false,
    attended: e.attended ?? false,
    no_call_no_show: e.ncns ?? false,
  }))
}

function makeInput(overrides: Partial<AttendanceInput> = {}): AttendanceInput {
  return {
    records: [],
    raidEvents: [],
    config: {},
    raidDays: [],
    asOfDate: '2026-03-18',
    ...overrides,
  }
}

// ─── resolveStatus ──────────────────────────────────────────

describe('resolveStatus', () => {
  it('no_call_no_show wins over everything', () => {
    expect(resolveStatus({ no_call_no_show: true, attended: true, was_late: true, signed_up: true })).toBe('no_show')
  })

  it('benched wins over attended', () => {
    expect(resolveStatus({ was_benched: true, attended: true })).toBe('benched')
  })

  it('late requires attended + was_late', () => {
    expect(resolveStatus({ attended: true, was_late: true })).toBe('late')
  })

  it('attended without late', () => {
    expect(resolveStatus({ attended: true })).toBe('attended')
  })

  it('signed_up only', () => {
    expect(resolveStatus({ signed_up: true })).toBe('signed_up')
  })

  it('all false = absent', () => {
    expect(resolveStatus({})).toBe('absent')
  })

  it('explicit false values = absent', () => {
    expect(resolveStatus({ attended: false, signed_up: false, no_call_no_show: false })).toBe('absent')
  })
})

// ─── computeAttendance: edge cases ─────────────────────────

describe('computeAttendance', () => {
  describe('edge cases', () => {
    it('returns 0 for empty events', () => {
      const result = computeAttendance(makeInput({ records: [makeRecords([{ eventIndex: 0, attended: true }])[0]] }))
      expect(result.score).toBe(0)
      expect(result.raidsInWindow).toBe(0)
    })

    it('returns 0 for empty records', () => {
      const result = computeAttendance(makeInput({ raidEvents: makeEvents(['2026-03-10']) }))
      expect(result.score).toBe(0)
      expect(result.raidsInWindow).toBe(1)
    })

    it('isEligible defaults to true when not in minimum_gate', () => {
      const result = computeAttendance(makeInput())
      expect(result.isEligible).toBe(true)
    })
  })

  // ─── Rolling window ────────────────────────────────────────

  describe('rolling window', () => {
    it('includes events within window', () => {
      const result = computeAttendance(makeInput({
        raidEvents: makeEvents(['2026-03-10', '2026-03-15']),
        records: makeRecords([
          { eventIndex: 0, attended: true },
          { eventIndex: 1, attended: true },
        ]),
        config: { rolling_attendance_weeks: 4 },
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(2)
      expect(result.raidsAttended).toBe(2)
    })

    it('excludes events outside window', () => {
      const result = computeAttendance(makeInput({
        raidEvents: makeEvents(['2026-01-01', '2026-03-15']), // Jan 1 is outside 4-week window from Mar 18
        records: makeRecords([
          { eventIndex: 0, attended: true },
          { eventIndex: 1, attended: true },
        ]),
        config: { rolling_attendance_weeks: 4 },
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(1) // only Mar 15
      expect(result.raidsAttended).toBe(1)
    })

    it('excludes events after asOfDate', () => {
      const result = computeAttendance(makeInput({
        raidEvents: makeEvents(['2026-03-15', '2026-03-20']), // Mar 20 is after asOfDate
        records: makeRecords([
          { eventIndex: 0, attended: true },
          { eventIndex: 1, attended: true },
        ]),
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(1) // only Mar 15
    })

    it('respects rolling_attendance_weeks setting', () => {
      const result = computeAttendance(makeInput({
        raidEvents: makeEvents(['2026-03-11', '2026-03-04']), // Mar 4 is outside 1-week window
        records: makeRecords([
          { eventIndex: 0, attended: true },
          { eventIndex: 1, attended: true },
        ]),
        config: { rolling_attendance_weeks: 1 },
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(1) // only Mar 11
    })
  })

  // ─── Raid day filtering ────────────────────────────────────

  describe('raid day filtering', () => {
    it('filters to configured raid days', () => {
      // 2026-03-10 = Tuesday (2), 2026-03-12 = Thursday (4), 2026-03-13 = Friday (5)
      const result = computeAttendance(makeInput({
        raidEvents: makeEvents(['2026-03-10', '2026-03-12', '2026-03-13']),
        records: makeRecords([
          { eventIndex: 0, attended: true },
          { eventIndex: 1, attended: true },
          { eventIndex: 2, attended: true },
        ]),
        raidDays: [2, 4], // Tuesday, Thursday
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(2) // Tue + Thu, Friday excluded
    })

    it('no filtering when raidDays empty', () => {
      const result = computeAttendance(makeInput({
        raidEvents: makeEvents(['2026-03-10', '2026-03-12', '2026-03-13']),
        records: makeRecords([
          { eventIndex: 0, attended: true },
          { eventIndex: 1, attended: true },
          { eventIndex: 2, attended: true },
        ]),
        raidDays: [],
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(3) // all included
    })
  })

  // ─── Date deduplication ────────────────────────────────────

  describe('deduplication', () => {
    it('deduplicates events on the same date', () => {
      const events = [
        { id: 'e1', raid_date: '2026-03-10' },
        { id: 'e2', raid_date: '2026-03-10' }, // same date
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [{ raid_event_id: 'e1', signed_up: true, attended: true, no_call_no_show: false }],
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(1)
    })

    it('prefers events with attendance records during dedup', () => {
      const events = [
        { id: 'e1', raid_date: '2026-03-10' }, // no attendance
        { id: 'e2', raid_date: '2026-03-10' }, // has attendance
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [{ raid_event_id: 'e2', signed_up: false, attended: true, no_call_no_show: false }],
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(1)
      expect(result.raidsAttended).toBe(1) // e2 was kept (has attendance)
    })
  })

  // ─── New member modes ──────────────────────────────────────

  describe('new member mode', () => {
    it('raw mode includes all events in window', () => {
      const result = computeAttendance(makeInput({
        raidEvents: makeEvents(['2026-03-01', '2026-03-10', '2026-03-15']),
        records: makeRecords([
          { eventIndex: 0, attended: true },
          { eventIndex: 1, attended: true },
          { eventIndex: 2, attended: true },
        ]),
        newMemberMode: 'raw',
        memberJoinedAt: '2026-03-08', // join date ignored in raw mode
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(3) // all included
    })

    it('fair mode excludes events before join date when no retroactive attendance', () => {
      // No attendance record for event-0 (Mar 1), so retroactive check doesn't pull it in
      const result = computeAttendance(makeInput({
        raidEvents: makeEvents(['2026-03-01', '2026-03-10', '2026-03-15']),
        records: makeRecords([
          // No record for event-0 (Mar 1)
          { eventIndex: 1, attended: true },
          { eventIndex: 2, attended: true },
        ]),
        newMemberMode: 'fair',
        memberJoinedAt: '2026-03-08',
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(2) // Mar 10 + 15, Mar 1 excluded (no attendance record)
    })

    it('fair mode uses window start if join date is earlier', () => {
      const result = computeAttendance(makeInput({
        raidEvents: makeEvents(['2026-03-01', '2026-03-10']),
        records: makeRecords([
          { eventIndex: 0, attended: true },
          { eventIndex: 1, attended: true },
        ]),
        newMemberMode: 'fair',
        memberJoinedAt: '2025-01-01', // joined long ago
        config: { rolling_attendance_weeks: 4 },
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(2) // both in window, join date doesn't restrict
    })

    it('fair mode checks retroactive attendance (matches master sheet)', () => {
      // Member joined Mar 10, but has imported attendance for Mar 5
      // Master sheet behavior: effective start moves to Mar 5 (earliest attendance)
      const result = computeAttendance(makeInput({
        raidEvents: makeEvents(['2026-03-05', '2026-03-10', '2026-03-15']),
        records: makeRecords([
          { eventIndex: 0, attended: true }, // Mar 5 — before join date
          { eventIndex: 1, attended: true }, // Mar 10
          { eventIndex: 2, attended: true }, // Mar 15
        ]),
        newMemberMode: 'fair',
        memberJoinedAt: '2026-03-10',
        asOfDate: '2026-03-18',
      }))
      // Effective start should be Mar 5 (earliest attendance), not Mar 10 (join date)
      expect(result.raidsInWindow).toBe(3) // all 3 included
      expect(result.raidsAttended).toBe(3)
    })

    it('minimum_gate marks ineligible when raids < minimum', () => {
      const result = computeAttendance(makeInput({
        raidEvents: makeEvents(['2026-03-15']),
        records: makeRecords([{ eventIndex: 0, attended: true }]),
        newMemberMode: 'minimum_gate',
        memberJoinedAt: '2026-03-10',
        config: { minimum_raid_days_enabled: true, minimum_raid_days: 2 },
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsAttended).toBe(1)
      expect(result.isEligible).toBe(false) // 1 < 2 minimum
    })

    it('minimum_gate marks eligible when raids >= minimum', () => {
      const result = computeAttendance(makeInput({
        raidEvents: makeEvents(['2026-03-10', '2026-03-15']),
        records: makeRecords([
          { eventIndex: 0, attended: true },
          { eventIndex: 1, attended: true },
        ]),
        newMemberMode: 'minimum_gate',
        memberJoinedAt: '2026-03-08',
        config: { minimum_raid_days_enabled: true, minimum_raid_days: 2 },
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsAttended).toBe(2)
      expect(result.isEligible).toBe(true)
    })

    it('minimum_gate eligible when minimum_raid_days_enabled is false', () => {
      const result = computeAttendance(makeInput({
        raidEvents: makeEvents(['2026-03-15']),
        records: makeRecords([{ eventIndex: 0, attended: true }]),
        newMemberMode: 'minimum_gate',
        config: { minimum_raid_days_enabled: false, minimum_raid_days: 10 },
        asOfDate: '2026-03-18',
      }))
      expect(result.isEligible).toBe(true) // disabled overrides
    })
  })

  // ─── Score parity ──────────────────────────────────────────

  describe('score parity with calculateAttendanceScore', () => {
    it('points-per-raid: matches direct calculation', () => {
      const events = makeEvents(['2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13'])
      const records = [
        { raid_event_id: events[0].id, signed_up: true, attended: true, no_call_no_show: false },
        { raid_event_id: events[1].id, signed_up: true, attended: false, no_call_no_show: false },
        { raid_event_id: events[2].id, signed_up: false, attended: true, no_call_no_show: false },
        { raid_event_id: events[3].id, signed_up: false, attended: false, no_call_no_show: true },
      ]
      const config = { attendance_type: 'points-per-raid' as const, signup_weight: 0.25, max_attendance_bonus: 4 }

      const engineResult = computeAttendance(makeInput({
        raidEvents: events,
        records,
        config,
        asOfDate: '2026-03-18',
      }))

      // Direct calculation with same records
      const directScore = calculateAttendanceScore(
        records.map(r => ({ signed_up: r.signed_up, attended: r.attended, no_call_no_show: r.no_call_no_show })),
        4, // totalRaids = 4 deduplicated events
        config,
      )

      expect(engineResult.score).toBe(directScore)
    })

    it('linear: matches direct calculation', () => {
      const events = makeEvents(['2026-03-10', '2026-03-15'])
      const records = [
        { raid_event_id: events[0].id, signed_up: true, attended: true, no_call_no_show: false },
        { raid_event_id: events[1].id, signed_up: false, attended: false, no_call_no_show: false },
      ]
      const config = { attendance_type: 'linear' as const, use_signups: true, signup_weight: 0.25, max_attendance_bonus: 4 }

      const engineResult = computeAttendance(makeInput({
        raidEvents: events,
        records,
        config,
        asOfDate: '2026-03-18',
      }))

      const directScore = calculateAttendanceScore(
        records.map(r => ({ signed_up: r.signed_up, attended: r.attended, no_call_no_show: r.no_call_no_show })),
        2,
        config,
      )

      expect(engineResult.score).toBe(directScore)
    })

    it('breakpoint: matches direct calculation', () => {
      // 9/10 = 90% → max bonus
      const events = makeEvents([
        '2026-03-01', '2026-03-03', '2026-03-05', '2026-03-07', '2026-03-09',
        '2026-03-10', '2026-03-11', '2026-03-12', '2026-03-14', '2026-03-16',
      ])
      const records = events.slice(0, 9).map((e, i) => ({
        raid_event_id: e.id,
        signed_up: false,
        attended: true,
        no_call_no_show: false,
      }))
      const config = {
        attendance_type: 'breakpoint' as const,
        max_attendance_bonus: 4, max_attendance_threshold: 0.9,
        middle_attendance_bonus: 2, middle_attendance_threshold: 0.5,
        bottom_attendance_bonus: 1, bottom_attendance_threshold: 0.25,
        rolling_attendance_weeks: 4,
      }

      const engineResult = computeAttendance(makeInput({ raidEvents: events, records, config, asOfDate: '2026-03-18' }))
      const directScore = calculateAttendanceScore(
        records.map(r => ({ signed_up: r.signed_up, attended: r.attended, no_call_no_show: r.no_call_no_show })),
        10, config,
      )

      expect(engineResult.score).toBe(directScore)
      expect(engineResult.score).toBe(4) // 90% → max bonus
    })
  })

  // ─── NCNS handling ─────────────────────────────────────────

  describe('NCNS handling', () => {
    it('NCNS records do not count as attended', () => {
      const result = computeAttendance(makeInput({
        raidEvents: makeEvents(['2026-03-10', '2026-03-15']),
        records: makeRecords([
          { eventIndex: 0, attended: true },
          { eventIndex: 1, ncns: true },
        ]),
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsAttended).toBe(1) // only event-0
    })
  })

  // ─── raidStartDate clamps the rolling window ───────────────

  describe('raidStartDate', () => {
    it('excludes events before raidStartDate even when inside the rolling window', () => {
      // First raid is on 2026-05-17. Blank events auto-created for 2026-04-12,
      // 2026-04-19, 2026-04-26 (all on raid days but pre-expansion). Without
      // raidStartDate the denominator would be 4 → 1/4 = 25% = 0.
      const result = computeAttendance(makeInput({
        raidEvents: makeEvents([
          '2026-04-12',
          '2026-04-19',
          '2026-04-26',
          '2026-05-17',
        ]),
        records: makeRecords([{ eventIndex: 3, attended: true, signedUp: true }]),
        config: { rolling_attendance_weeks: 6, attendance_type: 'points-per-raid' },
        // asOfDate is the Tue reset after the raid week so May 17 falls in the
        // last-completed reset week and is in the window.
        asOfDate: '2026-05-19',
        raidStartDate: '2026-05-17',
      }))
      expect(result.raidsInWindow).toBe(1)
      expect(result.raidsAttended).toBe(1)
    })

    it('is a no-op when raidStartDate is older than the rolling window start', () => {
      const result = computeAttendance(makeInput({
        raidEvents: makeEvents(['2026-03-10', '2026-03-15']),
        records: makeRecords([
          { eventIndex: 0, attended: true },
          { eventIndex: 1, attended: true },
        ]),
        config: { rolling_attendance_weeks: 4 },
        asOfDate: '2026-03-18',
        raidStartDate: '2020-01-01',
      }))
      expect(result.raidsInWindow).toBe(2)
      expect(result.raidsAttended).toBe(2)
    })
  })

  // ─── In-progress reset week exclusion ──────────────────────

  describe('in-progress reset week exclusion', () => {
    it("today's raid does not count yet (default Tue reset)", () => {
      // asOfDate = Tue (reset day). Last reset week ends Mon = yesterday.
      // A raid on Tue is the start of the new in-progress week and is excluded.
      const result = computeAttendance(makeInput({
        raidEvents: [
          { id: 'mon', raid_date: '2026-03-16' },
          { id: 'tue', raid_date: '2026-03-17' },
        ],
        records: [
          { raid_event_id: 'mon', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'tue', signed_up: false, attended: true, no_call_no_show: false },
        ],
        asOfDate: '2026-03-17',
      }))
      expect(result.raidsInWindow).toBe(1)
      expect(result.raidsAttended).toBe(1)
    })

    it('whole in-progress reset week is excluded until next reset', () => {
      // asOfDate = Mon (last day of in-progress reset week Tue Mar 17 - Mon Mar 23).
      // None of this week's raids should count yet; only the prior reset week does.
      const result = computeAttendance(makeInput({
        raidEvents: [
          { id: 'tue-prev', raid_date: '2026-03-10' },
          { id: 'tue-now', raid_date: '2026-03-17' },
          { id: 'thu-now', raid_date: '2026-03-19' },
          { id: 'mon-now', raid_date: '2026-03-23' },
        ],
        records: [
          { raid_event_id: 'tue-prev', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'tue-now', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'thu-now', signed_up: false, attended: false, no_call_no_show: false },
          { raid_event_id: 'mon-now', signed_up: false, attended: true, no_call_no_show: false },
        ],
        asOfDate: '2026-03-23',
      }))
      expect(result.raidsInWindow).toBe(1)
      expect(result.raidsAttended).toBe(1)
    })

    it('just-completed reset week counts immediately at next reset', () => {
      // asOfDate = Tue (reset day). The full prior Tue-Mon week is now completed.
      const result = computeAttendance(makeInput({
        raidEvents: [
          { id: 'tue-prev', raid_date: '2026-03-10' },
          { id: 'mon-prev', raid_date: '2026-03-16' },
          { id: 'tue-now', raid_date: '2026-03-17' },
        ],
        records: [
          { raid_event_id: 'tue-prev', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'mon-prev', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'tue-now', signed_up: false, attended: true, no_call_no_show: false },
        ],
        asOfDate: '2026-03-17',
      }))
      expect(result.raidsInWindow).toBe(2)
      expect(result.raidsAttended).toBe(2)
    })

    it('respects configurable weekResetDay (Wed for EU)', () => {
      // Wed-anchored reset: prior reset week runs Wed Mar 11 → Tue Mar 17.
      const result = computeAttendance(makeInput({
        raidEvents: [
          { id: 'tue', raid_date: '2026-03-17' }, // last day of prior reset week
          { id: 'wed', raid_date: '2026-03-18' }, // reset day, start of in-progress week
        ],
        records: [
          { raid_event_id: 'tue', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'wed', signed_up: false, attended: true, no_call_no_show: false },
        ],
        asOfDate: '2026-03-18',
        weekResetDay: 3,
      }))
      expect(result.raidsInWindow).toBe(1)
      expect(result.raidsAttended).toBe(1)
    })
  })

  // ─── Bonus events (off-schedule officer-created raids) ─────

  describe('bonus events', () => {
    // 2026-03-10 = Tuesday, 2026-03-12 = Thursday, 2026-03-14 = Saturday
    it('includes is_bonus events even when day-of-week is not in raidDays', () => {
      const events: RaidEvent[] = [
        { id: 'tue', raid_date: '2026-03-10' },
        { id: 'thu', raid_date: '2026-03-12' },
        { id: 'sat-bonus', raid_date: '2026-03-14', is_bonus: true },
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [
          { raid_event_id: 'tue', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'thu', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'sat-bonus', signed_up: false, attended: true, no_call_no_show: false },
        ],
        raidDays: [2, 4], // Tue, Thu only
        asOfDate: '2026-03-18',
      }))
      // Bonus counts toward denominator AND numerator
      expect(result.raidsInWindow).toBe(3)
      expect(result.raidsAttended).toBe(3)
    })

    it('off-schedule events without is_bonus stay filtered out', () => {
      const events: RaidEvent[] = [
        { id: 'tue', raid_date: '2026-03-10' },
        { id: 'thu', raid_date: '2026-03-12' },
        { id: 'sat-not-bonus', raid_date: '2026-03-14' }, // off-schedule, not flagged
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [
          { raid_event_id: 'tue', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'thu', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'sat-not-bonus', signed_up: false, attended: true, no_call_no_show: false },
        ],
        raidDays: [2, 4],
        asOfDate: '2026-03-18',
      }))
      // Saturday is dropped — preserves existing behavior for non-bonus off-schedule rows
      expect(result.raidsInWindow).toBe(2)
      expect(result.raidsAttended).toBe(2)
    })

    it('absentees of a bonus event take the same hit as missing a scheduled day', () => {
      const events: RaidEvent[] = [
        { id: 'tue', raid_date: '2026-03-10' },
        { id: 'thu', raid_date: '2026-03-12' },
        { id: 'sat-bonus', raid_date: '2026-03-14', is_bonus: true },
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [
          { raid_event_id: 'tue', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'thu', signed_up: false, attended: true, no_call_no_show: false },
          // no record for sat-bonus
        ],
        raidDays: [2, 4],
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(3)
      expect(result.raidsAttended).toBe(2)
    })

    it('weekly cap clamps bonus contribution like any other event', () => {
      // Team raids 2x/week. Add a Saturday bonus on top — cap=2 clamps that week to 2.
      const events: RaidEvent[] = [
        { id: 'tue', raid_date: '2026-03-10' },
        { id: 'thu', raid_date: '2026-03-12' },
        { id: 'sat-bonus', raid_date: '2026-03-14', is_bonus: true },
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [
          { raid_event_id: 'tue', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'thu', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'sat-bonus', signed_up: false, attended: true, no_call_no_show: false },
        ],
        raidDays: [2, 4],
        weeklyAttendanceCap: 2,
        asOfDate: '2026-03-18',
      }))
      // Cap=2 clamps the week's denominator. Attendee gets capped credit, not 3/3.
      expect(result.raidsInWindow).toBe(2)
      expect(result.raidsAttended).toBe(2)
    })

    it('weekly cap < raid-days credits full weekly attendance once minimum is hit', () => {
      // Guild raids 3 days/week (Tue/Thu/Sat). Cap=2 (minimum-raids-per-week feature).
      // Attending 2 of 3 should yield full weekly credit, not 2/3.
      const events: RaidEvent[] = [
        { id: 'tue1', raid_date: '2026-03-10' },
        { id: 'thu1', raid_date: '2026-03-12' },
        { id: 'sat1', raid_date: '2026-03-14' },
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [
          { raid_event_id: 'tue1', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'thu1', signed_up: false, attended: true, no_call_no_show: false },
          // sat1: missed
        ],
        raidDays: [2, 4, 6],
        weeklyAttendanceCap: 2,
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(2)
      expect(result.raidsAttended).toBe(2)
    })

    it('weekly cap < raid-days does not let over-attended week leak into other weeks', () => {
      // Cap=2 with 3 raids/week across 2 reset weeks (Tue Mar 10 - Mon Mar 23).
      // Week 1: attended all 3. Week 2: attended 0.
      // Should be 2/4 (week 1 capped at 2, week 2 at 0), not 3/4.
      const events: RaidEvent[] = [
        { id: 'tue1', raid_date: '2026-03-10' },
        { id: 'thu1', raid_date: '2026-03-12' },
        { id: 'sat1', raid_date: '2026-03-14' },
        { id: 'tue2', raid_date: '2026-03-17' },
        { id: 'thu2', raid_date: '2026-03-19' },
        { id: 'sat2', raid_date: '2026-03-21' },
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [
          { raid_event_id: 'tue1', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'thu1', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'sat1', signed_up: false, attended: true, no_call_no_show: false },
        ],
        raidDays: [2, 4, 6],
        weeklyAttendanceCap: 2,
        // asOfDate after both reset weeks complete (Tue Mar 24 = next reset).
        asOfDate: '2026-03-24',
      }))
      expect(result.raidsInWindow).toBe(4)
      expect(result.raidsAttended).toBe(2)
    })

    it('bonus event respects rolling window', () => {
      // Window: 4 weeks back from 2026-03-18 → 2026-02-18 onward
      const events: RaidEvent[] = [
        { id: 'old-bonus', raid_date: '2026-01-10', is_bonus: true }, // way outside window
        { id: 'tue', raid_date: '2026-03-10' },
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [
          { raid_event_id: 'old-bonus', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'tue', signed_up: false, attended: true, no_call_no_show: false },
        ],
        config: { rolling_attendance_weeks: 4 },
        raidDays: [2, 4],
        asOfDate: '2026-03-18',
      }))
      // Bonus event outside the window is excluded — bonus flag does not bypass windowing
      expect(result.raidsInWindow).toBe(1)
      expect(result.raidsAttended).toBe(1)
    })
  })

  // ─── Team-aware filtering ──────────────────────────────────
  describe('team-aware filtering', () => {
    it('omitting raiderTeamId keeps legacy behavior', () => {
      const events: RaidEvent[] = [
        { id: 'team-a', raid_date: '2026-03-10', raid_team_id: 'A' },
        { id: 'team-b', raid_date: '2026-03-10', raid_team_id: 'B' },
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [{ raid_event_id: 'team-b', signed_up: false, attended: true, no_call_no_show: false }],
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(1)
      expect(result.raidsAttended).toBe(1)
    })

    it('excludes events belonging to other teams when raiderTeamId is set', () => {
      const events: RaidEvent[] = [
        { id: 'team-a', raid_date: '2026-03-10', raid_team_id: 'A' },
        { id: 'team-b', raid_date: '2026-03-10', raid_team_id: 'B' },
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [{ raid_event_id: 'team-b', signed_up: false, attended: true, no_call_no_show: false }],
        raiderTeamId: 'A',
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(1)
      expect(result.raidsAttended).toBe(0)
    })

    it('counts null-team (legacy) events alongside the raider team', () => {
      const events: RaidEvent[] = [
        { id: 'team-a-1', raid_date: '2026-03-10', raid_team_id: 'A' },
        { id: 'null-1', raid_date: '2026-03-13', raid_team_id: null },
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [
          { raid_event_id: 'team-a-1', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'null-1', signed_up: false, attended: true, no_call_no_show: false },
        ],
        raiderTeamId: 'A',
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(2)
      expect(result.raidsAttended).toBe(2)
    })

    it('same-date team+null: keeps the event holding the raider record (legacy data shape)', () => {
      const events: RaidEvent[] = [
        { id: 'team-empty', raid_date: '2026-03-10', raid_team_id: 'A' },
        { id: 'null-with-rec', raid_date: '2026-03-10', raid_team_id: null },
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [{ raid_event_id: 'null-with-rec', signed_up: false, attended: true, no_call_no_show: false }],
        raiderTeamId: 'A',
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(1)
      expect(result.raidsAttended).toBe(1)
    })

    it('same-date team+null: prefers team event when both hold records', () => {
      const events: RaidEvent[] = [
        { id: 'team-with-rec', raid_date: '2026-03-10', raid_team_id: 'A' },
        { id: 'null-with-rec', raid_date: '2026-03-10', raid_team_id: null },
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [
          { raid_event_id: 'team-with-rec', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'null-with-rec', signed_up: false, attended: true, no_call_no_show: false },
        ],
        raiderTeamId: 'A',
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(1)
      expect(result.raidsAttended).toBe(1)
    })

    it('same-date team+null: prefers team event when neither holds a record', () => {
      const events: RaidEvent[] = [
        { id: 'team-empty', raid_date: '2026-03-10', raid_team_id: 'A' },
        { id: 'null-empty', raid_date: '2026-03-10', raid_team_id: null },
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [],
        raiderTeamId: 'A',
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(1)
      expect(result.raidsAttended).toBe(0)
    })

    it('raiderTeamId=null: only null-team events count', () => {
      const events: RaidEvent[] = [
        { id: 'team-a', raid_date: '2026-03-10', raid_team_id: 'A' },
        { id: 'null-1', raid_date: '2026-03-13', raid_team_id: null },
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [
          { raid_event_id: 'team-a', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'null-1', signed_up: false, attended: true, no_call_no_show: false },
        ],
        raiderTeamId: null,
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(1)
      expect(result.raidsAttended).toBe(1)
    })

    it('legacy events with no raid_team_id field act as null-team', () => {
      const events: RaidEvent[] = [
        { id: 'legacy', raid_date: '2026-03-10' },
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [{ raid_event_id: 'legacy', signed_up: false, attended: true, no_call_no_show: false }],
        raiderTeamId: 'A',
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(1)
      expect(result.raidsAttended).toBe(1)
    })

    it('Zevpaw regression: legacy null-team record + empty team event + other-team event on same date', () => {
      const events: RaidEvent[] = [
        { id: 'team-a-empty', raid_date: '2026-05-17', raid_team_id: 'A' },
        { id: 'team-b-with-rec', raid_date: '2026-05-17', raid_team_id: 'B' },
        { id: 'null-with-rec', raid_date: '2026-05-17', raid_team_id: null },
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [{ raid_event_id: 'null-with-rec', signed_up: true, attended: true, no_call_no_show: false }],
        raiderTeamId: 'A',
        asOfDate: '2026-05-26',
        raidDays: [0],
      }))
      expect(result.raidsInWindow).toBe(1)
      expect(result.raidsAttended).toBe(1)
    })
  })

  // ─── Fill-in credit (cross-team) ───────────────────────────
  // A raider rostered on team A who covers team B's raid earns "fill-in"
  // credit. The guard that prevents double-counting must key on whether the
  // raider ALREADY attended their own team that date, not merely on whether
  // their team had an event that date — otherwise parallel-schedule guilds
  // (both teams raid the same nights) silently drop every fill-in.
  describe('fill-in credit (cross-team)', () => {
    it('parallel-schedule regression: skips own team, covers other team same nights → credited', () => {
      // Team A (home) and team B raid the SAME two nights. The raider attended
      // NONE of team A's raids but filled team B both nights. Before the fix the
      // home team's event-date collided with each fill-in and credit was dropped
      // (0/2). After the fix the raider is credited for both nights raided.
      const events: RaidEvent[] = [
        { id: 'a-tue', raid_date: '2026-03-10', raid_team_id: 'A' },
        { id: 'a-thu', raid_date: '2026-03-12', raid_team_id: 'A' },
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [], // never attended own team
        fillInEvents: [
          { id: 'b-tue', raid_date: '2026-03-10', raid_team_id: 'B' },
          { id: 'b-thu', raid_date: '2026-03-12', raid_team_id: 'B' },
        ],
        fillInRecords: [
          { raid_event_id: 'b-tue', attended: true },
          { raid_event_id: 'b-thu', attended: true },
        ],
        weeklyAttendanceCap: 2,
        raidDays: [2, 4],
        raiderTeamId: 'A',
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(2)
      expect(result.raidsAttended).toBe(2)
    })

    it('does not double-count: attended own team AND has a fill-in record same date → fill-in suppressed', () => {
      // Guard preservation. The raider attended their own team's Tuesday raid;
      // a stray fill-in record on the same date must not stack a second credit.
      const events: RaidEvent[] = [
        { id: 'a-tue', raid_date: '2026-03-10', raid_team_id: 'A' },
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [{ raid_event_id: 'a-tue', signed_up: false, attended: true, no_call_no_show: false }],
        fillInEvents: [{ id: 'b-tue', raid_date: '2026-03-10', raid_team_id: 'B' }],
        fillInRecords: [{ raid_event_id: 'b-tue', attended: true }],
        weeklyAttendanceCap: 2,
        raidDays: [2],
        raiderTeamId: 'A',
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(1)
      expect(result.raidsAttended).toBe(1)
    })

    it('missed own team that night (signed up only) but covered other team → credited', () => {
      // Signing up is not attending, so the fill-in is the raider's only raid
      // that night and must count.
      const events: RaidEvent[] = [
        { id: 'a-tue', raid_date: '2026-03-10', raid_team_id: 'A' },
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [{ raid_event_id: 'a-tue', signed_up: true, attended: false, no_call_no_show: false }],
        fillInEvents: [{ id: 'b-tue', raid_date: '2026-03-10', raid_team_id: 'B' }],
        fillInRecords: [{ raid_event_id: 'b-tue', attended: true }],
        weeklyAttendanceCap: 2,
        raidDays: [2],
        raiderTeamId: 'A',
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(1)
      expect(result.raidsAttended).toBe(1)
    })

    it('weekly cap still bounds fill-in credit (3 fill-ins, cap 2 → 2 credited)', () => {
      // Home team raids 3 nights; raider attended none and filled the other team
      // all 3. Cap=2 clamps both the denominator and the fill-in credit.
      const events: RaidEvent[] = [
        { id: 'a-tue', raid_date: '2026-03-10', raid_team_id: 'A' },
        { id: 'a-thu', raid_date: '2026-03-12', raid_team_id: 'A' },
        { id: 'a-sat', raid_date: '2026-03-14', raid_team_id: 'A' },
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [],
        fillInEvents: [
          { id: 'b-tue', raid_date: '2026-03-10', raid_team_id: 'B' },
          { id: 'b-thu', raid_date: '2026-03-12', raid_team_id: 'B' },
          { id: 'b-sat', raid_date: '2026-03-14', raid_team_id: 'B' },
        ],
        fillInRecords: [
          { raid_event_id: 'b-tue', attended: true },
          { raid_event_id: 'b-thu', attended: true },
          { raid_event_id: 'b-sat', attended: true },
        ],
        weeklyAttendanceCap: 2,
        raidDays: [2, 4, 6],
        raiderTeamId: 'A',
        asOfDate: '2026-03-18',
      }))
      expect(result.raidsInWindow).toBe(2)
      expect(result.raidsAttended).toBe(2)
    })

    it('fill-in on a genuinely off night (home team did not raid) still counts', () => {
      // Pre-existing behavior must be preserved: home team raids Tue only; the
      // raider attended Tue and also filled team B on Thursday (no home event).
      const events: RaidEvent[] = [
        { id: 'a-tue', raid_date: '2026-03-10', raid_team_id: 'A' },
        { id: 'a-thu', raid_date: '2026-03-12', raid_team_id: 'A' },
      ]
      const result = computeAttendance(makeInput({
        raidEvents: events,
        records: [
          { raid_event_id: 'a-tue', signed_up: false, attended: true, no_call_no_show: false },
          { raid_event_id: 'a-thu', signed_up: false, attended: true, no_call_no_show: false },
        ],
        // Raider also covered team B on a bonus Saturday their own team skipped.
        fillInEvents: [{ id: 'b-sat', raid_date: '2026-03-14', raid_team_id: 'B' }],
        fillInRecords: [{ raid_event_id: 'b-sat', attended: true }],
        weeklyAttendanceCap: 2,
        raidDays: [2, 4, 6],
        raiderTeamId: 'A',
        asOfDate: '2026-03-18',
      }))
      // Cap=2 clamps the week; the raider already maxed their 2 own-team raids,
      // so the Saturday fill-in does not inflate beyond the cap.
      expect(result.raidsInWindow).toBe(2)
      expect(result.raidsAttended).toBe(2)
    })
  })
})
