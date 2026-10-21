import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { createTypedServiceRoleClient } from '@/utils/supabase/typed-service-role'
import { verifyPermission } from '@/utils/server-roles'
import type { TablesUpdate } from '@/lib/database.types'
import { logAudit } from '@/utils/audit/log'
import { selectAllPagesOrThrow } from '@/utils/supabase/paginate'
import { seedNeedRows } from '@/app/services/need-row-seeder'
import { canSwitchToDiscovery, canSwitchToKnown, isListMode } from '@/domain/loot/list-mode'

// GET - Fetch raid tiers for an expansion
// By default, filters to only show phases <= current_phase (linear unlock)
// Pass includeAllPhases=true to bypass (for admin views)
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const expansionId = searchParams.get('expansion_id')
    const guildId = searchParams.get('guild_id')
    const includeAllPhases = searchParams.get('includeAllPhases') === 'true'

    if (!expansionId || !guildId) {
      return NextResponse.json({ error: 'expansion_id and guild_id are required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Get expansion's current_phase and phase_groups for filtering
    let currentPhase = 1 // Default to phase 1 if not set
    let phaseGroups: number[][] | null = null

    const { data: expansion } = await supabase
      .from('expansions')
      .select('current_phase, phase_groups')
      .eq('id', expansionId)
      .single()

    if (expansion?.current_phase != null) {
      currentPhase = expansion.current_phase
    }
    if (expansion?.phase_groups) {
      phaseGroups = expansion.phase_groups as number[][] | null
    }

    // Build query for raid tiers
    // Note: is_guild_active can be null (treated as true/enabled by default) or explicitly true/false
    let query = supabase
      .from('raid_tiers')
      .select('id, name, is_active, is_guild_active, list_mode, submission_deadline, phase')
      .eq('expansion_id', expansionId)
      .eq('is_guild_active', true)

    // Filter by current_phase (linear unlock: show phases <= current)
    if (!includeAllPhases) {
      query = query.lte('phase', currentPhase)
    }

    const { data: tiers, error: tiersError } = await query
      .order('phase')
      .order('id')

    if (tiersError) {
      console.error('Error fetching raid tiers:', tiersError)
      return NextResponse.json({ error: 'Failed to fetch raid tiers' }, { status: 500 })
    }

    return NextResponse.json(
      { tiers: tiers || [], current_phase: currentPhase, phase_groups: phaseGroups },
      {
        headers: {
          // Changes when an officer toggles a tier or advances a phase. 60s
          // browser cache + 5min SWR keeps repeat navigations snappy while
          // bounding staleness.
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=300',
        },
      }
    )
  } catch (error) {
    console.error('Error in GET /api/raid-tiers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/raid-tiers
 *
 * Update raid tier properties. Uses service role to bypass RLS
 * after verifying officer permissions and that the tier belongs to the guild.
 *
 * Body: {
 *   guild_id: string,
 *   tier_id: string,
 *   updates: {
 *     is_guild_active?: boolean,
 *     master_sheet_visible?: boolean,
 *     list_mode?: 'known' | 'discovery'
 *   }
 * }
 *
 * list_mode (DISC-01): 'discovery' is Forever-only (D-17) and seeds the tier's
 * need rows; 'known' is refused once any need is ranked or awarded (D-03). The
 * database repeats both rules in enforce_raid_tier_list_mode_rules for writes
 * that skip this route, so the route checks first and answers with the reason.
 * No page calls this with list_mode yet (D-02, Phase 4 adds the control).
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, tier_id, updates } = body

    if (!guild_id || !tier_id || !updates) {
      return NextResponse.json({ error: 'guild_id, tier_id, and updates are required' }, { status: 400 })
    }

    const serviceSupabase = createTypedServiceRoleClient()

    const { hasPermission } = await verifyPermission(serviceSupabase, user.id, guild_id, 'manage_settings')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Officer permissions required' }, { status: 403 })
    }

    // Allowlist of updatable fields
    const allowedFields = ['is_guild_active', 'master_sheet_visible', 'list_mode']
    const sanitized: Record<string, unknown> = {}
    if (typeof updates === 'object' && !Array.isArray(updates)) {
      for (const key of allowedFields) {
        if (key in updates) sanitized[key] = updates[key]
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    if ('list_mode' in sanitized && !isListMode(sanitized.list_mode)) {
      return NextResponse.json({ error: "list_mode must be 'known' or 'discovery'" }, { status: 400 })
    }

    // regression for research Pitfall 4: this route used to update any tier by
    // id, so an officer of one guild could write another guild's tier. The tier
    // must belong to an expansion of the guild the permission was checked for.
    const { data: tier, error: tierError } = await serviceSupabase
      .from('raid_tiers')
      .select('id, expansion_id, list_mode, is_guild_active, master_sheet_visible')
      .eq('id', tier_id)
      .maybeSingle()
    if (tierError) {
      console.error('Error loading raid tier for PATCH /api/raid-tiers:', tierError)
      return NextResponse.json({ error: 'Failed to load raid tier' }, { status: 500 })
    }
    if (!tier) {
      return NextResponse.json({ error: 'Raid tier not found' }, { status: 404 })
    }

    if (!tier.expansion_id) {
      return NextResponse.json({ error: 'Raid tier not found' }, { status: 404 })
    }

    const { data: expansion, error: expansionError } = await serviceSupabase
      .from('expansions')
      .select('id, guild_id, name')
      .eq('id', tier.expansion_id)
      .maybeSingle()
    if (expansionError) {
      console.error('Error loading expansion for PATCH /api/raid-tiers:', expansionError)
      return NextResponse.json({ error: 'Failed to load raid tier' }, { status: 500 })
    }
    if (!expansion || expansion.guild_id !== guild_id) {
      return NextResponse.json({ error: 'Raid tier not found' }, { status: 404 })
    }

    // A list_mode equal to the current one is not a change; whatever else the
    // request carries is still applied.
    const requestedMode = sanitized.list_mode
    const modeChange = isListMode(requestedMode) && requestedMode !== tier.list_mode ? requestedMode : null
    const { list_mode: _ignoredMode, ...otherFields } = sanitized
    void _ignoredMode

    if (modeChange === null && Object.keys(otherFields).length === 0) {
      return NextResponse.json({ success: true, tier })
    }

    // Every decision is made before the first write, so a refused request writes nothing.
    if (modeChange === 'discovery') {
      const decision = canSwitchToDiscovery({ expansionName: expansion.name })
      if (!decision.allowed) {
        return NextResponse.json({ error: decision.reason }, { status: 400 })
      }
    }

    if (modeChange === 'known') {
      // Need rows stay on the way back (readers filter on kind, D-03); only the
      // counts of rankings and awards decide the switch.
      const needRows = await selectAllPagesOrThrow<{ id: string }>('loot_items need rows', (start, end) =>
        serviceSupabase
          .from('loot_items')
          .select('id')
          .eq('raid_tier_id', tier_id)
          .eq('kind', 'need')
          .order('id', { ascending: true })
          .range(start, end)
      )

      let rankedNeedCount = 0
      let needAwardCount = 0
      if (needRows.length > 0) {
        const needIds = needRows.map(row => row.id)
        const [ranked, awarded] = await Promise.all([
          serviceSupabase
            .from('loot_submission_items')
            .select('id', { count: 'exact', head: true })
            .in('loot_item_id', needIds),
          serviceSupabase
            .from('loot_history')
            .select('id', { count: 'exact', head: true })
            .in('loot_item_id', needIds),
        ])
        if (ranked.error || awarded.error || ranked.count === null || awarded.count === null) {
          console.error('Error counting need use for PATCH /api/raid-tiers:', ranked.error ?? awarded.error)
          return NextResponse.json({ error: 'Failed to check whether this raid can return to Known' }, { status: 500 })
        }
        rankedNeedCount = ranked.count
        needAwardCount = awarded.count
      }

      const decision = canSwitchToKnown({ rankedNeedCount, needAwardCount })
      if (!decision.allowed) {
        return NextResponse.json({ error: decision.reason }, { status: 409 })
      }
    }

    let updatedTier: unknown = tier

    if (modeChange === 'discovery') {
      // enforce_loot_item_need_rules refuses need rows in a tier that is not yet
      // Discovery, so the order is switch first, seed second.
      const { data: switched, error: switchError } = await serviceSupabase
        .from('raid_tiers')
        .update({ list_mode: 'discovery' })
        .eq('id', tier_id)
        .eq('list_mode', 'known')
        .select()
      if (switchError) {
        return NextResponse.json({ error: switchError.message }, { status: 500 })
      }
      if (!switched || switched.length === 0) {
        return NextResponse.json({ error: 'Raid tier changed, please try again' }, { status: 409 })
      }
      updatedTier = switched[0]

      try {
        await seedNeedRows(serviceSupabase, [tier_id])
      } catch (seedError) {
        console.error('Error seeding Discovery needs for PATCH /api/raid-tiers:', seedError)
        // The seed is one insert, so no need row exists and the database backstop
        // allows the switch back. If this fails too, the owner's sync:forever
        // seeds the missing keys of a Discovery tier.
        const { error: revertError } = await serviceSupabase
          .from('raid_tiers')
          .update({ list_mode: 'known' })
          .eq('id', tier_id)
          .eq('list_mode', 'discovery')
        if (revertError) {
          console.error('Error switching raid tier back to Known after a failed seed:', revertError)
        }
        return NextResponse.json({ error: 'Failed to set up Discovery needs for this raid' }, { status: 500 })
      }
    } else if (modeChange === 'known') {
      const { data: switched, error: switchError } = await serviceSupabase
        .from('raid_tiers')
        .update({ list_mode: 'known' })
        .eq('id', tier_id)
        .eq('list_mode', 'discovery')
        .select()
      if (switchError) {
        return NextResponse.json({ error: switchError.message }, { status: 500 })
      }
      if (!switched || switched.length === 0) {
        return NextResponse.json({ error: 'Raid tier changed, please try again' }, { status: 409 })
      }
      updatedTier = switched[0]
    }

    if (modeChange !== null) {
      await logAudit({
        supabase: serviceSupabase,
        guildId: guild_id,
        tableName: 'raid_tiers',
        recordId: tier_id,
        action: 'UPDATE',
        userId: user.id,
        oldData: { list_mode: tier.list_mode },
        newData: { list_mode: modeChange },
      })
    }

    if (Object.keys(otherFields).length > 0) {
      const { data, error } = await serviceSupabase
        .from('raid_tiers')
        .update(otherFields as TablesUpdate<'raid_tiers'>)
        .eq('id', tier_id)
        .select()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      updatedTier = data?.[0]
    }

    return NextResponse.json({ success: true, tier: updatedTier })
  } catch (error) {
    console.error('Error in PATCH /api/raid-tiers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
