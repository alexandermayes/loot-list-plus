import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Quick task 261003-kfj: the equipped items officer rule, and the guildmate
// read rule when included, require an active guild membership of the item's
// character in the officer's (or guildmate's) guild, matching the pattern
// already applied to loot_submissions and expansions. The behaviour (an
// active officer or guildmate reaches only current members' equipped items,
// plus the owner's own) is proven in a PGlite harness outside the repo; this
// test pins the shape of the migration file itself: the exact statement
// list, that the CREATE texts are derived from the baseline with exactly the
// added conjuncts, that the owner policy is never dropped, and that the
// header Rollback block restores the baseline texts exactly.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20261003200000'
const MIGRATION_FILE = path.join(
  MIGRATIONS_DIR,
  `${MIGRATION_TIMESTAMP}_equipped_item_rules_require_active_membership.sql`,
)
const BASELINE_FILE = path.join(MIGRATIONS_DIR, '20260101000000_baseline_schema.sql')
const TABLE = 'character_equipped_items'
const OFFICER = `Officers can manage guild characters' equipped items`
const OWNER = `Users can manage their own characters' equipped items`
const MEMBER = 'Users can view equipped items for guild characters'

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

/** Blank out every double-quoted identifier, so the apostrophe inside the
 * OFFICER and OWNER policy names is never read as a string quote by
 * blankStrings or by the forbidden-statement check. */
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

