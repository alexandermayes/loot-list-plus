import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Quick task 260929-wcr (D-01, D-02, D-07, D-11, D-12): this locks the shape
// of the migration that sets explicit EXECUTE grants on public-schema
// functions, grouped by who calls each function. Postgres grants EXECUTE to
// PUBLIC on every new function, so each REVOKE here names PUBLIC as well as
// the roles that should not call the function, and each GRANT names the roles
// that should. The same migration drops the client SELECT policy on
// guild_invite_codes and pins search_path on four SECURITY DEFINER functions.
// The behaviour is proven in a PGlite harness outside the repo; this test pins
// which statements the file may contain and the exact role set per function.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20260930000200'
const MIGRATION_FILE = path.join(
  MIGRATIONS_DIR,
  `${MIGRATION_TIMESTAMP}_tighten_function_execute_grants.sql`,
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

type FunctionClass = 'a' | 'b' | 'c' | 'd' | 'e'

interface ExpectedFunction {
  name: string
  /** Parameter list exactly as written in the statements. */
  args: string
  cls: FunctionClass
}

// Classes (D-02): a = service role only or uncalled; b = user-session RPC
// checked inside the function; c = trigger function; d = RLS helper; e = read
// function returning only rows RLS already shows to anon.
const EXPECTED: ExpectedFunction[] = [
  { name: 'merge_phase_groups', args: '"p_expansion_id" "uuid", "p_guild_id" "uuid", "p_phase_groups" "jsonb", "p_merged_groups" "jsonb"', cls: 'a' },
  { name: 'reset_blp', args: '"p_guild_id" "uuid", "p_character_id" "uuid", "p_loot_item_id" "uuid"', cls: 'a' },
  { name: 'increment_blp', args: '"p_guild_id" "uuid", "p_character_id" "uuid", "p_loot_item_id" "uuid", "p_raid_event_id" "uuid"', cls: 'a' },
  { name: 'increment_blp_bulk', args: '"p_guild_id" "uuid", "p_loot_item_id" "uuid", "p_raid_event_id" "uuid", "p_character_ids" "uuid"[]', cls: 'a' },
  { name: 'seed_tbc_expansion', args: '"p_guild_id" "uuid"', cls: 'a' },
  { name: 'seed_tbc_expansion_for_guild', args: '"p_guild_id" "uuid"', cls: 'a' },
  { name: 'can_view_master_sheet', args: '"p_raid_tier_id" "uuid", "p_user_id" "uuid"', cls: 'a' },
  { name: 'generate_invite_code', args: '', cls: 'a' },
  { name: 'get_character_guilds', args: '"p_character_id" "uuid"', cls: 'a' },
  { name: 'get_guild_current_expansion', args: '"p_guild_id" "uuid"', cls: 'a' },
  { name: 'get_guild_submissions', args: '"p_guild_id" "uuid", "p_raid_tier_id" "uuid"', cls: 'a' },
  { name: 'get_user_characters_in_guild', args: '"p_user_id" "uuid", "p_guild_id" "uuid"', cls: 'a' },
  { name: 'is_past_deadline', args: '"p_raid_tier_id" "uuid"', cls: 'a' },
  { name: 'update_guild_icon', args: '"p_guild_id" "uuid", "p_icon_url" "text"', cls: 'a' },
  { name: 'update_guild_info', args: '"p_guild_id" "uuid", "p_name" "text", "p_realm" "text", "p_faction" "text", "p_discord_server_id" "text"', cls: 'a' },
  { name: 'is_invite_code_valid', args: '"code_input" character varying', cls: 'a' },
  { name: 'recompute_blp_for_item', args: '"p_guild_id" "uuid", "p_loot_item_id" "uuid"', cls: 'a' },
  { name: 'recompute_blp_for_event', args: '"p_guild_id" "uuid", "p_raid_event_id" "uuid"', cls: 'a' },
  { name: 'recompute_blp_for_guild', args: '"p_guild_id" "uuid"', cls: 'a' },
  { name: 'reset_guild_season', args: '"p_guild_id" "uuid", "p_clear_raids" boolean, "p_clear_loot" boolean, "p_clear_donations" boolean', cls: 'a' },
  { name: 'save_submission_items', args: '"p_submission_id" "uuid", "p_items" "jsonb"', cls: 'b' },
  { name: 'delete_guild', args: '"p_guild_id" "uuid"', cls: 'b' },
  { name: 'create_expansion_for_guild', args: '"p_guild_id" "uuid", "p_name" "text"', cls: 'b' },
  { name: 'redeem_invite_code', args: '"code_input" "text"', cls: 'b' },
  { name: 'check_max_roles_per_guild', args: '', cls: 'c' },
  { name: 'create_default_guild_roles', args: '', cls: 'c' },
  { name: 'create_user_preferences', args: '', cls: 'c' },
  { name: 'reject_submissions_on_cgm_loss', args: '', cls: 'c' },
  { name: 'update_guild_item_priorities_updated_at', args: '', cls: 'c' },
  { name: 'update_guild_settings_updated_at', args: '', cls: 'c' },
  { name: 'update_updated_at_column', args: '', cls: 'c' },
  { name: 'enforce_loot_history_guild_refs', args: '', cls: 'c' },
  { name: 'character_belongs_to_user', args: '"p_character_id" "uuid"', cls: 'd' },
  { name: 'character_has_submission_to_user_guilds', args: '"p_character_id" "uuid"', cls: 'd' },
  { name: 'get_current_user_guild_ids', args: '', cls: 'd' },
  { name: 'get_user_guild_ids', args: '"p_user_id" "uuid"', cls: 'd' },
  { name: 'is_guild_master', args: '"target_guild_id" "uuid"', cls: 'd' },
  { name: 'is_guild_officer', args: '"target_guild_id" "uuid"', cls: 'd' },
  { name: 'get_guild_expansions', args: '"p_guild_id" "uuid"', cls: 'e' },
  { name: 'search_help_articles', args: '"p_query" text, "p_limit" integer', cls: 'e' },
]

/** SECURITY DEFINER functions that had no fixed search_path (D-12). */
const SEARCH_PATH_FUNCTIONS = ['can_view_master_sheet', 'get_guild_expansions', 'get_user_guild_ids', 'update_guild_info']

/** The only statement allowed besides function grants and the search_path pins (D-11). */
const DROP_INVITE_POLICY = 'DROP POLICY IF EXISTS "Anyone can view active invite codes" ON "public"."guild_invite_codes"'

/** SECURITY INVOKER column defaults on reserve_runs, left unchanged (D-05). */
const UNCHANGED_FUNCTIONS = ['generate_reserve_token', 'generate_reserve_leader_token']

const REVOKE_ROLES: Record<FunctionClass, string[]> = {
  a: ['PUBLIC', 'anon', 'authenticated'],
  b: ['PUBLIC', 'anon'],
  c: ['PUBLIC', 'anon', 'authenticated'],
  d: ['PUBLIC'],
  e: ['PUBLIC'],
}

/** Roles granted EXECUTE per class; null means the class has no GRANT. */
const GRANT_ROLES: Record<FunctionClass, string[] | null> = {
  a: ['service_role'],
  b: ['authenticated', 'service_role'],
  c: null,
  d: ['anon', 'authenticated', 'service_role'],
  e: ['anon', 'authenticated', 'service_role'],
}

const REVOKE_RE = /^REVOKE ALL ON FUNCTION "public"\."(\w+)"\((.*?)\) FROM ((?:PUBLIC|"\w+")(?:, (?:PUBLIC|"\w+"))*)$/
const GRANT_RE = /^GRANT EXECUTE ON FUNCTION "public"\."(\w+)"\((.*?)\) TO ("\w+"(?:, "\w+")*)$/
const ALTER_SEARCH_PATH_RE = /^ALTER FUNCTION "public"\."(\w+)"\((.*?)\) SET search_path TO 'public', 'pg_temp'$/

type RoleStatement = { kind: 'revoke' | 'grant'; name: string; args: string; roles: string[] }
type AlterStatement = { kind: 'alter'; name: string; args: string }

type ParsedStatement =
  | RoleStatement
  | AlterStatement
  | { kind: 'dropPolicy' }
  | { kind: 'other'; text: string }

function parseRoles(list: string): string[] {
  return list.split(',').map(role => role.trim().replace(/^"|"$/g, ''))
}

/** Classify one statement as a function REVOKE, a function GRANT, a
 * search_path pin, the invite code policy drop, or other. */
function classify(stmt: string): ParsedStatement {
  const revoke = stmt.match(REVOKE_RE)
  if (revoke) return { kind: 'revoke', name: revoke[1], args: revoke[2], roles: parseRoles(revoke[3]) }
  const grant = stmt.match(GRANT_RE)
  if (grant) return { kind: 'grant', name: grant[1], args: grant[2], roles: parseRoles(grant[3]) }
  const alter = stmt.match(ALTER_SEARCH_PATH_RE)
  if (alter) return { kind: 'alter', name: alter[1], args: alter[2] }
  if (stmt === DROP_INVITE_POLICY) return { kind: 'dropPolicy' }
  return { kind: 'other', text: stmt }
}

function parsed(): ParsedStatement[] {
  return statements().map(classify)
}

const sorted = (roles: string[]) => [...roles].sort()

/** Normalize a parameter list for comparison: drop double quotes and DEFAULT
 * clauses, collapse whitespace, lowercase. */
function normalizeArgs(args: string): string {
  return args
    .replace(/"/g, '')
    .replace(/\s+default\s+[^,]+/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim()
    .toLowerCase()
}

/** Text between the `(` at openIndex and its matching `)`. */
function balancedParens(sql: string, openIndex: number): string {
  let depth = 0
  for (let i = openIndex; i < sql.length; i++) {
    if (sql[i] === '(') depth++
    else if (sql[i] === ')') {
      depth--
      if (depth === 0) return sql.slice(openIndex + 1, i)
    }
  }
  throw new Error(`unbalanced parentheses at ${openIndex}`)
}

type FunctionEvent = { kind: 'create'; args: string } | { kind: 'drop' }

/** For every public function, the last CREATE (with its parameter list) or
 * DROP in the migrations that sort before this one. */
function latestFunctionEvents(): Map<string, FunctionEvent> {
  const events = new Map<string, FunctionEvent>()
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(name => name.endsWith('.sql') && name.slice(0, 14) < MIGRATION_TIMESTAMP)
    .sort()
  for (const file of files) {
    const sql = stripComments(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'))
    const found: { index: number; name: string; event: FunctionEvent }[] = []
    for (const m of sql.matchAll(/\bcreate\s+(?:or\s+replace\s+)?function\s+"?public"?\."?(\w+)"?\s*\(/gi)) {
      const open = m.index! + m[0].length - 1
      found.push({ index: m.index!, name: m[1], event: { kind: 'create', args: balancedParens(sql, open) } })
    }
    for (const m of sql.matchAll(/\bdrop\s+function\s+(?:if\s+exists\s+)?"?public"?\."?(\w+)"?/gi)) {
      found.push({ index: m.index!, name: m[1], event: { kind: 'drop' } })
    }
    found.sort((x, y) => x.index - y.index)
    for (const f of found) events.set(f.name, f.event)
  }
  return events
}

/**
 * The future-migration ratchet (D-07). Returns, sorted, every public-schema
 * function created in `sql` (schema-qualified as public, or unqualified)
 * without a REVOKE on the same name in the same text whose role list includes
 * PUBLIC. A REVOKE ... ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC covers
 * every function. Postgres grants EXECUTE to PUBLIC on every new function, so
 * a migration that adds one must revoke it there. Only migrations after
 * 20260930000200 are checked, so earlier files are left as they are.
 */
function findUnrevokedPublicFunctions(sql: string): string[] {
  const code = stripComments(sql)
  const unquote = (ident: string) => ident.replace(/"/g, '')
  const publicName = (qualified: string): string | null => {
    const parts = unquote(qualified).split('.')
    if (parts.length === 1) return parts[0].toLowerCase()
    return parts[0].toLowerCase() === 'public' ? parts[1].toLowerCase() : null
  }
  const IDENT = '((?:"?\\w+"?\\.)?"?\\w+"?)'
  const created = new Set<string>()
  for (const m of code.matchAll(new RegExp(`\\bcreate\\s+(?:or\\s+replace\\s+)?function\\s+${IDENT}\\s*\\(`, 'gi'))) {
    const name = publicName(m[1])
    if (name) created.add(name)
  }
  const includesPublic = (roles: string) => roles.split(',').some(role => role.trim().toLowerCase() === 'public')
  if (
    [...code.matchAll(/\brevoke\s+[^;]*?\bon\s+all\s+functions\s+in\s+schema\s+"?public"?\s+from\s+([^;]+)/gi)].some(m =>
      includesPublic(m[1]),
    )
  ) {
    return []
  }
  const revoked = new Set<string>()
  for (const m of code.matchAll(new RegExp(`\\brevoke\\s+[^;]*?\\bon\\s+function\\s+${IDENT}\\s*\\([^;]*?\\)\\s+from\\s+([^;]+)`, 'gi'))) {
    const name = publicName(m[1])
    if (name && includesPublic(m[2])) revoked.add(name)
  }
  return [...created].filter(name => !revoked.has(name)).sort()
}

describe('function EXECUTE grants migration shape (quick task 260929-wcr)', () => {
  it('the file exists and has a unique timestamp', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    const sameTimestamp = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(name => name.endsWith('.sql') && name !== path.basename(MIGRATION_FILE))
      .filter(name => name.slice(0, 14) === MIGRATION_TIMESTAMP)
    expect(sameTimestamp).toEqual([])
  })

  it('every statement is a function REVOKE or GRANT, a search_path pin, or the invite code policy drop, in the fixed form', () => {
    const others = parsed().filter(stmt => stmt.kind === 'other')
    expect(others).toEqual([])
  })

  it('each expected function has exactly one REVOKE and the GRANT its class requires', () => {
    const all = parsed()
    for (const fn of EXPECTED) {
      const revokes = all.filter((s): s is RoleStatement => s.kind === 'revoke' && s.name === fn.name)
      expect(revokes, `${fn.name} REVOKE count`).toHaveLength(1)
      const revoke = revokes[0]
      expect(revoke.args, `${fn.name} REVOKE args`).toBe(fn.args)
      expect(sorted(revoke.roles), `${fn.name} REVOKE roles`).toEqual(sorted(REVOKE_ROLES[fn.cls]))

      const grants = all.filter((s): s is RoleStatement => s.kind === 'grant' && s.name === fn.name)
      const expectedGrant = GRANT_ROLES[fn.cls]
      if (expectedGrant === null) {
        expect(grants, `${fn.name} has no GRANT`).toEqual([])
      } else {
        expect(grants, `${fn.name} GRANT count`).toHaveLength(1)
        expect(grants[0].args, `${fn.name} GRANT args`).toBe(fn.args)
        expect(sorted(grants[0].roles), `${fn.name} GRANT roles`).toEqual(sorted(expectedGrant))
      }
    }
  })

  it('names exactly the expected functions, and every REVOKE includes PUBLIC', () => {
    const all = parsed()
    const named = new Set(
      all.flatMap(s => (s.kind === 'revoke' || s.kind === 'grant' ? [s.name] : [])),
    )
    expect([...named].sort()).toEqual(EXPECTED.map(fn => fn.name).sort())
    for (const s of all) {
      if (s.kind === 'revoke') expect(s.roles, `${s.name} REVOKE includes PUBLIC`).toContain('PUBLIC')
    }
  })

  it('has 77 statements: 40 REVOKE, 32 GRANT, 4 ALTER FUNCTION and 1 DROP POLICY', () => {
    const all = parsed()
    expect(EXPECTED).toHaveLength(40)
    expect(all).toHaveLength(77)
    expect(all.filter(s => s.kind === 'revoke')).toHaveLength(40)
    expect(all.filter(s => s.kind === 'grant')).toHaveLength(32)
    expect(all.filter(s => s.kind === 'alter')).toHaveLength(4)
    expect(all.filter(s => s.kind === 'dropPolicy')).toHaveLength(1)
  })

  it('pins search_path on exactly the four functions, with the parameter lists of their inventory rows', () => {
    const alters = parsed().filter((s): s is AlterStatement => s.kind === 'alter')
    expect(alters.map(s => s.name).sort()).toEqual([...SEARCH_PATH_FUNCTIONS].sort())
    const events = latestFunctionEvents()
    for (const alter of alters) {
      const fn = EXPECTED.find(e => e.name === alter.name)
      expect(fn, `${alter.name} is in the inventory`).toBeDefined()
      expect(alter.args, `${alter.name} ALTER args`).toBe(fn!.args)
      const event = events.get(alter.name)
      expect(event?.kind, `${alter.name} is defined and not dropped`).toBe('create')
      if (event?.kind === 'create') expect(normalizeArgs(alter.args)).toBe(normalizeArgs(event.args))
    }
  })

  it('has no CREATE, no other ALTER and no other DROP', () => {
    const all = statements()
    expect(all.filter(s => /\bCREATE\b/i.test(s))).toEqual([])
    expect(all.filter(s => /^ALTER\b/i.test(s))).toHaveLength(4)
    expect(all.filter(s => /\bALTER\b/i.test(s))).toHaveLength(4)
    expect(all.filter(s => /\bDROP\b/i.test(s))).toEqual([DROP_INVITE_POLICY])
  })

  it('grants anon only on the eight class d and e functions', () => {
    const anonGrants = parsed()
      .filter(s => s.kind === 'grant' && s.roles.includes('anon'))
      .map(s => (s.kind === 'grant' ? s.name : ''))
    const expected = EXPECTED.filter(fn => fn.cls === 'd' || fn.cls === 'e').map(fn => fn.name)
    expect(anonGrants.sort()).toEqual(expected.sort())
    expect(anonGrants).toHaveLength(8)
  })

  it('leaves the class f functions and the functions from the parallel migrations unnamed', () => {
    const code = stripComments(readMigrationRaw())
    for (const name of UNCHANGED_FUNCTIONS) {
      expect(code, `${name} must not be named`).not.toContain(name)
    }
    expect(code).not.toMatch(/enforce_loot_submission_|enforce_guild_/)
  })

  it('every parameter list matches the latest defining CREATE header, and no later DROP removes the function', () => {
    const events = latestFunctionEvents()
    for (const fn of EXPECTED) {
      const event = events.get(fn.name)
      expect(event, `${fn.name} is defined by an earlier migration`).toBeDefined()
      expect(event?.kind, `${fn.name} is not dropped after its last CREATE`).toBe('create')
      if (event?.kind === 'create') {
        expect(normalizeArgs(fn.args), `${fn.name} parameter list`).toBe(normalizeArgs(event.args))
      }
    }
  })

  describe('findUnrevokedPublicFunctions (future-migration ratchet, D-07)', () => {
    const create = (name: string) =>
      `CREATE OR REPLACE FUNCTION "public"."${name}"() RETURNS void LANGUAGE sql AS $$ SELECT 1; $$;\n`

    it('flags a public function created without a REVOKE', () => {
      expect(findUnrevokedPublicFunctions(create('f_x'))).toEqual(['f_x'])
    })

    it('accepts a function whose REVOKE includes PUBLIC', () => {
      const sql = create('f_x') + 'REVOKE ALL ON FUNCTION "public"."f_x"() FROM PUBLIC, "anon";\n'
      expect(findUnrevokedPublicFunctions(sql)).toEqual([])
    })

    it('flags a function whose only REVOKE omits PUBLIC', () => {
      const sql = create('f_x') + create('f_y') +
        'REVOKE ALL ON FUNCTION "public"."f_x"() FROM PUBLIC;\n' +
        'REVOKE ALL ON FUNCTION "public"."f_y"() FROM "anon", "authenticated";\n'
      expect(findUnrevokedPublicFunctions(sql)).toEqual(['f_y'])
    })

    it('handles lowercase, unquoted SQL and ignores other schemas and comments', () => {
      const flagged = 'create or replace function public.f_z(p text) returns void language sql as $$ select 1; $$;\n'
      expect(findUnrevokedPublicFunctions(flagged)).toEqual(['f_z'])
      const revoked = flagged + 'revoke execute on function public.f_z(text) from public, anon;\n'
      expect(findUnrevokedPublicFunctions(revoked)).toEqual([])
      const other = 'create function private.helper() returns int language sql as $$ select 1 $$;\n' +
        '-- revoke all on function public.f_c() from public;\n' + create('f_c')
      expect(findUnrevokedPublicFunctions(other)).toEqual(['f_c'])
    })

    it('finds nothing unrevoked in any migration later than this one', () => {
      const later = fs
        .readdirSync(MIGRATIONS_DIR)
        .filter(name => name.endsWith('.sql') && name.slice(0, 14) > MIGRATION_TIMESTAMP)
      for (const file of later) {
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8')
        expect(findUnrevokedPublicFunctions(sql), file).toEqual([])
      }
    })
  })

  it('the header explains the PUBLIC default, names 20260722000001 and has the invite code, search_path and rollback sections', () => {
    const raw = readMigrationRaw()
    expect(raw).toContain('20260722000001')
    expect(raw).toMatch(/PUBLIC/)
    for (const heading of ['Background', 'Rule per class', 'Invite codes', 'search_path', 'Not changed', 'Rollback']) {
      expect(raw, `header section ${heading}`).toMatch(new RegExp(`^-- ${heading}$`, 'm'))
    }
    expect(raw).toContain('-- CREATE POLICY "Anyone can view active invite codes" ON "public"."guild_invite_codes" FOR SELECT USING (("is_active" = true));')
    expect(raw).toMatch(/RESET search_path/)
  })
})
