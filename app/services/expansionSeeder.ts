import { SupabaseClient } from '@supabase/supabase-js'
import { getTokenClasses, isTokenSlot } from '@/data/token-class-mapping'
import { syncExpansionCatalog } from '@/app/services/expansionCatalogSync'
import { getExpansionDisplayName } from '@/utils/expansionVisuals'
import { getExpansionGame } from '@/domain/expansion/game'
import type { GameVersion } from '@/domain/expansion/game'
import { EXPANSION_REGISTRY, getExpansionMeta } from '@/data/expansions/registry'
import { getExpansionCatalog } from '@/data/expansions/catalogs'
import type { RaidDefinition, SeedMode } from '@/data/expansions/types'

export { getExpansionGame }
export type { GameVersion }
export type { RaidDefinition, BossDefinition, LootItemDefinition, SeedMode } from '@/data/expansions/types'

/**
 * Expansion Seeding Service
 *
 * This service handles the automatic creation of expansions, raid tiers, and loot items
 * when a guild selects an expansion. It resolves every expansion through the registry
 * (data/expansions/registry.ts) and its catalog adapter (data/expansions/catalogs.ts),
 * and writes the catalog into database records.
 */

export interface ExpansionDefinition {
  name: string
  displayName: string
  raids: RaidDefinition[]
  game: GameVersion
  seedMode: SeedMode
  slug: string
}

/**
 * Build every definition once, at module load, from the registry. A hasData
 * entry without a catalog or a game is a programming error, so it throws here
 * rather than seeding the wrong rows later.
 */
function buildExpansionDefinitions(): Record<string, ExpansionDefinition> {
  const definitions: Record<string, ExpansionDefinition> = {}
  for (const meta of Object.values(EXPANSION_REGISTRY)) {
    if (!meta.hasData) continue
    const catalog = getExpansionCatalog(meta.storedName)
    if (!catalog) {
      throw new Error(`Expansion registry entry "${meta.storedName}" has data but no catalog`)
    }
    if (!meta.game || !meta.seedMode) {
      throw new Error(`Expansion registry entry "${meta.storedName}" has data but no game or seed mode`)
    }
    definitions[meta.storedName] = {
      name: meta.storedName,
      displayName: meta.storedName,
      raids: catalog.raids,
      game: meta.game,
      seedMode: meta.seedMode,
      slug: meta.slug,
    }
  }
  return definitions
}

// Expansions without data yet (the retail "coming soon" rows) have no entry here.
const EXPANSION_DEFINITIONS = buildExpansionDefinitions()

/**
 * Look up an expansion definition by name. Resolves through the registry's
 * own-property guard, so prototype-pollution lookups ('constructor',
 * '__proto__', 'toString', ...) and non-string input return null, as do
 * expansions that have no data yet.
 */
export function getExpansionDefinition(name: unknown): ExpansionDefinition | null {
  const meta = getExpansionMeta(name)
  if (!meta || !meta.hasData) return null
  return EXPANSION_DEFINITIONS[meta.storedName] ?? null
}

/**
 * All expansion names the seeder can create data for, in registry order.
 * The API routes validate incoming expansion names against this list (via
 * isSupportedExpansion), so the registry is the single source of truth --
 * no route should hand-list its own expansion array.
 */
export const SUPPORTED_EXPANSIONS: readonly string[] = Object.values(EXPANSION_REGISTRY)
  .filter((meta) => meta.hasData)
  .map((meta) => meta.storedName)

/**
 * Type guard: true only for names that resolve to a registry entry with data.
 * Safe against prototype-pollution names and non-string input.
 */
export function isSupportedExpansion(name: unknown): name is string {
  return getExpansionDefinition(name) !== null
}

/**
 * Build the GV-C7 error message for an expansion that belongs to the other
 * game version -- the guild's game is fixed at creation (D-02), so the
 * expansion can be refused before any seeding, switching, or deleting.
 */
export function gameMismatchError(expansionName: string): string {
  return `${getExpansionDisplayName(expansionName)} isn't available for this guild's game version.`
}

// Human-readable "Currently supported" list for the unsupported-expansion
// error message, built from the registry so it always matches reality.
const SUPPORTED_EXPANSIONS_LABEL = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(
  SUPPORTED_EXPANSIONS.map((name) => getExpansionDisplayName(name))
)

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
  const expansionData = getExpansionDefinition(expansionName)

  // Check if expansion data is available
  if (!expansionData) {
    return {
      expansionId: '',
      error: `No data available for ${expansionName} yet. Currently supported: ${SUPPORTED_EXPANSIONS_LABEL}. Please select one of these or wait for other expansion data to be added.`
    }
  }

  try {
    // Check if guild already has this expansion
    const alreadyHas = await guildHasExpansion(supabase, guildId, expansionData.displayName)
    if (alreadyHas) {
      return {
        expansionId: '',
        error: `Guild already has ${getExpansionDisplayName(expansionData.displayName)}. Each expansion can only be added once per guild.`
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

    // 3a. Manifest-driven expansions seed their tiers through the sync service.
    // A throw lands in the catch below, which keeps the existing generic message.
    if (expansionData.seedMode === 'sync') {
      await syncExpansionCatalog(supabase, {
        expansionId: expansion.id,
        expansionName: expansionData.displayName
      })
      return { expansionId: expansion.id }
    }

    // 3. Create raid tiers with their loot items. Only a legacy catalog reaches
    // this loop; anything else throws into the catch below.
    const catalog = getExpansionCatalog(expansionData.displayName)
    if (!catalog || catalog.kind !== 'legacy') {
      throw new Error(`Expansion "${expansionData.displayName}" has no legacy catalog to insert`)
    }

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
          const classification = catalog.classify(item.name)
          // Reserved and Limited items cost 1 allocation point, Unlimited costs 0
          const allocation_cost = (classification === 'Reserved' || classification === 'Limited') ? 1 : 0

          // Items without an explicit role mapping default to an empty array (available to all specs)
          const roles = catalog.rolesFor(item.name)

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
  } catch (error: unknown) {
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
  return Object.values(EXPANSION_REGISTRY).map((meta) => ({
    name: meta.storedName,
    hasData: meta.hasData
  }))
}
