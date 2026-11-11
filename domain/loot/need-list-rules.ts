/**
 * The server rules a saved need list must pass before it is submitted: the
 * 10-point budget (D-07), class and spec eligibility (D-10), and the picker's
 * shape (checkNeedShape, WR-01 of the Phase 4 review).
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
import { MAX_NEED_TIER_SLOTS, NEED_PICK_COUNT, NEED_PICK_RANKS } from '@/domain/loot/need-picks'

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

export const NEED_SHAPE_CODE = 'NEED_SHAPE_INVALID'

// API-only copy, owner review pending (04-19 sign-off predates it). The picker
// always saves this shape, so only a hand-built save_submission_items call can
// be refused with it.
export const NEED_SHAPE_ERROR = 'A need list holds up to five needs at ranks 50 to 46, one need per rank.'

export interface NeedShapeRow {
  rank: number
  slot: number | string
  need_key: string | null
}

export type NeedShapeRule = 'one_key_per_rank' | 'pick_count' | 'rank' | 'slot'

export type NeedShapeCheck =
  | { ok: true }
  | {
      ok: false
      code: typeof NEED_SHAPE_CODE
      message: string
      /** picks is the distinct (rank, need_key) count; ranks are the ranks that break the rule. */
      details: { rule: NeedShapeRule; picks: number; ranks: number[] }
    }

/**
 * The picker's contract for a saved need list: at most NEED_PICK_COUNT picks,
 * each at a rank in NEED_PICK_RANKS, one need key per rank, and every row on a
 * tier slot from 1 to MAX_NEED_TIER_SLOTS. A pick is a distinct (rank, key):
 * the fan-out puts the same key at one rank once per tier slot, which is one
 * pick, while a second key at that rank is the stacking the budget cannot see
 * (T-04-03-01). A row with no key counts as a key of its own, so it can never
 * hide beside a real pick.
 *
 * One key per rank is judged first so that stacking reads as stacking rather
 * than as too many picks; the pick count then catches a list spread past the
 * five ranks before the rank rule would name only its tail.
 */
export function checkNeedShape(rows: readonly NeedShapeRow[]): NeedShapeCheck {
  const keysByRank = new Map<number, Set<string>>()
  for (const row of rows) {
    const rank = Number(row.rank)
    let keys = keysByRank.get(rank)
    if (!keys) {
      keys = new Set<string>()
      keysByRank.set(rank, keys)
    }
    // Need keys are never empty, so '' cannot collide with a real key.
    keys.add(row.need_key ?? '')
  }
  const picks = [...keysByRank.values()].reduce((sum, keys) => sum + keys.size, 0)
  const descending = (ranks: Iterable<number>) => [...new Set(ranks)].sort((a, b) => b - a)
  const refuse = (rule: NeedShapeRule, ranks: Iterable<number>): NeedShapeCheck => ({
    ok: false,
    code: NEED_SHAPE_CODE,
    message: NEED_SHAPE_ERROR,
    details: { rule, picks, ranks: descending(ranks) },
  })

  const stacked = [...keysByRank].filter(([, keys]) => keys.size > 1).map(([rank]) => rank)
  if (stacked.length > 0) return refuse('one_key_per_rank', stacked)

  if (picks > NEED_PICK_COUNT) return refuse('pick_count', keysByRank.keys())

  const pickRanks: readonly number[] = NEED_PICK_RANKS
  const offRank = [...keysByRank.keys()].filter((rank) => !pickRanks.includes(rank))
  if (offRank.length > 0) return refuse('rank', offRank)

  const offSlot = rows
    .filter((row) => {
      const slot = Number(row.slot)
      return !Number.isInteger(slot) || slot < 1 || slot > MAX_NEED_TIER_SLOTS
    })
    .map((row) => Number(row.rank))
  if (offSlot.length > 0) return refuse('slot', offSlot)

  return { ok: true }
}
