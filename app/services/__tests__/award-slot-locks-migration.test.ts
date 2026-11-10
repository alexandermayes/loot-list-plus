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

// Quick task 261028-0gx (owner scope D1 to D4a): once a raider receives an
// item from an approved loot list, the rank and slot it held stay locked to
// that item for the rest of the tier. save_submission_items deletes every live
// row of a list and inserts the payload, so a marker on loot_submission_items
// would not survive a save; the locks live in their own table, written only by
// the server through the service role. The shape block pins the migration
// file itself: the exact 18 statements in order, the table definition, the
// policy, the only REVOKE and GRANT lines, the function head and body, the
// header sections and the Rollback block. The PGlite block applies the whole
// chain and proves the columns, the constraints, RLS and the privilege matrix,
// the cascade from loot_history, the lock check inside save_submission_items
// for the list owner and an officer, and idempotency. Every rejection runs as
// the role PostgREST would use beside a positive control for the same role, so
// a broken session can never pass for a privilege rejection. The superuser
// stands in for the service role except where a test sets the service_role
// role itself.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const BASELINE_FILE = path.join(MIGRATIONS_DIR, '20260101000000_baseline_schema.sql')
const MIGRATION_TIMESTAMP = '20261028120000'
// Anchored to the migration that precedes this one (20261027120000, the item
// base levels cache), not to a live directory scan, which would fail as soon
// as any later migration lands (#309).
const PRECEDING_TIMESTAMP = 20261027120000
const MIGRATION_FILE = path.join(MIGRATIONS_DIR, `${MIGRATION_TIMESTAMP}_award_slot_locks.sql`)
const TABLE = '"public"."loot_list_slot_locks"'
const FUNCTION_SIGNATURE = '"public"."save_submission_items"("p_submission_id" "uuid", "p_items" "jsonb")'
const LOCK_MESSAGE = 'Rank 50 is locked to Locked Item'
const AUTH_MESSAGE = 'Not authorized to modify this submission'

// SQLSTATE codes.
const INSUFFICIENT_PRIVILEGE = '42501'
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

/** Split comment-stripped SQL on `;`, ignoring any `;` between a pair of `$$`
 * tokens, because the function body holds semicolons. Chunks are trimmed,
 * empty chunks dropped, and whitespace collapsed per chunk. */
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
  return chunks.map(chunk => chunk.replace(/\s+/g, ' ').trim()).filter(chunk => chunk.length > 0)
}

function statements(): string[] {
  return splitStatements(stripComments(readMigrationRaw()))
}

/** Blank out the contents of every single-quoted string literal (handling ''
 * escapes), so keyword checks never match words inside COMMENT text. */
function blankStrings(sql: string): string {
  return sql.replace(/'(?:[^']|'')*'/g, "''")
}

/** Blank out every double-quoted identifier, so a keyword check never
 * matches a word inside a name. */
function blankIdentifiers(sql: string): string {
  return sql.replace(/"(?:[^"]|"")*"/g, '"x"')
}

/** Replace each dollar-quoted body with an empty marker, so the forbidden
 * content checks never trip on the function body's own statements. */
function stripDollarBodies(sql: string): string {
  return sql.replace(/\$\$[\s\S]*?\$\$/g, '$$__BODY__$$')
}

/** Escape a literal for use inside a RegExp source. */
const esc = (literal: string) => literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Lines after the exact '-- Rollback' heading line, up to the first line
 * that does not start with two hyphens; keep the lines that start with
 * '--   ' (two hyphens, three spaces), drop those first five characters,
 * join with newlines, then split into statements the same way as the
 * executable SQL. */
