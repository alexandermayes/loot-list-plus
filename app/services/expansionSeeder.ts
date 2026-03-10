import { SupabaseClient } from '@supabase/supabase-js'
import { classicRaids, Raid as ClassicRaid } from '@/data/classic-wow-raids'
import { tbcRaids } from '@/data/tbc-raids'
import { wrathRaids } from '@/data/wrath-raids'
import { cataRaids } from '@/data/cata-raids'
import { mopRaids } from '@/data/mop-raids'
import { ITEM_CLASSIFICATIONS } from '@/data/classic-wow-item-classifications'
import { TBC_ITEM_CLASSIFICATIONS } from '@/data/tbc-item-classifications'
import { WOTLK_ITEM_CLASSIFICATIONS } from '@/data/wrath-item-classifications'
import { CATA_ITEM_CLASSIFICATIONS } from '@/data/cata-item-classifications'
import { MOP_ITEM_CLASSIFICATIONS } from '@/data/mop-item-classifications'
import { CLASSIC_ITEM_ROLES } from '@/data/classic-item-roles'
import { TBC_ITEM_ROLES } from '@/data/tbc-item-roles'
import { WOTLK_ITEM_ROLES } from '@/data/wrath-item-roles'
import { CATA_ITEM_ROLES } from '@/data/cata-item-roles'
import { MOP_ITEM_ROLES } from '@/data/mop-item-roles'
import { EXPANSION_PHASES, getExpansionSlug } from '@/data/expansion-phases'
import { getTokenClasses, isTokenSlot } from '@/data/token-class-mapping'

/**
 * Expansion Seeding Service
 *
 * This service handles the automatic creation of expansions, raid tiers, and loot items
 * when a guild selects an expansion. It transforms the static raid data from /data files
 * into database records.
 */

export interface ExpansionDefinition {
  name: string
  displayName: string
  raids: RaidDefinition[]
}

export interface RaidDefinition {
  name: string
  isActive: boolean
  phase: number | null
  bosses: BossDefinition[]
}

export interface BossDefinition {
  name: string
  lootItems: LootItemDefinition[]
}

export interface LootItemDefinition {
  name: string
  slot: string
  wowheadId: string
}

/**
 * Get the phase number for a raid based on expansion phases mapping
 */
function getRaidPhase(expansionSlug: string, raidName: string): number | null {
  const phases = EXPANSION_PHASES[expansionSlug]
  if (!phases) return null

  for (const phase of phases) {
    if (phase.raids.includes(raidName)) {
      return phase.phase
    }
  }
  return null
}

/**
 * Transform Classic WoW raid data into the format expected by the seeder
 */
function transformClassicRaids(): RaidDefinition[] {
  return classicRaids.map((raid, index) => ({
    name: raid.name,
    // Mark the first raid (Molten Core) as active by default
    isActive: index === 0,
    phase: getRaidPhase('classic', raid.name),
    bosses: raid.bosses.map(boss => ({
      name: boss.name,
      lootItems: boss.items.map(item => ({
        name: item.name,
        slot: item.slot,
        wowheadId: item.wowhead_id.toString()
      }))
    }))
  }))
}

/**
 * Transform TBC raid data into the format expected by the seeder
 */
function transformTBCRaids(): RaidDefinition[] {
  return tbcRaids.map((raid, index) => ({
    name: raid.name,
    // Mark the first raid (Karazhan) as active by default
    isActive: index === 0,
    phase: getRaidPhase('tbc', raid.name),
    bosses: raid.bosses.map(boss => ({
      name: boss.name,
      lootItems: boss.items.map(item => ({
        name: item.name,
        slot: item.slot,
        wowheadId: item.wowhead_id.toString()
      }))
    }))
  }))
}

/**
 * Transform WotLK raid data into the format expected by the seeder
 */
function transformWrathRaids(): RaidDefinition[] {
  return wrathRaids.map((raid, index) => ({
    name: raid.name,
    // Mark the first raid (Naxxramas) as active by default
    isActive: index === 0,
    phase: getRaidPhase('wrath', raid.name),
    bosses: raid.bosses.map(boss => ({
      name: boss.name,
      lootItems: boss.items.map(item => ({
        name: item.name,
        slot: item.slot,
        wowheadId: item.wowhead_id.toString()
      }))
    }))
  }))
}

