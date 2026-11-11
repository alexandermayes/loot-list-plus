/**
 * Standing and interest split (Phase 4, D-20 to D-22).
 *
 * The split only re-labels parts of the existing total: interest is the item
 * rank, standing is everything else. The total itself never moves, which the
 * golden and Lua-fixture suites prove separately.
 */

import { describe, it, expect } from 'vitest'
import { computeScore, toScoreResult } from '../engine'
import { explainScore, formatScoreNumber, standingSentence, interestSentence } from '../explain'
import type { ScoreComponents, ScoreInput } from '../../types'

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
    attendance: { score: 3 },
    config: {},
    itemPriority: null,
    timesPassed: 0,
    donationBonus: 0,
    ...overrides,
  }
}

function makeComponents(overrides: Partial<ScoreComponents> = {}): ScoreComponents {
  return {
    itemRank: 0,
    attendanceScore: 0,
    rankModifier: 0,
    roleBonus: 0,
    badLuckBonus: 0,
    priorityBonus: 0,
    trialPenalty: 0,
    donationBonus: 0,
    raiderBonus: 0,
    ...overrides,
  }
}

describe('computeScore split', () => {
  it('carries interest equal to the item rank and standing as the rest', () => {
    const result = computeScore(makeInput({ itemRank: 47 }))
    expect(result.interest).toBe(result.components.itemRank)
    expect(result.interest).toBe(47)
    // Floating point: never compare a sum with toBe.
    expect(result.standing + result.interest).toBeCloseTo(result.total, 9)
  })

  it('keeps standing plus interest equal to the total across many inputs', () => {
    for (const itemRank of [0, 1, 25, 46, 50]) {
      for (const attendance of [0, 1.3, 2.7, 4]) {
        for (const timesPassed of [0, 1, 3]) {
          const r = computeScore(makeInput({ itemRank, attendance: { score: attendance }, timesPassed }))
          expect(r.standing + r.interest).toBeCloseTo(r.total, 9)
        }
      }
    }
  })
})

describe('toScoreResult', () => {
  it('splits a hand-built total', () => {
    const components = makeComponents({ itemRank: 49 })
    const r = toScoreResult(12.3, components)
    expect(r.interest).toBe(49)
    expect(r.standing).toBeCloseTo(-36.7, 9)
    expect(r.total).toBe(12.3)
    expect(r.components).toBe(components)
  })
})

describe('explainScore split values', () => {
  it('derives standing and interest from the computed result', () => {
    const input = makeInput({ itemRank: 48, timesPassed: 2 })
    const result = computeScore(input)
    const explanation = explainScore(result, input)
    expect(explanation.interest.value).toBe(48)
    expect(explanation.standing.value).toBeCloseTo(result.total - 48, 9)
  })

  it('explains a hand-built result the same way as a split one', () => {
    const components = makeComponents({ itemRank: 40, attendanceScore: 3, badLuckBonus: 2 })
    const total = 45
    const byHand = explainScore({ total, components })
    const split = explainScore(toScoreResult(total, components))
    expect(byHand.standing).toEqual(split.standing)
    expect(byHand.interest).toEqual(split.interest)
  })
})

// ─── Sentences (copy is DRAFT until the owner signs it off) ──────────────

const opts = { maxAttendance: 4, decimalPlaces: 2 }

describe('formatScoreNumber', () => {
  it('rounds with toFixed then drops trailing zeros', () => {
    expect(formatScoreNumber(7.299999999999997, 2)).toBe('7.3')
    expect(formatScoreNumber(7.5, 2)).toBe('7.5')
    expect(formatScoreNumber(3, 2)).toBe('3')
    expect(formatScoreNumber(2.555, 1)).toBe(String(Number((2.555).toFixed(1))))
    expect(formatScoreNumber(7.456, 0)).toBe('7')
  })

  it('keeps the minus sign and never prints negative zero', () => {
    expect(formatScoreNumber(-2, 2)).toBe('-2')
    expect(formatScoreNumber(-0, 2)).toBe('0')
    expect(formatScoreNumber(-0.001, 2)).toBe('0')
  })

  it('defaults to two places', () => {
    expect(formatScoreNumber(1.23456)).toBe('1.23')
  })
})

