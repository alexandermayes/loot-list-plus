import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { TBC_BIS, type BisTierData, type BisItem } from '@/data/bis/tbc-bis'

/**
 * Normalize raid tier names to match BIS data keys.
 * Database may have variations like "Tempest Keep: The Eye" but BIS data uses "Tempest Keep".
 */
const RAID_NAME_ALIASES: Record<string, string> = {
  'Tempest Keep: The Eye': 'Tempest Keep',
  'The Eye': 'Tempest Keep',
  'Mount Hyjal': 'Hyjal Summit',
}

function normalizeTierName(tierName: string): string {
  return RAID_NAME_ALIASES[tierName] || tierName
}

interface LootItem {
  id: string
  name: string
  item_slot: string
  wowhead_id: number
}

/**
 * Map database spec names to BIS data lookup keys
 * Database stores: "Feral", "Holy", "Shadow", etc.
 * BIS data uses: "Feral Druid", "Holy Paladin", "Shadow Priest", etc.
 */
function getBisSpecKey(specName: string, className: string): string {
  // Single-spec classes where spec name = class name
  const singleSpecClasses = ['Hunter', 'Mage', 'Warlock', 'Rogue']
  if (singleSpecClasses.includes(className)) {
    return className
  }

  // Multi-spec classes: combine spec + class name
  return `${specName} ${className}`
}

