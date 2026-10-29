// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  flipTiersToDiscovery,
  planDiscoveryFlip,
  planNeedRows,
  readNeedKeysByTier,
  seedNeedRows,
} from '../need-row-seeder'
import { NEED_DEFINITIONS, needRowColumns } from '@/domain/loot/needs'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

interface StoredNeed {
  id: string
  raid_tier_id: string
  need_key: string
  kind: string
}

interface FakeOptions {
  existing?: StoredNeed[]
  readError?: string
  insertError?: string
  updateError?: string
}

/**
 * Recording fake for loot_items (need-key read, bulk insert) and raid_tiers
 * (the one guarded update). Any delete or upsert throws, so a stray write fails
 * the scenario.
 */
function createFake(options: FakeOptions = {}) {
  const stored: StoredNeed[] = (options.existing ?? []).map(row => ({ ...row }))
  const calls: Array<{ table: string; method: string; args: unknown[] }> = []

  function builder(table: string) {
    const filters: Array<[string, unknown]> = []
    let inFilter: { column: string; values: string[] } | null = null
    let updateBody: unknown = null
    const b = {
      select(...args: unknown[]) {
        calls.push({ table, method: 'select', args })
        return b
      },
      eq(column: string, value: unknown) {
        calls.push({ table, method: 'eq', args: [column, value] })
        filters.push([column, value])
        return b
      },
      in(column: string, values: string[]) {
        calls.push({ table, method: 'in', args: [column, values] })
        inFilter = { column, values }
        return b
      },
      order(...args: unknown[]) {
        calls.push({ table, method: 'order', args })
        return b
      },
      range(start: number, end: number) {
        calls.push({ table, method: 'range', args: [start, end] })
        if (options.readError) {
          return Promise.resolve({ data: null, error: { message: options.readError } })
        }
        const data = stored
          .filter(row => filters.every(([column, value]) => (row as never)[column] === value))
          .filter(row => !inFilter || inFilter.values.includes((row as never)[inFilter.column]))
          .slice(start, end + 1)
        return Promise.resolve({ data, error: null })
      },
      insert(payload: Array<Record<string, unknown>>) {
        calls.push({ table, method: 'insert', args: [payload] })
        if (options.insertError) {
          return Promise.resolve({ data: null, error: { message: options.insertError } })
        }
        for (const row of payload) stored.push({ id: `n-${stored.length}`, ...row } as StoredNeed)
        return Promise.resolve({ data: null, error: null })
      },
      update(body: unknown) {
        calls.push({ table, method: 'update', args: [body] })
        updateBody = body
        return b
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
        const result =
          updateBody !== null && options.updateError
            ? { data: null, error: { message: options.updateError } }
            : { data: null, error: null }
        return Promise.resolve(result).then(onFulfilled, onRejected)
      },
    }
    return b
  }

  const supabase: AnySupabase = { from: (table: string) => builder(table) }
  const inserts = () => calls.filter(call => call.method === 'insert')
  return { supabase, stored, calls, inserts }
}

const FULL = NEED_DEFINITIONS.length

describe('planNeedRows', () => {
  it('[DISC-01 ordering] returns every definition per tier, tier order then definition order, and is deterministic', () => {
    const input = { tierIds: ['t1', 't2'], existingKeysByTier: new Map<string, Set<string>>() }

    const a = planNeedRows(input)
    const b = planNeedRows(input)

    expect(a).toHaveLength(FULL * 2)
    expect(a).toEqual(b)
    expect(a.slice(0, FULL).every(row => row.raid_tier_id === 't1')).toBe(true)
    expect(a.slice(FULL).every(row => row.raid_tier_id === 't2')).toBe(true)
    NEED_DEFINITIONS.forEach((definition, index) => {
      expect(a[index]).toEqual({ raid_tier_id: 't1', ...needRowColumns(definition) })
      expect(a[FULL + index]).toEqual({ raid_tier_id: 't2', ...needRowColumns(definition) })
    })
  })

  it('skips a key a tier already holds and keeps the other tier whole', () => {
    const rows = planNeedRows({
      tierIds: ['t1', 't2'],
      existingKeysByTier: new Map([['t1', new Set(['trinket.healing'])]]),
    })

    expect(rows).toHaveLength(FULL * 2 - 1)
    expect(rows.filter(row => row.raid_tier_id === 't1')).toHaveLength(FULL - 1)
    expect(
      rows.some(row => row.raid_tier_id === 't1' && row.need_key === 'trinket.healing')
    ).toBe(false)
    expect(
      rows.some(row => row.raid_tier_id === 't2' && row.need_key === 'trinket.healing')
    ).toBe(true)
  })

  it('plans a tier id once even when it is listed twice', () => {
    const rows = planNeedRows({ tierIds: ['t1', 't1'], existingKeysByTier: new Map() })
    expect(rows).toHaveLength(FULL)
  })

  it('plans nothing for no tiers', () => {
    expect(planNeedRows({ tierIds: [], existingKeysByTier: new Map() })).toEqual([])
  })
})

