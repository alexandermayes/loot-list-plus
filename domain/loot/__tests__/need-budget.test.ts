// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  NEED_BUDGET_CODE,
  NEED_BUDGET_POINTS,
  budgetForPicks,
  checkNeedBudget,
  costForSlot,
  needBudgetUsed,
  needCopyViolation,
  needOverBudgetSentence,
  wouldGoOver,
} from '@/domain/loot/need-budget'

// Why these cases: the 10-point budget is the one rule the picker and the
// submit route must answer identically (D-06, D-07), and the server counts
// loot_submission_items rows, where one pick is fanned out over every
// Discovery tier. Counting rows instead of picks would triple the cost
// (research P2), and counting only the rank would let five keys stacked at one
// rank slip under the limit (T-04-03-01). No names or ids from production.

const BIG_A = 'two-hand-weapon.strength' // 3
const BIG_B = 'trinket.physical' // 3
const MEDIUM = 'ring.physical' // 2
const STANDARD_A = 'chest.plate.strength' // 1
const STANDARD_B = 'legs.plate.strength' // 1

const FIVE_KEYS = [BIG_A, BIG_B, MEDIUM, STANDARD_A, STANDARD_B]
const COST: Record<string, number> = {
  [BIG_A]: 3,
  [BIG_B]: 3,
  [MEDIUM]: 2,
  [STANDARD_A]: 1,
  [STANDARD_B]: 1,
  'main-hand-weapon.strength': 3,
}

function fanOutRows(keys: readonly string[], tierCount: number) {
  const rows: Array<{ rank: number; need_key: string | null; allocation_cost: number | null }> = []
  keys.forEach((key, index) => {
    for (let tier = 0; tier < tierCount; tier += 1) {
      rows.push({ rank: 50 - index, need_key: key, allocation_cost: COST[key] })
    }
  })
  return rows
}

describe('constants', () => {
  it('fixes the budget at 10 points and names the refusal code', () => {
    expect(NEED_BUDGET_POINTS).toBe(10)
    expect(NEED_BUDGET_CODE).toBe('NEED_BUDGET_EXCEEDED')
  })
})

describe('needBudgetUsed (D-06, DISC-03)', () => {
  it('counts a 10-point list once even though it fans out to 15 rows', () => {
    const rows = fanOutRows(FIVE_KEYS, 3)
    expect(rows).toHaveLength(15)
    expect(needBudgetUsed(rows)).toBe(10)
  })

  it('counts five different keys placed at one rank across three slots each', () => {
    const rows = FIVE_KEYS.map((key) => ({ rank: 50, need_key: key, allocation_cost: COST[key] }))
    expect(needBudgetUsed(rows)).toBe(3 + 3 + 2 + 1 + 1)
  })

  it('counts one key at one rank once however many tiers carry it', () => {
    const rows = [1, 2, 3].map(() => ({ rank: 50, need_key: BIG_A, allocation_cost: 3 }))
    expect(needBudgetUsed(rows)).toBe(3)
  })

  it('ignores rows with a null need key and treats a null cost as zero', () => {
    expect(
      needBudgetUsed([
        { rank: 50, need_key: null, allocation_cost: 3 },
        { rank: 49, need_key: BIG_A, allocation_cost: null },
        { rank: 48, need_key: MEDIUM, allocation_cost: 2 },
      ]),
    ).toBe(2)
  })

  it('counts the same key at two ranks as two picks', () => {
    const rows = [
      { rank: 50, need_key: 'ring.physical', allocation_cost: 2 },
      { rank: 49, need_key: 'ring.physical', allocation_cost: 2 },
    ]
    expect(needBudgetUsed(rows)).toBe(4)
  })
})

describe('checkNeedBudget', () => {
  it('is ok at exactly the limit', () => {
    expect(checkNeedBudget(fanOutRows(FIVE_KEYS, 3))).toEqual({
      ok: true,
      used: 10,
      limit: 10,
      bigPicks: 2,
    })
  })

  it('refuses a list summing 11 and counts distinct big picks', () => {
    // 3 + 3 + 3 + 1 = 10, then one more Standard pick tips it to 11.
    const rows = fanOutRows([BIG_A, BIG_B, 'main-hand-weapon.strength', STANDARD_A, STANDARD_B], 3)
    const result = checkNeedBudget(rows)
    expect(result.ok).toBe(false)
    expect(result.used).toBe(11)
    expect(result.limit).toBe(10)
    expect(result.bigPicks).toBe(3)
  })
})

