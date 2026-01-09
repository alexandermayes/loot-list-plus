/**
 * Re-seed Blackwing Lair with complete loot tables
 * This will delete old BWL items and insert the new complete data
 */

import { createClient } from '@supabase/supabase-js'
import { classicRaids } from '../data/classic-wow-raids'
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

async function reseedBWL() {
  console.log('🐉 Re-seeding Blackwing Lair with complete loot tables...')
  console.log()

  try {
    // Find BWL raid tier
    const { data: bwlTier, error: tierError } = await supabase
      .from('raid_tiers')
      .select('id, name')
      .eq('name', 'Blackwing Lair')
      .single()

    if (tierError || !bwlTier) {
      console.error('❌ Could not find Blackwing Lair raid tier')
      console.error('Run npm run setup:loot first to create raid tiers')
      process.exit(1)
    }

    console.log(`✅ Found raid tier: ${bwlTier.name}`)
    console.log(`   Tier ID: ${bwlTier.id}`)
    console.log()

    // Check current item count
    const { data: currentItems } = await supabase
      .from('loot_items')
      .select('id')
      .eq('raid_tier_id', bwlTier.id)

    console.log(`📊 Current BWL items: ${currentItems?.length || 0}`)
    console.log()

    // Delete old BWL items
    console.log('🗑️  Deleting old BWL items...')
    const { error: deleteError } = await supabase
      .from('loot_items')
      .delete()
      .eq('raid_tier_id', bwlTier.id)

    if (deleteError) {
      console.error('❌ Error deleting old items:', deleteError)
      process.exit(1)
    }

    console.log('✅ Deleted old items')
    console.log()

    // Get BWL data from the updated file
    const bwlRaid = classicRaids.find(raid => raid.name === 'Blackwing Lair')

    if (!bwlRaid) {
      console.error('❌ Could not find Blackwing Lair in data file')
      process.exit(1)
    }

    console.log('📦 Inserting new complete loot tables...')
    console.log()

    let totalItems = 0

    for (const boss of bwlRaid.bosses) {
      const lootItems = boss.items.map(item => ({
        raid_tier_id: bwlTier.id,
        name: item.name,
        boss_name: boss.name,
        item_slot: item.slot,
        wowhead_id: item.wowhead_id,
        is_available: true,
        classification: 'Unlimited',
        allocation_cost: 0
      }))

      const { error: insertError } = await supabase
        .from('loot_items')
        .insert(lootItems)

      if (insertError) {
        console.error(`❌ Error inserting items for ${boss.name}:`, insertError)
      } else {
        console.log(`✅ ${boss.name}: ${lootItems.length} items`)
        totalItems += lootItems.length
      }
    }

    console.log()
    console.log('🎉 Re-seeding complete!')
    console.log(`📊 Total BWL items: ${totalItems}`)
    console.log()
    console.log('✨ Blackwing Lair now has complete loot tables with correct Tier 2 assignments!')
    console.log()
    console.log('Refresh your loot list page to see all the items.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

reseedBWL()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
