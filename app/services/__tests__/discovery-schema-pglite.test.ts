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

// DISC-12 (roadmap success criteria 1 and 4, PGlite half): the Discovery
// migration applies after every existing migration, applies again on top of
// itself, leaves legacy-style writes on their old defaults, and its guards
// behave for the roles that hold write rights. Every rejection below runs as
// the role PostgREST would use (authenticated, row_security on) beside a
// positive control for the same role and table, so a rejection from RLS can
// never pass for a guard rejection. The superuser stands in for the service
// role. Every mutating case runs inside a rolled-back transaction so the
// shared seed is the same for every describe.

const DISCOVERY_FILE = path.resolve(
  __dirname,
  '../../../supabase/migrations/20261020120000_discovery_schema.sql',
)

// Synthetic ids only: this repo is public.
const GUILD_ID = '00000000-0000-4000-8000-000000000001'
const FOREVER_EXPANSION_ID = '00000000-0000-4000-8000-000000000002'
const CLASSIC_EXPANSION_ID = '00000000-0000-4000-8000-000000000003'
const FOREVER_TIER_ID = '00000000-0000-4000-8000-000000000004' // F1, discovery
const CLASSIC_TIER_ID = '00000000-0000-4000-8000-000000000005' // C1, known
const NEED_ID = '00000000-0000-4000-8000-000000000006' // need 1, trinket.healing in F1
const RAIDER_USER_ID = '00000000-0000-4000-8000-000000000007'
const OFFICER_USER_ID = '00000000-0000-4000-8000-000000000008'
const EX_MEMBER_USER_ID = '00000000-0000-4000-8000-000000000009'
const NON_MEMBER_USER_ID = '00000000-0000-4000-8000-00000000000a'
const CREATOR_USER_ID = '00000000-0000-4000-8000-00000000000b'
const OTHER_GUILD_ID = '00000000-0000-4000-8000-000000000011'
const OTHER_FOREVER_EXPANSION_ID = '00000000-0000-4000-8000-000000000012'
const OTHER_CLASSIC_EXPANSION_ID = '00000000-0000-4000-8000-000000000013'
const OTHER_FOREVER_TIER_ID = '00000000-0000-4000-8000-000000000014'
const FOREVER_TIER_TWO_ID = '00000000-0000-4000-8000-000000000015' // F2, discovery
const FOREVER_TIER_KNOWN_ID = '00000000-0000-4000-8000-000000000016' // F3, known
const OFFICER_CHARACTER_ID = '00000000-0000-4000-8000-000000000021'
const RAIDER_CHARACTER_ID = '00000000-0000-4000-8000-000000000022'
const EX_MEMBER_CHARACTER_ID = '00000000-0000-4000-8000-000000000023'
const NON_MEMBER_CHARACTER_ID = '00000000-0000-4000-8000-000000000024'
const ITEM_CLASSIC_ID = '00000000-0000-4000-8000-0000000000a1'
const ITEM_FOREVER_ID = '00000000-0000-4000-8000-0000000000a2'
const ITEM_FOREVER_SECOND_ID = '00000000-0000-4000-8000-0000000000a3'
const NEED_TWO_ID = '00000000-0000-4000-8000-0000000000a4' // need 2, ring.tank in F1, ranked by nobody
const PIN_ID = '00000000-0000-4000-8000-0000000000b1' // ITEM_FOREVER_ID pinned to NEED_TWO_ID, so NEED_ID has no item behind it
const DRAFT_LIST_ID = '00000000-0000-4000-8000-000000000032' // the raider's draft list (D-22)
const USER_A_ID = '00000000-0000-4000-8000-00000000000c'
const USER_B_ID = '00000000-0000-4000-8000-00000000000d'
const CHARACTER_A_ID = '00000000-0000-4000-8000-000000000025'
const CHARACTER_B_ID = '00000000-0000-4000-8000-000000000026'
const LIST_A_ID = '00000000-0000-4000-8000-000000000033'
const LIST_B_ID = '00000000-0000-4000-8000-000000000034'
const EVENT_ONE_ID = '00000000-0000-4000-8000-000000000041'
const EVENT_TWO_ID = '00000000-0000-4000-8000-000000000042'
const SCRATCH_LIST_ID = '00000000-0000-4000-8000-000000000031' // only ever inside a rolled-back case

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

// Guard messages (plan 03-01 migration).
const MSG_DISCOVERY_ONLY = 'raid_tiers.list_mode discovery is only allowed for Forever raid tiers'
const MSG_CANNOT_LEAVE = 'raid_tiers.list_mode cannot leave discovery while needs on the tier are ranked or awarded'
const MSG_NEED_SERVER_ONLY = 'loot_items need rows are written only by the server'
const MSG_NEED_PLACEMENT = 'loot_items need rows belong only to Forever raid tiers in Discovery mode'
const MSG_FOREVER_NAME = 'expansions named Forever are created and renamed only by the server'
const MSG_TIER_MOVE = 'raid tiers are moved between expansions only by the server'

let db: PGlite

/** Run one statement as an authenticated browser session of `userId`. */
async function asUser(userId: string, sql: string, params?: unknown[]) {
  await asRole(db, 'authenticated', userId)
  return db.query(sql, params)
}

/** Expect `sql` to be rejected for `userId` with `fragment`, rolled back. */
function rejectedAs(userId: string, sql: string, params: unknown[], fragment: string) {
  return expectRejected(db, () => asUser(userId, sql, params), fragment)
}

/** Run `sql` as `userId` in a rolled-back transaction and return the rows changed. */
function changedAs(userId: string, sql: string, params: unknown[] = []) {
  return inRolledBackTransaction(db, async () => (await asUser(userId, sql, params)).affectedRows)
}

