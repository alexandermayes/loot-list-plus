// @vitest-environment node
import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// DISC-03, DISC-05, DISC-10 (D-02, D-08, D-18, D-25): this locks the shape of
// the Phase 4 migration. The behaviour is proven on a real Postgres in
// need-lists-pglite.test.ts; this test pins what the file may contain: its 19
// statements in order, NOT VALID then VALIDATE pairs, one WHEN-gated trigger
// on raid_tiers, and no data change, no CONCURRENTLY and no redefinition of
// the list save function (the slot range lives in the table check only).

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20261111120000'
const MIGRATION_FILE = path.join(MIGRATIONS_DIR, `${MIGRATION_TIMESTAMP}_need_lists.sql`)

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

const readMigration = () => fs.readFileSync(MIGRATION_FILE, 'utf8')
const statementsOf = (raw: string) => splitStatements(stripComments(raw))

/** Blank out the contents of every single-quoted string literal (handling
 * '' escapes), so keyword checks never match words inside COMMENT text. */
function blankStrings(sql: string): string {
  return sql.replace(/'(?:[^']|'')*'/g, "''")
}

/** Replace each dollar-quoted body with an empty marker, so the content
 * checks never trip on the guard function's own SELECTs or on the verifying
 * DO block. */
function stripDollarBodies(sql: string): string {
  return sql.replace(/\$\$[\s\S]*?\$\$/g, '$$__BODY__$$')
}

/** Optional double quotes around an identifier. */
const q = (name: string) => `"?${name}"?`
const T = (table: string) => `${q('public')}\\.${q(table)}`
const FN = (name: string) => `${q('public')}\\.${q(name)}\\(\\)`

const LOCK_TRIGGER = 'enforce_raid_tier_need_delete_lock'

function expectedStatements(): RegExp[] {
  const items = T('loot_submission_items')
  const settings = T('guild_settings')
  return [
    // 1
    /^SET LOCAL lock_timeout = '5s'$/i,
    // 2-3 D-08: drop the hold, trigger first, then function
    new RegExp(`^DROP TRIGGER IF EXISTS ${q('enforce_need_ranking_hold')} ON ${items}$`, 'i'),
    new RegExp(`^DROP FUNCTION IF EXISTS ${FN('enforce_need_ranking_hold')}$`, 'i'),
    // 4-7 D-02: widen the slot check under a new name, then drop the old one
    new RegExp(
      `^ALTER TABLE ${items} DROP CONSTRAINT IF EXISTS ${q('loot_submission_items_slot_range_check')}$`,
      'i',
    ),
    new RegExp(
      `^ALTER TABLE ${items} ADD CONSTRAINT ${q('loot_submission_items_slot_range_check')} ` +
        `CHECK \\(\\(${q('slot')} >= 1 AND ${q('slot')} <= 8\\)\\) NOT VALID$`,
      'i',
    ),
    new RegExp(
      `^ALTER TABLE ${items} VALIDATE CONSTRAINT ${q('loot_submission_items_slot_range_check')}$`,
      'i',
    ),
    new RegExp(
      `^ALTER TABLE ${items} DROP CONSTRAINT IF EXISTS ${q('loot_submission_items_slot_check')}$`,
      'i',
    ),
    // 8
    new RegExp(`^COMMENT ON COLUMN ${items}\\.${q('slot')} IS '.*1 to 8.*'$`, 'i'),
    // 9-13 D-18: loot_style
    new RegExp(`^ALTER TABLE ${settings} ADD COLUMN IF NOT EXISTS ${q('loot_style')} ${q('text')}$`, 'i'),
    new RegExp(
      `^ALTER TABLE ${settings} DROP CONSTRAINT IF EXISTS ${q('guild_settings_loot_style_check')}$`,
      'i',
    ),
    new RegExp(
      `^ALTER TABLE ${settings} ADD CONSTRAINT ${q('guild_settings_loot_style_check')} ` +
        `CHECK \\(\\(${q('loot_style')} IS NULL OR ${q('loot_style')} = ANY \\(ARRAY\\[` +
        `'reward_attendance'::${q('text')}, 'even_rotation'::${q('text')}, 'officers_decide'::${q('text')}\\]\\)\\)\\) NOT VALID$`,
      'i',
    ),
    new RegExp(`^ALTER TABLE ${settings} VALIDATE CONSTRAINT ${q('guild_settings_loot_style_check')}$`, 'i'),
    new RegExp(`^COMMENT ON COLUMN ${settings}\\.${q('loot_style')} IS '.*'$`, 'i'),
    // 14-18 D-25: the raid_tiers delete guard
    new RegExp(`^CREATE OR REPLACE FUNCTION ${FN(LOCK_TRIGGER)} RETURNS ${q('trigger')} .* AS \\$\\$.*\\$\\$$`, 'i'),
    new RegExp(`^REVOKE ALL ON FUNCTION ${FN(LOCK_TRIGGER)} FROM PUBLIC, ${q('anon')}, ${q('authenticated')}$`, 'i'),
    new RegExp(`^COMMENT ON FUNCTION ${FN(LOCK_TRIGGER)} IS '.*'$`, 'i'),
    new RegExp(
      `^CREATE OR REPLACE TRIGGER ${q(LOCK_TRIGGER)} BEFORE DELETE ON ${T('raid_tiers')} ` +
        `FOR EACH ROW WHEN \\(OLD\\.list_mode = 'discovery'\\) EXECUTE FUNCTION ${FN(LOCK_TRIGGER)}$`,
      'i',
    ),
    new RegExp(`^COMMENT ON TRIGGER ${q(LOCK_TRIGGER)} ON ${T('raid_tiers')} IS '.*'$`, 'i'),
    // 19 verifying DO block
    /^DO \$\$ BEGIN .* END \$\$$/i,
  ]
}

