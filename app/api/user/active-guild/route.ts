import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'

// GET - Get user's active guild (reads from user_active_characters, the source of truth)
export async function GET() {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: activeData } = await supabase
      .from('user_active_characters')
      .select('active_guild_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!activeData?.active_guild_id) {
      return NextResponse.json(
        { error: 'No active guild found' },
        { status: 404 }
      )
    }

    const { data: guild } = await supabase
      .from('guilds')
      .select('id, name, realm, faction, discord_server_id, created_by, is_active, require_discord_verification, created_at')
      .eq('id', activeData.active_guild_id)
      .single()

    return NextResponse.json({
      active_guild_id: activeData.active_guild_id,
      guild
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

    // Verify user is a member of this guild via character memberships
    const { data: userCharacters } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)

    let isMember = false
    if (userCharacters && userCharacters.length > 0) {
      const characterIds = userCharacters.map(c => c.id)
      const { data: charMembership } = await supabase
        .from('character_guild_memberships')
        .select('id')
        .eq('guild_id', guild_id)
        .in('character_id', characterIds)
        .eq('is_active', true)
        .limit(1)

      isMember = !!(charMembership && charMembership.length > 0)
    }

    if (!isMember) {
      return NextResponse.json(
        { error: 'You are not a member of this guild' },
        { status: 403 }
      )
    }

    // Update active guild in user_active_characters (source of truth for GuildContext)
    const { error: upsertError } = await supabase
      .from('user_active_characters')
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
