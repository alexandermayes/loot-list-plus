import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

export interface BLPData {
  [key: string]: number // key is `${character_id}-${loot_item_id}`, value is times_passed
}

/**
 * GET /api/blp
 *
 * Fetches BLP (Bad Luck Protection) data for a guild.
 * Returns a map of character_id-loot_item_id to times_passed.
 *
 * Query params:
 * - guild_id: Required - The guild ID
 * - item_ids: Optional - Comma-separated list of item IDs to filter by
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const guildId = searchParams.get('guild_id')
    const itemIdsParam = searchParams.get('item_ids')

    if (!guildId) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify user is in the guild (check character_guild_memberships via user's characters)
    const { data: userCharacters } = await supabase
      .from('characters')
      .select('id')
      .eq('user_id', user.id)

    const characterIds = userCharacters?.map(c => c.id) || []

    let isMember = false
    if (characterIds.length > 0) {
      const { data: membership } = await supabase
        .from('character_guild_memberships')
        .select('id')
        .eq('guild_id', guildId)
        .in('character_id', characterIds)
        .eq('is_active', true)
        .limit(1)

      isMember = membership !== null && membership.length > 0
    }

    if (!isMember) {
      return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
    }

    // Build query
    let query = supabase
      .from('blp_tracking')
      .select('character_id, loot_item_id, times_passed')
      .eq('guild_id', guildId)

    // Filter by item IDs if provided
    if (itemIdsParam) {
      const itemIds = itemIdsParam.split(',').filter(Boolean)
      if (itemIds.length > 0) {
        query = query.in('loot_item_id', itemIds)
      }
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching BLP data:', error)
      return NextResponse.json({ error: 'Failed to fetch BLP data' }, { status: 500 })
    }

    // Transform to map format for easy lookup
    const blpMap: BLPData = {}
    for (const record of data || []) {
      const key = `${record.character_id}-${record.loot_item_id}`
      blpMap[key] = record.times_passed
    }

    return NextResponse.json({ data: blpMap })
  } catch (error) {
    console.error('Error in GET /api/blp:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
