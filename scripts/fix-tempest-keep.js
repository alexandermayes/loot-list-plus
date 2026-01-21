const { createClient } = require('@supabase/supabase-js')
const { readFileSync } = require('fs')
const { resolve } = require('path')

// Load .env.local
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

async function fixTempestKeep() {
  console.log('🔄 Fixing Tempest Keep: The Eye...\n')

  try {
    // Get all Tempest Keep raid tiers
    const { data: raidTiers, error: rtError } = await supabase
      .from('raid_tiers')
      .select('id, name, expansion_id')
      .in('name', ['Tempest Keep', 'Tempest Keep: The Eye', 'The Eye'])

    if (rtError) {
      console.error('Error fetching raid tiers:', rtError.message)
      process.exit(1)
    }

    console.log(`Found ${raidTiers ? raidTiers.length : 0} Tempest Keep raid tier(s)\n`)

    if (!raidTiers || raidTiers.length === 0) {
      console.log('No Tempest Keep raid tiers found.')
      return
    }

    for (const rt of raidTiers) {
      // Get guild name
      let guildName = 'Unknown'
      const { data: expansion } = await supabase
        .from('expansions')
        .select('guild_id')
        .eq('id', rt.expansion_id)
        .single()

      if (expansion) {
        const { data: guild } = await supabase
          .from('guilds')
          .select('name')
          .eq('id', expansion.guild_id)
          .single()
        if (guild) guildName = guild.name
      }

      console.log(`Processing Tempest Keep for guild: ${guildName}`)

      // Remove Magister's Terrace bosses
      const magistersTerracebosses = ['Priestess Delrissa', 'Selin Fireheart', 'Vexallus']
      const { data: deleted, error: delError } = await supabase
        .from('loot_items')
        .delete()
        .eq('raid_tier_id', rt.id)
        .in('boss_name', magistersTerracebosses)
        .select()

      if (delError) {
        console.error(`  Error deleting Magister's Terrace bosses: ${delError.message}`)
      } else {
        console.log(`  ✓ Removed Magister's Terrace bosses (${deleted ? deleted.length : 0} items)`)
      }

      // Add Trash drops
      const trashItems = [
        { name: 'Seventh Ring of the Tirisfalen', boss_name: 'Trash', item_slot: 'Finger', wowhead_id: 30028 },
        { name: 'Mantle of the Elven Kings', boss_name: 'Trash', item_slot: 'Shoulder', wowhead_id: 30024 },
        { name: 'Fire-Cord of the Magus', boss_name: 'Trash', item_slot: 'Waist', wowhead_id: 30020 },
        { name: 'Bark-Gloves of Ancient Wisdom', boss_name: 'Trash', item_slot: 'Hands', wowhead_id: 30029 },
        { name: 'Girdle of Fallen Stars', boss_name: 'Trash', item_slot: 'Waist', wowhead_id: 30030 },
        { name: 'Bands of the Celestial Archer', boss_name: 'Trash', item_slot: 'Wrist', wowhead_id: 30026 },
      ].map(item => ({ ...item, raid_tier_id: rt.id, is_available: true }))

      const { error: trashError } = await supabase.from('loot_items').insert(trashItems)
      if (trashError) {
        if (trashError.message.includes('duplicate')) {
          console.log('  ⚠ Trash items already exist (skipped)')
        } else {
          console.error(`  Error inserting trash items: ${trashError.message}`)
        }
      } else {
        console.log(`  ✓ Added Trash drops (6)`)
      }

      // Add Profession Recipes - Blacksmithing
      const blacksmithingRecipes = [
        { name: 'Plans: Belt of the Guardian', boss_name: 'Trash', item_slot: 'Recipe', wowhead_id: 30321 },
        { name: 'Plans: Boots of the Protector', boss_name: 'Trash', item_slot: 'Recipe', wowhead_id: 30323 },
        { name: 'Plans: Red Belt of Battle', boss_name: 'Trash', item_slot: 'Recipe', wowhead_id: 30322 },
        { name: 'Plans: Red Havoc Boots', boss_name: 'Trash', item_slot: 'Recipe', wowhead_id: 30324 },
      ].map(item => ({ ...item, raid_tier_id: rt.id, is_available: true }))

      const { error: bsError } = await supabase.from('loot_items').insert(blacksmithingRecipes)
      if (bsError) {
        if (bsError.message.includes('duplicate')) {
          console.log('  ⚠ Blacksmithing recipes already exist (skipped)')
        } else {
          console.error(`  Error inserting BS recipes: ${bsError.message}`)
        }
      } else {
        console.log(`  ✓ Added Blacksmithing recipes (4)`)
      }

      // Add Profession Recipes - Leatherworking
      const leatherworkingRecipes = [
        { name: 'Pattern: Belt of Deep Shadow', boss_name: 'Trash', item_slot: 'Recipe', wowhead_id: 30302 },
        { name: 'Pattern: Belt of Natural Power', boss_name: 'Trash', item_slot: 'Recipe', wowhead_id: 30301 },
        { name: 'Pattern: Belt of the Black Eagle', boss_name: 'Trash', item_slot: 'Recipe', wowhead_id: 30303 },
        { name: 'Pattern: Boots of Natural Grace', boss_name: 'Trash', item_slot: 'Recipe', wowhead_id: 30305 },
        { name: 'Pattern: Boots of the Crimson Hawk', boss_name: 'Trash', item_slot: 'Recipe', wowhead_id: 30307 },
        { name: 'Pattern: Boots of Utter Darkness', boss_name: 'Trash', item_slot: 'Recipe', wowhead_id: 30306 },
        { name: 'Pattern: Hurricane Boots', boss_name: 'Trash', item_slot: 'Recipe', wowhead_id: 30308 },
        { name: 'Pattern: Monsoon Belt', boss_name: 'Trash', item_slot: 'Recipe', wowhead_id: 30304 },
      ].map(item => ({ ...item, raid_tier_id: rt.id, is_available: true }))

      const { error: lwError } = await supabase.from('loot_items').insert(leatherworkingRecipes)
      if (lwError) {
        if (lwError.message.includes('duplicate')) {
          console.log('  ⚠ Leatherworking recipes already exist (skipped)')
        } else {
          console.error(`  Error inserting LW recipes: ${lwError.message}`)
        }
      } else {
        console.log(`  ✓ Added Leatherworking recipes (8)`)
      }

      // Add Profession Recipes - Tailoring
      const tailoringRecipes = [
        { name: 'Pattern: Belt of Blasting', boss_name: 'Trash', item_slot: 'Recipe', wowhead_id: 30280 },
        { name: 'Pattern: Belt of the Long Road', boss_name: 'Trash', item_slot: 'Recipe', wowhead_id: 30281 },
        { name: 'Pattern: Boots of Blasting', boss_name: 'Trash', item_slot: 'Recipe', wowhead_id: 30282 },
        { name: 'Pattern: Boots of the Long Road', boss_name: 'Trash', item_slot: 'Recipe', wowhead_id: 30283 },
      ].map(item => ({ ...item, raid_tier_id: rt.id, is_available: true }))

      const { error: tailorError } = await supabase.from('loot_items').insert(tailoringRecipes)
      if (tailorError) {
        if (tailorError.message.includes('duplicate')) {
          console.log('  ⚠ Tailoring recipes already exist (skipped)')
        } else {
          console.error(`  Error inserting Tailoring recipes: ${tailorError.message}`)
        }
      } else {
        console.log(`  ✓ Added Tailoring recipes (4)`)
      }

      console.log(`✅ Completed Tempest Keep fix for guild: ${guildName}\n`)
    }

    console.log('========================================')
    console.log('✅ Tempest Keep fix completed!')
    console.log('========================================')
  } catch (err) {
    console.error('❌ Error:', err)
    process.exit(1)
  }
}

fixTempestKeep()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