async function guildExpansionNames(): Promise<string[]> {
  const rows = await query<{ name: string }>(
    db,
    `SELECT name FROM expansions WHERE guild_id = $1 ORDER BY name`,
    [GUILD_ID],
  )
  return rows.map(r => r.name)
}

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
  for (const [id, email] of [
    [RAIDER_USER_ID, 'raider'],
    [OFFICER_USER_ID, 'officer'],
    [EX_MEMBER_USER_ID, 'ex-member'],
    [NON_MEMBER_USER_ID, 'non-member'],
    [CREATOR_USER_ID, 'creator'],
  ]) {
    await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2)`, [id, `${email}@example.test`])
  }

  // Guild 1's creator is not the officer, so the officer holds only the
  // Officer role (position 50) and the creator is the guild master.
  await db.query(`INSERT INTO guilds (id, name, created_by) VALUES ($1, 'Test Guild', $2)`, [
    GUILD_ID,
    CREATOR_USER_ID,
  ])
  await db.query(`INSERT INTO guilds (id, name) VALUES ($1, 'Other Guild')`, [OTHER_GUILD_ID])

  for (const [id, userId, name] of [
    [OFFICER_CHARACTER_ID, OFFICER_USER_ID, 'Test Officer'],
    [RAIDER_CHARACTER_ID, RAIDER_USER_ID, 'Test Raider'],
    [EX_MEMBER_CHARACTER_ID, EX_MEMBER_USER_ID, 'Test Exmember'],
    [NON_MEMBER_CHARACTER_ID, NON_MEMBER_USER_ID, 'Test Nonmember'],
  ]) {
    await db.query(`INSERT INTO characters (id, user_id, name) VALUES ($1, $2, $3)`, [id, userId, name])
  }
  await db.query(
    `INSERT INTO character_guild_memberships (character_id, guild_id, role, is_active) VALUES
       ($1, $4, 'Officer', true), ($2, $4, 'Member', true), ($3, $4, 'Member', false)`,
    [OFFICER_CHARACTER_ID, RAIDER_CHARACTER_ID, EX_MEMBER_CHARACTER_ID, GUILD_ID],
  )

  await db.query(
    `INSERT INTO expansions (id, guild_id, name) VALUES ($1, $3, 'Forever'), ($2, $3, 'Classic')`,
    [FOREVER_EXPANSION_ID, CLASSIC_EXPANSION_ID, GUILD_ID],
  )
  await db.query(
    `INSERT INTO expansions (id, guild_id, name) VALUES ($1, $3, 'Forever'), ($2, $3, 'Classic')`,
    [OTHER_FOREVER_EXPANSION_ID, OTHER_CLASSIC_EXPANSION_ID, OTHER_GUILD_ID],
  )
  await db.query(
    `INSERT INTO raid_tiers (id, expansion_id, name, list_mode) VALUES
       ($1, $4, 'Forever Tier', 'discovery'),
       ($2, $4, 'Forever Tier Two', 'discovery'),
       ($3, $4, 'Forever Tier Three', 'known'),
       ($5, $6, 'Other Forever Tier', 'discovery')`,
    [
      FOREVER_TIER_ID,
      FOREVER_TIER_TWO_ID,
      FOREVER_TIER_KNOWN_ID,
      FOREVER_EXPANSION_ID,
      OTHER_FOREVER_TIER_ID,
      OTHER_FOREVER_EXPANSION_ID,
    ],
  )
  // No list_mode named: the column default has to apply (D-00b, D-21).
  await db.query(`INSERT INTO raid_tiers (id, expansion_id, name) VALUES ($1, $2, 'Classic Tier')`, [
    CLASSIC_TIER_ID,
    CLASSIC_EXPANSION_ID,
  ])

  // No kind named on the item rows: the column default has to apply.
  await db.query(
    `INSERT INTO loot_items (id, raid_tier_id, name, wowhead_id) VALUES
       ($1, $4, 'Test Item', 1234), ($2, $5, 'Forever Item', 1235), ($3, $5, 'Forever Item Two', 1236)`,
    [ITEM_CLASSIC_ID, ITEM_FOREVER_ID, ITEM_FOREVER_SECOND_ID, CLASSIC_TIER_ID, FOREVER_TIER_ID],
  )
  await db.query(
    `INSERT INTO loot_items (id, raid_tier_id, name, boss_name, kind, need_key, wowhead_id)
     VALUES ($1, $3, 'Trinket, healing', 'Needs', 'need', 'trinket.healing', NULL),
            ($2, $3, 'Ring, tank', 'Needs', 'need', 'ring.tank', NULL)`,
    [NEED_ID, NEED_TWO_ID, FOREVER_TIER_ID],
  )
  await db.query(
    `INSERT INTO loot_item_need_pins (id, guild_id, item_id, need_id, pinned_by) VALUES ($1, $2, $3, $4, $5)`,
    [PIN_ID, GUILD_ID, ITEM_FOREVER_ID, NEED_TWO_ID, OFFICER_USER_ID],
  )
}, 180000)

afterAll(async () => {
  await db?.close()
})

describe('applies on the full chain', () => {
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
    const { rows } = await db.query<{ kind: string; need_key: string | null }>(
      `SELECT kind, need_key FROM loot_items WHERE id = $1`,
      [ITEM_CLASSIC_ID],
    )
    expect(rows).toEqual([{ kind: 'item', need_key: null }])
  })

  it('stores a need row in a Forever Discovery tier and lets a session read its id, kind and need_key', async () => {
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
    await inRolledBackTransaction(db, async () => {
      await expect(
        db.query(`INSERT INTO expansions (guild_id, name) VALUES ($1, 'Forever')`, [GUILD_ID]),
      ).resolves.toBeDefined()
    })
  })

  it('lets the superuser move a Known tier between expansions (D-26 checks only anon and authenticated)', async () => {
    await inRolledBackTransaction(db, async () => {
      await db.query(`UPDATE raid_tiers SET expansion_id = $1 WHERE id = $2`, [
        FOREVER_EXPANSION_ID,
        CLASSIC_TIER_ID,
      ])
      const { rows } = await db.query<{ expansion_id: string }>(
        `SELECT expansion_id FROM raid_tiers WHERE id = $1`,
        [CLASSIC_TIER_ID],
      )
      expect(rows).toEqual([{ expansion_id: FOREVER_EXPANSION_ID }])
    })
  })

  it('lets the superuser delete a need row (D-27 checks only anon and authenticated)', async () => {
    await inRolledBackTransaction(db, async () => {
      await db.query(`DELETE FROM loot_items WHERE id = $1`, [NEED_ID])
      const { rows } = await db.query(`SELECT 1 FROM loot_items WHERE id = $1`, [NEED_ID])
      expect(rows).toHaveLength(0)
    })
    const { rows } = await db.query(`SELECT 1 FROM loot_items WHERE id = $1`, [NEED_ID])
    expect(rows).toHaveLength(1)
  })
})

describe('guards stop direct writes', () => {
  async function tierMode(id: string): Promise<string> {
    const rows = await query<{ list_mode: string }>(db, `SELECT list_mode FROM raid_tiers WHERE id = $1`, [id])
    return rows[0].list_mode
  }

  /** A draft list for the raider's character with one ranking of `lootItemId`. */
  async function rankOnScratchList(lootItemId: string, removed: boolean) {
    await db.query(
      `INSERT INTO loot_submissions (id, user_id, guild_id, raid_tier_id, character_id, status)
       VALUES ($1, $2, $3, $4, $5, 'draft')`,
      [SCRATCH_LIST_ID, RAIDER_USER_ID, GUILD_ID, FOREVER_TIER_ID, RAIDER_CHARACTER_ID],
    )
    await db.query(
      `INSERT INTO loot_submission_items (submission_id, loot_item_id, rank, slot, removed_at)
       VALUES ($1, $2, 1, 1, ${removed ? 'now()' : 'NULL'})`,
      [SCRATCH_LIST_ID, lootItemId],
    )
  }

  async function awardOnF1(lootItemId: string) {
    await db.query(
      `INSERT INTO loot_history (character_id, character_name, loot_item_id, guild_id, raid_tier_id)
       VALUES ($1, 'Test Raider', $2, $3, $4)`,
      [RAIDER_CHARACTER_ID, lootItemId, GUILD_ID, FOREVER_TIER_ID],
    )
  }

  it('[D-17] rejects an officer switching a Classic tier to Discovery, by update or insert, while Known writes pass', async () => {
    await rejectedAs(
      OFFICER_USER_ID,
      `UPDATE raid_tiers SET list_mode = 'discovery' WHERE id = $1`,
      [CLASSIC_TIER_ID],
      MSG_DISCOVERY_ONLY,
    )
    expect(await tierMode(CLASSIC_TIER_ID)).toBe('known')

    await rejectedAs(
      OFFICER_USER_ID,
      `INSERT INTO raid_tiers (expansion_id, name, list_mode) VALUES ($1, 'Sneaky Tier', 'discovery')`,
      [CLASSIC_EXPANSION_ID],
      MSG_DISCOVERY_ONLY,
    )

    // Positive controls for the same role, table and rows: the officer's
    // policies let these through, so the rejections above came from the guard.
    expect(
      await changedAs(OFFICER_USER_ID, `UPDATE raid_tiers SET list_mode = 'discovery' WHERE id = $1`, [
        FOREVER_TIER_KNOWN_ID,
      ]),
    ).toBe(1)
    expect(
      await changedAs(OFFICER_USER_ID, `UPDATE raid_tiers SET is_guild_active = false WHERE id = $1`, [
        CLASSIC_TIER_ID,
      ]),
    ).toBe(1)
    expect(
      await changedAs(
        OFFICER_USER_ID,
        `INSERT INTO raid_tiers (expansion_id, name) VALUES ($1, 'Plain Classic Tier')`,
        [CLASSIC_EXPANSION_ID],
      ),
    ).toBe(1)
  })

  it('[D-17] gives the superuser the same answer: a Classic tier cannot be switched to Discovery', async () => {
    await expectRejected(
      db,
      () => db.query(`UPDATE raid_tiers SET list_mode = 'discovery' WHERE id = $1`, [CLASSIC_TIER_ID]),
      MSG_DISCOVERY_ONLY,
    )
    expect(await tierMode(CLASSIC_TIER_ID)).toBe('known')
  })

  it('[D-03] rejects leaving Discovery while a need is ranked (removed or not) or awarded, for the officer and the superuser, and allows it with no references', async () => {
    const leave = `UPDATE raid_tiers SET list_mode = 'known' WHERE id = $1`

    await expectRejected(
      db,
      async () => {
        await rankOnScratchList(NEED_ID, false)
        await asUser(OFFICER_USER_ID, leave, [FOREVER_TIER_ID])
      },
      MSG_CANNOT_LEAVE,
    )
    await expectRejected(
      db,
      async () => {
        await rankOnScratchList(NEED_ID, true)
        await asUser(OFFICER_USER_ID, leave, [FOREVER_TIER_ID])
      },
      MSG_CANNOT_LEAVE,
    )
    await expectRejected(
      db,
      async () => {
        await awardOnF1(NEED_ID)
        await asUser(OFFICER_USER_ID, leave, [FOREVER_TIER_ID])
      },
      MSG_CANNOT_LEAVE,
    )
    await expectRejected(
      db,
      async () => {
        await rankOnScratchList(NEED_ID, false)
        await db.query(leave, [FOREVER_TIER_ID])
      },
      MSG_CANNOT_LEAVE,
    )
    await expectRejected(
      db,
      async () => {
        await awardOnF1(NEED_ID)
        await db.query(leave, [FOREVER_TIER_ID])
      },
      MSG_CANNOT_LEAVE,
    )
    expect(await tierMode(FOREVER_TIER_ID)).toBe('discovery')

    // F2 has no references: the same officer update goes through and reads back.
    await inRolledBackTransaction(db, async () => {
      const result = await asUser(OFFICER_USER_ID, leave, [FOREVER_TIER_TWO_ID])
      expect(result.affectedRows).toBe(1)
      await resetRole(db)
      expect(await tierMode(FOREVER_TIER_TWO_ID)).toBe('known')
    })
  })

  it('[D-12] rejects an officer writing a need row, by insert, update or conversion, while item writes pass', async () => {
    const insertNeed = `INSERT INTO loot_items (raid_tier_id, name, boss_name, kind, need_key, wowhead_id)
                        VALUES ($1, 'Weapon, new', 'Needs', 'need', 'weapon.new', NULL)`
    await rejectedAs(OFFICER_USER_ID, insertNeed, [FOREVER_TIER_ID], MSG_NEED_SERVER_ONLY)
    await rejectedAs(OFFICER_USER_ID, insertNeed, [CLASSIC_TIER_ID], MSG_NEED_SERVER_ONLY)
    await rejectedAs(
      OFFICER_USER_ID,
      `UPDATE loot_items SET allocation_cost = 7 WHERE id = $1`,
      [NEED_ID],
      MSG_NEED_SERVER_ONLY,
    )
    await rejectedAs(
      OFFICER_USER_ID,
      `UPDATE loot_items SET kind = 'item', need_key = NULL WHERE id = $1`,
      [NEED_ID],
      MSG_NEED_SERVER_ONLY,
    )
    const stillNeed = await query<{ kind: string; allocation_cost: number }>(
      db,
      `SELECT kind, allocation_cost FROM loot_items WHERE id = $1`,
      [NEED_ID],
    )
    expect(stillNeed).toEqual([{ kind: 'need', allocation_cost: 0 }])

    // Known positive controls: the officer's item writes in the same table.
    expect(
      await changedAs(
        OFFICER_USER_ID,
        `INSERT INTO loot_items (raid_tier_id, name, wowhead_id) VALUES ($1, 'Officer Item', 4321)`,
        [CLASSIC_TIER_ID],
      ),
    ).toBe(1)
    expect(
      await changedAs(OFFICER_USER_ID, `UPDATE loot_items SET classification = 'Limited' WHERE id = $1`, [
        ITEM_CLASSIC_ID,
      ]),
    ).toBe(1)
  })

  it('[D-17] keeps need rows in Forever Discovery tiers for the superuser too', async () => {
    const insertNeed = `INSERT INTO loot_items (raid_tier_id, name, boss_name, kind, need_key, wowhead_id)
                        VALUES ($1, 'Weapon, new', 'Needs', 'need', 'weapon.new', NULL)`
    await expectRejected(db, () => db.query(insertNeed, [CLASSIC_TIER_ID]), MSG_NEED_PLACEMENT)
    await expectRejected(db, () => db.query(insertNeed, [FOREVER_TIER_KNOWN_ID]), MSG_NEED_PLACEMENT)
    await inRolledBackTransaction(db, async () => {
      const result = await db.query(insertNeed, [FOREVER_TIER_TWO_ID])
      expect(result.affectedRows).toBe(1)
    })
  })

  it('[D-24] rejects an officer claiming, giving up or creating the Forever name, while other expansion writes pass', async () => {
    const before = await guildExpansionNames()
    expect(before).toEqual(['Classic', 'Forever'])

    await rejectedAs(
      OFFICER_USER_ID,
      `INSERT INTO expansions (guild_id, name) VALUES ($1, 'Forever')`,
      [GUILD_ID],
      MSG_FOREVER_NAME,
    )
    await rejectedAs(
      OFFICER_USER_ID,
      `UPDATE expansions SET name = 'Forever' WHERE id = $1`,
      [CLASSIC_EXPANSION_ID],
      MSG_FOREVER_NAME,
    )
    await rejectedAs(
      OFFICER_USER_ID,
      `UPDATE expansions SET name = 'Forever Classic' WHERE id = $1`,
      [FOREVER_EXPANSION_ID],
      MSG_FOREVER_NAME,
    )
    await rejectedAs(
      OFFICER_USER_ID,
      `SELECT public.create_expansion_for_guild($1, 'Forever')`,
      [GUILD_ID],
      MSG_FOREVER_NAME,
    )
    expect(await guildExpansionNames()).toEqual(before)

    // Positive controls for the same role, table and policies.
    await inRolledBackTransaction(db, async () => {
      const result = await asUser(
        OFFICER_USER_ID,
        `UPDATE expansions SET name = 'Classic Renamed' WHERE id = $1`,
        [CLASSIC_EXPANSION_ID],
      )
      expect(result.affectedRows).toBe(1)
      await resetRole(db)
      expect(await guildExpansionNames()).toEqual(['Classic Renamed', 'Forever'])
    })
    expect(
      await changedAs(OFFICER_USER_ID, `INSERT INTO expansions (guild_id, name) VALUES ($1, 'Test Expansion')`, [
        GUILD_ID,
      ]),
    ).toBe(1)
    await inRolledBackTransaction(db, async () => {
      const result = await asUser(
        OFFICER_USER_ID,
        `SELECT public.create_expansion_for_guild($1, 'Test Expansion') AS id`,
        [GUILD_ID],
      )
      expect((result.rows[0] as { id: string }).id).toMatch(/^[0-9a-f-]{36}$/)
    })
  })

  it('[D-24] does not hold the superuser: it can insert Forever and rename Classic to Forever', async () => {
    await inRolledBackTransaction(db, async () => {
      const inserted = await db.query(`INSERT INTO expansions (guild_id, name) VALUES ($1, 'Forever')`, [
        GUILD_ID,
      ])
      expect(inserted.affectedRows).toBe(1)
    })
    await inRolledBackTransaction(db, async () => {
      const renamed = await db.query(`UPDATE expansions SET name = 'Forever' WHERE id = $1`, [
        CLASSIC_EXPANSION_ID,
      ])
      expect(renamed.affectedRows).toBe(1)
    })
  })

  it('[D-26] rejects an officer moving a Known tier into Forever, and the follow-up switch, while other tier writes pass', async () => {
    await rejectedAs(
      OFFICER_USER_ID,
      `UPDATE raid_tiers SET expansion_id = $1 WHERE id = $2`,
      [FOREVER_EXPANSION_ID, CLASSIC_TIER_ID],
      MSG_TIER_MOVE,
    )
    const moved = await query<{ expansion_id: string }>(
      db,
      `SELECT expansion_id FROM raid_tiers WHERE id = $1`,
      [CLASSIC_TIER_ID],
    )
    expect(moved).toEqual([{ expansion_id: CLASSIC_EXPANSION_ID }])

    // The second step of the route around D-17 is rejected on its own, because
    // a failed statement aborts its transaction.
    await rejectedAs(
      OFFICER_USER_ID,
      `UPDATE raid_tiers SET list_mode = 'discovery' WHERE id = $1`,
      [CLASSIC_TIER_ID],
      MSG_DISCOVERY_ONLY,
    )
    expect(await tierMode(CLASSIC_TIER_ID)).toBe('known')

    // Positive controls for the same role, table and row.
    expect(
      await changedAs(OFFICER_USER_ID, `UPDATE raid_tiers SET is_guild_active = false WHERE id = $1`, [
        CLASSIC_TIER_ID,
      ]),
    ).toBe(1)
    expect(
      await changedAs(OFFICER_USER_ID, `UPDATE raid_tiers SET expansion_id = $1 WHERE id = $2`, [
        CLASSIC_EXPANSION_ID,
        CLASSIC_TIER_ID,
      ]),
    ).toBe(1)
  })

  it('[D-26] does not hold the superuser: it can move a tier into Forever', async () => {
    await inRolledBackTransaction(db, async () => {
      const result = await db.query(`UPDATE raid_tiers SET expansion_id = $1 WHERE id = $2`, [
        FOREVER_EXPANSION_ID,
        CLASSIC_TIER_ID,
      ])
      expect(result.affectedRows).toBe(1)
    })
  })

  it('WHEN-gates every guard trigger on raid_tiers, loot_items and expansions on the column or value it guards', async () => {
    const { rows } = await db.query<{ tgname: string; def: string }>(
      `SELECT tg.tgname, pg_get_triggerdef(tg.oid) AS def
       FROM pg_trigger tg
       JOIN pg_class c ON c.oid = tg.tgrelid
       WHERE c.relname IN ('raid_tiers', 'loot_items', 'expansions')
         AND tg.tgname = ANY($1) AND NOT tg.tgisinternal`,
      [GUARD_TRIGGERS],
    )
    expect(rows).toHaveLength(8)
    for (const row of rows) {
      expect(row.def, `${row.tgname} WHEN clause`).toMatch(/ WHEN \([\s\S]*(list_mode|kind|name|expansion_id)/i)
    }
  })
})

describe('constraints', () => {
  // Every need row goes into a Forever Discovery tier, so the loot_items guard
  // passes and the constraint under test is what rejects.
  const insertRow = `INSERT INTO loot_items (raid_tier_id, name, kind, need_key, wowhead_id)
                     VALUES ($1, 'Constraint probe', $2, $3, $4)`

  it('rejects a need row that carries a wowhead_id with loot_items_need_shape_check', async () => {
    await expectRejected(
      db,
      () => db.query(insertRow, [FOREVER_TIER_ID, 'need', 'probe.wowhead', 9001]),
      'loot_items_need_shape_check',
    )
  })

  it('rejects a need row with no need_key with loot_items_need_shape_check', async () => {
    await expectRejected(
      db,
      () => db.query(insertRow, [FOREVER_TIER_ID, 'need', null, null]),
      'loot_items_need_shape_check',
    )
  })

  it('rejects an item row that carries a need_key with loot_items_need_shape_check', async () => {
    await expectRejected(
      db,
      () => db.query(insertRow, [FOREVER_TIER_ID, 'item', 'probe.item', 9002]),
      'loot_items_need_shape_check',
    )
  })

  it('rejects a kind other than item or need with loot_items_kind_check', async () => {
    await expectRejected(
      db,
      () => db.query(insertRow, [FOREVER_TIER_ID, 'other', null, 9003]),
      'loot_items_kind_check',
    )
  })

  it('rejects a list_mode other than known or discovery with raid_tiers_list_mode_check', async () => {
    await expectRejected(
      db,
      () =>
        db.query(`INSERT INTO raid_tiers (expansion_id, name, list_mode) VALUES ($1, 'Odd Tier', 'other')`, [
          FOREVER_EXPANSION_ID,
        ]),
      'raid_tiers_list_mode_check',
    )
  })

  it('rejects a second need row with the same need_key in one raid tier with idx_loot_items_tier_need_key', async () => {
    await expectRejected(
      db,
      () => db.query(insertRow, [FOREVER_TIER_ID, 'need', 'trinket.healing', null]),
      'idx_loot_items_tier_need_key',
    )
  })

  it('[DISC-06 adjacency] accepts the same need_key in two different Forever Discovery tiers, so each Forever raid holds its own need rows', async () => {
    await inRolledBackTransaction(db, async () => {
      const result = await db.query(insertRow, [FOREVER_TIER_TWO_ID, 'need', 'trinket.healing', null])
      expect(result.affectedRows).toBe(1)
      const { rows } = await db.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM loot_items WHERE need_key = 'trinket.healing' AND kind = 'need'`,
      )
      expect(rows).toEqual([{ n: 2 }])
    })
  })
})

