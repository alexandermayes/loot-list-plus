// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { planCatalogSync, syncExpansionCatalog } from '../expansionCatalogSync'
import { FOREVER_MANIFEST } from '@/data/expansions/forever/manifest'
import type { ManifestRaid } from '@/domain/expansion/manifest-schema'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

interface FakeRow {
  id: string
  expansion_id: string
  name: string
  [column: string]: unknown
}

/**
 * Stateful raid_tiers fake. select(cols).eq('expansion_id', id) resolves the
 * stored rows for that expansion; insert(array) appends rows with ids
 * tier-new-<n>. update, delete and upsert record the call and throw, so any
 * write other than an insert fails the scenario. Any other table throws.
 */
function createRaidTiersFake(
  initialRows: FakeRow[] = [],
  options: { readError?: string; insertError?: string } = {}
) {
  const rows: FakeRow[] = initialRows.map(row => ({ ...row }))
  const calls: Array<{ method: string; args: unknown[] }> = []
  const fromCalls: string[] = []
  let nextId = 1

  function forbidden(method: string) {
    return (...args: unknown[]) => {
      calls.push({ method, args })
      throw new Error(`forbidden write: ${method}`)
    }
  }

  function buildBuilder() {
    let selectedColumns: string[] | null = null
    let expansionFilter: string | null = null

    const builder = {
      select(columns: string) {
        calls.push({ method: 'select', args: [columns] })
        selectedColumns = columns.split(',').map(column => column.trim())
        return builder
      },
      eq(column: string, value: string) {
        calls.push({ method: 'eq', args: [column, value] })
        if (column === 'expansion_id') expansionFilter = value
        return builder
      },
      insert(payload: Array<Record<string, unknown>>) {
        calls.push({ method: 'insert', args: [payload] })
        if (options.insertError) {
          return Promise.resolve({ data: null, error: { message: options.insertError } })
        }
        for (const row of payload) {
          rows.push({ id: `tier-new-${nextId++}`, ...row } as FakeRow)
        }
        return Promise.resolve({ data: null, error: null })
      },
      update: forbidden('update'),
      delete: forbidden('delete'),
      upsert: forbidden('upsert'),
      then(
        onFulfilled?: (value: { data: unknown; error: unknown }) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) {
        const result = options.readError
          ? { data: null, error: { message: options.readError } }
          : {
              data: rows
                .filter(row => expansionFilter === null || row.expansion_id === expansionFilter)
                .map(row =>
                  selectedColumns
                    ? Object.fromEntries(selectedColumns.map(column => [column, row[column]]))
                    : row
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
      if (table !== 'raid_tiers') throw new Error(`unexpected table: ${table}`)
      return buildBuilder()
    },
  }

  const inserts = () => calls.filter(call => call.method === 'insert')
  const writes = () => calls.filter(call => ['update', 'delete', 'upsert'].includes(call.method))

  return { supabase, rows, calls, fromCalls, inserts, writes }
}

const EXP = 'exp-1'

function tierRow(id: string, name: string, extra: Record<string, unknown> = {}): FakeRow {
  return { id, expansion_id: EXP, name, ...extra }
}

const EXPECTED_ROWS = [
  {
    expansion_id: EXP,
    name: 'Barrow Deeps',
    is_active: true,
    is_guild_active: true,
    master_sheet_visible: true,
    phase: 1,
    sort_order: 1,
  },
  {
    expansion_id: EXP,
    name: 'Hyjal Summit',
    is_active: false,
    is_guild_active: true,
    master_sheet_visible: true,
    phase: 1,
    sort_order: 2,
  },
  {
    expansion_id: EXP,
    name: "Onyxia's Lair",
    is_active: false,
    is_guild_active: true,
    master_sheet_visible: true,
    phase: 1,
    sort_order: 3,
  },
]

describe('syncExpansionCatalog', () => {
  it('[EXPN-05 idempotent] a second run inserts nothing and leaves the rows deep-equal', async () => {
    const fake = createRaidTiersFake()

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
    const fake = createRaidTiersFake([
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
    const fake = createRaidTiersFake([barrow])
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
    const fake = createRaidTiersFake([tierRow('t3', "Onyxia's Lair")])

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

    const fake = createRaidTiersFake()
    const result = await syncExpansionCatalog(fake.supabase, {
      expansionId: EXP,
      expansionName: 'Forever',
    })

    expect(result.inserted.map(row => row.name)).toContain('Hyjal Summit')
  })

  it('leaves duplicates of a manifest tier and unmatched tiers untouched', async () => {
    const fake = createRaidTiersFake([
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
    const fake = createRaidTiersFake([
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
    const fake = createRaidTiersFake()

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
    const fake = createRaidTiersFake([], { readError: 'boom' })

    await expect(
      syncExpansionCatalog(fake.supabase, { expansionId: EXP, expansionName: 'Forever' })
    ).rejects.toThrow('Failed to read raid_tiers for expansion exp-1: boom')
    expect(fake.inserts()).toHaveLength(0)
  })

  it('throws with context on an insert error', async () => {
    const fake = createRaidTiersFake([], { insertError: 'nope' })

    await expect(
      syncExpansionCatalog(fake.supabase, { expansionId: EXP, expansionName: 'Forever' })
    ).rejects.toThrow('Failed to insert raid_tiers for expansion exp-1: nope')
  })

  it.each(['Classic', 'forever', '', 'constructor'])(
    'throws before any from() call for the name %j (D-11)',
    async name => {
      const fake = createRaidTiersFake()

      await expect(
        syncExpansionCatalog(fake.supabase, { expansionId: EXP, expansionName: name })
      ).rejects.toThrow(`syncExpansionCatalog supports Forever only (got "${name}")`)
      expect(fake.fromCalls).toEqual([])
      expect(fake.calls).toEqual([])
    }
  )

  it('never calls update, delete or upsert in any scenario', async () => {
    const scenarios: FakeRow[][] = [
      [],
      [tierRow('t1', 'Barrow Deeps')],
      [tierRow('t1', 'Onyxia’s Lair'), tierRow('t2', 'Custom Raid')],
      [tierRow('t1', 'Barrow Deeps'), tierRow('t2', 'Barrow Deeps')],
    ]
    for (const initial of scenarios) {
      const fake = createRaidTiersFake(initial)
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
})
