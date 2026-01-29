/**
 * Assign Test Data to Real User
 * Adds a real user to test guilds so they can experience the app with data
 *
 * Usage: npx tsx scripts/assign-test-data-to-user.ts <user-email>
 *
 * Example: npx tsx scripts/assign-test-data-to-user.ts myemail@example.com
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local
const envPath = resolve(process.cwd(), '.env.local')
const envFile = readFileSync(envPath, 'utf8')
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=')
  if (key && valueParts.length > 0) {
    let value = valueParts.join('=').trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[key.trim()] = value
  }
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WOW_CLASSES = ['Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Shaman', 'Mage', 'Warlock', 'Druid']

async function main() {
  const userEmail = process.argv[2]

  if (!userEmail) {
    // List available users
    console.log('Usage: npx tsx scripts/assign-test-data-to-user.ts <user-email>')
    console.log('\nAvailable users in database:')

    const { data: users } = await supabase.auth.admin.listUsers({ perPage: 50 })
    const realUsers = users?.users.filter(u => !u.email?.includes('lootlist-test.local')) || []

    for (const user of realUsers) {
      console.log(`  - ${user.email} (${user.id})`)
    }
    process.exit(0)
  }

  console.log('='.repeat(60))
  console.log('Assign Test Data to User')
  console.log('='.repeat(60))

  // Find the user
  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const user = users?.users.find(u => u.email === userEmail)

  if (!user) {
    console.error(`User not found: ${userEmail}`)
    process.exit(1)
  }

  console.log(`\nFound user: ${user.email} (${user.id})`)

  // Get test guilds
  const { data: testGuilds, error: guildError } = await supabase
    .from('guilds')
    .select('id, name, realm, faction')
    .like('name', 'TEST_%')

  if (guildError || !testGuilds || testGuilds.length === 0) {
    console.error('No test guilds found. Run the seed script first.')
    process.exit(1)
  }

  console.log(`\nFound ${testGuilds.length} test guilds`)

  // Get WoW classes
  const { data: wowClasses } = await supabase.from('wow_classes').select('id, name')

  // Check if user already has characters
  const { data: existingChars } = await supabase
    .from('characters')
    .select('id, name')
    .eq('user_id', user.id)

  let characterId: string

  if (existingChars && existingChars.length > 0) {
    characterId = existingChars[0].id
    console.log(`\nUsing existing character: ${existingChars[0].name} (${characterId})`)
  } else {
    // Create a character for this user
    const className = WOW_CLASSES[Math.floor(Math.random() * WOW_CLASSES.length)]
    const classData = wowClasses?.find(c => c.name === className)
    const characterName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'TestChar'

    const { data: newChar, error: charError } = await supabase
      .from('characters')
      .insert({
        user_id: user.id,
        name: characterName,
        realm: testGuilds[0].realm,
        class_id: classData?.id || null,
        is_main: true,
      })
      .select('id, name')
      .single()

    if (charError || !newChar) {
      console.error('Failed to create character:', charError)
      process.exit(1)
    }

    characterId = newChar.id
    console.log(`\nCreated character: ${newChar.name} (${characterId})`)
  }

  // Add character to each test guild
  for (const guild of testGuilds) {
    // Check if already a member
    const { data: existing } = await supabase
      .from('character_guild_memberships')
      .select('id')
      .eq('character_id', characterId)
      .eq('guild_id', guild.id)
      .single()

    if (existing) {
      console.log(`  Already a member of: ${guild.name}`)
      continue
    }

    // Add as Officer so they can see everything
    const { error: memberError } = await supabase
      .from('character_guild_memberships')
      .insert({
        character_id: characterId,
        guild_id: guild.id,
        role: 'Officer',
        is_active: true,
        joined_at: new Date().toISOString(),
        joined_via: 'manual',
      })

    if (memberError) {
      console.error(`  Failed to join ${guild.name}:`, memberError.message)
    } else {
      console.log(`  Joined: ${guild.name} as Officer`)
    }
  }

  // Set active guild
  const { error: activeError } = await supabase
    .from('user_active_characters')
    .upsert({
      user_id: user.id,
      active_character_id: characterId,
      active_guild_id: testGuilds[0].id,
      updated_at: new Date().toISOString(),
    })

  if (activeError) {
    console.warn('Could not set active guild:', activeError.message)
  }

  // Ensure user has discord_verified for full access
  await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      discord_verified: true,
    })

  console.log('\n' + '='.repeat(60))
  console.log('Done! You can now log in and see test data.')
  console.log('='.repeat(60))
  console.log(`\nActive guild: ${testGuilds[0].name}`)
  console.log('Role: Officer (can view all submissions)')
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal:', err)
    process.exit(1)
  })