describe('pin integrity trigger', () => {
  const insertPin = `INSERT INTO loot_item_need_pins (guild_id, item_id, need_id) VALUES ($1, $2, $3)`
  const CHECK_VIOLATION = '23514'

  it('stores a pin whose item is an item row and whose need is a need row of the same guild and tier', async () => {
    await inRolledBackTransaction(db, async () => {
      const result = await db.query(insertPin, [GUILD_ID, ITEM_FOREVER_SECOND_ID, NEED_TWO_ID])
      expect(result.affectedRows).toBe(1)
    })
  })

  it('rejects a pin whose item is a need row, for the superuser too', async () => {
    const error = await expectRejected(
      db,
      () => db.query(insertPin, [GUILD_ID, NEED_TWO_ID, NEED_ID]),
      'loot_item_need_pins.item_id is not an item row',
    )
    expect(error.code).toBe(CHECK_VIOLATION)
  })

  it('rejects a pin whose need is an item row', async () => {
    const error = await expectRejected(
      db,
      () => db.query(insertPin, [GUILD_ID, ITEM_FOREVER_SECOND_ID, ITEM_CLASSIC_ID]),
      'loot_item_need_pins.need_id is not a need row',
    )
    expect(error.code).toBe(CHECK_VIOLATION)
  })

  it('rejects a pin whose need belongs to another guild', async () => {
    const error = await expectRejected(
      db,
      async () => {
        await db.query(
          `INSERT INTO loot_items (id, raid_tier_id, name, kind, need_key, wowhead_id)
           VALUES ('00000000-0000-4000-8000-0000000000c1', $1, 'Other guild need', 'need', 'trinket.healing', NULL)`,
          [OTHER_FOREVER_TIER_ID],
        )
        await db.query(insertPin, [GUILD_ID, ITEM_FOREVER_SECOND_ID, '00000000-0000-4000-8000-0000000000c1'])
      },
      'loot_item_need_pins.need_id is not a need of this guild',
    )
    expect(error.code).toBe(CHECK_VIOLATION)
  })

  it('rejects a pin whose item and need sit in different raid tiers', async () => {
    const error = await expectRejected(
      db,
      async () => {
        await db.query(
          `INSERT INTO loot_items (id, raid_tier_id, name, kind, need_key, wowhead_id)
           VALUES ('00000000-0000-4000-8000-0000000000c2', $1, 'Tier two need', 'need', 'trinket.healing', NULL)`,
          [FOREVER_TIER_TWO_ID],
        )
        await db.query(insertPin, [GUILD_ID, ITEM_FOREVER_SECOND_ID, '00000000-0000-4000-8000-0000000000c2'])
      },
      'loot_item_need_pins.item_id and need_id are not in the same raid tier',
    )
    expect(error.code).toBe(CHECK_VIOLATION)
  })

  it('gives an officer the check detail and a non-officer the row-level-security error for the same bad pin', async () => {
    await rejectedAs(
      OFFICER_USER_ID,
      insertPin,
      [GUILD_ID, NEED_TWO_ID, NEED_ID],
      'loot_item_need_pins.item_id is not an item row',
    )
    const hidden = await rejectedAs(
      RAIDER_USER_ID,
      insertPin,
      [GUILD_ID, NEED_TWO_ID, NEED_ID],
      'new row violates row-level security policy for table "loot_item_need_pins"',
    )
    expect(hidden.message).not.toContain('is not an item row')

    // A raider inserting a pin that crosses guilds learns nothing either.
    const crossGuild = await expectRejected(
      db,
      async () => {
        await db.query(
          `INSERT INTO loot_items (id, raid_tier_id, name, kind, need_key, wowhead_id)
           VALUES ('00000000-0000-4000-8000-0000000000c1', $1, 'Other guild need', 'need', 'trinket.healing', NULL)`,
          [OTHER_FOREVER_TIER_ID],
        )
        await asUser(RAIDER_USER_ID, insertPin, [
          GUILD_ID,
          ITEM_FOREVER_SECOND_ID,
          '00000000-0000-4000-8000-0000000000c1',
        ])
      },
      'row-level security',
    )
    expect(crossGuild.message).not.toContain('is not a need of this guild')
  })
})

