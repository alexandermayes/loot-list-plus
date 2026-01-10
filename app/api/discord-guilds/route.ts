import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// GET - List Discord guilds user can join
export async function GET() {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has Discord verification
    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('discord_verified, discord_id')
      .eq('user_id', user.id)
      .single()

    if (!preferences?.discord_verified || !preferences?.discord_id) {
      return NextResponse.json(
        { error: 'Discord verification required' },
        { status: 403 }
      )
    }

    // Get user's Discord guilds from their account
    // Note: Discord guild memberships are stored in user metadata from OAuth
    const discordGuilds = user.user_metadata?.guilds || []

    if (!Array.isArray(discordGuilds) || discordGuilds.length === 0) {
      return NextResponse.json({
        available_guilds: []
      })
    }

    // Get Discord server IDs from user's Discord memberships
    const userDiscordServerIds = discordGuilds.map((g: any) => g.id)

    // Find LootList+ guilds that match user's Discord servers
    const { data: matchingGuilds, error: guildsError } = await supabase
      .from('guilds')
      .select('id, name, realm, faction, discord_server_id, is_active')
      .in('discord_server_id', userDiscordServerIds)
      .eq('is_active', true)

    if (guildsError) {
      console.error('Error fetching matching guilds:', guildsError)
      return NextResponse.json(
        { error: 'Failed to fetch guilds' },
        { status: 500 }
      )
    }

    if (!matchingGuilds || matchingGuilds.length === 0) {
      return NextResponse.json({
        available_guilds: []
      })
    }

    // Filter out guilds user is already a member of
    const { data: existingMemberships } = await supabase
      .from('guild_members')
      .select('guild_id')
      .eq('user_id', user.id)

    const existingGuildIds = new Set(
      existingMemberships?.map(m => m.guild_id) || []
    )

    const availableGuilds = matchingGuilds
      .filter(guild => !existingGuildIds.has(guild.id))
      .map(guild => {
        // Find matching Discord guild for additional info
        const discordGuild = discordGuilds.find((dg: any) => dg.id === guild.discord_server_id)
        return {
          ...guild,
          discord_name: discordGuild?.name || null,
          discord_icon: discordGuild?.icon || null
        }
      })

    return NextResponse.json({
      available_guilds: availableGuilds
    })
  } catch (error) {
    console.error('Error in GET /api/discord-guilds:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
