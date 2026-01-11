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

    // Get user's Discord access token from session
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.provider_token) {
      console.log('No Discord access token available')
      return NextResponse.json({
        available_guilds: []
      })
    }

    // Fetch user's Discord guilds from Discord API
    let discordGuilds: any[] = []
    try {
      const discordResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: {
          'Authorization': `Bearer ${session.provider_token}`
        }
      })

      if (discordResponse.status === 429) {
        const retryAfter = discordResponse.headers.get('Retry-After')
        console.log('Discord rate limit hit, retry after:', retryAfter)
        return NextResponse.json(
          { error: 'Discord rate limit reached. Please wait a moment and try again.' },
          { status: 429 }
        )
      }

      if (!discordResponse.ok) {
        const errorText = await discordResponse.text()
        console.error('Failed to fetch Discord guilds:', discordResponse.status, errorText)

        // If it's a 401/403, likely means token doesn't have guilds scope
        if (discordResponse.status === 401 || discordResponse.status === 403) {
          return NextResponse.json(
            { error: 'Discord authentication expired or missing permissions. Please log out and log in again to refresh your Discord connection.' },
            { status: 403 }
          )
        }

        return NextResponse.json({
          available_guilds: []
        })
      }

      discordGuilds = await discordResponse.json()
      console.log('Fetched Discord guilds:', discordGuilds.length)
    } catch (error) {
      console.error('Error fetching Discord guilds:', error)
      return NextResponse.json({
        available_guilds: []
      })
    }

    if (!Array.isArray(discordGuilds) || discordGuilds.length === 0) {
      console.log('User has no Discord guilds')
      return NextResponse.json({
        available_guilds: []
      })
    }

    // Get Discord server IDs from user's Discord memberships
    const userDiscordServerIds = discordGuilds.map((g: any) => g.id)
    console.log('User Discord server IDs:', userDiscordServerIds)

    // Find LootList+ guilds that match user's Discord servers
    const { data: matchingGuilds, error: guildsError } = await supabase
      .from('guilds')
      .select('id, name, realm, faction, discord_server_id, is_active')
      .in('discord_server_id', userDiscordServerIds)
      .eq('is_active', true)

    console.log('Matching LootList+ guilds found:', matchingGuilds?.length || 0)
    if (matchingGuilds && matchingGuilds.length > 0) {
      console.log('Guild details:', matchingGuilds.map(g => ({ name: g.name, discord_id: g.discord_server_id })))
    }

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

    // Remove duplicates by keeping only the first guild for each discord_server_id
    const uniqueGuilds = matchingGuilds.reduce((acc: any[], guild: any) => {
      const exists = acc.find(g => g.discord_server_id === guild.discord_server_id)
      if (!exists) {
        acc.push(guild)
      }
      return acc
    }, [])

    console.log('After removing duplicates:', uniqueGuilds.length)

    const availableGuilds = uniqueGuilds
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
