// @vitest-environment node
import * as fs from 'fs'
import * as path from 'path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import {
  asRole,
  createChainedDb,
  expectRejected,
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
const [RANKED_TIER_ID, AWARD_TIER_ID, PLAIN_TIER_ID] = TIER_IDS

// Five need keys per tier, in picker order, with the costs the catalog gives them.
const NEED_KEYS = [
  { key: 'main-hand-weapon.spell-damage', cost: 3 },
  { key: 'trinket.spell-damage', cost: 3 },
  { key: 'ring.spell-damage', cost: 2 },
  { key: 'chest.cloth.spell-damage', cost: 1 },
  { key: 'head.cloth.spell-damage', cost: 1 },
] as const
const needId = (tierIndex: number, keyIndex: number) => uid(0x20 + tierIndex * 0x10 + keyIndex)

const MSG_TIER_DELETE = 'raid tiers with ranked or awarded needs are deleted only by the server'
const SLOT_RANGE_CHECK = 'loot_submission_items_slot_range_check'
const LOOT_STYLE_CHECK = 'guild_settings_loot_style_check'

let db: PGlite

/** Run one statement as an authenticated browser session of `userId`. */
async function asUser(userId: string, sql: string, params?: unknown[]) {
  await asRole(db, 'authenticated', userId)
  return db.query(sql, params)
}

/** Run `sql` as `userId` in a rolled-back transaction and return the rows changed. */
function changedAs(userId: string, sql: string, params: unknown[] = []) {
  return inRolledBackTransaction(db, async () => (await asUser(userId, sql, params)).affectedRows)
}

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

/** An award of one tier's first need, as the superuser: awarded_item_id stays null (D-15). */
const awardNeed = (tierIndex: number) =>
  db.query(
    `INSERT INTO loot_history (character_id, character_name, loot_item_id, guild_id, raid_tier_id)
     VALUES ($1, 'Test Raider', $2, $3, $4)`,
    [RAIDER_CHARACTER_ID, needId(tierIndex, 0), GUILD_ID, TIER_IDS[tierIndex]],
  )

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

describe('the slot range is 1 to 8 (D-02, DISC-05)', () => {
  it('[D-02] keeps only the range check on loot_submission_items.slot, validated', async () => {
    const rows = await query<{ conname: string; convalidated: boolean }>(
      db,
      `SELECT conname, convalidated FROM pg_constraint
       WHERE conrelid = 'public.loot_submission_items'::regclass AND contype = 'c' AND conname LIKE 'loot_submission_items_slot%'
       ORDER BY conname`,
    )
    expect(rows).toEqual([{ conname: SLOT_RANGE_CHECK, convalidated: true }])
  })

  it('[D-02] stores a row at slot 8 and refuses slot 0 and slot 9, naming the range check', async () => {
    const save = (slot: number) => async () => {
      await asRole(db, 'authenticated', RAIDER_USER_ID)
      return saveItems([{ loot_item_id: needId(0, 0), rank: 50, slot }])
    }

    // Positive control for the same role and RPC: slot 8 is stored.
    await inRolledBackTransaction(db, async () => {
      const result = await save(8)()
      expect(result.rows).toEqual([{ saved: 1 }])
      await resetRole(db)
      const slots = await query<{ slot: number }>(
        db,
        `SELECT slot FROM loot_submission_items WHERE submission_id = $1 AND removed_at IS NULL`,
        [DRAFT_LIST_ID],
      )
      expect(slots).toEqual([{ slot: 8 }])
    })

    const high = await expectRejected(db, save(9), SLOT_RANGE_CHECK)
    expect(high.code).toBe('23514')
    await expectRejected(db, save(0), SLOT_RANGE_CHECK)
  })
})