describe('equipped item rules migration shape (quick task 261003-kfj)', () => {
  it('the file exists, sorts after every migration that preceded it, and has a unique timestamp', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    // Anchored to the newest migration that existed when this one was
    // written (20261003180000, quick task 261003-j61), not to a live
    // directory scan, which would fail as soon as any later migration lands
    // (#309).
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20261003180000)

    const sameTimestamp = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(name => name.endsWith('.sql') && name !== path.basename(MIGRATION_FILE))
      .filter(name => name.slice(0, 14) === MIGRATION_TIMESTAMP)
    expect(sameTimestamp).toEqual([])
  })

  it('has exactly 5 statements when the member read policy is included, otherwise 3, in the required order, with no dollar quoting', () => {
    const codeOnly = stripComments(readMigrationRaw())
    expect(codeOnly).not.toContain('$$')

    const hasMember = codeOnly.includes(MEMBER)
    const chunks = statements()
    expect(chunks).toHaveLength(hasMember ? 5 : 3)

    expect(chunks[0]).toMatch(/^SET LOCAL lock_timeout\s*=\s*'5s'$/i)
    expect(chunks[1]).toMatch(new RegExp(`^DROP POLICY IF EXISTS ${q(OFFICER)} ON ${q('public')}\\.${q(TABLE)}$`))
    expect(chunks[2]).toMatch(new RegExp(`^CREATE POLICY ${q(OFFICER)} ON ${q('public')}\\.${q(TABLE)}`))

    if (hasMember) {
      expect(chunks[3]).toMatch(new RegExp(`^DROP POLICY IF EXISTS ${q(MEMBER)} ON ${q('public')}\\.${q(TABLE)}$`))
      expect(chunks[4]).toMatch(new RegExp(`^CREATE POLICY ${q(MEMBER)} ON ${q('public')}\\.${q(TABLE)} FOR SELECT`))
    }
  })

  it('derives the OFFICER CREATE from the baseline with exactly two added conjuncts, directly preceded by its DROP', () => {
    const OLD = '("cgm"."character_id" = "character_equipped_items"."character_id") AND "public"."is_guild_officer"("cgm"."guild_id")'
    const NEW =
      '("cgm"."character_id" = "character_equipped_items"."character_id") AND ("cgm"."is_active" = true) AND "public"."is_guild_officer"("cgm"."guild_id")'

    const baseline = baselinePolicy(OFFICER, TABLE)
    expect(baseline.split(OLD).length - 1, 'expected exactly two occurrences in the baseline OFFICER policy').toBe(2)
    const expected = baseline.split(OLD).join(NEW)

    const chunks = statements()
    const createIdx = chunks.findIndex(c => c.startsWith(`CREATE POLICY "${OFFICER}"`))
    expect(createIdx, 'no CREATE POLICY found for OFFICER').toBeGreaterThanOrEqual(0)
    expect(chunks[createIdx]).toBe(expected)

    const dropIdx = chunks.findIndex(c => c === `DROP POLICY IF EXISTS "${OFFICER}" ON "public"."${TABLE}"`)
    expect(dropIdx, 'no matching DROP POLICY IF EXISTS found for OFFICER').toBeGreaterThanOrEqual(0)
    expect(createIdx, 'the CREATE must directly follow its DROP').toBe(dropIdx + 1)
  })

  it('derives the MEMBER CREATE from the baseline with exactly one added conjunct, directly preceded by its DROP, only when included', () => {
    const codeOnly = stripComments(readMigrationRaw())
    if (!codeOnly.includes(MEMBER)) return

    const OLD = '("my_c"."user_id" = "auth"."uid"()) AND ("my_cgm"."is_active" = true)'
    const NEW = '("my_c"."user_id" = "auth"."uid"()) AND ("cgm"."is_active" = true) AND ("my_cgm"."is_active" = true)'

    const baseline = baselinePolicy(MEMBER, TABLE)
    expect(baseline.split(OLD).length - 1, 'expected exactly one occurrence in the baseline MEMBER policy').toBe(1)
    const expected = baseline.replace(OLD, NEW)

    const chunks = statements()
    const createIdx = chunks.findIndex(c => c.startsWith(`CREATE POLICY "${MEMBER}"`))
    expect(createIdx, 'no CREATE POLICY found for MEMBER').toBeGreaterThanOrEqual(0)
    expect(chunks[createIdx]).toBe(expected)
    expect(chunks[createIdx]).toMatch(/^CREATE POLICY "Users can view equipped items for guild characters" ON "public"\."character_equipped_items" FOR SELECT/)

    const dropIdx = chunks.findIndex(c => c === `DROP POLICY IF EXISTS "${MEMBER}" ON "public"."${TABLE}"`)
    expect(dropIdx, 'no matching DROP POLICY IF EXISTS found for MEMBER').toBeGreaterThanOrEqual(0)
    expect(createIdx, 'the CREATE must directly follow its DROP').toBe(dropIdx + 1)
  })

  it('the baseline holds OWNER exactly once, and no migration file other than the baseline drops it', () => {
    const baseline = fs.readFileSync(BASELINE_FILE, 'utf8')
    const prefix = `CREATE POLICY "${OWNER}" ON "public"."${TABLE}"`
    expect(baseline.split(prefix).length - 1).toBe(1)

    const allMigrationFiles = fs.readdirSync(MIGRATIONS_DIR).filter(name => name.endsWith('.sql'))
    for (const file of allMigrationFiles) {
      if (file === path.basename(BASELINE_FILE)) continue
      const text = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
      expect(text, `${file} must not DROP POLICY "${OWNER}"`).not.toMatch(
        new RegExp(`DROP POLICY[^;]*"${OWNER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`),
      )
    }
  })

  it('rollbackStatements() holds, in order, each changed policy\'s DROP followed by its exact baseline CREATE', () => {
    const codeOnly = stripComments(readMigrationRaw())
    const hasMember = codeOnly.includes(MEMBER)
    const rb = rollbackStatements()
    expect(rb).toHaveLength(hasMember ? 4 : 2)

    const changed = [OFFICER, ...(hasMember ? [MEMBER] : [])]
    let idx = 0
    for (const name of changed) {
      expect(rb[idx]).toBe(`DROP POLICY IF EXISTS "${name}" ON "public"."${TABLE}"`)
      expect(rb[idx + 1]).toBe(baselinePolicy(name, TABLE))
      idx += 2
    }
  })

  it('has no forbidden statement over the identifier-blanked and string-blanked SQL', () => {
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
