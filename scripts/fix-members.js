#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  console.log('🚀 Starting member migration...\n')

  try {
    // Step 1: Find users without characters
    console.log('📝 Step 1: Finding users without characters...')
    const { data: usersWithoutChars, error: checkError } = await supabase
      .from('guild_members')
      .select(`
        user_id,
        character_name,
        guild_id,
        role,
        joined_at,
        joined_via,
        guilds!inner(realm)
      `)
      .eq('is_active', true)

    if (checkError) {
      console.error('Error checking users:', checkError)
      return
    }

    console.log(`Found ${usersWithoutChars.length} guild memberships\n`)

    // Group by user_id to avoid duplicates
    const userMap = new Map()
    usersWithoutChars.forEach(member => {
      if (!userMap.has(member.user_id)) {
        userMap.set(member.user_id, member)
      }
    })

    console.log(`Processing ${userMap.size} unique users...\n`)

    let createdCharacters = 0
    let createdMemberships = 0
    let setActiveCharacters = 0

    for (const [userId, member] of userMap.entries()) {
      // Check if user already has a character
      const { data: existingChars } = await supabase
        .from('characters')
        .select('id')
        .eq('user_id', userId)
        .limit(1)

      let characterId

      if (existingChars && existingChars.length > 0) {
        characterId = existingChars[0].id
        console.log(`✓ User ${userId} already has character ${characterId}`)
      } else {
        // Create character
        const { data: newChar, error: charError } = await supabase
          .from('characters')
          .insert({
            user_id: userId,
            name: member.character_name || 'Guild Member',
            realm: member.guilds?.realm || null,
            is_main: true
          })
          .select('id')
          .single()

        if (charError) {
          console.error(`❌ Failed to create character for user ${userId}:`, charError.message)
          continue
        }

        characterId = newChar.id
        createdCharacters++
        console.log(`✅ Created character ${characterId} for user ${userId}`)
      }

      // Now create character_guild_memberships for all their guild memberships
      const userMemberships = usersWithoutChars.filter(m => m.user_id === userId)

      for (const membership of userMemberships) {
        // Check if membership already exists
        const { data: existingMembership } = await supabase
          .from('character_guild_memberships')
          .select('id')
          .eq('character_id', characterId)
          .eq('guild_id', membership.guild_id)
          .single()

        if (!existingMembership) {
          const { error: memberError } = await supabase
            .from('character_guild_memberships')
            .insert({
              character_id: characterId,
              guild_id: membership.guild_id,
              role: membership.role,
              is_active: true,
              joined_at: membership.joined_at,
              joined_via: (membership.joined_via || 'unknown') + '_migration'
            })

          if (memberError) {
            console.error(`❌ Failed to create membership for character ${characterId} in guild ${membership.guild_id}:`, memberError.message)
          } else {
            createdMemberships++
            console.log(`  ✅ Created membership in guild ${membership.guild_id}`)
          }
        }
      }

      // Set active character if not set
      const { data: existingActive } = await supabase
        .from('user_active_characters')
        .select('user_id')
        .eq('user_id', userId)
        .single()

      if (!existingActive) {
        const { error: activeError } = await supabase
          .from('user_active_characters')
          .upsert({
            user_id: userId,
            active_character_id: characterId,
            active_guild_id: member.guild_id,
            updated_at: new Date().toISOString()
          })

        if (activeError) {
          console.error(`❌ Failed to set active character for user ${userId}:`, activeError.message)
        } else {
          setActiveCharacters++
          console.log(`  ✅ Set active character and guild`)
        }
      }

      console.log('')
    }

    console.log('\n✅ Migration complete!')
    console.log(`   Characters created: ${createdCharacters}`)
    console.log(`   Memberships created: ${createdMemberships}`)
    console.log(`   Active characters set: ${setActiveCharacters}`)
  } catch (error) {
    console.error('❌ Migration error:', error)
    process.exit(1)
  }
}

runMigration()
