import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { logAudit } from '@/utils/audit/log'
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
    const phasesParam = searchParams.get('phases') // comma-separated for merged groups
    const expansionId = searchParams.get('expansion_id')
    const characterId = searchParams.get('character_id')
    const guildId = searchParams.get('guild_id')

    // Support tier_id (legacy), phase+expansion_id, or phases+expansion_id (merged groups)
    if (!characterId) {
      return NextResponse.json({ error: 'character_id is required' }, { status: 400 })
    }
    if (!tierId && !phase && !phasesParam) {
      return NextResponse.json({ error: 'tier_id, phase, or phases parameter is required' }, { status: 400 })
    }
    if ((phase || phasesParam) && !expansionId) {
      return NextResponse.json({ error: 'expansion_id is required with phase/phases' }, { status: 400 })
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
    } else if ((phase || phasesParam) && expansionId) {
      // Parse phase values (single or comma-separated)
      let phaseValues: number[] = []

      if (phasesParam) {
        // Multi-phase: phases=1,2
        phaseValues = phasesParam.split(',')
          .map(p => parseInt(p.trim(), 10))
          .filter(p => !isNaN(p) && p >= 1 && p <= 10)
      } else if (phase) {
        // Single phase: phase=1
        const parsedPhase = parseInt(phase, 10)
        if (isNaN(parsedPhase) || parsedPhase < 1 || parsedPhase > 10) {
          return NextResponse.json({ error: 'Invalid phase value (must be 1-10)' }, { status: 400 })
        }
        phaseValues = [parsedPhase]
      }

      if (phaseValues.length === 0) {
        return NextResponse.json({ error: 'Invalid phases parameter' }, { status: 400 })
      }

      // Get all active tiers matching the phase(s)
      const { data: phaseTiers, error: phaseTiersError } = await supabase
        .from('raid_tiers')
        .select('id')
        .eq('expansion_id', expansionId)
        .in('phase', phaseValues)
        .eq('is_guild_active', true)

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
    // Armor/weapon proficiency is ALWAYS enforced — a Druid can never equip plate
    // regardless of officer assignments. Officer assignments only control bracket
    // visibility (which specs see the item), not physical equippability.
    const filteredItems = (items || []).filter(item => {
      // Check if this is a token - apply token class restrictions
      if (isTokenSlot(item.item_slot)) {
        if (className && !canClassUseToken(item.name, className)) {
          return false
        }
        return true
      }

      // Check class proficiencies (armor/weapon types the class can equip)
      // This is never bypassed — it represents physical equippability
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

        // Check weapon proficiency
        if (weaponType) {
          if (!canUseWeaponType(className, weaponType)) {
            return false
          }
        }

        // Skip armor proficiency checks for class-agnostic slots (Neck, Back, Trinket, etc.)
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

      // Officer spec assignments are checked later for bracket filtering,
      // not here — they don't override physical equippability
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

/**
 * PATCH /api/loot-items
 *
 * Update loot item properties. Uses service role to bypass RLS
 * after verifying officer permissions.
 *
 * Body: {
 *   guild_id: string,
 *   item_id: string,
 *   updates: {
 *     is_available?: boolean,
 *     is_loot_council?: boolean,
 *     classification?: string,
 *     allocation_cost?: number,
 *     officer_notes?: string | null,
 *     roles?: string[],
 *   }
 * }
 */
export async function PATCH(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { guild_id, item_id, updates } = body

    if (!guild_id || !item_id || !updates) {
      return NextResponse.json({ error: 'guild_id, item_id, and updates are required' }, { status: 400 })
    }

    const serviceSupabase = createServiceRoleClient()

    const { hasPermission, error: permError } = await verifyOfficerPermissions(serviceSupabase, user.id, guild_id)
    if (!hasPermission) {
      return NextResponse.json({ error: permError || 'Insufficient permissions' }, { status: 403 })
    }

    // Allowlist of updatable fields
    const allowedFields = ['is_available', 'is_loot_council', 'classification', 'allocation_cost', 'officer_notes', 'roles']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in updates) {
        sanitized[key] = updates[key]
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Verify the item belongs to this guild (via raid_tiers chain)
    const { data: item } = await serviceSupabase
      .from('loot_items')
      .select('id, raid_tier_id, raid_tiers!inner(guild_id)')
      .eq('id', item_id)
      .single()

    if (!item || (item as any).raid_tiers?.guild_id !== guild_id) {
      return NextResponse.json({ error: 'Item not found in this guild' }, { status: 404 })
    }

    const { data, error } = await serviceSupabase
      .from('loot_items')
      .update(sanitized)
      .eq('id', item_id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    logAudit({
      supabase: serviceSupabase,
      guildId: guild_id,
      tableName: 'loot_items',
      recordId: item_id,
      action: 'UPDATE',
      userId: user.id,
      newData: sanitized,
    })

    return NextResponse.json({ success: true, item: data?.[0] })
  } catch (error) {
    console.error('Error in PATCH /api/loot-items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
