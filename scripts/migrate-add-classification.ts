/**
 * Migration script to add item classification and item types
 */

import { createClient } from '@supabase/supabase-js'
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Item type mapping based on slot
const getItemType = (slot: string, name: string): string => {
  const nameLower = name.toLowerCase()

  // Weapons
  if (slot === 'Weapon') {
    if (nameLower.includes('sword') || name.includes('Blade') || name.includes('Slicer')) {
      return nameLower.includes('two-hand') || nameLower.includes('2h') ? 'Two-Handed Sword' : 'One-Handed Sword'
    }
    if (nameLower.includes('axe') || name.includes('Chopper')) {
      return nameLower.includes('two-hand') || nameLower.includes('2h') ? 'Two-Handed Axe' : 'One-Handed Axe'
    }
    if (nameLower.includes('mace') || nameLower.includes('hammer')) {
      return nameLower.includes('two-hand') || nameLower.includes('2h') ? 'Two-Handed Mace' : 'One-Handed Mace'
    }
    if (nameLower.includes('dagger') || name.includes('Shiv') || name.includes('Kris')) {
      return 'Dagger'
    }
    if (nameLower.includes('staff') || name.includes('Staff')) {
      return 'Staff'
    }
    if (nameLower.includes('polearm') || nameLower.includes('spear')) {
      return 'Polearm'
    }
    if (nameLower.includes('fist weapon')) {
      return 'Fist Weapon'
    }
    return 'Weapon'
  }

  // Ranged weapons
  if (slot === 'Ranged') {
    if (nameLower.includes('bow')) return 'Bow'
    if (nameLower.includes('gun') || nameLower.includes('rifle')) return 'Gun'
    if (nameLower.includes('crossbow')) return 'Crossbow'
    if (nameLower.includes('wand')) return 'Wand'
    if (nameLower.includes('thrown')) return 'Thrown'
    return 'Ranged'
  }

  // Armor by slot and type
  if (slot === 'Head') return 'Head'
  if (slot === 'Neck') return 'Neck'
  if (slot === 'Shoulder') return 'Shoulder'
  if (slot === 'Back') return 'Back'
  if (slot === 'Chest') return 'Chest'
  if (slot === 'Wrist') return 'Wrist'
  if (slot === 'Hands') return 'Hands'
  if (slot === 'Waist') return 'Waist'
  if (slot === 'Legs') return 'Legs'
  if (slot === 'Feet') return 'Feet'
  if (slot === 'Finger') return 'Ring'
  if (slot === 'Trinket') return 'Trinket'
  if (slot === 'Off Hand' || slot === 'Shield') return 'Off-Hand'

  return slot
}

// Classification based on item rarity and importance
// This is a simplified version - you may want to customize this based on your guild's needs
const getClassification = (name: string, slot: string): string => {
  const nameLower = name.toLowerCase()

  // Legendary items are typically Reserved
  const legendaryItems = [
    'sulfuras', 'thunderfury', 'hand of ragnaros', 'atiesh',
    'ashbringer', 'corrupted ashbringer'
  ]

  if (legendaryItems.some(legendary => nameLower.includes(legendary))) {
    return 'Reserved'
  }

  // Tier set pieces are typically Limited
  const tierSetNames = [
    'arcanist', 'felheart', 'cenarion', 'giantstalker', 'lawbringer',
    'earthfury', 'nightslayer', 'might', 'prophecy', 'netherwind',
    'nemesis', 'stormrage', 'dragonstalker', 'judgement', 'ten storms',
    'bloodfang', 'wrath', 'transcendence', 'dreadnaught'
  ]

  if (tierSetNames.some(tier => nameLower.includes(tier))) {
    return 'Limited'
  }

  // Weapons and trinkets are often Limited or Reserved
  if (slot === 'Weapon' || slot === 'Trinket' || slot === 'Ranged') {
    // High-value weapons
    const highValueWeapons = [
      'maladath', 'chromatically', 'crul\'shorukh', 'vis\'kag',
      'perdition', 'brutality', 'deathbringer', 'blastershot',
      'crossbow of imminent doom', 'ashkandi', 'drake fang',
      'staff of shadow flame', 'lok\'amir', 'claw of chromaggus'
    ]

    if (highValueWeapons.some(weapon => nameLower.includes(weapon))) {
      return 'Limited'
    }
  }

  // Everything else is Unlimited
  return 'Unlimited'
}

// Calculate allocation cost based on classification
const getAllocationCost = (classification: string): number => {
  if (classification === 'Reserved' || classification === 'Limited') {
    return 1
  }
  return 0
}

async function addItemClassification(guildId: string) {
  console.log('📋 Adding item classification and types...')

  // Get all loot items
  const { data: items, error } = await supabase
    .from('loot_items')
    .select('id, name, item_slot, raid_tier_id')

  if (error) {
    console.error('❌ Error fetching items:', error)
    return
  }

  if (!items || items.length === 0) {
    console.log('No items found')
    return
  }

  console.log(`Found ${items.length} items to update`)

  let updated = 0
  for (const item of items) {
    const itemType = getItemType(item.item_slot, item.name)
    const classification = getClassification(item.name, item.item_slot)
    const allocationCost = getAllocationCost(classification)

    const { error: updateError } = await supabase
      .from('loot_items')
      .update({
        item_type: itemType,
        classification: classification,
        allocation_cost: allocationCost
      })
      .eq('id', item.id)

    if (updateError) {
      console.error(`❌ Error updating ${item.name}:`, updateError.message)
    } else {
      updated++
      if (updated % 10 === 0) {
        console.log(`  Updated ${updated}/${items.length} items...`)
      }
    }
  }

  console.log(`✅ Updated ${updated} items with classification and item types`)
}

const guildId = process.argv[2]

if (!guildId) {
  console.error('❌ Usage: npx tsx scripts/migrate-add-classification.ts <guild_id>')
  process.exit(1)
}

addItemClassification(guildId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
