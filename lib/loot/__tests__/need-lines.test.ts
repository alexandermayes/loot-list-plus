import { describe, it, expect } from 'vitest'
import {
  toNeedLines,
  needGroupSuffix,
  bestScoringRow,
  buildTierContext,
  type DisplayLine,
  type NeedLine,
} from '@/lib/loot/need-lines'

// Neutral fixtures only: this repo is public, so tiers and needs are made up.
const TIERS = [
  { id: 'tier-a', name: 'Raid A', sort_order: 1 },
  { id: 'tier-b', name: 'Raid B', sort_order: 2 },
  { id: 'tier-c', name: 'Raid C', sort_order: 3 },
]
const { listTierIds, tierNameById } = buildTierContext(TIERS)

const NEED_KEYS = ['need-1', 'need-2', 'need-3', 'need-4', 'need-5']

interface Row {
  id: string
  rank: number
  kind: string
  need_key: string | null
  raid_tier_id: string | null
  loot_score?: number
}

/** A saved Discovery list: five needs at ranks 50 to 46, each in three tiers. */
function fifteenRowList(): Row[] {
  const rows: Row[] = []
  NEED_KEYS.forEach((needKey, position) => {
    for (const tier of TIERS) {
      rows.push({
        id: `${needKey}@${tier.id}`,
        rank: 50 - position,
        kind: 'need',
        need_key: needKey,
        raid_tier_id: tier.id,
      })
    }
  })
  return rows
}

const needLinesOf = (lines: DisplayLine<Row>[]) =>
  lines.filter((line): line is NeedLine<Row> => line.type === 'need')

describe('needGroupSuffix (D-28)', () => {
  it("reads 'all 3 raids' for a need ranked in every list tier", () => {
    const suffix = needGroupSuffix({ tierIds: ['tier-a', 'tier-b', 'tier-c'] }, listTierIds, tierNameById)
    expect(suffix).toBe('all 3 raids')
  })

  it('names the tiers in list tier order for a need ranked in two of three', () => {
    // Group order is deliberately reversed: the list's order wins.
    const suffix = needGroupSuffix({ tierIds: ['tier-c', 'tier-a'] }, listTierIds, tierNameById)
    expect(suffix).toBe('Raid A, Raid C')
  })

  it('counts the live number of tiers, not a fixed three', () => {
    const suffix = needGroupSuffix(
      { tierIds: ['tier-a', 'tier-b'] },
      ['tier-a', 'tier-b'],
      tierNameById,
    )
    expect(suffix).toBe('all 2 raids')
  })

  it('names the one tier of a single-tier list instead of saying all 1 raids', () => {
    expect(needGroupSuffix({ tierIds: ['tier-a'] }, ['tier-a'], tierNameById)).toBe('Raid A')
  })

  it('never shows an id when a tier has no name', () => {
    const suffix = needGroupSuffix({ tierIds: ['tier-a', 'tier-x'] }, ['tier-a', 'tier-x', 'tier-b'], tierNameById)
    expect(suffix).toBe('Raid A')
    expect(needGroupSuffix({ tierIds: ['tier-x'] }, ['tier-x', 'tier-b'], tierNameById)).toBe('1 of 2 raids')
  })

  it('has nothing to say when the group has no tier the list covers', () => {
    expect(needGroupSuffix({ tierIds: [] }, listTierIds, tierNameById)).toBe('')
  })
})

