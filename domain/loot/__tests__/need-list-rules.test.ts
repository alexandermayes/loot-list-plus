// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { checkNeedList, type NeedListRow } from '@/domain/loot/need-list-rules'
import { findNeedDefinition } from '@/domain/loot/needs'

// Why these cases: the submit route refuses a need list on two rules, the
// 10-point budget (D-07) and class and spec eligibility (D-10). The server
// reads loot_submission_items rows, where each pick is fanned out over every
// Discovery tier, so the budget must count a pick once however many tiers it
// sits in (research P2). No names or ids from production.

const MAGE = { className: 'Mage', specName: 'Mage' }

const TEN_POINT_KEYS = [
  'main-hand-weapon.spell-damage', // 3
  'trinket.spell-damage', // 3
  'ring.spell-damage', // 2
  'chest.cloth.spell-damage', // 1
  'head.cloth.spell-damage', // 1
]

function rowsFor(keys: readonly string[], tierCount = 3, firstRank = 50): NeedListRow[] {
  const rows: NeedListRow[] = []
  keys.forEach((key, index) => {
    const cost = findNeedDefinition(key)?.cost ?? 0
    for (let tier = 0; tier < tierCount; tier += 1) {
      rows.push({ loot_item_id: `row-${key}-${tier}`, rank: firstRank - index, need_key: key, allocation_cost: cost })
    }
  })
  return rows
}

describe('checkNeedList (D-07, D-10, DISC-05)', () => {
  it('passes a 15-row, 10-point list a Mage can use', () => {
    const rows = rowsFor(TEN_POINT_KEYS)
    expect(rows).toHaveLength(15)
    const result = checkNeedList(rows, MAGE)
    expect(result.budget).toMatchObject({ ok: true, used: 10, limit: 10 })
    expect(result.ineligible).toEqual([])
  })

  it('refuses an 11-point list and reports three big picks', () => {
    const rows = rowsFor([
      'main-hand-weapon.spell-damage',
      'trinket.spell-damage',
      'ranged-weapon.spell-damage',
      'chest.cloth.spell-damage',
      'head.cloth.spell-damage',
    ])
    const result = checkNeedList(rows, MAGE)
    expect(result.budget).toMatchObject({ ok: false, used: 11, bigPicks: 3 })
  })

  it('counts each key when five keys share one rank (T-04-03-01)', () => {
    const rows = TEN_POINT_KEYS.flatMap((key) => rowsFor([key], 1, 50))
    expect(rows.every((row) => row.rank === 50)).toBe(true)
    expect(checkNeedList(rows, MAGE).budget).toMatchObject({ used: 10, ok: true })

    const over = [...rows, ...rowsFor(['ranged-weapon.spell-damage'], 1, 50)]
    expect(checkNeedList(over, MAGE).budget).toMatchObject({ used: 13, ok: false })
  })

  it('lists every row of a need the class and spec cannot use', () => {
    const rows = rowsFor(['chest.plate.tank'], 3)
    const result = checkNeedList(rows, MAGE)
    expect(result.ineligible).toHaveLength(3)
    expect(result.ineligible.every((row) => row.need_key === 'chest.plate.tank')).toBe(true)
  })

  it('treats a row with no need key as ineligible', () => {
    const result = checkNeedList(
      [{ loot_item_id: 'row-1', rank: 50, need_key: null, allocation_cost: 1 }],
      MAGE,
    )
    expect(result.ineligible).toEqual([{ loot_item_id: 'row-1', need_key: null }])
  })

  it('refuses every need for a character with no class', () => {
    const rows = rowsFor(TEN_POINT_KEYS)
    expect(checkNeedList(rows, { className: null, specName: null }).ineligible).toHaveLength(15)
  })

  it('passes an empty list', () => {
    expect(checkNeedList([], MAGE)).toEqual({
      budget: { ok: true, used: 0, limit: 10, bigPicks: 0 },
      ineligible: [],
    })
  })
})
