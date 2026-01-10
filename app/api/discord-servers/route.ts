import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

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
        { error: 'Failed to fetch Discord servers', details: errorText },
        { status: 500 }
      )
    }

    const guilds = await discordResponse.json()

    console.log('Discord returned guilds:', guilds.length)

    // Filter for guilds where user has admin permissions
    const ADMINISTRATOR = BigInt(0x8)
    const MANAGE_GUILD = BigInt(0x20)

    const adminGuilds = guilds.filter((guild: any) => {
      const permissions = BigInt(guild.permissions || '0')
      const hasAdmin = (permissions & ADMINISTRATOR) === ADMINISTRATOR
      const hasManage = (permissions & MANAGE_GUILD) === MANAGE_GUILD

      console.log(`Guild "${guild.name}": permissions=${guild.permissions}, hasAdmin=${hasAdmin}, hasManage=${hasManage}, owner=${guild.owner}`)

      return hasAdmin || hasManage || guild.owner
    })

    console.log('Admin guilds filtered:', adminGuilds.length, adminGuilds.map((g: any) => g.name))

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