/**
 * Transform Cataclysm raid data into the format expected by the seeder
 */
function transformCataRaids(): RaidDefinition[] {
  return cataRaids.map((raid, index) => ({
    name: raid.name,
    isActive: index === 0,
    phase: getRaidPhase('cata', raid.name),
    bosses: raid.bosses.map(boss => ({
      name: boss.name,
      lootItems: boss.items.map(item => ({
        name: item.name,
        slot: item.slot,
        wowheadId: item.wowhead_id.toString()
      }))
    }))
  }))
}

/**
 * Transform MoP raid data into the format expected by the seeder
 */
function transformMoPRaids(): RaidDefinition[] {
  return mopRaids.map((raid, index) => ({
    name: raid.name,
    isActive: index === 0,
    phase: getRaidPhase('mop', raid.name),
    bosses: raid.bosses.map(boss => ({
      name: boss.name,
      lootItems: boss.items.map(item => ({
        name: item.name,
        slot: item.slot,
        wowheadId: item.wowhead_id.toString()
      }))
    }))
  }))
}

// Classic WoW expansion data
const CLASSIC_WOW_DATA: ExpansionDefinition = {
  name: 'Classic',
  displayName: 'Classic',
  raids: transformClassicRaids()
}

// TBC expansion data
const TBC_DATA: ExpansionDefinition = {
  name: 'The Burning Crusade',
  displayName: 'The Burning Crusade',
  raids: transformTBCRaids()
}

// WotLK expansion data
const WOTLK_DATA: ExpansionDefinition = {
  name: 'Wrath of the Lich King',
  displayName: 'Wrath of the Lich King',
  raids: transformWrathRaids()
}

// Cataclysm expansion data
const CATA_DATA: ExpansionDefinition = {
  name: 'Cataclysm',
  displayName: 'Cataclysm',
  raids: transformCataRaids()
}

// Mists of Pandaria expansion data
const MOP_DATA: ExpansionDefinition = {
  name: 'Mists of Pandaria',
  displayName: 'Mists of Pandaria',
  raids: transformMoPRaids()
}

// Map of all available expansions
// Expansions with null have no loot data yet (shown as "coming soon" in UI)
const EXPANSION_DATA: Record<string, ExpansionDefinition | null> = {
  'Classic': CLASSIC_WOW_DATA,
  'The Burning Crusade': TBC_DATA,
  'Wrath of the Lich King': WOTLK_DATA,
  'Cataclysm': CATA_DATA,
  'Mists of Pandaria': MOP_DATA,
  'Warlords of Draenor': null,
  'Legion': null,
  'Battle for Azeroth': null,
  'Shadowlands': null,
  'Dragonflight': null,
  'The War Within': null,
}

/**
 * Check if a guild already has a specific expansion
 *
 * @param supabase - Supabase client
 * @param guildId - The guild ID to check
 * @param expansionName - The expansion name (e.g., "Classic WoW", "The Burning Crusade")
 * @returns True if guild has this expansion, false otherwise
 */
export async function guildHasExpansion(
  supabase: SupabaseClient,
  guildId: string,
  expansionName: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('expansions')
    .select('id')
    .eq('guild_id', guildId)
    .eq('name', expansionName)
    .single()

  return !error && !!data
}

/**
 * Get all expansions a guild has added
 *
 * @param supabase - Supabase client
 * @param guildId - The guild ID
 * @returns Array of expansion names the guild has
 */
export async function getGuildExpansions(
  supabase: SupabaseClient,
  guildId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('expansions')
    .select('name')
    .eq('guild_id', guildId)

  if (error || !data) {
    return []
  }

  return data.map(exp => exp.name)
}

/**
 * Seed an expansion with all raid tiers and loot items for a guild
 *
 * @param supabase - Supabase client (can be service role or regular)
 * @param guildId - The guild to seed the expansion for
 * @param expansionName - The expansion to seed (e.g., "Classic", "The Burning Crusade")
 * @param setAsCurrent - Whether to set this expansion as the guild's current expansion (default: true)
 * @param useServiceRole - Whether to use direct inserts (for service role client) instead of RPC
 * @returns The created expansion ID or an error message
 */
