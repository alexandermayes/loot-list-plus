import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'

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
      .select('id, name, is_active, is_guild_active, submission_deadline, phase')
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
          'Cache-Control': 'private, no-cache'
        }
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
 * after verifying officer permissions.
 *
 * Body: {
 *   guild_id: string,
 *   tier_id: string,
 *   updates: { is_guild_active?: boolean, master_sheet_visible?: boolean }
 * }
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

    const serviceSupabase = createServiceRoleClient()

    const { hasPermission } = await verifyOfficerPermissions(serviceSupabase, user.id, guild_id)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Officer permissions required' }, { status: 403 })
    }

    // Allowlist of updatable fields
    const allowedFields = ['is_guild_active', 'master_sheet_visible']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in updates) sanitized[key] = updates[key]
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await serviceSupabase
      .from('raid_tiers')
      .update(sanitized)
      .eq('id', tier_id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, tier: data?.[0] })
  } catch (error) {
    console.error('Error in PATCH /api/raid-tiers:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
