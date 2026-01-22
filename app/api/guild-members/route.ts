import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

// GET - List all members of a guild (uses service role to bypass RLS)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const serviceSupabase = createServiceRoleClient()

    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get guild_id from query params
    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get('guild_id')

    if (!guildId) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    // Verify user is a member of this guild (check via their characters)
    const { data: userCharacters } = await serviceSupabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)

    if (!userCharacters || userCharacters.length === 0) {
      return NextResponse.json({ error: 'No characters found' }, { status: 403 })
    }

    const characterIds = userCharacters.map(c => c.id)

    const { data: userMembership } = await serviceSupabase
      .from('character_guild_memberships')
      .select('role')
      .eq('guild_id', guildId)
      .in('character_id', characterIds)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!userMembership) {
      return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
    }

    // Get all character guild memberships for this guild (using service role)
    const { data: memberships, error: membershipsError } = await serviceSupabase
      .from('character_guild_memberships')
      .select(`
        id,
        character_id,
        role,
        joined_at,
        joined_via,
        character:characters (
          id,
          user_id,
          name,
          is_main,
          class:wow_classes (
            name,
            color_hex
          ),
          spec:class_specs (
            name
          )
        )
      `)
      .eq('guild_id', guildId)
      .eq('is_active', true)

    if (membershipsError) {
      console.error('Error loading memberships:', membershipsError)
      return NextResponse.json({ error: 'Failed to load members' }, { status: 500 })
    }

    // Group characters by user_id
    const userCharacterMap = new Map<string, {
      characters: any[]
      role: string
      joined_at: string
      joined_via: string
    }>()

    for (const membership of memberships || []) {
      const char = Array.isArray(membership.character) ? membership.character[0] : membership.character
      if (!char) continue

      const userId = char.user_id
      const existing = userCharacterMap.get(userId)

      const charData = {
        id: char.id,
        name: char.name,
        is_main: char.is_main,
        class: Array.isArray(char.class) ? char.class[0] : char.class,
        spec: Array.isArray(char.spec) ? char.spec[0] : char.spec
      }

      if (existing) {
        existing.characters.push(charData)
        // Use highest role (simple comparison: Guild Master > Officer > Member)
        const roleOrder = { 'Guild Master': 3, 'Officer': 2, 'Member': 1 }
        if ((roleOrder[membership.role as keyof typeof roleOrder] || 0) > (roleOrder[existing.role as keyof typeof roleOrder] || 0)) {
          existing.role = membership.role
        }
      } else {
        userCharacterMap.set(userId, {
          characters: [charData],
          role: membership.role,
          joined_at: membership.joined_at,
          joined_via: membership.joined_via
        })
      }
    }

    // Get user IDs for display names
    const userIds = Array.from(userCharacterMap.keys())

    // Get display names from auth.users via service role
    let displayNameMap = new Map<string, string>()

    if (userIds.length > 0) {
      // Get user metadata for Discord names
      const { data: usersData } = await serviceSupabase.auth.admin.listUsers()

      if (usersData?.users) {
        for (const authUser of usersData.users) {
          if (userIds.includes(authUser.id)) {
            const displayName = authUser.user_metadata?.custom_claims?.global_name
              || authUser.user_metadata?.full_name
              || authUser.user_metadata?.name
              || 'Unknown User'
            displayNameMap.set(authUser.id, displayName)
          }
        }
      }
    }

    // Build members array
    const members = Array.from(userCharacterMap.entries()).map(([userId, data]) => {
      // Sort characters - main first, then alphabetically
      data.characters.sort((a, b) => {
        if (a.is_main && !b.is_main) return -1
        if (!a.is_main && b.is_main) return 1
        return a.name.localeCompare(b.name)
      })

      const mainChar = data.characters.find(c => c.is_main) || data.characters[0] || null

      return {
        user_id: userId,
        role: data.role,
        joined_at: data.joined_at,
        joined_via: data.joined_via,
        characters: data.characters,
        mainCharacter: mainChar,
        discordName: displayNameMap.get(userId) || 'Unknown User'
      }
    })

    // Sort by role hierarchy then by name
    const roleOrder = { 'Guild Master': 3, 'Officer': 2, 'Member': 1 }
    members.sort((a, b) => {
      const aOrder = roleOrder[a.role as keyof typeof roleOrder] || 0
      const bOrder = roleOrder[b.role as keyof typeof roleOrder] || 0

      if (aOrder !== bOrder) {
        return bOrder - aOrder // Higher role first
      }

      const aName = a.mainCharacter?.name || a.discordName
      const bName = b.mainCharacter?.name || b.discordName
      return aName.localeCompare(bName)
    })

    return NextResponse.json({ members })
  } catch (error) {
    console.error('Error in GET /api/guild-members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
