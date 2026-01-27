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
  'Tank': 'Warrior Protection', // Generic tank - will expand
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
}

// Expand generic terms to specific specs
const expandSpecs = (specs: string[]): string[] => {
  const result: string[] = []
  for (const spec of specs) {
    if (spec === 'Physical') {
      result.push('Rogue', 'Fury', 'Hunter', 'Frl', 'Ret', 'Enh')
    } else if (spec === 'Caster') {
      result.push('Mage', 'Warlock', 'SP', 'Ele', 'Bal')
    } else if (spec === 'Healer') {
      result.push('HPri', 'RD', 'HPal', 'RS')
    } else if (spec === 'Tank') {
      result.push('ProtW', 'PPal', 'Frl') // Include bear tanks
    } else if (spec === 'All') {
      result.push('Rogue', 'Fury', 'Hunter', 'Frl', 'Ret', 'Enh', 'Mage', 'Warlock', 'SP', 'Ele', 'Bal', 'HPri', 'RD', 'HPal', 'RS', 'ProtW', 'PPal')
    } else if (spec === 'Druid') {
      result.push('RD', 'Frl', 'Bal')
    } else if (spec === 'Shaman') {
      result.push('RS', 'Ele', 'Enh')
    } else if (spec === 'Priest') {
      result.push('HPri', 'SP')
    } else if (spec === 'Paladin') {
      result.push('HPal', 'Ret', 'PPal')
    } else if (spec === 'Warrior') {
      result.push('Fury', 'ProtW')
    } else {
      result.push(spec)
    }
  }
  // Remove duplicates
  return [...new Set(result)]
}

