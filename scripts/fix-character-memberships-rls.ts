/**
 * Script to fix infinite recursion in character_guild_memberships RLS policies
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
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('🔄 Fixing character_guild_memberships infinite recursion...\n')

  try {
    // Read the migration file
    const migrationPath = resolve(process.cwd(), 'migrations/FIX_character_guild_memberships_infinite_recursion.sql')
    const sql = readFileSync(migrationPath, 'utf8')

    // Split by semicolons and run each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && !s.startsWith('SELECT'))

    console.log(`📝 Running ${statements.length} statements...\n`)

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement) continue

      console.log(`${i + 1}/${statements.length}: Executing...`)

      const { error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      })

      if (error) {
        console.error(`❌ Error on statement ${i + 1}:`, error)
        console.log('Statement was:', statement.substring(0, 100) + '...')

        // Don't exit - continue with other statements
        console.log('Continuing with next statement...\n')
      } else {
        console.log(`✅ Statement ${i + 1} completed\n`)
      }
    }

    console.log('✅ Migration script completed!')
    console.log('\n📊 Verifying policies...')

    // Verify the policies exist
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', {
        sql: `SELECT tablename, policyname FROM pg_policies WHERE tablename = 'character_guild_memberships' ORDER BY policyname;`
      })

    if (!policiesError && policies) {
      console.log('Current policies:', policies)
    }

  } catch (err) {
    console.error('❌ Error running migration:', err)
    console.log('\n⚠️  Please run the SQL migration manually in Supabase SQL Editor:')
    console.log('📄 File: migrations/FIX_character_guild_memberships_infinite_recursion.sql')
    process.exit(1)
  }
}

runMigration()
  .then(() => {
    console.log('\n✨ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