export async function seedExpansionForGuild(
  supabase: SupabaseClient,
  guildId: string,
  expansionName: string,
  setAsCurrent: boolean = true,
  useServiceRole: boolean = false
): Promise<{ expansionId: string; error?: string }> {
  const expansionData = EXPANSION_DATA[expansionName]

  // Check if expansion data is available
  if (!expansionData) {
    return {
      expansionId: '',
      error: `No data available for ${expansionName} yet. Currently supported: Classic, The Burning Crusade, Wrath of the Lich King, Cataclysm, and Mists of Pandaria. Please select one of these or wait for other expansion data to be added.`
    }
  }

  try {
    // Check if guild already has this expansion
    const alreadyHas = await guildHasExpansion(supabase, guildId, expansionData.displayName)
    if (alreadyHas) {
      return {
        expansionId: '',
        error: `Guild already has ${expansionData.displayName}. Each expansion can only be added once per guild.`
      }
    }

    // 1. Create the expansion record
    let expansion: { id: string }

    if (useServiceRole) {
      // Direct insert when using service role (bypasses RLS entirely)
      const { data: expData, error: expError } = await supabase
        .from('expansions')
        .insert({
          guild_id: guildId,
          name: expansionData.displayName,
          current_phase: 1
        })
        .select()
        .single()

      if (expError) {
        console.error('[SEEDER] Error creating expansion:', expError)
        return { expansionId: '', error: 'Failed to create expansion' }
      }

      expansion = { id: expData.id }
    } else {
      // Use RPC when using regular client (bypasses RLS with auth checks)
      const { data: expansionId, error: expError } = await supabase
        .rpc('create_expansion_for_guild', {
          p_guild_id: guildId,
          p_name: expansionData.displayName
        })

      if (expError) {
        console.error('Error creating expansion:', expError)
        return { expansionId: '', error: 'Failed to create expansion' }
      }

      expansion = { id: expansionId }
    }

    // 2. Set as current expansion if requested
    if (setAsCurrent) {
      const { error: updateError } = await supabase
        .from('guilds')
        .update({ active_expansion_id: expansion.id })
        .eq('id', guildId)

      if (updateError) {
        console.error('Error setting active expansion:', updateError)
        // Don't fail the whole operation, just log the error
      }
    }

    // 3. Create raid tiers with their loot items
    // Lazy-loaded class name -> id mapping for token class seeding
    const classNameToId: Record<string, string> = {}

    for (const raid of expansionData.raids) {

      // Create the raid tier
      // Note: is_active is kept for backward compatibility, but master_sheet_visible controls visibility
      // All raid tiers start with master_sheet_visible = true (officers can hide if needed)
      // Only enable tiers in Phase 1 by default (guild starts at Phase 1)
      const isInInitialPhase = raid.phase !== null && raid.phase <= 1

      const { data: tier, error: tierError } = await supabase
        .from('raid_tiers')
        .insert({
          expansion_id: expansion.id,
          name: raid.name,
          is_active: raid.isActive, // Keep for backward compatibility
          is_guild_active: isInInitialPhase, // Only current phase tiers enabled
          master_sheet_visible: isInInitialPhase, // Only current phase tiers visible
          phase: raid.phase // Phase number for grouping raids by content phase
        })
        .select()
        .single()

      if (tierError) {
        console.error(`[SEEDER] Error creating raid tier ${raid.name}:`, tierError)
        continue // Skip this raid but continue with others
      }

      // 4. Prepare all loot items for this raid tier
      const lootItems = raid.bosses.flatMap(boss =>
        boss.lootItems.map(item => {
          // Look up classification from the appropriate mapping based on expansion
          let classificationMap: Record<string, 'Reserved' | 'Limited' | 'Unlimited'>
          if (expansionData.displayName === 'Mists of Pandaria') {
            classificationMap = MOP_ITEM_CLASSIFICATIONS
          } else if (expansionData.displayName === 'Cataclysm') {
            classificationMap = CATA_ITEM_CLASSIFICATIONS
          } else if (expansionData.displayName === 'Wrath of the Lich King') {
            classificationMap = WOTLK_ITEM_CLASSIFICATIONS
          } else if (expansionData.displayName === 'The Burning Crusade') {
            classificationMap = TBC_ITEM_CLASSIFICATIONS
          } else {
            classificationMap = ITEM_CLASSIFICATIONS
          }
          const classification = classificationMap[item.name] || 'Unlimited'
          // Reserved and Limited items cost 1 allocation point, Unlimited costs 0
          const allocation_cost = (classification === 'Reserved' || classification === 'Limited') ? 1 : 0

          // Look up roles from the appropriate mapping based on expansion
          // Items without explicit mapping default to empty array (available to all specs)
          let roleMap: Record<string, ('tank' | 'healer' | 'physical' | 'caster')[]>
          if (expansionData.displayName === 'Mists of Pandaria') {
            roleMap = MOP_ITEM_ROLES
          } else if (expansionData.displayName === 'Cataclysm') {
            roleMap = CATA_ITEM_ROLES
          } else if (expansionData.displayName === 'Wrath of the Lich King') {
            roleMap = WOTLK_ITEM_ROLES
          } else if (expansionData.displayName === 'The Burning Crusade') {
            roleMap = TBC_ITEM_ROLES
          } else {
            roleMap = CLASSIC_ITEM_ROLES
          }
          const roles = roleMap[item.name] || []

          return {
            raid_tier_id: tier.id,
            name: item.name,
            item_slot: item.slot,
            wowhead_id: item.wowheadId,
            boss_name: boss.name,
            is_available: true,
            classification,
            allocation_cost,
            roles
          }
        })
      )

      // 5. Bulk insert all loot items for this raid tier
      if (lootItems.length > 0) {
        const { data: insertedItems, error: lootError } = await supabase
          .from('loot_items')
          .insert(lootItems)
          .select('id, name, item_slot')

        if (lootError) {
          console.error(`[SEEDER] Error inserting loot items for ${raid.name}:`, lootError)
          // Continue even if loot items fail - the raid tier structure is still created
        }

        // 6. Seed loot_item_classes for tokens (class restrictions for bracket placement)
        if (insertedItems) {
          const tokenItems = insertedItems.filter(item => isTokenSlot(item.item_slot))

          if (tokenItems.length > 0) {
            // Fetch wow_classes for name -> id mapping (lazy-load once)
            if (Object.keys(classNameToId).length === 0) {
              const { data: wowClasses } = await supabase
                .from('wow_classes')
                .select('id, name')
              if (wowClasses) {
                wowClasses.forEach(c => { classNameToId[c.name] = c.id })
              }
            }

            const tokenClassEntries: Array<{
              loot_item_id: string
              class_id: string
              spec_id: null
              spec_type: 'primary'
            }> = []

            for (const token of tokenItems) {
              const allowedClasses = getTokenClasses(token.name)
              if (!allowedClasses) continue

              for (const className of allowedClasses) {
                const classId = classNameToId[className]
                if (classId) {
                  tokenClassEntries.push({
                    loot_item_id: token.id,
                    class_id: classId,
                    spec_id: null,
                    spec_type: 'primary'
                  })
                }
              }
            }

            if (tokenClassEntries.length > 0) {
              const { error: tokenClassError } = await supabase
                .from('loot_item_classes')
                .insert(tokenClassEntries)

              if (tokenClassError) {
                console.error(`[SEEDER] Error inserting token class mappings for ${raid.name}:`, tokenClassError)
              }
            }
          }
        }
      }
    }

    return { expansionId: expansion.id }
  } catch (error: any) {
    console.error('Unexpected error in seedExpansionForGuild:', error)
    return {
      expansionId: '',
      error: 'Something went wrong while setting up the expansion'
    }
  }
}

/**
 * Get list of all available expansions with their data availability status
 */
export function getAvailableExpansions(): Array<{
  name: string
  hasData: boolean
}> {
  return Object.entries(EXPANSION_DATA).map(([name, data]) => ({
    name,
    hasData: data !== null
  }))
}
