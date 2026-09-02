import { describe, it, expect } from 'vitest'
import { resolveRollingWeeks, resolveRaidDays, resolveRaidDaySettings, validateRollingWeeksOverride, MAX_ROLLING_WEEKS_OVERRIDE } from '../settings'
import type { RaidDaysOverride } from '../types'

// ─── validateRollingWeeksOverride ──────────────────────────

describe('validateRollingWeeksOverride', () => {
  it('accepts null as "inherit the guild setting"', () => {
    expect(validateRollingWeeksOverride(null)).toEqual({ ok: true, value: null })
  })

  it('accepts undefined as "inherit the guild setting"', () => {
    expect(validateRollingWeeksOverride(undefined)).toEqual({ ok: true, value: null })
  })

  it('rejects 0 — a zero-week window zeroes the whole team', () => {
    const result = validateRollingWeeksOverride(0)
    expect(result.ok).toBe(false)
  })

  it('rejects negatives', () => {
    expect(validateRollingWeeksOverride(-1).ok).toBe(false)
  })

  it('accepts the boundary values', () => {
    expect(validateRollingWeeksOverride(1)).toEqual({ ok: true, value: 1 })
    expect(validateRollingWeeksOverride(MAX_ROLLING_WEEKS_OVERRIDE))
      .toEqual({ ok: true, value: MAX_ROLLING_WEEKS_OVERRIDE })
  })

  it('rejects one past the upper boundary', () => {
    expect(validateRollingWeeksOverride(MAX_ROLLING_WEEKS_OVERRIDE + 1).ok).toBe(false)
  })

  it('rejects non-integers and non-numbers', () => {
    expect(validateRollingWeeksOverride(2.5).ok).toBe(false)
    expect(validateRollingWeeksOverride('4').ok).toBe(false)
    expect(validateRollingWeeksOverride(NaN).ok).toBe(false)
  })
})

// ─── resolveRollingWeeks ───────────────────────────────────

describe('resolveRollingWeeks', () => {
  it('returns guild setting when team override is null', () => {
    expect(resolveRollingWeeks(4, null)).toBe(4)
  })

  it('returns guild setting when team override is undefined', () => {
    expect(resolveRollingWeeks(4, undefined)).toBe(4)
  })

  it('returns team override when provided', () => {
    expect(resolveRollingWeeks(4, 8)).toBe(8)
  })

  it('inherits the guild setting when the override is 0', () => {
    // A zero-week window makes the attendance denominator 0, which silently
    // zeroes every raider on the team ("0 of 0 raids") on team-scoped
    // surfaces. 0 is what an empty number stepper produces, not an intent.
    expect(resolveRollingWeeks(4, 0)).toBe(4)
  })

  it('inherits the guild setting when the override is negative', () => {
    expect(resolveRollingWeeks(4, -1)).toBe(4)
  })

  it('returns the smallest meaningful override', () => {
    expect(resolveRollingWeeks(4, 1)).toBe(1)
  })
})

// ─── resolveRaidDays ───────────────────────────────────────

const guildSettings = {
  raid_days_per_week: 2,
  first_raid_day: 2,    // Tuesday
  second_raid_day: 4,   // Thursday
  third_raid_day: null,
  fourth_raid_day: null,
  fifth_raid_day: null,
}

describe('resolveRaidDays', () => {
  it('returns guild raid days when no team override', () => {
    expect(resolveRaidDays(guildSettings, null)).toEqual([2, 4])
  })

  it('returns guild raid days when team override is undefined', () => {
    expect(resolveRaidDays(guildSettings, undefined)).toEqual([2, 4])
  })

  it('overrides specific raid days from team', () => {
    const override: RaidDaysOverride = {
      first_raid_day: 3,  // Wednesday instead of Tuesday
    }
    expect(resolveRaidDays(guildSettings, override)).toEqual([3, 4])
  })

  it('overrides raid days per week (more days)', () => {
    const override: RaidDaysOverride = {
      raid_days_per_week: 3,
      third_raid_day: 0,  // Sunday
    }
    expect(resolveRaidDays(guildSettings, override)).toEqual([2, 4, 0])
  })

  it('overrides raid days per week (fewer days)', () => {
    const override: RaidDaysOverride = {
      raid_days_per_week: 1,
    }
    expect(resolveRaidDays(guildSettings, override)).toEqual([2])
  })

  it('fully replaces all raid day fields', () => {
    const override: RaidDaysOverride = {
      raid_days_per_week: 2,
      first_raid_day: 3,   // Wednesday
      second_raid_day: 0,  // Sunday
    }
    expect(resolveRaidDays(guildSettings, override)).toEqual([3, 0])
  })

  it('handles guild with no configured days gracefully', () => {
    const emptyGuild = {
      raid_days_per_week: 0,
      first_raid_day: null,
      second_raid_day: null,
      third_raid_day: null,
      fourth_raid_day: null,
      fifth_raid_day: null,
    }
    expect(resolveRaidDays(emptyGuild, null)).toEqual([])
  })
})

// ─── resolveRaidDaySettings ────────────────────────────────

describe('resolveRaidDaySettings', () => {
  it('returns guild settings when no override', () => {
    expect(resolveRaidDaySettings(guildSettings, null)).toEqual(guildSettings)
  })

  it('merges partial override on top of guild settings', () => {
    const override: RaidDaysOverride = { first_raid_day: 3 }
    const result = resolveRaidDaySettings(guildSettings, override)
    expect(result.first_raid_day).toBe(3)
    expect(result.second_raid_day).toBe(4) // unchanged
    expect(result.raid_days_per_week).toBe(2) // unchanged
  })
})
