import { describe, it, expect, beforeAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { seedExpansionForGuild } from '../expansionSeeder'
import { GH273_CORE } from '@/data/__tests__/fixtures/classic-gh273-core'

// GH-273: the expansion seeder copies data/classic-wow-raids.ts into each
// guild at seed time, so adding the missing items to that file only helps
// guilds created afterwards. Existing Classic guilds get the same rows from a
// backfill migration. The user requirement is that the two converge exactly,
// so this suite runs the real seeder against an in-memory Supabase fake and
// checks every row the migration would insert (and every token class row)
// against what the seeder writes for a new guild.

const MIGRATION_FILE = path.resolve(
  __dirname,
  '../../../supabase/migrations/20260926000000_add_classic_missing_loot.sql',
)

const CLASS_NAMES = ['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Shaman', 'Mage', 'Warlock', 'Druid']

interface SeededItem {
  id: string
  raid_tier_id: string
  name: string
  item_slot: string
  wowhead_id: string
  boss_name: string
  is_available: boolean
  classification: string
  allocation_cost: number
  roles: string[]
}

interface SeededItemClass {
  loot_item_id: string
  class_id: string
  spec_id: string | null
  spec_type: string
}

interface QueryResult {
  data: unknown
  error: unknown
}

/**
 * Minimal chainable stand-in for the Supabase client calls seedExpansionForGuild
 * makes on the service-role path: expansions lookup + insert, raid_tiers insert,
 * loot_items bulk insert, wow_classes select and loot_item_classes insert.
 */
function createSeederFake() {
  const tierNames = new Map<string, string>()
  const items: SeededItem[] = []
  const itemClasses: SeededItemClass[] = []
  let nextId = 0

  function from(table: string) {
    let payload: unknown = null

    function resolve(): QueryResult {
      switch (table) {
        case 'expansions':
          return payload
            ? { data: { id: 'expansion-classic' }, error: null }
            : { data: null, error: { message: 'no rows' } }
        case 'raid_tiers': {
          const tier = payload as { name: string }
          const id = `tier-${nextId++}`
          tierNames.set(id, tier.name)
          return { data: { id }, error: null }
        }
        case 'loot_items': {
          const rows = (payload as Omit<SeededItem, 'id'>[]).map(row => ({ ...row, id: `item-${nextId++}` }))
          items.push(...rows)
          return { data: rows.map(row => ({ id: row.id, name: row.name, item_slot: row.item_slot })), error: null }
        }
        case 'wow_classes':
          return { data: CLASS_NAMES.map(name => ({ id: `class-${name}`, name })), error: null }
        case 'loot_item_classes':
          itemClasses.push(...(payload as SeededItemClass[]))
          return { data: null, error: null }
        default:
          return { data: null, error: { message: `unexpected table ${table}` } }
      }
    }

    const chain = {
      insert(value: unknown) {
        payload = value
        return chain
      },
      select() {
        return chain
      },
      eq() {
        return chain
      },
      single() {
        return Promise.resolve(resolve())
      },
      then<T>(onFulfilled: (result: QueryResult) => T, onRejected?: (reason: unknown) => T) {
        return Promise.resolve(resolve()).then(onFulfilled, onRejected)
      },
    }
    return chain
  }

  return { client: { from } as unknown as SupabaseClient, tierNames, items, itemClasses }
}

interface MigrationItem {
  raid: string
  boss: string
  name: string
  wowheadId: number
  slot: string
  classification: string
  allocationCost: number
}

const unquote = (value: string) => value.replace(/''/g, "'")

/** Parse the item VALUES and token class VALUES out of the migration SQL. */
function parseMigration(sql: string) {
  const code = sql.replace(/--.*$/gm, '')
  const itemPattern =
    /\(\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*(\d+),\s*'([^']*)',\s*'(Reserved|Limited|Unlimited)',\s*(\d+)\s*\)/g
  const items: MigrationItem[] = [...code.matchAll(itemPattern)].map(m => ({
    raid: unquote(m[1]),
    boss: unquote(m[2]),
    name: unquote(m[3]),
    wowheadId: Number(m[4]),
    slot: m[5],
    classification: m[6],
    allocationCost: Number(m[7]),
  }))
  const classPattern = /\(\s*(\d+),\s*ARRAY\[([^\]]*)\]\s*\)/g
  const tokenClasses = new Map<number, string[]>(
    [...code.matchAll(classPattern)].map(m => [
      Number(m[1]),
      m[2].split(',').map(part => part.trim().replace(/^'|'$/g, '')).sort(),
    ]),
  )
  return { code, items, tokenClasses }
}

