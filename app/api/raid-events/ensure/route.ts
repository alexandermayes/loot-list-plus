import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { toDateString } from '@/utils/date'
import { resolveRaidDays } from '@/domain/raid-team/settings'
import { pickScheduleSource } from '@/domain/raid-team/pick-schedule-source'
import { isDateScheduled } from '@/domain/raid-team/schedule-history'
import { revalidateGuildRaidEvents } from '@/lib/cache/dashboard-attendance'
import {
  findGuildExpansion,
  resolveGuildRaidTierId,
  RAID_EVENT_EXPANSION_NOT_IN_GUILD_ERROR,
} from '@/lib/raid-events/guild-raid-refs'

/**
 * POST /api/raid-events/ensure
 *
 * Ensures raid events exist for the given dates. Creates any missing ones.
 * Accessible to any guild member (creating blank events is idempotent/harmless).
 * All DB operations use service role to bypass RLS. A given expansion_id
 * must be one of the guild's expansions (refused with a 400 otherwise, or
 * a 500 if the lookup fails); new events take a tier of that expansion
 * only.
 *
 * Body: { guild_id, dates: string[], expansion_id: string }
 * Returns: { events: RaidEvent[] } — all events in the date range
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, dates, expansion_id, raid_team_id } = body as {
      guild_id: string
      dates: string[]
      expansion_id: string
      raid_team_id?: string | null
    }

    if (!guild_id || !dates || !Array.isArray(dates) || dates.length === 0) {
      return NextResponse.json({ error: 'guild_id and dates are required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    // Verify user is a member of this guild (any role, not just officers)
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
      .eq('guild_id', guild_id)
      .in('character_id', userChars.map(c => c.id))
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
    }

    // A given expansion_id must be one of the guild's own expansions before
    // anything else is read or created (OD-1, resolved: refuse the whole
    // request). absent, null and the empty string all mean "create
    // nothing" and skip this check entirely, same as before.
    let expansion = null
    if (expansion_id) {
      expansion = await findGuildExpansion(serviceSupabase, guild_id, expansion_id)
      if (!expansion) {
        return NextResponse.json(
          { error: RAID_EVENT_EXPANSION_NOT_IN_GUILD_ERROR },
          { status: 400 }
        )
      }
    }

    // When no team is specified but the guild HAS teams, never auto-create
    // unassigned (null-team) events. Raids belong to teams in a team guild, so a
    // guild-wide auto-create (e.g. from the "All teams" attendance view) would
    // spawn a phantom event on every scheduled date alongside each team's real
    // event — tripling the columns and fragmenting attendance. Intentional
    // guild-wide/bonus raids are created through their own flows, not here.
    let allowCreate = true
    if (!raid_team_id) {
      const { count: teamCount, error: teamCountError } = await serviceSupabase
        .from('raid_teams')
        .select('id', { count: 'exact', head: true })
        .eq('guild_id', guild_id)
      if (teamCountError) {
        throw new Error(`Failed to count raid teams for guild ${guild_id}: ${teamCountError.message}`)
      }
      if ((teamCount ?? 0) > 0) {
        allowCreate = false
      }
    }

    // 1. Check which events already exist (service role — no RLS concern)
    // When a team is specified, only check for events on that team (not guild-wide)
    let existingQuery = serviceSupabase
      .from('raid_events')
      .select('id, raid_date')
      .eq('guild_id', guild_id)
      .in('raid_date', dates)
    if (raid_team_id) {
      existingQuery = existingQuery.eq('raid_team_id', raid_team_id)
    }
    const { data: existingEvents } = await existingQuery

    const existingDates = new Set(existingEvents?.map(e => e.raid_date) || [])
    let newDates = dates.filter(d => !existingDates.has(d))

    // Authoritative schedule filter for team events. Clients filter by the
    // team's schedule history too, but a stale client (e.g. right after team
    // creation, before its day override loads) can send dates from the
    // inherited guild schedule — which is how phantom past events get created
    // on a brand-new team (#248). Recheck every candidate date server-side.
    // The base schedule is resolved expansion-first, matching the client's
    // `generateRaidDates()` precedence, so this recheck cannot drop dates the
    // client legitimately generated from an expansion-configured schedule (#267).
    if (raid_team_id && newDates.length > 0) {
      // Defensive: both current clients always send expansion_id, and the
      // creation branch below requires it, but the filter's schedule source
      // should be resolvable from the guild's active expansion on its own so
      // the two stop being able to disagree.
      const resolvedExpansionId = expansion_id || (
        await serviceSupabase
          .from('guilds')
          .select('active_expansion_id')
          .eq('id', guild_id)
          .maybeSingle()
      ).data?.active_expansion_id

      const [{ data: team }, { data: gs }, { data: expansionRow }] = await Promise.all([
        serviceSupabase
          .from('raid_teams')
          .select('raid_days_override, schedule_history')
          .eq('id', raid_team_id)
          .eq('guild_id', guild_id)
          .maybeSingle(),
        serviceSupabase
          .from('guild_settings')
          .select('raid_days_per_week, first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day')
          .eq('guild_id', guild_id)
          .maybeSingle(),
        resolvedExpansionId
          ? serviceSupabase
            .from('expansions')
            .select('raid_days_per_week, first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day')
            .eq('id', resolvedExpansionId)
            .eq('guild_id', guild_id)
            .maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      if (!team) {
        return NextResponse.json({ error: 'Raid team not found in this guild' }, { status: 404 })
      }
      const scheduleSource = pickScheduleSource(expansionRow, gs)
      const teamDays = scheduleSource ? resolveRaidDays(scheduleSource, team.raid_days_override) : []
      newDates = newDates.filter((d) =>
        isDateScheduled(d, new Date(`${d}T00:00:00Z`).getUTCDay(), teamDays, team.schedule_history)
      )
    }

    // 2. If there are new dates, look up the tier and create events
    if (newDates.length > 0 && expansion && allowCreate) {
      const tierId = await resolveGuildRaidTierId(serviceSupabase, expansion)

      if (tierId) {
        const newEvents = newDates.map(date => ({
          guild_id,
          raid_tier_id: tierId,
          raid_date: date,
          notes: null,
          is_skipped: false,
          skip_reason: null,
          raid_team_id: raid_team_id || null,
        }))

        const { error: insertError } = await serviceSupabase
          .from('raid_events')
          .insert(newEvents)

        if (insertError) {
          // 23505 = unique violation on (guild_id, raid_date, raid_team_id):
          // a concurrent ensure request (e.g. raid-tracking and attendance
          // pages racing) created the event between our existence check and
          // this insert. The reload below returns the winner, so it's benign.
          if (insertError.code !== '23505') {
            console.error('Failed to create raid events:', insertError)
          }
        } else {
          revalidateGuildRaidEvents(guild_id)
        }
      } else {
        console.error('No raid tier found for expansion:', { expansion_id: expansion.id, phase: expansion.current_phase || 1 })
      }
    }

    // 3. Reload all events in the date range (includes newly created + off-schedule events).
    // Extend the upper bound to today so bonus events on dates after the latest
    // scheduled day (which won't appear in `dates`) are still returned.
    const sortedDates = [...dates].sort()
    const startDate = sortedDates[0]
    const scheduledEnd = sortedDates[sortedDates.length - 1]
    const todayStr = toDateString(new Date())
    const endDate = scheduledEnd > todayStr ? scheduledEnd : todayStr

    const { data: allEvents, error: eventsError } = await serviceSupabase
      .from('raid_events')
      .select('*')
      .eq('guild_id', guild_id)
      .gte('raid_date', startDate)
      .lte('raid_date', endDate)
      .order('raid_date', { ascending: false })

    if (eventsError) {
      console.error('Failed to load raid events:', eventsError)
      return NextResponse.json({ error: eventsError.message }, { status: 500 })
    }

    return NextResponse.json({ events: allEvents || [] })
  } catch (error) {
    console.error('Error in POST /api/raid-events/ensure:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
