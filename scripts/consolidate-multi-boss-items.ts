/**
 * Consolidate items that drop from multiple bosses into single database rows
 * Instead of having 4 rows for "Ring of Spell Power", we'll have 1 row with boss_name = "Lucifron, Gehennas, Shazzrah, Sulfuron Harbinger"
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

interface ConsolidatedItem {
  name: string
  wowhead_id: number
  slot: string
  bosses: string[]
}

async function consolidateItems() {
  console.log('🔄 Consolidating items that drop from multiple bosses...')
  console.log('=' .repeat(70))
  console.log()

  try {
    // Get guild and expansion
    const { data: guilds } = await supabase
      .from('guilds')
      .select('id, name')
      .limit(1)

    if (!guilds || guilds.length === 0) {
      console.error('❌ No guild found')
      process.exit(1)
    }

    const { data: expansion } = await supabase
      .from('expansions')
      .select('id')
      .eq('guild_id', guilds[0].id)
      .eq('name', 'Classic WoW')
      .single()

    if (!expansion) {
      console.error('❌ Classic WoW expansion not found')
      process.exit(1)
    }

    // Get all raid tiers
    const { data: raidTiers } = await supabase
      .from('raid_tiers')
      .select('id, name')
      .eq('expansion_id', expansion.id)

    if (!raidTiers) {
      console.error('❌ No raid tiers found')
      process.exit(1)
    }

    let totalItemsBefore = 0
    let totalItemsAfter = 0
    let itemsConsolidated = 0

    for (const raid of classicRaids) {
      console.log(`📁 ${raid.name}`)

      // Find corresponding raid tier
      const tier = raidTiers.find(t => t.name === raid.name)
      if (!tier) {
        console.log(`   ⚠️  Raid tier not found in database`)
        continue
      }

      // Count existing items
      const { data: existingItems } = await supabase
        .from('loot_items')
        .select('id')
        .eq('raid_tier_id', tier.id)

      totalItemsBefore += existingItems?.length || 0
      console.log(`   Current items: ${existingItems?.length || 0}`)

      // Build consolidated item map
      const itemMap = new Map<number, ConsolidatedItem>()

      for (const boss of raid.bosses) {
        for (const item of boss.items) {
          if (itemMap.has(item.wowhead_id)) {
            // Item already exists, add this boss
            itemMap.get(item.wowhead_id)!.bosses.push(boss.name)
          } else {
            // New item
            itemMap.set(item.wowhead_id, {
              name: item.name,
              wowhead_id: item.wowhead_id,
              slot: item.slot,
              bosses: [boss.name]
            })
          }
        }
      }

      // Count how many items drop from multiple bosses
      const multiBossItems = Array.from(itemMap.values()).filter(item => item.bosses.length > 1)
      if (multiBossItems.length > 0) {
        console.log(`   Consolidating ${multiBossItems.length} items that drop from multiple bosses`)
        itemsConsolidated += multiBossItems.length
      }

      // Delete all existing items
      await supabase
        .from('loot_items')
        .delete()
        .eq('raid_tier_id', tier.id)

      // Insert consolidated items
      const consolidatedItems = Array.from(itemMap.values()).map(item => ({
        raid_tier_id: tier.id,
        name: item.name,
        boss_name: item.bosses.join(', '), // Comma-separated boss names
        item_slot: item.slot,
        wowhead_id: item.wowhead_id,
        is_available: true,
        classification: 'Unlimited',
        allocation_cost: 0
      }))

      const { error: insertError } = await supabase
        .from('loot_items')
        .insert(consolidatedItems)

      if (insertError) {
        console.error(`   ❌ Error inserting items:`, insertError)
      } else {
        console.log(`   ✅ Inserted ${consolidatedItems.length} consolidated items`)
        totalItemsAfter += consolidatedItems.length
      }

      console.log()
    }

    console.log('=' .repeat(70))
    console.log('🎉 Consolidation complete!')
    console.log()
    console.log('📊 Summary:')
    console.log(`   Items before: ${totalItemsBefore}`)
    console.log(`   Items after: ${totalItemsAfter}`)
    console.log(`   Duplicates removed: ${totalItemsBefore - totalItemsAfter}`)
    console.log(`   Items with multiple bosses: ${itemsConsolidated}`)
    console.log()
    console.log('✨ Each item now appears only once with all bosses listed!')
    console.log('   Refresh your browser to see the changes.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

consolidateItems()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
