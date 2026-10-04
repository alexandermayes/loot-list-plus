import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Quick task 261004-0ut: this locks the shape of the migration that makes
// delete_guild remove the guild's reserve runs (with their submissions,
// awards and audit rows) before its expansions, and keep an expansion, with
// its raid tiers and loot items, detached from the guild while rows outside
// the guild still use it. The behaviour is proven in a PGlite harness
// outside the repo; this test pins the file's shape.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20261004020000'
const MIGRATION_FILE = path.join(MIGRATIONS_DIR, `${MIGRATION_TIMESTAMP}_delete_guild_with_reserve_runs.sql`)
const PREVIOUS_FILE = '20260722000001_lock_down_definer_rpc_grants.sql'
const GRANTS_FILE = '20260930000200_tighten_function_execute_grants.sql'
const BASELINE_FILE = '20260101000000_baseline_schema.sql'

/** OD-1 resolution: keep every outside reference of finding 1. OD-2
 * resolution: clear the deleted guild's officer notes on kept items. Typed
 * as `string` (not a narrower union) so the branches below remain
 * meaningful to tsc regardless of which branch is live. */
const KEEP_SCOPE: string = 'all'
const NOTES_RULE: string = 'clear'

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

/** Blank out the contents of every single-quoted string literal. */
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
  return { prefix, body: fn.slice(open + 2, close).trim() }
}

/** Lines after the exact '-- Rollback' heading line, up to the first line
 * that does not start with two hyphens; keep the lines that start with
 * '--   ' (two hyphens, three spaces), drop those first five characters,
 * join with newlines, strip comments (the body copied into the rollback
 * carries its own inline comments) and split into statements. */
function rollbackStatements(): string[] {
  const raw = readMigrationRaw()
  const lines = raw.split('\n')
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '-- Rollback') {
      start = i
      break
    }
  }
  expect(start, "no '-- Rollback' heading line found").toBeGreaterThan(-1)
  const kept: string[] = []
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.startsWith('--')) break
    if (line.startsWith('--   ')) kept.push(line.slice(5))
  }
  return splitStatements(stripComments(kept.join('\n')))
}

/** Optional double quotes around an identifier. */
const q = (name: string) => `"?${name}"?`
const ref = (name: string) => `${q('public')}\\.${q(name)}`

/** The em dash character, built from its code point so this file never contains one. */
const EM_DASH = String.fromCharCode(0x2014)

const roleList = (list: string) => list.split(',').map(role => role.trim().replace(/^"|"$/g, ''))

function readMigrationFile(name: string): string {
  return fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8')
}

/** The delete_guild CREATE OR REPLACE statement as it stands in PREVIOUS_FILE. */
function oldCreateStatement(): string {
  const stmts = splitStatements(stripComments(readMigrationFile(PREVIOUS_FILE)))
  const found = stmts.find(s => new RegExp(`^CREATE OR REPLACE FUNCTION ${ref('delete_guild')}`, 'i').test(s))
  if (!found) throw new Error('delete_guild CREATE not found in PREVIOUS_FILE')
  return found
}
const OLD = oldCreateStatement()

function grantsFileStatements(name: 'revoke' | 'grant'): string {
  const stmts = splitStatements(stripComments(readMigrationFile(GRANTS_FILE)))
  const re = name === 'revoke'
    ? new RegExp(`^REVOKE ALL ON FUNCTION ${ref('delete_guild')}`, 'i')
    : new RegExp(`^GRANT EXECUTE ON FUNCTION ${ref('delete_guild')}`, 'i')
  const found = stmts.find(s => re.test(s))
  if (!found) throw new Error(`delete_guild ${name} not found in GRANTS_FILE`)
  return found
}

const MARKER_START = 'SET active_guild_id = NULL WHERE active_guild_id = p_guild_id;'
const MARKER_END = 'DELETE FROM raid_team_members'

/** Cut the D-02 block out of the new (collapsed, single-line) body: removes
 * the leading DECLARE, then returns both the cut block text and the
 * remainder with the block replaced by one space, for comparison to OLD. */
