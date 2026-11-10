// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { planCatalogSync, syncExpansionCatalog } from '../expansionCatalogSync'
import { FOREVER_MANIFEST } from '@/data/expansions/forever/manifest'
import type { ManifestRaid } from '@/domain/expansion/manifest-schema'
import { NEED_DEFINITIONS } from '@/domain/loot/needs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

interface FakeRow {
  id: string
  expansion_id: string
  name: string
  [column: string]: unknown
}

interface StoredNeed {
  id: string
  raid_tier_id: string
  need_key: string
  kind: 'need'
}

interface FakeCall {
  table: string
  method: string
  args: unknown[]
}

/**
 * Stateful fake for the two tables the sync touches. raid_tiers: select(cols)
 * .eq('expansion_id', id) resolves the stored rows for that expansion;
 * insert(array) appends rows with ids tier-new-<n> and can be followed by
 * select(); update succeeds only with exactly { list_mode: 'discovery' } and
 * applies its in/eq filters to the stored rows (the one write the sync may
 * make, D-05). loot_items: the need-key read (eq kind, in raid_tier_id, order,
 * range) and a bulk insert that is refused, all or nothing, for a tier whose
 * stored list_mode is not 'discovery', mirroring enforce_loot_item_need_rules
 * (D-17). Every other write records the call and throws 'forbidden write', and
 * any other table throws.
 */
