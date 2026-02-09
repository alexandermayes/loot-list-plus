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
 * Bracket configuration for loot list ranking.
 * Brackets 1-4 have allocation limits, No Bracket and Off-spec do not.
 */
export const BRACKET_CONFIG: BracketConfig[] = [
  { name: 'Bracket 1', ranks: [50, 49, 48], maxPoints: 3 },
  { name: 'Bracket 2', ranks: [47, 46, 45], maxPoints: 3 },
  { name: 'Bracket 3', ranks: [44, 43, 42], maxPoints: 3 },
  { name: 'Bracket 4', ranks: [41, 40, 39], maxPoints: 3 },
]

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
  itemTypesUsed: Set<string>
  itemSlotsUsed: Set<string>
  placements: Map<string, string> // "rank-slot" -> itemId
}

/**
 * Create initial bracket states for BIS import.
 */
export function createBracketStates(): BracketState[] {
  return BRACKET_CONFIG.map(config => ({
    config,
    currentPoints: 0,
    itemTypesUsed: new Set(),
    itemSlotsUsed: new Set(),
    placements: new Map(),
  }))
}

/**
 * Check if an item can be placed in a specific slot within a bracket.
 *
 * Rules checked:
 * 1. Allocation points won't exceed max
 * 2. Item type not already in bracket (duplicate type rule)
 * 3. Item slot not already in bracket (if enforceSlotRestrictions)
 * 4. Reserved items must be alone at their rank
 */
export function canPlaceInBracket(
  item: BracketItem,
  bracket: BracketState,
  rank: number,
  slot: 1 | 2,
  enforceSlotRestrictions: boolean,
  itemsById: Map<string, BracketItem>
): boolean {
  const cost = item.allocation_cost || 0
  const isReserved = item.classification === 'Reserved'

  // Rule 1: Check allocation points
  if (bracket.currentPoints + cost > bracket.config.maxPoints) {
    return false
  }

  // Rule 2: Check duplicate item_type
  if (item.item_type && bracket.itemTypesUsed.has(item.item_type)) {
    return false
  }

  // Rule 3: Check duplicate item_slot (if enforcement enabled)
  if (enforceSlotRestrictions && item.item_slot && bracket.itemSlotsUsed.has(item.item_slot)) {
    return false
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
  if (item.item_type) {
    bracket.itemTypesUsed.add(item.item_type)
  }
  if (item.item_slot) {
    bracket.itemSlotsUsed.add(item.item_slot)
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
  itemsById: Map<string, BracketItem>
): { bracketIndex: number; rank: number; slot: 1 | 2 } | null {
  for (let bracketIndex = 0; bracketIndex < bracketStates.length; bracketIndex++) {
    const bracket = bracketStates[bracketIndex]

    for (const rank of bracket.config.ranks) {
      for (const slot of [1, 2] as const) {
        // Skip if slot already has an item
        if (bracket.placements.has(`${rank}-${slot}`)) {
          continue
        }

        if (canPlaceInBracket(item, bracket, rank, slot, enforceSlotRestrictions, itemsById)) {
          return { bracketIndex, rank, slot }
        }
      }
    }
  }

  return null
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
