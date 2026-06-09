import { NextRequest, NextResponse, after } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { trackApiError } from '@/utils/analytics/server'
import { recomputeBlpForEvents } from '@/utils/blp/recompute'

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

    // Create or find the raid event
    const { data: existingEvent } = await supabase
      .from('raid_events')
      .select('id')
      .eq('guild_id', guild_id)
      .eq('raid_date', raid_date)
      .eq('raid_name', raid_name)
      .limit(1)
      .single()

    let raidEventId: string

    if (existingEvent) {
      raidEventId = existingEvent.id
    } else {
      const { data: newEvent, error: createError } = await supabase
        .from('raid_events')
        .insert({
          guild_id,
          raid_date,
          raid_name,
        })
        .select('id')
        .single()

      if (createError || !newEvent) {
        console.error('Failed to create raid event:', createError)
        return NextResponse.json({ error: 'Failed to create raid event' }, { status: 500 })
      }
      raidEventId = newEvent.id
    }

    // Resolve character names to IDs
    const { data: memberships } = await supabase
      .from('character_guild_memberships')
      .select('character_id, characters(id, name)')
      .eq('guild_id', guild_id)
      .eq('is_active', true)

    const nameToCharId: Record<string, string> = {}
    if (memberships) {
      for (const m of memberships) {
        const char = Array.isArray(m.characters) ? m.characters[0] : m.characters
        if (char) {
          nameToCharId[(char as { name: string }).name.toLowerCase()] = m.character_id
        }
      }
    }

    // Build attendance set
    const attendedSet = new Set(attended.map(n => n.toLowerCase()))

    let recordsCreated = 0
    let recordsUpdated = 0
    let unmatched = 0

    // Create attendance records for all known guild members
    for (const [nameLower, charId] of Object.entries(nameToCharId)) {
      const didAttend = attendedSet.has(nameLower)

      const { error } = await supabase
        .from('attendance_records')
        .upsert({
          raid_event_id: raidEventId,
          character_id: charId,
          attended: didAttend,
          signed_up: false,
          status: didAttend ? 'attended' : 'absent',
        }, {
          onConflict: 'raid_event_id,character_id',
        })

      if (error) {
        console.error(`Failed to upsert attendance for ${nameLower}:`, error)
      } else {
        if (didAttend) recordsCreated++
        else recordsUpdated++
      }
    }

    // Count unmatched names (names not in guild data)
    for (const name of attended) {
      if (!nameToCharId[name.toLowerCase()]) {
        unmatched++
      }
    }

    // Attendance just changed for this raid — recompute BLP for the items
    // awarded that night so any awards made before this sync get credited (and
    // any benched/absent edits are reflected). GH #98 award-before-attendance race.
    after(() => recomputeBlpForEvents(supabase, guild_id, [raidEventId]))

    return NextResponse.json({
      data: {
        raid_event_id: raidEventId,
        records_created: recordsCreated,
        records_updated: recordsUpdated,
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
