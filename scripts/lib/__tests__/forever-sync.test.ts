// @vitest-environment node
import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import {
  ForeverSyncArgError,
  findDuplicateTierNames,
  formatForeverSyncReport,
  parseForeverSyncArgs,
  runForeverSync,
  syncExitCode,
} from '../forever-sync'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

interface TierRow {
  id: string
  expansion_id: string
  name: string
  [column: string]: unknown
}

interface ExpansionRow {
  id: string
  guild_id: string
  name: string
  [column: string]: unknown
}

interface FakeOptions {
  expansions: ExpansionRow[]
  tiers?: TierRow[]
  /** Expansion ids whose raid_tiers read always fails. */
  failReads?: string[]
  /** Expansion ids whose raid_tiers read fails once a tier has been inserted for them. */
  failReadsAfterInsert?: string[]
  /** Need rows already stored, as { raid_tier_id, need_key } (kind is always 'need'). */
  needs?: Array<{ raid_tier_id: string; need_key: string }>
}

const EM_DASH = '—'

/**
 * Fake service-role client with exactly three tables. expansions supports
 * select, eq, order and range and records each call's arguments so a test can
 * pin the exact query. raid_tiers is stateful: select and eq read, insert
 * appends (and can be followed by select), update succeeds only with exactly
 * { list_mode: 'discovery' } and applies its in/eq filters, delete and upsert
 * throw. loot_items serves the need-key read and a bulk need-row insert that is
 * refused for a tier whose stored list_mode is not 'discovery', mirroring
 * enforce_loot_item_need_rules. Any other table throws, which is how the
 * privacy guarantee (no guilds or characters read) is enforced.
 */
