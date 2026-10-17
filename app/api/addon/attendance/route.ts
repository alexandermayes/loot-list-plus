import { NextRequest, NextResponse, after } from 'next/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { authenticateAddonRequest, authorizeAddonGuild } from '@/lib/addon/sync-tokens'
import { trackApiError } from '@/utils/analytics/server'
import { recomputeBlpForEvents, recomputeBlpForItems } from '@/utils/blp/recompute'
import { importAttendanceByTeam } from '@/utils/raid-events/team-routing'
import { linkUnlinkedAddonAwards } from '@/utils/raid-events/link-unlinked-awards'
import { guildRaidTimeZone, isUtcTimestamp, raidNightDate } from '@/lib/addon/raid-night'

interface AttendanceRequest {
  guild_id: string
  raid_date: string
  raid_name: string
  /** The session's raw UTC start time, optional (GH #355). */
  start_time?: unknown
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
 *
 * GH #355: the raid night comes from the session's start_time in the guild's
 * raid time zone (lib/addon/raid-night.ts), so a 22:30 EDT session lands on
 * that evening's night and not on the next UTC date. A local time from 00:00
 * to 05:59 belongs to the previous night (D1). A missing or malformed
 * start_time keeps raid_date, which is what companion 1.1.0 sends, and a
 * failed time zone read does the same. Nights an older sync created on a UTC
 * date are not moved.
 *
 * GH #321: once the night exists, the guild's addon awards dated that night
 * that were saved without a raid night (the companion synced them before
 * this attendance, or the session crossed midnight UTC) are linked to it,
 * team-aware and copy-safe (linkUnlinkedAddonAwards), after the response.
 * A linking failure is logged and tracked; it never fails the attendance.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateAddonRequest(request)
    if (!auth.ok) return auth.response

    const body: AttendanceRequest = await request.json()
    const { guild_id, raid_date, raid_name, start_time, attended, boss_kills } = body

    if (!guild_id || !raid_date || !raid_name || !attended) {
      return NextResponse.json({
        error: 'guild_id, raid_date, raid_name, and attended are required'
      }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Officer check plus sync-token guild scope (GH #300 D-02)
    const access = await authorizeAddonGuild(supabase, auth.principal, guild_id)
    if (!access.ok) return access.response

    // GH #355: the night in the guild's raid time zone. A failed zone read
    // carries on with the UTC raid_date, as before.
    let raidNight = raid_date
    if (isUtcTimestamp(start_time)) {
      try {
        raidNight = raidNightDate(start_time, await guildRaidTimeZone(supabase, guild_id)) ?? raid_date
      } catch (zoneError) {
        console.error('Failed to read the raid time zone for addon attendance:', zoneError)
        trackApiError('unknown', 'POST /api/addon/attendance', zoneError instanceof Error ? zoneError : new Error(String(zoneError)))
      }
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
      supabase, guild_id, raidNight, members, attendedSet,
    )

    if (eventIds.length === 0) {
      return NextResponse.json({ error: 'Failed to create raid event' }, { status: 500 })
    }

    // Names submitted that don't match any known guild member.
    const unmatched = attended.filter(n => !knownNames.has(n.toLowerCase())).length

    // Attendance just changed for these events: recompute BLP for the items
    // awarded those nights so any awards made before this sync get credited (and
    // any benched/absent edits are reflected). GH #98 award-before-attendance race.
    // regression for #321: link the awards that arrived before the night
    // existed first, so one recompute covers them. A linked award can sit on
    // another team's night that this sync did not touch, so its item is
    // recomputed by id as well.
    after(async () => {
      let linkedItemIds: string[] = []
      try {
        const linked = await linkUnlinkedAddonAwards(supabase, guild_id, raidNight)
        linkedItemIds = linked.itemIds
      } catch (linkError) {
        console.error('Failed to link unlinked addon awards after attendance:', linkError)
        trackApiError('unknown', 'POST /api/addon/attendance', linkError instanceof Error ? linkError : new Error(String(linkError)))
      }
      await recomputeBlpForEvents(supabase, guild_id, eventIds)
      if (linkedItemIds.length > 0) await recomputeBlpForItems(supabase, guild_id, linkedItemIds)
    })

    return NextResponse.json({
      data: {
        raid_event_ids: eventIds,
        raid_event_id: eventIds[0],
        raid_date: raidNight,
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
