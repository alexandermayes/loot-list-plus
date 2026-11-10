// @vitest-environment node
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

// DISC-12 (D-00d, D-12, D-17, D-18, D-22, D-24, D-26, D-27): this locks the
// shape of the Discovery migration. The behaviour is proven on a real
// Postgres in discovery-schema-pglite.test.ts; this test pins what the file
// may contain: its statement order, NOT VALID then VALIDATE pairs, the seven
// new functions and ten triggers, a WHEN clause on every guard trigger on
// raid_tiers, loot_items and expansions (so a Known write never calls a guard),
// and no data change, no guild_settings change and no foreign key on
// loot_history.awarded_item_id.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20261020120000'
const MIGRATION_FILE = path.join(MIGRATIONS_DIR, `${MIGRATION_TIMESTAMP}_discovery_schema.sql`)

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

/** Replace each dollar-quoted body with an empty marker, so the forbidden
 * content checks never trip on the guard functions' own SELECTs or on the
 * verifying DO block. */
function stripDollarBodies(sql: string): string {
  return sql.replace(/\$\$[\s\S]*?\$\$/g, '$$__BODY__$$')
}

/** Optional double quotes around an identifier. */
const q = (name: string) => `"?${name}"?`
const T = (table: string) => `${q('public')}\\.${q(table)}`
const FN = (name: string) => `${q('public')}\\.${q(name)}\\(\\)`

interface GuardTrigger {
  name: string
  events: string
  table: string
  when: string
  fn: string
}

/** Every CREATE OR REPLACE TRIGGER statement with its name, events, table and
 * WHEN clause text (empty when it has none). The WHEN check, the D-26 and
 * D-27 exact pins and the self-checks all read through this one helper. */
function findGuardTriggers(chunks: string[]): GuardTrigger[] {
  const re = new RegExp(
    `^CREATE OR REPLACE TRIGGER ${q('(\\w+)')} BEFORE (.+?) ON ${q('public')}\\.${q('(\\w+)')} ` +
      `FOR EACH ROW(?: WHEN \\((.*)\\))? EXECUTE FUNCTION ${q('public')}\\.${q('(\\w+)')}\\(\\)$`,
    'i',
  )
  const found: GuardTrigger[] = []
  for (const chunk of chunks) {
    if (!/^CREATE OR REPLACE TRIGGER\b/i.test(chunk)) continue
    const m = chunk.match(re)
    if (!m) throw new Error(`unparsable trigger statement: ${chunk}`)
    found.push({ name: m[1], events: m[2], table: m[3], when: m[4] ?? '', fn: m[5] })
  }
  return found
}

/** The dollar-quoted body of the named function, comments included, read from
 * the raw file. Empty when the function is absent. */
function functionBody(raw: string, name: string): string {
  const re = new RegExp(
    `CREATE OR REPLACE FUNCTION "public"\\."${name}"\\(\\)[\\s\\S]*?\\$\\$([\\s\\S]*?)\\$\\$`,
  )
  return raw.match(re)?.[1] ?? ''
}

const WHEN_GATED_TABLES = ['raid_tiers', 'loot_items', 'expansions']

/** Reasons a guard trigger on raid_tiers, loot_items or expansions is not
 * properly WHEN gated. Empty when every one is. */
function whenProblems(triggers: GuardTrigger[]): string[] {
  const problems: string[] = []
  for (const t of triggers) {
    if (!WHEN_GATED_TABLES.includes(t.table)) continue
    if (t.when === '') {
      problems.push(`${t.name}: no WHEN clause`)
      continue
    }
    if (t.table === 'raid_tiers' && !/\b(list_mode|expansion_id)\b/.test(t.when)) {
      problems.push(`${t.name}: WHEN does not name list_mode or expansion_id`)
    }
    if (t.table === 'loot_items' && !/\bkind\b/.test(t.when)) {
      problems.push(`${t.name}: WHEN does not name kind`)
    }
    if (t.table === 'expansions' && !(/\bname\b/.test(t.when) && /'Forever'/.test(t.when))) {
      problems.push(`${t.name}: WHEN does not name name and 'Forever'`)
    }
    if (t.name === 'enforce_expansion_forever_name_update' && !/\bOLD\.name\b/.test(t.when)) {
      problems.push(`${t.name}: WHEN does not name OLD.name`)
    }
  }
  return problems
}

const OWN_CONSTRAINTS = [
  'raid_tiers_list_mode_check',
  'loot_items_kind_check',
  'loot_items_need_shape_check',
]
const OWN_POLICIES = [
  'Guild members can view need pins',
  'Officers can insert need pins',
  'Officers can delete need pins',
]

/** Forbidden content outside dollar-quoted bodies and string literals. Returns
 * one entry per violation, so a self-check can assert the checker has teeth. */
