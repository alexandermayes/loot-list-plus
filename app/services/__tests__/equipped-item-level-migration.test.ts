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

// Quick task 261026-wpw: character_equipped_items gains a nullable integer
// item_level (1 to 1999) that only the server gear sync may write, because
// officers read it as evidence of what a raider has equipped. The shape
// block pins the migration file itself: the exact 12 statements in order,
// that nothing but the new function is revoked and no policy or grant
// moves, and that the header Rollback block removes exactly what the file
// adds. The PGlite block applies the whole chain and proves the column, the
// CHECK, the RLS read matrix, the guard and idempotency. Every rejection
// runs as the role PostgREST would use beside a positive control for the
// same role, so a rejection from RLS can never pass for a guard rejection.
// The superuser stands in for the service role.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20261026120000'
const MIGRATION_FILE = path.join(MIGRATIONS_DIR, `${MIGRATION_TIMESTAMP}_equipped_item_level.sql`)
const TABLE = '"public"."character_equipped_items"'
const FUNCTION = '"public"."enforce_equipped_item_level_server_only"'
const CONSTRAINT = 'character_equipped_items_item_level_range'
const INSERT_TRIGGER = 'enforce_equipped_item_level_insert'
const UPDATE_TRIGGER = 'enforce_equipped_item_level_update'
const GUARD_MESSAGE = 'equipped item levels are written only by the server gear sync'

// SQLSTATE codes.
const INSUFFICIENT_PRIVILEGE = '42501'
const CHECK_VIOLATION = '23514'

/** Strip line comments (trimmed lines starting with `--`, and trailing `--`
 * to end of line on a code line). No string literal in this SQL contains two
 * hyphens, so this is safe. */
function stripComments(sql: string): string {
  return sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .map(line => line.replace(/--.*$/, ''))
    .join('\n')
}

function readMigrationRaw(): string {
  return fs.readFileSync(MIGRATION_FILE, 'utf8')
}

/** Split comment-stripped SQL on `;`, ignoring any `;` between a pair of `$$`
 * tokens (the guard function body). Chunks are trimmed, empty chunks
 * dropped, whitespace collapsed. No string literal in this SQL contains a
 * semicolon. */
function splitStatements(codeOnly: string): string[] {
  const chunks: string[] = []
  let current = ''
  let inDollarQuote = false
  for (let i = 0; i < codeOnly.length; i++) {
    if (codeOnly.startsWith('$$', i)) {
      inDollarQuote = !inDollarQuote
      current += '$$'
      i++
      continue
    }
    const ch = codeOnly[i]
    if (ch === ';' && !inDollarQuote) {
      chunks.push(current)
      current = ''
      continue
    }
    current += ch
  }
  chunks.push(current)
  return chunks
    .map(chunk => chunk.replace(/\s+/g, ' ').trim())
    .filter(chunk => chunk.length > 0)
}

function statements(): string[] {
  return splitStatements(stripComments(readMigrationRaw()))
}

/** Blank out the contents of every single-quoted string literal (handling ''
 * escapes), so keyword checks never match words inside comment or literal
 * text. */
function blankStrings(sql: string): string {
  return sql.replace(/'(?:[^']|'')*'/g, "''")
}

/** Blank out every double-quoted identifier, so a keyword check never
 * matches a word inside a name. */
function blankIdentifiers(sql: string): string {
  return sql.replace(/"(?:[^"]|"")*"/g, '"x"')
}

/** Escape a literal for use inside a RegExp source. */
const esc = (literal: string) => literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Lines after the exact '-- Rollback' heading line, up to the first line
 * that does not start with two hyphens; keep the lines that start with
 * '--   ' (two hyphens, three spaces), drop those first five characters,
 * join with newlines, then split into statements the same way as the
 * executable SQL. */
function rollbackStatements(): string[] {
  const raw = readMigrationRaw()
  const lines = raw.split('\n')
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '-- Rollback') {
      start = i
      break
    }
  }
  expect(start, "no '-- Rollback' heading line found").toBeGreaterThan(-1)
  const kept: string[] = []
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.startsWith('--')) break
    if (line.startsWith('--   ')) kept.push(line.slice(5))
  }
  return splitStatements(kept.join('\n'))
}

