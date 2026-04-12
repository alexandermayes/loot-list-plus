import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { trackEvent } from '@/utils/analytics/server'

/**
 * GET /api/reserve-runs?guild_id=X
 *
 * List reserve runs for a guild. Any guild member can view.
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const guildId = request.nextUrl.searchParams.get('guild_id')
    if (!guildId) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { data: runs, error } = await serviceSupabase
      .from('reserve_runs')
      .select(`
        *,
        reserve_submissions(count),
        raid_tiers(name)
      `)
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reserve runs:', error)
      return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 })
    }

    // Flatten submission count and raid tier name
    const runsWithCounts = (runs || []).map((run: any) => ({
      ...run,
      submission_count: run.reserve_submissions?.[0]?.count ?? 0,
      raid_tier_name: run.raid_tiers?.name ?? null,
      reserve_submissions: undefined,
      raid_tiers: undefined,
    }))

    return NextResponse.json({ success: true, runs: runsWithCounts })
  } catch (err) {
    console.error('Reserve runs GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/reserve-runs
 *
 * Create a new reserve run. Officer-only.
 *
 * Body: {
 *   guild_id, expansion_id, raid_tier_id, title, raid_at, lock_at,
 *   max_reserves?, allow_duplicates?, visibility?, rules_note?,
 *   hard_reserves?, raid_team_id?
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      guild_id,
      expansion_id,
      raid_tier_id,
      title,
      raid_at,
      lock_at,
      max_reserves = 2,
      max_reserves_per_item = null,
      allow_duplicates = false,
      enforce_class_restrictions = false,
      visibility = 'hidden_until_lock',
      rules_note,
      discord_invite_url,
      hard_reserves = [],
      raid_team_id,
    } = body

    // Validate required fields
    if (!raid_tier_id || !title || !raid_at || !lock_at) {
      return NextResponse.json(
        { error: 'raid_tier_id, title, raid_at, and lock_at are required' },
        { status: 400 }
      )
    }

    if (max_reserves < 1 || max_reserves > 10) {
      return NextResponse.json({ error: 'max_reserves must be between 1 and 10' }, { status: 400 })
    }

    if (max_reserves_per_item !== null && max_reserves_per_item !== undefined && max_reserves_per_item < 1) {
      return NextResponse.json({ error: 'max_reserves_per_item must be a positive integer' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    // If guild_id provided, verify officer permissions
    if (guild_id) {
      const verification = await verifyOfficerPermissions(serviceSupabase, user.id, guild_id)
      if (!verification.hasPermission) {
        return NextResponse.json({ error: 'Only officers can create guild reserve runs' }, { status: 403 })
      }
    }

    // Build rule snapshot
    const rule_snapshot = {
      max_reserves,
      max_reserves_per_item,
      allow_duplicates,
      enforce_class_restrictions,
      visibility,
      hard_reserves,
    }

    const { data: run, error } = await serviceSupabase
      .from('reserve_runs')
      .insert({
        created_by: user.id,
        guild_id: guild_id || null,
        expansion_id: expansion_id || null,
        raid_tier_id,
        title,
        raid_at,
        lock_at,
        max_reserves,
        max_reserves_per_item: max_reserves_per_item ?? null,
        allow_duplicates,
        enforce_class_restrictions,
        visibility,
        rules_note: rules_note || null,
        discord_invite_url: discord_invite_url || null,
        hard_reserves,
        raid_team_id: raid_team_id || null,
        rule_snapshot,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating reserve run:', error)
      return NextResponse.json({ error: 'Failed to create run' }, { status: 500 })
    }

    trackEvent({
      event: 'reserve_run_created',
      userId: user.id,
      guildId: guild_id,
      properties: { run_id: run.id, max_reserves, visibility },
    })

    return NextResponse.json({
      success: true,
      run,
      share_url: `/reserve/join/${run.share_token}`,
    })
  } catch (err) {
    console.error('Reserve runs POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
