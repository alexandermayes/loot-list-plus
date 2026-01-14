import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * GET /api/characters/[id]
 * Get a specific character by ID
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

    // Fetch character with class information
    const { data: character, error } = await supabase
      .from('characters')
      .select(`
        *,
        class:wow_classes(
          id,
          name,
          color_hex
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !character) {
      return NextResponse.json(
        { error: 'Character not found' },
        { status: 404 }
      )
    }

    // Fetch spec separately if spec_id exists
    let enrichedCharacter = character
    if (character.spec_id) {
      const { data: spec } = await supabase
        .from('class_specs')
        .select('id, name')
        .eq('id', character.spec_id)
        .single()

      enrichedCharacter = {
        ...character,
        spec
      }
    }

    return NextResponse.json({ character: enrichedCharacter })
  } catch (error) {
    console.error('Error in GET /api/characters/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/characters/[id]
 * Update a character
 */
export async function PUT(
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
    const { data: existingChar } = await supabase
      .from('characters')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!existingChar) {
      return NextResponse.json(
        { error: 'Character not found or unauthorized' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, realm, class_id, spec_id, level, is_main, region } = body

    // If setting as main, unset other mains
    if (is_main) {
      await supabase
        .from('characters')
        .update({ is_main: false })
        .eq('user_id', user.id)
        .neq('id', id)
    }

    // Update character
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (name !== undefined) updateData.name = name
    if (realm !== undefined) updateData.realm = realm || null
    if (class_id !== undefined) updateData.class_id = class_id
    if (spec_id !== undefined) updateData.spec_id = spec_id || null
    if (level !== undefined) updateData.level = level
    if (is_main !== undefined) updateData.is_main = is_main
    if (region !== undefined) updateData.region = region

    const { data: character, error } = await supabase
      .from('characters')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(`
        *,
        class:wow_classes(
          id,
          name,
          color_hex
        )
      `)
      .single()

    if (error) {
      console.error('Error updating character:', error)
      return NextResponse.json(
        { error: 'Failed to update character' },
        { status: 500 }
      )
    }

    // Fetch spec separately if spec_id exists
    let enrichedCharacter = character
    if (character && character.spec_id) {
      const { data: spec } = await supabase
        .from('class_specs')
        .select('id, name')
        .eq('id', character.spec_id)
        .single()

      enrichedCharacter = {
        ...character,
        spec
      }
    }

    return NextResponse.json({ character: enrichedCharacter })
  } catch (error) {
    console.error('Error in PUT /api/characters/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/characters/[id]
 * Delete a character
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

    // Check if character has any loot submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from('loot_submissions')
      .select('id')
      .eq('character_id', id)
      .limit(1)

    if (submissionsError) {
      console.error('Error checking submissions:', submissionsError)
      return NextResponse.json(
        { error: 'Failed to check character submissions' },
        { status: 500 }
      )
    }

    if (submissions && submissions.length > 0) {
      return NextResponse.json(
        {
          error:
            'Cannot delete character with existing loot submissions. Please remove submissions first.',
        },
        { status: 409 }
      )
    }

    // Delete character (will cascade to character_guild_memberships)
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting character:', error)
      return NextResponse.json(
        { error: 'Failed to delete character' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/characters/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
