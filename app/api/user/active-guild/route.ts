import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'

// GET - Get user's active guild
export async function GET() {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get active guild
    const { data: activeGuild, error: activeGuildError } = await supabase
      .from('user_active_guilds')
      .select(`
        active_guild_id,
        guild:guilds (
          id,
          name,
          realm,
          faction,
          discord_server_id,
          created_by,
          is_active,
          require_discord_verification,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .single()

    if (activeGuildError || !activeGuild) {
      return NextResponse.json(
        { error: 'No active guild found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      active_guild_id: activeGuild.active_guild_id,
      guild: activeGuild.guild
    })
  } catch (error) {
    console.error('Error in GET /api/user/active-guild:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Set user's active guild
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

    // Verify user is a member of this guild (check both old and new systems)
    // Check old system first
    const { data: oldMembership } = await supabase
      .from('guild_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('guild_id', guild_id)
      .maybeSingle()

    // Check new character-based system
    let hasCharacterMembership = false
    const { data: userCharacters } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)

    if (userCharacters && userCharacters.length > 0) {
      const characterIds = userCharacters.map(c => c.id)
      const { data: charMembership } = await supabase
        .from('character_guild_memberships')
        .select('id')
        .eq('guild_id', guild_id)
        .in('character_id', characterIds)
        .eq('is_active', true)
        .limit(1)

      hasCharacterMembership = !!(charMembership && charMembership.length > 0)
    }

    if (!oldMembership && !hasCharacterMembership) {
      return NextResponse.json(
        { error: 'You are not a member of this guild' },
        { status: 403 }
      )
    }

    // Upsert active guild
    const { error: upsertError } = await supabase
      .from('user_active_guilds')
      .upsert({
        user_id: user.id,
        active_guild_id: guild_id,
        updated_at: new Date().toISOString()
      })

    if (upsertError) {
      console.error('Error setting active guild:', upsertError)
      return NextResponse.json(
        { error: 'Failed to set active guild' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      active_guild_id: guild_id,
      message: 'Active guild updated successfully'
    })
  } catch (error) {
    console.error('Error in POST /api/user/active-guild:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
