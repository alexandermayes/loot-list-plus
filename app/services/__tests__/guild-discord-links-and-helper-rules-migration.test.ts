import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Quick task 261002-l8o: this locks the shape of the migration that keeps a
// guild's Discord server link server-written, moves the guild helpers used
// by policies onto the signed-in user, makes invite redemption server-only
// and keeps character aliases inside their guild. The behaviour itself is
// proven in a PGlite harness outside the repo. This test pins what the file
// may contain: 21 statements in a fixed order, two SECURITY DEFINER trigger
// functions with their triggers, one RLS helper, two rebuilt policies, one
// function drop and the invite function grants, with no data change.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20261002120000'
const MIGRATION_FILE = path.join(
  MIGRATIONS_DIR,
  `${MIGRATION_TIMESTAMP}_guild_discord_links_and_helper_rules.sql`,
)

/** Strip line comments (trimmed lines starting with `--`, and trailing `--`
 * to end of line on a code line). No string literal in this SQL contains
 * two hyphens (checked below), so this is safe. */
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
 * tokens (a function body is full of them). Chunks are trimmed, empty chunks
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

/** Remove every dollar-quoted body, leaving `$$$$`. */
function withoutBodies(sql: string): string {
  return sql.replace(/\$\$[\s\S]*?\$\$/g, '$$$$')
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
const ref = (name: string) => `${q('public')}\\.${q(name)}`

const MEMBERSHIPS_POLICY = 'Guild members can view guild memberships'
const PROFILES_POLICY = 'Profiles viewable by self or guildmates'

/** The D-01 statement list, in order. */
const EXPECTED_ORDER: RegExp[] = [
  new RegExp(`^CREATE OR REPLACE FUNCTION ${ref('enforce_guild_discord_link_rules')}\\(\\)`, 'i'),
  new RegExp(`^COMMENT ON FUNCTION ${ref('enforce_guild_discord_link_rules')}\\(\\) IS `, 'i'),
  new RegExp(`^REVOKE ALL ON FUNCTION ${ref('enforce_guild_discord_link_rules')}\\(\\) FROM `, 'i'),
  new RegExp(`^CREATE OR REPLACE TRIGGER ${q('enforce_guild_discord_link_rules')} `, 'i'),
  new RegExp(`^COMMENT ON TRIGGER ${q('enforce_guild_discord_link_rules')} ON ${ref('guilds')} IS `, 'i'),
  new RegExp(`^CREATE OR REPLACE FUNCTION ${ref('get_current_user_guildmate_ids')}\\(\\)`, 'i'),
  new RegExp(`^COMMENT ON FUNCTION ${ref('get_current_user_guildmate_ids')}\\(\\) IS `, 'i'),
  new RegExp(`^REVOKE ALL ON FUNCTION ${ref('get_current_user_guildmate_ids')}\\(\\) FROM `, 'i'),
  new RegExp(`^GRANT EXECUTE ON FUNCTION ${ref('get_current_user_guildmate_ids')}\\(\\) TO `, 'i'),
  new RegExp(`^DROP POLICY IF EXISTS "${MEMBERSHIPS_POLICY}" ON ${ref('character_guild_memberships')}$`, 'i'),
  new RegExp(`^CREATE POLICY "${MEMBERSHIPS_POLICY}" ON ${ref('character_guild_memberships')} `, 'i'),
  new RegExp(`^DROP POLICY IF EXISTS "${PROFILES_POLICY}" ON ${ref('profiles')}$`, 'i'),
  new RegExp(`^CREATE POLICY "${PROFILES_POLICY}" ON ${ref('profiles')} `, 'i'),
  new RegExp(`^DROP FUNCTION IF EXISTS ${ref('get_user_guild_ids')}\\(${q('p_user_id')} ${q('uuid')}\\)$`, 'i'),
  new RegExp(`^REVOKE ALL ON FUNCTION ${ref('redeem_invite_code')}\\(${q('code_input')} ${q('text')}\\) FROM `, 'i'),
  new RegExp(`^GRANT EXECUTE ON FUNCTION ${ref('redeem_invite_code')}\\(${q('code_input')} ${q('text')}\\) TO `, 'i'),
  new RegExp(`^CREATE OR REPLACE FUNCTION ${ref('enforce_character_alias_guild_refs')}\\(\\)`, 'i'),
  new RegExp(`^COMMENT ON FUNCTION ${ref('enforce_character_alias_guild_refs')}\\(\\) IS `, 'i'),
  new RegExp(`^REVOKE ALL ON FUNCTION ${ref('enforce_character_alias_guild_refs')}\\(\\) FROM `, 'i'),
  new RegExp(`^CREATE OR REPLACE TRIGGER ${q('enforce_character_alias_guild_refs')} `, 'i'),
  new RegExp(`^COMMENT ON TRIGGER ${q('enforce_character_alias_guild_refs')} ON ${ref('character_aliases')} IS `, 'i'),
]

interface TriggerRule {
  fn: string
  table: string
  /** Index of the CREATE FUNCTION statement; REVOKE at +2, trigger at +3. */
  start: number
  /** Trigger event clause between BEFORE and ON. */
  events: RegExp
}

const TRIGGER_RULES: TriggerRule[] = [
  {
    fn: 'enforce_guild_discord_link_rules',
    table: 'guilds',
    start: 0,
    events: /^INSERT OR UPDATE OF "discord_server_id"$/,
  },
  {
    fn: 'enforce_character_alias_guild_refs',
    table: 'character_aliases',
    start: 16,
    events: /^INSERT OR UPDATE OF "guild_id", "character_id"$/,
  },
]

const roleList = (list: string) => list.split(',').map(role => role.trim().replace(/^"|"$/g, ''))

describe('guild Discord links and helper rules migration shape (quick task 261002-l8o)', () => {
  it('the file exists, has a unique timestamp and sorts after 20261001120000', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    const sameTimestamp = fs.readdirSync(MIGRATIONS_DIR).filter(name => name.startsWith(MIGRATION_TIMESTAMP))
    expect(sameTimestamp).toHaveLength(1)
    expect(MIGRATION_TIMESTAMP > '20261001120000').toBe(true)
  })

  it('has exactly 21 statements in the fixed order', () => {
    const stmts = statements()
    expect(stmts).toHaveLength(EXPECTED_ORDER.length)
    stmts.forEach((stmt, i) => {
      expect(stmt, `statement ${i + 1}`).toMatch(EXPECTED_ORDER[i])
    })
  })

  it('has exactly three dollar-quoted bodies, one per CREATE FUNCTION', () => {
    const code = stripComments(readMigrationRaw())
    expect((code.match(/\$\$/g) ?? []).length).toBe(6)
    const bodies = statements().filter(stmt => stmt.includes('$$'))
    expect(bodies).toHaveLength(3)
    for (const stmt of bodies) expect(stmt).toMatch(/^CREATE OR REPLACE FUNCTION /i)
  })

  for (const rule of TRIGGER_RULES) {
    describe(rule.fn, () => {
      it('is a plpgsql SECURITY DEFINER trigger function with no parameters and search_path public, pg_temp', () => {
        const { prefix } = functionParts(statements()[rule.start])
        expect(prefix).toMatch(new RegExp(`^CREATE OR REPLACE FUNCTION ${ref(rule.fn)}\\(\\) RETURNS ${q('trigger')} `, 'i'))
        expect(prefix).toMatch(/LANGUAGE "?plpgsql"? SECURITY DEFINER/i)
        expect(prefix).toMatch(/SET "?search_path"? TO 'public', 'pg_temp'$/i)
      })

      it('revokes ALL from PUBLIC, anon and authenticated and is granted to no one', () => {
        const stmts = statements()
        const revoke = stmts[rule.start + 2]
        const m = revoke.match(/ FROM (.+)$/i)
        expect(m).not.toBeNull()
        expect(roleList(m![1])).toEqual(['PUBLIC', 'anon', 'authenticated'])
        expect(stmts.filter(stmt => /^GRANT /i.test(stmt) && stmt.includes(rule.fn))).toEqual([])
      })

      it('fires BEFORE the exact events, on the right table, FOR EACH ROW', () => {
        const trigger = statements()[rule.start + 3]
        const m = trigger.match(new RegExp(
          `^CREATE OR REPLACE TRIGGER "${rule.fn}" BEFORE (.+) ON "public"\\."${rule.table}" FOR EACH ROW EXECUTE FUNCTION "public"\\."${rule.fn}"\\(\\)$`,
        ))
        expect(m, trigger).not.toBeNull()
        expect(m![1]).toMatch(rule.events)
      })
    })
  }

  it('the Discord link body has the role and trigger depth guard, the RLS error and no DETAIL', () => {
    const { body } = functionParts(statements()[0])
    expect(body).toMatch(/coalesce\(current_setting\('role', true\), ''\) NOT IN \('anon', 'authenticated'\)/)
    expect(body).toMatch(/pg_trigger_depth\(\) > 1/)
    expect(body).toMatch(/NEW\.discord_server_id IS NULL/)
    expect(body).toMatch(/NEW\.discord_server_id IS NOT DISTINCT FROM OLD\.discord_server_id/)
    expect(body).toMatch(/MESSAGE = 'new row violates row-level security policy for table "guilds"'/)
    expect(body).toMatch(/ERRCODE = 'insufficient_privilege'/)
    expect(body).not.toMatch(/DETAIL/i)
    // Reads no table data and writes nothing.
    expect(blankStrings(body)).not.toMatch(/\bFROM\s+"?public"?\.|\bINSERT\s+INTO\b|\bDELETE\s+FROM\b|\bUPDATE\s+"?public"?\./i)
  })

  it('the alias body checks an active membership in the row guild and raises check_violation with a DETAIL', () => {
    const { body } = functionParts(statements()[16])
    expect(body).toMatch(/FROM public\.character_guild_memberships cgm/)
    expect(body).toMatch(/cgm\.character_id = NEW\.character_id/)
    expect(body).toMatch(/cgm\.guild_id = NEW\.guild_id/)
    expect(body).toMatch(/cgm\.is_active = true/)
    expect(body).toMatch(/NEW\.guild_id IS NOT DISTINCT FROM OLD\.guild_id/)
    expect(body).toMatch(/NEW\.character_id IS NOT DISTINCT FROM OLD\.character_id/)
    expect(body).toMatch(/MESSAGE = 'character_aliases\.character_id is not an active member of this guild'/)
    expect(body).toMatch(/DETAIL = format\('character_id %s, guild_id %s', NEW\.character_id, NEW\.guild_id\)/)
    expect(body).toMatch(/ERRCODE = 'check_violation'/)
    expect(body).toMatch(/MESSAGE = 'new row violates row-level security policy for table "character_aliases"'/)
    expect(blankStrings(body)).not.toMatch(/\bINSERT\s+INTO\b|\bDELETE\s+FROM\b|\bUPDATE\s+"?public"?\./i)
  })

  it('the guildmate helper is a STABLE SECURITY DEFINER sql function with no parameters, revoked from PUBLIC then granted to anon, authenticated and service_role', () => {
    const stmts = statements()
    const { prefix, body } = functionParts(stmts[5])
    expect(prefix).toMatch(new RegExp(`^CREATE OR REPLACE FUNCTION ${ref('get_current_user_guildmate_ids')}\\(\\) RETURNS SETOF ${q('uuid')} `, 'i'))
    expect(prefix).toMatch(/LANGUAGE "?sql"? STABLE SECURITY DEFINER/i)
    expect(prefix).toMatch(/SET "?search_path"? TO 'public', 'pg_temp'$/i)
    expect(body).toMatch(/cgm\.is_active = true/)
    expect(body).toMatch(/cgm\.guild_id IN \(SELECT public\.get_current_user_guild_ids\(\)\)/)
    expect(body).not.toMatch(/get_user_guild_ids/)
    expect(roleList(stmts[7].match(/ FROM (.+)$/i)![1])).toEqual(['PUBLIC'])
    expect(roleList(stmts[8].match(/ TO (.+)$/i)![1])).toEqual(['anon', 'authenticated', 'service_role'])
  })

  it('rebuilds the two SELECT policies on the helpers that read the signed-in user', () => {
    const stmts = statements()
    const memberships = stmts[10]
    const profiles = stmts[12]
    for (const policy of [memberships, profiles]) {
      expect(policy).toMatch(/ FOR SELECT USING /i)
      expect(policy).not.toMatch(/ TO /i)
      expect(policy).not.toMatch(/get_user_guild_ids/)
    }
    expect(memberships).toMatch(/USING \("guild_id" IN \(SELECT "public"\."get_current_user_guild_ids"\(\)\)\)$/)
    expect(profiles).toMatch(/USING \("auth"\."uid"\(\) = "id" OR "id" IN \(SELECT "public"\."get_current_user_guildmate_ids"\(\)\)\)$/)
  })

  it('makes redeem_invite_code service-role only', () => {
    const stmts = statements()
    expect(roleList(stmts[14].match(/ FROM (.+)$/i)![1])).toEqual(['PUBLIC', 'anon', 'authenticated'])
    expect(roleList(stmts[15].match(/ TO (.+)$/i)![1])).toEqual(['service_role'])
  })

  it('has no DROP besides the two policy drops and the get_user_guild_ids drop, and no CASCADE', () => {
    const drops = statements().filter(stmt => /^DROP /i.test(stmt))
    expect(drops).toHaveLength(3)
    expect(drops.filter(stmt => /^DROP POLICY IF EXISTS /i.test(stmt))).toHaveLength(2)
    expect(drops.filter(stmt => /^DROP FUNCTION IF EXISTS /i.test(stmt))).toHaveLength(1)
    const code = blankStrings(withoutBodies(stripComments(readMigrationRaw())))
    expect(code).not.toMatch(/\bCASCADE\b/i)
  })

  it('changes no data: no INSERT, UPDATE, DELETE, TRUNCATE, ALTER or DO statement', () => {
    for (const stmt of statements()) {
      expect(stmt).not.toMatch(/^(INSERT|UPDATE|DELETE|TRUNCATE|ALTER|DO)\b/i)
    }
    const code = blankStrings(withoutBodies(stripComments(readMigrationRaw())))
    expect(code).not.toMatch(/\bINSERT INTO\b|\bDELETE FROM\b|\bUPDATE\s+"?public"?\./i)
  })

  it('every new function revokes PUBLIC (the 20260930000200 ratchet)', () => {
    const creates = statements().filter(stmt => /^CREATE OR REPLACE FUNCTION /i.test(stmt))
    const revokes = statements().filter(stmt => /^REVOKE /i.test(stmt))
    for (const create of creates) {
      const name = create.match(/^CREATE OR REPLACE FUNCTION "public"\."(\w+)"/)![1]
      expect(revokes.some(r => r.includes(`"${name}"`) && roleList(r.match(/ FROM (.+)$/i)![1]).includes('PUBLIC')), name).toBe(true)
    }
  })

  it('COMMENT strings contain no two consecutive hyphens and no em dash', () => {
    const comments = statements().filter(stmt => /^COMMENT ON /i.test(stmt))
    expect(comments).toHaveLength(5)
    for (const stmt of comments) {
      expect(stmt).not.toContain('--')
      expect(stmt).not.toContain('—')
    }
  })

  it('the header has the Background, Fix, Why triggers, Error contract, Not changed, Deploy order and Rollback sections', () => {
    const raw = readMigrationRaw()
    for (const heading of ['Background', 'Fix', 'Why triggers', 'Error contract', 'Not changed', 'Deploy order', 'Rollback']) {
      expect(raw, heading).toMatch(new RegExp(`^-- ${heading}\\n-- -+$`, 'm'))
    }
    expect(raw).not.toContain('—')
  })

  it('the Rollback lists a statement for every part, with get_user_guild_ids recreated before the guildmate helper is dropped', () => {
    const raw = readMigrationRaw()
    const rollback = raw.slice(raw.indexOf('-- Rollback'))
    const lines = rollback.split('\n').filter(line => line.startsWith('--   ')).map(line => line.slice(5))
    const sql = lines.join('\n')
    const at = (needle: string) => sql.indexOf(needle)
    expect(at('DROP TRIGGER IF EXISTS "enforce_guild_discord_link_rules" ON "public"."guilds";')).toBeGreaterThanOrEqual(0)
    expect(at('DROP FUNCTION IF EXISTS "public"."enforce_guild_discord_link_rules"();')).toBeGreaterThanOrEqual(0)
    expect(at('DROP TRIGGER IF EXISTS "enforce_character_alias_guild_refs" ON "public"."character_aliases";')).toBeGreaterThanOrEqual(0)
    expect(at('DROP FUNCTION IF EXISTS "public"."enforce_character_alias_guild_refs"();')).toBeGreaterThanOrEqual(0)
    const create = at('CREATE OR REPLACE FUNCTION "public"."get_user_guild_ids"("p_user_id" "uuid")')
    const revoke = at('REVOKE ALL ON FUNCTION "public"."get_user_guild_ids"("p_user_id" "uuid") FROM PUBLIC;')
    const grant = at('GRANT EXECUTE ON FUNCTION "public"."get_user_guild_ids"("p_user_id" "uuid") TO "anon", "authenticated", "service_role";')
    const memberships = at(`CREATE POLICY "${MEMBERSHIPS_POLICY}"`)
    const profiles = at(`CREATE POLICY "${PROFILES_POLICY}"`)
    const dropHelper = at('DROP FUNCTION IF EXISTS "public"."get_current_user_guildmate_ids"();')
    const redeem = at('GRANT EXECUTE ON FUNCTION "public"."redeem_invite_code"("code_input" "text") TO "authenticated";')
    for (const index of [create, revoke, grant, memberships, profiles, dropHelper, redeem]) {
      expect(index).toBeGreaterThanOrEqual(0)
    }
    expect(create).toBeLessThan(revoke)
    expect(revoke).toBeLessThan(grant)
    expect(grant).toBeLessThan(memberships)
    expect(profiles).toBeLessThan(dropHelper)
    expect(sql.slice(create, revoke)).toMatch(/SET "search_path" TO 'public', 'pg_temp'/)
  })
})
