import { describe, it, expect } from 'vitest'
import { calculateDonationBonus } from '../donations'
import type { DonationRecord, ScoringConfig } from '../../types'

// ─── Helpers ─────────────────────────────────────────────────

function record(awarded_at: string, points: number): DonationRecord {
  return { awarded_at, points }
}

function enabled(overrides: Partial<ScoringConfig> = {}): Partial<ScoringConfig> {
  return { donation_bonuses_enabled: true, ...overrides }
}

const ASOF = '2026-05-19'

// ─── Disabled / empty ────────────────────────────────────────

describe('calculateDonationBonus — feature gating', () => {
  it('returns 0 when donation_bonuses_enabled is false (default)', () => {
    const records = [record('2026-05-15', 10)]
    expect(calculateDonationBonus(records, {}, ASOF)).toBe(0)
  })

  it('returns 0 when donation_bonuses_enabled is explicitly false', () => {
    const records = [record('2026-05-15', 10)]
    expect(calculateDonationBonus(records, { donation_bonuses_enabled: false }, ASOF)).toBe(0)
  })

  it('returns 0 with empty records even when enabled', () => {
    expect(calculateDonationBonus([], enabled(), ASOF)).toBe(0)
  })
})

// ─── Permanent mode ──────────────────────────────────────────

describe('calculateDonationBonus — permanent decay', () => {
  it('sums all records regardless of age', () => {
    const records = [
      record('2024-01-01', 5),
      record('2025-06-15', 3),
      record('2026-05-15', 2),
    ]
    const sum = calculateDonationBonus(records, enabled({ donation_bonus_type: 'permanent' }), ASOF)
    expect(sum).toBe(10)
  })
})

// ─── Rolling mode ────────────────────────────────────────────

describe('calculateDonationBonus — rolling decay', () => {
  it('includes records within the rolling window', () => {
    // ASOF = 2026-05-19, 4-week window → cutoff = 2026-04-21
    const records = [
      record('2026-05-15', 5),
      record('2026-04-25', 3),
    ]
    const sum = calculateDonationBonus(
      records,
      enabled({ donation_bonus_type: 'rolling', donation_rolling_weeks: 4 }),
      ASOF,
    )
    expect(sum).toBe(8)
  })

  it('excludes records older than the window', () => {
    // 4-week window → cutoff = 2026-04-21. 2026-04-20 is excluded.
    const records = [
      record('2026-05-15', 5),
      record('2026-04-20', 3),
    ]
    const sum = calculateDonationBonus(
      records,
      enabled({ donation_bonus_type: 'rolling', donation_rolling_weeks: 4 }),
      ASOF,
    )
    expect(sum).toBe(5)
  })

  it('includes records on the exact window boundary', () => {
    // 4-week window → cutoff = 2026-04-21. Boundary day is included.
    const records = [record('2026-04-21', 7)]
    const sum = calculateDonationBonus(
      records,
      enabled({ donation_bonus_type: 'rolling', donation_rolling_weeks: 4 }),
      ASOF,
    )
    expect(sum).toBe(7)
  })

  it('falls back to rolling_attendance_weeks when donation_rolling_weeks is null', () => {
    const records = [
      record('2026-05-15', 5),  // within 2 weeks
      record('2026-04-25', 3),  // outside 2 weeks, would be inside 4
    ]
    const sum = calculateDonationBonus(
      records,
      enabled({
        donation_bonus_type: 'rolling',
        donation_rolling_weeks: null,
        rolling_attendance_weeks: 2,
      }),
      ASOF,
    )
    expect(sum).toBe(5)
  })

  it('respects donation_rolling_weeks override over rolling_attendance_weeks', () => {
    const records = [
      record('2026-05-15', 5),
      record('2026-04-25', 3),
    ]
    const sum = calculateDonationBonus(
      records,
      enabled({
        donation_bonus_type: 'rolling',
        donation_rolling_weeks: 2,
        rolling_attendance_weeks: 8,  // would include 2026-04-25 but override wins
      }),
      ASOF,
    )
    expect(sum).toBe(5)
  })
})

