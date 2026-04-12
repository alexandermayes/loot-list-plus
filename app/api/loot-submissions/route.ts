import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackApiError } from '@/utils/analytics/server'

// GET - Fetch loot submission and rankings for a character/tier
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const characterId = searchParams.get('character_id')
    const tierId = searchParams.get('tier_id')
    const phase = searchParams.get('phase')
    const expansionId = searchParams.get('expansion_id')
    const guildId = searchParams.get('guild_id')

    if (!characterId || !guildId) {
      return NextResponse.json({ error: 'character_id and guild_id are required' }, { status: 400 })
    }
    if (!tierId && (!phase || !expansionId)) {
      return NextResponse.json({ error: 'tier_id or (phase and expansion_id) are required' }, { status: 400 })
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

    // Get submission - either by tier_id (legacy) or by phase+expansion_id (new)
    let submissionQuery = supabase
      .from('loot_submissions')
      .select('id, status, submitted_at, review_notes, expansion_id, phase')
      .eq('character_id', characterId)
      .eq('guild_id', guildId)

    if (phase && expansionId) {
      submissionQuery = submissionQuery
        .eq('expansion_id', expansionId)
        .eq('phase', parseInt(phase))
    } else if (tierId) {
      submissionQuery = submissionQuery.eq('raid_tier_id', tierId)
    }

    const { data: submission, error: subError } = await submissionQuery.maybeSingle()

    if (subError) {
      console.error('Error fetching submission:', subError)
      return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 })
    }

    // If no submission, return null with empty rankings
    if (!submission) {
      return NextResponse.json({ submission: null, rankings: {} })
    }

    // Get rankings for this submission (including removed items)
    const { data: rankingsData, error: rankingsError } = await supabase
      .from('loot_submission_items')
      .select('loot_item_id, rank, slot, removed_at')
      .eq('submission_id', submission.id)

    if (rankingsError) {
      console.error('Error fetching rankings:', rankingsError)
      return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 })
    }

    // Convert to "rank-slot" -> item_id format (active items only)
    const rankings: Record<string, string> = {}
    const removedItems: Array<{ loot_item_id: string; rank: number; slot: number }> = []
    rankingsData?.forEach(r => {
      if (r.removed_at) {
        removedItems.push({ loot_item_id: r.loot_item_id, rank: r.rank, slot: r.slot })
      } else {
        rankings[`${r.rank}-${r.slot}`] = r.loot_item_id
      }
    })

    return NextResponse.json({ submission, rankings, removedItems })
  } catch (error) {
    console.error('Error in GET /api/loot-submissions:', error)
    trackApiError('unknown', 'GET /api/loot-submissions', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
