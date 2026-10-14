// @vitest-environment node
/**
 * Golden-row contract for the five legacy expansions (EXPN-03).
 *
 * The files under ./__golden__/ were captured from expansionSeeder.ts as it
 * was on origin/main, before Phase 2 edited it. They pin every row the seeder
 * sends through the Supabase client, in call order. A failure here means a
 * change altered legacy rows. Never fix a failure by updating the snapshot
 * (no `vitest -u`); fix the change instead. Under CI Vitest refuses to write
 * snapshots, so a missing or mismatched file fails the run.
 *
 * Forever is deliberately not covered: its rows change by design in Phase 2.
 */
import { describe, it, expect } from 'vitest'
import { seedExpansionForGuild } from '../expansionSeeder'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

type RecordedMethod =
  | 'select'
  | 'eq'
  | 'insert'
  | 'update'
  | 'delete'
  | 'upsert'
  | 'single'

interface RecordedCall {
  table: string
  method: RecordedMethod
  args: unknown[]
  /** True when insert() was already called on this builder, i.e. a returning select rather than a read. */
  afterInsert: boolean
}

// Same names and order as supabase/seed.sql (wow_classes), so token class rows are reproducible.
const WOW_CLASS_NAMES = [
  'Warrior',
  'Paladin',
  'Hunter',
  'Rogue',
  'Priest',
  'Shaman',
  'Mage',
  'Warlock',
  'Druid',
  'Death Knight',
  'Monk',
]

/**
 * A recording Supabase fake that is rich enough to drive a legacy seed end to
 * end. Every id is a counter or a name, never random, so two runs record the
 * same calls. Kept local on purpose: the mock in expansionSeeder.test.ts has
 * a different job and must not change.
 */
function createSeederRecorder() {
  const calls: RecordedCall[] = []
  let tierCounter = 0
  let itemCounter = 0

  function buildBuilder(table: string) {
    let insertCalled = false
    let insertedRows: Array<Record<string, unknown>> = []

    const record = (method: RecordedMethod, args: unknown[]) => {
      calls.push({ table, method, args, afterInsert: insertCalled })
    }

    const builder = {
      select(...args: unknown[]) {
        record('select', args)
        return builder
      },
      eq(...args: unknown[]) {
        record('eq', args)
        return builder
      },
      insert(...args: unknown[]) {
        record('insert', args)
        insertCalled = true
        const payload = args[0]
        insertedRows = (Array.isArray(payload) ? payload : [payload]) as Array<Record<string, unknown>>
        return builder
      },
      update(...args: unknown[]) {
        record('update', args)
        return builder
      },
      delete(...args: unknown[]) {
        record('delete', args)
        return builder
      },
      upsert(...args: unknown[]) {
        record('upsert', args)
        return builder
      },
      single() {
        record('single', [])
        if (table === 'expansions') {
          return insertCalled
            ? Promise.resolve({ data: { id: 'exp-1' }, error: null })
            : Promise.resolve({ data: null, error: { code: 'PGRST116' } })
        }
        if (table === 'raid_tiers' && insertCalled) {
          tierCounter += 1
          return Promise.resolve({ data: { id: `tier-${tierCounter}` }, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      },
      // Thenable so awaited chains without .single() settle.
      then(
        onFulfilled?: (value: { data: unknown; error: null }) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) {
        let data: unknown = null
        if (table === 'loot_items' && insertCalled) {
          data = insertedRows.map(row => {
            itemCounter += 1
            return { id: `item-${itemCounter}`, name: row.name, item_slot: row.item_slot }
          })
        } else if (table === 'wow_classes') {
          data = WOW_CLASS_NAMES.map(name => ({
            id: `class-${name.toLowerCase().replace(/ /g, '-')}`,
            name,
          }))
        }
        return Promise.resolve({ data, error: null }).then(onFulfilled, onRejected)
      },
    }

    return builder
  }

  const supabase: AnySupabase = {
    from(table: string) {
      return buildBuilder(table)
    },
  }

  return { supabase, calls }
}

/** JSON with keys sorted recursively and arrays kept in order, so key order in the seeder never matters. */
function sortedJson(value: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort)
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.entries(v as Record<string, unknown>)
          .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
          .map(([k, val]) => [k, sort(val)])
      )
    }
    return v
  }
  return JSON.stringify(sort(value))
}

const WRITE_METHODS: RecordedMethod[] = ['insert', 'update', 'delete', 'upsert']

/**
 * One line per written row, in call order: `<method> <table> <sorted json>`.
 * Row order is part of the contract, so it is never re-sorted.
 */
function canonicalLines(calls: RecordedCall[]): string {
  const lines: string[] = []
  for (const call of calls) {
    if (!WRITE_METHODS.includes(call.method)) continue
    const payload = call.args[0]
    const rows = Array.isArray(payload) ? payload : [payload]
    for (const row of rows) {
      lines.push(`${call.method} ${call.table} ${sortedJson(row ?? {})}`)
    }
  }
  return lines.join('\n') + '\n'
}

// Stored expansion name and the golden file slug.
const LEGACY_EXPANSIONS: Array<[string, string]> = [['Classic', 'classic']]

describe('legacy expansion seeding is frozen to golden rows', () => {
  it.each(LEGACY_EXPANSIONS)('%s seeds exactly the committed rows', async (name, slug) => {
    const { supabase, calls } = createSeederRecorder()

    const result = await seedExpansionForGuild(supabase, 'g1', name, true, true)

    expect(result).toEqual({ expansionId: 'exp-1' })

    // Sync never runs over a legacy expansion (D-11): the seeder must not read
    // existing raid_tiers or modify rows it did not just insert.
    const readsOfRaidTiers = calls.filter(
      c => c.table === 'raid_tiers' && c.method === 'select' && !c.afterInsert
    )
    expect(readsOfRaidTiers).toEqual([])
    const forbiddenWrites = calls.filter(
      c =>
        ['raid_tiers', 'loot_items', 'loot_item_classes'].includes(c.table) &&
        ['update', 'delete', 'upsert'].includes(c.method)
    )
    expect(forbiddenWrites).toEqual([])

    const text = canonicalLines(calls)
    const lines = text.trimEnd().split('\n')

    expect(lines[0].startsWith('insert expansions ')).toBe(true)
    expect(lines[1].startsWith('update guilds ')).toBe(true)
    expect(lines[2].startsWith('insert raid_tiers ')).toBe(true)

    const tierLines = lines.filter(l => l.startsWith('insert raid_tiers '))
    expect(tierLines.every(l => !l.includes('sort_order'))).toBe(true)

    // wowhead_id is a string in the seeder today; the refactor must not convert it.
    const itemLines = lines.filter(l => l.startsWith('insert loot_items '))
    expect(itemLines.length).toBeGreaterThan(0)
    expect(itemLines.every(l => /"wowhead_id":"\d+"/.test(l))).toBe(true)

    // Each loot row points at the tier inserted just before it.
    let currentTier = ''
    let tierIndex = 0
    for (const line of lines) {
      if (line.startsWith('insert raid_tiers ')) {
        tierIndex += 1
        currentTier = `tier-${tierIndex}`
      } else if (line.startsWith('insert loot_items ')) {
        expect(line).toContain(`"raid_tier_id":"${currentTier}"`)
      }
    }

    await expect(text).toMatchFileSnapshot(`./__golden__/${slug}.rows.txt`)
  })
})
