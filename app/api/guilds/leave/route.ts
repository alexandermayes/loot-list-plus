import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// POST - Leave a guild
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

    // Check if user is a member of this guild
    const { data: membership, error: membershipError } = await supabase
      .from('guild_members')
      .select('id, guild_id')
      .eq('user_id', user.id)
      .eq('guild_id', guild_id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: 'You are not a member of this guild' },
        { status: 404 }
      )
    }

    // Delete the membership
    const { error: deleteError } = await supabase
      .from('guild_members')
      .delete()
      .eq('user_id', user.id)
      .eq('guild_id', guild_id)

    if (deleteError) {
      console.error('Error deleting guild membership:', deleteError)
      return NextResponse.json(
        { error: 'Failed to leave guild' },
        { status: 500 }
      )
    }

    // Check if user has any other guilds
    const { data: remainingMemberships } = await supabase
      .from('guild_members')
      .select('guild_id')
      .eq('user_id', user.id)
      .limit(1)

    // If user was leaving their active guild, update or clear their active guild
    const { data: activeGuild } = await supabase
      .from('user_active_guilds')
      .select('active_guild_id')
      .eq('user_id', user.id)
      .single()

    if (activeGuild?.active_guild_id === guild_id) {
      if (remainingMemberships && remainingMemberships.length > 0) {
        // Set another guild as active
        await supabase
          .from('user_active_guilds')
          .upsert({
            user_id: user.id,
            active_guild_id: remainingMemberships[0].guild_id,
            updated_at: new Date().toISOString()
          })
      } else {
        // No more guilds, delete active guild entry
        await supabase
          .from('user_active_guilds')
          .delete()
          .eq('user_id', user.id)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully left guild',
      has_other_guilds: remainingMemberships && remainingMemberships.length > 0
    })
  } catch (error) {
    console.error('Error in POST /api/guilds/leave:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
