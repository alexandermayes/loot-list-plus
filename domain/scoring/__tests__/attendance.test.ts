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
})
