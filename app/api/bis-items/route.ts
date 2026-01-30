import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { TBC_BIS, type BisTierData, type BisItem } from '@/data/bis/tbc-bis'

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
 * Fetches BIS items for a character's spec matched against available loot items for a tier.
 * Returns items sorted by priority (BIS first, then alt) with slot information for auto-ranking.
 *
 * Query params:
 * - tier_id: The raid tier ID
 * - character_id: The character ID (used to determine spec)
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const tierId = searchParams.get('tier_id')
    const characterId = searchParams.get('character_id')

    if (!tierId || !characterId) {
      return NextResponse.json({ error: 'tier_id and character_id are required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Get character info
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, user_id, class_id, spec_id')
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
    if (!character.spec_id) {
      return NextResponse.json({
        error: 'Character has no spec set. Please set your specialization first.',
        code: 'NO_SPEC'
      }, { status: 400 })
    }

    // Get spec name and class name
    const { data: specData, error: specError } = await supabase
      .from('class_specs')
      .select('id, name, class_id')
      .eq('id', character.spec_id)
      .single()

    if (specError || !specData) {
      return NextResponse.json({
        error: 'Could not find spec information',
        code: 'SPEC_ERROR'
      }, { status: 500 })
    }

    // Get class name
    const { data: classData, error: classError } = await supabase
      .from('wow_classes')
      .select('id, name')
      .eq('id', specData.class_id)
      .single()

    if (classError || !classData) {
      return NextResponse.json({
        error: 'Could not find class information',
        code: 'CLASS_ERROR'
      }, { status: 500 })
    }

    const specName = specData.name
    const className = classData.name
    const bisSpecKey = getBisSpecKey(specName, className)

    // Get raid tier name
    const { data: tier, error: tierError } = await supabase
      .from('raid_tiers')
      .select('id, name')
      .eq('id', tierId)
      .single()

    if (tierError || !tier) {
      return NextResponse.json({ error: 'Raid tier not found' }, { status: 404 })
    }

    // Get BIS data for this spec and tier
    const bisData = TBC_BIS[bisSpecKey]?.[tier.name] as BisTierData | undefined

    if (!bisData) {
      return NextResponse.json({
        error: `No BIS data available for ${bisSpecKey} in ${tier.name}`,
        code: 'NO_BIS_DATA'
      }, { status: 404 })
    }

    // Fetch all loot items for this tier
    const { data: lootItems, error: itemsError } = await supabase
      .from('loot_items')
      .select('id, name, item_slot, wowhead_id')
      .eq('raid_tier_id', tierId)
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

    // Process each slot in BIS data
    Object.entries(bisData).forEach(([slot, items]) => {
      (items as BisItem[]).forEach(bisItem => {
        const lootItem = itemsByWowheadId[bisItem.wowhead_id]
        if (lootItem) {
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

    return NextResponse.json({
      spec_name: bisSpecKey,
      tier_name: tier.name,
      items: matchedItems,
      total_bis_items: Object.values(bisData).flat().length,
      matched_count: matchedItems.length,
      unmatched_count: unmatchedBisItems.length
    })
  } catch (error) {
    console.error('Error in GET /api/bis-items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
