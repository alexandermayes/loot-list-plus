import { describe, it, expect } from 'vitest'
import { diffListItems } from '../list-diff'

const A = (rank: number) => ({ loot_item_id: 'A', rank, name: 'Band of Devastation' })
const B = (rank: number) => ({ loot_item_id: 'B', rank, name: 'Skull of Gul\'dan' })

describe('diffListItems (GH #293: a list is a multiset)', () => {
  it('shows one added entry for a second copy', () => {
    expect(diffListItems([A(50), A(30)], [A(50)])).toEqual([
      { type: 'added', item_name: 'Band of Devastation', rank: 30 },
    ])
  })

  it('shows one removed entry for a dropped copy', () => {
    expect(diffListItems([A(50)], [A(50), A(30)])).toEqual([
      { type: 'removed', item_name: 'Band of Devastation', old_rank: 30 },
    ])
  })

  it('shows one moved entry when one copy changes rank', () => {
    expect(diffListItems([A(50), A(20)], [A(50), A(30)])).toEqual([
      { type: 'moved', item_name: 'Band of Devastation', old_rank: 30, new_rank: 20 },
    ])
  })

  it('keeps the single-copy move', () => {
    expect(diffListItems([A(45)], [A(50)])).toEqual([
      { type: 'moved', item_name: 'Band of Devastation', old_rank: 50, new_rank: 45 },
    ])
  })

  it('shows two moves for a swap', () => {
    expect(diffListItems([A(49), B(50)], [A(50), B(49)])).toEqual([
      { type: 'moved', item_name: 'Skull of Gul\'dan', old_rank: 49, new_rank: 50 },
      { type: 'moved', item_name: 'Band of Devastation', old_rank: 50, new_rank: 49 },
    ])
  })

  it('returns nothing for identical lists', () => {
    expect(diffListItems([A(50), A(30), B(45)], [B(45), A(30), A(50)])).toEqual([])
  })

  it('orders added, removed, moved, each by rank descending', () => {
    const current = [A(10), A(40), B(20)]
    const snapshot = [B(48), B(35), { loot_item_id: 'C', rank: 15, name: 'Old Helm' }, { loot_item_id: 'C', rank: 44, name: 'Old Helm' }]
    expect(diffListItems(current, snapshot)).toEqual([
      { type: 'added', item_name: 'Band of Devastation', rank: 40 },
      { type: 'added', item_name: 'Band of Devastation', rank: 10 },
      { type: 'removed', item_name: 'Old Helm', old_rank: 44 },
      { type: 'removed', item_name: 'Skull of Gul\'dan', old_rank: 35 },
      { type: 'removed', item_name: 'Old Helm', old_rank: 15 },
      { type: 'moved', item_name: 'Skull of Gul\'dan', old_rank: 48, new_rank: 20 },
    ])
  })
})
