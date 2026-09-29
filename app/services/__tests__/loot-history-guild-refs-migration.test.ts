import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// GH-313 (D-02, D-09): this locks the shape of the migration that adds the
// enforce_loot_history_guild_refs BEFORE INSERT OR UPDATE trigger, which
// rejects loot_history rows whose raid event, raider or loot item belong to
// another guild. The behaviour itself is proven in a PGlite harness outside
// the repo; this test pins what the file is allowed to contain: one read-only
// SECURITY DEFINER trigger function, its trigger, two comments and a REVOKE,
// and no policy, grant, drop or data change.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20260929180000'
const MIGRATION_FILE = path.join(
  MIGRATIONS_DIR,
  `${MIGRATION_TIMESTAMP}_enforce_loot_history_guild_refs.sql`,
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
 * tokens (a plpgsql body is full of them). Chunks are trimmed, empty chunks
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

/** Statement 0 split into the text before `AS $$` and the dollar-quoted body. */
function functionParts(): { prefix: string; body: string } {
  const fn = statements()[0]
  const open = fn.indexOf('$$')
  const close = fn.indexOf('$$', open + 2)
  const prefix = fn.slice(0, open).replace(/\s*AS\s*$/i, '')
  return { prefix, body: fn.slice(open + 2, close) }
}

/** Optional double quotes around an identifier. */
const q = (name: string) => `"?${name}"?`
const FN = `${q('public')}\\.${q('enforce_loot_history_guild_refs')}`
const TABLE = `${q('public')}\\.${q('loot_history')}`

const REFERENCE_COLUMNS = [
  'guild_id',
  'raid_event_id',
  'character_id',
  'loot_item_id',
  'raid_tier_id',
  'expansion_id',
]

describe('loot_history guild references migration shape (GH-313)', () => {
  // Anchored to the newest migration that existed when this one was written
  // (20260929120000), not to a live directory scan, which would fail as soon
  // as any later migration lands (#309 fixed exactly that).
  it('the file exists, sorts after every migration that preceded it, and has a unique timestamp', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20260929120000)

    const sameTimestamp = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(name => name.endsWith('.sql') && name !== path.basename(MIGRATION_FILE))
      .filter(name => name.slice(0, 14) === MIGRATION_TIMESTAMP)
    expect(sameTimestamp).toEqual([])
  })

  it('has exactly one dollar-quoted body and exactly 5 statements, in the required order', () => {
    const codeOnly = stripComments(readMigrationRaw())
    expect(codeOnly.match(/\$\$/g) ?? []).toHaveLength(2)

    const chunks = statements()
    expect(chunks).toHaveLength(5)

    const { prefix } = functionParts()
    expect(prefix).toMatch(new RegExp(`^CREATE OR REPLACE FUNCTION\\s+${FN}\\(\\)\\s+RETURNS\\s+${q('trigger')}\\s`, 'i'))
    expect(prefix).toMatch(new RegExp(`\\bLANGUAGE\\s+${q('plpgsql')}(\\s|$)`, 'i'))
    expect(prefix).toMatch(/\bSECURITY DEFINER\b/i)
    expect(prefix).toMatch(new RegExp(`\\bSET\\s+${q('search_path')}\\s+TO\\s+'public',\\s*'pg_temp'`, 'i'))
    expect(chunks[0]).toMatch(/\bAS \$\$/i)

    expect(chunks[1]).toMatch(new RegExp(`^COMMENT ON FUNCTION\\s+${FN}\\(\\)\\s+IS\\s+'`, 'i'))
    expect(chunks[2]).toMatch(
      new RegExp(`^REVOKE ALL ON FUNCTION\\s+${FN}\\(\\)\\s+FROM\\s+PUBLIC,\\s*${q('anon')},\\s*${q('authenticated')}$`, 'i'),
    )
    expect(chunks[3]).toMatch(
      new RegExp(
        `^CREATE OR REPLACE TRIGGER\\s+${q('enforce_loot_history_guild_refs')}\\s+BEFORE INSERT OR UPDATE OF\\s+.+\\s+ON\\s+${TABLE}\\s+FOR EACH ROW\\s+EXECUTE FUNCTION\\s+${FN}\\(\\)$`,
        'i',
      ),
    )
    expect(chunks[4]).toMatch(
      new RegExp(`^COMMENT ON TRIGGER\\s+${q('enforce_loot_history_guild_refs')}\\s+ON\\s+${TABLE}\\s+IS\\s+'`, 'i'),
    )
  })

  it('the trigger fires BEFORE INSERT and BEFORE UPDATE OF exactly the six reference columns, per row', () => {
    const trigger = blankStrings(statements()[3])
    const ofList = trigger.match(/UPDATE OF\s+(.+?)\s+ON\s+/i)
    expect(ofList).not.toBeNull()
    const columns = ofList![1].split(',').map(col => col.trim().replace(/^"|"$/g, ''))
    expect(columns).toHaveLength(REFERENCE_COLUMNS.length)
    expect(new Set(columns)).toEqual(new Set(REFERENCE_COLUMNS))

    expect(trigger).not.toMatch(/\bAFTER\b/i)
    expect(trigger).not.toMatch(/\bDELETE\b/i)
    expect(trigger).not.toMatch(/\bWHEN\b/i)
    expect(trigger).not.toMatch(/\bFOR EACH STATEMENT\b/i)
  })

  it('outside the function body there is no policy, grant, drop or data change', () => {
    const chunks = statements()
    const { prefix } = functionParts()
    const outsideBody = [prefix, ...chunks.slice(1)].map(blankStrings)

    const forbidden = [
      /\bPOLICY\b/i,
      /\bROW LEVEL SECURITY\b/i,
      /\bGRANT\b/i,
      /\bDROP\b/i,
      /\bTRUNCATE\b/i,
      /\bINSERT\s+INTO\b/i,
      /\bDELETE\s+FROM\b/i,
      /\bUPDATE\s+[\w."]+\s+SET\b/i,
    ]
    for (const stmt of outsideBody) {
      for (const re of forbidden) {
        expect(stmt, `executable SQL unexpectedly matches ${re}`).not.toMatch(re)
      }
    }
  })

  it('the body checks the raid event against NEW.guild_id and raises check_violation with fixed messages', () => {
    const { body } = functionParts()

    expect(body).toMatch(/\bTG_OP\b/)
    expect(body).toMatch(/\bRETURN NEW\b/i)
    expect(body).toMatch(
      /FROM\s+public\.raid_events\s+(\w+)\s+WHERE\s+\1\.id\s*=\s*NEW\.raid_event_id\s+AND\s+\1\.guild_id\s*=\s*NEW\.guild_id/i,
    )

    const raises = [...body.matchAll(/RAISE EXCEPTION\s+'((?:[^']|'')*)'([^;]*);/gi)]
    const raiseCount = (body.match(/\bRAISE EXCEPTION\b/gi) ?? []).length
    expect(raises.length).toBe(raiseCount)
    expect(raiseCount).toBeGreaterThan(0)
    for (const [, message, rest] of raises) {
      expect(message, 'RAISE message must not be a format string').not.toContain('%')
      expect(rest).toMatch(/\bUSING\s+ERRCODE\s*=\s*'check_violation'/i)
    }
  })
})