describe('RLS matrix on loot_item_need_pins', () => {
  const insertPin = `INSERT INTO loot_item_need_pins (guild_id, item_id, need_id) VALUES ($1, $2, $3)`
  const NEW_PIN = [GUILD_ID, ITEM_FOREVER_SECOND_ID, NEED_TWO_ID]
  const RLS = 'new row violates row-level security policy for table "loot_item_need_pins"'

  const roles = [
    { role: 'officer', userId: OFFICER_USER_ID, sees: 1, canInsert: true, canDelete: true },
    { role: 'raider', userId: RAIDER_USER_ID, sees: 1, canInsert: false, canDelete: false },
    { role: 'ex-member', userId: EX_MEMBER_USER_ID, sees: 0, canInsert: false, canDelete: false },
    { role: 'non-member', userId: NON_MEMBER_USER_ID, sees: 0, canInsert: false, canDelete: false },
  ]

  for (const { role, userId, sees, canInsert, canDelete } of roles) {
    it(`gives the ${role} ${sees} of the guild's pins, ${canInsert ? 'lets it insert' : 'refuses its insert'}, never lets it update, and ${canDelete ? 'lets it delete' : 'deletes nothing'}`, async () => {
      // select
      await inRolledBackTransaction(db, async () => {
        const result = await asUser(userId, `SELECT id FROM loot_item_need_pins WHERE guild_id = $1`, [GUILD_ID])
        expect(result.rows).toHaveLength(sees)
      })

      // insert
      if (canInsert) {
        expect(await changedAs(userId, insertPin, NEW_PIN)).toBe(1)
      } else {
        await rejectedAs(userId, insertPin, NEW_PIN, RLS)
      }

      // update: no UPDATE privilege and no UPDATE policy, so unpin is a delete
      await rejectedAs(
        userId,
        `UPDATE loot_item_need_pins SET pinned_by = NULL WHERE id = $1`,
        [PIN_ID],
        'permission denied for table loot_item_need_pins',
      )

      // delete
      expect(await changedAs(userId, `DELETE FROM loot_item_need_pins WHERE id = $1`, [PIN_ID])).toBe(
        canDelete ? 1 : 0,
      )
      const pins = await query(db, `SELECT 1 FROM loot_item_need_pins WHERE id = $1`, [PIN_ID])
      expect(pins).toHaveLength(1)
    })
  }

  it('lets the officer delete the pin and read the table empty afterwards (the delete is the unpin)', async () => {
    await inRolledBackTransaction(db, async () => {
      await asUser(OFFICER_USER_ID, `DELETE FROM loot_item_need_pins WHERE id = $1`, [PIN_ID])
      const result = await db.query(`SELECT id FROM loot_item_need_pins WHERE guild_id = $1`, [GUILD_ID])
      expect(result.rows).toHaveLength(0)
    })
  })
})

