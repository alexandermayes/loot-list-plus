import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { getExpansionDefinition } from '../expansionSeeder'

// GH-279-R2: the backfill migration sets phase = 4 on existing Classic AQ20
// raid_tiers rows whose phase is currently NULL (see PR 1 / GH #279 for the
// root cause: an orphan raid name in data/expansion-phases.ts). This file
// asserts the migration's comment-stripped SQL shape and locks its phase
// literal to the seeder's own value for "Ruins of Ahn'Qiraj"
// (getExpansionDefinition('Classic')), so the SQL and data/expansion-phases.ts
// cannot drift apart again. aq20-phase-seeder.test.ts (PR 1) proves the
// seeder side of this fix independently, with no dependency on this
// migration file.

const MIGRATION_FILE = path.resolve(
  __dirname,
  '../../../supabase/migrations/20260927120000_backfill_aq20_raid_tier_phase.sql',
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

describe('AQ20 Phase 4 fix, backfill migration shape (GH-279-R2)', () => {
  const raw = fs.readFileSync(MIGRATION_FILE, 'utf8')
  const codeOnly = stripComments(raw)
  const collapsed = codeOnly.replace(/\s+/g, ' ').trim()
  const chunks = collapsed
    .split(';')
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 0)

  it('is exactly one UPDATE statement on raid_tiers', () => {
    expect(chunks).toHaveLength(1)
    expect(chunks[0]).toMatch(/^UPDATE\s+(public\.)?raid_tiers\b/i)
  })

  it('SET clause assigns only phase, to the seeder\'s literal for "Ruins of Ahn\'Qiraj" (4)', () => {
    const stmt = chunks[0]
    const setMatch = stmt.match(/SET\s+(.*?)\s+(?:FROM|WHERE)\b/i)
    expect(setMatch).not.toBeNull()
    const setClause = setMatch![1].trim()

    const assignMatch = setClause.match(/^phase\s*=\s*(\d+)$/i)
    expect(assignMatch, `SET clause was "${setClause}", expected a single "phase = <integer>" assignment`).not.toBeNull()
    const phaseLiteral = Number(assignMatch![1])

    const classicDef = getExpansionDefinition('Classic')
    expect(classicDef).not.toBeNull()
    const aq20 = classicDef!.raids.find(raid => raid.name === "Ruins of Ahn'Qiraj")
    expect(aq20).toBeDefined()

    expect(phaseLiteral).toBe(aq20!.phase)
    expect(phaseLiteral).toBe(4)
  })

  it('WHERE clause requires phase IS NULL, the escaped AQ20 name, and Classic or Classic WoW', () => {
    const stmt = chunks[0]
    const whereMatch = stmt.match(/WHERE\s+(.*)$/i)
    expect(whereMatch).not.toBeNull()
    const whereClause = whereMatch![1]

    expect(whereClause).toMatch(/phase\s+IS\s+NULL/i)
    expect(whereClause).toContain("Ruins of Ahn''Qiraj")
    expect(whereClause).toContain('Classic')
    expect(whereClause).toContain('Classic WoW')
  })

  it('touches no other column and contains no other DDL/DML keyword', () => {
    const forbiddenColumns = [
      'is_guild_active',
      'master_sheet_visible',
      'is_active',
      'current_phase',
      'sort_order',
      'submission_deadline',
    ]
    for (const column of forbiddenColumns) {
      expect(collapsed, `executable SQL unexpectedly names column "${column}"`).not.toMatch(
        new RegExp(`\\b${column}\\b`, 'i'),
      )
    }

    const forbiddenKeywords = ['INSERT', 'DELETE', 'ALTER', 'DROP', 'CREATE', 'TRUNCATE']
    for (const keyword of forbiddenKeywords) {
      expect(collapsed, `executable SQL unexpectedly contains keyword "${keyword}"`).not.toMatch(
        new RegExp(`\\b${keyword}\\b`, 'i'),
      )
    }
  })
})
