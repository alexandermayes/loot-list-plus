import { createServiceRoleClient } from '@/utils/supabase/service-role'
import * as fs from 'fs'
import * as path from 'path'

async function runMigration() {
  console.log('🚀 Starting member migration...')

  const supabase = createServiceRoleClient()

  // Read the SQL file
  const sqlPath = path.join(process.cwd(), 'migrations', 'fix_existing_members_without_characters.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  try {
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      console.error('❌ Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Migration completed successfully!')
    console.log('Result:', data)
  } catch (error) {
    console.error('❌ Error running migration:', error)

    // Try running it in chunks instead
    console.log('\n🔄 Attempting to run migration in separate steps...')

    // Step 1: Create missing characters
    console.log('\n📝 Step 1: Creating characters for users without them...')
    const { error: step1Error } = await supabase.rpc('create_missing_characters')
    if (step1Error) {
      console.error('Step 1 failed:', step1Error)
    } else {
      console.log('✅ Step 1 complete')
    }

    // Step 2: Create character guild memberships
    console.log('\n📝 Step 2: Creating character guild memberships...')
    const { error: step2Error } = await supabase.rpc('create_missing_memberships')
    if (step2Error) {
      console.error('Step 2 failed:', step2Error)
    } else {
      console.log('✅ Step 2 complete')
    }

    // Step 3: Set active characters
    console.log('\n📝 Step 3: Setting active characters...')
    const { error: step3Error } = await supabase.rpc('set_missing_active_characters')
    if (step3Error) {
      console.error('Step 3 failed:', step3Error)
    } else {
      console.log('✅ Step 3 complete')
    }

    console.log('\n⚠️  Manual SQL execution may be required. Please run the migration SQL directly in Supabase SQL Editor.')
    console.log('SQL file location: migrations/fix_existing_members_without_characters.sql')
  }
}

runMigration()
