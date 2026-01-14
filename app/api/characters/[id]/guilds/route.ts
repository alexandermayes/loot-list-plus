import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * GET /api/characters/[id]/guilds
 * Get all guilds for a specific character
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify character belongs to user
    const { data: character } = await supabase
      .from('characters')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found or unauthorized' },
        { status: 404 }
      )
    }

    // Fetch character's guild memberships
    const { data: memberships, error } = await supabase
      .from('character_guild_memberships')
      .select(`
        id,
        role,
        is_active,
        joined_at,
        joined_via,
        guild:guilds(
          id,
          name,
          icon_url,
          discord_server_id
        )
      `)
      .eq('character_id', id)
      .eq('is_active', true)
      .order('joined_at', { ascending: false })

    if (error) {
      console.error('Error fetching character guilds:', error)
      return NextResponse.json(
        { error: 'Failed to fetch character guilds' },
        { status: 500 }
      )
    }

    return NextResponse.json({ memberships })
  } catch (error) {
    console.error('Error in GET /api/characters/[id]/guilds:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/characters/[id]/guilds
 * Add a character to a guild
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify character belongs to user
    const { data: character } = await supabase
      .from('characters')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found or unauthorized' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { guild_id, role = 'Member', joined_via = 'manual' } = body

    if (!guild_id) {
      return NextResponse.json(
        { error: 'Guild ID is required' },
        { status: 400 }
      )
    }

    // Check if membership already exists
    const { data: existingMembership } = await supabase
      .from('character_guild_memberships')
      .select('id, is_active')
      .eq('character_id', id)
      .eq('guild_id', guild_id)
      .maybeSingle()

    if (existingMembership) {
      if (existingMembership.is_active) {
        return NextResponse.json(
          { error: 'Character is already a member of this guild' },
          { status: 409 }
        )
      } else {
        // Reactivate membership
        const { data: membership, error } = await supabase
          .from('character_guild_memberships')
          .update({ is_active: true })
          .eq('id', existingMembership.id)
          .select(`
            id,
            role,
            is_active,
            joined_at,
            joined_via,
            guild:guilds(
              id,
              name,
              icon_url
            )
          `)
          .single()

        if (error) {
          console.error('Error reactivating membership:', error)
          return NextResponse.json(
            { error: 'Failed to reactivate guild membership' },
            { status: 500 }
          )
        }

        return NextResponse.json({ membership }, { status: 200 })
      }
    }

    // Create new membership
    const { data: membership, error } = await supabase
      .from('character_guild_memberships')
      .insert({
        character_id: id,
        guild_id,
        role,
        joined_via,
      })
      .select(`
        id,
        role,
        is_active,
        joined_at,
        joined_via,
        guild:guilds(
          id,
          name,
          icon_url
        )
      `)
      .single()

    if (error) {
      console.error('Error creating guild membership:', error)
      return NextResponse.json(
        { error: 'Failed to add character to guild' },
        { status: 500 }
      )
    }

    return NextResponse.json({ membership }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/characters/[id]/guilds:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/characters/[id]/guilds
 * Remove a character from a guild
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Parse request body
    const body = await request.json()
    const { guild_id } = body

    if (!guild_id) {
      return NextResponse.json(
        { error: 'Guild ID is required' },
        { status: 400 }
      )
    }

    // Verify character belongs to user
    const { data: character } = await supabase
      .from('characters')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!character) {
      return NextResponse.json(
        { error: 'Character not found or unauthorized' },
        { status: 404 }
      )
    }

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('character_guild_memberships')
      .update({ is_active: false })
      .eq('character_id', id)
      .eq('guild_id', guild_id)

    if (error) {
      console.error('Error removing character from guild:', error)
      return NextResponse.json(
        { error: 'Failed to remove character from guild' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/characters/[id]/guilds:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
