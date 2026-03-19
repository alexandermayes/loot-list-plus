import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

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
    const { guild_id, dates, expansion_id } = body as {
      guild_id: string
      dates: string[]
      expansion_id: string
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

    // 1. Check which events already exist (service role — no RLS concern)
    const { data: existingEvents } = await serviceSupabase
      .from('raid_events')
      .select('id, raid_date')
      .eq('guild_id', guild_id)
      .in('raid_date', dates)

    const existingDates = new Set(existingEvents?.map(e => e.raid_date) || [])
    const newDates = dates.filter(d => !existingDates.has(d))

    // 2. If there are new dates, look up the tier and create events
    if (newDates.length > 0 && expansion_id) {
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
        }))

        const { error: insertError } = await serviceSupabase
          .from('raid_events')
          .insert(newEvents)

        if (insertError) {
          console.error('Failed to create raid events:', insertError)
        }
      } else {
        console.error(`No raid tier found for expansion ${expansion_id}, phase ${currentPhase}`)
      }
    }

    // 3. Reload all events in the date range (includes newly created + off-schedule events)
    const sortedDates = [...dates].sort()
    const startDate = sortedDates[0]
    const endDate = sortedDates[sortedDates.length - 1]

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
