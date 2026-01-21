import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

// POST - Join guild via Discord verification
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const body = await request.json()
    const { guild_id } = body

    if (!guild_id) {
      return NextResponse.json(
        { error: 'Guild ID is required' },
        { status: 400 }
      )
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

    // Get the guild details
    const { data: guild, error: guildError } = await supabase
      .from('guilds')
      .select('id, name, realm, discord_server_id, is_active')
      .eq('id', guild_id)
      .single()

    if (guildError || !guild) {
      return NextResponse.json(
        { error: 'Guild not found' },
        { status: 404 }
      )
    }

    if (!guild.is_active) {
      return NextResponse.json(
        { error: 'Guild is not active' },
        { status: 400 }
      )
    }

    // Get user's Discord access token from session
    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.provider_token) {
      console.log('No Discord access token available')
      return NextResponse.json(
        { error: 'Discord authentication expired. Please log out and log in again.' },
        { status: 403 }
      )
    }

    // Fetch user's Discord guilds from Discord API
    let discordGuilds: any[] = []
    try {
      const discordResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: {
          'Authorization': `Bearer ${session.provider_token}`
        }
      })

      if (!discordResponse.ok) {
        console.error('Failed to fetch Discord guilds for verification:', discordResponse.status)
        return NextResponse.json(
          { error: 'Failed to verify Discord server membership' },
          { status: 500 }
        )
      }

      discordGuilds = await discordResponse.json()
    } catch (error) {
      console.error('Error fetching Discord guilds for verification:', error)
      return NextResponse.json(
        { error: 'Failed to verify Discord server membership' },
        { status: 500 }
      )
    }

    // Verify user is in the Discord server
    const isInDiscordServer = discordGuilds.some(
      (dg: any) => dg.id === guild.discord_server_id
    )

    if (!isInDiscordServer) {
      console.log(`User not in Discord server ${guild.discord_server_id}. User's guilds:`, discordGuilds.map(g => g.id))
      return NextResponse.json(
        { error: 'You must be a member of this guild\'s Discord server' },
        { status: 403 }
      )
    }

    // Use service role client to bypass RLS for character operations
    const serviceSupabase = createServiceRoleClient()

    // Get or create a character for the user
    const { data: existingCharacters } = await serviceSupabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    let characterId: string

    if (existingCharacters && existingCharacters.length > 0) {
      // Use existing character
      characterId = existingCharacters[0].id
      console.log('[DISCORD JOIN] Using existing character:', characterId)
    } else {
      // Create a default character for the user
      const characterName = user.user_metadata?.full_name || user.user_metadata?.custom_claims?.global_name || user.user_metadata?.name || 'Discord Member'
      console.log('[DISCORD JOIN] Creating character with name:', characterName)

      const { data: newCharacter, error: charError } = await serviceSupabase
        .from('characters')
        .insert({
          user_id: user.id,
          name: characterName,
          realm: guild.realm || null,
          is_main: true
        })
        .select('id')
        .single()

      if (charError || !newCharacter) {
        console.error('[DISCORD JOIN] Error creating character:', charError)
        return NextResponse.json(
          { error: `Failed to create character: ${charError?.message || 'Unknown error'}` },
          { status: 500 }
        )
      }

      characterId = newCharacter.id
      console.log('[DISCORD JOIN] Created character:', characterId)
    }

    // Check if character is already a member of this guild
    const { data: existingMembership } = await serviceSupabase
      .from('character_guild_memberships')
      .select('id')
      .eq('character_id', characterId)
      .eq('guild_id', guild_id)
      .single()

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You are already a member of this guild' },
        { status: 400 }
      )
    }

    // Create character guild membership
    console.log('[DISCORD JOIN] Creating membership for character:', characterId, 'guild:', guild_id)
    const { error: memberError } = await serviceSupabase
      .from('character_guild_memberships')
      .insert({
        character_id: characterId,
        guild_id: guild_id,
        role: 'Member',
        is_active: true,
        joined_at: new Date().toISOString(),
        joined_via: 'discord_verify'
      })

    if (memberError) {
      console.error('[DISCORD JOIN] Error creating character guild membership:', memberError)
      return NextResponse.json(
        { error: `Failed to join guild: ${memberError.message}` },
        { status: 500 }
      )
    }

    // Set as active character and guild for user
    console.log('[DISCORD JOIN] Setting active character and guild')
    await serviceSupabase
      .from('user_active_characters')
      .upsert({
        user_id: user.id,
        active_character_id: characterId,
        active_guild_id: guild_id,
        updated_at: new Date().toISOString()
      })

    console.log('[DISCORD JOIN] Guild join complete!')

    return NextResponse.json({
      success: true,
      guild_id: guild_id,
      message: 'Successfully joined guild via Discord'
    })
  } catch (error) {
    console.error('Error in POST /api/discord-guilds/join:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
