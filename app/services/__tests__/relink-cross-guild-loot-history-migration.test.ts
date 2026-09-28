import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const BASELINE_SCHEMA_FILE = path.resolve(__dirname, '../../../supabase/migrations/20260101000000_baseline_schema.sql')

// GH #289: before #292 (d06516a1), the addon loot-award route (which the
// companion app also uses) and the import-string route resolved wowhead_id
// to loot_items on the service-role client with no guild filter, taking the
// first match. The bulk award route trusts client-supplied ids and also
// copies raid_tier_id/derives expansion_id straight from whatever
// loot_item_id it was given. Every guild has its own catalog copy
// (loot_items -> raid_tiers.expansion_id -> expansions.guild_id), so a
// loot_history row's loot_item_id, raid_tier_id and expansion_id can each
// independently end up pointing at another guild's rows.
// loot_history.loot_item_id and raid_tier_id are both ON DELETE CASCADE, so
// those awards are silently deleted if the other guild removes the item,
// its tier, its expansion or itself.
//
// Per the user's locked OD-01 decision, this migration re-points all three
// columns together (loot_item_id, raid_tier_id, expansion_id), all taken
// from the same chosen own-guild item, for any row where any of the three
// currently belongs to another guild.
//
// This file locks the shape of the repair migration's executable statement
// and its commented, read-only verification queries. No database is
// available in this suite, so this is a shape proof only, not a behaviour
// proof: a behaviour proof of the statement would need a real Postgres
// (see the plan SUMMARY for a PGlite scenario run done outside this suite).

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

  it('has the seven CTE headers in order: linked, candidates, level_counts, chosen_item, chosen, targets, safe', () => {
    const stmt = chunks[0]
    const headers = [
      'linked AS (',
      'candidates AS (',
      'level_counts AS (',
      'chosen_item AS (',
      'chosen AS (',
      'targets AS (',
      'safe AS (',
    ]
    const positions = headers.map(header => stmt.indexOf(header))
    for (const [i, pos] of positions.entries()) {
      expect(pos, `expected to find "${headers[i]}"`).toBeGreaterThan(-1)
    }
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i], `expected "${headers[i]}" after "${headers[i - 1]}"`).toBeGreaterThan(positions[i - 1])
    }
  })

  it('the SET clause assigns exactly loot_item_id, raid_tier_id and expansion_id, all from the safe/chosen row, and the statement ends with the safe join', () => {
    const stmt = chunks[0]
    const setMatch = stmt.match(/SET\s+(.*?)\s+FROM\b/)
    expect(setMatch).not.toBeNull()
    expect(setMatch![1].trim()).toBe('loot_item_id = s.item_id, raid_tier_id = s.raid_tier_id, expansion_id = s.expansion_id')
    expect(stmt).toMatch(/FROM safe s WHERE lh\.id = s\.history_id$/)
  })

  it('mis-link guard (OD-01, all three columns): item, raid_tier_id and expansion_id foreignness are each checked', () => {
    const stmt = chunks[0]
    expect(stmt).toContain('LEFT JOIN public.raid_tiers cur_rt ON cur_rt.id = cur.raid_tier_id')
    expect(stmt).toContain('LEFT JOIN public.expansions cur_e ON cur_e.id = cur_rt.expansion_id')
    expect(stmt).toContain('LEFT JOIN public.raid_tiers h_rt ON h_rt.id = h.raid_tier_id')
    expect(stmt).toContain('LEFT JOIN public.expansions h_e ON h_e.id = h_rt.expansion_id')
    expect(stmt).toContain('LEFT JOIN public.expansions h_x ON h_x.id = h.expansion_id')
    expect(stmt).toContain(
      'WHERE cur_e.guild_id IS DISTINCT FROM h.guild_id OR h_e.guild_id IS DISTINCT FROM h.guild_id OR (h.expansion_id IS NOT NULL AND h_x.guild_id IS DISTINCT FROM h.guild_id)',
    )
    expect(stmt).toContain('(cur_e.guild_id IS DISTINCT FROM h.guild_id) AS item_mislinked')
  })

  it('candidate scope: only the row guild own items with the same wowhead_id, only for item-mislinked rows', () => {
    const stmt = chunks[0]
    expect(stmt).toContain('JOIN public.guilds g ON g.id = l.guild_id')
    expect(stmt).toContain('JOIN public.expansions e ON e.guild_id = l.guild_id')
    expect(stmt).toContain('JOIN public.loot_items li ON li.raid_tier_id = rt.id AND li.wowhead_id = l.wowhead_id')
    expect(stmt).toMatch(/FROM linked l JOIN public\.guilds g[\s\S]*WHERE l\.item_mislinked\)/)
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

  it('chosen_item falls back to the current item unconditionally for rows whose item is not mislinked', () => {
    const stmt = chunks[0]
    expect(stmt).toContain('UNION ALL SELECT l.history_id, l.cur_item_id AS item_id FROM linked l WHERE NOT l.item_mislinked')
  })

  it('chosen derives raid_tier_id and expansion_id from the chosen item itself, for both branches', () => {
    const stmt = chunks[0]
    expect(stmt).toContain(
      'chosen AS (SELECT ci.history_id, ci.item_id, fi.raid_tier_id, frt.expansion_id FROM chosen_item ci JOIN public.loot_items fi ON fi.id = ci.item_id LEFT JOIN public.raid_tiers frt ON frt.id = fi.raid_tier_id)',
    )
  })

  it('collision guard (OD-02): the same_target_n window keyed on the final loot_item_id, and the safe WHERE escape/dedupe/self-exclusion clauses', () => {
    const stmt = chunks[0]
    expect(stmt).toContain(
      'count(*) OVER (PARTITION BY l.guild_id, ch.item_id, l.character_id, l.raid_event_id) AS same_target_n',
    )
    expect(stmt).toContain('t.character_id IS NULL')
    expect(stmt).toContain('t.raid_event_id IS NULL')
    expect(stmt).toContain('t.same_target_n = 1')
    expect(stmt).toMatch(
      /NOT EXISTS \(SELECT 1 FROM public\.loot_history k WHERE k\.id <> t\.history_id AND k\.guild_id = t\.guild_id AND k\.loot_item_id = t\.item_id AND k\.character_id = t\.character_id AND k\.raid_event_id = t\.raid_event_id\)/,
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

const VERIFICATION_MARKER = '-- Verification only, NOT executed.'
const FORBIDDEN_PROSE_WORDS = ['update', 'insert', 'delete', 'alter', 'drop', 'create', 'truncate', 'grant', 'revoke']

/** Collapse whitespace the same way normalize() does, without re-stripping
 * comments (the caller has already removed the leading "-- " on every
 * line). */
function collapse(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim()
}

/** Strip the leading "--" plus at most one space from every line after the
 * verification marker. */
function stripVerificationMarkers(raw: string): { markerIndex: number; strippedLines: string[] } {
  const markerIndex = raw.indexOf(VERIFICATION_MARKER)
  const section = markerIndex === -1 ? '' : raw.slice(markerIndex)
  const strippedLines = section.split('\n').map(line => line.replace(/^--\s?/, ''))
  return { markerIndex, strippedLines }
}

/** Extraction rule (interfaces block): after the marker, strip a leading "--"
 * plus at most one space from each line. A query starts at a line that then
 * begins with "SELECT " or "WITH " and ends at the first line that ends
 * with ";". Returns each query's text with its trailing semicolon removed. */
function extractVerificationQueries(raw: string): string[] {
  const { strippedLines } = stripVerificationMarkers(raw)
  const queries: string[] = []
  let current: string[] | null = null
  for (const line of strippedLines) {
    if (current === null) {
      if (line.startsWith('SELECT ') || line.startsWith('WITH ')) {
        current = [line]
      } else {
        continue
      }
    } else {
      current.push(line)
    }
    if (current[current.length - 1].trim().endsWith(';')) {
      const joined = current.join(' ').trim()
      queries.push(joined.slice(0, -1).trim())
      current = null
    }
  }
  return queries
}

/** Parse the loot_history column names out of the baseline CREATE TABLE
 * block: the text from the CREATE TABLE line to the first line that is just
 * a closing parenthesis and semicolon, collecting every line that starts
 * with whitespace then a double-quoted identifier (CONSTRAINT lines do not
 * qualify). */
function parseBaselineLootHistoryColumns(): string[] {
  const raw = fs.readFileSync(BASELINE_SCHEMA_FILE, 'utf8')
  const startMarker = 'CREATE TABLE IF NOT EXISTS "public"."loot_history" ('
  const startIdx = raw.indexOf(startMarker)
  expect(startIdx, 'expected to find the loot_history CREATE TABLE block in the baseline schema').toBeGreaterThan(-1)
  const rest = raw.slice(startIdx).split('\n')
  const columns: string[] = []
  for (const line of rest) {
    if (/^\s*\);\s*$/.test(line)) break
    const match = line.match(/^\s*"([a-zA-Z0-9_]+)"/)
    if (match) columns.push(match[1])
  }
  return columns
}

describe('GH #289 relink migration, verification queries', () => {
  const raw = fs.readFileSync(MIGRATION_FILE, 'utf8')
  const normalizedStatement = normalize(raw).split(';').map(c => c.trim()).filter(c => c.length > 0)[0]

  it('the verification section starts with the exact marker, and every non-empty line after it starts with two hyphens', () => {
    const markerIndex = raw.indexOf(VERIFICATION_MARKER)
    expect(markerIndex).toBeGreaterThan(-1)
    const after = raw.slice(markerIndex).split('\n').slice(1)
    for (const line of after) {
      if (line.trim().length === 0) continue
      expect(line, `line "${line}" does not start with --`).toMatch(/^--/)
    }
  })

  it('contains no word-bounded forbidden write word in the verification section, comment markers stripped', () => {
    const { strippedLines } = stripVerificationMarkers(raw)
    const text = strippedLines.join('\n')
    for (const word of FORBIDDEN_PROSE_WORDS) {
      expect(text, `verification section unexpectedly contains the word "${word}"`).not.toMatch(new RegExp(`\\b${word}\\b`, 'i'))
    }
  })

  it('prose lines never start a query and never end with a semicolon', () => {
    const { strippedLines } = stripVerificationMarkers(raw)
    let inQuery = false
    for (const line of strippedLines) {
      const trimmed = line.trim()
      if (!inQuery) {
        if (trimmed.startsWith('SELECT ') || trimmed.startsWith('WITH ')) {
          inQuery = true
        } else if (trimmed.length > 0) {
          expect(trimmed.endsWith(';'), `prose line "${trimmed}" ends with a semicolon`).toBe(false)
        }
      }
      if (inQuery && trimmed.endsWith(';')) inQuery = false
    }
  })

  it('extracts exactly four queries: Q1 and Q3 start with SELECT, Q2 and Q4 start with WITH', () => {
    const queries = extractVerificationQueries(raw)
    expect(queries).toHaveLength(4)
    expect(collapse(queries[0])).toMatch(/^SELECT /)
    expect(collapse(queries[1])).toMatch(/^WITH /)
    expect(collapse(queries[2])).toMatch(/^SELECT /)
    expect(collapse(queries[3])).toMatch(/^WITH /)
  })

  it('Q1: mis-linked count by source, before and after, with all three foreign-column breakdowns', () => {
    const q1 = collapse(extractVerificationQueries(raw)[0])
    expect(q1).toContain(
      'WHERE cur_e.guild_id IS DISTINCT FROM h.guild_id OR h_e.guild_id IS DISTINCT FROM h.guild_id OR (h.expansion_id IS NOT NULL AND h_x.guild_id IS DISTINCT FROM h.guild_id)',
    )
    expect(q1).toContain('LEFT JOIN public.raid_tiers cur_rt ON cur_rt.id = cur.raid_tier_id')
    expect(q1).toContain('LEFT JOIN public.expansions cur_e ON cur_e.id = cur_rt.expansion_id')
    expect(q1).toContain('GROUP BY h.source')
    expect(q1).toContain('AS item_foreign')
    expect(q1).toContain('AS raid_tier_foreign')
    expect(q1).toContain('AS expansion_foreign')
  })

  it('Q2 and Q4 each start with the statement\'s WITH block, followed by their own SELECT', () => {
    const prefix = normalizedStatement.slice(0, normalizedStatement.indexOf(' UPDATE public.loot_history lh'))
    expect(prefix.length).toBeGreaterThan(0)
    const queries = extractVerificationQueries(raw)
    const q2 = collapse(queries[1])
    const q4 = collapse(queries[3])
    expect(q2.startsWith(`${prefix} SELECT `), 'Q2 does not open with the statement\'s WITH block').toBe(true)
    expect(q4.startsWith(`${prefix} SELECT `), 'Q4 does not open with the statement\'s WITH block').toBe(true)
  })

  it('Q2 reports the three unmatched reasons, branches on item_mislinked, and the NOT EXISTS safe-exclusion clause', () => {
    const q2 = collapse(extractVerificationQueries(raw)[1])
    expect(q2).toContain("'no item in the guild'")
    expect(q2).toContain("'ambiguous'")
    expect(q2).toContain("'would duplicate an existing award'")
    expect(q2).toContain('WHEN l.item_mislinked AND n.history_id IS NULL THEN')
    expect(q2).toContain('WHEN l.item_mislinked AND ci.history_id IS NULL THEN')
    expect(q2).toContain('WHERE NOT EXISTS (SELECT 1 FROM safe s WHERE s.history_id = l.history_id)')
  })

  it('Q3: the first ROW list matches the baseline loot_history columns minus loot_item_id, raid_tier_id, expansion_id and updated_at', () => {
    const q3 = collapse(extractVerificationQueries(raw)[2])
    const rowMatches = [...q3.matchAll(/ROW\(([^)]+)\)/g)]
    expect(rowMatches.length).toBeGreaterThanOrEqual(2)

    const firstRowColumns = rowMatches[0][1].split(',').map(c => c.trim().replace(/^h\./, ''))
    const baselineColumns = parseBaselineLootHistoryColumns()
    expect(baselineColumns).toContain('loot_item_id')
    expect(baselineColumns).toContain('raid_tier_id')
    expect(baselineColumns).toContain('expansion_id')
    expect(baselineColumns).toContain('updated_at')
    const excluded = new Set(['loot_item_id', 'raid_tier_id', 'expansion_id', 'updated_at'])
    const expectedColumns = baselineColumns.filter(c => !excluded.has(c))
    expect([...firstRowColumns].sort()).toEqual([...expectedColumns].sort())

    const secondRowColumns = rowMatches[1][1].split(',').map(c => c.trim())
    expect(secondRowColumns).toEqual(['h.id', 'cur.wowhead_id'])

    expect(q3).toContain("h.created_at < '2026-09-28 00:00:00+00'")
  })

  it('Q4: exports old and new values for all three re-pointed columns', () => {
    const q4 = collapse(extractVerificationQueries(raw)[3])
    expect(q4).toContain('h.loot_item_id AS old_loot_item_id')
    expect(q4).toContain('s.item_id AS new_loot_item_id')
    expect(q4).toContain('h.raid_tier_id AS old_raid_tier_id')
    expect(q4).toContain('s.raid_tier_id AS new_raid_tier_id')
    expect(q4).toContain('h.expansion_id AS old_expansion_id')
    expect(q4).toContain('s.expansion_id AS new_expansion_id')
  })
})
