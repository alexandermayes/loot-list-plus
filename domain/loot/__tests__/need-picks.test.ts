// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  MAX_NEED_TIER_SLOTS,
  NEED_PICK_COUNT,
  NEED_PICK_RANKS,
  assignTierSlots,
  buildNeedRankings,
  describeNeedGroupTiers,
  groupNeedRowsByRank,
  isDiscoveryPhaseGroup,
  positionForRank,
  rankForPosition,
  readNeedPositions,
} from '@/domain/loot/need-picks'

// Why these cases: the picker, the bootstrap route and every reader must agree
// on which rank and slot a pick lands in (D-01, D-02), and a tier's slot must
// never move once an award lock sits on it (D-02 amended, prohibition on slot
// drift). All ids below are synthetic.

const KEYS = [
  'two-hand-weapon.strength',
  'trinket.physical',
  'chest.plate.strength',
  'ring.physical',
  'legs.plate.strength',
]

const TIER_A = '00000000-0000-4000-8000-00000000000a'
const TIER_B = '00000000-0000-4000-8000-00000000000b'
const TIER_C = '00000000-0000-4000-8000-00000000000c'

interface NeedRow {
  need_key: string | null
  raid_tier_id: string | null
  kind: string | null
}

const rowId = (tierId: string, needKey: string) => `row:${tierId}:${needKey}`

function rowsFor(tierIds: readonly string[], keys: readonly string[]): Map<string, NeedRow> {
  const rows = new Map<string, NeedRow>()
  for (const tierId of tierIds) {
    for (const key of keys) {
      rows.set(rowId(tierId, key), { need_key: key, raid_tier_id: tierId, kind: 'need' })
    }
  }
  return rows
}

const THREE_SLOTS = { [TIER_A]: 1, [TIER_B]: 2, [TIER_C]: 3 }

describe('rankForPosition and positionForRank (D-01)', () => {
  it('maps picker positions 0 to 4 to ranks 50 to 46', () => {
    expect([0, 1, 2, 3, 4].map(rankForPosition)).toEqual([50, 49, 48, 47, 46])
    expect(NEED_PICK_RANKS).toEqual([50, 49, 48, 47, 46])
    expect(NEED_PICK_COUNT).toBe(5)
  })

  it('returns null for a position outside the picker', () => {
    expect(rankForPosition(5)).toBeNull()
    expect(rankForPosition(-1)).toBeNull()
    expect(rankForPosition(1.5)).toBeNull()
    expect(rankForPosition(Number.NaN)).toBeNull()
  })

  it('maps ranks back to positions and refuses any other rank', () => {
    expect([50, 49, 48, 47, 46].map(positionForRank)).toEqual([0, 1, 2, 3, 4])
    expect(positionForRank(46)).toBe(4)
    expect(positionForRank(45)).toBeNull()
    expect(positionForRank(51)).toBeNull()
  })
})

