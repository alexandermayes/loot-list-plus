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

async function getRaidTierId(guildId, raidNames) {
  const names = Array.isArray(raidNames) ? raidNames : [raidNames]

  const { data } = await supabase
    .from('raid_tiers')
    .select('id, name, expansion_id')
    .in('name', names)

  if (!data || data.length === 0) return null

  // Filter by guild
  for (const rt of data) {
    const { data: exp } = await supabase
      .from('expansions')
      .select('guild_id')
      .eq('id', rt.expansion_id)
      .single()

    if (exp && exp.guild_id === guildId) {
      return rt.id
    }
  }
  return null
}

async function insertItems(raidTierId, items, description) {
  const itemsWithRaidTier = items.map(item => ({
    ...item,
    raid_tier_id: raidTierId,
    is_available: true
  }))

  const { error } = await supabase.from('loot_items').insert(itemsWithRaidTier)

  if (error) {
    if (error.message.includes('duplicate')) {
      console.log(`  ⚠ ${description} - some items already exist (skipped duplicates)`)
    } else {
      console.error(`  ✗ Error inserting ${description}: ${error.message}`)
    }
  } else {
    console.log(`  ✓ Added ${description} (${items.length})`)
  }
}

async function runMigration() {
  console.log('🔄 Running complete TBC raid loot migration...\n')

  try {
    // Get all guilds
    const { data: guilds, error: guildError } = await supabase
      .from('guilds')
      .select('id, name')

    if (guildError) {
      console.error('Error fetching guilds:', guildError.message)
      process.exit(1)
    }

    console.log(`Found ${guilds.length} guild(s)\n`)

    for (const guild of guilds) {
      console.log(`\n========================================`)
      console.log(`Processing guild: ${guild.name}`)
      console.log(`========================================`)

      // =====================================================
      // GRUUL'S LAIR - Tier 4 Shoulder & Leg Tokens
      // =====================================================
      let raidTierId = await getRaidTierId(guild.id, "Gruul's Lair")
      if (raidTierId) {
        console.log("\n📍 Gruul's Lair")

        await insertItems(raidTierId, [
          { name: 'Pauldrons of the Fallen Hero', boss_name: 'High King Maulgar', item_slot: 'Token', wowhead_id: 29762 },
          { name: 'Pauldrons of the Fallen Champion', boss_name: 'High King Maulgar', item_slot: 'Token', wowhead_id: 29763 },
          { name: 'Pauldrons of the Fallen Defender', boss_name: 'High King Maulgar', item_slot: 'Token', wowhead_id: 29764 },
        ], 'T4 Shoulder tokens (High King Maulgar)')

        await insertItems(raidTierId, [
          { name: 'Leggings of the Fallen Hero', boss_name: 'Gruul the Dragonkiller', item_slot: 'Token', wowhead_id: 29765 },
          { name: 'Leggings of the Fallen Champion', boss_name: 'Gruul the Dragonkiller', item_slot: 'Token', wowhead_id: 29766 },
          { name: 'Leggings of the Fallen Defender', boss_name: 'Gruul the Dragonkiller', item_slot: 'Token', wowhead_id: 29767 },
          { name: 'Shuriken of Negation', boss_name: 'Gruul the Dragonkiller', item_slot: 'Thrown', wowhead_id: 28826 },
        ], 'T4 Leg tokens + Shuriken (Gruul)')
      }

      // =====================================================
      // MAGTHERIDON'S LAIR - Tier 4 Chest Tokens
      // =====================================================
      raidTierId = await getRaidTierId(guild.id, "Magtheridon's Lair")
      if (raidTierId) {
        console.log("\n📍 Magtheridon's Lair")

        await insertItems(raidTierId, [
          { name: 'Chestguard of the Fallen Hero', boss_name: 'Magtheridon', item_slot: 'Token', wowhead_id: 29755 },
          { name: 'Chestguard of the Fallen Champion', boss_name: 'Magtheridon', item_slot: 'Token', wowhead_id: 29754 },
          { name: 'Chestguard of the Fallen Defender', boss_name: 'Magtheridon', item_slot: 'Token', wowhead_id: 29753 },
          { name: "Pit Lord's Satchel", boss_name: 'Magtheridon', item_slot: 'Bag', wowhead_id: 34845 },
        ], 'T4 Chest tokens + Bag (Magtheridon)')
      }

      // =====================================================
      // SERPENTSHRINE CAVERN - Tier 5 Tokens
      // =====================================================
      raidTierId = await getRaidTierId(guild.id, 'Serpentshrine Cavern')
      if (raidTierId) {
        console.log('\n📍 Serpentshrine Cavern')

        await insertItems(raidTierId, [
          { name: 'Gloves of the Vanquished Hero', boss_name: 'Leotheras the Blind', item_slot: 'Token', wowhead_id: 30241 },
          { name: 'Gloves of the Vanquished Champion', boss_name: 'Leotheras the Blind', item_slot: 'Token', wowhead_id: 30239 },
          { name: 'Gloves of the Vanquished Defender', boss_name: 'Leotheras the Blind', item_slot: 'Token', wowhead_id: 30240 },
        ], 'T5 Glove tokens (Leotheras)')

        await insertItems(raidTierId, [
          { name: 'Leggings of the Vanquished Hero', boss_name: 'Fathom-Lord Karathress', item_slot: 'Token', wowhead_id: 30247 },
          { name: 'Leggings of the Vanquished Champion', boss_name: 'Fathom-Lord Karathress', item_slot: 'Token', wowhead_id: 30245 },
          { name: 'Leggings of the Vanquished Defender', boss_name: 'Fathom-Lord Karathress', item_slot: 'Token', wowhead_id: 30246 },
        ], 'T5 Leg tokens (Karathress)')

        await insertItems(raidTierId, [
          { name: 'Helm of the Vanquished Hero', boss_name: 'Lady Vashj', item_slot: 'Token', wowhead_id: 30244 },
          { name: 'Helm of the Vanquished Champion', boss_name: 'Lady Vashj', item_slot: 'Token', wowhead_id: 30242 },
          { name: 'Helm of the Vanquished Defender', boss_name: 'Lady Vashj', item_slot: 'Token', wowhead_id: 30243 },
          { name: "Vashj's Vial Remnant", boss_name: 'Lady Vashj', item_slot: 'Quest', wowhead_id: 31544 },
        ], 'T5 Helm tokens + Quest (Vashj)')
      }

      // =====================================================
      // TEMPEST KEEP - Tier 5 Tokens + Ashes
      // =====================================================
      raidTierId = await getRaidTierId(guild.id, ['Tempest Keep', 'Tempest Keep: The Eye', 'The Eye'])
      if (raidTierId) {
        console.log('\n📍 Tempest Keep: The Eye')

        await insertItems(raidTierId, [
          { name: 'Pauldrons of the Vanquished Hero', boss_name: 'Void Reaver', item_slot: 'Token', wowhead_id: 30250 },
          { name: 'Pauldrons of the Vanquished Champion', boss_name: 'Void Reaver', item_slot: 'Token', wowhead_id: 30248 },
          { name: 'Pauldrons of the Vanquished Defender', boss_name: 'Void Reaver', item_slot: 'Token', wowhead_id: 30249 },
        ], 'T5 Shoulder tokens (Void Reaver)')

        await insertItems(raidTierId, [
          { name: 'Chestguard of the Vanquished Hero', boss_name: "Kael'thas Sunstrider", item_slot: 'Token', wowhead_id: 30238 },
          { name: 'Chestguard of the Vanquished Champion', boss_name: "Kael'thas Sunstrider", item_slot: 'Token', wowhead_id: 30236 },
          { name: 'Chestguard of the Vanquished Defender', boss_name: "Kael'thas Sunstrider", item_slot: 'Token', wowhead_id: 30237 },
          { name: "Ashes of Al'ar", boss_name: "Kael'thas Sunstrider", item_slot: 'Mount', wowhead_id: 32458 },
          { name: 'Verdant Sphere', boss_name: "Kael'thas Sunstrider", item_slot: 'Quest', wowhead_id: 32405 },
          { name: "Kael's Vial Remnant", boss_name: "Kael'thas Sunstrider", item_slot: 'Quest', wowhead_id: 29905 },
        ], "T5 Chest tokens + Ashes of Al'ar (Kael'thas)")
      }

      // =====================================================
      // HYJAL SUMMIT - Tier 6 Tokens
      // =====================================================
      raidTierId = await getRaidTierId(guild.id, ['Hyjal Summit', 'Mount Hyjal', 'Hyjal'])
      if (raidTierId) {
        console.log('\n📍 Hyjal Summit')

        await insertItems(raidTierId, [
          { name: 'Gloves of the Forgotten Conqueror', boss_name: 'Azgalor', item_slot: 'Token', wowhead_id: 31092 },
          { name: 'Gloves of the Forgotten Vanquisher', boss_name: 'Azgalor', item_slot: 'Token', wowhead_id: 31093 },
          { name: 'Gloves of the Forgotten Protector', boss_name: 'Azgalor', item_slot: 'Token', wowhead_id: 31094 },
        ], 'T6 Glove tokens (Azgalor)')

        await insertItems(raidTierId, [
          { name: 'Helm of the Forgotten Conqueror', boss_name: 'Archimonde', item_slot: 'Token', wowhead_id: 31097 },
          { name: 'Helm of the Forgotten Protector', boss_name: 'Archimonde', item_slot: 'Token', wowhead_id: 31095 },
          { name: 'Helm of the Forgotten Vanquisher', boss_name: 'Archimonde', item_slot: 'Token', wowhead_id: 31096 },
        ], 'T6 Helm tokens (Archimonde)')
      }

      // =====================================================
      // BLACK TEMPLE - Tier 6 Tokens + Warglaives
      // =====================================================
      raidTierId = await getRaidTierId(guild.id, 'Black Temple')
      if (raidTierId) {
        console.log('\n📍 Black Temple')

        await insertItems(raidTierId, [
          { name: 'Shoulders of the Forgotten Conqueror', boss_name: 'Mother Shahraz', item_slot: 'Token', wowhead_id: 31101 },
          { name: 'Shoulders of the Forgotten Vanquisher', boss_name: 'Mother Shahraz', item_slot: 'Token', wowhead_id: 31102 },
          { name: 'Shoulders of the Forgotten Protector', boss_name: 'Mother Shahraz', item_slot: 'Token', wowhead_id: 31103 },
        ], 'T6 Shoulder tokens (Mother Shahraz)')

        await insertItems(raidTierId, [
          { name: 'Leggings of the Forgotten Conqueror', boss_name: 'The Illidari Council', item_slot: 'Token', wowhead_id: 31098 },
          { name: 'Leggings of the Forgotten Vanquisher', boss_name: 'The Illidari Council', item_slot: 'Token', wowhead_id: 31099 },
          { name: 'Leggings of the Forgotten Protector', boss_name: 'The Illidari Council', item_slot: 'Token', wowhead_id: 31100 },
        ], 'T6 Leg tokens (Illidari Council)')

        await insertItems(raidTierId, [
          { name: 'Chestguard of the Forgotten Conqueror', boss_name: 'Illidan Stormrage', item_slot: 'Token', wowhead_id: 31089 },
          { name: 'Chestguard of the Forgotten Vanquisher', boss_name: 'Illidan Stormrage', item_slot: 'Token', wowhead_id: 31090 },
          { name: 'Chestguard of the Forgotten Protector', boss_name: 'Illidan Stormrage', item_slot: 'Token', wowhead_id: 31091 },
          { name: 'Warglaive of Azzinoth (Main Hand)', boss_name: 'Illidan Stormrage', item_slot: 'Main Hand', wowhead_id: 32837 },
          { name: 'Warglaive of Azzinoth (Off Hand)', boss_name: 'Illidan Stormrage', item_slot: 'Off Hand', wowhead_id: 32838 },
        ], 'T6 Chest tokens + Warglaives (Illidan)')
      }

      // =====================================================
      // ZUL'AMAN - Timed Event + Recipe
      // =====================================================
      raidTierId = await getRaidTierId(guild.id, "Zul'Aman")
      if (raidTierId) {
        console.log("\n📍 Zul'Aman")

        await insertItems(raidTierId, [
          { name: 'Formula: Enchant Weapon - Executioner', boss_name: "Zul'jin", item_slot: 'Recipe', wowhead_id: 33307 },
        ], "Executioner recipe (Zul'jin)")

        await insertItems(raidTierId, [
          { name: 'Amani War Bear', boss_name: 'Timed Event', item_slot: 'Mount', wowhead_id: 33809 },
          { name: 'Cloak of Fiends', boss_name: 'Timed Event', item_slot: 'Back', wowhead_id: 33590 },
          { name: "Shadowcaster's Drape", boss_name: 'Timed Event', item_slot: 'Back', wowhead_id: 33591 },
          { name: 'Mantle of Ill Intent', boss_name: 'Timed Event', item_slot: 'Shoulder', wowhead_id: 33489 },
          { name: 'Cord of Braided Troll Hair', boss_name: 'Timed Event', item_slot: 'Waist', wowhead_id: 33480 },
          { name: 'Elunite Imbued Leggings', boss_name: 'Timed Event', item_slot: 'Legs', wowhead_id: 33971 },
          { name: 'Life-Step Belt', boss_name: 'Timed Event', item_slot: 'Waist', wowhead_id: 33483 },
          { name: "Shadowhunter's Treads", boss_name: 'Timed Event', item_slot: 'Feet', wowhead_id: 33805 },
          { name: 'Pauldrons of Stone Resolve', boss_name: 'Timed Event', item_slot: 'Shoulder', wowhead_id: 33481 },
          { name: 'Umbral Shiv', boss_name: 'Timed Event', item_slot: 'One-Hand', wowhead_id: 33493 },
          { name: 'Rage', boss_name: 'Timed Event', item_slot: 'Off Hand', wowhead_id: 33495 },
          { name: 'Tuskbreaker', boss_name: 'Timed Event', item_slot: 'Ranged', wowhead_id: 33491 },
          { name: 'Trollbane', boss_name: 'Timed Event', item_slot: 'Two-Hand', wowhead_id: 33492 },
          { name: 'Amani Divining Staff', boss_name: 'Timed Event', item_slot: 'Two-Hand', wowhead_id: 33494 },
          { name: 'Staff of Dark Mending', boss_name: 'Timed Event', item_slot: 'Two-Hand', wowhead_id: 33490 },
          { name: 'Mana Attuned Band', boss_name: 'Timed Event', item_slot: 'Finger', wowhead_id: 33497 },
          { name: 'Signet of Eternal Life', boss_name: 'Timed Event', item_slot: 'Finger', wowhead_id: 33500 },
          { name: 'Signet of Primal Wrath', boss_name: 'Timed Event', item_slot: 'Finger', wowhead_id: 33496 },
          { name: 'Signet of the Last Defender', boss_name: 'Timed Event', item_slot: 'Finger', wowhead_id: 33499 },
          { name: 'Signet of the Quiet Forest', boss_name: 'Timed Event', item_slot: 'Finger', wowhead_id: 33498 },
        ], 'Timed Event rewards + Amani War Bear')
      }

      // =====================================================
      // SUNWELL PLATEAU - Tier 6 Tokens + Thori'dal
      // =====================================================
      raidTierId = await getRaidTierId(guild.id, 'Sunwell Plateau')
      if (raidTierId) {
        console.log('\n📍 Sunwell Plateau')

        await insertItems(raidTierId, [
          { name: 'Bracers of the Forgotten Conqueror', boss_name: 'Kalecgos', item_slot: 'Token', wowhead_id: 34848 },
          { name: 'Bracers of the Forgotten Protector', boss_name: 'Kalecgos', item_slot: 'Token', wowhead_id: 34851 },
          { name: 'Bracers of the Forgotten Vanquisher', boss_name: 'Kalecgos', item_slot: 'Token', wowhead_id: 34852 },
        ], 'T6 Wrist tokens (Kalecgos)')

        await insertItems(raidTierId, [
          { name: 'Belt of the Forgotten Conqueror', boss_name: 'Brutallus', item_slot: 'Token', wowhead_id: 34853 },
          { name: 'Belt of the Forgotten Protector', boss_name: 'Brutallus', item_slot: 'Token', wowhead_id: 34854 },
          { name: 'Belt of the Forgotten Vanquisher', boss_name: 'Brutallus', item_slot: 'Token', wowhead_id: 34855 },
        ], 'T6 Belt tokens (Brutallus)')

        await insertItems(raidTierId, [
          { name: 'Boots of the Forgotten Conqueror', boss_name: 'Felmyst', item_slot: 'Token', wowhead_id: 34856 },
          { name: 'Boots of the Forgotten Protector', boss_name: 'Felmyst', item_slot: 'Token', wowhead_id: 34857 },
          { name: 'Boots of the Forgotten Vanquisher', boss_name: 'Felmyst', item_slot: 'Token', wowhead_id: 34858 },
        ], 'T6 Boot tokens (Felmyst)')

        await insertItems(raidTierId, [
          { name: 'Blackened Naaru Sliver', boss_name: "M'uru", item_slot: 'Trinket', wowhead_id: 34427 },
          { name: 'Steely Naaru Sliver', boss_name: "M'uru", item_slot: 'Trinket', wowhead_id: 34428 },
          { name: 'Shifting Naaru Sliver', boss_name: "M'uru", item_slot: 'Trinket', wowhead_id: 34429 },
          { name: 'Glimmering Naaru Sliver', boss_name: "M'uru", item_slot: 'Trinket', wowhead_id: 34430 },
        ], "Naaru Sliver trinkets (M'uru)")

        await insertItems(raidTierId, [
          { name: "Thori'dal, the Stars' Fury", boss_name: "Kil'jaeden", item_slot: 'Ranged', wowhead_id: 34334 },
        ], "Thori'dal Legendary (Kil'jaeden)")
      }

      console.log(`\n✅ Completed migration for guild: ${guild.name}`)
    }

    console.log('\n========================================')
    console.log('✅ Complete TBC migration finished!')
    console.log('========================================')
  } catch (err) {
    console.error('❌ Error running migration:', err)
    process.exit(1)
  }
}

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