describe('column grants', () => {
  it('lets anon and authenticated select loot_items.kind and need_key', async () => {
    for (const [role, userId] of [
      ['anon', null],
      ['authenticated', RAIDER_USER_ID],
    ] as const) {
      await inRolledBackTransaction(db, async () => {
        await asRole(db, role, userId)
        const { rows } = await db.query(`SELECT kind, need_key FROM loot_items WHERE id = $1`, [NEED_ID])
        expect(rows, role).toEqual([{ kind: 'need', need_key: 'trinket.healing' }])
      })
    }
  })

  it('still refuses officer_notes and select star to a browser session', async () => {
    for (const [role, userId] of [
      ['anon', null],
      ['authenticated', OFFICER_USER_ID],
    ] as const) {
      await expectRejected(
        db,
        async () => {
          await asRole(db, role, userId)
          await db.query(`SELECT officer_notes FROM loot_items`)
        },
        'permission denied',
      )
      await expectRejected(
        db,
        async () => {
          await asRole(db, role, userId)
          await db.query(`SELECT * FROM loot_items`)
        },
        'permission denied',
      )
    }
  })

  it('lets authenticated select raid_tiers.list_mode and loot_history.awarded_item_id', async () => {
    await inRolledBackTransaction(db, async () => {
      await asRole(db, 'authenticated', RAIDER_USER_ID)
      await expect(db.query(`SELECT list_mode FROM raid_tiers`)).resolves.toBeDefined()
      await expect(db.query(`SELECT awarded_item_id FROM loot_history`)).resolves.toBeDefined()
    })
  })

  it('gives anon no privilege on loot_item_need_pins and authenticated SELECT, INSERT and DELETE but not UPDATE', async () => {
    const [grants] = await query<Record<string, boolean>>(
      db,
      `SELECT
         has_table_privilege('anon', 'public.loot_item_need_pins', 'SELECT, INSERT, UPDATE, DELETE') AS anon_any,
         has_table_privilege('authenticated', 'public.loot_item_need_pins', 'SELECT') AS auth_select,
         has_table_privilege('authenticated', 'public.loot_item_need_pins', 'INSERT') AS auth_insert,
         has_table_privilege('authenticated', 'public.loot_item_need_pins', 'DELETE') AS auth_delete,
         has_table_privilege('authenticated', 'public.loot_item_need_pins', 'UPDATE') AS auth_update`,
    )
    expect(grants).toEqual({
      anon_any: false,
      auth_select: true,
      auth_insert: true,
      auth_delete: true,
      auth_update: false,
    })
    await expectRejected(
      db,
      async () => {
        await asRole(db, 'anon', null)
        await db.query(`SELECT id FROM loot_item_need_pins`)
      },
      'permission denied for table loot_item_need_pins',
    )
  })

  it('[D-15] keeps loot_history.awarded_item_id a nullable uuid with no foreign key on it', async () => {
    const columns = await query<{ data_type: string; is_nullable: string }>(
      db,
      `SELECT data_type, is_nullable FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'loot_history' AND column_name = 'awarded_item_id'`,
    )
    expect(columns).toEqual([{ data_type: 'uuid', is_nullable: 'YES' }])

    const foreignKeys = await query(
      db,
      `SELECT c.conname FROM pg_constraint c
       JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
       WHERE c.contype = 'f' AND c.conrelid = 'public.loot_history'::regclass
         AND a.attname = 'awarded_item_id'`,
    )
    expect(foreignKeys).toEqual([])
  })
})