function rollbackStatements(): string[] {
  const lines = readMigrationRaw().split('\n')
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

describe('award slot locks migration shape (quick task 261028-0gx)', () => {
  it('the file exists, sorts after the migration that preceded it, and has a unique timestamp', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(PRECEDING_TIMESTAMP)

    const sameTimestamp = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(name => name.endsWith('.sql') && name !== path.basename(MIGRATION_FILE))
      .filter(name => name.slice(0, 14) === MIGRATION_TIMESTAMP)
    expect(sameTimestamp).toEqual([])
  })

  it('has exactly the 18 statements, in the required order', () => {
    const chunks = statements()
    expect(chunks).toHaveLength(18)

    const expected: RegExp[] = [
      /^SET LOCAL lock_timeout = '5s'$/,
      new RegExp(`^CREATE TABLE IF NOT EXISTS ${esc(TABLE)} \\(`),
      new RegExp(
        `^CREATE UNIQUE INDEX IF NOT EXISTS "idx_loot_list_slot_locks_live_position" ON ${esc(TABLE)} USING "btree" \\("submission_id", "rank", "slot"\\) WHERE \\("released_at" IS NULL\\)$`,
      ),
      new RegExp(
        `^CREATE INDEX IF NOT EXISTS "idx_loot_list_slot_locks_live_submission" ON ${esc(TABLE)} USING "btree" \\("submission_id"\\) WHERE \\("released_at" IS NULL\\)$`,
      ),
      new RegExp(`^ALTER TABLE ${esc(TABLE)} ENABLE ROW LEVEL SECURITY$`),
      new RegExp(`^DROP POLICY IF EXISTS "loot_list_slot_locks_select" ON ${esc(TABLE)}$`),
      new RegExp(`^CREATE POLICY "loot_list_slot_locks_select" ON ${esc(TABLE)} FOR SELECT TO "authenticated" USING `),
      new RegExp(`^REVOKE ALL ON TABLE ${esc(TABLE)} FROM PUBLIC, "anon", "authenticated"$`),
      new RegExp(`^GRANT SELECT ON TABLE ${esc(TABLE)} TO "authenticated"$`),
      new RegExp(`^GRANT ALL ON TABLE ${esc(TABLE)} TO "service_role"$`),
      new RegExp(`^COMMENT ON TABLE ${esc(TABLE)} IS '[^']+'$`),
      /^ALTER TABLE "public"\."guild_settings" ADD COLUMN IF NOT EXISTS "award_slot_lock_enabled" boolean DEFAULT false NOT NULL$/,
      /^COMMENT ON COLUMN "public"\."guild_settings"\."award_slot_lock_enabled" IS '[^']+'$/,
      new RegExp(`^CREATE OR REPLACE FUNCTION ${esc(FUNCTION_SIGNATURE)} RETURNS integer `),
      new RegExp(`^ALTER FUNCTION ${esc(FUNCTION_SIGNATURE)} OWNER TO "postgres"$`),
      new RegExp(`^REVOKE ALL ON FUNCTION ${esc(FUNCTION_SIGNATURE)} FROM PUBLIC, "anon"$`),
      new RegExp(`^GRANT EXECUTE ON FUNCTION ${esc(FUNCTION_SIGNATURE)} TO "authenticated", "service_role"$`),
      new RegExp(`^COMMENT ON FUNCTION ${esc(FUNCTION_SIGNATURE)} IS '[^']+'$`),
    ]
    expected.forEach((re, i) => {
      expect(chunks[i], `statement ${i + 1}`).toMatch(re)
    })
  })

  it('the CREATE TABLE has exactly the 12 columns and the 10 named constraints, every foreign key ON DELETE CASCADE', () => {
    const create = statements()[1]
    const body = create.slice(create.indexOf('(') + 1, create.lastIndexOf(')')).trim()
    const parts = body.split(/,\s*(?![^()]*\))/).map(p => p.trim())
    const columns = parts.filter(p => !p.startsWith('CONSTRAINT '))
    const constraints = parts.filter(p => p.startsWith('CONSTRAINT '))

    expect(columns).toEqual([
      '"id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL',
      '"guild_id" "uuid" NOT NULL',
      '"submission_id" "uuid" NOT NULL',
      '"character_id" "uuid" NOT NULL',
      '"loot_item_id" "uuid" NOT NULL',
      '"rank" integer NOT NULL',
      '"slot" integer NOT NULL',
      '"loot_history_id" "uuid" NOT NULL',
      '"locked_at" timestamp with time zone DEFAULT "now"() NOT NULL',
      '"released_at" timestamp with time zone',
      '"released_by" "uuid"',
      '"release_reason" "text"',
    ])
    expect(constraints.map(c => c.split(' ')[1])).toEqual([
      '"loot_list_slot_locks_pkey"',
      '"loot_list_slot_locks_loot_history_id_key"',
      '"loot_list_slot_locks_guild_id_fkey"',
      '"loot_list_slot_locks_submission_id_fkey"',
      '"loot_list_slot_locks_loot_item_id_fkey"',
      '"loot_list_slot_locks_loot_history_id_fkey"',
      '"loot_list_slot_locks_rank_check"',
      '"loot_list_slot_locks_slot_check"',
      '"loot_list_slot_locks_release_reason_check"',
      '"loot_list_slot_locks_release_shape_check"',
    ])
    const foreignKeys = constraints.filter(c => c.includes('FOREIGN KEY'))
    expect(foreignKeys).toHaveLength(4)
    for (const fk of foreignKeys) expect(fk).toMatch(/ON DELETE CASCADE$/)
    expect(constraints[6]).toContain('CHECK ("rank" BETWEEN 1 AND 50)')
    expect(constraints[7]).toContain('CHECK ("slot" >= 1)')
    expect(constraints[8]).toContain(`CHECK ("release_reason" IN ('removed_by_officer', 'award_reassigned'))`)
    expect(constraints[9]).toContain('CHECK (("released_at" IS NULL) = ("release_reason" IS NULL))')
  })

  it('the policy USING clause mirrors loot_submission_items_select, pointed at the lock row', () => {
    const baseline = fs.readFileSync(BASELINE_FILE, 'utf8')
    const mirrored = baseline.match(
      /CREATE POLICY "loot_submission_items_select" ON "public"\."loot_submission_items" FOR SELECT USING ([\s\S]*?);\n/,
    )
    expect(mirrored, 'baseline policy loot_submission_items_select found').not.toBeNull()
    const collapse = (sql: string) => sql.replace(/\s+/g, ' ').trim()
    const expectedClause = collapse(mirrored![1]).replace(
      '"loot_submission_items"."submission_id"',
      '"loot_list_slot_locks"."submission_id"',
    )
    const policy = statements()[6]
    expect(policy.slice(policy.indexOf(' USING ') + ' USING '.length)).toBe(expectedClause)
  })

  it('every statement is re-runnable by its form', () => {
    for (const [i, stmt] of statements().entries()) {
      const reRunnable =
        /\bIF NOT EXISTS\b/i.test(stmt) ||
        /\bIF EXISTS\b/i.test(stmt) ||
        /^SET LOCAL\b/i.test(stmt) ||
        /^ALTER TABLE .* ENABLE ROW LEVEL SECURITY$/i.test(stmt) ||
        /^ALTER FUNCTION .* OWNER TO\b/i.test(stmt) ||
        /^CREATE OR REPLACE FUNCTION\b/i.test(stmt) ||
        /^COMMENT ON\b/i.test(stmt) ||
        /^REVOKE\b/i.test(stmt) ||
        /^GRANT\b/i.test(stmt) ||
        // The policy is re-runnable only because its DROP IF EXISTS directly
        // precedes it in the same transaction.
        (/^CREATE POLICY\b/i.test(stmt) && /^DROP POLICY IF EXISTS\b/i.test(statements()[i - 1] ?? ''))
      expect(reRunnable, `statement ${i + 1} is not re-runnable: ${stmt.slice(0, 80)}`).toBe(true)
    }
  })

  it('adds no trigger or view, drops no table or column, defines one function, and the only REVOKE and GRANT lines are the five expected', () => {
    const raw = statements()
    const executable = raw.map(stripDollarBodies).map(blankStrings).map(blankIdentifiers)
    const forbidden = [
      /\bTRIGGER\b/i,
      /\bVIEW\b/i,
      /\bDROP\s+TABLE\b/i,
      /\bDROP\s+COLUMN\b/i,
      /\bDISABLE\s+ROW LEVEL SECURITY\b/i,
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
    expect(executable.filter(stmt => /^CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\b/i.test(stmt))).toHaveLength(1)
    expect(executable.filter(stmt => /\bDROP\b/i.test(stmt))).toEqual(['DROP POLICY IF EXISTS "x" ON "x"."x"'])

    expect(raw.filter(stmt => /^(REVOKE|GRANT)\b/i.test(stmt))).toEqual([
      `REVOKE ALL ON TABLE ${TABLE} FROM PUBLIC, "anon", "authenticated"`,
      `GRANT SELECT ON TABLE ${TABLE} TO "authenticated"`,
      `GRANT ALL ON TABLE ${TABLE} TO "service_role"`,
      `REVOKE ALL ON FUNCTION ${FUNCTION_SIGNATURE} FROM PUBLIC, "anon"`,
      `GRANT EXECUTE ON FUNCTION ${FUNCTION_SIGNATURE} TO "authenticated", "service_role"`,
    ])
  })

  it('the function head is SECURITY DEFINER with a pinned search_path and the unchanged parameter list', () => {
    const create = statements()[13]
    const head = create.slice(0, create.indexOf('$$'))
    expect(head).toContain('SECURITY DEFINER')
    expect(head).toContain(`SET "search_path" TO 'public', 'pg_temp'`)
    expect(head).toContain('("p_submission_id" "uuid", "p_items" "jsonb")')
  })

  it('the function body keeps the ownership check, the delete then insert, and adds the lock check last', () => {
    const body = statements()[13]
    const at = (needle: string) => {
      const index = body.indexOf(needle)
      expect(index, `function body contains: ${needle}`).toBeGreaterThan(-1)
      return index
    }
    // The three authorization branches and the refusal.
    at('c.user_id = auth.uid()')
    at('s.user_id = auth.uid()')
    at('public.is_guild_officer(s.guild_id)')
    const authorize = at("RAISE EXCEPTION 'Not authorized to modify this submission'")
    // GH #354: delete the live rows, keep the removed ones, insert the payload.
    const remove = at('DELETE FROM loot_submission_items WHERE submission_id = p_submission_id AND removed_at IS NULL')
    const insert = at('INSERT INTO loot_submission_items (submission_id, loot_item_id, rank, slot) SELECT')
    at('FROM jsonb_array_elements(p_items) AS item')
    // The lock check.
    const lockSelect = at('FROM loot_list_slot_locks l')
    at('l.released_at IS NULL')
    at('si.removed_at IS NULL')
    const lockRaise = at("RAISE EXCEPTION 'Rank % is locked to %'")
    at("ERRCODE = 'check_violation'")

    expect(authorize).toBeLessThan(remove)
    expect(remove).toBeLessThan(insert)
    expect(insert).toBeLessThan(lockSelect)
    expect(lockSelect).toBeLessThan(lockRaise)
  })

  it('has the header sections and a Rollback block that drops the table and the column', () => {
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
      'save_submission_items',
      'loot-history/bulk',
      'loot-award',
      'import-string',
      'remove-item',
      'GH #354',
      '--admin',
      '12 seconds',
      '20260727000001',
      '20260930000200',
    ]) {
      expect(raw, `header names ${needle}`).toContain(needle)
    }
    expect(raw).toMatch(/migration-only/i)
    expect(rollbackStatements()).toEqual([
      `DROP TABLE IF EXISTS ${TABLE}`,
      'ALTER TABLE "public"."guild_settings" DROP COLUMN IF EXISTS "award_slot_lock_enabled"',
    ])
  })

  it('has no em dash and no string literal with two consecutive hyphens or a semicolon', () => {
    const raw = readMigrationRaw()
    expect(raw).not.toContain(String.fromCharCode(0x2014))
    const literals = stripComments(raw).match(/'[^']*'/g) ?? []
    for (const literal of literals) {
      expect(literal).not.toContain('--')
      expect(literal).not.toContain(';')
    }
  })
})

