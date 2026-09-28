import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// GH #289: before #292 (d06516a1), the addon loot-award route (which the
// companion app also uses) and the import-string route resolved wowhead_id
// to loot_items on the service-role client with no guild filter, taking the
// first match. Every guild has its own catalog copy (loot_items ->
// raid_tiers.expansion_id -> expansions.guild_id), so a loot_history row can
// end up pointing at another guild's loot_items row. The raid-tracking bulk
// import route also posts client-chosen ids to POST /api/loot-history/bulk,
// which never checks ownership. loot_history.loot_item_id is ON DELETE
// CASCADE, so those awards are silently deleted if the other guild removes
// the item, its tier, its expansion or itself.
//
// This file locks the shape of the repair migration's executable statement
// and its commented, read-only verification queries. No database is
// available in this suite, so this is a shape proof only, not a behaviour
// proof: a behaviour proof of the statement would need a real Postgres
// (see the SUMMARY for a PGlite scenario run done outside this suite).

const MIGRATION_FILE = path.resolve(
  __dirname,
  '../../../supabase/migrations/20260928120000_relink_cross_guild_loot_history.sql',
)

/** Strip line comments the same way the AQ20 backfill migration test does:
 * drop any line whose trimmed text starts with `--`, and strip a trailing
 * `-- comment` from any remaining code line. No string literal in this SQL
 * contains two hyphens, so this is safe. */
function stripComments(sql: string): string {
  return sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .map(line => line.replace(/--.*$/, ''))
    .join('\n')
}

/** stripComments, then collapse whitespace runs to one space, remove spaces
 * right after an opening parenthesis and right before a closing one, then
 * trim. Used to compare SQL text independent of formatting. */
function normalize(sql: string): string {
  return stripComments(sql)
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim()
}

const FORBIDDEN_KEYWORDS = [
  'INSERT',
  'DELETE',
  'ALTER',
  'DROP',
  'CREATE',
  'TRUNCATE',
  'TRIGGER',
  'CONSTRAINT',
  'DISABLE',
  'GRANT',
  'REVOKE',
]

describe('GH #289 relink migration, executable statement', () => {
  const raw = fs.readFileSync(MIGRATION_FILE, 'utf8')
  const normalized = normalize(raw)
  const chunks = normalized
    .split(';')
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 0)

  it('is timestamped after the latest migration on origin/main at plan time', () => {
    const fileName = path.basename(MIGRATION_FILE)
    const timestampMatch = fileName.match(/^(\d{14})_/)
    expect(timestampMatch).not.toBeNull()
    const timestamp = Number(timestampMatch![1])
    expect(timestamp).toBeGreaterThan(20260927120000)
  })

  it('is exactly one statement starting with the linked CTE and containing exactly one UPDATE and one SET', () => {
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toMatch(/^WITH linked AS \(/)
    const updateMatches = chunks[0].match(/\bUPDATE\b/gi) ?? []
    expect(updateMatches).toHaveLength(1)
    expect(chunks[0]).toContain('UPDATE public.loot_history lh')
    const setMatches = chunks[0].match(/\bSET\b/gi) ?? []
    expect(setMatches).toHaveLength(1)
  })

  it('has the six CTE headers in order: linked, candidates, level_counts, chosen, targets, safe', () => {
    const stmt = chunks[0]
    const headers = ['linked AS (', 'candidates AS (', 'level_counts AS (', 'chosen AS (', 'targets AS (', 'safe AS (']
    const positions = headers.map(header => stmt.indexOf(header))
    for (const [i, pos] of positions.entries()) {
      expect(pos, `expected to find "${headers[i]}"`).toBeGreaterThan(-1)
    }
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i], `expected "${headers[i]}" after "${headers[i - 1]}"`).toBeGreaterThan(positions[i - 1])
    }
  })

  it('the SET clause assigns only loot_item_id, and the statement ends with the safe join', () => {
    const stmt = chunks[0]
    const setMatch = stmt.match(/SET\s+(.*?)\s+FROM\b/)
    expect(setMatch).not.toBeNull()
    expect(setMatch![1].trim()).toBe('loot_item_id = s.item_id')
    expect(stmt).toMatch(/FROM safe s WHERE lh\.id = s\.history_id$/)
  })

  it('mis-link guard: broken-chain LEFT JOINs and the IS DISTINCT FROM predicate', () => {
    const stmt = chunks[0]
    expect(stmt).toContain('LEFT JOIN public.raid_tiers cur_rt ON cur_rt.id = cur.raid_tier_id')
    expect(stmt).toContain('LEFT JOIN public.expansions cur_e ON cur_e.id = cur_rt.expansion_id')
    expect(stmt).toContain('WHERE cur_e.guild_id IS DISTINCT FROM h.guild_id')
  })

  it('candidate scope: only the row guild own items with the same wowhead_id', () => {
    const stmt = chunks[0]
    expect(stmt).toContain('JOIN public.guilds g ON g.id = l.guild_id')
    expect(stmt).toContain('JOIN public.expansions e ON e.guild_id = l.guild_id')
    expect(stmt).toContain('JOIN public.loot_items li ON li.raid_tier_id = rt.id AND li.wowhead_id = l.wowhead_id')
  })

  it('level predicates: tier_match, expansion_match, active_match', () => {
    const stmt = chunks[0]
    expect(stmt).toContain('(rt.name = l.tier_name) AS tier_match')
    expect(stmt).toContain('(e.name = l.expansion_name) AS expansion_match')
    expect(stmt).toContain('(e.id = g.active_expansion_id) AS active_match')
  })

  it('match order and exactly-one gating, as one exact normalized WHERE clause', () => {
    const stmt = chunks[0]
    expect(stmt).toContain(
      'WHERE (n.tier_n = 1 AND c.tier_match) OR (n.tier_n <> 1 AND n.expansion_n = 1 AND c.expansion_match) OR (n.tier_n <> 1 AND n.expansion_n <> 1 AND n.active_n = 1 AND c.active_match)',
    )
  })

  it('collision guard (OD-02): the same_target_n window and the safe WHERE escape/dedupe clauses', () => {
    const stmt = chunks[0]
    expect(stmt).toContain(
      'count(*) OVER (PARTITION BY l.guild_id, ch.item_id, l.character_id, l.raid_event_id) AS same_target_n',
    )
    expect(stmt).toContain('t.character_id IS NULL')
    expect(stmt).toContain('t.raid_event_id IS NULL')
    expect(stmt).toContain('t.same_target_n = 1')
    expect(stmt).toMatch(
      /NOT EXISTS \(SELECT 1 FROM public\.loot_history k WHERE k\.guild_id = t\.guild_id AND k\.loot_item_id = t\.item_id AND k\.character_id = t\.character_id AND k\.raid_event_id = t\.raid_event_id\)/,
    )
  })

  it('contains none of the forbidden DDL/DML/permission keywords', () => {
    for (const keyword of FORBIDDEN_KEYWORDS) {
      expect(chunks[0], `executable SQL unexpectedly contains keyword "${keyword}"`).not.toMatch(
        new RegExp(`\\b${keyword}\\b`, 'i'),
      )
    }
  })
})
