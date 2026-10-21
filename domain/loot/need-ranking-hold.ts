/**
 * D-22: ranking a need is held until the Phase 4 picker ships.
 *
 * The picker hides needs (03-07), but that is UI only. This predicate is the
 * server half: POST /api/loot-submissions/submit answers 422 for any list that
 * holds a need row, so no raider starts accruing BLP on a need by calling the
 * API directly. The database half is trigger enforce_need_ranking_hold on
 * loot_submission_items (migration 20261020120000, plan 03-01), which catches
 * save_submission_items and direct inserts.
 *
 * Phase 4 lifts the hold with exactly these changes: delete the
 * isHeldNeedRanking check in the submit route, delete this module and its
 * test, and ship a migration that drops trigger enforce_need_ranking_hold and
 * function enforce_need_ranking_hold(). The need branch for bracket rules and
 * copy caps stays.
 *
 * Pure and client-safe.
 */
import { isNeedRow } from './item-identity'

export const NEED_RANKING_HELD = true

// Proposed copy for the owner's Oct 26 sign-off. Only an API caller can see it
// while the picker hides needs. No em or en dash (user-facing copy rule).
export const NEED_RANKING_HOLD_ERROR = 'Needs cannot be ranked yet.'

export function isHeldNeedRanking(
  item: { kind?: string | null } | null | undefined,
): boolean {
  return NEED_RANKING_HELD && isNeedRow(item)
}
