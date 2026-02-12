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

interface LootItemClassRestriction {
  class_id: string
  spec_id: string | null
  spec_type: string | null
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
        classification, item_type, allocation_cost, is_available, roles,
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

    // Get character's class name for proficiency filtering
    // wow_classes is a single object from the foreign key join (not an array)
    const wowClass = character.wow_classes as { name: string } | { name: string }[] | null
    const className = (Array.isArray(wowClass) ? wowClass[0]?.name : wowClass?.name) as WowClassName | undefined

    // Filter items based on class proficiencies (armor/weapon types)
    // NOTE: We do NOT filter based on loot_item_classes entries - those determine
    // bracket placement (primary/secondary/off-spec), not item visibility.
    // A character should see ALL equippable items, even if not prio'd on them.
    const filteredItems = (items || []).filter(item => {
      const classes = item.loot_item_classes as LootItemClassRestriction[]

      // Check if this is a token - apply token class restrictions
      if (isTokenSlot(item.item_slot)) {
        // Tokens are rankable, but only by classes that can use them
        if (className && !canClassUseToken(item.name, className)) {
          return false
        }
        // Skip armor/weapon proficiency checks for tokens
        return true
      }

      // Third, check class proficiencies (armor/weapon types the class can equip)
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

    // If guildId provided, fetch consensus counts (how many OTHER guildmates ranked each item)
    let consensusCounts: Record<string, number> = {}

    if (guildId && filteredItemsWithSpecType.length > 0) {
      const itemIds = filteredItemsWithSpecType.map(item => item.id)

      // Query approved submissions from other characters in the guild
      // For phase-based queries, use expansion_id + phase; for tier queries use raid_tier_id
      let query = supabase
        .from('loot_submission_items')
        .select(`
          loot_item_id,
          loot_submissions!inner(character_id, status, guild_id, expansion_id, phase, raid_tier_id)
        `)
        .in('loot_item_id', itemIds)
        .eq('loot_submissions.guild_id', guildId)
        .eq('loot_submissions.status', 'approved')
        .neq('loot_submissions.character_id', characterId)

      // Filter by phase or tier depending on query type
      if (phase && expansionId) {
        query = query
          .eq('loot_submissions.expansion_id', expansionId)
          .eq('loot_submissions.phase', parseInt(phase))
      } else if (tierId) {
        query = query.eq('loot_submissions.raid_tier_id', tierId)
      }

      const { data: submissionItems } = await query

      // Count unique characters per item
      if (submissionItems) {
        const charactersByItem: Record<string, Set<string>> = {}
        submissionItems.forEach((si: any) => {
          const itemId = si.loot_item_id
          const charId = si.loot_submissions?.character_id
          if (itemId && charId) {
            if (!charactersByItem[itemId]) {
              charactersByItem[itemId] = new Set()
            }
            charactersByItem[itemId].add(charId)
          }
        })
        // Convert sets to counts
        Object.entries(charactersByItem).forEach(([itemId, chars]) => {
          consensusCounts[itemId] = chars.size
        })
      }
    }

    // Debug: Log character info
    console.log('[loot-items] Character:', {
      class_id: character.class_id,
      spec_id: character.spec_id,
      className
    })

    // Debug: Log bracket filtering stats
    const bracketStats = {
      primary: filteredItemsWithSpecType.filter(i => i.character_spec_type === 'primary').length,
      secondary: filteredItemsWithSpecType.filter(i => i.character_spec_type === 'secondary').length,
      notPriod: filteredItemsWithSpecType.filter(i => i.character_spec_type === null && i.is_allocated).length,
      unallocated: filteredItemsWithSpecType.filter(i => !i.is_allocated).length,
      hasPrimaryOnly: filteredItemsWithSpecType.filter(i => i.has_primary_only).length,
      total: filteredItemsWithSpecType.length
    }
    console.log('[loot-items] Bracket filtering stats:', bracketStats)

    // Debug: Log a few example items with their bracket fields
    const itemsWithClasses = filteredItemsWithSpecType.filter(i => i.is_allocated)
    console.log('[loot-items] Allocated items:', itemsWithClasses.length)
    itemsWithClasses.slice(0, 5).forEach(i => {
      const classes = i.loot_item_classes as LootItemClassRestriction[]
      console.log(`[loot-items] Item "${i.name}": spec_type=${i.character_spec_type}, allocated=${i.is_allocated}, primaryOnly=${i.has_primary_only}`,
        ', entries=', classes.map(c => ({ spec_id: c.spec_id?.slice(0, 8), spec_type: c.spec_type })))
    })

    // Debug: Log class-agnostic items
    const classAgnosticItems = filteredItemsWithSpecType.filter(i => isClassAgnosticSlot(i.item_slot))
    console.log('[loot-items] Class-agnostic items:', classAgnosticItems.length,
      classAgnosticItems.slice(0, 3).map(i => ({ name: i.name, slot: i.item_slot, spec_type: i.character_spec_type })))

    // Merge consensus counts and raid tier name into response
    const itemsWithConsensus = filteredItemsWithSpecType.map(item => {
      const raidTier = item.raid_tiers as { name: string } | { name: string }[] | null
      const raidTierName = Array.isArray(raidTier) ? raidTier[0]?.name : raidTier?.name
      return {
        ...item,
        raid_tier_name: raidTierName || null,
        consensus_count: consensusCounts[item.id] || 0
      }
    })

    return NextResponse.json(
      { items: itemsWithConsensus },
      {
        headers: {
          'Cache-Control': 'private, max-age=60, stale-while-revalidate=120'
        }
      }
    )
  } catch (error) {
    console.error('Error in GET /api/loot-items:', error)
    trackApiError('unknown', 'GET /api/loot-items', error instanceof Error ? error : new Error(String(error)))
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
