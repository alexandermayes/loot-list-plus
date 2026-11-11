// @vitest-environment node
import * as fs from 'fs'
import * as path from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import {
  asRole,
  createChainedDb,
  inRolledBackTransaction,
  listMigrationFiles,
  query,
  resetRole,
} from './helpers/pglite-chain'

// DISC-03, DISC-05, DISC-10 (D-02, D-08, D-18, D-25): the Phase 4 migration
// applies after every existing migration and applies again on top of itself,
// drops the need-ranking hold, widens the slot range to 1..8, adds
// guild_settings.loot_style and guards raid tier deletes. It builds a clean
// chain and never re-applies the Phase 3 file, which would recreate the hold
// it drops (D-25 amended). Every rejection runs as the role PostgREST would
// use (authenticated, row_security on) beside a positive control for the same
// role, so a rejection from RLS can never pass for a guard rejection. The
// superuser stands in for the service role. Cases that change data run inside
// a rolled-back transaction so the shared seed is the same for every case.

const NEED_LISTS_FILE = path.resolve(
  __dirname,
  '../../../supabase/migrations/20261111120000_need_lists.sql',
)

// Synthetic ids only: this repo is public.
const uid = (n: number) => `00000000-0000-4000-8000-0000000004${n.toString(16).padStart(2, '0')}`

const GUILD_ID = uid(0x01)
const FOREVER_EXPANSION_ID = uid(0x02)
const CLASSIC_EXPANSION_ID = uid(0x03)
const KNOWN_TIER_ID = uid(0x04)
const KNOWN_ITEM_ID = uid(0x05)
const CREATOR_USER_ID = uid(0x06)
const OFFICER_USER_ID = uid(0x07)
const RAIDER_USER_ID = uid(0x08)
const OFFICER_CHARACTER_ID = uid(0x09)
const RAIDER_CHARACTER_ID = uid(0x0a)
const DRAFT_LIST_ID = uid(0x0b)

// Three Discovery tiers in tier order (sort_order 1, 2, 3).
const TIER_IDS = [uid(0x11), uid(0x12), uid(0x13)] as const
const [RANKED_TIER_ID] = TIER_IDS

// Five need keys per tier, in picker order, with the costs the catalog gives them.
const NEED_KEYS = [
  { key: 'main-hand-weapon.spell-damage', cost: 3 },
  { key: 'trinket.spell-damage', cost: 3 },
  { key: 'ring.spell-damage', cost: 2 },
  { key: 'chest.cloth.spell-damage', cost: 1 },
  { key: 'head.cloth.spell-damage', cost: 1 },
] as const
const needId = (tierIndex: number, keyIndex: number) => uid(0x20 + tierIndex * 0x10 + keyIndex)

let db: PGlite

/** The five needs times three tiers: rank 50..46, one slot per tier in tier order. */
function fifteenNeedRows() {
  return NEED_KEYS.flatMap((_, keyIndex) =>
    TIER_IDS.map((_tier, tierIndex) => ({
      loot_item_id: needId(tierIndex, keyIndex),
      rank: 50 - keyIndex,
      slot: tierIndex + 1,
    })),
  )
}

const saveItems = (items: unknown[]) =>
  db.query<{ saved: number }>(`SELECT public.save_submission_items($1, $2::jsonb) AS saved`, [
    DRAFT_LIST_ID,
    JSON.stringify(items),
  ])

const liveRowCount = async () =>
  (
    await query<{ n: number }>(
      db,
      `SELECT count(*)::int AS n FROM loot_submission_items WHERE submission_id = $1 AND removed_at IS NULL`,
      [DRAFT_LIST_ID],
    )
  )[0].n

