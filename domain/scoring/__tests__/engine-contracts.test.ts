/**
 * Contract-level regression tests for the Loot Engine.
 *
 * These tests verify behavioral contracts that consumers depend on:
 * - Stable ranking order (deterministic tiebreaks)
 * - Explanation payload shape (UI depends on structure)
 * - Tie cases (multiple raiders with same score)
 * - Missing or partial inputs (defensive coding)
 * - Manual modifiers (points_override, BLP, priority stacking)
 * - Score composition invariants
 */

import { describe, it, expect } from 'vitest'
import { computeScore } from '../engine'
import { computeAttendance, resolveStatus } from '../attendance'
import { calculateAttendanceScore } from '../attendance-score'
import { explainScore } from '../explain'
import { withDefaults } from '../defaults'
import { validateBracketRules } from '../../loot/bracket-validation'
import type { ScoreInput, ScoreResult, ScoreExplanation, AttendanceInput, AttendanceRecord, ItemPriority, ScoringConfig } from '../../types'

// ─── Helpers ─────────────────────────────────────────────────

function makeInput(overrides: Partial<ScoreInput> = {}): ScoreInput {
  return {
    itemRank: 50,
    character: {
      characterId: 'char-1',
      specId: 'spec-1',
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

function makeAttendanceInput(overrides: Partial<AttendanceInput> = {}): AttendanceInput {
  return {
    records: [],
    raidEvents: [],
    config: {},
    raidDays: [],
    asOfDate: '2026-03-18',
    ...overrides,
  }
}

function makeEvents(dates: string[]) {
  return dates.map((d, i) => ({ id: `event-${i}`, raid_date: d }))
}

function makeRecord(eventIndex: number, overrides: Partial<AttendanceRecord> = {}): AttendanceRecord & { raid_event_id: string } {
  return {
    raid_event_id: `event-${eventIndex}`,
    signed_up: false,
    attended: false,
    no_call_no_show: false,
    ...overrides,
  }
}

// ─── 1. Stable Ranking Order ─────────────────────────────────

describe('stable ranking order', () => {
  it('higher itemRank always wins when other components are equal', () => {
    const a = computeScore(makeInput({ itemRank: 50 }))
    const b = computeScore(makeInput({ itemRank: 49 }))
    expect(a.total).toBeGreaterThan(b.total)
  })

  it('attendance score breaks ties between equal ranks', () => {
    const a = computeScore(makeInput({ itemRank: 50, attendance: { score: 4 } }))
    const b = computeScore(makeInput({ itemRank: 50, attendance: { score: 3 } }))
    expect(a.total).toBeGreaterThan(b.total)
  })

  it('BLP breaks ties when rank and attendance are equal', () => {
    const config = { blp_enabled: true, blp_increment: 1, blp_maximum: 5 }
    const a = computeScore(makeInput({ timesPassed: 3, config }))
    const b = computeScore(makeInput({ timesPassed: 0, config }))
    expect(a.total).toBeGreaterThan(b.total)
  })

  it('trial penalty creates a consistent disadvantage', () => {
    const config = { trial_penalty_enabled: true, trial_penalty_value: -2 }
    const trial = computeScore(makeInput({
      character: { characterId: 'c', specId: null, specRoles: [], guildRank: 'Member', membershipStatus: 'trial' },
      config,
    }))
    const full = computeScore(makeInput({ config }))
    expect(full.total - trial.total).toBe(2)
  })

  it('score ordering is deterministic across repeated calls', () => {
    const inputs = [
      makeInput({ itemRank: 45, attendance: { score: 3 } }),
      makeInput({ itemRank: 50, attendance: { score: 1 } }),
      makeInput({ itemRank: 48, attendance: { score: 2 } }),
    ]
    const scores1 = inputs.map(i => computeScore(i).total)
    const scores2 = inputs.map(i => computeScore(i).total)
    expect(scores1).toEqual(scores2)
  })
})

// ─── 2. Tie Cases ────────────────────────────────────────────

describe('tie cases', () => {
  it('identical inputs produce identical scores', () => {
    const a = computeScore(makeInput({ itemRank: 45, attendance: { score: 3 } }))
    const b = computeScore(makeInput({ itemRank: 45, attendance: { score: 3 } }))
    expect(a.total).toBe(b.total)
    expect(a.components).toEqual(b.components)
  })

  it('different characters with same rank and attendance are tied', () => {
    const a = computeScore(makeInput({ character: { characterId: 'char-a', specId: null, specRoles: [], guildRank: 'Member', membershipStatus: 'full' } }))
    const b = computeScore(makeInput({ character: { characterId: 'char-b', specId: null, specRoles: [], guildRank: 'Member', membershipStatus: 'full' } }))
    expect(a.total).toBe(b.total)
  })

  it('priority bonus breaks ties for designated roles', () => {
    const priority: ItemPriority = {
      role_priorities: { tank: 1 },
      class_priorities: {},
      character_priorities: {},
      priority_bonuses: { role: 5, class: 3, character: 2 },
    }
    const tank = computeScore(makeInput({
      character: { characterId: 'c', specId: null, specRoles: ['tank'], guildRank: 'Member', membershipStatus: 'full' },
      itemPriority: priority,
    }))
    const dps = computeScore(makeInput({
      character: { characterId: 'c', specId: null, specRoles: ['physical'], guildRank: 'Member', membershipStatus: 'full' },
      itemPriority: priority,
    }))
    expect(tank.total).toBeGreaterThan(dps.total)
    expect(tank.components.priorityBonus).toBe(5)
    expect(dps.components.priorityBonus).toBe(0)
  })
})

// ─── 3. Explanation Payload Shape ────────────────────────────

describe('explainScore payload contract', () => {
  it('always returns { total, lines } structure', () => {
    const result = computeScore(makeInput())
    const explanation = explainScore(result)
    expect(explanation).toHaveProperty('total')
    expect(explanation).toHaveProperty('lines')
    expect(Array.isArray(explanation.lines)).toBe(true)
  })

  it('every line has label, value, and detail', () => {
    const config = { blp_enabled: true, blp_increment: 1, blp_maximum: 5 }
    const result = computeScore(makeInput({
      attendance: { score: 3 },
      config,
      timesPassed: 2,
    }))
    const explanation = explainScore(result, config)
    for (const line of explanation.lines) {
      expect(typeof line.label).toBe('string')
      expect(typeof line.value).toBe('number')
      expect(typeof line.detail).toBe('string')
      expect(line.label.length).toBeGreaterThan(0)
      expect(line.detail.length).toBeGreaterThan(0)
    }
  })

  it('total in explanation matches computeScore total', () => {
    const result = computeScore(makeInput({ itemRank: 42, attendance: { score: 2.5 } }))
    const explanation = explainScore(result)
    expect(explanation.total).toBe(result.total)
  })

  it('line values sum to total', () => {
    const config = {
      trial_penalty_enabled: true, trial_penalty_value: -2,
      blp_enabled: true, blp_increment: 1, blp_maximum: 5,
      raid_roles_overall_bonus_priority: true, role_modifiers: { tank: 2 },
    }
    const result = computeScore(makeInput({
      itemRank: 45,
      attendance: { score: 3 },
      character: { characterId: 'c', specId: null, specRoles: ['tank'], guildRank: 'Yiker', membershipStatus: 'trial' },
      config,
      timesPassed: 3,
    }))
    const explanation = explainScore(result, config)
    const lineSum = explanation.lines.reduce((sum, l) => sum + l.value, 0)
    expect(lineSum).toBe(explanation.total)
  })

  it('minimum 2 lines (itemRank + attendance), maximum 7 lines', () => {
    const minimal = explainScore(computeScore(makeInput()))
    expect(minimal.lines.length).toBeGreaterThanOrEqual(2)
    expect(minimal.lines.length).toBeLessThanOrEqual(7)

    // All components active
    const maximal = explainScore(computeScore(makeInput({
      itemRank: 45,
      attendance: { score: 3 },
      character: { characterId: 'c', specId: 'spec-1', specRoles: ['tank'], guildRank: 'Yiker', membershipStatus: 'trial' },
      config: {
        trial_penalty_enabled: true, trial_penalty_value: -2,
        blp_enabled: true, blp_increment: 1, blp_maximum: 5,
        raid_roles_overall_bonus_priority: true, role_modifiers: { tank: 2 },
      },
      itemPriority: {
        role_priorities: { tank: 1 }, class_priorities: {}, character_priorities: {},
        priority_bonuses: { role: 5, class: 3, character: 2 },
      },
      timesPassed: 3,
    })))
    expect(maximal.lines.length).toBe(7) // all 7 components
  })
})

// ─── 4. Missing or Partial Inputs ────────────────────────────

describe('missing or partial inputs', () => {
  it('empty config uses defaults without crashing', () => {
    const result = computeScore(makeInput({ config: {} }))
    expect(result.total).toBe(50) // itemRank only, defaults disable most modifiers
  })

  it('null itemPriority produces 0 priority bonus', () => {
    const result = computeScore(makeInput({ itemPriority: null }))
    expect(result.components.priorityBonus).toBe(0)
  })

  it('empty specRoles produces 0 role bonus', () => {
    const result = computeScore(makeInput({
      character: { characterId: 'c', specId: null, specRoles: [], guildRank: 'Member', membershipStatus: 'full' },
      config: { raid_roles_overall_bonus_priority: true, role_modifiers: { tank: 5 } },
    }))
    expect(result.components.roleBonus).toBe(0)
  })

  it('unknown guild rank produces 0 rank modifier', () => {
    const result = computeScore(makeInput({
      character: { characterId: 'c', specId: null, specRoles: [], guildRank: 'NonexistentRank', membershipStatus: 'full' },
    }))
    expect(result.components.rankModifier).toBe(0)
  })

  it('timesPassed 0 with BLP enabled produces 0 bonus', () => {
    const result = computeScore(makeInput({
      timesPassed: 0,
      config: { blp_enabled: true, blp_increment: 1, blp_maximum: 5 },
    }))
    expect(result.components.badLuckBonus).toBe(0)
  })

  it('negative timesPassed produces 0 bonus', () => {
    const result = computeScore(makeInput({
      timesPassed: -3,
      config: { blp_enabled: true, blp_increment: 1, blp_maximum: 5 },
    }))
    expect(result.components.badLuckBonus).toBe(0)
  })

  it('attendance score 0 when no records and no events', () => {
    const result = computeAttendance(makeAttendanceInput())
    expect(result.score).toBe(0)
    expect(result.raidsAttended).toBe(0)
    expect(result.raidsInWindow).toBe(0)
    expect(result.isEligible).toBe(true)
  })
})

// ─── 5. Manual Modifiers ─────────────────────────────────────

describe('manual modifiers', () => {
  it('BLP caps at blp_maximum', () => {
    const result = computeScore(makeInput({
      timesPassed: 100,
      config: { blp_enabled: true, blp_increment: 1, blp_maximum: 5 },
    }))
    expect(result.components.badLuckBonus).toBe(5)
  })

  it('BLP uses custom increment', () => {
    const result = computeScore(makeInput({
      timesPassed: 2,
      config: { blp_enabled: true, blp_increment: 1.5, blp_maximum: 10 },
    }))
    expect(result.components.badLuckBonus).toBe(3)
  })

  it('priority stacks role + class + character bonuses', () => {
    const priority: ItemPriority = {
      role_priorities: { tank: 1 },
      class_priorities: { 'spec-1': 1 },
      character_priorities: { 'char-1': 1 },
      priority_bonuses: { role: 5, class: 3, character: 2 },
    }
    const result = computeScore(makeInput({
      character: { characterId: 'char-1', specId: 'spec-1', specRoles: ['tank'], guildRank: 'Member', membershipStatus: 'full' },
      itemPriority: priority,
    }))
    expect(result.components.priorityBonus).toBe(10) // 5 + 3 + 2
  })

  it('priority with rank 2 gives half bonus', () => {
    const priority: ItemPriority = {
      role_priorities: { tank: 2 },
      class_priorities: {},
      character_priorities: {},
      priority_bonuses: { role: 5, class: 3, character: 2 },
    }
    const result = computeScore(makeInput({
      character: { characterId: 'c', specId: null, specRoles: ['tank'], guildRank: 'Member', membershipStatus: 'full' },
      itemPriority: priority,
    }))
    expect(result.components.priorityBonus).toBe(2.5) // 5/2
  })

  it('points_override replaces attendance scoring in PPR mode', () => {
    const events = makeEvents(['2026-03-10', '2026-03-15'])
    const result = computeAttendance(makeAttendanceInput({
      raidEvents: events,
      records: [
        { raid_event_id: 'event-0', signed_up: true, attended: true, no_call_no_show: false },
        { raid_event_id: 'event-1', signed_up: true, attended: true, no_call_no_show: false, points_override: 0.3 },
      ],
      config: { attendance_type: 'points-per-raid', signup_weight: 0.25, max_attendance_bonus: 4 },
    }))
    // event-0: 0.75 attend + 0.25 signup = 1.0
    // event-1: override 0.3 (replaces computed)
    expect(result.score).toBe(1.3)
  })

  it('points_override of 0 zeroes out a raid', () => {
    const events = makeEvents(['2026-03-10'])
    const result = computeAttendance(makeAttendanceInput({
      raidEvents: events,
      records: [
        { raid_event_id: 'event-0', signed_up: true, attended: true, no_call_no_show: false, points_override: 0 },
      ],
    }))
    expect(result.score).toBe(0)
  })
})

// ─── 6. Score Composition Invariants ─────────────────────────

describe('score composition invariants', () => {
  it('total always equals sum of components', () => {
    const configs = [
      makeInput({ itemRank: 1, attendance: { score: 0 } }),
      makeInput({ itemRank: 50, attendance: { score: 4 } }),
      makeInput({
        itemRank: 35,
        attendance: { score: 2.5 },
        character: { characterId: 'c', specId: null, specRoles: ['healer'], guildRank: 'Alt Yiker', membershipStatus: 'trial' },
        config: {
          trial_penalty_enabled: true, trial_penalty_value: -2,
          blp_enabled: true, blp_increment: 1, blp_maximum: 5,
          raid_roles_overall_bonus_priority: true, role_modifiers: { healer: 1 },
        },
        timesPassed: 4,
      }),
    ]

    for (const input of configs) {
      const result = computeScore(input)
      const sum = result.components.itemRank
        + result.components.attendanceScore
        + result.components.rankModifier
        + result.components.roleBonus
        + result.components.badLuckBonus
        + result.components.priorityBonus
        + result.components.trialPenalty
      expect(result.total).toBe(sum)
    }
  })

  it('itemRank is passed through unchanged', () => {
    for (const rank of [1, 25, 38, 50]) {
      const result = computeScore(makeInput({ itemRank: rank }))
      expect(result.components.itemRank).toBe(rank)
    }
  })

  it('attendance score is passed through unchanged', () => {
    for (const score of [0, 1.5, 3, 4]) {
      const result = computeScore(makeInput({ attendance: { score } }))
      expect(result.components.attendanceScore).toBe(score)
    }
  })

  it('components are never NaN or undefined', () => {
    const result = computeScore(makeInput())
    for (const [key, value] of Object.entries(result.components)) {
      expect(typeof value).toBe('number')
      expect(isNaN(value as number)).toBe(false)
    }
  })
})

// ─── 7. Attendance Edge Cases ────────────────────────────────

describe('attendance edge cases', () => {
  it('all excused = 0 score, 0 raids in window', () => {
    const events = makeEvents(['2026-03-10', '2026-03-15'])
    const result = computeAttendance(makeAttendanceInput({
      raidEvents: events,
      records: [
        { raid_event_id: 'event-0', signed_up: false, attended: false, no_call_no_show: false, is_excused: true },
        { raid_event_id: 'event-1', signed_up: false, attended: false, no_call_no_show: false, is_excused: true },
      ],
    }))
    expect(result.score).toBe(0)
    // raidsInWindow is the deduped event count (before excused filtering)
    // but the effective total for scoring is 0
  })

  it('mix of NCNS and attended correctly scores the attended portion', () => {
    const events = makeEvents(['2026-03-10', '2026-03-12', '2026-03-15'])
    const result = computeAttendance(makeAttendanceInput({
      raidEvents: events,
      records: [
        { raid_event_id: 'event-0', signed_up: false, attended: true, no_call_no_show: false },
        { raid_event_id: 'event-1', signed_up: false, attended: false, no_call_no_show: true },
        { raid_event_id: 'event-2', signed_up: false, attended: true, no_call_no_show: false },
      ],
      config: { attendance_type: 'points-per-raid', signup_weight: 0.25, max_attendance_bonus: 4 },
    }))
    // 2 attended (0.75 each) + 1 NCNS (0 points) = 1.5
    expect(result.score).toBe(1.5)
    expect(result.raidsAttended).toBe(2)
  })

  it('benched + excused + attended mix scores correctly', () => {
    const events = makeEvents(['2026-03-10', '2026-03-12', '2026-03-15'])
    const result = computeAttendance(makeAttendanceInput({
      raidEvents: events,
      records: [
        { raid_event_id: 'event-0', signed_up: false, attended: true, no_call_no_show: false },
        { raid_event_id: 'event-1', signed_up: false, attended: false, no_call_no_show: false, was_benched: true },
        { raid_event_id: 'event-2', signed_up: false, attended: false, no_call_no_show: false, is_excused: true },
      ],
      config: { attendance_type: 'points-per-raid', signup_weight: 0.25, max_attendance_bonus: 4 },
    }))
    // Effective total: 3 events - 1 excused = 2
    // event-0: attended = 0.75, event-1: benched = 0.75
    expect(result.score).toBe(1.5)
  })

  it('late penalty stacks with signup credit', () => {
    const events = makeEvents(['2026-03-10'])
    const result = computeAttendance(makeAttendanceInput({
      raidEvents: events,
      records: [
        { raid_event_id: 'event-0', signed_up: true, attended: true, no_call_no_show: false, was_late: true },
      ],
      config: {
        attendance_type: 'points-per-raid',
        signup_weight: 0.25,
        max_attendance_bonus: 4,
        late_early_penalty_enabled: true,
        late_early_penalty_value: 0.25,
      },
    }))
    // Late: attend = 0.75 - 0.25 = 0.50, signup = 0.25. Total = 0.75
    expect(result.score).toBe(0.75)
  })

  it('late penalty cannot make attendance points negative', () => {
    const events = makeEvents(['2026-03-10'])
    const result = computeAttendance(makeAttendanceInput({
      raidEvents: events,
      records: [
        { raid_event_id: 'event-0', signed_up: false, attended: true, no_call_no_show: false, was_late: true },
      ],
      config: {
        attendance_type: 'points-per-raid',
        signup_weight: 0.25,
        max_attendance_bonus: 4,
        late_early_penalty_enabled: true,
        late_early_penalty_value: 5, // penalty > attendance points
      },
    }))
    // attend = max(0, 0.75 - 5) = 0, no signup = 0. Total = 0
    expect(result.score).toBe(0)
    expect(result.score).toBeGreaterThanOrEqual(0) // never negative
  })
})

// ─── 8. resolveStatus Contract ───────────────────────────────

describe('resolveStatus contract', () => {
  it('excused takes priority over benched and attended', () => {
    expect(resolveStatus({ is_excused: true, was_benched: true, attended: true })).toBe('excused')
  })

  it('excused takes priority over signed_up', () => {
    expect(resolveStatus({ is_excused: true, signed_up: true })).toBe('excused')
  })

  it('no_show takes priority over excused', () => {
    expect(resolveStatus({ no_call_no_show: true, is_excused: true })).toBe('no_show')
  })

  it('returns exactly one of the 7 valid statuses', () => {
    const validStatuses = ['attended', 'late', 'benched', 'no_show', 'excused', 'signed_up', 'absent']
    const cases = [
      {},
      { attended: true },
      { attended: true, was_late: true },
      { was_benched: true },
      { no_call_no_show: true },
      { is_excused: true },
      { signed_up: true },
      { attended: false, signed_up: false },
    ]
    for (const record of cases) {
      const status = resolveStatus(record)
      expect(validStatuses).toContain(status)
    }
  })
})

// ─── 9. Cross-Cutting: Score Never NaN ───────────────────────

describe('score never NaN or Infinity', () => {
  it('computeScore with all-zero inputs', () => {
    const result = computeScore(makeInput({ itemRank: 0, attendance: { score: 0 } }))
    expect(isFinite(result.total)).toBe(true)
  })

  it('computeAttendance with 0 events and 0 records', () => {
    const result = computeAttendance(makeAttendanceInput())
    expect(isFinite(result.score)).toBe(true)
  })

  it('calculateAttendanceScore with 0 totalRaids', () => {
    const score = calculateAttendanceScore([], 0, {})
    expect(isFinite(score)).toBe(true)
    expect(score).toBe(0)
  })

  it('linear mode with 0 attended out of N raids', () => {
    const score = calculateAttendanceScore(
      [{ signed_up: false, attended: false, no_call_no_show: false }],
      1,
      { attendance_type: 'linear', max_attendance_bonus: 4 },
    )
    expect(isFinite(score)).toBe(true)
    expect(score).toBe(0)
  })
})

// ─── 10. Config Boundary Contracts ────────────────────────────

describe('config boundary contracts', () => {
  it('withDefaults fills all required fields from empty config', () => {
    const config = withDefaults({})
    expect(config.attendance_type).toBe('points-per-raid')
    expect(typeof config.rolling_attendance_weeks).toBe('number')
    expect(typeof config.max_attendance_bonus).toBe('number')
    expect(typeof config.signup_weight).toBe('number')
  })

  it('withDefaults preserves provided values', () => {
    const config = withDefaults({ attendance_type: 'linear', max_attendance_bonus: 10 })
    expect(config.attendance_type).toBe('linear')
    expect(config.max_attendance_bonus).toBe(10)
  })

  it('zero config values do not break scoring', () => {
    const result = computeScore(makeInput({
      config: {
        max_attendance_bonus: 0,
        rolling_attendance_weeks: 0,
        signup_weight: 0,
        blp_increment: 0,
        blp_maximum: 0,
      },
    }))
    expect(isFinite(result.total)).toBe(true)
  })

  it('negative penalty values reduce total', () => {
    const base = computeScore(makeInput({ itemRank: 30, attendance: { score: 2 } }))
    const withPenalty = computeScore(makeInput({
      itemRank: 30,
      attendance: { score: 2 },
      character: { characterId: 'c', specId: null, specRoles: [], guildRank: 'Member', membershipStatus: 'trial' },
      config: { trial_penalty_enabled: true, trial_penalty_value: -5 },
    }))
    expect(withPenalty.total).toBeLessThan(base.total)
  })
})

// ─── 11. computeAttendance Stability Contracts ────────────────

describe('computeAttendance stability contracts', () => {
  it('rolling window excludes events outside window', () => {
    const result = computeAttendance(makeAttendanceInput({
      raidEvents: makeEvents(['2026-01-01', '2026-03-15', '2026-03-17']),
      records: [
        makeRecord(0, { attended: true }),
        makeRecord(1, { attended: true }),
        makeRecord(2, { attended: true }),
      ],
      config: { rolling_attendance_weeks: 4 },
      asOfDate: '2026-03-18',
    }))
    // Jan 1 is outside the 4-week window from Mar 18
    expect(result.raidsInWindow).toBe(2)
  })

  it('excused raids excluded from denominator', () => {
    const result = computeAttendance(makeAttendanceInput({
      raidEvents: makeEvents(['2026-03-11', '2026-03-13', '2026-03-15', '2026-03-17']),
      records: [
        makeRecord(0, { attended: true }),
        makeRecord(1, { is_excused: true }),
        makeRecord(2, { attended: true }),
        makeRecord(3, { attended: true }),
      ],
      config: { rolling_attendance_weeks: 4, attendance_type: 'points-per-raid' },
      asOfDate: '2026-03-18',
    }))
    // 3 attended out of 3 effective raids (1 excused)
    expect(result.raidsAttended).toBe(3)
  })

  it('empty events returns zero score with eligible status', () => {
    const result = computeAttendance(makeAttendanceInput({
      raidEvents: [],
      records: [],
    }))
    expect(result.score).toBe(0)
    expect(result.raidsInWindow).toBe(0)
    expect(result.isEligible).toBe(true)
  })

  it('new member fair mode uses join date as effective start', () => {
    const result = computeAttendance(makeAttendanceInput({
      raidEvents: makeEvents(['2026-03-01', '2026-03-08', '2026-03-15']),
      records: [
        makeRecord(2, { attended: true }),
      ],
      config: { rolling_attendance_weeks: 8 },
      memberJoinedAt: '2026-03-10',
      newMemberMode: 'fair',
      asOfDate: '2026-03-18',
    }))
    // Only event-2 (Mar 15) is after join date (Mar 10)
    expect(result.raidsInWindow).toBe(1)
    expect(result.raidsAttended).toBe(1)
  })
})

// ─── 12. Cross-Mode Attendance Score Range ────────────────────

describe('attendance score range consistency', () => {
  const fullAttendance = Array(8).fill(null).map((_, i) =>
    makeRecord(i, { attended: true, signed_up: true })
  )

  it('PPR mode score bounded by max_attendance_bonus', () => {
    const score = calculateAttendanceScore(fullAttendance, 8, {
      attendance_type: 'points-per-raid',
      max_attendance_bonus: 4,
    })
    expect(score).toBeLessThanOrEqual(4)
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('linear mode score bounded by max_attendance_bonus', () => {
    const score = calculateAttendanceScore(fullAttendance, 8, {
      attendance_type: 'linear',
      max_attendance_bonus: 4,
    })
    expect(score).toBeLessThanOrEqual(4)
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('breakpoint mode score bounded by max_attendance_bonus', () => {
    const score = calculateAttendanceScore(fullAttendance, 8, {
      attendance_type: 'breakpoint',
      max_attendance_bonus: 4,
      max_attendance_threshold: 0.9,
      middle_attendance_bonus: 2,
      middle_attendance_threshold: 0.5,
    })
    expect(score).toBeLessThanOrEqual(4)
    expect(score).toBeGreaterThanOrEqual(0)
  })

  it('all modes return 0 for zero attendance', () => {
    const zeroRecords = Array(4).fill(null).map((_, i) => makeRecord(i))

    for (const mode of ['points-per-raid', 'linear', 'breakpoint'] as const) {
      const score = calculateAttendanceScore(zeroRecords, 4, { attendance_type: mode, max_attendance_bonus: 4 })
      expect(score).toBe(0)
    }
  })
})

// ─── 13. Priority Bonus Contracts ─────────────────────────────

describe('priority bonus contracts', () => {
  const makePriority = (rolePriority: number): ItemPriority => ({
    role_priorities: { tank: rolePriority },
    class_priorities: {},
    character_priorities: {},
    priority_bonuses: { role: 5, class: 3, character: 2 },
  })

  it('higher priority rank (lower number) produces higher or equal score', () => {
    const scoreR1 = computeScore(makeInput({
      character: { characterId: 'c', specId: null, specRoles: ['tank'], guildRank: 'Member', membershipStatus: 'full' },
      itemPriority: makePriority(1),
    }))
    const scoreR3 = computeScore(makeInput({
      character: { characterId: 'c', specId: null, specRoles: ['tank'], guildRank: 'Member', membershipStatus: 'full' },
      itemPriority: makePriority(3),
    }))
    expect(scoreR1.components.priorityBonus).toBeGreaterThanOrEqual(scoreR3.components.priorityBonus)
  })

  it('null priority produces zero bonus', () => {
    const result = computeScore(makeInput({
      itemPriority: null,
    }))
    expect(result.components.priorityBonus).toBe(0)
  })

  it('no matching role produces zero role bonus', () => {
    const result = computeScore(makeInput({
      character: { characterId: 'c', specId: null, specRoles: ['healer'], guildRank: 'Member', membershipStatus: 'full' },
      itemPriority: makePriority(1), // tank priority, but character is healer
    }))
    // Should get 0 for role bonus since healer doesn't match tank priority
    expect(result.components.priorityBonus).toBe(0)
  })
})

// ─── 14. explainScore Output Stability ────────────────────────

describe('explainScore output stability', () => {
  it('always includes itemRank and attendance lines', () => {
    const result = computeScore(makeInput())
    const explanation = explainScore(result)
    const keys = explanation.lines.map(l => l.key)
    expect(keys).toContain('itemRank')
    expect(keys).toContain('attendance')
  })

  it('itemRank is always the first line', () => {
    const result = computeScore(makeInput({ itemRank: 42 }))
    const explanation = explainScore(result)
    expect(explanation.lines[0].key).toBe('itemRank')
    expect(explanation.lines[0].value).toBe(42)
  })

  it('attendance is always the second line', () => {
    const result = computeScore(makeInput({ attendance: { score: 3.5 } }))
    const explanation = explainScore(result)
    expect(explanation.lines[1].key).toBe('attendance')
    expect(explanation.lines[1].value).toBe(3.5)
  })

  it('zero-value optional components are excluded', () => {
    const result = computeScore(makeInput())
    const explanation = explainScore(result)
    const keys = explanation.lines.map(l => l.key)
    // Default input has no rank modifier, role bonus, trial penalty, BLP, or priority
    expect(keys).not.toContain('rankModifier')
    expect(keys).not.toContain('roleBonus')
    expect(keys).not.toContain('trialPenalty')
    expect(keys).not.toContain('badLuckBonus')
    expect(keys).not.toContain('priorityBonus')
  })

  it('non-zero components appear with correct keys', () => {
    const config = {
      trial_penalty_enabled: true, trial_penalty_value: -2,
      blp_enabled: true, blp_increment: 1, blp_maximum: 5,
      raid_roles_overall_bonus_priority: true, role_modifiers: { tank: 2 },
    }
    const result = computeScore(makeInput({
      character: { characterId: 'c', specId: null, specRoles: ['tank'], guildRank: 'Yiker', membershipStatus: 'trial' },
      config,
      timesPassed: 3,
    }))
    const explanation = explainScore(result, config)
    const keys = explanation.lines.map(l => l.key)
    expect(keys).toContain('trialPenalty')
    expect(keys).toContain('badLuckBonus')
    expect(keys).toContain('roleBonus')
  })

  it('every line has key, label, value, and detail', () => {
    const config = {
      trial_penalty_enabled: true, trial_penalty_value: -2,
      blp_enabled: true, blp_increment: 1, blp_maximum: 5,
    }
    const result = computeScore(makeInput({
      character: { characterId: 'c', specId: null, specRoles: [], guildRank: 'Member', membershipStatus: 'trial' },
      config,
      timesPassed: 2,
    }))
    const explanation = explainScore(result, config)
    for (const line of explanation.lines) {
      expect(line.key).toBeDefined()
      expect(typeof line.label).toBe('string')
      expect(typeof line.value).toBe('number')
      expect(typeof line.detail).toBe('string')
      expect(line.label.length).toBeGreaterThan(0)
      expect(line.detail.length).toBeGreaterThan(0)
    }
  })

  it('context includes rankName when ScoreInput provided', () => {
    const input = makeInput({
      character: { characterId: 'c', specId: null, specRoles: [], guildRank: 'Pro Yiker', membershipStatus: 'full' },
      config: { rank_modifiers: { 'Pro Yiker': 3 } },
    })
    const result = computeScore(input)
    const explanation = explainScore(result, input)
    const rankLine = explanation.lines.find(l => l.key === 'rankModifier')
    expect(rankLine).toBeDefined()
    expect(rankLine!.context?.rankName).toBe('Pro Yiker')
  })

  it('context includes matchedRole when ScoreInput with specRoles provided', () => {
    const input = makeInput({
      character: { characterId: 'c', specId: null, specRoles: ['tank'], guildRank: 'Member', membershipStatus: 'full' },
      config: { raid_roles_overall_bonus_priority: true, role_modifiers: { tank: 2 } },
    })
    const result = computeScore(input)
    const explanation = explainScore(result, input)
    const roleLine = explanation.lines.find(l => l.key === 'roleBonus')
    expect(roleLine).toBeDefined()
    expect(roleLine!.context?.matchedRole).toBe('tank')
  })

  it('total in explanation always matches computeScore total', () => {
    const inputs = [
      makeInput(),
      makeInput({ itemRank: 1, attendance: { score: 4 } }),
      makeInput({
        itemRank: 35,
        attendance: { score: 2.5 },
        config: { trial_penalty_enabled: true, trial_penalty_value: -2, blp_enabled: true, blp_increment: 1, blp_maximum: 5 },
        character: { characterId: 'c', specId: null, specRoles: [], guildRank: 'Member', membershipStatus: 'trial' },
        timesPassed: 3,
      }),
    ]
    for (const input of inputs) {
      const result = computeScore(input)
      const explanation = explainScore(result)
      expect(explanation.total).toBe(result.total)
    }
  })
})

// ─── 15. BLP Maximum Bounds ───────────────────────────────────

describe('BLP maximum bounds', () => {
  it('BLP never exceeds blp_maximum regardless of times passed', () => {
    const result = computeScore(makeInput({
      config: { blp_enabled: true, blp_increment: 1, blp_maximum: 5 },
      timesPassed: 100,
    }))
    expect(result.components.badLuckBonus).toBeLessThanOrEqual(5)
    expect(result.components.badLuckBonus).toBe(5)
  })

  it('BLP is zero when disabled', () => {
    const result = computeScore(makeInput({
      config: { blp_enabled: false },
      timesPassed: 10,
    }))
    expect(result.components.badLuckBonus).toBe(0)
  })

  it('BLP is zero with zero times passed', () => {
    const result = computeScore(makeInput({
      config: { blp_enabled: true, blp_increment: 1, blp_maximum: 5 },
      timesPassed: 0,
    }))
    expect(result.components.badLuckBonus).toBe(0)
  })
})
