import { describe, it, expect, vi } from 'vitest'
import {
  FACTION_ITEM_ALIASES,
  wowheadIdCandidates,
  findByWowheadId,
  resolveByWowheadId,
} from '../faction-item-aliases'

describe('FACTION_ITEM_ALIASES', () => {
  it('maps exactly the two Classic faction-variant quest heads (GH #277)', () => {
    expect(FACTION_ITEM_ALIASES).toEqual({ 18422: 18423, 19002: 19003 })
  })

  it('is frozen', () => {
    expect(Object.isFrozen(FACTION_ITEM_ALIASES)).toBe(true)
  })
})

describe('wowheadIdCandidates', () => {
  it('returns the Horde id then its Alliance alias', () => {
    expect(wowheadIdCandidates(19002)).toEqual([19002, 19003])
    expect(wowheadIdCandidates(18422)).toEqual([18422, 18423])
  })

  it('returns only the given id for an Alliance catalog id — aliases never point back', () => {
    expect(wowheadIdCandidates(19003)).toEqual([19003])
    expect(wowheadIdCandidates(18423)).toEqual([18423])
  })

  it('returns only the given id for an unrelated id', () => {
    expect(wowheadIdCandidates(12345)).toEqual([12345])
  })
})

describe('findByWowheadId', () => {
  it('returns the aliased row when only the Alliance row is present', () => {
    const rows = [{ wowhead_id: 19003, name: 'Head of Nefarian' }]
    expect(findByWowheadId(rows, 19002)).toBe(rows[0])
  })

  it('prefers the exact id when both rows are present', () => {
    const rows = [
      { wowhead_id: 19003, name: 'Alliance' },
      { wowhead_id: 19002, name: 'Horde' },
    ]
    expect(findByWowheadId(rows, 19002)).toBe(rows[1])
  })

  it('returns undefined on no match', () => {
    const rows = [{ wowhead_id: 19003, name: 'Head of Nefarian' }]
    expect(findByWowheadId(rows, 99999)).toBeUndefined()
  })

  it('ignores rows whose wowhead_id is null', () => {
    const rows = [{ wowhead_id: null, name: 'No wowhead id' }]
    expect(findByWowheadId(rows, 19002)).toBeUndefined()
  })
})

describe('resolveByWowheadId', () => {
  it('tries the exact id then the alias, returning the alias hit', async () => {
    const lookup = vi.fn(async (candidate: number) => (candidate === 19003 ? { id: 'item-19003' } : null))
    const result = await resolveByWowheadId(19002, lookup)
    expect(result).toEqual({ id: 'item-19003' })
    expect(lookup).toHaveBeenNthCalledWith(1, 19002)
    expect(lookup).toHaveBeenNthCalledWith(2, 19003)
    expect(lookup).toHaveBeenCalledTimes(2)
  })

  it('calls lookup exactly once when the exact id hits', async () => {
    const lookup = vi.fn(async (candidate: number) => (candidate === 19002 ? { id: 'item-19002' } : null))
    const result = await resolveByWowheadId(19002, lookup)
    expect(result).toEqual({ id: 'item-19002' })
    expect(lookup).toHaveBeenCalledTimes(1)
  })

  it('calls lookup exactly once for a non-alias id', async () => {
    const lookup = vi.fn(async () => null)
    const result = await resolveByWowheadId(99999, lookup)
    expect(result).toBeNull()
    expect(lookup).toHaveBeenCalledTimes(1)
  })

  it('returns null when every candidate misses', async () => {
    const lookup = vi.fn(async () => null)
    const result = await resolveByWowheadId(19002, lookup)
    expect(result).toBeNull()
    expect(lookup).toHaveBeenCalledTimes(2)
  })
})
