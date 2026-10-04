import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Quick task 261003-t28: this locks the shape of the migration that makes
// blp_credits and blp_tracking server-written only, and keeps a reserve
// award pointing at a submission (and, with OD-1 resolved as option A, a
// loot item) of its own reserve run. The behaviour itself is proven in a
// PGlite harness outside the repo. This test pins what the file may
// contain: the exact statement order, the dropped and recreated policy
// texts, the trigger function and its body, the error contract and the
// header Rollback block.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20261003230000'
const MIGRATION_FILE = path.join(MIGRATIONS_DIR, `${MIGRATION_TIMESTAMP}_blp_and_reserve_award_rules.sql`)
const BASELINE_FILE = path.join(MIGRATIONS_DIR, '20260101000000_baseline_schema.sql')

/** OD-1 resolution: a reserve award also requires its loot item to be in the
 * raid tier of its run. Typed as `string` (not a narrower union) so the
 * `=== 'tier'` comparisons below remain meaningful to tsc regardless of
 * which branch is live (the 261003-m45 deviation). */
const ITEM_RULE: string = 'tier'

const DROPPED_POLICIES: Array<{ name: string; table: string }> = [
  { name: 'Officers can insert BLP credits', table: 'blp_credits' },
  { name: 'Officers can update BLP credits', table: 'blp_credits' },
  { name: 'Officers can delete BLP credits', table: 'blp_credits' },
  { name: 'Officers can insert BLP', table: 'blp_tracking' },
  { name: 'Officers can update BLP', table: 'blp_tracking' },
  { name: 'Officers can delete BLP', table: 'blp_tracking' },
]

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

/** Blank out every double-quoted identifier, so an apostrophe inside a
 * policy name is never read as a string quote by blankStrings or by the
 * forbidden-statement check. */
function blankIdentifiers(sql: string): string {
  return sql.replace(/"(?:[^"]|"")*"/g, '"x"')
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

/** The exact baseline CREATE POLICY statement for a given policy name and
 * table, from 'CREATE POLICY "name" ON "public"."table"' up to the next
 * semicolon, whitespace collapsed. Fails when the prefix is not found
 * exactly once in the baseline file. */
