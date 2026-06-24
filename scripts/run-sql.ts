#!/usr/bin/env npx tsx
/**
 * Script to run SQL against the remote Supabase database
 *
 * Usage:
 *   npx tsx scripts/run-sql.ts --query "SELECT * FROM users LIMIT 5"          (reads, no confirm)
 *   npx tsx scripts/run-sql.ts supabase/migrations/<file>.sql --confirm       (DDL/DML push to PROD)
 *   npx tsx scripts/run-sql.ts --query "ALTER TABLE users ADD COLUMN foo TEXT" --confirm
 *
 * For SELECT queries it uses the Supabase JS client.
 * For DDL/DML it copies the SQL into supabase/migrations/ as a timestamped file and runs
 * `supabase db push`, which pushes to the PRODUCTION database. Two guards apply:
 *   1. SQL that disables Row Level Security is refused outright (project invariant: RLS always on).
 *   2. Any DDL/DML push requires an explicit --confirm (or -y) flag, so a file can never be
 *      replayed into prod by accident.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs'
import { resolve, join } from 'path'
import { execSync } from 'child_process'

// Load .env.local manually
const envPath = resolve(process.cwd(), '.env.local')
try {
  const envFile = readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      let value = valueParts.join('=').trim()
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[key.trim()] = value
    }
  })
} catch (error) {
  console.error('Error loading .env.local:', error)
  process.exit(1)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Run a SELECT query using the Supabase JS client
 */
async function runSelectQuery(sql: string): Promise<void> {
  console.log('🔄 Executing SELECT query via Supabase client...\n')

  // Extract table name for simple queries
  const match = sql.match(/FROM\s+(\w+)/i)
  if (!match) {
    console.error('❌ Could not parse table name from SELECT query')
    console.error('   For complex queries, use the Supabase Dashboard SQL Editor')
    process.exit(1)
  }

  const tableName = match[1]
  console.log(`📊 Querying table: ${tableName}`)

  const { data, error } = await supabase.from(tableName).select('*').limit(100)

  if (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }

  console.log(`\n✅ Found ${data?.length || 0} rows:`)
  console.log(JSON.stringify(data, null, 2))
}

/**
 * Run DDL/DML SQL by creating a temporary migration
 */
async function runMigrationSQL(sql: string, description: string): Promise<void> {
  console.log('🔄 Executing SQL via Supabase migration...\n')
  console.log('---SQL---')
  console.log(sql.trim())
  console.log('---------\n')

  // Ensure supabase/migrations directory exists
  const migrationsDir = resolve(process.cwd(), 'supabase/migrations')
  if (!existsSync(migrationsDir)) {
    mkdirSync(migrationsDir, { recursive: true })
  }

  // Create timestamped migration file
  const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  const safeName = description.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 50)
  const migrationFile = join(migrationsDir, `${timestamp}_${safeName}.sql`)

  try {
    // Write SQL to migration file
    writeFileSync(migrationFile, sql)
    console.log(`📝 Created migration: ${migrationFile}`)

    // Push migration to remote database
    console.log('🚀 Pushing migration to remote database...\n')
    const output = execSync('supabase db push', {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    })
    console.log(output)
    console.log('✅ SQL executed successfully!')
  } catch (error: unknown) {
    const err = error as { message?: string; stderr?: unknown }
    console.error('❌ Error executing migration:', err.message)
    if (err.stderr) {
      console.error(err.stderr)
    }
    // Clean up migration file on error
    if (existsSync(migrationFile)) {
      unlinkSync(migrationFile)
      console.log(`🧹 Cleaned up migration file: ${migrationFile}`)
    }
    process.exit(1)
  }
}

// Main execution. --confirm/-y is a global flag; strip it before positional parsing.
const rawArgs = process.argv.slice(2)
const confirmed = rawArgs.some(a => a === '--confirm' || a === '-y')
const args = rawArgs.filter(a => a !== '--confirm' && a !== '-y')

if (args.length === 0) {
  console.error('Usage:')
  console.error('  npx tsx scripts/run-sql.ts --query "SELECT ..."                 (reads, no confirm)')
  console.error('  npx tsx scripts/run-sql.ts supabase/migrations/<file>.sql --confirm   (DDL/DML to PROD)')
  console.error('  npx tsx scripts/run-sql.ts --query "ALTER TABLE ..." --confirm')
  console.error('')
  console.error('Note: SELECT queries are run via Supabase client (limited functionality).')
  console.error('      DDL/DML queries are pushed to the PRODUCTION database and require --confirm.')
  process.exit(1)
}

let sql: string
let description: string = 'manual_sql_execution'

if (args[0] === '--query' || args[0] === '-q') {
  sql = args.slice(1).join(' ')
  description = 'inline_query'
} else {
  // Treat as file path
  const filePath = resolve(process.cwd(), args[0])
  try {
    sql = readFileSync(filePath, 'utf8')
    // Use filename as description
    description = args[0].replace(/^.*[\\/]/, '').replace(/\.sql$/, '')
  } catch (error) {
    console.error(`❌ Could not read file: ${filePath}`)
    process.exit(1)
  }
}

// Determine if this is a SELECT query or DDL/DML
const isSelect = sql.trim().toUpperCase().startsWith('SELECT')

if (!isSelect) {
  // Guard 1: never let this tool disable Row Level Security in production.
  // (Project invariant: every public table keeps RLS enabled.)
  if (/disable\s+row\s+level\s+security/i.test(sql)) {
    console.error('❌ Refusing to run: this SQL disables Row Level Security.')
    console.error('   RLS must stay enabled on all tables. If this is truly intended, run it')
    console.error('   manually via a reviewed migration in supabase/migrations/, not this tool.')
    process.exit(1)
  }

  // Guard 2: DDL/DML pushes to the PRODUCTION database — require explicit opt-in so a
  // stray file path can never be replayed into prod by accident.
  if (!confirmed) {
    console.error('⚠️  This will push DDL/DML to the PRODUCTION database via `supabase db push`.')
    console.error('   Re-run with --confirm (or -y) once you are sure:')
    console.error(`     npx tsx scripts/run-sql.ts ${args.join(' ')} --confirm`)
    process.exit(1)
  }
}

if (isSelect) {
  runSelectQuery(sql)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Unexpected error:', error)
      process.exit(1)
    })
} else {
  runMigrationSQL(sql, description)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Unexpected error:', error)
      process.exit(1)
    })
}
