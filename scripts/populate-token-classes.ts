/**
 * Populate Token Class Restrictions
 *
 * This script adds loot_item_classes entries for tier tokens based on
 * the token-class-mapping.ts file. This ensures tokens are properly
 * restricted to the classes that can use them.
 *
 * Usage: npx tsx scripts/populate-token-classes.ts
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

async function populateTokenClasses() {
  console.log('🎫 Populating token class restrictions...\n')

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

  // Get all token items without class restrictions
  const { data: tokens, error: tokenError } = await supabase
    .from('loot_items')
    .select(`
      id, name, item_slot, wowhead_id,
      loot_item_classes(class_id)
    `)
    .eq('is_available', true)

  if (tokenError || !tokens) {
    console.error('❌ Error fetching tokens:', tokenError)
    return
  }

  // Filter to only tokens without existing class restrictions
  const tokensToProcess = tokens.filter(item => {
    if (!isTokenSlot(item.item_slot)) return false
    const classes = item.loot_item_classes as any[] || []
    return classes.length === 0
  })

  console.log(`Found ${tokensToProcess.length} tokens without class restrictions\n`)

  let added = 0
  let skipped = 0
  const unmapped: { name: string; wowhead_id: number }[] = []

  for (const token of tokensToProcess) {
    const allowedClasses = getTokenClasses(token.name)

    if (!allowedClasses) {
      unmapped.push({ name: token.name, wowhead_id: token.wowhead_id })
      skipped++
      continue
    }

    // Create loot_item_classes entries for each allowed class
    const entries = allowedClasses.map(className => ({
      loot_item_id: token.id,
      class_id: classNameToId[className],
      spec_id: null,  // Token can be used by any spec of the class
      spec_type: null
    }))

    const { error: insertError } = await supabase
      .from('loot_item_classes')
      .insert(entries)

    if (insertError) {
      console.error(`❌ Error adding classes for ${token.name}:`, insertError.message)
    } else {
      console.log(`✅ ${token.name} -> ${allowedClasses.join(', ')}`)
      added++
    }
  }

  console.log(`\n✅ Summary:`)
  console.log(`   Added class restrictions: ${added} tokens`)
  console.log(`   Skipped (unmapped): ${skipped} tokens`)

  if (unmapped.length > 0) {
    console.log(`\n⚠️  ${unmapped.length} tokens need mapping in token-class-mapping.ts:\n`)
    unmapped.forEach(t => {
      console.log(`   '${t.name}': [],  // wowhead_id: ${t.wowhead_id}`)
    })
  }
}

populateTokenClasses()
  .then(() => {
    console.log('\nDone!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