describe('assignTierSlots (D-02 amended, DISC-05)', () => {
  const tiers = [
    { id: 'a', sort_order: 2, list_mode: 'discovery' },
    { id: 'b', sort_order: 1, list_mode: 'discovery' },
    { id: 'c', sort_order: 3, list_mode: 'discovery' },
    { id: 'known', sort_order: 0, list_mode: 'known' },
  ]

  it('orders Discovery tiers by sort_order and ignores Known tiers', () => {
    expect(assignTierSlots(tiers)).toEqual({ b: 1, a: 2, c: 3 })
  })

  it('returns the same map whatever the input order', () => {
    const shuffled = [tiers[2], tiers[3], tiers[0], tiers[1]]
    expect(assignTierSlots(shuffled)).toEqual(assignTierSlots(tiers))
  })

  it('ignores is_guild_active, so turning a tier off never moves a slot', () => {
    const flipped = tiers.map((tier, index) => ({ ...tier, is_guild_active: index % 2 === 0 }))
    const allOff = tiers.map((tier) => ({ ...tier, is_guild_active: false }))
    expect(assignTierSlots(flipped)).toEqual({ b: 1, a: 2, c: 3 })
    expect(assignTierSlots(allOff)).toEqual({ b: 1, a: 2, c: 3 })
  })

  it('breaks a sort_order tie by id code units, not by locale', () => {
    const tied = [
      { id: 'b', sort_order: 1, list_mode: 'discovery' },
      { id: 'B', sort_order: 1, list_mode: 'discovery' },
      { id: 'a', sort_order: 1, list_mode: 'discovery' },
    ]
    // Code units put 'B' (66) before 'a' (97) before 'b' (98); a locale
    // compare would put 'a' first.
    expect(assignTierSlots(tied)).toEqual({ B: 1, a: 2, b: 3 })
    expect(assignTierSlots([...tied].reverse())).toEqual({ B: 1, a: 2, b: 3 })
  })

  it('sorts a null sort_order after every number', () => {
    const withNull = [
      { id: 'a', sort_order: null, list_mode: 'discovery' },
      { id: 'b', sort_order: 5, list_mode: 'discovery' },
      { id: 'c', sort_order: 1, list_mode: 'discovery' },
    ]
    expect(assignTierSlots(withNull)).toEqual({ c: 1, b: 2, a: 3 })
  })

  it('gives a single Discovery tier slot 1', () => {
    expect(assignTierSlots([{ id: 'only', sort_order: 7, list_mode: 'discovery' }])).toEqual({ only: 1 })
  })

  it('returns null for zero Discovery tiers and for more than eight', () => {
    expect(assignTierSlots([])).toBeNull()
    expect(assignTierSlots([{ id: 'k', sort_order: 1, list_mode: 'known' }])).toBeNull()
    const nine = Array.from({ length: MAX_NEED_TIER_SLOTS + 1 }, (_, index) => ({
      id: `t${index}`,
      sort_order: index + 1,
      list_mode: 'discovery',
    }))
    expect(assignTierSlots(nine)).toBeNull()
    expect(assignTierSlots(nine.slice(0, MAX_NEED_TIER_SLOTS))).not.toBeNull()
  })

  it('keeps a tier id of __proto__ as an ordinary key', () => {
    const slots = assignTierSlots([
      { id: '__proto__', sort_order: 1, list_mode: 'discovery' },
      { id: 'x', sort_order: 2, list_mode: 'discovery' },
    ])
    expect(Object.keys(slots ?? {})).toEqual(['__proto__', 'x'])
    expect(Object.getPrototypeOf(slots)).toBe(Object.prototype)
  })
})

describe('isDiscoveryPhaseGroup (D-12)', () => {
  it('is false for an empty list', () => {
    expect(isDiscoveryPhaseGroup([])).toBe(false)
  })

  it('is true when every active tier is Discovery', () => {
    expect(isDiscoveryPhaseGroup([{ list_mode: 'discovery' }, { list_mode: 'discovery' }])).toBe(true)
  })

  it('is false for a mixed group or a tier with no mode', () => {
    expect(isDiscoveryPhaseGroup([{ list_mode: 'discovery' }, { list_mode: 'known' }])).toBe(false)
    expect(isDiscoveryPhaseGroup([{ list_mode: 'discovery' }, { list_mode: null }])).toBe(false)
    expect(isDiscoveryPhaseGroup([{ list_mode: 'known' }])).toBe(false)
  })
})