function createCatalogFake(
  initialRows: FakeRow[] = [],
  options: {
    readError?: string
    insertError?: string
    needReadError?: string
    needInsertError?: string
    initialNeeds?: StoredNeed[]
  } = {}
) {
  const rows: FakeRow[] = initialRows.map(row => ({ ...row }))
  const needs: StoredNeed[] = (options.initialNeeds ?? []).map(row => ({ ...row }))
  const calls: FakeCall[] = []
  const fromCalls: string[] = []
  let nextId = 1
  let nextNeedId = 1

  const isDiscoveryFlip = (body: unknown) =>
    typeof body === 'object' &&
    body !== null &&
    Object.keys(body).length === 1 &&
    (body as { list_mode?: unknown }).list_mode === 'discovery'

  function buildBuilder(table: 'raid_tiers' | 'loot_items') {
    let selectedColumns: string[] | null = null
    let expansionFilter: string | null = null
    const eqFilters: Array<[string, unknown]> = []
    let inFilter: { column: string; values: string[] } | null = null
    let updateBody: unknown = null

    const project = (list: Array<Record<string, unknown>>) =>
      list.map(row =>
        selectedColumns ? Object.fromEntries(selectedColumns.map(column => [column, row[column]])) : row
      )

    const matches = (row: Record<string, unknown>) =>
      eqFilters.every(([column, value]) => row[column] === value) &&
      (!inFilter || inFilter.values.includes(row[inFilter.column] as string))

    const builder = {
      select(columns: string) {
        calls.push({ table, method: 'select', args: [columns] })
        selectedColumns = columns.split(',').map(column => column.trim())
        return builder
      },
      eq(column: string, value: unknown) {
        calls.push({ table, method: 'eq', args: [column, value] })
        if (column === 'expansion_id') expansionFilter = value as string
        else eqFilters.push([column, value])
        return builder
      },
      in(column: string, values: string[]) {
        calls.push({ table, method: 'in', args: [column, values] })
        inFilter = { column, values }
        return builder
      },
      order(column: string, opts?: unknown) {
        calls.push({ table, method: 'order', args: [column, opts] })
        return builder
      },
      range(start: number, end: number) {
        calls.push({ table, method: 'range', args: [start, end] })
        if (options.needReadError) {
          return Promise.resolve({ data: null, error: { message: options.needReadError } })
        }
        const data = needs.filter(row => matches(row as never)).slice(start, end + 1)
        return Promise.resolve({ data: project(data as never), error: null })
      },
      insert(payload: Array<Record<string, unknown>>) {
        calls.push({ table, method: 'insert', args: [payload] })
        let result: { data: unknown; error: { message: string } | null }
        if (table === 'raid_tiers') {
          if (options.insertError) {
            result = { data: null, error: { message: options.insertError } }
          } else {
            const created = payload.map(row => ({ id: `tier-new-${nextId++}`, ...row }) as FakeRow)
            rows.push(...created)
            result = { data: created, error: null }
          }
        } else if (options.needInsertError) {
          result = { data: null, error: { message: options.needInsertError } }
        } else {
          const refused = payload.find(
            row => rows.find(tier => tier.id === row.raid_tier_id)?.list_mode !== 'discovery'
          )
          if (refused) {
            result = {
              data: null,
              error: { message: `need row refused: tier ${String(refused.raid_tier_id)} is not discovery` },
            }
          } else {
            for (const row of payload) {
              needs.push({
                id: `need-${nextNeedId++}`,
                raid_tier_id: row.raid_tier_id as string,
                need_key: row.need_key as string,
                kind: 'need',
              })
            }
            result = { data: null, error: null }
          }
        }
        const done = {
          select(columns: string) {
            calls.push({ table, method: 'select', args: [columns] })
            const cols = columns.split(',').map(column => column.trim())
            const projected = result.data
              ? (result.data as FakeRow[]).map(row =>
                  Object.fromEntries(cols.map(column => [column, row[column]]))
                )
              : result.data
            return Promise.resolve({ data: projected, error: result.error })
          },
          then(
            onFulfilled?: (value: { data: unknown; error: unknown }) => unknown,
            onRejected?: (reason: unknown) => unknown
          ) {
            return Promise.resolve(result).then(onFulfilled, onRejected)
          },
        }
        return done
      },
      update(body: unknown) {
        calls.push({ table, method: 'update', args: [body] })
        if (table !== 'raid_tiers' || !isDiscoveryFlip(body)) {
          throw new Error('forbidden write: update')
        }
        updateBody = body
        return builder
      },
      delete() {
        calls.push({ table, method: 'delete', args: [] })
        throw new Error('forbidden write: delete')
      },
      upsert() {
        calls.push({ table, method: 'upsert', args: [] })
        throw new Error('forbidden write: upsert')
      },
      then(
        onFulfilled?: (value: { data: unknown; error: unknown }) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) {
        if (updateBody !== null) {
          for (const row of rows) if (matches(row as never)) row.list_mode = 'discovery'
          return Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected)
        }
        const result = options.readError
          ? { data: null, error: { message: options.readError } }
          : {
              data: project(
                rows.filter(row => expansionFilter === null || row.expansion_id === expansionFilter)
              ),
              error: null,
            }
        return Promise.resolve(result).then(onFulfilled, onRejected)
      },
    }
    return builder
  }

  const supabase: AnySupabase = {
    from(table: string) {
      fromCalls.push(table)
      if (table !== 'raid_tiers' && table !== 'loot_items') {
        throw new Error(`unexpected table: ${table}`)
      }
      return buildBuilder(table)
    },
  }

  const tierInserts = () => calls.filter(c => c.table === 'raid_tiers' && c.method === 'insert')
  const needInserts = () => calls.filter(c => c.table === 'loot_items' && c.method === 'insert')
  // The one write the sync may make: the Discovery flip.
  const flips = () => calls.filter(c => c.method === 'update' && isDiscoveryFlip(c.args[0]))
  // Anything else that tried to write; the fake throws on each, so a pass means none was attempted.
  const writes = () =>
    calls.filter(
      c =>
        ['delete', 'upsert'].includes(c.method) ||
        (c.method === 'update' && !isDiscoveryFlip(c.args[0]))
    )
  // Index of the first call matching table, method, in the recorded order.
  const firstIndex = (table: string, method: string) =>
    calls.findIndex(c => c.table === table && c.method === method)

  return {
    supabase,
    rows,
    needs,
    calls,
    fromCalls,
    inserts: tierInserts,
    needInserts,
    flips,
    writes,
    firstIndex,
  }
}

const EXP = 'exp-1'

// Stored tiers default to 'discovery' so the older scenarios stay about tier matching;
// the Discovery scenarios below set list_mode on purpose.
function tierRow(id: string, name: string, extra: Record<string, unknown> = {}): FakeRow {
  return { id, expansion_id: EXP, name, list_mode: 'discovery', ...extra }
}

