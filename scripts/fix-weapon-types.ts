/**
 * Fix incorrectly classified weapon items
 *
 * These items had armor_type set when they should have weapon_type.
 * This script corrects the specific items identified in validation.
 *
 * Usage: npx tsx scripts/fix-weapon-types.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually
const envPath = resolve(process.cwd(), '.env.local')
try {
  const envFile = readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
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
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Items that need to change from armor_type to weapon_type
const itemFixes: { wowhead_id: number; weapon_type: string; name: string }[] = [
  { wowhead_id: 29962, weapon_type: 'Dagger', name: 'Heartrazor' },
  { wowhead_id: 29988, weapon_type: 'One-Handed Mace', name: 'Cosmic Infuser' },
  { wowhead_id: 29990, weapon_type: 'One-Handed Sword', name: 'Infinity Blade' },
  { wowhead_id: 29991, weapon_type: 'One-Handed Sword', name: 'Warp Slicer' },
  { wowhead_id: 29993, weapon_type: 'Staff', name: 'Staff of Disintegration' },
  { wowhead_id: 30865, weapon_type: 'One-Handed Sword', name: "Tracker's Blade" },
  { wowhead_id: 30881, weapon_type: 'One-Handed Sword', name: 'Blade of Infamy' },
  { wowhead_id: 30901, weapon_type: 'Dagger', name: 'Boundless Agony' },
  { wowhead_id: 30902, weapon_type: 'Two-Handed Sword', name: "Cataclysm's Edge" },
  { wowhead_id: 30906, weapon_type: 'Bow', name: 'Bristleblitz Striker' },
  { wowhead_id: 30908, weapon_type: 'Staff', name: 'Apostle of Argus' },
  { wowhead_id: 30910, weapon_type: 'Fist Weapon', name: 'Tempest of Chaos' },
  { wowhead_id: 19864, weapon_type: 'Dagger', name: 'Bloodcaller' },
]

// Items that had weapon_type but should have armor_type
const armorFixes: { wowhead_id: number; armor_type: string; name: string }[] = [
  { wowhead_id: 30912, armor_type: 'Leather', name: 'Leggings of Eternity' },
  { wowhead_id: 30913, armor_type: 'Cloth', name: 'Robes of Rhonin' },
]

async function fixItemTypes() {
  console.log('🔧 Fixing incorrectly classified items...\n')

  let fixed = 0

  // Fix weapons that had armor_type
  for (const fix of itemFixes) {
    const { error } = await supabase
      .from('loot_items')
      .update({
        armor_type: null,
        weapon_type: fix.weapon_type
      })
      .eq('wowhead_id', fix.wowhead_id)

    if (error) {
      console.error(`❌ Error fixing ${fix.name}:`, error.message)
    } else {
      console.log(`✅ Fixed ${fix.name} -> weapon_type: ${fix.weapon_type}`)
      fixed++
    }
  }

  // Fix armor items that had weapon_type
  for (const fix of armorFixes) {
    const { error } = await supabase
      .from('loot_items')
      .update({
        weapon_type: null,
        armor_type: fix.armor_type
      })
      .eq('wowhead_id', fix.wowhead_id)

    if (error) {
      console.error(`❌ Error fixing ${fix.name}:`, error.message)
    } else {
      console.log(`✅ Fixed ${fix.name} -> armor_type: ${fix.armor_type}`)
      fixed++
    }
  }

  console.log(`\n✅ Fixed ${fixed} items`)
}

fixItemTypes()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
