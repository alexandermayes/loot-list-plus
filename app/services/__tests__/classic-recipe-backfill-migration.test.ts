import { describe, it, expect, beforeAll } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { seedExpansionForGuild } from '../expansionSeeder'
import { GH284_RECIPES } from '@/data/__tests__/fixtures/classic-gh284-recipes'

// GH-284: the expansion seeder copies data/classic-wow-raids.ts into each
// guild at seed time (PR #308), so adding the 21 raid-specific profession
// recipes to that file only helps guilds created afterwards. Existing
// Classic guilds get the same 28 rows from this backfill migration. The
// user requirement is that the two converge exactly, so this suite runs the
// real seeder against an in-memory Supabase fake and checks every row the
// migration would insert against what the seeder writes for a new guild,
// the same pattern app/services/__tests__/classic-loot-backfill-migration.test.ts
// (#273) established.

const MIGRATION_FILE = path.resolve(
  __dirname,
  '../../../supabase/migrations/20260929120000_add_classic_raid_recipes.sql',
)

// The file name's timestamp must be greater than the last migration on
// origin/main at plan time (20260928180000), compared against that
// constant rather than "last file in the directory", so a later migration
// added by someone else cannot break this test.
const PRIOR_LATEST_MIGRATION_TIMESTAMP = 20260928180000

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
 *
 * Copied verbatim from classic-loot-backfill-migration.test.ts (#273); kept in
 * this file too so PR 2 stays a two-file change (the migration and this test).
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

/** Parse the item VALUES out of the migration SQL. Same shape as #273's parser
 * (the token-class VALUES this migration has none of, since no recipe is a
 * Token-slot item). */
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
  return { code, items }
}

/**
 * The commented verification queries at the end of the migration, with the
 * comment markers removed: the wowhead_id lists (queries 1, 2 and 3).
 */
function parseVerification(sql: string) {
  const start = sql.indexOf('-- Verification only')
  const text = sql
    .slice(start)
    .split('\n')
    .map(line => line.replace(/^--\s?/, ''))
    .join('\n')
  const idLists = [...text.matchAll(/wowhead_id in \(([\d,\s]+)\)/g)].map(m =>
    m[1].split(',').map(part => Number(part.trim())).sort((a, b) => a - b),
  )
  return { start, idLists }
}

