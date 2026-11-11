/**
 * Standing and interest split (Phase 4, D-20 to D-22).
 *
 * The split only re-labels parts of the existing total: interest is the item
 * rank, standing is everything else. The total itself never moves, which the
 * golden and Lua-fixture suites prove separately.
 */

import { describe, it, expect } from 'vitest'
import { computeScore, toScoreResult } from '../engine'
import { explainScore } from '../explain'
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
