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

async function checkGuildIds() {
  const galaxiesUserId = 'adc10173-be38-44a3-9f97-3d91a286504a'

  console.log('🔍 Checking guild memberships for Galaxies_NA...\n')

  // Check guild_members
  const { data: gm } = await supabase
    .from('guild_members')
    .select('guild_id, is_active, guilds(id, name)')
    .eq('user_id', galaxiesUserId)

  console.log('Guild Members entries:')
  gm?.forEach(m => {
    console.log(`  Guild ID: ${m.guild_id}`)
    console.log(`  Guild Name: ${m.guilds?.name}`)
    console.log(`  Active: ${m.is_active}`)
    console.log('')
  })

  // Check character and character_guild_memberships
  const { data: chars } = await supabase
    .from('characters')
    .select('id, name')
    .eq('user_id', galaxiesUserId)

  console.log('Characters:')
  chars?.forEach(c => {
    console.log(`  ${c.name} (${c.id})`)
  })
  console.log('')

  if (chars && chars.length > 0) {
    const { data: cgm } = await supabase
      .from('character_guild_memberships')
      .select('character_id, guild_id, is_active, guilds(id, name)')
      .in('character_id', chars.map(c => c.id))

    console.log('Character Guild Memberships:')
    cgm?.forEach(m => {
      console.log(`  Character: ${m.character_id}`)
      console.log(`  Guild ID: ${m.guild_id}`)
      console.log(`  Guild Name: ${m.guilds?.name}`)
      console.log(`  Active: ${m.is_active}`)
      console.log('')
    })
  }

  // List all guilds
  const { data: allGuilds } = await supabase
    .from('guilds')
    .select('id, name')

  console.log('All guilds in database:')
  allGuilds?.forEach(g => {
    console.log(`  ${g.name}: ${g.id}`)
  })
}

checkGuildIds()
