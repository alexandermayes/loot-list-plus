import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function run() {
  // Get test guilds
  const { data: guilds } = await supabase
    .from('guilds')
    .select('id, name, created_by')
    .like('name', 'TEST_%')

  console.log('Test guilds:', guilds)
  if (!guilds?.length) return

  // Get a class for the characters
  const { data: classes } = await supabase.from('classes').select('id').limit(1)
  const classId = classes?.[0]?.id
  console.log('Using class_id:', classId)

  for (const guild of guilds) {
    const charName = 'GM_' + guild.name.split('_')[1]

    // Check if character exists
    const { data: existingChar } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', guild.created_by)
      .eq('name', charName)
      .single()

    let charId = existingChar?.id

    if (!charId) {
      // Create character
      const { data: newChar, error } = await supabase
        .from('characters')
        .insert({
          user_id: guild.created_by,
          name: charName,
          realm: 'Faerlina',
          class_id: classId,
          is_main: true,
        })
        .select('id')
        .single()

      if (error) {
        console.log(`Error creating char for ${guild.name}:`, error.message)
        continue
      }
      charId = newChar?.id
      console.log(`Created character ${charName} (${charId})`)
    } else {
      console.log(`Character ${charName} already exists (${charId})`)
    }

    // Link character to guild
    const { error: linkError } = await supabase
      .from('character_guild_memberships')
      .upsert({
        character_id: charId,
        guild_id: guild.id,
        role: 'Guild Master',
        joined_at: new Date().toISOString(),
      }, { onConflict: 'character_id,guild_id' })

    if (linkError) {
      console.log(`Error linking char to ${guild.name}:`, linkError.message)
    } else {
      console.log(`Linked ${charName} to ${guild.name} as Guild Master`)
    }
  }

  console.log('\nDone!')
}

run()