function needRow(tierId: string, key: string): StoredNeed {
  return { id: `n-${tierId}-${key}`, raid_tier_id: tierId, need_key: key, kind: 'need' }
}

const ALL_KEYS = NEED_DEFINITIONS.map(definition => definition.key)
const FULL = ALL_KEYS.length

const THREE_KNOWN = [
  tierRow('t1', 'Barrow Deeps', { list_mode: 'known' }),
  tierRow('t2', 'Hyjal Summit', { list_mode: 'known' }),
  tierRow('t3', "Onyxia's Lair", { list_mode: 'known' }),
]

const EXPECTED_ROWS = [
  {
    expansion_id: EXP,
    name: 'Barrow Deeps',
    is_active: true,
    is_guild_active: true,
    master_sheet_visible: true,
    phase: 1,
    sort_order: 1,
    list_mode: 'discovery',
  },
  {
    expansion_id: EXP,
    name: 'Hyjal Summit',
    is_active: false,
    is_guild_active: true,
    master_sheet_visible: true,
    phase: 1,
    sort_order: 2,
    list_mode: 'discovery',
  },
  {
    expansion_id: EXP,
    name: "Onyxia's Lair",
    is_active: false,
    is_guild_active: true,
    master_sheet_visible: true,
    phase: 1,
    sort_order: 3,
    list_mode: 'discovery',
  },
]

