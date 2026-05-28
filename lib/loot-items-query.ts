/**
 * Shared loot-items fetching + filtering logic.
 *
 * Extracted from `/api/loot-items/route.ts` so that both the original
 * endpoint and the new `/api/loot-list/bootstrap` endpoint can reuse it
 * without duplicating the ~200 lines of class proficiency, spec, and
 * bracket-assignment logic.
 *
 * This function is pure w.r.t. the supabase client passed in — it does
 * no auth. Callers are responsible for verifying that the requesting
 * user owns the character before calling.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
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
import { paginatedSelect } from '@/utils/supabase/paginate'

export interface LootItemClassRestriction {
  class_id: string
  spec_id: string | null
  spec_type: string | null
  class_name?: string | null
  class_color?: string | null
  spec_name?: string | null
}

export interface LootItemCharacter {
  id: string
  class_id: string | null
  spec_id: string | null
  class_name: string | null
}

/**
 * Fetch the character record used for loot-items filtering, including
 * the WoW class name for proficiency checks. Returns null if the
 * character doesn't exist — callers decide how to handle that.
 */
export async function fetchLootItemsCharacter(
  supabase: SupabaseClient,
  characterId: string
): Promise<LootItemCharacter | null> {
  const { data: character, error } = await supabase
    .from('characters')
    .select('id, class_id, spec_id, user_id, wow_classes(name)')
    .eq('id', characterId)
    .single()

  if (error || !character) return null

  const wowClass = character.wow_classes as { name: string } | { name: string }[] | null
  const className = Array.isArray(wowClass) ? wowClass[0]?.name : wowClass?.name

  return {
    id: character.id,
    class_id: character.class_id,
    spec_id: character.spec_id,
    class_name: className ?? null,
  }
}

/**
 * Resolve a list of raid tier IDs from a phase + expansion query.
 * Returns `null` if the phases are invalid (out of range etc.).
 */
export async function resolveTierIdsForPhases(
  supabase: SupabaseClient,
  expansionId: string,
  phases: number[]
): Promise<string[] | null> {
  const valid = phases.filter((p) => Number.isFinite(p) && p >= 1 && p <= 10)
  if (valid.length === 0) return null

  const { data: phaseTiers, error } = await supabase
    .from('raid_tiers')
    .select('id')
    .eq('expansion_id', expansionId)
    .in('phase', valid)
    .eq('is_guild_active', true)

  if (error || !phaseTiers) return []
  return phaseTiers.map((t: { id: string }) => t.id)
}

/**
 * Fetch and filter loot items for a set of raid tier IDs, applying
 * class/weapon/armor proficiency rules and enriching the class
 * restrictions with display metadata.
 *
 * Returns the same shape `/api/loot-items` GET returns on success.
 */
