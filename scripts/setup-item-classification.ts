/**
 * Script to set up item classification fields
 * Run this after manually adding the columns via Supabase dashboard
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
    return 'One-Handed Weapon'
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

  // Armor by slot
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
const getClassification = (name: string, slot: string): string => {
  const nameLower = name.toLowerCase()

  // Legendary items are Reserved
  const legendaryItems = [
    'sulfuras', 'thunderfury', 'hand of ragnaros', 'atiesh',
    'ashbringer', 'corrupted ashbringer'
  ]

  if (legendaryItems.some(legendary => nameLower.includes(legendary))) {
    return 'Reserved'
  }

  // Tier set pieces are Limited
  const tierSetNames = [
    'arcanist', 'felheart', 'cenarion', 'giantstalker', 'lawbringer',
    'earthfury', 'nightslayer', 'might', 'prophecy', 'netherwind',
    'nemesis', 'stormrage', 'dragonstalker', 'judgement', 'ten storms',
    'bloodfang', 'wrath', 'transcendence', 'dreadnaught'
  ]

  if (tierSetNames.some(tier => nameLower.includes(tier))) {
    return 'Limited'
  }

  // High-value items that should be Limited
  const limitedItems = [
    'maladath', 'chromatically', 'crul\'shorukh', 'vis\'kag',
    'perdition', 'brutality', 'deathbringer', 'blastershot',
    'crossbow of imminent doom', 'ashkandi', 'drake fang',
    'staff of shadow flame', 'lok\'amir', 'claw of chromaggus',
    'nelth\'s tear', 'rejuvenating gem', 'tear of the goddess',
    'eye of the beast', 'drake talon'
  ]

  if (limitedItems.some(item => nameLower.includes(item))) {
    return 'Limited'
  }

  // Everything else is Unlimited
  return 'Unlimited'
}

// Calculate allocation cost
const getAllocationCost = (classification: string): number => {
  return (classification === 'Reserved' || classification === 'Limited') ? 1 : 0
}

async function setupItemClassification() {
  console.log('📋 Setting up item classification and types...')

  // Check if columns exist by trying to query them
  const { data: testData, error: testError } = await supabase
    .from('loot_items')
    .select('id, classification, item_type, allocation_cost')
    .limit(1)

  if (testError) {
    console.error('❌ Error: Columns do not exist yet.')
    console.error('Please add the columns manually in Supabase dashboard:')
    console.log('\n1. Go to Supabase Dashboard > Table Editor > loot_items')
    console.log('2. Add columns:')
    console.log('   - classification: text, default: Unlimited')
    console.log('   - item_type: text')
    console.log('   - allocation_cost: int4, default: 0')
    console.log('\nOr run the SQL from: scripts/add-item-classification.sql')
    process.exit(1)
  }

  console.log('✅ Columns exist, proceeding with data population...')

  // Get all loot items
  const { data: items, error } = await supabase
    .from('loot_items')
    .select('id, name, item_slot')

  if (error) {
    console.error('❌ Error fetching items:', error)
    process.exit(1)
  }

  if (!items || items.length === 0) {
    console.log('No items found')
    process.exit(0)
  }

  console.log(`Found ${items.length} items to update`)

  let updated = 0
  let errors = 0

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
      errors++
    } else {
      updated++
      if (updated % 20 === 0) {
        console.log(`  Progress: ${updated}/${items.length} items...`)
      }
    }
  }

  console.log(`\n✅ Updated ${updated} items successfully`)
  if (errors > 0) {
    console.log(`⚠️  ${errors} errors occurred`)
  }

  // Show summary stats
  const { data: stats } = await supabase
    .from('loot_items')
    .select('classification')

  if (stats) {
    const reserved = stats.filter(s => s.classification === 'Reserved').length
    const limited = stats.filter(s => s.classification === 'Limited').length
    const unlimited = stats.filter(s => s.classification === 'Unlimited').length

    console.log('\n📊 Classification Summary:')
    console.log(`   Reserved: ${reserved}`)
    console.log(`   Limited: ${limited}`)
    console.log(`   Unlimited: ${unlimited}`)
  }
}

setupItemClassification()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
