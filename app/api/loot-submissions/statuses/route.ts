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

    if (!characterId || !guildId || !tierIdsParam) {
      return NextResponse.json({ error: 'character_id, guild_id, and tier_ids are required' }, { status: 400 })
    }

    const tierIds = tierIdsParam.split(',').filter(Boolean)
    if (tierIds.length === 0) {
      return NextResponse.json({ statuses: {} })
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

    // Get submissions for all tiers
    const { data: submissions, error: subError } = await supabase
      .from('loot_submissions')
      .select('raid_tier_id, status, submitted_at')
      .eq('character_id', characterId)
      .eq('guild_id', guildId)
      .in('raid_tier_id', tierIds)

    if (subError) {
      console.error('Error fetching submission statuses:', subError)
      return NextResponse.json({ error: 'Failed to fetch statuses' }, { status: 500 })
    }

    // Build status map
    const statuses: Record<string, { status: string; submitted_at: string | null }> = {}
    submissions?.forEach(sub => {
      statuses[sub.raid_tier_id] = {
        status: sub.status,
        submitted_at: sub.submitted_at
      }
    })

    return NextResponse.json({ statuses })
  } catch (error) {
    console.error('Error in GET /api/loot-submissions/statuses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
