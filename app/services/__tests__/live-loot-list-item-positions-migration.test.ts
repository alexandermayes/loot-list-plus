import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Quick task 261003-fcg (GH #354): saving a loot list fails when a new item
// lands on the rank and slot of a removed (received) item, because the two
// UNIQUE (submission_id, rank, slot) constraints on loot_submission_items
// count removed rows too. This locks the shape of the migration that
// replaces them with a partial unique index on rows that are not removed
// (removed_at IS NULL): the fix itself is proven in a PGlite harness outside
// the repo; this test pins what the file may contain: the index is created
// before either old constraint is dropped, the dropped names match the
// baseline's two constraints exactly, the predicate is exact, and no
// function, trigger, policy, grant or data change sneaks in.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20261003120000'
const MIGRATION_FILE = path.join(
  MIGRATIONS_DIR,
  `${MIGRATION_TIMESTAMP}_unique_live_loot_list_item_positions.sql`,
)
const BASELINE_FILE = path.join(MIGRATIONS_DIR, '20260101000000_baseline_schema.sql')

/** Strip line comments (trimmed lines starting with `--`, and trailing `--`
 * to end of line on a code line). No string literal in this SQL contains
 * two hyphens, so this is safe. */
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
 * tokens. Chunks are trimmed, empty chunks dropped, and whitespace collapsed
 * per chunk. */
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
 * '' escapes), so keyword checks never match words inside COMMENT text. */
function blankStrings(sql: string): string {
  return sql.replace(/'(?:[^']|'')*'/g, "''")
}

/** Optional double quotes around an identifier. */
const q = (name: string) => `"?${name}"?`
const TABLE = `${q('public')}\\.${q('loot_submission_items')}`

/** The two UNIQUE (submission_id, rank, slot) constraint names added to
 * loot_submission_items in the baseline schema, parsed from that file so
 * this test fails loudly if the baseline ever changes them. */
function baselineUniqueConstraintNames(): string[] {
  const baseline = fs.readFileSync(BASELINE_FILE, 'utf8')
  const re =
    /ALTER TABLE ONLY "public"\."loot_submission_items"\s+ADD CONSTRAINT "([a-zA-Z0-9_]+)" UNIQUE \("submission_id", "rank", "slot"\);/g
  const names: string[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(baseline)) !== null) {
    names.push(m[1])
  }
  return names
}

describe('removed loot list items no longer hold their rank and slot migration shape (GH #354, quick task 261003-fcg)', () => {
  it('the file exists, sorts after every migration that preceded it, and has a unique timestamp', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20261002120000)

    const sameTimestamp = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(name => name.endsWith('.sql') && name !== path.basename(MIGRATION_FILE))
      .filter(name => name.slice(0, 14) === MIGRATION_TIMESTAMP)
    expect(sameTimestamp).toEqual([])
  })

  it('has exactly 5 statements, in the required order', () => {
    const codeOnly = stripComments(readMigrationRaw())
    expect(codeOnly).not.toContain('$$')

    const chunks = statements()
    expect(chunks).toHaveLength(5)

    expect(chunks[0]).toMatch(/^SET LOCAL lock_timeout\s*=\s*'5s'$/i)
    expect(chunks[1]).toMatch(
      new RegExp(
        `^CREATE UNIQUE INDEX IF NOT EXISTS ${q('idx_loot_submission_items_unique_live_rank_slot')} ON ${TABLE} USING ${q('btree')} ` +
          `\\(${q('submission_id')}, ${q('rank')}, ${q('slot')}\\) WHERE \\(${q('removed_at')} IS NULL\\)$`,
        'i',
      ),
    )
    expect(chunks[2]).toMatch(
      new RegExp(`^ALTER TABLE ${TABLE} DROP CONSTRAINT IF EXISTS ${q('loot_submission_items_unique_submission_rank_slot')}$`, 'i'),
    )
    expect(chunks[3]).toMatch(
      new RegExp(`^ALTER TABLE ${TABLE} DROP CONSTRAINT IF EXISTS ${q('loot_submission_items_submission_id_rank_slot_key')}$`, 'i'),
    )
    expect(chunks[4]).toMatch(
      new RegExp(`^COMMENT ON INDEX ${q('public')}\\.${q('idx_loot_submission_items_unique_live_rank_slot')} IS '`, 'i'),
    )
  })

  it('creates the index before either constraint is dropped', () => {
    const chunks = statements()
    const createIndex = chunks.findIndex(stmt => /^CREATE UNIQUE INDEX\b/i.test(stmt))
    const drops = chunks
      .map((stmt, i) => (/^ALTER TABLE\b.*DROP CONSTRAINT\b/i.test(stmt) ? i : -1))
      .filter(i => i >= 0)
    expect(createIndex).toBeGreaterThanOrEqual(0)
    expect(drops).toHaveLength(2)
    for (const drop of drops) {
      expect(createIndex).toBeLessThan(drop)
    }
  })

  it('drops exactly the two UNIQUE (submission_id, rank, slot) constraint names from the baseline schema', () => {
    const baselineNames = baselineUniqueConstraintNames()
    expect(baselineNames).toHaveLength(2)

    const chunks = statements()
    const dropNames = chunks
      .filter(stmt => /^ALTER TABLE\b.*DROP CONSTRAINT\b/i.test(stmt))
      .map(stmt => {
        const m = stmt.match(/DROP CONSTRAINT IF EXISTS "?([a-zA-Z0-9_]+)"?/i)
        return m ? m[1] : null
      })

    expect(dropNames.sort()).toEqual([...baselineNames].sort())
  })

  it('has the exact index columns and predicate', () => {
    const chunks = statements()
    const createStmt = chunks.find(stmt => /^CREATE UNIQUE INDEX\b/i.test(stmt))
    expect(createStmt).toBeDefined()
    expect(createStmt).toMatch(/\(\s*"submission_id"\s*,\s*"rank"\s*,\s*"slot"\s*\)/i)
    expect(createStmt).toMatch(/WHERE \("removed_at" IS NULL\)$/i)
  })

  it('has no CONCURRENTLY, function, trigger, policy, grant, forbidden drop or data change', () => {
    const executable = statements().map(blankStrings)
    const forbidden = [
      /\bCONCURRENTLY\b/i,
      /\bFUNCTION\b/i,
      /\bTRIGGER\b/i,
      /\bPOLICY\b/i,
      /\bROW LEVEL SECURITY\b/i,
      /\bGRANT\b/i,
      /\bREVOKE\b/i,
      /\bTRUNCATE\b/i,
      /\bINSERT\s+INTO\b/i,
      /\bDELETE\s+FROM\b/i,
      /\bUPDATE\s+[\w."]+\s+SET\b/i,
      /\bDROP\s+(TABLE|COLUMN|INDEX|TRIGGER|FUNCTION|POLICY)\b/i,
    ]
    for (const stmt of executable) {
      for (const re of forbidden) {
        expect(stmt, `executable SQL unexpectedly matches ${re}`).not.toMatch(re)
      }
    }
    const dropStatements = executable.filter(stmt => /\bDROP\b/i.test(stmt))
    expect(dropStatements).toHaveLength(2)
    for (const stmt of dropStatements) {
      expect(stmt).toMatch(/^ALTER TABLE\b.*DROP CONSTRAINT IF EXISTS\b/i)
    }
  })
})
