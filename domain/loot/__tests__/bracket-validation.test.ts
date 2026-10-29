import { describe, it, expect } from 'vitest'
import { validateBracketRules, type BracketItem } from '../bracket-validation'
import { canPlaceInBracket, placeInBracket, createBracketStates, findNextNoBracketSlot } from '../bracket-validation'

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

// D-06, D-08, research Pitfall 2: need rows are outside the bracket rules.
// Their costs are 3, 2 and 1 whatever the classification says, so summing
// them against the limit of 3 would flag valid need lists. Phase 4's 10-point
// budget check (DISC-03) governs need costs instead.
describe('need rows (kind need)', () => {
  const bigNeed = { id: 'big', kind: 'need', allocation_cost: 3, classification: 'Reserved' }
  const standardNeed = { id: 'std', kind: 'need', allocation_cost: 1, classification: 'Unlimited' }

  it('reports no violation for a Big need and a Standard need in one bracket', () => {
    const items = [entry(50, 1, bigNeed), entry(49, 1, standardNeed)]
    expect(validateBracketRules(items, false)).toEqual([])
  })

  it('still reports allocation_limit for the same costs on item rows', () => {
    const items = [
      entry(50, 1, { id: 'big', allocation_cost: 3, classification: 'Reserved' }),
      entry(49, 1, { id: 'std', allocation_cost: 1, classification: 'Unlimited' }),
    ]
    expect(validateBracketRules(items, false).map(v => v.rule)).toContain('allocation_limit')
  })

  it('does not count a need toward an item bracket total', () => {
    const items = [
      entry(50, 1, { id: 'a', allocation_cost: 3, item_type: 'Weapon' }),
      entry(49, 1, bigNeed),
    ]
    expect(validateBracketRules(items, false)).toEqual([])
  })

  it('reports no reserved_companion for a Reserved need beside an item', () => {
    const items = [entry(50, 1, bigNeed), entry(50, 2, { id: 'i', allocation_cost: 1, item_type: 'Weapon' })]
    expect(validateBracketRules(items, false)).toEqual([])
  })

  it('canPlaceInBracket allows a need into a bracket at its point limit', () => {
    const [bracket] = createBracketStates()
    bracket.currentPoints = bracket.config.maxPoints
    const need = { id: 'n', kind: 'need', allocation_cost: 3, classification: 'Reserved', item_type: 'Weapon' } as BracketItem
    expect(canPlaceInBracket(need, bracket, 50, 2, true, new Map([[need.id, need]]))).toBe(true)
  })

  it('placeInBracket records a need placement and leaves the counters alone', () => {
    const [bracket] = createBracketStates()
    const need = { id: 'n', kind: 'need', allocation_cost: 3, item_type: 'Weapon', item_slot: 'Chest' } as BracketItem
    placeInBracket(need, bracket, 50, 1)
    expect(bracket.placements.get('50-1')).toBe('n')
    expect(bracket.currentPoints).toBe(0)
    expect(bracket.itemTypesUsed.size).toBe(0)
    expect(bracket.itemSlotsUsed.size).toBe(0)
  })

  it('a Reserved need at slot 1 never blocks an item at slot 2', () => {
    const [bracket] = createBracketStates()
    const need = { id: 'n', kind: 'need', allocation_cost: 3, classification: 'Reserved' } as BracketItem
    const item = { id: 'i', allocation_cost: 1, item_type: 'Weapon' } as BracketItem
    const itemsById = new Map([[need.id, need], [item.id, item]])
    placeInBracket(need, bracket, 50, 1)
    expect(canPlaceInBracket(item, bracket, 50, 2, false, itemsById)).toBe(true)
  })

  it('a Reserved item at slot 1 still blocks an item at slot 2', () => {
    const [bracket] = createBracketStates()
    const reserved = { id: 'r', allocation_cost: 3, classification: 'Reserved' } as BracketItem
    const item = { id: 'i', allocation_cost: 1, item_type: 'Weapon' } as BracketItem
    const itemsById = new Map([[reserved.id, reserved], [item.id, item]])
    placeInBracket(reserved, bracket, 50, 1)
    expect(canPlaceInBracket(item, bracket, 50, 2, false, itemsById)).toBe(false)
  })

  it('findNextNoBracketSlot lets an item take slot 2 beside a Reserved need', () => {
    const need = { id: 'n', kind: 'need', classification: 'Reserved' } as BracketItem
    const item = { id: 'i' } as BracketItem
    const placements = new Map([['38-1', 'n']])
    expect(findNextNoBracketSlot(item, placements, new Map([[need.id, need]]))).toEqual({ rank: 38, slot: 2 })
  })

  it('findNextNoBracketSlot still skips slot 2 beside a Reserved item', () => {
    const reserved = { id: 'r', classification: 'Reserved' } as BracketItem
    const item = { id: 'i' } as BracketItem
    const placements = new Map([['38-1', 'r']])
    expect(findNextNoBracketSlot(item, placements, new Map([[reserved.id, reserved]]))).toEqual({ rank: 37, slot: 1 })
  })
})

describe('Reserved item beside a need row', () => {
  it('canPlaceInBracket lets a Reserved item take slot 1 when slot 2 holds a need', () => {
    const [bracket] = createBracketStates()
    const need = { id: 'n', kind: 'need', allocation_cost: 1 } as BracketItem
    const reserved = { id: 'r', allocation_cost: 3, classification: 'Reserved' } as BracketItem
    placeInBracket(need, bracket, 50, 2)
    expect(canPlaceInBracket(reserved, bracket, 50, 1, false, new Map([[need.id, need], [reserved.id, reserved]]))).toBe(true)
  })

  it('canPlaceInBracket still blocks a Reserved item when slot 2 holds an item', () => {
    const [bracket] = createBracketStates()
    const other = { id: 'o', allocation_cost: 1, item_type: 'Weapon' } as BracketItem
    const reserved = { id: 'r', allocation_cost: 3, classification: 'Reserved' } as BracketItem
    placeInBracket(other, bracket, 50, 2)
    expect(canPlaceInBracket(reserved, bracket, 50, 1, false, new Map([[other.id, other], [reserved.id, reserved]]))).toBe(false)
  })
})
