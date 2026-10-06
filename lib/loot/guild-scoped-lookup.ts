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
 *
 * GH #307: some items sit in more than one of a guild's raid tiers (the AQ
 * formulas are 'Shared Boss Loot' in both Ruins and Temple of Ahn'Qiraj; the
 * TBC T6 recipes are 'Trash' in both Black Temple and Hyjal Summit).
 * resolveGuildLootItem now takes optional hints (the award's boss, the live
 * instance name) and uses them to pick between those tiers, in this order:
 * the tier whose row has that boss, then the one tier whose 'Shared Boss
 * Loot' / 'Trash' row sits in a tier that has that boss, then the tier named
 * by the raid hint, then the deterministic fallback. Group labels ('Shared
 * Boss Loot', 'Trash', 'Unknown') are never a boss signal: the addon's
 * award bossName is the cached catalog row's label (item.itemData.bossName
 * in LootDistribution.lua), not the live encounter. Hints only ever choose
 * among rows already scoped to the guild's own tiers. The raid hint matches
 * a tier's own name or one of its in-game instance names in
 * data/raid-catalog-names.ts (RAID_INSTANCE_NAMES): the game reports map
 * names, and some differ from the catalog tier name (for example "Ahn'Qiraj
 * Temple" for Temple of Ahn'Qiraj).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { wowheadIdCandidates } from '@/domain/loot/faction-item-aliases'
import { RAID_INSTANCE_NAMES, CATALOG_GROUP_LABELS } from '@/data/raid-catalog-names'

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
  /** Which rule picked the row (GH #307). 'single_tier' when every match
   * sat in one tier, so no hint was needed. */
  matched_by: LootItemMatch
}

/** Optional signals used to choose between a guild's tiers when an item
 * sits in more than one of them (GH #307). */
export interface LootItemHints {
  /** The boss the item dropped from. Group labels are ignored. */
  bossName?: string | null
  /** The live raid instance name (raid_tiers.name), or one of its in-game
   * instance names in data/raid-catalog-names.ts. Never the addon award's
   * own raidName, which echoes the cached catalog row. */
  raidName?: string | null
}

export type LootItemMatch = 'single_tier' | 'boss' | 'boss_tier' | 'raid' | 'fallback'

interface GuildRaidTier {
  id: string
  expansion_id: string
  name: string | null
}

type CandidateRow = GuildLootItemRow & { expansion_id: string; boss_name: string | null }

/** Catalog boss_name labels that group items rather than name a boss,
 * built from CATALOG_GROUP_LABELS in data/raid-catalog-names.ts. */
const GROUP_BOSS_LABELS = new Set(
  CATALOG_GROUP_LABELS
    .map(label => normalizeCatalogName(label))
    .filter((label): label is string => label !== null)
)
const UNKNOWN_LABEL = 'unknown'

/**
 * Normalises a boss or raid name for comparison: trims, turns curly
 * apostrophes (U+2018, U+2019) into a plain one, collapses whitespace and
 * lowercases. Returns null for a non-string or an empty result.
 */
export function normalizeCatalogName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
  return normalized === '' ? null : normalized
}

/**
 * Built once, at module level: the normalized catalog raid name to its
 * normalized in-game instance names (GH #307). A Map, never a plain-object
 * index \u2014 a database tier named 'constructor' or '__proto__' must never
 * resolve through Object.prototype instead of a real miss.
 */
const RAID_INSTANCE_NAME_MAP: ReadonlyMap<string, readonly string[]> = new Map(
  Object.entries(RAID_INSTANCE_NAMES).map(([raidName, instanceNames]) => [
    normalizeCatalogName(raidName) ?? raidName.toLowerCase(),
    instanceNames
      .map(name => normalizeCatalogName(name))
      .filter((name): name is string => name !== null),
  ])
)

/**
 * True when raidHint (already normalized) is tierName's own normalized
 * name, or one of the in-game instance names data/raid-catalog-names.ts
 * lists for that tier name (GH #307). Reads RAID_INSTANCE_NAME_MAP, never a
 * plain object, so a tier name that collides with an Object.prototype key
 * cannot change the result.
 */
