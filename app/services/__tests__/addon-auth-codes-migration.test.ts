import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// GH-300-R1 (D-01): this locks the shape of the addon_auth_codes migration,
// the single-use, hashed, 60-second PKCE authorization code table for the
// companion desktop app. It ships alone in this PR, unused until the
// follow-up PR wires the /api/addon/auth routes that read and write it.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20260928180000'
const MIGRATION_FILE = path.join(
  MIGRATIONS_DIR,
  `${MIGRATION_TIMESTAMP}_create_addon_auth_codes.sql`,
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

describe('addon_auth_codes migration shape (GH-300-R1)', () => {
  it('the file exists, timestamped later than every other migration and later than pending PR #298 (20260928120000)', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)

    const otherTimestamps = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(name => name.endsWith('.sql') && name !== path.basename(MIGRATION_FILE))
      .map(name => name.slice(0, 14))
      .filter(ts => /^\d{14}$/.test(ts))

    for (const ts of otherTimestamps) {
      expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(Number(ts))
    }
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20260928120000)
  })

  it('is exactly 6 statements, in the required order', () => {
    const chunks = chunksOf(readMigrationRaw())
    expect(chunks).toHaveLength(6)
    expect(chunks[0]).toMatch(/^CREATE TABLE IF NOT EXISTS\s+"public"\."addon_auth_codes"/i)
    expect(chunks[1]).toMatch(/^CREATE INDEX IF NOT EXISTS\s+"idx_addon_auth_codes_expires_at"/i)
    expect(chunks[2]).toMatch(/^ALTER TABLE\s+"public"\."addon_auth_codes"\s+ENABLE ROW LEVEL SECURITY$/i)
    expect(chunks[3]).toMatch(/^REVOKE ALL ON TABLE\s+"public"\."addon_auth_codes"\s+FROM\s+"anon",\s*"authenticated"$/i)
    expect(chunks[4]).toMatch(/^GRANT ALL ON TABLE\s+"public"\."addon_auth_codes"\s+TO\s+"service_role"$/i)
    expect(chunks[5]).toMatch(/^COMMENT ON TABLE\s+"public"\."addon_auth_codes"\s+IS/i)
  })

  it('the CREATE TABLE column set is exactly the required 7 columns, all NOT NULL', () => {
    const chunks = chunksOf(readMigrationRaw())
    const createStmt = chunks[0]

    const columnNames = ['code_hash', 'code_challenge', 'user_id', 'guild_id', 'redirect_uri', 'expires_at', 'created_at']

    // Column definitions are simple ("name" type NOT NULL,) except for the
    // two timestamptz columns with parenthesized DEFAULT expressions, which
    // are asserted explicitly below (nested parens make a generic regex
    // fragile, so each shape gets its own exact pattern instead).
    expect(createStmt).toMatch(/"code_hash"\s+text\s+NOT NULL/i)
    expect(createStmt).toMatch(/"code_challenge"\s+text\s+NOT NULL/i)
    expect(createStmt).toMatch(/"user_id"\s+uuid\s+NOT NULL/i)
    expect(createStmt).toMatch(/"guild_id"\s+uuid\s+NOT NULL/i)
    expect(createStmt).toMatch(/"redirect_uri"\s+text\s+NOT NULL/i)
    expect(createStmt).toMatch(/"expires_at"\s+timestamptz\s+DEFAULT\s*\(now\(\)\s*\+\s*interval\s+'60 seconds'\)\s+NOT NULL/i)
    expect(createStmt).toMatch(/"created_at"\s+timestamptz\s+DEFAULT\s+now\(\)\s+NOT NULL/i)

    // Column set is exactly these 7 (no extra quoted column-shaped identifier
    // appears as a top-level column definition, i.e. immediately after "(" or
    // ", " and followed by a type keyword).
    const colDeclRegex = /(?:\(|,)\s*"(\w+)"\s+(?:text|uuid|timestamptz)\b/gi
    const declared = new Set<string>()
    let m: RegExpExecArray | null
    while ((m = colDeclRegex.exec(createStmt)) !== null) {
      declared.add(m[1])
    }
    expect(declared).toEqual(new Set(columnNames))
  })

  it('primary key, the three CHECKs, the two cascading FKs, and the 60 second expires_at default each appear exactly once', () => {
    const chunks = chunksOf(readMigrationRaw())
    const createStmt = chunks[0]

    const countMatches = (re: RegExp) => (createStmt.match(re) ?? []).length

    expect(countMatches(/CONSTRAINT\s+"addon_auth_codes_pkey"\s+PRIMARY KEY\s*\(\s*"code_hash"\s*\)/gi)).toBe(1)
    expect(countMatches(/CONSTRAINT\s+"addon_auth_codes_code_hash_check"\s+CHECK\s*\("code_hash"\s*~\s*'\^\[0-9a-f\]\{64\}\$'\)/gi)).toBe(1)
    expect(countMatches(/CONSTRAINT\s+"addon_auth_codes_code_challenge_check"\s+CHECK\s*\("code_challenge"\s*~\s*'\^\[A-Za-z0-9_-\]\{43\}\$'\)/gi)).toBe(1)
    expect(countMatches(/CONSTRAINT\s+"addon_auth_codes_redirect_uri_check"\s+CHECK\s*\("redirect_uri"\s*=\s*'lootlistplus:\/\/auth\/callback'\)/gi)).toBe(1)
    expect(countMatches(/CONSTRAINT\s+"addon_auth_codes_user_id_fkey"\s+FOREIGN KEY\s*\("user_id"\)\s*REFERENCES\s+"auth"\."users"\("id"\)\s+ON DELETE CASCADE/gi)).toBe(1)
    expect(countMatches(/CONSTRAINT\s+"addon_auth_codes_guild_id_fkey"\s+FOREIGN KEY\s*\("guild_id"\)\s*REFERENCES\s+"public"\."guilds"\("id"\)\s+ON DELETE CASCADE/gi)).toBe(1)
    expect(countMatches(/"expires_at"\s+timestamptz\s+DEFAULT\s*\(now\(\)\s*\+\s*interval\s+'60 seconds'\)\s+NOT NULL/gi)).toBe(1)
  })

  it('the redirect_uri CHECK literal is exactly lootlistplus://auth/callback', () => {
    const chunks = chunksOf(readMigrationRaw())
    const createStmt = chunks[0]
    const checkMatch = createStmt.match(/addon_auth_codes_redirect_uri_check"\s+CHECK\s*\("redirect_uri"\s*=\s*'([^']*)'\)/i)
    expect(checkMatch).not.toBeNull()
    expect(checkMatch![1]).toBe('lootlistplus://auth/callback')
  })

  it('RLS is enabled and no policy or dangerous keyword is present; REVOKE names both anon and authenticated', () => {
    const raw = readMigrationRaw()
    const collapsed = chunksOf(raw).join(' ; ')

    expect(collapsed).toMatch(/ENABLE ROW LEVEL SECURITY/i)

    const forbidden = [
      'CREATE POLICY',
      'DISABLE ROW LEVEL SECURITY',
      'DROP',
      'UPDATE',
      'INSERT',
      'TRUNCATE',
      'SECURITY DEFINER',
      'CREATE FUNCTION',
    ]
    for (const keyword of forbidden) {
      expect(collapsed, `executable SQL unexpectedly contains "${keyword}"`).not.toMatch(
        new RegExp(`\\b${keyword}\\b`, 'i'),
      )
    }

    // DELETE appears only as part of the two required "ON DELETE CASCADE" FK
    // clauses (asserted exactly once each above), never as a DML statement.
    const bareDeleteMatches = collapsed.match(/\bDELETE\b/gi) ?? []
    const onDeleteCascadeMatches = collapsed.match(/\bON DELETE CASCADE\b/gi) ?? []
    expect(bareDeleteMatches).toHaveLength(onDeleteCascadeMatches.length)
    expect(onDeleteCascadeMatches).toHaveLength(2)

    const revokeStmt = chunksOf(raw)[3]
    expect(revokeStmt).toMatch(/"anon"/i)
    expect(revokeStmt).toMatch(/"authenticated"/i)
  })
})