describe('buildNeedRankings (D-02, DISC-05)', () => {
  const needRowFor = (tierId: string, needKey: string) => rowId(tierId, needKey)

  it('fans five picks out to 15 rank-slot entries', () => {
    const { rankings, missing } = buildNeedRankings({
      positions: KEYS,
      tierSlots: THREE_SLOTS,
      needRowFor,
    })
    expect(missing).toEqual([])
    expect(Object.keys(rankings)).toHaveLength(15)
    expect(rankings['50-1']).toBe(rowId(TIER_A, KEYS[0]))
    expect(rankings['50-2']).toBe(rowId(TIER_B, KEYS[0]))
    expect(rankings['50-3']).toBe(rowId(TIER_C, KEYS[0]))
    expect(rankings['46-1']).toBe(rowId(TIER_A, KEYS[4]))
    expect(rankings['46-3']).toBe(rowId(TIER_C, KEYS[4]))
  })

  it('reports a tier that lacks a need row and leaves that entry out', () => {
    const { rankings, missing } = buildNeedRankings({
      positions: KEYS,
      tierSlots: THREE_SLOTS,
      needRowFor: (tierId, needKey) =>
        tierId === TIER_B && needKey === KEYS[2] ? undefined : rowId(tierId, needKey),
    })
    expect(missing).toEqual([{ tierId: TIER_B, needKey: KEYS[2] }])
    expect(Object.keys(rankings)).toHaveLength(14)
    expect(rankings['48-2']).toBeUndefined()
  })

  it('skips null positions', () => {
    const { rankings, missing } = buildNeedRankings({
      positions: [KEYS[0], null, KEYS[2], null, null],
      tierSlots: THREE_SLOTS,
      needRowFor,
    })
    expect(missing).toEqual([])
    expect(Object.keys(rankings).sort()).toEqual(['48-1', '48-2', '48-3', '50-1', '50-2', '50-3'])
  })

  it('ignores positions past the fifth', () => {
    const { rankings } = buildNeedRankings({
      positions: [...KEYS, 'neck.physical'],
      tierSlots: { [TIER_A]: 1 },
      needRowFor,
    })
    expect(Object.keys(rankings)).toHaveLength(5)
  })
})

describe('readNeedPositions (round trip, P9)', () => {
  const tierIds = [TIER_A, TIER_B, TIER_C]
  const rowsById = rowsFor(tierIds, KEYS)
  const built = buildNeedRankings({
    positions: KEYS,
    tierSlots: THREE_SLOTS,
    needRowFor: (tierId, needKey) => rowId(tierId, needKey),
  })

  it('reads the same five keys back in order', () => {
    const read = readNeedPositions({ rankings: built.rankings, rowsById, tierIds })
    expect(read.positions).toEqual(KEYS)
    expect(read.consistent).toBe(true)
    expect(read.missingTiers).toEqual([])
  })

  it('leaves unfilled positions null', () => {
    const partial = buildNeedRankings({
      positions: [KEYS[0], null, KEYS[2], null, null],
      tierSlots: THREE_SLOTS,
      needRowFor: (tierId, needKey) => rowId(tierId, needKey),
    })
    const read = readNeedPositions({ rankings: partial.rankings, rowsById, tierIds })
    expect(read.positions).toEqual([KEYS[0], null, KEYS[2], null, null])
    expect(read.consistent).toBe(true)
  })

  it('is inconsistent when two different keys share one rank', () => {
    const rankings = { ...built.rankings, '50-2': rowId(TIER_B, KEYS[1]) }
    const read = readNeedPositions({ rankings, rowsById, tierIds })
    expect(read.consistent).toBe(false)
  })

  it('reports a tier that is absent from a filled rank', () => {
    const rankings = { ...built.rankings }
    delete rankings['49-3']
    const read = readNeedPositions({ rankings, rowsById, tierIds })
    expect(read.missingTiers).toEqual([TIER_C])
    expect(read.positions).toEqual(KEYS)
  })

  it('reports a tier that has no rows at all', () => {
    const twoTiers = buildNeedRankings({
      positions: KEYS,
      tierSlots: { [TIER_A]: 1, [TIER_B]: 2 },
      needRowFor: (tierId, needKey) => rowId(tierId, needKey),
    })
    const read = readNeedPositions({ rankings: twoTiers.rankings, rowsById, tierIds })
    expect(read.missingTiers).toEqual([TIER_C])
  })

  it('is inconsistent when an item row sits at a need rank', () => {
    const rowsWithItem = new Map(rowsById)
    rowsWithItem.set('item-1', { need_key: null, raid_tier_id: TIER_A, kind: 'item' })
    const read = readNeedPositions({
      rankings: { ...built.rankings, '50-1': 'item-1' },
      rowsById: rowsWithItem,
      tierIds,
    })
    expect(read.consistent).toBe(false)
  })

  it('is inconsistent when a ranked id has no row to resolve', () => {
    const read = readNeedPositions({
      rankings: { ...built.rankings, '50-1': 'unknown-id' },
      rowsById,
      tierIds,
    })
    expect(read.consistent).toBe(false)
  })

  it('ignores entries outside the need ranks and malformed keys', () => {
    const rowsWithItem = new Map(rowsById)
    rowsWithItem.set('item-2', { need_key: null, raid_tier_id: null, kind: 'item' })
    const read = readNeedPositions({
      rankings: { ...built.rankings, '20-1': 'item-2', garbage: 'item-2' },
      rowsById: rowsWithItem,
      tierIds,
    })
    expect(read.positions).toEqual(KEYS)
    expect(read.consistent).toBe(true)
  })

  it('reads an empty list as five empty positions', () => {
    const read = readNeedPositions({ rankings: {}, rowsById, tierIds })
    expect(read.positions).toEqual([null, null, null, null, null])
    expect(read.consistent).toBe(true)
    expect(read.missingTiers).toEqual([])
  })
})

