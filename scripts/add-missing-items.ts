/**
 * Script to add specific missing items to raid tiers
 *
 * Usage: npx tsx scripts/add-missing-items.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Missing items to add
const missingItems = [
  {
    wowhead_id: 23069,
    name: 'Necro-Knight\'s Garb',
    slot: 'Chest',
    boss_name: 'Trash Mobs',
    raid: 'Naxxramas'
  },
  {
    wowhead_id: 23545,
    name: 'Power of the Scourge',
    slot: 'Crafting',
    boss_name: 'Kel\'Thuzad',
    raid: 'Naxxramas'
  },
  {
    wowhead_id: 18563,
    name: 'Bracers of the Eclipse',
    slot: 'Wrist',
    boss_name: 'C\'Thun',
    raid: 'Temple of Ahn\'Qiraj'
  }
]

async function addMissingItems() {
  console.log('🔄 Adding missing items...\n')

  for (const item of missingItems) {
    console.log(`\n📦 Adding: ${item.name} (${item.wowhead_id}) to ${item.raid}`)

    // Find all raid tiers matching this raid name
    const { data: tiers, error: tiersError } = await supabase
      .from('raid_tiers')
      .select('id, name, expansion_id')
      .ilike('name', `%${item.raid}%`)

    if (tiersError) {
      console.error(`  ❌ Error finding raid tier:`, tiersError.message)
      continue
    }

    if (!tiers || tiers.length === 0) {
      console.log(`  ⚠️ No raid tiers found for "${item.raid}"`)
      continue
    }

    console.log(`  Found ${tiers.length} matching raid tier(s)`)

    for (const tier of tiers) {
      // Check if item already exists
      const { data: existing } = await supabase
        .from('loot_items')
        .select('id')
        .eq('raid_tier_id', tier.id)
        .eq('wowhead_id', item.wowhead_id)
        .single()

      if (existing) {
        console.log(`  ✓ Already exists in ${tier.name}`)
        continue
      }

      // Insert the item
      const { error: insertError } = await supabase
        .from('loot_items')
        .insert({
          raid_tier_id: tier.id,
          name: item.name,
          boss_name: item.boss_name,
          item_slot: item.slot,
          wowhead_id: item.wowhead_id,
          is_available: true,
          classification: 'Unlimited',
          allocation_cost: 0,
        })

      if (insertError) {
        console.error(`  ❌ Error inserting into ${tier.name}:`, insertError.message)
      } else {
        console.log(`  ✅ Added to ${tier.name}`)
      }
    }
  }

  console.log('\n🎉 Done!')
}

addMissingItems().catch(console.error)
