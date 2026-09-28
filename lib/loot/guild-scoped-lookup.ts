/**
 * Guild-scoped wowhead_id -> loot_items resolution (GH #277 SCOPE-01).
 *
 * loot_items has no guild_id column. A row belongs to a guild only through
 * raid_tier_id -> raid_tiers.expansion_id -> expansions.guild_id, and every
 * guild seeds its own copy of the same catalog rows. Before this module
 * existed, the addon loot-award and import-string routes resolved an
 * external wowhead_id with `.eq('wowhead_id', id).limit(1).single()` on the
 * SERVICE-ROLE client and no guild filter at all — the first matching row
 * from ANY guild's catalog won, for every item, not only the faction-alias
 * heads this issue is about. The loot-award route even fetched the item's
 * raid tier "to verify it belongs to this guild" but never compared the
 * result to guild_id, so the check was dead code.
 *
 * These helpers replace both patterns with a real guild scope, and layer in
 * the faction-alias candidate order from `faction-item-aliases.ts` (exact id
 * first, then its Horde/Alliance alias) so the two concerns compose instead
 * of needing to be re-solved at each call site.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { wowheadIdCandidates } from '@/domain/loot/faction-item-aliases'

export interface GuildLootItemRow {
  id: string
  name: string
  raid_tier_id: string
}

interface RaidTierEmbed {
  expansion_id: string
}

interface GuildScopedLootItemRow extends GuildLootItemRow {
  raid_tiers: RaidTierEmbed | RaidTierEmbed[] | null
}

function expansionIdOf(row: GuildScopedLootItemRow): string | undefined {
  return Array.isArray(row.raid_tiers) ? row.raid_tiers[0]?.expansion_id : row.raid_tiers?.expansion_id
}

/** Deterministic tie-break when a guild has the same item under more than
 * one of its own expansions: the guild's active expansion wins; otherwise
 * the lowest raid_tier_id is picked, so the result never depends on
 * database return order. */
function pickDeterministic(rows: GuildScopedLootItemRow[], activeExpansionId: string | null): GuildLootItemRow {
  const active = activeExpansionId ? rows.find(row => expansionIdOf(row) === activeExpansionId) : undefined
  const chosen = active ?? [...rows].sort((a, b) => a.raid_tier_id.localeCompare(b.raid_tier_id))[0]
  return { id: chosen.id, name: chosen.name, raid_tier_id: chosen.raid_tier_id }
}

/**
 * Resolves a wowhead_id to a loot_items row owned by guildId, trying the
 * exact id first and its faction alias second (GH #277 D-03). The exact id
 * is always tried first so a catalog id is never rewritten, and a guild
 * that hand-added the Horde copy keeps matching its own row.
 *
 * Returns null when the guild has no row for wowheadId (or its alias)
 * under any of its own raid tiers — including when another guild happens
 * to have one, which is exactly the leak this function closes.
 */
export async function resolveGuildLootItem(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  guildId: string,
  wowheadId: number
): Promise<GuildLootItemRow | null> {
  const { data: guild } = await supabase
    .from('guilds')
    .select('active_expansion_id')
    .eq('id', guildId)
    .single()
  const activeExpansionId = (guild as { active_expansion_id: string | null } | null)?.active_expansion_id ?? null

  for (const candidate of wowheadIdCandidates(wowheadId)) {
    const { data: rows } = await supabase
      .from('loot_items')
      .select('id, name, raid_tier_id, raid_tiers!inner(expansion_id, expansions!inner(guild_id))')
      .eq('wowhead_id', candidate)
      .eq('raid_tiers.expansions.guild_id', guildId)

    const matches = (rows ?? []) as unknown as GuildScopedLootItemRow[]
    if (matches.length > 0) {
      return pickDeterministic(matches, activeExpansionId)
    }
  }

  return null
}

/**
 * Finds every loot_items row owned by guildId (across ALL of its
 * expansions, not just the current one) whose wowhead_id matches one of the
 * given candidates. Used by raid-tracking's "not matched" import fallback to
 * tell "exists in another of our expansions" apart from "not in our data at
 * all" — without that distinction ever leaking another guild's row.
 */
export async function findGuildLootItemsByWowheadIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  guildId: string,
  wowheadIds: number[]
): Promise<GuildLootItemRow[]> {
  const { data: rows } = await supabase
    .from('loot_items')
    .select('id, name, raid_tier_id, raid_tiers!inner(expansion_id, expansions!inner(guild_id))')
    .in('wowhead_id', wowheadIds)
    .eq('raid_tiers.expansions.guild_id', guildId)

  const matches = (rows ?? []) as unknown as GuildScopedLootItemRow[]
  return matches.map(row => ({ id: row.id, name: row.name, raid_tier_id: row.raid_tier_id }))
}
