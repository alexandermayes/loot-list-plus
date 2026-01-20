import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Mapping of shorthand names to full spec names in database
const specMapping: Record<string, string> = {
  'HPal': 'Paladin Holy',
  'Ret': 'Paladin Retribution',
  'PPal': 'Paladin Protection',
  'RD': 'Druid Restoration',
  'Frl': 'Druid Feral',
  'Bal': 'Druid Balance',
  'Druid': 'Druid Restoration', // Default to Restoration for generic Druid
  'ProtW': 'Warrior Protection',
  'Fury': 'Warrior Arms/Fury',
  'Warrior': 'Warrior Arms/Fury',
  'Tank': 'Warrior Protection', // Assuming tank means Prot Warrior
  'HPri': 'Priest Holy/Disc',
  'Priest': 'Priest Holy/Disc',
  'SP': 'Priest Shadow',
  'Mage': 'Mage Mage',
  'Hunter': 'Hunter Hunter',
  'Warlock': 'Warlock Warlock',
  'Rogue': 'Rogue Rogue',
  'Paladin': 'Paladin Holy', // Default to Holy for generic Paladin
  'Pal': 'Paladin Holy',
  'RS': 'Shaman Restoration',
  'Ele': 'Shaman Elemental',
  'Enh': 'Shaman Enhancement',
  'Shaman': 'Shaman Enhancement', // Default to Enhancement for generic Shaman

  // Role groups for convenience
  'Physical': 'Warrior Arms/Fury', // Will need to handle as role group
  'Caster': 'Mage Mage', // Will need to handle as role group
  'Healer': 'Priest Holy/Disc' // Will need to handle as role group
}

