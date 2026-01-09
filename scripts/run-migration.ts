/**
 * Script to run SQL migration for adding classification columns
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

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🔄 Running migration to add classification columns...')

  try {
    // Check if columns already exist
    const { data: existingData, error: checkError } = await supabase
      .from('loot_items')
      .select('classification, item_type, allocation_cost')
      .limit(1)

    if (!checkError) {
      console.log('✅ Columns already exist, skipping migration')
      return
    }

    // Run the migration using RPC or direct SQL
    console.log('Adding classification column...')
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE loot_items ADD COLUMN IF NOT EXISTS classification TEXT DEFAULT 'Unlimited' CHECK (classification IN ('Reserved', 'Limited', 'Unlimited'));`
    })

    console.log('Adding item_type column...')
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE loot_items ADD COLUMN IF NOT EXISTS item_type TEXT;`
    })

    console.log('Adding allocation_cost column...')
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE loot_items ADD COLUMN IF NOT EXISTS allocation_cost INTEGER DEFAULT 0;`
    })

    if (error1 || error2 || error3) {
      console.error('Migration errors:', { error1, error2, error3 })
      console.log('\n⚠️  Could not run migration via RPC.')
      console.log('Please run the SQL migration manually in Supabase dashboard:')
      console.log('📄 File: scripts/add-item-classification.sql')
      return
    }

    console.log('✅ Migration completed successfully')
  } catch (err) {
    console.error('❌ Error running migration:', err)
    console.log('\n⚠️  Please run the SQL migration manually in Supabase dashboard:')
    console.log('📄 File: scripts/add-item-classification.sql')
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