function createFakeClient(options: FakeOptions) {
  const tiers: TierRow[] = (options.tiers ?? []).map(row => ({ ...row }))
  const fromCalls: string[] = []
  const expansionCalls: Array<{ method: string; args: unknown[] }> = []
  const tierCalls: Array<{ method: string; args: unknown[] }> = []
  const needCalls: Array<{ method: string; args: unknown[] }> = []
  const needs: Array<{ id: string; raid_tier_id: string; need_key: string; kind: 'need' }> = (
    options.needs ?? []
  ).map((row, index) => ({ id: `seed-need-${index}`, kind: 'need' as const, ...row }))
  const needInsertCalls: Array<Array<Record<string, unknown>>> = []
  const flipCalls: unknown[] = []
  const insertedFor = new Set<string>()
  const tierSelectLog: Array<{ cols: string; expansionId: string | null }> = []
  let nextId = 1

  function expansionsBuilder() {
    const filters: Array<[string, unknown]> = []
    let columns: string[] | null = null
    const builder = {
      select(cols: string) {
        expansionCalls.push({ method: 'select', args: [cols] })
        columns = cols.split(',').map(column => column.trim())
        return builder
      },
      eq(column: string, value: unknown) {
        expansionCalls.push({ method: 'eq', args: [column, value] })
        filters.push([column, value])
        return builder
      },
      order(column: string, opts?: unknown) {
        expansionCalls.push({ method: 'order', args: [column, opts] })
        return builder
      },
      range(start: number, end: number) {
        expansionCalls.push({ method: 'range', args: [start, end] })
        const matching = options.expansions
          .filter(row => filters.every(([column, value]) => (row as never)[column] === value))
          .sort((a, b) => (a.id < b.id ? -1 : 1))
          .slice(start, end + 1)
          .map(row =>
            columns
              ? Object.fromEntries(columns.map(column => [column, (row as never)[column]]))
              : row
          )
        return Promise.resolve({ data: matching, error: null })
      },
    }
    return builder
  }

  function tiersBuilder() {
    let columns: string[] | null = null
    let expansionFilter: string | null = null
    const eqFilters: Array<[string, unknown]> = []
    let inFilter: { column: string; values: string[] } | null = null
    let updating = false
    const forbidden = (method: string) => () => {
      tierCalls.push({ method, args: [] })
      throw new Error(`forbidden write: ${method}`)
    }
    const matches = (row: TierRow) =>
      eqFilters.every(([column, value]) => row[column] === value) &&
      (!inFilter || inFilter.values.includes(row.id))
    const builder = {
      select(cols: string) {
        tierCalls.push({ method: 'select', args: [cols] })
        columns = cols.split(',').map(column => column.trim())
        return builder
      },
      eq(column: string, value: string) {
        tierCalls.push({ method: 'eq', args: [column, value] })
        if (column === 'expansion_id') expansionFilter = value
        else eqFilters.push([column, value])
        return builder
      },
      in(column: string, values: string[]) {
        tierCalls.push({ method: 'in', args: [column, values] })
        inFilter = { column, values }
        return builder
      },
      insert(payload: Array<Record<string, unknown>>) {
        tierCalls.push({ method: 'insert', args: [payload] })
        const created: TierRow[] = []
        for (const row of payload) {
          const stored = { id: `tier-new-${nextId++}`, ...row } as TierRow
          tiers.push(stored)
          created.push(stored)
          insertedFor.add(String(row.expansion_id))
        }
        return {
          select(cols: string) {
            tierCalls.push({ method: 'select', args: [cols] })
            const wanted = cols.split(',').map(column => column.trim())
            return Promise.resolve({
              data: created.map(row => Object.fromEntries(wanted.map(column => [column, row[column]]))),
              error: null,
            })
          },
          then(
            onFulfilled?: (value: { data: unknown; error: unknown }) => unknown,
            onRejected?: (reason: unknown) => unknown
          ) {
            return Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected)
          },
        }
      },
      update(body: unknown) {
        tierCalls.push({ method: 'update', args: [body] })
        const isFlip =
          typeof body === 'object' &&
          body !== null &&
          Object.keys(body).length === 1 &&
          (body as { list_mode?: unknown }).list_mode === 'discovery'
        if (!isFlip) throw new Error('forbidden write: update')
        flipCalls.push(body)
        updating = true
        return builder
      },
      delete: forbidden('delete'),
      upsert: forbidden('upsert'),
      then(
        onFulfilled?: (value: { data: unknown; error: unknown }) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) {
        if (updating) {
          for (const row of tiers) if (matches(row)) row.list_mode = 'discovery'
          return Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected)
        }
        tierSelectLog.push({ cols: (columns ?? []).join(', '), expansionId: expansionFilter })
        const failing =
          expansionFilter !== null &&
          ((options.failReads ?? []).includes(expansionFilter) ||
            ((options.failReadsAfterInsert ?? []).includes(expansionFilter) &&
              insertedFor.has(expansionFilter)))
        if (failing) {
          return Promise.resolve({
            data: null,
            error: { message: `read denied for ${expansionFilter}` },
          }).then(onFulfilled, onRejected)
        }
        const data = tiers
          .filter(row => expansionFilter === null || row.expansion_id === expansionFilter)
          .map(row =>
            columns ? Object.fromEntries(columns.map(column => [column, row[column]])) : row
          )
        return Promise.resolve({ data, error: null }).then(onFulfilled, onRejected)
      },
    }
    return builder
  }

  function needsBuilder() {
    const eqFilters: Array<[string, unknown]> = []
    let inFilter: { column: string; values: string[] } | null = null
    const builder = {
      select(cols: string) {
        needCalls.push({ method: 'select', args: [cols] })
        return builder
      },
      eq(column: string, value: unknown) {
        needCalls.push({ method: 'eq', args: [column, value] })
        eqFilters.push([column, value])
        return builder
      },
      in(column: string, values: string[]) {
        needCalls.push({ method: 'in', args: [column, values] })
        inFilter = { column, values }
        return builder
      },
      order(column: string, opts?: unknown) {
        needCalls.push({ method: 'order', args: [column, opts] })
        return builder
      },
      range(start: number, end: number) {
        needCalls.push({ method: 'range', args: [start, end] })
        const data = needs
          .filter(row => eqFilters.every(([column, value]) => (row as never)[column] === value))
          .filter(row => !inFilter || inFilter.values.includes((row as never)[inFilter.column]))
          .slice(start, end + 1)
        return Promise.resolve({ data, error: null })
      },
      insert(payload: Array<Record<string, unknown>>) {
        needCalls.push({ method: 'insert', args: [payload] })
        needInsertCalls.push(payload)
        const refused = payload.find(
          row => tiers.find(tier => tier.id === row.raid_tier_id)?.list_mode !== 'discovery'
        )
        if (refused) {
          return Promise.resolve({
            data: null,
            error: { message: `need row refused for tier ${String(refused.raid_tier_id)}` },
          })
        }
        for (const row of payload) {
          needs.push({
            id: `need-${needs.length}`,
            raid_tier_id: row.raid_tier_id as string,
            need_key: row.need_key as string,
            kind: 'need',
          })
        }
        return Promise.resolve({ data: null, error: null })
      },
    }
    return builder
  }

  const client: AnySupabase = {
    from(table: string) {
      fromCalls.push(table)
      if (table === 'expansions') return expansionsBuilder()
      if (table === 'raid_tiers') return tiersBuilder()
      if (table === 'loot_items') return needsBuilder()
      throw new Error(`unexpected table: ${table}`)
    },
  }

  return {
    client,
    tiers,
    fromCalls,
    expansionCalls,
    needs,
    inserts: () => tierCalls.filter(call => call.method === 'insert'),
    needInserts: () => needInsertCalls,
    flips: () => flipCalls,
    tierSelects: () => tierSelectLog,
  }
}

