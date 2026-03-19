/**
 * Tests that verify domain/scoring exports work correctly.
 * These import from @/domain/scoring (the new path) and must produce
 * identical results to the golden tests in utils/__tests__/calculations.test.ts.
 */
import { describe, it, expect } from 'vitest'
import {
  calculateAttendanceScore,
  calculateLootScore,
  getRankModifier,
  getRoleModifier,
  getRoleModifierWithLabel,
  getTrialPenalty,
  calculateBadLuckBonus,
  calculatePriorityBonus,
  getDefaultSettings,
} from '@/domain/scoring'
import type { ItemPriority } from '@/domain/scoring'
import {
  attended, signedUpOnly, ncns, absent,
  DEFAULT_PPR_SETTINGS, DEFAULT_LINEAR_SETTINGS, DEFAULT_BREAKPOINT_SETTINGS,
  LOOT_SCORE_FIXTURES,
} from '@/utils/__tests__/fixtures'

describe('domain/scoring (parity with utils/calculations)', () => {
  describe('calculateAttendanceScore - points-per-raid', () => {
    const settings = DEFAULT_PPR_SETTINGS

    it('attended-only = 0.75', () => {
      expect(calculateAttendanceScore([attended(false)], 1, settings)).toBe(0.75)
    })

    it('signup-only = 0.25', () => {
      expect(calculateAttendanceScore([signedUpOnly()], 1, settings)).toBe(0.25)
    })

    it('attended+signup capped at 1.0', () => {
      expect(calculateAttendanceScore([attended(true)], 1, settings)).toBe(1.0)
    })

    it('NCNS skipped', () => {
      expect(calculateAttendanceScore([ncns()], 1, settings)).toBe(0)
    })

    it('total capped at max_attendance_bonus', () => {
      expect(calculateAttendanceScore(Array(10).fill(attended(true)), 10, settings)).toBe(4)
    })
  })

  describe('calculateAttendanceScore - linear', () => {
    it('scales linearly', () => {
      const records = [attended(), attended(), absent(), absent()]
      expect(calculateAttendanceScore(records, 4, DEFAULT_LINEAR_SETTINGS)).toBe(2.0)
    })
  })

  describe('calculateAttendanceScore - breakpoint', () => {
    it('90%+ = max bonus', () => {
      expect(calculateAttendanceScore(Array(9).fill(attended()), 10, DEFAULT_BREAKPOINT_SETTINGS)).toBe(4)
    })

    it('50-89% = middle bonus', () => {
      expect(calculateAttendanceScore(Array(5).fill(attended()), 10, DEFAULT_BREAKPOINT_SETTINGS)).toBe(2)
    })

    it('below 25% = 0', () => {
      expect(calculateAttendanceScore(Array(2).fill(attended()), 10, DEFAULT_BREAKPOINT_SETTINGS)).toBe(0)
    })
  })

  describe('calculateLootScore', () => {
    it.each(LOOT_SCORE_FIXTURES)('fixture: $name', ({ input, expected }) => {
      expect(calculateLootScore(
        input.itemRank, input.attendanceScore, input.rankModifier,
        input.badLuckBonus, input.priorityBonus, input.trialPenalty, input.roleBonus,
      )).toBe(expected)
    })
  })

  describe('modifiers', () => {
    it('getRankModifier returns 0 when disabled', () => {
      expect(getRankModifier('Officer', { guild_rank_bonuses_enabled: false })).toBe(0)
    })

    it('getRoleModifier picks highest from array', () => {
      const s = { raid_roles_overall_bonus_priority: true, role_modifiers: { tank: 3, healer: 2 } }
      expect(getRoleModifier(['healer', 'tank'], s)).toBe(3)
    })

    it('getRoleModifierWithLabel returns matched role', () => {
      const s = { raid_roles_overall_bonus_priority: true, role_modifiers: { tank: 3 } }
      expect(getRoleModifierWithLabel('tank', s)).toEqual({ bonus: 3, matchedRole: 'tank' })
    })

    it('getTrialPenalty returns penalty for trial', () => {
      expect(getTrialPenalty('trial', { trial_penalty_enabled: true, trial_penalty_value: -2 })).toBe(-2)
    })

    it('calculateBadLuckBonus caps at maximum', () => {
      expect(calculateBadLuckBonus(10, { blp_enabled: true, blp_increment: 2, blp_maximum: 5 })).toBe(5)
    })
  })

  describe('calculatePriorityBonus', () => {
    it('stacks role + class + character', () => {
      const priority: ItemPriority = {
        role_priorities: { tank: 1 },
        class_priorities: { 'spec-uuid': 1 },
        character_priorities: { 'char1': 1 },
        priority_bonuses: { role: 5, class: 3, character: 2 },
      }
      expect(calculatePriorityBonus(priority, 'char1', 'spec-uuid', 'tank')).toBe(10)
    })
  })

  describe('getDefaultSettings', () => {
    it('returns defaults with points-per-raid', () => {
      expect(getDefaultSettings().attendance_type).toBe('points-per-raid')
    })
  })
})
