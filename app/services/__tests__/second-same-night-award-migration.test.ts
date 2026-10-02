import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// FU-1 of GH #331 and #293 (D-01, D-02): this locks the shape of the
// migration that lets a raider receive a second copy of one item on one raid
// night. It adds loot_history.award_copy and loot_history.source_award_key,
// creates the copy-aware unique index and the per-guild key index, and only
// then drops the old four-column unique index. The behaviour itself is proven
// in a PGlite harness outside the repo; this test pins what the file may
// contain: no function, trigger, policy, grant or data change, and no
// CONCURRENTLY (the deploy script runs the file as one transaction).

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20261001120000'
const MIGRATION_FILE = path.join(
  MIGRATIONS_DIR,
  `${MIGRATION_TIMESTAMP}_allow_second_same_night_award.sql`,
)

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
  const override = process.env.MIGRATION_FILE_OVERRIDE
  return fs.readFileSync(override ? override : MIGRATION_FILE, 'utf8')
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
const TABLE = `${q('public')}\\.${q('loot_history')}`
const PER_NIGHT_PREDICATE =
  `WHERE \\(\\(${q('raid_event_id')} IS NOT NULL\\) AND \\(${q('character_id')} IS NOT NULL\\)\\)`

describe('second same-night award migration shape (FU-1 of #331, #293)', () => {
  // Anchored to the newest migration that existed when this one was written
  // (20260930100000), not to a live directory scan, which would fail as soon
  // as any later migration lands (#309 fixed exactly that).
  it('the file exists, sorts after every migration that preceded it, and has a unique timestamp', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20260930100000)

    const sameTimestamp = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(name => name.endsWith('.sql') && name !== path.basename(MIGRATION_FILE))
      .filter(name => name.slice(0, 14) === MIGRATION_TIMESTAMP)
    expect(sameTimestamp).toEqual([])
  })

  it('has exactly 8 statements, in the required order', () => {
    const codeOnly = stripComments(readMigrationRaw())
    expect(codeOnly).not.toContain('$$')

    const chunks = statements()
    expect(chunks).toHaveLength(8)

    expect(chunks[0]).toMatch(/^SET LOCAL lock_timeout\s*=\s*'5s'$/i)
    expect(chunks[1]).toMatch(
      new RegExp(
        `^ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS ${q('award_copy')} smallint NOT NULL DEFAULT 1 ` +
          `CONSTRAINT ${q('loot_history_award_copy_range')} CHECK \\(\\(${q('award_copy')} >= 1\\) AND \\(${q('award_copy')} <= 10\\)\\)$`,
        'i',
      ),
    )
    expect(chunks[2]).toMatch(
      new RegExp(
        `^ALTER TABLE ${TABLE} ADD COLUMN IF NOT EXISTS ${q('source_award_key')} ${q('text')} ` +
          `CONSTRAINT ${q('loot_history_source_award_key_length')} CHECK \\(\\(${q('source_award_key')} IS NULL\\) OR ` +
          `\\(\\(char_length\\(${q('source_award_key')}\\) >= 1\\) AND \\(char_length\\(${q('source_award_key')}\\) <= 200\\)\\)\\)$`,
        'i',
      ),
    )
    expect(chunks[3]).toMatch(
      new RegExp(
        `^CREATE UNIQUE INDEX IF NOT EXISTS ${q('idx_loot_history_unique_award_copy')} ON ${TABLE} USING ${q('btree')} ` +
          `\\(${q('guild_id')}, ${q('loot_item_id')}, ${q('character_id')}, ${q('raid_event_id')}, ${q('award_copy')}\\) ` +
          `${PER_NIGHT_PREDICATE}$`,
        'i',
      ),
    )
    expect(chunks[4]).toMatch(
      new RegExp(
        `^CREATE UNIQUE INDEX IF NOT EXISTS ${q('idx_loot_history_source_award_key')} ON ${TABLE} USING ${q('btree')} ` +
          `\\(${q('guild_id')}, ${q('source_award_key')}\\) WHERE \\(${q('source_award_key')} IS NOT NULL\\)$`,
        'i',
      ),
    )
    expect(chunks[5]).toMatch(
      new RegExp(`^DROP INDEX IF EXISTS ${q('public')}\\.${q('idx_loot_history_unique_award')}$`, 'i'),
    )
    expect(chunks[6]).toMatch(new RegExp(`^COMMENT ON COLUMN ${TABLE}\\.${q('award_copy')} IS '`, 'i'))
    expect(chunks[7]).toMatch(new RegExp(`^COMMENT ON COLUMN ${TABLE}\\.${q('source_award_key')} IS '`, 'i'))
  })

  it('creates both new unique indexes before dropping the old one', () => {
    const chunks = statements()
    const creates = chunks
      .map((stmt, i) => (/^CREATE UNIQUE INDEX\b/i.test(stmt) ? i : -1))
      .filter(i => i >= 0)
    const drops = chunks
      .map((stmt, i) => (/^DROP INDEX\b/i.test(stmt) ? i : -1))
      .filter(i => i >= 0)
    expect(creates).toHaveLength(2)
    expect(drops).toHaveLength(1)
    for (const create of creates) {
      expect(create).toBeLessThan(drops[0])
    }
  })

  it('keeps the old index predicate on the copy-aware index', () => {
    // The per-night rule must cover exactly the rows the old index covered,
    // so unlinked and characterless awards stay unconstrained.
    const baseline = fs.readFileSync(
      path.join(MIGRATIONS_DIR, '20260101000000_baseline_schema.sql'),
      'utf8',
    )
    const oldIndex = baseline.match(/CREATE UNIQUE INDEX "idx_loot_history_unique_award" .*? (WHERE .*);/)
    expect(oldIndex).not.toBeNull()
    expect(statements()[3].endsWith(oldIndex![1])).toBe(true)
  })

  it('has no CONCURRENTLY, function, trigger, policy, grant, other drop or data change', () => {
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
      /\bDROP\s+(TABLE|COLUMN|CONSTRAINT|TRIGGER|FUNCTION|POLICY)\b/i,
    ]
    for (const stmt of executable) {
      for (const re of forbidden) {
        expect(stmt, `executable SQL unexpectedly matches ${re}`).not.toMatch(re)
      }
    }
    expect(executable.filter(stmt => /\bDROP\b/i.test(stmt))).toHaveLength(1)
  })
})