describe('readNeedKeysByTier', () => {
  it('returns an empty map and issues no query for no tiers', async () => {
    const fake = createFake()
    const keys = await readNeedKeysByTier(fake.supabase, [])
    expect(keys.size).toBe(0)
    expect(fake.calls).toEqual([])
  })

  it('reads need keys for the tiers, paged and ordered, grouped by tier', async () => {
    const fake = createFake({
      existing: [
        { id: 'a', raid_tier_id: 't1', need_key: 'trinket.healing', kind: 'need' },
        { id: 'b', raid_tier_id: 't1', need_key: 'neck.tank', kind: 'need' },
        { id: 'c', raid_tier_id: 't2', need_key: 'ring.agility', kind: 'need' },
        { id: 'd', raid_tier_id: 't9', need_key: 'ring.agility', kind: 'need' },
        { id: 'e', raid_tier_id: 't1', need_key: 'not-a-need', kind: 'item' },
      ],
    })

    const keys = await readNeedKeysByTier(fake.supabase, ['t1', 't2'])

    expect(keys.get('t1')).toEqual(new Set(['trinket.healing', 'neck.tank']))
    expect(keys.get('t2')).toEqual(new Set(['ring.agility']))
    expect(keys.has('t9')).toBe(false)
    expect(fake.calls.filter(call => call.method === 'select')[0].args).toEqual([
      'id, raid_tier_id, need_key',
    ])
    expect(fake.calls).toContainEqual({
      table: 'loot_items',
      method: 'eq',
      args: ['kind', 'need'],
    })
    expect(fake.calls).toContainEqual({
      table: 'loot_items',
      method: 'in',
      args: ['raid_tier_id', ['t1', 't2']],
    })
  })

  it('throws with the label when the read fails, never an empty map', async () => {
    const fake = createFake({ readError: 'boom' })
    await expect(readNeedKeysByTier(fake.supabase, ['t1'])).rejects.toThrow(
      'Failed to read loot_items need keys: boom'
    )
  })
})