describe('syncExpansionCatalog', () => {
  it('[DISC-01 empty] an expansion with zero tiers ends with three Discovery tiers and 435 need rows, tiers first', async () => {
    const fake = createCatalogFake()

    const result = await syncExpansionCatalog(fake.supabase, {
      expansionId: EXP,
      expansionName: 'Forever',
    })

    expect(fake.rows.map(row => row.list_mode)).toEqual(['discovery', 'discovery', 'discovery'])
    expect(fake.needs).toHaveLength(435)
    expect(result.needRowsInserted).toBe(435)
    expect(result.tiersFlipped).toBe(0)
    expect(fake.needInserts()).toHaveLength(1)
    expect(fake.firstIndex('raid_tiers', 'insert')).toBeLessThan(
      fake.firstIndex('loot_items', 'insert')
    )
    for (const tier of fake.rows) {
      expect(fake.needs.filter(need => need.raid_tier_id === tier.id)).toHaveLength(145)
    }
  })

  it('[EXPN-05 idempotent] a second run inserts nothing and leaves the rows deep-equal', async () => {
    const fake = createCatalogFake()

    const first = await syncExpansionCatalog(fake.supabase, {
      expansionId: EXP,
      expansionName: 'Forever',
    })
    expect(first.inserted).toEqual(EXPECTED_ROWS)
    expect(first.matched).toEqual([])
    expect(fake.inserts()).toHaveLength(1)
    expect(fake.inserts()[0].args).toEqual([EXPECTED_ROWS])

    const afterFirst = structuredClone(fake.rows)
    expect(afterFirst).toHaveLength(3)

    const second = await syncExpansionCatalog(fake.supabase, {
      expansionId: EXP,
      expansionName: 'Forever',
    })
    expect(second.inserted).toEqual([])
    expect(second.matched.map(match => match.via)).toEqual(['name', 'name', 'name'])
    expect(second.matched.map(match => match.name)).toEqual([
      'Barrow Deeps',
      'Hyjal Summit',
      "Onyxia's Lair",
    ])
    expect(fake.inserts()).toHaveLength(1)
    expect(fake.rows).toEqual(afterFirst)
    expect(fake.writes()).toEqual([])
  })

  it('[E-EXPN-04 encoding] curly apostrophe, case and whitespace variants match and are not duplicated', async () => {
    const fake = createCatalogFake([
      tierRow('t1', 'Onyxia’s Lair'),
      tierRow('t2', 'barrow deeps'),
      tierRow('t3', '  Hyjal   Summit '),
    ])

    const result = await syncExpansionCatalog(fake.supabase, {
      expansionId: EXP,
      expansionName: 'Forever',
    })

    expect(result.inserted).toEqual([])
    expect(result.matched.map(match => match.tierId)).toEqual(['t1', 't2', 't3'])
    expect(fake.inserts()).toHaveLength(0)
    expect(fake.rows.map(row => row.name)).toEqual([
      'Onyxia’s Lair',
      'barrow deeps',
      '  Hyjal   Summit ',
    ])
  })

  it('matches a previousNames alias with no insert and no rename (D-09)', () => {
    const raids: ManifestRaid[] = FOREVER_MANIFEST.raids.map(raid =>
      raid.name === 'Hyjal Summit' ? { ...raid, previousNames: ['Mount Hyjal'] } : raid
    )
    const existingTiers = [
      { id: 't1', name: 'Mount Hyjal' },
      { id: 't2', name: 'Barrow Deeps' },
      { id: 't3', name: "Onyxia's Lair" },
    ]

    const plan = planCatalogSync({ expansionId: EXP, existingTiers, raids })

    expect(plan.inserted).toEqual([])
    expect(plan.matched).toContainEqual({ name: 'Mount Hyjal', tierId: 't1', via: 'alias' })
    // The plan carries no rename: the matched entry keeps the stored name.
    expect(existingTiers[0].name).toBe('Mount Hyjal')
  })

  it('inserts only the missing raids and leaves a matched tier untouched, sort_order from the manifest index', async () => {
    const barrow = tierRow('t1', 'Barrow Deeps', {
      is_guild_active: false,
      master_sheet_visible: false,
      is_active: false,
      submission_deadline: null,
    })
    const fake = createCatalogFake([barrow])
    const before = structuredClone(fake.rows[0])

    const result = await syncExpansionCatalog(fake.supabase, {
      expansionId: EXP,
      expansionName: 'Forever',
    })

    // [E-EXPN-04 ordering] sort_order is manifest index + 1 even with Barrow Deeps already present.
    expect(result.inserted).toEqual([EXPECTED_ROWS[1], EXPECTED_ROWS[2]])
    expect(result.inserted.map(row => row.sort_order)).toEqual([2, 3])
    expect(result.inserted.map(row => row.is_active)).toEqual([false, false])
    expect(fake.inserts()).toHaveLength(1)
    expect(fake.rows[0]).toEqual(before)
    expect(fake.rows).toHaveLength(3)
    expect(fake.writes()).toEqual([])
  })

  it('[E-EXPN-04 ordering] sort_order is the manifest index + 1 when only the last raid exists', async () => {
    const fake = createCatalogFake([tierRow('t3', "Onyxia's Lair")])

    const result = await syncExpansionCatalog(fake.supabase, {
      expansionId: EXP,
      expansionName: 'Forever',
    })

    expect(result.inserted.map(row => [row.name, row.sort_order])).toEqual([
      ['Barrow Deeps', 1],
      ['Hyjal Summit', 2],
    ])
  })

  it('[E-EXPN-04 empty] Hyjal Summit, which has no bosses, is still seeded as a tier', async () => {
    const hyjal = FOREVER_MANIFEST.raids.find(raid => raid.name === 'Hyjal Summit')
    expect(hyjal?.bosses).toEqual([])

    const fake = createCatalogFake()
    const result = await syncExpansionCatalog(fake.supabase, {
      expansionId: EXP,
      expansionName: 'Forever',
    })

    expect(result.inserted.map(row => row.name)).toContain('Hyjal Summit')
  })

  it('leaves duplicates of a manifest tier and unmatched tiers untouched', async () => {
    const fake = createCatalogFake([
      tierRow('t1', 'Barrow Deeps'),
      tierRow('t2', 'Barrow Deeps'),
      tierRow('t3', 'Custom Raid'),
    ])
    const before = structuredClone(fake.rows)

    const result = await syncExpansionCatalog(fake.supabase, {
      expansionId: EXP,
      expansionName: 'Forever',
    })

    expect(result.matched).toEqual([{ name: 'Barrow Deeps', tierId: 't1', via: 'name' }])
    expect(result.inserted.map(row => row.name)).toEqual(['Hyjal Summit', "Onyxia's Lair"])
    expect(fake.rows.slice(0, 3)).toEqual(before)
    expect(fake.rows).toHaveLength(5)
    expect(fake.writes()).toEqual([])
  })

  it('only considers tiers of the given expansion', async () => {
    const fake = createCatalogFake([
      { id: 'other-1', expansion_id: 'exp-other', name: 'Barrow Deeps' },
    ])

    const result = await syncExpansionCatalog(fake.supabase, {
      expansionId: EXP,
      expansionName: 'Forever',
    })

    expect(result.matched).toEqual([])
    expect(result.inserted).toHaveLength(3)
  })

  it('dryRun returns the rows it would insert and performs zero insert calls', async () => {
    const fake = createCatalogFake()

    const result = await syncExpansionCatalog(fake.supabase, {
      expansionId: EXP,
      expansionName: 'Forever',
      dryRun: true,
    })

    expect(result.dryRun).toBe(true)
    expect(result.inserted).toEqual(EXPECTED_ROWS)
    expect(fake.inserts()).toHaveLength(0)
    expect(fake.rows).toEqual([])
  })

  it('throws with context on a read error and inserts nothing', async () => {
    const fake = createCatalogFake([], { readError: 'boom' })

    await expect(
      syncExpansionCatalog(fake.supabase, { expansionId: EXP, expansionName: 'Forever' })
    ).rejects.toThrow('Failed to read raid_tiers for expansion exp-1: boom')
    expect(fake.inserts()).toHaveLength(0)
  })

  it('throws with context on an insert error', async () => {
    const fake = createCatalogFake([], { insertError: 'nope' })

    await expect(
      syncExpansionCatalog(fake.supabase, { expansionId: EXP, expansionName: 'Forever' })
    ).rejects.toThrow('Failed to insert raid_tiers for expansion exp-1: nope')
  })

  it.each(['Classic', 'forever', '', 'constructor'])(
    '[D-21] throws before any from() call for the name %j',
    async name => {
      const fake = createCatalogFake()

      await expect(
        syncExpansionCatalog(fake.supabase, { expansionId: EXP, expansionName: name })
      ).rejects.toThrow(`syncExpansionCatalog supports Forever only (got "${name}")`)
      expect(fake.fromCalls).toEqual([])
      expect(fake.calls).toEqual([])
    }
  )

  it('[D-05] makes no write other than the Discovery flip in any scenario', async () => {
    const scenarios: FakeRow[][] = [
      [],
      [tierRow('t1', 'Barrow Deeps')],
      [tierRow('t1', 'Onyxia’s Lair'), tierRow('t2', 'Custom Raid')],
      [tierRow('t1', 'Barrow Deeps'), tierRow('t2', 'Barrow Deeps')],
      THREE_KNOWN,
    ]
    for (const initial of scenarios) {
      const fake = createCatalogFake(initial)
      await syncExpansionCatalog(fake.supabase, { expansionId: EXP, expansionName: 'Forever' })
      await syncExpansionCatalog(fake.supabase, {
        expansionId: EXP,
        expansionName: 'Forever',
        dryRun: true,
      })
      expect(fake.writes()).toEqual([])
    }
  })
})

