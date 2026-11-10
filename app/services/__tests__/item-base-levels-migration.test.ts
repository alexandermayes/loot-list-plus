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

// Quick task 261027-lzm: the Classic profile equipment response carries no
// per-item level, so the Battle.net writers cache the Game Data base item
// level per wowhead id in item_base_levels and copy it into
// character_equipped_items.item_level. The table is service role only, because
// a browser session that could write it would set the level officers read for
// every guild holding that item. The shape block pins the migration file
// itself: the exact 7 statements in order, that the only REVOKE and GRANT are
// the two on this table, and that the header Rollback block removes exactly
// what the file adds. The PGlite block applies the whole chain and proves the
// columns, the CHECK, RLS with no policies, the privilege matrix, the service
// role and idempotency. Every rejection runs as the role PostgREST would use
// beside a positive control for the same role, so a broken session can never
// pass for a privilege rejection. The superuser stands in for the service role
// except where a test sets the service_role role itself.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20261027120000'
// Anchored to the migration that precedes this one (20261026120000, the
// equipped item level column), not to a live directory scan, which would fail
// as soon as any later migration lands (#309).
const PRECEDING_TIMESTAMP = 20261026120000
const MIGRATION_FILE = path.join(MIGRATIONS_DIR, `${MIGRATION_TIMESTAMP}_item_base_levels.sql`)
const TABLE = '"public"."item_base_levels"'
const CONSTRAINT = 'item_base_levels_item_level_range'

// SQLSTATE codes.
const INSUFFICIENT_PRIVILEGE = '42501'
const NOT_NULL_VIOLATION = '23502'
const UNIQUE_VIOLATION = '23505'
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

/** Split comment-stripped SQL on `;`. Chunks are trimmed, empty chunks
 * dropped, whitespace collapsed. No string literal in this SQL contains a
 * semicolon. */
