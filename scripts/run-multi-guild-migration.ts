/**
 * Script to run multi-guild architecture migration
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
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🔄 Running multi-guild architecture migration...')
  console.log('')

  try {
    // Check if tables already exist
    console.log('1️⃣  Checking if guild_invite_codes table exists...')
    const { data: inviteCodesCheck, error: checkError1 } = await supabase
      .from('guild_invite_codes')
      .select('id')
      .limit(1)

    if (!checkError1) {
      console.log('   ✅ guild_invite_codes table already exists')
    } else {
      console.log('   📝 guild_invite_codes table needs to be created')
    }

    console.log('')
    console.log('2️⃣  Checking if user_active_guilds table exists...')
    const { data: activeGuildsCheck, error: checkError2 } = await supabase
      .from('user_active_guilds')
      .select('user_id')
      .limit(1)

    if (!checkError2) {
      console.log('   ✅ user_active_guilds table already exists')
    } else {
      console.log('   📝 user_active_guilds table needs to be created')
    }

    console.log('')
    console.log('3️⃣  Checking if guilds table has new columns...')
    const { data: guildsCheck, error: checkError3 } = await supabase
      .from('guilds')
      .select('created_by, is_active, require_discord_verification')
      .limit(1)

    if (!checkError3) {
      console.log('   ✅ guilds table columns already exist')
    } else {
      console.log('   📝 guilds table needs new columns')
    }

    console.log('')
    console.log('4️⃣  Checking if guild_members table has new columns...')
    const { data: membersCheck, error: checkError4 } = await supabase
      .from('guild_members')
      .select('joined_at, joined_via, invite_code_id')
      .limit(1)

    if (!checkError4) {
      console.log('   ✅ guild_members table columns already exist')
    } else {
      console.log('   📝 guild_members table needs new columns')
    }

    // If any checks failed, we need to run the migration
    if (checkError1 || checkError2 || checkError3 || checkError4) {
      console.log('')
      console.log('⚠️  Migration needs to be run manually in Supabase dashboard')
      console.log('')
      console.log('Steps to run the migration:')
      console.log('1. Go to Supabase dashboard → SQL Editor')
      console.log('2. Open the file: migrations/multi-guild-setup.sql')
      console.log('3. Copy and paste the entire SQL content')
      console.log('4. Click "Run" to execute the migration')
      console.log('5. Re-run this script to verify the migration')
      console.log('')
      console.log('The migration includes:')
      console.log('  • New guild_invite_codes table')
      console.log('  • New user_active_guilds table')
      console.log('  • Enhanced guilds table (created_by, is_active, require_discord_verification)')
      console.log('  • Enhanced guild_members table (joined_at, joined_via, invite_code_id)')
      console.log('  • Row Level Security policies')
      console.log('  • Helper functions (generate_invite_code, is_invite_code_valid)')
      console.log('  • Data migration for existing users')
      console.log('')
      return
    }

    console.log('')
    console.log('✅ All tables and columns exist!')
    console.log('')
    console.log('5️⃣  Verifying data migration...')

    // Check that existing users have active guilds
    const { count: memberCount } = await supabase
      .from('guild_members')
      .select('*', { count: 'exact', head: true })

    const { count: activeGuildCount } = await supabase
      .from('user_active_guilds')
      .select('*', { count: 'exact', head: true })

    console.log(`   📊 Guild members: ${memberCount}`)
    console.log(`   📊 Users with active guilds: ${activeGuildCount}`)

    if (memberCount && activeGuildCount && memberCount >= activeGuildCount) {
      console.log('   ✅ Data migration looks good!')
    } else if (memberCount && !activeGuildCount) {
      console.log('   ⚠️  Warning: No active guilds set. Run data migration in SQL file.')
    }

    console.log('')
    console.log('✅ Multi-guild migration verification complete!')
    console.log('')
    console.log('Next steps:')
    console.log('  • Create Guild Context provider (/app/contexts/GuildContext.tsx)')
    console.log('  • Update auth callback (/app/auth/callback/route.js)')
    console.log('  • Create guild selection page (/app/guild-select/page.tsx)')
  } catch (err) {
    console.error('❌ Error running migration verification:', err)
    console.log('')
    console.log('⚠️  Please run the SQL migration manually in Supabase dashboard:')
    console.log('📄 File: migrations/multi-guild-setup.sql')
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
