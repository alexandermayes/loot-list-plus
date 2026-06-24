import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackApiError } from '@/utils/analytics/server'
import { batchGetDisplayNames } from '@/utils/batch-display-names'

export interface LootHistoryEntry {
  id: string
  awarded_date: string
  character_id: string | null
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
 * - phase: Optional - Filter by content phase number (1-6); spans the guild's raids in that phase
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
    const characterIdFilter = searchParams.get('character_id')
    const itemFilter = searchParams.get('item')
    const lootItemId = searchParams.get('loot_item_id')
    const raidTierFilter = searchParams.get('raid_tier_id')
    const phaseFilter = searchParams.get('phase')
    const expansionFilter = searchParams.get('expansion_id')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    const raidTeamId = searchParams.get('raid_team_id')

    if (!guildId) {
      return NextResponse.json({ error: 'guild_id is required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify user is in the guild via character_guild_memberships
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

      isMember = (membership?.length ?? 0) > 0
    }

    if (!isMember) {
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
        loot_items (
          name,
          wowhead_id,
          boss_name,
          raid_tiers (
            id,
            name
          )
        )
      `, { count: 'exact' })
      .eq('guild_id', guildId)
      .order('awarded_date', { ascending: false })
      .order('created_at', { ascending: false })

    const emptyResult = NextResponse.json({ data: [], pagination: { total: 0, limit, offset, filtered_count: 0 } })

    // ── Resolve filters that need an ID lookup up front ──────────────────────
    // loot_history.raid_tier_id is NOT NULL, so filtering on it directly is both
    // reliable and cheap (no per-item resolution, unlike a joined column).

    // Content phase (1-6) -> the guild's raid tiers in that phase.
    let phaseTierIds: string[] | null = null
    if (phaseFilter && phaseFilter !== 'all') {
      const { data: guildExpansions } = await supabase
        .from('expansions')
        .select('id')
        .eq('guild_id', guildId)
      const expansionIds = guildExpansions?.map(e => e.id) || []

      const { data: phaseTiers } = expansionIds.length > 0
        ? await supabase
            .from('raid_tiers')
            .select('id')
            .in('expansion_id', expansionIds)
            .eq('phase', Number(phaseFilter))
        : { data: [] as { id: string }[] }

      phaseTierIds = phaseTiers?.map(t => t.id) || []
      if (phaseTierIds.length === 0) return emptyResult
    }

    // Item name search -> matching loot_item_ids (the join column can't be
    // filtered on the parent rows directly via PostgREST).
    let itemIdFilter: string[] | null = null
    if (!lootItemId && itemFilter) {
      const { data: matchingItems } = await supabase
        .from('loot_items')
        .select('id')
        .ilike('name', `%${itemFilter}%`)
        .limit(100)

      itemIdFilter = matchingItems?.map(i => i.id) || []
      if (itemIdFilter.length === 0) return emptyResult
    }

    // Raid team -> the team's character_ids.
    let teamCharIds: string[] | null = null
    if (raidTeamId) {
      const { data: teamMembers } = await supabase
        .from('raid_team_members')
        .select('character_id')
        .eq('raid_team_id', raidTeamId)

      teamCharIds = teamMembers?.map(m => m.character_id) || []
      if (teamCharIds.length === 0) return emptyResult
    }

    // Apply filters. IMPORTANT: the fallback query below must apply this SAME
    // set — keep the two blocks in sync so a join failure never silently drops
    // filters (previously the fallback dropped raid/item/team filters).
    if (raidTierFilter && raidTierFilter !== 'all') query = query.eq('raid_tier_id', raidTierFilter)
    if (phaseTierIds) query = query.in('raid_tier_id', phaseTierIds)
    if (expansionFilter && expansionFilter !== 'all') query = query.eq('expansion_id', expansionFilter)
    if (fromDate) query = query.gte('awarded_date', fromDate)
    if (toDate) query = query.lte('awarded_date', toDate)
    // Exact character match (preferred for per-player views); name match as fallback
    if (characterIdFilter) query = query.eq('character_id', characterIdFilter)
    else if (characterFilter) query = query.ilike('character_name', `%${characterFilter}%`)
    if (lootItemId) query = query.eq('loot_item_id', lootItemId)
    else if (itemIdFilter) query = query.in('loot_item_id', itemIdFilter)
    if (teamCharIds) query = query.in('character_id', teamCharIds)

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: historyData, error: historyError, count } = await query

    let filteredData = historyData || []
    let totalCount = count || 0

    if (historyError) {
      console.error('Error fetching loot history (primary query):', JSON.stringify(historyError))
      console.error('Guild ID:', guildId, 'Filters:', { raidTierFilter, phaseFilter, characterFilter, itemFilter, fromDate, toDate })

      // Fallback: simpler query without nested joins
      let fallbackQuery = supabase
        .from('loot_history')
        .select(`
          id,
          awarded_date,
          notes,
          created_at,
          awarded_by,
          character_id,
          character_name,
          loot_item_id
        `, { count: 'exact' })
        .eq('guild_id', guildId)
        .order('awarded_date', { ascending: false })
        .order('created_at', { ascending: false })

      // Mirror of the primary filter block above — keep the two in sync.
      if (raidTierFilter && raidTierFilter !== 'all') fallbackQuery = fallbackQuery.eq('raid_tier_id', raidTierFilter)
      if (phaseTierIds) fallbackQuery = fallbackQuery.in('raid_tier_id', phaseTierIds)
      if (expansionFilter && expansionFilter !== 'all') fallbackQuery = fallbackQuery.eq('expansion_id', expansionFilter)
      if (fromDate) fallbackQuery = fallbackQuery.gte('awarded_date', fromDate)
      if (toDate) fallbackQuery = fallbackQuery.lte('awarded_date', toDate)
      if (characterIdFilter) fallbackQuery = fallbackQuery.eq('character_id', characterIdFilter)
      else if (characterFilter) fallbackQuery = fallbackQuery.ilike('character_name', `%${characterFilter}%`)
      if (lootItemId) fallbackQuery = fallbackQuery.eq('loot_item_id', lootItemId)
      else if (itemIdFilter) fallbackQuery = fallbackQuery.in('loot_item_id', itemIdFilter)
      if (teamCharIds) fallbackQuery = fallbackQuery.in('character_id', teamCharIds)

      fallbackQuery = fallbackQuery.range(offset, offset + limit - 1)

      const { data: fallbackData, error: fallbackError, count: fallbackCount } = await fallbackQuery

      if (fallbackError) {
        console.error('Error fetching loot history (fallback):', JSON.stringify(fallbackError))
        return NextResponse.json({ error: 'Failed to fetch loot history' }, { status: 500 })
      }

      // Batch fetch loot_items data for fallback records
      const itemIds = [...new Set((fallbackData || []).map((h: any) => h.loot_item_id).filter(Boolean))]
      const { data: itemsData } = itemIds.length > 0
        ? await supabase.from('loot_items').select('id, name, wowhead_id, boss_name, raid_tiers(id, name)').in('id', itemIds)
        : { data: [] }

      const itemsMap = new Map((itemsData || []).map((i: any) => [i.id, i]))

      // Batch fetch character data
      const charIds = [...new Set((fallbackData || []).map((h: any) => h.character_id).filter(Boolean))]
      const { data: charsData } = charIds.length > 0
        ? await supabase.from('characters').select('id, name, wow_classes(color_hex)').in('id', charIds)
        : { data: [] }

      const charsMap = new Map((charsData || []).map((c: any) => [c.id, c]))

      // Reassemble into the expected format
      filteredData = (fallbackData || []).map((h: any) => ({
        ...h,
        characters: h.character_id ? charsMap.get(h.character_id) || null : null,
        loot_items: itemsMap.get(h.loot_item_id) || null,
      }))
      totalCount = fallbackCount || 0
    }

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
        character_id: typedEntry.character_id || null,
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
        total: totalCount,
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