function tier(id: string, expansionId: string, name: string, listMode = 'discovery'): TierRow {
  return { id, expansion_id: expansionId, name, list_mode: listMode }
}

const NEEDS_PER_TIER = 145

const THREE_KNOWN_E2: TierRow[] = [
  tier('t-a', 'e2', 'Barrow Deeps', 'known'),
  tier('t-b', 'e2', 'Hyjal Summit', 'known'),
  tier('t-c', 'e2', "Onyxia's Lair", 'known'),
]

const THREE_TIERS_E2: TierRow[] = [
  tier('t-a', 'e2', 'Barrow Deeps'),
  tier('t-b', 'e2', 'Hyjal Summit'),
  tier('t-c', 'e2', "Onyxia's Lair"),
]

const TWO_EXPANSIONS: ExpansionRow[] = [
  { id: 'e1', guild_id: 'g1', name: 'Forever' },
  { id: 'e2', guild_id: 'g2', name: 'Forever' },
  { id: 'e-classic', guild_id: 'g3', name: 'Classic' },
]

describe('parseForeverSyncArgs', () => {
  it('defaults to a dry run with no help', () => {
    expect(parseForeverSyncArgs([])).toEqual({ apply: false, help: false })
  })

  it('sets apply for --apply', () => {
    expect(parseForeverSyncArgs(['--apply'])).toEqual({ apply: true, help: false })
  })

  it.each([['--help'], ['-h']])('sets help for %s', flag => {
    expect(parseForeverSyncArgs([flag])).toEqual({ apply: false, help: true })
  })

  it('rejects a mistyped flag by name instead of falling back to a dry run or an apply', () => {
    expect(() => parseForeverSyncArgs(['--aply'])).toThrow(ForeverSyncArgError)
    expect(() => parseForeverSyncArgs(['--aply'])).toThrow('--aply')
  })

  it('rejects a positional argument', () => {
    expect(() => parseForeverSyncArgs(['exp-1'])).toThrow(ForeverSyncArgError)
  })
})

describe('runForeverSync dry run', () => {
  it('reads Forever expansions with the pinned query and writes nothing', async () => {
    const fake = createFakeClient({ expansions: TWO_EXPANSIONS, tiers: THREE_TIERS_E2 })

    const report = await runForeverSync(fake.client, { apply: false })

    expect(fake.expansionCalls).toEqual([
      { method: 'select', args: ['id, guild_id'] },
      { method: 'eq', args: ['name', 'Forever'] },
      { method: 'order', args: ['id', { ascending: true }] },
      { method: 'range', args: [0, 999] },
    ])
    expect(fake.inserts()).toHaveLength(0)
    expect(fake.tiers).toHaveLength(3)
    expect(report.apply).toBe(false)
    expect(report.failures).toEqual([])
  })

  it('reports the three tiers to insert for an empty expansion and nothing for a seeded one', async () => {
    const fake = createFakeClient({ expansions: TWO_EXPANSIONS, tiers: THREE_TIERS_E2 })

    const report = await runForeverSync(fake.client, { apply: false })

    expect(report.expansions.map(entry => entry.expansionId)).toEqual(['e1', 'e2'])
    const [e1, e2] = report.expansions
    expect(e1.guildId).toBe('g1')
    expect(e1.matched).toBe(0)
    expect(e1.toInsert).toEqual([
      { name: 'Barrow Deeps', phase: 1, sort_order: 1 },
      { name: 'Hyjal Summit', phase: 1, sort_order: 2 },
      { name: "Onyxia's Lair", phase: 1, sort_order: 3 },
    ])
    expect(e2.matched).toBe(3)
    expect(e2.toInsert).toEqual([])
  })

  it('exit code is 0 for a clean dry run', async () => {
    const fake = createFakeClient({ expansions: TWO_EXPANSIONS, tiers: THREE_TIERS_E2 })
    const report = await runForeverSync(fake.client, { apply: false })
    expect(syncExitCode(report)).toBe(0)
  })
})

