import { describe, it, expect } from 'vitest'
import { applyGlobalReceiveSkip, pickReceivedEntries } from '../apply-receive-skip'

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

// GH #293: the master sheet skips received copies across every row of one
// wowhead_id, best rank first, instead of spending the skip on whichever row
// it happens to process first.
describe('pickReceivedEntries', () => {
  const e = (key: string, rank: number, slot: number, row: string) => ({ key, rank, slot, row })

  it('skips the best-ranked entry whatever the input order', () => {
    const x = e('bob-19140', 30, 1, 'X')
    const y = e('bob-19140', 50, 1, 'Y')
    for (const entries of [[x, y], [y, x]]) {
      const picked = pickReceivedEntries(entries, new Map([['bob-19140', 1]]))
      expect([...picked].map(p => p.row)).toEqual(['Y'])
    }
  })

  it('skips slot 1 before slot 2 on equal ranks', () => {
    const slot2 = e('bob-19140', 40, 2, 'S2')
    const slot1 = e('bob-19140', 40, 1, 'S1')
    const picked = pickReceivedEntries([slot2, slot1], new Map([['bob-19140', 1]]))
    expect([...picked].map(p => p.row)).toEqual(['S1'])
  })

  it('never skips more entries than exist', () => {
    const only = e('bob-19140', 40, 1, 'only')
    const picked = pickReceivedEntries([only], new Map([['bob-19140', 2]]))
    expect([...picked]).toEqual([only])
  })

  it('leaves other raiders and other items alone', () => {
    const bob = e('bob-19140', 40, 1, 'bob')
    const alice = e('alice-19140', 50, 1, 'alice')
    const other = e('bob-21891', 50, 1, 'other')
    const picked = pickReceivedEntries([bob, alice, other], new Map([['bob-19140', 1]]))
    expect([...picked].map(p => p.row)).toEqual(['bob'])
  })

  it('applyGlobalReceiveSkip removes slot 1 before slot 2 on a tie', () => {
    const input = [
      ir(19140, [{ character_id: 'bob', rank: 40, slot: 2, marker: 's2' } as R, { character_id: 'bob', rank: 40, slot: 1, marker: 's1' } as R]),
    ]
    const out = applyGlobalReceiveSkip(input, new Map([['bob-19140', 1]]))
    expect(out[0].rankings.map(x => x.marker)).toEqual(['s2'])
  })
})