describe('equipped item level migration shape (quick task 261026-wpw)', () => {
  // Anchored to the newest migration that existed when this one was written
  // (20261020120000, the Discovery schema), not to a live directory scan,
  // which would fail as soon as any later migration lands (#309).
  it('the file exists, sorts after every migration that preceded it, and has a unique timestamp', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20261020120000)

    const sameTimestamp = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(name => name.endsWith('.sql') && name !== path.basename(MIGRATION_FILE))
      .filter(name => name.slice(0, 14) === MIGRATION_TIMESTAMP)
    expect(sameTimestamp).toEqual([])
  })

  it('has exactly the 12 statements, in the required order', () => {
    const chunks = statements()
    expect(chunks).toHaveLength(12)

    const expected: RegExp[] = [
      /^SET LOCAL lock_timeout\s*=\s*'5s'$/i,
      new RegExp(`^ALTER TABLE ${esc(TABLE)} ADD COLUMN IF NOT EXISTS "item_level" integer$`),
      new RegExp(`^ALTER TABLE ${esc(TABLE)} DROP CONSTRAINT IF EXISTS "${CONSTRAINT}"$`),
      new RegExp(
        `^ALTER TABLE ${esc(TABLE)} ADD CONSTRAINT "${CONSTRAINT}" CHECK \\("item_level" IS NULL OR "item_level" BETWEEN 1 AND 1999\\)$`,
      ),
      new RegExp(`^COMMENT ON COLUMN ${esc(TABLE)}\\."item_level" IS '[^']+'$`),
      new RegExp(
        `^CREATE OR REPLACE FUNCTION ${esc(FUNCTION)}\\(\\) RETURNS "trigger" LANGUAGE "plpgsql" SET "search_path" TO 'public', 'pg_temp' AS \\$\\$ BEGIN .* END; \\$\\$$`,
      ),
      new RegExp(`^COMMENT ON FUNCTION ${esc(FUNCTION)}\\(\\) IS '[^']+'$`),
      new RegExp(`^REVOKE ALL ON FUNCTION ${esc(FUNCTION)}\\(\\) FROM PUBLIC, "anon", "authenticated"$`),
      new RegExp(
        `^CREATE OR REPLACE TRIGGER "${INSERT_TRIGGER}" BEFORE INSERT ON ${esc(TABLE)} FOR EACH ROW WHEN \\(NEW\\.item_level IS NOT NULL\\) EXECUTE FUNCTION ${esc(FUNCTION)}\\(\\)$`,
      ),
      new RegExp(`^COMMENT ON TRIGGER "${INSERT_TRIGGER}" ON ${esc(TABLE)} IS '[^']+'$`),
      new RegExp(
        `^CREATE OR REPLACE TRIGGER "${UPDATE_TRIGGER}" BEFORE UPDATE OF "item_level" ON ${esc(TABLE)} FOR EACH ROW WHEN \\(NEW\\.item_level IS DISTINCT FROM OLD\\.item_level\\) EXECUTE FUNCTION ${esc(FUNCTION)}\\(\\)$`,
      ),
      new RegExp(`^COMMENT ON TRIGGER "${UPDATE_TRIGGER}" ON ${esc(TABLE)} IS '[^']+'$`),
    ]
    expected.forEach((re, i) => {
      expect(chunks[i], `statement ${i + 1}`).toMatch(re)
    })
  })

  it('the guard function is invoker rights, keys on the anon and authenticated roles, and raises 42501 with the fixed message', () => {
    const fn = statements()[5]
    expect(fn).not.toMatch(/SECURITY DEFINER/i)
    expect(fn).toContain("IF coalesce(current_setting('role', true), '') IN ('anon', 'authenticated') THEN")
    expect(fn).toContain(`MESSAGE = '${GUARD_MESSAGE}'`)
    expect(fn).toContain("ERRCODE = 'insufficient_privilege'")
    expect(fn).toContain('RETURN NEW')
    // It reads no table: the only identifiers after AS $$ are settings.
    expect(fn.split('AS $$')[1]).not.toMatch(/\b(SELECT|FROM|JOIN|INSERT|UPDATE|DELETE)\b/i)
  })

  it('every statement is re-runnable by its form', () => {
    const chunks = statements()
    for (const [i, stmt] of chunks.entries()) {
      const reRunnable =
        /^SET LOCAL\b/i.test(stmt) ||
        /\bIF NOT EXISTS\b/i.test(stmt) ||
        /\bIF EXISTS\b/i.test(stmt) ||
        /^CREATE OR REPLACE\b/i.test(stmt) ||
        /^COMMENT ON\b/i.test(stmt) ||
        /^REVOKE\b/i.test(stmt) ||
        // ADD CONSTRAINT is re-runnable only because its DROP IF EXISTS
        // directly precedes it in the same transaction.
        (/\bADD CONSTRAINT\b/i.test(stmt) && /\bDROP CONSTRAINT IF EXISTS\b/i.test(chunks[i - 1] ?? ''))
      expect(reRunnable, `statement ${i + 1} is not re-runnable: ${stmt}`).toBe(true)
    }
  })

  it('moves no table, column, policy or grant, and the only REVOKE and the only DROP are the ones the file needs', () => {
    const raw = statements()
    const executable = raw.map(blankIdentifiers).map(blankStrings)
    const forbidden = [
      /\bDROP\s+TABLE\b/i,
      /\bDROP\s+COLUMN\b/i,
      /\bDROP\s+POLICY\b/i,
      /\bCREATE\s+POLICY\b/i,
      /\bALTER\s+POLICY\b/i,
      /\bGRANT\b/i,
      /\bSECURITY\s+DEFINER\b/i,
      /\bROW LEVEL SECURITY\b/i,
      /\bTRUNCATE\b/i,
      /\bINSERT\s+INTO\b/i,
      /\bDELETE\s+FROM\b/i,
      /\bUPDATE\s+[\w."]+\s+SET\b/i,
    ]
    for (const stmt of executable) {
      for (const re of forbidden) {
        expect(stmt, `executable SQL unexpectedly matches ${re}`).not.toMatch(re)
      }
    }

    const revokes = raw.filter(stmt => /\bREVOKE\b/i.test(stmt))
    expect(revokes).toHaveLength(1)
    expect(raw.indexOf(revokes[0])).toBe(7)
    expect(revokes[0]).toContain(FUNCTION)

    const drops = executable.filter(stmt => /\bDROP\b/i.test(stmt))
    expect(drops).toEqual(['ALTER TABLE "x"."x" DROP CONSTRAINT IF EXISTS "x"'])
  })

  it('has the header sections of 20261003200000 and a Rollback block that removes exactly what the file adds', () => {
    const raw = readMigrationRaw()
    for (const heading of [
      'Problem',
      'Fix',
      'Readers and writers checked',
      'Production safety',
      'Deploy',
      'Not changed',
      'Rollback',
    ]) {
      expect(raw, `header section ${heading}`).toMatch(new RegExp(`^-- ${heading}$`, 'm'))
    }
    for (const needle of ['sync-gear', 'import', 'WowSims', 'migration-only', '--admin', '12 seconds']) {
      expect(raw, `header names ${needle}`).toContain(needle)
    }
    expect(rollbackStatements()).toEqual([
      `DROP TRIGGER IF EXISTS "${INSERT_TRIGGER}" ON ${TABLE}`,
      `DROP TRIGGER IF EXISTS "${UPDATE_TRIGGER}" ON ${TABLE}`,
      `DROP FUNCTION IF EXISTS ${FUNCTION}()`,
      `ALTER TABLE ${TABLE} DROP CONSTRAINT IF EXISTS "${CONSTRAINT}"`,
      `ALTER TABLE ${TABLE} DROP COLUMN IF EXISTS "item_level"`,
    ])
  })
})