describe('budgetForPicks', () => {
  it('costs picker keys and leaves empty positions free', () => {
    expect(budgetForPicks([BIG_A, BIG_B, MEDIUM, STANDARD_A, null])).toEqual({ used: 9, bigPicks: 2 })
  })

  it('gives an unknown or prototype key no cost, leaving it to eligibility', () => {
    expect(budgetForPicks(['not-a-need', '__proto__', 'constructor', BIG_A])).toEqual({
      used: 3,
      bigPicks: 1,
    })
  })
})

describe('wouldGoOver (D-07)', () => {
  const full = [BIG_A, BIG_B, MEDIUM, STANDARD_A, STANDARD_B] // 10 of 10

  it('allows swapping a Big pick for another Big pick at 10 of 10', () => {
    expect(wouldGoOver(full, 0, 3)).toBe(false)
  })

  it('refuses swapping a Standard pick for a Big pick at 10 of 10', () => {
    expect(wouldGoOver(full, 3, 3)).toBe(true)
  })

  it('allows filling an empty position while there is room', () => {
    expect(wouldGoOver([BIG_A, null, null, null, null], 1, 3)).toBe(false)
    expect(wouldGoOver([BIG_A, BIG_B, null, null, null], 2, 3)).toBe(false)
    expect(wouldGoOver([BIG_A, BIG_B, MEDIUM, null, null], 3, 3)).toBe(true)
  })
})

describe('costForSlot', () => {
  it('prices Big, Medium and Standard slots', () => {
    expect(costForSlot('trinket')).toBe(3)
    expect(costForSlot('ring')).toBe(2)
    expect(costForSlot('chest')).toBe(1)
  })
})

describe('needCopyViolation (D-29)', () => {
  it('allows a second Ring key and refuses a third', () => {
    expect(needCopyViolation(['ring.healing', null, null, null, null], 1, 'ring.healing')).toBeNull()
    expect(needCopyViolation(['ring.healing', 'ring.healing', null, null, null], 2, 'ring.healing')).toBe(
      'third-copy',
    )
  })

  it('allows a second Trinket key and refuses a third', () => {
    expect(needCopyViolation(['trinket.tank', null, null, null, null], 1, 'trinket.tank')).toBeNull()
    expect(needCopyViolation(['trinket.tank', 'trinket.tank', null, null, null], 2, 'trinket.tank')).toBe(
      'third-copy',
    )
  })

  it('refuses any other key a second time', () => {
    expect(needCopyViolation(['chest.plate.tank', null, null, null, null], 1, 'chest.plate.tank')).toBe(
      'duplicate',
    )
  })

  it('counts the same key only', () => {
    expect(needCopyViolation(['ring.spell-damage', null, null, null, null], 1, 'ring.healing')).toBeNull()
  })

  it('excludes the position being changed', () => {
    // Re-picking the key already at position 0 is a no-op, not a duplicate.
    expect(needCopyViolation(['chest.plate.tank', null, null, null, null], 0, 'chest.plate.tank')).toBeNull()
    expect(needCopyViolation(['ring.healing', 'ring.healing', null, null, null], 1, 'ring.healing')).toBeNull()
  })

  it('treats an unknown key as single-copy', () => {
    expect(needCopyViolation(['not-a-need', null, null, null, null], 1, 'not-a-need')).toBe('duplicate')
    expect(needCopyViolation([null, null, null, null, null], 0, '__proto__')).toBeNull()
  })
})

describe('needOverBudgetSentence (D-07, UI-14, copy signed off 2026-11-11, 04-19)', () => {
  it('names three, four and five big picks', () => {
    expect(needOverBudgetSentence(3)).toBe("That's three big picks. Swap a weapon or trinket for armour.")
    expect(needOverBudgetSentence(4)).toBe("That's four big picks. Swap a weapon or trinket for armour.")
    expect(needOverBudgetSentence(5)).toBe("That's five big picks. Swap a weapon or trinket for armour.")
  })

  it('falls back to the mixed sentence for fewer than three big picks', () => {
    expect(needOverBudgetSentence(2)).toBe("That's too many big and medium picks. Swap one for armour.")
    expect(needOverBudgetSentence(0)).toBe("That's too many big and medium picks. Swap one for armour.")
  })

  it('carries no em or en dash', () => {
    const dash = new RegExp(`[${String.fromCharCode(0x2014)}${String.fromCharCode(0x2013)}]`)
    for (const n of [0, 1, 2, 3, 4, 5]) expect(needOverBudgetSentence(n)).not.toMatch(dash)
  })
})
