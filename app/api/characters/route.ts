import { NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { getCached, invalidateCache, cacheKeys } from '@/utils/cache'
import { revalidateUserBundle } from '@/lib/cache/user-bundle'
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
  // This regex matches Unicode letters
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
 * GET /api/characters
 * List all characters for the authenticated user
 * Optimized: Fast auth (getSession), single query with spec join, Redis caching (60s TTL)
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use cached data if available (30 second TTL)
    const characters = await getCached(
      cacheKeys.userCharacters(user.id),
      async () => {
        const { data, error } = await supabase
          .from('characters')
          .select(`
            *,
            class:wow_classes(
              id,
              name,
              color_hex
            ),
            spec:class_specs(
              id,
              name
            )
          `)
          .eq('user_id', user.id)
          .order('is_main', { ascending: false })
          .order('created_at', { ascending: true })

        if (error) {
          throw error
        }
        return data || []
      },
      60 // 60 second cache
    )

    return NextResponse.json({ characters })
  } catch (error) {
    console.error('Error in GET /api/characters:', error)
    trackApiError('unknown', 'GET /api/characters', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/characters
 * Create a new character for the authenticated user
 */
export async function POST(request: Request) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Parse request body
    const body = await request.json()
    const { name, realm, class_id, spec_id, level, is_main, region } = body

    // Validate and format character name (WoW rules)
    const nameValidation = validateCharacterName(name)
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.error },
        { status: 400 }
      )
    }
    const formattedName = nameValidation.formatted!

    if (!class_id) {
      return NextResponse.json(
        { error: 'Character class is required' },
        { status: 400 }
      )
    }

    // Check if character name + realm already exists for this user
    const { data: existingChar } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', formattedName)
      .eq('realm', realm || '')
      .maybeSingle()

    if (existingChar) {
      return NextResponse.json(
        { error: 'You already have a character with this name and realm' },
        { status: 409 }
      )
    }

    // If this is set as main, unset other mains
    if (is_main) {
      await supabase
        .from('characters')
        .update({ is_main: false })
        .eq('user_id', user.id)
    }

    // Create character
    const { data: character, error } = await supabase
      .from('characters')
      .insert({
        user_id: user.id,
        name: formattedName,
        realm: realm || null,
        class_id,
        spec_id: spec_id || null,
        level: level || null,
        is_main: is_main || false,
        region: region || 'us',
      })
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
      console.error('Error creating character:', error)
      return NextResponse.json(
        { error: 'Failed to create character' },
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

    // Invalidate cache after creating character
    await invalidateCache(cacheKeys.userCharacters(user.id))
    revalidateUserBundle(user.id)

    trackEvent({ event: 'character_created', userId: user.id, properties: { character_id: enrichedCharacter.id, character_name: enrichedCharacter.name } })

    return NextResponse.json({ character: enrichedCharacter }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/characters:', error)
    trackApiError('unknown', 'POST /api/characters', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
