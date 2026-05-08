import { NextRequest, NextResponse } from 'next/server'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission, verifyRoleChangePermissions, verifyMemberRemovalPermissions } from '@/utils/server-roles'
import { ROLE_POSITIONS } from '@/domain/guild/roles'
import { trackApiError, trackEvent } from '@/utils/analytics/server'
import { batchGetDisplayNames } from '@/utils/batch-display-names'
import { logAudit } from '@/utils/audit/log'

// GET - List all members of a guild (uses service role to bypass RLS)
export async function GET(request: NextRequest) {
  try {
    // Fast auth check using getSession (no network call)
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleClient()

    // Get guild_id and optional stats flag from query params
    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get('guild_id')
    const includeStats = searchParams.get('include_stats') === 'true'

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
      guildRoles.forEach((r) => rolePositionMap.set(r.name, r.position))
    } else {
      // Default positions
      rolePositionMap.set('Guild Master', ROLE_POSITIONS.GUILD_MASTER)
      rolePositionMap.set('Officer', ROLE_POSITIONS.OFFICER)
      rolePositionMap.set('Member', ROLE_POSITIONS.MEMBER)
    }

    // Group characters by user_id
    interface CharacterData {
      id: string
      name: string
      is_main: boolean
      class: { name: string; color_hex: string } | null
      spec: { name: string } | null
    }

    const userCharacterMap = new Map<string, {
      characters: CharacterData[]
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

    // Batch fetch display names (centralized utility)
    const displayNameMap = await batchGetDisplayNames(serviceSupabase, userIds)

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

    // Optionally fetch raid team assignments
    if (includeStats) {
      const allCharIds = members.flatMap(m => m.characters.map((c: CharacterData) => c.id))

      const { data: raidTeamMembers } = await serviceSupabase
        .from('raid_team_members')
        .select('character_id, raid_team:raid_teams(id, name, color_hex)')
        .in('character_id', allCharIds)

      if (raidTeamMembers) {
        const charTeamMap = new Map<string, { id: string; name: string; color: string }>()
        for (const rtm of raidTeamMembers) {
          const team = Array.isArray(rtm.raid_team) ? rtm.raid_team[0] : rtm.raid_team
          if (team) {
            charTeamMap.set(rtm.character_id, { id: team.id, name: team.name, color: team.color_hex || '#808080' })
          }
        }

        for (const member of members) {
          const mainId = member.mainCharacter?.id
          let raidTeam: { id: string; name: string; color: string } | null = null
          if (mainId && charTeamMap.has(mainId)) {
            raidTeam = charTeamMap.get(mainId)!
          } else {
            for (const c of member.characters) {
              if (charTeamMap.has(c.id)) {
                raidTeam = charTeamMap.get(c.id)!
                break
              }
            }
          }
          ;(member as any).raid_team = raidTeam
        }
      }
    }

    return NextResponse.json(
      { members },
      {
        headers: {
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
        }
      }
    )
  } catch (error) {
    console.error('Error in GET /api/guild-members:', error)
    trackApiError('unknown', 'GET /api/guild-members', error instanceof Error ? error : new Error(String(error)))
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
    const verification = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_members')
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

    // If promoting to Guild Master, demote any existing Guild Masters to Officer first
    if (new_role === 'Guild Master') {
      await serviceSupabase
        .from('character_guild_memberships')
        .update({ role: 'Officer' })
        .eq('guild_id', guild_id)
        .eq('role', 'Guild Master')
        .neq('character_id', character_ids[0])

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

    logAudit({
      supabase: serviceSupabase,
      guildId: guild_id,
      tableName: 'character_guild_memberships',
      recordId: target_user_id,
      action: 'UPDATE',
      userId: user.id,
      oldData: { action: 'role_change' },
      newData: { new_role, target_user_id, character_ids },
    })

    trackEvent({
      event: 'member_role_changed',
      userId: user.id,
      guildId: guild_id,
      properties: { new_role },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PUT /api/guild-members:', error)
    trackApiError('unknown', 'PUT /api/guild-members', error instanceof Error ? error : new Error(String(error)))
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
    const characterIdsParam = searchParams.get('character_ids')

    if (!guildId || !targetUserId || !characterIdsParam) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // LOW-03: Validate array length to prevent DoS via excessive character_ids
    const characterIds = characterIdsParam.split(',')
    if (characterIds.length > 100) {
      return NextResponse.json({ error: 'Too many character_ids (max 100)' }, { status: 400 })
    }

    // Verify user has officer permissions (position >= 50)
    const verification = await verifyPermission(serviceSupabase, user.id, guildId, 'manage_members')
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

    logAudit({
      supabase: serviceSupabase,
      guildId: guildId,
      tableName: 'character_guild_memberships',
      recordId: targetUserId,
      action: 'DELETE',
      userId: user.id,
      oldData: { target_user_id: targetUserId, character_ids: characterIds },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/guild-members:', error)
    trackApiError('unknown', 'DELETE /api/guild-members', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
