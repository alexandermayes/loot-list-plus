import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { requirePro } from '@/utils/feature-gate'
import { logAudit } from '@/utils/audit/log'

/**
 * GET /api/raid-teams/[id]/members
 * List team roster with character details. Any guild member can view.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId } = await params
    const serviceSupabase = createServiceRoleClient()

    // Get team to find guild_id
    const { data: team } = await serviceSupabase
      .from('raid_teams')
      .select('id, guild_id')
      .eq('id', teamId)
      .single()

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Verify membership in guild
    const { data: userChars } = await serviceSupabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)

    if (!userChars || userChars.length === 0) {
      return NextResponse.json({ error: 'No characters found' }, { status: 403 })
    }

    const { data: membership } = await serviceSupabase
      .from('character_guild_memberships')
      .select('id')
      .eq('guild_id', team.guild_id)
      .in('character_id', userChars.map(c => c.id))
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
    }

    // Get team members with character + class details
    const { data: members, error } = await serviceSupabase
      .from('raid_team_members')
      .select(`
        id,
        raid_team_id,
        character_id,
        role,
        joined_at,
        character:characters (
          id,
          name,
          class:wow_classes (
            id,
            name,
            color_hex
          ),
          spec:class_specs (
            id,
            name
          )
        )
      `)
      .eq('raid_team_id', teamId)
      .order('joined_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ members: members || [] })
  } catch (error) {
    console.error('Error in GET /api/raid-teams/[id]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/raid-teams/[id]/members
 * Bulk add characters to a team. Officer only, Pro only.
 * Body: { character_ids: string[] }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId } = await params
    const body = await request.json()
    const { character_ids } = body as { character_ids: string[] }

    if (!character_ids || !Array.isArray(character_ids) || character_ids.length === 0) {
      return NextResponse.json({ error: 'character_ids array is required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    // Get team to find guild_id
    const { data: team } = await serviceSupabase
      .from('raid_teams')
      .select('id, guild_id, name')
      .eq('id', teamId)
      .single()

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Pro gate
    const proCheck = await requirePro(serviceSupabase, team.guild_id)
    if (!proCheck.isPro) return proCheck.error

    // Officer check
    const { hasPermission } = await verifyPermission(serviceSupabase, user.id, team.guild_id, 'manage_roster')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Officers only' }, { status: 403 })
    }

    // Verify all characters are active guild members
    const { data: validMembers } = await serviceSupabase
      .from('character_guild_memberships')
      .select('character_id')
      .eq('guild_id', team.guild_id)
      .in('character_id', character_ids)
      .eq('is_active', true)

    const validCharIds = new Set(validMembers?.map(m => m.character_id) || [])
    const invalidIds = character_ids.filter(id => !validCharIds.has(id))

    if (invalidIds.length > 0) {
      return NextResponse.json({
        error: `${invalidIds.length} character(s) are not active members of this guild`,
      }, { status: 400 })
    }

    // Remove characters from any existing team in this guild first
    // (one character per team per guild constraint)
    await serviceSupabase
      .from('raid_team_members')
      .delete()
      .eq('guild_id', team.guild_id)
      .in('character_id', character_ids)
      .neq('raid_team_id', teamId)

    // Insert members (ignore conflicts for idempotency on same team)
    const rows = character_ids.map(characterId => ({
      raid_team_id: teamId,
      character_id: characterId,
      guild_id: team.guild_id,
    }))

    const { data: inserted, error } = await serviceSupabase
      .from('raid_team_members')
      .upsert(rows, { onConflict: 'raid_team_id,character_id', ignoreDuplicates: true })
      .select('id, character_id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAudit({
      supabase: serviceSupabase,
      guildId: team.guild_id,
      tableName: 'raid_team_members',
      recordId: teamId,
      action: 'INSERT',
      userId: user.id,
      newData: { team_name: team.name, character_ids, count: character_ids.length },
    })

    return NextResponse.json({ success: true, added: inserted?.length ?? 0 })
  } catch (error) {
    console.error('Error in POST /api/raid-teams/[id]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/raid-teams/[id]/members
 * Bulk remove characters from a team. Officer only, Pro only.
 * Body: { character_ids: string[] }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: teamId } = await params
    const body = await request.json()
    const { character_ids } = body as { character_ids: string[] }

    if (!character_ids || !Array.isArray(character_ids) || character_ids.length === 0) {
      return NextResponse.json({ error: 'character_ids array is required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    // Get team to find guild_id
    const { data: team } = await serviceSupabase
      .from('raid_teams')
      .select('id, guild_id, name')
      .eq('id', teamId)
      .single()

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Pro gate
    const proCheck = await requirePro(serviceSupabase, team.guild_id)
    if (!proCheck.isPro) return proCheck.error

    // Officer check
    const { hasPermission } = await verifyPermission(serviceSupabase, user.id, team.guild_id, 'manage_roster')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Officers only' }, { status: 403 })
    }

    const { error } = await serviceSupabase
      .from('raid_team_members')
      .delete()
      .eq('raid_team_id', teamId)
      .in('character_id', character_ids)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await logAudit({
      supabase: serviceSupabase,
      guildId: team.guild_id,
      tableName: 'raid_team_members',
      recordId: teamId,
      action: 'DELETE',
      userId: user.id,
      oldData: { team_name: team.name, character_ids, count: character_ids.length },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/raid-teams/[id]/members:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
