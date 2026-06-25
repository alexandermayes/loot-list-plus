import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// TBC Raid tier IDs
const RAID_TIERS = {
  GRUULS_LAIR: '6dd067dd-f45e-487c-9e0c-c7e7be462fe3',
  MAGTHERIDONS_LAIR: '0fc45ad9-ac6c-424e-8a33-53d52140e1f0',
  SSC: '53bbf0ce-b4d4-488f-9432-dc4749afd0f4',
  TK: 'd4cb1538-9226-49ec-9c1b-b88871ae82ec'
}

// Missing items to add
const missingItems = [
  // Gruul's Lair
  {
    name: 'Shuriken of Negation',
    wowhead_id: 28830,
    raid_tier_id: RAID_TIERS.GRUULS_LAIR,
    item_slot: 'Thrown',
    boss_name: 'Gruul the Dragonkiller'
  },

  // Magtheridon's Lair - Magtheridon's Head is a quest item, skipping

  // Serpentshrine Cavern
  {
    name: 'Wildfury Greatstaff',
    wowhead_id: 30883,
    raid_tier_id: RAID_TIERS.SSC,
    item_slot: 'Two-Hand',
    boss_name: 'Leotheras the Blind'
  },
  {
    name: 'Serpentshrine Shuriken',
    wowhead_id: 30025,
    raid_tier_id: RAID_TIERS.SSC,
    item_slot: 'Thrown',
    boss_name: 'Hydross the Unstable'
  },
  {
    name: 'Boots of Courage Unending',
    wowhead_id: 30098,
    raid_tier_id: RAID_TIERS.SSC,
    item_slot: 'Feet',
    boss_name: 'The Lurker Below'
  },
  {
    name: 'Pendant of the Perilous',
    wowhead_id: 30022,
    raid_tier_id: RAID_TIERS.SSC,
    item_slot: 'Neck',
    boss_name: 'Hydross the Unstable'
  },
  {
    name: 'Spyglass of the Hidden Fleet',
    wowhead_id: 30001,
    raid_tier_id: RAID_TIERS.SSC,
    item_slot: 'Trinket',
    boss_name: 'The Lurker Below'
  },
  {
    name: 'Totem of the Maelstrom',
    wowhead_id: 30023,
    raid_tier_id: RAID_TIERS.SSC,
    item_slot: 'Relic',
    boss_name: 'Hydross the Unstable'
  },

  // Tempest Keep
  {
    name: 'The Nexus Key',
    wowhead_id: 30095,
    raid_tier_id: RAID_TIERS.TK,
    item_slot: 'Main Hand',
    boss_name: "Kael'thas Sunstrider"
  },
  {
    name: 'Sunhawk Leggings',
    wowhead_id: 30134,
    raid_tier_id: RAID_TIERS.TK,
    item_slot: 'Legs',
    boss_name: 'High Astromancer Solarian'
  },
  {
    name: 'Royal Gauntlets of Silvermoon',
    wowhead_id: 30106,
    raid_tier_id: RAID_TIERS.TK,
    item_slot: 'Hands',
    boss_name: "Kael'thas Sunstrider"
  },
  {
    name: 'Thalassian Wildercloak',
    wowhead_id: 30135,
    raid_tier_id: RAID_TIERS.TK,
    item_slot: 'Back',
    boss_name: 'High Astromancer Solarian'
  },
  {
    name: 'Band of the Ranger-General',
    wowhead_id: 30102,
    raid_tier_id: RAID_TIERS.TK,
    item_slot: 'Finger',
    boss_name: "Kael'thas Sunstrider"
  }
]