describe('formatForeverSyncReport', () => {
  it('opens with the dry-run line, lists each expansion and ends with totals', async () => {
    const fake = createFakeClient({ expansions: TWO_EXPANSIONS, tiers: THREE_TIERS_E2 })
    const report = await runForeverSync(fake.client, { apply: false })

    const text = formatForeverSyncReport(report)
    const lines = text.split('\n')

    expect(lines[0]).toMatch(/dry run/i)
    expect(lines[0]).toMatch(/nothing was written/i)
    expect(text).toContain('e1 (guild g1): matched 0, would insert 3')
    expect(text).toContain('Barrow Deeps (phase 1, sort 1)')
    expect(text).toContain('Hyjal Summit (phase 1, sort 2)')
    expect(text).toContain("Onyxia's Lair (phase 1, sort 3)")
    expect(text).toContain('e2 (guild g2): matched 3, would insert 0')
    expect(lines[lines.length - 1]).toMatch(/^Totals: expansions scanned 2, tiers would insert 3/)
    expect(text).not.toContain(EM_DASH)
  })
})

const MANIFEST_NAMES = ['Barrow Deeps', 'Hyjal Summit', "Onyxia's Lair"]

function namesFor(fake: ReturnType<typeof createFakeClient>, expansionId: string): string[] {
  return fake.tiers.filter(row => row.expansion_id === expansionId).map(row => row.name)
}

describe('findDuplicateTierNames', () => {
  it('reports a normalized duplicate once under its first-seen spelling', () => {
    expect(
      findDuplicateTierNames([
        { name: "Onyxia's Lair" },
        { name: 'Barrow Deeps' },
        { name: 'Onyxia’s  lair' },
        { name: 'onyxia’s lair' },
      ])
    ).toEqual(["Onyxia's Lair"])
  })

  it('returns nothing when every name is distinct', () => {
    expect(findDuplicateTierNames([{ name: 'A' }, { name: 'B' }])).toEqual([])
  })
})

describe('runForeverSync apply', () => {
  it('inserts the three tiers for the empty expansion only', async () => {
    const fake = createFakeClient({ expansions: TWO_EXPANSIONS, tiers: THREE_TIERS_E2 })

    const report = await runForeverSync(fake.client, { apply: true })

    expect(fake.inserts()).toHaveLength(1)
    expect(namesFor(fake, 'e1')).toEqual(MANIFEST_NAMES)
    expect(namesFor(fake, 'e2')).toEqual(MANIFEST_NAMES)
    expect(fake.tiers.some(row => row.expansion_id === 'e-classic')).toBe(false)
    expect(report.apply).toBe(true)
    expect(report.duplicates).toEqual([])
    expect(report.failures).toEqual([])
    expect(syncExitCode(report)).toBe(0)
    expect(formatForeverSyncReport(report)).toContain('e1 (guild g1): matched 0, inserted 3')
  })

  it('a second apply run inserts nothing for every expansion', async () => {
    const fake = createFakeClient({ expansions: TWO_EXPANSIONS, tiers: THREE_TIERS_E2 })
    await runForeverSync(fake.client, { apply: true })
    const insertsAfterFirst = fake.inserts().length
    const tiersAfterFirst = fake.tiers.length

    const second = await runForeverSync(fake.client, { apply: true })

    expect(fake.inserts()).toHaveLength(insertsAfterFirst)
    expect(fake.tiers).toHaveLength(tiersAfterFirst)
    expect(second.expansions.every(entry => entry.toInsert.length === 0)).toBe(true)
    expect(second.expansions.map(entry => entry.matched)).toEqual([3, 3])
    expect(syncExitCode(second)).toBe(0)
  })

  it('a dry run after an apply also reports nothing to insert', async () => {
    const fake = createFakeClient({ expansions: TWO_EXPANSIONS })
    await runForeverSync(fake.client, { apply: true })

    const dry = await runForeverSync(fake.client, { apply: false })

    expect(dry.expansions.every(entry => entry.toInsert.length === 0)).toBe(true)
  })

  it('[D-05] issues no write other than the Discovery flip and the inserts', async () => {
    const fake = createFakeClient({
      expansions: TWO_EXPANSIONS,
      tiers: [...THREE_TIERS_E2, tier('t-x', 'e1', 'Officer Made Raid')],
    })

    const report = await runForeverSync(fake.client, { apply: true })

    expect(report.failures).toEqual([])
    expect(namesFor(fake, 'e1')).toContain('Officer Made Raid')
  })
})

