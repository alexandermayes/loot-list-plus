/**
 * Validate Item Classifications Script
 *
 * This script checks all loot items to ensure they have proper classification data:
 * - Armor items should have armor_type set
 * - Weapon items should have weapon_type set
 * - Token items should have loot_item_classes restrictions
 *
 * Run this after adding new items or expansions to catch any missing data.
 *
 * Usage: npx tsx scripts/validate-item-classifications.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { CLASS_AGNOSTIC_SLOTS } from '../data/class-proficiencies'
import { getTokenClasses, isTokenSlot } from '../data/token-class-mapping'

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

// Slots that need armor_type
const ARMOR_SLOTS = ['Head', 'Shoulder', 'Chest', 'Wrist', 'Hands', 'Waist', 'Legs', 'Feet']

// Slots that need weapon_type
const WEAPON_SLOTS = ['One-Hand', 'Two-Hand', 'Main Hand', 'Ranged', 'Weapon', 'Wand', 'Shield', 'Legendary']

// Extended class-agnostic slots (for validation purposes)
const AGNOSTIC_SLOTS = [
  ...CLASS_AGNOSTIC_SLOTS,
  'Token', 'Quest', 'Bag', 'Idol', 'Totem', 'Libram'
]

interface ValidationIssue {
  itemId: string
  itemName: string
  wowheadId: number
  slot: string
  issue: string
}

async function validateItems() {
  console.log('🔍 Validating item classifications...\n')

  const issues: ValidationIssue[] = []

  // Fetch all loot items with their class restrictions
  const { data: items, error } = await supabase
    .from('loot_items')
    .select(`
      id, name, item_slot, wowhead_id, armor_type, weapon_type,
      loot_item_classes(class_id, spec_id)
    `)
    .eq('is_available', true)

  if (error) {
    console.error('❌ Error fetching items:', error)
    return
  }

  if (!items || items.length === 0) {
    console.log('No items found')
    return
  }

  console.log(`Checking ${items.length} items...\n`)

  for (const item of items) {
    // Check armor items
    if (ARMOR_SLOTS.includes(item.item_slot)) {
      if (!item.armor_type) {
        issues.push({
          itemId: item.id,
          itemName: item.name,
          wowheadId: item.wowhead_id,
          slot: item.item_slot,
          issue: 'Missing armor_type'
        })
      }
    }

    // Check weapon items
    if (WEAPON_SLOTS.includes(item.item_slot)) {
      if (!item.weapon_type) {
        issues.push({
          itemId: item.id,
          itemName: item.name,
          wowheadId: item.wowhead_id,
          slot: item.item_slot,
          issue: 'Missing weapon_type'
        })
      }
    }

    // Check token items
    if (isTokenSlot(item.item_slot)) {
      const classes = item.loot_item_classes as unknown[] || []

      // Check if token has class restrictions
      if (classes.length === 0) {
        // Token has no restrictions - check if we know what classes should use it
        const expectedClasses = getTokenClasses(item.name)
        if (expectedClasses) {
          issues.push({
            itemId: item.id,
            itemName: item.name,
            wowheadId: item.wowhead_id,
            slot: item.item_slot,
            issue: `Token missing class restrictions (should be: ${expectedClasses.join(', ')})`
          })
        } else {
          issues.push({
            itemId: item.id,
            itemName: item.name,
            wowheadId: item.wowhead_id,
            slot: item.item_slot,
            issue: 'Token missing class restrictions (unknown token type - add to token-class-mapping.ts)'
          })
        }
      }
    }

    // Check for items in unknown slots
    const knownSlots = [...ARMOR_SLOTS, ...WEAPON_SLOTS, ...AGNOSTIC_SLOTS]
    if (!knownSlots.includes(item.item_slot)) {
      issues.push({
        itemId: item.id,
        itemName: item.name,
        wowheadId: item.wowhead_id,
        slot: item.item_slot,
        issue: `Unknown item slot: "${item.item_slot}" - may need to add to CLASS_AGNOSTIC_SLOTS`
      })
    }
  }

  // Report results
  if (issues.length === 0) {
    console.log('✅ All items are properly classified!')
  } else {
    console.log(`⚠️  Found ${issues.length} issues:\n`)

    // Group by issue type
    const byIssue = issues.reduce((acc, issue) => {
      if (!acc[issue.issue]) acc[issue.issue] = []
      acc[issue.issue].push(issue)
      return acc
    }, {} as Record<string, ValidationIssue[]>)

    for (const [issueType, items] of Object.entries(byIssue)) {
      console.log(`\n📋 ${issueType} (${items.length} items):`)
      items.forEach(item => {
        console.log(`   ${item.wowheadId}: ${item.itemName} (${item.slot})`)
      })
    }

    console.log('\n💡 To fix:')
    console.log('   - Armor/weapon types: Add mappings to data/item-types.ts')
    console.log('   - Token classes: Run populate script or add to loot_item_classes table')
    console.log('   - Unknown slots: Add to CLASS_AGNOSTIC_SLOTS in data/class-proficiencies.ts')
  }

  // Summary stats
  console.log('\n📊 Summary:')
  const armorItems = items.filter(i => ARMOR_SLOTS.includes(i.item_slot))
  const weaponItems = items.filter(i => WEAPON_SLOTS.includes(i.item_slot))
  const tokenItems = items.filter(i => isTokenSlot(i.item_slot))
  const agnosticItems = items.filter(i => AGNOSTIC_SLOTS.includes(i.item_slot))

  console.log(`   Armor items: ${armorItems.length} (${armorItems.filter(i => i.armor_type).length} classified)`)
  console.log(`   Weapon items: ${weaponItems.length} (${weaponItems.filter(i => i.weapon_type).length} classified)`)
  console.log(`   Token items: ${tokenItems.length}`)
  console.log(`   Class-agnostic items: ${agnosticItems.length}`)
}

validateItems()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
