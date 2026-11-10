// Reads for the officer prio check at submit (#484).
//
// Loads the items a list's character sees in the editor, with the prio flags
// fetchFilteredLootItems computes, over every tier of the list's phase group.
// Read failures reject, so the submit route returns a 500 instead of letting
// a list through unchecked.

import type { SupabaseClient } from '@supabase/supabase-js'
import { listTierIds, type ListTierRow } from '@/domain/expansion/list-tier-ids'
import type { PrioCheckItem } from '@/domain/loot/prio-violations'
import { fetchFilteredLootItems, fetchLootItemsCharacter } from '@/lib/loot-items-query'

export interface PrioCheckList {
  character_id: string
  expansion_id: string
  phase: number
}

export interface ExpansionListTiers {
  currentPhase: number
  phaseGroups: number[][] | null
  tiers: ListTierRow[]
}

/** The expansion's phase settings and guild-active tiers, read the way the bootstrap route reads them. */
export async function fetchExpansionListTiers(
  supabase: SupabaseClient,
  expansionId: string,
): Promise<ExpansionListTiers> {
  const [{ data: expansion, error: expansionError }, { data: tiers, error: tiersError }] = await Promise.all([
    supabase.from('expansions').select('current_phase, phase_groups').eq('id', expansionId).single(),
    supabase.from('raid_tiers').select('id, phase').eq('expansion_id', expansionId).eq('is_guild_active', true),
  ])
  if (expansionError || !expansion) throw new Error('Failed to read the list expansion')
  if (tiersError) throw new Error('Failed to read the list raid tiers')

  return {
    currentPhase: (expansion.current_phase as number | null) ?? 1,
    phaseGroups: (expansion.phase_groups as number[][] | null) ?? null,
    tiers: (tiers ?? []) as ListTierRow[],
  }
}

/** The character's items with prio flags over the list's phase-group tiers. */
export async function fetchListPrioItems(
  supabase: SupabaseClient,
  list: PrioCheckList,
  expansionTiers?: ExpansionListTiers,
): Promise<PrioCheckItem[]> {
  const [settings, character] = await Promise.all([
    expansionTiers ?? fetchExpansionListTiers(supabase, list.expansion_id),
    fetchLootItemsCharacter(supabase, list.character_id),
  ])
  if (!character) throw new Error('Failed to read the list character')

  const tierIds = listTierIds(settings.tiers, settings.currentPhase, settings.phaseGroups, list.phase)
  return (await fetchFilteredLootItems(supabase, character, tierIds)) as PrioCheckItem[]
}
