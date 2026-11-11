/**
 * The two server rules a saved need list must pass before it is submitted:
 * the 10-point budget (D-07) and class and spec eligibility (D-10).
 *
 * POST /api/loot-submissions/submit runs this over the list's live need rows
 * and refuses with 422 before the first write, so no API caller can promote an
 * over-budget or ineligible list that would then accrue BLP once approved. The
 * picker calls the same two functions underneath (need-budget.ts and
 * need-eligibility.ts), so the browser and the server refuse the same lists.
 *
 * Pure and client-safe: no server code, no I/O.
 */
import { checkNeedBudget } from '@/domain/loot/need-budget'
import { isNeedEligible } from '@/domain/loot/need-eligibility'

export interface NeedListRow {
  loot_item_id: string
  rank: number
  need_key: string | null
  allocation_cost: number | null
}

export interface NeedListCheck {
  budget: { ok: boolean; used: number; limit: number; bigPicks: number }
  ineligible: Array<{ loot_item_id: string; need_key: string | null }>
}

/**
 * Budget over the distinct (rank, need_key) picks (each pick is fanned out over
 * every Discovery tier, so a row count would triple it) and eligibility per row.
 * A row with no need_key cannot be judged, so it is ineligible rather than free.
 */
export function checkNeedList(
  rows: readonly NeedListRow[],
  character: { className: string | null; specName: string | null },
): NeedListCheck {
  return {
    budget: checkNeedBudget(rows),
    ineligible: rows
      .filter((row) => row.need_key === null || !isNeedEligible(character, row.need_key))
      .map((row) => ({ loot_item_id: row.loot_item_id, need_key: row.need_key })),
  }
}
