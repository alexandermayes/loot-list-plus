import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Quick task 261004-gxi: this migration keeps loot item officer notes to
// the guild's officers by replacing the table read privilege of anon and
// authenticated with column privileges on every other column. The app
// reads the notes through a server route after the Manage loot check. The
// behaviour is proven in a PGlite harness outside the repo; this test pins
// the shape of the migration file itself.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20261004040000'
const MIGRATION_FILE = path.join(MIGRATIONS_DIR, `${MIGRATION_TIMESTAMP}_loot_item_officer_notes_officers_only.sql`)
const BASELINE_FILE = path.join(MIGRATIONS_DIR, '20260101000000_baseline_schema.sql')

const OFFICER_ONLY_COLUMNS = ['officer_notes']
const EXPECTED_COLUMNS = [
  'id',
  'raid_tier_id',
  'name',
  'boss_name',
  'item_slot',
  'wowhead_id',
  'icon_url',
  'notes',
  'created_at',
  'classification',
  'item_type',
  'allocation_cost',
  'is_available',
  'roles',
  'armor_type',
  'weapon_type',
  'officer_notes',
  'is_loot_council',
  'primary_stat',
]

/** Strip line comments (trimmed lines starting with `--`, and trailing `--`
 * to end of line on a code line). No string literal in this SQL contains two
 * hyphens, so this is safe. */
function stripComments(sql: string): string {
  return sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
}

function readMigrationRaw(): string {
  return fs.readFileSync(MIGRATION_FILE, 'utf8')
}

/** Split comment-stripped SQL on `;`, ignoring any `;` between a pair of `$$`
 * tokens. Chunks are trimmed, empty chunks dropped, whitespace collapsed. */
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
    .map((chunk) => chunk.replace(/\s+/g, ' ').trim())
    .filter((chunk) => chunk.length > 0)
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

/** Remove the text between the first pair of `$$` tokens (the DO block
 * body), leaving the `$$...$$` markers collapsed to `$$$$`. Modelled on
 * delete-guild-with-reserve-runs-migration.test.ts's withoutBodies. */
function withoutBodies(sql: string): string {
  return sql.replace(/\$\$[\s\S]*?\$\$/g, '$$$$')
}

/** The DO block's body text: between the first and second `$$` tokens of
 * the comment-stripped SQL. */
