import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Quick task 261004-0us: reserve tables are read and written only by the
// server (OD-1 resolved as B). The reserve_runs insert, update and delete
// policies and the reserve_awards insert and delete policies are dropped,
// since the app writes these tables only from server routes; the four
// reserve SELECT policies are dropped too, since the app also reads these
// tables only from server routes, including the public join page, its link
// preview and guest sign-up. The behaviour is proven in a PGlite harness
// outside the repo; this test pins the shape of the migration file itself.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20261004010000'
const MIGRATION_FILE = path.join(MIGRATIONS_DIR, `${MIGRATION_TIMESTAMP}_reserve_run_rules.sql`)
const BASELINE_FILE = path.join(MIGRATIONS_DIR, '20260101000000_baseline_schema.sql')

/** OD-1 resolution: B, the four reserve SELECT policies are dropped too, so
 * every reserve table is read and written only by the server. Typed as
 * `string` (not a literal union) so both branches below remain meaningful
 * to tsc regardless of which one is live. */
const READS: string = 'drop'

const WRITE_POLICIES: Array<[string, string]> = [
  ['reserve_runs_insert', 'reserve_runs'],
  ['reserve_runs_update', 'reserve_runs'],
  ['reserve_runs_delete', 'reserve_runs'],
  ['reserve_awards_insert', 'reserve_awards'],
  ['reserve_awards_delete', 'reserve_awards'],
]
const READ_POLICIES: Array<[string, string]> = [
  ['reserve_runs_select', 'reserve_runs'],
  ['reserve_awards_select', 'reserve_awards'],
  ['reserve_submissions_select', 'reserve_submissions'],
  ['reserve_audit_log_select', 'reserve_audit_log'],
]
const DROPPED: Array<[string, string]> = READS === 'drop' ? [...WRITE_POLICIES, ...READ_POLICIES] : WRITE_POLICIES

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
 * tokens (none in this migration). Chunks are trimmed, empty chunks dropped,
 * whitespace collapsed. */
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
 * escapes). */
function blankStrings(sql: string): string {
  return sql.replace(/'(?:[^']|'')*'/g, "''")
}

/** Blank out every double-quoted identifier. */
function blankIdentifiers(sql: string): string {
  return sql.replace(/"(?:[^"]|"")*"/g, '"x"')
}

/** Optional double quotes around an identifier. */
const q = (name: string) => `"?${name}"?`

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

/** The D-01 statement list, in order: SET LOCAL lock_timeout, then one DROP
 * POLICY per DROPPED pair in order (5 for 'keep', 9 for 'drop'). */
const EXPECTED_ORDER: RegExp[] = [
  /^SET LOCAL "?lock_timeout"? = '5s'$/i,
  ...DROPPED.map(
    ([name, table]) => new RegExp(`^DROP POLICY IF EXISTS ${q(name)} ON ${q('public')}\\.${q(table)}$`, 'i'),
  ),
]

/** The em dash character, built from its code point so this file never
 * contains one. */
const EM_DASH = String.fromCharCode(0x2014)

