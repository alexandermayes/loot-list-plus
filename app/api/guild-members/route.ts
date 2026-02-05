import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions, verifyRoleChangePermissions, verifyMemberRemovalPermissions } from '@/utils/server-roles'
import { ROLE_POSITIONS } from '@/utils/roles'

// GET - List all members of a guild (uses service role to bypass RLS)
export async function GET(request: NextRequest) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleClient()

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
        membership_status,
        trial_started_at,
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

    // Get guild roles for position-based sorting
    const { data: guildRoles } = await serviceSupabase
      .from('guild_roles')
      .select('name, position')
      .eq('guild_id', guildId)

    // Create role position map (fallback to defaults if no custom roles)
    const rolePositionMap = new Map<string, number>()
    if (guildRoles && guildRoles.length > 0) {
      guildRoles.forEach((r: any) => rolePositionMap.set(r.name, r.position))
    } else {
      // Default positions
      rolePositionMap.set('Guild Master', ROLE_POSITIONS.GUILD_MASTER)
      rolePositionMap.set('Officer', ROLE_POSITIONS.OFFICER)
      rolePositionMap.set('Member', ROLE_POSITIONS.MEMBER)
    }

    // Group characters by user_id
    const userCharacterMap = new Map<string, {
      characters: any[]
      role: string
      joined_at: string
      joined_via: string
      membership_status: string
      trial_started_at: string | null
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
        // Use highest role based on position from rolePositionMap
        if ((rolePositionMap.get(membership.role) || 0) > (rolePositionMap.get(existing.role) || 0)) {
          existing.role = membership.role
        }
        // If any character is on trial, mark user as trial
        if (membership.membership_status === 'trial') {
          existing.membership_status = 'trial'
          existing.trial_started_at = membership.trial_started_at
        }
      } else {
        userCharacterMap.set(userId, {
          characters: [charData],
          role: membership.role,
          joined_at: membership.joined_at,
          joined_via: membership.joined_via,
          membership_status: membership.membership_status || 'full',
          trial_started_at: membership.trial_started_at || null
        })
      }
    }

    // Get user IDs for display names
    const userIds = Array.from(userCharacterMap.keys())

    // Get display names from auth.users via service role
    let displayNameMap = new Map<string, string>()

    if (userIds.length > 0) {
      // Fetch user metadata only for the specific users we need (instead of listing ALL users)
      // This is O(guild_members) instead of O(all_users) - major performance improvement
      const userPromises = userIds.map(userId =>
        serviceSupabase.auth.admin.getUserById(userId)
      )
      const userResults = await Promise.all(userPromises)

      for (const result of userResults) {
        if (result.data?.user) {
          const authUser = result.data.user
          const displayName = authUser.user_metadata?.custom_claims?.global_name
            || authUser.user_metadata?.full_name
            || authUser.user_metadata?.name
            || 'Unknown User'
          displayNameMap.set(authUser.id, displayName)
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
        membership_status: data.membership_status,
        trial_started_at: data.trial_started_at,
        characters: data.characters,
        mainCharacter: mainChar,
        discordName: displayNameMap.get(userId) || 'Unknown User'
      }
    })

    // Sort by role position (higher position = higher rank) then by name
    members.sort((a, b) => {
      const aPosition = rolePositionMap.get(a.role) || 0
      const bPosition = rolePositionMap.get(b.role) || 0

      if (aPosition !== bPosition) {
        return bPosition - aPosition // Higher position first
      }

      const aName = a.mainCharacter?.name || a.discordName
      const bName = b.mainCharacter?.name || b.discordName
      return aName.localeCompare(bName)
    })

    return NextResponse.json(
      { members },
      {
        headers: {
          // Cache for 30 seconds, allow stale responses while revalidating
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
        }
      }
    )
  } catch (error) {
    console.error('Error in GET /api/guild-members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT - Update member role
export async function PUT(request: NextRequest) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleClient()

    const body = await request.json()
    const { guild_id, target_user_id, character_ids, new_role } = body

    if (!guild_id || !target_user_id || !character_ids || !new_role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify user has officer permissions (position >= 50)
    const verification = await verifyOfficerPermissions(serviceSupabase, user.id, guild_id)
    if (!verification.hasPermission) {
      return NextResponse.json({ error: verification.error }, { status: 403 })
    }

    // Verify the role change is allowed based on position hierarchy
    const roleChangeCheck = await verifyRoleChangePermissions(
      serviceSupabase,
      user.id,
      target_user_id,
      guild_id,
      new_role
    )
    if (!roleChangeCheck.allowed) {
      return NextResponse.json({ error: roleChangeCheck.error }, { status: 403 })
    }

    // Update character_guild_memberships
    const { error: updateError } = await serviceSupabase
      .from('character_guild_memberships')
      .update({ role: new_role })
      .eq('guild_id', guild_id)
      .in('character_id', character_ids)

    if (updateError) {
      console.error('Error updating role:', updateError)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    // Also update guild_members for backwards compatibility
    await serviceSupabase
      .from('guild_members')
      .update({ role: new_role })
      .eq('guild_id', guild_id)
      .eq('user_id', target_user_id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PUT /api/guild-members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Remove member from guild
export async function DELETE(request: NextRequest) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get('guild_id')
    const targetUserId = searchParams.get('target_user_id')
    const characterIds = searchParams.get('character_ids')?.split(',')

    if (!guildId || !targetUserId || !characterIds) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify user has officer permissions (position >= 50)
    const verification = await verifyOfficerPermissions(serviceSupabase, user.id, guildId)
    if (!verification.hasPermission) {
      return NextResponse.json({ error: verification.error }, { status: 403 })
    }

    // Verify the member removal is allowed based on position hierarchy
    const removalCheck = await verifyMemberRemovalPermissions(
      serviceSupabase,
      user.id,
      targetUserId,
      guildId
    )
    if (!removalCheck.allowed) {
      return NextResponse.json({ error: removalCheck.error }, { status: 403 })
    }

    // Set is_active = false on character_guild_memberships
    const { error: updateError } = await serviceSupabase
      .from('character_guild_memberships')
      .update({ is_active: false })
      .eq('guild_id', guildId)
      .in('character_id', characterIds)

    if (updateError) {
      console.error('Error removing member:', updateError)
      return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
    }

    // Also update guild_members for backwards compatibility
    await serviceSupabase
      .from('guild_members')
      .update({ is_active: false })
      .eq('guild_id', guildId)
      .eq('user_id', targetUserId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/guild-members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
