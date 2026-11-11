/**
 * The 10-point Discovery budget and the copy caps (D-06, D-07, D-29).
 *
 * The picker and the submit route must refuse the same lists with the same
 * words, so both call this one module. The picker works on five need keys; the
 * server works on loot_submission_items rows, where each pick is fanned out
 * over every Discovery tier of the phase group. A pick is therefore counted
 * once per distinct (rank, need_key), never once per row, or a three-tier
 * group would triple every cost (research P2). Counting by rank alone would
 * let five keys stacked at one rank slip under the limit (T-04-03-01), which
 * is why the key is part of the group.
 *
 * Pure and client-safe: no server code, no I/O.
 */
import {
  NEED_DEFINITIONS,
  findNeedDefinition,
  needRowColumns,
  type NeedSlotKey,
} from '@/domain/loot/needs'
import { maxCopiesForNeed } from '@/domain/loot/slot-capacity'

/** Fixed for every guild, not a setting (D-06). */
export const NEED_BUDGET_POINTS = 10

export const NEED_BUDGET_CODE = 'NEED_BUDGET_EXCEEDED'

const BIG_COST = 3

/** The cost of one pick of a saved need row; unknown or missing is 0. */
function rowCost(cost: number | null): number {
  return typeof cost === 'number' && Number.isFinite(cost) && cost > 0 ? cost : 0
}

/** One cost per distinct (rank, need_key), largest wins, so a pick counts once. */
function distinctPickCosts(
  rows: ReadonlyArray<{ rank: number; need_key: string | null; allocation_cost: number | null }>,
): number[] {
  const byPick = new Map<string, number>()
  for (const row of rows) {
    if (row.need_key === null) continue
    const pick = `${row.rank}|${row.need_key}`
    byPick.set(pick, Math.max(byPick.get(pick) ?? 0, rowCost(row.allocation_cost)))
  }
  return [...byPick.values()]
}

export function needBudgetUsed(
  rows: ReadonlyArray<{ rank: number; need_key: string | null; allocation_cost: number | null }>,
): number {
  return distinctPickCosts(rows).reduce((sum, cost) => sum + cost, 0)
}

export function checkNeedBudget(
  rows: ReadonlyArray<{ rank: number; need_key: string | null; allocation_cost: number | null }>,
): { ok: boolean; used: number; limit: number; bigPicks: number } {
  const costs = distinctPickCosts(rows)
  const used = costs.reduce((sum, cost) => sum + cost, 0)
  return {
    ok: used <= NEED_BUDGET_POINTS,
    used,
    limit: NEED_BUDGET_POINTS,
    bigPicks: costs.filter((cost) => cost === BIG_COST).length,
  }
}

// Unknown keys cost 0 here and are refused by the eligibility check instead,
// so one bad key reports one reason rather than two.
function costForKey(key: string | null): number {
  return key === null ? 0 : (findNeedDefinition(key)?.cost ?? 0)
}

/** Picker side of the same count: one key per position, null for an empty one. */
export function budgetForPicks(keys: ReadonlyArray<string | null>): { used: number; bigPicks: number } {
  let used = 0
  let bigPicks = 0
  for (const key of keys) {
    const cost = costForKey(key)
    used += cost
    if (cost === BIG_COST) bigPicks += 1
  }
  return { used, bigPicks }
}

/**
 * Whether putting a pick costing newCost at positionBeingChanged breaks the
 * budget. The position's current pick is excluded, so swapping a Big pick for
 * another Big pick is allowed at 10 of 10.
 */
export function wouldGoOver(
  keys: ReadonlyArray<string | null>,
  positionBeingChanged: number,
  newCost: number,
): boolean {
  const others = keys.map((key, position) => (position === positionBeingChanged ? null : key))
  return budgetForPicks(others).used + newCost > NEED_BUDGET_POINTS
}

// Cost per slot comes from the definitions rather than a second table, so a
// repriced slot cannot leave this answer stale.
const COST_BY_SLOT: ReadonlyMap<NeedSlotKey, 1 | 2 | 3> = new Map(
  NEED_DEFINITIONS.map((definition) => [definition.slot, definition.cost] as const),
)

export function costForSlot(slot: NeedSlotKey): 1 | 2 | 3 {
  return COST_BY_SLOT.get(slot) ?? 1
}

/**
 * Why candidateKey cannot go at positionBeingChanged, else null (D-29). Only
 * the same key counts: Ring, healing beside Ring, spell damage is fine. Ring
 * and Trinket keys allow two copies (two slots are worn), everything else one.
 * An unknown key gets the single-copy limit; eligibility refuses it anyway.
 */
export function needCopyViolation(
  keys: ReadonlyArray<string | null>,
  positionBeingChanged: number,
  candidateKey: string,
): 'third-copy' | 'duplicate' | null {
  const definition = findNeedDefinition(candidateKey)
  const canonical = definition?.key ?? candidateKey
  const limit = definition ? maxCopiesForNeed(needRowColumns(definition).item_slot) : 1

  let elsewhere = 0
  keys.forEach((key, position) => {
    if (position === positionBeingChanged || key === null) return
    if ((findNeedDefinition(key)?.key ?? key) === canonical) elsewhere += 1
  })

  if (elsewhere < limit) return null
  return limit > 1 ? 'third-copy' : 'duplicate'
}

// DRAFT copy: the owner signs these off in 04-19. No em or en dash may appear.
const WORD_BY_COUNT: Readonly<Record<number, string>> = Object.freeze({
  3: 'three',
  4: 'four',
  5: 'five',
})
const MIXED_OVER_BUDGET_SENTENCE = "That's too many big and medium picks. Swap one for armour."

/** The sentence the picker shows and the 422 carries, so both say the same thing (UI-14). */
export function needOverBudgetSentence(bigPicks: number): string {
  const word = WORD_BY_COUNT[bigPicks]
  if (word === undefined) return MIXED_OVER_BUDGET_SENTENCE
  return `That's ${word} big picks. Swap a weapon or trinket for armour.`
}
