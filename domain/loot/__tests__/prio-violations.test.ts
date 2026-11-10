import { describe, it, expect } from 'vitest'
import {
  findPrioViolations,
  prioViolationMessage,
  type PrioCheckItem,
} from '@/domain/loot/prio-violations'
import { canRankInZone, zoneForRank, type ListZone } from '@/domain/loot/prio-zones'

const primary: PrioCheckItem = { id: 'primary', is_allocated: true, character_spec_type: 'primary' }
const secondary: PrioCheckItem = { id: 'secondary', is_allocated: true, character_spec_type: 'secondary' }
const otherClasses: PrioCheckItem = { id: 'other', is_allocated: true, character_spec_type: null, has_primary_only: false }
const primaryOnly: PrioCheckItem = { id: 'primary-only', is_allocated: true, character_spec_type: null, has_primary_only: true }
const open: PrioCheckItem = { id: 'open', is_allocated: false, character_spec_type: null }
const lootCouncil: PrioCheckItem = { id: 'lc', is_loot_council: true, is_allocated: true, character_spec_type: null }

const ITEMS = [primary, secondary, otherClasses, primaryOnly, open, lootCouncil]

describe('zoneForRank', () => {
  it('maps the list zones at their boundaries', () => {
    expect([50, 39].map(zoneForRank)).toEqual(['bracket', 'bracket'])
    expect([38, 25].map(zoneForRank)).toEqual(['noBracket', 'noBracket'])
    expect([24, 1].map(zoneForRank)).toEqual(['offSpec', 'offSpec'])
  })
})

describe('findPrioViolations', () => {
  // regression for #484: a list saved before an officer moved prio to other
  // classes kept the item in Brackets 1-4 and submitted without complaint.
  it('flags an item prio-d to other classes in Brackets 1-4 and No Bracket', () => {
    const result = findPrioViolations(
      [
        { loot_item_id: 'other', rank: 48, slot: 1 },
        { loot_item_id: 'other', rank: 30, slot: 2 },
        { loot_item_id: 'other', rank: 10, slot: 1 },
      ],
      ITEMS,
    )
    expect(result).toEqual([
      { loot_item_id: 'other', rank: 48, slot: 1, zone: 'bracket' },
      { loot_item_id: 'other', rank: 30, slot: 2, zone: 'noBracket' },
    ])
  })

  it('flags a secondary item in Brackets 1-4 only', () => {
    const result = findPrioViolations(
      [
        { loot_item_id: 'secondary', rank: 39, slot: 1 },
        { loot_item_id: 'secondary', rank: 38, slot: 1 },
      ],
      ITEMS,
    )
    expect(result).toEqual([{ loot_item_id: 'secondary', rank: 39, slot: 1, zone: 'bracket' }])
  })

  it('allows primary and open items everywhere and primary-only items from No Bracket down', () => {
    const entries = [50, 38, 24].flatMap(rank => [
      { loot_item_id: 'primary', rank, slot: 1 },
      { loot_item_id: 'open', rank, slot: 2 },
    ])
    expect(findPrioViolations(entries, ITEMS)).toEqual([])
    expect(
      findPrioViolations(
        [
          { loot_item_id: 'primary-only', rank: 45, slot: 1 },
          { loot_item_id: 'primary-only', rank: 30, slot: 1 },
        ],
        ITEMS,
      ),
    ).toEqual([{ loot_item_id: 'primary-only', rank: 45, slot: 1, zone: 'bracket' }])
  })

  it('never flags a Loot Council item, which every editor pool lists', () => {
    const entries = [50, 30, 5].map(rank => ({ loot_item_id: 'lc', rank, slot: 1 }))
    expect(findPrioViolations(entries, ITEMS)).toEqual([])
  })

  it('skips an item outside the character item set', () => {
    expect(findPrioViolations([{ loot_item_id: 'unknown', rank: 50, slot: 1 }], ITEMS)).toEqual([])
  })

  // regression for #484: award slot locks are officer awards and must never
  // be re-judged by prio.
  it('skips a rank held by an active lock on the same item, not one on another item', () => {
    const locks = [{ rank: 50, slot: 1, loot_item_id: 'other' }]
    expect(findPrioViolations([{ loot_item_id: 'other', rank: 50, slot: 1 }], ITEMS, locks)).toEqual([])
    expect(
      findPrioViolations([{ loot_item_id: 'other', rank: 50, slot: 2 }], ITEMS, locks),
    ).toEqual([{ loot_item_id: 'other', rank: 50, slot: 2, zone: 'bracket' }])
  })

  it('returns list order and accepts string-typed ranks from the database', () => {
    const result = findPrioViolations(
      [
        { loot_item_id: 'other', rank: '30' as unknown as number, slot: '1' as unknown as number },
        { loot_item_id: 'other', rank: 47, slot: 2 },
        { loot_item_id: 'other', rank: 47, slot: 1 },
      ],
      ITEMS,
    )
    expect(result.map(v => [v.rank, v.slot])).toEqual([[47, 1], [47, 2], [30, 1]])
  })

  // The rule must flag exactly what the editor refuses: its pools are
  // canRankInZone per zone plus every Loot Council item.
  it('agrees with the editor pools for every item and rank', () => {
    const inEditorPool = (item: PrioCheckItem, zone: ListZone) =>
      canRankInZone(item, zone) || item.is_loot_council === true
    for (const item of ITEMS) {
      for (let rank = 1; rank <= 50; rank++) {
        const flagged = findPrioViolations([{ loot_item_id: item.id, rank, slot: 1 }], ITEMS).length > 0
        expect(flagged).toBe(!inEditorPool(item, zoneForRank(rank)))
      }
    }
  })
})

describe('prioViolationMessage', () => {
  it('names one item with its rank', () => {
    expect(prioViolationMessage([{ item_name: 'Test Blade', rank: 48 }])).toBe(
      'Officers set prio for Test Blade (rank 48) to other classes. Move it to Off-spec or remove it, then submit again.',
    )
  })

  it('lists several items with their ranks and no em dashes', () => {
    const message = prioViolationMessage([
      { item_name: 'Test Blade', rank: 48 },
      { item_name: 'Test Ring', rank: 30 },
    ])
    expect(message).toBe(
      'Officers set prio for these items to other classes: Test Blade (rank 48), Test Ring (rank 30). Move them to Off-spec or remove them, then submit again.',
    )
    expect(message).not.toContain('—')
  })
})
