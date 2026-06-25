#!/usr/bin/env npx tsx
/**
 * Fetch and update Discord guild icon for guilds missing icon_url
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve(process.cwd(), '.env.local')
const envFile = readFileSync(envPath, 'utf8')
envFile.split('\n').forEach(line => {
  const [key, ...v] = line.split('=')
  if (key && v.length) {
    let val = v.join('=').trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    process.env[key.trim()] = val
  }
})

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const botToken = process.env.DISCORD_BOT_TOKEN

async function main() {
  if (!botToken) {
    console.error('No DISCORD_BOT_TOKEN found')
    process.exit(1)
  }

  // Find guilds with discord_server_id but no icon_url
  const { data: guilds } = await sb
    .from('guilds')
    .select('id, name, discord_server_id, icon_url')
    .not('discord_server_id', 'is', null)
    .is('icon_url', null)

  if (!guilds || guilds.length === 0) {
    console.log('All guilds with Discord servers already have icons.')
    return
  }

  console.log(`Found ${guilds.length} guilds missing icons:`)

  for (const guild of guilds) {
    console.log(`\n  ${guild.name} (discord: ${guild.discord_server_id})`)

    try {
      const res = await fetch(`https://discord.com/api/v10/guilds/${guild.discord_server_id}`, {
        headers: { 'Authorization': `Bot ${botToken}` }
      })

      if (!res.ok) {
        console.log(`    Discord API error: ${res.status} ${res.statusText}`)
        continue
      }

      const data = await res.json()

      if (!data.icon) {
        console.log('    No icon set on this Discord server')
        continue
      }

      const ext = data.icon.startsWith('a_') ? 'gif' : 'png'
      const iconUrl = `https://cdn.discordapp.com/icons/${guild.discord_server_id}/${data.icon}.${ext}?size=256`

      const { error } = await sb
        .from('guilds')
        .update({ icon_url: iconUrl })
        .eq('id', guild.id)

      if (error) {
        console.log(`    DB update error: ${error.message}`)
      } else {
        console.log(`    Updated: ${iconUrl}`)
      }
    } catch (err: unknown) {
      console.log(`    Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  console.log('\nDone.')
}

main().catch(console.error)
