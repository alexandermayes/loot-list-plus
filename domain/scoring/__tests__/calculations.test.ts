import { describe, it, expect } from 'vitest'
import {
  calculateAttendanceScore,
  getRankModifier,
  getRoleModifier,
  getRoleModifierWithLabel,
  calculateLootScore,
  getTrialPenalty,
  calculateBadLuckBonus,
  calculatePriorityBonus,
  getDefaultSettings,
} from '@/domain/scoring'
import {
  attended, signedUpOnly, ncns, absent, late, benched, excused,
  DEFAULT_PPR_SETTINGS, DEFAULT_LINEAR_SETTINGS, DEFAULT_BREAKPOINT_SETTINGS,
  LOOT_SCORE_FIXTURES,
} from './fixtures'

// ─── calculateAttendanceScore ────────────────────────────────

describe('calculateAttendanceScore', () => {
  describe('edge cases', () => {
    it('returns 0 for empty records', () => {
      expect(calculateAttendanceScore([], 4)).toBe(0)
    })

    it('returns 0 for zero totalRaids', () => {
      expect(calculateAttendanceScore([attended()], 0)).toBe(0)
    })

    it('returns 0 when all records are NCNS', () => {
      expect(calculateAttendanceScore([ncns(), ncns()], 2)).toBe(0)
    })
  })

  describe('points-per-raid mode', () => {
    const settings = DEFAULT_PPR_SETTINGS

    it('gives 0.75 for attended-only raid', () => {
      expect(calculateAttendanceScore([attended(false)], 1, settings)).toBe(0.75)
    })

    it('gives 0.25 for signed-up-only raid', () => {
      expect(calculateAttendanceScore([signedUpOnly()], 1, settings)).toBe(0.25)
    })

    it('caps per-raid at 1.0 for attended + signed up', () => {
      expect(calculateAttendanceScore([attended(true)], 1, settings)).toBe(1.0)
    })

    it('sums across multiple raids', () => {
      const records = [attended(true), attended(false), signedUpOnly()]
      // raid 1: 1.0 (attended+signup), raid 2: 0.75 (attended), raid 3: 0.25 (signup)
      expect(calculateAttendanceScore(records, 3, settings)).toBe(2.0)
    })

    it('skips NCNS raids entirely', () => {
      const records = [attended(true), ncns()]
      // raid 1: 1.0, raid 2: skipped
      expect(calculateAttendanceScore(records, 2, settings)).toBe(1.0)
    })

    it('caps total at max_attendance_bonus', () => {
      const records = Array(10).fill(attended(true))
      // 10 raids × 1.0 = 10, capped at 4
      expect(calculateAttendanceScore(records, 10, settings)).toBe(4)
    })

    it('gives 0 for absent (not signed up, not attended, not NCNS)', () => {
      expect(calculateAttendanceScore([absent()], 1, settings)).toBe(0)
    })

    it('respects custom signup_weight', () => {
      const custom = { ...settings, signup_weight: 0.5 }
      // attended-only: 1 - 0.5 = 0.5
      expect(calculateAttendanceScore([attended(false)], 1, custom)).toBe(0.5)
      // signup-only: 0.5
      expect(calculateAttendanceScore([signedUpOnly()], 1, custom)).toBe(0.5)
    })

    it('respects custom max_attendance_bonus', () => {
      const custom = { ...settings, max_attendance_bonus: 2 }
      const records = Array(5).fill(attended(true))
      expect(calculateAttendanceScore(records, 5, custom)).toBe(2)
    })
  })

  describe('linear mode', () => {
    const settings = DEFAULT_LINEAR_SETTINGS

    it('scales linearly with attendance percentage', () => {
      // 2/4 raids attended = 50% × 4 = 2.0
      const records = [attended(), attended(), absent(), absent()]
      expect(calculateAttendanceScore(records, 4, settings)).toBe(2.0)
    })

    it('gives max bonus at 100% attendance', () => {
      const records = [attended(), attended(), attended(), attended()]
      expect(calculateAttendanceScore(records, 4, settings)).toBe(4.0)
    })

    it('adds signup bonus when use_signups enabled', () => {
      // 0 attended, 2 signed up, 4 total
      // base: 0/4 × 4 = 0
      // signup: 2/4 × 4 × 0.25 = 0.5
      const records = [signedUpOnly(), signedUpOnly(), absent(), absent()]
      expect(calculateAttendanceScore(records, 4, settings)).toBe(0.5)
    })

    it('caps at max_attendance_bonus with signup', () => {
      // 4 attended + 4 signed up
      // base: 4/4 × 4 = 4
      // signup: 4/4 × 4 × 0.25 = 1
      // total: 5, capped at 4
      const records = Array(4).fill(attended(true))
      expect(calculateAttendanceScore(records, 4, settings)).toBe(4)
    })

    it('ignores signups when use_signups disabled', () => {
      const noSignups = { ...settings, use_signups: false }
      const records = [signedUpOnly(), signedUpOnly()]
      // 0 attended, signups ignored
      expect(calculateAttendanceScore(records, 2, noSignups)).toBe(0)
    })

    it('skips NCNS from attended count', () => {
      // 1 attended, 1 NCNS, totalRaids=2
      // attended: 1/2 = 50% × 4 = 2.0
      const records = [attended(), ncns()]
      expect(calculateAttendanceScore(records, 2, settings)).toBe(2.0)
    })
  })

  describe('breakpoint mode', () => {
    const settings = DEFAULT_BREAKPOINT_SETTINGS

    it('gives max bonus at 90%+', () => {
      const records = Array(9).fill(attended())
      expect(calculateAttendanceScore(records, 10, settings)).toBe(4)
    })

    it('gives middle bonus at 50-89%', () => {
      const records = Array(5).fill(attended())
      expect(calculateAttendanceScore(records, 10, settings)).toBe(2)
    })

    it('gives bottom bonus at 25-49%', () => {
      const records = Array(3).fill(attended())
      expect(calculateAttendanceScore(records, 10, settings)).toBe(1)
    })

    it('gives 0 below 25%', () => {
      const records = Array(2).fill(attended())
      expect(calculateAttendanceScore(records, 10, settings)).toBe(0)
    })

    it('boundary: exactly 90% gives max', () => {
      const records = Array(9).fill(attended())
      // 9/10 = 0.9 >= 0.9 threshold
      expect(calculateAttendanceScore(records, 10, settings)).toBe(4)
    })

    it('boundary: 89.9% gives middle', () => {
      // 89/100 = 0.89 < 0.9 threshold
      const records = Array(89).fill(attended())
      expect(calculateAttendanceScore(records, 100, settings)).toBe(2)
    })

    it('boundary: exactly 50% gives middle', () => {
      const records = Array(5).fill(attended())
      expect(calculateAttendanceScore(records, 10, settings)).toBe(2)
    })

    it('boundary: exactly 25% gives bottom', () => {
      // 1/4 = 0.25 >= 0.25 threshold
      const records = [attended(), absent(), absent(), absent()]
      expect(calculateAttendanceScore(records, 4, settings)).toBe(1)
    })

    it('NCNS excluded from attended count but not totalRaids', () => {
      // 1 attended, 1 NCNS, totalRaids=4
      // attended count: 1 (NCNS skipped from count)
      // percentage: 1/4 = 25% → bottom bonus
      const records = [attended(), ncns(), absent(), absent()]
      expect(calculateAttendanceScore(records, 4, settings)).toBe(1)
    })
  })

  describe('defaults', () => {
    it('uses points-per-raid as default when no settings provided', () => {
      // Default mode is points-per-raid with signup_weight 0.25
      const result = calculateAttendanceScore([attended(true)], 1)
      expect(result).toBe(1.0)
    })
  })
})

