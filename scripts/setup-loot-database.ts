/**
 * Interactive setup script to initialize loot database
 *
 * This script will:
 * 1. Show you your guild ID
 * 2. Seed all Classic WoW raid loot items
 * 3. Let you choose which raid tier to set as active
 *
 * Usage: npm run setup:loot
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

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function setupLootDatabase() {
  console.log('🎮 LootList+ Database Setup')
  console.log('=' .repeat(50))
  console.log()

  try {
    // Step 1: Get the first guild
    const { data: guilds, error: guildError } = await supabase
      .from('guilds')
      .select('id, name')
      .limit(1)

    if (guildError || !guilds || guilds.length === 0) {
      console.error('❌ No guilds found in database')
      console.error('Please create a guild first by logging in to the application')
      process.exit(1)
    }

    const guild = guilds[0]
    console.log('✅ Found guild:', guild.name)
    console.log('   Guild ID:', guild.id)
    console.log()

    // Step 2: Check if loot items already exist
    const { data: existingItems, error: itemsError } = await supabase
      .from('loot_items')
      .select('id')
      .limit(1)

    if (existingItems && existingItems.length > 0) {
      console.log('⚠️  Warning: Loot items already exist in database')
      console.log('   This script will add more items if you continue')
      console.log()
    }

    // Step 3: Create or get Classic WoW expansion
    let expansionId: string

    const { data: existingExpansion } = await supabase
      .from('expansions')
      .select('id')
      .eq('guild_id', guild.id)
      .eq('name', 'Classic WoW')
      .single()

    if (existingExpansion) {
      expansionId = existingExpansion.id
      console.log('✅ Found existing Classic WoW expansion')
    } else {
      const { data: newExpansion, error: expansionError } = await supabase
        .from('expansions')
        .insert({
          guild_id: guild.id,
          name: 'Classic WoW',
        })
        .select('id')
        .single()

      if (expansionError || !newExpansion) {
        console.error('❌ Error creating expansion:', expansionError)
        process.exit(1)
      }

      expansionId = newExpansion.id
      console.log('✅ Created Classic WoW expansion')
    }
    console.log()

    // Step 4: Seed all raids
    console.log('📦 Seeding Classic WoW raids...')
    console.log()

    let totalRaids = 0
    let totalBosses = 0
    let totalItems = 0
    const raidTierIds: Record<string, string> = {}

    for (const raid of classicRaids) {
      console.log(`📁 ${raid.name}`)

      // Check if raid tier already exists
      const { data: existingTier } = await supabase
        .from('raid_tiers')
        .select('id')
        .eq('expansion_id', expansionId)
        .eq('name', raid.name)
        .single()

      let raidTierId: string

      if (existingTier) {
        raidTierId = existingTier.id
        console.log(`   ℹ️  Already exists, will add any missing items`)
      } else {
        const { data: newTier, error: tierError } = await supabase
          .from('raid_tiers')
          .insert({
            expansion_id: expansionId,
            name: raid.name,
            is_active: false, // We'll let user choose which to activate
          })
          .select('id')
          .single()

        if (tierError || !newTier) {
          console.error(`   ❌ Error creating raid tier:`, tierError)
          continue
        }

        raidTierId = newTier.id
        console.log(`   ✅ Created raid tier`)
      }

      raidTierIds[raid.name] = raidTierId
      totalRaids++

      // Prepare loot items for batch insert
      const lootItems: any[] = []

      for (const boss of raid.bosses) {
        totalBosses++

        for (const item of boss.items) {
          lootItems.push({
            raid_tier_id: raidTierId,
            name: item.name,
            boss_name: boss.name,
            item_slot: item.slot,
            wowhead_id: item.wowhead_id,
            is_available: true, // Make all items available by default
            classification: 'Unlimited', // Default classification
            allocation_cost: 0, // Default cost
          })
          totalItems++
        }
      }

      // Batch insert loot items
      if (lootItems.length > 0) {
        // Use upsert to avoid duplicates
        const { error: itemsError } = await supabase
          .from('loot_items')
          .upsert(lootItems, {
            onConflict: 'raid_tier_id,name,boss_name',
            ignoreDuplicates: true
          })

        if (itemsError) {
          console.error(`   ❌ Error inserting loot items:`, itemsError)
        } else {
          console.log(`   ✅ Inserted ${lootItems.length} items`)
        }
      }
    }

    console.log()
    console.log('🎉 Seeding complete!')
    console.log(`📊 Summary:`)
    console.log(`   - Raids: ${totalRaids}`)
    console.log(`   - Bosses: ${totalBosses}`)
    console.log(`   - Loot Items: ${totalItems}`)
    console.log()

    // Step 5: Set active raid tier
    console.log('🎯 Setting up active raid tier...')
    console.log()
    console.log('Available raid tiers:')
    const raidNames = Object.keys(raidTierIds)
    raidNames.forEach((name, index) => {
      console.log(`   ${index + 1}. ${name}`)
    })
    console.log()

    // For now, let's set Blackwing Lair as active (most common starting point)
    const defaultRaid = 'Blackwing Lair'

    if (raidTierIds[defaultRaid]) {
      // First, deactivate all raid tiers
      await supabase
        .from('raid_tiers')
        .update({ is_active: false })
        .eq('expansion_id', expansionId)

      // Then activate the chosen one
      const { error: activateError } = await supabase
        .from('raid_tiers')
        .update({ is_active: true })
        .eq('id', raidTierIds[defaultRaid])

      if (activateError) {
        console.error('❌ Error activating raid tier:', activateError)
      } else {
        console.log(`✅ Set "${defaultRaid}" as active raid tier`)
        console.log()
        console.log('💡 To change the active raid tier later:')
        console.log('   1. Log in as an Officer')
        console.log('   2. Go to Admin panel')
        console.log('   3. Manage raid tiers')
      }
    }

    console.log()
    console.log('✨ Setup complete!')
    console.log()
    console.log('Next steps:')
    console.log('1. Visit your app and log in')
    console.log('2. Go to Admin > Loot Items to review and configure items')
    console.log('3. Set item classifications (Reserved, Limited, Unlimited)')
    console.log('4. Configure class restrictions for each item')
    console.log('5. Guild members can now create loot lists!')
    console.log()

  } catch (error) {
    console.error('❌ Unexpected error:', error)
    process.exit(1)
  }
}

setupLootDatabase()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  })
