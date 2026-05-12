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

    // Check character-based membership system
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

    if (characterMemberships.length === 0) {
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

    // Deactivate character memberships
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

    // Check if user has any other guild memberships
    let newActiveGuildId: string | null = null
    let hasOtherGuilds = false
    if (userCharacters && userCharacters.length > 0) {
      const characterIds = userCharacters.map(c => c.id)
      const { data: remainingMembership } = await supabase
        .from('character_guild_memberships')
        .select('guild_id')
        .in('character_id', characterIds)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle()

      if (remainingMembership) {
        hasOtherGuilds = true
        newActiveGuildId = remainingMembership.guild_id
      }
    }

    // If user was leaving their active guild, update or clear it
    const { data: activeCharData } = await supabase
      .from('user_active_characters')
      .select('active_guild_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const wasActiveGuild = activeCharData?.active_guild_id === guild_id

    if (wasActiveGuild) {
      // Update active guild to another guild, or clear it
      await supabase
        .from('user_active_characters')
        .update({
          active_guild_id: newActiveGuildId || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
    }

    trackEvent({ event: 'guild_left', userId: user.id, guildId: guild_id, properties: { guild_id } })

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