function doBody(): string {
  const codeOnly = stripComments(readMigrationRaw())
  const open = codeOnly.indexOf('$$')
  const close = codeOnly.indexOf('$$', open + 2)
  return codeOnly.slice(open + 2, close)
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

/** The column names parsed from the baseline's loot_items CREATE TABLE
 * block, in declared order. */
function baselineColumns(): string[] {
  const baseline = fs.readFileSync(BASELINE_FILE, 'utf8')
  const prefix = 'CREATE TABLE IF NOT EXISTS "public"."loot_items" ('
  const occurrences = baseline.split(prefix).length - 1
  expect(occurrences, `expected exactly one '${prefix}' in the baseline, found ${occurrences}`).toBe(1)
  const start = baseline.indexOf(prefix) + prefix.length
  const end = baseline.indexOf(');', start)
  expect(end, 'no terminating ); found for the loot_items CREATE TABLE block').toBeGreaterThan(-1)
  const block = baseline.slice(start, end)
  const cols: string[] = []
  for (const line of block.split('\n')) {
    const m = line.trim().match(/^"([a-z_]+)"/)
    if (m) cols.push(m[1])
  }
  return cols
}

/** The em dash character, built from its code point so this file never
 * contains one. */
const EM_DASH = String.fromCharCode(0x2014)

describe('loot item officer notes migration shape (quick task 261004-gxi)', () => {
  it('the file exists, has a unique timestamp and sorts after the newest migration planned before it (#309)', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    // Anchored to 20261004020000 (quick task 261004-0ut), the newest
    // migration on main when this test was written, not a live directory
    // scan, which would fail as soon as any later migration lands (#309).
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20261004020000)

    const sameTimestamp = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((name) => name.endsWith('.sql') && name !== path.basename(MIGRATION_FILE))
      .filter((name) => name.slice(0, 14) === MIGRATION_TIMESTAMP)
    expect(sameTimestamp).toEqual([])
  })

  it('has exactly four statements in order: SET LOCAL, REVOKE, GRANT and a DO block, with exactly two $$ tokens', () => {
    const codeOnly = stripComments(readMigrationRaw())
    const dollarCount = (codeOnly.match(/\$\$/g) ?? []).length
    expect(dollarCount).toBe(2)

    const chunks = statements()
    expect(chunks).toHaveLength(4)
    expect(chunks[0]).toMatch(/^SET LOCAL "?lock_timeout"? = '5s'$/i)
    expect(chunks[1]).toBe('REVOKE SELECT ON TABLE "public"."loot_items" FROM "anon", "authenticated"')
    expect(chunks[2]).toMatch(new RegExp(`^GRANT SELECT \\(.*\\) ON TABLE ${q('public')}\\.${q('loot_items')} TO "anon", "authenticated"$`))
    expect(chunks[3].startsWith('DO $$')).toBe(true)
    expect(chunks[3].endsWith('$$')).toBe(true)

    // Generic shape over identifier- and string-blanked SQL (model: 0us's
    // reserve-run-rules-migration.test.ts), a defense independent of the
    // literal table/role names above.
    const blanked = chunks.slice(0, 2).map(blankIdentifiers).map(blankStrings)
    expect(blanked[0]).toMatch(/^SET LOCAL (lock_timeout|"x") = ''$/)
    expect(blanked[1]).toBe('REVOKE SELECT ON TABLE "x"."x" FROM "x", "x"')
  })

  it('the baseline column list and the GRANT column list match exactly, and no earlier migration adds a loot_items column', () => {
    expect(baselineColumns()).toEqual(EXPECTED_COLUMNS)

    const chunks = statements()
    const grantStmt = chunks[2]
    const colsMatch = grantStmt.match(/GRANT SELECT \(([^)]*)\)/)
    expect(colsMatch).not.toBeNull()
    const grantCols = (colsMatch as RegExpMatchArray)[1].split(',').map((s) => s.trim().replace(/^"|"$/g, ''))
    expect(grantCols).toEqual(EXPECTED_COLUMNS.filter((c) => !OFFICER_ONLY_COLUMNS.includes(c)))

    const allMigrationFiles = fs.readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith('.sql'))
    const earlierFiles = allMigrationFiles
      .filter((name) => name !== path.basename(BASELINE_FILE))
      .filter((name) => name < path.basename(MIGRATION_FILE))
    const addColumnRe = /ALTER\s+TABLE\s+(?:"?public"?\.)?"?loot_items"?\s+ADD\b/i
    for (const file of earlierFiles) {
      const text = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
      expect(text, `${file} must not ALTER TABLE loot_items ADD a column`).not.toMatch(addColumnRe)
    }
  })

  it('the DO body checks officer_notes and every other column for both roles, and contains no DDL/DML keyword', () => {
    const body = doBody()
    expect(body).toContain("has_column_privilege(v_role, 'public.loot_items', 'officer_notes', 'SELECT')")
    expect(body).toContain("ARRAY['anon', 'authenticated']")
    expect(body).toContain('pg_attribute')
    expect(body).toContain('attisdropped')
    expect((body.match(/RAISE EXCEPTION/g) ?? []).length).toBe(2)

    const blanked = blankStrings(body)
    for (const kw of ['GRANT', 'REVOKE', 'ALTER', 'CREATE', 'DROP', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'EXECUTE']) {
      expect(blanked, kw).not.toMatch(new RegExp(`\\b${kw}\\b`, 'i'))
    }
  })

  it('has no forbidden statement elsewhere, GRANT and REVOKE each appear exactly once, and officer_notes appears only inside the DO body', () => {
    const codeOnly = stripComments(readMigrationRaw())
    const withoutDoBody = withoutBodies(codeOnly)
    const blanked = blankStrings(withoutDoBody)

    for (const kw of ['POLICY', 'FUNCTION', 'TRIGGER', 'TRUNCATE', 'CASCADE', 'ROW LEVEL SECURITY', 'ALTER TABLE', 'INSERT INTO', 'DELETE FROM']) {
      expect(blanked, kw).not.toMatch(new RegExp(`\\b${kw}\\b`, 'i'))
    }
    expect(blanked).not.toMatch(/\bUPDATE\s+[\w."]+\s+SET\b/i)
    expect((blanked.match(/\bGRANT\b/gi) ?? []).length).toBe(1)
    expect((blanked.match(/\bREVOKE\b/gi) ?? []).length).toBe(1)

    const officerNotesOutsideBody = (withoutDoBody.match(/officer_notes/g) ?? []).length
    expect(officerNotesOutsideBody).toBe(0)
    expect(codeOnly).toContain('officer_notes')
  })

  it('rollbackStatements() restores exactly the baseline grant, and the raw Rollback block is all comment lines', () => {
    const rb = rollbackStatements()
    expect(rb).toEqual([
      'GRANT SELECT ON TABLE "public"."loot_items" TO "anon", "authenticated"',
      `REVOKE SELECT (${EXPECTED_COLUMNS.filter((c) => !OFFICER_ONLY_COLUMNS.includes(c)).map((c) => `"${c}"`).join(', ')}) ON TABLE "public"."loot_items" FROM "anon", "authenticated"`,
    ])

    const baseline = fs.readFileSync(BASELINE_FILE, 'utf8')
    expect(baseline).toContain('GRANT ALL ON TABLE "public"."loot_items" TO "anon"')
    expect(baseline).toContain('GRANT ALL ON TABLE "public"."loot_items" TO "authenticated"')

    const raw = readMigrationRaw()
    const lines = raw.split('\n')
    const headingIdx = lines.findIndex((l) => l.trim() === '-- Rollback')
    expect(headingIdx).toBeGreaterThan(-1)
    for (let i = headingIdx; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() === '') break
      expect(line.startsWith('--'), `rollback line ${i}: "${line}"`).toBe(true)
    }
  })

  it('a later migration (ratchet, none exist today) may not re-grant table SELECT on loot_items, and may only add a column that is officer-only or itself granted', () => {
    const laterFiles = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((name) => name.endsWith('.sql') && name.slice(0, 14) > MIGRATION_TIMESTAMP)

    const tableGrantRe = /GRANT\s+(?:SELECT|ALL)\s*(?:ON\s+TABLE)?\s+(?:"?public"?\.)?"?loot_items"?\s+TO\s+(?:"?anon"?|"?authenticated"?|"?public"?)/i
    const addColumnRe = /ALTER\s+TABLE\s+(?:"?public"?\.)?"?loot_items"?\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?"?([a-z_]+)"?/gi

    for (const file of laterFiles) {
      const text = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
      const codeOnly = stripComments(text)
      expect(codeOnly, `${file} must not table-grant SELECT/ALL on loot_items to anon/authenticated/PUBLIC`).not.toMatch(tableGrantRe)

      let m: RegExpExecArray | null
      while ((m = addColumnRe.exec(codeOnly)) !== null) {
        const col = m[1]
        const isOfficerOnly = OFFICER_ONLY_COLUMNS.includes(col)
        const isGranted = new RegExp(`GRANT SELECT \\([^)]*"${col}"[^)]*\\) ON TABLE (?:"?public"?\\.)?"?loot_items"? TO "anon", "authenticated"`).test(codeOnly)
        expect(
          isOfficerOnly || isGranted,
          `${file} adds loot_items.${col}: grant it SELECT to anon/authenticated in the same file, or list it in OFFICER_ONLY_COLUMNS`
        ).toBe(true)
      }
    }
  })

  it('has no em dash, the first line matches D-01, and the headings appear in order with no semicolon in header prose', () => {
    const raw = readMigrationRaw()
    expect(raw).not.toContain(EM_DASH)
    expect(raw.split('\n')[0]).toBe("-- Loot item officer notes are readable only by the guild's officers.")

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

    const lines = raw.split('\n')
    const firstStatementLineIdx = lines.findIndex((line) => /^SET LOCAL/i.test(line.trim()))
    expect(firstStatementLineIdx).toBeGreaterThan(-1)
    for (let i = 0; i < firstStatementLineIdx; i++) {
      const line = lines[i]
      if (line.startsWith('--   ')) continue
      if (!line.startsWith('-- ')) continue
      expect(line, `header line ${i + 1} must not contain a semicolon`).not.toContain(';')
    }
  })

  it('has no double hyphen outside comment markers, heading underlines and the Rollback SQL', () => {
    const raw = readMigrationRaw()
    const lines = raw.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (!line.startsWith('--')) continue
      const rest = line.slice(2)
      if (/^ -{3,}$/.test(rest)) continue // heading underline
      if (rest.startsWith('   ')) continue // Rollback SQL line
      expect(rest.includes('--'), `line ${i + 1} has a stray double hyphen: "${line}"`).toBe(false)
    }
  })
})
