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

async function checkMemberships() {
  console.log('🔍 Checking for missing character guild memberships...\n')

  // Get all guild_members
  const { data: guildMembers } = await supabase
    .from('guild_members')
    .select('user_id, guild_id, character_name')
    .eq('is_active', true)

  console.log(`Found ${guildMembers.length} guild_members entries\n`)

  let missingCount = 0

  for (const member of guildMembers) {
    // Get user's character
    const { data: chars } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', member.user_id)
      .limit(1)

    if (!chars || chars.length === 0) {
      console.log(`❌ User ${member.user_id} has NO character`)
      continue
    }

    const characterId = chars[0].id

    // Check if character_guild_membership exists
    const { data: membership } = await supabase
      .from('character_guild_memberships')
      .select('id')
      .eq('character_id', characterId)
      .eq('guild_id', member.guild_id)
      .single()

    if (!membership) {
      missingCount++
      console.log(`❌ Missing membership: character ${characterId} (${member.character_name}) → guild ${member.guild_id}`)
    }
  }

  if (missingCount === 0) {
    console.log('\n✅ All guild members have character memberships!')
  } else {
    console.log(`\n⚠️  Found ${missingCount} missing character guild memberships`)
  }
}

checkMemberships()
