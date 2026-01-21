#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function cleanupOldGuild() {
  const oldGuildId = '765fdfb0-ec8d-4e21-b333-58006b76284b' // Big Yikes - Classic
  const newGuildId = '1e13c37a-736b-4b2d-8da0-13cc3bbb62f3' // Big Yikes - Classic Fresh

  console.log('🚀 Starting guild cleanup...\n')

  // Step 1: Get all character memberships from old guild
  const { data: oldMemberships } = await supabase
    .from('character_guild_memberships')
    .select('character_id, role, joined_via, character:characters(user_id)')
    .eq('guild_id', oldGuildId)
    .eq('is_active', true)

  console.log(`Found ${oldMemberships?.length || 0} members to move\n`)

  // Step 2: Move each character to the new guild
  for (const membership of oldMemberships || []) {
    console.log(`Moving character ${membership.character_id}...`)

    // Check if they're already in the new guild
    const { data: existing } = await supabase
      .from('character_guild_memberships')
      .select('id')
      .eq('character_id', membership.character_id)
      .eq('guild_id', newGuildId)
      .single()

    if (existing) {
      console.log(`  ⚠️  Already in new guild, skipping`)

      // Just deactivate old membership
      await supabase
        .from('character_guild_memberships')
        .update({ is_active: false })
        .eq('character_id', membership.character_id)
        .eq('guild_id', oldGuildId)

      continue
    }

    // Create new membership in correct guild
    const { error: insertError } = await supabase
      .from('character_guild_memberships')
      .insert({
        character_id: membership.character_id,
        guild_id: newGuildId,
        role: membership.role,
        is_active: true,
        joined_at: new Date().toISOString(),
        joined_via: (membership.joined_via || 'manual') + '_migrated'
      })

    if (insertError) {
      console.error(`  ❌ Error moving character:`, insertError.message)
      continue
    }

    // Deactivate old membership
    await supabase
      .from('character_guild_memberships')
      .update({ is_active: false })
      .eq('character_id', membership.character_id)
      .eq('guild_id', oldGuildId)

    // Update user's active guild if it was the old guild
    await supabase
      .from('user_active_characters')
      .update({ active_guild_id: newGuildId })
      .eq('user_id', membership.character.user_id)
      .eq('active_guild_id', oldGuildId)

    console.log(`  ✅ Moved to new guild`)
  }

  console.log('')

  // Step 3: Deactivate old guild_members entries
  console.log('Deactivating old guild_members entries...')
  const { error: deactivateError } = await supabase
    .from('guild_members')
    .update({ is_active: false })
    .eq('guild_id', oldGuildId)

  if (deactivateError) {
    console.error('Error deactivating guild_members:', deactivateError.message)
  } else {
    console.log('✅ Deactivated old guild_members')
  }

  // Step 4: Deactivate the old guild
  console.log('\nDeactivating old guild...')
  const { error: guildError } = await supabase
    .from('guilds')
    .update({ is_active: false })
    .eq('id', oldGuildId)

  if (guildError) {
    console.error('Error deactivating guild:', guildError.message)
  } else {
    console.log('✅ Old guild deactivated')
  }

  console.log('\n✅ Cleanup complete!')
  console.log(`   Moved ${oldMemberships?.length || 0} members to "Big Yikes - Classic Fresh"`)
  console.log('   Old guild is now inactive and hidden')
}

cleanupOldGuild()