// Synthetic ids only: this repo is public.
const OWNER_USER_ID = '00000000-0000-4000-8000-000000000201'
const OFFICER_USER_ID = '00000000-0000-4000-8000-000000000202'
const OTHER_GUILD_USER_ID = '00000000-0000-4000-8000-000000000203'
const EX_MEMBER_USER_ID = '00000000-0000-4000-8000-000000000204'
const GUILD_ID = '00000000-0000-4000-8000-000000000211'
const OTHER_GUILD_ID = '00000000-0000-4000-8000-000000000212'
const RAIDER_CHARACTER_ID = '00000000-0000-4000-8000-000000000221'
const OFFICER_CHARACTER_ID = '00000000-0000-4000-8000-000000000222'
const OTHER_GUILD_CHARACTER_ID = '00000000-0000-4000-8000-000000000223'
const EX_MEMBER_CHARACTER_ID = '00000000-0000-4000-8000-000000000224'
const EXPANSION_ID = '00000000-0000-4000-8000-000000000231'
const TIER_ID = '00000000-0000-4000-8000-000000000232'
const LOCKED_ITEM_ID = '00000000-0000-4000-8000-000000000241'
const OTHER_ITEM_ID = '00000000-0000-4000-8000-000000000242'
const THIRD_ITEM_ID = '00000000-0000-4000-8000-000000000243'
const LIST_ID = '00000000-0000-4000-8000-000000000251'
const HISTORY_ID = '00000000-0000-4000-8000-000000000261'
const LOCK_ID = '00000000-0000-4000-8000-000000000271'

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

