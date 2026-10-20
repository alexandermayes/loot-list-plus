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