function baselinePolicy(name: string, table: string): string {
  const baseline = fs.readFileSync(BASELINE_FILE, 'utf8')
  const prefix = `CREATE POLICY "${name}" ON "public"."${table}"`
  const occurrences = baseline.split(prefix).length - 1
  expect(occurrences, `expected exactly one '${prefix}' in the baseline, found ${occurrences}`).toBe(1)
  const start = baseline.indexOf(prefix)
  const end = baseline.indexOf(';', start)
  expect(end, `no terminating semicolon found for '${prefix}'`).toBeGreaterThan(-1)
  return baseline
    .slice(start, end)
    .replace(/\s+/g, ' ')
    .trim()
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

/** The em dash character, built from its code point so this file never
 * contains one. */
const EM_DASH = String.fromCharCode(0x2014)

const TRIGGER_COLUMNS = ITEM_RULE === 'tier' ? '"reserve_run_id", "submission_id", "loot_item_id"' : '"reserve_run_id", "submission_id"'

const EXPECTED_ORDER: RegExp[] = [
  /^SET LOCAL lock_timeout = '5s'$/i,
  new RegExp(`^DROP POLICY IF EXISTS ${q('Officers can insert BLP credits')} ON ${ref('blp_credits')}$`),
  new RegExp(`^DROP POLICY IF EXISTS ${q('Officers can update BLP credits')} ON ${ref('blp_credits')}$`),
  new RegExp(`^DROP POLICY IF EXISTS ${q('Officers can delete BLP credits')} ON ${ref('blp_credits')}$`),
  new RegExp(`^DROP POLICY IF EXISTS ${q('Officers can insert BLP')} ON ${ref('blp_tracking')}$`),
  new RegExp(`^DROP POLICY IF EXISTS ${q('Officers can update BLP')} ON ${ref('blp_tracking')}$`),
  new RegExp(`^DROP POLICY IF EXISTS ${q('Officers can delete BLP')} ON ${ref('blp_tracking')}$`),
  new RegExp(`^CREATE OR REPLACE FUNCTION ${ref('enforce_reserve_award_refs')}\\(\\)`, 'i'),
  new RegExp(`^COMMENT ON FUNCTION ${ref('enforce_reserve_award_refs')}\\(\\) IS `, 'i'),
  new RegExp(`^REVOKE ALL ON FUNCTION ${ref('enforce_reserve_award_refs')}\\(\\) FROM `, 'i'),
  new RegExp(`^CREATE OR REPLACE TRIGGER ${q('enforce_reserve_award_refs')} BEFORE INSERT OR UPDATE OF ${TRIGGER_COLUMNS} ON ${ref('reserve_awards')} FOR EACH ROW EXECUTE FUNCTION ${ref('enforce_reserve_award_refs')}\\(\\)$`, 'i'),
  new RegExp(`^COMMENT ON TRIGGER ${q('enforce_reserve_award_refs')} ON ${ref('reserve_awards')} IS `, 'i'),
]

const FN_START = 7

const roleList = (list: string) => list.split(',').map(role => role.trim().replace(/^"|"$/g, ''))

describe('BLP and reserve award rules migration shape (quick task 261003-t28)', () => {
  it('the file exists, has a unique timestamp and sorts after the newest migration at planning time (#309)', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    // Anchored to 20261003220000 (quick task 261003-m45, which merges
    // first), the newest migration that existed when this file was
    // written, not a live directory scan, which would fail as soon as any
    // later migration lands (#309).
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20261003220000)
    const sameTimestamp = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(name => name.endsWith('.sql') && name !== path.basename(MIGRATION_FILE))
      .filter(name => name.slice(0, 14) === MIGRATION_TIMESTAMP)
    expect(sameTimestamp).toEqual([])
  })

  it('has exactly the expected statements in order', () => {
    const stmts = statements()
    const hasTrigger = stmts.length > 7
    const expected = hasTrigger ? EXPECTED_ORDER : EXPECTED_ORDER.slice(0, 7)
    expect(stmts).toHaveLength(expected.length)
    stmts.forEach((stmt, i) => {
      expect(stmt, `statement ${i + 1}`).toMatch(expected[i])
    })
  })

  it('each of the six dropped BLP policy names is the live baseline definition, and the two kept SELECT policy names never appear executable', () => {
    for (const { name, table } of DROPPED_POLICIES) {
      // Throws if not exactly one occurrence in the baseline.
      baselinePolicy(name, table)
      const allMigrationFiles = fs.readdirSync(MIGRATIONS_DIR).filter(f => f.endsWith('.sql'))
      for (const file of allMigrationFiles) {
        if (file === path.basename(BASELINE_FILE) || file === path.basename(MIGRATION_FILE)) continue
        const text = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
        expect(text, `${file} must not define "${name}" ON "public"."${table}"`).not.toContain(
          `"${name}" ON "public"."${table}"`,
        )
      }
    }
    const executable = statements().join(' ')
    expect(executable).not.toContain('Guild members can view BLP credits')
    expect(executable).not.toContain('Guild members can view BLP"')
  })

  it('rollbackStatements() holds, for each of the six dropped policies in order, its DROP followed by its exact baseline CREATE', () => {
    const rb = rollbackStatements()
    const hasTrigger = statements().length > 7
    expect(rb).toHaveLength(hasTrigger ? 14 : 12)
    let idx = 0
    for (const { name, table } of DROPPED_POLICIES) {
      expect(rb[idx]).toBe(`DROP POLICY IF EXISTS "${name}" ON "public"."${table}"`)
      expect(rb[idx + 1]).toBe(baselinePolicy(name, table))
      idx += 2
    }
    if (hasTrigger) {
      expect(rb[12]).toBe('DROP TRIGGER IF EXISTS "enforce_reserve_award_refs" ON "public"."reserve_awards"')
      expect(rb[13]).toBe('DROP FUNCTION IF EXISTS "public"."enforce_reserve_award_refs"()')
    }
  })

  it('has no forbidden statement over the identifier-blanked, string-blanked, body-removed SQL', () => {
    const withoutFnBodies = withoutBodies(stripComments(readMigrationRaw()))
    const executable = splitStatements(withoutFnBodies).map(blankIdentifiers).map(blankStrings)
    for (const stmt of executable) {
      expect(stmt).not.toMatch(/^(ALTER|TRUNCATE|INSERT|UPDATE|DELETE|DO|GRANT|CREATE POLICY)\b/i)
      if (/^DROP\b/i.test(stmt)) {
        expect(stmt).toMatch(/^DROP POLICY IF EXISTS\b/i)
      }
      expect(stmt).not.toMatch(/\bCASCADE\b/i)
    }
  })

  it('has no em dash, no two consecutive hyphens or semicolon inside a COMMENT string, and the header has the D-01 section headings in order', () => {
    const raw = readMigrationRaw()
    expect(raw).not.toContain(EM_DASH)
    const comments = statements().filter(stmt => /^COMMENT ON /i.test(stmt))
    for (const stmt of comments) {
      expect(stmt).not.toContain('--')
      expect(stmt).not.toContain(';')
    }
    const hasTrigger = statements().length > 7
    const firstLine = hasTrigger
      ? '-- BLP and reserve award rules stay inside the guild.'
      : '-- BLP tables are written only by the BLP functions.'
    expect(raw.split('\n')[0]).toBe(firstLine)
    const headings = hasTrigger
      ? ['Problem', 'Fix', 'Readers and writers checked', 'Error contract', 'Production safety', 'Not changed', 'Deploy', 'Rollback']
      : ['Problem', 'Fix', 'Readers and writers checked', 'Error contract', 'Production safety', 'Not changed', 'Deploy', 'Rollback']
    let lastIndex = -1
    for (const heading of headings) {
      const re = new RegExp(`^-- ${heading}\\n-- -+$`, 'm')
      expect(raw, heading).toMatch(re)
      const idx = raw.search(re)
      expect(idx, `${heading} out of order`).toBeGreaterThan(lastIndex)
      lastIndex = idx
    }
  })

  // The following cases only apply once Task 2 has appended the trigger
  // function; they no-op (return early) against the Task 1 file so this
  // file is valid both mid-plan and at the end.
  it('the CREATE FUNCTION has no parameters, returns trigger, is plpgsql SECURITY DEFINER with search_path public, pg_temp, and the file has exactly two dollar-quoted bodies', () => {
    const stmts = statements()
    if (stmts.length <= 7) return
    const code = stripComments(readMigrationRaw())
    expect((code.match(/\$\$/g) ?? []).length).toBe(2)
    const { prefix } = functionParts(stmts[FN_START])
    expect(prefix).toMatch(new RegExp(`^CREATE OR REPLACE FUNCTION ${ref('enforce_reserve_award_refs')}\\(\\) RETURNS ${q('trigger')} `, 'i'))
    expect(prefix).toMatch(/LANGUAGE "?plpgsql"? SECURITY DEFINER/i)
    expect(prefix).toMatch(/SET "?search_path"? TO 'public', 'pg_temp'$/i)
  })

  it('the enforce_reserve_award_refs body has every D-03 element for the OD-1 resolution and is read-only', () => {
    const stmts = statements()
    if (stmts.length <= 7) return
    const { body } = functionParts(stmts[FN_START])
    const collapsed = body.replace(/\s+/g, ' ')
    expect(collapsed).toMatch(/NEW\.reserve_run_id IS NULL/)
    expect(collapsed).toMatch(/TG_OP = 'UPDATE'/)
    expect(collapsed).toMatch(/NEW\.reserve_run_id IS NOT DISTINCT FROM OLD\.reserve_run_id/)
    expect(collapsed).toMatch(/NEW\.submission_id IS DISTINCT FROM OLD\.submission_id/)
    expect(collapsed).toMatch(/FROM public\.reserve_runs rr WHERE rr\.id = NEW\.reserve_run_id/)
    expect(collapsed).toMatch(/FROM public\.reserve_submissions rs/)
    expect(collapsed).toMatch(/rs\.id = NEW\.submission_id/)
    expect(collapsed).toMatch(/rs\.reserve_run_id = NEW\.reserve_run_id/)
    if (ITEM_RULE === 'tier') {
      expect(collapsed).toMatch(/NEW\.loot_item_id IS DISTINCT FROM OLD\.loot_item_id/)
      expect(collapsed).toMatch(/FROM public\.loot_items li/)
      expect(collapsed).toMatch(/JOIN public\.reserve_runs rr ON rr\.raid_tier_id = li\.raid_tier_id/)
      expect(collapsed).toContain('reserve_awards.loot_item_id is not in the raid tier of this reserve run')
    } else {
      expect(collapsed).not.toMatch(/loot_item_id/)
    }
    expect(collapsed).toMatch(/coalesce\(current_setting\('role', true\), ''\)/)
    expect(collapsed).toMatch(/NOT EXISTS/)
    expect(collapsed).toMatch(/public\.is_guild_officer\(rr\.guild_id\)/)
    expect(collapsed).toContain('new row violates row-level security policy for table "reserve_awards"')
    expect(collapsed).toMatch(/ERRCODE = 'insufficient_privilege'/)
    expect(collapsed).toContain('reserve_awards.submission_id is not a submission of this reserve run')
    expect(collapsed).toMatch(/ERRCODE = 'check_violation'/)
    expect(collapsed).toMatch(/DETAIL = v_detail/)

    const blanked = blankStrings(body)
    expect(blanked).not.toMatch(/\bINSERT\s+INTO\b/i)
    expect(blanked).not.toMatch(/\bUPDATE\s+"?public"?\./i)
    expect(blanked).not.toMatch(/\bDELETE\s+FROM\b/i)
    expect(blanked).not.toMatch(/\bPERFORM\b/i)
    expect(blanked).not.toMatch(/\bEXECUTE\b/i)
    expect(body).not.toMatch(/MESSAGE = format\(/)
  })

  it('revokes ALL from PUBLIC, anon and authenticated, with no GRANT in the file', () => {
    const stmts = statements()
    if (stmts.length <= 7) return
    const revoke = stmts[FN_START + 2]
    const m = revoke.match(/ FROM (.+)$/i)
    expect(m).not.toBeNull()
    expect(roleList(m![1])).toEqual(['PUBLIC', 'anon', 'authenticated'])
    expect(stmts.some(stmt => /^GRANT /i.test(stmt))).toBe(false)
  })

  it('every new function revokes PUBLIC (the 20260930000200 ratchet)', () => {
    const stmts = statements()
    const creates = stmts.filter(stmt => /^CREATE OR REPLACE FUNCTION /i.test(stmt))
    const revokes = stmts.filter(stmt => /^REVOKE /i.test(stmt))
    for (const create of creates) {
      const name = create.match(/^CREATE OR REPLACE FUNCTION "public"\."(\w+)"/)![1]
      expect(revokes.some(r => r.includes(`"${name}"`) && roleList(r.match(/ FROM (.+)$/i)![1]).includes('PUBLIC')), name).toBe(true)
    }
  })
})
