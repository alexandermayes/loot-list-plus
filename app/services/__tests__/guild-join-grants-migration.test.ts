import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Quick task 260930-f0m: this locks the shape of the guild_join_grants
// migration, the service-role-only table that records a join made by invite
// code or Discord before the user had a character, plus its one-time
// backfill for users who are in that state when the migration runs.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20260930100000'
const MIGRATION_FILE = path.join(
  MIGRATIONS_DIR,
  `${MIGRATION_TIMESTAMP}_create_guild_join_grants.sql`,
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

function chunksOf(raw: string): string[] {
  const codeOnly = stripComments(raw)
  const collapsed = codeOnly.replace(/\s+/g, ' ').trim()
  return collapsed
    .split(';')
    .map(chunk => chunk.trim())
    .filter(chunk => chunk.length > 0)
}

describe('guild_join_grants migration shape (quick task 260930-f0m)', () => {
  // Anchored to the migrations that existed when this one was written
  // (latest: 20260930000300), not to a live directory scan, so a later
  // migration does not break it.
  it('the file exists, sorts after every migration that preceded it, and has a unique timestamp', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20260930000300)

    const sameTimestamp = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(name => name.endsWith('.sql') && name !== path.basename(MIGRATION_FILE))
      .filter(name => name.slice(0, 14) === MIGRATION_TIMESTAMP)
    expect(sameTimestamp).toEqual([])
  })

  it('is exactly 7 statements, in the required order', () => {
    const chunks = chunksOf(readMigrationRaw())
    expect(chunks).toHaveLength(7)
    expect(chunks[0]).toMatch(/^CREATE TABLE IF NOT EXISTS\s+"public"\."guild_join_grants"\s*\(/i)
    expect(chunks[1]).toMatch(/^CREATE INDEX IF NOT EXISTS\s+"idx_guild_join_grants_guild_id"\s+ON\s+"public"\."guild_join_grants"\s*\(\s*"guild_id"\s*\)$/i)
    expect(chunks[2]).toMatch(/^ALTER TABLE\s+"public"\."guild_join_grants"\s+ENABLE ROW LEVEL SECURITY$/i)
    expect(chunks[3]).toMatch(/^REVOKE ALL ON TABLE\s+"public"\."guild_join_grants"\s+FROM\s+PUBLIC,\s*"anon",\s*"authenticated"$/i)
    expect(chunks[4]).toMatch(/^GRANT ALL ON TABLE\s+"public"\."guild_join_grants"\s+TO\s+"service_role"$/i)
    expect(chunks[5]).toMatch(/^COMMENT ON TABLE\s+"public"\."guild_join_grants"\s+IS\s+'[^']*'$/i)
    expect(chunks[6]).toMatch(/^INSERT INTO\s+"public"\."guild_join_grants"\s*\(\s*"user_id",\s*"guild_id",\s*"source",\s*"created_at",\s*"expires_at"\s*\)\s+SELECT\b/i)
  })

  it('the CREATE TABLE column set is exactly the six required columns with their types, nullability and defaults', () => {
    const createStmt = chunksOf(readMigrationRaw())[0]

    expect(createStmt).toMatch(/\(\s*"user_id"\s+uuid\s+NOT NULL\s*,/i)
    expect(createStmt).toMatch(/,\s*"guild_id"\s+uuid\s+NOT NULL\s*,/i)
    expect(createStmt).toMatch(/,\s*"source"\s+text\s+NOT NULL\s*,/i)
    expect(createStmt).toMatch(/,\s*"created_at"\s+timestamptz\s+DEFAULT\s+now\(\)\s+NOT NULL\s*,/i)
    expect(createStmt).toMatch(/,\s*"expires_at"\s+timestamptz\s+DEFAULT\s*\(now\(\)\s*\+\s*interval\s+'30 days'\)\s+NOT NULL\s*,/i)
    // consumed_at is the only nullable column: no NOT NULL and no DEFAULT.
    expect(createStmt).toMatch(/,\s*"consumed_at"\s+timestamptz\s*,/i)

    const colDeclRegex = /(?:\(|,)\s*"(\w+)"\s+(?:text|uuid|timestamptz)\b/gi
    const declared = new Set<string>()
    let m: RegExpExecArray | null
    while ((m = colDeclRegex.exec(createStmt)) !== null) {
      declared.add(m[1])
    }
    expect(declared).toEqual(new Set(['user_id', 'guild_id', 'source', 'created_at', 'expires_at', 'consumed_at']))
  })

  it('the primary key, both CHECKs and both cascading FKs each appear exactly once', () => {
    const createStmt = chunksOf(readMigrationRaw())[0]
    const countMatches = (re: RegExp) => (createStmt.match(re) ?? []).length

    expect(countMatches(/CONSTRAINT\s+"guild_join_grants_pkey"\s+PRIMARY KEY\s*\(\s*"user_id",\s*"guild_id"\s*\)/gi)).toBe(1)
    expect(countMatches(/CONSTRAINT\s+"guild_join_grants_source_check"\s+CHECK\s*\(/gi)).toBe(1)
    expect(countMatches(/CONSTRAINT\s+"guild_join_grants_expires_check"\s+CHECK\s*\(\s*"expires_at"\s*>\s*"created_at"\s*\)/gi)).toBe(1)
    expect(countMatches(/CONSTRAINT\s+"guild_join_grants_user_id_fkey"\s+FOREIGN KEY\s*\("user_id"\)\s*REFERENCES\s+"auth"\."users"\("id"\)\s+ON DELETE CASCADE/gi)).toBe(1)
    expect(countMatches(/CONSTRAINT\s+"guild_join_grants_guild_id_fkey"\s+FOREIGN KEY\s*\("guild_id"\)\s*REFERENCES\s+"public"\."guilds"\("id"\)\s+ON DELETE CASCADE/gi)).toBe(1)
    expect(countMatches(/\bCONSTRAINT\b/gi)).toBe(5)
  })

  it('the source CHECK lists exactly invite_code, discord_verify and backfill', () => {
    const createStmt = chunksOf(readMigrationRaw())[0]
    const checkMatch = createStmt.match(/"guild_join_grants_source_check"\s+CHECK\s*\(\s*"source"\s+IN\s*\(([^)]*)\)\s*\)/i)
    expect(checkMatch).not.toBeNull()
    const values = checkMatch![1].split(',').map(v => v.trim())
    expect(values).toEqual(["'invite_code'", "'discord_verify'", "'backfill'"])
  })

  it('grants only ALL to service_role, revokes from PUBLIC, anon and authenticated, and creates no policy, function or trigger', () => {
    const chunks = chunksOf(readMigrationRaw())
    const collapsed = chunks.join(' ; ')

    const grants = chunks.filter(c => /^GRANT\b/i.test(c))
    expect(grants).toEqual(['GRANT ALL ON TABLE "public"."guild_join_grants" TO "service_role"'])
    const revokes = chunks.filter(c => /^REVOKE\b/i.test(c))
    expect(revokes).toEqual(['REVOKE ALL ON TABLE "public"."guild_join_grants" FROM PUBLIC, "anon", "authenticated"'])

    const forbidden = [
      'CREATE POLICY',
      'DISABLE ROW LEVEL SECURITY',
      'CREATE FUNCTION',
      'CREATE OR REPLACE FUNCTION',
      'CREATE TRIGGER',
      'CREATE OR REPLACE TRIGGER',
      'CREATE VIEW',
      'SECURITY DEFINER',
      'DROP',
      'UPDATE',
      'TRUNCATE',
      'ALTER DEFAULT PRIVILEGES',
    ]
    for (const keyword of forbidden) {
      expect(collapsed, `executable SQL unexpectedly contains "${keyword}"`).not.toMatch(
        new RegExp(`\\b${keyword}\\b`, 'i'),
      )
    }

    // DELETE appears only in the two ON DELETE CASCADE FK clauses.
    const bareDelete = collapsed.match(/\bDELETE\b/gi) ?? []
    const onDeleteCascade = collapsed.match(/\bON DELETE CASCADE\b/gi) ?? []
    expect(onDeleteCascade).toHaveLength(2)
    expect(bareDelete).toHaveLength(onDeleteCascade.length)

    // INSERT appears only once: the backfill.
    expect(collapsed.match(/\bINSERT\b/gi) ?? []).toHaveLength(1)
  })

  it('the backfill reads user_active_characters once for users in the no-character state and never inserts twice', () => {
    const backfill = chunksOf(readMigrationRaw())[6]

    expect(backfill).toMatch(/\bFROM\s+"public"\."user_active_characters"\s+"?uac"?/i)
    expect(backfill).toMatch(/\bJOIN\s+"public"\."guilds"\s+"?g"?\s+ON\s+"?g"?\."id"\s*=\s*"?uac"?\."active_guild_id"/i)
    expect(backfill).toMatch(/'backfill'/)
    expect(backfill).toMatch(/now\(\)\s*,\s*now\(\)\s*\+\s*interval\s+'30 days'/i)
    expect(backfill).toMatch(/"?uac"?\."active_character_id"\s+IS NULL/i)
    expect(backfill).toMatch(/"?g"?\."created_by"\s+IS DISTINCT FROM\s+"?uac"?\."user_id"/i)
    expect(backfill).toMatch(/NOT EXISTS\s*\(\s*SELECT 1 FROM\s+"public"\."characters"\s+"?c"?\s+WHERE\s+"?c"?\."user_id"\s*=\s*"?uac"?\."user_id"\s+AND\s+"?c"?\."class_id"\s+IS NOT NULL\s*\)/i)
    expect(backfill).toMatch(/NOT EXISTS\s*\(\s*SELECT 1 FROM\s+"public"\."character_guild_memberships"\s+"?m"?\s+JOIN\s+"public"\."characters"\s+"?c"?\s+ON\s+"?c"?\."id"\s*=\s*"?m"?\."character_id"\s+WHERE\s+"?c"?\."user_id"\s*=\s*"?uac"?\."user_id"\s+AND\s+"?m"?\."guild_id"\s*=\s*"?uac"?\."active_guild_id"\s+AND\s+"?m"?\."is_active"\s*=\s*true\s*\)/i)
    expect(backfill).toMatch(/ON CONFLICT\s*\(\s*"user_id",\s*"guild_id"\s*\)\s*DO NOTHING$/i)
    // No age window on user_active_characters.updated_at (OD-1: everyone waiting now).
    expect(backfill).not.toMatch(/updated_at/i)
  })

  it('the header has the Background, Table, Access, Backfill and Rollback sections, and the rollback is a single DROP TABLE', () => {
    const raw = readMigrationRaw()
    for (const heading of ['Background', 'Table', 'Access', 'Backfill', 'Rollback']) {
      expect(raw, `header section ${heading}`).toMatch(new RegExp(`^-- ${heading}\\b`, 'm'))
    }
    const lines = raw.split('\n')
    const start = lines.findIndex(l => l.startsWith('-- Rollback'))
    const rollback: string[] = []
    for (let i = start + 1; i < lines.length && lines[i].startsWith('--'); i++) {
      if (lines[i].startsWith('--   ')) rollback.push(lines[i].slice(5))
    }
    expect(rollback).toEqual(['DROP TABLE IF EXISTS "public"."guild_join_grants";'])
  })

  it('has no em dash and no string literal with two consecutive hyphens', () => {
    const raw = readMigrationRaw()
    expect(raw).not.toContain(String.fromCharCode(0x2014))
    const literals = stripComments(raw).match(/'[^']*'/g) ?? []
    for (const literal of literals) {
      expect(literal).not.toContain('--')
    }
  })
})