describe('groupNeedRowsByRank (D-28)', () => {
  const tierIds = [TIER_A, TIER_B, TIER_C]
  const rows = buildRows()

  function buildRows() {
    const out: Array<{ rank: number; need_key: string; raid_tier_id: string; kind: string }> = []
    KEYS.forEach((key, index) => {
      for (const tierId of tierIds) {
        out.push({ rank: 50 - index, need_key: key, raid_tier_id: tierId, kind: 'need' })
      }
    })
    return out
  }

  it('groups 15 rows into 5 groups, rank 50 first, each with three tier ids', () => {
    const groups = groupNeedRowsByRank(rows)
    expect(groups).toHaveLength(5)
    expect(groups.map((group) => group.rank)).toEqual([50, 49, 48, 47, 46])
    expect(groups.map((group) => group.needKey)).toEqual(KEYS)
    for (const group of groups) {
      expect(group.tierIds).toEqual(tierIds)
      expect(group.rows).toHaveLength(3)
    }
  })

  it('does not group item rows', () => {
    const groups = groupNeedRowsByRank([
      ...rows,
      { rank: 30, need_key: null as unknown as string, raid_tier_id: TIER_A, kind: 'item' },
      { rank: 29, kind: 'item' } as never,
    ])
    expect(groups).toHaveLength(5)
  })

  it('splits two different needs at one rank into two groups ordered by key', () => {
    const groups = groupNeedRowsByRank([
      { rank: 50, need_key: 'trinket.physical', raid_tier_id: TIER_A, kind: 'need' },
      { rank: 50, need_key: 'ring.physical', raid_tier_id: TIER_B, kind: 'need' },
    ])
    expect(groups.map((group) => group.needKey)).toEqual(['ring.physical', 'trinket.physical'])
  })

  it('lists a tier once however many rows it has', () => {
    const groups = groupNeedRowsByRank([
      { rank: 50, need_key: 'ring.physical', raid_tier_id: TIER_A, kind: 'need' },
      { rank: 50, need_key: 'ring.physical', raid_tier_id: TIER_A, kind: 'need' },
    ])
    expect(groups[0].tierIds).toEqual([TIER_A])
    expect(groups[0].rows).toHaveLength(2)
  })
})

describe('describeNeedGroupTiers (D-28)', () => {
  it('is allTiers when the group covers every tier of the list', () => {
    expect(describeNeedGroupTiers({ tierIds: ['a', 'b', 'c'] }, ['a', 'b', 'c'])).toEqual({
      allTiers: true,
      count: 3,
    })
  })

  it('is not allTiers when a tier is missing', () => {
    expect(describeNeedGroupTiers({ tierIds: ['a', 'b'] }, ['a', 'b', 'c'])).toEqual({
      allTiers: false,
      count: 2,
    })
  })

  it('is never allTiers for an empty tier list', () => {
    expect(describeNeedGroupTiers({ tierIds: [] }, [])).toEqual({ allTiers: false, count: 0 })
  })

  it('does not count a tier the list no longer has', () => {
    expect(describeNeedGroupTiers({ tierIds: ['a', 'gone'] }, ['a', 'b'])).toEqual({
      allTiers: false,
      count: 1,
    })
  })
})
