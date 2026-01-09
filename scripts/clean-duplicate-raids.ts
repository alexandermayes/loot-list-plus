/**
 * Script to clean up duplicate raid tiers
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

async function cleanDuplicates(guildId: string) {
  console.log('🧹 Cleaning duplicate raid tiers for guild:', guildId)

  // Get all expansions for this guild
  const { data: expansions } = await supabase
    .from('expansions')
    .select('id, name')
    .eq('guild_id', guildId)

  if (!expansions || expansions.length === 0) {
    console.log('No expansions found')
    return
  }

  for (const expansion of expansions) {
    console.log(`\n📁 Checking expansion: ${expansion.name}`)

    // Get all raid tiers for this expansion
    const { data: tiers } = await supabase
      .from('raid_tiers')
      .select('id, name, is_active')
      .eq('expansion_id', expansion.id)
      .order('name', { ascending: true })

    if (!tiers || tiers.length === 0) continue

    // Group by name
    const tiersByName: Record<string, any[]> = {}
    tiers.forEach(tier => {
      if (!tiersByName[tier.name]) {
        tiersByName[tier.name] = []
      }
      tiersByName[tier.name].push(tier)
    })

    // Find duplicates
    for (const [name, duplicates] of Object.entries(tiersByName)) {
      if (duplicates.length > 1) {
        console.log(`  ⚠️  Found ${duplicates.length} copies of "${name}"`)

        // Keep the first one (or the active one if exists)
        const activeTier = duplicates.find(t => t.is_active)
        const tierToKeep = activeTier || duplicates[0]
        const tiersToDelete = duplicates.filter(t => t.id !== tierToKeep.id)

        console.log(`  ✅ Keeping: ${tierToKeep.id} (${tierToKeep.is_active ? 'active' : 'inactive'})`)

        for (const tier of tiersToDelete) {
          console.log(`  🗑️  Deleting duplicate: ${tier.id}`)

          // First, delete related loot_items
          const { error: itemsError } = await supabase
            .from('loot_items')
            .delete()
            .eq('raid_tier_id', tier.id)

          if (itemsError) {
            console.error(`    ❌ Error deleting loot items:`, itemsError.message)
            continue
          }

          // Then delete the raid tier
          const { error: tierError } = await supabase
            .from('raid_tiers')
            .delete()
            .eq('id', tier.id)

          if (tierError) {
            console.error(`    ❌ Error deleting tier:`, tierError.message)
          } else {
            console.log(`    ✅ Deleted successfully`)
          }
        }
      }
    }
  }

  console.log('\n✅ Cleanup complete!')
}

const guildId = process.argv[2]

if (!guildId) {
  console.error('❌ Usage: npx tsx scripts/clean-duplicate-raids.ts <guild_id>')
  process.exit(1)
}

cleanDuplicates(guildId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
