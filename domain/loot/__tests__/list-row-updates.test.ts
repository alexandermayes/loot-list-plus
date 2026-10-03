import { describe, it, expect } from 'vitest'
import {
  positionKey,
  removeRankingAt,
  detailRowKey,
  withoutDetailRow,
  restoreDetailRow,
  groupDetailRowsByRank,
} from '../list-row-updates'

describe('positionKey', () => {
  it('uses the rankings key format', () => {
    expect(positionKey(30, 2)).toBe('30-2')
  })
})

describe('removeRankingAt', () => {
  const rankings = { '50-1': 'A', '30-2': 'A', '45-1': 'B' }

  it('removes only the copy at the position', () => {
    expect(removeRankingAt(rankings, 'A', { rank: 30, slot: 2 })).toEqual({ '50-1': 'A', '45-1': 'B' })
  })

  it('leaves the map unchanged when the position holds a different item', () => {
    expect(removeRankingAt(rankings, 'A', { rank: 45, slot: 1 })).toEqual(rankings)
  })

  it('removes every copy when no position is given', () => {
    expect(removeRankingAt(rankings, 'A')).toEqual({ '45-1': 'B' })
  })

  it('does not mutate the input', () => {
    const input = { ...rankings }
    removeRankingAt(input, 'A', { rank: 30, slot: 2 })
    removeRankingAt(input, 'A')
    expect(input).toEqual(rankings)
  })
})

describe('detailRowKey', () => {
  it('gives distinct keys for two copies of one item', () => {
    expect(detailRowKey('A', 50, 1)).not.toBe(detailRowKey('A', 30, 2))
  })
})

describe('withoutDetailRow', () => {
  const rows = [
    { rank: 50, slot: 1, loot_item: { id: 'A' } },
    { rank: 30, slot: 2, loot_item: { id: 'A' } },
    { rank: 45, slot: 1, loot_item: { id: 'B' } },
  ]

  it('drops only the targeted copy', () => {
    expect(withoutDetailRow(rows, { lootItemId: 'A', rank: 30, slot: 2 })).toEqual([rows[0], rows[2]])
  })

  it('returns an equal array when nothing matches', () => {
    expect(withoutDetailRow(rows, { lootItemId: 'A', rank: 45, slot: 1 })).toEqual(rows)
  })

  it('compares rank and slot as numbers', () => {
    const stringy = [
      { rank: '30' as unknown as number, slot: '2' as unknown as number, loot_item: { id: 'A' } },
    ]
    expect(withoutDetailRow(stringy, { lootItemId: 'A', rank: 30, slot: 2 })).toEqual([])
  })
})

describe('restoreDetailRow', () => {
  const rows = [
    { rank: 50, slot: 1, loot_item: { id: 'A' }, removed_at: '2026-09-20T00:00:00Z' },
    { rank: 30, slot: 2, loot_item: { id: 'A' }, removed_at: '2026-09-21T00:00:00Z' },
  ]

  it('clears removed_at on the targeted copy only', () => {
    const result = restoreDetailRow(rows, { lootItemId: 'A', rank: 30, slot: 2 })
    expect(result[0].removed_at).toBe('2026-09-20T00:00:00Z')
    expect(result[1].removed_at).toBeNull()
  })

  it('does not mutate the input array or rows', () => {
    const result = restoreDetailRow(rows, { lootItemId: 'A', rank: 30, slot: 2 })
    expect(result).not.toBe(rows)
    expect(rows[1].removed_at).toBe('2026-09-21T00:00:00Z')
    expect(result[0]).toBe(rows[0])
  })

  // GH #354: since the removed row and a live row of the same item can now
  // share a position, prefer the removed row (restoring a live row is a
  // no-op there is nothing to undo); among several removed rows, the one
  // with the later removed_at.
  it('restores the removed row when a live row of the item shares the position (either order)', () => {
    const liveThenRemoved = [
      { rank: 50, slot: 1, loot_item: { id: 'A' }, removed_at: null },
      { rank: 50, slot: 1, loot_item: { id: 'A' }, removed_at: '2026-09-20T00:00:00Z' },
    ]
    const result1 = restoreDetailRow(liveThenRemoved, { lootItemId: 'A', rank: 50, slot: 1 })
    expect(result1[0].removed_at).toBeNull()
    expect(result1[1].removed_at).toBeNull()

    const removedThenLive = [
      { rank: 50, slot: 1, loot_item: { id: 'A' }, removed_at: '2026-09-20T00:00:00Z' },
      { rank: 50, slot: 1, loot_item: { id: 'A' }, removed_at: null },
    ]
    const result2 = restoreDetailRow(removedThenLive, { lootItemId: 'A', rank: 50, slot: 1 })
    expect(result2[0].removed_at).toBeNull()
    expect(result2[1].removed_at).toBeNull()
  })

  it('restores the later-removed row when two removed rows share the position', () => {
    const twoRemoved = [
      { rank: 50, slot: 1, loot_item: { id: 'A' }, removed_at: '2026-09-20T00:00:00Z' },
      { rank: 50, slot: 1, loot_item: { id: 'A' }, removed_at: '2026-09-21T00:00:00Z' },
    ]
    const result = restoreDetailRow(twoRemoved, { lootItemId: 'A', rank: 50, slot: 1 })
    expect(result[0].removed_at).toBe('2026-09-20T00:00:00Z')
    expect(result[1].removed_at).toBeNull()
  })
})

