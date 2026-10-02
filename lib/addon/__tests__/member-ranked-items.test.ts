// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { buildMemberRankedItems, type RankedSubmission } from '../member-ranked-items'

type Item = NonNullable<RankedSubmission['loot_submission_items']>[number]

const item = (wowheadId: number | null, rank: number, extra: Partial<Item> = {}): Item => ({
  rank,
  slot: 1,
  removed_at: null,
  loot_items: { wowhead_id: wowheadId },
  ...extra,
})

const sub = (characterId: string, items: Item[] | null): RankedSubmission => ({
  character_id: characterId,
  loot_submission_items: items,
})

describe('buildMemberRankedItems', () => {
  it('M1 leaves out a row with removed_at set', () => {
    const result = buildMemberRankedItems(
      [sub('c1', [item(20928, 50), item(16921, 30, { removed_at: '2026-09-21T10:00:00Z' })])],
      null,
    )
    expect(result).toEqual({ c1: [{ wowhead_id: 20928, rank: 50 }] })
  })

  it('M2 sends one raider\'s entries rank ascending, slot descending on equal ranks (best last)', () => {
    const result = buildMemberRankedItems(
      [sub('c1', [
        item(20928, 50, { slot: 1 }),
        item(16921, 12),
        item(20929, 30),
        item(20928, 30, { slot: 1 }),
        item(20930, 30, { slot: 2 }),
      ])],
      null,
    )
    expect(result.c1.map(e => e.rank)).toEqual([12, 30, 30, 30, 50])
    // Equal rank 30: slot 2 before slot 1, so slot 1 is the later one.
    expect(result.c1.slice(1, 4)).toEqual([
      { wowhead_id: 20930, rank: 30 },
      { wowhead_id: 20929, rank: 30 },
      { wowhead_id: 20928, rank: 30 },
    ])
  })

  it('M3 a received copy drops the best-ranked entry first; two received copies drop both', () => {
    const subs = [sub('c1', [item(20928, 50, { slot: 1 }), item(20928, 30, { slot: 2 }), item(16921, 10)])]
    expect(buildMemberRankedItems(subs, new Map([['c1-20928', 1]]))).toEqual({
      c1: [{ wowhead_id: 16921, rank: 10 }, { wowhead_id: 20928, rank: 30 }],
    })
    expect(buildMemberRankedItems(subs, new Map([['c1-20928', 2]]))).toEqual({
      c1: [{ wowhead_id: 16921, rank: 10 }],
    })
    // Another raider's award skips nothing here.
    expect(buildMemberRankedItems(subs, new Map([['c2-20928', 1]])).c1).toHaveLength(3)
  })

  it('M4 null counts drop nothing', () => {
    const subs = [sub('c1', [item(20928, 50), item(20928, 30, { slot: 2 })])]
    expect(buildMemberRankedItems(subs, null).c1).toHaveLength(2)
  })

  it('M5 mirrors a faction-variant item right after its source row, after ordering and the skip', () => {
    // 19003 Head of Nefarian (Alliance) mirrors to 19002 (Horde).
    const subs = [sub('c1', [item(19003, 40), item(16921, 10), item(19003, 20, { slot: 2 })])]
    expect(buildMemberRankedItems(subs, new Map([['c1-19003', 1]]))).toEqual({
      c1: [
        { wowhead_id: 16921, rank: 10 },
        { wowhead_id: 19003, rank: 20 },
        { wowhead_id: 19002, rank: 20 },
      ],
    })
  })

  it('M6 leaves out rows with no wowhead_id', () => {
    const subs = [sub('c1', [item(null, 50), item(20928, 30), item(0, 20), { ...item(1, 1), loot_items: null }])]
    expect(buildMemberRankedItems(subs, null)).toEqual({ c1: [{ wowhead_id: 20928, rank: 30 }] })
  })

  it('M7 a second approved submission for the same character replaces the first', () => {
    const subs = [sub('c1', [item(20928, 50)]), sub('c2', [item(16921, 5)]), sub('c1', [item(20929, 7)])]
    expect(buildMemberRankedItems(subs, null)).toEqual({
      c1: [{ wowhead_id: 20929, rank: 7 }],
      c2: [{ wowhead_id: 16921, rank: 5 }],
    })
    // A submission with no items list does not replace (today's behaviour).
    expect(buildMemberRankedItems([sub('c1', [item(20928, 50)]), sub('c1', null)], null)).toEqual({
      c1: [{ wowhead_id: 20928, rank: 50 }],
    })
  })

  it('M7b accepts loot_items as an embedded array', () => {
    const subs = [sub('c1', [{ ...item(1, 9), loot_items: [{ wowhead_id: 20928 }] }])]
    expect(buildMemberRankedItems(subs, null)).toEqual({ c1: [{ wowhead_id: 20928, rank: 9 }] })
  })

  it('M8 does not mutate its input', () => {
    const subs = [sub('c1', [item(20928, 50), item(16921, 10), item(20928, 30, { slot: 2 })])]
    const before = JSON.parse(JSON.stringify(subs))
    buildMemberRankedItems(subs, new Map([['c1-20928', 1]]))
    expect(subs).toEqual(before)
  })
})
