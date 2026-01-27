import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

// Extract project ref from URL
const projectRef = supabaseUrl.replace('https://', '').split('.')[0]

async function main() {
  console.log('Applying RLS policy fix...\n')

  // Read the migration SQL
  const migrationPath = path.resolve(process.cwd(), 'migrations/fix_loot_item_classes_rls_policies.sql')
  const migrationSql = fs.readFileSync(migrationPath, 'utf8')

  // Use Supabase's SQL API endpoint
  const sqlApiUrl = `${supabaseUrl}/rest/v1/rpc/exec_sql`

  // First, let's try using the management API
  const managementUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`

  console.log('Trying to execute SQL via Supabase API...')

  // Try the direct SQL endpoint (available in newer Supabase versions)
  const response = await fetch(`${supabaseUrl}/pg/sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey
    },
    body: JSON.stringify({ query: migrationSql })
  })

  if (response.ok) {
    const result = await response.json()
    console.log('✅ Migration applied successfully!')
    console.log('Result:', result)
  } else {
    const errorText = await response.text()
    console.log('Direct SQL endpoint not available:', response.status)

    // Fall back to individual policy operations via REST
    console.log('\nTrying alternative method via REST API...')

    // We can't drop/create policies via REST API directly
    // Let's try using the postgres.js client with the pooler
    console.log('\nAttempting connection via postgres pooler...')

    const postgres = (await import('postgres')).default

    // Construct the connection string for Supabase pooler
    // Format: postgresql://postgres.[ref]:[service_role_key]@aws-0-[region].pooler.supabase.com:6543/postgres
    const region = 'us-east-1' // Default region, may need adjustment
    const connectionString = `postgresql://postgres.${projectRef}:${supabaseServiceKey}@aws-0-${region}.pooler.supabase.com:6543/postgres`

    try {
      const sql = postgres(connectionString, {
        ssl: 'require',
        idle_timeout: 20,
        max_lifetime: 60 * 30
      })

      console.log('Connected to database, executing migration...')

      // Execute each statement separately
      const statements = migrationSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        if (statement.includes('DROP POLICY') || statement.includes('CREATE POLICY')) {
          console.log(`Executing: ${statement.substring(0, 60)}...`)
          try {
            await sql.unsafe(statement)
            console.log('  ✓ Success')
          } catch (err: any) {
            console.log(`  ✗ Error: ${err.message}`)
          }
        }
      }

      await sql.end()
      console.log('\n✅ Migration completed!')
    } catch (connError: any) {
      console.error('Connection error:', connError.message)
      console.log('\n⚠️  Could not connect automatically.')
      console.log('Please run the migration manually in Supabase SQL Editor.')
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