describe('groupDetailRowsByRank', () => {
  it('gives one cell per rank and slot, ranks descending', () => {
    const rows = [
      { rank: 50, slot: 1, loot_item: { id: 'A' } },
      { rank: 50, slot: 2, loot_item: { id: 'B' } },
      { rank: 49, slot: 2, loot_item: { id: 'C' } },
    ]
    const result = groupDetailRowsByRank(rows)
    expect(result).toEqual([
      { rank: 50, slot1: rows[0], slot2: rows[1] },
      { rank: 49, slot1: undefined, slot2: rows[2] },
    ])
  })

  it('shows the live row in slot1 when a live and a removed row share a position (either order)', () => {
    const live = { rank: 50, slot: 1, loot_item: { id: 'A' }, removed_at: null }
    const removed = { rank: 50, slot: 1, loot_item: { id: 'A' }, removed_at: '2026-09-20T00:00:00Z' }

    expect(groupDetailRowsByRank([live, removed])[0].slot1).toBe(live)
    expect(groupDetailRowsByRank([removed, live])[0].slot1).toBe(live)
  })

  it('shows the later-removed row when two removed rows share a position and no live row exists', () => {
    const earlier = { rank: 50, slot: 1, loot_item: { id: 'A' }, removed_at: '2026-09-20T00:00:00Z' }
    const later = { rank: 50, slot: 1, loot_item: { id: 'A' }, removed_at: '2026-09-21T00:00:00Z' }
    expect(groupDetailRowsByRank([earlier, later])[0].slot1).toBe(later)
    expect(groupDetailRowsByRank([later, earlier])[0].slot1).toBe(later)
  })

  it('keeps input order for equal or unparsable removed_at values', () => {
    const first = { rank: 50, slot: 1, loot_item: { id: 'A' }, removed_at: '2026-09-20T00:00:00Z' }
    const second = { rank: 50, slot: 1, loot_item: { id: 'A' }, removed_at: '2026-09-20T00:00:00Z' }
    expect(groupDetailRowsByRank([first, second])[0].slot1).toBe(first)

    const bad1 = { rank: 50, slot: 1, loot_item: { id: 'A' }, removed_at: 'not-a-date' }
    const bad2 = { rank: 50, slot: 1, loot_item: { id: 'A' }, removed_at: 'also-not-a-date' }
    expect(groupDetailRowsByRank([bad1, bad2])[0].slot1).toBe(bad1)
  })

  it('counts rows without removed_at as live, compares rank and slot as numbers, does not mutate input, and gives [] for empty input', () => {
    const noRemovedField = { rank: '50' as unknown as number, slot: '1' as unknown as number, loot_item: { id: 'A' } }
    const result = groupDetailRowsByRank([noRemovedField])
    expect(result).toEqual([{ rank: 50, slot1: noRemovedField, slot2: undefined }])

    const input = [{ rank: 50, slot: 1, loot_item: { id: 'A' } }]
    const copy = [...input]
    groupDetailRowsByRank(input)
    expect(input).toEqual(copy)

    expect(groupDetailRowsByRank([])).toEqual([])
  })
})
