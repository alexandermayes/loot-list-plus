import * as fs from 'fs'
import * as path from 'path'
import { PGlite } from '@electric-sql/pglite'
// 20260704000001_create_help_articles.sql runs CREATE EXTENSION pg_trgm.
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'

// Harness for migration tests that need a real Postgres: it applies the whole
// supabase/migrations chain, in filename order, to an in-process PGlite
// database. Not a test file, so Vitest does not collect it.

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../../supabase/migrations')

/** Absolute paths of every supabase/migrations/*.sql file, sorted by name. */
export function listMigrationFiles(): string[] {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(name => name.endsWith('.sql'))
    .sort()
    .map(name => path.join(MIGRATIONS_DIR, name))
}

// The pieces of Supabase the migrations lean on and PGlite does not ship: the
// auth schema (users table, uid, role, jwt), the extensions schema with
// uuid_generate_v4, and the API roles. service_role bypasses RLS like the real
// one; supabase_admin only has to exist.
const SUPABASE_STUBS = `
  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY, email text);
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
  CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT '{}'::jsonb $$;
  CREATE SCHEMA IF NOT EXISTS extensions;
  CREATE OR REPLACE FUNCTION extensions.uuid_generate_v4() RETURNS uuid LANGUAGE sql AS $$ SELECT gen_random_uuid() $$;
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;
  CREATE ROLE supabase_admin NOLOGIN;
  GRANT USAGE ON SCHEMA public, auth, extensions TO anon, authenticated, service_role;
`

/**
 * Build a fresh in-memory database and apply `files` to it in order.
 *
 * The baseline migration leaves search_path empty and row_security off for the
 * session, which would leak into every later file and into the RLS
 * assertions, so each file runs after resetting both and the role.
 */
export async function createChainedDb(files: string[]): Promise<PGlite> {
  const db = new PGlite({ extensions: { pg_trgm } })
  await db.exec(SUPABASE_STUBS)
  for (const file of files) {
    await db.exec('SET search_path TO public, extensions; RESET role;')
    await db.exec(fs.readFileSync(file, 'utf8'))
  }
  // Leave the session the way a test expects to start: tables resolvable by
  // name, superuser role.
  await db.exec('SET search_path TO public, extensions; RESET role;')
  return db
}

/**
 * Act as a browser session. The superuser session stands in for the service
 * role elsewhere, because neither sets the role to anon or authenticated,
 * which is what the client-only triggers key on. Only the two API roles are
 * accepted so no unvalidated string reaches SET.
 */
export async function asRole(
  db: PGlite,
  role: 'anon' | 'authenticated',
  userId: string | null,
): Promise<void> {
  if (role !== 'anon' && role !== 'authenticated') {
    throw new Error(`asRole accepts anon or authenticated, got ${String(role)}`)
  }
  await db.exec('RESET role')
  // The baseline leaves row_security off; sessions must be subject to RLS.
  await db.exec('SET row_security = on')
  await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [userId ?? ''])
  await db.query("SELECT set_config('request.jwt.claim.role', $1, false)", [role])
  await db.exec(`SET role ${role}`)
}

/** Return to the superuser session (the stand-in for the service role). */
export async function resetRole(db: PGlite): Promise<void> {
  await db.exec('RESET role')
  await db.query("SELECT set_config('request.jwt.claim.sub', '', false)")
  await db.query("SELECT set_config('request.jwt.claim.role', '', false)")
}
