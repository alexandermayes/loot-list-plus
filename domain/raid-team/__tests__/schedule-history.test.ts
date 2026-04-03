import { describe, it, expect } from 'vitest'
import { appendScheduleEntry, isDateScheduled, filterDatesByScheduleHistory } from '../schedule-history'
import type { ScheduleHistoryEntry } from '../types'

// ─── appendScheduleEntry ──────────────────────────────────

describe('appendScheduleEntry', () => {
  it('creates initial entry from null', () => {
    const result = appendScheduleEntry(null, [1, 3], '2026-03-01')
    expect(result).toEqual([{ days: [1, 3], effective_from: '2026-03-01' }])
  })

  it('creates initial entry from empty array', () => {
    const result = appendScheduleEntry([], [1, 3], '2026-03-01')
    expect(result).toEqual([{ days: [1, 3], effective_from: '2026-03-01' }])
  })

  it('appends a new entry', () => {
    const existing: ScheduleHistoryEntry[] = [
      { days: [1, 3], effective_from: '2026-03-01' },
    ]
    const result = appendScheduleEntry(existing, [1, 3, 5], '2026-03-15')
    expect(result).toEqual([
      { days: [1, 3], effective_from: '2026-03-01' },
      { days: [1, 3, 5], effective_from: '2026-03-15' },
    ])
  })

  it('replaces entry with same effective_from', () => {
    const existing: ScheduleHistoryEntry[] = [
      { days: [1, 3], effective_from: '2026-03-01' },
      { days: [1, 3, 5], effective_from: '2026-03-15' },
    ]
    const result = appendScheduleEntry(existing, [1, 5], '2026-03-15')
    expect(result).toEqual([
      { days: [1, 3], effective_from: '2026-03-01' },
      { days: [1, 5], effective_from: '2026-03-15' },
    ])
  })

  it('sorts days within entry', () => {
    const result = appendScheduleEntry(null, [5, 1, 3], '2026-03-01')
    expect(result[0].days).toEqual([1, 3, 5])
  })

  it('does not mutate the original array', () => {
    const existing: ScheduleHistoryEntry[] = [
      { days: [1, 3], effective_from: '2026-03-01' },
    ]
    const result = appendScheduleEntry(existing, [1, 3, 5], '2026-03-15')
    expect(existing).toHaveLength(1)
    expect(result).toHaveLength(2)
  })
})

// ─── isDateScheduled ──────────────────────────────────────
// Day-of-week reference for March 2026:
//   Mon=2,9,16,23,30  Wed=4,11,18,25  Fri=6,13,20,27

