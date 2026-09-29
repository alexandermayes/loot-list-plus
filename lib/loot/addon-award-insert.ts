/**
 * Idempotent loot_history insert for addon and companion awards (GH #295
 * D-04, PD-06), shared by POST /api/addon/loot-award and POST
 * /api/addon/import-string.
 *
 * Re-sends are normal: the companion clears its pending list only after a
 * whole sync pass, so a crash before the clear re-sends every award, and an
 * officer can paste the same addon export twice. Once an award carries a
 * raid_event_id, the partial unique index idx_loot_history_unique_award on
 * (guild_id, loot_item_id, character_id, raid_event_id) WHERE raid_event_id
 * IS NOT NULL AND character_id IS NOT NULL rejects the second copy with
 * 23505. That is treated here as "already recorded", not as a failure.
 *
 * The index does not cover a row with no character_id (a name that matched
 * no active member), so for a linked award with an unmatched name this
 * module first checks for a same-night, same-item row with the same name
 * (trimmed, case-insensitive) and treats that as already recorded.
 *
 * Unlinked awards (raid_event_id null) are not deduplicated, which is
 * unchanged from before: with no night there is nothing reliable to key on.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { LootHistoryInsert } from '@/lib/loot/loot-history-rows'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryClient = SupabaseClient<any, any, any>

export interface AddonAwardInsertResult {
  status: 'inserted' | 'already_recorded'
  /** The new row's id, or the existing row's id when already recorded
   * (null if the existing row could not be looked up). */
  id: string | null
}

const UNIQUE_VIOLATION = '23505'

function normalizeName(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

/**
 * Inserts one addon award row, returning 'already_recorded' instead of
 * failing when the same award is already on the same raid night. Any other
 * insert or lookup error is thrown for the caller to report.
 */
export async function insertAddonAward(
  supabase: QueryClient,
  row: LootHistoryInsert,
): Promise<AddonAwardInsertResult> {
  const raidEventId = row.raid_event_id ?? null
  const characterId = row.character_id ?? null

  if (raidEventId && row.character_name && !characterId) {
    const { data: existing, error } = await supabase
      .from('loot_history')
      .select('id, character_name')
      .eq('guild_id', row.guild_id)
      .eq('loot_item_id', row.loot_item_id)
      .eq('raid_event_id', raidEventId)
      .is('character_id', null)

    if (error) {
      throw new Error(`Failed to check for an existing addon award: ${error.message}`)
    }

    const wanted = normalizeName(row.character_name)
    const match = ((existing ?? []) as Array<{ id: string; character_name: string | null }>).find(
      r => normalizeName(r.character_name) === wanted,
    )
    if (match) return { status: 'already_recorded', id: match.id }
  }

  const { data, error } = await supabase.from('loot_history').insert(row).select('id').single()

  if (error) {
    if (error.code === UNIQUE_VIOLATION && raidEventId && characterId) {
      const { data: existing, error: lookupError } = await supabase
        .from('loot_history')
        .select('id')
        .eq('guild_id', row.guild_id)
        .eq('loot_item_id', row.loot_item_id)
        .eq('character_id', characterId)
        .eq('raid_event_id', raidEventId)
        .limit(1)
        .maybeSingle()
      const existingId = lookupError ? null : ((existing as { id: string } | null)?.id ?? null)
      return { status: 'already_recorded', id: existingId }
    }
    throw new Error(`Failed to insert addon award: ${error.message}`)
  }

  return { status: 'inserted', id: (data as { id: string } | null)?.id ?? null }
}
