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
 *
 * GH #294: the lookup now also supplies the expansion so award rows carry
 * both required scope columns (raid_tier_id, expansion_id) a service-role
 * loot_history insert needs.
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

/**
 * GuildLootItemRow plus the expansion_id a loot_history insert also needs
 * (GH #294 D-01). Returned only by resolveGuildLootItem, whose caller is
 * always inserting a new award row; findGuildLootItemsByWowheadIds keeps
 * returning the narrower GuildLootItemRow since its callers never insert.
 */
export interface ResolvedGuildLootItem extends GuildLootItemRow {
  expansion_id: string
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
): ResolvedGuildLootItem {
  const active = activeExpansionId ? rows.find(row => row.expansion_id === activeExpansionId) : undefined
  const chosen = active ?? [...rows].sort((a, b) => a.raid_tier_id.localeCompare(b.raid_tier_id))[0]
  return { id: chosen.id, name: chosen.name, raid_tier_id: chosen.raid_tier_id, expansion_id: chosen.expansion_id }
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
): Promise<ResolvedGuildLootItem | null> {
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
      const withExpansion = matches.map(row => {
        const expansionId = expansionByTier.get(row.raid_tier_id)
        if (expansionId === undefined) {
          // Every match came from a tier id in tierIds, which is built from
          // this guild's own expansion map above — a missing entry here
          // would mean the map and the query fell out of sync, which is a
          // bug, not a valid "no expansion" result.
          throw new Error(`No expansion mapping for raid_tier_id ${row.raid_tier_id} (guild ${guildId})`)
        }
        return { ...row, expansion_id: expansionId }
      })
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LOOT_ITEMS_CHUNK_SIZE = 100

/** A loot_items row's ownership scope: the two columns a loot_history
 * insert needs beyond the item's own id (GH #294 D-01/D-02). */
export interface GuildScopedLootItem {
  id: string
  raid_tier_id: string
  expansion_id: string
}

export interface GuildLootItemIdResolution {
  /** loot_item_id -> its scope, for every id the calling guild owns. */
  resolved: Map<string, GuildScopedLootItem>
  /** Every requested id (deduped) that is not owned by the calling guild:
   * malformed (not a UUID), well-formed but not found, or found only under
   * another guild's tiers. The three cases are intentionally
   * indistinguishable here — see the function doc. */
  invalidIds: string[]
}

/**
 * Resolves every client-supplied loot_item_id to its guild-owned scope
 * (raid_tier_id, expansion_id), in one batched pass (GH #294 D-02). Ids the
 * calling guild does not own — whether because another guild owns them, or
 * because no such id exists at all, or because the string is not even a
 * well-formed UUID — all land in `invalidIds` with no further distinction.
 *
 * There is deliberately no unscoped existence probe to tell "another
 * guild's id" apart from "no such id": that query would itself require
 * comparing against other guilds' data, which is exactly the kind of leak
 * this function exists to prevent (T-294-03). Callers reject the whole
 * request with a 400 listing `invalidIds` before any write.
 *
 * Ids are deduped (first-seen order) before querying. Non-UUID-shaped ids
 * never reach `loot_items` — malformed input becomes a 400, not a Postgres
 * 22P02 turned into a 500. When the guild has no raid tiers at all, every
 * well-formed id is invalid and no `loot_items` query is made, matching
 * `getGuildRaidTiers`' existing empty-scope short-circuit. Well-formed ids
 * are queried against `loot_items` in chunks of 100 to keep PostgREST URLs
 * short.
 *
 * Throws if any underlying query errors (see module doc).
 */
export async function resolveGuildLootItemIds(
  supabase: QueryClient,
  guildId: string,
  lootItemIds: string[]
): Promise<GuildLootItemIdResolution> {
  const seen = new Set<string>()
  const dedupedIds: string[] = []
  for (const id of lootItemIds) {
    if (seen.has(id)) continue
    seen.add(id)
    dedupedIds.push(id)
  }

  const wellFormedIds = dedupedIds.filter(id => UUID_PATTERN.test(id))
  const resolved = new Map<string, GuildScopedLootItem>()

  if (wellFormedIds.length > 0) {
    const tiers = await getGuildRaidTiers(supabase, guildId)

    if (tiers.length > 0) {
      const tierIds = tiers.map(t => t.id)
      const expansionByTier = new Map(tiers.map(t => [t.id, t.expansion_id]))

      for (let i = 0; i < wellFormedIds.length; i += LOOT_ITEMS_CHUNK_SIZE) {
        const chunk = wellFormedIds.slice(i, i + LOOT_ITEMS_CHUNK_SIZE)
        const { data: rows, error } = await supabase
          .from('loot_items')
          .select('id, raid_tier_id')
          .in('id', chunk)
          .in('raid_tier_id', tierIds)

        if (error) {
          throw new Error(`Failed to look up loot_items for guild ${guildId}: ${error.message}`)
        }

        for (const row of (rows ?? []) as Array<{ id: string; raid_tier_id: string }>) {
          const expansionId = expansionByTier.get(row.raid_tier_id)
          if (expansionId === undefined) continue // tier came from tierIds; defensive only
          resolved.set(row.id, { id: row.id, raid_tier_id: row.raid_tier_id, expansion_id: expansionId })
        }
      }
    }
  }

  const invalidIds = dedupedIds.filter(id => !resolved.has(id))
  return { resolved, invalidIds }
}

/**
 * User-facing 400 message for a bulk or import-string request carrying a
 * loot_item_id the calling guild does not own (GH #294 D-03, OD-3 exact
 * copy). The offending ids belong only in the response body's
 * `invalid_loot_item_ids` field — this text never interpolates them, so it
 * cannot leak whether an id exists under another guild.
 */
export function formatInvalidLootItemIdsError(_invalidIds: string[]): string {
  return "Some loot items aren't in this guild's loot tables. Refresh the page and try again."
}
