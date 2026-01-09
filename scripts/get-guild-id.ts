/**
 * Quick script to get your guild ID
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env.local manually
const envPath = resolve(process.cwd(), '.env.local')
try {
  const envFile = readFileSync(envPath, 'utf8')
  envFile.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim()
    }
  })
} catch (error) {
  console.error('Error loading .env.local:', error)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function getGuildId() {
  const { data: guilds, error } = await supabase
    .from('guilds')
    .select('id, name, realm, faction')

  if (error) {
    console.error('Error fetching guilds:', error)
    return
  }

  if (!guilds || guilds.length === 0) {
    console.log('No guilds found in the database')
    return
  }

  console.log('\n📋 Your guilds:\n')
  guilds.forEach((guild) => {
    console.log(`  Guild: ${guild.name}`)
    console.log(`  Realm: ${guild.realm || 'Not set'}`)
    console.log(`  Faction: ${guild.faction}`)
    console.log(`  ID: ${guild.id}`)
    console.log('')
  })

  console.log('Copy the ID above and use it to run the seeding script:')
  console.log(`  npm run seed:classic <guild_id>`)
}

getGuildId()
