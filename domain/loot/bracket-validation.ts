/**
 * Shared bracket validation utilities for loot list ranking.
 * Used by both the BIS import algorithm and the display validation.
 */

export interface BracketConfig {
  name: string
  ranks: number[]
  maxPoints: number
}

/**
 * Per-guild bracket limit overrides.
 * All fields optional — defaults to the hardcoded constants when omitted.
 */
export interface BracketLimits {
  maxAllocationPoints?: number  // default 3
  maxTokens?: number            // default 1
  maxCategory?: number          // default 1 (max same item_type per bracket)
}

export const DEFAULT_MAX_ALLOCATION_POINTS = 3
export const DEFAULT_MAX_TOKENS = 1
export const DEFAULT_MAX_CATEGORY = 1

/**
 * Bracket configuration for loot list ranking.
 * Brackets 1-4 have allocation limits, No Bracket and Off-spec do not.
 */
export const BRACKET_CONFIG: BracketConfig[] = [
  { name: 'Bracket 1', ranks: [50, 49, 48], maxPoints: DEFAULT_MAX_ALLOCATION_POINTS },
  { name: 'Bracket 2', ranks: [47, 46, 45], maxPoints: DEFAULT_MAX_ALLOCATION_POINTS },
  { name: 'Bracket 3', ranks: [44, 43, 42], maxPoints: DEFAULT_MAX_ALLOCATION_POINTS },
  { name: 'Bracket 4', ranks: [41, 40, 39], maxPoints: DEFAULT_MAX_ALLOCATION_POINTS },
]

/**
 * Build bracket configs with a custom maxPoints value.
 */
export function getBracketConfigWithLimits(maxAllocationPoints: number): BracketConfig[] {
  return BRACKET_CONFIG.map(b => ({ ...b, maxPoints: maxAllocationPoints }))
}

// No Bracket zone (ranks 38-25) - no allocation limits
export const NO_BRACKET_RANKS = Array.from({ length: 14 }, (_, i) => 38 - i) // [38, 37, ..., 25]

// Off-spec zone (ranks 24-1) - no allocation limits
export const OFF_SPEC_RANKS = Array.from({ length: 24 }, (_, i) => 24 - i) // [24, 23, ..., 1]

/**
 * Get the bracket config for a given rank, or null if rank is outside brackets.
 */
export function getBracketForRank(rank: number): BracketConfig | null {
  return BRACKET_CONFIG.find(b => b.ranks.includes(rank)) || null
}

/**
 * Item data needed for bracket validation during BIS import.
 */
export interface BracketItem {
  id: string
  classification?: string
  item_type?: string
  item_slot?: string
  allocation_cost?: number
}

/**
 * State tracking for a bracket during BIS import.
 */
export interface BracketState {
  config: BracketConfig
  currentPoints: number
  itemTypesUsed: Map<string, number>  // type -> count
  itemSlotsUsed: Map<string, number>  // slot -> count
  placements: Map<string, string> // "rank-slot" -> itemId
}

/**
 * Create initial bracket states for BIS import.
 */
export function createBracketStates(limits?: BracketLimits): BracketState[] {
  const maxAlloc = limits?.maxAllocationPoints ?? DEFAULT_MAX_ALLOCATION_POINTS
  const configs = getBracketConfigWithLimits(maxAlloc)
  return configs.map(config => ({
    config,
    currentPoints: 0,
    itemTypesUsed: new Map(),
    itemSlotsUsed: new Map(),
    placements: new Map(),
  }))
}

/**
 * Check if an item can be placed in a specific slot within a bracket.
 *
 * Rules checked:
 * 1. Allocation points won't exceed max
 * 2. Item type count won't exceed maxCategory
 * 3. Token count won't exceed maxTokens (if enforceSlotRestrictions)
 * 4. Reserved items must be alone at their rank
 */
