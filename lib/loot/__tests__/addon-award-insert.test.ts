// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { insertAddonAward } from '../addon-award-insert'
import type { LootHistoryInsert } from '../loot-history-rows'

type Call = { op: 'select' | 'insert'; columns?: string; filters: Array<[string, unknown]>; payload?: unknown }

interface Fixture {
  insertError?: { code?: string; message: string } | null
  insertId?: string
  existingUnmatched?: Array<{ id: string; character_name: string | null }>
  preCheckError?: boolean
  lookupRow?: { id: string } | null
  lookupError?: boolean
}

/** Recording fake for loot_history: insert/select/single, is, limit and maybeSingle. */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      if (table !== 'loot_history') throw new Error(`unexpected table ${table}`)
      const call: Call = { op: 'select', filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: (columns: string) => { if (call.op === 'select') call.columns = columns; return builder },
        insert: (payload: unknown) => { call.op = 'insert'; call.payload = payload; return builder },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        is: (col: string, val: unknown) => { call.filters.push([`is:${col}`, val]); return builder },
        limit: () => builder,
        single: () => {
          if (fixture.insertError) return Promise.resolve({ data: null, error: fixture.insertError })
          return Promise.resolve({ data: { id: fixture.insertId ?? 'new-1' }, error: null })
        },
        maybeSingle: () => {
          if (fixture.lookupError) return Promise.resolve({ data: null, error: { message: 'lookup boom' } })
          return Promise.resolve({ data: fixture.lookupRow ?? null, error: null })
        },
        then: (resolve: (v: unknown) => unknown) => {
          if (fixture.preCheckError) {
            return Promise.resolve({ data: null, error: { message: 'pre-check boom' } }).then(resolve)
          }
          return Promise.resolve({ data: fixture.existingUnmatched ?? [], error: null }).then(resolve)
        },
      }
      return builder
    },
  }
  return { client, calls }
}

function row(overrides: Partial<LootHistoryInsert> = {}): LootHistoryInsert {
  return {
    guild_id: 'guild-1',
    loot_item_id: 'item-1',
    raid_tier_id: 'tier-1',
    expansion_id: 'exp-1',
    character_id: 'char-1',
    character_name: 'Thrall',
    raid_event_id: 'ev-1',
    source: 'addon',
    ...overrides,
  }
}

const inserts = (calls: Call[]) => calls.filter(c => c.op === 'insert')

describe('insertAddonAward', () => {
  it('a clean insert gives inserted with its id', async () => {
    const { client, calls } = makeClient({ insertId: 'hist-9' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await insertAddonAward(client as any, row())
    expect(result).toEqual({ status: 'inserted', id: 'hist-9' })
    expect(inserts(calls)).toHaveLength(1)
  })

  it('a 23505 with character and night set gives already_recorded with the looked-up id', async () => {
    const { client, calls } = makeClient({ insertError: { code: '23505', message: 'dup' }, lookupRow: { id: 'hist-old' } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await insertAddonAward(client as any, row())
    expect(result).toEqual({ status: 'already_recorded', id: 'hist-old' })
    const lookup = calls[calls.length - 1]
    expect(lookup.op).toBe('select')
    expect(lookup.filters).toEqual([
      ['guild_id', 'guild-1'],
      ['loot_item_id', 'item-1'],
      ['character_id', 'char-1'],
      ['raid_event_id', 'ev-1'],
    ])
  })

  it('a 23505 gives already_recorded with a null id when the lookup errors or finds nothing', async () => {
    const errored = makeClient({ insertError: { code: '23505', message: 'dup' }, lookupError: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await insertAddonAward(errored.client as any, row())).toEqual({ status: 'already_recorded', id: null })

    const empty = makeClient({ insertError: { code: '23505', message: 'dup' }, lookupRow: null })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await insertAddonAward(empty.client as any, row())).toEqual({ status: 'already_recorded', id: null })
  })

  it('a 23505 on an unlinked row rethrows', async () => {
    const { client } = makeClient({ insertError: { code: '23505', message: 'dup' } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(insertAddonAward(client as any, row({ raid_event_id: null }))).rejects.toThrow(/dup/)
  })

  it('a 23505 on a row with no character_id rethrows', async () => {
    const { client } = makeClient({ insertError: { code: '23505', message: 'dup' } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(insertAddonAward(client as any, row({ character_id: null }))).rejects.toThrow(/dup/)
  })

  it('any other insert error rethrows', async () => {
    const { client } = makeClient({ insertError: { code: '23514', message: 'trigger says no' } })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(insertAddonAward(client as any, row())).rejects.toThrow(/trigger says no/)
  })

  it('an unmatched name already on the night (case-insensitive) gives already_recorded with no insert', async () => {
    const { client, calls } = makeClient({ existingUnmatched: [{ id: 'hist-name', character_name: '  THRALL ' }] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await insertAddonAward(client as any, row({ character_id: null, character_name: 'thrall' }))
    expect(result).toEqual({ status: 'already_recorded', id: 'hist-name' })
    expect(inserts(calls)).toHaveLength(0)
    expect(calls[0].filters).toEqual([
      ['guild_id', 'guild-1'],
      ['loot_item_id', 'item-1'],
      ['raid_event_id', 'ev-1'],
      ['is:character_id', null],
    ])
  })

  it('an unmatched name with a different name on the night inserts', async () => {
    const { client, calls } = makeClient({ existingUnmatched: [{ id: 'hist-name', character_name: 'Jaina' }] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await insertAddonAward(client as any, row({ character_id: null, character_name: 'Thrall' }))
    expect(result.status).toBe('inserted')
    expect(inserts(calls)).toHaveLength(1)
  })

  it('an unlinked row runs no pre-check', async () => {
    const { client, calls } = makeClient({})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await insertAddonAward(client as any, row({ raid_event_id: null, character_id: null }))
    expect(result.status).toBe('inserted')
    expect(calls).toHaveLength(1)
    expect(calls[0].op).toBe('insert')
  })

  it('a matched raider runs no pre-check', async () => {
    const { client, calls } = makeClient({})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await insertAddonAward(client as any, row())
    expect(calls).toHaveLength(1)
  })

  it('a pre-check error throws', async () => {
    const { client, calls } = makeClient({ preCheckError: true })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(insertAddonAward(client as any, row({ character_id: null }))).rejects.toThrow(/existing addon award/)
    expect(inserts(calls)).toHaveLength(0)
  })
})