/**
 * GET /api/bis-items
 *
 * Fetches BIS items for a character's spec matched against available loot items.
 * Returns items sorted by priority (BIS first, then alt) with slot information for auto-ranking.
 *
 * Query params:
 * - expansion_id: The expansion ID
 * - phase: The phase number
 * - character_id: The character ID (used to determine spec)
 * - guild_id: The guild ID (used to filter active tiers)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const expansionId = searchParams.get('expansion_id')
    const phase = searchParams.get('phase')
    const characterId = searchParams.get('character_id')
    const guildId = searchParams.get('guild_id')

    if (!expansionId || !phase || !characterId || !guildId) {
      return NextResponse.json({ error: 'expansion_id, phase, character_id, and guild_id are required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Get character info with spec and class in a single query (avoiding N+1)
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select(`
        id,
        user_id,
        class_id,
        spec_id,
        spec:class_specs (
          id,
          name
        ),
        class:wow_classes (
          id,
          name
        )
      `)
      .eq('id', characterId)
      .single()

    if (charError || !character) {
      console.error('Character lookup failed:', { characterId, charError })
      return NextResponse.json({ error: 'Character not found', details: charError?.message }, { status: 404 })
    }

    // Verify user owns this character
    if (character.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized for this character' }, { status: 403 })
    }

    // Get spec name if character has a spec set
    if (!character.spec_id || !character.spec) {
      return NextResponse.json({
        error: 'Character has no spec set. Please set your specialization first.',
        code: 'NO_SPEC'
      }, { status: 400 })
    }

    if (!character.class) {
      return NextResponse.json({
        error: 'Could not find class information',
        code: 'CLASS_ERROR'
      }, { status: 500 })
    }

    // Handle Supabase returning arrays for single joins
    const specData = Array.isArray(character.spec) ? character.spec[0] : character.spec
    const classData = Array.isArray(character.class) ? character.class[0] : character.class

    const specName = specData.name
    const className = classData.name
    const bisSpecKey = getBisSpecKey(specName, className)

    // Get all tiers for this expansion (needed for error messaging about disabled tiers)
    const { data: allTiers } = await supabase
      .from('raid_tiers')
      .select('id, name, phase, is_guild_active')
      .eq('expansion_id', expansionId)

    // Get all raid tiers for this expansion and phase that are active for the guild
    // Note: is_guild_active can be null (treated as true/enabled by default) or explicitly true/false
    const { data: tiers, error: tierError } = await supabase
      .from('raid_tiers')
      .select('id, name')
      .eq('expansion_id', expansionId)
      .eq('phase', parseInt(phase, 10))
      .or('is_guild_active.eq.true,is_guild_active.is.null')

    if (tierError) {
      console.error('Error fetching tiers:', tierError)
      return NextResponse.json({ error: 'Failed to fetch raid tiers' }, { status: 500 })
    }

    if (!tiers || tiers.length === 0) {
      return NextResponse.json({ error: 'No active raid tiers found for this phase' }, { status: 404 })
    }

    // Collect BIS data from all tiers
    const combinedBisData: BisTierData = {}
    const tierNames: string[] = []

    for (const tier of tiers) {
      const normalizedName = normalizeTierName(tier.name)
      const tierBisData = TBC_BIS[bisSpecKey]?.[normalizedName] as BisTierData | undefined
      if (tierBisData) {
        tierNames.push(normalizedName)
        // Merge BIS data from this tier
        for (const [slot, items] of Object.entries(tierBisData)) {
          const slotKey = slot as keyof BisTierData
          if (!combinedBisData[slotKey]) {
            combinedBisData[slotKey] = []
          }
          combinedBisData[slotKey]!.push(...(items as BisItem[]))
        }
      }
    }

    if (Object.keys(combinedBisData).length === 0) {
      // Debug info for troubleshooting
      const activeTierNames = tiers.map(t => t.name)
      const availableBisTiers = Object.keys(TBC_BIS[bisSpecKey] || {})

      // Check if there are BIS tiers for this phase that are disabled
      const allTiersForPhase = allTiers?.filter(t => t.phase === parseInt(phase, 10)) || []
      const disabledTiers = allTiersForPhase.filter(t => t.is_guild_active === false)
      const disabledTiersWithBisData = disabledTiers.filter(t =>
        availableBisTiers.includes(normalizeTierName(t.name))
      )

      console.error('[BIS API] BIS lookup failed:', {
        bisSpecKey,
        phase,
        activeTierNames,
        availableBisTiers,
        disabledTiersWithBisData: disabledTiersWithBisData.map(t => t.name),
        hasBisSpec: !!TBC_BIS[bisSpecKey]
      })

      // Provide a more helpful error message
      let errorMessage = `No BIS data available for ${bisSpecKey} in phase ${phase}`
      if (disabledTiersWithBisData.length > 0) {
        const disabledNames = disabledTiersWithBisData.map(t => t.name).join(', ')
        errorMessage = `${bisSpecKey} BIS items come from ${disabledNames}, which ${disabledTiersWithBisData.length === 1 ? 'is' : 'are'} disabled for this guild`
      }

      return NextResponse.json({
        error: errorMessage,
        code: 'NO_BIS_DATA',
        details: {
          active_raids: activeTierNames,
          bis_data_available_for: availableBisTiers,
          disabled_raids_with_bis: disabledTiersWithBisData.map(t => t.name)
        }
      }, { status: 404 })
    }

    // Fetch all loot items for these tiers
    const tierIds = tiers.map(t => t.id)
    const { data: lootItems, error: itemsError } = await supabase
      .from('loot_items')
      .select('id, name, item_slot, wowhead_id')
      .in('raid_tier_id', tierIds)
      .eq('is_available', true)

    if (itemsError) {
      console.error('Error fetching loot items:', itemsError)
      return NextResponse.json({ error: 'Failed to fetch loot items' }, { status: 500 })
    }

    // Create a map of wowhead_id to loot item
    const itemsByWowheadId: Record<number, LootItem> = {}
    lootItems?.forEach(item => {
      itemsByWowheadId[item.wowhead_id] = item
    })

    // Match BIS items against available loot items
    interface MatchedBisItem {
      loot_item_id: string
      wowhead_id: number
      name: string
      slot: string
      priority: 'bis' | 'alt'
    }

    const matchedItems: MatchedBisItem[] = []
    const unmatchedBisItems: { wowhead_id: number; slot: string; priority: string }[] = []
    const seenWowheadIds = new Set<number>() // Prevent duplicates across tiers

    // Process each slot in combined BIS data
    Object.entries(combinedBisData).forEach(([slot, items]) => {
      (items as BisItem[]).forEach(bisItem => {
        // Skip if we've already added this item
        if (seenWowheadIds.has(bisItem.wowhead_id)) return

        const lootItem = itemsByWowheadId[bisItem.wowhead_id]
        if (lootItem) {
          seenWowheadIds.add(bisItem.wowhead_id)
          matchedItems.push({
            loot_item_id: lootItem.id,
            wowhead_id: bisItem.wowhead_id,
            name: lootItem.name,
            slot: lootItem.item_slot,
            priority: bisItem.priority
          })
        } else {
          unmatchedBisItems.push({
            wowhead_id: bisItem.wowhead_id,
            slot,
            priority: bisItem.priority
          })
        }
      })
    })

    // Sort by priority (BIS first) then by slot
    matchedItems.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority === 'bis' ? -1 : 1
      }
      return a.slot.localeCompare(b.slot)
    })

    return NextResponse.json(
      {
        spec_name: bisSpecKey,
        tier_names: tierNames,
        phase: parseInt(phase, 10),
        items: matchedItems,
        total_bis_items: Object.values(combinedBisData).flat().length,
        matched_count: matchedItems.length,
        unmatched_count: unmatchedBisItems.length
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=300, stale-while-revalidate=600'
        }
      }
    )
  } catch (error) {
    console.error('Error in GET /api/bis-items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
