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

async function checkGalaxies() {
  console.log('🔍 Checking for Galaxies_NA...\n')

  // Search for any user with "Galaxies" in their metadata
  const { data: allUsers } = await supabase.auth.admin.listUsers()

  const galaxiesUser = allUsers.users.find(u =>
    u.user_metadata?.full_name?.includes('Galaxies') ||
    u.user_metadata?.name?.includes('Galaxies') ||
    u.user_metadata?.custom_claims?.global_name?.includes('Galaxies')
  )

  if (!galaxiesUser) {
    console.log('❌ Could not find Galaxies_NA user')
    return
  }

  console.log(`✅ Found user: ${galaxiesUser.id}`)
  console.log(`   Name: ${galaxiesUser.user_metadata?.full_name || galaxiesUser.user_metadata?.name || galaxiesUser.user_metadata?.custom_claims?.global_name}`)
  console.log('')

  // Check for characters
  const { data: chars } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', galaxiesUser.id)

  console.log(`Characters (${chars?.length || 0}):`)
  chars?.forEach(char => {
    console.log(`  - ${char.name} (${char.id})`)
  })
  console.log('')

  // Check for character_guild_memberships
  if (chars && chars.length > 0) {
    const { data: memberships } = await supabase
      .from('character_guild_memberships')
      .select(`
        *,
        guild:guilds(name)
      `)
      .in('character_id', chars.map(c => c.id))

    console.log(`Character Guild Memberships (${memberships?.length || 0}):`)
    memberships?.forEach(m => {
      console.log(`  - Character ${m.character_id} → Guild ${m.guild?.name || m.guild_id}`)
      console.log(`    Role: ${m.role}, Active: ${m.is_active}, Joined via: ${m.joined_via}`)
    })
    console.log('')
  }

  // Check for guild_members (old system)
  const { data: oldMembers } = await supabase
    .from('guild_members')
    .select(`
      *,
      guild:guilds(name)
    `)
    .eq('user_id', galaxiesUser.id)

  console.log(`Guild Members (old system) (${oldMembers?.length || 0}):`)
  oldMembers?.forEach(m => {
    console.log(`  - ${m.character_name} → Guild ${m.guild?.name || m.guild_id}`)
    console.log(`    Role: ${m.role}, Active: ${m.is_active}`)
  })

  // Check user_active_characters
  const { data: activeChar } = await supabase
    .from('user_active_characters')
    .select('*')
    .eq('user_id', galaxiesUser.id)
    .single()

  console.log('')
  console.log('Active Character Setup:')
  if (activeChar) {
    console.log(`  ✅ Active character: ${activeChar.active_character_id}`)
    console.log(`  ✅ Active guild: ${activeChar.active_guild_id}`)
  } else {
    console.log(`  ❌ No active character set`)
  }
}

checkGalaxies()
