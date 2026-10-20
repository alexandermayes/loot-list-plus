// @vitest-environment node
import * as fs from 'fs'
import * as path from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { asRole, createChainedDb, listMigrationFiles, resetRole } from './helpers/pglite-chain'

// DISC-12 (roadmap success criterion 1, PGlite half): the Discovery migration
// applies after every existing migration, applies again on top of itself, and
// leaves legacy-style writes on their old defaults. Plan 03-15 adds the
// behaviour cases (constraints, guards as the officer and raider roles, the
// RLS matrix, grants, need BLP) to this file and this seed.

const DISCOVERY_FILE = path.resolve(
  __dirname,
  '../../../supabase/migrations/20261020120000_discovery_schema.sql',
)

// Synthetic ids only: this repo is public.
const GUILD_ID = '00000000-0000-4000-8000-000000000001'
const FOREVER_EXPANSION_ID = '00000000-0000-4000-8000-000000000002'
const CLASSIC_EXPANSION_ID = '00000000-0000-4000-8000-000000000003'
const FOREVER_TIER_ID = '00000000-0000-4000-8000-000000000004'
const CLASSIC_TIER_ID = '00000000-0000-4000-8000-000000000005'
const NEED_ID = '00000000-0000-4000-8000-000000000006'
const RAIDER_USER_ID = '00000000-0000-4000-8000-000000000007'

const GUARD_TRIGGERS = [
  'enforce_loot_item_need_pin_refs',
  'enforce_raid_tier_discovery_forever_only',
  'enforce_raid_tier_known_switch',
  'enforce_loot_item_need_rules_insert',
  'enforce_loot_item_need_rules_update',
  'enforce_need_ranking_hold',
  'enforce_expansion_forever_name_insert',
  'enforce_expansion_forever_name_update',
  'enforce_raid_tier_expansion_lock',
  'enforce_loot_item_need_delete_lock',
]

let db: PGlite

