/**
 * One display line per need position of a Discovery list (D-28).
 *
 * One save ranks each need in every Discovery tier, so a five-need list is 15
 * rows. The raider's Overview and the officer's review modal both have to show
 * that as five needs, and they have to group the rows the same way, so the
 * grouping and its wording live in this one helper. The master sheet, Summary
 * and Raid Mode stay per tier and never call it.
 *
 * Pure and client-safe: it reads no table. The copy is DRAFT until the
 * owner's sign-off in 04-19.
 */
import { describeNeedGroupTiers, groupNeedRowsByRank } from '@/domain/loot/need-picks'

/** The fields grouping reads; the caller's row type may carry anything else. */
interface NeedLineRow {
  rank: number
  need_key?: string | null
  raid_tier_id?: string | null
  kind?: string | null
}

export interface NeedLine<T> {
  type: 'need'
  rank: number
  needKey: string
  tierIds: string[]
  /** 'all 3 raids' or the tier names, see needGroupSuffix. */
  suffix: string
  /** Every row of the group, so the caller can score or audit all of them. */
  rows: T[]
}

export interface ItemLine<T> {
  type: 'item'
  row: T
}

export type DisplayLine<T> = ItemLine<T> | NeedLine<T>

export interface TierInput {
  id: string
  name?: string | null
  sort_order?: number | null
}

/**
 * The tier order and names a list is shown against. Order is sort_order and
 * then id by plain comparison (a locale can order ids differently on the
 * server and in the browser), the same order assignTierSlots uses. A tier with
 * no name stays in the list but out of the name map.
 */
export function buildTierContext(tiers: ReadonlyArray<TierInput>): {
  listTierIds: string[]
  tierNameById: Map<string, string>
} {
  const unique = new Map<string, TierInput>()
  for (const tier of tiers) {
    if (tier.id && !unique.has(tier.id)) unique.set(tier.id, tier)
  }
  const orderOf = (tier: TierInput) => tier.sort_order ?? Number.POSITIVE_INFINITY
  const sorted = [...unique.values()].sort((a, b) => {
    const left = orderOf(a)
    const right = orderOf(b)
    if (left < right) return -1
    if (left > right) return 1
    if (a.id < b.id) return -1
    if (a.id > b.id) return 1
    return 0
  })

  const tierNameById = new Map<string, string>()
  for (const tier of sorted) {
    if (tier.name) tierNameById.set(tier.id, tier.name)
  }
  return { listTierIds: sorted.map((tier) => tier.id), tierNameById }
}

/**
 * How much of the list a need covers, as the words after the need name:
 * 'all 3 raids' when it is ranked in every tier the list covers, otherwise the
 * tier names in the list's tier order. A tier with no known name is left out
 * rather than shown as an id.
 */
export function needGroupSuffix(
  group: { tierIds: readonly string[] },
  listTierIds: readonly string[],
  tierNameById: ReadonlyMap<string, string>,
): string {
  const { allTiers, count } = describeNeedGroupTiers(group, listTierIds)
  if (count === 0) return ''
  // A one-tier list reads better as the tier's name than as 'all 1 raids'.
  if (allTiers && count > 1) return `all ${count} raids`

  const covered = new Set(group.tierIds)
  const names = listTierIds
    .filter((tierId) => covered.has(tierId))
    .map((tierId) => tierNameById.get(tierId))
    .filter((name): name is string => Boolean(name))
  if (names.length > 0) return names.join(', ')
  return `${count} of ${listTierIds.length} raids`
}

/**
 * Item rows come back untouched and in their original order; need rows come
 * back as one line per need and rank. A row is only folded into a need line
 * when it is a need with a key, so a malformed need row stays visible as an
 * item row instead of vanishing from an officer's review (T-04-21-02).
 * Items come first, then the need lines, rank descending.
 */
export function toNeedLines<T extends NeedLineRow>(
  rows: readonly T[],
  listTierIds: readonly string[],
  tierNameById: ReadonlyMap<string, string>,
): Array<DisplayLine<T>> {
  const groupable = (row: T) => row.kind === 'need' && typeof row.need_key === 'string' && row.need_key !== ''

  const itemLines: Array<ItemLine<T>> = rows
    .filter((row) => !groupable(row))
    .map((row) => ({ type: 'item', row }))

  const needLines: Array<NeedLine<T>> = groupNeedRowsByRank(rows.filter(groupable)).map((group) => ({
    type: 'need',
    rank: group.rank,
    needKey: group.needKey,
    tierIds: group.tierIds,
    suffix: needGroupSuffix(group, listTierIds, tierNameById),
    rows: group.rows,
  }))

  return [...itemLines, ...needLines]
}

/**
 * The row with the highest score, the first one on a tie. A need line takes
 * its score from its best tier row, so the line never reads lower than the
 * tier the raider is most likely to win in.
 */
export function bestScoringRow<T>(rows: readonly T[], scoreOf: (row: T) => number): T | undefined {
  let best: T | undefined
  let bestScore = Number.NEGATIVE_INFINITY
  for (const row of rows) {
    const score = scoreOf(row)
    if (best === undefined || score > bestScore) {
      best = row
      bestScore = score
    }
  }
  return best
}