// Item data from the spreadsheet
const itemData = [
  // Reserved Items
  { name: 'Ancient Petrified Leaf', classification: 'Reserved', primary: ['Hunter'], secondary: [] },
  { name: 'Azuresong Mageblade', classification: 'Reserved', primary: ['Mage', 'Warlock'], secondary: ['HPal'] },
  { name: 'Band of Accuria', classification: 'Reserved', primary: ['Rogue', 'Warrior', 'Frl', 'Hunter'], secondary: ['Ret'] },
  { name: 'Cauterizing Band', classification: 'Reserved', primary: ['RD', 'HPri', 'HPal'], secondary: [] },
  { name: 'Choker of the Fire Lord', classification: 'Reserved', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal', 'HPri', 'HPal'] },
  { name: 'Quick Strike Ring', classification: 'Reserved', primary: ['Warrior', 'Ret'], secondary: ['Frl', 'Hunter', 'Rogue'] },
  { name: 'Talisman of Ephemeral Power', classification: 'Reserved', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: 'The Eye of Divinity', classification: 'Reserved', primary: ['HPri'], secondary: ['SP'] },
  { name: "Vis'kag the Bloodletter", classification: 'Reserved', primary: ['Rogue', 'Fury'], secondary: ['Warrior'] },
  { name: 'Core Hound Tooth', classification: 'Reserved', primary: ['Rogue', 'Warrior'], secondary: ['Hunter'] },
  { name: 'Aurastone Hammer', classification: 'Reserved', primary: ['RD', 'SP', 'HPal'], secondary: ['Priest'] },
  { name: 'Brutality Blade', classification: 'Reserved', primary: ['Rogue', 'Warrior'], secondary: ['Hunter', 'Tank'] },
  { name: 'Onslaught Girdle', classification: 'Reserved', primary: ['Warrior'], secondary: ['Ret'] },
  { name: "Perdition's Blade", classification: 'Reserved', primary: ['Rogue', 'Warrior'], secondary: [] },
  { name: 'Ring of Spell Power', classification: 'Reserved', primary: ['Mage', 'Warlock', 'SP'], secondary: ['Bal'] },
  { name: "Striker's Mark", classification: 'Reserved', primary: ['Rogue', 'Fury'], secondary: ['Tank'] },

  // Limited Items
  { name: 'Flameguard Gauntlets', classification: 'Limited', primary: ['Warrior', 'Ret'], secondary: [] },
  { name: 'Mana Igniting Cord', classification: 'Limited', primary: ['Mage', 'Warlock'], secondary: ['Bal', 'Priest', 'Paladin'] },
  { name: 'Salamander Scale Pants', classification: 'Limited', primary: ['RD', 'HPal'], secondary: [] },
  { name: 'Shard of the Scale', classification: 'Limited', primary: ['RD', 'Priest', 'HPal'], secondary: [] },
  { name: 'Wild Growth Spaulders', classification: 'Limited', primary: ['RD', 'HPal'], secondary: [] },
  { name: 'Aged Core Leather Gloves', classification: 'Limited', primary: ['Rogue', 'Tank'], secondary: ['Warrior'] },
  { name: 'Sapphiron Drape', classification: 'Limited', primary: ['Mage', 'Warlock'], secondary: ['RD', 'Priest', 'HPal'] },
  { name: 'Wristguards of Stability', classification: 'Limited', primary: ['Warrior', 'Frl'], secondary: ['Ret', 'Rogue'] },
  { name: 'Cloak of the Shrouded Mists', classification: 'Limited', primary: ['Hunter', 'Rogue', 'Frl', 'ProtW'], secondary: ['Warrior'] },
  { name: 'Gutgore Ripper', classification: 'Limited', primary: ['Rogue'], secondary: [] },
  { name: 'Deathbringer', classification: 'Limited', primary: ['Warrior'], secondary: [] },
  { name: "Bonereaver's Edge", classification: 'Limited', primary: ['Warrior', 'Ret'], secondary: [] },
  { name: 'Head of Onyxia', classification: 'Limited', primary: ['Frl', 'Hunter', 'Rogue', 'Warrior', 'Ret'], secondary: ['RD', 'Mage', 'Priest', 'Warlock', 'Pal'] },

  // Tier items (Limited)
  { name: 'Giantstalker\'s Helmet', classification: 'Limited', primary: [], secondary: [] },
  { name: 'Giantstalker\'s Leggings', classification: 'Limited', primary: [], secondary: [] },
  { name: 'Giantstalker\'s Breastplate', classification: 'Limited', primary: [], secondary: [] },
  { name: 'Giantstalker\'s Epaulets', classification: 'Limited', primary: [], secondary: [] },
  { name: 'Giantstalker\'s Bracers', classification: 'Limited', primary: [], secondary: [] },
  { name: 'Giantstalker\'s Gloves', classification: 'Limited', primary: [], secondary: [] },
  { name: 'Giantstalker\'s Belt', classification: 'Limited', primary: [], secondary: [] },
  { name: 'Giantstalker\'s Boots', classification: 'Limited', primary: [], secondary: [] },

  // Unlimited Items
  { name: 'Ancient Cornerstone Grimoire', classification: 'Unlimited', primary: ['Druid', 'Mage', 'Priest', 'Warlock', 'HPal'], secondary: ['Hunter', 'Rogue', 'Warrior', 'Ret'] },
  { name: 'Band of Sulfuras', classification: 'Unlimited', primary: ['Druid', 'Priest', 'HPal'], secondary: [] },
  { name: 'Blastershot Launcher', classification: 'Unlimited', primary: ['Rogue', 'Warrior'], secondary: ['Hunter'] },
  { name: 'Choker of Enlightenment', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['Priest', 'HPal'] },
  { name: 'Core Forged Greaves', classification: 'Unlimited', primary: ['Tank'], secondary: ['Warrior'] },
  { name: 'Crimson Shocker', classification: 'Unlimited', primary: ['Mage', 'Priest', 'Warlock'], secondary: [] },
  { name: 'Crown of Destruction', classification: 'Unlimited', primary: ['Hunter', 'Warrior', 'Ret'], secondary: ['Paladin'] },
  { name: 'Dragon\'s Blood Cape', classification: 'Unlimited', primary: ['Frl', 'Tank', 'Ret'], secondary: ['Warrior'] },
  { name: 'Drillborer Disk', classification: 'Unlimited', primary: ['Warrior', 'PPal'], secondary: ['Paladin'] },
  { name: 'Earthshaker', classification: 'Unlimited', primary: ['Warrior', 'Ret'], secondary: ['Paladin'] },
  { name: 'Eskhandar\'s Collar', classification: 'Unlimited', primary: ['Frl', 'Hunter', 'Rogue', 'Warrior', 'Ret'], secondary: ['Paladin'] },
  { name: 'Eskhandar\'s Right Claw', classification: 'Unlimited', primary: ['Warrior'], secondary: ['Rogue'] },
  { name: 'Essence of the Pure Flame', classification: 'Unlimited', primary: ['Frl', 'Warrior', 'Ret'], secondary: [] },
  { name: 'Finkle\'s Lava Dredger', classification: 'Unlimited', primary: ['Druid', 'Ret'], secondary: ['Paladin'] },
  { name: 'Fire Runed Grimoire', classification: 'Unlimited', primary: ['Druid', 'Mage', 'Priest', 'Warlock', 'Paladin'], secondary: [] },
  { name: 'Fireguard Shoulders', classification: 'Unlimited', primary: ['Frl', 'Rogue', 'Warrior', 'Paladin'], secondary: ['Druid', 'Hunter'] },
  { name: 'Fireproof Cloak', classification: 'Unlimited', primary: ['Druid', 'Warrior', 'Paladin'], secondary: ['Hunter', 'Mage', 'Priest', 'Warlock'] },
  { name: 'Flamewaker Legplates', classification: 'Unlimited', primary: ['Warrior', 'Ret'], secondary: [] },
  { name: 'Gloves of the Hypnotic Flame', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: [] },
  { name: 'Heavy Dark Iron Ring', classification: 'Unlimited', primary: ['Frl', 'Warrior', 'Paladin'], secondary: [] },
  { name: 'Helm of the Lifegiver', classification: 'Unlimited', primary: ['HPal'], secondary: ['Paladin'] },
  { name: 'Malistar\'s Defender', classification: 'Unlimited', primary: ['Paladin'], secondary: ['Ret'] },
  { name: 'Manastorm Leggings', classification: 'Unlimited', primary: ['RD', 'Priest'], secondary: ['HPal'] },
  { name: 'Medallion of Steadfast Might', classification: 'Unlimited', primary: ['Frl', 'Warrior'], secondary: ['Paladin'] },
  { name: 'Obsidian Edged Blade', classification: 'Unlimited', primary: ['Warrior', 'Ret'], secondary: [] },
  { name: 'Ring of Binding', classification: 'Unlimited', primary: ['Frl', 'Warrior', 'PPal'], secondary: ['Paladin'] },
  { name: 'Robe of Volatile Power', classification: 'Unlimited', primary: ['Bal', 'Warlock'], secondary: ['Mage', 'Priest'] },
  { name: 'Sabatons of the Flamewalker', classification: 'Unlimited', primary: ['Hunter'], secondary: [] },
  { name: 'Sash of Whispered Secrets', classification: 'Unlimited', primary: ['Warlock', 'SP'], secondary: [] },
  { name: 'Seal of the Archmagus', classification: 'Unlimited', primary: ['Warlock', 'Priest', 'Druid', 'Mage', 'Hunter', 'Paladin'], secondary: [] },
  { name: 'Shadowstrike', classification: 'Unlimited', primary: ['Hunter', 'Warrior'], secondary: [] },
  { name: 'Shard of the Flame', classification: 'Unlimited', primary: [], secondary: [] },
  { name: 'Sorcerous Dagger', classification: 'Unlimited', primary: ['Druid', 'Mage', 'Priest', 'Warlock'], secondary: [] },
  { name: 'Spinal Reaper', classification: 'Unlimited', primary: ['Warrior', 'Ret'], secondary: [] },
  { name: 'Staff of Dominance', classification: 'Unlimited', primary: ['Mage', 'Warlock'], secondary: ['Bal', 'Priest'] },
  { name: 'Wristguards of True Flight', classification: 'Unlimited', primary: ['Hunter', 'Warrior'], secondary: ['Ret'] },
]

async function main() {
  console.log('🔄 Starting item classification update from spreadsheet...')

  // Load all class specs
  const { data: classSpecs, error: specsError } = await supabase
    .from('class_specs')
    .select('id, name, wow_classes(name)')

  if (specsError || !classSpecs) {
    console.error('Error loading class specs:', specsError)
    return
  }

  console.log(`✅ Loaded ${classSpecs.length} class specs`)

  // Create a map of spec names to IDs
  const specNameToId: Record<string, { id: string, class_id: string }> = {}

  for (const spec of classSpecs) {
    const className = (spec as any).wow_classes?.name
    const specName = spec.name

    // Store combined name as "ClassName SpecName"
    if (className && specName) {
      const combinedName = `${className} ${specName}`
      specNameToId[combinedName] = { id: spec.id, class_id: (spec as any).class_id }
    }
  }

  console.log('Available specs:', Object.keys(specNameToId).sort())

  let updated = 0
  let notFound = 0
  const notFoundItems: string[] = []

  for (const item of itemData) {
    // Find the item(s) in the database - handle duplicates
    const { data: lootItems, error: itemError } = await supabase
      .from('loot_items')
      .select('id, name')
      .eq('name', item.name)

    if (itemError || !lootItems || lootItems.length === 0) {
      console.log(`❌ Item not found: ${item.name}`)
      notFound++
      notFoundItems.push(item.name)
      continue
    }

    // Update all items with this name (handles duplicates)
    for (const lootItem of lootItems) {
      // Update classification
      const allocationCost = (item.classification === 'Reserved' || item.classification === 'Limited') ? 1 : 0

      const { error: updateError } = await supabase
        .from('loot_items')
        .update({
          classification: item.classification,
          allocation_cost: allocationCost
        })
        .eq('id', lootItem.id)

      if (updateError) {
        console.error(`Error updating classification for ${item.name}:`, updateError)
        continue
      }

      // Clear existing spec assignments
      await supabase
        .from('loot_item_classes')
        .delete()
        .eq('loot_item_id', lootItem.id)

      // Add primary specs
      for (const shorthand of item.primary) {
        const fullSpecName = specMapping[shorthand] || shorthand
        const specInfo = specNameToId[fullSpecName]

        if (specInfo) {
          await supabase
            .from('loot_item_classes')
            .insert({
              loot_item_id: lootItem.id,
              class_id: specInfo.class_id,
              spec_id: specInfo.id,
              spec_type: 'primary'
            })
        } else {
          console.log(`⚠️  Spec not found: ${shorthand} (${fullSpecName}) for ${item.name}`)
        }
      }

      // Add secondary specs
      for (const shorthand of item.secondary) {
        const fullSpecName = specMapping[shorthand] || shorthand
        const specInfo = specNameToId[fullSpecName]

        if (specInfo) {
          await supabase
            .from('loot_item_classes')
            .insert({
              loot_item_id: lootItem.id,
              class_id: specInfo.class_id,
              spec_id: specInfo.id,
              spec_type: 'secondary'
            })
        } else {
          console.log(`⚠️  Spec not found: ${shorthand} (${fullSpecName}) for ${item.name}`)
        }
      }
    }

    console.log(`✅ Updated: ${item.name} (${item.classification}) - ${lootItems.length} item(s)`)
    updated++
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Not found: ${notFound}`)

  if (notFoundItems.length > 0) {
    console.log(`\n❌ Items not found in database:`)
    notFoundItems.forEach(name => console.log(`   - ${name}`))
  }

  console.log('\n✅ Done!')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
