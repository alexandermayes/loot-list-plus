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
 *
 * Three physical-equippability rules are enforced for every character,
 * independent of officer assignments: token class lists
 * (data/token-class-mapping.ts), per-item class locks
 * (domain/loot/class-restrictions.ts, GH #276) and armor and weapon
 * proficiency (data/class-proficiencies.ts).
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
import { canClassUseItem } from '@/domain/loot/class-restrictions'
import { isNeedRow } from '@/domain/loot/item-identity'
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

export interface FetchFilteredLootItemsOptions {
  /**
   * Phase 4 passes true for tiers whose list_mode is 'discovery' so the picker
   * can offer need rows. Defaults to false: D-02 holds need rows out of the
   * raider's picker until then.
   */
  includeNeeds?: boolean
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
  tierIds: string[],
  options: FetchFilteredLootItemsOptions = {}
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
    wowhead_id: number | null
    kind?: string | null
    need_key?: string | null
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
  const includeNeeds = options.includeNeeds === true
  const items = await paginatedSelect<LootItemRow>(
    (start, end) => {
      let query = supabase
        .from('loot_items')
        .select(`
          id, name, boss_name, item_slot, wowhead_id, kind, need_key,
          classification, item_type, allocation_cost, is_available, is_loot_council, roles,
          armor_type, weapon_type, primary_stat, raid_tier_id,
          loot_item_classes(class_id, spec_id, spec_type),
          raid_tiers(name)
        `)
        .in('raid_tier_id', tierIds)
        .eq('is_available', true)
      // D-02 holds need rows out of the raider's picker until Phase 4 passes
      // includeNeeds for Discovery tiers.
      if (!includeNeeds) query = query.eq('kind', 'item')
      return query.order('id', { ascending: true }).range(start, end)
    },
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

  // Armor/weapon proficiency and per-item class locks are ALWAYS enforced:
  // a Druid can never equip plate and a Warrior can never wear Arcanist
  // cloth, regardless of officer assignments. Officer assignments only
  // control bracket visibility, not physical equippability.
  const filtered = items.filter((item: LootItemRow) => {
    // The token, class-lock and proficiency checks below key on wowhead_id,
    // which a need row does not have. Phase 4 decides need eligibility in the
    // picker, so a need row passes through here untouched.
    if (isNeedRow(item)) return true

    // Tokens have their own class eligibility rules.
    if (isTokenSlot(item.item_slot)) {
      if (className && !canClassUseToken(item.name, className)) return false
      return true
    }

    // regression for #276: class-locked drops (Classic set pieces, class
    // trinkets, class rings, Priest and Hunter quest items) pass the armor
    // rule below because canWearArmorType allows lighter armor, and some of
    // them sit in class-agnostic slots, so this check has to run before the
    // isClassAgnosticSlot early return. The rule comes from the
    // wow-classic-items 'Classes:' line via data/item-class-restrictions.ts;
    // an id outside the map is allowed.
    if (className && !canClassUseItem(item.wowhead_id, className)) return false

    if (className && CLASS_PROFICIENCIES[className]) {
      let armorType = item.armor_type as ArmorType | null
      let weaponType = item.weapon_type as WeaponType | null

      if (!armorType && !weaponType) {
        const typeInfo = item.wowhead_id == null ? undefined : getItemTypeInfo(item.wowhead_id)
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
  const withBracketFields = filtered.map((item: LootItemRow) => {
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
  const enriched = withBracketFields.map((item) => {
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