function tierMatchesRaidHint(tierName: string | null, raidHint: string): boolean {
  const normalizedTierName = normalizeCatalogName(tierName)
  if (normalizedTierName === null) return false
  if (normalizedTierName === raidHint) return true
  const instanceNames = RAID_INSTANCE_NAME_MAP.get(normalizedTierName)
  return instanceNames !== undefined && instanceNames.includes(raidHint)
}

function distinctTierIds(rows: Array<{ raid_tier_id: string }>): string[] {
  return [...new Set(rows.map(row => row.raid_tier_id))]
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
    .select('id, expansion_id, name')
    .in('expansion_id', expansionIds)

  if (tiersError) {
    throw new Error(`Failed to load raid tiers for guild ${guildId}: ${tiersError.message}`)
  }

  return (tiers ?? []) as GuildRaidTier[]
}

/** Deterministic tie-break among candidate rows: the pool is the rows in
 * the guild's active expansion when there are any, otherwise every row, and
 * the pool row with the lowest raid_tier_id (then lowest id) wins. The
 * result never depends on database return order, including when two
 * candidate tiers are both in the active expansion (AQ20 and AQ40, or Black
 * Temple and Hyjal Summit; GH #307 PD-03). */
function pickDeterministic(
  rows: CandidateRow[],
  activeExpansionId: string | null,
  matchedBy: LootItemMatch
): ResolvedGuildLootItem {
  const active = activeExpansionId ? rows.filter(row => row.expansion_id === activeExpansionId) : []
  const pool = active.length > 0 ? active : rows
  const chosen = [...pool].sort(
    (a, b) => a.raid_tier_id.localeCompare(b.raid_tier_id) || a.id.localeCompare(b.id)
  )[0]
  return {
    id: chosen.id,
    name: chosen.name,
    raid_tier_id: chosen.raid_tier_id,
    expansion_id: chosen.expansion_id,
    matched_by: matchedBy,
  }
}

/**
 * Picks among matches that sit in more than one tier (GH #307). Returns
 * the chosen row with the rule that decided it. Only the 'boss_tier' step
 * queries, and only against the guild's own candidate tier ids.
 */
