/**
 * Pure, typed builders for every loot_history insert in the award routes
 * (GH #294). Each builder is annotated to return
 * Database['public']['Tables']['loot_history']['Insert'], so removing a
 * required column (guild_id, loot_item_id, raid_tier_id) from a builder
 * fails `npx tsc --noEmit` instead of surfacing as a 500 at insert time.
 *
 * Only type-only imports are allowed in this module — no runtime imports at
 * all — because the PGlite schema-contract script (scratchpad-only, GH #294
 * D-06) imports this file directly through tsx, outside the Next.js `@/`
 * alias and build setup.
 */
import type { Database } from '@/lib/database.types'

/** The full loot_history insert shape, generated from the Supabase schema. */
export type LootHistoryInsert = Database['public']['Tables']['loot_history']['Insert']

/**
 * The subset of a guild-scoped loot_items lookup result every row builder
 * needs: the item's own id plus the two scope columns (raid_tier_id,
 * expansion_id) a service-role insert must set explicitly, since the
 * service-role client bypasses RLS and applies no default scoping.
 * `ResolvedGuildLootItem` (lib/loot/guild-scoped-lookup.ts) is structurally
 * assignable to this.
 */
export interface LootItemScope {
  id: string
  raid_tier_id: string
  expansion_id: string
}

export interface BuildAddonAwardRowInput {
  guildId: string
  item: LootItemScope
  characterId: string | null
  characterName: string
  awardedDate?: string | null
  awardedBy: string
  notes?: string | null
  bossName?: string | null
  today: string
}

/**
 * Builds the loot_history insert payload for POST /api/addon/loot-award
 * (GH #294 D-01). Carries raid_tier_id and expansion_id from the
 * guild-scoped lookup result, which the route previously omitted entirely —
 * raid_tier_id is NOT NULL with no default, so every addon award failed
 * with a 500 before this fix.
 */
export function buildAddonAwardRow(input: BuildAddonAwardRowInput): LootHistoryInsert {
  const { guildId, item, characterId, characterName, awardedDate, awardedBy, notes, bossName, today } = input
  return {
    guild_id: guildId,
    character_id: characterId,
    character_name: characterName,
    loot_item_id: item.id,
    raid_tier_id: item.raid_tier_id,
    expansion_id: item.expansion_id,
    awarded_date: awardedDate || today,
    awarded_by: awardedBy,
    source: 'addon',
    notes: notes || (bossName ? `Dropped from ${bossName}` : null),
  }
}

export interface BuildBulkAwardRowInput {
  guildId: string
  awardedBy: string
  item: LootItemScope
  raidEventId?: string | null
  awardedDate?: string | null
  characterId?: string | null
  characterName?: string | null
  notes: string | null
}

/**
 * Builds the loot_history insert payload for POST /api/loot-history/bulk
 * (GH #294 D-02). raid_tier_id and expansion_id come only from the
 * server-resolved item scope, never from the request body — the route used
 * to write the client's raw raid_tier_id and one expansion_id shared across
 * every row in the batch.
 *
 * awarded_date is included only when a non-empty string is given, and
 * character_id/character_name only when truthy, so the DB's own
 * CURRENT_DATE default and the existing "omit when absent" behavior are
 * preserved exactly. No `source` key is set, so the DB default ('web')
 * still applies, matching today's bulk-insert behavior.
 */
export function buildBulkAwardRow(input: BuildBulkAwardRowInput): LootHistoryInsert {
  const { guildId, awardedBy, item, raidEventId, awardedDate, characterId, characterName, notes } = input
  const row: LootHistoryInsert = {
    loot_item_id: item.id,
    guild_id: guildId,
    raid_tier_id: item.raid_tier_id,
    expansion_id: item.expansion_id,
    raid_event_id: raidEventId ?? null,
    awarded_by: awardedBy,
    notes,
  }
  if (awardedDate) row.awarded_date = awardedDate
  if (characterId) row.character_id = characterId
  if (characterName) row.character_name = characterName
  return row
}