beforeAll(async () => {
  // Every existing migration, in filename order, then the Phase 4 file a
  // second time. The hook checks that the chain holds the Phase 4 file, not
  // that it is the newest file, so a later migration cannot fail it (#309).
  // The default 10 s hook timeout is too short for the chain.
  const files = listMigrationFiles()
  expect(files).toContain(NEED_LISTS_FILE)
  db = await createChainedDb(files)
  await db.exec('SET search_path TO public, extensions; RESET role;')
  await db.exec(fs.readFileSync(NEED_LISTS_FILE, 'utf8'))

  // Seed as the superuser, which stands in for the service role: the guards
  // check only anon and authenticated sessions.
  for (const [id, label] of [
    [CREATOR_USER_ID, 'creator'],
    [OFFICER_USER_ID, 'officer'],
    [RAIDER_USER_ID, 'raider'],
  ]) {
    await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2)`, [id, `${label}@example.test`])
  }
  // The creator is not the officer, so the officer holds only the Officer
  // role and the creator is the guild master.
  await db.query(`INSERT INTO guilds (id, name, created_by) VALUES ($1, 'Test Guild', $2)`, [
    GUILD_ID,
    CREATOR_USER_ID,
  ])
  for (const [id, userId, name] of [
    [OFFICER_CHARACTER_ID, OFFICER_USER_ID, 'Test Officer'],
    [RAIDER_CHARACTER_ID, RAIDER_USER_ID, 'Test Raider'],
  ]) {
    await db.query(`INSERT INTO characters (id, user_id, name) VALUES ($1, $2, $3)`, [id, userId, name])
  }
  await db.query(
    `INSERT INTO character_guild_memberships (character_id, guild_id, role, is_active)
     VALUES ($1, $3, 'Officer', true), ($2, $3, 'Member', true)`,
    [OFFICER_CHARACTER_ID, RAIDER_CHARACTER_ID, GUILD_ID],
  )

  await db.query(
    `INSERT INTO expansions (id, guild_id, name) VALUES ($1, $3, 'Forever'), ($2, $3, 'Classic')`,
    [FOREVER_EXPANSION_ID, CLASSIC_EXPANSION_ID, GUILD_ID],
  )
  await db.query(
    `INSERT INTO raid_tiers (id, expansion_id, name, list_mode, sort_order) VALUES
       ($1, $4, 'Forever Tier One', 'discovery', 1),
       ($2, $4, 'Forever Tier Two', 'discovery', 2),
       ($3, $4, 'Forever Tier Three', 'discovery', 3)`,
    [...TIER_IDS, FOREVER_EXPANSION_ID],
  )
  // No list_mode named: the column default (known) has to apply.
  await db.query(`INSERT INTO raid_tiers (id, expansion_id, name) VALUES ($1, $2, 'Classic Tier')`, [
    KNOWN_TIER_ID,
    CLASSIC_EXPANSION_ID,
  ])
  await db.query(
    `INSERT INTO loot_items (id, raid_tier_id, name, wowhead_id) VALUES ($1, $2, 'Test Item', 4321)`,
    [KNOWN_ITEM_ID, KNOWN_TIER_ID],
  )
  for (const [tierIndex, tierId] of TIER_IDS.entries()) {
    for (const [keyIndex, { key, cost }] of NEED_KEYS.entries()) {
      await db.query(
        `INSERT INTO loot_items (id, raid_tier_id, name, boss_name, kind, need_key, allocation_cost, wowhead_id)
         VALUES ($1, $2, $3, 'Needs', 'need', $4, $5, NULL)`,
        [needId(tierIndex, keyIndex), tierId, `Need ${tierIndex + 1}.${keyIndex + 1}`, key, cost],
      )
    }
  }

  // A draft list stays writable for its owner (20260930000000), so only the
  // database rules under test can refuse a save. It carries one ranking on the
  // first Discovery tier for the whole file: that tier is the ranked one.
  await db.query(
    `INSERT INTO loot_submissions (id, user_id, guild_id, raid_tier_id, character_id, status)
     VALUES ($1, $2, $3, $4, $5, 'draft')`,
    [DRAFT_LIST_ID, RAIDER_USER_ID, GUILD_ID, RANKED_TIER_ID, RAIDER_CHARACTER_ID],
  )
  await db.query(
    `INSERT INTO loot_submission_items (submission_id, loot_item_id, rank, slot) VALUES ($1, $2, 50, 1)`,
    [DRAFT_LIST_ID, needId(0, 0)],
  )
}, 180000)

afterAll(async () => {
  await db?.close()
})

describe('applies on the full chain', () => {
  it('applies the Phase 4 file a third time without error', async () => {
    await expect(db.exec(fs.readFileSync(NEED_LISTS_FILE, 'utf8'))).resolves.toBeDefined()
  })

  it('[D-08] leaves no need-ranking hold trigger or function behind', async () => {
    expect(
      await query(db, `SELECT 1 FROM pg_trigger WHERE tgname = 'enforce_need_ranking_hold' AND NOT tgisinternal`),
    ).toEqual([])
    expect(await query(db, `SELECT 1 FROM pg_proc WHERE proname = 'enforce_need_ranking_hold'`)).toEqual([])
  })
})

describe('a raider saves need rows through save_submission_items (D-02, DISC-05)', () => {
  it('[D-02] stores 15 need rows, five needs at ranks 50 to 46 across three tier slots, from a browser session', async () => {
    await inRolledBackTransaction(db, async () => {
      await asRole(db, 'authenticated', RAIDER_USER_ID)
      const result = await saveItems(fifteenNeedRows())
      expect(result.rows).toEqual([{ saved: 15 }])
      await resetRole(db)
      expect(await liveRowCount()).toBe(15)

      const stored = await query<{ rank: number; slot: number; kind: string }>(
        db,
        `SELECT lsi.rank, lsi.slot, li.kind
         FROM loot_submission_items lsi JOIN loot_items li ON li.id = lsi.loot_item_id
         WHERE lsi.submission_id = $1 AND lsi.removed_at IS NULL
         ORDER BY lsi.rank DESC, lsi.slot`,
        [DRAFT_LIST_ID],
      )
      expect(stored.every(row => row.kind === 'need')).toBe(true)
      expect(stored.map(row => row.rank)).toEqual([50, 50, 50, 49, 49, 49, 48, 48, 48, 47, 47, 47, 46, 46, 46])
      expect(stored.map(row => row.slot)).toEqual([1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3])
    })
  })

  it('still saves item rows on a Known tier through the same RPC (positive control for the same role)', async () => {
    await inRolledBackTransaction(db, async () => {
      await asRole(db, 'authenticated', RAIDER_USER_ID)
      const result = await saveItems([{ loot_item_id: KNOWN_ITEM_ID, rank: 1, slot: 1 }])
      expect(result.rows).toEqual([{ saved: 1 }])
    })
  })
})
