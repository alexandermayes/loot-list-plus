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
 *
 * Scoping is done with three plain, single-column filters already used
 * elsewhere in this codebase (`.eq`/`.in` against a flat select) instead of
 * a multi-level `!inner` embed filter — nothing else in the repo relies on
 * a two-level nested PostgREST embed, so that shape has never been proven
 * against real PostgREST and is a needless risk for a feature this narrow:
 *   (a) expansions.id where expansions.guild_id = guildId
 *   (b) raid_tiers.id, raid_tiers.expansion_id where expansion_id in (a)
 *   (c) loot_items... where wowhead_id = candidate and raid_tier_id in (b)
 *
 * Every query's `error` is checked and turned into a thrown Error instead of
 * being discarded. Swallowing it would make a rejected filter or a
 * transient DB error indistinguishable from "this guild genuinely has no
 * such item" — silently returning the addon's existing 404, which is a
 * worse regression than GH #277 itself. Callers are expected to catch this
 * and surface a real error (500 / import-error entry), not a false 404.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { wowheadIdCandidates } from '@/domain/loot/faction-item-aliases'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryClient = SupabaseClient<any, any, any>

export interface GuildLootItemRow {
  id: string
  name: string
  raid_tier_id: string
}

interface GuildRaidTier {
  id: string
  expansion_id: string
}

/**
 * Resolves every raid_tier id (and its expansion_id) that belongs to
 * guildId, across ALL of the guild's expansions — not just the active one.
 * This is the only path from a guild to "its own" loot_items rows, since
 * loot_items itself carries no guild_id. Returns an empty array (no error)
 * when the guild simply has no expansions or tiers yet; callers must not
 * query loot_items at all in that case, since an empty `.in(..., [])`
 * scope would otherwise need special-casing per call site.
 */
async function getGuildRaidTiers(supabase: QueryClient, guildId: string): Promise<GuildRaidTier[]> {
  const { data: expansions, error: expansionsError } = await supabase
    .from('expansions')
    .select('id')
    .eq('guild_id', guildId)

  if (expansionsError) {
    throw new Error(`Failed to load expansions for guild ${guildId}: ${expansionsError.message}`)
  }

  const expansionIds = ((expansions ?? []) as Array<{ id: string }>).map(e => e.id)
  if (expansionIds.length === 0) return []

  const { data: tiers, error: tiersError } = await supabase
    .from('raid_tiers')
    .select('id, expansion_id')
    .in('expansion_id', expansionIds)

  if (tiersError) {
    throw new Error(`Failed to load raid tiers for guild ${guildId}: ${tiersError.message}`)
  }

  return (tiers ?? []) as GuildRaidTier[]
}

/** Deterministic tie-break when a guild has the same item under more than
 * one of its own expansions: the guild's active expansion wins; otherwise
 * the lowest raid_tier_id is picked, so the result never depends on
 * database return order. */
function pickDeterministic(
  rows: Array<GuildLootItemRow & { expansion_id: string }>,
  activeExpansionId: string | null
): GuildLootItemRow {
  const active = activeExpansionId ? rows.find(row => row.expansion_id === activeExpansionId) : undefined
  const chosen = active ?? [...rows].sort((a, b) => a.raid_tier_id.localeCompare(b.raid_tier_id))[0]
  return { id: chosen.id, name: chosen.name, raid_tier_id: chosen.raid_tier_id }
}

/**
 * Resolves a wowhead_id to a loot_items row owned by guildId, trying the
 * exact id first and its faction alias second (GH #277 D-03). The exact id
 * is always tried first so a catalog id is never rewritten, and a guild
 * that hand-added the Horde copy keeps matching its own row.
 *
 * Returns null when the guild genuinely has no row for wowheadId (or its
 * alias) under any of its own raid tiers — including when another guild
 * happens to have one, which is exactly the leak this function closes.
 *
 * Throws if any underlying query errors, so a rejected filter or a
 * transient DB error surfaces as a real failure instead of a false "not
 * found".
 */
export async function resolveGuildLootItem(
  supabase: QueryClient,
  guildId: string,
  wowheadId: number
): Promise<GuildLootItemRow | null> {
  const tiers = await getGuildRaidTiers(supabase, guildId)
  if (tiers.length === 0) return null

  const tierIds = tiers.map(t => t.id)
  const expansionByTier = new Map(tiers.map(t => [t.id, t.expansion_id]))

  const { data: guild, error: guildError } = await supabase
    .from('guilds')
    .select('active_expansion_id')
    .eq('id', guildId)
    .single()

  if (guildError) {
    throw new Error(`Failed to load guild ${guildId}: ${guildError.message}`)
  }
  const activeExpansionId = (guild as { active_expansion_id: string | null } | null)?.active_expansion_id ?? null

  for (const candidate of wowheadIdCandidates(wowheadId)) {
    const { data: rows, error } = await supabase
      .from('loot_items')
      .select('id, name, raid_tier_id')
      .eq('wowhead_id', candidate)
      .in('raid_tier_id', tierIds)

    if (error) {
      throw new Error(`Failed to look up loot_items for wowhead_id ${candidate} (guild ${guildId}): ${error.message}`)
    }

    const matches = (rows ?? []) as GuildLootItemRow[]
    if (matches.length > 0) {
      const withExpansion = matches.map(row => ({
        ...row,
        expansion_id: expansionByTier.get(row.raid_tier_id) ?? '',
      }))
      return pickDeterministic(withExpansion, activeExpansionId)
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
 *
 * Throws if any underlying query errors (see module doc).
 */
export async function findGuildLootItemsByWowheadIds(
  supabase: QueryClient,
  guildId: string,
  wowheadIds: number[]
): Promise<GuildLootItemRow[]> {
  const tiers = await getGuildRaidTiers(supabase, guildId)
  if (tiers.length === 0) return []

  const tierIds = tiers.map(t => t.id)

  const { data: rows, error } = await supabase
    .from('loot_items')
    .select('id, name, raid_tier_id')
    .in('wowhead_id', wowheadIds)
    .in('raid_tier_id', tierIds)

  if (error) {
    throw new Error(`Failed to look up loot_items for guild ${guildId}: ${error.message}`)
  }

  return ((rows ?? []) as GuildLootItemRow[]).map(row => ({
    id: row.id,
    name: row.name,
    raid_tier_id: row.raid_tier_id,
  }))
}
