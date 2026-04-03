import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { requirePro } from '@/utils/feature-gate'
import { logAudit } from '@/utils/audit/log'

/**
 * POST /api/raid-teams/[id]/assign-events
 * Bulk assign existing raid events to a team. Officer only, Pro only.
 *
 * Body: { mode: 'all_unassigned' } — assigns all events with NULL raid_team_id
 *   OR: { mode: 'from_team', from_team_id: string } — reassigns events from another team
 *   OR: { event_ids: string[] } — assigns specific events
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
    const { mode, event_ids, from_team_id } = body as {
      mode?: 'all_unassigned' | 'from_team'
      event_ids?: string[]
      from_team_id?: string
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
    const { hasPermission } = await verifyOfficerPermissions(serviceSupabase, user.id, team.guild_id)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Officers only' }, { status: 403 })
    }

    let query = serviceSupabase
      .from('raid_events')
      .update({ raid_team_id: teamId })
      .eq('guild_id', team.guild_id)

    if (mode === 'all_unassigned') {
      query = query.is('raid_team_id', null)
    } else if (mode === 'from_team' && from_team_id) {
      query = query.eq('raid_team_id', from_team_id)
    } else if (event_ids && event_ids.length > 0) {
      query = query.in('id', event_ids)
    } else {
      return NextResponse.json({ error: 'Provide mode or event_ids' }, { status: 400 })
    }

    const { data, error, count } = await query.select('id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const assignedCount = data?.length ?? 0

    await logAudit({
      supabase: serviceSupabase,
      guildId: team.guild_id,
      tableName: 'raid_events',
      recordId: teamId,
      action: 'UPDATE',
      userId: user.id,
      newData: { team_name: team.name, mode: mode || 'specific', events_assigned: assignedCount },
    })

    return NextResponse.json({ success: true, assigned: assignedCount })
  } catch (error) {
    console.error('Error in POST /api/raid-teams/[id]/assign-events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