// Synthetic ids only: this repo is public.
const GUILD_ID = '00000000-0000-4000-8000-000000000101'
const OTHER_GUILD_ID = '00000000-0000-4000-8000-000000000102'
const OWNER_USER_ID = '00000000-0000-4000-8000-000000000111'
const GUILDMATE_USER_ID = '00000000-0000-4000-8000-000000000112'
const EX_MEMBER_USER_ID = '00000000-0000-4000-8000-000000000113'
const NON_MEMBER_USER_ID = '00000000-0000-4000-8000-000000000114'
const OWNER_CHARACTER_ID = '00000000-0000-4000-8000-000000000121'
const GUILDMATE_CHARACTER_ID = '00000000-0000-4000-8000-000000000122'
const EX_MEMBER_CHARACTER_ID = '00000000-0000-4000-8000-000000000123'
const NON_MEMBER_CHARACTER_ID = '00000000-0000-4000-8000-000000000124'
const LEVELLED_ROW_ID = '00000000-0000-4000-8000-000000000131' // the owner's Head, item_level 489
const UNLEVELLED_ROW_ID = '00000000-0000-4000-8000-000000000132' // the owner's Neck, no item_level

let db: PGlite

/** Run one statement as an authenticated browser session of the owner. */
async function asOwner(sql: string, params?: unknown[]) {
  await asRole(db, 'authenticated', OWNER_USER_ID)
  return db.query(sql, params)
}

