#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function cleanupOrphanData() {
  console.log('🔍 Checking for orphan and duplicate data...\n')

  // 1. Find duplicate guilds (same discord_server_id)
  console.log('=== Checking for duplicate guilds ===')
  const { data: guilds, error: guildsError } = await supabase
    .from('guilds')
    .select('id, name, discord_server_id, created_at, is_active')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (guildsError) {
    console.error('Error fetching guilds:', guildsError)
    return
  }

  // Group by discord_server_id
  const guildsByDiscord = {}
  for (const guild of guilds) {
    const key = guild.discord_server_id || `no-discord-${guild.id}`
    if (!guildsByDiscord[key]) {
      guildsByDiscord[key] = []
    }
    guildsByDiscord[key].push(guild)
  }

  // Find duplicates
  for (const [discordId, guildList] of Object.entries(guildsByDiscord)) {
    if (guildList.length > 1 && !discordId.startsWith('no-discord')) {
      console.log(`\n⚠️  DUPLICATE GUILDS for Discord server ${discordId}:`)
      for (const g of guildList) {
        console.log(`   - "${g.name}" (${g.id}) created at ${g.created_at}`)
      }
      console.log(`   First one will be kept, others should be deactivated.`)
    }
  }

  // 2. Find orphaned character_guild_memberships (guild doesn't exist or is inactive)
  console.log('\n=== Checking for orphaned character_guild_memberships ===')
  const { data: memberships, error: memberError } = await supabase
    .from('character_guild_memberships')
    .select(`
      id,
      guild_id,
      character_id,
      is_active,
      guild:guilds (id, name, is_active)
    `)
    .eq('is_active', true)

  if (memberError) {
    console.error('Error fetching memberships:', memberError)
  } else {
    const orphanMemberships = memberships.filter(m => {
      const guild = Array.isArray(m.guild) ? m.guild[0] : m.guild
      return !guild || !guild.is_active
    })

    if (orphanMemberships.length > 0) {
      console.log(`Found ${orphanMemberships.length} orphaned memberships:`)
      for (const m of orphanMemberships) {
        console.log(`   - Membership ${m.id} points to guild ${m.guild_id} (guild missing or inactive)`)
      }

      // Clean them up
      console.log('\n🔧 Cleaning up orphaned memberships...')
      for (const m of orphanMemberships) {
        const { error } = await supabase
          .from('character_guild_memberships')
          .update({ is_active: false })
          .eq('id', m.id)

        if (error) {
          console.log(`   ❌ Failed to deactivate membership ${m.id}: ${error.message}`)
        } else {
          console.log(`   ✅ Deactivated membership ${m.id}`)
        }
      }
    } else {
      console.log('No orphaned memberships found.')
    }
  }

  // 3. Find user_active_characters pointing to non-existent guilds
  console.log('\n=== Checking for invalid user_active_characters ===')
  const { data: activeChars, error: activeError } = await supabase
    .from('user_active_characters')
    .select(`
      user_id,
      active_guild_id,
      guild:guilds (id, name, is_active)
    `)
    .not('active_guild_id', 'is', null)

  if (activeError) {
    console.error('Error fetching active characters:', activeError)
  } else {
    const invalidActiveGuilds = activeChars.filter(a => {
      const guild = Array.isArray(a.guild) ? a.guild[0] : a.guild
      return !guild || !guild.is_active
    })

    if (invalidActiveGuilds.length > 0) {
      console.log(`Found ${invalidActiveGuilds.length} users with invalid active_guild_id:`)
      for (const a of invalidActiveGuilds) {
        console.log(`   - User ${a.user_id} has active_guild_id ${a.active_guild_id} (guild missing or inactive)`)
      }

      // Clean them up
      console.log('\n🔧 Clearing invalid active guild references...')
      for (const a of invalidActiveGuilds) {
        const { error } = await supabase
          .from('user_active_characters')
          .update({ active_guild_id: null, updated_at: new Date().toISOString() })
          .eq('user_id', a.user_id)

        if (error) {
          console.log(`   ❌ Failed to clear for user ${a.user_id}: ${error.message}`)
        } else {
          console.log(`   ✅ Cleared active_guild_id for user ${a.user_id}`)
        }
      }
    } else {
      console.log('No invalid active guild references found.')
    }
  }

  // 4. Summary of guilds
  console.log('\n=== Current Guild Summary ===')
  const { data: activeGuilds } = await supabase
    .from('guilds')
    .select('id, name, discord_server_id, is_active')
    .eq('is_active', true)

  if (activeGuilds) {
    console.log(`Active guilds: ${activeGuilds.length}`)
    for (const g of activeGuilds) {
      const { count } = await supabase
        .from('character_guild_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('guild_id', g.id)
        .eq('is_active', true)

      console.log(`   - "${g.name}" (${g.id}): ${count || 0} active members`)
    }
  }

  console.log('\n✅ Cleanup complete!')
}

cleanupOrphanData()
