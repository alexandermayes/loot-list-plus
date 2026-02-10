/**
 * Fix Token Class Restrictions
 *
 * This script corrects the loot_item_classes entries for tier tokens
 * that were populated with incorrect class mappings.
 *
 * Usage: npx tsx scripts/fix-token-classes.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'
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

async function fixTokenClasses() {
  console.log('🔧 Fixing token class restrictions...\n')

  // Get wow_classes for class name -> id mapping
  const { data: wowClasses, error: classError } = await supabase
    .from('wow_classes')
    .select('id, name')

  if (classError || !wowClasses) {
    console.error('❌ Error fetching wow_classes:', classError)
    return
  }

  const classNameToId: Record<string, string> = {}
  wowClasses.forEach(c => {
    classNameToId[c.name] = c.id
  })

  // Get all token items
  const { data: tokens, error: tokenError } = await supabase
    .from('loot_items')
    .select('id, name, item_slot, wowhead_id')
    .eq('is_available', true)

  if (tokenError || !tokens) {
    console.error('❌ Error fetching tokens:', tokenError)
    return
  }

  // Filter to only tokens
  const tokenItems = tokens.filter(item => isTokenSlot(item.item_slot))

  console.log(`Found ${tokenItems.length} tokens to process\n`)

  let fixed = 0
  let skipped = 0

  for (const token of tokenItems) {
    const allowedClasses = getTokenClasses(token.name)

    if (!allowedClasses) {
      console.log(`⚠️  Skipping ${token.name} - no mapping found`)
      skipped++
      continue
    }

    // Delete existing class restrictions for this token
    const { error: deleteError } = await supabase
      .from('loot_item_classes')
      .delete()
      .eq('loot_item_id', token.id)

    if (deleteError) {
      console.error(`❌ Error deleting classes for ${token.name}:`, deleteError.message)
      continue
    }

    // Create new loot_item_classes entries for each allowed class
    // spec_type must be 'primary' so tokens show in brackets 1-4
    const entries = allowedClasses.map(className => ({
      loot_item_id: token.id,
      class_id: classNameToId[className],
      spec_id: null,
      spec_type: 'primary'
    }))

    const { error: insertError } = await supabase
      .from('loot_item_classes')
      .insert(entries)

    if (insertError) {
      console.error(`❌ Error adding classes for ${token.name}:`, insertError.message)
    } else {
      console.log(`✅ ${token.name} -> ${allowedClasses.join(', ')}`)
      fixed++
    }
  }

  console.log(`\n✅ Summary:`)
  console.log(`   Fixed: ${fixed} tokens`)
  console.log(`   Skipped: ${skipped} tokens`)
}

fixTokenClasses()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
