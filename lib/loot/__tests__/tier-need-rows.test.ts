import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fetchTierNeedRows, fetchTierNeedRankings } from '@/lib/loot/tier-need-rows'

// Recording fake in the style of master-sheet-summary.test.ts: it records the
// table, select and filters of every read so a test can assert the read shape
// (tier-scoped, kind = need) and that no need id ever enters an `in` filter.

type Row = Record<string, unknown>
type FilterOp =
  | { type: 'eq'; col: string; val: unknown }
  | { type: 'in'; col: string; val: unknown[] }
  | { type: 'is'; col: string; val: null }

interface RecordedCall {
  table: string
  select: string
  filters: FilterOp[]
  orders: string[]
  range?: [number, number]
}

function makeClient(tables: Record<string, Row[]>, options?: { fail?: boolean }) {
  const calls: RecordedCall[] = []

  function from(table: string) {
    const call: RecordedCall = { table, select: '', filters: [], orders: [] }
    calls.push(call)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select(cols: string) {
        call.select = cols
        return builder
      },
      eq(col: string, val: unknown) {
        call.filters.push({ type: 'eq', col, val })
        return builder
      },
      in(col: string, val: unknown[]) {
        call.filters.push({ type: 'in', col, val })
        return builder
      },
      is(col: string, val: null) {
        call.filters.push({ type: 'is', col, val })
        return builder
      },
      order(col: string) {
        call.orders.push(col)
        return builder
      },
      range(start: number, end: number) {
        call.range = [start, end]
        if (options?.fail) {
          return Promise.resolve({ data: null, error: { message: 'boom' } })
        }
        const rows = (tables[table] ?? []).filter(row =>
          call.filters.every(f => {
            if (f.type === 'eq') return row[f.col] === f.val
            if (f.type === 'in') return f.val.includes(row[f.col])
            return row[f.col] === null || row[f.col] === undefined
          }),
        )
        return Promise.resolve({ data: rows.slice(start, end + 1), error: null })
      },
    }
    return builder
  }

  return { client: { from }, calls }
}

const TIER_A = 'aaaaaaaa-0000-0000-0000-0000000000a1'
const TIER_B = 'aaaaaaaa-0000-0000-0000-0000000000b1'
const NEED_1 = 'aaaaaaaa-0000-0000-0000-0000000000c1'
const NEED_2 = 'aaaaaaaa-0000-0000-0000-0000000000c2'

function needRow(id: string, tier: string): Row {
  return {
    id,
    name: 'Trinket, Healing',
    boss_name: 'Needs',
    item_slot: 'Trinket',
    wowhead_id: null,
    raid_tier_id: tier,
    is_loot_council: false,
    classification: 'epic',
    kind: 'need',
    need_key: 'trinket-healing',
  }
}

describe('fetchTierNeedRows', () => {
  it('T1: with no tier ids it makes no query and returns []', async () => {
    const { client, calls } = makeClient({})
    const rows = await fetchTierNeedRows(client as never, [])
    expect(rows).toEqual([])
    expect(calls).toHaveLength(0)
  })

  it('T2: reads need rows by tier in one paged read, ordered by name then id', async () => {
    const { client, calls } = makeClient({
      loot_items: [
        needRow(NEED_1, TIER_A),
        needRow(NEED_2, TIER_B),
        { ...needRow('aaaaaaaa-0000-0000-0000-0000000000c3', TIER_A), kind: 'item', wowhead_id: 9 },
      ],
    })
    const rows = await fetchTierNeedRows(client as never, [TIER_A, TIER_B])

    expect(rows.map(r => r.id)).toEqual([NEED_1, NEED_2])
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('loot_items')
    expect(calls[0].filters).toContainEqual({ type: 'eq', col: 'kind', val: 'need' })
    expect(calls[0].filters).toContainEqual({ type: 'in', col: 'raid_tier_id', val: [TIER_A, TIER_B] })
    expect(calls[0].orders).toEqual(['name', 'id'])
    expect(calls[0].range).toEqual([0, 999])
    // A tier id list is the only `in` filter: need ids never enter a URL (Pitfall 7).
    expect(calls[0].filters.filter(f => f.type === 'in').map(f => (f as { col: string }).col)).toEqual(['raid_tier_id'])
  })

  it('T3: a read error throws the labelled message', async () => {
    const { client } = makeClient({}, { fail: true })
    await expect(fetchTierNeedRows(client as never, [TIER_A])).rejects.toThrow(
      'Failed to read loot_items need rows: boom',
    )
  })
})

