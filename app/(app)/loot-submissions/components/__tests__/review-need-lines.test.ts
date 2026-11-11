import { describe, it, expect } from 'vitest'
import { buildReviewRows, type ReviewDetailRow } from '../review-need-lines'

// Neutral fixtures only: this repo is public.
const TIERS = [
  { id: 'tier-a', name: 'Raid A', sort_order: 1 },
  { id: 'tier-b', name: 'Raid B', sort_order: 2 },
  { id: 'tier-c', name: 'Raid C', sort_order: 3 },
]
const NEEDS = [
  { key: 'need-1', name: 'Need One' },
  { key: 'need-2', name: 'Need Two' },
  { key: 'need-3', name: 'Need Three' },
  { key: 'need-4', name: 'Need Four' },
  { key: 'need-5', name: 'Need Five' },
]

function needRow(
  need: (typeof NEEDS)[number],
  position: number,
  tierIndex: number,
  overrides: Partial<ReviewDetailRow> = {},
): ReviewDetailRow {
  const tier = TIERS[tierIndex]
  return {
    rank: 50 - position,
    slot: tierIndex + 1,
    removed_at: null,
    loot_item: {
      id: `${need.key}@${tier.id}`,
      name: need.name,
      wowhead_id: null,
      classification: null,
      kind: 'need',
      need_key: need.key,
      raid_tier_id: tier.id,
      raid_tier: { name: tier.name, sort_order: tier.sort_order },
    },
    ...overrides,
  }
}

function discoveryList(): ReviewDetailRow[] {
  return NEEDS.flatMap((need, position) => TIERS.map((_, tierIndex) => needRow(need, position, tierIndex)))
}

function itemRow(id: string, rank: number, slot: number, overrides: Partial<ReviewDetailRow> = {}): ReviewDetailRow {
  return {
    rank,
    slot,
    removed_at: null,
    loot_item: {
      id,
      name: `Item ${id}`,
      wowhead_id: 1000,
      classification: 'Unlimited',
      kind: 'item',
      need_key: null,
      raid_tier_id: 'tier-a',
      raid_tier: { name: 'Raid A', sort_order: 1 },
    },
    ...overrides,
  }
}

