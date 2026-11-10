// Master loot analytics: pure props builders for the master_loot_awarded event.
// No imports on purpose, so this module stays safe on server and client.

/**
 * Props for master_loot_awarded.
 *
 * The event fires on a loot-list review (one submission holds many items), so
 * it reports the list's id, the new status, its item count and the ids of its
 * items in list order. Per Hard Constraint 3 analytics carry ids and counts
 * only: this takes primitives and an id array, never the submission or member
 * object, so a player name cannot be passed in by construction.
 *
 * null means unknown (the list was not in local state, or its item read
 * failed). An empty array means a list with no live items. The ids are copied
 * in the given order, without sorting or de-duplicating, so the same list
 * always produces the same array.
 */
export function buildMasterLootAwardedProps(args: {
  guildId: string | null
  submissionId: string
  status: 'approved' | 'rejected'
  itemCount: number | null | undefined
  lootItemIds: readonly string[] | null | undefined
}): {
  guild_id: string | null
  submission_id: string
  new_status: 'approved' | 'rejected'
  item_count: number | null
  loot_item_ids: string[] | null
} {
  const { guildId, submissionId, status, itemCount, lootItemIds } = args
  return {
    guild_id: guildId,
    submission_id: submissionId,
    new_status: status,
    item_count: itemCount ?? null,
    loot_item_ids: lootItemIds ? [...lootItemIds] : null,
  }
}

/**
 * Turns one loot_submission_items read result into a count and ids.
 *
 * A failed read is unknown, not zero: when the read errored, or returned no
 * data, both values are null so the analytics event never reports a false
 * empty list. Otherwise itemCount is every live row (what the old head count
 * counted) and lootItemIds is the non-null loot_item_id values in read order.
 */
export function summarizeSubmissionItems(result: {
  data: ReadonlyArray<{ loot_item_id: string | null }> | null
  error: unknown
}): { itemCount: number | null; lootItemIds: string[] | null } {
  if (result.error || !result.data) {
    return { itemCount: null, lootItemIds: null }
  }
  const lootItemIds: string[] = []
  for (const row of result.data) {
    if (row.loot_item_id !== null) lootItemIds.push(row.loot_item_id)
  }
  return { itemCount: result.data.length, lootItemIds }
}
