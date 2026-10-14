import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// Quick task 261013-nga, GH #351 item 3 (items 1 and 2 are PR #401): this
// locks the shape of the migration that drops the two uncalled SECURITY
// DEFINER functions update_guild_icon and update_guild_info. It pins what the
// file may contain (a lock timeout, two exact-signature drops without
// CASCADE and a guard block, nothing else), that the signatures match the
// baseline definitions, that the generated types no longer list them and that
// no app, bot, companion or script code calls them.

const REPO_ROOT = path.resolve(__dirname, '../../..')
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'supabase/migrations')
const MIGRATION_TIMESTAMP = '20261013120000'
const MIGRATION_FILE = path.join(
  MIGRATIONS_DIR,
  `${MIGRATION_TIMESTAMP}_drop_unused_guild_update_functions.sql`,
)
const BASELINE_FILE = path.join(
  MIGRATIONS_DIR,
  '20260101000000_baseline_schema.sql',
)
const TYPES_FILE = path.join(REPO_ROOT, 'lib/database.types.ts')

const ICON =
  '"public"."update_guild_icon"("p_guild_id" "uuid", "p_icon_url" "text")'
const INFO =
  '"public"."update_guild_info"("p_guild_id" "uuid", "p_name" "text", "p_realm" "text", "p_faction" "text", "p_discord_server_id" "text")'

/** Strip line comments (trimmed lines starting with `--`, and trailing `--`
 * to end of line on a code line). No string literal in this SQL contains
 * two hyphens (checked below), so this is safe. */
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

/** Blank out the contents of every single-quoted string literal (handling
 * '' escapes), so keyword checks never match words inside RAISE text. */
function blankStrings(sql: string): string {
  return sql.replace(/'(?:[^']|'')*'/g, "''")
}

function readMigrationRaw(): string {
  return fs.readFileSync(MIGRATION_FILE, 'utf8')
}

function statements(): string[] {
  return splitStatements(stripComments(readMigrationRaw()))
}

const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  'dist',
  'out',
  'build',
  'coverage',
  '.git',
])
const SCAN_ROOTS = [
  'app',
  'components',
  'lib',
  'domain',
  'utils',
  'scripts',
  '__tests__',
  'companion/src',
  'discord-bot',
]
const SCAN_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.sql',
])

function walk(dir: string, out: string[]): void {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      walk(path.join(dir, entry.name), out)
    } else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(path.join(dir, entry.name))
    }
  }
}

describe('drop unused guild update functions migration', () => {
  it('exists, has a unique timestamp and sorts after the newest earlier migration', () => {
    expect(fs.existsSync(MIGRATION_FILE)).toBe(true)
    const sameTimestamp = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql') && f.startsWith(MIGRATION_TIMESTAMP))
    expect(sameTimestamp).toHaveLength(1)
    expect(Number(MIGRATION_TIMESTAMP)).toBeGreaterThan(20261004040000)
  })

  it('has exactly four statements in a fixed order', () => {
    const stmts = statements()
    expect(stmts).toHaveLength(4)
    expect(stmts[0]).toBe("SET LOCAL lock_timeout = '5s'")
    expect(stmts[1]).toBe(`DROP FUNCTION IF EXISTS ${ICON}`)
    expect(stmts[2]).toBe(`DROP FUNCTION IF EXISTS ${INFO}`)
    expect(stmts[3].startsWith('DO $$')).toBe(true)
    expect(stmts[3].endsWith('$$')).toBe(true)
  })

  it('drops signatures that match the baseline definitions', () => {
    const baseline = fs.readFileSync(BASELINE_FILE, 'utf8')
    for (const sig of [ICON, INFO]) {
      expect(baseline).toContain(`CREATE OR REPLACE FUNCTION ${sig} RETURNS`)
    }
  })

  it('contains no other statement kinds and no CASCADE', () => {
    const stmts = statements().map(blankStrings)
    for (const stmt of stmts) {
      expect(stmt).not.toMatch(
        /^(CREATE|ALTER|INSERT|UPDATE|DELETE|GRANT|REVOKE|TRUNCATE|COMMENT)\b/i,
      )
    }
    expect(stripComments(readMigrationRaw())).not.toMatch(/\bCASCADE\b/i)

    const doStmt = stmts[3]
    const body = doStmt.slice(doStmt.indexOf('$$') + 2, doStmt.lastIndexOf('$$'))
    expect(body).not.toMatch(
      /\b(CREATE|ALTER|INSERT|UPDATE|DELETE|GRANT|REVOKE|DROP|TRUNCATE)\b/i,
    )
  })

  it('guard block checks pg_proc for both names and raises', () => {
    const doStmt = splitStatements(stripComments(readMigrationRaw()))[3]
    expect(doStmt).toContain('pg_proc')
    expect(doStmt).toContain('pg_namespace')
    expect(doStmt).toContain("'public'")
    expect(doStmt).toContain("'update_guild_icon'")
    expect(doStmt).toContain("'update_guild_info'")
    expect(doStmt).toContain('RAISE EXCEPTION')
  })

  it('has no string literal containing two hyphens', () => {
    const codeLines = readMigrationRaw()
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
    const literals = codeLines.match(/'(?:[^']|'')*'/g) ?? []
    for (const literal of literals) {
      expect(literal).not.toContain('--')
    }
  })

  it('documents the change in the house header style without em dashes', () => {
    const raw = readMigrationRaw()
    for (const heading of [
      'Problem',
      'Fix',
      'Error contract',
      'Production safety',
      'Not changed',
      'Deploy',
      'Rollback',
    ]) {
      expect(raw).toMatch(new RegExp(`^-- ${heading}$`, 'm'))
    }
    expect(raw).not.toContain(String.fromCharCode(0x2014))
  })

  it('removes both functions from the generated types', () => {
    const types = fs.readFileSync(TYPES_FILE, 'utf8')
    expect(types).not.toContain('update_guild_icon:')
    expect(types).not.toContain('update_guild_info:')
    expect(types).toContain('seed_tbc_expansion_for_guild:')
  })

  it('has no callers outside this test and the grants migration test', () => {
    const files: string[] = []
    for (const root of SCAN_ROOTS) {
      const abs = path.join(REPO_ROOT, root)
      if (fs.existsSync(abs)) walk(abs, files)
    }
    const hits = files
      .filter(file => {
        const text = fs.readFileSync(file, 'utf8')
        return (
          text.includes('update_guild_icon') ||
          text.includes('update_guild_info')
        )
      })
      .map(file => path.relative(REPO_ROOT, file))
      .sort()
    expect(hits).toEqual([
      'app/services/__tests__/drop-unused-guild-update-functions-migration.test.ts',
      'app/services/__tests__/function-execute-grants-migration.test.ts',
    ])
  })
})