describe('isDateScheduled', () => {
  const currentDays = [1, 3, 5] // Mon, Wed, Fri

  it('falls back to currentRaidDays when history is null', () => {
    expect(isDateScheduled('2026-03-02', 1, currentDays, null)).toBe(true) // Mon
    expect(isDateScheduled('2026-03-03', 2, currentDays, null)).toBe(false) // Tue
  })

  it('falls back to currentRaidDays when history is empty', () => {
    expect(isDateScheduled('2026-03-02', 1, currentDays, [])).toBe(true)
  })

  it('returns false for dates before any history entry', () => {
    const history: ScheduleHistoryEntry[] = [
      { days: [1, 3], effective_from: '2026-03-10' },
    ]
    expect(isDateScheduled('2026-03-02', 1, currentDays, history)).toBe(false)
  })

  it('uses first entry for dates on or after effective_from', () => {
    const history: ScheduleHistoryEntry[] = [
      { days: [1, 3], effective_from: '2026-03-01' },
    ]
    expect(isDateScheduled('2026-03-02', 1, currentDays, history)).toBe(true)  // Mon — in schedule
    expect(isDateScheduled('2026-03-04', 3, currentDays, history)).toBe(true)  // Wed — in schedule
    expect(isDateScheduled('2026-03-06', 5, currentDays, history)).toBe(false) // Fri — not in [1,3]
  })

  it('uses correct entry after schedule change', () => {
    const history: ScheduleHistoryEntry[] = [
      { days: [1, 3], effective_from: '2026-03-01' },     // Mon, Wed
      { days: [1, 3, 5], effective_from: '2026-03-15' },  // Mon, Wed, Fri
    ]

    // Before change: Fri not scheduled
    expect(isDateScheduled('2026-03-06', 5, currentDays, history)).toBe(false)
    // After change: Fri scheduled
    expect(isDateScheduled('2026-03-20', 5, currentDays, history)).toBe(true)
    // Mon still scheduled in both periods
    expect(isDateScheduled('2026-03-02', 1, currentDays, history)).toBe(true)
    expect(isDateScheduled('2026-03-16', 1, currentDays, history)).toBe(true)
  })

  it('handles removing a day', () => {
    const history: ScheduleHistoryEntry[] = [
      { days: [1, 3, 5], effective_from: '2026-03-01' },  // Mon, Wed, Fri
      { days: [1, 5], effective_from: '2026-04-01' },     // Mon, Fri (Wed removed)
    ]

    // Before removal: Wed scheduled
    expect(isDateScheduled('2026-03-18', 3, currentDays, history)).toBe(true)
    // After removal: Wed not scheduled (Apr 1 2026 is a Wed btw)
    expect(isDateScheduled('2026-04-01', 3, currentDays, history)).toBe(false)
    // Mon still scheduled after removal
    expect(isDateScheduled('2026-04-06', 1, currentDays, history)).toBe(true)
  })

  it('handles date on exact effective_from boundary', () => {
    const history: ScheduleHistoryEntry[] = [
      { days: [1, 3], effective_from: '2026-03-01' },
      { days: [1, 5], effective_from: '2026-03-15' },
    ]

    // On exact boundary, uses new entry
    expect(isDateScheduled('2026-03-15', 3, currentDays, history)).toBe(false) // Wed removed
    expect(isDateScheduled('2026-03-15', 5, currentDays, history)).toBe(true)  // Fri added
  })

  it('handles multiple schedule changes', () => {
    const history: ScheduleHistoryEntry[] = [
      { days: [1, 3], effective_from: '2026-03-01' },
      { days: [1, 3, 5], effective_from: '2026-03-15' },
      { days: [5], effective_from: '2026-04-01' },
    ]

    // Period 1: Mon+Wed
    expect(isDateScheduled('2026-03-09', 1, currentDays, history)).toBe(true)
    expect(isDateScheduled('2026-03-06', 5, currentDays, history)).toBe(false)

    // Period 2: Mon+Wed+Fri
    expect(isDateScheduled('2026-03-16', 1, currentDays, history)).toBe(true)
    expect(isDateScheduled('2026-03-20', 5, currentDays, history)).toBe(true)

    // Period 3: Fri only
    expect(isDateScheduled('2026-04-06', 1, currentDays, history)).toBe(false)
    expect(isDateScheduled('2026-04-03', 5, currentDays, history)).toBe(true)
  })
})

// ─── filterDatesByScheduleHistory ─────────────────────────
// Uses actual calendar days:
//   2026-03-02=Mon, 03=Tue, 04=Wed, 06=Fri, 09=Mon, 11=Wed, 13=Fri
//   2026-03-16=Mon, 18=Wed, 20=Fri

describe('filterDatesByScheduleHistory', () => {
  const currentDays = [1, 5] // Mon, Fri

  it('filters with null history (backward compat)', () => {
    const dates = ['2026-03-02', '2026-03-03', '2026-03-06'] // Mon, Tue, Fri
    const result = filterDatesByScheduleHistory(dates, currentDays, null)
    expect(result).toEqual(['2026-03-02', '2026-03-06'])
  })

  it('filters respecting schedule history — adding a day mid-window', () => {
    const history: ScheduleHistoryEntry[] = [
      { days: [1], effective_from: '2026-03-01' },        // Mon only
      { days: [1, 5], effective_from: '2026-03-14' },     // Mon + Fri
    ]
    const dates = [
      '2026-03-02', // Mon (period 1) — yes
      '2026-03-06', // Fri (period 1) — no, Fri not scheduled yet
      '2026-03-09', // Mon (period 1) — yes
      '2026-03-16', // Mon (period 2) — yes
      '2026-03-20', // Fri (period 2) — yes, Fri now scheduled
      '2026-03-27', // Fri (period 2) — yes
    ]
    const result = filterDatesByScheduleHistory(dates, currentDays, history)
    expect(result).toEqual([
      '2026-03-02',
      '2026-03-09',
      '2026-03-16',
      '2026-03-20',
      '2026-03-27',
    ])
  })

  it('filters respecting schedule history — removing a day mid-window', () => {
    const history: ScheduleHistoryEntry[] = [
      { days: [1, 5], effective_from: '2026-03-01' },     // Mon + Fri
      { days: [1], effective_from: '2026-03-14' },         // Mon only
    ]
    const dates = [
      '2026-03-02', // Mon — yes
      '2026-03-06', // Fri — yes (before removal)
      '2026-03-09', // Mon — yes
      '2026-03-20', // Fri — no (after removal)
      '2026-03-23', // Mon — yes
      '2026-03-27', // Fri — no
    ]
    const result = filterDatesByScheduleHistory(dates, currentDays, history)
    expect(result).toEqual([
      '2026-03-02',
      '2026-03-06',
      '2026-03-09',
      '2026-03-23',
    ])
  })
})
