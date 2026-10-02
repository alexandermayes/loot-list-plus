import { describe, it, expect } from 'vitest'
import {
  MAX_AWARD_COPIES,
  assignAwardCopies,
  isValidAwardCopy,
  nextAwardCopy,
  readAwardResult,
} from '../award-copies'

const linked = (overrides: Record<string, unknown> = {}) => ({
  loot_item_id: 'item-1',
  character_id: 'char-1',
  raid_event_id: 'ev-1',
  ...overrides,
})

describe('isValidAwardCopy', () => {
  it('accepts whole numbers from 1 to 10', () => {
    expect(MAX_AWARD_COPIES).toBe(10)
    expect(isValidAwardCopy(1)).toBe(true)
    expect(isValidAwardCopy(10)).toBe(true)
  })

  it('rejects anything else', () => {
    for (const value of [0, 11, 1.5, '2', null, undefined, NaN, -1]) {
      expect(isValidAwardCopy(value)).toBe(false)
    }
  })
})

describe('assignAwardCopies', () => {
  it('one item is copy 1', () => {
    expect(assignAwardCopies([linked()])).toEqual([1])
  })

  it('two items with one item, raider and night are copies 1 and 2', () => {
    expect(assignAwardCopies([linked(), linked()])).toEqual([1, 2])
  })

  it('two different raiders are each copy 1', () => {
    expect(assignAwardCopies([linked(), linked({ character_id: 'char-2' })])).toEqual([1, 1])
  })

  it('unlinked repeats are always copy 1', () => {
    expect(assignAwardCopies([linked({ raid_event_id: null }), linked({ raid_event_id: null })])).toEqual([1, 1])
    expect(assignAwardCopies([linked({ character_id: null }), linked({ character_id: undefined })])).toEqual([1, 1])
  })

  it('an unlinked item keeps copy 1 even when it asks for another', () => {
    expect(assignAwardCopies([linked({ raid_event_id: null, award_copy: 3 })])).toEqual([1])
  })

  it('an explicit copy is kept and implicit items take the lowest free numbers', () => {
    expect(assignAwardCopies([linked({ award_copy: 2 }), linked()])).toEqual([2, 1])
    expect(assignAwardCopies([linked(), linked({ award_copy: 3 }), linked()])).toEqual([1, 3, 2])
    expect(assignAwardCopies([linked(), linked(), linked({ award_copy: 1 })])).toEqual([2, 3, 1])
  })

  it('an invalid explicit copy is numbered like an implicit one', () => {
    expect(assignAwardCopies([linked({ award_copy: 0 }), linked({ award_copy: '2' })])).toEqual([1, 2])
  })

  it('groups are numbered independently and keep input order', () => {
    expect(
      assignAwardCopies([
        linked(),
        linked({ loot_item_id: 'item-2' }),
        linked(),
        linked({ raid_event_id: 'ev-2' }),
        linked({ loot_item_id: 'item-2' }),
      ]),
    ).toEqual([1, 1, 2, 1, 2])
  })
})

describe('nextAwardCopy', () => {
  it('is 1 with no stored copy, highest + 1 otherwise, and null past the cap', () => {
    expect(nextAwardCopy(undefined)).toBe(1)
    expect(nextAwardCopy(null)).toBe(1)
    expect(nextAwardCopy(1)).toBe(2)
    expect(nextAwardCopy(9)).toBe(10)
    expect(nextAwardCopy(10)).toBeNull()
  })
})

describe('readAwardResult', () => {
  it('reads success as awarded', () => {
    expect(readAwardResult({ results: [{ index: 0, success: true }] })).toEqual({ kind: 'awarded' })
  })

  it('reads a duplicate with its next copy', () => {
    expect(readAwardResult({ results: [{ index: 0, success: false, error: 'duplicate', next_award_copy: 2 }] })).toEqual({
      kind: 'duplicate',
      nextAwardCopy: 2,
    })
  })

  it('reads a duplicate at the cap as a null next copy', () => {
    expect(readAwardResult({ results: [{ success: false, error: 'duplicate', next_award_copy: null }] })).toEqual({
      kind: 'duplicate',
      nextAwardCopy: null,
    })
  })

  it('reads a duplicate with no next copy key as unknown', () => {
    expect(readAwardResult({ results: [{ success: false, error: 'duplicate' }] })).toEqual({
      kind: 'duplicate',
      nextAwardCopy: undefined,
    })
  })

  it('reads any other error as failed with its text', () => {
    expect(readAwardResult({ results: [{ success: false, error: 'boom' }] })).toEqual({ kind: 'failed', message: 'boom' })
  })

  it('reads a missing results array as failed with a fallback message', () => {
    expect(readAwardResult({})).toEqual({ kind: 'failed', message: 'Unknown error' })
    expect(readAwardResult(null)).toEqual({ kind: 'failed', message: 'Unknown error' })
    expect(readAwardResult({ results: [] })).toEqual({ kind: 'failed', message: 'Unknown error' })
  })
})
