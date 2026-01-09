/**
 * Script to seed class specializations
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

// Class specs mapping based on Google Sheet
const classSpecsMap: Record<string, string[]> = {
  'Paladin': ['Holy', 'Retribution', 'Protection'],
  'Priest': ['Holy/Disc', 'Shadow'],
  'Shaman': ['Restoration', 'Elemental', 'Enhancement'],
  'Druid': ['Restoration', 'Feral', 'Balance'],
  'Warrior': ['Protection', 'Arms/Fury'],
  'Hunter': ['Hunter'],
  'Mage': ['Mage'],
  'Warlock': ['Warlock'],
  'Rogue': ['Rogue'],
  'Death Knight': ['Blood', 'Frost/Unholy']
}

async function seedClassSpecs() {
  console.log('📋 Seeding class specializations...')

  // Get all classes
  const { data: classes, error: classError } = await supabase
    .from('wow_classes')
    .select('id, name')

  if (classError || !classes) {
    console.error('❌ Error loading classes:', classError)
    process.exit(1)
  }

  console.log(`Found ${classes.length} classes`)

  let totalSpecs = 0
  let inserted = 0

  for (const wowClass of classes) {
    const specs = classSpecsMap[wowClass.name]

    if (!specs) {
      console.log(`⚠️  No specs defined for ${wowClass.name}`)
      continue
    }

    console.log(`\n${wowClass.name}:`)

    for (const specName of specs) {
      totalSpecs++

      // Check if spec already exists
      const { data: existing } = await supabase
        .from('class_specs')
        .select('id')
        .eq('class_id', wowClass.id)
        .eq('name', specName)
        .single()

      if (existing) {
        console.log(`  ✓ ${specName} (already exists)`)
        continue
      }

      // Insert new spec
      const { error } = await supabase
        .from('class_specs')
        .insert({
          class_id: wowClass.id,
          name: specName
        })

      if (error) {
        console.error(`  ❌ Error inserting ${specName}:`, error.message)
      } else {
        console.log(`  ✅ ${specName}`)
        inserted++
      }
    }
  }

  console.log(`\n✅ Seeding complete!`)
  console.log(`   Total specs: ${totalSpecs}`)
  console.log(`   Newly inserted: ${inserted}`)
  console.log(`   Already existed: ${totalSpecs - inserted}`)
}

seedClassSpecs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
