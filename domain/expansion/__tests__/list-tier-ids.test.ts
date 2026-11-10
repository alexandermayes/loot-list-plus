import { describe, it, expect } from 'vitest'
import { listTierIds } from '@/domain/expansion/list-tier-ids'

const TIERS = [
  { id: 'p1a', phase: 1 },
  { id: 'p1b', phase: 1 },
  { id: 'p2', phase: 2 },
  { id: 'p3', phase: 3 },
  { id: 'p4', phase: 4 },
  { id: 'none', phase: null },
]

describe('listTierIds', () => {
  it('covers only the list phase when phases are not grouped', () => {
    expect(listTierIds(TIERS, 4, null, 1)).toEqual(['p1a', 'p1b'])
    expect(listTierIds(TIERS, 4, null, 3)).toEqual(['p3'])
  })

  it('covers every phase of the list group', () => {
    expect(listTierIds(TIERS, 4, [[2, 3]], 2)).toEqual(['p2', 'p3'])
  })

  it('leaves out phases above the current phase, as the editor does', () => {
    expect(listTierIds(TIERS, 2, [[2, 3]], 2)).toEqual(['p2'])
    expect(listTierIds(TIERS, 2, null, 4)).toEqual([])
  })

  it('covers only its own phase when the list phase is no longer a group start', () => {
    expect(listTierIds(TIERS, 4, [[2, 3]], 3)).toEqual(['p3'])
  })

  it('never includes a tier without a phase', () => {
    expect(listTierIds(TIERS, 4, [[1, 2, 3, 4]], 1)).toEqual(['p1a', 'p1b', 'p2', 'p3', 'p4'])
  })
})
