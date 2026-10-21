// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createNeedSkipScope } from '@/lib/loot/need-skip'
import { buildMemberRankedItems, fetchReceivedCounts, inExportExpansion, type RankedSubmission } from '../member-ranked-items'

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

describe('buildMemberRankedItems need rows (D-14, D-16)', () => {
  const needEntry = (rank: number): Item => ({
    rank,
    slot: 1,
    removed_at: null,
    loot_items: { wowhead_id: null, kind: 'need' },
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('skips a need entry through the kind branch and counts it on the scope', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const scope = createNeedSkipScope('addon-guild-data')
    const result = buildMemberRankedItems([sub('c1', [item(20928, 50), needEntry(40), needEntry(10)])], null, scope)
    expect(result).toEqual({ c1: [{ wowhead_id: 20928, rank: 50 }] })
    expect(scope.skipped).toBe(2)
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('skips a need entry without a scope and does not throw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(buildMemberRankedItems([sub('c1', [needEntry(40), item(20928, 50)])], null)).toEqual({
      c1: [{ wowhead_id: 20928, rank: 50 }],
    })
    expect(warn).not.toHaveBeenCalled()
  })

  it('reads the kind from an embedded array too, and an item with kind item is kept', () => {
    const scope = createNeedSkipScope('addon-export-string')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const arrayNeed: Item = { rank: 9, slot: 1, removed_at: null, loot_items: [{ wowhead_id: null, kind: 'need' }] }
    const kindedItem: Item = { rank: 8, slot: 1, removed_at: null, loot_items: { wowhead_id: 16921, kind: 'item' } }
    expect(buildMemberRankedItems([sub('c1', [arrayNeed, kindedItem])], null, scope)).toEqual({
      c1: [{ wowhead_id: 16921, rank: 8 }],
    })
    expect(scope.skipped).toBe(1)
  })

  it('a removed need entry is not counted as a skipped need', () => {
    const scope = createNeedSkipScope('addon-guild-data')
    const removed = { ...needEntry(40), removed_at: '2026-09-21T10:00:00Z' }
    buildMemberRankedItems([sub('c1', [removed, item(20928, 50)])], null, scope)
    expect(scope.skipped).toBe(0)
  })
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

  it('M7 two approved lists for one raider merge; the same item and slot keeps the best rank; one award skips it once', () => {
    const subs = [
      sub('c1', [item(20928, 30), item(16921, 10)]),
      sub('c2', [item(16921, 5)]),
      sub('c1', [item(20928, 50), item(20929, 7)]),
    ]
    const merged = {
      c1: [
        { wowhead_id: 20929, rank: 7 },
        { wowhead_id: 16921, rank: 10 },
        { wowhead_id: 20928, rank: 50 },
      ],
      c2: [{ wowhead_id: 16921, rank: 5 }],
    }
    expect(buildMemberRankedItems(subs, null)).toEqual(merged)
    // Read order does not change which rank wins.
    expect(buildMemberRankedItems([...subs].reverse(), null).c1).toEqual(merged.c1)
    // One award of 20928 skips the single merged entry (rank 50) once.
    expect(buildMemberRankedItems(subs, new Map([['c1-20928', 1]])).c1).toEqual([
      { wowhead_id: 20929, rank: 7 },
      { wowhead_id: 16921, rank: 10 },
    ])
    // A submission with no items list adds nothing and does not replace.
    expect(buildMemberRankedItems([sub('c1', [item(20928, 50)]), sub('c1', null)], null)).toEqual({
      c1: [{ wowhead_id: 20928, rank: 50 }],
    })
    expect(buildMemberRankedItems([sub('c1', null)], null)).toEqual({})
  })

  it('M7c a second copy in slot 2 stays separate', () => {
    const subs = [
      sub('c1', [item(20928, 50), item(20928, 40, { slot: 2 })]),
      sub('c1', [item(20928, 45)]),
    ]
    expect(buildMemberRankedItems(subs, null).c1).toEqual([
      { wowhead_id: 20928, rank: 40 },
      { wowhead_id: 20928, rank: 50 },
    ])
  })

  it('M7d two entries for one item and slot on one list stay two after a merge', () => {
    const subs = [
      sub('c1', [item(30183, 20), item(30183, 10)]),
      sub('c1', [item(30183, 15)]),
    ]
    expect(buildMemberRankedItems(subs, null).c1).toEqual([
      { wowhead_id: 30183, rank: 15 },
      { wowhead_id: 30183, rank: 20 },
    ])
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

describe('inExportExpansion', () => {
  const rows: Array<{ expansion_id?: string | null }> = [
    { expansion_id: 'exp-1' },
    { expansion_id: 'exp-2' },
    { expansion_id: null },
    {},
  ]

  it('keeps the export expansion and lists with no expansion_id', () => {
    expect(inExportExpansion(rows, 'exp-1')).toEqual([rows[0], rows[2], rows[3]])
  })

  it('keeps every list when there is no expansion, and returns a new array', () => {
    for (const expansionId of [null, undefined]) {
      const kept = inExportExpansion(rows, expansionId)
      expect(kept).toEqual(rows)
      expect(kept).not.toBe(rows)
    }
  })
})

type HistoryRow = { character_id: string | null; loot_item: { wowhead_id: number | null } | null }

/** Recording loot_history fake: answers each range() call with the next page. */
function historyClient(pages: Array<HistoryRow[] | 'error'>) {
  const calls: Array<{ table: string; cols: string; filters: Array<[string, unknown]>; order?: [string, boolean]; range?: [number, number] }> = []
  const queue = [...pages]
  const client = {
    from(table: string) {
      const call: (typeof calls)[number] = { table, cols: '', filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: (cols: string) => { call.cols = cols; return builder },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        order: (col: string, opts: { ascending: boolean }) => { call.order = [col, opts.ascending]; return builder },
        range: (from: number, to: number) => {
          call.range = [from, to]
          const page = queue.shift() ?? []
          return Promise.resolve(page === 'error' ? { data: null, error: { message: 'history boom' } } : { data: page, error: null })
        },
      }
      return builder
    },
  }
  return { client, calls }
}

describe('fetchReceivedCounts', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('R1 counts per character and wowhead id across pages, filtered by guild, ordered by id', async () => {
    const fullPage: HistoryRow[] = Array.from({ length: 1000 }, (_, i) => (
      i < 998
        ? { character_id: 'c1', loot_item: { wowhead_id: 20928 } }
        : i === 998
          ? { character_id: null, loot_item: { wowhead_id: 20928 } }
          : { character_id: 'c2', loot_item: null }
    ))
    const { client, calls } = historyClient([fullPage, [{ character_id: 'c1', loot_item: { wowhead_id: 16921 } }]])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const counts = await fetchReceivedCounts(client as any, 'g1')

    expect(counts).toEqual(new Map([['c1-20928', 998], ['c1-16921', 1]]))
    expect(calls).toHaveLength(2)
    for (const call of calls) {
      expect(call.table).toBe('loot_history')
      expect(call.cols).toBe('character_id, loot_item:loot_items(wowhead_id)')
      expect(call.filters).toEqual([['guild_id', 'g1']])
      expect(call.order).toEqual(['id', true])
    }
    expect(calls.map(c => c.range)).toEqual([[0, 999], [1000, 1999]])
  })

  it('R2 an error on any page returns null and logs with a constant first argument', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fullPage: HistoryRow[] = Array.from({ length: 1000 }, () => ({ character_id: 'c1', loot_item: { wowhead_id: 20928 } }))
    for (const pages of [['error'], [fullPage, 'error']] as Array<Array<HistoryRow[] | 'error'>>) {
      errorSpy.mockClear()
      const { client } = historyClient(pages)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(await fetchReceivedCounts(client as any, 'g1')).toBeNull()
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to read loot history for the addon export receive skip:',
        'history boom',
      )
    }
  })

  it('R2b a client that throws also returns null', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = { from: () => { throw new Error('no client') } }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await fetchReceivedCounts(client as any, 'g1')).toBeNull()
  })
})
