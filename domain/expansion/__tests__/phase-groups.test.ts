import { describe, it, expect } from 'vitest'
import {
  resolveListPhases,
  resolvePhasesSharingGroup,
  resolveUnlockedPhaseGroups,
} from '@/domain/expansion/phase-groups'

describe('resolveUnlockedPhaseGroups', () => {
  it('gives each unlocked phase its own group when nothing is merged', () => {
    expect(resolveUnlockedPhaseGroups(null, [1, 2, 2, 3], 3)).toEqual([
      { canonicalPhase: 1, phases: [1] },
      { canonicalPhase: 2, phases: [2] },
      { canonicalPhase: 3, phases: [3] },
    ])
  })

  it('hides phases past the current phase', () => {
    expect(resolveUnlockedPhaseGroups(null, [1, 2, 3, 4], 2)).toEqual([
      { canonicalPhase: 1, phases: [1] },
      { canonicalPhase: 2, phases: [2] },
    ])
  })

  it('ignores tiers with no phase', () => {
    expect(resolveUnlockedPhaseGroups(null, [null, undefined, 1], 1)).toEqual([
      { canonicalPhase: 1, phases: [1] },
    ])
  })

  it('trims a merged group to the phases unlocked so far', () => {
    expect(resolveUnlockedPhaseGroups([[2, 3]], [1, 2, 3], 2)).toEqual([
      { canonicalPhase: 1, phases: [1] },
      { canonicalPhase: 2, phases: [2] },
    ])
  })
})

describe('resolveListPhases', () => {
  // regression for #484
  it('returns every phase of a merged group for its canonical phase', () => {
    expect(resolveListPhases(2, [[2, 3]], [1, 2, 2, 3, 3], 3)).toEqual([2, 3])
  })

  it('returns the single phase when phases are not merged', () => {
    expect(resolveListPhases(2, null, [1, 2, 3], 3)).toEqual([2])
  })

  it('leaves out a grouped phase that is not unlocked yet', () => {
    expect(resolveListPhases(2, [[2, 3]], [2, 3], 2)).toEqual([2])
  })

  it('falls back to the phase itself when it is not a canonical phase', () => {
    // 3 is inside the 2+3 group, so it is not a list key of its own.
    expect(resolveListPhases(3, [[2, 3]], [2, 3], 3)).toEqual([3])
    // Past the current phase: no unlocked group exists for it.
    expect(resolveListPhases(5, null, [1, 5], 3)).toEqual([5])
  })
})

describe('resolvePhasesSharingGroup', () => {
  it('returns the whole group from any member phase', () => {
    expect(resolvePhasesSharingGroup(2, [[1, 2]], [1, 2], 2)).toEqual([1, 2])
    expect(resolvePhasesSharingGroup(1, [[1, 2]], [1, 2], 2)).toEqual([1, 2])
  })

  it('stops at the current phase', () => {
    expect(resolvePhasesSharingGroup(2, [[2, 3]], [2, 3], 2)).toEqual([2])
  })

  it('falls back to the phase itself', () => {
    expect(resolvePhasesSharingGroup(2, null, [1, 2], 2)).toEqual([2])
    expect(resolvePhasesSharingGroup(4, null, [1, 4], 2)).toEqual([4])
  })
})
