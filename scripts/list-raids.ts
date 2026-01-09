/**
 * Script to list all raid tiers
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

async function listRaids(guildId: string) {
  console.log('📋 Listing raid tiers for guild:', guildId)

  // Get all expansions
  const { data: expansions } = await supabase
    .from('expansions')
    .select('*')
    .eq('guild_id', guildId)

  if (!expansions || expansions.length === 0) {
    console.log('No expansions found')
    return
  }

  for (const expansion of expansions) {
    console.log(`\n📁 Expansion: ${expansion.name} (ID: ${expansion.id})`)

    // Get raid tiers
    const { data: tiers } = await supabase
      .from('raid_tiers')
      .select('*')
      .eq('expansion_id', expansion.id)
      .order('name', { ascending: true })

    if (!tiers || tiers.length === 0) {
      console.log('   No raid tiers')
      continue
    }

    tiers.forEach((tier: any) => {
      const status = tier.is_active ? '⭐ ACTIVE' : '  inactive'
      console.log(`   ${status} - ${tier.name} (ID: ${tier.id})`)
    })
  }
}

const guildId = process.argv[2]

if (!guildId) {
  console.error('❌ Usage: npx tsx scripts/list-raids.ts <guild_id>')
  process.exit(1)
}

listRaids(guildId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