export function canPlaceInBracket(
  item: BracketItem,
  bracket: BracketState,
  rank: number,
  slot: 1 | 2,
  enforceSlotRestrictions: boolean,
  itemsById: Map<string, BracketItem>,
  limits?: BracketLimits
): boolean {
  const cost = item.allocation_cost || 0
  const isReserved = item.classification === 'Reserved'
  const maxCategory = limits?.maxCategory ?? DEFAULT_MAX_CATEGORY
  const maxTokens = limits?.maxTokens ?? DEFAULT_MAX_TOKENS

  // Rule 1: Check allocation points
  if (bracket.currentPoints + cost > bracket.config.maxPoints) {
    return false
  }

  // Rule 2: Check duplicate item_type (skip for tokens — different tokens are distinct items)
  if (item.item_type && item.item_type !== 'Token') {
    const currentCount = bracket.itemTypesUsed.get(item.item_type) ?? 0
    if (currentCount >= maxCategory) {
      return false
    }
  }

  // Rule 3: Restrict duplicate tokens per bracket (if enforcement enabled)
  // Only applies to token items — non-token slots are already restricted by Rule 2
  if (enforceSlotRestrictions && item.item_slot === 'Token') {
    const tokenCount = bracket.itemSlotsUsed.get('Token') ?? 0
    if (tokenCount >= maxTokens) {
      return false
    }
  }

  // Rule 4: Reserved companion rule
  // Reserved items can only go in slot 1 and must be alone
  if (isReserved) {
    if (slot === 2) {
      return false // Reserved can't go in slot 2
    }
    // Check if slot 2 at this rank already has an item
    if (bracket.placements.has(`${rank}-2`)) {
      return false
    }
  }

  // If placing in slot 2, check if slot 1 has a Reserved item
  if (slot === 2) {
    const slot1ItemId = bracket.placements.get(`${rank}-1`)
    if (slot1ItemId) {
      const slot1Item = itemsById.get(slot1ItemId)
      if (slot1Item?.classification === 'Reserved') {
        return false
      }
    }
  }

  return true
}

/**
 * Place an item in a bracket and update the bracket state.
 */
export function placeInBracket(
  item: BracketItem,
  bracket: BracketState,
  rank: number,
  slot: 1 | 2
): void {
  bracket.placements.set(`${rank}-${slot}`, item.id)
  bracket.currentPoints += item.allocation_cost || 0
  if (item.item_type && item.item_type !== 'Token') {
    const count = bracket.itemTypesUsed.get(item.item_type) ?? 0
    bracket.itemTypesUsed.set(item.item_type, count + 1)
  }
  if (item.item_slot) {
    const count = bracket.itemSlotsUsed.get(item.item_slot) ?? 0
    bracket.itemSlotsUsed.set(item.item_slot, count + 1)
  }
}

/**
 * Find the next valid slot for an item across all brackets.
 * Returns { rank, slot } or null if no valid slot found in brackets.
 *
 * Tries to place items in order: Bracket 1 -> 2 -> 3 -> 4
 * Within each bracket: rank 50 slot 1, rank 50 slot 2, rank 49 slot 1, etc.
 */
export function findNextValidSlot(
  item: BracketItem,
  bracketStates: BracketState[],
  enforceSlotRestrictions: boolean,
  itemsById: Map<string, BracketItem>,
  limits?: BracketLimits
): { bracketIndex: number; rank: number; slot: 1 | 2 } | null {
  for (let bracketIndex = 0; bracketIndex < bracketStates.length; bracketIndex++) {
    const bracket = bracketStates[bracketIndex]

    for (const rank of bracket.config.ranks) {
      for (const slot of [1, 2] as const) {
        // Skip if slot already has an item
        if (bracket.placements.has(`${rank}-${slot}`)) {
          continue
        }

        if (canPlaceInBracket(item, bracket, rank, slot, enforceSlotRestrictions, itemsById, limits)) {
          return { bracketIndex, rank, slot }
        }
      }
    }
  }

  return null
}

/**
 * Validation error from bracket rule checking.
 */
export interface BracketViolation {
  bracket: string
  rule: string
  detail: string
}

/**
 * Validate a complete list of ranked items against bracket rules.
 * Returns an array of violations (empty = valid).
 *
 * Used server-side to gate submission (status → pending).
 */
