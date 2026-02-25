import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackApiError } from '@/utils/analytics/server'
import { discordFetch } from '@/lib/discord'

interface DiscordChannel {
  id: string
  name: string
  type: number
  position: number
}

/**
 * GET - List text channels in the guild's linked Discord server
 *
 * Returns channels the bot can see, filtered to text (0) and announcement (5) types.
 * Used to populate the raid summary channel picker in guild settings.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get('guild_id')

    if (!guildId) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    const botToken = process.env.DISCORD_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json({ channels: [], error: 'Bot not configured' })
    }

    const supabase = createServiceRoleClient()

    // Verify caller is an officer in this guild
    const { data: callerCharacters } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)

    if (!callerCharacters || callerCharacters.length === 0) {
      return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
    }

    const characterIds = callerCharacters.map((c: { id: string }) => c.id)

    // Check guild creator status
    const { data: guild } = await supabase
      .from('guilds')
      .select('created_by, discord_server_id')
      .eq('id', guildId)
      .single()

    if (!guild) {
      return NextResponse.json({ error: 'Guild not found' }, { status: 404 })
    }

    if (!guild.discord_server_id) {
      return NextResponse.json({ channels: [], error: 'No Discord server linked' })
    }

    const isGuildCreator = guild.created_by === user.id

    if (!isGuildCreator) {
      const { data: membership } = await supabase
        .from('character_guild_memberships')
        .select('role')
        .eq('guild_id', guildId)
        .in('character_id', characterIds)
        .eq('is_active', true)
        .limit(1)
        .single()

      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
      }

      // Check officer status via guild_roles
      const { data: roleData } = await supabase
        .from('guild_roles')
        .select('position')
        .eq('guild_id', guildId)
        .eq('name', membership.role)
        .single()

      const position = roleData?.position ?? (
        membership.role === 'Guild Master' ? 100 :
        membership.role === 'Officer' ? 50 : 0
      )

      if (position < 50) {
        return NextResponse.json({ error: 'Only officers can manage Discord settings' }, { status: 403 })
      }
    }

    // Fetch channels from Discord API
    const response = await discordFetch(
      `https://discord.com/api/v10/guilds/${encodeURIComponent(guild.discord_server_id)}/channels`,
      {
        headers: {
          'Authorization': `Bot ${botToken}`,
        },
      }
    )

    if (!response.ok) {
      if (response.status === 403 || response.status === 401) {
        return NextResponse.json({ channels: [], error: 'Bot not installed in this server' })
      }
      console.error('Discord API error:', response.status)
      return NextResponse.json({ channels: [], error: 'Couldn\'t fetch channels from Discord' })
    }

    const allChannels: DiscordChannel[] = await response.json()

    // Filter to text channels (0) and announcement channels (5)
    const textChannels = allChannels
      .filter(ch => ch.type === 0 || ch.type === 5)
      .map(ch => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        position: ch.position,
      }))
      .sort((a, b) => a.position - b.position)

    return NextResponse.json({ channels: textChannels })
  } catch (error) {
    console.error('Error fetching Discord channels:', error)
    trackApiError('unknown', 'GET /api/discord/channels', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