describe('guild_settings.loot_style (D-18, DISC-10)', () => {
  const STYLE_IDS = ['reward_attendance', 'even_rotation', 'officers_decide']

  beforeAll(async () => {
    // A guild settings row may or may not be created with the guild; the
    // cases below need exactly one.
    const exists = await query(db, `SELECT 1 FROM guild_settings WHERE guild_id = $1`, [GUILD_ID])
    if (exists.length === 0) await db.query(`INSERT INTO guild_settings (guild_id) VALUES ($1)`, [GUILD_ID])
  })

  const setStyle = (value: string | null) =>
    db.query(`UPDATE guild_settings SET loot_style = $2 WHERE guild_id = $1`, [GUILD_ID, value])

  it('[D-18] is a nullable text column with no default, so rows that existed before the column read null', async () => {
    const columns = await query(
      db,
      `SELECT data_type, is_nullable, column_default FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'guild_settings' AND column_name = 'loot_style'`,
    )
    expect(columns).toEqual([{ data_type: 'text', is_nullable: 'YES', column_default: null }])

    const counts = await query<{ total: number; styled: number }>(
      db,
      `SELECT count(*)::int AS total, count(loot_style)::int AS styled FROM guild_settings`,
    )
    expect(counts[0].total).toBeGreaterThan(0)
    expect(counts[0].styled).toBe(0)
  })

  it('[D-18] accepts null and the three preset ids from the superuser', async () => {
    for (const value of [...STYLE_IDS, null]) {
      await inRolledBackTransaction(db, async () => {
        expect((await setStyle(value)).affectedRows).toBe(1)
        const rows = await query(db, `SELECT loot_style FROM guild_settings WHERE guild_id = $1`, [GUILD_ID])
        expect(rows).toEqual([{ loot_style: value }])
      })
    }
  })

  it('[D-18] refuses any other value, naming the loot_style check', async () => {
    const refused = await expectRejected(db, () => setStyle('council'), LOOT_STYLE_CHECK)
    expect(refused.code).toBe('23514')
    await expectRejected(db, () => setStyle(''), LOOT_STYLE_CHECK)
  })
})

