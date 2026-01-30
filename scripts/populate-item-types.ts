/**
 * Script to populate armor_type and weapon_type columns in loot_items table
 *
 * This uses the ITEM_TYPES mapping and inference functions to set
 * armor/weapon types for class proficiency filtering.
 *
 * Usage: npx tsx scripts/populate-item-types.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { ITEM_TYPES, inferArmorType, inferWeaponType } from '../data/item-types'

// Load .env.local manually
const envPath = resolve(process.cwd(), '.env.local')
try {
  const envFile = readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  })
} catch (error) {
  console.error('Error loading .env.local:', error)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing environment variables')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'set' : 'missing')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'set' : 'missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function populateItemTypes() {
  console.log('📋 Populating armor_type and weapon_type columns...\n')

  // Get all loot items
  const { data: items, error } = await supabase
    .from('loot_items')
    .select('id, name, item_slot, wowhead_id, armor_type, weapon_type')

  if (error) {
    console.error('❌ Error fetching items:', error)
    return
  }

  if (!items || items.length === 0) {
    console.log('No items found')
    return
  }

  console.log(`Found ${items.length} items to process\n`)

  let updated = 0
  let skipped = 0
  let fromMapping = 0
  let fromInference = 0
  const unmapped: { name: string; slot: string; wowhead_id: number }[] = []

  for (const item of items) {
    // Skip if already has types set
    if (item.armor_type || item.weapon_type) {
      skipped++
      continue
    }

    let armorType: string | null = null
    let weaponType: string | null = null

    // Try lookup from mapping
    const typeInfo = ITEM_TYPES[item.wowhead_id]
    if (typeInfo) {
      armorType = typeInfo.armor_type || null
      weaponType = typeInfo.weapon_type || null
      if (armorType || weaponType) {
        fromMapping++
      }
    }

    // If not in mapping, try inference
    if (!armorType && !weaponType) {
      armorType = inferArmorType(item.item_slot, item.name) || null
      weaponType = inferWeaponType(item.item_slot, item.name) || null
      if (armorType || weaponType) {
        fromInference++
      }
    }

    // Skip class-agnostic slots that don't need types
    const classAgnosticSlots = ['Neck', 'Back', 'Finger', 'Trinket', 'Relic', 'Idol', 'Totem', 'Libram', 'Held In Off-hand', 'Off-Hand', 'Off Hand', 'Recipe', 'Mount', 'Token', 'Quest', 'Bag', 'Book', 'Legendary']
    if (classAgnosticSlots.includes(item.item_slot)) {
      skipped++
      continue
    }

    // Track unmapped items that need types
    if (!armorType && !weaponType) {
      unmapped.push({
        name: item.name,
        slot: item.item_slot,
        wowhead_id: item.wowhead_id
      })
      continue
    }

    // Update the item
    const { error: updateError } = await supabase
      .from('loot_items')
      .update({
        armor_type: armorType,
        weapon_type: weaponType
      })
      .eq('id', item.id)

    if (updateError) {
      console.error(`❌ Error updating ${item.name}:`, updateError.message)
    } else {
      updated++
      if (updated % 20 === 0) {
        console.log(`  Updated ${updated} items...`)
      }
    }
  }

  console.log('\n✅ Summary:')
  console.log(`   Updated: ${updated} items`)
  console.log(`   Skipped (already set or class-agnostic): ${skipped} items`)
  console.log(`   From mapping: ${fromMapping}`)
  console.log(`   From inference: ${fromInference}`)

  if (unmapped.length > 0) {
    console.log(`\n⚠️  ${unmapped.length} items need manual mapping:\n`)
    unmapped.forEach(item => {
      console.log(`   ${item.wowhead_id}: { },  // ${item.name} (${item.slot})`)
    })
    console.log('\nAdd these to data/item-types.ts ITEM_TYPES mapping')
  }
}

populateItemTypes()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
