/**
 * Splits a reviewed list's rows into item rows and need lines (D-28).
 *
 * The officer review modal reads one row per (rank, slot), and a Discovery
 * list fans every need out over each Discovery tier, so 15 rows are five
 * needs. This keeps the shape work out of the component: item rows go on to
 * the rank-and-slot table exactly as before, and need rows become one line per
 * need with the 'all 3 raids' or tier-name suffix from lib/loot/need-lines.ts.
 *
 * Live and removed need rows are grouped separately so a struck line never
 * pads the suffix of a live one.
 *
 * The rank-and-slot table places slots 1 and 2 only, so a row outside them
 * that is not part of a need line (an item row a hand-built save put at slot
 * 3 or above, or a need row with no need key there) comes back in otherRows
 * instead. An officer must see every row before approving (CR-01), so each
 * row lands in exactly one of itemRows, a need line or otherRows.
 */
import { buildTierContext, toNeedLines, type TierInput } from '@/lib/loot/need-lines'

type TierEmbed = { name: string | null; sort_order?: number | null }

export interface ReviewDetailRow {
  rank: number
  slot: number
  removed_at?: string | null
  loot_item: {
    id: string
    name: string
    wowhead_id: number | null
    classification: string | null
    kind?: string | null
    need_key?: string | null
    raid_tier_id?: string | null
    // PostgREST types a to-one embed as an object, but older generated
    // types and some clients hand back a one-element array.
    raid_tier?: TierEmbed | TierEmbed[] | null
  }
}

export interface ReviewNeedLine<D extends ReviewDetailRow> {
  rank: number
  needKey: string
  name: string
  suffix: string
  /** True when every row of the line was removed by an officer. */
  removed: boolean
  rows: D[]
}

function tierOf(row: ReviewDetailRow): TierInput | null {
  const id = row.loot_item?.raid_tier_id
  if (!id) return null
  const embed = row.loot_item.raid_tier
  const tier = Array.isArray(embed) ? embed[0] : embed
  return { id, name: tier?.name ?? null, sort_order: tier?.sort_order ?? null }
}

export function buildReviewRows<D extends ReviewDetailRow>(
  details: readonly D[],
): { itemRows: D[]; needLines: Array<ReviewNeedLine<D>>; otherRows: D[] } {
  const flat = details.map((detail) => ({
    rank: Number(detail.rank),
    kind: detail.loot_item?.kind ?? null,
    need_key: detail.loot_item?.need_key ?? null,
    raid_tier_id: detail.loot_item?.raid_tier_id ?? null,
    detail,
  }))

  // The tiers a list covers are the tiers its need rows sit in, so no extra
  // read is needed and a tier the list never used is never counted.
  const tiers = flat
    .filter((row) => row.kind === 'need')
    .map((row) => tierOf(row.detail))
    .filter((tier): tier is TierInput => tier !== null)
  const { listTierIds, tierNameById } = buildTierContext(tiers)

  // Item rows come from the full set so their order and the removed rows are
  // exactly what the table saw before.
  const ungrouped = toNeedLines(flat, listTierIds, tierNameById).flatMap((line) =>
    line.type === 'item' ? [line.row.detail] : [],
  )
  const tableSlot = (detail: D) => {
    const slot = Number(detail.slot)
    return slot === 1 || slot === 2
  }
  const itemRows = ungrouped.filter(tableSlot)
  const otherRows = ungrouped.filter((detail) => !tableSlot(detail))

  const needLines: Array<ReviewNeedLine<D>> = []
  for (const removed of [false, true]) {
    const subset = flat.filter((row) => Boolean(row.detail.removed_at) === removed)
    for (const line of toNeedLines(subset, listTierIds, tierNameById)) {
      if (line.type !== 'need') continue
      needLines.push({
        rank: line.rank,
        needKey: line.needKey,
        name: line.rows[0]?.detail.loot_item?.name || 'Unknown',
        suffix: line.suffix,
        removed,
        rows: line.rows.map((row) => row.detail),
      })
    }
  }
  // Rank descending as the table reads; live before removed at one rank.
  needLines.sort((a, b) => b.rank - a.rank || Number(a.removed) - Number(b.removed))

  return { itemRows, needLines, otherRows }
}