const INSERT_LOCK = `INSERT INTO loot_list_slot_locks (guild_id, submission_id, character_id, loot_item_id, rank, slot, loot_history_id)
  VALUES ($1, $2, $3, $4, $5, $6, $7)`

/** Superuser insert of one more award for the same raider, so a case can add
 * a second lock (loot_history_id is unique). Returns the new loot_history id. */
async function freshHistory(itemId: string): Promise<string> {
  const rows = await query<{ id: string }>(
    db,
    `INSERT INTO loot_history (character_id, character_name, loot_item_id, guild_id, raid_tier_id)
     VALUES ($1, 'Test Raider', $2, $3, $4) RETURNING id`,
    [RAIDER_CHARACTER_ID, itemId, GUILD_ID, TIER_ID],
  )
  return rows[0].id
}

/** Insert a lock for LIST_ID at `rank` and `slot` for `historyId`. */
function insertLock(rank: number, slot: number, historyId: string) {
  return db.query(INSERT_LOCK, [GUILD_ID, LIST_ID, RAIDER_CHARACTER_ID, LOCKED_ITEM_ID, rank, slot, historyId])
}

const liveRows = () =>
  query(
    db,
    `SELECT loot_item_id, rank, slot FROM loot_submission_items
     WHERE submission_id = $1 AND removed_at IS NULL ORDER BY rank DESC, slot`,
    [LIST_ID],
  )

const seededRows = [
  { loot_item_id: LOCKED_ITEM_ID, rank: 50, slot: 1 },
  { loot_item_id: OTHER_ITEM_ID, rank: 49, slot: 1 },
]

const saveItems = (userId: string, items: Array<{ loot_item_id: string; rank: number; slot: number }>) =>
  asUser(userId, `SELECT public.save_submission_items($1, $2::jsonb) AS saved`, [LIST_ID, JSON.stringify(items)])

// Payloads that keep, move, drop or replace the locked item at 50-1.
const KEEP = [
  { loot_item_id: LOCKED_ITEM_ID, rank: 50, slot: 1 },
  { loot_item_id: OTHER_ITEM_ID, rank: 45, slot: 1 },
]
const MOVE = [
  { loot_item_id: LOCKED_ITEM_ID, rank: 48, slot: 1 },
  { loot_item_id: OTHER_ITEM_ID, rank: 49, slot: 1 },
]
const DROP = [{ loot_item_id: OTHER_ITEM_ID, rank: 49, slot: 1 }]
const REPLACE = [
  { loot_item_id: THIRD_ITEM_ID, rank: 50, slot: 1 },
  { loot_item_id: LOCKED_ITEM_ID, rank: 49, slot: 1 },
  { loot_item_id: OTHER_ITEM_ID, rank: 48, slot: 1 },
]

/** Count what an authenticated session of `userId` can see in the lock table,
 * after a positive control that the same session works. */
async function visibleLocksAs(userId: string): Promise<number> {
  try {
    await asRole(db, 'authenticated', userId)
    const control = await query<{ n: number }>(db, `SELECT count(*)::int AS n FROM guilds`)
    expect(control).toHaveLength(1)
    const rows = await query<{ n: number }>(db, `SELECT count(*)::int AS n FROM loot_list_slot_locks`)
    return rows[0].n
  } finally {
    await resetRole(db)
  }
}

