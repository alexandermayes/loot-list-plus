// Which list a phase group gets, and where each Discovery tier's picks land
// (D-12, D-02 amended). Both GET /api/loot-list/bootstrap and GET
// /api/loot-items call this so the first load and every SWR refresh agree on
// whether the page renders the picker.
//
// It reads raid_tiers only, so it is not a reader of the need inventory.

import type { SupabaseClient } from '@supabase/supabase-js'
import { assignTierSlots, isDiscoveryPhaseGroup } from '@/domain/loot/need-picks'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryClient = SupabaseClient<any, any, any>

export interface NeedListScope {
  /** True only for an all-Discovery group; the Known editor never lists needs. */
  includeNeeds: boolean
  /** Discovery tier id to slot, or null for a Known, mixed or over-8 group. */
  tierSlots: Record<string, number> | null
}

interface ScopeTierRow {
  id: string
  list_mode: string | null
  sort_order: number | null
  is_guild_active: boolean | null
  phase: number | null
}

/**
 * The client tier lists hold guild-active tiers only, but a slot must not move
 * when a guild turns a tier off (an award lock sits on a (rank, slot)), so the
 * slots come from every tier of the phases and only the Discovery decision
 * looks at the active ones. A null is_guild_active counts as off, matching
 * resolveTierIdsForPhases.
 *
 * Throws on a failed read: answering "Known" would silently show the 50-rank
 * editor to a Discovery guild.
 */
export async function resolveNeedListScope(
  supabase: QueryClient,
  input: { expansionId: string; phases: number[] },
): Promise<NeedListScope> {
  const { data, error } = await supabase
    .from('raid_tiers')
    .select('id, list_mode, sort_order, is_guild_active, phase')
    .eq('expansion_id', input.expansionId)
    .in('phase', input.phases)

  if (error || !data) {
    throw new Error('Failed to read raid tiers for the need list')
  }

  const rows = data as ScopeTierRow[]
  const active = rows.filter((row) => row.is_guild_active === true)
  const tierSlots = isDiscoveryPhaseGroup(active) ? assignTierSlots(rows) : null

  return { includeNeeds: tierSlots !== null, tierSlots }
}
