/**
 * Script to seed Classic WoW raid and loot data into the database
 *
 * Usage: npx tsx scripts/seed-classic-raids.ts <guild_id>
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
      let value = valueParts.join('=').trim()
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[key.trim()] = value
    }
  })
} catch (error) {
  console.error('Error loading .env.local:', error)
}

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role key to bypass RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function seedClassicRaids(guildId: string) {
  console.log('🎮 Starting Classic WoW raid seeding for guild:', guildId)

  try {
    // Step 1: Check if guild exists
    const { data: guild, error: guildError } = await supabase
      .from('guilds')
      .select('id, name')
      .eq('id', guildId)
      .single()

    if (guildError || !guild) {
      console.error('❌ Guild not found:', guildId)
      return
    }

    console.log('✅ Found guild:', guild.name)

    // Step 2: Create or get Classic WoW expansion
    let expansionId: string

    const { data: existingExpansion } = await supabase
      .from('expansions')
      .select('id')
      .eq('guild_id', guildId)
      .eq('name', 'Classic WoW')
      .single()

    if (existingExpansion) {
      expansionId = existingExpansion.id
      console.log('✅ Found existing Classic WoW expansion:', expansionId)
    } else {
      const { data: newExpansion, error: expansionError } = await supabase
        .from('expansions')
        .insert({
          guild_id: guildId,
          name: 'Classic WoW',
        })
        .select('id')
        .single()

      if (expansionError || !newExpansion) {
        console.error('❌ Error creating expansion:', expansionError)
        return
      }

      expansionId = newExpansion.id
      console.log('✅ Created Classic WoW expansion:', expansionId)
    }

    // Step 3: Create raid tiers and insert loot items
    let totalRaids = 0
    let totalBosses = 0
    let totalItems = 0

    for (const raid of classicRaids) {
      console.log(`\n📁 Processing raid: ${raid.name}`)

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
        console.log(`  ℹ️  Raid tier already exists, using existing: ${raidTierId}`)

        // Delete existing loot items for this raid to avoid duplicates
        const { error: deleteError } = await supabase
          .from('loot_items')
          .delete()
          .eq('raid_tier_id', raidTierId)

        if (deleteError) {
          console.warn(`  ⚠️  Warning: Could not delete existing loot items:`, deleteError.message)
        } else {
          console.log(`  ✅ Cleared existing loot items`)
        }
      } else {
        // Create new raid tier
        const { data: newTier, error: tierError } = await supabase
          .from('raid_tiers')
          .insert({
            expansion_id: expansionId,
            name: raid.name,
            is_active: false, // Set to false by default, user can activate later
          })
          .select('id')
          .single()

        if (tierError || !newTier) {
          console.error(`  ❌ Error creating raid tier:`, tierError)
          continue
        }

        raidTierId = newTier.id
        console.log(`  ✅ Created raid tier: ${raidTierId}`)
      }

      totalRaids++

      // Insert loot items for all bosses in this raid
      const lootItems: Array<{
        raid_tier_id: string
        name: string
        boss_name: string
        item_slot: string
        wowhead_id: number
      }> = []

      for (const boss of raid.bosses) {
        totalBosses++

        for (const item of boss.items) {
          lootItems.push({
            raid_tier_id: raidTierId,
            name: item.name,
            boss_name: boss.name,
            item_slot: item.slot,
            wowhead_id: item.wowhead_id,
          })
          totalItems++
        }
      }

      // Batch insert loot items
      if (lootItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('loot_items')
          .insert(lootItems)

        if (itemsError) {
          console.error(`  ❌ Error inserting loot items:`, itemsError)
        } else {
          console.log(`  ✅ Inserted ${lootItems.length} loot items`)
        }
      }
    }

    console.log('\n🎉 Seeding complete!')
    console.log(`📊 Summary:`)
    console.log(`   - Raids: ${totalRaids}`)
    console.log(`   - Bosses: ${totalBosses}`)
    console.log(`   - Loot Items: ${totalItems}`)
  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

// Main execution
const guildId = process.argv[2]

if (!guildId) {
  console.error('❌ Usage: npx tsx scripts/seed-classic-raids.ts <guild_id>')
  console.error('Example: npx tsx scripts/seed-classic-raids.ts 12345678-1234-1234-1234-123456789abc')
  process.exit(1)
}

seedClassicRaids(guildId)
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
