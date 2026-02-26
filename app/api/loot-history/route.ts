import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackApiError } from '@/utils/analytics/server'
import { batchGetDisplayNames } from '@/utils/batch-display-names'

export interface LootHistoryEntry {
  id: string
  awarded_date: string
  character_name: string
  character_class_color: string | null
  item_name: string
  wowhead_id: number
  boss_name: string
  raid_tier_name: string
  awarded_by_name: string | null
  notes: string | null
  created_at: string
}

/**
 * GET /api/loot-history
 *
 * Fetches loot history for a guild with optional filters.
 *
 * Query params:
 * - guild_id: Required - The guild ID
 * - limit: Optional - Number of records (default 50)
 * - offset: Optional - Offset for pagination (default 0)
 * - character: Optional - Filter by character name (partial match)
 * - item: Optional - Filter by item name (partial match)
 * - raid_tier_id: Optional - Filter by raid tier
 * - from: Optional - Start date (YYYY-MM-DD)
 * - to: Optional - End date (YYYY-MM-DD)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const guildId = searchParams.get('guild_id')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const characterFilter = searchParams.get('character')
    const itemFilter = searchParams.get('item')
    const raidTierFilter = searchParams.get('raid_tier_id')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')

    if (!guildId) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify user is in the guild
    const { data: membership } = await supabase
      .from('guild_members')
      .select('role')
      .eq('guild_id', guildId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this guild' }, { status: 403 })
    }

    // Build query - join characters table for linked characters,
    // fall back to denormalized character_name for unlinked ones
    let query = supabase
      .from('loot_history')
      .select(`
        id,
        awarded_date,
        notes,
        created_at,
        awarded_by,
        character_id,
        character_name,
        characters (
          name,
          wow_classes (
            color_hex
          )
        ),
        loot_items!inner (
          name,
          wowhead_id,
          boss_name,
          raid_tiers!inner (
            id,
            name
          )
        )
      `, { count: 'exact' })
      .eq('guild_id', guildId)
      .order('awarded_date', { ascending: false })
      .order('created_at', { ascending: false })

    // Apply filters
    if (raidTierFilter && raidTierFilter !== 'all') {
      query = query.eq('loot_items.raid_tier_id', raidTierFilter)
    }

    if (fromDate) {
      query = query.gte('awarded_date', fromDate)
    }

    if (toDate) {
      query = query.lte('awarded_date', toDate)
    }

    // SQL-level name filtering (replaces previous client-side filtering)
    if (characterFilter) {
      query = query.ilike('character_name', `%${characterFilter}%`)
    }

    if (itemFilter) {
      query = query.ilike('loot_items.name', `%${itemFilter}%`)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: historyData, error: historyError, count } = await query

    if (historyError) {
      console.error('Error fetching loot history:', historyError)
      return NextResponse.json({ error: 'Failed to fetch loot history' }, { status: 500 })
    }

    const filteredData = historyData || []

    // Batch fetch display names for officers who awarded items
    const awardedByIds: string[] = []
    for (const entry of filteredData) {
      if (entry.awarded_by) {
        awardedByIds.push(entry.awarded_by as string)
      }
    }
    const displayNames = await batchGetDisplayNames(supabase, awardedByIds)

    // Define types for Supabase response
    interface RaidTierData {
      id?: string
      name?: string
    }
    interface LootItemData {
      name?: string
      wowhead_id?: number
      boss_name?: string
      raid_tiers?: RaidTierData | RaidTierData[]
    }
    interface CharacterData {
      name?: string
      wow_classes?: { color_hex?: string } | { color_hex?: string }[]
    }
    interface HistoryEntry {
      id: string
      awarded_date: string
      character_id?: string
      character_name?: string
      characters?: CharacterData | CharacterData[]
      awarded_by?: string
      notes?: string
      created_at: string
      loot_items?: LootItemData | LootItemData[]
    }

    // Transform data
    const entries: LootHistoryEntry[] = filteredData.map((entry) => {
      const typedEntry = entry as unknown as HistoryEntry
      // Handle nested array responses from Supabase
      const lootItem = Array.isArray(typedEntry.loot_items) ? typedEntry.loot_items[0] : typedEntry.loot_items
      const raidTier = lootItem?.raid_tiers
      const tierData = Array.isArray(raidTier) ? raidTier[0] : raidTier

      // Get character name and class color from joined characters table,
      // falling back to denormalized character_name for unlinked characters
      const character = Array.isArray(typedEntry.characters) ? typedEntry.characters[0] : typedEntry.characters
      const charName = character?.name || typedEntry.character_name || 'Unknown'
      const wowClass = character?.wow_classes
      const classColor = Array.isArray(wowClass) ? wowClass[0]?.color_hex : wowClass?.color_hex

      return {
        id: typedEntry.id,
        awarded_date: typedEntry.awarded_date,
        character_name: charName,
        character_class_color: classColor || null,
        item_name: lootItem?.name || 'Unknown Item',
        wowhead_id: lootItem?.wowhead_id || 0,
        boss_name: lootItem?.boss_name || 'Unknown',
        raid_tier_name: tierData?.name || 'Unknown',
        awarded_by_name: typedEntry.awarded_by ? (displayNames.get(typedEntry.awarded_by) || 'Unknown') : null,
        notes: typedEntry.notes || null,
        created_at: typedEntry.created_at
      }
    })

    return NextResponse.json({
      data: entries,
      pagination: {
        total: count || 0,
        limit,
        offset,
        filtered_count: entries.length
      }
    })
  } catch (error) {
    console.error('Error in GET /api/loot-history:', error)
    trackApiError('unknown', 'GET /api/loot-history', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