describe('runForeverSync Discovery backfill', () => {
  const ONE_FOREVER: ExpansionRow[] = [{ id: 'e2', guild_id: 'g2', name: 'Forever' }]

  it('[D-05] a dry run over three known tiers with no needs reports 3 to switch and 435 need rows, and writes nothing', async () => {
    const fake = createFakeClient({ expansions: ONE_FOREVER, tiers: THREE_KNOWN_E2 })

    const report = await runForeverSync(fake.client, { apply: false })

    expect(report.expansions).toHaveLength(1)
    expect(report.expansions[0].tiersToFlip).toBe(3)
    expect(report.expansions[0].needRowsToInsert).toBe(3 * NEEDS_PER_TIER)
    expect(fake.flips()).toEqual([])
    expect(fake.needInserts()).toEqual([])
    expect(fake.needs).toHaveLength(0)
    expect(fake.tiers.map(row => row.list_mode)).toEqual(['known', 'known', 'known'])

    const text = formatForeverSyncReport(report)
    const expansionLine = text.split('\n').find(line => line.startsWith('e2 '))
    expect(expansionLine?.endsWith(', switch 3 to Discovery, need rows would insert 435')).toBe(true)
    const totals = text.split('\n').at(-1) as string
    expect(totals).toContain('tiers switched to Discovery 3')
    expect(totals).toContain('need rows would insert 435')
    expect(text).not.toContain(EM_DASH)
  })

  it('[D-05] apply switches the tiers and seeds the needs, then a dry run reports zero of each', async () => {
    const fake = createFakeClient({ expansions: ONE_FOREVER, tiers: THREE_KNOWN_E2 })

    const applied = await runForeverSync(fake.client, { apply: true })

    expect(applied.failures).toEqual([])
    expect(applied.expansions[0].tiersToFlip).toBe(3)
    expect(applied.expansions[0].needRowsToInsert).toBe(3 * NEEDS_PER_TIER)
    expect(fake.tiers.map(row => row.list_mode)).toEqual(['discovery', 'discovery', 'discovery'])
    expect(fake.needs).toHaveLength(3 * NEEDS_PER_TIER)
    const appliedLine = formatForeverSyncReport(applied)
      .split('\n')
      .find(line => line.startsWith('e2 '))
    expect(appliedLine?.endsWith(', switched 3 to Discovery, need rows inserted 435')).toBe(true)

    const dry = await runForeverSync(fake.client, { apply: false })

    expect(dry.expansions[0].tiersToFlip).toBe(0)
    expect(dry.expansions[0].needRowsToInsert).toBe(0)
    expect(fake.flips()).toHaveLength(1)
    expect(fake.needInserts()).toHaveLength(1)
    expect(syncExitCode(dry)).toBe(0)
  })

  it('an empty Forever expansion reports its three tiers and 435 need rows', async () => {
    const fake = createFakeClient({ expansions: ONE_FOREVER })

    const report = await runForeverSync(fake.client, { apply: false })

    expect(report.expansions[0].toInsert).toHaveLength(3)
    expect(report.expansions[0].tiersToFlip).toBe(0)
    expect(report.expansions[0].needRowsToInsert).toBe(3 * NEEDS_PER_TIER)
  })

  it('header lines name the need rows and the Discovery switch for a dry run and an apply', async () => {
    const fake = createFakeClient({ expansions: ONE_FOREVER, tiers: THREE_KNOWN_E2 })

    const dry = formatForeverSyncReport(await runForeverSync(fake.client, { apply: false }))
    const applied = formatForeverSyncReport(await runForeverSync(fake.client, { apply: true }))

    expect(dry.split('\n')[0]).toBe(
      'DRY RUN: nothing was written (pass --apply to insert missing tiers and need rows and switch Forever tiers to Discovery)'
    )
    expect(applied.split('\n')[0]).toBe(
      'APPLIED: missing tiers and need rows were inserted and Forever tiers switched to Discovery (no row was deleted or renamed)'
    )
  })

  it('[D-03] leaves a known tier that holds need rows alone and reports nothing to switch for it', async () => {
    const fake = createFakeClient({
      expansions: ONE_FOREVER,
      tiers: [tier('t-a', 'e2', 'Barrow Deeps', 'known'), ...THREE_TIERS_E2.slice(1)],
      needs: [{ raid_tier_id: 't-a', need_key: 'trinket.healing' }],
    })

    const report = await runForeverSync(fake.client, { apply: true })

    expect(report.expansions[0].tiersToFlip).toBe(0)
    expect(fake.tiers[0].list_mode).toBe('known')
    expect(report.expansions[0].needRowsToInsert).toBe(2 * NEEDS_PER_TIER)
  })

  it('[D-21] never syncs a non-Forever expansion, even with known tiers', async () => {
    const fake = createFakeClient({
      expansions: [{ id: 'e-classic', guild_id: 'g3', name: 'Classic' }],
      tiers: [tier('c1', 'e-classic', 'Molten Core', 'known')],
    })

    const report = await runForeverSync(fake.client, { apply: true })

    expect(report.expansions).toEqual([])
    expect(fake.flips()).toEqual([])
    expect(fake.needInserts()).toEqual([])
    expect(fake.tiers[0].list_mode).toBe('known')
    expect([...new Set(fake.fromCalls)]).toEqual(['expansions'])
  })
})

