// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  ForeverSyncArgError,
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
}

const EM_DASH = '—'

/**
 * Fake service-role client with exactly two tables. expansions supports
 * select, eq, order and range and records each call's arguments so a test can
 * pin the exact query. raid_tiers is stateful: select and eq read, insert
 * appends, update, delete and upsert throw. Any other table throws, which is
 * how the privacy guarantee (no guilds or characters read) is enforced.
 */
function createFakeClient(options: { expansions: ExpansionRow[]; tiers?: TierRow[] }) {
  const tiers: TierRow[] = (options.tiers ?? []).map(row => ({ ...row }))
  const fromCalls: string[] = []
  const expansionCalls: Array<{ method: string; args: unknown[] }> = []
  const tierCalls: Array<{ method: string; args: unknown[] }> = []
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
    const forbidden = (method: string) => () => {
      tierCalls.push({ method, args: [] })
      throw new Error(`forbidden write: ${method}`)
    }
    const builder = {
      select(cols: string) {
        tierCalls.push({ method: 'select', args: [cols] })
        columns = cols.split(',').map(column => column.trim())
        return builder
      },
      eq(column: string, value: string) {
        tierCalls.push({ method: 'eq', args: [column, value] })
        if (column === 'expansion_id') expansionFilter = value
        return builder
      },
      insert(payload: Array<Record<string, unknown>>) {
        tierCalls.push({ method: 'insert', args: [payload] })
        for (const row of payload) {
          tiers.push({ id: `tier-new-${nextId++}`, ...row } as TierRow)
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

  const client: AnySupabase = {
    from(table: string) {
      fromCalls.push(table)
      if (table === 'expansions') return expansionsBuilder()
      if (table === 'raid_tiers') return tiersBuilder()
      throw new Error(`unexpected table: ${table}`)
    },
  }

  return {
    client,
    tiers,
    fromCalls,
    expansionCalls,
    inserts: () => tierCalls.filter(call => call.method === 'insert'),
  }
}

function tier(id: string, expansionId: string, name: string): TierRow {
  return { id, expansion_id: expansionId, name }
}

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