describe('applies on the full chain', () => {
  beforeAll(async () => {
    // Every existing migration, in filename order, then the Discovery file a
    // second time. The default 10 s hook timeout is too short for the chain.
    const files = listMigrationFiles()
    expect(files[files.length - 1]).toBe(DISCOVERY_FILE)
    db = await createChainedDb(files)
    await db.exec('SET search_path TO public, extensions; RESET role;')
    await db.exec(fs.readFileSync(DISCOVERY_FILE, 'utf8'))

    // Seed as the superuser, which stands in for the service role: the guard
    // locks check only anon and authenticated sessions.
    await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, 'raider@example.test')`, [
      RAIDER_USER_ID,
    ])
    await db.query(`INSERT INTO guilds (id, name) VALUES ($1, 'Test Guild')`, [GUILD_ID])
    await db.query(
      `INSERT INTO expansions (id, guild_id, name) VALUES ($1, $3, 'Forever'), ($2, $3, 'Classic')`,
      [FOREVER_EXPANSION_ID, CLASSIC_EXPANSION_ID, GUILD_ID],
    )
    await db.query(
      `INSERT INTO raid_tiers (id, expansion_id, name, list_mode) VALUES ($1, $2, 'Forever Tier', 'discovery')`,
      [FOREVER_TIER_ID, FOREVER_EXPANSION_ID],
    )
    // No list_mode named: the column default has to apply (D-00b, D-21).
    await db.query(`INSERT INTO raid_tiers (id, expansion_id, name) VALUES ($1, $2, 'Classic Tier')`, [
      CLASSIC_TIER_ID,
      CLASSIC_EXPANSION_ID,
    ])
  }, 180000)

  afterAll(async () => {
    await db?.close()
  })

  it('applies the Discovery file a third time without error', async () => {
    await expect(db.exec(fs.readFileSync(DISCOVERY_FILE, 'utf8'))).resolves.toBeDefined()
  })

  it('gives a raid tier that names no list_mode the value known', async () => {
    const { rows } = await db.query<{ list_mode: string }>(
      `SELECT list_mode FROM raid_tiers WHERE id = $1`,
      [CLASSIC_TIER_ID],
    )
    expect(rows).toEqual([{ list_mode: 'known' }])
  })

  it('gives a loot item that names no kind the kind item and a null need_key', async () => {
    const itemId = '00000000-0000-4000-8000-0000000000a1'
    await db.query(
      `INSERT INTO loot_items (id, raid_tier_id, name, wowhead_id) VALUES ($1, $2, 'Test Item', 1234)`,
      [itemId, CLASSIC_TIER_ID],
    )
    const { rows } = await db.query<{ kind: string; need_key: string | null }>(
      `SELECT kind, need_key FROM loot_items WHERE id = $1`,
      [itemId],
    )
    expect(rows).toEqual([{ kind: 'item', need_key: null }])
  })

  it('stores a need row in a Forever Discovery tier and lets a session read its id, kind and need_key', async () => {
    await db.query(
      `INSERT INTO loot_items (id, raid_tier_id, name, boss_name, kind, need_key, wowhead_id)
       VALUES ($1, $2, 'Trinket, healing', 'Needs', 'need', 'trinket.healing', NULL)`,
      [NEED_ID, FOREVER_TIER_ID],
    )
    try {
      await asRole(db, 'authenticated', RAIDER_USER_ID)
      const { rows } = await db.query<{ id: string; kind: string; need_key: string }>(
        `SELECT id, kind, need_key FROM loot_items WHERE id = $1`,
        [NEED_ID],
      )
      expect(rows).toEqual([{ id: NEED_ID, kind: 'need', need_key: 'trinket.healing' }])
    } finally {
      await resetRole(db)
    }
  })

  it('holds exactly one row for each guard trigger, and the table triggers are WHEN gated', async () => {
    const { rows } = await db.query<{ tgname: string; relname: string; def: string }>(
      `SELECT tg.tgname, c.relname, pg_get_triggerdef(tg.oid) AS def
       FROM pg_trigger tg
       JOIN pg_class c ON c.oid = tg.tgrelid
       WHERE tg.tgname = ANY($1) AND NOT tg.tgisinternal
       ORDER BY tg.tgname`,
      [GUARD_TRIGGERS],
    )
    expect(rows.map(r => r.tgname)).toEqual([...GUARD_TRIGGERS].sort())

    const gated = ['raid_tiers', 'loot_items', 'expansions']
    for (const row of rows.filter(r => gated.includes(r.relname))) {
      expect(row.def, `${row.tgname} must carry a WHEN clause`).toContain(' WHEN (')
    }
    const def = (name: string) => rows.find(r => r.tgname === name)!.def
    expect(def('enforce_raid_tier_expansion_lock')).toMatch(
      /WHEN \(\(?old\.expansion_id IS DISTINCT FROM new\.expansion_id\)?\)/i,
    )
    expect(def('enforce_loot_item_need_delete_lock')).toMatch(/WHEN \(\(?old\.kind = 'need'/i)
  })

  it('lets the superuser insert an expansion named Forever (the lock checks only anon and authenticated)', async () => {
    await db.exec('BEGIN')
    try {
      await expect(
        db.query(`INSERT INTO expansions (guild_id, name) VALUES ($1, 'Forever')`, [GUILD_ID]),
      ).resolves.toBeDefined()
    } finally {
      await db.exec('ROLLBACK')
    }
  })

  it('lets the superuser move a Known tier between expansions (D-26 checks only anon and authenticated)', async () => {
    await db.exec('BEGIN')
    try {
      await db.query(`UPDATE raid_tiers SET expansion_id = $1 WHERE id = $2`, [
        FOREVER_EXPANSION_ID,
        CLASSIC_TIER_ID,
      ])
      const { rows } = await db.query<{ expansion_id: string }>(
        `SELECT expansion_id FROM raid_tiers WHERE id = $1`,
        [CLASSIC_TIER_ID],
      )
      expect(rows).toEqual([{ expansion_id: FOREVER_EXPANSION_ID }])
    } finally {
      await db.exec('ROLLBACK')
    }
  })

  it('lets the superuser delete a need row (D-27 checks only anon and authenticated)', async () => {
    await db.exec('BEGIN')
    try {
      await db.query(`DELETE FROM loot_items WHERE id = $1`, [NEED_ID])
      const { rows } = await db.query(`SELECT 1 FROM loot_items WHERE id = $1`, [NEED_ID])
      expect(rows).toHaveLength(0)
    } finally {
      await db.exec('ROLLBACK')
    }
    const { rows } = await db.query(`SELECT 1 FROM loot_items WHERE id = $1`, [NEED_ID])
    expect(rows).toHaveLength(1)
  })
})