describe('runForeverSync duplicates', () => {
  const WITH_DUPLICATE: TierRow[] = [
    ...THREE_TIERS_E2,
    tier('t-d1', 'e3', 'Barrow Deeps'),
    tier('t-d2', 'e3', 'Barrow Deeps'),
  ]
  const EXPANSIONS: ExpansionRow[] = [
    ...TWO_EXPANSIONS,
    { id: 'e3', guild_id: 'g4', name: 'Forever' },
  ]

  it('lists an expansion with a duplicated tier name after apply, exits 1 and deletes nothing', async () => {
    const fake = createFakeClient({ expansions: EXPANSIONS, tiers: WITH_DUPLICATE })

    const report = await runForeverSync(fake.client, { apply: true })

    expect(report.duplicates).toEqual([{ expansionId: 'e3', names: ['Barrow Deeps'] }])
    expect(syncExitCode(report)).toBe(1)
    expect(namesFor(fake, 'e3').filter(name => name === 'Barrow Deeps')).toHaveLength(2)

    const text = formatForeverSyncReport(report)
    expect(text).toContain('Duplicate tier names (1, not deleted, resolve by hand):')
    expect(text).toContain('e3: Barrow Deeps')
  })

  it('does not check for duplicates on a dry run', async () => {
    const fake = createFakeClient({ expansions: EXPANSIONS, tiers: WITH_DUPLICATE })

    const report = await runForeverSync(fake.client, { apply: false })

    expect(report.duplicates).toEqual([])
    expect(formatForeverSyncReport(report)).toContain('Duplicate tier names: checked after --apply')
  })

  it('re-reads id and name by expansion_id after an apply', async () => {
    const fake = createFakeClient({ expansions: [TWO_EXPANSIONS[0]] })

    await runForeverSync(fake.client, { apply: true })

    // The sync reads id, name and list_mode; the duplicate re-read after the
    // apply adds a second select('id, name') + eq('expansion_id', ...) pair.
    expect(namesFor(fake, 'e1')).toEqual(MANIFEST_NAMES)
    expect(fake.tierSelects()).toEqual([
      { cols: 'id, name, list_mode', expansionId: 'e1' },
      { cols: 'id, name', expansionId: 'e1' },
    ])
  })

  it('records a failed duplicate re-read as a failure with the expansion id', async () => {
    const fake = createFakeClient({
      expansions: TWO_EXPANSIONS,
      tiers: THREE_TIERS_E2,
      failReadsAfterInsert: ['e1'],
    })

    const report = await runForeverSync(fake.client, { apply: true })

    expect(report.failures).toHaveLength(1)
    expect(report.failures[0].expansionId).toBe('e1')
    expect(report.failures[0].message).toContain('read denied for e1')
    expect(syncExitCode(report)).toBe(1)
  })
})

