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

async function checkOldGuild() {
  const oldGuildId = '765fdfb0-ec8d-4e21-b333-58006b76284b' // Big Yikes - Classic
  const newGuildId = '1e13c37a-736b-4b2d-8da0-13cc3bbb62f3' // Big Yikes - Classic Fresh

  console.log('🔍 Checking old guild "Big Yikes - Classic"...\n')

  // Get guild info
  const { data: guild } = await supabase
    .from('guilds')
    .select('*')
    .eq('id', oldGuildId)
    .single()

  console.log('Guild Info:')
  console.log(`  Name: ${guild.name}`)
  console.log(`  Created: ${guild.created_at}`)
  console.log(`  Created by: ${guild.created_by}`)
  console.log('')

  // Check guild_members
  const { data: oldMembers } = await supabase
    .from('guild_members')
    .select('user_id, character_name, role, joined_at')
    .eq('guild_id', oldGuildId)
    .eq('is_active', true)

  console.log(`Guild Members (${oldMembers?.length || 0}):`)
  oldMembers?.forEach(m => {
    console.log(`  - ${m.character_name} (${m.user_id})`)
    console.log(`    Role: ${m.role}, Joined: ${m.joined_at}`)
  })
  console.log('')

  // Check character_guild_memberships
  const { data: charMembers } = await supabase
    .from('character_guild_memberships')
    .select(`
      character_id,
      role,
      joined_at,
      character:characters(name, user_id)
    `)
    .eq('guild_id', oldGuildId)
    .eq('is_active', true)

  console.log(`Character Guild Memberships (${charMembers?.length || 0}):`)
  charMembers?.forEach(m => {
    console.log(`  - ${m.character?.name} (Character: ${m.character_id})`)
    console.log(`    User: ${m.character?.user_id}`)
    console.log(`    Role: ${m.role}, Joined: ${m.joined_at}`)
  })
  console.log('')

  // Check for loot submissions
  const { data: submissions } = await supabase
    .from('loot_submissions')
    .select('id')
    .eq('guild_id', oldGuildId)

  console.log(`Loot Submissions: ${submissions?.length || 0}`)
  console.log('')

  // Check for expansions
  const { data: expansions } = await supabase
    .from('guild_expansions')
    .select('expansion_name, is_current')
    .eq('guild_id', oldGuildId)

  console.log(`Guild Expansions (${expansions?.length || 0}):`)
  expansions?.forEach(e => {
    console.log(`  - ${e.expansion_name} ${e.is_current ? '(current)' : ''}`)
  })
  console.log('')

  console.log('📊 Summary:')
  console.log(`  Members to move: ${charMembers?.length || 0}`)
  console.log(`  Loot submissions: ${submissions?.length || 0}`)
  console.log(`  Expansions: ${expansions?.length || 0}`)
}

checkOldGuild()