describe('buildReviewRows (D-28, review modal)', () => {
  it('shows a 15-row Discovery list as five need lines, each with all 3 raids', () => {
    const { needLines, itemRows } = buildReviewRows(discoveryList())

    expect(itemRows).toEqual([])
    expect(needLines).toHaveLength(5)
    expect(needLines.map((line) => line.name)).toEqual(NEEDS.map((need) => need.name))
    expect(needLines.map((line) => line.rank)).toEqual([50, 49, 48, 47, 46])
    expect(needLines.every((line) => line.suffix === 'all 3 raids')).toBe(true)
    expect(needLines.every((line) => !line.removed)).toBe(true)
  })

  it('keeps every one of the 15 rows inside a line, none dropped or shown twice (T-04-21-02)', () => {
    const rows = discoveryList()
    const { needLines } = buildReviewRows(rows)
    const shown = needLines.flatMap((line) => line.rows.map((row) => row.loot_item.id))
    expect(shown).toHaveLength(15)
    expect(new Set(shown)).toEqual(new Set(rows.map((row) => row.loot_item.id)))
  })

  it('names the tiers for a need that is missing from one of them', () => {
    const rows = discoveryList().filter((row) => !(row.loot_item.need_key === 'need-2' && row.slot === 2))
    const { needLines } = buildReviewRows(rows)
    expect(needLines.find((line) => line.needKey === 'need-2')?.suffix).toBe('Raid A, Raid C')
    expect(needLines.find((line) => line.needKey === 'need-1')?.suffix).toBe('all 3 raids')
  })

  it('shows a removed need as its own struck line and keeps the live suffix honest', () => {
    const rows = discoveryList().map((row) =>
      row.loot_item.need_key === 'need-1' && row.slot === 3 ? { ...row, removed_at: '2026-01-01T00:00:00Z' } : row,
    )
    const { needLines } = buildReviewRows(rows)

    const forNeed1 = needLines.filter((line) => line.needKey === 'need-1')
    expect(forNeed1).toHaveLength(2)
    const live = forNeed1.find((line) => !line.removed)
    const removed = forNeed1.find((line) => line.removed)
    expect(live?.suffix).toBe('Raid A, Raid B')
    expect(live?.rows).toHaveLength(2)
    expect(removed?.rows).toHaveLength(1)
    // Still all 15 rows accounted for.
    expect(needLines.flatMap((line) => line.rows)).toHaveLength(15)
  })

  it('leaves a Known list exactly as it was: every row is an item row in the original order', () => {
    const rows = [itemRow('i2', 40, 1), itemRow('i1', 40, 2), itemRow('i3', 38, 1, { removed_at: '2026-01-01T00:00:00Z' })]
    const { needLines, itemRows } = buildReviewRows(rows)
    expect(needLines).toEqual([])
    expect(itemRows).toEqual(rows)
    expect(itemRows[0]).toBe(rows[0])
  })

  it('splits a mixed list: items stay in item rows, needs become lines', () => {
    const rows = [itemRow('i1', 30, 1), ...discoveryList()]
    const { needLines, itemRows } = buildReviewRows(rows)
    expect(itemRows).toEqual([rows[0]])
    expect(needLines).toHaveLength(5)
  })

  it('reads a tier name from an embed that comes back as a one-element array', () => {
    const rows = discoveryList().map((row) => ({
      ...row,
      loot_item: {
        ...row.loot_item,
        raid_tier: row.loot_item.raid_tier ? [row.loot_item.raid_tier] : null,
      },
    })) as ReviewDetailRow[]
    const without = rows.filter((row) => !(row.loot_item.need_key === 'need-1' && row.slot === 1))
    const { needLines } = buildReviewRows(without)
    expect(needLines.find((line) => line.needKey === 'need-1')?.suffix).toBe('Raid B, Raid C')
  })

  it('has nothing to show for an empty list', () => {
    expect(buildReviewRows([])).toEqual({ itemRows: [], needLines: [], otherRows: [] })
  })

  // regression for CR-01 (Phase 4 review): the rank table places slots 1 and
  // 2 only, so a hand-saved item row at slot 3 used to vanish from review and
  // could be approved unseen.
  describe('rows the rank table cannot place (CR-01)', () => {
    it('returns a non-need row at slot 3 as an other row, not an item row', () => {
      const stray = itemRow('i3', 40, 3)
      const rows = [itemRow('i1', 40, 1), itemRow('i2', 40, 2), stray]
      const { itemRows, otherRows } = buildReviewRows(rows)
      expect(otherRows).toEqual([stray])
      expect(itemRows).toEqual([rows[0], rows[1]])
    })

    it('returns a need row with no need key at slot 4 as an other row', () => {
      const malformed = itemRow('n1', 50, 4, {})
      malformed.loot_item = { ...malformed.loot_item, kind: 'need', need_key: null }
      const { otherRows, needLines } = buildReviewRows([...discoveryList(), malformed])
      expect(otherRows).toEqual([malformed])
      expect(needLines).toHaveLength(5)
    })

    it('keeps a removed stray row visible too', () => {
      const removed = itemRow('i9', 12, 7, { removed_at: '2026-01-01T00:00:00Z' })
      expect(buildReviewRows([removed]).otherRows).toEqual([removed])
    })

    it('accounts for every row exactly once across item rows, need lines and other rows', () => {
      const rows = [itemRow('i1', 30, 1), itemRow('i2', 30, 5), ...discoveryList(), itemRow('i3', 20, 2)]
      const { itemRows, needLines, otherRows } = buildReviewRows(rows)
      const shown = [...itemRows, ...needLines.flatMap((line) => line.rows), ...otherRows]
      expect(shown).toHaveLength(rows.length)
      expect(new Set(shown)).toEqual(new Set(rows))
    })

    it('leaves need rows at tier slots 3 to 8 inside their need line', () => {
      const wide = NEEDS.slice(0, 1).flatMap((need) =>
        [0, 1, 2].map((tierIndex) => needRow(need, 0, tierIndex, { slot: tierIndex + 6 })),
      )
      const { otherRows, needLines } = buildReviewRows(wide)
      expect(otherRows).toEqual([])
      expect(needLines).toHaveLength(1)
    })
  })
})
