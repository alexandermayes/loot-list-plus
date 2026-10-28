import { describe, it, expect } from 'vitest'
import {
  shouldLockForReason,
  pickLockTarget,
  findLockViolations,
  lockViolationMessage,
  lockedRankTitle,
  LOCKED_RANK_LABEL,
  type LockedPosition,
} from '../slot-locks'

const LOCKED = 'item-locked'
const OTHER = 'item-other'
const THIRD = 'item-third'

describe('shouldLockForReason', () => {
  it.each(['', 'score', 'loot_council', 'override', null, undefined])('locks for %j', reason => {
    expect(shouldLockForReason(reason)).toBe(true)
  })

  it.each(['offspec', 'roll', 'something'])('does not lock for %j', reason => {
    expect(shouldLockForReason(reason)).toBe(false)
  })
})

describe('pickLockTarget', () => {
  const rows = [
    { rank: 10, slot: 1, loot_item_id: LOCKED },
    { rank: 30, slot: 1, loot_item_id: LOCKED },
    { rank: 20, slot: 1, loot_item_id: OTHER },
    { rank: 5, slot: 1, loot_item_id: LOCKED },
  ]

  it('copy 1 picks the highest rank of that item', () => {
    expect(pickLockTarget(rows, LOCKED, 1)).toEqual({ rank: 30, slot: 1, loot_item_id: LOCKED })
  })

  it('copy 2 picks the second-highest rank', () => {
    expect(pickLockTarget(rows, LOCKED, 2)).toEqual({ rank: 10, slot: 1, loot_item_id: LOCKED })
  })

  it('ignores rows of other items', () => {
    expect(pickLockTarget(rows, OTHER, 1)).toEqual({ rank: 20, slot: 1, loot_item_id: OTHER })
  })

  it('picks slot 1 before slot 2 when two rows share a rank', () => {
    const shared = [
      { rank: 12, slot: 2, loot_item_id: LOCKED },
      { rank: 12, slot: 1, loot_item_id: LOCKED },
    ]
    expect(pickLockTarget(shared, LOCKED, 1)?.slot).toBe(1)
    expect(pickLockTarget(shared, LOCKED, 2)?.slot).toBe(2)
  })

  it('gives null when the copy number is beyond the rows held', () => {
    const two = [
      { rank: 12, slot: 1, loot_item_id: LOCKED },
      { rank: 8, slot: 1, loot_item_id: LOCKED },
    ]
    expect(pickLockTarget(two, LOCKED, 3)).toBeNull()
  })

  it.each([0, 1.5, Number.NaN, -1])('gives null for awardCopy %s', awardCopy => {
    expect(pickLockTarget(rows, LOCKED, awardCopy)).toBeNull()
  })

  it('gives null with no rows or no rows of the item', () => {
    expect(pickLockTarget([], LOCKED, 1)).toBeNull()
    expect(pickLockTarget(rows, THIRD, 1)).toBeNull()
  })

  it('falls back to the highest-ranked unlocked row when the numbered row is locked', () => {
    const picked = pickLockTarget(rows, LOCKED, 1, new Set(['30-1']))
    expect(picked).toEqual({ rank: 10, slot: 1, loot_item_id: LOCKED })
  })

  it('gives null when every row of the item is already locked', () => {
    expect(pickLockTarget(rows, LOCKED, 1, new Set(['30-1', '10-1', '5-1']))).toBeNull()
  })

  it('does not reorder the input array', () => {
    const copy = rows.map(row => ({ ...row }))
    pickLockTarget(copy, LOCKED, 2)
    expect(copy).toEqual(rows)
  })
})

describe('findLockViolations', () => {
  const locks: LockedPosition[] = [{ rank: 50, slot: 1, loot_item_id: LOCKED, item_name: 'Locked Item' }]

  it('gives no violations when the locked item is kept', () => {
    const live = [
      { rank: 50, slot: 1, loot_item_id: LOCKED },
      { rank: 49, slot: 1, loot_item_id: OTHER },
    ]
    expect(findLockViolations(locks, live)).toEqual([])
  })

  it('flags a moved item', () => {
    const live = [{ rank: 48, slot: 1, loot_item_id: LOCKED }]
    expect(findLockViolations(locks, live)).toEqual([{ rank: 50, slot: 1, item_name: 'Locked Item' }])
  })

  it('flags a dropped item', () => {
    expect(findLockViolations(locks, [{ rank: 49, slot: 1, loot_item_id: OTHER }])).toEqual([
      { rank: 50, slot: 1, item_name: 'Locked Item' },
    ])
  })

  it('flags a replaced item', () => {
    const live = [{ rank: 50, slot: 1, loot_item_id: THIRD }]
    expect(findLockViolations(locks, live)).toEqual([{ rank: 50, slot: 1, item_name: 'Locked Item' }])
  })

  it('compares string rank and slot numerically', () => {
    expect(findLockViolations(locks, [{ rank: '50', slot: '1', loot_item_id: LOCKED }])).toEqual([])
  })

  it('orders violations rank descending then slot ascending', () => {
    const many: LockedPosition[] = [
      { rank: 10, slot: 1, loot_item_id: LOCKED, item_name: 'A' },
      { rank: 30, slot: 2, loot_item_id: OTHER, item_name: 'B' },
      { rank: 30, slot: 1, loot_item_id: THIRD, item_name: 'C' },
    ]
    expect(findLockViolations(many, [])).toEqual([
      { rank: 30, slot: 1, item_name: 'C' },
      { rank: 30, slot: 2, item_name: 'B' },
      { rank: 10, slot: 1, item_name: 'A' },
    ])
  })

  it('gives no violations without locks', () => {
    expect(findLockViolations([], [{ rank: 1, slot: 1, loot_item_id: LOCKED }])).toEqual([])
  })
})

describe('lockViolationMessage', () => {
  it('names the rank and the item', () => {
    expect(lockViolationMessage({ rank: 50, item_name: 'Locked Item' })).toBe('Rank 50 is locked to Locked Item')
  })
})

describe('lockedRankTitle', () => {
  it('formats the lock date in the en-US short format', () => {
    expect(lockedRankTitle('2026-10-24T12:00:00Z')).toBe('Awarded from this rank on Oct 24, 2026. Locked for this tier.')
  })

  it('exposes the accessible label', () => {
    expect(LOCKED_RANK_LABEL).toBe('Locked rank')
  })
})
