import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Quick task 260929-qzn: this locks the shape of the migration that adds the
// guild membership write rules. Membership rows are written by the server
// and a user session can only leave a guild; guild roles written by a user
// session stay below officer level; guild ownership and the subscription
// tier are server-managed. The behaviour itself is proven in a PGlite
// harness outside the repo. This test pins what the file may contain: three
// read-only SECURITY DEFINER trigger functions, their triggers, comments and
// REVOKEs, and two DROP POLICY IF EXISTS statements, with no policy creation,
// grant or data change.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20260930000100'
const MIGRATION_FILE = path.join(
  MIGRATIONS_DIR,
  `${MIGRATION_TIMESTAMP}_enforce_guild_membership_write_rules.sql`,
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
  return fs.readFileSync(MIGRATION_FILE, 'utf8')
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
function functionParts(fn: string): { prefix: string; body: string } {
  const open = fn.indexOf('$$')
  const close = fn.indexOf('$$', open + 2)
  const prefix = fn.slice(0, open).replace(/\s*AS\s*$/i, '')
  return { prefix, body: fn.slice(open + 2, close) }
}

/** Optional double quotes around an identifier. */
const q = (name: string) => `"?${name}"?`
const fnRef = (name: string) => `${q('public')}\\.${q(name)}`
const tableRef = (name: string) => `${q('public')}\\.${q(name)}`

interface Rule {
  fn: string
  table: string
  /** Index of the CREATE FUNCTION statement; the next four follow it. */
  start: number
  /** Trigger event clause between BEFORE and ON. */
  events: RegExp
}

const RULES: Rule[] = [
  {
    fn: 'enforce_guild_membership_write_rules',
    table: 'character_guild_memberships',
    start: 0,
    events: /^INSERT OR UPDATE$/i,
  },
  {
    fn: 'enforce_guild_role_write_rules',
    table: 'guild_roles',
    start: 7,
    events: /^INSERT OR UPDATE$/i,
  },
  {
    fn: 'enforce_guild_owner_write_rules',
    table: 'guilds',
    start: 12,
    events: /^INSERT OR UPDATE OF "?created_by"?, "?subscription_tier"?$/i,
  },
]

const DROPPED_POLICIES = [
  'Users can insert own character memberships',
  'Users can delete own character memberships',
]

function bodyOf(rule: Rule): string {
  return functionParts(statements()[rule.start]).body
}

describe('guild membership write rules migration shape (260929-qzn)', () => {
  // Anchored to the newest migration that existed when this one was written
  // (20260930000000, quick task 260929-qg0), not to a live directory scan,
  // which would fail as soon as any later migration lands (#309).
  it('the file exists, sorts after every migration that preceded it, and has a unique timestamp', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20260930000000)

    const sameTimestamp = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(name => name.endsWith('.sql') && name !== path.basename(MIGRATION_FILE))
      .filter(name => name.slice(0, 14) === MIGRATION_TIMESTAMP)
    expect(sameTimestamp).toEqual([])
  })

  it('has exactly three dollar-quoted bodies and exactly 17 statements, in the required order', () => {
    const codeOnly = stripComments(readMigrationRaw())
    expect(codeOnly.match(/\$\$/g) ?? []).toHaveLength(6)

    const chunks = statements()
    expect(chunks).toHaveLength(17)

    for (const rule of RULES) {
      const FN = fnRef(rule.fn)
      const TABLE = tableRef(rule.table)
      const { prefix } = functionParts(chunks[rule.start])
      expect(prefix).toMatch(new RegExp(`^CREATE OR REPLACE FUNCTION\\s+${FN}\\(\\)\\s+RETURNS\\s+${q('trigger')}\\s`, 'i'))
      expect(prefix).toMatch(new RegExp(`\\bLANGUAGE\\s+${q('plpgsql')}(\\s|$)`, 'i'))
      expect(prefix).toMatch(/\bSECURITY DEFINER\b/i)
      expect(prefix).toMatch(new RegExp(`\\bSET\\s+${q('search_path')}\\s+TO\\s+'public',\\s*'pg_temp'`, 'i'))
      expect(chunks[rule.start]).toMatch(/\bAS \$\$/i)

      expect(chunks[rule.start + 1]).toMatch(new RegExp(`^COMMENT ON FUNCTION\\s+${FN}\\(\\)\\s+IS\\s+'`, 'i'))
      expect(chunks[rule.start + 2]).toMatch(
        new RegExp(`^REVOKE ALL ON FUNCTION\\s+${FN}\\(\\)\\s+FROM\\s+PUBLIC,\\s*${q('anon')},\\s*${q('authenticated')}$`, 'i'),
      )
      expect(chunks[rule.start + 3]).toMatch(
        new RegExp(
          `^CREATE OR REPLACE TRIGGER\\s+${q(rule.fn)}\\s+BEFORE\\s+.+?\\s+ON\\s+${TABLE}\\s+FOR EACH ROW\\s+EXECUTE FUNCTION\\s+${FN}\\(\\)$`,
          'i',
        ),
      )
      expect(chunks[rule.start + 4]).toMatch(
        new RegExp(`^COMMENT ON TRIGGER\\s+${q(rule.fn)}\\s+ON\\s+${TABLE}\\s+IS\\s+'`, 'i'),
      )
    }

    expect(chunks[5]).toBe(
      `DROP POLICY IF EXISTS "${DROPPED_POLICIES[0]}" ON "public"."character_guild_memberships"`,
    )
    expect(chunks[6]).toBe(
      `DROP POLICY IF EXISTS "${DROPPED_POLICIES[1]}" ON "public"."character_guild_memberships"`,
    )
  })

  it('each trigger fires BEFORE exactly the planned events, per row, with no DELETE', () => {
    const chunks = statements()
    for (const rule of RULES) {
      const trigger = blankStrings(chunks[rule.start + 3])
      const events = trigger.match(/\bBEFORE\s+(.+?)\s+ON\s+/i)
      expect(events, rule.fn).not.toBeNull()
      expect(events![1], rule.fn).toMatch(rule.events)

      expect(trigger).not.toMatch(/\bAFTER\b/i)
      expect(trigger).not.toMatch(/\bDELETE\b/i)
      expect(trigger).not.toMatch(/\bWHEN\b/i)
      expect(trigger).not.toMatch(/\bFOR EACH STATEMENT\b/i)
    }
  })

  it('outside the function bodies there is no policy creation, grant, other drop or data change', () => {
    const chunks = statements()
    const bodyStarts = new Set(RULES.map(rule => rule.start))
    const outsideBody = chunks
      .map((chunk, i) => (bodyStarts.has(i) ? functionParts(chunk).prefix : chunk))
      .filter((_, i) => i !== 5 && i !== 6)
      .map(blankStrings)

    const forbidden = [
      /\bPOLICY\b/i,
      /\bROW LEVEL SECURITY\b/i,
      /\bGRANT\b/i,
      /\bDROP\b/i,
      /\bTRUNCATE\b/i,
      /\bINSERT\s+INTO\b/i,
      /\bDELETE\s+FROM\b/i,
      /\bUPDATE\s+[\w."]+\s+SET\b/i,
      /\bALTER\b/i,
    ]
    for (const stmt of outsideBody) {
      for (const re of forbidden) {
        expect(stmt, `executable SQL unexpectedly matches ${re}`).not.toMatch(re)
      }
    }

    const drops = chunks.filter(chunk => /\bDROP\b/i.test(blankStrings(chunk)))
    expect(drops).toEqual(
      DROPPED_POLICIES.map(name => `DROP POLICY IF EXISTS "${name}" ON "public"."character_guild_memberships"`),
    )
  })

  it('each body checks only user sessions, exempts nested trigger writes, and raises the RLS error', () => {
    for (const rule of RULES) {
      const body = bodyOf(rule)

      expect(body, rule.fn).toMatch(/current_setting\('role',\s*true\)/i)
      expect(body, rule.fn).toMatch(/\(\s*'anon',\s*'authenticated'\s*\)/i)
      expect(body.match(/pg_trigger_depth\(\)\s*>\s*1/gi) ?? [], rule.fn).toHaveLength(1)
      expect(body, rule.fn).toMatch(/\bRETURN NEW\b/i)

      // The guard comes first: nothing is checked before it.
      const guard = body.search(/current_setting\('role',\s*true\)/i)
      const firstNewOrOld = body.search(/\b(NEW|OLD)\.|to_jsonb\(/)
      expect(guard, rule.fn).toBeLessThan(firstNewOrOld)

      // Exactly one RAISE, in the USING form, with the RLS message, the RLS
      // error code and no DETAIL.
      const raises = body.match(/\bRAISE\b[^;]*;/gi) ?? []
      expect(raises, rule.fn).toHaveLength(1)
      expect(body).not.toMatch(/\bRAISE\s+(EXCEPTION\s+)?'/i)
      expect((raises[0] ?? '').replace(/\s+/g, ' ')).toBe(
        `RAISE EXCEPTION USING MESSAGE = 'new row violates row-level security policy for table "${rule.table}"', ERRCODE = 'insufficient_privilege';`,
      )
      expect(body).not.toMatch(/\bcheck_violation\b/i)
      expect(body).not.toMatch(/\bDETAIL\b/i)
      expect(body).not.toMatch(/\bis_guild_officer\b/i)
      expect(body).not.toMatch(/\bis_guild_master\b/i)
    }
  })

  it('OLD is read only after a TG_OP test in every body', () => {
    for (const rule of RULES) {
      const body = bodyOf(rule)
      const firstOld = body.search(/\bOLD\b/)
      const tgOp = body.search(/\bTG_OP\s*=\s*'(UPDATE|INSERT)'/i)
      expect(tgOp, rule.fn).toBeGreaterThanOrEqual(0)
      expect(firstOld, rule.fn).toBeGreaterThan(tgOp)
    }
  })

  it('the membership rule compares the whole row minus is_active and allows is_active only to stay or become false', () => {
    const body = bodyOf(RULES[0])
    expect(body).toMatch(
      /\(\s*to_jsonb\(NEW\)\s*-\s*'is_active'\s*\)\s+IS NOT DISTINCT FROM\s+\(\s*to_jsonb\(OLD\)\s*-\s*'is_active'\s*\)/i,
    )
    expect(body).toMatch(/NEW\.is_active\s+IS NOT DISTINCT FROM\s+OLD\.is_active\s+OR\s+NEW\.is_active\s*=\s*false/i)
    expect(body).toMatch(/\bTG_OP\s*=\s*'UPDATE'/i)
    // INSERT has no accepting branch.
    expect(body).not.toMatch(/\bTG_OP\s*=\s*'INSERT'/i)
  })

  it('the guild_roles rule keeps user-session roles below position 50 and compares the whole row minus position', () => {
    const body = bodyOf(RULES[1])
    expect(body).toMatch(/NEW\.position\s*<\s*50\s+AND\s+NEW\.is_default\s+IS NOT TRUE/i)
    expect(body).toMatch(
      /\(\s*to_jsonb\(NEW\)\s*-\s*'position'\s*\)\s+IS NOT DISTINCT FROM\s+\(\s*to_jsonb\(OLD\)\s*-\s*'position'\s*\)/i,
    )
    expect(body).toMatch(
      /NEW\.position\s+IS NOT DISTINCT FROM\s+OLD\.position\s+OR\s+\(\s*OLD\.position\s*<\s*50\s+AND\s+NEW\.position\s*<\s*50\s*\)/i,
    )
    const thresholds = body.match(/\b\d+\b/g)?.filter(n => n !== '1') ?? []
    expect(new Set(thresholds)).toEqual(new Set(['50']))
  })

  it('the guilds rule keeps created_by unchanged and subscription_tier free on insert and unchanged on update', () => {
    const body = bodyOf(RULES[2])
    expect(body).toMatch(/NEW\.subscription_tier\s*=\s*'free'/i)
    expect(body).toMatch(/NEW\.created_by\s+IS NOT DISTINCT FROM\s+OLD\.created_by/i)
    expect(body).toMatch(/NEW\.subscription_tier\s+IS NOT DISTINCT FROM\s+OLD\.subscription_tier/i)
    expect(body).not.toMatch(/to_jsonb\(/i)
  })

  it('every body is read-only', () => {
    for (const rule of RULES) {
      const body = blankStrings(bodyOf(rule))
      const forbidden = [
        /\bINSERT\s+INTO\b/i,
        /\bDELETE\s+FROM\b/i,
        /\bUPDATE\s+[\w."]+\s+SET\b/i,
        /\bTRUNCATE\b/i,
        /\bEXECUTE\b/i,
        /\bset_config\b/i,
        /\bALTER\b/i,
        /\bCREATE\b/i,
        /\bDROP\b/i,
        /\bGRANT\b/i,
        /\bSELECT\b/i,
        /\bFROM\s+public\./i,
      ]
      for (const re of forbidden) {
        expect(body, `${rule.fn} body unexpectedly matches ${re}`).not.toMatch(re)
      }
    }
  })
})
