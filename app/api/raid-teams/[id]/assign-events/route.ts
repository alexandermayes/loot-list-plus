import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
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
    const { mode, event_ids, from_team_id, days } = body as {
      mode?: 'all_unassigned' | 'from_team'
      event_ids?: string[]
      from_team_id?: string
      /** Optional day-of-week filter (0=Sun..6=Sat). Only move events on these days. */
      days?: number[]
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

    // If day filter is specified, fetch matching event IDs first then use event_ids mode
    let filteredEventIds: string[] | null = null
    if (days && days.length > 0) {
      let fetchQuery = serviceSupabase
        .from('raid_events')
        .select('id, raid_date')
        .eq('guild_id', team.guild_id)

      if (mode === 'all_unassigned') {
        fetchQuery = fetchQuery.is('raid_team_id', null)
      } else if (mode === 'from_team' && from_team_id) {
        fetchQuery = fetchQuery.eq('raid_team_id', from_team_id)
      }

      const { data: candidates } = await fetchQuery
      filteredEventIds = (candidates || [])
        .filter(e => {
          const [y, m, d] = e.raid_date.split('-').map(Number)
          return days.includes(new Date(y, m - 1, d).getDay())
        })
        .map(e => e.id)

      if (filteredEventIds.length === 0) {
        return NextResponse.json({ success: true, assigned: 0 })
      }
    }

    let query = serviceSupabase
      .from('raid_events')
      .update({ raid_team_id: teamId })
      .eq('guild_id', team.guild_id)

    if (filteredEventIds) {
      // Day-filtered: use specific IDs
      query = query.in('id', filteredEventIds)
    } else if (mode === 'all_unassigned') {
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
