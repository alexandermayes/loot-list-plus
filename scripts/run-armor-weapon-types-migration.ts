/**
 * Script to run SQL migration for adding armor_type and weapon_type columns
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually
const envPath = resolve(process.cwd(), '.env.local')
try {
  const envFile = readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🔄 Running migration to add armor_type and weapon_type columns...\n')

  try {
    // Check if columns already exist
    const { data: existingData, error: checkError } = await supabase
      .from('loot_items')
      .select('armor_type, weapon_type')
      .limit(1)

    if (!checkError) {
      console.log('✅ Columns already exist, skipping migration')
      return
    }

    // Run the migration using RPC or direct SQL
    console.log('Adding armor_type column...')
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE loot_items ADD COLUMN IF NOT EXISTS armor_type TEXT;`
    })

    console.log('Adding weapon_type column...')
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE loot_items ADD COLUMN IF NOT EXISTS weapon_type TEXT;`
    })

    console.log('Creating armor_type index...')
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: `CREATE INDEX IF NOT EXISTS idx_loot_items_armor_type ON loot_items(armor_type);`
    })

    console.log('Creating weapon_type index...')
    const { error: error4 } = await supabase.rpc('exec_sql', {
      sql: `CREATE INDEX IF NOT EXISTS idx_loot_items_weapon_type ON loot_items(weapon_type);`
    })

    if (error1 || error2 || error3 || error4) {
      console.error('Migration errors:', { error1, error2, error3, error4 })
      console.log('\n⚠️  Could not run migration via RPC.')
      console.log('Please run the SQL migration manually in Supabase dashboard:')
      console.log('📄 File: migrations/add_armor_weapon_types.sql')
      return
    }

    console.log('\n✅ Migration completed successfully')
  } catch (err) {
    console.error('❌ Error running migration:', err)
    console.log('\n⚠️  Please run the SQL migration manually in Supabase dashboard:')
    console.log('📄 File: migrations/add_armor_weapon_types.sql')
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
