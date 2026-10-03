import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Quick task 261003-j61: the loot list member read rule and officer update
// rule on loot_submissions, and the three expansions officer write rules,
// require an active guild membership, as the rest of this policy family
// already does. The behaviour (a former member reads only its own lists, an
// inactive officer-rank membership grants no write, active members and
// officers are unaffected) is proven in a PGlite harness outside the repo;
// this test pins the shape of the migration file itself: the exact statement
// list, that the policies this migration does not touch are never dropped by
// any migration, that the expansions texts are derived from the baseline
// with exactly one added conjunct, and that the header Rollback block
// restores the baseline texts exactly.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20261003180000'
const MIGRATION_FILE = path.join(
  MIGRATIONS_DIR,
  `${MIGRATION_TIMESTAMP}_policies_require_active_guild_membership.sql`,
)
const BASELINE_FILE = path.join(MIGRATIONS_DIR, '20260101000000_baseline_schema.sql')

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
 * tokens (none here, but kept for parity with the other migration shape
 * tests). Chunks are trimmed, empty chunks dropped, whitespace collapsed. */
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
  // No trailing semicolon, to match the format splitStatements() produces
  // for both the migration's own executable statements and the extracted
  // Rollback statements (both strip the terminating ';').
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

describe('loot list and expansion rules require an active guild membership migration shape (quick task 261003-j61)', () => {
  // Anchored to the newest migration that existed when this one was written
  // (20261003120000, quick task 261003-fcg), not to a live directory scan,
  // which would fail as soon as any later migration lands (#309).
  it('the file exists, sorts after every migration that preceded it, and has a unique timestamp', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20261003120000)

    const sameTimestamp = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(name => name.endsWith('.sql') && name !== path.basename(MIGRATION_FILE))
      .filter(name => name.slice(0, 14) === MIGRATION_TIMESTAMP)
    expect(sameTimestamp).toEqual([])
  })

  it('has exactly 9 statements (expansions included) in the required order, with no dollar quoting', () => {
    const codeOnly = stripComments(readMigrationRaw())
    expect(codeOnly).not.toContain('$$')

    const hasExpansions = /expansions/.test(codeOnly)
    const chunks = statements()
    expect(chunks).toHaveLength(hasExpansions ? 9 : 3)

    expect(chunks[0]).toMatch(/^SET LOCAL lock_timeout\s*=\s*'5s'$/i)
    expect(chunks[1]).toMatch(
      new RegExp(`^DROP POLICY IF EXISTS ${q('Guild members can view guild submissions')} ON ${q('public')}\\.${q('loot_submissions')}$`),
    )
    expect(chunks[2]).toMatch(
      new RegExp(`^DROP POLICY IF EXISTS ${q('Officers can manage submissions')} ON ${q('public')}\\.${q('loot_submissions')}$`),
    )

    if (hasExpansions) {
      expect(chunks).toHaveLength(9)
      const pairs: Array<[string, 'INSERT WITH CHECK' | 'UPDATE USING' | 'DELETE USING']> = [
        ['Officers can insert expansions', 'INSERT WITH CHECK'],
        ['Officers can update expansions', 'UPDATE USING'],
        ['Officers can delete expansions', 'DELETE USING'],
      ]
      let idx = 3
      for (const [name, clause] of pairs) {
        expect(chunks[idx]).toMatch(
          new RegExp(`^DROP POLICY IF EXISTS ${q(name)} ON ${q('public')}\\.${q('expansions')}$`),
        )
        const cmdWord = clause.startsWith('INSERT') ? 'INSERT' : clause.startsWith('UPDATE') ? 'UPDATE' : 'DELETE'
        expect(chunks[idx + 1]).toMatch(
          new RegExp(`^CREATE POLICY ${q(name)} ON ${q('public')}\\.${q('expansions')} FOR ${cmdWord}`),
        )
        idx += 2
      }
    }
  })

  it('keeps the remaining loot_submissions policies, and no migration drops them', () => {
    expect(baselinePolicy('loot_submissions_select', 'loot_submissions')).toContain('"cgm"."is_active" = true')
    expect(baselinePolicy('loot_submissions_select', 'loot_submissions')).toMatch(/FOR SELECT/)
    expect(baselinePolicy('Users can view own character submissions', 'loot_submissions')).toMatch(/FOR SELECT/)
    const updateText = baselinePolicy('loot_submissions_update', 'loot_submissions')
    expect(updateText).toMatch(/FOR UPDATE/)
    expect(updateText).toContain('is_guild_officer')

    const survivorNames = [
      'loot_submissions_select',
      'Users can view own character submissions',
      'loot_submissions_update',
    ]
    const allMigrationFiles = fs.readdirSync(MIGRATIONS_DIR).filter(name => name.endsWith('.sql'))
    for (const file of allMigrationFiles) {
      if (file === path.basename(BASELINE_FILE)) continue
      const text = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
      for (const name of survivorNames) {
        expect(
          text,
          `${file} must not DROP POLICY "${name}"`,
        ).not.toMatch(new RegExp(`DROP POLICY[^;]*"${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`))
      }
    }
  })

  it('derives each expansions CREATE POLICY from the baseline with exactly one added conjunct, directly preceded by its DROP', () => {
    const codeOnly = stripComments(readMigrationRaw())
    if (!/expansions/.test(codeOnly)) return

    const OLD = '("c"."user_id" = "auth"."uid"()) AND ("gr"."position" >= 50)'
    const NEW = '("c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true) AND ("gr"."position" >= 50)'

    const names = ['Officers can insert expansions', 'Officers can update expansions', 'Officers can delete expansions']
    const chunks = statements()
    for (const name of names) {
      const baseline = baselinePolicy(name, 'expansions')
      expect(baseline.split(OLD).length - 1, `expected exactly one occurrence in baseline ${name}`).toBe(1)
      const expected = baseline.replace(OLD, NEW)

      const createIdx = chunks.findIndex(c => c.startsWith(`CREATE POLICY "${name}"`))
      expect(createIdx, `no CREATE POLICY found for ${name}`).toBeGreaterThanOrEqual(0)
      expect(chunks[createIdx]).toBe(expected)

      const dropIdx = chunks.findIndex(c => c === `DROP POLICY IF EXISTS "${name}" ON "public"."expansions"`)
      expect(dropIdx, `no matching DROP POLICY IF EXISTS found for ${name}`).toBeGreaterThanOrEqual(0)
      expect(createIdx, 'the CREATE must directly follow its DROP').toBe(dropIdx + 1)
    }
  })

  it('the header Rollback block restores exactly the baseline texts for every policy this migration changes', () => {
    const codeOnly = stripComments(readMigrationRaw())
    const hasExpansions = /expansions/.test(codeOnly)
    const rb = rollbackStatements()
    expect(rb).toHaveLength(hasExpansions ? 10 : 4)

    const changed: Array<[string, string]> = [
      ['Guild members can view guild submissions', 'loot_submissions'],
      ['Officers can manage submissions', 'loot_submissions'],
    ]
    if (hasExpansions) {
      changed.push(
        ['Officers can insert expansions', 'expansions'],
        ['Officers can update expansions', 'expansions'],
        ['Officers can delete expansions', 'expansions'],
      )
    }

    let idx = 0
    for (const [name, table] of changed) {
      expect(rb[idx]).toBe(`DROP POLICY IF EXISTS "${name}" ON "public"."${table}"`)
      expect(rb[idx + 1]).toBe(baselinePolicy(name, table))
      idx += 2
    }
  })

  it('has no forbidden statement over the string-blanked SQL', () => {
    const executable = statements().map(blankStrings)
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
    ]
    for (const stmt of executable) {
      for (const re of forbidden) {
        expect(stmt, `executable SQL unexpectedly matches ${re}`).not.toMatch(re)
      }
    }
    const dropStatements = executable.filter(stmt => /\bDROP\b/i.test(stmt))
    for (const stmt of dropStatements) {
      expect(stmt).toMatch(/^DROP POLICY IF EXISTS\b/i)
    }
  })
})
