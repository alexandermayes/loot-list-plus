/**
 * Script to remove Classic Fresh expansion and its raid tiers
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

async function removeClassicFresh(guildId: string) {
  console.log('🗑️  Removing Classic Fresh expansion...')

  // Find Classic Fresh expansion
  const { data: expansion } = await supabase
    .from('expansions')
    .select('id')
    .eq('guild_id', guildId)
    .eq('name', 'Classic Fresh')
    .single()

  if (!expansion) {
    console.log('No Classic Fresh expansion found')
    return
  }

  console.log(`Found Classic Fresh expansion: ${expansion.id}`)

  // Get all raid tiers under this expansion
  const { data: tiers } = await supabase
    .from('raid_tiers')
    .select('id, name')
    .eq('expansion_id', expansion.id)

  if (tiers && tiers.length > 0) {
    console.log(`Found ${tiers.length} raid tiers to delete`)

    for (const tier of tiers) {
      console.log(`  Deleting "${tier.name}"...`)

      // Delete loot items first
      await supabase
        .from('loot_items')
        .delete()
        .eq('raid_tier_id', tier.id)

      // Delete the raid tier
      await supabase
        .from('raid_tiers')
        .delete()
        .eq('id', tier.id)

      console.log(`  ✅ Deleted`)
    }
  }

  // Delete the expansion
  const { error } = await supabase
    .from('expansions')
    .delete()
    .eq('id', expansion.id)

  if (error) {
    console.error('❌ Error deleting expansion:', error.message)
  } else {
    console.log('✅ Classic Fresh expansion deleted')
  }
}

const guildId = process.argv[2]

if (!guildId) {
  console.error('❌ Usage: npx tsx scripts/remove-classic-fresh.ts <guild_id>')
  process.exit(1)
}

removeClassicFresh(guildId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
