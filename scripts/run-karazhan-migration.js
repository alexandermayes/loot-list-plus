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

async function runMigration() {
  console.log('🔄 Running Karazhan loot items migration...')

  try {
    // Get all Karazhan raid tiers
    const { data: raidTiers, error: rtError } = await supabase
      .from('raid_tiers')
      .select('id, name, expansion_id')
      .eq('name', 'Karazhan')

    if (rtError) {
      console.error('Error fetching Karazhan raid tiers:', rtError.message)
      process.exit(1)
    }

    const count = raidTiers ? raidTiers.length : 0
    console.log(`Found ${count} Karazhan raid tier(s)`)

    if (!raidTiers || raidTiers.length === 0) {
      console.log('No Karazhan raid tiers found. Nothing to migrate.')
      return
    }

    for (const rt of raidTiers) {
      // Get guild name via expansion
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
      console.log(`\nProcessing Karazhan for guild: ${guildName}`)

      // Delete existing items for bosses we're replacing
      const { error: delError } = await supabase
        .from('loot_items')
        .delete()
        .eq('raid_tier_id', rt.id)
        .in('boss_name', ["Servant's Quarters", "Hyakiss the Lurker", "Rokad the Ravager", "Shadikith the Glider", "Attumen the Huntsman", "Chess Event", "Echo of Medivh"])

      if (delError) {
        console.error(`  Error deleting items: ${delError.message}`)
        continue
      }
      console.log('  ✓ Deleted old items')

      // Insert Servant's Quarters items
      const servantsQuartersItems = [
        { name: "Lurker's Cord", boss_name: "Servant's Quarters", item_slot: 'Waist', wowhead_id: 30675 },
        { name: "Lurker's Grasp", boss_name: "Servant's Quarters", item_slot: 'Waist', wowhead_id: 30676 },
        { name: "Lurker's Belt", boss_name: "Servant's Quarters", item_slot: 'Waist', wowhead_id: 30677 },
        { name: "Lurker's Girdle", boss_name: "Servant's Quarters", item_slot: 'Waist', wowhead_id: 30678 },
        { name: "Ravager's Cuffs", boss_name: "Servant's Quarters", item_slot: 'Wrist', wowhead_id: 30684 },
        { name: "Ravager's Wrist-Wraps", boss_name: "Servant's Quarters", item_slot: 'Wrist', wowhead_id: 30685 },
        { name: "Ravager's Bands", boss_name: "Servant's Quarters", item_slot: 'Wrist', wowhead_id: 30686 },
        { name: "Ravager's Bracers", boss_name: "Servant's Quarters", item_slot: 'Wrist', wowhead_id: 30687 },
        { name: "Glider's Foot-Wraps", boss_name: "Servant's Quarters", item_slot: 'Feet', wowhead_id: 30680 },
        { name: "Glider's Boots", boss_name: "Servant's Quarters", item_slot: 'Feet', wowhead_id: 30681 },
        { name: "Glider's Sabatons", boss_name: "Servant's Quarters", item_slot: 'Feet', wowhead_id: 30682 },
        { name: "Glider's Greaves", boss_name: "Servant's Quarters", item_slot: 'Feet', wowhead_id: 30683 },
      ].map(item => ({ ...item, raid_tier_id: rt.id, is_available: true }))

      const { error: sqError } = await supabase.from('loot_items').insert(servantsQuartersItems)
      if (sqError) console.error(`  Error inserting Servant's Quarters: ${sqError.message}`)
      else console.log("  ✓ Added Servant's Quarters items (12)")

      // Insert Attumen items
      const attunenItems = [
        { name: 'Spectral Band of Innervation', boss_name: 'Attumen the Huntsman', item_slot: 'Finger', wowhead_id: 28510 },
        { name: 'Worgen Claw Necklace', boss_name: 'Attumen the Huntsman', item_slot: 'Neck', wowhead_id: 28509 },
        { name: 'Gloves of Saintly Blessings', boss_name: 'Attumen the Huntsman', item_slot: 'Hands', wowhead_id: 28508 },
        { name: 'Handwraps of Flowing Thought', boss_name: 'Attumen the Huntsman', item_slot: 'Hands', wowhead_id: 28507 },
        { name: 'Harbinger Bands', boss_name: 'Attumen the Huntsman', item_slot: 'Wrist', wowhead_id: 28477 },
        { name: 'Gloves of Dexterous Manipulation', boss_name: 'Attumen the Huntsman', item_slot: 'Hands', wowhead_id: 28506 },
        { name: 'Bracers of the White Stag', boss_name: 'Attumen the Huntsman', item_slot: 'Wrist', wowhead_id: 28453 },
        { name: 'Whirlwind Bracers', boss_name: 'Attumen the Huntsman', item_slot: 'Wrist', wowhead_id: 28503 },
        { name: "Stalker's War Bands", boss_name: 'Attumen the Huntsman', item_slot: 'Wrist', wowhead_id: 28454 },
        { name: 'Gauntlets of Renewed Hope', boss_name: 'Attumen the Huntsman', item_slot: 'Hands', wowhead_id: 28505 },
        { name: 'Vambraces of Courage', boss_name: 'Attumen the Huntsman', item_slot: 'Wrist', wowhead_id: 28502 },
        { name: 'Steelhawk Crossbow', boss_name: 'Attumen the Huntsman', item_slot: 'Ranged', wowhead_id: 28504 },
        { name: "Fiery Warhorse's Reins", boss_name: 'Attumen the Huntsman', item_slot: 'Mount', wowhead_id: 30480 },
        { name: 'Schematic: Stabilized Eternium Scope', boss_name: 'Attumen the Huntsman', item_slot: 'Recipe', wowhead_id: 23809 },
      ].map(item => ({ ...item, raid_tier_id: rt.id, is_available: true }))

      const { error: attError } = await supabase.from('loot_items').insert(attunenItems)
      if (attError) console.error(`  Error inserting Attumen: ${attError.message}`)
      else console.log('  ✓ Added Attumen the Huntsman items (14)')

      // Insert Chess Event items
      const chessItems = [
        { name: 'Ring of Recurrence', boss_name: 'Chess Event', item_slot: 'Finger', wowhead_id: 28753 },
        { name: 'Mithril Chain of Heroism', boss_name: 'Chess Event', item_slot: 'Neck', wowhead_id: 28745 },
        { name: 'Headdress of the High Potentate', boss_name: 'Chess Event', item_slot: 'Head', wowhead_id: 28756 },
        { name: 'Bladed Shoulderpads of the Merciless', boss_name: 'Chess Event', item_slot: 'Shoulder', wowhead_id: 28755 },
        { name: 'Forestlord Striders', boss_name: 'Chess Event', item_slot: 'Feet', wowhead_id: 28752 },
        { name: 'Girdle of Treachery', boss_name: 'Chess Event', item_slot: 'Waist', wowhead_id: 28750 },
        { name: 'Fiend Slayer Boots', boss_name: 'Chess Event', item_slot: 'Feet', wowhead_id: 28746 },
        { name: 'Heart-Flame Leggings', boss_name: 'Chess Event', item_slot: 'Legs', wowhead_id: 28751 },
        { name: 'Legplates of the Innocent', boss_name: 'Chess Event', item_slot: 'Legs', wowhead_id: 28748 },
        { name: 'Battlescar Boots', boss_name: 'Chess Event', item_slot: 'Feet', wowhead_id: 28747 },
        { name: 'Triptych Shield of the Ancients', boss_name: 'Chess Event', item_slot: 'Off Hand', wowhead_id: 28754 },
        { name: "King's Defender", boss_name: 'Chess Event', item_slot: 'One-Hand', wowhead_id: 28749 },
      ].map(item => ({ ...item, raid_tier_id: rt.id, is_available: true }))

      const { error: chessError } = await supabase.from('loot_items').insert(chessItems)
      if (chessError) console.error(`  Error inserting Chess Event: ${chessError.message}`)
      else console.log('  ✓ Added Chess Event items (12)')

      // Add tier tokens to The Curator
      const curatorTokens = [
        { name: 'Gloves of the Fallen Hero', boss_name: 'The Curator', item_slot: 'Token', wowhead_id: 29756 },
        { name: 'Gloves of the Fallen Champion', boss_name: 'The Curator', item_slot: 'Token', wowhead_id: 29757 },
        { name: 'Gloves of the Fallen Defender', boss_name: 'The Curator', item_slot: 'Token', wowhead_id: 29758 },
      ].map(item => ({ ...item, raid_tier_id: rt.id, is_available: true }))

      const { error: curError } = await supabase.from('loot_items').insert(curatorTokens)
      if (curError) console.error(`  Error inserting Curator tokens: ${curError.message}`)
      else console.log('  ✓ Added Curator T4 Glove tokens (3)')

      // Add tier tokens to Prince Malchezaar
      const princeTokens = [
        { name: 'Helm of the Fallen Hero', boss_name: 'Prince Malchezaar', item_slot: 'Token', wowhead_id: 29759 },
        { name: 'Helm of the Fallen Champion', boss_name: 'Prince Malchezaar', item_slot: 'Token', wowhead_id: 29760 },
        { name: 'Helm of the Fallen Defender', boss_name: 'Prince Malchezaar', item_slot: 'Token', wowhead_id: 29761 },
      ].map(item => ({ ...item, raid_tier_id: rt.id, is_available: true }))

      const { error: princeError } = await supabase.from('loot_items').insert(princeTokens)
      if (princeError) console.error(`  Error inserting Prince tokens: ${princeError.message}`)
      else console.log('  ✓ Added Prince Malchezaar T4 Helm tokens (3)')

      // Add recipes
      const recipes = [
        { name: 'Formula: Enchant Weapon - Mongoose', boss_name: 'Moroes', item_slot: 'Recipe', wowhead_id: 22559 },
        { name: 'Formula: Enchant Weapon - Soulfrost', boss_name: 'Terestian Illhoof', item_slot: 'Recipe', wowhead_id: 22561 },
        { name: 'Formula: Enchant Weapon - Sunfire', boss_name: 'Shade of Aran', item_slot: 'Recipe', wowhead_id: 22560 },
      ].map(item => ({ ...item, raid_tier_id: rt.id, is_available: true }))

      const { error: recError } = await supabase.from('loot_items').insert(recipes)
      if (recError) console.error(`  Error inserting recipes: ${recError.message}`)
      else console.log('  ✓ Added enchanting recipes (3)')

      // Remove Prince Tenris if exists
      const { error: tenrisError } = await supabase
        .from('loot_items')
        .delete()
        .eq('raid_tier_id', rt.id)
        .ilike('boss_name', '%Prince Tenris%')

      if (!tenrisError) console.log('  ✓ Removed Prince Tenris items (if any)')

      console.log(`✅ Completed migration for guild: ${guildName}`)
    }

    console.log('\n✅ Karazhan migration completed successfully')
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
