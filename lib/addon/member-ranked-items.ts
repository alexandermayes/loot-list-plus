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
 */
import { pickReceivedEntries } from '@/domain/loot/apply-receive-skip'
import { withFactionVariants } from '@/domain/loot/faction-item-aliases'

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