// ─── getRankModifier ─────────────────────────────────────────

describe('getRankModifier', () => {
  it('returns 0 when guild_rank_bonuses_enabled is false', () => {
    expect(getRankModifier('Officer', { guild_rank_bonuses_enabled: false })).toBe(0)
  })

  it('returns modifier for known role', () => {
    const settings = {
      guild_rank_bonuses_enabled: true,
      rank_modifiers: { 'Officer': 2, 'Trial': -1 },
    }
    expect(getRankModifier('Officer', settings)).toBe(2)
    expect(getRankModifier('Trial', settings)).toBe(-1)
  })

  it('returns 0 for unknown role', () => {
    const settings = {
      guild_rank_bonuses_enabled: true,
      rank_modifiers: { 'Officer': 2 },
    }
    expect(getRankModifier('UnknownRole', settings)).toBe(0)
  })

  it('uses default rank_modifiers when none provided', () => {
    // Default has 'Yiker': -1
    expect(getRankModifier('Yiker')).toBe(-1)
  })
})

// ─── getRoleModifier ─────────────────────────────────────────

describe('getRoleModifier', () => {
  const enabledSettings = {
    raid_roles_overall_bonus_priority: true,
    role_modifiers: { tank: 3, healer: 2, physical: 1 },
  }

  it('returns 0 when raid_roles_overall_bonus_priority is false', () => {
    expect(getRoleModifier('tank', { raid_roles_overall_bonus_priority: false })).toBe(0)
  })

  it('returns 0 for null roles', () => {
    expect(getRoleModifier(null, enabledSettings)).toBe(0)
  })

  it('returns 0 for empty array', () => {
    expect(getRoleModifier([], enabledSettings)).toBe(0)
  })

  it('returns modifier for single role string', () => {
    expect(getRoleModifier('tank', enabledSettings)).toBe(3)
  })

  it('returns modifier for single-element array', () => {
    expect(getRoleModifier(['healer'], enabledSettings)).toBe(2)
  })

  it('picks highest bonus from multiple roles', () => {
    expect(getRoleModifier(['physical', 'tank'], enabledSettings)).toBe(3)
  })

  it('returns 0 for roles not in modifiers', () => {
    expect(getRoleModifier('caster', enabledSettings)).toBe(0)
  })
})

