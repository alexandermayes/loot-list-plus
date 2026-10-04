import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Quick task 261003-m45: this locks the shape of the migration that keeps
// raid team, donation and attendance rows pointing at characters of their
// own guild. The behaviour itself is proven in a PGlite harness outside the
// repo. This test pins what the file may contain: the exact statement
// order, the two SECURITY DEFINER trigger functions and their triggers, the
// error contract and the header Rollback block.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20261003220000'
const MIGRATION_FILE = path.join(
  MIGRATIONS_DIR,
  `${MIGRATION_TIMESTAMP}_team_donation_attendance_character_rules.sql`,
)
/** OD-1 resolution: an attendance row accepts any membership row of the
 * character in the raid event's guild, active or not. Typed as `string`
 * (not a narrower union) so the `=== 'active'` comparisons below remain
 * meaningful to tsc regardless of which branch is live. */
const ATT_RULE: string = 'any'

/** Strip line comments (trimmed lines starting with `--`, and trailing `--`
 * to end of line on a code line). No string literal in this SQL contains
 * two hyphens (checked below), so this is safe. */
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
 * tokens (a function body is full of them). Chunks are trimmed, empty chunks
 * dropped, and whitespace collapsed per chunk. */
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

/** Blank out the contents of every single-quoted string literal (handling
 * '' escapes), so keyword checks never match words inside COMMENT or RAISE
 * text. */
function blankStrings(sql: string): string {
  return sql.replace(/'(?:[^']|'')*'/g, "''")
}

/** Remove every dollar-quoted body, leaving `$$$$`. */
function withoutBodies(sql: string): string {
  return sql.replace(/\$\$[\s\S]*?\$\$/g, '$$$$')
}

/** A CREATE FUNCTION statement split into the text before `AS $$` and the
 * dollar-quoted body. */
function functionParts(fn: string): { prefix: string; body: string } {
  const open = fn.indexOf('$$')
  const close = fn.indexOf('$$', open + 2)
  const prefix = fn.slice(0, open).replace(/\s*AS\s*$/i, '')
  return { prefix, body: fn.slice(open + 2, close) }
}

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

/** Optional double quotes around an identifier. */
const q = (name: string) => `"?${name}"?`
const ref = (name: string) => `${q('public')}\\.${q(name)}`

/** The D-01 statement list, in order (13 statements). Index 0 is the SET
 * LOCAL lock_timeout statement. */
const FN_START = 1
const DON_TRIGGER_START = 6
const ATT_FN_START = 8
const ATT_TRIGGER_START = 11

const EXPECTED_ORDER: RegExp[] = [
  /^SET LOCAL "?lock_timeout"? = '5s'$/i,
  new RegExp(`^CREATE OR REPLACE FUNCTION ${ref('enforce_guild_character_refs')}\\(\\)`, 'i'),
  new RegExp(`^COMMENT ON FUNCTION ${ref('enforce_guild_character_refs')}\\(\\) IS `, 'i'),
  new RegExp(`^REVOKE ALL ON FUNCTION ${ref('enforce_guild_character_refs')}\\(\\) FROM `, 'i'),
  new RegExp(`^CREATE OR REPLACE TRIGGER ${q('enforce_guild_character_refs')} BEFORE INSERT OR UPDATE OF "guild_id", "character_id" ON ${ref('raid_team_members')} FOR EACH ROW EXECUTE FUNCTION ${ref('enforce_guild_character_refs')}\\(\\)$`, 'i'),
  new RegExp(`^COMMENT ON TRIGGER ${q('enforce_guild_character_refs')} ON ${ref('raid_team_members')} IS `, 'i'),
  new RegExp(`^CREATE OR REPLACE TRIGGER ${q('enforce_guild_character_refs')} BEFORE INSERT OR UPDATE OF "guild_id", "character_id" ON ${ref('donation_records')} FOR EACH ROW EXECUTE FUNCTION ${ref('enforce_guild_character_refs')}\\(\\)$`, 'i'),
  new RegExp(`^COMMENT ON TRIGGER ${q('enforce_guild_character_refs')} ON ${ref('donation_records')} IS `, 'i'),
  new RegExp(`^CREATE OR REPLACE FUNCTION ${ref('enforce_attendance_character_refs')}\\(\\)`, 'i'),
  new RegExp(`^COMMENT ON FUNCTION ${ref('enforce_attendance_character_refs')}\\(\\) IS `, 'i'),
  new RegExp(`^REVOKE ALL ON FUNCTION ${ref('enforce_attendance_character_refs')}\\(\\) FROM `, 'i'),
  new RegExp(`^CREATE OR REPLACE TRIGGER ${q('enforce_attendance_character_refs')} BEFORE INSERT OR UPDATE OF "raid_event_id", "character_id" ON ${ref('attendance_records')} FOR EACH ROW EXECUTE FUNCTION ${ref('enforce_attendance_character_refs')}\\(\\)$`, 'i'),
  new RegExp(`^COMMENT ON TRIGGER ${q('enforce_attendance_character_refs')} ON ${ref('attendance_records')} IS `, 'i'),
]