describe('syncExpansionCatalog Discovery flip and need rows', () => {
  const run = (fake: ReturnType<typeof createCatalogFake>, dryRun = false) =>
    syncExpansionCatalog(fake.supabase, { expansionId: EXP, expansionName: 'Forever', dryRun })

  it('[D-05] switches three known, need-less tiers to Discovery with one filtered update, then seeds 435 rows in one insert', async () => {
    const fake = createCatalogFake(THREE_KNOWN)

    const result = await run(fake)

    expect(result.tiersFlipped).toBe(3)
    expect(result.needRowsInserted).toBe(3 * FULL)
    expect(result.inserted).toEqual([])
    expect(fake.flips()).toEqual([
      { table: 'raid_tiers', method: 'update', args: [{ list_mode: 'discovery' }] },
    ])
    expect(fake.calls).toContainEqual({
      table: 'raid_tiers',
      method: 'in',
      args: ['id', ['t1', 't2', 't3']],
    })
    expect(fake.calls).toContainEqual({
      table: 'raid_tiers',
      method: 'eq',
      args: ['list_mode', 'known'],
    })
    expect(fake.rows.map(row => row.list_mode)).toEqual(['discovery', 'discovery', 'discovery'])
    expect(fake.needInserts()).toHaveLength(1)
    expect(fake.needs).toHaveLength(3 * FULL)
    // [D-17] the flip lands before the first need row (the fake refuses a need row in a Known tier).
    expect(fake.firstIndex('raid_tiers', 'update')).toBeLessThan(
      fake.firstIndex('loot_items', 'insert')
    )
    expect(fake.inserts()).toHaveLength(0)
  })

  it('[EXPN-05 idempotent] a second run flips nothing, inserts nothing and leaves the rows deep-equal', async () => {
    const fake = createCatalogFake(THREE_KNOWN)
    await run(fake)
    const rowsAfterFirst = structuredClone(fake.rows)
    const needsAfterFirst = structuredClone(fake.needs)

    const second = await run(fake)

    expect(second.tiersFlipped).toBe(0)
    expect(second.needRowsInserted).toBe(0)
    expect(fake.flips()).toHaveLength(1)
    expect(fake.needInserts()).toHaveLength(1)
    expect(fake.rows).toEqual(rowsAfterFirst)
    expect(fake.needs).toEqual(needsAfterFirst)
  })

  it('[D-03] a known tier that already holds need rows is neither flipped nor seeded', async () => {
    const fake = createCatalogFake(
      [tierRow('t1', 'Barrow Deeps', { list_mode: 'known' }), tierRow('t2', 'Hyjal Summit'), tierRow('t3', "Onyxia's Lair")],
      { initialNeeds: [needRow('t1', ALL_KEYS[0])] }
    )

    const result = await run(fake)

    expect(result.tiersFlipped).toBe(0)
    expect(fake.rows[0].list_mode).toBe('known')
    expect(fake.flips()).toEqual([])
    // Only the two Discovery tiers are seeded.
    expect(result.needRowsInserted).toBe(2 * FULL)
    expect(fake.needs.filter(need => need.raid_tier_id === 't1')).toHaveLength(1)
  })

  it('[D-05] a Discovery tier missing two keys gets exactly those two', async () => {
    const missing = [ALL_KEYS[3], ALL_KEYS[40]]
    const fake = createCatalogFake(
      [tierRow('t1', 'Barrow Deeps'), tierRow('t2', 'Hyjal Summit'), tierRow('t3', "Onyxia's Lair")],
      {
        initialNeeds: [
          ...ALL_KEYS.filter(key => !missing.includes(key)).map(key => needRow('t1', key)),
          ...ALL_KEYS.map(key => needRow('t2', key)),
          ...ALL_KEYS.map(key => needRow('t3', key)),
        ],
      }
    )

    const result = await run(fake)

    expect(result.tiersFlipped).toBe(0)
    expect(result.needRowsInserted).toBe(2)
    const payload = fake.needInserts()[0].args[0] as Array<{ raid_tier_id: string; need_key: string }>
    expect(payload.map(row => [row.raid_tier_id, row.need_key])).toEqual([
      ['t1', missing[0]],
      ['t1', missing[1]],
    ])
    expect(fake.flips()).toEqual([])
  })

  it('[D-05] a duplicate manifest tier and an unmatched custom tier are neither flipped nor seeded', async () => {
    const fake = createCatalogFake([
      tierRow('t1', 'Barrow Deeps', { list_mode: 'known' }),
      tierRow('t2', 'Barrow Deeps', { list_mode: 'known' }),
      tierRow('t3', 'Custom Raid', { list_mode: 'known' }),
      tierRow('t4', 'Hyjal Summit'),
      tierRow('t5', "Onyxia's Lair"),
    ])

    const result = await run(fake)

    expect(result.tiersFlipped).toBe(1)
    expect(fake.rows.map(row => [row.id, row.list_mode])).toEqual([
      ['t1', 'discovery'],
      ['t2', 'known'],
      ['t3', 'known'],
      ['t4', 'discovery'],
      ['t5', 'discovery'],
    ])
    const seededTiers = new Set(fake.needs.map(need => need.raid_tier_id))
    expect([...seededTiers].sort()).toEqual(['t1', 't4', 't5'])
  })

  it('[D-05] seeds a missing raid tier and flips a known one in the same run, tier insert then flip then seed', async () => {
    const fake = createCatalogFake([
      tierRow('t1', 'Barrow Deeps', { list_mode: 'known' }),
      tierRow('t2', 'Hyjal Summit'),
    ])

    const result = await run(fake)

    expect(result.inserted.map(row => row.name)).toEqual(["Onyxia's Lair"])
    expect(result.tiersFlipped).toBe(1)
    expect(result.needRowsInserted).toBe(3 * FULL)
    expect(fake.firstIndex('raid_tiers', 'insert')).toBeLessThan(fake.firstIndex('raid_tiers', 'update'))
    expect(fake.firstIndex('raid_tiers', 'update')).toBeLessThan(fake.firstIndex('loot_items', 'insert'))
    expect(fake.needInserts()).toHaveLength(1)
  })

  it('dryRun writes nothing and reports the counts the real run would produce', async () => {
    const fake = createCatalogFake(THREE_KNOWN)

    const result = await run(fake, true)

    expect(result.dryRun).toBe(true)
    expect(result.tiersFlipped).toBe(3)
    expect(result.needRowsInserted).toBe(3 * FULL)
    expect(fake.flips()).toEqual([])
    expect(fake.needInserts()).toEqual([])
    expect(fake.inserts()).toEqual([])
    expect(fake.rows.map(row => row.list_mode)).toEqual(['known', 'known', 'known'])

    const empty = createCatalogFake()
    const emptyResult = await run(empty, true)
    expect(emptyResult.needRowsInserted).toBe(3 * FULL)
    expect(emptyResult.tiersFlipped).toBe(0)
    expect(empty.calls.filter(c => ['insert', 'update'].includes(c.method))).toEqual([])
  })

  it('throws with the label on a need-key read error and writes nothing', async () => {
    const fake = createCatalogFake(THREE_KNOWN, { needReadError: 'boom' })

    await expect(run(fake)).rejects.toThrow('Failed to read loot_items need keys: boom')
    expect(fake.flips()).toEqual([])
    expect(fake.needInserts()).toEqual([])
  })

  it('throws with the tier ids on a need-row insert error', async () => {
    const fake = createCatalogFake([], { needInsertError: 'nope' })

    await expect(run(fake)).rejects.toThrow(/Failed to insert need rows for raid tiers tier-new-1, tier-new-2, tier-new-3: nope/)
  })
})