// ─── getRoleModifierWithLabel ────────────────────────────────

describe('getRoleModifierWithLabel', () => {
  const enabledSettings = {
    raid_roles_overall_bonus_priority: true,
    role_modifiers: { tank: 3, healer: 2 },
  }

  it('returns bonus and matched role name', () => {
    const result = getRoleModifierWithLabel('tank', enabledSettings)
    expect(result.bonus).toBe(3)
    expect(result.matchedRole).toBe('tank')
  })

  it('picks highest and returns its name', () => {
    const result = getRoleModifierWithLabel(['healer', 'tank'], enabledSettings)
    expect(result.bonus).toBe(3)
    expect(result.matchedRole).toBe('tank')
  })

  it('returns 0 and null when disabled', () => {
    const result = getRoleModifierWithLabel('tank', { raid_roles_overall_bonus_priority: false })
    expect(result.bonus).toBe(0)
    expect(result.matchedRole).toBeNull()
  })

  it('returns 0 and null for null roles', () => {
    const result = getRoleModifierWithLabel(null, enabledSettings)
    expect(result.bonus).toBe(0)
    expect(result.matchedRole).toBeNull()
  })
})

// ─── calculateLootScore ──────────────────────────────────────

describe('calculateLootScore', () => {
  it('sums all 7 components', () => {
    expect(calculateLootScore(50, 3, -1, 2, 5, -2, 1)).toBe(58)
  })

  it('defaults optional params to 0', () => {
    expect(calculateLootScore(50, 3, 0)).toBe(53)
  })

  it('handles negative total', () => {
    expect(calculateLootScore(1, 0, -4, 0, 0, -2, 0)).toBe(-5)
  })

  it.each(LOOT_SCORE_FIXTURES)('fixture: $name', ({ input, expected }) => {
    const result = calculateLootScore(
      input.itemRank,
      input.attendanceScore,
      input.rankModifier,
      input.badLuckBonus,
      input.priorityBonus,
      input.trialPenalty,
      input.roleBonus,
    )
    expect(result).toBe(expected)
  })
})

