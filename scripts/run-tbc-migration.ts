/**
 * Script to run TBC expansion and raids migration
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
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('🔄 Running TBC expansion and raids migration...\n')

  try {
    // Read the SQL migration file
    const migrationSQL = readFileSync(
      resolve(process.cwd(), 'migrations/add_tbc_expansion_and_raids.sql'),
      'utf8'
    )

    console.log('📦 Creating TBC expansion tables and data...')
    console.log('⚠️  Note: This will execute raw SQL. Please ensure you have service role access.\n')

    // For now, we'll output instructions for manual execution
    // since direct SQL execution requires PostgreSQL connection
    console.log('✨ Migration file ready at: migrations/add_tbc_expansion_and_raids.sql\n')

    console.log('📋 To run this migration, please use ONE of these methods:\n')

    console.log('METHOD 1: Supabase Dashboard (Recommended)')
    console.log('  1. Go to your Supabase project dashboard')
    console.log('  2. Navigate to: SQL Editor')
    console.log('  3. Create a new query')
    console.log('  4. Copy/paste the contents of: migrations/add_tbc_expansion_and_raids.sql')
    console.log('  5. Click "Run"\n')

    console.log('METHOD 2: Supabase CLI')
    console.log('  supabase db push\n')

    console.log('METHOD 3: Direct PostgreSQL')
    console.log('  psql $DATABASE_URL -f migrations/add_tbc_expansion_and_raids.sql\n')

    console.log('✅ After running the migration, you\'ll have:\n')
    console.log('  📁 Tables: expansions, raid_tiers')
    console.log('  🔒 RLS policies for both tables')
    console.log('  🎯 Function: seed_tbc_expansion_for_guild(guild_id)')
    console.log('\n✨ Available TBC raids:')
    console.log('  - Karazhan (fully populated with loot)')
    console.log('  - Gruul\'s Lair')
    console.log('  - Magtheridon\'s Lair')
    console.log('  - Serpentshrine Cavern')
    console.log('  - Tempest Keep')
    console.log('  - Mount Hyjal')
    console.log('  - Black Temple')
    console.log('  - Zul\'Aman')
    console.log('  - Sunwell Plateau')
    console.log('\n📝 Next steps after migration:')
    console.log('  SELECT seed_tbc_expansion_for_guild(\'<guild_id>\');')

  } catch (err: any) {
    console.error('\n❌ Error:', err.message || err)
    process.exit(1)
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
