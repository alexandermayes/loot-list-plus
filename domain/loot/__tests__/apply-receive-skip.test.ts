import { describe, it, expect } from 'vitest'
import { applyGlobalReceiveSkip } from '../apply-receive-skip'

interface R {
  character_id: string
  rank: number
  marker?: string
}

function r(character_id: string, rank: number, marker?: string): R {
  return { character_id, rank, marker }
}

function ir(wowhead_id: number, rankings: R[]) {
  return { item: { wowhead_id }, rankings }
}

describe('applyGlobalReceiveSkip', () => {
  it('returns input unchanged when no awards exist', () => {
    const input = [ir(30183, [r('bob', 50), r('alice', 49)])]
    const out = applyGlobalReceiveSkip(input, new Map())
    expect(out).toHaveLength(1)
    expect(out[0].rankings).toHaveLength(2)
  })

  it('removes a single top-rank entry when one award exists', () => {
    const input = [
      ir(30183, [r('bob', 50, 'top'), r('bob', 40, 'low')]),
    ]
    const out = applyGlobalReceiveSkip(input, new Map([['bob-30183', 1]]))
    expect(out[0].rankings).toHaveLength(1)
    expect(out[0].rankings[0].marker).toBe('low')
  })

  it('skips across tiers: one award removes one entry total when the wowhead spans tiers (NV bug)', () => {
    // Bob ranked NV in both SSC and TK. He's been awarded NV once. With the
    // old per-tier skip, the award removed him from BOTH tiers' rankings.
    // The global skip should remove exactly one entry — his highest-ranked.
    const input = [
      ir(30183, [r('bob', 50, 'ssc')]),   // NV-SSC row, top pick
      ir(30183, [r('bob', 45, 'tk')]),    // NV-TK row, lower pick
    ]
    const out = applyGlobalReceiveSkip(input, new Map([['bob-30183', 1]]))
    const remaining = out.flatMap(g => g.rankings)
    expect(remaining).toHaveLength(1)
    expect(remaining[0].marker).toBe('tk')
  })

  it('removes multiple entries when received count > 1 (duplicate token awards)', () => {
    const input = [
      ir(30183, [r('bob', 50), r('bob', 45), r('bob', 30)]),
    ]
    const out = applyGlobalReceiveSkip(input, new Map([['bob-30183', 2]]))
    expect(out[0].rankings).toHaveLength(1)
    expect(out[0].rankings[0].rank).toBe(30)
  })

  it('does not skip below zero when received > number of rankings', () => {
    const input = [ir(30183, [r('bob', 50)])]
    const out = applyGlobalReceiveSkip(input, new Map([['bob-30183', 5]]))
    expect(out[0].rankings).toHaveLength(0)
  })

  it('only affects matching (character, wowhead) pairs', () => {
    const input = [
      ir(30183, [r('bob', 50), r('alice', 49)]),
      ir(99999, [r('bob', 30)]),
    ]
    const out = applyGlobalReceiveSkip(input, new Map([['bob-30183', 1]]))
    // Bob's NV ranking removed; Alice's NV and Bob's other-item ranking untouched.
    expect(out[0].rankings).toEqual([{ character_id: 'alice', rank: 49 }])
    expect(out[1].rankings).toEqual([{ character_id: 'bob', rank: 30 }])
  })

  it('preserves the order of ItemRankings groups', () => {
    const input = [
      ir(100, [r('a', 1)]),
      ir(200, [r('a', 1)]),
      ir(300, [r('a', 1)]),
    ]
    const out = applyGlobalReceiveSkip(input, new Map())
    expect(out.map(g => g.item.wowhead_id)).toEqual([100, 200, 300])
  })
})
