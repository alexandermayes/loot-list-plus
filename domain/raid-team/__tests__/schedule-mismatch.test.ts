import { describe, it, expect } from 'vitest'
import { detectScheduleMismatch, type ScheduleMismatchEvent } from '../schedule-mismatch'
import type { ScheduleHistoryEntry } from '../types'

// Day-of-week reference (0=Sun..6=Sat) for the 2026 dates used below:
//   2026-06-02 Tue, 2026-06-03 Wed, 2026-06-04 Thu, 2026-06-05 Fri,
//   2026-06-08 Mon, 2026-06-09 Tue, 2026-06-11 Thu
const ev = (id: string, raid_date: string, extra: Partial<ScheduleMismatchEvent> = {}): ScheduleMismatchEvent =>
  ({ id, raid_date, ...extra })

describe('detectScheduleMismatch', () => {
  it('returns nothing when every event is on a scheduled day (no false positives)', () => {
    const events = [ev('a', '2026-06-02'), ev('b', '2026-06-04')] // Tue, Thu
    const result = detectScheduleMismatch(events, [2, 4], null) // Tue/Thu
    expect(result.offScheduleEvents).toEqual([])
    expect(result.unscheduledDays).toEqual([])
  })

  it('flags an event on a weekday outside the configured schedule', () => {
    const events = [ev('a', '2026-06-02'), ev('friday', '2026-06-05')] // Tue (ok), Fri (off)
    const result = detectScheduleMismatch(events, [2, 4], null)
    expect(result.offScheduleEvents.map(e => e.id)).toEqual(['friday'])
    expect(result.unscheduledDays).toEqual([5]) // Friday
  })

  it('excludes bonus and skipped events even when off-schedule', () => {
    const events = [
      ev('bonus', '2026-06-05', { is_bonus: true }),   // Fri, but bonus
      ev('skipped', '2026-06-05', { is_skipped: true }), // Fri, but skipped
      ev('real', '2026-06-05'),                          // Fri, real -> flagged
    ]
    const result = detectScheduleMismatch(events, [2, 4], null)
    expect(result.offScheduleEvents.map(e => e.id)).toEqual(['real'])
  })

  it('does NOT flag a team raid that lands on the team\'s overridden day', () => {
    // Guild raids Tue/Thu, but this team was resolved to raid Mon/Wed. The
    // caller passes the team-resolved raidDays, so Monday counts and is clean.
    const events = [ev('mon', '2026-06-08'), ev('wed', '2026-06-03')] // Mon, Wed
    const teamResolvedDays = [1, 3] // resolveRaidDays(guild, override) => Mon/Wed
    const result = detectScheduleMismatch(events, teamResolvedDays, null)
    expect(result.offScheduleEvents).toEqual([])
  })

  it('respects schedule_history: old-schedule raids in their active period are not flagged', () => {
    // Team raided Monday until 2026-06-07, then switched to Thursday.
    const history: ScheduleHistoryEntry[] = [
      { days: [1], effective_from: '2026-01-01' }, // Mondays
      { days: [4], effective_from: '2026-06-07' }, // Thursdays from Jun 7
    ]
    const events = [
      ev('old-mon', '2026-06-01'), // Mon, before switch -> legit, not flagged
      ev('new-thu', '2026-06-11'), // Thu, after switch -> legit, not flagged
    ]
    // currentRaidDays passed is the latest ([4]); history governs older dates.
    const result = detectScheduleMismatch(events, [4], history)
    expect(result.offScheduleEvents).toEqual([])
  })

  it('flags a raid on a day that was never scheduled in any history period', () => {
    const history: ScheduleHistoryEntry[] = [
      { days: [1], effective_from: '2026-01-01' },
      { days: [4], effective_from: '2026-06-07' },
    ]
    const events = [ev('fri', '2026-06-05')] // Fri: not Mon, not Thu, ever -> flagged
    const result = detectScheduleMismatch(events, [4], history)
    expect(result.offScheduleEvents.map(e => e.id)).toEqual(['fri'])
    expect(result.unscheduledDays).toEqual([5])
  })

  it('returns nothing when no raid days are configured (engine applies no day filter)', () => {
    const events = [ev('a', '2026-06-05')]
    const result = detectScheduleMismatch(events, [], null)
    expect(result.offScheduleEvents).toEqual([])
  })

  it('dedupes unscheduledDays and sorts ascending', () => {
    const events = [
      ev('fri1', '2026-06-05'), // Fri (5)
      ev('mon1', '2026-06-08'), // Mon (1)
      ev('fri2', '2026-06-12'), // Fri (5) again
    ]
    const result = detectScheduleMismatch(events, [2, 4], null) // Tue/Thu
    expect(result.offScheduleEvents).toHaveLength(3)
    expect(result.unscheduledDays).toEqual([1, 5])
  })
})