/** Statements that write data or change what the file may not touch, found
 * outside dollar-quoted bodies and string literals. Empty for a clean file. */
function forbiddenContentViolations(raw: string): string[] {
  const outside = statementsOf(raw).map(stmt => blankStrings(stripDollarBodies(stmt)))
  const violations: string[] = []
  for (const stmt of outside) {
    if (/^(INSERT|UPDATE|DELETE|TRUNCATE|COPY)\b/i.test(stmt)) violations.push(`data statement: ${stmt}`)
    if (/\bCONCURRENTLY\b/i.test(stmt)) violations.push(`CONCURRENTLY: ${stmt}`)
    if (/^CREATE OR REPLACE FUNCTION\b/i.test(stmt) && !stmt.includes(`"${LOCK_TRIGGER}"`)) {
      violations.push(`function redefined: ${stmt}`)
    }
    if (/\bsave_submission_items\b/i.test(stmt)) violations.push(`names save_submission_items: ${stmt}`)
  }
  return violations
}

/** The WHEN clause text of the raid_tiers trigger, or null when it has none. */
function lockTriggerWhen(raw: string): string | null {
  const stmt = statementsOf(raw).find(s => s.startsWith(`CREATE OR REPLACE TRIGGER "${LOCK_TRIGGER}"`))
  if (!stmt) throw new Error('trigger statement not found')
  return stmt.match(/ FOR EACH ROW WHEN \((.*)\) EXECUTE FUNCTION /i)?.[1] ?? null
}