describe('seedNeedRows', () => {
  it('reads keys once, inserts every need row in one insert and reports the count', async () => {
    const fake = createFake()

    const result = await seedNeedRows(fake.supabase, ['t1'])

    expect(result.inserted).toBe(FULL)
    expect(result.planned).toHaveLength(FULL)
    expect(fake.inserts()).toHaveLength(1)
    expect(fake.inserts()[0].args[0]).toEqual(result.planned)
    expect(fake.calls.filter(call => call.method === 'select')).toHaveLength(1)
  })

  it('inserts only the missing keys of a tier that holds some', async () => {
    const fake = createFake({
      existing: [
        { id: 'a', raid_tier_id: 't1', need_key: NEED_DEFINITIONS[0].key, kind: 'need' },
        { id: 'b', raid_tier_id: 't1', need_key: NEED_DEFINITIONS[1].key, kind: 'need' },
      ],
    })

    const result = await seedNeedRows(fake.supabase, ['t1'])

    expect(result.inserted).toBe(FULL - 2)
    expect(result.planned.map(row => row.need_key)).not.toContain(NEED_DEFINITIONS[0].key)
  })

  it('reuses existingKeysByTier instead of reading again', async () => {
    const fake = createFake()

    await seedNeedRows(fake.supabase, ['t1'], { existingKeysByTier: new Map() })

    expect(fake.calls.filter(call => call.method === 'select')).toEqual([])
    expect(fake.inserts()).toHaveLength(1)
  })

  it('dryRun inserts nothing and returns the planned rows', async () => {
    const fake = createFake()

    const result = await seedNeedRows(fake.supabase, ['t1', 't2'], { dryRun: true })

    expect(result.inserted).toBe(0)
    expect(result.planned).toHaveLength(FULL * 2)
    expect(fake.inserts()).toEqual([])
  })

  it('inserts nothing for no tiers, and nothing when every key is present', async () => {
    const none = createFake()
    expect(await seedNeedRows(none.supabase, [])).toEqual({ planned: [], inserted: 0 })
    expect(none.calls).toEqual([])

    const full = createFake({
      existing: NEED_DEFINITIONS.map((definition, index) => ({
        id: `k${index}`,
        raid_tier_id: 't1',
        need_key: definition.key,
        kind: 'need',
      })),
    })
    const result = await seedNeedRows(full.supabase, ['t1'])
    expect(result).toEqual({ planned: [], inserted: 0 })
    expect(full.inserts()).toEqual([])
  })

  it('throws with the tier ids when the read fails', async () => {
    const fake = createFake({ readError: 'boom' })
    await expect(seedNeedRows(fake.supabase, ['t1'])).rejects.toThrow(
      'Failed to read loot_items need keys: boom'
    )
    expect(fake.inserts()).toEqual([])
  })

  it('throws with the tier ids when the insert fails', async () => {
    const fake = createFake({ insertError: 'nope' })
    await expect(seedNeedRows(fake.supabase, ['t1', 't2'])).rejects.toThrow(
      'Failed to insert need rows for raid tiers t1, t2: nope'
    )
  })
})

describe('planDiscoveryFlip', () => {
  it('[D-03] flips only Known tiers that hold no need rows', () => {
    const flip = planDiscoveryFlip(
      [
        { id: 'known-empty', list_mode: 'known' },
        { id: 'known-with-needs', list_mode: 'known' },
        { id: 'already-discovery', list_mode: 'discovery' },
      ],
      new Map([['known-with-needs', new Set(['trinket.healing'])]])
    )
    expect(flip).toEqual(['known-empty'])
  })
})

describe('flipTiersToDiscovery', () => {
  it('does nothing for no tiers', async () => {
    const fake = createFake()
    await flipTiersToDiscovery(fake.supabase, [])
    expect(fake.calls).toEqual([])
  })

  it('[D-05] updates list_mode to discovery filtered by id and current mode known', async () => {
    const fake = createFake()

    await flipTiersToDiscovery(fake.supabase, ['t1', 't2'])

    expect(fake.calls).toEqual([
      { table: 'raid_tiers', method: 'update', args: [{ list_mode: 'discovery' }] },
      { table: 'raid_tiers', method: 'in', args: ['id', ['t1', 't2']] },
      { table: 'raid_tiers', method: 'eq', args: ['list_mode', 'known'] },
    ])
  })

  it('throws with context when the update fails', async () => {
    const fake = createFake({ updateError: 'denied' })
    await expect(flipTiersToDiscovery(fake.supabase, ['t1'])).rejects.toThrow(
      'Failed to switch raid tiers to Discovery: denied'
    )
  })
})

describe('need-row-seeder source', () => {
  const source = readFileSync(join(process.cwd(), 'app/services/need-row-seeder.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')

  it('builds every row with needRowColumns', () => {
    expect(source).toContain('needRowColumns(')
  })

  it('[D-05] has exactly one update, which only sets list_mode to discovery, and no delete or upsert', () => {
    expect(source.match(/\.update\(/g) ?? []).toHaveLength(1)
    expect(source).toContain(".update({ list_mode: 'discovery' })")
    expect(/\.(delete|upsert)\(/.test(source)).toBe(false)
  })
})
