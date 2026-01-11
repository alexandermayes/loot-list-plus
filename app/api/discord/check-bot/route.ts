import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * GET - Check if the LootList+ bot is installed in a Discord server
 *
 * Query params:
 * - serverId: The Discord server ID to check
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const serverId = searchParams.get('serverId')

    if (!serverId) {
      return NextResponse.json({ error: 'Server ID is required' }, { status: 400 })
    }

    const botToken = process.env.DISCORD_BOT_TOKEN
    if (!botToken) {
      console.error('DISCORD_BOT_TOKEN not configured')
      return NextResponse.json({ error: 'Bot token not configured' }, { status: 500 })
    }

    // Try to get guild information using the bot token
    // If the bot is in the guild, this will succeed. If not, it will return 403/404
    const response = await fetch(`https://discord.com/api/v10/guilds/${serverId}`, {
      headers: {
        'Authorization': `Bot ${botToken}`
      }
    })

    if (response.ok) {
      // Bot is in the guild
      return NextResponse.json({
        installed: true,
        message: 'Bot is installed in this server'
      })
    } else if (response.status === 403 || response.status === 404) {
      // Bot is not in the guild
      return NextResponse.json({
        installed: false,
        message: 'Bot is not installed in this server'
      })
    } else {
      // Some other error
      console.error('Discord API error:', response.status, await response.text())
      return NextResponse.json({
        installed: false,
        message: 'Unable to verify bot installation'
      })
    }
  } catch (error) {
    console.error('Error checking bot installation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
