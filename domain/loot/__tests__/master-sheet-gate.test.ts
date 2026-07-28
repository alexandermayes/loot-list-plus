import { describe, it, expect } from 'vitest'
import { allowedMasterSheetTierIds, type GateTier, type GateExpansion } from '../master-sheet-gate'

const EXP = 'expansion-1'

function tier(id: string, phase: number, visible = true, expansionId: string | null = EXP): GateTier {
  return { id, phase, master_sheet_visible: visible, expansion_id: expansionId }
}

function expansion(overrides: Partial<GateExpansion> = {}): GateExpansion {
  return {
    id: EXP,
    phaseGroups: null,
    availablePhases: [1, 2, 3],
    approvedPhases: [],
    ...overrides,
  }
}

describe('allowedMasterSheetTierIds', () => {
  it('allows a phase the raider has an approved list for', () => {
    const allowed = allowedMasterSheetTierIds(
      [tier('t3', 3)],
      [expansion({ approvedPhases: [3] })],
    )
    expect([...allowed]).toEqual(['t3'])
  })

  it('does NOT let an approved earlier-phase list unlock a later phase (GH #202)', () => {
    // The actual reported bug: an approved P1 list opened the P3 master sheet.
    const allowed = allowedMasterSheetTierIds(
      [tier('t1', 1), tier('t3', 3)],
      [expansion({ approvedPhases: [1] })],
    )
    expect([...allowed]).toEqual(['t1'])
  })

  it('denies every phase when the raider has no approved list at all', () => {
    const allowed = allowedMasterSheetTierIds(
      [tier('t1', 1), tier('t2', 2), tier('t3', 3)],
      [expansion({ approvedPhases: [] })],
    )
    expect(allowed.size).toBe(0)
  })

  it('denies a hidden tier even when the raider has an approved list for it', () => {
    const allowed = allowedMasterSheetTierIds(
      [tier('t3', 3, false)],
      [expansion({ approvedPhases: [3] })],
    )
    expect(allowed.size).toBe(0)
  })

  it('honours merged groups: an approved list on the canonical phase unlocks the group', () => {
    // Phases 2 and 3 merged: submissions are rewritten to the canonical (2),
    // so the raider's approved row sits on 2 while they view the P3 tier.
    const allowed = allowedMasterSheetTierIds(
      [tier('t2', 2), tier('t3', 3)],
      [expansion({ phaseGroups: [[2, 3]], approvedPhases: [2] })],
    )
    expect([...allowed].sort()).toEqual(['t2', 't3'])
  })

  it('does not leak across group boundaries', () => {
    const allowed = allowedMasterSheetTierIds(
      [tier('t1', 1), tier('t3', 3)],
      [expansion({ phaseGroups: [[2, 3]], approvedPhases: [1] })],
    )
    expect([...allowed]).toEqual(['t1'])
  })

  it('resolves merged groups from the expansion phase list, not the requested tiers', () => {
    // Only the P3 tier is requested. If availablePhases were derived from the
    // request, resolvePhaseGroups() would collapse [2,3] to [3] and wrongly
    // deny a raider whose approved list is on phase 2.
    const allowed = allowedMasterSheetTierIds(
      [tier('t3', 3)],
      [expansion({ phaseGroups: [[2, 3]], availablePhases: [1, 2, 3], approvedPhases: [2] })],
    )
    expect([...allowed]).toEqual(['t3'])
  })

  it('scopes approvals per expansion', () => {
    const other = 'expansion-2'
    const allowed = allowedMasterSheetTierIds(
      [tier('t3', 3), tier('o3', 3, true, other)],
      [
        expansion({ approvedPhases: [3] }),
        expansion({ id: other, approvedPhases: [] }),
      ],
    )
    expect([...allowed]).toEqual(['t3'])
  })

  it('ignores tiers with no phase, no expansion, or an unknown expansion', () => {
    const allowed = allowedMasterSheetTierIds(
      [
        { id: 'no-phase', phase: null, master_sheet_visible: true, expansion_id: EXP },
        { id: 'no-exp', phase: 3, master_sheet_visible: true, expansion_id: null },
        tier('unknown-exp', 3, true, 'expansion-missing'),
      ],
      [expansion({ approvedPhases: [3] })],
    )
    expect(allowed.size).toBe(0)
  })
})
