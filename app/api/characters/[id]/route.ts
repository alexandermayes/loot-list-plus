import { NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackApiError, trackEvent } from '@/utils/analytics/server'

// WoW character name validation and formatting
// Rules: 2-12 characters, letters only (accents allowed), first letter capitalized
function validateCharacterName(name: string): { valid: boolean; error?: string; formatted?: string } {
  if (!name) {
    return { valid: false, error: 'Character name is required' }
  }

  const trimmed = name.trim()

  if (trimmed.length < 2) {
    return { valid: false, error: 'Character name must be at least 2 characters' }
  }

  if (trimmed.length > 12) {
    return { valid: false, error: 'Character name must be 12 characters or less' }
  }

  // Only letters (including accented characters like é, ñ, etc.)
  if (!/^[\p{L}]+$/u.test(trimmed)) {
    return { valid: false, error: 'Character name can only contain letters' }
  }

  // Format: first letter uppercase, rest lowercase (like WoW)
  // Guard against characters like ß where toUpperCase() expands to multiple chars (ß → SS)
  const firstChar = trimmed.charAt(0)
  const upperFirst = firstChar.toUpperCase()
  const formatted = (upperFirst.length > 1 ? firstChar : upperFirst) + trimmed.slice(1).toLowerCase()

  return { valid: true, formatted }
}

/**
 * GET /api/characters/[id]
 * Get a specific character by ID
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

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

    return NextResponse.json(
      { character: enrichedCharacter },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=120'
        }
      }
    )
  } catch (error) {
    console.error('Error in GET /api/characters/[id]:', error)
    trackApiError('unknown', 'GET /api/characters/[id]', error instanceof Error ? error : new Error(String(error)))
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
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

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
    const updateData: {
      updated_at: string
      name?: string
      realm?: string | null
      class_id?: string
      spec_id?: string | null
      level?: number
      is_main?: boolean
      region?: string
    } = {
      updated_at: new Date().toISOString(),
    }

    // Validate and format name if provided
    if (name !== undefined) {
      const nameValidation = validateCharacterName(name)
      if (!nameValidation.valid) {
        return NextResponse.json(
          { error: nameValidation.error },
          { status: 400 }
        )
      }
      updateData.name = nameValidation.formatted
    }
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

    trackEvent({ event: 'character_updated', userId: user.id, properties: { character_id: id } })

    return NextResponse.json({ character: enrichedCharacter })
  } catch (error) {
    console.error('Error in PUT /api/characters/[id]:', error)
    trackApiError('unknown', 'PUT /api/characters/[id]', error instanceof Error ? error : new Error(String(error)))
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
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

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

      // Update the active character (keep active_guild_id so user stays in guild)
      await adminClient
        .from('user_active_characters')
        .update({
          active_character_id: newActiveCharId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
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
        { error: 'Failed to delete character' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/characters/[id]:', error)
    trackApiError('unknown', 'DELETE /api/characters/[id]', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
