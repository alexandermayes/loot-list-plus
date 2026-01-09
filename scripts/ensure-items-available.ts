/**
 * Ensure all loot items are marked as available
 * Run this if items aren't showing up in the loot list
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
  console.error('❌ Error: Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function ensureItemsAvailable() {
  console.log('🔧 Ensuring all loot items are available...')
  console.log()

  // Update all items to be available if they aren't already
  const { data, error } = await supabase
    .from('loot_items')
    .update({
      is_available: true,
      classification: 'Unlimited',
      allocation_cost: 0
    })
    .is('is_available', null)
    .select('id')

  if (error) {
    console.error('❌ Error updating items:', error)
    process.exit(1)
  }

  console.log(`✅ Updated ${data?.length || 0} items to be available`)
  console.log()

  // Also update any that were explicitly set to false
  const { data: data2, error: error2 } = await supabase
    .from('loot_items')
    .update({
      is_available: true
    })
    .eq('is_available', false)
    .select('id')

  if (error2) {
    console.error('❌ Error updating unavailable items:', error2)
  } else {
    console.log(`✅ Updated ${data2?.length || 0} unavailable items`)
  }

  console.log()

  // Check status
  const { data: stats } = await supabase
    .from('loot_items')
    .select('is_available')

  const total = stats?.length || 0
  const available = stats?.filter(s => s.is_available).length || 0

  console.log('📊 Current Status:')
  console.log(`   Total items: ${total}`)
  console.log(`   Available items: ${available}`)
  console.log()

  // Check active raid tier
  const { data: activeTier } = await supabase
    .from('raid_tiers')
    .select('name, id')
    .eq('is_active', true)
    .single()

  if (activeTier) {
    console.log(`✅ Active raid tier: ${activeTier.name}`)

    const { data: tierItems } = await supabase
      .from('loot_items')
      .select('id')
      .eq('raid_tier_id', activeTier.id)
      .eq('is_available', true)

    console.log(`   Items in active tier: ${tierItems?.length || 0}`)
  } else {
    console.log('⚠️  No active raid tier found!')
  }

  console.log()
  console.log('✨ Done! Items should now be visible in the app.')
}

ensureItemsAvailable()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