describe('fetchTierNeedRankings', () => {
  it('R1: with no tier ids it makes no query and returns []', async () => {
    const { client, calls } = makeClient({})
    expect(await fetchTierNeedRankings(client as never, [])).toEqual([])
    expect(calls).toHaveLength(0)
  })

  it('R2: reads live need rankings through the inner embed, tier scoped, and maps the four fields', async () => {
    const { client, calls } = makeClient({
      loot_submission_items: [
        { id: 1, loot_item_id: NEED_1, rank: 2, slot: 1, submission_id: 's1', removed_at: null, 'loot_items.kind': 'need', 'loot_items.raid_tier_id': TIER_A },
        { id: 2, loot_item_id: NEED_2, rank: 1, slot: 2, submission_id: 's2', removed_at: '2026-01-01T00:00:00Z', 'loot_items.kind': 'need', 'loot_items.raid_tier_id': TIER_A },
        { id: 3, loot_item_id: NEED_2, rank: 4, slot: 1, submission_id: 's3', removed_at: null, 'loot_items.kind': 'item', 'loot_items.raid_tier_id': TIER_A },
        { id: 4, loot_item_id: NEED_2, rank: 5, slot: 1, submission_id: 's4', removed_at: null, 'loot_items.kind': 'need', 'loot_items.raid_tier_id': TIER_B },
      ],
    })
    const rows = await fetchTierNeedRankings(client as never, [TIER_A])

    expect(rows).toEqual([{ loot_item_id: NEED_1, rank: 2, slot: 1, submission_id: 's1' }])
    expect(calls).toHaveLength(1)
    expect(calls[0].select).toContain('loot_items!inner(raid_tier_id, kind)')
    expect(calls[0].filters).toContainEqual({ type: 'eq', col: 'loot_items.kind', val: 'need' })
    expect(calls[0].filters).toContainEqual({ type: 'in', col: 'loot_items.raid_tier_id', val: [TIER_A] })
    expect(calls[0].filters).toContainEqual({ type: 'is', col: 'removed_at', val: null })
    expect(calls[0].orders).toEqual(['id'])
  })

  it('R3: a read error throws the labelled message', async () => {
    const { client } = makeClient({}, { fail: true })
    await expect(fetchTierNeedRankings(client as never, [TIER_A])).rejects.toThrow(
      'Failed to read loot_submission_items need rankings: boom',
    )
  })
})

describe('MasterSheetContent need wiring (source assertions)', () => {
  const source = readFileSync(
    resolve(__dirname, '../../../app/(app)/master-sheet/components/MasterSheetContent.tsx'),
    'utf8',
  )

  it('W1: loads need rows by tier, keeps only ranked needs, and sends need ids in the POST body', () => {
    expect(source).toContain('fetchTierNeedRows(')
    expect(source).toContain('keepRankedNeedRows(')
    expect(source).toContain('item_ids: [...itemIds, ...needIds]')
  })

  it('W2: the item read is item-only and the BLP GET for needs is a separate request for ranked ids', () => {
    expect(source).toContain(".eq('kind', 'item')")
    expect(source).toContain('shownNeedIds')
    // The first BLP GET still carries item ids only.
    expect(source).toContain('item_ids=${itemIds.join(\',\')}')
  })

  it('W3: received counts and skip candidates key by itemIdentityKey', () => {
    expect(source.match(/itemIdentityKey\(/g)?.length ?? 0).toBeGreaterThanOrEqual(2)
  })
})
