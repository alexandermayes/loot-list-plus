/**
 * Script to check for raid_events that might be blocking deletion
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

async function checkRaidEvents(guildId: string) {
  console.log('🔍 Checking raid_events for guild:', guildId)

  // Check if raid_events table exists and has data
  const { data: events, error } = await supabase
    .from('raid_events')
    .select('*')
    .eq('guild_id', guildId)

  if (error) {
    console.error('Error querying raid_events:', error.message)
    return
  }

  if (!events || events.length === 0) {
    console.log('✅ No raid events found - deletion should work')
    return
  }

  console.log(`⚠️  Found ${events.length} raid events:`)
  events.forEach((event: any) => {
    console.log(`  - Event ID: ${event.id}`)
    console.log(`    Raid Date: ${event.raid_date}`)
    console.log(`    Raid Tier ID: ${event.raid_tier_id || 'NULL'}`)
  })

  // If there are events with raid_tier_id, we need to either:
  // 1. Delete those events first
  // 2. Set raid_tier_id to NULL
  // 3. Update the foreign key constraint to CASCADE
}

const guildId = process.argv[2]

if (!guildId) {
  console.error('❌ Usage: npx tsx scripts/check-raid-events.ts <guild_id>')
  process.exit(1)
}

checkRaidEvents(guildId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
