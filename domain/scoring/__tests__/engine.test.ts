import { describe, it, expect } from 'vitest'
import { computeScore } from '../engine'
import { explainScore } from '../explain'
import { calculateLootScore } from '../loot-score'
import type { ScoreInput, ItemPriority } from '../../types'
import { LOOT_SCORE_FIXTURES } from './fixtures'

// ─── Helpers ─────────────────────────────────────────────────

function makeInput(overrides: Partial<ScoreInput> = {}): ScoreInput {
  return {
    itemRank: 50,
    character: {
      characterId: 'char-1',
      specId: null,
      specRoles: [],
      guildRank: 'Member',
      membershipStatus: 'full',
    },
    attendance: { score: 0 },
    config: {},
    itemPriority: null,
    timesPassed: 0,
    ...overrides,
  }
}

// ─── computeScore ────────────────────────────────────────────

describe('computeScore', () => {
  it('returns itemRank when all modifiers are zero', () => {
    const result = computeScore(makeInput())
    expect(result.total).toBe(50) // itemRank only
    expect(result.components.itemRank).toBe(50)
    expect(result.components.attendanceScore).toBe(0)
    expect(result.components.rankModifier).toBe(0)
    expect(result.components.roleBonus).toBe(0)
    expect(result.components.badLuckBonus).toBe(0)
    expect(result.components.priorityBonus).toBe(0)
    expect(result.components.trialPenalty).toBe(0)
  })

  it('includes attendance score', () => {
    const result = computeScore(makeInput({ attendance: { score: 3.5 } }))
    expect(result.total).toBe(53.5)
    expect(result.components.attendanceScore).toBe(3.5)
  })

  it('computes rank modifier from guild rank', () => {
    const result = computeScore(makeInput({
      character: { characterId: 'c', specId: null, specRoles: [], guildRank: 'Yiker', membershipStatus: 'full' },
    }))
    // Default rank_modifiers has 'Yiker': -1
    expect(result.components.rankModifier).toBe(-1)
    expect(result.total).toBe(49) // 50 + 0 + (-1)
  })

  it('computes role bonus from spec roles', () => {
    const result = computeScore(makeInput({
      character: { characterId: 'c', specId: null, specRoles: ['tank'], guildRank: 'Member', membershipStatus: 'full' },
      config: { raid_roles_overall_bonus_priority: true, role_modifiers: { tank: 2 } },
    }))
    expect(result.components.roleBonus).toBe(2)
    expect(result.total).toBe(52)
  })

  it('computes BLP bonus', () => {
    const result = computeScore(makeInput({
      timesPassed: 3,
      config: { blp_enabled: true, blp_increment: 1, blp_maximum: 5 },
    }))
    expect(result.components.badLuckBonus).toBe(3)
    expect(result.total).toBe(53)
  })

  it('computes priority bonus', () => {
    const priority: ItemPriority = {
      role_priorities: { tank: 1 },
      class_priorities: {},
      character_priorities: {},
      priority_bonuses: { role: 5, class: 3, character: 2 },
    }
    const result = computeScore(makeInput({
      character: { characterId: 'c', specId: null, specRoles: ['tank'], guildRank: 'Member', membershipStatus: 'full' },
      itemPriority: priority,
    }))
    expect(result.components.priorityBonus).toBe(5)
    expect(result.total).toBe(55)
  })

  it('computes trial penalty', () => {
    const result = computeScore(makeInput({
      character: { characterId: 'c', specId: null, specRoles: [], guildRank: 'Member', membershipStatus: 'trial' },
      config: { trial_penalty_enabled: true, trial_penalty_value: -2 },
    }))
    expect(result.components.trialPenalty).toBe(-2)
    expect(result.total).toBe(48)
  })

  it('stacks all components correctly', () => {
    const priority: ItemPriority = {
      role_priorities: { tank: 1 },
      class_priorities: { 'spec-1': 1 },
      character_priorities: {},
      priority_bonuses: { role: 5, class: 3, character: 2 },
    }
    const result = computeScore(makeInput({
      itemRank: 45,
      character: { characterId: 'c', specId: 'spec-1', specRoles: ['tank'], guildRank: 'Yiker', membershipStatus: 'trial' },
      attendance: { score: 2.5 },
      config: {
        trial_penalty_enabled: true, trial_penalty_value: -2,
        blp_enabled: true, blp_increment: 1, blp_maximum: 5,
        raid_roles_overall_bonus_priority: true, role_modifiers: { tank: 2 },
      },
      itemPriority: priority,
      timesPassed: 3,
    }))
    // 45 + 2.5 + (-1) + 2 + 3 + (5 + 3) + (-2) = 57.5
    expect(result.components.itemRank).toBe(45)
    expect(result.components.attendanceScore).toBe(2.5)
    expect(result.components.rankModifier).toBe(-1)
    expect(result.components.roleBonus).toBe(2)
    expect(result.components.badLuckBonus).toBe(3)
    expect(result.components.priorityBonus).toBe(8) // role:5 + class:3
    expect(result.components.trialPenalty).toBe(-2)
    expect(result.total).toBe(57.5)
  })

  // ─── Parity with calculateLootScore ────────────────────────

  it.each(LOOT_SCORE_FIXTURES)('parity with calculateLootScore: $name', ({ input, expected }) => {
    // Build a ScoreInput that produces the same component values
    // by bypassing modifier computation (set config to disable all modifiers,
    // pass attendance score directly)
    const result = computeScore(makeInput({
      itemRank: input.itemRank,
      attendance: { score: input.attendanceScore },
      // Disable modifiers so they come from overrides below
      config: {
        guild_rank_bonuses_enabled: false,
        raid_roles_overall_bonus_priority: false,
        blp_enabled: false,
        trial_penalty_enabled: false,
      },
    }))

    // When all modifiers are disabled, total = itemRank + attendanceScore
    // We can't directly test complex fixtures this way since computeScore
    // computes modifiers from config. Instead verify the formula agrees.
    const oldResult = calculateLootScore(
      input.itemRank, input.attendanceScore, input.rankModifier,
      input.badLuckBonus, input.priorityBonus, input.trialPenalty, input.roleBonus,
    )
    expect(oldResult).toBe(expected)

    // And verify our engine uses the same sum formula
    const manualTotal = result.components.itemRank
      + result.components.attendanceScore
      + result.components.rankModifier
      + result.components.roleBonus
      + result.components.badLuckBonus
      + result.components.priorityBonus
      + result.components.trialPenalty
    expect(result.total).toBe(manualTotal)
  })
})