describe('Classic raid recipe backfill migration matches the seeder (#284)', () => {
  const fake = createSeederFake()
  const migration = parseMigration(fs.readFileSync(MIGRATION_FILE, 'utf8'))

  beforeAll(async () => {
    const result = await seedExpansionForGuild(fake.client, 'guild-1', 'Classic', false, true)
    expect(result.error).toBeUndefined()
  })

  function seededRows(raid: string, wowheadId: number) {
    return fake.items.filter(item => fake.tierNames.get(item.raid_tier_id) === raid && Number(item.wowhead_id) === wowheadId)
  }

  it('inserts exactly the 28 GH-284 rows, keyed by raid and id', () => {
    const migrationKeys = migration.items.map(item => `${item.raid}|${item.wowheadId}`).sort()
    const recipeKeys = GH284_RECIPES.map(recipe => `${recipe.raid}|${recipe.id}`).sort()
    expect(migrationKeys).toEqual(recipeKeys)
  })

  it.each(GH284_RECIPES)('$name ($id) in $raid matches the row the seeder writes, under $boss', recipe => {
    const row = migration.items.find(item => item.raid === recipe.raid && item.wowheadId === recipe.id)
    expect(row).toBeDefined()
    expect(row!.boss).toBe(recipe.boss)

    const seeded = seededRows(recipe.raid, recipe.id)
    expect(seeded, `seeder wrote ${seeded.length} rows for ${recipe.name} in ${recipe.raid}`).toHaveLength(1)
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
    expect(row!.slot).toBe('Recipe')
    expect(row!.classification).toBe('Unlimited')
    expect(row!.allocationCost).toBe(0)
    // The migration hardcodes is_available true and roles '{}' for every row.
    expect(seeded[0].is_available).toBe(true)
    expect(seeded[0].roles).toEqual([])
  })

  it('writes no loot_item_classes rows for any recipe, and the migration contains no loot_item_classes statement', () => {
    const recipeIds = new Set(GH284_RECIPES.map(recipe => recipe.id))
    const recipeItemIds = new Set(
      fake.items.filter(item => recipeIds.has(Number(item.wowhead_id))).map(item => item.id),
    )
    const recipeClassRows = fake.itemClasses.filter(entry => recipeItemIds.has(entry.loot_item_id))
    expect(recipeClassRows).toEqual([])
    expect(migration.code).not.toMatch(/loot_item_classes/)
  })

  it('is a single statement scoped to Classic tiers, with no UPDATE, DELETE, ALTER or DROP', () => {
    expect(migration.code).toMatch(/e\.name IN \('Classic', 'Classic WoW'\)/)
    expect(migration.code).not.toMatch(/\bUPDATE\b/i)
    expect(migration.code).not.toMatch(/\bDELETE\b/i)
    expect(migration.code).not.toMatch(/\bALTER\b/i)
    expect(migration.code).not.toMatch(/\bDROP\b/i)
  })

  it('is guarded per tier by NOT EXISTS on (raid_tier_id, wowhead_id)', () => {
    expect(migration.code).toMatch(
      /NOT EXISTS\s*\(\s*SELECT 1 FROM loot_items li\s+WHERE li\.raid_tier_id = rt\.id\s+AND li\.wowhead_id = i\.wowhead_id\s*\)/,
    )
  })

  it('also skips an item when the tier has the same name (case-insensitive) under the same boss', () => {
    expect(migration.code).toMatch(
      /AND NOT EXISTS\s*\(\s*SELECT 1 FROM loot_items li\s+WHERE li\.raid_tier_id = rt\.id\s+AND lower\(li\.name\) = lower\(i\.name\)\s+AND li\.boss_name = i\.boss_name\s*\)/,
    )
  })

  // Models both guards against a guild seeded from the pre-#284 catalog (the
  // seeded tier minus the GH-284 recipes). If either guard matched one of the
  // new recipes there, the migration would silently skip it for every
  // existing guild while the seeder still wrote it for new ones.
  it('neither guard blocks any recipe for a guild seeded from the pre-#284 catalog', () => {
    const recipeKeys = new Set(GH284_RECIPES.map(recipe => `${recipe.raid}|${recipe.id}`))
    const preFixRows = fake.items.filter(
      row => !recipeKeys.has(`${fake.tierNames.get(row.raid_tier_id)}|${Number(row.wowhead_id)}`),
    )
    const blocked = migration.items.flatMap(item => {
      const tierRows = preFixRows.filter(row => fake.tierNames.get(row.raid_tier_id) === item.raid)
      const byId = tierRows.some(row => Number(row.wowhead_id) === item.wowheadId)
      const byNameAndBoss = tierRows.some(
        row => row.name.toLowerCase() === item.name.toLowerCase() && row.boss_name === item.boss,
      )
      return byId || byNameAndBoss ? [`${item.name} (${item.wowheadId}) id:${byId} name+boss:${byNameAndBoss}`] : []
    })
    expect(blocked).toEqual([])
  })

  // Cross-raid: the 7 ids shared between Ruins of Ahn'Qiraj and Temple of
  // Ahn'Qiraj must each produce two migration rows, one per raid, both
  // guarded independently since both guards are scoped by rt.id.
  it('lists each of the 7 shared AQ formula ids once for Ruins of Ahn\'Qiraj and once for Temple of Ahn\'Qiraj, both under Shared Boss Loot', () => {
    const sharedIds = [20727, 20728, 20729, 20730, 20731, 20734, 20736]
    for (const id of sharedIds) {
      const aq20 = migration.items.filter(item => item.raid === "Ruins of Ahn'Qiraj" && item.wowheadId === id)
      const aq40 = migration.items.filter(item => item.raid === "Temple of Ahn'Qiraj" && item.wowheadId === id)
      expect(aq20, `id ${id} in Ruins of Ahn'Qiraj`).toHaveLength(1)
      expect(aq40, `id ${id} in Temple of Ahn'Qiraj`).toHaveLength(1)
      expect(aq20[0].boss).toBe('Shared Boss Loot')
      expect(aq40[0].boss).toBe('Shared Boss Loot')
    }
  })

  it('the migration file timestamp is newer than the prior latest migration on origin/main', () => {
    const fileTimestamp = Number(path.basename(MIGRATION_FILE).split('_')[0])
    expect(fileTimestamp).toBeGreaterThan(PRIOR_LATEST_MIGRATION_TIMESTAMP)
  })

  describe('commented verification queries', () => {
    const verification = parseVerification(fs.readFileSync(MIGRATION_FILE, 'utf8'))
    const uniqueIds = [...new Set(migration.items.map(item => item.wowheadId))].sort((a, b) => a - b)

    it('has exactly 21 unique ids across the 28 rows', () => {
      expect(uniqueIds).toHaveLength(21)
    })

    it('lists exactly the sorted unique migration ids in all 3 verification queries', () => {
      expect(verification.start).toBeGreaterThan(0)
      expect(verification.idLists).toHaveLength(3)
      for (const ids of verification.idLists) expect(ids).toEqual(uniqueIds)
    })

    it('query 1 comment states the per-raid counts computed from the migration', () => {
      const counts: Record<string, number> = {}
      for (const item of migration.items) counts[item.raid] = (counts[item.raid] ?? 0) + 1
      expect(counts).toEqual({
        'Molten Core': 10,
        "Ruins of Ahn'Qiraj": 8,
        "Temple of Ahn'Qiraj": 10,
      })
      const text = fs.readFileSync(MIGRATION_FILE, 'utf8')
      expect(text).toMatch(/Molten Core 10/)
      expect(text).toMatch(/Ruins of Ahn'Qiraj 8/)
      expect(text).toMatch(/Temple of Ahn'Qiraj 10/)
    })

    it('query 2 checks item_slot, classification and allocation_cost drift and class-row presence, not an average', () => {
      const text = fs.readFileSync(MIGRATION_FILE, 'utf8').slice(verification.start)
      expect(text).toMatch(/rows_off_expected/)
      expect(text).toMatch(/rows_with_class_rows/)
    })

    it('query 3 finds any tier holding a name under more than one id', () => {
      const text = fs.readFileSync(MIGRATION_FILE, 'utf8').slice(verification.start)
      expect(text).toMatch(/having count\(distinct/)
    })

    it('never selects guild, player or character identifier columns in the executable SQL', () => {
      // Checked against the executable statements only (before the
      // verification comment block starts), since the verification block's
      // own prose explains, in English, why it avoids those columns.
      const executableSql = fs.readFileSync(MIGRATION_FILE, 'utf8').slice(0, verification.start)
      expect(executableSql).not.toMatch(/\bguild_id\b/)
      expect(executableSql).not.toMatch(/\bplayer_id\b/)
      expect(executableSql).not.toMatch(/\bcharacter_id\b/)
    })
  })
})