describe('runForeverSync failures', () => {
  it('records one failing expansion with its id and message and still syncs the rest', async () => {
    const expansions: ExpansionRow[] = [
      { id: 'e1', guild_id: 'g1', name: 'Forever' },
      { id: 'e2', guild_id: 'g2', name: 'Forever' },
      { id: 'e3', guild_id: 'g3', name: 'Forever' },
    ]
    const fake = createFakeClient({ expansions, failReads: ['e2'] })

    const report = await runForeverSync(fake.client, { apply: true })

    expect(report.failures).toEqual([
      {
        expansionId: 'e2',
        message: 'Failed to read raid_tiers for expansion e2: read denied for e2',
      },
    ])
    expect(report.expansions.map(entry => entry.expansionId)).toEqual(['e1', 'e3'])
    expect(namesFor(fake, 'e1')).toEqual(MANIFEST_NAMES)
    expect(namesFor(fake, 'e2')).toEqual([])
    expect(namesFor(fake, 'e3')).toEqual(MANIFEST_NAMES)
    expect(syncExitCode(report)).toBe(1)

    const text = formatForeverSyncReport(report)
    expect(text).toContain('Failures (1):')
    expect(text).toContain('e2: Failed to read raid_tiers for expansion e2')
    expect(text).toMatch(/Totals: expansions scanned 3, .*failures 1/)
  })
})

describe('runForeverSync paging', () => {
  it('requests two ranges for 1001 Forever expansions and processes every one', async () => {
    const expansions: ExpansionRow[] = Array.from({ length: 1001 }, (_, index) => ({
      id: `exp-${String(index).padStart(4, '0')}`,
      guild_id: `guild-${index}`,
      name: 'Forever',
    }))
    const fake = createFakeClient({ expansions })

    const report = await runForeverSync(fake.client, { apply: false })

    const ranges = fake.expansionCalls
      .filter(call => call.method === 'range')
      .map(call => call.args)
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ])
    expect(report.expansions).toHaveLength(1001)
    expect(report.failures).toEqual([])
  })
})

describe('runForeverSync privacy', () => {
  const PLANTED = ['Planted Guild Label', 'Plantedplayer', 'planted-owner@example.invalid']

  it('touches only the expansions and raid_tiers tables and prints none of the planted values', async () => {
    const expansions: ExpansionRow[] = [
      {
        id: 'e1',
        guild_id: 'g1',
        name: 'Forever',
        guild_name: PLANTED[0],
        player_name: PLANTED[1],
        owner_email: PLANTED[2],
      },
    ]
    const fake = createFakeClient({
      expansions,
      tiers: [
        { id: 'p1', expansion_id: 'e1', name: 'Barrow Deeps', created_by: PLANTED[1] },
        { id: 'p2', expansion_id: 'e1', name: 'Barrow Deeps', created_by: PLANTED[1] },
      ],
    })

    const applied = await runForeverSync(fake.client, { apply: true })
    const dry = await runForeverSync(fake.client, { apply: false })

    expect([...new Set(fake.fromCalls)].sort()).toEqual(['expansions', 'loot_items', 'raid_tiers'])
    for (const report of [applied, dry]) {
      const text = formatForeverSyncReport(report)
      for (const value of PLANTED) {
        expect(text).not.toContain(value)
      }
      expect(text).not.toContain(EM_DASH)
    }
    expect(JSON.stringify(applied)).not.toContain(PLANTED[0])
  })
})

/**
 * Lazy-sync guard (D-08, T-02-10-05). The sync module must be reachable only
 * from the new-guild seeder and the admin script library: a request path,
 * middleware, cron or client component that imports it would run the catalog
 * sync for existing guilds on demand, which was rejected.
 */
