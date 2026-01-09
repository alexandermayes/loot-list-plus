/**
 * Script to set up loot availability fields
 * Run this after manually adding the columns via Supabase dashboard
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

async function setupLootAvailability() {
  console.log('📋 Setting up loot availability...')

  // Check if columns exist
  const { data: testData, error: testError } = await supabase
    .from('loot_items')
    .select('id, is_available')
    .limit(1)

  if (testError) {
    console.error('❌ Error: is_available column does not exist yet.')
    console.error('Please add the column manually in Supabase dashboard:')
    console.log('\n1. Go to Supabase Dashboard > SQL Editor')
    console.log('2. Run the SQL from: scripts/add-loot-availability.sql')
    process.exit(1)
  }

  console.log('✅ Columns exist, proceeding with data setup...')

  // Set all items as available by default
  const { error: updateError } = await supabase
    .from('loot_items')
    .update({ is_available: true })
    .is('is_available', null)

  if (updateError) {
    console.error('❌ Error updating items:', updateError)
    process.exit(1)
  }

  // Get count of items
  const { data: items, error: countError } = await supabase
    .from('loot_items')
    .select('id')

  if (countError) {
    console.error('❌ Error counting items:', countError)
    process.exit(1)
  }

  console.log(`✅ Set ${items?.length || 0} items as available`)

  // Check loot_item_classes for spec_type column
  const { data: classTest, error: classError } = await supabase
    .from('loot_item_classes')
    .select('id, spec_type')
    .limit(1)

  if (classError) {
    console.log('\n⚠️  spec_type column not found in loot_item_classes')
    console.log('This column will be needed to distinguish primary/secondary classes')
    console.log('Run the SQL from: scripts/add-loot-availability.sql')
  } else {
    // Set all existing class relations as 'primary' by default
    const { error: classUpdateError } = await supabase
      .from('loot_item_classes')
      .update({ spec_type: 'primary' })
      .is('spec_type', null)

    if (classUpdateError) {
      console.error('⚠️  Error updating class relations:', classUpdateError)
    } else {
      const { data: classData } = await supabase
        .from('loot_item_classes')
        .select('id')

      console.log(`✅ Set ${classData?.length || 0} class relations as primary`)
    }
  }

  console.log('\n✅ Setup complete!')
  console.log('\n📝 Next steps:')
  console.log('1. Visit /admin/loot-items to manage item availability')
  console.log('2. Set classifications (Reserved/Limited/Unlimited)')
  console.log('3. Configure primary and secondary classes for each item')
}

setupLootAvailability()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