// TBC Item data from raids: Gruul's Lair, Magtheridon's Lair, Serpentshrine Cavern, Tempest Keep
const itemData = [
  // ============================================================================
  // GRUUL'S LAIR
  // ============================================================================
  { name: 'Hammer of the Naaru', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Belt of Divine Inspiration', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Malefic Mask of the Shadows', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: "Maulgar's Warhelm", classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Bladespire Warbands', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Brute Cloak of the Ogre-Magi', classification: 'Unlimited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Aldori Legacy Defender', classification: 'Limited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Axe of the Gronn Lords', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Bloodmaw Magus-Blade', classification: 'Limited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: "Collar of Cho'gall", classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: "Cowl of Nature's Breath", classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Gronn-Stitched Girdle', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Gauntlets of the Dragonslayer', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Windshear Boots', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Gauntlets of Martial Perfection', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Dragonspine Trophy', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Eye of Gruul', classification: 'Reserved', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Teeth of Gruul', classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Shuriken of Negation', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },

  // ============================================================================
  // MAGTHERIDON'S LAIR
  // ============================================================================
  { name: 'Glaive of the Pit', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Aegis of the Vindicator', classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Crystalheart Pulse-Staff', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Eredar Wand of Obliteration', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: "Soul-Eater's Handwraps", classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: "Liar's Tongue Gloves", classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Terror Pit Girdle', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Girdle of the Endless Pit', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Thundering Greathelm', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Cloak of the Pit Stalker', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Eye of Magtheridon', classification: 'Unlimited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Karaborian Talisman', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: "Magtheridon's Head", classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },

  // ============================================================================
  // SERPENTSHRINE CAVERN
  // ============================================================================
  { name: 'Wildfury Greatstaff', classification: 'Reserved', primary: ['Frl'], secondary: [] },
  { name: 'Serpentshrine Shuriken', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Boots of Courage Unending', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Pendant of the Perilous', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Spyglass of the Hidden Fleet', classification: 'Limited', primary: expandSpecs(['Tank']), secondary: ['Fury'] },
  { name: 'Totem of the Maelstrom', classification: 'Unlimited', primary: expandSpecs(['Shaman']), secondary: [] },
  { name: 'Boots of the Shifting Nightmare', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Robe of Hateful Echoes', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Wraps of Purification', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Shoulderpads of the Stranger', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Blackfathom Warbands', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: "Ranger-General's Chestguard", classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Brighthelm of Justice', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Pauldrons of the Wardancer', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Fathomstone', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Idol of the Crescent Goddess', classification: 'Unlimited', primary: ['RD', 'Bal'], secondary: [] },
  { name: 'Living Root of the Wildheart', classification: 'Unlimited', primary: ['Frl', 'RD', 'Bal'], secondary: [] },
  { name: 'Ring of Lethality', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Scarab of Displacement', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Band of Vile Aggression', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Mallet of the Tides', classification: 'Reserved', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Cord of Screaming Terrors', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Velvet Boots of the Guardian', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Boots of Effortless Striking', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Grove-Bands of Remulos', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Tempest-Strider Boots', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Bracers of Eradication', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Glowing Breastplate of Truth', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Ancestral Ring of Conquest', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Choker of Animalistic Fury', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Earring of Soulful Meditation', classification: 'Unlimited', primary: ['HPri', 'SP'], secondary: [] },
  { name: 'Libram of Absolute Truth', classification: 'Unlimited', primary: ['HPal', 'Ret', 'PPal'], secondary: [] },
  { name: 'The Seal of Danzalar', classification: 'Unlimited', primary: [...expandSpecs(['Caster']), ...expandSpecs(['Tank'])], secondary: [] },
  { name: 'Fang of the Leviathan', classification: 'Reserved', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Orca-Hide Boots', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: expandSpecs(['Caster']) },
  { name: 'Coral-Barbed Shoulderpads', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'True-Aim Stalker Bands', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Girdle of the Invulnerable', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Tsunami Talisman', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'World Breaker', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Soul-Strider Boots', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: "Bloodsea Brigand's Vest", classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Fathom-Brooch of the Tidewalker', classification: 'Unlimited', primary: expandSpecs(['Shaman']), secondary: [] },
  { name: 'Frayed Tether of the Drowned', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Sextant of Unstable Currents', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Luminescent Rod of the Naaru', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Talon of Azshara', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Illidari Shoulderpads', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Gnarled Chestpiece of the Ancients', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Girdle of the Tidal Call', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Mantle of the Tireless Tracker', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Pauldrons of the Argent Sentinel', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Warboots of Obliteration', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Razor-Scale Battlecloak', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Pendant of the Lost Ages', classification: 'Unlimited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Ring of Sundered Souls', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Serpent-Coil Braid', classification: 'Unlimited', primary: ['Mage'], secondary: [] },
  { name: 'Band of the Vigilant', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Fang of Vashj', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Lightfathom Scepter', classification: 'Reserved', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Serpent Spine Longbow', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Vestments of the Sea-Witch', classification: 'Reserved', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Belt of One-Hundred Deaths', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: [] },
  { name: "Runetotem's Mantle", classification: 'Reserved', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Cobra-Lash Boots', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Glorious Gauntlets of Crestfall', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Krakken-Heart Breastplate', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Coral Band of the Revived', classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Prism of Inner Calm', classification: 'Unlimited', primary: [...expandSpecs(['Caster']), ...expandSpecs(['Physical'])], secondary: [] },
  { name: 'Ring of Endless Coils', classification: 'Reserved', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },

  // ============================================================================
  // TEMPEST KEEP: THE EYE
  // ============================================================================
  { name: 'Fire-Cord of the Magus', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Mantle of the Elven Kings', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Bark-Gloves of Ancient Wisdom', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Bands of the Celestial Archer', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Girdle of Fallen Stars', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Seventh Ring of the Tirisfalen', classification: 'Limited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Arcanite Steam-Pistol', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Claw of the Phoenix', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Talon of the Phoenix', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Netherbane', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Mindstorm Wristbands', classification: 'Reserved', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Gloves of the Searing Grip', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Fire Crest Breastplate', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Phoenix-Wing Cloak', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: "Band of Al'ar", classification: 'Unlimited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Phoenix-Ring of Rebirth', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Talisman of the Sun King', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: "Talon of Al'ar", classification: 'Unlimited', primary: ['Hunter'], secondary: [] },
  { name: 'Tome of Fiery Redemption', classification: 'Unlimited', primary: ['HPal', 'Ret', 'PPal'], secondary: [] },
  { name: 'Cowl of the Grand Engineer', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Girdle of Zaetar', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Void Reaver Greaves', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Fel-Steel Warhelm', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Wristguards of Determination', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: "Fel Reaver's Piston", classification: 'Limited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Warp-Spring Coil', classification: 'Unlimited', primary: ['Rogue'], secondary: [] },
  { name: 'Ethereum Life-Staff', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Heartrazor', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Wand of the Forgotten Star', classification: 'Limited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Star-Soul Breeches', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Trousers of the Astromancer', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Vambraces of Ending', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Star-Strider Boots', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Worldstorm Gauntlets', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Boots of the Resilient', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Girdle of the Righteous Path', classification: 'Unlimited', primary: ['HPal', 'Ret', 'PPal'], secondary: [] },
  { name: 'Greaves of the Bloodwarder', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: "Solarian's Sapphire", classification: 'Unlimited', primary: ['Fury', 'ProtW'], secondary: [] },
  { name: 'Void Star Talisman', classification: 'Unlimited', primary: ['Warlock'], secondary: [] },
  { name: 'Rod of the Sun King', classification: 'Limited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'The Nexus Key', classification: 'Reserved', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Twinblade of the Phoenix', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Crown of the Sun', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Gauntlets of the Sun King', classification: 'Unlimited', primary: expandSpecs(['Caster']), secondary: [] },
  { name: 'Leggings of Murderous Intent', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Sunhawk Leggings', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Royal Gauntlets of Silvermoon', classification: 'Unlimited', primary: expandSpecs(['Tank']), secondary: [] },
  { name: 'Royal Cloak of the Sunstriders', classification: 'Limited', primary: [...expandSpecs(['Caster']), 'PPal'], secondary: [] },
  { name: 'Sunshower Light Cloak', classification: 'Unlimited', primary: expandSpecs(['Healer']), secondary: [] },
  { name: 'Thalassian Wildercloak', classification: 'Unlimited', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Band of the Ranger-General', classification: 'Reserved', primary: expandSpecs(['Physical']), secondary: [] },
  { name: 'Verdant Sphere', classification: 'Limited', primary: expandSpecs(['All']), secondary: [] },
]

async function main() {
  console.log('Starting TBC item classification update...')
  console.log(`Processing ${itemData.length} items from Gruul\'s Lair, Magtheridon\'s Lair, Serpentshrine Cavern, and Tempest Keep...\n`)

  // Load all class specs
  const { data: classSpecs, error: specsError } = await supabase
    .from('class_specs')
    .select('id, name, class_id, wow_classes(name)')

  if (specsError || !classSpecs) {
    console.error('Error loading class specs:', specsError)
    return
  }

  console.log(`Loaded ${classSpecs.length} class specs`)

  // Create a map of spec names to IDs
  const specNameToId: Record<string, { id: string, class_id: string }> = {}

  for (const spec of classSpecs) {
    const className = (spec as any).wow_classes?.name
    const specName = spec.name

    // Store combined name as "ClassName SpecName"
    if (className && specName) {
      const combinedName = `${className} ${specName}`
      specNameToId[combinedName] = { id: spec.id, class_id: spec.class_id }
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
          console.warn(`  Warning: Unknown spec "${shorthand}" (mapped to "${fullSpecName}") for item "${item.name}"`)
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
          console.warn(`  Warning: Unknown spec "${shorthand}" (mapped to "${fullSpecName}") for item "${item.name}"`)
        }
      }
    }

    console.log(`Updated: ${item.name} (${item.classification}) - ${lootItems.length} item(s)`)
    updated++
  }

  console.log(`\nSummary:`)
  console.log(`   Updated: ${updated}`)
  console.log(`   Not found: ${notFound}`)

  if (notFoundItems.length > 0) {
    console.log(`\nItems not found in database:`)
    notFoundItems.forEach(name => console.log(`   - ${name}`))
  }

  console.log('\nDone!')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
