import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/guilds/[id]/expansions/[expansionId]/phase
 * Set a content phase as current, bulk-activating all raid tiers in that phase
 *
 * Body: { phase: number }
 *
 * Behavior:
 * - Deactivates is_active for ALL raid tiers in this expansion
 * - Activates is_active for all tiers matching the selected phase
 * - Does NOT modify is_guild_active (visibility stays unchanged)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expansionId: string }> }
) {
  try {
    const { id: guildId, expansionId } = await params
    const body = await request.json()
    const { phase } = body

    if (typeof phase !== 'number' || phase < 1) {
      return NextResponse.json({ error: 'Invalid phase number' }, { status: 400 })
    }

    // Auth check
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const serviceSupabase = createServiceRoleClient()
    const { hasPermission } = await verifyPermission(serviceSupabase, user.id, guildId, 'manage_settings')
    if (!hasPermission) {
      return NextResponse.json({ error: 'Officer permissions required' }, { status: 403 })
    }

    const supabase = await createClient()

    // Verify expansion belongs to this guild
    const { data: expansion, error: expError } = await supabase
      .from('expansions')
      .select('id, name')
      .eq('id', expansionId)
      .eq('guild_id', guildId)
      .single()

    if (expError || !expansion) {
      return NextResponse.json({ error: 'Expansion not found' }, { status: 404 })
    }

    // Get all raid tier IDs for this expansion
    const { data: allTiers, error: tiersError } = await supabase
      .from('raid_tiers')
      .select('id, phase')
      .eq('expansion_id', expansionId)

    if (tiersError || !allTiers) {
      return NextResponse.json({ error: 'Failed to fetch raid tiers' }, { status: 500 })
    }

    const allTierIds = allTiers.map(t => t.id)
    const phaseTierIds = allTiers.filter(t => t.phase === phase).map(t => t.id)

    if (phaseTierIds.length === 0) {
      return NextResponse.json({ error: `No tiers found for phase ${phase}` }, { status: 404 })
    }

    // Step 1: Update current_phase on the expansion
    // This controls which phases are visible to raiders (all phases <= current_phase)
    const { error: phaseError } = await serviceSupabase
      .from('expansions')
      .update({ current_phase: phase })
      .eq('id', expansionId)

    if (phaseError) {
      console.error('Error updating current_phase:', phaseError)
      return NextResponse.json({ error: 'Failed to update current phase' }, { status: 500 })
    }

    // Step 2: Deactivate all tiers in this expansion
    const { error: deactivateError } = await serviceSupabase
      .from('raid_tiers')
      .update({ is_active: false })
      .in('id', allTierIds)

    if (deactivateError) {
      console.error('Error deactivating tiers:', deactivateError)
      return NextResponse.json({ error: 'Failed to deactivate tiers' }, { status: 500 })
    }

    // Step 3: Activate tiers in the selected phase (marks them as "current")
    // Also enable is_guild_active and master_sheet_visible for newly unlocked tiers
    const { error: activateError } = await serviceSupabase
      .from('raid_tiers')
      .update({ is_active: true, is_guild_active: true, master_sheet_visible: true })
      .in('id', phaseTierIds)

    if (activateError) {
      console.error('Error activating phase tiers:', activateError)
      return NextResponse.json({ error: 'Failed to activate phase tiers' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Phase ${phase} is now current`,
      current_phase: phase,
      activatedTiers: phaseTierIds.length,
      deactivatedTiers: allTierIds.length - phaseTierIds.length
    })
  } catch (error) {
    console.error('Error in PATCH /api/guilds/[id]/expansions/[expansionId]/phase:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/guilds/[id]/expansions/[expansionId]/phase
 * Get the current phase for an expansion
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expansionId: string }> }
) {
  try {
    const { id: guildId, expansionId } = await params

    // Auth check
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get expansion with current_phase
    const { data: expansion, error: expError } = await supabase
      .from('expansions')
      .select('id, current_phase')
      .eq('id', expansionId)
      .eq('guild_id', guildId)
      .single()

    if (expError || !expansion) {
      return NextResponse.json({ error: 'Expansion not found' }, { status: 404 })
    }

    return NextResponse.json({
      current_phase: expansion.current_phase || 1
    })
  } catch (error) {
    console.error('Error in GET /api/guilds/[id]/expansions/[expansionId]/phase:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