// ─── getTrialPenalty ─────────────────────────────────────────

describe('getTrialPenalty', () => {
  it('returns 0 when trial_penalty_enabled is false', () => {
    expect(getTrialPenalty('trial', { trial_penalty_enabled: false })).toBe(0)
  })

  it('returns 0 for full members even when enabled', () => {
    expect(getTrialPenalty('full', { trial_penalty_enabled: true, trial_penalty_value: -2 })).toBe(0)
  })

  it('returns penalty for trial members when enabled', () => {
    expect(getTrialPenalty('trial', { trial_penalty_enabled: true, trial_penalty_value: -2 })).toBe(-2)
  })

  it('uses default penalty value when not specified', () => {
    // Default: trial_penalty_enabled: false, so returns 0
    expect(getTrialPenalty('trial')).toBe(0)
  })

  it('returns 0 for unknown membership status', () => {
    expect(getTrialPenalty('veteran', { trial_penalty_enabled: true, trial_penalty_value: -2 })).toBe(0)
  })
})

// ─── calculateBadLuckBonus ───────────────────────────────────

describe('calculateBadLuckBonus', () => {
  it('returns 0 when blp_enabled is false', () => {
    expect(calculateBadLuckBonus(5, { blp_enabled: false })).toBe(0)
  })

  it('returns 0 for zero passes', () => {
    expect(calculateBadLuckBonus(0, { blp_enabled: true })).toBe(0)
  })

  it('returns 0 for negative passes', () => {
    expect(calculateBadLuckBonus(-1, { blp_enabled: true })).toBe(0)
  })

  it('scales linearly with passes', () => {
    const settings = { blp_enabled: true, blp_increment: 1, blp_maximum: 5 }
    expect(calculateBadLuckBonus(1, settings)).toBe(1)
    expect(calculateBadLuckBonus(3, settings)).toBe(3)
  })

  it('caps at blp_maximum', () => {
    const settings = { blp_enabled: true, blp_increment: 1, blp_maximum: 5 }
    expect(calculateBadLuckBonus(10, settings)).toBe(5)
  })

  it('respects custom increment', () => {
    const settings = { blp_enabled: true, blp_increment: 2, blp_maximum: 10 }
    expect(calculateBadLuckBonus(3, settings)).toBe(6)
  })

  it('caps with custom increment', () => {
    const settings = { blp_enabled: true, blp_increment: 2, blp_maximum: 5 }
    expect(calculateBadLuckBonus(10, settings)).toBe(5)
  })

  it('uses defaults when settings not provided', () => {
    // Default: blp_enabled: false → returns 0
    expect(calculateBadLuckBonus(5)).toBe(0)
  })
})

// ─── calculatePriorityBonus ──────────────────────────────────

