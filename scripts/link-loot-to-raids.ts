/**
 * Script to link existing loot_history records to their raid_events
 * based on awarded_date matching raid_date
 *
 * Usage: npx tsx scripts/link-loot-to-raids.ts
 */

import { config } from 'dotenv'
config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function linkLootToRaids() {
  console.log('🔄 Linking loot history to raid events...\n')

  // Get all loot_history records without raid_event_id
  const { data: unlinkedLoot, error: lootError } = await supabase
    .from('loot_history')
    .select('id, guild_id, awarded_date')
    .is('raid_event_id', null)

  if (lootError) {
    console.error('Error fetching loot:', lootError)
    return
  }

  if (!unlinkedLoot || unlinkedLoot.length === 0) {
    console.log('No unlinked loot records found.')
    return
  }

  console.log(`Found ${unlinkedLoot.length} unlinked loot records\n`)

  // Get all raid events
  const { data: raidEvents, error: eventsError } = await supabase
    .from('raid_events')
    .select('id, raid_date, raid_tier_id, raid_tiers(expansion_id, expansions(guild_id))')

  if (eventsError) {
    console.error('Error fetching raid events:', eventsError)
    return
  }

  // Create a map of guild_id + date -> raid_event_id
  const eventMap = new Map<string, string>()
  for (const event of raidEvents || []) {
    const guildId = (event as any).raid_tiers?.expansions?.guild_id
    if (guildId) {
      const key = `${guildId}:${event.raid_date}`
      eventMap.set(key, event.id)
    }
  }

  console.log(`Mapped ${eventMap.size} raid events\n`)

  let updated = 0
  let notFound = 0

  for (const loot of unlinkedLoot) {
    const key = `${loot.guild_id}:${loot.awarded_date}`
    const raidEventId = eventMap.get(key)

    if (raidEventId) {
      const { error: updateError } = await supabase
        .from('loot_history')
        .update({ raid_event_id: raidEventId })
        .eq('id', loot.id)

      if (updateError) {
        console.error(`Error updating loot ${loot.id}:`, updateError.message)
      } else {
        updated++
      }
    } else {
      notFound++
      console.log(`  No raid event found for date ${loot.awarded_date} in guild ${loot.guild_id}`)
    }
  }

  console.log(`\n✅ Updated ${updated} loot records`)
  if (notFound > 0) {
    console.log(`⚠️ ${notFound} records had no matching raid event`)
  }
  console.log('\n🎉 Done!')
}

linkLootToRaids().catch(console.error)
