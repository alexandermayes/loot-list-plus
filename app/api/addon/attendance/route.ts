import { NextRequest, NextResponse, after } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { trackApiError } from '@/utils/analytics/server'
import { recomputeBlpForEvents } from '@/utils/blp/recompute'
import { importAttendanceByTeam } from '@/utils/raid-events/team-routing'

interface AttendanceRequest {
  guild_id: string
  raid_date: string
  raid_name: string
  attended: string[]  // Character names who attended
  boss_kills?: Array<{
    boss_name: string
    kill_time?: string
    roster?: string[]
  }>
}

/**
 * POST /api/addon/attendance
 *
 * Submits attendance data from a raid session.
 * Creates or updates raid_events and attendance_records.
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: AttendanceRequest = await request.json()
    const { guild_id, raid_date, raid_name, attended, boss_kills } = body

    if (!guild_id || !raid_date || !raid_name || !attended) {
      return NextResponse.json({
        error: 'guild_id, raid_date, raid_name, and attended are required'
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify officer permissions
    const verification = await verifyOfficerPermissions(supabase, user.id, guild_id)
    if (!verification.hasPermission) {
      return NextResponse.json({ error: 'Officer permissions required' }, { status: 403 })
    }

    // Resolve character names to IDs (+ names for attendance matching)
    const { data: memberships } = await supabase
      .from('character_guild_memberships')
      .select('character_id, characters(id, name)')
      .eq('guild_id', guild_id)
      .eq('is_active', true)

    const members: Array<{ charId: string; name: string }> = []
    const knownNames = new Set<string>()
    for (const m of memberships ?? []) {
      const char = Array.isArray(m.characters) ? m.characters[0] : m.characters
      if (char) {
        const name = (char as { name: string }).name.toLowerCase()
        members.push({ charId: m.character_id, name })
        knownNames.add(name)
      }
    }

    const attendedSet = new Set(attended.map(n => n.toLowerCase()))

    // Route attendance to each raider's team event for the night (one null-team
    // event for non-team guilds). raid_events has no raid_name column, so the
    // night is keyed on (guild, date, team).
    const { eventIds, attendedCount, absentCount } = await importAttendanceByTeam(
      supabase, guild_id, raid_date, members, attendedSet,
    )

    if (eventIds.length === 0) {
      return NextResponse.json({ error: 'Failed to create raid event' }, { status: 500 })
    }

    // Names submitted that don't match any known guild member.
    const unmatched = attended.filter(n => !knownNames.has(n.toLowerCase())).length

    // Attendance just changed for these events — recompute BLP for the items
    // awarded those nights so any awards made before this sync get credited (and
    // any benched/absent edits are reflected). GH #98 award-before-attendance race.
    after(() => recomputeBlpForEvents(supabase, guild_id, eventIds))

    return NextResponse.json({
      data: {
        raid_event_ids: eventIds,
        raid_event_id: eventIds[0],
        records_created: attendedCount,
        records_updated: absentCount,
        unmatched_names: unmatched,
        boss_kills: boss_kills?.length || 0,
      }
    })
  } catch (error) {
    console.error('Error in POST /api/addon/attendance:', error)
    trackApiError('unknown', 'POST /api/addon/attendance', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
