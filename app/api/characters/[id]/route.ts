import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

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
 * Delete a character (requires name confirmation, cascades to loot submissions)
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

    // Parse request body for confirmation
    let confirmName = ''
    try {
      const body = await request.json()
      confirmName = body.confirmName || ''
    } catch {
      // No body provided
    }

    // Get the character to verify ownership and name
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, name, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (charError || !character) {
      return NextResponse.json(
        { error: 'Character not found or unauthorized' },
        { status: 404 }
      )
    }

    // Verify confirmation name matches (case-insensitive)
    if (confirmName.toLowerCase() !== character.name.toLowerCase()) {
      return NextResponse.json(
        { error: 'Character name confirmation does not match' },
        { status: 400 }
      )
    }

    // Use service role client for deletions to bypass RLS
    const adminClient = createServiceRoleClient()

    // Delete loot submission items first (they reference loot_submissions)
    const { data: submissions } = await adminClient
      .from('loot_submissions')
      .select('id')
      .eq('character_id', id)

    if (submissions && submissions.length > 0) {
      const submissionIds = submissions.map(s => s.id)

      // Delete loot submission items
      const { error: itemsError } = await adminClient
        .from('loot_submission_items')
        .delete()
        .in('submission_id', submissionIds)

      if (itemsError) {
        console.error('Error deleting submission items:', itemsError)
        return NextResponse.json(
          { error: 'Failed to delete character loot data' },
          { status: 500 }
        )
      }

      // Delete loot submissions
      const { error: submissionsError } = await adminClient
        .from('loot_submissions')
        .delete()
        .eq('character_id', id)

      if (submissionsError) {
        console.error('Error deleting submissions:', submissionsError)
        return NextResponse.json(
          { error: 'Failed to delete character submissions' },
          { status: 500 }
        )
      }
    }

    // Check if this character is the user's active character
    const { data: activeCharData } = await adminClient
      .from('user_active_characters')
      .select('active_character_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (activeCharData?.active_character_id === id) {
      // Find another character to set as active, or clear if none
      const { data: otherCharacters } = await adminClient
        .from('characters')
        .select('id')
        .eq('user_id', user.id)
        .neq('id', id)
        .order('is_main', { ascending: false })
        .limit(1)

      const newActiveCharId = otherCharacters?.[0]?.id || null

      // Update or delete the active character record
      if (newActiveCharId) {
        await adminClient
          .from('user_active_characters')
          .update({
            active_character_id: newActiveCharId,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
      } else {
        // No other characters, delete the active character record
        await adminClient
          .from('user_active_characters')
          .delete()
          .eq('user_id', user.id)
      }
    }

    // Delete character (will cascade to character_guild_memberships)
    const { error, data: deletedData } = await adminClient
      .from('characters')
      .delete()
      .eq('id', id)
      .select()

    if (error) {
      console.error('Error deleting character:', error)
      return NextResponse.json(
        { error: 'Failed to delete character', details: error.message, code: error.code },
        { status: 500 }
      )
    }

    console.log('Character deleted successfully:', id, deletedData)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/characters/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
