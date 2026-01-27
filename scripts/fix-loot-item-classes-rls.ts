import { createClient } from '@supabase/supabase-js'
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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('Fixing loot_item_classes RLS policies...\n')
  console.log('This will update the RLS policies to allow officers to modify')
  console.log('loot item classes for ANY expansion their guild has, not just the current one.\n')

  // Read the migration SQL
  const migrationPath = path.resolve(process.cwd(), 'migrations/fix_loot_item_classes_rls_policies.sql')
  const migrationSql = fs.readFileSync(migrationPath, 'utf8')

  console.log('Migration SQL:')
  console.log('---')
  console.log(migrationSql)
  console.log('---\n')

  console.log('⚠️  This migration needs to be run directly in the Supabase SQL Editor.')
  console.log('   Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql')
  console.log('   Paste the migration SQL and execute it.\n')

  // Try to verify current policies
  console.log('Verifying current state...')

  // Test if we can check existing policies (this is informational only)
  const { data, error } = await supabase
    .from('loot_item_classes')
    .select('id')
    .limit(1)

  if (error) {
    console.log('Note: Could not query loot_item_classes table:', error.message)
  } else {
    console.log('✓ loot_item_classes table is accessible')
  }

  console.log('\n📋 Migration file saved at: migrations/fix_loot_item_classes_rls_policies.sql')
  console.log('\nTo apply this fix:')
  console.log('1. Open your Supabase dashboard SQL Editor')
  console.log('2. Copy and paste the SQL from the migration file')
  console.log('3. Execute the query')
  console.log('\nAfter applying, officers will be able to edit loot specs for any expansion.')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
