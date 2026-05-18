import { describe, it, expect } from 'vitest'
import { formatRankingsForGargul, type GargulDftItemRankings } from '../gargul-dft'

function r(character_id: string, player_name: string, loot_score: number, class_color = '#ff0000') {
  return { character_id, player_name, loot_score, class_color }
}

function item(wowhead_id: number, rankings: GargulDftItemRankings['rankings']): GargulDftItemRankings {
  return { item: { wowhead_id }, rankings }
}

describe('formatRankingsForGargul', () => {
  it('emits one DFT block per item with descending scores', () => {
    const out = formatRankingsForGargul(
      [item(12345, [r('c1', 'Bob', 50), r('c2', 'Alice', 80)])],
      2
    )
    expect(out).toBe(
      '"12345^DFTFC LootList+ Score:\n|cffff0000 Alice|r: 80.00\n|cffff0000 Bob|r: 50.00;"'
    )
  })

  it('respects decimalPlaces', () => {
    const out = formatRankingsForGargul([item(1, [r('c1', 'Bob', 12.3456)])], 4)
    expect(out).toContain('12.3456')
  })

  it('filters out items with no rankings', () => {
    const out = formatRankingsForGargul([item(1, [])], 2)
    expect(out).toBe('')
  })

  it('filters out items with non-positive wowhead ids', () => {
    const out = formatRankingsForGargul(
      [item(0, [r('c1', 'Bob', 10)]), item(-5, [r('c1', 'Bob', 10)])],
      2
    )
    expect(out).toBe('')
  })

  it('merges multiple rows sharing one wowhead id into a single block (Nether Vortex SSC + TK)', () => {
    // Two loot_items rows for Nether Vortex (wowhead 30183), one per raid.
    // Bob ranked the SSC copy, Alice ranked the TK copy.
    const out = formatRankingsForGargul(
      [
        item(30183, [r('cBob', 'Bob', 40)]),
        item(30183, [r('cAlice', 'Alice', 60)]),
      ],
      2
    )
    // Exactly one block for wowhead 30183, containing both players sorted desc.
    const blocks = out.split('\n"').length
    expect(blocks).toBe(1)
    expect(out).toContain('"30183^DFTFC')
    expect(out.indexOf('Alice')).toBeLessThan(out.indexOf('Bob'))
  })

  it('emits a line per ranking when a player ranks the same wowhead in multiple rows', () => {
    // Bob ranked Nether Vortex (SSC) at one slot and Nether Vortex (TK) at
    // another to signal he wants two drops (weapon + belt recipe). Gargul
    // should show both entries, descending, so he gets prio on both drops.
    const out = formatRankingsForGargul(
      [
        item(30183, [r('cBob', 'Bob', 25)]),
        item(30183, [r('cBob', 'Bob', 75)]),
      ],
      2
    )
    expect(out).toContain('Bob|r: 75.00')
    expect(out).toContain('Bob|r: 25.00')
    expect(out.match(/Bob/g)?.length).toBe(2)
    // Higher score comes first.
    expect(out.indexOf('75.00')).toBeLessThan(out.indexOf('25.00'))
  })

  it('keeps distinct wowhead ids in separate blocks', () => {
    const out = formatRankingsForGargul(
      [
        item(111, [r('c1', 'Bob', 50)]),
        item(222, [r('c2', 'Alice', 60)]),
      ],
      2
    )
    expect(out).toContain('"111^DFTFC')
    expect(out).toContain('"222^DFTFC')
  })

  it('strips the # from class color hex', () => {
    const out = formatRankingsForGargul(
      [item(1, [r('c1', 'Bob', 10, '#abcdef')])],
      2
    )
    expect(out).toContain('|cffabcdef ')
    expect(out).not.toContain('|cff#')
  })
})