describe('calculatePriorityBonus', () => {
  it('returns 0 for null priority', () => {
    expect(calculatePriorityBonus(null, 'char1', 'spec1', 'tank')).toBe(0)
  })

  it('returns 0 for undefined priority', () => {
    expect(calculatePriorityBonus(undefined, 'char1', 'spec1', 'tank')).toBe(0)
  })

  it('adds role priority as direct points', () => {
    const priority = {
      role_priorities: { tank: 5 },
      class_priorities: {},
      character_priorities: {},
      priority_bonuses: { role: 5, class: 3, character: 2 },
    }
    expect(calculatePriorityBonus(priority, 'char1', null, 'tank')).toBe(5)
  })

  it('supports fractional role priority values', () => {
    const priority = {
      role_priorities: { tank: 2.5 },
      class_priorities: {},
      character_priorities: {},
      priority_bonuses: { role: 5, class: 3, character: 2 },
    }
    expect(calculatePriorityBonus(priority, 'char1', null, 'tank')).toBe(2.5)
  })

  it('adds class/spec priority as direct points', () => {
    const priority = {
      role_priorities: {},
      class_priorities: { 'spec-uuid': 3 },
      character_priorities: {},
      priority_bonuses: { role: 5, class: 3, character: 2 },
    }
    expect(calculatePriorityBonus(priority, 'char1', 'spec-uuid', null)).toBe(3)
  })

  it('adds character priority as direct points', () => {
    const priority = {
      role_priorities: {},
      class_priorities: {},
      character_priorities: { 'char1': 1 },
      priority_bonuses: { role: 5, class: 3, character: 2 },
    }
    expect(calculatePriorityBonus(priority, 'char1', null, null)).toBe(1)
  })

  it('stacks role + class + character bonuses additively', () => {
    const priority = {
      role_priorities: { tank: 5 },
      class_priorities: { 'spec-uuid': 3 },
      character_priorities: { 'char1': 2 },
      priority_bonuses: { role: 5, class: 3, character: 2 },
    }
    // 5 + 3 + 2 = 10
    expect(calculatePriorityBonus(priority, 'char1', 'spec-uuid', 'tank')).toBe(10)
  })

  it('supports negative priority values as penalties', () => {
    const priority = {
      role_priorities: { tank: -1 },
      class_priorities: {},
      character_priorities: {},
      priority_bonuses: { role: 5, class: 3, character: 2 },
    }
    expect(calculatePriorityBonus(priority, 'char1', null, 'tank')).toBe(-1)
  })

  it('returns 0 when role not in role_priorities', () => {
    const priority = {
      role_priorities: { healer: 1 },
      class_priorities: {},
      character_priorities: {},
      priority_bonuses: { role: 5, class: 3, character: 2 },
    }
    expect(calculatePriorityBonus(priority, 'char1', null, 'tank')).toBe(0)
  })

  it('handles null role and null specId', () => {
    const priority = {
      role_priorities: { tank: 1 },
      class_priorities: { 'spec': 1 },
      character_priorities: {},
      priority_bonuses: { role: 5, class: 3, character: 2 },
    }
    expect(calculatePriorityBonus(priority, 'char1', null, null)).toBe(0)
  })
})

// ─── getDefaultSettings ──────────────────────────────────────

describe('getDefaultSettings', () => {
  it('returns an object with expected default values', () => {
    const defaults = getDefaultSettings()
    expect(defaults.attendance_type).toBe('points-per-raid')
    expect(defaults.rolling_attendance_weeks).toBe(4)
    expect(defaults.signup_weight).toBe(0.25)
    expect(defaults.max_attendance_bonus).toBe(4)
    expect(defaults.blp_enabled).toBe(false)
    expect(defaults.trial_penalty_enabled).toBe(false)
  })
})

// ─── Late/benched attendance scoring ──────────────────────────