async function main() {
  console.log('Adding missing TBC items to database...\n')

  let added = 0
  let skipped = 0

  for (const item of missingItems) {
    // Check if item already exists
    const { data: existing } = await supabase
      .from('loot_items')
      .select('id, name')
      .eq('name', item.name)
      .eq('raid_tier_id', item.raid_tier_id)
      .single()

    if (existing) {
      console.log(`Skipping: ${item.name} (already exists)`)
      skipped++
      continue
    }

    // Insert the item
    const { error } = await supabase
      .from('loot_items')
      .insert({
        name: item.name,
        wowhead_id: item.wowhead_id,
        raid_tier_id: item.raid_tier_id,
        item_slot: item.item_slot,
        boss_name: item.boss_name,
        classification: 'Unlimited', // Default, will be updated by classification script
        allocation_cost: 0,
        is_available: true
      })

    if (error) {
      console.error(`Error adding ${item.name}:`, error)
    } else {
      console.log(`Added: ${item.name}`)
      added++
    }
  }

  console.log(`\nSummary:`)
  console.log(`  Added: ${added}`)
  console.log(`  Skipped: ${skipped}`)

  // Now run the classification update for these new items
  if (added > 0) {
    console.log('\nUpdating classifications for new items...')

    // Re-run classification for the newly added items
    const specMapping: Record<string, string> = {
      'HPal': 'Paladin Holy',
      'Ret': 'Paladin Retribution',
      'PPal': 'Paladin Protection',
      'RD': 'Druid Restoration',
      'Frl': 'Druid Feral',
      'Bal': 'Druid Balance',
      'ProtW': 'Warrior Protection',
      'Fury': 'Warrior Arms/Fury',
      'HPri': 'Priest Holy/Disc',
      'SP': 'Priest Shadow',
      'Mage': 'Mage Mage',
      'Hunter': 'Hunter Hunter',
      'Warlock': 'Warlock Warlock',
      'Rogue': 'Rogue Rogue',
      'RS': 'Shaman Restoration',
      'Ele': 'Shaman Elemental',
      'Enh': 'Shaman Enhancement',
    }

    const itemClassifications = [
      { name: 'Shuriken of Negation', classification: 'Unlimited', primary: ['Rogue', 'Fury', 'ProtW', 'Hunter'], secondary: [] },
      { name: 'Wildfury Greatstaff', classification: 'Reserved', primary: ['Frl'], secondary: [] },
      { name: 'Serpentshrine Shuriken', classification: 'Unlimited', primary: ['Rogue', 'Fury', 'ProtW', 'Hunter'], secondary: [] },
      { name: 'Boots of Courage Unending', classification: 'Unlimited', primary: ['HPri', 'RD', 'HPal', 'RS'], secondary: [] },
      { name: 'Pendant of the Perilous', classification: 'Limited', primary: ['Rogue', 'Fury', 'Hunter', 'Frl', 'Ret', 'Enh'], secondary: [] },
      { name: 'Spyglass of the Hidden Fleet', classification: 'Limited', primary: ['ProtW', 'PPal', 'Frl'], secondary: ['Fury'] },
      { name: 'Totem of the Maelstrom', classification: 'Unlimited', primary: ['RS', 'Ele', 'Enh'], secondary: [] },
      { name: 'The Nexus Key', classification: 'Reserved', primary: ['Mage', 'Warlock', 'SP', 'Ele', 'Bal'], secondary: [] },
      { name: 'Sunhawk Leggings', classification: 'Unlimited', primary: ['HPri', 'RD', 'HPal', 'RS'], secondary: [] },
      { name: 'Royal Gauntlets of Silvermoon', classification: 'Unlimited', primary: ['ProtW', 'PPal', 'Frl'], secondary: [] },
      { name: 'Thalassian Wildercloak', classification: 'Unlimited', primary: ['Rogue', 'Fury', 'Hunter', 'Frl', 'Ret', 'Enh'], secondary: [] },
      { name: 'Band of the Ranger-General', classification: 'Reserved', primary: ['Rogue', 'Fury', 'Hunter', 'Frl', 'Ret', 'Enh'], secondary: [] },
    ]

    // Load class specs
    const { data: classSpecs } = await supabase
      .from('class_specs')
      .select('id, name, class_id, wow_classes(name)')

    if (!classSpecs) {
      console.error('Failed to load class specs')
      return
    }

    const specNameToId: Record<string, { id: string, class_id: string }> = {}
    for (const spec of classSpecs) {
      const className = (spec as { wow_classes?: { name?: string } | null }).wow_classes?.name
      const specName = spec.name
      if (className && specName) {
        specNameToId[`${className} ${specName}`] = { id: spec.id, class_id: spec.class_id }
      }
    }

    for (const item of itemClassifications) {
      const { data: lootItems } = await supabase
        .from('loot_items')
        .select('id, name')
        .eq('name', item.name)

      if (!lootItems || lootItems.length === 0) continue

      for (const lootItem of lootItems) {
        const allocationCost = (item.classification === 'Reserved' || item.classification === 'Limited') ? 1 : 0

        await supabase
          .from('loot_items')
          .update({
            classification: item.classification,
            allocation_cost: allocationCost
          })
          .eq('id', lootItem.id)

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
            await supabase.from('loot_item_classes').insert({
              loot_item_id: lootItem.id,
              class_id: specInfo.class_id,
              spec_id: specInfo.id,
              spec_type: 'primary'
            })
          }
        }

        // Add secondary specs
        for (const shorthand of item.secondary) {
          const fullSpecName = specMapping[shorthand] || shorthand
          const specInfo = specNameToId[fullSpecName]
          if (specInfo) {
            await supabase.from('loot_item_classes').insert({
              loot_item_id: lootItem.id,
              class_id: specInfo.class_id,
              spec_id: specInfo.id,
              spec_type: 'secondary'
            })
          }
        }

        console.log(`  Updated classification: ${item.name} (${item.classification})`)
      }
    }
  }

  console.log('\nDone!')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
