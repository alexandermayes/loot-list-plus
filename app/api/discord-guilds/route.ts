import { NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'

/**
 * Attempt to get a valid Discord provider token from the session.
 * If the initial session has no provider_token, tries refreshSession() once.
 */
async function getDiscordToken(supabase: Awaited<ReturnType<typeof createClient>>): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()

  if (session?.provider_token) {
    return session.provider_token
  }

  // Token missing — attempt a session refresh to get a new provider_token
  console.log('[DISCORD] No provider_token in session, attempting refresh...')
  const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession()

  if (error) {
    console.log('[DISCORD] Session refresh failed:', error.message)
    return null
  }

  if (refreshedSession?.provider_token) {
    console.log('[DISCORD] Got provider_token after refresh')
    return refreshedSession.provider_token
  }

  console.log('[DISCORD] No provider_token after refresh')
  return null
}

// GET - List Discord guilds user can join
export async function GET() {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

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

    // Get user's Discord access token (with refresh attempt)
    const providerToken = await getDiscordToken(supabase)

    if (!providerToken) {
      console.log('No Discord access token available after refresh attempt')
      return NextResponse.json(
        { error: 'Discord connection expired. Please log in again to reconnect.', code: 'discord_token_expired' },
        { status: 403 }
      )
    }

    // Fetch user's Discord guilds from Discord API
    let discordGuilds: any[] = []
    try {
      const discordResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: {
          'Authorization': `Bearer ${providerToken}`
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

        // If it's a 401/403, token is truly expired even after refresh
        if (discordResponse.status === 401 || discordResponse.status === 403) {
          return NextResponse.json(
            { error: 'Discord connection expired. Please log in again to reconnect.', code: 'discord_token_expired' },
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

    // Filter out guilds user is already a member of (via character_guild_memberships)
    // First get user's characters
    const { data: userCharacters } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)

    const characterIds = userCharacters?.map(c => c.id) || []

    let existingGuildIds = new Set<string>()
    if (characterIds.length > 0) {
      const { data: existingMemberships } = await supabase
        .from('character_guild_memberships')
        .select('guild_id')
        .in('character_id', characterIds)
        .eq('is_active', true)

      existingGuildIds = new Set(
        existingMemberships?.map(m => m.guild_id) || []
      )
    }

    // Note: We allow multiple guilds per discord_server_id (e.g., different raid teams or game versions)
    console.log('Total matching guilds:', matchingGuilds.length)

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
