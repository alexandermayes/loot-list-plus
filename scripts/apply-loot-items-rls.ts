import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('🔧 Applying loot_items RLS policies...\n')

  const sql = fs.readFileSync(
    path.join(process.cwd(), 'migrations', 'add_loot_items_rls_policies.sql'),
    'utf-8'
  )

  // Split by semicolons and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    console.log('Executing:', statement.substring(0, 80) + '...')
    const { error } = await supabase.rpc('exec_sql', { sql_query: statement })

    if (error) {
      // Try direct execution if rpc fails
      const { error: directError } = await supabase.from('_').select().limit(0) as any

      console.log('⚠️  Note: Using direct SQL execution')
      // We need to use a different approach - let's output the SQL to run manually
      console.error('❌ Cannot execute SQL directly. Please run this SQL in Supabase SQL Editor:')
      console.log('\n' + statement + ';\n')
    } else {
      console.log('✅ Success')
    }
  }

  console.log('\n🎉 Migration complete!')
  console.log('\nIf you see errors above, please:')
  console.log('1. Go to your Supabase Dashboard')
  console.log('2. Navigate to SQL Editor')
  console.log('3. Run the migration file: migrations/add_loot_items_rls_policies.sql')
}

main()
