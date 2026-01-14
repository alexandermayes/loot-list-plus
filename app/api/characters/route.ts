import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * GET /api/characters
 * List all characters for the authenticated user
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

    // Fetch user's characters with class information
    const { data: characters, error } = await supabase
      .from('characters')
      .select(`
        *,
        class:wow_classes(
          id,
          name,
          color_hex
        )
      `)
      .eq('user_id', user.id)
      .order('is_main', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching characters:', error)
      return NextResponse.json(
        { error: 'Failed to fetch characters' },
        { status: 500 }
      )
    }

    // Fetch specs separately for characters that have spec_id
    let enrichedCharacters = characters || []
    if (characters && characters.length > 0) {
      const specIds = characters
        .map(c => c.spec_id)
        .filter(Boolean) as string[]

      if (specIds.length > 0) {
        const { data: specs } = await supabase
          .from('class_specs')
          .select('id, name')
          .in('id', specIds)

        enrichedCharacters = characters.map(char => ({
          ...char,
          spec: specs?.find(s => s.id === char.spec_id) || null
        }))
      }
    }

    return NextResponse.json({ characters: enrichedCharacters })
  } catch (error) {
    console.error('Error in GET /api/characters:', error)
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
    const { name, realm, class_id, spec_id, level, is_main, region } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Character name is required' },
        { status: 400 }
      )
    }

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
      .eq('name', name)
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
        name,
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

    return NextResponse.json({ character: enrichedCharacter }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/characters:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
