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

    // One fixed message per rule, never a format string.
    const messages = [...body.matchAll(/\bv_error\s*:=\s*'((?:[^']|'')*)'\s*;/gi)].map(m => m[1])
    expect(messages).toEqual([
      'loot_history.raid_event_id is not a raid event of this guild',
      'loot_history.character_id is not an active member of this guild',
      'loot_history.loot_item_id is not a loot item of this guild',
      'loot_history.raid_tier_id is not the raid tier of its loot item',
      'loot_history.expansion_id is not the expansion of its loot item',
    ])
    for (const message of messages) {
      expect(message).not.toContain('%')
    }

    // Exactly two RAISEs, both in the USING form (no format string at all):
    // the RLS-equivalent refusal, then the check_violation for v_error.
    const raises = body.match(/\bRAISE\b[^;]*;/gi) ?? []
    expect(raises).toHaveLength(2)
    expect(body).not.toMatch(/\bRAISE\s+(EXCEPTION\s+)?'/i)
    expect(raises[1]).toMatch(
      /^RAISE EXCEPTION USING MESSAGE\s*=\s*v_error,\s*ERRCODE\s*=\s*'check_violation',\s*DETAIL\s*=\s*v_detail\s*;$/i,
    )
  })

  // PostgreSQL runs BEFORE ROW triggers before the RLS WITH CHECK, so when a
  // check fails for a caller RLS would refuse anyway, they must get RLS's own
  // error, or the 23514 would tell them whether a raid event, raider or item
  // is the guild's. A row that passes is always handed on, so the gate can
  // never block a write (the ON DELETE SET NULL cascade included).
  it('a failed check gives anon and authenticated non-officers the RLS error, and a passing row is always handed on', () => {
    const { body } = functionParts()

    const passThrough = body.search(/IF\s+v_error\s+IS\s+NULL\s+THEN\s+RETURN NEW\s*;\s*END IF\s*;/i)
    const gate = body.search(
      /IF\s+current_setting\('role',\s*true\)\s+IN\s+\('anon',\s*'authenticated'\)\s+AND\s+NOT\s+public\.is_guild_officer\(NEW\.guild_id\)\s+THEN\s+RAISE EXCEPTION USING\s+MESSAGE\s*=\s*'new row violates row-level security policy for table "loot_history"',\s*ERRCODE\s*=\s*'insufficient_privilege'\s*;\s*END IF\s*;/i,
    )
    const checkRaise = body.search(/RAISE EXCEPTION USING MESSAGE\s*=\s*v_error\b/i)
    const lastLookup = Math.max(
      ...['raid_events', 'character_guild_memberships', 'loot_items'].map(t => body.search(new RegExp(`\\bFROM\\s+public\\.${t}\\b`, 'i'))),
    )

    expect(passThrough).toBeGreaterThan(lastLookup)
    expect(gate).toBeGreaterThan(passThrough)
    expect(checkRaise).toBeGreaterThan(gate)
    expect(body.match(/\bis_guild_officer\b/gi) ?? []).toHaveLength(1)
  })

  it('the body checks active membership and the item, tier and expansion chain', () => {
    const { body } = functionParts()

    expect(body).toMatch(
      /FROM\s+public\.character_guild_memberships\s+(\w+)\s+WHERE\s+\1\.character_id\s*=\s*NEW\.character_id\s+AND\s+\1\.guild_id\s*=\s*NEW\.guild_id\s+AND\s+\1\.is_active\s*=\s*true/i,
    )
    expect(body).toMatch(
      /FROM\s+public\.loot_items\s+(\w+)\s+JOIN\s+public\.raid_tiers\s+(\w+)\s+ON\s+\2\.id\s*=\s*\1\.raid_tier_id\s+JOIN\s+public\.expansions\s+(\w+)\s+ON\s+\3\.id\s*=\s*\2\.expansion_id\s+WHERE\s+\1\.id\s*=\s*NEW\.loot_item_id/i,
    )
    expect(body).toMatch(/\bNEW\.raid_tier_id\s+IS DISTINCT FROM\s+v_item_tier\b/i)
    expect(body).toMatch(/\bNEW\.expansion_id\s+IS DISTINCT FROM\s+v_tier_expansion\b/i)
    expect(body).toMatch(/\bv_item_guild\s+IS DISTINCT FROM\s+NEW\.guild_id\b/i)
  })

  it('UPDATE compares every reference column with OLD, and OLD is read only after the TG_OP test', () => {
    const { body } = functionParts()

    for (const col of REFERENCE_COLUMNS) {
      expect(body, `missing IS DISTINCT FROM OLD.${col}`).toMatch(
        new RegExp(`\\bIS (NOT )?DISTINCT FROM OLD\\.${col}\\b`, 'i'),
      )
    }

    const firstOld = body.search(/\bOLD\./)
    const tgOp = body.search(/\bTG_OP\s*=\s*'UPDATE'/i)
    expect(tgOp).toBeGreaterThanOrEqual(0)
    expect(firstOld).toBeGreaterThan(tgOp)
  })

  it('the body is read-only', () => {
    const body = blankStrings(functionParts().body)
    const forbidden = [
      /\bINSERT\s+INTO\b/i,
      /\bDELETE\s+FROM\b/i,
      /\bTRUNCATE\b/i,
      /\bEXECUTE\b/i,
      /\bset_config\b/i,
      /\bALTER\b/i,
      /\bDROP\b/i,
      /\bGRANT\b/i,
      /\bUPDATE\s+[\w."]+\s+SET\b/i,
    ]
    for (const re of forbidden) {
      expect(body, `function body unexpectedly matches ${re}`).not.toMatch(re)
    }
  })
})