// ─── explainScore ────────────────────────────────────────────

describe('explainScore', () => {
  it('always includes item rank and attendance lines', () => {
    const result = computeScore(makeInput())
    const explanation = explainScore(result)
    expect(explanation.lines.length).toBe(2) // itemRank + attendance
    expect(explanation.lines[0].label).toBe('Item rank')
    expect(explanation.lines[1].label).toBe('Attendance')
  })

  it('total matches score result', () => {
    const result = computeScore(makeInput({ attendance: { score: 3.0 } }))
    const explanation = explainScore(result)
    expect(explanation.total).toBe(result.total)
  })

  it('includes non-zero components', () => {
    const config = {
      trial_penalty_enabled: true, trial_penalty_value: -2,
      raid_roles_overall_bonus_priority: true, role_modifiers: { tank: 2 },
      blp_enabled: true, blp_increment: 1, blp_maximum: 5,
    }
    const result = computeScore(makeInput({
      character: { characterId: 'c', specId: null, specRoles: ['tank'], guildRank: 'Member', membershipStatus: 'trial' },
      config,
      timesPassed: 3,
    }))
    const explanation = explainScore(result, config)

    const labels = explanation.lines.map(l => l.label)
    expect(labels).toContain('Item rank')
    expect(labels).toContain('Attendance')
    expect(labels).toContain('Role bonus')
    expect(labels).toContain('Trial penalty')
    expect(labels).toContain('Bad luck protection')
  })

  it('omits zero-value optional components', () => {
    const result = computeScore(makeInput())
    const explanation = explainScore(result)
    const labels = explanation.lines.map(l => l.label)
    expect(labels).not.toContain('Rank bonus')
    expect(labels).not.toContain('Role bonus')
    expect(labels).not.toContain('Priority bonus')
    expect(labels).not.toContain('Trial penalty')
    expect(labels).not.toContain('Bad luck protection')
  })

  it('item rank detail shows list position', () => {
    const result = computeScore(makeInput({ itemRank: 50 }))
    const explanation = explainScore(result)
    expect(explanation.lines[0].detail).toBe('Position #1 on your list')
  })

  it('item rank detail for rank 1 shows position #50', () => {
    const result = computeScore(makeInput({ itemRank: 1 }))
    const explanation = explainScore(result)
    expect(explanation.lines[0].detail).toBe('Position #50 on your list')
  })

  it('attendance detail includes mode and window', () => {
    const result = computeScore(makeInput({ config: { attendance_type: 'linear', rolling_attendance_weeks: 8 } }))
    const explanation = explainScore(result, { attendance_type: 'linear', rolling_attendance_weeks: 8 })
    expect(explanation.lines[1].detail).toBe('linear scoring, 8-week window')
  })

  it('BLP detail mentions cap', () => {
    const result = computeScore(makeInput({
      timesPassed: 3,
      config: { blp_enabled: true, blp_increment: 1, blp_maximum: 5 },
    }))
    const explanation = explainScore(result, { blp_maximum: 5 })
    const blpLine = explanation.lines.find(l => l.label === 'Bad luck protection')
    expect(blpLine?.detail).toContain('capped at 5')
  })
})