function splitStatements(codeOnly: string): string[] {
  return codeOnly
    .split(';')
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

describe('item base levels migration shape (quick task 261027-lzm)', () => {
  it('the file exists, sorts after the migration that preceded it, and has a unique timestamp', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(PRECEDING_TIMESTAMP)

    const sameTimestamp = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(name => name.endsWith('.sql') && name !== path.basename(MIGRATION_FILE))
      .filter(name => name.slice(0, 14) === MIGRATION_TIMESTAMP)
    expect(sameTimestamp).toEqual([])
  })

  it('has exactly the 7 statements, in the required order', () => {
    const chunks = statements()
    expect(chunks).toHaveLength(7)

    const expected: RegExp[] = [
      new RegExp(`^CREATE TABLE IF NOT EXISTS ${esc(TABLE)} \\(`),
      new RegExp(`^ALTER TABLE ${esc(TABLE)} DROP CONSTRAINT IF EXISTS "${CONSTRAINT}"$`),
      new RegExp(
        `^ALTER TABLE ${esc(TABLE)} ADD CONSTRAINT "${CONSTRAINT}" CHECK \\("item_level" BETWEEN 1 AND 1999\\)$`,
      ),
      new RegExp(`^ALTER TABLE ${esc(TABLE)} ENABLE ROW LEVEL SECURITY$`),
      new RegExp(`^REVOKE ALL ON TABLE ${esc(TABLE)} FROM PUBLIC, "anon", "authenticated"$`),
      new RegExp(`^GRANT ALL ON TABLE ${esc(TABLE)} TO "service_role"$`),
      new RegExp(`^COMMENT ON TABLE ${esc(TABLE)} IS '[^']+'$`),
    ]
    expected.forEach((re, i) => {
      expect(chunks[i], `statement ${i + 1}`).toMatch(re)
    })
  })

  it('the CREATE TABLE has exactly wowhead_id, item_level and fetched_at, and the primary key is on wowhead_id', () => {
    const create = statements()[0]
    const body = create.slice(create.indexOf('(') + 1, create.lastIndexOf(')')).trim()
    const parts = body.split(/,\s*(?![^()]*\))/).map(p => p.trim())
    expect(parts).toEqual([
      '"wowhead_id" integer NOT NULL',
      '"item_level" integer NOT NULL',
      '"fetched_at" timestamp with time zone DEFAULT now() NOT NULL',
      'CONSTRAINT "item_base_levels_pkey" PRIMARY KEY ("wowhead_id")',
    ])
  })

  it('every statement is re-runnable by its form', () => {
    const chunks = statements()
    for (const [i, stmt] of chunks.entries()) {
      const reRunnable =
        /\bIF NOT EXISTS\b/i.test(stmt) ||
        /\bIF EXISTS\b/i.test(stmt) ||
        /^ALTER TABLE .* ENABLE ROW LEVEL SECURITY$/i.test(stmt) ||
        /^COMMENT ON\b/i.test(stmt) ||
        /^REVOKE\b/i.test(stmt) ||
        /^GRANT\b/i.test(stmt) ||
        // ADD CONSTRAINT is re-runnable only because its DROP IF EXISTS
        // directly precedes it in the same transaction.
        (/\bADD CONSTRAINT\b/i.test(stmt) && /\bDROP CONSTRAINT IF EXISTS\b/i.test(chunks[i - 1] ?? ''))
      expect(reRunnable, `statement ${i + 1} is not re-runnable: ${stmt}`).toBe(true)
    }
  })

  it('creates no policy, function, trigger or view, drops no table or column, and the only REVOKE and GRANT are on item_base_levels', () => {
    const raw = statements()
    const executable = raw.map(blankIdentifiers).map(blankStrings)
    const forbidden = [
      /\bPOLICY\b/i,
      /\bFUNCTION\b/i,
      /\bTRIGGER\b/i,
      /\bVIEW\b/i,
      /\bDROP\s+TABLE\b/i,
      /\bDROP\s+COLUMN\b/i,
      /\bDISABLE\s+ROW LEVEL SECURITY\b/i,
      /\bSECURITY\s+DEFINER\b/i,
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

    expect(raw.filter(stmt => /^REVOKE\b/i.test(stmt))).toEqual([
      `REVOKE ALL ON TABLE ${TABLE} FROM PUBLIC, "anon", "authenticated"`,
    ])
    expect(raw.filter(stmt => /^GRANT\b/i.test(stmt))).toEqual([`GRANT ALL ON TABLE ${TABLE} TO "service_role"`])
    expect(executable.filter(stmt => /\bDROP\b/i.test(stmt))).toEqual(['ALTER TABLE "x"."x" DROP CONSTRAINT IF EXISTS "x"'])
  })

  it('has the header sections of 20261026120000 and a Rollback block that is the single DROP TABLE IF EXISTS', () => {
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
    for (const needle of [
      'sync-gear',
      'import',
      'link-battlenet',
      'migration-only',
      '--admin',
      '12 seconds',
      '20261026120000',
    ]) {
      expect(raw, `header names ${needle}`).toContain(needle)
    }
    expect(rollbackStatements()).toEqual([`DROP TABLE IF EXISTS ${TABLE}`])
  })

  it('has no em dash and no string literal with two consecutive hyphens', () => {
    const raw = readMigrationRaw()
    expect(raw).not.toContain(String.fromCharCode(0x2014))
    const literals = stripComments(raw).match(/'[^']*'/g) ?? []
    for (const literal of literals) {
      expect(literal).not.toContain('--')
    }
  })
})

// Synthetic ids only: this repo is public. The wowhead ids are arbitrary
// positive integers.
const SEEDED_ID = 85979
const OTHER_ID = 94722
const OWNER_USER_ID = '00000000-0000-4000-8000-000000000111'

let db: PGlite

beforeAll(async () => {
  // Every existing migration, in filename order, this file among them. The
  // default 10 s hook timeout is too short for the chain.
  const files = listMigrationFiles()
  expect(files).toContain(MIGRATION_FILE)
  db = await createChainedDb(files)

  // Seed as the superuser, which stands in for the service role.
  await db.query(`INSERT INTO item_base_levels (wowhead_id, item_level) VALUES ($1, 463)`, [SEEDED_ID])
}, 180000)

afterAll(async () => {
  await db?.close()
})

