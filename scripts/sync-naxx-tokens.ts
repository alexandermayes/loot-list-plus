/**
 * Script to sync missing Naxxramas Tier 3 tokens to existing raid tiers
 *
 * Usage: npx tsx scripts/sync-naxx-tokens.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import { naxxramas } from '../data/classic-wow-raids'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables. Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function syncNaxxTokens() {
  console.log('🔄 Syncing Naxxramas Tier 3 tokens...\n')

  // Get all Naxxramas raid tiers across all guilds
  const { data: naxxTiers, error: tiersError } = await supabase
    .from('raid_tiers')
    .select('id, name, expansion_id, expansions(guild_id, guilds:guilds!expansions_guild_id_fkey(name))')
    .ilike('name', '%naxxramas%')

  if (tiersError) {
    console.error('Error fetching Naxxramas tiers:', tiersError)
    return
  }

  if (!naxxTiers || naxxTiers.length === 0) {
    console.log('No Naxxramas raid tiers found in the database.')
    return
  }

  console.log(`Found ${naxxTiers.length} Naxxramas raid tier(s)\n`)

  // Get all items from the data file
  const allDataItems = naxxramas.bosses.flatMap(boss =>
    boss.items.map(item => ({
      name: item.name,
      boss_name: boss.name,
      item_slot: item.slot,
      wowhead_id: item.wowhead_id,
    }))
  )

  console.log(`Data file has ${allDataItems.length} total items\n`)

  for (const tier of naxxTiers) {
    const expansions = (tier as unknown as { expansions?: { guilds?: { name?: string } | null } | null }).expansions
    const guildName = expansions?.guilds?.name || 'Unknown Guild'
    console.log(`\n📦 Processing: ${tier.name} (Guild: ${guildName})`)

    // Get existing items for this tier
    const { data: existingItems, error: itemsError } = await supabase
      .from('loot_items')
      .select('wowhead_id')
      .eq('raid_tier_id', tier.id)

    if (itemsError) {
      console.error(`  Error fetching items for tier ${tier.id}:`, itemsError)
      continue
    }

    const existingWowheadIds = new Set(existingItems?.map(i => i.wowhead_id) || [])
    console.log(`  Existing items: ${existingWowheadIds.size}`)

    // Find missing items
    const missingItems = allDataItems.filter(item => !existingWowheadIds.has(item.wowhead_id))

    if (missingItems.length === 0) {
      console.log('  ✅ All items already synced!')
      continue
    }

    console.log(`  Missing items: ${missingItems.length}`)
    missingItems.forEach(item => {
      console.log(`    - ${item.name} (${item.wowhead_id})`)
    })

    // Insert missing items
    const itemsToInsert = missingItems.map(item => ({
      raid_tier_id: tier.id,
      name: item.name,
      boss_name: item.boss_name,
      item_slot: item.item_slot,
      wowhead_id: item.wowhead_id,
      is_available: true,
      classification: 'Unlimited', // Default classification for tokens
      allocation_cost: 0,
    }))

    const { error: insertError } = await supabase
      .from('loot_items')
      .insert(itemsToInsert)

    if (insertError) {
      console.error(`  ❌ Error inserting items:`, insertError)
    } else {
      console.log(`  ✅ Successfully added ${missingItems.length} items!`)
    }
  }

  console.log('\n🎉 Sync complete!')
}

syncNaxxTokens().catch(console.error)