export function validateBracketRules(
  items: { rank: number; slot: number; item: BracketItem }[],
  enforceSlotRestrictions: boolean,
  limits?: BracketLimits
): BracketViolation[] {
  const violations: BracketViolation[] = []
  const itemsById = new Map(items.map(i => [i.item.id, i.item]))

  const maxAlloc = limits?.maxAllocationPoints ?? DEFAULT_MAX_ALLOCATION_POINTS
  const maxCategory = limits?.maxCategory ?? DEFAULT_MAX_CATEGORY
  const maxTokens = limits?.maxTokens ?? DEFAULT_MAX_TOKENS
  const configs = getBracketConfigWithLimits(maxAlloc)

  // Group items by bracket
  const bracketItems = new Map<number, typeof items>()
  for (const entry of items) {
    const bracketIndex = configs.findIndex(b => b.ranks.includes(entry.rank))
    if (bracketIndex === -1) continue // No Bracket or Off-spec zone — no rules
    const existing = bracketItems.get(bracketIndex) || []
    existing.push(entry)
    bracketItems.set(bracketIndex, existing)
  }

  for (const [bracketIndex, bracketEntries] of bracketItems) {
    const config = configs[bracketIndex]

    // Rule 1: Allocation points
    let totalPoints = 0
    for (const entry of bracketEntries) {
      totalPoints += entry.item.allocation_cost || 0
    }
    if (totalPoints > config.maxPoints) {
      violations.push({
        bracket: config.name,
        rule: 'allocation_limit',
        detail: `${totalPoints} allocation points exceeds limit of ${config.maxPoints}`,
      })
    }

    // Rule 2: Duplicate item types (non-token)
    const typeCounts = new Map<string, number>()
    for (const entry of bracketEntries) {
      const t = entry.item.item_type
      if (t && t !== 'Token') {
        const count = (typeCounts.get(t) ?? 0) + 1
        typeCounts.set(t, count)
        if (count > maxCategory) {
          violations.push({
            bracket: config.name,
            rule: 'duplicate_type',
            detail: `${count} "${t}" items in bracket (max ${maxCategory})`,
          })
          break // one violation per bracket is enough
        }
      }
    }

    // Rule 3: Token slot restriction (optional)
    if (enforceSlotRestrictions) {
      let tokenCount = 0
      for (const entry of bracketEntries) {
        if (entry.item.item_slot === 'Token') tokenCount++
      }
      if (tokenCount > maxTokens) {
        violations.push({
          bracket: config.name,
          rule: 'duplicate_token',
          detail: `${tokenCount} tokens in bracket (max ${maxTokens})`,
        })
      }
    }

    // Rule 4: Reserved companion rule
    const byRank = new Map<number, typeof items>()
    for (const entry of bracketEntries) {
      const existing = byRank.get(entry.rank) || []
      existing.push(entry)
      byRank.set(entry.rank, existing)
    }
    for (const [rank, rankEntries] of byRank) {
      const hasReserved = rankEntries.some(e => e.item.classification === 'Reserved')
      if (hasReserved && rankEntries.length > 1) {
        violations.push({
          bracket: config.name,
          rule: 'reserved_companion',
          detail: `Reserved item at rank ${rank} must be alone (found ${rankEntries.length} items)`,
        })
      }
      const reservedInSlot2 = rankEntries.some(e => e.item.classification === 'Reserved' && e.slot === 2)
      if (reservedInSlot2) {
        violations.push({
          bracket: config.name,
          rule: 'reserved_slot',
          detail: `Reserved item at rank ${rank} cannot be in slot 2`,
        })
      }
    }
  }

  return violations
}

/**
 * Find the next available slot in the No Bracket zone (ranks 38-25).
 * No allocation limits or type restrictions apply here.
 * Still respects Reserved companion rule.
 */
export function findNextNoBracketSlot(
  item: BracketItem,
  placements: Map<string, string>,
  itemsById: Map<string, BracketItem>
): { rank: number; slot: 1 | 2 } | null {
  const isReserved = item.classification === 'Reserved'

  for (const rank of NO_BRACKET_RANKS) {
    const hasSlot1 = placements.has(`${rank}-1`)
    const hasSlot2 = placements.has(`${rank}-2`)

    // Try slot 1 first
    if (!hasSlot1) {
      // If Reserved, make sure slot 2 is empty
      if (isReserved && hasSlot2) {
        continue
      }
      return { rank, slot: 1 }
    }

    // Try slot 2 if slot 1 is taken
    if (!hasSlot2) {
      // Can't place in slot 2 if slot 1 has Reserved
      const slot1ItemId = placements.get(`${rank}-1`)
      if (slot1ItemId) {
        const slot1Item = itemsById.get(slot1ItemId)
        if (slot1Item?.classification === 'Reserved') {
          continue
        }
      }
      // Reserved items can't go in slot 2
      if (isReserved) {
        continue
      }
      return { rank, slot: 2 }
    }
  }

  return null
}