function forbiddenContentViolations(): string[] {
  const executable = statements().map(stmt => blankStrings(stripDollarBodies(stmt)))
  const forbidden = [
    /\bINSERT\s+INTO\b/i,
    /\bUPDATE\s+[\w."]+\s+SET\b/i,
    /\bDELETE\s+FROM\b/i,
    /\bTRUNCATE\b/i,
    /\bCONCURRENTLY\b/i,
    /\bguild_settings\b/i,
    /\bDROP\s+(TABLE|COLUMN|INDEX|FUNCTION|TRIGGER)\b/i,
  ]
  const violations: string[] = []
  for (const stmt of executable) {
    for (const re of forbidden) {
      if (re.test(stmt)) violations.push(`${re}: ${stmt.slice(0, 80)}`)
    }
    const dropConstraint = stmt.match(/\bDROP\s+CONSTRAINT\s+IF\s+EXISTS\s+"?(\w+)"?/i)
    if (/\bDROP\s+CONSTRAINT\b/i.test(stmt) && !(dropConstraint && OWN_CONSTRAINTS.includes(dropConstraint[1]))) {
      violations.push(`DROP CONSTRAINT of a constraint this file does not create: ${stmt.slice(0, 80)}`)
    }
  }
  // DROP POLICY names sit in double quotes with spaces, so read them from the
  // original statements (string literals are not involved).
  for (const stmt of statements()) {
    if (!/^DROP POLICY\b/i.test(stmt)) continue
    const name = stmt.match(/^DROP POLICY IF EXISTS "([^"]+)"/i)?.[1]
    if (!name || !OWN_POLICIES.includes(name)) {
      violations.push(`DROP POLICY of a policy this file does not create: ${stmt.slice(0, 80)}`)
    }
  }
  return violations
}

/** Write a synthetic copy of the migration to the temp dir. */
function writeSynthetic(content: string): { file: string; dir: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'discovery-schema-selfcheck-'))
  const file = path.join(dir, `${MIGRATION_TIMESTAMP}_discovery_schema.sql`)
  fs.writeFileSync(file, content)
  return { file, dir }
}

const NEW_FUNCTIONS: Array<{ name: string; definer: boolean }> = [
  { name: 'enforce_loot_item_need_pin_refs', definer: true },
  { name: 'enforce_raid_tier_list_mode_rules', definer: true },
  { name: 'enforce_loot_item_need_rules', definer: true },
  { name: 'enforce_need_ranking_hold', definer: true },
  { name: 'enforce_expansion_forever_name_lock', definer: false },
  { name: 'enforce_raid_tier_expansion_lock', definer: false },
  { name: 'enforce_loot_item_need_delete_lock', definer: false },
]

const VALIDATE = (table: string, name: string) =>
  new RegExp(`^ALTER TABLE ${T(table)} VALIDATE CONSTRAINT ${q(name)}$`, 'i')
const DROP_CONSTRAINT = (table: string, name: string) =>
  new RegExp(`^ALTER TABLE ${T(table)} DROP CONSTRAINT IF EXISTS ${q(name)}$`, 'i')
const ADD_CONSTRAINT = (table: string, name: string, check: string) =>
  new RegExp(`^ALTER TABLE ${T(table)} ADD CONSTRAINT ${q(name)} CHECK \\(${check}\\) NOT VALID$`, 'i')
const COMMENT_COLUMN = (table: string, column: string) =>
  new RegExp(`^COMMENT ON COLUMN ${T(table)}\\.${q(column)} IS '`, 'i')
const CREATE_FUNCTION = (name: string, definer: boolean) =>
  new RegExp(
    `^CREATE OR REPLACE FUNCTION ${FN(name)} RETURNS ${q('trigger')} LANGUAGE ${q('plpgsql')} ` +
      `${definer ? 'SECURITY DEFINER ' : ''}SET ${q('search_path')} TO 'public', 'pg_temp' AS \\$\\$`,
    'i',
  )
const COMMENT_FUNCTION = (name: string) => new RegExp(`^COMMENT ON FUNCTION ${FN(name)} IS '`, 'i')
const REVOKE_FUNCTION = (name: string) =>
  new RegExp(
    `^REVOKE ALL ON FUNCTION ${FN(name)} FROM PUBLIC, ${q('anon')}, ${q('authenticated')}$`,
    'i',
  )
const CREATE_TRIGGER = (name: string, events: string, table: string, when: string, fn: string) =>
  new RegExp(
    `^CREATE OR REPLACE TRIGGER ${q(name)} BEFORE ${events} ON ${T(table)} FOR EACH ROW` +
      `${when ? ` WHEN \\(${when}\\)` : ''} EXECUTE FUNCTION ${q('public')}\\.${q(fn)}\\(\\)$`,
    'i',
  )
