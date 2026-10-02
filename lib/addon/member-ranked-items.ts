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
 * Today's behaviour is kept for raiders with more than one approved
 * submission: the last one in the query result replaces the others (N-1).
 *
 * fetchReceivedCounts reads the guild's loot_history in pages and checks
 * the error on every page (paginatedSelect ignores errors). A failed read
 * returns null, and the export then goes out without the skip, as before.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { pickReceivedEntries } from '@/domain/loot/apply-receive-skip'
import { withFactionVariants } from '@/domain/loot/faction-item-aliases'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryClient = SupabaseClient<any, any, any>

const PAGE_SIZE = 1000

type WowheadRef = { wowhead_id: number | null } | null

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
}

/**
 * Builds characterId -> ranked items. receivedCounts maps
 * `${character_id}-${wowhead_id}` to the number of awards of that item to
 * that raider (fetchReceivedCounts); null skips nothing. Never mutates its
 * input.
 */
export function buildMemberRankedItems(
  submissions: readonly RankedSubmission[],
  receivedCounts: ReadonlyMap<string, number> | null,
): Record<string, MemberRankedItem[]> {
  const entriesByCharacter = new Map<string, Entry[]>()
  for (const sub of submissions) {
    if (!sub.loot_submission_items) continue
    const entries: Entry[] = []
    for (const item of sub.loot_submission_items) {
      if (item.removed_at) continue
      const lootItem = Array.isArray(item.loot_items) ? item.loot_items[0] : item.loot_items
      const wowheadId = lootItem?.wowhead_id
      if (!wowheadId) continue
      entries.push({ key: `${sub.character_id}-${wowheadId}`, wowhead_id: wowheadId, rank: item.rank, slot: item.slot ?? null })
    }
    entriesByCharacter.set(sub.character_id, entries)
  }

  const result: Record<string, MemberRankedItem[]> = {}
  for (const [characterId, entries] of entriesByCharacter) {
    const received = receivedCounts ? pickReceivedEntries(entries, receivedCounts) : null
    const kept = received ? entries.filter(e => !received.has(e)) : entries.slice()
    kept.sort((a, b) => a.rank - b.rank || (b.slot ?? 0) - (a.slot ?? 0))
    result[characterId] = withFactionVariants(kept.map(e => ({ wowhead_id: e.wowhead_id, rank: e.rank })))
  }
  return result
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
