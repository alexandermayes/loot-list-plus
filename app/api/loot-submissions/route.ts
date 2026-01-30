import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

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
    const guildId = searchParams.get('guild_id')

    if (!characterId || !tierId || !guildId) {
      return NextResponse.json({ error: 'character_id, tier_id, and guild_id are required' }, { status: 400 })
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

    // Get submission
    const { data: submission, error: subError } = await supabase
      .from('loot_submissions')
      .select('id, status, submitted_at, review_notes')
      .eq('character_id', characterId)
      .eq('raid_tier_id', tierId)
      .eq('guild_id', guildId)
      .maybeSingle()

    if (subError) {
      console.error('Error fetching submission:', subError)
      return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 })
    }

    // If no submission, return null with empty rankings
    if (!submission) {
      return NextResponse.json({ submission: null, rankings: {} })
    }

    // Get rankings for this submission
    const { data: rankingsData, error: rankingsError } = await supabase
      .from('loot_submission_items')
      .select('loot_item_id, rank, slot')
      .eq('submission_id', submission.id)

    if (rankingsError) {
      console.error('Error fetching rankings:', rankingsError)
      return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 })
    }

    // Convert to "rank-slot" -> item_id format
    const rankings: Record<string, string> = {}
    rankingsData?.forEach(r => {
      rankings[`${r.rank}-${r.slot}`] = r.loot_item_id
    })

    return NextResponse.json({ submission, rankings })
  } catch (error) {
    console.error('Error in GET /api/loot-submissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
