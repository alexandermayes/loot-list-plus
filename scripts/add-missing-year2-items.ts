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
  HYJAL: 'fae61db4-7e78-47df-839a-5a90e022f59a',
  BLACK_TEMPLE: '458d1fbb-ebfb-46ea-acc1-d4f0e984bd07',
  ZULAMAN: '38c08c4c-a5e9-4ad7-bc04-d3f7602e09d9',
  SUNWELL: 'a6c84c41-5aed-46ab-8396-e818bbff9524'
}

// Missing items to add with Wowhead IDs
const missingItems = [
  // BLACK TEMPLE
  { name: 'Ring of Ancient Knowledge', wowhead_id: 32527, raid_tier_id: RAID_TIERS.BLACK_TEMPLE, item_slot: 'Finger', boss_name: 'Trash' },
  { name: 'Warglaive of Azzinoth', wowhead_id: 32837, raid_tier_id: RAID_TIERS.BLACK_TEMPLE, item_slot: 'Main Hand', boss_name: 'Illidan Stormrage' },
  { name: 'Cloak of Fiends', wowhead_id: 32590, raid_tier_id: RAID_TIERS.BLACK_TEMPLE, item_slot: 'Back', boss_name: 'Trash' },
  { name: 'Shroud of the Final Stand', wowhead_id: 32524, raid_tier_id: RAID_TIERS.BLACK_TEMPLE, item_slot: 'Back', boss_name: 'Trash' },
  { name: 'Tide-Stomper\'s Greaves', wowhead_id: 32243, raid_tier_id: RAID_TIERS.BLACK_TEMPLE, item_slot: 'Feet', boss_name: 'High Warlord Naj\'entus' },
  { name: 'Pillager\'s Gauntlets', wowhead_id: 32528, raid_tier_id: RAID_TIERS.BLACK_TEMPLE, item_slot: 'Hands', boss_name: 'Trash' },
  { name: 'Cowl of Benevolence', wowhead_id: 32329, raid_tier_id: RAID_TIERS.BLACK_TEMPLE, item_slot: 'Head', boss_name: 'Teron Gorefiend' },
  { name: 'Starstalker Legguards', wowhead_id: 32487, raid_tier_id: RAID_TIERS.BLACK_TEMPLE, item_slot: 'Legs', boss_name: 'Illidan Stormrage' },
  { name: 'Illidari Runeshield', wowhead_id: 32523, raid_tier_id: RAID_TIERS.BLACK_TEMPLE, item_slot: 'Off Hand', boss_name: 'Trash' },
  { name: 'Blood-Cursed Shoulderpads', wowhead_id: 32338, raid_tier_id: RAID_TIERS.BLACK_TEMPLE, item_slot: 'Shoulder', boss_name: 'Gurtogg Bloodboil' },
  { name: 'Shadow-Walker\'s Cord', wowhead_id: 32324, raid_tier_id: RAID_TIERS.BLACK_TEMPLE, item_slot: 'Waist', boss_name: 'Shade of Akama' },
  { name: 'Rifle of the Stoic Guardian', wowhead_id: 32336, raid_tier_id: RAID_TIERS.BLACK_TEMPLE, item_slot: 'Ranged', boss_name: 'Teron Gorefiend' },
  { name: 'Twisted Blades of Zarak', wowhead_id: 32330, raid_tier_id: RAID_TIERS.BLACK_TEMPLE, item_slot: 'Thrown', boss_name: 'Teron Gorefiend' },

  // HYJAL SUMMIT
  { name: 'Nethervoid Cloak', wowhead_id: 32609, raid_tier_id: RAID_TIERS.HYJAL, item_slot: 'Back', boss_name: 'Trash' },
  { name: 'Pepe\'s Shroud of Pacification', wowhead_id: 32611, raid_tier_id: RAID_TIERS.HYJAL, item_slot: 'Back', boss_name: 'Trash' },
  { name: 'Hellfire-Encased Pendant', wowhead_id: 32589, raid_tier_id: RAID_TIERS.HYJAL, item_slot: 'Neck', boss_name: 'Trash' },
  { name: 'Bow-Stitched Leggings', wowhead_id: 32285, raid_tier_id: RAID_TIERS.HYJAL, item_slot: 'Legs', boss_name: 'Azgalor' },
  { name: 'Beast-Tamer\'s Shoulders', wowhead_id: 32252, raid_tier_id: RAID_TIERS.HYJAL, item_slot: 'Shoulder', boss_name: 'Kaz\'rogal' },
  { name: 'Blood-Stained Pauldrons', wowhead_id: 32262, raid_tier_id: RAID_TIERS.HYJAL, item_slot: 'Shoulder', boss_name: 'Rage Winterchill' },
  { name: 'Claw of Molten Fury', wowhead_id: 32945, raid_tier_id: RAID_TIERS.HYJAL, item_slot: 'Main Hand', boss_name: 'Trash' },
  { name: 'Fist of Molten Fury', wowhead_id: 32946, raid_tier_id: RAID_TIERS.HYJAL, item_slot: 'Off Hand', boss_name: 'Trash' },
  { name: 'Hammer of Judgement', wowhead_id: 32947, raid_tier_id: RAID_TIERS.HYJAL, item_slot: 'Main Hand', boss_name: 'Trash' },

  // ZUL'AMAN
  { name: 'Shadowcaster\'s Drape', wowhead_id: 33592, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'Back', boss_name: 'Timed Event' },
  { name: 'Mantle of Ill Intent', wowhead_id: 33591, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'Shoulder', boss_name: 'Timed Event' },
  { name: 'Pauldrons of Stone Resolve', wowhead_id: 33589, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'Shoulder', boss_name: 'Timed Event' },
  { name: 'Cord of Braided Troll Hair', wowhead_id: 33587, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'Waist', boss_name: 'Timed Event' },
  { name: 'Shadowhunter\'s Treads', wowhead_id: 33590, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'Feet', boss_name: 'Timed Event' },
  { name: 'Life-Step Belt', wowhead_id: 33588, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'Waist', boss_name: 'Timed Event' },
  { name: 'Elunite Imbued Leggings', wowhead_id: 33586, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'Legs', boss_name: 'Timed Event' },
  { name: 'Tuskbreaker', wowhead_id: 33474, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'Two-Hand', boss_name: 'Timed Event' },
  { name: 'Trollbane', wowhead_id: 33478, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'Two-Hand', boss_name: 'Timed Event' },
  { name: 'Amani Divining Staff', wowhead_id: 33479, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'Two-Hand', boss_name: 'Timed Event' },
  { name: 'Staff of Dark Mending', wowhead_id: 33480, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'Two-Hand', boss_name: 'Timed Event' },
  { name: 'Umbral Shiv', wowhead_id: 33476, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'One-Hand', boss_name: 'Timed Event' },
  { name: 'Rage', wowhead_id: 33475, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'One-Hand', boss_name: 'Timed Event' },
  { name: 'Mojo-Mender\'s Mask', wowhead_id: 33294, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'Head', boss_name: 'Hex Lord Malacrass' },
  { name: 'Two-Toed Sandals', wowhead_id: 33214, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'Feet', boss_name: 'Zul\'jin' },
  { name: 'Signet of Eternal Life', wowhead_id: 33504, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'Finger', boss_name: 'Timed Event' },
  { name: 'Signet of Primal Wrath', wowhead_id: 33505, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'Finger', boss_name: 'Timed Event' },
  { name: 'Signet of the Last Defender', wowhead_id: 33503, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'Finger', boss_name: 'Timed Event' },
  { name: 'Signet of the Quiet Forest', wowhead_id: 33502, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'Finger', boss_name: 'Timed Event' },
  { name: 'Shimmer-Pelt Vest', wowhead_id: 33206, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'Chest', boss_name: 'Halazzi' },
  { name: 'Arrow-Fall Chestguard', wowhead_id: 33216, raid_tier_id: RAID_TIERS.ZULAMAN, item_slot: 'Chest', boss_name: 'Jan\'alai' },

  // SUNWELL PLATEAU
  { name: 'Amulet of Unfettered Magics', wowhead_id: 34204, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Neck', boss_name: 'Eredar Twins' },
  { name: 'Blade of Life\'s Inevitability', wowhead_id: 34346, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'One-Hand', boss_name: 'Trash' },
  { name: 'Wand of Cleansing Light', wowhead_id: 34347, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Ranged', boss_name: 'Trash' },
  { name: 'Wand of the Demonsoul', wowhead_id: 34348, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Ranged', boss_name: 'Trash' },
  { name: 'Band of Devastation', wowhead_id: 34189, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Finger', boss_name: 'Trash' },
  { name: 'Band of Ruinous Delight', wowhead_id: 34207, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Finger', boss_name: 'Eredar Twins' },
  { name: 'Blessed Band of Karabor', wowhead_id: 34890, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Finger', boss_name: 'Trash' },
  { name: 'Ring of Hardened Resolve', wowhead_id: 34213, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Finger', boss_name: 'M\'uru' },
  { name: 'Ring of Harmonic Beauty', wowhead_id: 34891, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Finger', boss_name: 'Trash' },
  { name: 'Anetheron\'s Noose', wowhead_id: 32323, raid_tier_id: RAID_TIERS.HYJAL, item_slot: 'Waist', boss_name: 'Anetheron' },
  { name: 'Swiftsteel Bludgeon', wowhead_id: 34331, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'One-Hand', boss_name: 'Trash' },
  { name: 'Blackened Naaru Sliver', wowhead_id: 34427, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Trinket', boss_name: 'M\'uru' },
  { name: 'Glimmering Naaru Sliver', wowhead_id: 34429, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Trinket', boss_name: 'M\'uru' },
  { name: 'Steely Naaru Sliver', wowhead_id: 34428, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Trinket', boss_name: 'M\'uru' },
  { name: 'Archon\'s Gavel', wowhead_id: 34199, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Main Hand', boss_name: 'Eredar Twins' },
  { name: 'Muramasa', wowhead_id: 34214, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'One-Hand', boss_name: 'M\'uru' },
  { name: 'Shivering Felspine', wowhead_id: 34349, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Two-Hand', boss_name: 'Trash' },
  { name: 'Stanchion of Primal Instinct', wowhead_id: 34198, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Two-Hand', boss_name: 'Eredar Twins' },
  { name: 'Chestguard of Relentless Storms', wowhead_id: 32593, raid_tier_id: RAID_TIERS.HYJAL, item_slot: 'Chest', boss_name: 'Trash' },
  { name: 'Garments of Serene Shores', wowhead_id: 34211, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Chest', boss_name: 'M\'uru' },
  { name: 'Robes of Faltered Light', wowhead_id: 34212, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Chest', boss_name: 'M\'uru' },
  { name: 'Vicious Hawkstrider Hauberk', wowhead_id: 34215, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Chest', boss_name: 'M\'uru' },
  { name: 'Treads of the Den Mother', wowhead_id: 32517, raid_tier_id: RAID_TIERS.BLACK_TEMPLE, item_slot: 'Feet', boss_name: 'Trash' },
  { name: 'Gauntlets of the Ancient Shadowmoon', wowhead_id: 34350, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Hands', boss_name: 'Trash' },
  { name: 'Tranquil Majesty Wraps', wowhead_id: 34351, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Hands', boss_name: 'Trash' },
  { name: 'Breeches of Natural Aggression', wowhead_id: 34169, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Legs', boss_name: 'Kalecgos' },
  { name: 'Legplates of the Holy Juggernaut', wowhead_id: 34167, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Legs', boss_name: 'Kalecgos' },
  { name: 'Sun-Touched Chain Leggings', wowhead_id: 34186, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Legs', boss_name: 'Brutallus' },
  { name: 'Aegis of Angelic Fortune', wowhead_id: 34206, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Off Hand', boss_name: 'M\'uru' },
  { name: 'Antonidas\' Aegis of Rapt Concentration', wowhead_id: 32370, raid_tier_id: RAID_TIERS.HYJAL, item_slot: 'Off Hand', boss_name: 'Archimonde' },
  { name: 'Ring of Omnipotence', wowhead_id: 34230, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Finger', boss_name: 'Kil\'jaeden' },
  { name: 'Amice of the Convoker', wowhead_id: 34210, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Shoulder', boss_name: 'Eredar Twins' },
  { name: 'Mantle of the Golden Forest', wowhead_id: 34209, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Shoulder', boss_name: 'Eredar Twins' },
  { name: 'Pauldrons of Perseverance', wowhead_id: 34208, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Shoulder', boss_name: 'Eredar Twins' },
  { name: 'Shawl of Wonderment', wowhead_id: 34202, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Shoulder', boss_name: 'Eredar Twins' },
  { name: 'Spaulders of the Thalassian Savior', wowhead_id: 34203, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Shoulder', boss_name: 'Eredar Twins' },
  { name: 'Shoulders of the Forgotten Conqueror', wowhead_id: 34848, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Shoulder', boss_name: 'Eredar Twins' },
  { name: 'Shoulders of the Forgotten Protector', wowhead_id: 34849, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Shoulder', boss_name: 'Eredar Twins' },
  { name: 'Shoulders of the Forgotten Vanquisher', wowhead_id: 34850, raid_tier_id: RAID_TIERS.SUNWELL, item_slot: 'Shoulder', boss_name: 'Eredar Twins' },
]

async function main() {
  console.log('Adding missing Year 2 TBC items to database...\n')

  let added = 0
  let skipped = 0

  for (const item of missingItems) {
    // Check if item already exists
    const { data: existing } = await supabase
      .from('loot_items')
      .select('id, name')
      .eq('name', item.name)
      .eq('raid_tier_id', item.raid_tier_id)
      .maybeSingle()

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
        classification: 'Unlimited',
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
  console.log('\nDone!')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
