import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * GET /api/user/active-character
 * Get the user's currently active character and guild
 */
export async function GET() {
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

    // Fetch user's active character selection
    const { data: activeSelection, error } = await supabase
      .from('user_active_characters')
      .select(`
        active_character_id,
        active_guild_id,
        character:characters(
          id,
          name,
          realm,
          level,
          is_main,
          class:wow_classes(
            id,
            name,
            color_hex
          ),
          spec:class_specs(
            id,
            name
          )
        ),
        guild:guilds(
          id,
          name,
          icon_url
        )
      `)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching active character:', error)
      return NextResponse.json(
        { error: 'Failed to fetch active character' },
        { status: 500 }
      )
    }

    return NextResponse.json({ activeSelection })
  } catch (error) {
    console.error('Error in GET /api/user/active-character:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/user/active-character
 * Update the user's active character and/or guild
 */
export async function PUT(request: Request) {
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

    // Parse request body
    const body = await request.json()
    const { character_id, guild_id } = body

    // Validate that character belongs to user (if provided)
    if (character_id) {
      const { data: character } = await supabase
        .from('characters')
        .select('id')
        .eq('id', character_id)
        .eq('user_id', user.id)
        .single()

      if (!character) {
        return NextResponse.json(
          { error: 'Character not found or unauthorized' },
          { status: 404 }
        )
      }

      // If guild_id is provided, verify character is in that guild
      if (guild_id) {
        const { data: membership } = await supabase
          .from('character_guild_memberships')
          .select('id')
          .eq('character_id', character_id)
          .eq('guild_id', guild_id)
          .eq('is_active', true)
          .single()

        if (!membership) {
          return NextResponse.json(
            { error: 'Character is not a member of this guild' },
            { status: 400 }
          )
        }
      }
    }

    // Check if record exists
    const { data: existing } = await supabase
      .from('user_active_characters')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (character_id !== undefined) updateData.active_character_id = character_id
    if (guild_id !== undefined) updateData.active_guild_id = guild_id

    if (existing) {
      // Update existing record
      const { data: activeSelection, error } = await supabase
        .from('user_active_characters')
        .update(updateData)
        .eq('user_id', user.id)
        .select(`
          active_character_id,
          active_guild_id,
          character:characters(
            id,
            name,
            realm,
            level,
            is_main,
            class:wow_classes(
              id,
              name,
              color_hex
            ),
            spec:class_specs(
              id,
              name
            )
          ),
          guild:guilds(
            id,
            name,
            icon_url
          )
        `)
        .single()

      if (error) {
        console.error('Error updating active character:', error)
        return NextResponse.json(
          { error: 'Failed to update active character' },
          { status: 500 }
        )
      }

      return NextResponse.json({ activeSelection })
    } else {
      // Insert new record
      const { data: activeSelection, error } = await supabase
        .from('user_active_characters')
        .insert({
          user_id: user.id,
          ...updateData,
        })
        .select(`
          active_character_id,
          active_guild_id,
          character:characters(
            id,
            name,
            realm,
            level,
            is_main,
            class:wow_classes(
              id,
              name,
              color_hex
            ),
            spec:class_specs(
              id,
              name
            )
          ),
          guild:guilds(
            id,
            name,
            icon_url
          )
        `)
        .single()

      if (error) {
        console.error('Error creating active character:', error)
        return NextResponse.json(
          { error: 'Failed to set active character' },
          { status: 500 }
        )
      }

      return NextResponse.json({ activeSelection })
    }
  } catch (error) {
    console.error('Error in PUT /api/user/active-character:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