function cutNewBody(body: string): { cut: string; replaced: string } {
  const declPrefix = 'DECLARE v_kept uuid[]; BEGIN'
  if (!body.startsWith(declPrefix)) throw new Error('body does not start with DECLARE v_kept uuid[]; BEGIN')
  const declRemoved = 'BEGIN' + body.slice(declPrefix.length)
  const startIdx = declRemoved.indexOf(MARKER_START)
  const endIdx = declRemoved.indexOf(MARKER_END)
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) throw new Error('markers not found in order in the new body')
  const cutStart = startIdx + MARKER_START.length
  const cut = declRemoved.slice(cutStart, endIdx)
  const replaced = declRemoved.slice(0, cutStart) + ' ' + declRemoved.slice(endIdx)
  return { cut, replaced }
}

function cutOldBody(body: string): string {
  const startIdx = body.indexOf(MARKER_START)
  const endIdx = body.indexOf(MARKER_END)
  if (startIdx === -1 || endIdx === -1) throw new Error('markers not found in OLD body')
  const cutStart = startIdx + MARKER_START.length
  return body.slice(0, cutStart) + ' ' + body.slice(endIdx)
}

const deleteTargets = (s: string) => [...s.matchAll(/DELETE FROM (?:ONLY )?"?(\w+)"?/gi)].map(m => m[1])
const updateTargets = (s: string) => [...s.matchAll(/UPDATE "?(\w+)"?/gi)].map(m => m[1])

