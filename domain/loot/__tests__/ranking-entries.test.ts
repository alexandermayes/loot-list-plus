import { describe, it, expect } from 'vitest'
import { rankingEntryKey, bestEntryPerCharacter, aggregateListStats } from '../ranking-entries'

describe('rankingEntryKey', () => {
  it('gives each entry of one raider its own key', () => {
    const keys = [
      rankingEntryKey({ character_id: 'bob', rank: 50, slot: 1 }),
      rankingEntryKey({ character_id: 'bob', rank: 30, slot: 2 }),
      rankingEntryKey({ character_id: 'bob', rank: 50, slot: 2 }),
    ]
    expect(new Set(keys).size).toBe(3)
  })

  it('treats a missing slot as 0', () => {
    expect(rankingEntryKey({ character_id: 'bob', rank: 50 })).toBe(rankingEntryKey({ character_id: 'bob', rank: 50, slot: 0 }))
    expect(rankingEntryKey({ character_id: 'bob', rank: 50, slot: null })).toBe('bob:50:0')
  })
})

describe('bestEntryPerCharacter', () => {
  it('keeps the first entry per raider and the raider order', () => {
    const rankings = [
      { character_id: 'bob', marker: 'bob-best' },
      { character_id: 'alice', marker: 'alice-best' },
      { character_id: 'bob', marker: 'bob-second' },
      { character_id: 'carol', marker: 'carol-best' },
    ]
    expect(bestEntryPerCharacter(rankings).map(r => r.marker)).toEqual(['bob-best', 'alice-best', 'carol-best'])
  })
})

describe('aggregateListStats', () => {
  it('counts lists, not entries, and averages each list\'s best rank', () => {
    expect(aggregateListStats([
      { character_id: 'bob', item_rank: 50 },
      { character_id: 'bob', item_rank: 30 },
      { character_id: 'alice', item_rank: 40 },
    ])).toEqual({ total_lists: 2, average_rank: 45 })
  })

  it('returns zeros for no players', () => {
    expect(aggregateListStats([])).toEqual({ total_lists: 0, average_rank: 0 })
  })
})
