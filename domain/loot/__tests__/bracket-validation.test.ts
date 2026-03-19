import { describe, it, expect } from 'vitest'
import { validateBracketRules, type BracketItem } from '../bracket-validation'

// Helper to create a ranked item entry
function entry(rank: number, slot: number, item: Partial<BracketItem> & { id: string }) {
  return {
    rank,
    slot,
    item: {
      classification: undefined,
      item_type: undefined,
      item_slot: undefined,
      allocation_cost: undefined,
      ...item,
    } as BracketItem,
  }
}

// ─── Valid lists ───────────────────────────────────────────────

describe('validateBracketRules', () => {
  it('returns no violations for an empty list', () => {
    expect(validateBracketRules([], false)).toEqual([])
  })

  it('returns no violations for items outside bracket zone', () => {
    const items = [
      entry(38, 1, { id: 'a', allocation_cost: 1, item_type: 'Weapon' }),
      entry(37, 1, { id: 'b', allocation_cost: 1, item_type: 'Weapon' }),
      entry(24, 1, { id: 'c', allocation_cost: 1, item_type: 'Weapon' }),
    ]
    expect(validateBracketRules(items, false)).toEqual([])
  })

  it('returns no violations for a valid bracket list', () => {
    const items = [
      entry(50, 1, { id: 'a', allocation_cost: 1, item_type: 'Weapon' }),
      entry(49, 1, { id: 'b', allocation_cost: 1, item_type: 'Chest' }),
      entry(48, 1, { id: 'c', allocation_cost: 1, item_type: 'Legs' }),
    ]
    expect(validateBracketRules(items, false)).toEqual([])
  })

  it('allows items at exactly the allocation limit', () => {
    const items = [
      entry(50, 1, { id: 'a', allocation_cost: 1 }),
      entry(49, 1, { id: 'b', allocation_cost: 1 }),
      entry(48, 1, { id: 'c', allocation_cost: 1 }),
    ]
    // 3 points = max for Bracket 1
    expect(validateBracketRules(items, false)).toEqual([])
  })

  // ─── Rule 1: Allocation limit ─────────────────────────────────

  it('detects allocation limit exceeded', () => {
    const items = [
      entry(50, 1, { id: 'a', allocation_cost: 2, item_type: 'Weapon' }),
      entry(49, 1, { id: 'b', allocation_cost: 2, item_type: 'Chest' }),
    ]
    // 4 points > 3 max
    const violations = validateBracketRules(items, false)
    expect(violations).toHaveLength(1)
    expect(violations[0].rule).toBe('allocation_limit')
    expect(violations[0].bracket).toBe('Bracket 1')
  })

  it('treats undefined allocation_cost as 0', () => {
    const items = [
      entry(50, 1, { id: 'a' }),
      entry(49, 1, { id: 'b' }),
      entry(48, 1, { id: 'c' }),
      entry(50, 2, { id: 'd' }),
      entry(49, 2, { id: 'e' }),
      entry(48, 2, { id: 'f' }),
    ]
    // 6 items with cost 0 = 0 points, under limit
    expect(validateBracketRules(items, false)).toEqual([])
  })

  // ─── Rule 2: Duplicate item types ─────────────────────────────

  it('detects duplicate item types in same bracket', () => {
    const items = [
      entry(50, 1, { id: 'a', allocation_cost: 1, item_type: 'Weapon' }),
      entry(49, 1, { id: 'b', allocation_cost: 1, item_type: 'Weapon' }),
    ]
    const violations = validateBracketRules(items, false)
    expect(violations.some(v => v.rule === 'duplicate_type')).toBe(true)
  })

  it('allows same item type across different brackets', () => {
    const items = [
      entry(50, 1, { id: 'a', allocation_cost: 1, item_type: 'Weapon' }),
      entry(47, 1, { id: 'b', allocation_cost: 1, item_type: 'Weapon' }),
    ]
    // Bracket 1 and Bracket 2 — no conflict
    expect(validateBracketRules(items, false)).toEqual([])
  })

  it('allows duplicate Token type in same bracket (tokens are exempt)', () => {
    const items = [
      entry(50, 1, { id: 'a', allocation_cost: 1, item_type: 'Token', item_slot: 'Token' }),
      entry(49, 1, { id: 'b', allocation_cost: 1, item_type: 'Token', item_slot: 'Token' }),
    ]
    // Token type is explicitly excluded from Rule 2
    const violations = validateBracketRules(items, false)
    expect(violations.some(v => v.rule === 'duplicate_type')).toBe(false)
  })

  // ─── Rule 3: Token slot restriction ───────────────────────────

  it('allows multiple tokens when enforceSlotRestrictions is false', () => {
    const items = [
      entry(50, 1, { id: 'a', allocation_cost: 1, item_type: 'Token', item_slot: 'Token' }),
      entry(49, 1, { id: 'b', allocation_cost: 1, item_type: 'Token', item_slot: 'Token' }),
    ]
    expect(validateBracketRules(items, false)).toEqual([])
  })

  it('detects multiple tokens when enforceSlotRestrictions is true', () => {
    const items = [
      entry(50, 1, { id: 'a', allocation_cost: 1, item_type: 'Token', item_slot: 'Token' }),
      entry(49, 1, { id: 'b', allocation_cost: 1, item_type: 'Token', item_slot: 'Token' }),
    ]
    const violations = validateBracketRules(items, true)
    expect(violations.some(v => v.rule === 'duplicate_token')).toBe(true)
  })

  it('allows single token when enforceSlotRestrictions is true', () => {
    const items = [
      entry(50, 1, { id: 'a', allocation_cost: 1, item_type: 'Token', item_slot: 'Token' }),
      entry(49, 1, { id: 'b', allocation_cost: 1, item_type: 'Chest' }),
    ]
    const violations = validateBracketRules(items, true)
    expect(violations.some(v => v.rule === 'duplicate_token')).toBe(false)
  })

  // ─── Rule 4: Reserved companion rule ──────────────────────────

  it('allows a reserved item alone at a rank', () => {
    const items = [
      entry(50, 1, { id: 'a', allocation_cost: 1, classification: 'Reserved' }),
    ]
    expect(validateBracketRules(items, false)).toEqual([])
  })

  it('detects reserved item with a companion at the same rank', () => {
    const items = [
      entry(50, 1, { id: 'a', allocation_cost: 1, classification: 'Reserved' }),
      entry(50, 2, { id: 'b', allocation_cost: 1 }),
    ]
    const violations = validateBracketRules(items, false)
    expect(violations.some(v => v.rule === 'reserved_companion')).toBe(true)
  })

  it('detects reserved item in slot 2', () => {
    const items = [
      entry(50, 2, { id: 'a', allocation_cost: 1, classification: 'Reserved' }),
    ]
    const violations = validateBracketRules(items, false)
    expect(violations.some(v => v.rule === 'reserved_slot')).toBe(true)
  })

  it('allows two non-reserved items at the same rank', () => {
    const items = [
      entry(50, 1, { id: 'a', allocation_cost: 1, item_type: 'Weapon' }),
      entry(50, 2, { id: 'b', allocation_cost: 1, item_type: 'Shield' }),
    ]
    const violations = validateBracketRules(items, false)
    expect(violations.some(v => v.rule === 'reserved_companion')).toBe(false)
  })

  // ─── Multiple violations ──────────────────────────────────────

  it('reports violations from multiple brackets', () => {
    const items = [
      // Bracket 1: over allocation
      entry(50, 1, { id: 'a', allocation_cost: 2, item_type: 'Weapon' }),
      entry(49, 1, { id: 'b', allocation_cost: 2, item_type: 'Chest' }),
      // Bracket 2: duplicate type
      entry(47, 1, { id: 'c', allocation_cost: 1, item_type: 'Ring' }),
      entry(46, 1, { id: 'd', allocation_cost: 1, item_type: 'Ring' }),
    ]
    const violations = validateBracketRules(items, false)
    expect(violations.length).toBeGreaterThanOrEqual(2)
    expect(violations.some(v => v.bracket === 'Bracket 1' && v.rule === 'allocation_limit')).toBe(true)
    expect(violations.some(v => v.bracket === 'Bracket 2' && v.rule === 'duplicate_type')).toBe(true)
  })

  it('reports multiple violation types in the same bracket', () => {
    const items = [
      // Over allocation + reserved with companion
      entry(50, 1, { id: 'a', allocation_cost: 2, classification: 'Reserved' }),
      entry(50, 2, { id: 'b', allocation_cost: 2, item_type: 'Chest' }),
    ]
    const violations = validateBracketRules(items, false)
    expect(violations.some(v => v.rule === 'allocation_limit')).toBe(true)
    expect(violations.some(v => v.rule === 'reserved_companion')).toBe(true)
  })
})