describe('delete_guild reserve runs and keep-expansions migration shape (quick task 261004-0ut)', () => {
  it('(a) the file exists, has a unique timestamp and sorts after the newest migration at planning time (#309)', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    // Anchored to 20261003230000 (quick task 261003-t28, which merges first),
    // not a live directory scan, which would fail as soon as any later
    // migration lands.
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20261003230000)
    const sameTimestamp = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(name => name.endsWith('.sql') && name !== path.basename(MIGRATION_FILE))
      .filter(name => name.slice(0, 14) === MIGRATION_TIMESTAMP)
    expect(sameTimestamp).toEqual([])
  })

  it('(b) has exactly four statements in order', () => {
    const stmts = statements()
    expect(stmts).toHaveLength(4)
    expect(stmts[0]).toMatch(/^SET LOCAL "?lock_timeout"? = '5s'$/i)
    expect(stmts[1]).toMatch(new RegExp(`^CREATE OR REPLACE FUNCTION ${ref('delete_guild')}\\("p_guild_id" "uuid"\\) RETURNS ${q('void')}`, 'i'))
    expect(stmts[2]).toMatch(new RegExp(`^REVOKE ALL ON FUNCTION ${ref('delete_guild')}`, 'i'))
    expect(stmts[3]).toMatch(new RegExp(`^GRANT EXECUTE ON FUNCTION ${ref('delete_guild')}`, 'i'))
  })

  it('(c) the new CREATE has the same prefix as OLD, and the file has exactly two dollar-quoted bodies', () => {
    const { prefix: newPrefix } = functionParts(statements()[1])
    const { prefix: oldPrefix } = functionParts(OLD)
    expect(newPrefix).toBe(oldPrefix)
    const code = stripComments(readMigrationRaw())
    expect((code.match(/\$\$/g) ?? []).length).toBe(2)
  })

  it('(d) the new body starts with DECLARE v_kept uuid[]; BEGIN and matches OLD outside the D-02 block', () => {
    const { body } = functionParts(statements()[1])
    expect(body.startsWith('DECLARE v_kept uuid[]; BEGIN')).toBe(true)
    const { replaced } = cutNewBody(body)
    const oldReplaced = cutOldBody(functionParts(OLD).body)
    expect(replaced).toBe(oldReplaced)
  })

  it('(e) the D-02 block has every element in order', () => {
    const { body } = functionParts(statements()[1])
    const { cut } = cutNewBody(body)

    expect(cut).toContain('DELETE FROM reserve_runs WHERE guild_id = p_guild_id;')
    expect(cut).toContain("SELECT coalesce(array_agg(e.id), '{}') INTO v_kept FROM expansions e WHERE e.guild_id = p_guild_id AND (")
    if (NOTES_RULE === 'clear') {
      expect(cut).toContain('UPDATE loot_items li SET officer_notes = NULL FROM raid_tiers rt WHERE rt.id = li.raid_tier_id AND rt.expansion_id = ANY (v_kept) AND li.officer_notes IS NOT NULL;')
    } else {
      expect(cut).not.toContain('officer_notes')
    }
    expect(cut.trim().endsWith('UPDATE expansions SET guild_id = NULL WHERE id = ANY (v_kept);')).toBe(true)

    const order = [
      'DELETE FROM reserve_runs',
      "SELECT coalesce(array_agg(e.id)",
      ...(NOTES_RULE === 'clear' ? ['UPDATE loot_items li SET officer_notes'] : []),
      'UPDATE expansions SET guild_id = NULL',
    ]
    let last = -1
    for (const token of order) {
      const idx = cut.indexOf(token)
      expect(idx, token).toBeGreaterThan(last)
      last = idx
    }

    const scopeTables = KEEP_SCOPE === 'reserve'
      ? ['reserve_runs', 'reserve_awards']
      : ['reserve_runs', 'reserve_awards', 'raid_events', 'loot_history', 'blp_tracking', 'blp_credits',
         'loot_submissions', 'loot_submission_items', 'guild_item_priorities', 'loot_deadlines', 'guilds']
    const existsMatches = [...cut.matchAll(/EXISTS \(SELECT 1 FROM (\w+)/g)].map(m => m[1])
    expect(existsMatches).toEqual(scopeTables)

    const idfCount = (cut.match(/IS DISTINCT FROM p_guild_id/g) ?? []).length
    expect(idfCount).toBe(KEEP_SCOPE === 'reserve' ? 2 : 10)
    expect((cut.match(/og\.id <> p_guild_id/g) ?? []).length).toBe(KEEP_SCOPE === 'reserve' ? 0 : 1)

    const colTokens = KEEP_SCOPE === 'reserve'
      ? ['r.expansion_id = e.id', 'r.raid_tier_id', 'a.loot_item_id']
      : ['r.expansion_id = e.id', 'r.raid_tier_id', 'a.loot_item_id', 're.raid_tier_id',
         'lh.expansion_id = e.id', 'lh.raid_tier_id', 'lh.loot_item_id',
         'bt.expansion_id = e.id', 'bt.loot_item_id',
         'bc.expansion_id = e.id', 'bc.loot_item_id',
         's.expansion_id = e.id', 's.raid_tier_id', 'si.loot_item_id',
         'gp.raid_tier_id', 'gp.item_id', 'ld.raid_tier_id', 'og.active_expansion_id = e.id']
    let lastCol = -1
    for (const token of colTokens) {
      const idx = cut.indexOf(token)
      expect(idx, token).toBeGreaterThan(lastCol)
      lastCol = idx
    }
  })

  it('(f) the DELETE and UPDATE targets follow D-02, with no other write statement in the body', () => {
    const blankedOld = blankStrings(functionParts(OLD).body)
    const blankedNew = blankStrings(functionParts(statements()[1]).body)

    const oldDeletes = deleteTargets(blankedOld)
    const newDeletes = deleteTargets(blankedNew)
    const idx = oldDeletes.indexOf('raid_team_members')
    expect(idx).toBeGreaterThan(-1)
    const expectedDeletes = [...oldDeletes.slice(0, idx), 'reserve_runs', ...oldDeletes.slice(idx)]
    expect(newDeletes).toEqual(expectedDeletes)

    const expectedUpdates = NOTES_RULE === 'clear'
      ? ['user_active_characters', 'loot_items', 'expansions']
      : ['user_active_characters', 'expansions']
    expect(updateTargets(blankedNew)).toEqual(expectedUpdates)

    for (const kw of ['INSERT', 'TRUNCATE', 'EXECUTE', 'PERFORM', 'DROP', 'ALTER', 'CREATE', 'GRANT', 'REVOKE']) {
      expect(blankedNew, kw).not.toMatch(new RegExp(`\\b${kw}\\b`, 'i'))
    }
  })

  it('(g) the REVOKE and GRANT statements equal the GRANTS_FILE ones, and REVOKE includes PUBLIC', () => {
    const revoke = statements()[2]
    const grant = statements()[3]
    expect(revoke).toBe(grantsFileStatements('revoke'))
    expect(grant).toBe(grantsFileStatements('grant'))
    const roles = revoke.match(/ FROM (.+)$/i)![1]
    expect(roleList(roles)).toContain('PUBLIC')
  })

  it('(h) has no DROP, ALTER, COMMENT, POLICY, TRIGGER or CASCADE, and CREATE appears once', () => {
    const code = blankStrings(withoutBodies(stripComments(readMigrationRaw())))
    for (const kw of ['DROP', 'ALTER', 'COMMENT', 'POLICY', 'TRIGGER', 'CASCADE']) {
      expect(code, kw).not.toMatch(new RegExp(`\\b${kw}\\b`, 'i'))
    }
    expect((code.match(/\bCREATE\b/gi) ?? []).length).toBe(1)
  })

  it('(i) the Rollback block restores exactly OLD, the GRANTS_FILE REVOKE and the GRANTS_FILE GRANT', () => {
    expect(rollbackStatements()).toEqual([OLD, grantsFileStatements('revoke'), grantsFileStatements('grant')])

    const raw = readMigrationRaw()
    const lines = raw.split('\n')
    const headingIdx = lines.findIndex(l => l.trim() === '-- Rollback')
    expect(headingIdx).toBeGreaterThan(-1)
    for (let j = headingIdx; j < lines.length; j++) {
      const line = lines[j]
      if (line.trim() === '') break
      expect(line.startsWith('--'), `rollback line ${j}: "${line}"`).toBe(true)
    }
  })

  it('(j) only the baseline and PREVIOUS_FILE define delete_guild among earlier migrations', () => {
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(name => name.endsWith('.sql') && name.slice(0, 14) < MIGRATION_TIMESTAMP)
    const defining = files.filter(name => {
      const sql = stripComments(readMigrationFile(name))
      return new RegExp(`CREATE OR REPLACE FUNCTION ${ref('delete_guild')}`, 'i').test(sql)
    })
    expect(defining.sort()).toEqual([BASELINE_FILE, PREVIOUS_FILE].sort())
  })

  it('(k) has no em dash, the D-01 first line and headings in order, and no semicolon in header prose', () => {
    const raw = readMigrationRaw()
    expect(raw).not.toContain(EM_DASH)
    expect(raw.split('\n')[0]).toBe('-- Deleting a guild removes its reserve runs and keeps expansions still used outside the guild.')
    const headings = ['Problem', 'Fix', 'Expansions used outside the guild', 'Callers checked', 'Production safety', 'Not changed', 'Deploy', 'Rollback']
    let lastIndex = -1
    for (const heading of headings) {
      const re = new RegExp(`^-- ${heading}\\n-- -+$`, 'm')
      expect(raw, heading).toMatch(re)
      const idx = raw.search(re)
      expect(idx, `${heading} out of order`).toBeGreaterThan(lastIndex)
      lastIndex = idx
    }

    const lines = raw.split('\n')
    const stmt1Idx = lines.findIndex(l => l.trim().startsWith('SET LOCAL'))
    expect(stmt1Idx).toBeGreaterThan(-1)
    for (let i = 0; i < stmt1Idx; i++) {
      const line = lines[i]
      if (line.startsWith('-- ') && !line.startsWith('--   ') && !/^-- -+$/.test(line)) {
        expect(line, `line ${i}`).not.toContain(';')
      }
    }
  })
})
