/**
 * Script to run SQL migrations for user preferences and Discord verification
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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigrations() {
  console.log('🔄 Running profile and Discord verification migrations...\n')

  try {
    // Read the SQL migration files
    const userPrefsSQL = readFileSync(
      resolve(process.cwd(), 'database-user-preferences.sql'),
      'utf8'
    )
    const discordServerSQL = readFileSync(
      resolve(process.cwd(), 'migrations/add-discord-server-id.sql'),
      'utf8'
    )

    // Migration 1: User Preferences Table
    console.log('📦 Migration 1: Creating user_preferences table...')

    // Split the SQL file into individual statements
    const userPrefsStatements = userPrefsSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of userPrefsStatements) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })

      if (error && !error.message.includes('already exists')) {
        console.error('❌ Error in user preferences migration:', error)
        throw error
      }
    }

    console.log('✅ User preferences table created successfully\n')

    // Migration 2: Add Discord Server ID column
    console.log('📦 Migration 2: Adding discord_server_id to guilds table...')

    const discordStatements = discordServerSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (const statement of discordStatements) {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })

      if (error && !error.message.includes('already exists')) {
        console.error('❌ Error in Discord server ID migration:', error)
        throw error
      }
    }

    console.log('✅ Discord server ID column added successfully\n')

    console.log('🎉 All migrations completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('1. Get your Discord server ID (see DISCORD-VERIFICATION-SETUP.md)')
    console.log('2. Update your guild record with the Discord server ID:')
    console.log('   UPDATE guilds SET discord_server_id = \'YOUR_SERVER_ID\' WHERE name = \'Your Guild Name\';')
    console.log('3. Have users sign out and sign back in to grant new OAuth scopes')

  } catch (err: any) {
    console.error('\n❌ Error running migrations:', err.message || err)
    console.log('\n⚠️  Falling back to manual migration:')
    console.log('Please run these SQL files manually in your Supabase dashboard:')
    console.log('  1. database-user-preferences.sql')
    console.log('  2. migrations/add-discord-server-id.sql')
    process.exit(1)
  }
}

runMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
