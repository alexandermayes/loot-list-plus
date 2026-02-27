import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

/** Partial shape of a guild object from the Discord API (GET /users/@me/guilds) */
interface DiscordGuild {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string
}

// POST - Join guild via Discord verification
export async function POST(request: NextRequest) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

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

    // Get user's Discord access token (with refresh attempt if needed)
    const { data: { session } } = await supabase.auth.getSession()
    let providerToken = session?.provider_token

    if (!providerToken) {
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()

      if (refreshError || !refreshedSession?.provider_token) {
        return NextResponse.json(
          { error: 'Discord connection expired. Please log in again to reconnect.', code: 'discord_token_expired' },
          { status: 403 }
        )
      }

      providerToken = refreshedSession.provider_token
    }

    // Fetch user's Discord guilds from Discord API
    let discordGuilds: DiscordGuild[] = []
    try {
      const discordResponse = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: {
          'Authorization': `Bearer ${providerToken}`
        }
      })

      if (!discordResponse.ok) {
        console.error('Failed to fetch Discord guilds for verification:', discordResponse.status)

        if (discordResponse.status === 401 || discordResponse.status === 403) {
          return NextResponse.json(
            { error: 'Discord connection expired. Please log in again to reconnect.', code: 'discord_token_expired' },
            { status: 403 }
          )
        }

        return NextResponse.json(
          { error: 'Couldn\'t verify Discord server membership. Try again.' },
          { status: 500 }
        )
      }

      discordGuilds = await discordResponse.json()
    } catch (error) {
      console.error('Error fetching Discord guilds for verification:', error)
      return NextResponse.json(
        { error: 'Couldn\'t verify Discord server membership. Try again.' },
        { status: 500 }
      )
    }

    // Verify user is in the Discord server
    const isInDiscordServer = discordGuilds.some(
      (dg) => dg.id === guild.discord_server_id
    )

    if (!isInDiscordServer) {
      return NextResponse.json(
        { error: 'You must be a member of this guild\'s Discord server' },
        { status: 403 }
      )
    }

    // Use service role client to bypass RLS for character operations
    const serviceSupabase = createServiceRoleClient()

    // Check if user has any characters with a class set up (fully configured)
    const { data: existingCharacters } = await serviceSupabase
      .from('characters')
      .select('id, class_id')
      .eq('user_id', user.id)
      .not('class_id', 'is', null)
      .order('is_main', { ascending: false })
      .limit(1)

    // If user has no properly set up characters, join them to the guild anyway
    // but mark that they need to create a character
    if (!existingCharacters || existingCharacters.length === 0) {
      // Set the guild as their active guild even without a character
      // This allows the sidebar to show the guild while prompting for character creation
      await serviceSupabase
        .from('user_active_characters')
        .upsert({
          user_id: user.id,
          active_character_id: null,
          active_guild_id: guild_id,
          updated_at: new Date().toISOString()
        })

      return NextResponse.json({
        success: true,
        guild_id: guild_id,
        needs_character_creation: true,
        message: 'Joined guild - please create a character'
      })
    }

    const characterId = existingCharacters[0].id

    // Check if character has any membership (active or inactive) in this guild
    const { data: existingMembership } = await serviceSupabase
      .from('character_guild_memberships')
      .select('id, is_active')
      .eq('character_id', characterId)
      .eq('guild_id', guild_id)
      .single()

    if (existingMembership) {
      if (existingMembership.is_active) {
        // Already an active member - just set as active guild and return success
        await serviceSupabase
          .from('user_active_characters')
          .upsert({
            user_id: user.id,
            active_character_id: characterId,
            active_guild_id: guild_id,
            updated_at: new Date().toISOString()
          })

        return NextResponse.json({
          success: true,
          guild_id: guild_id,
          message: 'Already a member - set as active guild'
        })
      }

      // Reactivate inactive membership (user rejoining)
      const { error: reactivateError } = await serviceSupabase
        .from('character_guild_memberships')
        .update({
          is_active: true,
          role: 'Member',
          joined_at: new Date().toISOString(),
          joined_via: 'discord_verify'
        })
        .eq('id', existingMembership.id)

      if (reactivateError) {
        console.error('[DISCORD JOIN] Error reactivating membership:', reactivateError)
        return NextResponse.json(
          { error: 'Couldn\'t rejoin guild. Try again or contact an officer.' },
          { status: 500 }
        )
      }

      // Also reactivate legacy guild_members record
      await serviceSupabase
        .from('guild_members')
        .upsert({
          guild_id: guild_id,
          user_id: user.id,
          role: 'Member',
          is_active: true,
          joined_via: 'discord_verify'
        }, { onConflict: 'guild_id,user_id' })

      // Set as active character and guild for user
      await serviceSupabase
        .from('user_active_characters')
        .upsert({
          user_id: user.id,
          active_character_id: characterId,
          active_guild_id: guild_id,
          updated_at: new Date().toISOString()
        })

      return NextResponse.json({
        success: true,
        guild_id: guild_id,
        message: 'Successfully rejoined guild via Discord'
      })
    }

    // Create character guild membership
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
        { error: 'Couldn\'t join guild. Try again or contact an officer.' },
        { status: 500 }
      )
    }

    // Also create legacy guild_members record for backwards compatibility
    await serviceSupabase
      .from('guild_members')
      .upsert({
        guild_id: guild_id,
        user_id: user.id,
        role: 'Member',
        is_active: true,
        joined_via: 'discord_verify'
      }, { onConflict: 'guild_id,user_id' })

    // Set as active character and guild for user
    await serviceSupabase
      .from('user_active_characters')
      .upsert({
        user_id: user.id,
        active_character_id: characterId,
        active_guild_id: guild_id,
        updated_at: new Date().toISOString()
      })

    // Check if character needs setup (no class_id means they need to configure it)
    const { data: characterData } = await serviceSupabase
      .from('characters')
      .select('class_id')
      .eq('id', characterId)
      .single()

    const needsCharacterSetup = !characterData?.class_id

    return NextResponse.json({
      success: true,
      guild_id: guild_id,
      message: 'Successfully joined guild via Discord',
      needs_character_setup: needsCharacterSetup
    })
  } catch (error) {
    console.error('Error in POST /api/discord-guilds/join:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
