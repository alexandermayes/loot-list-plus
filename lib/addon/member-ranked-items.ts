/**
 * Each raider's ranked items for the addon exports (GET
 * /api/addon/export-string and GET /api/addon/guild-data).
 *
 * Removed list rows (removed_at set, FU-3 of #331 and #293) are left out.
 * When received counts are given, one listed entry per award of that item to
 * that raider is left out too, best rank first (pickReceivedEntries), the
 * same rule the master sheet and the Gargul export apply. The skip runs on
 * catalog wowhead ids, before faction mirroring, because loot_history points
 * at catalog rows.
 *
 * Each raider's entries go out in rank ascending order, slot descending on a
 * tie, so the best rank is last. The current readers (the addon's
 * Sync:ProcessImport and companion 1.0.0) keep the last entry per item, so
 * they now keep the best rank. withFactionVariants runs after ordering, so a
 * mirror sits right after its source row.
 *
 * A raider with more than one approved list (one per phase) gets them merged
 * (GH #355); the routes first keep only the exported expansion's lists
 * (inExportExpansion). The same item in the same slot on two lists is one
 * want: per wowhead id and slot the raider keeps as many entries as their
 * largest single list has, at the highest ranks, so one award skips it once.
 * Two entries for one item and slot on a single list (an item that drops in
 * two raids, see apply-receive-skip) stay two. Ties keep read order.
 *
 * fetchReceivedCounts reads the guild's loot_history in pages and checks
 * the error on every page (paginatedSelect ignores errors). A failed read
 * returns null, and both export routes then answer 500 rather than send a list
 * that looks complete without the skip (FIX-02, owner decisions 7 and 8).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { pickReceivedEntries } from '@/domain/loot/apply-receive-skip'
import { withFactionVariants } from '@/domain/loot/faction-item-aliases'
import { isNeedRow } from '@/domain/loot/item-identity'
import { noteNeedSkipped, type NeedSkipScope } from '@/lib/loot/need-skip'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryClient = SupabaseClient<any, any, any>

const PAGE_SIZE = 1000

type WowheadRef = { wowhead_id: number | null; kind?: string | null } | null

export interface RankedSubmission {
  character_id: string
  loot_submission_items:
    | Array<{
        rank: number
        slot?: number | null
        removed_at?: string | null
        loot_items: WowheadRef | WowheadRef[]
      }>
    | null
}

export interface MemberRankedItem {
  wowhead_id: number
  rank: number
}

interface Entry {
  key: string
  wowhead_id: number
  rank: number
  slot: number | null
  /** Read order, breaks ties. */
  seq: number
}

/** Best rank first (a higher rank number is better), then read order. */
const bestFirst = (a: Entry, b: Entry) => b.rank - a.rank || a.seq - b.seq

/**
 * Builds characterId -> ranked items. receivedCounts maps
 * `${character_id}-${wowhead_id}` to the number of awards of that item to
 * that raider (fetchReceivedCounts); null skips nothing. Never mutates its
 * input. needSkip, when given, counts the need rows left out (D-16).
 */
export function buildMemberRankedItems(
  submissions: readonly RankedSubmission[],
  receivedCounts: ReadonlyMap<string, number> | null,
  needSkip?: NeedSkipScope,
): Record<string, MemberRankedItem[]> {
  // characterId -> `${wowhead_id}:${slot ?? 1}` -> entries kept for that item and slot
  const mergedByCharacter = new Map<string, Map<string, Entry[]>>()
  let seq = 0
  for (const sub of submissions) {
    if (!sub.loot_submission_items) continue
    const thisList = new Map<string, Entry[]>()
    for (const item of sub.loot_submission_items) {
      if (item.removed_at) continue
      const lootItem = Array.isArray(item.loot_items) ? item.loot_items[0] : item.loot_items
      // The addon and companion are item-only until the Drop Desk (D-14): a need
      // ranking is skipped visibly (D-16), never sent under a null wowhead id.
      if (isNeedRow(lootItem)) {
        if (needSkip) noteNeedSkipped(needSkip, 1)
        continue
      }
      const wowheadId = lootItem?.wowhead_id
      if (!wowheadId) continue
      const slot = item.slot ?? null
      const itemSlot = `${wowheadId}:${slot ?? 1}`
      thisList.set(itemSlot, [
        ...(thisList.get(itemSlot) ?? []),
        { key: `${sub.character_id}-${wowheadId}`, wowhead_id: wowheadId, rank: item.rank, slot, seq: seq++ },
      ])
    }
    let merged = mergedByCharacter.get(sub.character_id)
    if (!merged) {
      merged = new Map()
      mergedByCharacter.set(sub.character_id, merged)
    }
    for (const [itemSlot, listed] of thisList) {
      const before = merged.get(itemSlot) ?? []
      merged.set(itemSlot, [...before, ...listed].sort(bestFirst).slice(0, Math.max(before.length, listed.length)))
    }
  }

  const result: Record<string, MemberRankedItem[]> = {}
  for (const [characterId, merged] of mergedByCharacter) {
    const entries = [...merged.values()].flat()
    const received = receivedCounts ? pickReceivedEntries(entries, receivedCounts) : null
    const kept = received ? entries.filter(e => !received.has(e)) : entries.slice()
    kept.sort((a, b) => a.rank - b.rank || (b.slot ?? 0) - (a.slot ?? 0) || a.seq - b.seq)
    result[characterId] = withFactionVariants(kept.map(e => ({ wowhead_id: e.wowhead_id, rank: e.rank })))
  }
  return result
}

/**
 * Keeps the lists an export sends: the export's expansion plus lists with no
 * expansion_id (nullable column, legacy rows went out before). No expansion
 * keeps every list.
 */
export function inExportExpansion<T extends { expansion_id?: string | null }>(
  submissions: readonly T[],
  expansionId: string | null | undefined,
): T[] {
  if (!expansionId) return submissions.slice()
  return submissions.filter(s => s.expansion_id == null || s.expansion_id === expansionId)
}

/**
 * Counts awards per `${character_id}-${wowhead_id}` across the guild's
 * whole loot_history, skipping rows with no character or no wowhead id.
 * Returns null (and logs) when any page fails, so the caller can send its
 * export unskipped instead of failing it.
 */
export async function fetchReceivedCounts(
  supabase: QueryClient,
  guildId: string,
): Promise<Map<string, number> | null> {
  const counts = new Map<string, number>()
  try {
    for (let start = 0; ; start += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('loot_history')
        .select('character_id, loot_item:loot_items(wowhead_id)')
        .eq('guild_id', guildId)
        .order('id', { ascending: true })
        .range(start, start + PAGE_SIZE - 1)
      if (error) {
        console.error('Failed to read loot history for the addon export receive skip:', error.message)
        return null
      }
      const rows = (data ?? []) as Array<{ character_id: string | null; loot_item: WowheadRef | WowheadRef[] }>
      for (const row of rows) {
        const lootItem = Array.isArray(row.loot_item) ? row.loot_item[0] : row.loot_item
        const wowheadId = lootItem?.wowhead_id
        if (!row.character_id || wowheadId == null) continue
        const key = `${row.character_id}-${wowheadId}`
        counts.set(key, (counts.get(key) ?? 0) + 1)
      }
      if (rows.length < PAGE_SIZE) return counts
    }
  } catch (readError) {
    console.error('Failed to read loot history for the addon export receive skip:', readError)
    return null
  }
}
