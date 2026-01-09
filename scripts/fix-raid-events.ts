/**
 * Script to fix raid_events foreign key references
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

async function fixRaidEvents(guildId: string) {
  console.log('🔧 Fixing raid_events for guild:', guildId)

  // Set raid_tier_id to NULL for all raid events
  const { data, error } = await supabase
    .from('raid_events')
    .update({ raid_tier_id: null })
    .eq('guild_id', guildId)
    .select()

  if (error) {
    console.error('❌ Error updating raid_events:', error.message)
    return
  }

  console.log(`✅ Updated ${data?.length || 0} raid events (set raid_tier_id to NULL)`)
  console.log('✅ You can now delete raid tiers without foreign key constraints')
}

const guildId = process.argv[2]

if (!guildId) {
  console.error('❌ Usage: npx tsx scripts/fix-raid-events.ts <guild_id>')
  process.exit(1)
}

fixRaidEvents(guildId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
