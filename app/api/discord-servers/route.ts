import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { canManageDiscordServer } from '@/lib/discord-server-access'

/** Partial shape of a guild object from the Discord API (GET /users/@me/guilds) */
interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
}

// GET - Fetch user's Discord servers with admin permissions
export async function GET() {
  try {
    const supabase = await createClient()

    // Get the user and their session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get the provider token from the session
    const providerToken = session.provider_token

    if (!providerToken) {
      return NextResponse.json(
        { error: 'No Discord access token found. Please log out and log back in.' },
        { status: 400 }
      )
    }

    // Fetch guilds from Discord API using the provider token
    const discordResponse = await fetch('https://discord.com/api/users/@me/guilds', {
      headers: {
        Authorization: `Bearer ${providerToken}`
      }
    })

    if (!discordResponse.ok) {
      const errorText = await discordResponse.text()
      console.error('Discord API error:', discordResponse.status, discordResponse.statusText, errorText)

      if (discordResponse.status === 429) {
        return NextResponse.json(
          { error: 'Discord rate limit reached. Please wait a moment and try again.' },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to fetch Discord servers' },
        { status: 500 }
      )
    }

    const guilds: DiscordGuild[] = await discordResponse.json()

    // Servers the user owns or has Administrator or Manage Server in: the
    // same rule the server applies when a guild is linked to a server.
    const adminGuilds = guilds.filter((guild) => canManageDiscordServer(guild))

    return NextResponse.json({
      guilds: adminGuilds
    })
  } catch (error) {
    console.error('Error in GET /api/discord-servers:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
