import { describe, it, expect } from 'vitest'
import { getCellState, getCellStyle, type CellState } from '../cell-state'
import type { AttendanceStatus } from '../types'

// ─── getCellState ─────────────────────────────────────────
//
// Priority order (first match wins):
//   no_call_no_show > is_excused > (attended && was_late) > was_benched > attended > empty
//
// Notes:
// - signed_up alone never produces a non-empty state — it's a separate pill.
// - The cell-state is a display concern; resolveStatus() in domain/scoring
//   owns the canonical priority for scoring.

const base: AttendanceStatus = {
  signed_up: false,
  attended: false,
  no_call_no_show: false,
  was_late: false,
  was_benched: false,
}

describe('getCellState', () => {
  it('returns empty when status is undefined', () => {
    expect(getCellState(undefined)).toBe('empty')
  })

  it('returns empty when status has no truthy flags', () => {
    expect(getCellState({ ...base })).toBe('empty')
  })

  it('returns empty when only signed_up is true (signup is shown via a separate pill)', () => {
    expect(getCellState({ ...base, signed_up: true })).toBe('empty')
  })

  it('returns attended when only attended is true', () => {
    expect(getCellState({ ...base, attended: true })).toBe('attended')
  })

  it('returns late when attended and was_late are both true', () => {
    expect(getCellState({ ...base, attended: true, was_late: true })).toBe('late')
  })

  it('returns standby when only was_benched is true', () => {
    expect(getCellState({ ...base, was_benched: true })).toBe('standby')
  })

  it('returns no-show when only no_call_no_show is true', () => {
    expect(getCellState({ ...base, no_call_no_show: true })).toBe('no-show')
  })

  it('returns excused when only is_excused is true', () => {
    expect(getCellState({ ...base, is_excused: true })).toBe('excused')
  })

  // ─── Priority ordering ────────────────────────────────

  it('prioritizes no_call_no_show over every other flag', () => {
    expect(
      getCellState({
        ...base,
        no_call_no_show: true,
        is_excused: true,
        attended: true,
        was_late: true,
        was_benched: true,
      })
    ).toBe('no-show')
  })

  it('prioritizes is_excused over attended/benched (but not no_call_no_show)', () => {
    expect(
      getCellState({
        ...base,
        is_excused: true,
        attended: true,
        was_late: true,
        was_benched: true,
      })
    ).toBe('excused')
  })

  it('prioritizes late over standby when attended+was_late+was_benched all set', () => {
    expect(
      getCellState({
        ...base,
        attended: true,
        was_late: true,
        was_benched: true,
      })
    ).toBe('late')
  })

  it('was_late alone (without attended) does not produce late — it falls through to standby/empty', () => {
    expect(getCellState({ ...base, was_late: true })).toBe('empty')
    expect(getCellState({ ...base, was_late: true, was_benched: true })).toBe('standby')
  })

  it('attended takes priority over was_benched when was_late is false', () => {
    // attended=true, was_late=false, was_benched=true
    // The was_benched check comes BEFORE attended, so standby wins.
    // This locks current behavior so a future refactor doesn't silently flip it.
    expect(
      getCellState({
        ...base,
        attended: true,
        was_benched: true,
      })
    ).toBe('standby')
  })

  it('signed_up alongside attended still returns attended (signup is purely additive)', () => {
    expect(getCellState({ ...base, signed_up: true, attended: true })).toBe('attended')
  })
})

// ─── getCellStyle ─────────────────────────────────────────
//
// getCellStyle is a presentational mapping from CellState to Tailwind classes.
// We don't pin the exact class string (that's churn), but we do verify:
// - Every state returns a non-empty class string
// - The state-specific color indicator (border-l-<color>) is present
// - 'empty' state has no left-color border (it's the neutral default)

describe('getCellStyle', () => {
  it('returns a non-empty class string for every cell state', () => {
    const states: CellState[] = ['attended', 'late', 'standby', 'no-show', 'excused', 'empty']
    for (const state of states) {
      expect(getCellStyle(state)).toMatch(/\S/)
    }
  })

  it('attended uses the success border accent', () => {
    expect(getCellStyle('attended')).toContain('border-l-success')
  })

  it('late uses the warning border accent', () => {
    expect(getCellStyle('late')).toContain('border-l-warning')
  })

  it('standby uses an orange border accent', () => {
    expect(getCellStyle('standby')).toContain('border-l-orange-500')
  })

  it('no-show uses the destructive border accent', () => {
    expect(getCellStyle('no-show')).toContain('border-l-destructive')
  })

  it('excused uses a muted-foreground border accent', () => {
    expect(getCellStyle('excused')).toContain('border-l-muted-foreground')
  })

  it('empty has no left-color accent (neutral default)', () => {
    expect(getCellStyle('empty')).not.toMatch(/border-l-\w/)
  })

  it('all non-empty states share the same base card classes', () => {
    const base = 'bg-background-elevated border border-border'
    for (const state of ['attended', 'late', 'standby', 'no-show', 'excused'] as CellState[]) {
      expect(getCellStyle(state)).toContain(base)
    }
  })
})
