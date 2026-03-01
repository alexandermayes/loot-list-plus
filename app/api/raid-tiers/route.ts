import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

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
      .or('is_guild_active.eq.true,is_guild_active.is.null')

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
