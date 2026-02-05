import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

// GET - Fetch submission statuses for multiple tiers
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const characterId = searchParams.get('character_id')
    const guildId = searchParams.get('guild_id')
    const tierIdsParam = searchParams.get('tier_ids')
    const expansionId = searchParams.get('expansion_id')

    if (!characterId || !guildId) {
      return NextResponse.json({ error: 'character_id and guild_id are required' }, { status: 400 })
    }

    // Support both tier_ids (legacy) and expansion_id (phase-based) queries
    const usePhaseBased = !!expansionId
    const tierIds = tierIdsParam?.split(',').filter(Boolean) || []

    if (!usePhaseBased && tierIds.length === 0) {
      return NextResponse.json({ statuses: {}, phaseStatuses: {} })
    }

    const supabase = createServiceRoleClient()

    // Verify user owns this character
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('user_id')
      .eq('id', characterId)
      .single()

    if (charError || !character || character.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized for this character' }, { status: 403 })
    }

    // Get submissions - either by tier IDs or by expansion (for phase-based)
    let query = supabase
      .from('loot_submissions')
      .select('raid_tier_id, phase, status, submitted_at')
      .eq('character_id', characterId)
      .eq('guild_id', guildId)

    if (usePhaseBased) {
      query = query.eq('expansion_id', expansionId).not('phase', 'is', null)
    } else {
      query = query.in('raid_tier_id', tierIds)
    }

    const { data: submissions, error: subError } = await query

    if (subError) {
      console.error('Error fetching submission statuses:', subError)
      return NextResponse.json({ error: 'Failed to fetch statuses' }, { status: 500 })
    }

    // Build status maps - both tier-based and phase-based
    const statuses: Record<string, { status: string; submitted_at: string | null }> = {}
    const phaseStatuses: Record<number, { status: string; submitted_at: string | null }> = {}

    submissions?.forEach(sub => {
      // Tier-based status (legacy)
      if (sub.raid_tier_id) {
        statuses[sub.raid_tier_id] = {
          status: sub.status,
          submitted_at: sub.submitted_at
        }
      }
      // Phase-based status
      if (sub.phase !== null && sub.phase !== undefined) {
        phaseStatuses[sub.phase] = {
          status: sub.status,
          submitted_at: sub.submitted_at
        }
      }
    })

    return NextResponse.json({ statuses, phaseStatuses })
  } catch (error) {
    console.error('Error in GET /api/loot-submissions/statuses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