// ─── Hard-reset mode ─────────────────────────────────────────

describe('calculateDonationBonus — hard-reset decay', () => {
  it('includes records on or after donation_reset_at', () => {
    const records = [
      record('2026-05-15', 5),
      record('2026-04-01', 3),  // reset anchor
    ]
    const sum = calculateDonationBonus(
      records,
      enabled({ donation_bonus_type: 'hard-reset', donation_reset_at: '2026-04-01' }),
      ASOF,
    )
    expect(sum).toBe(8)
  })

  it('excludes records before donation_reset_at', () => {
    const records = [
      record('2026-05-15', 5),
      record('2026-03-31', 3),  // one day before reset
    ]
    const sum = calculateDonationBonus(
      records,
      enabled({ donation_bonus_type: 'hard-reset', donation_reset_at: '2026-04-01' }),
      ASOF,
    )
    expect(sum).toBe(5)
  })

  it('includes all records when donation_reset_at is null', () => {
    const records = [
      record('2024-01-01', 5),
      record('2026-05-15', 3),
    ]
    const sum = calculateDonationBonus(
      records,
      enabled({ donation_bonus_type: 'hard-reset', donation_reset_at: null }),
      ASOF,
    )
    expect(sum).toBe(8)
  })
})

// ─── Cap ─────────────────────────────────────────────────────

describe('calculateDonationBonus — cap', () => {
  it('caps the sum when cap_enabled and sum exceeds cap', () => {
    const records = [record('2026-05-15', 100)]
    const sum = calculateDonationBonus(
      records,
      enabled({
        donation_bonus_type: 'permanent',
        donation_cap_enabled: true,
        donation_cap_points: 25,
      }),
      ASOF,
    )
    expect(sum).toBe(25)
  })

  it('does not cap when sum is below cap', () => {
    const records = [record('2026-05-15', 10)]
    const sum = calculateDonationBonus(
      records,
      enabled({
        donation_bonus_type: 'permanent',
        donation_cap_enabled: true,
        donation_cap_points: 25,
      }),
      ASOF,
    )
    expect(sum).toBe(10)
  })

  it('cap=0 with cap_enabled zeros positive sums (footgun: must set cap when enabling)', () => {
    const records = [record('2026-05-15', 50)]
    const sum = calculateDonationBonus(
      records,
      enabled({
        donation_bonus_type: 'permanent',
        donation_cap_enabled: true,
        donation_cap_points: 0,
      }),
      ASOF,
    )
    expect(sum).toBe(0)
  })

  it('does not apply cap to negative sums (clawback can produce net negative)', () => {
    const records = [record('2026-05-15', -8)]
    const sum = calculateDonationBonus(
      records,
      enabled({
        donation_bonus_type: 'permanent',
        donation_cap_enabled: true,
        donation_cap_points: 25,
      }),
      ASOF,
    )
    expect(sum).toBe(-8)
  })
})

// ─── Clawback ────────────────────────────────────────────────

describe('calculateDonationBonus — clawback (negative points)', () => {
  it('subtracts negative records from the sum', () => {
    const records = [
      record('2026-05-15', 10),
      record('2026-05-16', -3),
    ]
    const sum = calculateDonationBonus(
      records,
      enabled({ donation_bonus_type: 'permanent' }),
      ASOF,
    )
    expect(sum).toBe(7)
  })

  it('can produce a net-negative bonus', () => {
    const records = [
      record('2026-05-15', 3),
      record('2026-05-16', -5),
    ]
    const sum = calculateDonationBonus(
      records,
      enabled({ donation_bonus_type: 'permanent' }),
      ASOF,
    )
    expect(sum).toBe(-2)
  })
})

// ─── Default config wiring ───────────────────────────────────

describe('calculateDonationBonus — default config', () => {
  it('uses DEFAULT_SETTINGS when fields are omitted (donations off by default)', () => {
    const records = [record('2026-05-15', 50)]
    expect(calculateDonationBonus(records, {}, ASOF)).toBe(0)
  })
})