describe('calculateAttendanceScore (late/benched)', () => {
  const PPR_SETTINGS = {
    ...DEFAULT_PPR_SETTINGS,
    late_early_penalty_enabled: true,
    late_early_penalty_value: 0.25,
  }

  it('gives benched raiders full attendance credit', () => {
    // 4 raids: 2 attended, 2 benched. All should count as attended.
    const records = [attended(), attended(), benched(), benched()]
    const score = calculateAttendanceScore(records, 4, PPR_SETTINGS)
    // Each raid = 0.75 attendance + 0 signup = 0.75 (no signup)
    // 4 * 0.75 = 3.0
    expect(score).toBe(3)
  })

  it('gives benched+signed_up raiders full credit', () => {
    const records = [benched(true), benched(true)]
    const score = calculateAttendanceScore(records, 2, PPR_SETTINGS)
    // Each raid = 0.75 attendance + 0.25 signup = 1.0
    // 2 * 1.0 = 2.0
    expect(score).toBe(2)
  })

  it('applies late penalty when enabled', () => {
    // 2 raids: 1 normal, 1 late. Penalty = 0.25
    const records = [attended(), late()]
    const score = calculateAttendanceScore(records, 2, PPR_SETTINGS)
    // Normal: 0.75, Late: 0.75 - 0.25 = 0.50
    // Total = 1.25
    expect(score).toBe(1.25)
  })

  it('does not apply late penalty when disabled', () => {
    const records = [attended(), late()]
    const score = calculateAttendanceScore(records, 2, {
      ...PPR_SETTINGS,
      late_early_penalty_enabled: false,
    })
    // No penalty: both get 0.75
    expect(score).toBe(1.5)
  })

  it('late+signed_up still gets signup credit', () => {
    const records = [late(true)]
    const score = calculateAttendanceScore(records, 1, PPR_SETTINGS)
    // Attendance: 0.75 - 0.25 = 0.50, signup: 0.25 = 0.75
    expect(score).toBe(0.75)
  })

  it('benched raiders are not penalized like absent ones', () => {
    // Benched should score higher than absent
    const benchedScore = calculateAttendanceScore([benched()], 1, PPR_SETTINGS)
    const absentScore = calculateAttendanceScore([absent()], 1, PPR_SETTINGS)
    expect(benchedScore).toBeGreaterThan(absentScore)
  })

  it('ncns still excluded from scoring (not affected by benched change)', () => {
    const records = [ncns(), benched()]
    const score = calculateAttendanceScore(records, 2, PPR_SETTINGS)
    // NCNS = 0 (skipped), benched = 0.75. Total = 0.75
    expect(score).toBe(0.75)
  })

  it('excused absence excluded from denominator (raid doesnt count)', () => {
    // 2 attended, 1 excused, 3 total raids
    // Effective total = 3 - 1 = 2. Score = 2 * 0.75 = 1.5
    const records = [attended(), attended(), excused()]
    const score = calculateAttendanceScore(records, 3, PPR_SETTINGS)
    expect(score).toBe(1.5)
  })

  it('excused absence gives same score as if raid never happened', () => {
    // 2 attended out of 2 raids (no excused)
    const scoreWithout = calculateAttendanceScore([attended(), attended()], 2, PPR_SETTINGS)
    // 2 attended + 1 excused out of 3 raids
    const scoreWith = calculateAttendanceScore([attended(), attended(), excused()], 3, PPR_SETTINGS)
    expect(scoreWith).toBe(scoreWithout)
  })

  it('points_override replaces computed points for a record', () => {
    // 1 attended (0.75) + 1 with override (0.5) = 1.25
    const records = [
      attended(),
      { ...attended(), points_override: 0.5 },
    ]
    const score = calculateAttendanceScore(records, 2, PPR_SETTINGS)
    expect(score).toBe(1.25)
  })

  it('points_override of 0 gives zero credit for that raid', () => {
    const records = [
      attended(),
      { ...attended(), points_override: 0 },
    ]
    const score = calculateAttendanceScore(records, 2, PPR_SETTINGS)
    expect(score).toBe(0.75)
  })

  it('points_override null falls through to computed scoring', () => {
    const records = [
      attended(),
      { ...attended(), points_override: null },
    ]
    const score = calculateAttendanceScore(records, 2, PPR_SETTINGS)
    // Both get full computed points: 2 * 0.75 = 1.5
    expect(score).toBe(1.5)
  })
})

// ─── Late penalty in linear / breakpoint modes ───────────────