export async function fetchFilteredLootItems(
  supabase: SupabaseClient,
  character: LootItemCharacter,
  tierIds: string[]
): Promise<unknown[]> {
  if (tierIds.length === 0) return []

  // Paginate past the PostgREST 1000-row cap. Multi-tier phase queries on
  // populated expansions (MoP has 1700+ items per guild) overflow silently
  // otherwise — items beyond row 1000 by id ascend drop from the picker.
  // GH #65: the May 25 backfill that added MoP trash items had higher ids
  // than the original seed, so trash + Garrosh essences disappeared exactly
  // for the long-tail of populated guilds the backfill targeted.
  type LootItemRow = {
    id: string
    name: string
    boss_name: string
    item_slot: string
    wowhead_id: number
    classification: string | null
    item_type: string | null
    allocation_cost: number
    is_available: boolean
    is_loot_council: boolean
    roles: string[] | null
    armor_type: string | null
    weapon_type: string | null
    primary_stat: string | null
    raid_tier_id: string
    loot_item_classes: LootItemClassRestriction[] | null
    raid_tiers: { name: string } | { name: string }[] | null
  }
  const items = await paginatedSelect<LootItemRow>(
    (start, end) =>
      supabase
        .from('loot_items')
        .select(`
          id, name, boss_name, item_slot, wowhead_id,
          classification, item_type, allocation_cost, is_available, is_loot_council, roles,
          armor_type, weapon_type, primary_stat, raid_tier_id,
          loot_item_classes(class_id, spec_id, spec_type),
          raid_tiers(name)
        `)
        .in('raid_tier_id', tierIds)
        .eq('is_available', true)
        .order('id', { ascending: true })
        .range(start, end),
  )

  if (items.length === 0) return []

  // Fetch class/spec reference data once per request for enrichment.
  const [{ data: allClasses }, { data: allSpecs }] = await Promise.all([
    supabase.from('wow_classes').select('id, name, color_hex'),
    supabase.from('class_specs').select('id, name, class_id'),
  ])

  const classMap = new Map(
    (allClasses || []).map((c: { id: string; name: string; color_hex: string }) => [c.id, c])
  )
  const specMap = new Map(
    (allSpecs || []).map((s: { id: string; name: string; class_id: string }) => [s.id, s])
  )

  const className = character.class_name as WowClassName | null

  // Armor/weapon proficiency is ALWAYS enforced — a Druid can never equip
  // plate regardless of officer assignments. Officer assignments only
  // control bracket visibility, not physical equippability.
  const filtered = items.filter((item: any) => {
    // Tokens have their own class eligibility rules.
    if (isTokenSlot(item.item_slot)) {
      if (className && !canClassUseToken(item.name, className)) return false
      return true
    }

    if (className && CLASS_PROFICIENCIES[className]) {
      let armorType = item.armor_type as ArmorType | null
      let weaponType = item.weapon_type as WeaponType | null

      if (!armorType && !weaponType) {
        const typeInfo = getItemTypeInfo(item.wowhead_id)
        if (typeInfo) {
          armorType = typeInfo.armor_type || null
          weaponType = typeInfo.weapon_type || null
        }
      }

      if (!armorType && !weaponType) {
        armorType = inferArmorType(item.item_slot, item.name) || null
        weaponType = inferWeaponType(item.item_slot, item.name) || null
      }

      if (weaponType && !canUseWeaponType(className, weaponType)) return false

      // Class-agnostic slots (Neck, Back, Trinket, etc.) skip armor checks.
      if (isClassAgnosticSlot(item.item_slot)) return true

      if (armorType && !canWearArmorType(className, armorType)) return false
    }

    return true
  })

  // Attach bracket-filtering helper fields.
  const withBracketFields = filtered.map((item: any) => {
    const classes = item.loot_item_classes as LootItemClassRestriction[] | null
    const isAllocated = !!(classes && classes.length > 0)

    let hasPrimaryOnly = false
    if (isAllocated && classes) {
      const hasPrimary = classes.some((c) => c.spec_type === 'primary')
      const hasSecondary = classes.some((c) => c.spec_type === 'secondary')
      hasPrimaryOnly = hasPrimary && !hasSecondary
    }

    let characterSpecType: 'primary' | 'secondary' | null = null
    if (character.spec_id && isAllocated && classes) {
      const specSpecificEntry = classes.find((c) => c.spec_id === character.spec_id)
      if (specSpecificEntry?.spec_type) {
        characterSpecType = specSpecificEntry.spec_type as 'primary' | 'secondary'
      } else {
        const classLevelEntry = classes.find(
          (c) => c.class_id === character.class_id && c.spec_id === null
        )
        if (classLevelEntry?.spec_type) {
          characterSpecType = classLevelEntry.spec_type as 'primary' | 'secondary'
        }
      }
    }

    return {
      ...item,
      character_spec_type: characterSpecType,
      is_allocated: isAllocated,
      has_primary_only: hasPrimaryOnly,
    }
  })

  // Final shape: enrich class restrictions with display metadata.
  const enriched = withBracketFields.map((item: any) => {
    const raidTier = item.raid_tiers as { name: string } | { name: string }[] | null
    const raidTierName = Array.isArray(raidTier) ? raidTier[0]?.name : raidTier?.name
    const classes = (item.loot_item_classes as LootItemClassRestriction[]) || []
    return {
      ...item,
      loot_item_classes: classes.map((lic) => ({
        ...lic,
        class_name: (classMap.get(lic.class_id) as { name: string } | undefined)?.name || null,
        class_color: (classMap.get(lic.class_id) as { color_hex: string } | undefined)?.color_hex || null,
        spec_name: lic.spec_id
          ? (specMap.get(lic.spec_id) as { name: string } | undefined)?.name || null
          : null,
      })),
      raid_tier_name: raidTierName || null,
    }
  })

  return enriched
}
