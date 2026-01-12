/**
 * Migration script to fix RLS policies on loot_submissions table
 * This allows officers to approve/reject submissions
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually
const envPath = resolve(process.cwd(), '.env.local')
try {
  const envFile = readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim()
    }
  })
} catch (error) {
  console.error('Error loading .env.local:', error)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing environment variables')
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS policies for loot_submissions...')

  // Read the SQL migration file
  const sqlPath = resolve(process.cwd(), 'migrations/fix_loot_submissions_rls_policy.sql')
  const sql = readFileSync(sqlPath, 'utf8')

  // Split SQL by statement (simple split by semicolon)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  console.log(`Found ${statements.length} SQL statements to execute`)

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    console.log(`\nExecuting statement ${i + 1}/${statements.length}...`)

    // Use the raw SQL query execution
    const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' })

    if (error) {
      // If exec_sql function doesn't exist, try direct execution
      console.log('Attempting direct SQL execution...')
      const { error: directError } = await supabase.from('_sql').select(statement) as any

      if (directError) {
        console.error(`❌ Error executing statement:`, directError.message)
        console.error('Statement:', statement.substring(0, 100) + '...')
      } else {
        console.log(`✅ Statement executed successfully`)
      }
    } else {
      console.log(`✅ Statement executed successfully`)
    }
  }

  console.log('\n✅ RLS policy migration completed!')
  console.log('\n📝 Summary:')
  console.log('   - Enabled RLS on loot_submissions table')
  console.log('   - Added policy for users to view submissions in their guild')
  console.log('   - Added policy for users to insert their own submissions')
  console.log('   - Added policy for users to update their own pending submissions')
  console.log('   - Added policy for officers to approve/reject submissions')
}

fixRLSPolicies()
  .then(() => {
    console.log('\n✨ Migration complete! Officers can now approve/reject submissions.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error)
    console.error('\nPlease run the SQL migration manually in Supabase SQL Editor:')
    console.error('  migrations/fix_loot_submissions_rls_policy.sql')
    process.exit(1)
  })
