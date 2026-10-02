/**
 * Pure, typed builders for every loot_history insert in the award routes
 * (GH #294) and in remove-item's "already obtained" path (GH #297). Each
 * builder is annotated to return
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
  /** The guild's raid night for this award (GH #295), or null/absent when
   * no single night matched. */
  raidEventId?: string | null
  /** The award's addonAwardKey (FU-1 of #331, #293), or null/absent for a
   * companion that sends no award timestamp. */
  sourceAwardKey?: string | null
  today: string
}

/**
 * Builds the loot_history insert payload for POST /api/addon/loot-award
 * (GH #294 D-01). Carries raid_tier_id and expansion_id from the
 * guild-scoped lookup result, which the route previously omitted entirely —
 * raid_tier_id is NOT NULL with no default, so every addon award failed
 * with a 500 before this fix.
 *
 * GH #295: raid_event_id is the raid night the route found with
 * findAwardRaidEvent (always the guild's own), or null when none matched,
 * so the award counts for BLP and the per-night unique rule applies.
 *
 * FU-1 of #331, #293: source_award_key is set only when sourceAwardKey is
 * non-null; insertAddonAward then picks award_copy itself. Without a key
 * the row is copy 1 (the column default), exactly as before.
 */
export function buildAddonAwardRow(input: BuildAddonAwardRowInput): LootHistoryInsert {
  const { guildId, item, characterId, characterName, awardedDate, awardedBy, notes, bossName, raidEventId, sourceAwardKey, today } = input
  const row: LootHistoryInsert = {
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
    raid_event_id: raidEventId ?? null,
  }
  if (sourceAwardKey) row.source_award_key = sourceAwardKey
  return row
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
  /** Which copy of the item this is for the raider on this night (FU-1 of
   * #331, #293), from assignAwardCopies; absent means the column default 1. */
  awardCopy?: number
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
 * still applies, matching today's bulk-insert behavior. award_copy is set
 * only when awardCopy is given (FU-1 of #331, #293).
 */
export function buildBulkAwardRow(input: BuildBulkAwardRowInput): LootHistoryInsert {
  const { guildId, awardedBy, item, raidEventId, awardedDate, characterId, characterName, notes, awardCopy } = input
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
  if (awardCopy !== undefined) row.award_copy = awardCopy
  return row
}

export interface BuildImportStringAwardRowInput {
  guildId: string
  item: LootItemScope
  characterId: string | null
  characterName: string
  awardedAt?: string | null
  manual?: boolean
  awardedBy: string
  /** The guild's raid night for this award (GH #295), or null/absent. */
  raidEventId?: string | null
  /** The award's addonAwardKey (FU-1 of #331, #293), or null/absent when the
   * award has no usable timestamp. */
  sourceAwardKey?: string | null
  today: string
}

/**
 * Builds the loot_history insert payload for POST /api/addon/import-string
 * (GH #294 D-01/D-02). `item` is whichever guild-owned scope the route
 * resolved the award to — the supplied lootItemId when the guild owns it
 * directly, the wowheadId-resolved item when it falls back (OD-2), or the
 * wowheadId-only resolution when no lootItemId was supplied at all. A
 * lootItemId the guild does not own is never passed in here.
 *
 * GH #295: raid_event_id is the raid night the route found for the award's
 * attendance session (or its awardedAt date), or null when none matched.
 *
 * FU-1 of #331, #293: source_award_key is set only when sourceAwardKey is
 * non-null, so re-imports are matched by the award's key and a second copy
 * on one night is recorded (insertAddonAward picks award_copy).
 */
export function buildImportStringAwardRow(input: BuildImportStringAwardRowInput): LootHistoryInsert {
  const { guildId, item, characterId, characterName, awardedAt, manual, awardedBy, raidEventId, sourceAwardKey, today } = input
  const row: LootHistoryInsert = {
    guild_id: guildId,
    character_id: characterId,
    character_name: characterName,
    loot_item_id: item.id,
    raid_tier_id: item.raid_tier_id,
    expansion_id: item.expansion_id,
    awarded_date: awardedAt ? awardedAt.split('T')[0] : today,
    awarded_by: awardedBy,
    source: 'addon',
    notes: manual ? 'Manual award from addon' : null,
    raid_event_id: raidEventId ?? null,
  }
  if (sourceAwardKey) row.source_award_key = sourceAwardKey
  return row
}

export interface BuildRemoveItemHistoryRowInput {
  guildId: string
  item: LootItemScope
  characterId: string
  characterName: string
  awardedBy: string
  reason?: string | null
  today: string
}

/**
 * Builds the loot_history insert payload for POST
 * /api/loot-submissions/remove-item's "already obtained" path (GH #297
 * D-06). remove-item was a fourth, untyped insert that skipped
 * expansion_id entirely (raid_tier_id has no default and expansion_id is
 * how BLP and reporting attribute an award to its tier); this builder
 * takes both scope columns from the guild-scoped item the route resolved,
 * the same way the award-route builders above do.
 *
 * Sets no source key (the DB default 'web' still applies, as today) and no
 * raid_event_id key (as today — remove-item has never linked to a raid
 * night).
 */
export function buildRemoveItemHistoryRow(input: BuildRemoveItemHistoryRowInput): LootHistoryInsert {
  const { guildId, item, characterId, characterName, awardedBy, reason, today } = input
  return {
    guild_id: guildId,
    character_id: characterId,
    character_name: characterName,
    loot_item_id: item.id,
    raid_tier_id: item.raid_tier_id,
    expansion_id: item.expansion_id,
    awarded_date: today,
    awarded_by: awardedBy,
    notes: reason ? reason : 'Obtained outside of raid',
  }
}
