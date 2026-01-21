import { SupabaseClient } from '@supabase/supabase-js'
import { classicRaids, Raid as ClassicRaid } from '@/data/classic-wow-raids'
import { tbcRaids } from '@/data/tbc-raids'
import { ITEM_CLASSIFICATIONS } from '@/data/classic-wow-item-classifications'
import { TBC_ITEM_CLASSIFICATIONS } from '@/data/tbc-item-classifications'

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
 * Transform Classic WoW raid data into the format expected by the seeder
 */
function transformClassicRaids(): RaidDefinition[] {
  return classicRaids.map((raid, index) => ({
    name: raid.name,
    // Mark the first raid (Molten Core) as active by default
    isActive: index === 0,
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
  displayName: 'Classic WoW',
  raids: transformClassicRaids()
}

// TBC expansion data
const TBC_DATA: ExpansionDefinition = {
  name: 'The Burning Crusade',
  displayName: 'The Burning Crusade',
  raids: transformTBCRaids()
}

// Map of all available expansions
// Future expansions can be added here as data files are created
const EXPANSION_DATA: Record<string, ExpansionDefinition | null> = {
  'Classic': CLASSIC_WOW_DATA,
  'The Burning Crusade': TBC_DATA,
  'Wrath of the Lich King': null, // TODO: Create /data/wrath-raids.ts
  'Cataclysm': null, // TODO: Create /data/cata-raids.ts
  'Mists of Pandaria': null // TODO: Create /data/mop-raids.ts
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
      error: `No data available for ${expansionName} yet. Currently supported: Classic WoW and The Burning Crusade. Please select one of these or wait for other expansion data to be added.`
    }
  }

  try {
    console.log(`[SEEDER] Starting seeding for ${expansionName}`)
    console.log(`[SEEDER] Guild ID: ${guildId}`)
    console.log(`[SEEDER] Expansion data found:`, !!expansionData)
    console.log(`[SEEDER] Number of raids:`, expansionData.raids.length)

    // Check if guild already has this expansion
    const alreadyHas = await guildHasExpansion(supabase, guildId, expansionData.displayName)
    if (alreadyHas) {
      console.log(`[SEEDER] Guild already has ${expansionData.displayName}`)
      return {
        expansionId: '',
        error: `Guild already has ${expansionData.displayName}. Each expansion can only be added once per guild.`
      }
    }

    // 1. Create the expansion record
    console.log(`[SEEDER] Creating expansion record...`)
    let expansion: { id: string }

    if (useServiceRole) {
      // Direct insert when using service role (bypasses RLS entirely)
      const { data: expData, error: expError } = await supabase
        .from('expansions')
        .insert({
          guild_id: guildId,
          name: expansionData.displayName
        })
        .select()
        .single()

      if (expError) {
        console.error('[SEEDER] Error creating expansion:', expError)
        return { expansionId: '', error: `Failed to create expansion: ${expError.message}` }
      }

      console.log(`[SEEDER] Expansion created with ID: ${expData.id}`)
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
        return { expansionId: '', error: `Failed to create expansion: ${expError.message}` }
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
    console.log(`[SEEDER] Creating ${expansionData.raids.length} raid tiers...`)
    for (const raid of expansionData.raids) {
      console.log(`[SEEDER] Creating raid tier: ${raid.name} with ${raid.bosses.length} bosses`)

      // Create the raid tier
      // Note: is_active is kept for backward compatibility, but master_sheet_visible controls visibility
      // All raid tiers start with master_sheet_visible = true (officers can hide if needed)
      const { data: tier, error: tierError } = await supabase
        .from('raid_tiers')
        .insert({
          expansion_id: expansion.id,
          name: raid.name,
          is_active: raid.isActive, // Keep for backward compatibility
          master_sheet_visible: true // All tiers visible by default
        })
        .select()
        .single()

      if (tierError) {
        console.error(`[SEEDER] Error creating raid tier ${raid.name}:`, tierError)
        continue // Skip this raid but continue with others
      }

      console.log(`[SEEDER] Raid tier ${raid.name} created with ID: ${tier.id}`)

      // 4. Prepare all loot items for this raid tier
      const lootItems = raid.bosses.flatMap(boss =>
        boss.lootItems.map(item => {
          // Look up classification from the appropriate mapping based on expansion
          const classificationMap = expansionData.displayName === 'The Burning Crusade'
            ? TBC_ITEM_CLASSIFICATIONS
            : ITEM_CLASSIFICATIONS
          const classification = classificationMap[item.name] || 'Unlimited'
          // Reserved and Limited items cost 1 allocation point, Unlimited costs 0
          const allocation_cost = (classification === 'Reserved' || classification === 'Limited') ? 1 : 0

          return {
            raid_tier_id: tier.id,
            name: item.name,
            item_slot: item.slot,
            wowhead_id: item.wowheadId,
            boss_name: boss.name,
            is_available: true,
            classification,
            allocation_cost
          }
        })
      )

      // 5. Bulk insert all loot items for this raid tier
      if (lootItems.length > 0) {
        console.log(`[SEEDER] Inserting ${lootItems.length} loot items for ${raid.name}`)
        const { error: lootError } = await supabase
          .from('loot_items')
          .insert(lootItems)

        if (lootError) {
          console.error(`[SEEDER] Error inserting loot items for ${raid.name}:`, lootError)
          // Continue even if loot items fail - the raid tier structure is still created
        } else {
          console.log(`[SEEDER] Successfully inserted ${lootItems.length} items for ${raid.name}`)
        }
      }
    }

    console.log(`[SEEDER] Seeding complete for ${expansionName}. Expansion ID: ${expansion.id}`)
    return { expansionId: expansion.id }
  } catch (error: any) {
    console.error('Unexpected error in seedExpansionForGuild:', error)
    return {
      expansionId: '',
      error: `Unexpected error: ${error.message || 'Unknown error occurred'}`
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
