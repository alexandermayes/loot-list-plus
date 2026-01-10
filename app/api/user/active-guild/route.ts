import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// GET - Get user's active guild
export async function GET() {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Verify user is a member of this guild
    const { data: membership, error: membershipError } = await supabase
      .from('guild_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('guild_id', guild_id)
      .single()

    if (membershipError || !membership) {
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
