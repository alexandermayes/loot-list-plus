import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { trackApiError, trackEvent } from '@/utils/analytics/server'

// POST - Leave a guild
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

    // Check if user is a member of this guild (check both old and new systems)
    const { data: oldMembership } = await supabase
      .from('guild_members')
      .select('id, guild_id')
      .eq('user_id', user.id)
      .eq('guild_id', guild_id)
      .maybeSingle()

    // Check new character-based system
    const { data: userCharacters } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)

    let characterMemberships: { id: string; character_id: string }[] = []
    if (userCharacters && userCharacters.length > 0) {
      const characterIds = userCharacters.map(c => c.id)
      const { data: charMemberships } = await supabase
        .from('character_guild_memberships')
        .select('id, character_id')
        .eq('guild_id', guild_id)
        .in('character_id', characterIds)
        .eq('is_active', true)

      if (charMemberships) {
        characterMemberships = charMemberships
      }
    }

    if (!oldMembership && characterMemberships.length === 0) {
      return NextResponse.json(
        { error: 'You are not a member of this guild' },
        { status: 404 }
      )
    }

    // Check if user is the creator of the guild
    const { data: guild, error: guildError } = await supabase
      .from('guilds')
      .select('created_by')
      .eq('id', guild_id)
      .single()

    if (guild && guild.created_by === user.id) {
      return NextResponse.json(
        { error: 'Guild creators cannot leave their guild. You must delete the guild instead.' },
        { status: 403 }
      )
    }

    // Delete the old system membership if exists
    if (oldMembership) {
      const { error: deleteError } = await supabase
        .from('guild_members')
        .delete()
        .eq('user_id', user.id)
        .eq('guild_id', guild_id)

      if (deleteError) {
        console.error('Error deleting guild membership:', deleteError)
      }
    }

    // Delete character memberships (new system)
    if (characterMemberships.length > 0) {
      const charMembershipIds = characterMemberships.map(m => m.id)
      const { error: charDeleteError } = await supabase
        .from('character_guild_memberships')
        .update({ is_active: false })
        .in('id', charMembershipIds)

      if (charDeleteError) {
        console.error('Error deleting character memberships:', charDeleteError)
        return NextResponse.json(
          { error: 'Failed to leave guild' },
          { status: 500 }
        )
      }
    }

    // Check if user has any other guilds (check both systems)
    const { data: remainingOldMemberships } = await supabase
      .from('guild_members')
      .select('guild_id')
      .eq('user_id', user.id)
      .limit(1)

    let hasRemainingCharMemberships = false
    if (userCharacters && userCharacters.length > 0) {
      const characterIds = userCharacters.map(c => c.id)
      const { data: remainingCharMemberships } = await supabase
        .from('character_guild_memberships')
        .select('guild_id')
        .in('character_id', characterIds)
        .eq('is_active', true)
        .limit(1)

      hasRemainingCharMemberships = !!(remainingCharMemberships && remainingCharMemberships.length > 0)
    }

    // Determine if user has any remaining guilds
    const hasOtherGuilds = (remainingOldMemberships && remainingOldMemberships.length > 0) || hasRemainingCharMemberships

    // Find a guild_id to set as the new active guild
    let newActiveGuildId: string | null = null
    if (remainingOldMemberships && remainingOldMemberships.length > 0) {
      newActiveGuildId = remainingOldMemberships[0].guild_id
    } else if (hasRemainingCharMemberships && userCharacters && userCharacters.length > 0) {
      // Get the first remaining character membership's guild
      const characterIds = userCharacters.map(c => c.id)
      const { data: firstCharMembership } = await supabase
        .from('character_guild_memberships')
        .select('guild_id')
        .in('character_id', characterIds)
        .eq('is_active', true)
        .limit(1)
        .single()

      if (firstCharMembership) {
        newActiveGuildId = firstCharMembership.guild_id
      }
    }

    // If user was leaving their active guild, update or clear their active guild
    const { data: activeGuild } = await supabase
      .from('user_active_guilds')
      .select('active_guild_id')
      .eq('user_id', user.id)
      .single()

    // Also check user_active_characters (new system)
    const { data: activeCharData } = await supabase
      .from('user_active_characters')
      .select('active_guild_id')
      .eq('user_id', user.id)
      .single()

    const wasActiveGuild = activeGuild?.active_guild_id === guild_id || activeCharData?.active_guild_id === guild_id

    if (wasActiveGuild) {
      if (newActiveGuildId) {
        // Set another guild as active (old system)
        await supabase
          .from('user_active_guilds')
          .upsert({
            user_id: user.id,
            active_guild_id: newActiveGuildId,
            updated_at: new Date().toISOString()
          })

        // Set another guild as active (new system)
        await supabase
          .from('user_active_characters')
          .update({
            active_guild_id: newActiveGuildId,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
      } else {
        // No more guilds, delete active guild entries
        await supabase
          .from('user_active_guilds')
          .delete()
          .eq('user_id', user.id)

        // Clear active guild in user_active_characters (but keep the record for character)
        await supabase
          .from('user_active_characters')
          .update({
            active_guild_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
      }
    }

    trackEvent({ event: 'guild_left', userId: user.id, properties: { guild_id } })

    return NextResponse.json({
      success: true,
      message: 'Successfully left guild',
      has_other_guilds: hasOtherGuilds
    })
  } catch (error) {
    console.error('Error in POST /api/guilds/leave:', error)
    trackApiError('unknown', 'POST /api/guilds/leave', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
