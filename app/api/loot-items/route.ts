import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
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
      // Phase-based query - get all active tiers in this phase
      // Note: is_guild_active can be null (treated as true/enabled by default) or explicitly true/false
      const { data: phaseTiers, error: phaseTiersError } = await supabase
        .from('raid_tiers')
        .select('id')
        .eq('expansion_id', expansionId)
        .eq('phase', parseInt(phase))
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

    // Filter items based on character's class/spec AND class proficiencies
    const filteredItems = (items || []).filter(item => {
      const classes = item.loot_item_classes as LootItemClassRestriction[]

      // First, check guild prio restrictions
      let passesClassRestriction = true
      if (classes.length > 0) {
        // If character has no spec set, show all items for their class
        if (!character.spec_id) {
          passesClassRestriction = classes.some(c => c.class_id === character.class_id)
        } else {
          // Check if character's specific spec is in primary or secondary list
          passesClassRestriction = classes.some(c => c.spec_id === character.spec_id)
        }
      }

      if (!passesClassRestriction) return false

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
        // Skip proficiency checks for class-agnostic slots (Neck, Back, Trinket, etc.)
        if (isClassAgnosticSlot(item.item_slot)) {
          return true
        }

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

        // Check armor proficiency
        if (armorType) {
          if (!canWearArmorType(className, armorType)) {
            return false
          }
        }

        // Check weapon proficiency
        if (weaponType) {
          if (!canUseWeaponType(className, weaponType)) {
            return false
          }
        }
      }

      return true
    })

    // If guildId provided, fetch consensus counts (how many OTHER guildmates ranked each item)
    let consensusCounts: Record<string, number> = {}

    if (guildId && filteredItems.length > 0) {
      const itemIds = filteredItems.map(item => item.id)

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

    // Merge consensus counts and raid tier name into response
    const itemsWithConsensus = filteredItems.map(item => {
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