describe('D-22 need-ranking hold', () => {
  const MSG_HOLD = 'Need rows cannot be ranked yet'
  const seededRows = [
    { loot_item_id: ITEM_FOREVER_ID, rank: 1, slot: 1 },
    { loot_item_id: ITEM_FOREVER_SECOND_ID, rank: 2, slot: 2 },
  ]

  beforeAll(async () => {
    // A draft list stays writable for its owner (20260930000000), which is why
    // the fixture is a draft: the hold is the only thing that can refuse.
    await db.query(
      `INSERT INTO loot_submissions (id, user_id, guild_id, raid_tier_id, character_id, status)
       VALUES ($1, $2, $3, $4, $5, 'draft')`,
      [DRAFT_LIST_ID, RAIDER_USER_ID, GUILD_ID, FOREVER_TIER_ID, RAIDER_CHARACTER_ID],
    )
    await db.query(
      `INSERT INTO loot_submission_items (submission_id, loot_item_id, rank, slot)
       VALUES ($1, $2, 1, 1), ($1, $3, 2, 2)`,
      [DRAFT_LIST_ID, ITEM_FOREVER_ID, ITEM_FOREVER_SECOND_ID],
    )
  })

  const liveRows = () =>
    query(
      db,
      `SELECT loot_item_id, rank, slot FROM loot_submission_items
       WHERE submission_id = $1 AND removed_at IS NULL ORDER BY rank`,
      [DRAFT_LIST_ID],
    )

  it('[D-22] rejects a raider saving a list whose items include a need row, and leaves the live rows as they were', async () => {
    const items = JSON.stringify([
      { loot_item_id: ITEM_CLASSIC_ID, rank: 1, slot: 1 },
      { loot_item_id: NEED_ID, rank: 2, slot: 2 },
    ])
    // A plain statement on purpose: a rolled-back transaction would hide a
    // hold that fired after the RPC had already replaced the list.
    await asRole(db, 'authenticated', RAIDER_USER_ID)
    try {
      await expect(
        db.query(`SELECT public.save_submission_items($1, $2::jsonb)`, [DRAFT_LIST_ID, items]),
      ).rejects.toThrow(MSG_HOLD)
    } finally {
      await resetRole(db)
    }
    expect(await liveRows()).toEqual(seededRows)
  })

  it('[D-22] rejects a raider inserting a loot_submission_items row for a need, and still lets the raider rank an item the same way', async () => {
    await rejectedAs(
      RAIDER_USER_ID,
      `INSERT INTO loot_submission_items (submission_id, loot_item_id, rank, slot) VALUES ($1, $2, 3, 1)`,
      [DRAFT_LIST_ID, NEED_ID],
      MSG_HOLD,
    )
    expect(await liveRows()).toEqual(seededRows)

    expect(
      await changedAs(
        RAIDER_USER_ID,
        `INSERT INTO loot_submission_items (submission_id, loot_item_id, rank, slot) VALUES ($1, $2, 3, 1)`,
        [DRAFT_LIST_ID, ITEM_CLASSIC_ID],
      ),
    ).toBe(1)
  })

  it('saves item rows through save_submission_items as before (positive control for the same role and RPC)', async () => {
    await inRolledBackTransaction(db, async () => {
      const items = JSON.stringify([
        { loot_item_id: ITEM_CLASSIC_ID, rank: 1, slot: 1 },
        { loot_item_id: ITEM_FOREVER_ID, rank: 2, slot: 2 },
      ])
      const result = await asUser(RAIDER_USER_ID, `SELECT public.save_submission_items($1, $2::jsonb) AS saved`, [
        DRAFT_LIST_ID,
        items,
      ])
      expect(result.rows).toEqual([{ saved: 2 }])
      await resetRole(db)
      expect(await liveRows()).toEqual([
        { loot_item_id: ITEM_CLASSIC_ID, rank: 1, slot: 1 },
        { loot_item_id: ITEM_FOREVER_ID, rank: 2, slot: 2 },
      ])
    })
  })

  it('[D-22] lets the superuser rank a need, which is how every fixture in this phase gets past the hold', async () => {
    await inRolledBackTransaction(db, async () => {
      const result = await db.query(
        `INSERT INTO loot_submission_items (submission_id, loot_item_id, rank, slot) VALUES ($1, $2, 3, 1)`,
        [DRAFT_LIST_ID, NEED_ID],
      )
      expect(result.affectedRows).toBe(1)
    })
  })
})

