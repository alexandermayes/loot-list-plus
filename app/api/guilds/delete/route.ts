import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { trackApiError } from '@/utils/analytics/server'

// POST - Delete a guild (only creator can delete)
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

    // Check if user has any other guilds via character memberships
    const { data: userChars } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)

    let hasOtherGuilds = false
    if (userChars && userChars.length > 0) {
      const { data: remaining } = await supabase
        .from('character_guild_memberships')
        .select('guild_id')
        .in('character_id', userChars.map(c => c.id))
        .eq('is_active', true)
        .limit(1)

      hasOtherGuilds = !!(remaining && remaining.length > 0)
    }

    // Clear active guild if it was the deleted guild
    const { data: activeChar } = await supabase
      .from('user_active_characters')
      .select('active_guild_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (activeChar?.active_guild_id === guild_id) {
      await supabase
        .from('user_active_characters')
        .update({ active_guild_id: null, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Guild deleted successfully',
      has_other_guilds: hasOtherGuilds
    })
  } catch (error) {
    console.error('Error in POST /api/guilds/delete:', error)
    trackApiError('unknown', 'POST /api/guilds/delete', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
