import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { logAudit } from '@/utils/audit/log'

/**
 * POST /api/raid-events/bonus
 *
 * Creates a single off-schedule (bonus) raid event for the given date.
 * Resolves the active tier server-side using the same fallback chain as
 * /api/raid-events/ensure. Requires manage_attendance permission.
 *
 * Body: { guild_id, expansion_id, raid_date, raid_team_id?, notes? }
 * Returns: { event: RaidEvent }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, expansion_id, raid_date, raid_team_id, notes } = body as {
      guild_id: string
      expansion_id: string
      raid_date: string
      raid_team_id?: string | null
      notes?: string | null
    }

    if (!guild_id || !expansion_id || !raid_date) {
      return NextResponse.json(
        { error: 'guild_id, expansion_id, and raid_date are required' },
        { status: 400 }
      )
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(raid_date)) {
      return NextResponse.json({ error: 'raid_date must be YYYY-MM-DD' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { hasPermission } = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_attendance')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Officers only' }, { status: 403 })
    }

    // Tier resolution (mirrors /api/raid-events/ensure fallback chain)
    const { data: expData } = await serviceSupabase
      .from('expansions')
      .select('current_phase')
      .eq('id', expansion_id)
      .single()
    const currentPhase = expData?.current_phase || 1

    const { data: tierData } = await serviceSupabase
      .from('raid_tiers')
      .select('id')
      .eq('expansion_id', expansion_id)
      .eq('phase', currentPhase)
      .eq('is_guild_active', true)
      .limit(1)
      .maybeSingle()
    let tierId = tierData?.id

    if (!tierId) {
      const { data: phaseTier } = await serviceSupabase
        .from('raid_tiers')
        .select('id')
        .eq('expansion_id', expansion_id)
        .eq('phase', currentPhase)
        .limit(1)
        .maybeSingle()
      tierId = phaseTier?.id
    }

    if (!tierId) {
      const { data: anyActive } = await serviceSupabase
        .from('raid_tiers')
        .select('id')
        .eq('expansion_id', expansion_id)
        .eq('is_guild_active', true)
        .limit(1)
        .maybeSingle()
      tierId = anyActive?.id
    }

    if (!tierId) {
      const { data: lastResort } = await serviceSupabase
        .from('raid_tiers')
        .select('id')
        .eq('expansion_id', expansion_id)
        .limit(1)
        .maybeSingle()
      tierId = lastResort?.id
    }

    if (!tierId) {
      return NextResponse.json(
        { error: 'No raid tier configured for this expansion' },
        { status: 400 }
      )
    }

    // Reject if a non-bonus event already exists on this date for the team —
    // officers should mark attendance on that one, not duplicate it.
    let existingQuery = serviceSupabase
      .from('raid_events')
      .select('id, is_bonus')
      .eq('guild_id', guild_id)
      .eq('raid_date', raid_date)
    if (raid_team_id) {
      existingQuery = existingQuery.eq('raid_team_id', raid_team_id)
    } else {
      existingQuery = existingQuery.is('raid_team_id', null)
    }
    const { data: existing } = await existingQuery
    const collision = (existing || []).find(e => !e.is_bonus)
    if (collision) {
      return NextResponse.json(
        { error: 'A scheduled raid already exists on this date for this team. Use that event instead.' },
        { status: 409 }
      )
    }

    const { data: created, error: insertError } = await serviceSupabase
      .from('raid_events')
      .insert({
        guild_id,
        raid_tier_id: tierId,
        raid_date,
        notes: notes ?? null,
        is_skipped: false,
        skip_reason: null,
        raid_team_id: raid_team_id ?? null,
        is_bonus: true,
      })
      .select('*')
      .single()

    if (insertError || !created) {
      console.error('Failed to create bonus raid event:', insertError)
      return NextResponse.json({ error: insertError?.message || 'Insert failed' }, { status: 500 })
    }

    logAudit({
      supabase: serviceSupabase,
      guildId: guild_id,
      tableName: 'raid_events',
      recordId: created.id,
      action: 'INSERT',
      userId: user.id,
      newData: {
        raid_date,
        raid_team_id: raid_team_id ?? null,
        is_bonus: true,
        notes: notes ?? null,
      },
    })

    return NextResponse.json({ event: created })
  } catch (error) {
    console.error('Error in POST /api/raid-events/bonus:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