describe('item base levels migration on the full chain (PGlite)', () => {
  describe('columns', () => {
    it('reports the three columns with the stated types, nullability and default', async () => {
      const rows = await query<{
        column_name: string
        data_type: string
        is_nullable: string
        column_default: string | null
      }>(
        db,
        `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'item_base_levels' ORDER BY ordinal_position`,
      )
      expect(rows).toEqual([
        { column_name: 'wowhead_id', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'item_level', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'fetched_at', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'now()' },
      ])
    })

    it('has the primary key on wowhead_id', async () => {
      const rows = await query<{ conname: string; cols: string[] }>(
        db,
        `SELECT con.conname, array_agg(att.attname ORDER BY att.attnum) AS cols
         FROM pg_constraint con
         JOIN pg_class c ON c.oid = con.conrelid
         JOIN pg_attribute att ON att.attrelid = c.oid AND att.attnum = ANY (con.conkey)
         WHERE c.relname = 'item_base_levels' AND con.contype = 'p'
         GROUP BY con.conname`,
      )
      expect(rows).toEqual([{ conname: 'item_base_levels_pkey', cols: ['wowhead_id'] }])
    })
  })

  describe('constraints (superuser, rolled back)', () => {
    const insert = `INSERT INTO item_base_levels (wowhead_id, item_level) VALUES ($1, $2) RETURNING item_level`

    it('rejects 0, -1 and 2000 with the range CHECK (23514) and accepts 1, 489 and 1999', async () => {
      for (const bad of [0, -1, 2000]) {
        const error = await expectRejected(db, () => db.query(insert, [OTHER_ID, bad]), CONSTRAINT)
        expect(error.code, `item_level ${bad}`).toBe(CHECK_VIOLATION)
      }
      for (const good of [1, 489, 1999]) {
        await inRolledBackTransaction(db, async () => {
          const { rows } = await db.query<{ item_level: number }>(insert, [OTHER_ID, good])
          expect(rows).toEqual([{ item_level: good }])
        })
      }
    })

    it('rejects a null item_level (23502) and a duplicate wowhead_id (23505)', async () => {
      const nullError = await expectRejected(db, () => db.query(insert, [OTHER_ID, null]), 'item_level')
      expect(nullError.code).toBe(NOT_NULL_VIOLATION)

      const duplicateError = await expectRejected(db, () => db.query(insert, [SEEDED_ID, 470]), 'item_base_levels_pkey')
      expect(duplicateError.code).toBe(UNIQUE_VIOLATION)
    })

    it('INSERT ... ON CONFLICT (wowhead_id) DO UPDATE replaces the level, the path the helper upserts through', async () => {
      await inRolledBackTransaction(db, async () => {
        await db.query(
          `INSERT INTO item_base_levels (wowhead_id, item_level) VALUES ($1, 500)
           ON CONFLICT (wowhead_id) DO UPDATE SET item_level = EXCLUDED.item_level, fetched_at = EXCLUDED.fetched_at`,
          [SEEDED_ID],
        )
        const rows = await query<{ item_level: number }>(
          db,
          `SELECT item_level FROM item_base_levels WHERE wowhead_id = $1`,
          [SEEDED_ID],
        )
        expect(rows).toEqual([{ item_level: 500 }])
      })
    })
  })

  describe('access: service role only', () => {
    it('has RLS enabled and no policy on the table', async () => {
      const flags = await query<{ relrowsecurity: boolean }>(
        db,
        `SELECT relrowsecurity FROM pg_class WHERE oid = 'public.item_base_levels'::regclass`,
      )
      expect(flags).toEqual([{ relrowsecurity: true }])
      const policies = await query<{ n: number }>(
        db,
        `SELECT count(*)::int AS n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'item_base_levels'`,
      )
      expect(policies).toEqual([{ n: 0 }])
    })

    it('anon and authenticated hold no privilege and service_role holds select, insert and update', async () => {
      const has = async (role: string, privilege: string) => {
        const rows = await query<{ ok: boolean }>(db, `SELECT has_table_privilege($1, 'public.item_base_levels', $2) AS ok`, [
          role,
          privilege,
        ])
        return rows[0].ok
      }
      for (const role of ['anon', 'authenticated']) {
        for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
          expect(await has(role, privilege), `${role} ${privilege}`).toBe(false)
        }
      }
      for (const privilege of ['SELECT', 'INSERT', 'UPDATE']) {
        expect(await has('service_role', privilege), `service_role ${privilege}`).toBe(true)
      }
    })

    for (const role of ['anon', 'authenticated'] as const) {
      const userId = role === 'anon' ? null : OWNER_USER_ID

      it(`rejects ${role} SELECT and INSERT with 42501, beside a positive control for the same role`, async () => {
        // Positive control: the session works and can read a table it has
        // rights on, so the rejections below are the table privilege.
        try {
          await asRole(db, role, userId)
          const control = await query<{ n: number }>(db, `SELECT count(*)::int AS n FROM guilds`)
          expect(control).toHaveLength(1)
        } finally {
          await resetRole(db)
        }

        const selectError = await expectRejected(
          db,
          async () => {
            await asRole(db, role, userId)
            return db.query(`SELECT wowhead_id FROM item_base_levels`)
          },
          'permission denied',
        )
        expect(selectError.code).toBe(INSUFFICIENT_PRIVILEGE)

        const insertError = await expectRejected(
          db,
          async () => {
            await asRole(db, role, userId)
            return db.query(`INSERT INTO item_base_levels (wowhead_id, item_level) VALUES ($1, 470)`, [OTHER_ID])
          },
          'permission denied',
        )
        expect(insertError.code).toBe(INSUFFICIENT_PRIVILEGE)
      })
    }

    it('lets the service_role role read the seeded row and upsert', async () => {
      await inRolledBackTransaction(db, async () => {
        await db.exec('SET role service_role')
        const rows = await query<{ wowhead_id: number; item_level: number }>(
          db,
          `SELECT wowhead_id, item_level FROM item_base_levels WHERE wowhead_id = $1`,
          [SEEDED_ID],
        )
        expect(rows).toEqual([{ wowhead_id: SEEDED_ID, item_level: 463 }])

        await db.query(
          `INSERT INTO item_base_levels (wowhead_id, item_level) VALUES ($1, 489), ($2, 500)
           ON CONFLICT (wowhead_id) DO UPDATE SET item_level = EXCLUDED.item_level`,
          [SEEDED_ID, OTHER_ID],
        )
        const after = await query<{ wowhead_id: number; item_level: number }>(
          db,
          `SELECT wowhead_id, item_level FROM item_base_levels ORDER BY wowhead_id`,
        )
        expect(after).toEqual([
          { wowhead_id: SEEDED_ID, item_level: 489 },
          { wowhead_id: OTHER_ID, item_level: 500 },
        ])
      })
    })
  })

  describe('idempotency', () => {
    it('applies the file twice more without error and keeps one table, one CHECK, RLS on, no policy and no anon privilege', async () => {
      const sql = fs.readFileSync(MIGRATION_FILE, 'utf8')
      await db.exec('SET search_path TO public, extensions; RESET role;')
      await expect(db.exec(sql)).resolves.toBeDefined()
      await expect(db.exec(sql)).resolves.toBeDefined()

      const tables = await query<{ n: number }>(
        db,
        `SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = 'item_base_levels'`,
      )
      expect(tables).toEqual([{ n: 1 }])

      const checks = await query<{ n: number }>(db, `SELECT count(*)::int AS n FROM pg_constraint WHERE conname = $1`, [
        CONSTRAINT,
      ])
      expect(checks).toEqual([{ n: 1 }])

      const flags = await query<{ relrowsecurity: boolean }>(
        db,
        `SELECT relrowsecurity FROM pg_class WHERE oid = 'public.item_base_levels'::regclass`,
      )
      expect(flags).toEqual([{ relrowsecurity: true }])

      const policies = await query<{ n: number }>(
        db,
        `SELECT count(*)::int AS n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'item_base_levels'`,
      )
      expect(policies).toEqual([{ n: 0 }])

      const anon = await query<{ ok: boolean }>(
        db,
        `SELECT has_table_privilege('anon', 'public.item_base_levels', 'SELECT') AS ok`,
      )
      expect(anon).toEqual([{ ok: false }])
    })
  })
})