beforeAll(async () => {
  // Every existing migration, in filename order, this file among them. The
  // hook checks that the chain holds this file, not that it is the newest
  // file, so a later migration cannot fail it (#309). The default 10 s hook
  // timeout is too short for the chain.
  const files = listMigrationFiles()
  expect(files).toContain(MIGRATION_FILE)
  db = await createChainedDb(files)

  // Seed as the superuser, which stands in for the service role.
  for (const [id, email] of [
    [OWNER_USER_ID, 'owner'],
    [OFFICER_USER_ID, 'officer'],
    [OTHER_GUILD_USER_ID, 'other-guild'],
    [EX_MEMBER_USER_ID, 'ex-member'],
  ]) {
    await db.query(`INSERT INTO auth.users (id, email) VALUES ($1, $2)`, [id, `${email}@example.test`])
  }

  // The officer created the guild, so is_guild_officer is true for the officer
  // without a guild_roles row.
  await db.query(`INSERT INTO guilds (id, name, created_by) VALUES ($1, 'Test Guild', $2)`, [GUILD_ID, OFFICER_USER_ID])
  await db.query(`INSERT INTO guilds (id, name) VALUES ($1, 'Other Guild')`, [OTHER_GUILD_ID])

  for (const [id, userId, name] of [
    [RAIDER_CHARACTER_ID, OWNER_USER_ID, 'Test Raider'],
    [OFFICER_CHARACTER_ID, OFFICER_USER_ID, 'Test Officer'],
    [OTHER_GUILD_CHARACTER_ID, OTHER_GUILD_USER_ID, 'Test Other'],
    [EX_MEMBER_CHARACTER_ID, EX_MEMBER_USER_ID, 'Test Exmember'],
  ]) {
    await db.query(`INSERT INTO characters (id, user_id, name) VALUES ($1, $2, $3)`, [id, userId, name])
  }
  await db.query(
    `INSERT INTO character_guild_memberships (character_id, guild_id, role, is_active) VALUES
       ($1, $5, 'Member', true), ($2, $5, 'Officer', true), ($3, $6, 'Member', true), ($4, $5, 'Member', false)`,
    [RAIDER_CHARACTER_ID, OFFICER_CHARACTER_ID, OTHER_GUILD_CHARACTER_ID, EX_MEMBER_CHARACTER_ID, GUILD_ID, OTHER_GUILD_ID],
  )

  await db.query(`INSERT INTO expansions (id, guild_id, name) VALUES ($1, $2, 'Classic')`, [EXPANSION_ID, GUILD_ID])
  await db.query(`INSERT INTO raid_tiers (id, expansion_id, name) VALUES ($1, $2, 'Test Tier')`, [TIER_ID, EXPANSION_ID])
  await db.query(
    `INSERT INTO loot_items (id, raid_tier_id, name, wowhead_id) VALUES
       ($1, $4, 'Locked Item', 1001), ($2, $4, 'Other Item', 1002), ($3, $4, 'Third Item', 1003)`,
    [LOCKED_ITEM_ID, OTHER_ITEM_ID, THIRD_ITEM_ID, TIER_ID],
  )

  // The list is a draft on purpose: a raider edit reverts an approved list to
  // draft before the RPC runs, and enforce_loot_submission_item_rules blocks
  // non-officer writes to an approved list anyway.
  await db.query(
    `INSERT INTO loot_submissions (id, user_id, guild_id, character_id, expansion_id, phase, status)
     VALUES ($1, $2, $3, $4, $5, 1, 'draft')`,
    [LIST_ID, OWNER_USER_ID, GUILD_ID, RAIDER_CHARACTER_ID, EXPANSION_ID],
  )
  await db.query(
    `INSERT INTO loot_submission_items (submission_id, loot_item_id, rank, slot) VALUES ($1, $2, 50, 1), ($1, $3, 49, 1)`,
    [LIST_ID, LOCKED_ITEM_ID, OTHER_ITEM_ID],
  )
  await db.query(
    `INSERT INTO loot_history (id, character_id, character_name, loot_item_id, guild_id, raid_tier_id)
     VALUES ($1, $2, 'Test Raider', $3, $4, $5)`,
    [HISTORY_ID, RAIDER_CHARACTER_ID, LOCKED_ITEM_ID, GUILD_ID, TIER_ID],
  )
  await db.query(
    `INSERT INTO loot_list_slot_locks (id, guild_id, submission_id, character_id, loot_item_id, rank, slot, loot_history_id)
     VALUES ($1, $2, $3, $4, $5, 50, 1, $6)`,
    [LOCK_ID, GUILD_ID, LIST_ID, RAIDER_CHARACTER_ID, LOCKED_ITEM_ID, HISTORY_ID],
  )
}, 180000)

afterAll(async () => {
  await db?.close()
})

