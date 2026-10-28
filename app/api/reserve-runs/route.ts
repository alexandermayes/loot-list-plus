import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackEvent } from '@/utils/analytics/server'
import { requireReserveAccess, guildHasPaidAccess } from '@/utils/feature-gate'
import { hasActiveGuildMembership } from '@/utils/reserve-access'

// Explicit column list: every field the Reserve page's ReserveRun type
// reads. Never '*': raid_leader_token and created_by are never listed.
const RUN_LIST_COLUMNS =
  'id, guild_id, raid_tier_id, title, status, raid_at, lock_at, locked_at, max_reserves, visibility, share_token, created_at'

/**
 * GET /api/reserve-runs?guild_id=X
 *
 * List reserve runs for a guild. Active members of the guild only; never
 * returns the raid leader token. reserve_access says whether the guild
 * can create runs and change them (Premium or grandfathered), or null
 * when that could not be read.
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

    const isMember = await hasActiveGuildMembership(serviceSupabase, user.id, guildId)
    if (!isMember) {
      return NextResponse.json({ error: 'Not a guild member' }, { status: 403 })
    }

    const { data: runs, error } = await serviceSupabase
      .from('reserve_runs')
      .select(`
        ${RUN_LIST_COLUMNS},
        reserve_submissions(count),
        raid_tiers(name)
      `)
      .eq('guild_id', guildId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching reserve runs:', error)
      return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 })
    }

    // Flatten submission count and raid tier name. The embed's cardinality
    // narrows differently once the select string carries a variable
    // (RUN_LIST_COLUMNS) instead of a plain literal, so this accepts
    // raid_tiers as either shape rather than assuming the to-one object.
    const runsWithCounts = (runs || []).map((run: {
      reserve_submissions?: { count: number }[] | null
      raid_tiers?: { name: string } | { name: string }[] | null
      [key: string]: unknown
    }) => {
      const raidTier = Array.isArray(run.raid_tiers) ? run.raid_tiers[0] : run.raid_tiers
      return {
        ...run,
        submission_count: run.reserve_submissions?.[0]?.count ?? 0,
        raid_tier_name: raidTier?.name ?? null,
        reserve_submissions: undefined,
        raid_tiers: undefined,
      }
    })

    let reserveAccess: boolean | null
    try {
      reserveAccess = await guildHasPaidAccess(serviceSupabase, guildId, 'reserve_runs')
    } catch (accessErr) {
      console.error('Reserve runs GET: reserve access read failed:', accessErr)
      reserveAccess = null
    }

    return NextResponse.json({ success: true, runs: runsWithCounts, reserve_access: reserveAccess })
  } catch (err) {
    console.error('Reserve runs GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Discovery tiers have no items to reserve (D-14). Proposed copy, held for
// the owner's Oct 26 sign-off.
const RESERVES_UNAVAILABLE_ERROR = 'Soft reserves are not available for this raid.'

/**
 * POST /api/reserve-runs
 *
 * Create a new reserve run. Any active member of the guild (Premium or
 * grandfathered).
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

    // Membership before Premium (D-05): a non-member gets the same answer
    // whatever the guild's Premium status.
    if (guild_id) {
      const isMember = await hasActiveGuildMembership(serviceSupabase, user.id, guild_id)
      if (!isMember) {
        return NextResponse.json({ error: 'Not a guild member' }, { status: 403 })
      }
    }

    // Premium feature (guilds with pre-cutoff runs are grandfathered)
    const access = await requireReserveAccess(serviceSupabase, user.id, guild_id)
    if (!access.allowed) return access.error

    // D-14: only Known tiers can hold a reserve run. A tier that is missing
    // fails closed the same way as a Discovery tier.
    const { data: tier, error: tierError } = await serviceSupabase
      .from('raid_tiers')
      .select('id, list_mode, expansion_id')
      .eq('id', raid_tier_id)
      .maybeSingle()

    if (tierError) {
      console.error('Error reading raid tier for reserve run:', tierError)
      return NextResponse.json({ error: 'Failed to create run' }, { status: 500 })
    }

    // review WR-05: a guild run sits on one of that guild's own tiers, checked
    // before list_mode so a foreign tier gives away nothing about its mode and
    // answers exactly like a missing one. A personal run (no guild_id) keeps the
    // shared catalog that /api/reserve-runs/raid-tiers offers, which is any
    // guild's Known tier of the chosen expansion, so no guild check applies.
    let tierBelongsToGuild = true
    if (guild_id && tier) {
      if (!tier.expansion_id) {
        tierBelongsToGuild = false
      } else {
        const { data: expansion, error: expansionError } = await serviceSupabase
          .from('expansions')
          .select('id, guild_id')
          .eq('id', tier.expansion_id)
          .maybeSingle()
        if (expansionError) {
          console.error('Error reading expansion for reserve run:', expansionError)
          return NextResponse.json({ error: 'Failed to create run' }, { status: 500 })
        }
        tierBelongsToGuild = !!expansion && expansion.guild_id === guild_id
      }
    }

    if (!tier || !tierBelongsToGuild || tier.list_mode !== 'known') {
      return NextResponse.json({ error: RESERVES_UNAVAILABLE_ERROR }, { status: 400 })
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