const COMMENT_TRIGGER = (name: string, table: string) =>
  new RegExp(`^COMMENT ON TRIGGER ${q(name)} ON ${T(table)} IS '`, 'i')

/** One regex per statement, in file order. */
function expectedStatements(): RegExp[] {
  const tiers = 'raid_tiers'
  const items = 'loot_items'
  const pins = 'loot_item_need_pins'
  const list: RegExp[] = []

  // 1
  list.push(/^SET LOCAL lock_timeout\s*=\s*'5s'$/i)
  // 2-6 raid_tiers.list_mode
  list.push(
    new RegExp(
      `^ALTER TABLE ${T(tiers)} ADD COLUMN IF NOT EXISTS ${q('list_mode')} ${q('text')} NOT NULL DEFAULT 'known'$`,
      'i',
    ),
  )
  list.push(DROP_CONSTRAINT(tiers, 'raid_tiers_list_mode_check'))
  list.push(
    ADD_CONSTRAINT(
      tiers,
      'raid_tiers_list_mode_check',
      `\\(${q('list_mode')} = ANY \\(ARRAY\\['known'::${q('text')}, 'discovery'::${q('text')}\\]\\)\\)`,
    ),
  )
  list.push(VALIDATE(tiers, 'raid_tiers_list_mode_check'))
  list.push(COMMENT_COLUMN(tiers, 'list_mode'))
  // 7-17 loot_items
  list.push(
    new RegExp(
      `^ALTER TABLE ${T(items)} ADD COLUMN IF NOT EXISTS ${q('kind')} ${q('text')} NOT NULL DEFAULT 'item'$`,
      'i',
    ),
  )
  list.push(
    new RegExp(`^ALTER TABLE ${T(items)} ADD COLUMN IF NOT EXISTS ${q('need_key')} ${q('text')}$`, 'i'),
  )
  list.push(DROP_CONSTRAINT(items, 'loot_items_kind_check'))
  list.push(
    ADD_CONSTRAINT(
      items,
      'loot_items_kind_check',
      `\\(${q('kind')} = ANY \\(ARRAY\\['item'::${q('text')}, 'need'::${q('text')}\\]\\)\\)`,
    ),
  )
  list.push(VALIDATE(items, 'loot_items_kind_check'))
  list.push(DROP_CONSTRAINT(items, 'loot_items_need_shape_check'))
  list.push(
    ADD_CONSTRAINT(
      items,
      'loot_items_need_shape_check',
      `\\(\\(\\(${q('kind')} = 'need'::${q('text')}\\) AND \\(${q('need_key')} IS NOT NULL\\) AND \\(${q('wowhead_id')} IS NULL\\)\\) ` +
        `OR \\(\\(${q('kind')} = 'item'::${q('text')}\\) AND \\(${q('need_key')} IS NULL\\)\\)\\)`,
    ),
  )
  list.push(VALIDATE(items, 'loot_items_need_shape_check'))
  list.push(
    new RegExp(
      `^CREATE UNIQUE INDEX IF NOT EXISTS ${q('idx_loot_items_tier_need_key')} ON ${T(items)} USING ${q('btree')} ` +
        `\\(${q('raid_tier_id')}, ${q('need_key')}\\) WHERE \\(${q('kind')} = 'need'::${q('text')}\\)$`,
      'i',
    ),
  )
  list.push(COMMENT_COLUMN(items, 'kind'))
  list.push(COMMENT_COLUMN(items, 'need_key'))
  // 18 column grant (Pitfall 1): no REVOKE, officer_notes is never granted
  list.push(
    new RegExp(
      `^GRANT SELECT \\(${q('kind')}, ${q('need_key')}\\) ON TABLE ${T(items)} TO ${q('anon')}, ${q('authenticated')}$`,
      'i',
    ),
  )
  // 19-20 loot_history.awarded_item_id: a plain nullable uuid, no foreign key
  list.push(
    new RegExp(`^ALTER TABLE ${T('loot_history')} ADD COLUMN IF NOT EXISTS ${q('awarded_item_id')} ${q('uuid')}$`, 'i'),
  )
  list.push(COMMENT_COLUMN('loot_history', 'awarded_item_id'))
  // 21-27 loot_item_need_pins
  list.push(
    new RegExp(
      `^CREATE TABLE IF NOT EXISTS ${T(pins)} \\( ${q('id')} ${q('uuid')} DEFAULT ${q('gen_random_uuid')}\\(\\) NOT NULL, ` +
        `${q('guild_id')} ${q('uuid')} NOT NULL, ${q('item_id')} ${q('uuid')} NOT NULL, ${q('need_id')} ${q('uuid')} NOT NULL, ` +
        `${q('pinned_by')} ${q('uuid')}, ${q('created_at')} timestamp with time zone DEFAULT ${q('now')}\\(\\) NOT NULL, ` +
        `CONSTRAINT ${q('loot_item_need_pins_pkey')} PRIMARY KEY \\(${q('id')}\\), ` +
        `CONSTRAINT ${q('loot_item_need_pins_guild_item_key')} UNIQUE \\(${q('guild_id')}, ${q('item_id')}\\), ` +
        `CONSTRAINT ${q('loot_item_need_pins_distinct_check')} CHECK \\(${q('item_id')} <> ${q('need_id')}\\), ` +
        `CONSTRAINT ${q('loot_item_need_pins_guild_id_fkey')} FOREIGN KEY \\(${q('guild_id')}\\) REFERENCES ${T('guilds')}\\(${q('id')}\\) ON DELETE CASCADE, ` +
        `CONSTRAINT ${q('loot_item_need_pins_item_id_fkey')} FOREIGN KEY \\(${q('item_id')}\\) REFERENCES ${T(items)}\\(${q('id')}\\) ON DELETE CASCADE, ` +
        `CONSTRAINT ${q('loot_item_need_pins_need_id_fkey')} FOREIGN KEY \\(${q('need_id')}\\) REFERENCES ${T(items)}\\(${q('id')}\\) ON DELETE CASCADE, ` +
        `CONSTRAINT ${q('loot_item_need_pins_pinned_by_fkey')} FOREIGN KEY \\(${q('pinned_by')}\\) REFERENCES ${q('auth')}\\.${q('users')}\\(${q('id')}\\) ON DELETE SET NULL \\)$`,
      'i',
    ),
  )
  list.push(
    new RegExp(
      `^CREATE INDEX IF NOT EXISTS ${q('idx_loot_item_need_pins_need_id')} ON ${T(pins)} USING ${q('btree')} \\(${q('need_id')}\\)$`,
      'i',
    ),
  )
  list.push(new RegExp(`^COMMENT ON TABLE ${T(pins)} IS '`, 'i'))
  list.push(new RegExp(`^ALTER TABLE ${T(pins)} ENABLE ROW LEVEL SECURITY$`, 'i'))
  list.push(
    new RegExp(`^REVOKE ALL ON TABLE ${T(pins)} FROM PUBLIC, ${q('anon')}, ${q('authenticated')}$`, 'i'),
  )
  list.push(
    new RegExp(`^GRANT SELECT, INSERT, DELETE ON TABLE ${T(pins)} TO ${q('authenticated')}$`, 'i'),
  )
  list.push(new RegExp(`^GRANT ALL ON TABLE ${T(pins)} TO ${q('service_role')}$`, 'i'))
  // 28-33 policies: DROP POLICY IF EXISTS then CREATE POLICY, no UPDATE policy
  list.push(new RegExp(`^DROP POLICY IF EXISTS "Guild members can view need pins" ON ${T(pins)}$`, 'i'))
  list.push(
    new RegExp(
      `^CREATE POLICY "Guild members can view need pins" ON ${T(pins)} FOR SELECT TO ${q('authenticated')} USING \\(.*${q('character_guild_memberships')}.*${q('is_active')} = true.*${q('is_guild_officer')}\\(${q('guild_id')}\\)\\)\\)$`,
      'i',
    ),
  )
  list.push(new RegExp(`^DROP POLICY IF EXISTS "Officers can insert need pins" ON ${T(pins)}$`, 'i'))
  list.push(
    new RegExp(
      `^CREATE POLICY "Officers can insert need pins" ON ${T(pins)} FOR INSERT TO ${q('authenticated')} WITH CHECK \\(${q('public')}\\.${q('is_guild_officer')}\\(${q('guild_id')}\\)\\)$`,
      'i',
    ),
  )
  list.push(new RegExp(`^DROP POLICY IF EXISTS "Officers can delete need pins" ON ${T(pins)}$`, 'i'))
  list.push(
    new RegExp(
      `^CREATE POLICY "Officers can delete need pins" ON ${T(pins)} FOR DELETE TO ${q('authenticated')} USING \\(${q('public')}\\.${q('is_guild_officer')}\\(${q('guild_id')}\\)\\)$`,
      'i',
    ),
  )
  // 34-38 pin integrity trigger
  list.push(CREATE_FUNCTION('enforce_loot_item_need_pin_refs', true))
  list.push(COMMENT_FUNCTION('enforce_loot_item_need_pin_refs'))
  list.push(REVOKE_FUNCTION('enforce_loot_item_need_pin_refs'))
  list.push(
    CREATE_TRIGGER(
      'enforce_loot_item_need_pin_refs',
      `INSERT OR UPDATE OF ${q('guild_id')}, ${q('item_id')}, ${q('need_id')}`,
      pins,
      '',
      'enforce_loot_item_need_pin_refs',
    ),
  )
  list.push(COMMENT_TRIGGER('enforce_loot_item_need_pin_refs', pins))
  // 39-45 raid_tiers guards (D-17, D-03)
  list.push(CREATE_FUNCTION('enforce_raid_tier_list_mode_rules', true))
  list.push(COMMENT_FUNCTION('enforce_raid_tier_list_mode_rules'))
  list.push(REVOKE_FUNCTION('enforce_raid_tier_list_mode_rules'))
  list.push(
    CREATE_TRIGGER(
      'enforce_raid_tier_discovery_forever_only',
      `INSERT OR UPDATE OF ${q('list_mode')}, ${q('expansion_id')}`,
      tiers,
      `NEW\\.list_mode = 'discovery'`,
      'enforce_raid_tier_list_mode_rules',
    ),
  )
  list.push(COMMENT_TRIGGER('enforce_raid_tier_discovery_forever_only', tiers))
  list.push(
    CREATE_TRIGGER(
      'enforce_raid_tier_known_switch',
      `UPDATE OF ${q('list_mode')}`,
      tiers,
      `OLD\\.list_mode = 'discovery' AND NEW\\.list_mode <> 'discovery'`,
      'enforce_raid_tier_list_mode_rules',
    ),
  )
  list.push(COMMENT_TRIGGER('enforce_raid_tier_known_switch', tiers))
  // 46-52 loot_items guards (D-12, D-17)
  list.push(CREATE_FUNCTION('enforce_loot_item_need_rules', true))
  list.push(COMMENT_FUNCTION('enforce_loot_item_need_rules'))
  list.push(REVOKE_FUNCTION('enforce_loot_item_need_rules'))
  list.push(
    CREATE_TRIGGER('enforce_loot_item_need_rules_insert', 'INSERT', items, `NEW\\.kind = 'need'`, 'enforce_loot_item_need_rules'),
  )
  list.push(COMMENT_TRIGGER('enforce_loot_item_need_rules_insert', items))
  list.push(
    CREATE_TRIGGER(
      'enforce_loot_item_need_rules_update',
      'UPDATE',
      items,
      `OLD\\.kind = 'need' OR NEW\\.kind = 'need'`,
      'enforce_loot_item_need_rules',
    ),
  )
  list.push(COMMENT_TRIGGER('enforce_loot_item_need_rules_update', items))
  // 53-57 D-22 hold (no WHEN: the need test needs a lookup)
  list.push(CREATE_FUNCTION('enforce_need_ranking_hold', true))
  list.push(COMMENT_FUNCTION('enforce_need_ranking_hold'))
  list.push(REVOKE_FUNCTION('enforce_need_ranking_hold'))
  list.push(
    CREATE_TRIGGER(
      'enforce_need_ranking_hold',
      `INSERT OR UPDATE OF ${q('loot_item_id')}`,
      'loot_submission_items',
      '',
      'enforce_need_ranking_hold',
    ),
  )
  list.push(COMMENT_TRIGGER('enforce_need_ranking_hold', 'loot_submission_items'))
  // 58-64 D-24 Forever expansion name lock
  list.push(CREATE_FUNCTION('enforce_expansion_forever_name_lock', false))
  list.push(COMMENT_FUNCTION('enforce_expansion_forever_name_lock'))
  list.push(REVOKE_FUNCTION('enforce_expansion_forever_name_lock'))
  list.push(
    CREATE_TRIGGER(
      'enforce_expansion_forever_name_insert',
      'INSERT',
      'expansions',
      `NEW\\.name = 'Forever'`,
      'enforce_expansion_forever_name_lock',
    ),
  )
  list.push(COMMENT_TRIGGER('enforce_expansion_forever_name_insert', 'expansions'))
  list.push(
    CREATE_TRIGGER(
      'enforce_expansion_forever_name_update',
      `UPDATE OF ${q('name')}`,
      'expansions',
      `OLD\\.name IS DISTINCT FROM NEW\\.name AND \\(OLD\\.name = 'Forever' OR NEW\\.name = 'Forever'\\)`,
      'enforce_expansion_forever_name_lock',
    ),
  )
  list.push(COMMENT_TRIGGER('enforce_expansion_forever_name_update', 'expansions'))
  // 65-69 D-26 tier-move lock
  list.push(CREATE_FUNCTION('enforce_raid_tier_expansion_lock', false))
  list.push(COMMENT_FUNCTION('enforce_raid_tier_expansion_lock'))
  list.push(REVOKE_FUNCTION('enforce_raid_tier_expansion_lock'))
  list.push(
    CREATE_TRIGGER(
      'enforce_raid_tier_expansion_lock',
      `UPDATE OF ${q('expansion_id')}`,
      tiers,
      `OLD\\.expansion_id IS DISTINCT FROM NEW\\.expansion_id`,
      'enforce_raid_tier_expansion_lock',
    ),
  )
  list.push(COMMENT_TRIGGER('enforce_raid_tier_expansion_lock', tiers))
  // 70-74 D-27 need-row delete lock
  list.push(CREATE_FUNCTION('enforce_loot_item_need_delete_lock', false))
  list.push(COMMENT_FUNCTION('enforce_loot_item_need_delete_lock'))
  list.push(REVOKE_FUNCTION('enforce_loot_item_need_delete_lock'))
  list.push(
    CREATE_TRIGGER(
      'enforce_loot_item_need_delete_lock',
      'DELETE',
      items,
      `OLD\\.kind = 'need'`,
      'enforce_loot_item_need_delete_lock',
    ),
  )
  list.push(COMMENT_TRIGGER('enforce_loot_item_need_delete_lock', items))
  // 75 verifying DO block
  list.push(/^DO \$\$ DECLARE .* END \$\$$/i)
  return list
}