describe('calculateAttendanceScore — late penalty across modes', () => {
  describe('linear mode', () => {
    const settings = {
      ...DEFAULT_LINEAR_SETTINGS,
      late_early_penalty_enabled: true,
      late_early_penalty_value: 0.25,
    }

    it('subtracts per-raid penalty from numerator', () => {
      // 3 attended + 1 late, denominator 4
      // Without penalty: 4/4 = 100% → 4.0
      // With penalty: (4 - 1*0.25)/4 = 3.75/4 = 0.9375 → 0.9375 * 4 = 3.75
      const records = [attended(), attended(), attended(), late()]
      expect(calculateAttendanceScore(records, 4, settings)).toBe(3.75)
    })

    it('stacks penalty across multiple late raids', () => {
      // 2 late, 2 attended, denominator 4
      // (4 - 2*0.25)/4 = 3.5/4 = 0.875 → 0.875 * 4 = 3.5
      const records = [attended(), attended(), late(), late()]
      expect(calculateAttendanceScore(records, 4, settings)).toBe(3.5)
    })

    it('no penalty when disabled', () => {
      const noPenalty = { ...settings, late_early_penalty_enabled: false }
      const records = [attended(), attended(), attended(), late()]
      // Late counts as full attended → 4/4 = 100% → 4.0
      expect(calculateAttendanceScore(records, 4, noPenalty)).toBe(4)
    })

    it('benched + late gets full credit (no penalty on bench)', () => {
      // Benched is not actually present, so being marked late doesn't penalize.
      const benchedLate = { signed_up: false, attended: false, no_call_no_show: false, was_benched: true, was_late: true }
      const records = [attended(), attended(), attended(), benchedLate]
      // All 4 count fully → 4/4 = 100% → 4.0
      expect(calculateAttendanceScore(records, 4, settings)).toBe(4)
    })

    it('floors at 0 when penalty exceeds attended count', () => {
      // 1 late, denominator 4, penalty 2.0 → adjusted = max(0, 1 - 2) = 0
      const records = [late()]
      const big = { ...settings, late_early_penalty_value: 2.0 }
      expect(calculateAttendanceScore(records, 4, big)).toBe(0)
    })

    it('signup bonus still computed from unpenalized signup count', () => {
      // 1 late+signed, denominator 1
      // base: (1 - 0.25)/1 = 0.75 → 0.75 * 4 = 3.0
      // signup: 1/1 * 4 * 0.25 = 1.0
      // total: 4.0 (capped)
      const records = [late(true)]
      expect(calculateAttendanceScore(records, 1, settings)).toBe(4)
    })
  })

  describe('breakpoint mode', () => {
    const settings = {
      ...DEFAULT_BREAKPOINT_SETTINGS,
      late_early_penalty_enabled: true,
      late_early_penalty_value: 0.25,
    }

    it('late raids can drop a raider below a threshold', () => {
      // 9/10 attended, 1 late → (9 - 0.25)/10 = 0.875 → middle bracket (2)
      const records = [
        attended(), attended(), attended(), attended(), attended(),
        attended(), attended(), attended(), late(),
      ]
      expect(calculateAttendanceScore(records, 10, settings)).toBe(2)
    })

    it('without late penalty, same records hit max bracket', () => {
      const noPenalty = { ...settings, late_early_penalty_enabled: false }
      const records = [
        attended(), attended(), attended(), attended(), attended(),
        attended(), attended(), attended(), late(),
      ]
      // 9/10 = 90% → max
      expect(calculateAttendanceScore(records, 10, noPenalty)).toBe(4)
    })

    it('multiple late raids accumulate penalty', () => {
      // 10 attended, 4 of them late → (10 - 4*0.25)/10 = 9/10 = 90% → max
      // One more late → (10 - 5*0.25)/10 = 8.75/10 = 87.5% → middle
      const fourLate = [
        attended(), attended(), attended(), attended(), attended(),
        attended(), late(), late(), late(), late(),
      ]
      expect(calculateAttendanceScore(fourLate, 10, settings)).toBe(4)

      const fiveLate = [
        attended(), attended(), attended(), attended(), attended(),
        late(), late(), late(), late(), late(),
      ]
      expect(calculateAttendanceScore(fiveLate, 10, settings)).toBe(2)
    })
  })
})
