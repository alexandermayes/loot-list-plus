// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  NEED_SHAPE_CODE,
  NEED_SHAPE_ERROR,
  checkNeedList,
  checkNeedShape,
  type NeedListRow,
  type NeedShapeRow,
} from '@/domain/loot/need-list-rules'
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

// regression for WR-01 (Phase 4 review): the server checked only the budget
// and eligibility, so a direct save could hold ten cost-1 needs or stack all
// five at rank 50. The picker's contract is at most five keys at ranks 50 to
// 46, one key per rank, fanned out one slot per Discovery tier.
describe('checkNeedShape (WR-01)', () => {
  // One row per tier per key, at ranks 50 down, as the picker saves them.
  function shapeRows(keys: readonly string[], tierCount = 3, rankOf = (index: number) => 50 - index): NeedShapeRow[] {
    return keys.flatMap((key, index) =>
      Array.from({ length: tierCount }, (_, tier) => ({ rank: rankOf(index), slot: tier + 1, need_key: key })),
    )
  }
  const COST_ONE_KEYS = Array.from({ length: 10 }, (_, i) => `cost-one-${i}`)

  it('passes the picker output: five keys at ranks 50 to 46 on 15 rows', () => {
    const rows = shapeRows(TEN_POINT_KEYS)
    expect(rows).toHaveLength(15)
    expect(checkNeedShape(rows)).toEqual({ ok: true })
  })

  it('passes a list with fewer than five picks and gaps between them', () => {
    expect(checkNeedShape(shapeRows(['a', 'b'], 3, (i) => (i === 0 ? 50 : 47)))).toEqual({ ok: true })
  })

  it('passes the same key at two ranks (Ring and Trinket allow two copies)', () => {
    expect(checkNeedShape(shapeRows(['ring.spell-damage', 'ring.spell-damage']))).toEqual({ ok: true })
  })

  it('passes rows on every tier slot from 1 to 8', () => {
    expect(checkNeedShape(shapeRows(TEN_POINT_KEYS, 8))).toEqual({ ok: true })
  })

  it('passes an empty list', () => {
    expect(checkNeedShape([])).toEqual({ ok: true })
  })

  it('refuses ten cost-1 needs at ranks 50 to 41', () => {
    const result = checkNeedShape(shapeRows(COST_ONE_KEYS))
    expect(result).toMatchObject({ ok: false, code: NEED_SHAPE_CODE, message: NEED_SHAPE_ERROR })
    expect(result.ok === false && result.details.rule).toBe('pick_count')
    expect(result.ok === false && result.details.picks).toBe(10)
  })

  it('refuses five needs stacked at rank 50', () => {
    const result = checkNeedShape(shapeRows(TEN_POINT_KEYS, 3, () => 50))
    expect(result).toMatchObject({ ok: false, code: NEED_SHAPE_CODE, details: { rule: 'one_key_per_rank', ranks: [50] } })
  })

  it('refuses a rank-49 row holding a second key', () => {
    const rows = [...shapeRows(TEN_POINT_KEYS), { rank: 49, slot: 4, need_key: 'head.cloth.spell-damage' }]
    expect(checkNeedShape(rows)).toMatchObject({ ok: false, details: { rule: 'one_key_per_rank', ranks: [49] } })
  })

  it('refuses a pick at a rank outside 50 to 46', () => {
    const rows = shapeRows(['a', 'b'], 3, (i) => (i === 0 ? 50 : 45))
    expect(checkNeedShape(rows)).toMatchObject({ ok: false, details: { rule: 'rank', ranks: [45] } })
  })

  it('refuses a row outside tier slots 1 to 8', () => {
    const rows = [...shapeRows(TEN_POINT_KEYS), { rank: 50, slot: 9, need_key: TEN_POINT_KEYS[0] }]
    expect(checkNeedShape(rows)).toMatchObject({ ok: false, details: { rule: 'slot', ranks: [50] } })
  })

  it('counts a row with no need key as its own key, so it cannot share a filled rank', () => {
    const rows = [...shapeRows(TEN_POINT_KEYS), { rank: 48, slot: 4, need_key: null }]
    expect(checkNeedShape(rows)).toMatchObject({ ok: false, details: { rule: 'one_key_per_rank', ranks: [48] } })
  })

  it('words the refusal as one plain sentence', () => {
    expect(NEED_SHAPE_ERROR).toMatch(/^[^.]+\.$/)
    expect(NEED_SHAPE_ERROR).not.toMatch(/\u2014/)
  })
})