describe('reserve run rules migration shape (quick task 261004-0us)', () => {
  it('the file exists, has a unique timestamp and sorts after the newest migration planned before it (#309)', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    // Anchored to 20261003230000 (quick task 261003-t28, which merges
    // first), the newest migration planned before this one, not a live
    // directory scan, which would fail as soon as any later migration lands
    // (#309).
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20261003230000)

    const sameTimestamp = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(name => name.endsWith('.sql') && name !== path.basename(MIGRATION_FILE))
      .filter(name => name.slice(0, 14) === MIGRATION_TIMESTAMP)
    expect(sameTimestamp).toEqual([])
  })

  it('has exactly the expected statements in order, with no dollar quoting', () => {
    const codeOnly = stripComments(readMigrationRaw())
    expect(codeOnly).not.toContain('$$')

    const chunks = statements()
    expect(chunks).toHaveLength(EXPECTED_ORDER.length)
    chunks.forEach((stmt, i) => {
      expect(stmt, `statement ${i + 1}`).toMatch(EXPECTED_ORDER[i])
    })
  })

  it('each DROPPED name occurs exactly once in the baseline, and no migration file that sorts before this one (other than the baseline) drops it', () => {
    const allMigrationFiles = fs.readdirSync(MIGRATIONS_DIR).filter(name => name.endsWith('.sql'))
    const earlierFiles = allMigrationFiles
      .filter(name => name !== path.basename(BASELINE_FILE))
      .filter(name => name < path.basename(MIGRATION_FILE))

    for (const [name, table] of DROPPED) {
      // Throws if not found exactly once in the baseline.
      baselinePolicy(name, table)

      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(`"${escaped}"\\s+ON\\s+"public"\\."${table}"`)
      for (const file of earlierFiles) {
        const text = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
        expect(text, `${file} must not reference "${name}" ON "public"."${table}"`).not.toMatch(re)
      }
    }
  })

  it('rollbackStatements() holds, in the D-01 order, each dropped policy\'s DROP followed by its exact baseline CREATE', () => {
    const rb = rollbackStatements()
    expect(rb).toHaveLength(DROPPED.length * 2)

    let idx = 0
    for (const [name, table] of DROPPED) {
      expect(rb[idx]).toBe(`DROP POLICY IF EXISTS "${name}" ON "public"."${table}"`)
      expect(rb[idx + 1]).toBe(baselinePolicy(name, table))
      idx += 2
    }
  })

  it('over the identifier- and string-blanked statements, the first is SET LOCAL lock_timeout and every other is a DROP POLICY, and no READ_POLICIES name appears when reads are kept', () => {
    const executable = statements().map(blankIdentifiers).map(blankStrings)
    expect(executable[0]).toMatch(/^SET LOCAL (lock_timeout|"x") = ''$/)
    for (let i = 1; i < executable.length; i++) {
      expect(executable[i]).toBe('DROP POLICY IF EXISTS "x" ON "x"."x"')
    }

    if (READS === 'keep') {
      const codeOnly = stripComments(readMigrationRaw())
      for (const [name] of READ_POLICIES) {
        expect(codeOnly).not.toContain(name)
      }
    }
  })

  it('has no em dash, the first line matches the D-01 resolution, and the header has the D-01 section headings in order with no semicolon before the executable statements', () => {
    const raw = readMigrationRaw()
    expect(raw).not.toContain(EM_DASH)

    const expectedFirstLine =
      READS === 'drop'
        ? '-- Reserve tables are read and written only by the server.'
        : '-- Reserve runs and awards are written only by the server.'
    expect(raw.split('\n')[0]).toBe(expectedFirstLine)

    const headings = [
      'Problem',
      'Fix',
      'Readers and writers checked',
      'Error contract',
      'Production safety',
      'Not changed',
      'Deploy',
      'Rollback',
    ]
    let lastIndex = -1
    for (const heading of headings) {
      const re = new RegExp(`^-- ${heading}\\n-- -{${heading.length}}$`, 'm')
      expect(raw, heading).toMatch(re)
      const idx = raw.search(re)
      expect(idx, `${heading} out of order`).toBeGreaterThan(lastIndex)
      lastIndex = idx
    }

    // No header line before the first executable statement (SET LOCAL
    // lock_timeout) may contain a semicolon, other than a Rollback SQL line
    // (which starts with two hyphens and three spaces).
    const lines = raw.split('\n')
    const firstStatementLineIdx = lines.findIndex(line => /^SET LOCAL/i.test(line.trim()))
    expect(firstStatementLineIdx).toBeGreaterThan(-1)
    for (let i = 0; i < firstStatementLineIdx; i++) {
      const line = lines[i]
      if (line.startsWith('--   ')) continue
      expect(line, `header line ${i + 1} must not contain a semicolon`).not.toContain(';')
    }
  })

  it('has no forbidden statement over the identifier- and string-blanked SQL, and RLS is never disabled', () => {
    const executable = statements().map(blankIdentifiers).map(blankStrings)
    const forbidden = [
      /\bFUNCTION\b/i,
      /\bTRIGGER\b/i,
      /\bGRANT\b/i,
      /\bREVOKE\b/i,
      /\bTRUNCATE\b/i,
      /\bINSERT\s+INTO\b/i,
      /\bDELETE\s+FROM\b/i,
      /\bALTER\s+TABLE\b/i,
      /\bINDEX\b/i,
      /\bROW LEVEL SECURITY\b/i,
      /\bRESTRICTIVE\b/i,
      /\bTO\s+"?(anon|authenticated|service_role|public)"?\b/i,
      /\bUPDATE\s+[\w."]+\s+SET\b/i,
      /\bCASCADE\b/i,
    ]
    for (const stmt of executable) {
      for (const re of forbidden) {
        expect(stmt, `executable SQL unexpectedly matches ${re}`).not.toMatch(re)
      }
    }
    for (const stmt of executable) {
      if (/\bDROP\b/i.test(stmt)) {
        expect(stmt).toMatch(/^DROP POLICY IF EXISTS\b/i)
      }
    }
  })
})