describe('toNeedLines (D-28, DISC-05)', () => {
  it('shows a 15-row Discovery list as five need lines and keeps all 15 rows', () => {
    const rows = fifteenRowList()
    const lines = needLinesOf(toNeedLines(rows, listTierIds, tierNameById))

    expect(lines).toHaveLength(5)
    expect(lines.map((line) => line.needKey)).toEqual(NEED_KEYS)
    expect(lines.map((line) => line.rank)).toEqual([50, 49, 48, 47, 46])
    for (const line of lines) {
      expect(line.rows).toHaveLength(3)
      expect(line.suffix).toBe('all 3 raids')
    }

    // T-04-21-02: none dropped, none shown twice.
    const shown = lines.flatMap((line) => line.rows.map((row) => row.id))
    expect(shown).toHaveLength(15)
    expect(new Set(shown)).toEqual(new Set(rows.map((row) => row.id)))
  })

  it('names the tiers for a need that is ranked in only two of the three', () => {
    const rows = fifteenRowList().filter((row) => !(row.need_key === 'need-3' && row.raid_tier_id === 'tier-b'))
    const lines = needLinesOf(toNeedLines(rows, listTierIds, tierNameById))

    expect(lines).toHaveLength(5)
    expect(lines.find((line) => line.needKey === 'need-3')?.suffix).toBe('Raid A, Raid C')
    expect(lines.find((line) => line.needKey === 'need-1')?.suffix).toBe('all 3 raids')
    expect(lines.flatMap((line) => line.rows)).toHaveLength(14)
  })

  it('keeps one line per rank when a need is ranked at two different ranks', () => {
    const rows = [
      ...fifteenRowList(),
      ...TIERS.map((tier) => ({
        id: `need-1-second@${tier.id}`,
        rank: 44,
        kind: 'need',
        need_key: 'need-1',
        raid_tier_id: tier.id,
      })),
    ]
    const lines = needLinesOf(toNeedLines(rows, listTierIds, tierNameById))
    expect(lines).toHaveLength(6)
    expect(lines.filter((line) => line.needKey === 'need-1').map((line) => line.rank)).toEqual([50, 44])
  })

  it('passes item rows through unchanged and in their original order', () => {
    const items: Row[] = ['i3', 'i1', 'i2'].map((id, index) => ({
      id,
      rank: 30 - index,
      kind: 'item',
      need_key: null,
      raid_tier_id: 'tier-a',
    }))
    const lines = toNeedLines([...items, ...fifteenRowList()], listTierIds, tierNameById)

    const passed = lines.filter((line) => line.type === 'item').map((line) => (line.type === 'item' ? line.row : null))
    expect(passed).toEqual(items)
    // The very same objects, not copies.
    expect(passed[0]).toBe(items[0])
    expect(needLinesOf(lines)).toHaveLength(5)
  })

  it('leaves a Known list untouched: every row comes back as an item row', () => {
    const items: Row[] = [1, 2, 3, 4].map((n) => ({
      id: `k${n}`,
      rank: 40 + n,
      kind: 'item',
      need_key: null,
      raid_tier_id: `tier-${n % 2 ? 'a' : 'b'}`,
    }))
    const lines = toNeedLines(items, listTierIds, tierNameById)
    expect(lines).toHaveLength(4)
    expect(lines.every((line) => line.type === 'item')).toBe(true)
  })

  it('treats rows with no kind as items, as every older reader does', () => {
    const rows = [{ rank: 30 }, { rank: 29, kind: null }]
    const lines = toNeedLines(rows, listTierIds, tierNameById)
    expect(lines.map((line) => line.type)).toEqual(['item', 'item'])
  })

  it('never hides a need row that has no need key: it stays visible as an item row', () => {
    const rows: Row[] = [
      { id: 'odd', rank: 50, kind: 'need', need_key: null, raid_tier_id: 'tier-a' },
      ...fifteenRowList(),
    ]
    const lines = toNeedLines(rows, listTierIds, tierNameById)
    expect(lines.filter((line) => line.type === 'item')).toHaveLength(1)
    const total =
      lines.filter((line) => line.type === 'item').length +
      needLinesOf(lines).reduce((sum, line) => sum + line.rows.length, 0)
    expect(total).toBe(16)
  })

  it('returns nothing for no rows', () => {
    expect(toNeedLines([], listTierIds, tierNameById)).toEqual([])
  })
})

describe('bestScoringRow and the cut (D-28)', () => {
  // Shaped like the Overview's LootPriorityItem: one entry per tier row.
  function priorityRows(): Row[] {
    const rows = fifteenRowList()
    // Need #1 has the three highest scores overall, so a row-level top five
    // would be filled by need #1 alone.
    return rows.map((row, index) => ({
      ...row,
      loot_score: row.need_key === 'need-1' ? 90 - (index % 3) : 60 - Math.floor(index / 3) * 5 - (index % 3),
    }))
  }

  it('a row-level top five is dominated by one need', () => {
    const top = [...priorityRows()].sort((a, b) => (b.loot_score ?? 0) - (a.loot_score ?? 0)).slice(0, 5)
    expect(new Set(top.map((row) => row.need_key)).size).toBeLessThan(5)
  })

  it('grouping before the cut gives five different needs', () => {
    const heads = needLinesOf(toNeedLines(priorityRows(), listTierIds, tierNameById))
      .map((line) => bestScoringRow(line.rows, (row) => row.loot_score ?? 0) as Row)
      .sort((a, b) => (b.loot_score ?? 0) - (a.loot_score ?? 0))
      .slice(0, 5)
    expect(new Set(heads.map((row) => row.need_key)).size).toBe(5)
  })

  it('each line keeps the best score among its tier rows', () => {
    const rows: Row[] = fifteenRowList().map((row) => ({
      ...row,
      loot_score: row.raid_tier_id === 'tier-b' ? 70 : 40,
    }))
    for (const line of needLinesOf(toNeedLines(rows, listTierIds, tierNameById))) {
      const best = bestScoringRow(line.rows, (row) => row.loot_score ?? 0)
      expect(best?.loot_score).toBe(70)
      expect(best?.raid_tier_id).toBe('tier-b')
    }
  })

  it('takes the first row on a tie and nothing from no rows', () => {
    const a = { id: 'a', score: 5 }
    const b = { id: 'b', score: 5 }
    expect(bestScoringRow([a, b], (row) => row.score)).toBe(a)
    expect(bestScoringRow([], () => 0)).toBeUndefined()
  })
})

describe('buildTierContext', () => {
  it('orders tiers by sort_order, then id by plain comparison, and drops repeats', () => {
    const ctx = buildTierContext([
      { id: 'tier-z', name: 'Z', sort_order: 2 },
      { id: 'tier-b', name: 'B', sort_order: 1 },
      { id: 'tier-a', name: 'A', sort_order: 1 },
      { id: 'tier-z', name: 'Z', sort_order: 2 },
      { id: 'tier-n', name: 'N', sort_order: null },
    ])
    expect(ctx.listTierIds).toEqual(['tier-a', 'tier-b', 'tier-z', 'tier-n'])
    expect(ctx.tierNameById.get('tier-z')).toBe('Z')
  })

  it('leaves a nameless tier out of the name map but keeps it in the list', () => {
    const ctx = buildTierContext([{ id: 'tier-a', name: null, sort_order: 1 }])
    expect(ctx.listTierIds).toEqual(['tier-a'])
    expect(ctx.tierNameById.has('tier-a')).toBe(false)
  })
})
