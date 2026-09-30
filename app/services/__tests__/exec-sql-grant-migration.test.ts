import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Locks the shape of the migration that keeps any public exec_sql function
// service-role only. scripts/run-migration.ts calls exec_sql through the
// service role, but no migration defines it, so the migration only acts on
// functions that already exist. The behaviour (no function, one function,
// overloads, another schema, re-run) is proven in a PGlite harness outside
// the repo; this test pins what the file may contain.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../supabase/migrations')
const MIGRATION_TIMESTAMP = '20260930000300'
const MIGRATION_FILE = path.join(
  MIGRATIONS_DIR,
  `${MIGRATION_TIMESTAMP}_restrict_exec_sql_if_present.sql`,
)

function stripComments(sql: string): string {
  return sql
    .split('\n')
    .filter(line => !line.trim().startsWith('--'))
    .join('\n')
    .trim()
}

const sql = stripComments(fs.readFileSync(MIGRATION_FILE, 'utf8'))

describe('restrict exec_sql migration', () => {
  it('has a unique timestamp later than the function grants migration', () => {
    const stamps = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .map(f => f.slice(0, 14))
    expect(stamps.filter(s => s === MIGRATION_TIMESTAMP)).toHaveLength(1)
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20260930000200)
  })

  it('is a single DO block', () => {
    expect(sql.startsWith('DO $$')).toBe(true)
    expect(sql.endsWith('$$;')).toBe(true)
    expect(sql.match(/\$\$/g)).toHaveLength(2)
  })

  it('only visits public functions named exec_sql', () => {
    expect(sql).toMatch(/n\.nspname = 'public'/)
    expect(sql).toMatch(/p\.proname = 'exec_sql'/)
  })

  it('revokes PUBLIC, anon and authenticated and grants service_role', () => {
    expect(sql).toContain(`REVOKE ALL ON FUNCTION %s FROM PUBLIC, "anon", "authenticated"`)
    expect(sql).toContain(`GRANT EXECUTE ON FUNCTION %s TO "service_role"`)
  })

  it('creates, drops and alters nothing', () => {
    expect(sql).not.toMatch(/\b(CREATE|DROP|ALTER|INSERT|UPDATE|DELETE|TRUNCATE)\b/i)
  })
})
