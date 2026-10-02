// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { addonAwardKey, insertAddonAward } from '../addon-award-insert'
import type { LootHistoryInsert } from '../loot-history-rows'

type Terminal = 'single' | 'maybeSingle' | 'list'
type Call = {
  op: 'select' | 'insert' | 'update'
  columns?: string
  filters: Array<[string, unknown]>
  payload?: unknown
  order?: [string, boolean]
  returning?: string
}
type Result = { data: unknown; error: { code?: string; message: string } | null }

interface Fixture {
  insertError?: { code?: string; message: string } | null
  insertId?: string
  existingUnmatched?: Array<{ id: string; character_name: string | null }>
  preCheckError?: boolean
  lookupRow?: { id: string } | null
  lookupError?: boolean
  /** Per-query responder for the keyed path. When set it answers every
   * terminal call; return undefined to fall back to the fields above. */
  respond?: (call: Call, terminal: Terminal) => Result | undefined
}

/** Recording fake for loot_history: insert/update/select/single, is, order,
 * limit and maybeSingle, with optional per-query answers (fixture.respond). */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      if (table !== 'loot_history') throw new Error(`unexpected table ${table}`)
      const call: Call = { op: 'select', filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: (columns: string) => {
          if (call.op === 'select') call.columns = columns
          else call.returning = columns
          return builder
        },
        insert: (payload: unknown) => { call.op = 'insert'; call.payload = payload; return builder },
        update: (payload: unknown) => { call.op = 'update'; call.payload = payload; return builder },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        is: (col: string, val: unknown) => { call.filters.push([`is:${col}`, val]); return builder },
        order: (col: string, opts: { ascending: boolean }) => { call.order = [col, opts.ascending]; return builder },
        limit: () => builder,
        single: () => {
          const scripted = fixture.respond?.(call, 'single')
          if (scripted) return Promise.resolve(scripted)
          if (fixture.insertError) return Promise.resolve({ data: null, error: fixture.insertError })
          return Promise.resolve({ data: { id: fixture.insertId ?? 'new-1' }, error: null })
        },
        maybeSingle: () => {
          const scripted = fixture.respond?.(call, 'maybeSingle')
          if (scripted) return Promise.resolve(scripted)
          if (fixture.lookupError) return Promise.resolve({ data: null, error: { message: 'lookup boom' } })
          return Promise.resolve({ data: fixture.lookupRow ?? null, error: null })
        },
        then: (resolve: (v: unknown) => unknown) => {
          const scripted = fixture.respond?.(call, 'list')
          if (scripted) return Promise.resolve(scripted).then(resolve)
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

describe('addonAwardKey', () => {
  it('builds addon:<awardedAt>:<wowheadId>:<trimmed lowercased name>', () => {
    expect(addonAwardKey({ awardedAt: '2026-09-20T20:00:00Z', wowheadId: 20928, characterName: ' Thrall ' })).toBe(
      'addon:2026-09-20T20:00:00Z:20928:thrall',
    )
  })

  it('accepts a fraction of a second', () => {
    expect(addonAwardKey({ awardedAt: '2026-09-20T20:00:00.123Z', wowheadId: 20928, characterName: 'Thrall' })).toBe(
      'addon:2026-09-20T20:00:00.123Z:20928:thrall',
    )
  })

  it('gives null without a usable identity', () => {
    const ok = { awardedAt: '2026-09-20T20:00:00Z', wowheadId: 20928, characterName: 'Thrall' }
    expect(addonAwardKey({ ...ok, awardedAt: 'yesterday' })).toBeNull()
    expect(addonAwardKey({ ...ok, awardedAt: '2026-09-20' })).toBeNull()
    expect(addonAwardKey({ ...ok, awardedAt: '2026-09-20T20:00:00' })).toBeNull()
    expect(addonAwardKey({ ...ok, awardedAt: 1758398400 })).toBeNull()
    expect(addonAwardKey({ ...ok, awardedAt: undefined })).toBeNull()
    expect(addonAwardKey({ ...ok, wowheadId: 0 })).toBeNull()
    expect(addonAwardKey({ ...ok, wowheadId: '20928' })).toBeNull()
    expect(addonAwardKey({ ...ok, wowheadId: 1.5 })).toBeNull()
    expect(addonAwardKey({ ...ok, characterName: '   ' })).toBeNull()
    expect(addonAwardKey({ ...ok, characterName: null })).toBeNull()
    expect(addonAwardKey({ ...ok, characterName: 'x'.repeat(200) })).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Keyed path (FU-1 of #331, #293, D-04)
// ---------------------------------------------------------------------------

const KEY = 'addon:2026-09-20T21:30:00Z:20928:thrall'

interface KeyedScript {
  /** Answers to the key lookup, one per attempt (default: not found). */
  keyRows?: Array<{ id: string } | null>
  keyError?: boolean
  /** Answers to the claim candidates select, one per attempt (default: none). */
  candidates?: Array<Array<{ id: string; character_name: string | null; award_copy: number }>>
  candidatesError?: boolean
  /** Answers to the claim update, one per call (default: one row claimed). */
  claimed?: Array<Array<{ id: string }>>
  /** Answers to the highest copy select, one per attempt (default: none). */
  top?: Array<{ award_copy: number } | null>
  topError?: boolean
  /** Answers to the insert, one per call (default: inserted as new-1). */
  inserts?: Result[]
}

const isKeyLookup = (c: Call) => c.op === 'select' && c.filters.some(([col]) => col === 'source_award_key')
const isCandidates = (c: Call) => c.op === 'select' && c.columns === 'id, character_name, award_copy'
const isTopCopy = (c: Call) => c.op === 'select' && c.columns === 'award_copy'

function keyedClient(script: KeyedScript) {
  const keyRows = [...(script.keyRows ?? [])]
  const candidates = [...(script.candidates ?? [])]
  const claimed = [...(script.claimed ?? [])]
  const top = [...(script.top ?? [])]
  const insertResults = [...(script.inserts ?? [])]
  const boom = (message: string): Result => ({ data: null, error: { message } })
  return makeClient({
    respond: (call, terminal) => {
      if (isKeyLookup(call) && terminal === 'maybeSingle') {
        return script.keyError ? boom('key boom') : { data: keyRows.shift() ?? null, error: null }
      }
      if (isCandidates(call) && terminal === 'list') {
        return script.candidatesError ? boom('candidates boom') : { data: candidates.shift() ?? [], error: null }
      }
      if (call.op === 'update' && terminal === 'list') {
        const filterId = call.filters.find(([col]) => col === 'id')?.[1]
        return { data: claimed.shift() ?? [{ id: filterId }], error: null }
      }
      if (isTopCopy(call) && terminal === 'maybeSingle') {
        return script.topError ? boom('top boom') : { data: top.shift() ?? null, error: null }
      }
      if (call.op === 'insert' && terminal === 'single') {
        return insertResults.shift() ?? { data: { id: 'new-1' }, error: null }
      }
      throw new Error(`unexpected ${call.op} ${call.columns ?? ''} via ${terminal}`)
    },
  })
}

const keyedRow = (overrides: Partial<LootHistoryInsert> = {}) => row({ source_award_key: KEY, ...overrides })
const DUP: Result = { data: null, error: { code: '23505', message: 'dup' } }

describe('insertAddonAward keyed path', () => {
  it('K1 a row with the key gives already_recorded with its id and writes nothing', async () => {
    const { client, calls } = keyedClient({ keyRows: [{ id: 'hist-keyed' }] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await insertAddonAward(client as any, keyedRow())).toEqual({ status: 'already_recorded', id: 'hist-keyed' })
    expect(calls).toHaveLength(1)
    expect(calls[0].filters).toEqual([
      ['guild_id', 'guild-1'],
      ['source_award_key', KEY],
    ])
  })

  it('K2 an unkeyed row for the raider on the night is stamped with the key and nothing is inserted', async () => {
    const { client, calls } = keyedClient({ candidates: [[{ id: 'hist-web', character_name: 'Thrall', award_copy: 1 }]] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await insertAddonAward(client as any, keyedRow())).toEqual({ status: 'already_recorded', id: 'hist-web' })

    const candidatesCall = calls.find(isCandidates)!
    expect(candidatesCall.filters).toEqual([
      ['guild_id', 'guild-1'],
      ['loot_item_id', 'item-1'],
      ['raid_event_id', 'ev-1'],
      ['is:source_award_key', null],
      ['character_id', 'char-1'],
    ])
    expect(candidatesCall.order).toEqual(['award_copy', true])

    const updates = calls.filter(c => c.op === 'update')
    expect(updates).toHaveLength(1)
    expect(updates[0].payload).toEqual({ source_award_key: KEY })
    expect(updates[0].filters).toEqual([
      ['id', 'hist-web'],
      ['is:source_award_key', null],
    ])
    expect(updates[0].returning).toBe('id')
    expect(inserts(calls)).toHaveLength(0)
  })

  it('K3 a lost claim race loops, finds the key and gives already_recorded', async () => {
    const { client, calls } = keyedClient({
      keyRows: [null, { id: 'hist-other' }],
      candidates: [[{ id: 'hist-web', character_name: 'Thrall', award_copy: 1 }]],
      claimed: [[]],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await insertAddonAward(client as any, keyedRow())).toEqual({ status: 'already_recorded', id: 'hist-other' })
    expect(calls.filter(isKeyLookup)).toHaveLength(2)
    expect(inserts(calls)).toHaveLength(0)
  })

  it('K4 with no key and no unkeyed row it inserts the next copy with the key', async () => {
    const { client, calls } = keyedClient({ top: [{ award_copy: 1 }], inserts: [{ data: { id: 'hist-2' }, error: null }] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await insertAddonAward(client as any, keyedRow())).toEqual({ status: 'inserted', id: 'hist-2' })

    const topCall = calls.find(isTopCopy)!
    expect(topCall.filters).toEqual([
      ['guild_id', 'guild-1'],
      ['loot_item_id', 'item-1'],
      ['raid_event_id', 'ev-1'],
      ['character_id', 'char-1'],
    ])
    expect(topCall.order).toEqual(['award_copy', false])
    const [insert] = inserts(calls)
    expect(insert.payload).toMatchObject({ source_award_key: KEY, award_copy: 2, character_id: 'char-1', raid_event_id: 'ev-1' })
    expect(insert.returning).toBe('id')
  })

  it('K5 an insert 23505 loops and an identical concurrent award is then found by key', async () => {
    const { client, calls } = keyedClient({ keyRows: [null, { id: 'hist-twin' }], inserts: [DUP] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await insertAddonAward(client as any, keyedRow())).toEqual({ status: 'already_recorded', id: 'hist-twin' })
    expect(inserts(calls)).toHaveLength(1)
  })

  it('K5b an insert 23505 from a different concurrent award retries with the next copy', async () => {
    const { client, calls } = keyedClient({
      top: [{ award_copy: 1 }, { award_copy: 2 }],
      inserts: [DUP, { data: { id: 'hist-3' }, error: null }],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await insertAddonAward(client as any, keyedRow())).toEqual({ status: 'inserted', id: 'hist-3' })
    expect(inserts(calls).map(c => (c.payload as { award_copy: number }).award_copy)).toEqual([2, 3])
  })

  it('K6 three 23505s in a row with no key found throws', async () => {
    const { client, calls } = keyedClient({ inserts: [DUP, DUP, DUP] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(insertAddonAward(client as any, keyedRow())).rejects.toThrow(/still conflicting after 3 attempts/)
    expect(inserts(calls)).toHaveLength(3)
  })

  it('K7 a raider with 10 copies already throws and inserts nothing', async () => {
    const { client, calls } = keyedClient({ top: [{ award_copy: 10 }] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(insertAddonAward(client as any, keyedRow())).rejects.toThrow(/already has 10 copies/)
    expect(inserts(calls)).toHaveLength(0)
  })

  it('K8 an unlinked keyed award looks up the key then inserts copy 1, with no claim or copy query', async () => {
    const { client, calls } = keyedClient({})
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(await insertAddonAward(client as any, keyedRow({ raid_event_id: null }))).toEqual({ status: 'inserted', id: 'new-1' })
    expect(calls.map(c => c.op)).toEqual(['select', 'insert'])
    expect(isKeyLookup(calls[0])).toBe(true)
    expect(calls[1].payload).toMatchObject({ source_award_key: KEY, award_copy: 1 })
  })

  it('K9 an unmatched name claims only the null-character row with the same trimmed lowercased name', async () => {
    const { client, calls } = keyedClient({
      candidates: [[
        { id: 'hist-jaina', character_name: 'Jaina', award_copy: 1 },
        { id: 'hist-thrall', character_name: '  THRALL ', award_copy: 1 },
      ]],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await insertAddonAward(client as any, keyedRow({ character_id: null, character_name: 'Thrall' }))
    expect(result).toEqual({ status: 'already_recorded', id: 'hist-thrall' })
    expect(calls.find(isCandidates)!.filters).toContainEqual(['is:character_id', null])
    expect(calls.filter(c => c.op === 'update')[0].filters[0]).toEqual(['id', 'hist-thrall'])
    expect(calls.some(isTopCopy)).toBe(false)
  })

  it('K9b an unmatched name with no matching row inserts copy 1 without a copy query', async () => {
    const { client, calls } = keyedClient({ candidates: [[{ id: 'hist-jaina', character_name: 'Jaina', award_copy: 1 }]] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await insertAddonAward(client as any, keyedRow({ character_id: null, character_name: 'Thrall' }))
    expect(result.status).toBe('inserted')
    expect(calls.some(c => c.op === 'update')).toBe(false)
    expect(calls.some(isTopCopy)).toBe(false)
    expect(inserts(calls)[0].payload).toMatchObject({ award_copy: 1, source_award_key: KEY })
  })

  it('K10 an error on the key lookup, the claim select or the copy select throws without inserting', async () => {
    for (const script of [{ keyError: true }, { candidatesError: true }, { topError: true }] as KeyedScript[]) {
      const { client, calls } = keyedClient(script)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(insertAddonAward(client as any, keyedRow())).rejects.toThrow(/boom/)
      expect(inserts(calls)).toHaveLength(0)
    }
  })

  it('any other insert error on the keyed path rethrows', async () => {
    const { client } = keyedClient({ inserts: [{ data: null, error: { code: '23514', message: 'trigger says no' } }] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(insertAddonAward(client as any, keyedRow())).rejects.toThrow(/trigger says no/)
  })
})