/** item_level of the owner's rows, ordered by slot, as seen by `role`. */
async function levelsSeenBy(role: 'anon' | 'authenticated', userId: string | null): Promise<(number | null)[]> {
  try {
    await asRole(db, role, userId)
    const rows = await query<{ item_level: number | null }>(
      db,
      `SELECT item_level FROM character_equipped_items WHERE character_id = $1 ORDER BY slot`,
      [OWNER_CHARACTER_ID],
    )
    return rows.map(r => r.item_level)
  } finally {
    await resetRole(db)
  }
}

beforeAll(async () => {
  // Every existing migration, in filename order, this file among them. The
  // default 10 s hook timeout is too short for the chain.
  const files = listMigrationFiles()
  expect(files).toContain(MIGRATION_FILE)
  db = await createChainedDb(files)

  // Seed as the superuser, which stands in for the service role: the guard
  // checks only anon and authenticated sessions.
  for (const [id, label] of [
    [OWNER_USER_ID, 'owner'],
    [GUILDMATE_USER_ID, 'guildmate'],
    [EX_MEMBER_USER_ID, 'ex-member'],
    [NON_MEMBER_USER_ID, 'non-member'],
  ]) {
    await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2)`, [id, `${label}@example.test`])
  }
  await db.query(`INSERT INTO guilds (id, name) VALUES ($1, 'Test Guild'), ($2, 'Other Guild')`, [
    GUILD_ID,
    OTHER_GUILD_ID,
  ])
  for (const [id, userId, name] of [
    [OWNER_CHARACTER_ID, OWNER_USER_ID, 'Test Owner'],
    [GUILDMATE_CHARACTER_ID, GUILDMATE_USER_ID, 'Test Guildmate'],
    [EX_MEMBER_CHARACTER_ID, EX_MEMBER_USER_ID, 'Test Exmember'],
    [NON_MEMBER_CHARACTER_ID, NON_MEMBER_USER_ID, 'Test Nonmember'],
  ]) {
    await db.query(`INSERT INTO characters (id, user_id, name) VALUES ($1, $2, $3)`, [id, userId, name])
  }
  // The owner and the guildmate are active in the guild, the ex-member is
  // inactive there, and the non-member is active only in another guild.
  await db.query(
    `INSERT INTO character_guild_memberships (character_id, guild_id, role, is_active) VALUES
       ($1, $5, 'Member', true), ($2, $5, 'Member', true), ($3, $5, 'Member', false), ($4, $6, 'Member', true)`,
    [
      OWNER_CHARACTER_ID,
      GUILDMATE_CHARACTER_ID,
      EX_MEMBER_CHARACTER_ID,
      NON_MEMBER_CHARACTER_ID,
      GUILD_ID,
      OTHER_GUILD_ID,
    ],
  )
  await db.query(
    `INSERT INTO character_equipped_items (id, character_id, slot, wowhead_id, item_level) VALUES ($1, $2, 'Head', 1001, 489)`,
    [LEVELLED_ROW_ID, OWNER_CHARACTER_ID],
  )
  await db.query(
    `INSERT INTO character_equipped_items (id, character_id, slot, wowhead_id) VALUES ($1, $2, 'Neck', 1002)`,
    [UNLEVELLED_ROW_ID, OWNER_CHARACTER_ID],
  )
}, 180000)

afterAll(async () => {
  await db?.close()
})

describe('equipped item level migration on the full chain (PGlite)', () => {
  describe('column', () => {
    it('reports item_level as a nullable integer with no default', async () => {
      const rows = await query<{ data_type: string; is_nullable: string; column_default: string | null }>(
        db,
        `SELECT data_type, is_nullable, column_default FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'character_equipped_items' AND column_name = 'item_level'`,
      )
      expect(rows).toEqual([{ data_type: 'integer', is_nullable: 'YES', column_default: null }])
    })

    it('reads 489 on the row inserted with a level and null on the row inserted without one', async () => {
      const rows = await query<{ id: string; item_level: number | null }>(
        db,
        `SELECT id, item_level FROM character_equipped_items WHERE character_id = $1 ORDER BY slot`,
        [OWNER_CHARACTER_ID],
      )
      expect(rows).toEqual([
        { id: LEVELLED_ROW_ID, item_level: 489 },
        { id: UNLEVELLED_ROW_ID, item_level: null },
      ])
    })

    it('rejects 0, -1 and 2000 with the range CHECK (23514) and accepts 1, 489 and 1999, under the superuser', async () => {
      const insert = `INSERT INTO character_equipped_items (character_id, slot, wowhead_id, item_level)
                      VALUES ($1, 'Chest', 1003, $2) RETURNING item_level`
      for (const bad of [0, -1, 2000]) {
        const error = await expectRejected(db, () => db.query(insert, [OWNER_CHARACTER_ID, bad]), CONSTRAINT)
        expect(error.code, `item_level ${bad}`).toBe(CHECK_VIOLATION)
      }
      for (const good of [1, 489, 1999]) {
        await inRolledBackTransaction(db, async () => {
          const { rows } = await db.query<{ item_level: number }>(insert, [OWNER_CHARACTER_ID, good])
          expect(rows).toEqual([{ item_level: good }])
        })
      }
    })

    it('applies the file twice more without error and keeps one function, one CHECK and one WHEN gated trigger of each name', async () => {
      const sql = fs.readFileSync(MIGRATION_FILE, 'utf8')
      await db.exec('SET search_path TO public, extensions; RESET role;')
      await expect(db.exec(sql)).resolves.toBeDefined()
      await expect(db.exec(sql)).resolves.toBeDefined()

      const triggers = await query<{ tgname: string; def: string }>(
        db,
        `SELECT tg.tgname, pg_get_triggerdef(tg.oid) AS def
         FROM pg_trigger tg
         JOIN pg_class c ON c.oid = tg.tgrelid
         WHERE c.relname = 'character_equipped_items' AND tg.tgname = ANY($1) AND NOT tg.tgisinternal
         ORDER BY tg.tgname`,
        [[INSERT_TRIGGER, UPDATE_TRIGGER]],
      )
      expect(triggers.map(t => t.tgname)).toEqual([INSERT_TRIGGER, UPDATE_TRIGGER])
      expect(triggers[0].def).toMatch(
        /BEFORE INSERT ON public\.character_equipped_items FOR EACH ROW WHEN \(\(?new\.item_level IS NOT NULL\)?\)/i,
      )
      expect(triggers[1].def).toMatch(
        /BEFORE UPDATE OF item_level ON public\.character_equipped_items FOR EACH ROW WHEN \(\(?new\.item_level IS DISTINCT FROM old\.item_level\)?\)/i,
      )

      const functions = await query<{ n: number }>(
        db,
        `SELECT count(*)::int AS n FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'enforce_equipped_item_level_server_only'`,
      )
      expect(functions).toEqual([{ n: 1 }])

      const checks = await query<{ n: number }>(db, `SELECT count(*)::int AS n FROM pg_constraint WHERE conname = $1`, [
        CONSTRAINT,
      ])
      expect(checks).toEqual([{ n: 1 }])
    })
  })

  describe('RLS read of item_level (policies unchanged)', () => {
    it('the owner reads both own rows, 489 and null', async () => {
      expect(await levelsSeenBy('authenticated', OWNER_USER_ID)).toEqual([489, null])
    })

    it('an active guildmate reads both rows', async () => {
      expect(await levelsSeenBy('authenticated', GUILDMATE_USER_ID)).toEqual([489, null])
    })

    it('an ex-member of the guild reads no row', async () => {
      expect(await levelsSeenBy('authenticated', EX_MEMBER_USER_ID)).toEqual([])
    })

    it('a member of another guild reads no row', async () => {
      expect(await levelsSeenBy('authenticated', NON_MEMBER_USER_ID)).toEqual([])
    })

    it('anon reads no row', async () => {
      expect(await levelsSeenBy('anon', null)).toEqual([])
    })
  })

  describe('guard: only the server writes item_level', () => {
    const insertWithLevel = `INSERT INTO character_equipped_items (character_id, slot, wowhead_id, item_level)
                             VALUES ($1, 'Chest', 1003, $2)`
    const insertWithoutLevel = `INSERT INTO character_equipped_items (character_id, slot, wowhead_id)
                                VALUES ($1, 'Chest', 1003)`

    it('rejects the owner inserting an own-character row with item_level 500 (42501)', async () => {
      const error = await expectRejected(db, () => asOwner(insertWithLevel, [OWNER_CHARACTER_ID, 500]), GUARD_MESSAGE)
      expect(error.code).toBe(INSUFFICIENT_PRIVILEGE)
    })

    it('lets the owner insert an own-character row without an item_level (positive control, RLS passes)', async () => {
      await inRolledBackTransaction(db, async () => {
        const result = await asOwner(insertWithoutLevel, [OWNER_CHARACTER_ID])
        expect(result.affectedRows).toBe(1)
        await resetRole(db)
        const rows = await query<{ item_level: number | null }>(
          db,
          `SELECT item_level FROM character_equipped_items WHERE character_id = $1 AND slot = 'Chest'`,
          [OWNER_CHARACTER_ID],
        )
        expect(rows).toEqual([{ item_level: null }])
      })
    })

    it('rejects the owner changing a stored item_level (42501)', async () => {
      const error = await expectRejected(
        db,
        () => asOwner(`UPDATE character_equipped_items SET item_level = 500 WHERE id = $1`, [LEVELLED_ROW_ID]),
        GUARD_MESSAGE,
      )
      expect(error.code).toBe(INSUFFICIENT_PRIVILEGE)
    })

    it('rejects the owner clearing a stored item_level (42501)', async () => {
      const error = await expectRejected(
        db,
        () => asOwner(`UPDATE character_equipped_items SET item_level = NULL WHERE id = $1`, [LEVELLED_ROW_ID]),
        GUARD_MESSAGE,
      )
      expect(error.code).toBe(INSUFFICIENT_PRIVILEGE)
    })

    it('lets the owner change only enchant_id on the same row (positive control), leaving item_level at 489', async () => {
      await inRolledBackTransaction(db, async () => {
        const result = await asOwner(`UPDATE character_equipped_items SET enchant_id = 7 WHERE id = $1`, [
          LEVELLED_ROW_ID,
        ])
        expect(result.affectedRows).toBe(1)
        await resetRole(db)
        const rows = await query<{ enchant_id: number | null; item_level: number | null }>(
          db,
          `SELECT enchant_id, item_level FROM character_equipped_items WHERE id = $1`,
          [LEVELLED_ROW_ID],
        )
        expect(rows).toEqual([{ enchant_id: 7, item_level: 489 }])
      })
    })

    it('rejects an anon session inserting a row with a level, with the guard message (the guard fires before RLS)', async () => {
      const error = await expectRejected(
        db,
        async () => {
          await asRole(db, 'anon', null)
          return db.query(insertWithLevel, [OWNER_CHARACTER_ID, 500])
        },
        GUARD_MESSAGE,
      )
      expect(error.code).toBe(INSUFFICIENT_PRIVILEGE)
    })

    it('lets the superuser (the service role stand-in) insert a row with a level and change a stored one', async () => {
      await inRolledBackTransaction(db, async () => {
        const { rows: inserted } = await db.query<{ item_level: number }>(
          `${insertWithLevel} RETURNING item_level`,
          [OWNER_CHARACTER_ID, 496],
        )
        expect(inserted).toEqual([{ item_level: 496 }])
        await db.query(`UPDATE character_equipped_items SET item_level = 502 WHERE id = $1`, [LEVELLED_ROW_ID])
        const rows = await query<{ item_level: number | null }>(
          db,
          `SELECT item_level FROM character_equipped_items WHERE id = $1`,
          [LEVELLED_ROW_ID],
        )
        expect(rows).toEqual([{ item_level: 502 }])
      })
    })

    it('lets the service_role role itself insert a row with a level (the guard keys on anon and authenticated only)', async () => {
      await inRolledBackTransaction(db, async () => {
        await db.exec('SET role service_role')
        const { rows } = await db.query<{ item_level: number }>(`${insertWithLevel} RETURNING item_level`, [
          OWNER_CHARACTER_ID,
          496,
        ])
        expect(rows).toEqual([{ item_level: 496 }])
      })
    })
  })
})
