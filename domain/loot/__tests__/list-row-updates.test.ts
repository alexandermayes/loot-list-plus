import { describe, it, expect } from 'vitest'
import {
  positionKey,
  removeRankingAt,
  detailRowKey,
  withoutDetailRow,
  restoreDetailRow,
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
})
