/**
 * Tier-scoped reads of Discovery need rows for the master sheet and its
 * Summary (DISC-06, D-02, D-13).
 *
 * A Discovery tier can hold 145 seeded need rows, so a need row is read by
 * tier and never by an id list in a URL (research Pitfall 7: 435 ids in a GET
 * overflow the URL limit). Callers show only the needs somebody ranked in
 * Phase 3 (D-02); Phase 4 removes that filter. Both helpers accept any
 * Supabase client (browser session or service role) and throw on a read
 * error, so a failed read never passes as an empty tier.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { selectAllPagesOrThrow } from '@/utils/supabase/paginate'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryClient = SupabaseClient<any, any, any>

export interface TierNeedRow {
  id: string
  name: string
  boss_name: string
  item_slot: string
  /** Always null: a need row has no Wowhead item yet (D-13). */
  wowhead_id: null
  raid_tier_id: string
  is_loot_council: boolean
  classification: string | null
  kind: 'need'
  need_key: string | null
}

/** One live ranking of a need row, in the shape the visibility route returns. */
export interface TierNeedRanking {
  loot_item_id: string
  rank: number
  slot: number
  submission_id: string
}

/** Every need row of the given tiers, ordered by name then id. [] for no tiers. */
export async function fetchTierNeedRows(
  supabase: QueryClient,
  tierIds: readonly string[],
): Promise<TierNeedRow[]> {
  if (tierIds.length === 0) return []

  return selectAllPagesOrThrow<TierNeedRow>('loot_items need rows', (start, end) =>
    supabase
      .from('loot_items')
      .select('id, name, boss_name, item_slot, wowhead_id, raid_tier_id, is_loot_council, classification, kind, need_key')
      .eq('kind', 'need')
      .in('raid_tier_id', [...tierIds])
      // name then id: the id breaks ties so pages never skip or repeat a row.
      .order('name', { ascending: true })
      .order('id', { ascending: true })
      .range(start, end),
  )
}

type NeedRankingRow = TierNeedRanking & { id?: string }

/**
 * Every live (not removed) ranking of a need row in the given tiers. Tier
 * scoped through an inner embed, so no need id enters a URL. [] for no tiers.
 */
export async function fetchTierNeedRankings(
  supabase: QueryClient,
  tierIds: readonly string[],
): Promise<TierNeedRanking[]> {
  if (tierIds.length === 0) return []

  const rows = await selectAllPagesOrThrow<NeedRankingRow>('loot_submission_items need rankings', (start, end) =>
    supabase
      .from('loot_submission_items')
      .select('loot_item_id, rank, slot, submission_id, loot_items!inner(raid_tier_id, kind)')
      .eq('loot_items.kind', 'need')
      .in('loot_items.raid_tier_id', [...tierIds])
      .is('removed_at', null)
      .order('id', { ascending: true })
      .range(start, end),
  )

  return rows.map(r => ({
    loot_item_id: r.loot_item_id,
    rank: r.rank,
    slot: r.slot,
    submission_id: r.submission_id,
  }))
}
