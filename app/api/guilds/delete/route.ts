import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// POST - Delete a guild (only creator can delete)
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

    // Check if user is the creator of this guild
    const { data: guild, error: guildError } = await supabase
      .from('guilds')
      .select('id, created_by, name')
      .eq('id', guild_id)
      .single()

    if (guildError || !guild) {
      return NextResponse.json(
        { error: 'Guild not found' },
        { status: 404 }
      )
    }

    if (guild.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only the guild creator can delete the guild' },
        { status: 403 }
      )
    }

    // Try to use the delete_guild function if it exists
    const { error: deleteError } = await supabase.rpc('delete_guild', {
      p_guild_id: guild_id
    })

    if (deleteError) {
      console.error('Error calling delete_guild function:', deleteError)
      // If the function doesn't exist or fails, manually delete
      // This will cascade delete related data if foreign keys are set up properly
      const { error: manualDeleteError } = await supabase
        .from('guilds')
        .delete()
        .eq('id', guild_id)

      if (manualDeleteError) {
        console.error('Error manually deleting guild:', manualDeleteError)
        return NextResponse.json(
          { error: 'Failed to delete guild' },
          { status: 500 }
        )
      }
    }

    // Check if user has any other guilds
    const { data: remainingMemberships } = await supabase
      .from('guild_members')
      .select('guild_id')
      .eq('user_id', user.id)
      .limit(1)

    // Clear active guild entry since it was deleted
    await supabase
      .from('user_active_guilds')
      .delete()
      .eq('user_id', user.id)
      .eq('active_guild_id', guild_id)

    return NextResponse.json({
      success: true,
      message: 'Guild deleted successfully',
      has_other_guilds: remainingMemberships && remainingMemberships.length > 0
    })
  } catch (error) {
    console.error('Error in POST /api/guilds/delete:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