describe('interestSentence', () => {
  it('reads the pick position as 51 minus the item rank', () => {
    expect(interestSentence(50, 'self')).toBe('Interest 50: your number 1 pick.')
    expect(interestSentence(46, 'self')).toBe('Interest 46: your number 5 pick.')
    expect(interestSentence(1, 'self')).toBe('Interest 1: your number 50 pick.')
  })

  it('switches to their for the officer voice', () => {
    expect(interestSentence(50, 'other')).toBe('Interest 50: their number 1 pick.')
  })

  it('has a no-pick sentence in each voice', () => {
    expect(interestSentence(0, 'self')).toBe('Interest 0: no picks on your list yet.')
    expect(interestSentence(0, 'other')).toBe('Interest 0: no pick on their list.')
  })

  it('gives a need row and an item row at the same rank the same sentence', () => {
    // Needs share the 1-50 rank scale, so there is no Discovery-only branch (D-22).
    const a = explainScore({ total: 48, components: makeComponents({ itemRank: 48 }) })
    const b = explainScore({ total: 48, components: makeComponents({ itemRank: 48 }) })
    expect(a.interest.sentence).toBe('Interest 48: your number 3 pick.')
    expect(b.interest.sentence).toBe(a.interest.sentence)
  })
})

describe('standingSentence', () => {
  it('lists the non-zero parts the way the locked draft reads', () => {
    const c = makeComponents({ itemRank: 50, attendanceScore: 3, badLuckBonus: 2, raiderBonus: 2.5 })
    expect(standingSentence(c, 7.5, opts)).toBe(
      'Standing 7.5: attendance 3 of 4, bad luck protection 2, officer bonus 2.5.'
    )
  })

  it('says there are no bonuses when every standing part is zero', () => {
    expect(standingSentence(makeComponents({ itemRank: 50 }), 0, opts)).toBe('Standing 0: no bonuses yet.')
  })

  it('keeps the fixed order when bad luck protection outweighs attendance', () => {
    const c = makeComponents({ attendanceScore: 1, badLuckBonus: 6, donationBonus: 9, rankModifier: 0.5 })
    expect(standingSentence(c, 16.5, opts)).toBe(
      'Standing 16.5: attendance 1 of 4, guild rank 0.5, bad luck protection 6, bank donations 9.'
    )
  })

  it('names every part in the fixed order', () => {
    const c = makeComponents({
      attendanceScore: 4, rankModifier: 1, roleBonus: 2, priorityBonus: 3,
      raiderBonus: 4, trialPenalty: -2, badLuckBonus: 5, donationBonus: 6,
    })
    expect(standingSentence(c, 23, opts)).toBe(
      'Standing 23: attendance 4 of 4, guild rank 1, role 2, officer priority 3, officer bonus 4, trial penalty -2, bad luck protection 5, bank donations 6.'
    )
  })

  it('shows an attendance part only when attendance is non-zero', () => {
    const c = makeComponents({ roleBonus: 1 })
    expect(standingSentence(c, 1, opts)).toBe('Standing 1: role 1.')
  })

  it('rounds to the guild decimal places', () => {
    const c = makeComponents({ attendanceScore: 2.456, raiderBonus: 0.04 })
    expect(standingSentence(c, 2.496, { maxAttendance: 4, decimalPlaces: 1 })).toBe(
      'Standing 2.5: attendance 2.5 of 4, officer bonus 0.'
    )
  })
})

describe('explainScore sentences', () => {
  it('uses the guild max attendance and the voice option', () => {
    const components = makeComponents({ itemRank: 50, attendanceScore: 3 })
    const e = explainScore(
      { total: 53, components },
      { max_attendance_bonus: 6 },
      { voice: 'other', decimalPlaces: 0 }
    )
    expect(e.standing.sentence).toBe('Standing 3: attendance 3 of 6.')
    expect(e.interest.sentence).toBe('Interest 50: their number 1 pick.')
  })

  it('keeps tile values unrounded', () => {
    const components = makeComponents({ itemRank: 40, attendanceScore: 2.456 })
    const e = explainScore({ total: 42.456, components }, {}, { decimalPlaces: 1 })
    expect(e.standing.value).toBeCloseTo(2.456, 9)
    expect(e.interest.value).toBe(40)
  })

  it('also reads voice and decimal places when given the full ScoreInput', () => {
    const input = makeInput({ itemRank: 0, attendance: { score: 0 } })
    const e = explainScore(computeScore(input), input, { voice: 'other' })
    expect(e.interest.sentence).toBe('Interest 0: no pick on their list.')
  })
})
