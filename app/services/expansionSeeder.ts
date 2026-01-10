import { SupabaseClient } from '@supabase/supabase-js'
import { classicRaids, Raid as ClassicRaid } from '@/data/classic-wow-raids'

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

// Classic WoW expansion data
const CLASSIC_WOW_DATA: ExpansionDefinition = {
  name: 'Classic',
  displayName: 'Classic WoW',
  raids: transformClassicRaids()
}

// Map of all available expansions
// Future expansions can be added here as data files are created
const EXPANSION_DATA: Record<string, ExpansionDefinition | null> = {
  'Classic': CLASSIC_WOW_DATA,
  'The Burning Crusade': null, // TODO: Create /data/tbc-raids.ts
  'Wrath of the Lich King': null, // TODO: Create /data/wrath-raids.ts
  'Cataclysm': null, // TODO: Create /data/cata-raids.ts
  'Mists of Pandaria': null // TODO: Create /data/mop-raids.ts
}

/**
 * Seed an expansion with all raid tiers and loot items for a guild
 *
 * @param supabase - Supabase client with service role privileges
 * @param guildId - The guild to seed the expansion for
 * @param expansionName - The expansion to seed (e.g., "Classic", "The Burning Crusade")
 * @returns The created expansion ID or an error message
 */
export async function seedExpansionForGuild(
  supabase: SupabaseClient,
  guildId: string,
  expansionName: string
): Promise<{ expansionId: string; error?: string }> {
  const expansionData = EXPANSION_DATA[expansionName]

  // Check if expansion data is available
  if (!expansionData) {
    return {
      expansionId: '',
      error: `No data available for ${expansionName} yet. Only Classic is currently supported. Please select Classic or wait for other expansion data to be added.`
    }
  }

  try {
    // 1. Create the expansion record
    const { data: expansion, error: expError } = await supabase
      .from('expansions')
      .insert({
        guild_id: guildId,
        name: expansionData.displayName
      })
      .select()
      .single()

    if (expError) {
      console.error('Error creating expansion:', expError)
      return { expansionId: '', error: `Failed to create expansion: ${expError.message}` }
    }

    // 2. Create raid tiers with their loot items
    for (const raid of expansionData.raids) {
      // Create the raid tier
      const { data: tier, error: tierError } = await supabase
        .from('raid_tiers')
        .insert({
          expansion_id: expansion.id,
          name: raid.name,
          is_active: raid.isActive
        })
        .select()
        .single()

      if (tierError) {
        console.error(`Error creating raid tier ${raid.name}:`, tierError)
        continue // Skip this raid but continue with others
      }

      // 3. Prepare all loot items for this raid tier
      const lootItems = raid.bosses.flatMap(boss =>
        boss.lootItems.map(item => ({
          raid_tier_id: tier.id,
          name: item.name,
          item_slot: item.slot,
          wowhead_id: item.wowheadId,
          boss_name: boss.name,
          is_available: true,
          classification: 'Reserved', // Default to Reserved for all items
          allocation_cost: 0 // Default cost
        }))
      )

      // 4. Bulk insert all loot items for this raid tier
      if (lootItems.length > 0) {
        const { error: lootError } = await supabase
          .from('loot_items')
          .insert(lootItems)

        if (lootError) {
          console.error(`Error inserting loot items for ${raid.name}:`, lootError)
          // Continue even if loot items fail - the raid tier structure is still created
        }
      }
    }

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
