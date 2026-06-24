/**
 * Clean duplicate items and re-seed all Classic WoW raids with complete loot tables
 * This ensures each item appears only once per raid tier
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

async function cleanAndReseedAllRaids() {
  console.log('🧹 Cleaning and re-seeding all Classic WoW raids...')
  console.log('=' .repeat(60))
  console.log()

  try {
    // Get the guild and expansion
    const { data: guilds } = await supabase
      .from('guilds')
      .select('id, name')
      .limit(1)

    if (!guilds || guilds.length === 0) {
      console.error('❌ No guild found')
      process.exit(1)
    }

    const guild = guilds[0]
    console.log(`✅ Guild: ${guild.name}`)

    const { data: expansion } = await supabase
      .from('expansions')
      .select('id')
      .eq('guild_id', guild.id)
      .eq('name', 'Classic WoW')
      .single()

    if (!expansion) {
      console.error('❌ Classic WoW expansion not found')
      process.exit(1)
    }

    console.log('✅ Found Classic WoW expansion')
    console.log()

    // Get all raid tiers
    const { data: raidTiers } = await supabase
      .from('raid_tiers')
      .select('id, name, is_active')
      .eq('expansion_id', expansion.id)
      .order('name')

    if (!raidTiers || raidTiers.length === 0) {
      console.error('❌ No raid tiers found')
      process.exit(1)
    }

    console.log(`📊 Found ${raidTiers.length} raid tiers`)
    console.log()

    let totalItemsBefore = 0
    let totalItemsAfter = 0
    let totalDuplicates = 0

    // Process each raid tier
    for (const tier of raidTiers) {
      console.log(`🔧 Processing: ${tier.name}`)

      // Count existing items
      const { data: existingItems } = await supabase
        .from('loot_items')
        .select('id, name, boss_name, wowhead_id')
        .eq('raid_tier_id', tier.id)

      const itemCount = existingItems?.length || 0
      totalItemsBefore += itemCount
      console.log(`   Current items: ${itemCount}`)

      // Find duplicates
      const itemMap = new Map<string, { id: string }[]>()
      existingItems?.forEach(item => {
        const key = `${item.name}-${item.boss_name}-${item.wowhead_id}`
        if (!itemMap.has(key)) {
          itemMap.set(key, [])
        }
        itemMap.get(key)!.push(item)
      })

      const duplicates = Array.from(itemMap.values()).filter(items => items.length > 1)
      if (duplicates.length > 0) {
        console.log(`   ⚠️  Found ${duplicates.length} duplicate item groups`)
        let dupeCount = 0
        for (const dupeGroup of duplicates) {
          // Keep the first one, delete the rest
          for (let i = 1; i < dupeGroup.length; i++) {
            await supabase
              .from('loot_items')
              .delete()
              .eq('id', dupeGroup[i].id)
            dupeCount++
          }
        }
        console.log(`   🗑️  Removed ${dupeCount} duplicate items`)
        totalDuplicates += dupeCount
      }

      // Delete all remaining items for this tier
      console.log(`   🗑️  Clearing all items for clean re-seed...`)
      const { error: deleteError } = await supabase
        .from('loot_items')
        .delete()
        .eq('raid_tier_id', tier.id)

      if (deleteError) {
        console.error(`   ❌ Error deleting items:`, deleteError)
        continue
      }

      // Find matching raid in data file
      const raidData = classicRaids.find(r => r.name === tier.name)

      if (!raidData) {
        console.log(`   ⚠️  No data found in file for ${tier.name}`)
        continue
      }

      // Insert complete loot tables
      const lootItems: Record<string, unknown>[] = []

      for (const boss of raidData.bosses) {
        for (const item of boss.items) {
          lootItems.push({
            raid_tier_id: tier.id,
            name: item.name,
            boss_name: boss.name,
            item_slot: item.slot,
            wowhead_id: item.wowhead_id,
            is_available: true,
            classification: 'Unlimited',
            allocation_cost: 0
          })
        }
      }

      // Batch insert
      if (lootItems.length > 0) {
        const { error: insertError } = await supabase
          .from('loot_items')
          .insert(lootItems)

        if (insertError) {
          console.error(`   ❌ Error inserting items:`, insertError)
        } else {
          console.log(`   ✅ Inserted ${lootItems.length} items`)
          totalItemsAfter += lootItems.length
        }
      }

      console.log()
    }

    console.log('=' .repeat(60))
    console.log('🎉 Cleaning and re-seeding complete!')
    console.log()
    console.log('📊 Summary:')
    console.log(`   Items before: ${totalItemsBefore}`)
    console.log(`   Duplicates removed: ${totalDuplicates}`)
    console.log(`   Items after: ${totalItemsAfter}`)
    console.log()

    // Show breakdown by raid
    console.log('📋 Items per raid tier:')
    for (const tier of raidTiers) {
      const { data: items } = await supabase
        .from('loot_items')
        .select('id')
        .eq('raid_tier_id', tier.id)

      const activeMarker = tier.is_active ? ' ⭐ (ACTIVE)' : ''
      console.log(`   ${tier.name}: ${items?.length || 0} items${activeMarker}`)
    }

    console.log()
    console.log('✨ All raid tiers now have complete, unique loot tables!')
    console.log('   Refresh your browser to see the changes.')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

cleanAndReseedAllRaids()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