/** The em dash character, built from its code point so this file never contains one. */
const EM_DASH = String.fromCharCode(0x2014)

const roleList = (list: string) => list.split(',').map(role => role.trim().replace(/^"|"$/g, ''))

describe('team, donation and attendance character rules migration shape (quick task 261003-m45)', () => {
  it('the file exists, has a unique timestamp and sorts after the newest migration at planning time (#309)', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    // Anchored to 20261003200000 (quick task 261003-kfj), the newest migration
    // that existed when this file was written, not a live directory scan.
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20261003200000)
    const sameTimestamp = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(name => name.endsWith('.sql') && name !== path.basename(MIGRATION_FILE))
      .filter(name => name.slice(0, 14) === MIGRATION_TIMESTAMP)
    expect(sameTimestamp).toEqual([])
  })

  it('has exactly the expected statements in order', () => {
    const stmts = statements()
    expect(stmts).toHaveLength(EXPECTED_ORDER.length)
    stmts.forEach((stmt, i) => {
      expect(stmt, `statement ${i + 1}`).toMatch(EXPECTED_ORDER[i])
    })
  })

  it('each function has no parameters, returns trigger, is plpgsql SECURITY DEFINER with search_path public, pg_temp, and the file has exactly two dollar-quoted bodies', () => {
    const code = stripComments(readMigrationRaw())
    expect((code.match(/\$\$/g) ?? []).length).toBe(4)
    for (const [start, fn] of [
      [FN_START, 'enforce_guild_character_refs'],
      [ATT_FN_START, 'enforce_attendance_character_refs'],
    ] as const) {
      const { prefix } = functionParts(statements()[start])
      expect(prefix, fn).toMatch(new RegExp(`^CREATE OR REPLACE FUNCTION ${ref(fn)}\\(\\) RETURNS ${q('trigger')} `, 'i'))
      expect(prefix, fn).toMatch(/LANGUAGE "?plpgsql"? SECURITY DEFINER/i)
      expect(prefix, fn).toMatch(/SET "?search_path"? TO 'public', 'pg_temp'$/i)
    }
  })

  it('the enforce_guild_character_refs body has every D-02 element and is read-only', () => {
    const { body } = functionParts(statements()[FN_START])
    const collapsed = body.replace(/\s+/g, ' ')
    expect(collapsed).toMatch(/NEW\.guild_id IS NULL OR NEW\.character_id IS NULL/)
    expect(collapsed).toMatch(/TG_OP = 'UPDATE'/)
    expect(collapsed).toMatch(/NEW\.guild_id IS NOT DISTINCT FROM OLD\.guild_id/)
    expect(collapsed).toMatch(/NEW\.character_id IS NOT DISTINCT FROM OLD\.character_id/)
    expect(collapsed).toMatch(/FROM public\.character_guild_memberships cgm/)
    expect(collapsed).toMatch(/cgm\.character_id = NEW\.character_id/)
    expect(collapsed).toMatch(/cgm\.guild_id = NEW\.guild_id/)
    expect(collapsed).toMatch(/cgm\.is_active = true/)
    expect(collapsed).toMatch(/coalesce\(current_setting\('role', true\), ''\)/)
    expect(collapsed).toMatch(/NOT public\.is_guild_officer\(NEW\.guild_id\)/)
    expect(collapsed).toMatch(/MESSAGE = 'new row violates row-level security policy for table "' \|\| TG_TABLE_NAME \|\| '"'/)
    expect(collapsed).toMatch(/ERRCODE = 'insufficient_privilege'/)
    expect(collapsed).toMatch(/MESSAGE = TG_TABLE_NAME \|\| '\.character_id is not an active member of this guild'/)
    expect(collapsed).toMatch(/ERRCODE = 'check_violation'/)
    expect(collapsed).toMatch(/DETAIL = format\('character_id %s, guild_id %s', NEW\.character_id, NEW\.guild_id\)/)

    const blanked = blankStrings(body)
    expect(blanked).not.toMatch(/\bINSERT\s+INTO\b/i)
    expect(blanked).not.toMatch(/\bUPDATE\s+"?public"?\./i)
    expect(blanked).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(blanked).not.toMatch(/\bPERFORM\b/i)
    expect(blanked).not.toMatch(/\bEXECUTE\b/i)
    expect(body).not.toMatch(/MESSAGE = format\(/)
  })

  it('the enforce_attendance_character_refs body has every D-03 element for the OD-1 resolution and is read-only', () => {
    const { body } = functionParts(statements()[ATT_FN_START])
    const collapsed = body.replace(/\s+/g, ' ')
    expect(collapsed).toMatch(/NEW\.character_id IS NULL OR NEW\.raid_event_id IS NULL/)
    expect(collapsed).toMatch(/SELECT re\.guild_id INTO v_guild FROM public\.raid_events re WHERE re\.id = NEW\.raid_event_id/)
    expect(collapsed).toMatch(/v_guild IS NULL/)
    expect(collapsed).toMatch(/TG_OP = 'UPDATE'/)
    expect(collapsed).toMatch(/NEW\.character_id IS NOT DISTINCT FROM OLD\.character_id/)
    expect(collapsed).toMatch(/FROM public\.raid_events re WHERE re\.id = OLD\.raid_event_id/)
    expect(collapsed).toMatch(/v_old_guild IS NOT DISTINCT FROM v_guild/)
    expect(collapsed).toMatch(/FROM public\.character_guild_memberships cgm/)
    expect(collapsed).toMatch(/cgm\.character_id = NEW\.character_id/)
    expect(collapsed).toMatch(/cgm\.guild_id = v_guild/)
    if (ATT_RULE === 'active') {
      expect(collapsed.match(/cgm\.is_active = true/g) ?? []).toHaveLength(1)
    } else {
      expect(collapsed).not.toMatch(/is_active/)
    }
    expect(collapsed).toMatch(/NOT public\.is_guild_officer\(v_guild\)/)
    expect(collapsed).toMatch(/MESSAGE = 'new row violates row-level security policy for table "attendance_records"'/)
    expect(collapsed).toMatch(/ERRCODE = 'insufficient_privilege'/)
    const expectedMessage =
      ATT_RULE === 'active'
        ? 'attendance_records.character_id is not an active member of this guild'
        : 'attendance_records.character_id is not a member of this guild'
    expect(collapsed).toContain(`MESSAGE = '${expectedMessage}'`)
    expect(collapsed).toMatch(/ERRCODE = 'check_violation'/)
    expect(collapsed).toMatch(/DETAIL = format\('character_id %s, raid_event_id %s', NEW\.character_id, NEW\.raid_event_id\)/)

    const blanked = blankStrings(body)
    expect(blanked).not.toMatch(/\bINSERT\s+INTO\b/i)
    expect(blanked).not.toMatch(/\bUPDATE\s+"?public"?\./i)
    expect(blanked).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(blanked).not.toMatch(/\bPERFORM\b/i)
    expect(blanked).not.toMatch(/\bEXECUTE\b/i)
    expect(body).not.toMatch(/MESSAGE = format\(/)
  })

  it('both functions revoke ALL from PUBLIC, anon and authenticated, with no GRANT in the file', () => {
    const stmts = statements()
    for (const start of [FN_START, ATT_FN_START]) {
      const revoke = stmts[start + 2]
      const m = revoke.match(/ FROM (.+)$/i)
      expect(m).not.toBeNull()
      expect(roleList(m![1])).toEqual(['PUBLIC', 'anon', 'authenticated'])
    }
    expect(stmts.some(stmt => /^GRANT /i.test(stmt))).toBe(false)
  })

  it('exactly two triggers use enforce_guild_character_refs (raid_team_members, donation_records) and one uses enforce_attendance_character_refs (attendance_records)', () => {
    const stmts = statements()
    expect(stmts[FN_START + 3]).toMatch(/^CREATE OR REPLACE TRIGGER "enforce_guild_character_refs" BEFORE INSERT OR UPDATE OF "guild_id", "character_id" ON "public"\."raid_team_members" FOR EACH ROW EXECUTE FUNCTION "public"\."enforce_guild_character_refs"\(\)$/i)
    expect(stmts[FN_START + 4]).toMatch(/^COMMENT ON TRIGGER "enforce_guild_character_refs" ON "public"\."raid_team_members" IS /i)
    expect(stmts[DON_TRIGGER_START]).toMatch(/^CREATE OR REPLACE TRIGGER "enforce_guild_character_refs" BEFORE INSERT OR UPDATE OF "guild_id", "character_id" ON "public"\."donation_records" FOR EACH ROW EXECUTE FUNCTION "public"\."enforce_guild_character_refs"\(\)$/i)
    expect(stmts[DON_TRIGGER_START + 1]).toMatch(/^COMMENT ON TRIGGER "enforce_guild_character_refs" ON "public"\."donation_records" IS /i)
    expect(stmts[ATT_TRIGGER_START]).toMatch(/^CREATE OR REPLACE TRIGGER "enforce_attendance_character_refs" BEFORE INSERT OR UPDATE OF "raid_event_id", "character_id" ON "public"\."attendance_records" FOR EACH ROW EXECUTE FUNCTION "public"\."enforce_attendance_character_refs"\(\)$/i)
    expect(stmts[ATT_TRIGGER_START + 1]).toMatch(/^COMMENT ON TRIGGER "enforce_attendance_character_refs" ON "public"\."attendance_records" IS /i)

    const guildTriggers = stmts.filter(stmt => /^CREATE OR REPLACE TRIGGER "enforce_guild_character_refs"/i.test(stmt))
    const attTriggers = stmts.filter(stmt => /^CREATE OR REPLACE TRIGGER "enforce_attendance_character_refs"/i.test(stmt))
    expect(guildTriggers).toHaveLength(2)
    expect(attTriggers).toHaveLength(1)
  })

  it('has no ALTER, DROP, TRUNCATE, INSERT, UPDATE, DELETE, DO or GRANT statement, and no POLICY or CASCADE keyword', () => {
    const blanked = blankStrings(withoutBodies(stripComments(readMigrationRaw())))
    for (const stmt of statements()) {
      expect(stmt).not.toMatch(/^(ALTER|DROP|TRUNCATE|INSERT|UPDATE|DELETE|DO|GRANT)\b/i)
    }
    expect(blanked).not.toMatch(/\bPOLICY\b/i)
    expect(blanked).not.toMatch(/\bCASCADE\b/i)
  })

  it('the Rollback block matches all five D-01 lines in order', () => {
    expect(rollbackStatements()).toEqual([
      'DROP TRIGGER IF EXISTS "enforce_guild_character_refs" ON "public"."raid_team_members"',
      'DROP TRIGGER IF EXISTS "enforce_guild_character_refs" ON "public"."donation_records"',
      'DROP FUNCTION IF EXISTS "public"."enforce_guild_character_refs"()',
      'DROP TRIGGER IF EXISTS "enforce_attendance_character_refs" ON "public"."attendance_records"',
      'DROP FUNCTION IF EXISTS "public"."enforce_attendance_character_refs"()',
    ])
  })

  it('has no em dash, no two consecutive hyphens inside a COMMENT string, and the header has the D-01 section headings in order', () => {
    const raw = readMigrationRaw()
    expect(raw).not.toContain(EM_DASH)
    const comments = statements().filter(stmt => /^COMMENT ON /i.test(stmt))
    for (const stmt of comments) {
      expect(stmt).not.toContain('--')
    }
    expect(raw.split('\n')[0]).toBe('-- Raid team, donation and attendance rows point only at characters of their guild.')
    const headings = ['Problem', 'Fix', 'Membership rule', 'Readers and writers checked', 'Error contract', 'Production safety', 'Not changed', 'Deploy', 'Rollback']
    let lastIndex = -1
    for (const heading of headings) {
      const re = new RegExp(`^-- ${heading}\\n-- -+$`, 'm')
      expect(raw, heading).toMatch(re)
      const idx = raw.search(re)
      expect(idx, `${heading} out of order`).toBeGreaterThan(lastIndex)
      lastIndex = idx
    }
  })

  it('every new function revokes PUBLIC (the 20260930000200 ratchet)', () => {
    const creates = statements().filter(stmt => /^CREATE OR REPLACE FUNCTION /i.test(stmt))
    const revokes = statements().filter(stmt => /^REVOKE /i.test(stmt))
    for (const create of creates) {
      const name = create.match(/^CREATE OR REPLACE FUNCTION "public"\."(\w+)"/)![1]
      expect(revokes.some(r => r.includes(`"${name}"`) && roleList(r.match(/ FROM (.+)$/i)![1]).includes('PUBLIC')), name).toBe(true)
    }
  })
})
