import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { toDateString } from '@/utils/date'
import { resolveRaidDays } from '@/domain/raid-team/settings'
import { isDateScheduled } from '@/domain/raid-team/schedule-history'
import { revalidateGuildRaidEvents } from '@/lib/cache/dashboard-attendance'

/**
 * POST /api/raid-events/ensure
 *
 * Ensures raid events exist for the given dates. Creates any missing ones.
 * Accessible to any guild member (creating blank events is idempotent/harmless).
 * All DB operations use service role to bypass RLS.
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

    // When no team is specified but the guild HAS teams, never auto-create
    // unassigned (null-team) events. Raids belong to teams in a team guild, so a
    // guild-wide auto-create (e.g. from the "All teams" attendance view) would
    // spawn a phantom event on every scheduled date alongside each team's real
    // event — tripling the columns and fragmenting attendance. Intentional
    // guild-wide/bonus raids are created through their own flows, not here.
    let allowCreate = true
    if (!raid_team_id) {
      const { count: teamCount } = await serviceSupabase
        .from('raid_teams')
        .select('id', { count: 'exact', head: true })
        .eq('guild_id', guild_id)
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
    if (raid_team_id && newDates.length > 0) {
      const [{ data: team }, { data: gs }] = await Promise.all([
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
      ])
      if (!team) {
        return NextResponse.json({ error: 'Raid team not found in this guild' }, { status: 404 })
      }
      const teamDays = gs ? resolveRaidDays(gs, team.raid_days_override) : []
      newDates = newDates.filter((d) =>
        isDateScheduled(d, new Date(`${d}T00:00:00Z`).getUTCDay(), teamDays, team.schedule_history)
      )
    }

    // 2. If there are new dates, look up the tier and create events
    if (newDates.length > 0 && expansion_id && allowCreate) {
      // Get current phase
      const { data: expData } = await serviceSupabase
        .from('expansions')
        .select('current_phase')
        .eq('id', expansion_id)
        .single()

      const currentPhase = expData?.current_phase || 1

      // Find the active tier for this phase
      const { data: tierData } = await serviceSupabase
        .from('raid_tiers')
        .select('id')
        .eq('expansion_id', expansion_id)
        .eq('phase', currentPhase)
        .eq('is_guild_active', true)
        .limit(1)
        .maybeSingle()

      // Fallback: if no active tier for current phase, try any tier for this phase
      let tierId = tierData?.id
      if (!tierId) {
        const { data: fallbackTier } = await serviceSupabase
          .from('raid_tiers')
          .select('id')
          .eq('expansion_id', expansion_id)
          .eq('phase', currentPhase)
          .limit(1)
          .maybeSingle()
        tierId = fallbackTier?.id
      }

      // Second fallback: any active tier for the expansion
      if (!tierId) {
        const { data: anyTier } = await serviceSupabase
          .from('raid_tiers')
          .select('id')
          .eq('expansion_id', expansion_id)
          .eq('is_guild_active', true)
          .limit(1)
          .maybeSingle()
        tierId = anyTier?.id
      }

      // Third fallback: literally any tier for the expansion (ignore is_guild_active)
      if (!tierId) {
        const { data: lastResort } = await serviceSupabase
          .from('raid_tiers')
          .select('id')
          .eq('expansion_id', expansion_id)
          .limit(1)
          .maybeSingle()
        tierId = lastResort?.id
      }

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
        console.error(`No raid tier found for expansion ${expansion_id}, phase ${currentPhase}`)
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
