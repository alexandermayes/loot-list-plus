import { describe, it, expect } from 'vitest'
import {
  NEED_ROW_FIXED_ERROR,
  isNeedRow,
  itemIdentityKey,
  keepRankedNeedRows,
  wowheadIdForDisplay,
} from '../item-identity'

describe('itemIdentityKey', () => {
  it('keys a need row by its own id', () => {
    expect(itemIdentityKey({ id: 'n1', wowhead_id: null, kind: 'need' })).toBe('need:n1')
  })

  it('keys an item row by its wowhead id, byte-identical to the legacy key', () => {
    expect(itemIdentityKey({ id: 'i1', wowhead_id: 1234, kind: 'item' })).toBe('1234')
    expect(itemIdentityKey({ id: 'i2', wowhead_id: 1234 })).toBe('1234')
  })

  it('gives an item with no wowhead id no identity', () => {
    expect(itemIdentityKey({ id: 'i3', wowhead_id: null, kind: 'item' })).toBeNull()
  })

  it('gives null and undefined input no identity', () => {
    expect(itemIdentityKey(null)).toBeNull()
    expect(itemIdentityKey(undefined)).toBeNull()
  })

  // DISC-06 adjacency: one need award must never skip another need.
  it('DISC-06 adjacency: two needs of one raider get different keys', () => {
    const a = itemIdentityKey({ id: 'n1', wowhead_id: null, kind: 'need' })
    const b = itemIdentityKey({ id: 'n2', wowhead_id: null, kind: 'need' })
    expect(a).not.toBe(b)
  })

  it('DISC-06 adjacency: the same need_key in two tiers gets different keys', () => {
    // Same need in two raid tiers is two rows with two ids.
    const tierA = itemIdentityKey({ id: 'n1', wowhead_id: null, kind: 'need' })
    const tierB = itemIdentityKey({ id: 'n3', wowhead_id: null, kind: 'need' })
    expect(tierA).not.toBe(tierB)
  })

  it('never keys a need on a wowhead id, even when one is present', () => {
    expect(itemIdentityKey({ id: 'n9', wowhead_id: 555, kind: 'need' })).toBe('need:n9')
  })
})

describe('isNeedRow', () => {
  it('is true only for kind need', () => {
    expect(isNeedRow({ kind: 'need' })).toBe(true)
    expect(isNeedRow({ kind: 'item' })).toBe(false)
    expect(isNeedRow({})).toBe(false)
    expect(isNeedRow({ kind: null })).toBe(false)
    expect(isNeedRow(null)).toBe(false)
    expect(isNeedRow(undefined)).toBe(false)
  })
})

describe('wowheadIdForDisplay', () => {
  it('is null for a need row', () => {
    expect(wowheadIdForDisplay({ wowhead_id: null, kind: 'need' })).toBeNull()
  })

  it('keeps the legacy zero fallback for other rows', () => {
    expect(wowheadIdForDisplay({ wowhead_id: 0 })).toBe(0)
    expect(wowheadIdForDisplay({ wowhead_id: null, kind: 'item' })).toBe(0)
    expect(wowheadIdForDisplay({ wowhead_id: 99 })).toBe(99)
    expect(wowheadIdForDisplay(null)).toBe(0)
  })
})

describe('keepRankedNeedRows', () => {
  const item = { id: 'item-id', kind: 'item' }
  const needA = { id: 'needA-id', kind: 'need' }
  const needB = { id: 'needB-id', kind: 'need' }

  it('keeps every item row and only the ranked need rows, in input order', () => {
    expect(keepRankedNeedRows([item, needA, needB], new Set(['needB-id']))).toEqual([item, needB])
  })

  it('drops every need row for an empty ranked set', () => {
    expect(keepRankedNeedRows([item, needA, needB], new Set())).toEqual([item])
  })

  it('treats a row with no kind as an item', () => {
    const legacy = { id: 'legacy' }
    expect(keepRankedNeedRows([legacy], new Set())).toEqual([legacy])
  })
})

describe('NEED_ROW_FIXED_ERROR', () => {
  it('has no em dash (owner copy rule)', () => {
    expect(NEED_ROW_FIXED_ERROR).toBe('Need rows are fixed and cannot be edited.')
    expect(NEED_ROW_FIXED_ERROR).not.toContain('—')
  })
})