const REPO_ROOT = path.resolve(__dirname, '../../..')
const SCAN_ROOTS = ['app', 'lib', 'utils', 'domain', 'components', 'data', 'scripts']
const SKIP_DIRS = new Set(['node_modules', '.next', '__tests__'])
const MIN_SCANNED_FILES = 300
const ALLOWED_IMPORTERS = ['app/services/expansionSeeder.ts', 'scripts/lib/forever-sync.ts']
// Static import / export-from, dynamic import() and require() whose path ends with the module name.
const SYNC_IMPORT =
  /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"][^'"\n]*expansionCatalogSync['"]/

function isScannedFile(name: string): boolean {
  return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && !name.endsWith('.d.ts')
}

function collectSourceFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) found.push(...collectSourceFiles(full))
    } else if (entry.isFile() && isScannedFile(entry.name)) {
      found.push(full)
    }
  }
  return found
}

function importsSyncModule(source: string): boolean {
  return SYNC_IMPORT.test(source)
}

/** Files (repo-relative, forward slashes) that import the sync module and are not allowed to. */
function findUnexpectedSyncImporters(files: Array<{ file: string; source: string }>): string[] {
  return files
    .filter(({ file, source }) => importsSyncModule(source) && !ALLOWED_IMPORTERS.includes(file))
    .map(({ file }) => file)
}

function loadScannedSources(): Array<{ file: string; source: string }> {
  const roots = SCAN_ROOTS.flatMap(root => collectSourceFiles(path.join(REPO_ROOT, root)))
  const rootLevel = fs
    .readdirSync(REPO_ROOT, { withFileTypes: true })
    .filter(entry => entry.isFile() && isScannedFile(entry.name))
    .map(entry => path.join(REPO_ROOT, entry.name))
  return [...roots, ...rootLevel].map(full => ({
    file: path.relative(REPO_ROOT, full).split(path.sep).join('/'),
    source: fs.readFileSync(full, 'utf8'),
  }))
}

describe('lazy-sync guard', () => {
  const scanned = loadScannedSources()

  it(`scans at least ${MIN_SCANNED_FILES} files including middleware and the allowed importers`, () => {
    expect(scanned.length).toBeGreaterThanOrEqual(MIN_SCANNED_FILES)
    const names = scanned.map(entry => entry.file)
    expect(names).toContain('proxy.ts')
    for (const allowed of ALLOWED_IMPORTERS) expect(names).toContain(allowed)
  })

  it('the seeder and the script library are the only importers of the sync module', () => {
    const importers = scanned
      .filter(({ source }) => importsSyncModule(source))
      .map(({ file }) => file)
      .sort()
    expect(importers).toEqual([...ALLOWED_IMPORTERS].sort())
    expect(findUnexpectedSyncImporters(scanned)).toEqual([])
  })

  it('flags a synthetic route that imports the sync module', () => {
    const forms = [
      "import { syncExpansionCatalog } from '@/app/services/expansionCatalogSync'",
      "import { syncExpansionCatalog } from '../../services/expansionCatalogSync'",
      "export { syncExpansionCatalog } from '@/app/services/expansionCatalogSync'",
      "const { syncExpansionCatalog } = await import('@/app/services/expansionCatalogSync')",
      "const sync = require('@/app/services/expansionCatalogSync')",
    ]
    for (const line of forms) {
      const route = [line, 'export async function POST() { return Response.json({}) }'].join('\n')
      expect(
        findUnexpectedSyncImporters([{ file: 'app/api/example/route.ts', source: route }])
      ).toEqual(['app/api/example/route.ts'])
    }
  })

  it('accepts a clean synthetic route and the two allowed importers', () => {
    const clean = "import { NextResponse } from 'next/server'\nexport async function GET() {}"
    const allowed = "import { syncExpansionCatalog } from '@/app/services/expansionCatalogSync'"
    expect(
      findUnexpectedSyncImporters([
        { file: 'app/api/example/route.ts', source: clean },
        { file: 'app/services/expansionSeeder.ts', source: allowed },
        { file: 'scripts/lib/forever-sync.ts', source: allowed },
      ])
    ).toEqual([])
  })
})