describe('Discovery schema migration shape (DISC-12)', () => {
  // Anchored to the newest migration that existed when this one was written
  // (20261013120000), not to a live directory scan, which would fail as soon
  // as any later migration lands (#309 fixed exactly that).
  it('the file exists, sorts after every migration that preceded it, and has a unique timestamp', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20261013120000)

    const sameTimestamp = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(name => name.endsWith('.sql') && name !== path.basename(MIGRATION_FILE))
      .filter(name => name.slice(0, 14) === MIGRATION_TIMESTAMP)
    expect(sameTimestamp).toEqual([])
  })

  it('has exactly 75 statements, in the required order', () => {
    const chunks = statements()
    expect(chunks).toHaveLength(75)

    const expected = expectedStatements()
    expect(expected.length).toBe(75)
    expected.forEach((re, i) => {
      expect(chunks[i], `statement ${i + 1} should match ${re}`).toMatch(re)
    })
  })

  it('adds every constraint NOT VALID and validates it in the next statement', () => {
    const chunks = statements()
    const adds = chunks
      .map((stmt, i) => ({ stmt, i }))
      .filter(({ stmt }) => /^ALTER TABLE .* ADD CONSTRAINT\b/i.test(stmt))
    expect(adds).toHaveLength(OWN_CONSTRAINTS.length)
    for (const { stmt, i } of adds) {
      expect(stmt, 'ADD CONSTRAINT must end in NOT VALID').toMatch(/ NOT VALID$/i)
      const name = stmt.match(/ADD CONSTRAINT "?(\w+)"?/i)![1]
      expect(chunks[i + 1]).toMatch(
        new RegExp(`^ALTER TABLE .* VALIDATE CONSTRAINT ${q(name)}$`, 'i'),
      )
    }
  })

  it('has the house-style header sections', () => {
    const raw = readMigrationRaw()
    const sections = [
      'Problem',
      'Fix',
      'Guards on existing tables',
      'Readers and writers checked',
      'Error contract',
      'Production safety',
      'Not changed',
      'Deploy',
      'Rollback',
    ]
    for (const section of sections) {
      expect(raw, `header section ${section}`).toMatch(new RegExp(`^-- ${section}\\n-- -{3,}$`, 'm'))
    }
  })

  it('defines exactly seven functions, none of them an existing one, each locked down', () => {
    const chunks = statements()
    const created = chunks
      .map((stmt, i) => ({ stmt, i }))
      .filter(({ stmt }) => /^CREATE OR REPLACE FUNCTION\b/i.test(stmt))
    const names = created.map(({ stmt }) => stmt.match(/^CREATE OR REPLACE FUNCTION "?public"?\."?(\w+)"?/i)![1])
    // save_submission_items, create_expansion_for_guild and delete_guild are
    // not among them, so none is redefined.
    expect(names).toEqual(NEW_FUNCTIONS.map(f => f.name))

    for (const { name, definer } of NEW_FUNCTIONS) {
      const { stmt, i } = created[names.indexOf(name)]
      const head = stmt.split('$$')[0]
      expect(/\bSECURITY DEFINER\b/i.test(head), `${name} SECURITY DEFINER`).toBe(definer)
      expect(head, `${name} search_path`).toMatch(/SET "?search_path"? TO 'public', 'pg_temp'/i)
      expect(chunks[i + 2], `${name} REVOKE`).toMatch(REVOKE_FUNCTION(name))
    }
  })

  it('creates exactly ten triggers and puts a WHEN clause on every raid_tiers, loot_items and expansions guard', () => {
    const triggers = findGuardTriggers(statements())
    expect(triggers.map(t => t.name)).toEqual([
      'enforce_loot_item_need_pin_refs',
      'enforce_raid_tier_discovery_forever_only',
      'enforce_raid_tier_known_switch',
      'enforce_loot_item_need_rules_insert',
      'enforce_loot_item_need_rules_update',
      'enforce_need_ranking_hold',
      'enforce_expansion_forever_name_insert',
      'enforce_expansion_forever_name_update',
      'enforce_raid_tier_expansion_lock',
      'enforce_loot_item_need_delete_lock',
    ])
    expect(triggers.find(t => t.name === 'enforce_loot_item_need_pin_refs')!.table).toBe('loot_item_need_pins')
    expect(triggers.find(t => t.name === 'enforce_need_ranking_hold')!.table).toBe('loot_submission_items')
    expect(whenProblems(triggers)).toEqual([])
  })

  it('pins the D-26 tier-move lock exactly', () => {
    const t = findGuardTriggers(statements()).find(x => x.name === 'enforce_raid_tier_expansion_lock')!
    expect(t.table).toBe('raid_tiers')
    // UPDATE only, no INSERT event.
    expect(t.events.replace(/"/g, '')).toBe('UPDATE OF expansion_id')
    expect(t.when.replace(/\s+/g, ' ')).toBe('OLD.expansion_id IS DISTINCT FROM NEW.expansion_id')
    expect(t.fn).toBe('enforce_raid_tier_expansion_lock')
  })

  it('pins the D-27 need-row delete lock exactly, and keeps the 03-12 function scan from listing it', () => {
    const t = findGuardTriggers(statements()).find(x => x.name === 'enforce_loot_item_need_delete_lock')!
    expect(t.table).toBe('loot_items')
    // DELETE only, no INSERT or UPDATE event.
    expect(t.events).toBe('DELETE')
    expect(t.when.replace(/\s+/g, ' ')).toBe("OLD.kind = 'need'")
    expect(t.fn).toBe('enforce_loot_item_need_delete_lock')

    const body = functionBody(readMigrationRaw(), 'enforce_loot_item_need_delete_lock')
    expect(body).not.toBe('')
    expect(body).toContain('pg_trigger_depth()')
    expect(body).toMatch(/\bRETURN OLD\b/)
    // The 03-12 scan lists every function whose body names one of these
    // tables. The lock reads none, so its body, comments included, must not.
    for (const table of ['loot_items', 'loot_submission_items', 'loot_history']) {
      expect(body, `lock body must not name ${table}`).not.toMatch(new RegExp(`\\b${table}\\b`))
    }
  })

  it('changes no data, no guild_settings and drops nothing it did not create', () => {
    expect(forbiddenContentViolations()).toEqual([])
  })

  it('adds loot_history.awarded_item_id with no foreign key (a second FK makes PostgREST embeds ambiguous)', () => {
    const touching = statements().filter(stmt => /\bawarded_item_id\b/i.test(blankStrings(stmt)))
    // The column statement and its COMMENT ON COLUMN, nothing else.
    expect(touching).toHaveLength(2)
    expect(touching[0]).toMatch(/^ALTER TABLE .* ADD COLUMN IF NOT EXISTS "?awarded_item_id"? "?uuid"?$/i)
    expect(touching[1]).toMatch(/^COMMENT ON COLUMN\b/i)
    for (const stmt of touching) {
      expect(blankStrings(stmt)).not.toMatch(/\bREFERENCES\b|\bFOREIGN KEY\b/i)
    }
  })

  it('never makes officer_notes readable and grants no UPDATE on the pins table', () => {
    const grants = statements().filter(stmt => /^GRANT\b/i.test(stmt))
    for (const grant of grants) {
      expect(grant).not.toMatch(/officer_notes/i)
    }
    const pinGrants = grants.filter(stmt => /loot_item_need_pins/i.test(stmt) && /authenticated/i.test(stmt))
    expect(pinGrants).toHaveLength(1)
    expect(pinGrants[0]).not.toMatch(/\bUPDATE\b|\bALL\b/i)
  })

  describe('self-checks: the guard has teeth', () => {
    it('self-check 1: a synthetic file with a data statement fails the forbidden-content check', () => {
      const synthetic = writeSynthetic(
        `${readMigrationRaw()}\nUPDATE "public"."raid_tiers" SET "list_mode" = 'discovery';\n`,
      )
      const previous = process.env.MIGRATION_FILE_OVERRIDE
      process.env.MIGRATION_FILE_OVERRIDE = synthetic.file
      try {
        expect(forbiddenContentViolations().length).toBeGreaterThan(0)
      } finally {
        if (previous === undefined) delete process.env.MIGRATION_FILE_OVERRIDE
        else process.env.MIGRATION_FILE_OVERRIDE = previous
        fs.rmSync(synthetic.dir, { recursive: true, force: true })
      }
    })

    it('self-check 2: removing the WHEN clause of enforce_loot_item_need_rules_insert fails the WHEN-clause check', () => {
      const raw = readMigrationRaw()
      const broken = raw.replace(
        / WHEN \(NEW\.kind = 'need'\) EXECUTE FUNCTION "public"\."enforce_loot_item_need_rules"\(\)/,
        ' EXECUTE FUNCTION "public"."enforce_loot_item_need_rules"()',
      )
      expect(broken).not.toBe(raw)
      const synthetic = writeSynthetic(broken)
      const previous = process.env.MIGRATION_FILE_OVERRIDE
      process.env.MIGRATION_FILE_OVERRIDE = synthetic.file
      try {
        expect(whenProblems(findGuardTriggers(statements()))).toContain(
          'enforce_loot_item_need_rules_insert: no WHEN clause',
        )
      } finally {
        if (previous === undefined) delete process.env.MIGRATION_FILE_OVERRIDE
        else process.env.MIGRATION_FILE_OVERRIDE = previous
        fs.rmSync(synthetic.dir, { recursive: true, force: true })
      }
    })

    it('self-check 3 (D-24): removing the WHEN clause of enforce_expansion_forever_name_update fails the WHEN-clause check', () => {
      const raw = readMigrationRaw()
      const broken = raw.replace(
        / WHEN \(OLD\.name IS DISTINCT FROM NEW\.name AND \(OLD\.name = 'Forever' OR NEW\.name = 'Forever'\)\) EXECUTE FUNCTION/,
        ' EXECUTE FUNCTION',
      )
      expect(broken).not.toBe(raw)
      const synthetic = writeSynthetic(broken)
      const previous = process.env.MIGRATION_FILE_OVERRIDE
      process.env.MIGRATION_FILE_OVERRIDE = synthetic.file
      try {
        expect(whenProblems(findGuardTriggers(statements()))).toContain(
          'enforce_expansion_forever_name_update: no WHEN clause',
        )
      } finally {
        if (previous === undefined) delete process.env.MIGRATION_FILE_OVERRIDE
        else process.env.MIGRATION_FILE_OVERRIDE = previous
        fs.rmSync(synthetic.dir, { recursive: true, force: true })
      }
    })

    it('self-check 4 (D-26): removing the WHEN clause of enforce_raid_tier_expansion_lock fails the WHEN-clause check', () => {
      const raw = readMigrationRaw()
      const broken = raw.replace(
        / WHEN \(OLD\.expansion_id IS DISTINCT FROM NEW\.expansion_id\) EXECUTE FUNCTION/,
        ' EXECUTE FUNCTION',
      )
      expect(broken).not.toBe(raw)
      const synthetic = writeSynthetic(broken)
      const previous = process.env.MIGRATION_FILE_OVERRIDE
      process.env.MIGRATION_FILE_OVERRIDE = synthetic.file
      try {
        expect(whenProblems(findGuardTriggers(statements()))).toContain(
          'enforce_raid_tier_expansion_lock: no WHEN clause',
        )
      } finally {
        if (previous === undefined) delete process.env.MIGRATION_FILE_OVERRIDE
        else process.env.MIGRATION_FILE_OVERRIDE = previous
        fs.rmSync(synthetic.dir, { recursive: true, force: true })
      }
    })

    it('self-check 5 (D-27): removing the WHEN clause of enforce_loot_item_need_delete_lock fails the WHEN-clause check', () => {
      const raw = readMigrationRaw()
      const broken = raw.replace(
        / WHEN \(OLD\.kind = 'need'\) EXECUTE FUNCTION "public"\."enforce_loot_item_need_delete_lock"\(\)/,
        ' EXECUTE FUNCTION "public"."enforce_loot_item_need_delete_lock"()',
      )
      expect(broken).not.toBe(raw)
      const synthetic = writeSynthetic(broken)
      const previous = process.env.MIGRATION_FILE_OVERRIDE
      process.env.MIGRATION_FILE_OVERRIDE = synthetic.file
      try {
        expect(whenProblems(findGuardTriggers(statements()))).toContain(
          'enforce_loot_item_need_delete_lock: no WHEN clause',
        )
      } finally {
        if (previous === undefined) delete process.env.MIGRATION_FILE_OVERRIDE
        else process.env.MIGRATION_FILE_OVERRIDE = previous
        fs.rmSync(synthetic.dir, { recursive: true, force: true })
      }
    })
  })
})