describe('award slot locks migration on the full chain (PGlite)', () => {
  describe('columns', () => {
    it('reports the 12 lock columns with the stated types, nullability and defaults', async () => {
      const rows = await query<{
        column_name: string
        data_type: string
        is_nullable: string
        column_default: string | null
      }>(
        db,
        `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'loot_list_slot_locks' ORDER BY ordinal_position`,
      )
      expect(rows).toEqual([
        { column_name: 'id', data_type: 'uuid', is_nullable: 'NO', column_default: 'gen_random_uuid()' },
        { column_name: 'guild_id', data_type: 'uuid', is_nullable: 'NO', column_default: null },
        { column_name: 'submission_id', data_type: 'uuid', is_nullable: 'NO', column_default: null },
        { column_name: 'character_id', data_type: 'uuid', is_nullable: 'NO', column_default: null },
        { column_name: 'loot_item_id', data_type: 'uuid', is_nullable: 'NO', column_default: null },
        { column_name: 'rank', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'slot', data_type: 'integer', is_nullable: 'NO', column_default: null },
        { column_name: 'loot_history_id', data_type: 'uuid', is_nullable: 'NO', column_default: null },
        { column_name: 'locked_at', data_type: 'timestamp with time zone', is_nullable: 'NO', column_default: 'now()' },
        { column_name: 'released_at', data_type: 'timestamp with time zone', is_nullable: 'YES', column_default: null },
        { column_name: 'released_by', data_type: 'uuid', is_nullable: 'YES', column_default: null },
        { column_name: 'release_reason', data_type: 'text', is_nullable: 'YES', column_default: null },
      ])
    })

    it('adds guild_settings.award_slot_lock_enabled as boolean, not null, default false', async () => {
      const rows = await query(
        db,
        `SELECT data_type, is_nullable, column_default FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'guild_settings' AND column_name = 'award_slot_lock_enabled'`,
      )
      expect(rows).toEqual([{ data_type: 'boolean', is_nullable: 'NO', column_default: 'false' }])
    })

    it('has the foreign keys with ON DELETE CASCADE and the two partial indexes', async () => {
      const fks = await query<{ conname: string; confdeltype: string }>(
        db,
        `SELECT conname, confdeltype FROM pg_constraint
         WHERE conrelid = 'public.loot_list_slot_locks'::regclass AND contype = 'f' ORDER BY conname`,
      )
      expect(fks.map(r => r.conname)).toEqual([
        'loot_list_slot_locks_guild_id_fkey',
        'loot_list_slot_locks_loot_history_id_fkey',
        'loot_list_slot_locks_loot_item_id_fkey',
        'loot_list_slot_locks_submission_id_fkey',
      ])
      for (const fk of fks) expect(fk.confdeltype, fk.conname).toBe('c')

      const indexes = await query<{ indexname: string; indexdef: string }>(
        db,
        `SELECT indexname, indexdef FROM pg_indexes
         WHERE schemaname = 'public' AND tablename = 'loot_list_slot_locks' AND indexname LIKE 'idx_%' ORDER BY indexname`,
      )
      expect(indexes.map(r => r.indexname)).toEqual([
        'idx_loot_list_slot_locks_live_position',
        'idx_loot_list_slot_locks_live_submission',
      ])
      for (const index of indexes) expect(index.indexdef, index.indexname).toContain('WHERE (released_at IS NULL)')
      expect(indexes[0].indexdef).toContain('UNIQUE')
    })
  })

  describe('constraints (superuser, rolled back)', () => {
    it('rejects rank 0 and 51 with the rank CHECK (23514) and accepts rank 1 and 50', async () => {
      for (const bad of [0, 51]) {
        const error = await expectRejected(
          db,
          () => insertLock(bad, 1, HISTORY_ID),
          'loot_list_slot_locks_rank_check',
        )
        expect(error.code, `rank ${bad}`).toBe(CHECK_VIOLATION)
      }
      // Slot 2 keeps clear of the seeded live lock at rank 50, slot 1.
      for (const good of [1, 50]) {
        await inRolledBackTransaction(db, async () => {
          const historyId = await freshHistory(OTHER_ITEM_ID)
          const result = await insertLock(good, 2, historyId)
          expect(result.affectedRows).toBe(1)
        })
      }
    })

    it('rejects slot 0 with the slot CHECK (23514)', async () => {
      const error = await expectRejected(db, () => insertLock(3, 0, HISTORY_ID), 'loot_list_slot_locks_slot_check')
      expect(error.code).toBe(CHECK_VIOLATION)
    })

    it('rejects an unknown release_reason (23514) and a release that is half set (23514)', async () => {
      const reason = await expectRejected(
        db,
        () =>
          db.query(`UPDATE loot_list_slot_locks SET released_at = now(), release_reason = 'other' WHERE id = $1`, [LOCK_ID]),
        'loot_list_slot_locks_release_reason_check',
      )
      expect(reason.code).toBe(CHECK_VIOLATION)

      const releasedWithoutReason = await expectRejected(
        db,
        () => db.query(`UPDATE loot_list_slot_locks SET released_at = now() WHERE id = $1`, [LOCK_ID]),
        'loot_list_slot_locks_release_shape_check',
      )
      expect(releasedWithoutReason.code).toBe(CHECK_VIOLATION)

      const reasonWithoutRelease = await expectRejected(
        db,
        () => db.query(`UPDATE loot_list_slot_locks SET release_reason = 'removed_by_officer' WHERE id = $1`, [LOCK_ID]),
        'loot_list_slot_locks_release_shape_check',
      )
      expect(reasonWithoutRelease.code).toBe(CHECK_VIOLATION)
    })

    it('rejects a second live lock at the same list, rank and slot (23505) and accepts it once the first is released', async () => {
      const error = await expectRejected(
        db,
        async () => insertLock(50, 1, await freshHistory(OTHER_ITEM_ID)),
        'idx_loot_list_slot_locks_live_position',
      )
      expect(error.code).toBe(UNIQUE_VIOLATION)

      await inRolledBackTransaction(db, async () => {
        await db.query(
          `UPDATE loot_list_slot_locks SET released_at = now(), release_reason = 'removed_by_officer' WHERE id = $1`,
          [LOCK_ID],
        )
        const result = await insertLock(50, 1, await freshHistory(OTHER_ITEM_ID))
        expect(result.affectedRows).toBe(1)
      })
    })

    it('rejects a duplicate loot_history_id (23505), and ON CONFLICT (loot_history_id) DO NOTHING inserts 0 rows, the helper path', async () => {
      const error = await expectRejected(db, () => insertLock(3, 1, HISTORY_ID), 'loot_list_slot_locks_loot_history_id_key')
      expect(error.code).toBe(UNIQUE_VIOLATION)

      await inRolledBackTransaction(db, async () => {
        const result = await db.query(`${INSERT_LOCK} ON CONFLICT (loot_history_id) DO NOTHING`, [
          GUILD_ID,
          LIST_ID,
          RAIDER_CHARACTER_ID,
          LOCKED_ITEM_ID,
          3,
          1,
          HISTORY_ID,
        ])
        expect(result.affectedRows).toBe(0)
      })
    })

    it('removes the lock with its loot_history row (cascade), so undoing an award frees the rank', async () => {
      await inRolledBackTransaction(db, async () => {
        await db.query(`DELETE FROM loot_history WHERE id = $1`, [HISTORY_ID])
        const rows = await query<{ n: number }>(
          db,
          `SELECT count(*)::int AS n FROM loot_list_slot_locks WHERE loot_history_id = $1`,
          [HISTORY_ID],
        )
        expect(rows).toEqual([{ n: 0 }])
      })
      const after = await query<{ n: number }>(db, `SELECT count(*)::int AS n FROM loot_list_slot_locks WHERE id = $1`, [LOCK_ID])
      expect(after).toEqual([{ n: 1 }])
    })
  })

  describe('access: RLS, read for list-guild members, writes for the service role only', () => {
    it('has RLS enabled and exactly one SELECT policy for authenticated', async () => {
      const flags = await query<{ relrowsecurity: boolean }>(
        db,
        `SELECT relrowsecurity FROM pg_class WHERE oid = 'public.loot_list_slot_locks'::regclass`,
      )
      expect(flags).toEqual([{ relrowsecurity: true }])
      const policies = await query(
        db,
        `SELECT policyname, cmd, array_to_string(roles, ',') AS roles FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'loot_list_slot_locks'`,
      )
      expect(policies).toEqual([{ policyname: 'loot_list_slot_locks_select', cmd: 'SELECT', roles: 'authenticated' }])
    })

    it('grants anon nothing, authenticated SELECT only, and service_role everything', async () => {
      const has = async (role: string, privilege: string) => {
        const rows = await query<{ ok: boolean }>(db, `SELECT has_table_privilege($1, 'public.loot_list_slot_locks', $2) AS ok`, [
          role,
          privilege,
        ])
        return rows[0].ok
      }
      for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
        expect(await has('anon', privilege), `anon ${privilege}`).toBe(false)
        expect(await has('authenticated', privilege), `authenticated ${privilege}`).toBe(privilege === 'SELECT')
        expect(await has('service_role', privilege), `service_role ${privilege}`).toBe(true)
      }
    })

    it('lets the list owner and a guild officer see the seeded lock', async () => {
      expect(await visibleLocksAs(OWNER_USER_ID)).toBe(1)
      expect(await visibleLocksAs(OFFICER_USER_ID)).toBe(1)
    })

    it('hides the lock from an active member of another guild and from an inactive member of this guild', async () => {
      expect(await visibleLocksAs(OTHER_GUILD_USER_ID)).toBe(0)
      expect(await visibleLocksAs(EX_MEMBER_USER_ID)).toBe(0)
    })

    it('rejects anon SELECT with 42501, beside a positive control for the same role', async () => {
      try {
        await asRole(db, 'anon', null)
        const control = await query<{ n: number }>(db, `SELECT count(*)::int AS n FROM guilds`)
        expect(control).toHaveLength(1)
      } finally {
        await resetRole(db)
      }

      const error = await expectRejected(
        db,
        async () => {
          await asRole(db, 'anon', null)
          return db.query(`SELECT id FROM loot_list_slot_locks`)
        },
        'permission denied',
      )
      expect(error.code).toBe(INSUFFICIENT_PRIVILEGE)
    })

    it('rejects the list owner INSERT, UPDATE and DELETE with 42501, after the same session read the lock', async () => {
      expect(await visibleLocksAs(OWNER_USER_ID)).toBe(1)

      const insert = await rejectedAs(
        OWNER_USER_ID,
        INSERT_LOCK,
        [GUILD_ID, LIST_ID, RAIDER_CHARACTER_ID, LOCKED_ITEM_ID, 3, 1, HISTORY_ID],
        'permission denied',
      )
      expect(insert.code).toBe(INSUFFICIENT_PRIVILEGE)

      const update = await rejectedAs(
        OWNER_USER_ID,
        `UPDATE loot_list_slot_locks SET released_at = now() WHERE id = $1`,
        [LOCK_ID],
        'permission denied',
      )
      expect(update.code).toBe(INSUFFICIENT_PRIVILEGE)

      const remove = await rejectedAs(OWNER_USER_ID, `DELETE FROM loot_list_slot_locks WHERE id = $1`, [LOCK_ID], 'permission denied')
      expect(remove.code).toBe(INSUFFICIENT_PRIVILEGE)
    })

    it('lets the service_role role insert a second lock and release the seeded one', async () => {
      await inRolledBackTransaction(db, async () => {
        const historyId = await freshHistory(OTHER_ITEM_ID)
        await db.exec('SET role service_role')
        const inserted = await insertLock(3, 1, historyId)
        expect(inserted.affectedRows).toBe(1)
        const released = await db.query(
          `UPDATE loot_list_slot_locks SET released_at = now(), release_reason = 'award_reassigned' WHERE id = $1`,
          [LOCK_ID],
        )
        expect(released.affectedRows).toBe(1)
        const rows = await query<{ n: number }>(db, `SELECT count(*)::int AS n FROM loot_list_slot_locks`)
        expect(rows).toEqual([{ n: 2 }])
      })
    })
  })

  describe('save_submission_items enforces live locks', () => {
    it('saves a payload that keeps the locked item at its rank and slot (positive control for the same role and RPC)', async () => {
      await inRolledBackTransaction(db, async () => {
        const result = await saveItems(OWNER_USER_ID, KEEP)
        expect(result.rows).toEqual([{ saved: 2 }])
        await resetRole(db)
        expect(await liveRows()).toEqual([
          { loot_item_id: LOCKED_ITEM_ID, rank: 50, slot: 1 },
          { loot_item_id: OTHER_ITEM_ID, rank: 45, slot: 1 },
        ])
      })
    })

    for (const [name, payload] of [
      ['moves the locked item to another rank', MOVE],
      ['drops the locked item', DROP],
      ['puts another item into the locked rank and slot', REPLACE],
    ] as const) {
      it(`refuses, as the list owner, a payload that ${name}, with the lock message and 23514`, async () => {
        const error = await expectRejected(db, () => saveItems(OWNER_USER_ID, [...payload]), LOCK_MESSAGE)
        expect(error.message).toBe(LOCK_MESSAGE)
        expect(error.code).toBe(CHECK_VIOLATION)
      })
    }

    it('leaves the live rows exactly as seeded after a refused save run as a plain statement', async () => {
      // A plain statement on purpose: a rolled-back transaction would hide a
      // refusal that fired after the RPC had already replaced the list.
      await asRole(db, 'authenticated', OWNER_USER_ID)
      try {
        await expect(
          db.query(`SELECT public.save_submission_items($1, $2::jsonb)`, [LIST_ID, JSON.stringify(MOVE)]),
        ).rejects.toThrow(LOCK_MESSAGE)
      } finally {
        await resetRole(db)
      }
      expect(await liveRows()).toEqual(seededRows)
    })

    it('applies the same rule to a guild officer: keep accepted, drop refused', async () => {
      await inRolledBackTransaction(db, async () => {
        const result = await saveItems(OFFICER_USER_ID, KEEP)
        expect(result.rows).toEqual([{ saved: 2 }])
      })
      const error = await expectRejected(db, () => saveItems(OFFICER_USER_ID, [...DROP]), LOCK_MESSAGE)
      expect(error.message).toBe(LOCK_MESSAGE)
      expect(error.code).toBe(CHECK_VIOLATION)
    })

    it('stops enforcing a lock once it is released', async () => {
      await inRolledBackTransaction(db, async () => {
        await db.query(
          `UPDATE loot_list_slot_locks SET released_at = now(), release_reason = 'removed_by_officer' WHERE id = $1`,
          [LOCK_ID],
        )
        const result = await saveItems(OWNER_USER_ID, DROP)
        expect(result.rows).toEqual([{ saved: 1 }])
      })
    })

    it('still refuses a user with no rights on the list with the ownership message', async () => {
      const error = await expectRejected(db, () => saveItems(OTHER_GUILD_USER_ID, [...KEEP]), AUTH_MESSAGE)
      expect(error.message).toBe(AUTH_MESSAGE)
    })

    it('keeps the execute grants: anon none, authenticated and service_role yes', async () => {
      const can = async (role: string) => {
        const rows = await query<{ ok: boolean }>(
          db,
          `SELECT has_function_privilege($1, 'public.save_submission_items(uuid, jsonb)', 'EXECUTE') AS ok`,
          [role],
        )
        return rows[0].ok
      }
      expect(await can('anon')).toBe(false)
      expect(await can('authenticated')).toBe(true)
      expect(await can('service_role')).toBe(true)
    })
  })

  describe('idempotency', () => {
    it('applies the file twice more without error and keeps one table, 10 constraints, one policy, RLS on, no anon privilege, one column and the lock check', async () => {
      const sql = fs.readFileSync(MIGRATION_FILE, 'utf8')
      await db.exec('SET search_path TO public, extensions; RESET role;')
      await expect(db.exec(sql)).resolves.toBeDefined()
      await expect(db.exec(sql)).resolves.toBeDefined()

      const tables = await query<{ n: number }>(
        db,
        `SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relname = 'loot_list_slot_locks'`,
      )
      expect(tables).toEqual([{ n: 1 }])

      const constraints = await query<{ n: number }>(
        db,
        `SELECT count(*)::int AS n FROM pg_constraint
         WHERE conrelid = 'public.loot_list_slot_locks'::regclass AND contype IN ('p', 'u', 'f', 'c')`,
      )
      expect(constraints).toEqual([{ n: 10 }])

      const flags = await query<{ relrowsecurity: boolean }>(
        db,
        `SELECT relrowsecurity FROM pg_class WHERE oid = 'public.loot_list_slot_locks'::regclass`,
      )
      expect(flags).toEqual([{ relrowsecurity: true }])

      const policies = await query<{ n: number }>(
        db,
        `SELECT count(*)::int AS n FROM pg_policies WHERE schemaname = 'public' AND tablename = 'loot_list_slot_locks'`,
      )
      expect(policies).toEqual([{ n: 1 }])

      const anon = await query<{ ok: boolean }>(
        db,
        `SELECT has_table_privilege('anon', 'public.loot_list_slot_locks', 'SELECT') AS ok`,
      )
      expect(anon).toEqual([{ ok: false }])

      const columns = await query<{ n: number }>(
        db,
        `SELECT count(*)::int AS n FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'guild_settings' AND column_name = 'award_slot_lock_enabled'`,
      )
      expect(columns).toEqual([{ n: 1 }])

      // The function was replaced twice; the lock check must still be in it.
      const error = await expectRejected(db, () => saveItems(OWNER_USER_ID, [...DROP]), LOCK_MESSAGE)
      expect(error.code).toBe(CHECK_VIOLATION)
    })
  })
})