describe('Phase 4 need lists migration shape (DISC-03, DISC-05, DISC-10)', () => {
  // Anchored to the newest migration that existed when this one was written
  // (20261028120000), not to a live directory scan, which would fail as soon
  // as any later migration lands (#309 fixed exactly that).
  it('the file exists, sorts after every migration that preceded it, and has a unique timestamp', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20261028120000)

    const sameTimestamp = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(name => name.endsWith('.sql') && name !== path.basename(MIGRATION_FILE))
      .filter(name => name.slice(0, 14) === MIGRATION_TIMESTAMP)
    expect(sameTimestamp).toEqual([])
  })

  it('has exactly 19 statements, in the required order', () => {
    const chunks = statementsOf(readMigration())
    expect(chunks).toHaveLength(19)

    const expected = expectedStatements()
    expect(expected.length).toBe(19)
    expected.forEach((re, i) => {
      expect(chunks[i], `statement ${i + 1} should match ${re}`).toMatch(re)
    })
  })

  it('adds every constraint NOT VALID and validates it in the next statement', () => {
    const chunks = statementsOf(readMigration())
    const adds = chunks
      .map((stmt, i) => ({ stmt, i }))
      .filter(({ stmt }) => /^ALTER TABLE .* ADD CONSTRAINT\b/i.test(stmt))
    expect(adds).toHaveLength(2)
    for (const { stmt, i } of adds) {
      expect(stmt, 'ADD CONSTRAINT must end in NOT VALID').toMatch(/ NOT VALID$/i)
      const name = stmt.match(/ADD CONSTRAINT "?(\w+)"?/i)![1]
      expect(chunks[i + 1]).toMatch(new RegExp(`^ALTER TABLE .* VALIDATE CONSTRAINT ${q(name)}$`, 'i'))
    }
  })

  it('puts a WHEN clause on Discovery on the raid_tiers delete trigger, so a Known tier delete never calls it', () => {
    const raw = readMigration()
    expect(lockTriggerWhen(raw)).toMatch(/^OLD\.list_mode = 'discovery'$/)
    expect(statementsOf(raw).filter(s => /^CREATE OR REPLACE TRIGGER\b/i.test(s))).toHaveLength(1)
  })

  it('writes the guard as a locked-down definer function that returns OLD', () => {
    const raw = readMigration()
    const created = statementsOf(raw).filter(s => /^CREATE OR REPLACE FUNCTION\b/i.test(s))
    expect(created).toHaveLength(1)
    const head = created[0].split('$$')[0]
    expect(head).toMatch(/\bSECURITY DEFINER\b/i)
    expect(head).toMatch(/SET "?search_path"? TO 'public', 'pg_temp'/i)

    const body = created[0]
    expect(body).toMatch(/\bRETURN OLD\b/)
    expect(body).toContain('raid tiers with ranked or awarded needs are deleted only by the server')
    expect(body).toMatch(/ERRCODE = 'check_violation'/)
    // A plain predicate: delete_guild empties lists and history first, so a
    // trigger depth rule is not needed and would only add a way to be wrong.
    expect(body).not.toMatch(/pg_trigger_depth/i)
  })

  it('has the house-style header sections', () => {
    const raw = readMigration()
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

  it('changes no data, uses no CONCURRENTLY and redefines no existing function', () => {
    expect(forbiddenContentViolations(readMigration())).toEqual([])
  })

  describe('self-checks: the guard has teeth', () => {
    it('self-check 1: a data statement fails the forbidden-content check', () => {
      const broken = `${readMigration()}\nUPDATE "public"."guild_settings" SET "loot_style" = 'even_rotation';\n`
      expect(forbiddenContentViolations(broken).length).toBeGreaterThan(0)
    })

    it('self-check 2: a redefined save_submission_items fails the forbidden-content check', () => {
      const broken =
        `${readMigration()}\nCREATE OR REPLACE FUNCTION "public"."save_submission_items"("p_submission_id" "uuid", ` +
        `"p_items" "jsonb") RETURNS integer LANGUAGE plpgsql AS $$ BEGIN RETURN 0; END; $$;\n`
      expect(forbiddenContentViolations(broken).length).toBeGreaterThan(0)
    })

    it('self-check 3: removing the WHEN clause of the raid_tiers trigger fails the WHEN-clause check', () => {
      const raw = readMigration()
      const broken = raw.replace(/ WHEN \(OLD\.list_mode = 'discovery'\)/, '')
      expect(broken).not.toBe(raw)
      expect(lockTriggerWhen(broken)).toBeNull()
    })

    it('self-check 4: an ADD CONSTRAINT without NOT VALID fails the pairing check', () => {
      const raw = readMigration()
      const broken = raw.replace(/<= 8\)\) NOT VALID;/, '<= 8));')
      expect(broken).not.toBe(raw)
      const chunks = statementsOf(broken)
      const add = chunks.find(s => /ADD CONSTRAINT "loot_submission_items_slot_range_check"/.test(s))!
      expect(add).not.toMatch(/ NOT VALID$/i)
    })
  })
})