describe('BLP accrues on a need row (DISC-07)', () => {
  beforeAll(async () => {
    // Fixtures go in as the superuser, never by disabling a trigger: the hold
    // checks only anon and authenticated sessions (D-22).
    for (const [id, tag] of [
      [USER_A_ID, 'a'],
      [USER_B_ID, 'b'],
    ]) {
      await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2)`, [id, `blp-${tag}@example.test`])
    }
    await db.query(
      `INSERT INTO characters (id, user_id, name) VALUES ($1, $3, 'Test Raider A'), ($2, $4, 'Test Raider B')`,
      [CHARACTER_A_ID, CHARACTER_B_ID, USER_A_ID, USER_B_ID],
    )
    await db.query(
      `INSERT INTO character_guild_memberships (character_id, guild_id, role, is_active)
       VALUES ($1, $3, 'Member', true), ($2, $3, 'Member', true)`,
      [CHARACTER_A_ID, CHARACTER_B_ID, GUILD_ID],
    )
    const updated = await db.query(`UPDATE guild_settings SET blp_enabled = true WHERE guild_id = $1`, [GUILD_ID])
    if (!updated.affectedRows) {
      await db.query(`INSERT INTO guild_settings (guild_id, blp_enabled) VALUES ($1, true)`, [GUILD_ID])
    }
    await db.query(
      `INSERT INTO raid_events (id, guild_id, raid_tier_id, raid_date)
       VALUES ($1, $3, $4, '2026-10-06'), ($2, $3, $4, '2026-10-13')`,
      [EVENT_ONE_ID, EVENT_TWO_ID, GUILD_ID, FOREVER_TIER_ID],
    )
    // Both raiders attended both nights.
    for (const characterId of [CHARACTER_A_ID, CHARACTER_B_ID]) {
      for (const eventId of [EVENT_ONE_ID, EVENT_TWO_ID]) {
        await db.query(
          `INSERT INTO attendance_records (raid_event_id, character_id, attended) VALUES ($1, $2, true)`,
          [eventId, characterId],
        )
      }
    }
    // Both raiders have an approved list ranking need 1.
    for (const [listId, userId, characterId] of [
      [LIST_A_ID, USER_A_ID, CHARACTER_A_ID],
      [LIST_B_ID, USER_B_ID, CHARACTER_B_ID],
    ]) {
      await db.query(
        `INSERT INTO loot_submissions (id, user_id, guild_id, raid_tier_id, character_id, status)
         VALUES ($1, $2, $3, $4, $5, 'approved')`,
        [listId, userId, GUILD_ID, FOREVER_TIER_ID, characterId],
      )
      await db.query(
        `INSERT INTO loot_submission_items (submission_id, loot_item_id, rank, slot) VALUES ($1, $2, 1, 1)`,
        [listId, NEED_ID],
      )
    }
    // Need 1 is awarded to A at the first night; awarded_item_id stays null
    // because no item row exists for the need yet.
    await db.query(
      `INSERT INTO loot_history (character_id, character_name, loot_item_id, guild_id, raid_tier_id, raid_event_id)
       VALUES ($1, 'Test Raider A', $2, $3, $4, $5)`,
      [CHARACTER_A_ID, NEED_ID, GUILD_ID, FOREVER_TIER_ID, EVENT_ONE_ID],
    )
  })

  const snapshot = async () => ({
    tracking: await query(
      db,
      `SELECT character_id, loot_item_id, times_passed FROM blp_tracking
       WHERE guild_id = $1 ORDER BY character_id, loot_item_id`,
      [GUILD_ID],
    ),
    credits: await query(
      db,
      `SELECT character_id, loot_item_id, raid_event_id FROM blp_credits
       WHERE guild_id = $1 ORDER BY character_id, loot_item_id, raid_event_id`,
      [GUILD_ID],
    ),
  })

  const recomputeItem = () => db.query(`SELECT public.recompute_blp_for_item($1, $2)`, [GUILD_ID, NEED_ID])
  const recomputeEvent = () => db.query(`SELECT public.recompute_blp_for_event($1, $2)`, [GUILD_ID, EVENT_ONE_ID])
  const recomputeGuild = () => db.query(`SELECT public.recompute_blp_for_guild($1)`, [GUILD_ID])

  it('[DISC-07 adjacency] leaves the winner with no row and the other raider with times_passed 1, before any item exists for the need', async () => {
    const award = await query(db, `SELECT awarded_item_id FROM loot_history WHERE loot_item_id = $1`, [NEED_ID])
    expect(award).toEqual([{ awarded_item_id: null }])

    await recomputeItem()
    const { tracking, credits } = await snapshot()
    expect(tracking).toEqual([{ character_id: CHARACTER_B_ID, loot_item_id: NEED_ID, times_passed: 1 }])
    expect(credits).toEqual([
      { character_id: CHARACTER_B_ID, loot_item_id: NEED_ID, raid_event_id: EVENT_ONE_ID },
    ])
  })

  it('[DISC-07 ordering] leaves blp_tracking and blp_credits identical after repeated recomputes in any order', async () => {
    await recomputeItem()
    const first = await snapshot()
    expect(first.tracking).toHaveLength(1)

    await recomputeItem()
    await recomputeItem()
    await recomputeEvent()
    await recomputeGuild()
    expect(await snapshot()).toEqual(first)

    await recomputeGuild()
    await recomputeEvent()
    await recomputeItem()
    expect(await snapshot()).toEqual(first)
  })

  it('[DISC-07 empty] writes no blp_tracking row for a need that no approved list ranks', async () => {
    await db.query(`SELECT public.recompute_blp_for_item($1, $2)`, [GUILD_ID, NEED_TWO_ID])
    expect(await query(db, `SELECT 1 FROM blp_tracking WHERE loot_item_id = $1`, [NEED_TWO_ID])).toEqual([])
    expect(await query(db, `SELECT 1 FROM blp_credits WHERE loot_item_id = $1`, [NEED_TWO_ID])).toEqual([])
  })
})

// Last in the file: it reuses the BLP fixtures above (need 1 ranked by A and B,
// awarded to A, B's blp_tracking row).
describe('D-27 need-row delete lock', () => {
  const countFor = async (sql: string) => (await query<{ n: number }>(db, sql, [NEED_ID]))[0].n

  beforeAll(async () => {
    await db.query(`SELECT public.recompute_blp_for_item($1, $2)`, [GUILD_ID, NEED_ID])
  })

  it('[D-27] rejects an officer deleting a ranked, awarded need row directly, and keeps the need, its rankings, its award and its BLP row', async () => {
    expect(await countFor(`SELECT count(*)::int AS n FROM blp_tracking WHERE loot_item_id = $1`)).toBe(1)

    // A plain statement outside any transaction on purpose: expectRejected
    // always rolls back, so a read-back after it would pass with no lock at
    // all. Only a plain statement shows the lock, not a rollback, kept the rows.
    await asRole(db, 'authenticated', OFFICER_USER_ID)
    try {
      await expect(db.query(`DELETE FROM loot_items WHERE id = $1`, [NEED_ID])).rejects.toThrow(
        'need rows are deleted only by the server',
      )
    } finally {
      await resetRole(db)
    }

    expect(await countFor(`SELECT count(*)::int AS n FROM loot_items WHERE id = $1`)).toBe(1)
    expect(await countFor(`SELECT count(*)::int AS n FROM loot_submission_items WHERE loot_item_id = $1`)).toBe(2)
    expect(await countFor(`SELECT count(*)::int AS n FROM loot_history WHERE loot_item_id = $1`)).toBe(1)
    expect(await countFor(`SELECT count(*)::int AS n FROM blp_tracking WHERE loot_item_id = $1`)).toBe(1)
  })

  it('[D-27] still lets the officer delete an item row (same role, table and loot_items_delete policy)', async () => {
    await inRolledBackTransaction(db, async () => {
      await db.query(
        `INSERT INTO loot_items (id, raid_tier_id, name, wowhead_id)
         VALUES ('00000000-0000-4000-8000-0000000000d1', $1, 'Disposable Item', 4400)`,
        [CLASSIC_TIER_ID],
      )
      const result = await asUser(OFFICER_USER_ID, `DELETE FROM loot_items WHERE id = '00000000-0000-4000-8000-0000000000d1'`)
      expect(result.affectedRows).toBe(1)
    })
  })

  it('[D-27] still lets the superuser (the service role) delete a need row', async () => {
    await inRolledBackTransaction(db, async () => {
      const result = await db.query(`DELETE FROM loot_items WHERE id = $1`, [NEED_TWO_ID])
      expect(result.affectedRows).toBe(1)
    })
  })

  it('[D-27] lets the guild creator delete the guild, whose expansion and tier cascade removes the need rows', async () => {
    const tierIds = [CLASSIC_TIER_ID, FOREVER_TIER_ID, FOREVER_TIER_TWO_ID, FOREVER_TIER_KNOWN_ID]
    const itemsInGuild = async () =>
      (
        await query<{ n: number }>(
          db,
          `SELECT count(*)::int AS n FROM loot_items WHERE raid_tier_id = ANY ($1::uuid[])`,
          [tierIds],
        )
      )[0].n

    await inRolledBackTransaction(db, async () => {
      expect(await itemsInGuild()).toBeGreaterThan(0)
      await asUser(CREATOR_USER_ID, `SELECT public.delete_guild($1)`, [GUILD_ID])
      await resetRole(db)
      expect(await itemsInGuild()).toBe(0)
      expect(await query(db, `SELECT 1 FROM guilds WHERE id = $1`, [GUILD_ID])).toEqual([])
    })
  })
})
