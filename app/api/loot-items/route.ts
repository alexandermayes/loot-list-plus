import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackApiError } from '@/utils/analytics/server'
import {
  CLASS_PROFICIENCIES,
  canWearArmorType,
  canUseWeaponType,
  isClassAgnosticSlot,
  type WowClassName,
  type ArmorType,
  type WeaponType,
} from '@/data/class-proficiencies'
import { getItemTypeInfo, inferArmorType, inferWeaponType } from '@/data/item-types'
import { isTokenSlot, canClassUseToken } from '@/data/token-class-mapping'

export const dynamic = 'force-dynamic'

interface LootItemClassRestriction {
  class_id: string
  spec_id: string | null
  spec_type: string | null
  class_name?: string | null
  class_color?: string | null
  spec_name?: string | null
}

// GET - Fetch loot items for a raid tier, filtered by character spec
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const tierId = searchParams.get('tier_id')
    const phase = searchParams.get('phase')
    const expansionId = searchParams.get('expansion_id')
    const characterId = searchParams.get('character_id')
    const guildId = searchParams.get('guild_id')

    // Support both tier_id (legacy) and phase+expansion_id (new)
    if (!characterId) {
      return NextResponse.json({ error: 'character_id is required' }, { status: 400 })
    }
    if (!tierId && (!phase || !expansionId)) {
      return NextResponse.json({ error: 'tier_id or (phase and expansion_id) are required' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Get character info for spec filtering (including class name for proficiencies)
    const { data: character, error: charError } = await supabase
      .from('characters')
      .select('id, class_id, spec_id, user_id, wow_classes(name)')
      .eq('id', characterId)
      .single()

    if (charError || !character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    // Verify user owns this character
    if (character.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized for this character' }, { status: 403 })
    }

    // Get tier IDs to query - either single tier or all active tiers in phase
    let tierIds: string[] = []

    if (tierId) {
      // Legacy single-tier query
      tierIds = [tierId]
    } else if (phase && expansionId && guildId) {
      // Validate phase parameter (MED-02: Input validation bounds)
      const parsedPhase = parseInt(phase, 10)
      if (isNaN(parsedPhase) || parsedPhase < 1 || parsedPhase > 10) {
        return NextResponse.json({ error: 'Invalid phase value (must be 1-10)' }, { status: 400 })
      }

      // Phase-based query - get all active tiers in this phase
      // Note: is_guild_active can be null (treated as true/enabled by default) or explicitly true/false
      const { data: phaseTiers, error: phaseTiersError } = await supabase
        .from('raid_tiers')
        .select('id')
        .eq('expansion_id', expansionId)
        .eq('phase', parsedPhase)
        .or('is_guild_active.eq.true,is_guild_active.is.null')

      if (phaseTiersError) {
        console.error('Error fetching phase tiers:', phaseTiersError)
        return NextResponse.json({ error: 'Failed to fetch phase tiers' }, { status: 500 })
      }

      tierIds = phaseTiers?.map(t => t.id) || []

      if (tierIds.length === 0) {
        return NextResponse.json({ items: [] })
      }
    }

    // Fetch loot items with class/spec restrictions
    const { data: items, error: itemsError } = await supabase
      .from('loot_items')
      .select(`
        id, name, boss_name, item_slot, wowhead_id,
        classification, item_type, allocation_cost, is_available, is_loot_council, roles,
        armor_type, weapon_type, raid_tier_id,
        loot_item_classes(class_id, spec_id, spec_type),
        raid_tiers(name)
      `)
      .in('raid_tier_id', tierIds)
      .eq('is_available', true)
      .order('id')

    if (itemsError) {
      console.error('Error fetching loot items:', itemsError)
      return NextResponse.json({ error: 'Failed to fetch loot items' }, { status: 500 })
    }

    // Fetch class/spec reference data for enriching loot_item_classes
    const [{ data: allClasses }, { data: allSpecs }] = await Promise.all([
      supabase.from('wow_classes').select('id, name, color_hex'),
      supabase.from('class_specs').select('id, name, class_id'),
    ])

    const classMap = new Map(allClasses?.map(c => [c.id, c]) || [])
    const specMap = new Map(allSpecs?.map(s => [s.id, s]) || [])

    // Get character's class name for proficiency filtering
    // wow_classes is a single object from the foreign key join (not an array)
    const wowClass = character.wow_classes as { name: string } | { name: string }[] | null
    const className = (Array.isArray(wowClass) ? wowClass[0]?.name : wowClass?.name) as WowClassName | undefined

    // Filter items based on class proficiencies (armor/weapon types)
    // Officer spec assignments (loot_item_classes) override proficiency checks:
    // if an officer explicitly assigned a class/spec to an item, trust that decision.
    const filteredItems = (items || []).filter(item => {
      const classes = item.loot_item_classes as LootItemClassRestriction[]

      // If officers explicitly assigned this character's class or spec to the item,
      // bypass all proficiency checks. The officer's assignment is authoritative.
      if (classes && classes.length > 0 && character.class_id) {
        const hasClassAssignment = classes.some(c =>
          c.class_id === character.class_id && (
            c.spec_id === null || // Class-level assignment
            c.spec_id === character.spec_id // Spec-specific assignment
          )
        )
        if (hasClassAssignment) {
          return true
        }
      }

      // Check if this is a token - apply token class restrictions
      if (isTokenSlot(item.item_slot)) {
        // Tokens are rankable, but only by classes that can use them
        if (className && !canClassUseToken(item.name, className)) {
          return false
        }
        // Skip armor/weapon proficiency checks for tokens
        return true
      }

      // Check class proficiencies (armor/weapon types the class can equip)
      if (className && CLASS_PROFICIENCIES[className]) {
        // Get item's armor/weapon type from DB or lookup table or inference
        let armorType = item.armor_type as ArmorType | null
        let weaponType = item.weapon_type as WeaponType | null

        // If not in DB, try lookup table
        if (!armorType && !weaponType) {
          const typeInfo = getItemTypeInfo(item.wowhead_id)
          if (typeInfo) {
            armorType = typeInfo.armor_type || null
            weaponType = typeInfo.weapon_type || null
          }
        }

        // If still unknown, try to infer from item name
        if (!armorType && !weaponType) {
          armorType = inferArmorType(item.item_slot, item.name) || null
          weaponType = inferWeaponType(item.item_slot, item.name) || null
        }

        // Check weapon proficiency FIRST (before class-agnostic bypass)
        // This ensures shields in Off Hand slots are still filtered by class
        if (weaponType) {
          if (!canUseWeaponType(className, weaponType)) {
            return false
          }
        }

        // Skip armor proficiency checks for class-agnostic slots (Neck, Back, Trinket, etc.)
        // Note: weapon_type check above already handles shields in Off Hand slots
        if (isClassAgnosticSlot(item.item_slot)) {
          return true
        }

        // Check armor proficiency
        if (armorType) {
          if (!canWearArmorType(className, armorType)) {
            return false
          }
        }
      }

      return true
    })

    // Add bracket filtering fields to each filtered item
    // Fields computed:
    // - character_spec_type: 'primary' | 'secondary' | null - character's relationship to item
    // - is_allocated: boolean - does item have ANY prio assignments?
    // - has_primary_only: boolean - has primary but no secondary assignments?
    //
    // Bracket rules (from user requirements):
    // - Brackets 1-4: character is PRIMARY, OR item is UNALLOCATED
    // - No Bracket: character is PRIMARY/SECONDARY, OR item is UNALLOCATED, OR item has primary-only
    // - Off-spec: ALL equippable items
    const filteredItemsWithSpecType = filteredItems.map(item => {
      const classes = item.loot_item_classes as LootItemClassRestriction[]

      // Determine if item has ANY allocations
      const isAllocated = classes && classes.length > 0

      // Determine if item has primary-only (no secondary) assignments
      // This matters for non-prio'd characters: they can use No Bracket if no secondary exists
      let hasPrimaryOnly = false
      if (isAllocated) {
        const hasPrimary = classes.some(c => c.spec_type === 'primary')
        const hasSecondary = classes.some(c => c.spec_type === 'secondary')
        hasPrimaryOnly = hasPrimary && !hasSecondary
      }

      // Determine character's spec_type for this item
      let characterSpecType: 'primary' | 'secondary' | null = null

      if (character.spec_id && isAllocated) {
        // Check if character's spec is specifically assigned
        const specSpecificEntry = classes.find(c => c.spec_id === character.spec_id)
        if (specSpecificEntry?.spec_type) {
          characterSpecType = specSpecificEntry.spec_type as 'primary' | 'secondary'
        } else {
          // No spec-specific entry - check for class-level entry (spec_id null)
          const classLevelEntry = classes.find(c => c.class_id === character.class_id && c.spec_id === null)
          if (classLevelEntry?.spec_type) {
            characterSpecType = classLevelEntry.spec_type as 'primary' | 'secondary'
          }
          // If no matching entry, characterSpecType stays null (not prio'd)
        }
      }
      // If !isAllocated (classes.length === 0), characterSpecType stays null (unallocated)

      return {
        ...item,
        character_spec_type: characterSpecType,
        is_allocated: isAllocated,
        has_primary_only: hasPrimaryOnly
      }
    })

    // Merge raid tier name and enriched class data into response
    const enrichedItems = filteredItemsWithSpecType.map(item => {
      const raidTier = item.raid_tiers as { name: string } | { name: string }[] | null
      const raidTierName = Array.isArray(raidTier) ? raidTier[0]?.name : raidTier?.name
      const classes = item.loot_item_classes as LootItemClassRestriction[]
      return {
        ...item,
        loot_item_classes: (classes || []).map(lic => ({
          ...lic,
          class_name: classMap.get(lic.class_id)?.name || null,
          class_color: classMap.get(lic.class_id)?.color_hex || null,
          spec_name: lic.spec_id ? specMap.get(lic.spec_id)?.name || null : null,
        })),
        raid_tier_name: raidTierName || null
      }
    })

    return NextResponse.json(
      { items: enrichedItems },
      {
        headers: {
          'Cache-Control': 'private, no-cache'
        }
      }
    )
  } catch (error) {
    console.error('Error in GET /api/loot-items:', error)
    trackApiError('unknown', 'GET /api/loot-items', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
