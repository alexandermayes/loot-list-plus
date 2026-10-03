// Officer bulk delete on the loot lists page (GH #352).
//
// Pure helpers only: no React, no Supabase. The page picks the ids to send
// from what it already shows (the selected expansion and phase tab, the
// status filter, the team filter and the search box); the route trusts
// nothing from the client beyond those ids and re-checks guild and status
// before it deletes anything.

export type BulkDeleteTarget = 'pending' | 'all'

/**
 * Statuses a bulk delete is allowed to remove, per target. The page never
 * shows drafts, so a bulk request never removes one even if a list turned
 * into a draft after the page loaded.
 */
export const BULK_DELETE_STATUSES: Record<BulkDeleteTarget, readonly string[]> = {
  pending: ['pending'],
  all: ['pending', 'approved', 'rejected'],
}

/** Most ids a single bulk delete request may carry. */
export const BULK_DELETE_MAX_IDS = 1000

/** Ids per delete chunk, so one request's filter list stays well under URL limits. */
export const BULK_DELETE_CHUNK_SIZE = 100

/**
 * Picks the ids a bulk delete should send: every list in `lists` whose
 * status matches `target`, de-duplicated, in input order.
 */
export function bulkDeleteIds(
  lists: ReadonlyArray<{ id: string; status: string }>,
  target: BulkDeleteTarget
): string[] {
  const allowedStatuses = BULK_DELETE_STATUSES[target]
  const seen = new Set<string>()
  const ids: string[] = []
  for (const list of lists) {
    if (!allowedStatuses.includes(list.status)) continue
    if (seen.has(list.id)) continue
    seen.add(list.id)
    ids.push(list.id)
  }
  return ids
}

export interface BulkDeleteNotice {
  type: 'success' | 'warning'
  message: string
}

/**
 * Builds the toast for a bulk delete result. When fewer lists were deleted
 * than requested (another officer or the raider changed or removed one
 * after the page loaded), this warns instead of reporting a plain success.
 */
export function bulkDeleteNotice(count: number, requested: number): BulkDeleteNotice {
  if (count >= requested) {
    return { type: 'success', message: `Deleted ${count} submission${count !== 1 ? 's' : ''}` }
  }
  return {
    type: 'warning',
    message: `Deleted ${count} of ${requested} lists. The rest changed or were removed after the page loaded.`,
  }
}
