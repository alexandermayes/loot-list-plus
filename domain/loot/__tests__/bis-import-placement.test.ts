import { describe, it, expect } from 'vitest'
import {
  placeBisItems,
  type BisPlacementInput,
  type BisPlacementItem,
} from '@/domain/loot/bis-import-placement'

let nextWowheadId = 1000

function item(id: string, overrides: Partial<BisPlacementItem> = {}): BisPlacementItem {
  return {
    id,
    wowhead_id: nextWowheadId++,
    item_type: id,
    item_slot: id,
    allocation_cost: 1,
    ...overrides,
  }
}

function place(
  lootItems: BisPlacementItem[],
  overrides: Partial<BisPlacementInput> = {}
) {
  return placeBisItems({
    orderedBisItemIds: lootItems.map(i => i.id),
    lootItems,
    lockedPositions: {},
    currentRankings: {},
    equippedWowheadIds: new Set(),
    enforceSlotRestrictions: false,
    ...overrides,
  })
}

describe('placeBisItems behaviour', () => {
  it('fills Bracket 1 in BiS order, then moves to Bracket 2 at the point cap', () => {
    const items = ['a', 'b', 'c', 'd'].map(id => item(id))
    const { rankings, importedCount } = place(items)

    expect(rankings).toEqual({
      '50-1': 'a',
      '50-2': 'b',
      '49-1': 'c',
      '47-1': 'd',
    })
    expect(importedCount).toBe(4)
  })

  it('overflows to No Bracket when no bracket can take the item', () => {
    const { rankings, importedCount } = place([item('a')], {
      bracketLimits: { maxAllocationPoints: 0 },
    })

    expect(rankings).toEqual({ '38-1': 'a' })
    expect(importedCount).toBe(1)
  })

  it('skips Loot Council items, unknown ids and equipped items', () => {
    const lc = item('lc', { is_loot_council: true })
    const owned = item('owned')
    const fine = item('fine')
    const { rankings, importedCount } = placeBisItems({
      orderedBisItemIds: ['lc', 'missing', 'owned', 'fine'],
      lootItems: [lc, owned, fine],
      lockedPositions: {},
      currentRankings: {},
      equippedWowheadIds: new Set([owned.wowhead_id]),
      enforceSlotRestrictions: false,
    })

    expect(rankings).toEqual({ '50-1': 'fine' })
    expect(importedCount).toBe(1)
  })

  it('keeps a lock at its key and counts its points toward its bracket', () => {
    const locked = item('locked')
    const next = item('next')
    const { rankings, importedCount } = placeBisItems({
      // The locked item is also in the BiS list: it must not be placed twice.
      orderedBisItemIds: ['locked', 'next'],
      lootItems: [locked, next],
      lockedPositions: { '50-1': { rank: 50, slot: 1, loot_item_id: 'locked' } },
      currentRankings: { '50-1': 'locked' },
      equippedWowheadIds: new Set(),
      enforceSlotRestrictions: false,
      bracketLimits: { maxAllocationPoints: 1 },
    })

    // Bracket 1 is spent by the lock, so the next item moves to Bracket 2.
    expect(rankings).toEqual({ '50-1': 'locked', '47-1': 'next' })
    expect(importedCount).toBe(1)
  })

  it('does not hand a locked slot to the next item', () => {
    const locked = item('locked')
    const next = item('next')
    const { rankings } = placeBisItems({
      orderedBisItemIds: ['next'],
      lootItems: [locked, next],
      lockedPositions: { '50-1': { rank: 50, slot: 1, loot_item_id: 'locked' } },
      currentRankings: { '50-1': 'locked' },
      equippedWowheadIds: new Set(),
      enforceSlotRestrictions: false,
    })

    expect(rankings).toEqual({ '50-1': 'locked', '50-2': 'next' })
  })

  it('drops a lock whose rank no longer holds its item', () => {
    const locked = item('locked')
    const { rankings, importedCount } = placeBisItems({
      orderedBisItemIds: ['locked'],
      lootItems: [locked],
      lockedPositions: { '50-1': { rank: 50, slot: 1, loot_item_id: 'locked' } },
      currentRankings: { '50-1': 'someone-else' },
      equippedWowheadIds: new Set(),
      enforceSlotRestrictions: false,
    })

    expect(rankings).toEqual({ '50-1': 'locked' })
    expect(importedCount).toBe(1)
  })

  it('keeps a No Bracket lock and does not reuse its slot', () => {
    const locked = item('locked')
    const next = item('next')
    const { rankings } = placeBisItems({
      orderedBisItemIds: ['next'],
      lootItems: [locked, next],
      lockedPositions: { '38-1': { rank: 38, slot: 1, loot_item_id: 'locked' } },
      currentRankings: { '38-1': 'locked' },
      equippedWowheadIds: new Set(),
      enforceSlotRestrictions: false,
      bracketLimits: { maxAllocationPoints: 0 },
    })

    expect(rankings).toEqual({ '38-1': 'locked', '38-2': 'next' })
  })
})
