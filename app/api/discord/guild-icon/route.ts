import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const serverId = searchParams.get('serverId')

  if (!serverId) {
    return NextResponse.json({ error: 'Server ID is required' }, { status: 400 })
  }

  // Check if bot token is configured
  if (!process.env.DISCORD_BOT_TOKEN) {
    return NextResponse.json({
      error: 'Discord Bot Token is not configured. Add DISCORD_BOT_TOKEN to your .env.local file.'
    }, { status: 500 })
  }

  try {
    // Fetch guild information from Discord API
    const response = await fetch(`https://discord.com/api/v10/guilds/${serverId}`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Discord API error:', response.status, errorData)

      if (response.status === 404) {
        return NextResponse.json({
          error: 'Discord server not found. Make sure the Server ID is correct.'
        }, { status: 404 })
      }
      if (response.status === 401) {
        return NextResponse.json({
          error: 'Invalid Discord Bot Token. Check your DISCORD_BOT_TOKEN in .env.local'
        }, { status: 401 })
      }
      if (response.status === 403) {
        return NextResponse.json({
          error: 'Bot is not in this Discord server. Invite your bot to the server first.'
        }, { status: 403 })
      }
      throw new Error(`Discord API error: ${response.status}`)
    }

    const guildData = await response.json()

    // Build the icon URL if it exists
    let iconUrl = null
    if (guildData.icon) {
      const extension = guildData.icon.startsWith('a_') ? 'gif' : 'png'
      iconUrl = `https://cdn.discordapp.com/icons/${serverId}/${guildData.icon}.${extension}?size=256`
    }

    return NextResponse.json({
      iconUrl,
      name: guildData.name
    })
  } catch (error: any) {
    console.error('Error fetching Discord guild icon:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Discord server icon' },
      { status: 500 }
    )
  }
}
