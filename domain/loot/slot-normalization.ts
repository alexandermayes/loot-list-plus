/**
 * Slot normalization utilities for bridging equipped gear slot names
 * (WowSims / Battle.net) with BIS data / loot_items slot names.
 *
 * WowSims uses:    Finger1, Finger2, Trinket1, Trinket2 (no space)
 * Battle.net uses:  Finger 1, Finger 2, Trinket 1, Trinket 2 (with space)
 * BIS / loot_items: Finger, Trinket (generic)
 */

type CanonicalSlot =
  | 'Head'
  | 'Neck'
  | 'Shoulder'
  | 'Back'
  | 'Chest'
  | 'Wrist'
  | 'Hands'
  | 'Waist'
  | 'Legs'
  | 'Feet'
  | 'Finger'
  | 'Trinket'
  | 'Main Hand'
  | 'Off Hand'
  | 'Ranged'

/**
 * Maps equipped item slot names (from WowSims or Battle.net) to canonical
 * BIS slot names. Numbered slots (Finger1, Finger 1) merge into the generic
 * form (Finger).
 */
const EQUIPPED_TO_CANONICAL: Record<string, CanonicalSlot> = {
  // 1:1 mappings
  Head: 'Head',
  Neck: 'Neck',
  Shoulder: 'Shoulder',
  Back: 'Back',
  Chest: 'Chest',
  Wrist: 'Wrist',
  Hands: 'Hands',
  Waist: 'Waist',
  Legs: 'Legs',
  Feet: 'Feet',
  'Main Hand': 'Main Hand',
  'Off Hand': 'Off Hand',
  Ranged: 'Ranged',

  // WowSims numbered format
  Finger1: 'Finger',
  Finger2: 'Finger',
  Trinket1: 'Trinket',
  Trinket2: 'Trinket',

  // Battle.net numbered format
  'Finger 1': 'Finger',
  'Finger 2': 'Finger',
  'Trinket 1': 'Trinket',
  'Trinket 2': 'Trinket',
}

function normalizeEquippedSlot(slot: string): CanonicalSlot | null {
  return EQUIPPED_TO_CANONICAL[slot] ?? null
}

/**
 * BIS data uses slot names like Two-Hand, One-Hand, Shield, Relic, etc.
 * This checks whether a BIS item's slot covers a given canonical equipped slot.
 */
function bisSlotCoversEquippedSlot(
  bisSlot: string,
  canonicalSlot: CanonicalSlot
): boolean {
  switch (bisSlot) {
    // Direct 1:1 matches
    case 'Head':
    case 'Neck':
    case 'Shoulder':
    case 'Back':
    case 'Chest':
    case 'Wrist':
    case 'Hands':
    case 'Waist':
    case 'Legs':
    case 'Feet':
    case 'Finger':
    case 'Trinket':
      return bisSlot === canonicalSlot

    // Weapon slots
    case 'Two-Hand':
    case 'Weapon':
      return canonicalSlot === 'Main Hand'
    case 'Main Hand':
      return canonicalSlot === 'Main Hand'
    case 'One-Hand':
      return canonicalSlot === 'Main Hand' || canonicalSlot === 'Off Hand'
    case 'Off Hand':
    case 'Shield':
    case 'Held In Off-hand':
      return canonicalSlot === 'Off Hand'

    // Ranged-slot items
    case 'Ranged':
    case 'Relic':
    case 'Wand':
    case 'Idol':
    case 'Totem':
    case 'Libram':
    case 'Thrown':
    case 'Sigil':
      return canonicalSlot === 'Ranged'

    default:
      return false
  }
}

interface EquippedItemForCoverage {
  slot: string
  wowhead_id: number
}

/**
 * Builds a map of canonical slot -> Set of wowhead IDs from equipped gear.
 * Merges numbered slots (Finger1 + Finger2 -> Finger).
 */
export function buildSlotCoverageMap(
  equippedItems: EquippedItemForCoverage[]
): Map<CanonicalSlot, Set<number>> {
  const coverage = new Map<CanonicalSlot, Set<number>>()

  for (const item of equippedItems) {
    const canonical = normalizeEquippedSlot(item.slot)
    if (!canonical) continue

    let ids = coverage.get(canonical)
    if (!ids) {
      ids = new Set()
      coverage.set(canonical, ids)
    }
    ids.add(item.wowhead_id)
  }

  return coverage
}

/**
 * Computes an upgrade tier score for a BIS item.
 *
 * Lower score = higher priority:
 *   0 = BIS item for an empty equipment slot
 *   1 = BIS item replacing non-BIS gear
 *   2 = Alt item for an empty equipment slot
 *   3 = Alt item replacing non-BIS gear
 *
 * When slotCoverage is empty (no gear imported), every slot appears empty,
 * producing the same ordering as the original sort (bis first, alt second).
 */
export function computeUpgradeTier(
  bisSlot: string,
  priority: string,
  slotCoverage: Map<CanonicalSlot, Set<number>>
): number {
  const isBis = priority === 'bis'

  // Check if any equipped slot is covered by this BIS slot
  let slotHasGear = false
  for (const [canonicalSlot, _ids] of slotCoverage) {
    if (bisSlotCoversEquippedSlot(bisSlot, canonicalSlot)) {
      slotHasGear = true
      break
    }
  }

  if (!slotHasGear) {
    // Empty slot: biggest upgrade potential
    return isBis ? 0 : 2
  }

  // Slot has gear but not this BIS item (owned items are already filtered out
  // before sorting), so this is a replacement upgrade
  return isBis ? 1 : 3
}