describe('Classic missing-loot backfill migration matches the seeder (#273)', () => {
  const fake = createSeederFake()
  const migration = parseMigration(fs.readFileSync(MIGRATION_FILE, 'utf8'))

  beforeAll(async () => {
    const result = await seedExpansionForGuild(fake.client, 'guild-1', 'Classic', false, true)
    expect(result.error).toBeUndefined()
  })

  function seededRows(raid: string, wowheadId: number) {
    return fake.items.filter(item => fake.tierNames.get(item.raid_tier_id) === raid && Number(item.wowhead_id) === wowheadId)
  }

  it('inserts exactly the 66 core items', () => {
    const migrationKeys = migration.items.map(item => `${item.raid}|${item.wowheadId}`).sort()
    const coreKeys = GH273_CORE.map(item => `${item.raid}|${item.id}`).sort()
    expect(migrationKeys).toEqual(coreKeys)
  })

  it.each(GH273_CORE)('$name ($id) in $raid matches the row the seeder writes', core => {
    const row = migration.items.find(item => item.raid === core.raid && item.wowheadId === core.id)
    expect(row).toBeDefined()
    const seeded = seededRows(core.raid, core.id)
    expect(seeded, `seeder wrote ${seeded.length} rows for ${core.name} in ${core.raid}`).toHaveLength(1)
    expect({
      name: row!.name,
      item_slot: row!.slot,
      boss_name: row!.boss,
      classification: row!.classification,
      allocation_cost: row!.allocationCost,
    }).toEqual({
      name: seeded[0].name,
      item_slot: seeded[0].item_slot,
      boss_name: seeded[0].boss_name,
      classification: seeded[0].classification,
      allocation_cost: seeded[0].allocation_cost,
    })
    // The migration hardcodes is_available true and roles '{}' for every row.
    expect(seeded[0].is_available).toBe(true)
    expect(seeded[0].roles).toEqual([])
  })

  it('writes the same token class rows as the seeder, and none for non-token items', () => {
    const tokenIds = migration.items.filter(item => item.slot === 'Token').map(item => item.wowheadId).sort()
    expect([...migration.tokenClasses.keys()].sort()).toEqual(tokenIds)

    for (const item of migration.items.filter(i => i.slot === 'Token')) {
      const seeded = seededRows(item.raid, item.wowheadId)[0]
      const seededClasses = fake.itemClasses
        .filter(entry => entry.loot_item_id === seeded.id)
        .map(entry => {
          expect(entry).toMatchObject({ spec_id: null, spec_type: 'primary' })
          return entry.class_id.replace(/^class-/, '')
        })
        .sort()
      expect(migration.tokenClasses.get(item.wowheadId), item.name).toEqual(seededClasses)
    }
  })

  it('is scoped to Classic tiers and guarded per tier by NOT EXISTS on (raid_tier_id, wowhead_id)', () => {
    expect(migration.code).toMatch(/e\.name IN \('Classic', 'Classic WoW'\)/)
    expect(migration.code).toMatch(/NOT EXISTS\s*\(\s*SELECT 1 FROM loot_items li\s+WHERE li\.raid_tier_id = rt\.id\s+AND li\.wowhead_id = i\.wowhead_id\s*\)/)
  })
})