describe('the raid tier delete guard (D-25, WR-04)', () => {
  const deleteTier = (tierId: string) => `DELETE FROM raid_tiers WHERE id = '${tierId}'`

  it('[D-25] is BEFORE DELETE FOR EACH ROW with a WHEN clause on Discovery', async () => {
    const rows = await query<{ def: string }>(
      db,
      `SELECT pg_get_triggerdef(tg.oid) AS def FROM pg_trigger tg
       WHERE tg.tgname = 'enforce_raid_tier_need_delete_lock'
         AND tg.tgrelid = 'public.raid_tiers'::regclass AND NOT tg.tgisinternal`,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].def).toContain('BEFORE DELETE')
    expect(rows[0].def).toContain('FOR EACH ROW')
    expect(rows[0].def).toContain("WHEN ((old.list_mode = 'discovery'::text))")
  })

  it('[D-25] is a definer function with a pinned search_path that no browser role can call', async () => {
    const rows = await query<{ prosecdef: boolean; proconfig: string[]; returns: string }>(
      db,
      `SELECT prosecdef, proconfig, prorettype::regtype::text AS returns FROM pg_proc
       WHERE proname = 'enforce_raid_tier_need_delete_lock' AND pronamespace = 'public'::regnamespace`,
    )
    expect(rows).toHaveLength(1)
    expect(rows[0].prosecdef).toBe(true)
    expect(rows[0].proconfig).toEqual(['search_path=public, pg_temp'])
    expect(rows[0].returns).toBe('trigger')

    const grants = await query<{ anon: boolean; authenticated: boolean; public_grant: boolean }>(
      db,
      `SELECT has_function_privilege('anon', p.oid, 'EXECUTE') AS anon,
              has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated,
              EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee = 0) AS public_grant
       FROM pg_proc p
       WHERE p.proname = 'enforce_raid_tier_need_delete_lock' AND p.pronamespace = 'public'::regnamespace`,
    )
    expect(grants).toEqual([{ anon: false, authenticated: false, public_grant: false }])
  })

  it('[D-25] refuses an officer deleting a Discovery tier with a need ranking, and keeps the tier and its ranking', async () => {
    // A plain statement outside any transaction on purpose: expectRejected
    // always rolls back, so a read-back after it would pass with no guard at
    // all. Only a plain statement shows the guard, not a rollback, kept the rows.
    await asRole(db, 'authenticated', OFFICER_USER_ID)
    try {
      await expect(db.query(deleteTier(RANKED_TIER_ID))).rejects.toThrow(MSG_TIER_DELETE)
    } finally {
      await resetRole(db)
    }
    const kept = await query<{ tiers: number; rankings: number }>(
      db,
      `SELECT (SELECT count(*)::int FROM raid_tiers WHERE id = $1) AS tiers,
              (SELECT count(*)::int FROM loot_submission_items WHERE loot_item_id = $2) AS rankings`,
      [RANKED_TIER_ID, needId(0, 0)],
    )
    expect(kept).toEqual([{ tiers: 1, rankings: 1 }])

    // Positive control for the same role, table and policy: a Discovery tier
    // with no ranked or awarded need goes.
    expect(await changedAs(OFFICER_USER_ID, deleteTier(PLAIN_TIER_ID))).toBe(1)
  })

  it('[D-25] counts a removed ranking, because the cascade deletes removed rows too', async () => {
    const seedRemovedRanking = () =>
      db.query(
        `INSERT INTO loot_submission_items (submission_id, loot_item_id, rank, slot, removed_at)
         VALUES ($1, $2, 49, 1, now())`,
        [DRAFT_LIST_ID, needId(2, 0)],
      )
    await expectRejected(
      db,
      async () => {
        await seedRemovedRanking()
        await asRole(db, 'authenticated', OFFICER_USER_ID)
        return db.query(deleteTier(PLAIN_TIER_ID))
      },
      MSG_TIER_DELETE,
    )
    // Same tier without the removed ranking: the delete goes through.
    expect(await changedAs(OFFICER_USER_ID, deleteTier(PLAIN_TIER_ID))).toBe(1)
  })

  it('[D-25] refuses an officer deleting a Discovery tier that has only a need award, and lets it go without one', async () => {
    await expectRejected(
      db,
      async () => {
        await awardNeed(1)
        await asRole(db, 'authenticated', OFFICER_USER_ID)
        return db.query(deleteTier(AWARD_TIER_ID))
      },
      MSG_TIER_DELETE,
    )
    // The tier carries no ranking, so the award above was the only reason.
    expect(
      await query(
        db,
        `SELECT 1 FROM loot_submission_items lsi JOIN loot_items li ON li.id = lsi.loot_item_id WHERE li.raid_tier_id = $1`,
        [AWARD_TIER_ID],
      ),
    ).toEqual([])
    expect(await changedAs(OFFICER_USER_ID, deleteTier(AWARD_TIER_ID))).toBe(1)
  })

  it('[D-25] refuses an officer deleting the expansion that holds a ranked Discovery tier, and lets a Known tier go', async () => {
    await expectRejected(
      db,
      async () => {
        await asRole(db, 'authenticated', OFFICER_USER_ID)
        return db.query(`DELETE FROM expansions WHERE id = $1`, [FOREVER_EXPANSION_ID])
      },
      MSG_TIER_DELETE,
    )
    expect(await changedAs(OFFICER_USER_ID, deleteTier(KNOWN_TIER_ID))).toBe(1)
  })

  it('[D-25] lets the superuser (the service role) delete a ranked Discovery tier', async () => {
    await inRolledBackTransaction(db, async () => {
      await awardNeed(0)
      const result = await db.query(deleteTier(RANKED_TIER_ID))
      expect(result.affectedRows).toBe(1)
    })
  })

  it('[D-25] lets the guild creator delete a guild with ranked and awarded needs', async () => {
    await inRolledBackTransaction(db, async () => {
      await awardNeed(1)
      await asUser(CREATOR_USER_ID, `SELECT public.delete_guild($1)`, [GUILD_ID])
      await resetRole(db)
      expect(await query(db, `SELECT 1 FROM guilds WHERE id = $1`, [GUILD_ID])).toEqual([])
      expect(await query(db, `SELECT 1 FROM raid_tiers WHERE id = ANY ($1::uuid[])`, [[...TIER_IDS]])).toEqual([])
    })
  })
})