async function pickAcrossTiers(
  supabase: QueryClient,
  guildId: string,
  matches: CandidateRow[],
  hints: LootItemHints,
  tierNameById: Map<string, string | null>,
  activeExpansionId: string | null
): Promise<ResolvedGuildLootItem> {
  const rawBoss = normalizeCatalogName(hints.bossName)
  const bossHint = rawBoss && !GROUP_BOSS_LABELS.has(rawBoss) && rawBoss !== UNKNOWN_LABEL ? rawBoss : null

  if (bossHint) {
    // (a) the tier whose own row names this boss.
    const byBoss = matches.filter(row => normalizeCatalogName(row.boss_name) === bossHint)
    if (byBoss.length > 0) {
      if (distinctTierIds(byBoss).length === 1) {
        return pickDeterministic(byBoss, activeExpansionId, 'boss')
      }
    } else {
      // (b) a 'Shared Boss Loot' / 'Trash' row in the one tier that has
      // this boss. The roster query is limited to the group rows' tiers,
      // which are always the guild's own candidate tiers (T-307-01), and
      // the comparison is done here in JS, never with like or ilike.
      const groupRows = matches.filter(row => {
        const label = normalizeCatalogName(row.boss_name)
        return label !== null && GROUP_BOSS_LABELS.has(label)
      })
      if (groupRows.length > 0) {
        const { data: roster, error } = await supabase
          .from('loot_items')
          .select('raid_tier_id, boss_name')
          .in('raid_tier_id', distinctTierIds(groupRows))

        if (error) {
          throw new Error(`Failed to load loot_items boss roster (guild ${guildId}): ${error.message}`)
        }

        const tiersWithBoss = new Set(
          ((roster ?? []) as Array<{ raid_tier_id: string; boss_name: string | null }>)
            .filter(row => normalizeCatalogName(row.boss_name) === bossHint)
            .map(row => row.raid_tier_id)
        )
        const inBossTier = groupRows.filter(row => tiersWithBoss.has(row.raid_tier_id))
        if (inBossTier.length > 0 && distinctTierIds(inBossTier).length === 1) {
          return pickDeterministic(inBossTier, activeExpansionId, 'boss_tier')
        }
      }
    }
  }

  // (c) the tier named by the live raid hint, matched by its own name or
  // one of its in-game instance names in data/raid-catalog-names.ts.
  const raidHint = normalizeCatalogName(hints.raidName)
  if (raidHint && raidHint !== UNKNOWN_LABEL) {
    const byRaid = matches.filter(row => tierMatchesRaidHint(tierNameById.get(row.raid_tier_id) ?? null, raidHint))
    if (byRaid.length > 0 && distinctTierIds(byRaid).length === 1) {
      return pickDeterministic(byRaid, activeExpansionId, 'raid')
    }
  }

  // (d) nothing decided: the deterministic fallback.
  return pickDeterministic(matches, activeExpansionId, 'fallback')
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
 * When every match sits in one tier, that row is returned ('single_tier')
 * with no extra query, exactly as before GH #307. When the matches span
 * more than one of the guild's tiers, the hints choose between them in
 * this order (GH #307 D-01): the tier whose row has hints.bossName
 * ('boss'); else the one tier whose 'Shared Boss Loot' or 'Trash' row sits
 * in a tier that has that boss ('boss_tier'); else the tier whose name, or
 * one of its in-game instance names in data/raid-catalog-names.ts, is
 * hints.raidName ('raid'); else the active expansion, then the lowest
 * raid_tier_id ('fallback'). Group labels and 'Unknown' are not a boss
 * signal, because the addon sends the cached catalog row's boss label
 * (LootDistribution.lua), not the live encounter. Hints never widen the
 * scope: they only choose among the guild's own rows.
 *
 * Throws if any underlying query errors, so a rejected filter or a
 * transient DB error surfaces as a real failure instead of a false "not
 * found".
 */
export async function resolveGuildLootItem(
  supabase: QueryClient,
  guildId: string,
  wowheadId: number,
  hints: LootItemHints = {}
): Promise<ResolvedGuildLootItem | null> {
  const tiers = await getGuildRaidTiers(supabase, guildId)
  if (tiers.length === 0) return null

  const tierIds = tiers.map(t => t.id)
  const expansionByTier = new Map(tiers.map(t => [t.id, t.expansion_id]))
  const tierNameById = new Map(tiers.map(t => [t.id, t.name ?? null]))

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
      .select('id, name, raid_tier_id, boss_name')
      .eq('wowhead_id', candidate)
      .in('raid_tier_id', tierIds)

    if (error) {
      throw new Error(`Failed to look up loot_items for wowhead_id ${candidate} (guild ${guildId}): ${error.message}`)
    }

    const matches = (rows ?? []) as Array<GuildLootItemRow & { boss_name?: string | null }>
    if (matches.length > 0) {
      const withExpansion: CandidateRow[] = matches.map(row => {
        const expansionId = expansionByTier.get(row.raid_tier_id)
        if (expansionId === undefined) {
          // Every match came from a tier id in tierIds, which is built from
          // this guild's own expansion map above — a missing entry here
          // would mean the map and the query fell out of sync, which is a
          // bug, not a valid "no expansion" result.
          throw new Error(`No expansion mapping for raid_tier_id ${row.raid_tier_id} (guild ${guildId})`)
        }
        return {
          id: row.id,
          name: row.name,
          raid_tier_id: row.raid_tier_id,
          expansion_id: expansionId,
          boss_name: row.boss_name ?? null,
        }
      })
      if (distinctTierIds(withExpansion).length === 1) {
        return pickDeterministic(withExpansion, activeExpansionId, 'single_tier')
      }
      return pickAcrossTiers(supabase, guildId, withExpansion, hints, tierNameById, activeExpansionId)
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for a stable call-site signature; OD-3 copy never interpolates ids
export function formatInvalidLootItemIdsError(_invalidIds: string[]): string {
  return "Some loot items aren't in this guild's loot tables. Refresh the page and try again."
}
