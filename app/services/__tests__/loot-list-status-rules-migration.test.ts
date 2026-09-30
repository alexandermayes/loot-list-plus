import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Loot list status rules: this locks the shape of the migration that adds
// the enforce_loot_submission_status_rules trigger on loot_submissions, the
// enforce_loot_submission_item_rules trigger on loot_submission_items, and
// drops the loot_submission_snapshots INSERT policy. The behaviour itself is
// proven in a PGlite harness outside the repo; this test pins what the file
// is allowed to contain: two read-only SECURITY DEFINER trigger functions,
// their triggers, comments and REVOKEs, one DROP POLICY IF EXISTS, and no
// policy creation, grant or data change.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20260930000000'
const MIGRATION_FILE = path.join(
  MIGRATIONS_DIR,
  `${MIGRATION_TIMESTAMP}_enforce_loot_list_status_rules.sql`,
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

/** A CREATE FUNCTION statement split into the text before `AS $$` and the
 * dollar-quoted body. */
function functionParts(index: number): { prefix: string; body: string } {
  const fn = statements()[index]
  const open = fn.indexOf('$$')
  const close = fn.indexOf('$$', open + 2)
  const prefix = fn.slice(0, open).replace(/\s*AS\s*$/i, '')
  return { prefix, body: fn.slice(open + 2, close) }
}
const statusFn = () => functionParts(0)
const itemFn = () => functionParts(5)

/** Optional double quotes around an identifier. */
const q = (name: string) => `"?${name}"?`
const STATUS_FN = `${q('public')}\\.${q('enforce_loot_submission_status_rules')}`
const ITEM_FN = `${q('public')}\\.${q('enforce_loot_submission_item_rules')}`
const SUBMISSIONS = `${q('public')}\\.${q('loot_submissions')}`
const ITEMS = `${q('public')}\\.${q('loot_submission_items')}`
const SNAPSHOTS = `${q('public')}\\.${q('loot_submission_snapshots')}`

const STATUS_TRIGGER_COLUMNS = [
  'status',
  'guild_id',
  'character_id',
  'expansion_id',
  'phase',
  'original_phase',
  'raid_tier_id',
  'reviewed_at',
  'reviewed_by',
  'review_notes',
  'change_rejected_at',
]
const REVIEW_COLUMNS = ['reviewed_at', 'reviewed_by', 'review_notes', 'change_rejected_at']
// original_phase is here because merge_phase_groups restores phase from it.
const RESCOPE_COLUMNS = ['guild_id', 'character_id', 'expansion_id', 'phase', 'original_phase', 'raid_tier_id']

const CLIENT_DETECTION = /current_setting\('role',\s*true\)\s+IN\s+\('anon',\s*'authenticated'\)/i

describe('loot list status rules migration shape', () => {
  // Anchored to the newest migration that existed when this one was written
  // (20260929180000), not to a live directory scan, which would fail as soon
  // as any later migration lands (#309 fixed exactly that).
  it('the file exists, sorts after every migration that preceded it, and has a unique timestamp', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20260929180000)

    const sameTimestamp = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(name => name.endsWith('.sql') && name !== path.basename(MIGRATION_FILE))
      .filter(name => name.slice(0, 14) === MIGRATION_TIMESTAMP)
    expect(sameTimestamp).toEqual([])
  })

  it('has exactly two dollar-quoted bodies and exactly 11 statements, in the required order', () => {
    const codeOnly = stripComments(readMigrationRaw())
    expect(codeOnly.match(/\$\$/g) ?? []).toHaveLength(4)

    const chunks = statements()
    expect(chunks).toHaveLength(11)

    for (const [index, fnName] of [[0, STATUS_FN], [5, ITEM_FN]] as const) {
      const { prefix } = functionParts(index)
      expect(prefix).toMatch(new RegExp(`^CREATE OR REPLACE FUNCTION\\s+${fnName}\\(\\)\\s+RETURNS\\s+${q('trigger')}\\s`, 'i'))
      expect(prefix).toMatch(new RegExp(`\\bLANGUAGE\\s+${q('plpgsql')}(\\s|$)`, 'i'))
      expect(prefix).toMatch(/\bSECURITY DEFINER\b/i)
      expect(prefix).toMatch(new RegExp(`\\bSET\\s+${q('search_path')}\\s+TO\\s+'public',\\s*'pg_temp'`, 'i'))
      expect(chunks[index]).toMatch(/\bAS \$\$/i)
      expect(chunks[index + 1]).toMatch(new RegExp(`^COMMENT ON FUNCTION\\s+${fnName}\\(\\)\\s+IS\\s+'`, 'i'))
      expect(chunks[index + 2]).toMatch(
        new RegExp(`^REVOKE ALL ON FUNCTION\\s+${fnName}\\(\\)\\s+FROM\\s+PUBLIC,\\s*${q('anon')},\\s*${q('authenticated')}$`, 'i'),
      )
    }

    expect(chunks[3]).toMatch(
      new RegExp(
        `^CREATE OR REPLACE TRIGGER\\s+${q('enforce_loot_submission_status_rules')}\\s+BEFORE INSERT OR UPDATE OF\\s+.+\\s+ON\\s+${SUBMISSIONS}\\s+FOR EACH ROW\\s+EXECUTE FUNCTION\\s+${STATUS_FN}\\(\\)$`,
        'i',
      ),
    )
    expect(chunks[4]).toMatch(
      new RegExp(`^COMMENT ON TRIGGER\\s+${q('enforce_loot_submission_status_rules')}\\s+ON\\s+${SUBMISSIONS}\\s+IS\\s+'`, 'i'),
    )
    expect(chunks[8]).toMatch(
      new RegExp(
        `^CREATE OR REPLACE TRIGGER\\s+${q('enforce_loot_submission_item_rules')}\\s+BEFORE INSERT OR UPDATE OR DELETE\\s+ON\\s+${ITEMS}\\s+FOR EACH ROW\\s+EXECUTE FUNCTION\\s+${ITEM_FN}\\(\\)$`,
        'i',
      ),
    )
    expect(chunks[9]).toMatch(
      new RegExp(`^COMMENT ON TRIGGER\\s+${q('enforce_loot_submission_item_rules')}\\s+ON\\s+${ITEMS}\\s+IS\\s+'`, 'i'),
    )
    expect(chunks[10]).toMatch(
      new RegExp(`^DROP POLICY IF EXISTS\\s+"loot_submission_snapshots_insert"\\s+ON\\s+${SNAPSHOTS}$`, 'i'),
    )
  })

  it('the loot_submissions trigger fires BEFORE INSERT and BEFORE UPDATE OF exactly the eleven rule columns, per row', () => {
    const trigger = blankStrings(statements()[3])
    const ofList = trigger.match(/UPDATE OF\s+(.+?)\s+ON\s+/i)
    expect(ofList).not.toBeNull()
    const columns = ofList![1].split(',').map(col => col.trim().replace(/^"|"$/g, ''))
    expect(columns).toHaveLength(STATUS_TRIGGER_COLUMNS.length)
    expect(new Set(columns)).toEqual(new Set(STATUS_TRIGGER_COLUMNS))

    expect(trigger).not.toMatch(/\bAFTER\b/i)
    expect(trigger).not.toMatch(/\bDELETE\b/i)
    expect(trigger).not.toMatch(/\bWHEN\b/i)
    expect(trigger).not.toMatch(/\bFOR EACH STATEMENT\b/i)
  })

  it('the loot_submission_items trigger fires BEFORE INSERT, UPDATE and DELETE, per row, with no column list', () => {
    const trigger = blankStrings(statements()[8])
    expect(trigger).not.toMatch(/\bUPDATE OF\b/i)
    expect(trigger).not.toMatch(/\bAFTER\b/i)
    expect(trigger).not.toMatch(/\bWHEN\b/i)
    expect(trigger).not.toMatch(/\bFOR EACH STATEMENT\b/i)
  })

  it('outside the function bodies there is no policy creation, grant, other drop or data change', () => {
    const chunks = statements()
    const outsideBodies = [
      statusFn().prefix,
      ...chunks.slice(1, 5),
      itemFn().prefix,
      ...chunks.slice(6, 10),
    ].map(blankStrings)

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
    for (const stmt of outsideBodies) {
      for (const re of forbidden) {
        expect(stmt, `executable SQL unexpectedly matches ${re}`).not.toMatch(re)
      }
    }

    // The one DROP is the snapshot INSERT policy, and nothing creates a policy.
    const all = chunks.map(blankStrings).join(';\n')
    expect(all.match(/\bDROP\b/gi) ?? []).toHaveLength(1)
    expect(all).not.toMatch(/\bCREATE\s+POLICY\b/i)
    expect(all).not.toMatch(/\bALTER\s+POLICY\b/i)
  })

  it('both bodies are read-only', () => {
    for (const { body: raw } of [statusFn(), itemFn()]) {
      const body = blankStrings(raw)
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
    }
  })

  it('both bodies detect client callers by the session role setting', () => {
    for (const { body } of [statusFn(), itemFn()]) {
      expect(body).toMatch(CLIENT_DETECTION)
      expect(body).not.toMatch(/\bcurrent_user\b/i)
      expect(body).not.toMatch(/\bsession_user\b/i)
    }
  })

  it('every RAISE uses the USING form with a fixed message; clients get insufficient_privilege without DETAIL, others check_violation with DETAIL', () => {
    const rlsSubmissions = `'new row violates row-level security policy for table "loot_submissions"'`
    const rlsItems = `'new row violates row-level security policy for table "loot_submission_items"'`
    const deniedItems = `'permission denied for table loot_submission_items'`
    const r1Message = `'loot_submissions: a pending or approved list needs an active guild membership'`

    for (const { body } of [statusFn(), itemFn()]) {
      expect(body).not.toMatch(/\bRAISE\s+(EXCEPTION\s+)?'/i)
      expect(body).not.toMatch(/\bRAISE\s+(NOTICE|WARNING|INFO|LOG|DEBUG)\b/i)
      const raises = body.match(/\bRAISE\b[^;]*;/gi) ?? []
      expect(raises.length).toBeGreaterThan(0)
      for (const raise of raises) {
        expect(raise).toMatch(/^RAISE EXCEPTION USING MESSAGE\s*=\s*'/i)
        const message = raise.match(/MESSAGE\s*=\s*('(?:[^']|'')*')/i)![1]
        expect(message).not.toContain('%')
        if (/ERRCODE\s*=\s*'insufficient_privilege'/i.test(raise)) {
          expect(raise).not.toMatch(/\bDETAIL\b/i)
          expect([rlsSubmissions, rlsItems, deniedItems]).toContain(message)
        } else {
          expect(raise).toMatch(/ERRCODE\s*=\s*'check_violation'/i)
          expect(raise).toMatch(/\bDETAIL\s*=\s*format\('rule R1,/i)
          expect(message).toBe(r1Message)
        }
      }
    }

    const statusRaises = statusFn().body.match(/\bRAISE\b[^;]*;/gi) ?? []
    expect(statusRaises).toHaveLength(3)
    expect(statusRaises.filter(r => /check_violation/i.test(r))).toHaveLength(1)
    const itemRaises = itemFn().body.match(/\bRAISE\b[^;]*;/gi) ?? []
    expect(itemRaises).toHaveLength(2)
    expect(itemRaises.every(r => /insufficient_privilege/i.test(r))).toBe(true)
  })

  it('R1 checks an active membership for the row character and guild, and only client callers reach the officer rules', () => {
    const { body } = statusFn()
    expect(body).toMatch(
      /FROM\s+public\.character_guild_memberships\s+(\w+)\s+WHERE\s+\1\.character_id\s*=\s*NEW\.character_id\s+AND\s+\1\.guild_id\s*=\s*NEW\.guild_id\s+AND\s+\1\.is_active\s*=\s*true/i,
    )
    expect(body).toMatch(/NEW\.status\s+IN\s+\('pending',\s*'approved'\)/i)
    const r1Raise = body.search(/ERRCODE\s*=\s*'check_violation'/i)
    const clientReturn = body.search(/IF\s+NOT\s+v_is_client\s+THEN\s+RETURN NEW\s*;\s*END IF\s*;/i)
    const officer = body.search(/\bis_guild_officer\b/i)
    expect(r1Raise).toBeGreaterThanOrEqual(0)
    expect(clientReturn).toBeGreaterThan(r1Raise)
    expect(officer).toBeGreaterThan(clientReturn)
  })

  it('R4 requires the caller to own the character and the character to be an active member', () => {
    const { body } = statusFn()
    expect(body).toMatch(
      /FROM\s+public\.characters\s+(\w+)\s+JOIN\s+public\.character_guild_memberships\s+(\w+)\s+ON\s+\2\.character_id\s*=\s*\1\.id\s+WHERE\s+\1\.id\s*=\s*NEW\.character_id\s+AND\s+\1\.user_id\s*=\s*auth\.uid\(\)\s+AND\s+\2\.guild_id\s*=\s*NEW\.guild_id\s+AND\s+\2\.is_active\s*=\s*true/i,
    )
  })

  it('the officer lookup runs once per body, only after the rules, against the row or parent guild', () => {
    const { body: status } = statusFn()
    expect(status.match(/\bis_guild_officer\b/gi) ?? []).toHaveLength(1)
    expect(status).toMatch(/IF\s+v_needs_officer\s+AND\s+NOT\s+public\.is_guild_officer\(NEW\.guild_id\)\s+THEN/i)
    const lastRule = Math.max(
      status.search(/\bpg_trigger_depth\(\)/i),
      status.search(/FROM\s+public\.characters\b/i),
    )
    expect(status.search(/\bis_guild_officer\b/i)).toBeGreaterThan(lastRule)

    const { body: items } = itemFn()
    expect(items.match(/\bis_guild_officer\b/gi) ?? []).toHaveLength(1)
    expect(items).toMatch(/FROM\s+public\.loot_submissions\s+(\w+)\s+WHERE\s+\1\.id\s+IN\s+\(v_new_submission,\s*v_old_submission\)\s+AND\s+\1\.status\s+IN\s+\('pending',\s*'approved'\)/i)
    expect(items).toMatch(/NOT\s+public\.is_guild_officer\(v_parent_guild\)/i)
  })

  it('UPDATE compares every rule column with OLD, and OLD is read only after a TG_OP test', () => {
    const { body } = statusFn()
    for (const col of [...RESCOPE_COLUMNS, 'status', ...REVIEW_COLUMNS]) {
      expect(body, `missing IS DISTINCT FROM OLD.${col}`).toMatch(new RegExp(`\\bNEW\\.${col}\\s+IS DISTINCT FROM\\s+OLD\\.${col}\\b`, 'i'))
    }
    for (const { body: b } of [statusFn(), itemFn()]) {
      const firstOld = b.search(/\bOLD\b/)
      const tgOp = b.search(/\bTG_OP\s*=\s*'(UPDATE|DELETE)'/i)
      expect(tgOp).toBeGreaterThanOrEqual(0)
      expect(firstOld).toBeGreaterThan(tgOp)
    }
  })

  it('R3 is the only rule exempt for nested trigger writes, and requires NULL or unchanged review fields', () => {
    const codeOnly = statements().join(';\n')
    expect(codeOnly.match(/\bpg_trigger_depth\b/gi) ?? []).toHaveLength(1)
    const { body } = statusFn()
    expect(body).toMatch(/\bpg_trigger_depth\(\)\s*<=\s*1\b/i)
    for (const col of REVIEW_COLUMNS) {
      expect(body).toMatch(new RegExp(`\\bNEW\\.${col}\\s+IS NOT NULL\\b`, 'i'))
    }
    expect(itemFn().body).not.toMatch(/\bpg_trigger_depth\b/i)
  })

  it('the items body lets non-client callers through first and returns OLD for DELETE', () => {
    const { body } = itemFn()
    const clientGate = body.search(/IF\s+NOT\s+v_is_client\s+THEN/i)
    const lookup = body.search(/FROM\s+public\.loot_submissions\b/i)
    expect(clientGate).toBeGreaterThanOrEqual(0)
    expect(lookup).toBeGreaterThan(clientGate)
    expect(body).toMatch(/\bRETURN OLD\b/i)
    expect(body).toMatch(/\bRETURN NEW\b/i)
  })
})
