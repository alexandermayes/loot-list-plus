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

async function fixOrphanGuild() {
  console.log('🔍 Looking for orphan guilds (guilds without memberships)...\n')

  // Find guilds that have no character_guild_memberships
  const { data: allGuilds, error: guildsError } = await supabase
    .from('guilds')
    .select('id, name, created_by, created_at')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (guildsError) {
    console.error('Error fetching guilds:', guildsError)
    return
  }

  console.log(`Found ${allGuilds.length} active guilds\n`)

  for (const guild of allGuilds) {
    // Check if guild has any memberships
    const { data: memberships } = await supabase
      .from('character_guild_memberships')
      .select('id')
      .eq('guild_id', guild.id)
      .eq('is_active', true)
      .limit(1)

    if (!memberships || memberships.length === 0) {
      console.log(`⚠️  ORPHAN GUILD FOUND: "${guild.name}" (${guild.id})`)
      console.log(`   Created by: ${guild.created_by}`)
      console.log(`   Created at: ${guild.created_at}`)

      // Check if guild has roles (trigger might have failed)
      const { data: roles } = await supabase
        .from('guild_roles')
        .select('id, name')
        .eq('guild_id', guild.id)

      console.log(`   Guild roles: ${roles?.length || 0}`)

      // Try to fix it
      console.log(`\n   🔧 Attempting to fix...`)

      // 1. Create default roles if missing
      if (!roles || roles.length === 0) {
        console.log('   Creating default roles...')
        const { error: rolesError } = await supabase
          .from('guild_roles')
          .insert([
            { guild_id: guild.id, name: 'Guild Master', color_hex: '#ff8000', position: 100, is_default: true },
            { guild_id: guild.id, name: 'Officer', color_hex: '#fbbf24', position: 50, is_default: true },
            { guild_id: guild.id, name: 'Member', color_hex: '#a1a1a1', position: 0, is_default: true }
          ])

        if (rolesError) {
          console.log(`   ❌ Failed to create roles: ${rolesError.message}`)
        } else {
          console.log('   ✅ Created default roles')
        }
      }

      // 2. Get or create character for the creator
      const { data: existingChars } = await supabase
        .from('characters')
        .select('id, name')
        .eq('user_id', guild.created_by)
        .limit(1)

      let characterId
      if (existingChars && existingChars.length > 0) {
        characterId = existingChars[0].id
        console.log(`   Using existing character: ${existingChars[0].name} (${characterId})`)
      } else {
        // Get user info for character name
        const { data: userData } = await supabase.auth.admin.getUserById(guild.created_by)
        const charName = userData?.user?.user_metadata?.full_name ||
                        userData?.user?.user_metadata?.name ||
                        'Guild Master'

        const { data: newChar, error: charError } = await supabase
          .from('characters')
          .insert({
            user_id: guild.created_by,
            name: charName,
            is_main: true
          })
          .select('id')
          .single()

        if (charError) {
          console.log(`   ❌ Failed to create character: ${charError.message}`)
          continue
        }

        characterId = newChar.id
        console.log(`   ✅ Created character: ${charName} (${characterId})`)
      }

      // 3. Create character_guild_membership
      const { error: memberError } = await supabase
        .from('character_guild_memberships')
        .insert({
          character_id: characterId,
          guild_id: guild.id,
          role: 'Officer',
          is_active: true,
          joined_at: new Date().toISOString(),
          joined_via: 'manual_fix'
        })

      if (memberError) {
        console.log(`   ❌ Failed to create membership: ${memberError.message}`)
        continue
      }

      console.log('   ✅ Created guild membership')

      // 4. Set as active guild
      await supabase
        .from('user_active_characters')
        .upsert({
          user_id: guild.created_by,
          active_character_id: characterId,
          active_guild_id: guild.id,
          updated_at: new Date().toISOString()
        })

      console.log('   ✅ Set as active guild')
      console.log(`\n   ✅ Guild "${guild.name}" has been fixed!\n`)
    }
  }

  console.log('\n✅ Done checking for orphan guilds')
}

fixOrphanGuild()