describe('planCatalogSync', () => {
  it('throws instead of inserting a NULL-phase tier when the phase list lacks the raid (GH-279 class)', () => {
    expect(() =>
      planCatalogSync({ expansionId: EXP, existingTiers: [], slug: 'classic' })
    ).toThrow('Forever raid "Barrow Deeps" has no phase in EXPANSION_PHASES.classic')
  })

  it('is pure: the same input gives the same plan and the input is not mutated', () => {
    const existingTiers = [{ id: 't1', name: 'Hyjal Summit' }]
    const snapshot = structuredClone(existingTiers)

    const a = planCatalogSync({ expansionId: EXP, existingTiers })
    const b = planCatalogSync({ expansionId: EXP, existingTiers })

    expect(a).toEqual(b)
    expect(existingTiers).toEqual(snapshot)
    expect(a.inserted.map(row => row.name)).toEqual(['Barrow Deeps', "Onyxia's Lair"])
  })
})

describe('expansionCatalogSync source', () => {
  it('never references the opens-on field (D-06)', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/services/expansionCatalogSync.ts'),
      'utf8'
    )
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')

    const field = 'opens' + '_on'
    expect(source.includes(field)).toBe(false)
  })

  it('contains no update, delete or upsert call', () => {
    const source = readFileSync(
      join(process.cwd(), 'app/services/expansionCatalogSync.ts'),
      'utf8'
    )
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')

    expect(/\.(update|delete|upsert)\(/.test(source)).toBe(false)
  })

  it('[D-05] the seeder file has exactly one update, the Discovery flip, and no delete or upsert', () => {
    const source = readFileSync(join(process.cwd(), 'app/services/need-row-seeder.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')

    expect(source.match(/\.update\(/g) ?? []).toHaveLength(1)
    expect(source).toContain(".update({ list_mode: 'discovery' })")
    expect(/\.(delete|upsert)\(/.test(source)).toBe(false)
  })
})
