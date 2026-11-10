/**
 * Import BIS placement, kept outside React so it can be tested (#484).
 *
 * Given the raider's BiS items in the order they should be tried, this
 * decides which rank and slot each one lands on, honouring bracket limits and
 * the ranks the raider has locked.
 */

import {
  createBracketStates,
  findNextValidSlot,
  findNextNoBracketSlot,
  placeInBracket,
  type BracketItem,
  type BracketLimits,
} from '@/domain/loot/bracket-validation'
import { canRankInZone, type PrioZoneItem } from '@/domain/loot/prio-zones'
import type { ListSlotLock } from '@/domain/loot/slot-locks'

export interface BisPlacementItem extends BracketItem, PrioZoneItem {
  wowhead_id: number
}

export interface BisPlacementInput {
  /** loot_item_id of each BiS item, already sorted biggest upgrade first */
  orderedBisItemIds: readonly string[]
  lootItems: readonly BisPlacementItem[]
  lockedPositions: Record<string, Pick<ListSlotLock, 'rank' | 'slot' | 'loot_item_id'>>
  currentRankings: Record<string, string>
  equippedWowheadIds: ReadonlySet<number>
  enforceSlotRestrictions: boolean
  bracketLimits?: BracketLimits
}

export function placeBisItems(input: BisPlacementInput): {
  rankings: Record<string, string>
  importedCount: number
} {
  const {
    orderedBisItemIds,
    lootItems,
    lockedPositions,
    currentRankings,
    equippedWowheadIds,
    enforceSlotRestrictions,
    bracketLimits,
  } = input

  const itemsById = new Map<string, BisPlacementItem>()
  for (const item of lootItems) itemsById.set(item.id, item)

  // Initialize bracket states for smart placement
  const bracketStates = createBracketStates(bracketLimits)
  const noBracketPlacements = new Map<string, string>() // "rank-slot" -> itemId
  const newRankings: Record<string, string> = {}
  let importedCount = 0

  // Locked ranks survive the import: seed them first so their points and
  // positions are taken before any BiS item is placed, and so the save
  // does not bounce on a lock the import dropped.
  const lockedItemIds = new Set<string>()
  for (const [key, lock] of Object.entries(lockedPositions)) {
    if (currentRankings[key] !== lock.loot_item_id) continue
    newRankings[key] = lock.loot_item_id
    lockedItemIds.add(lock.loot_item_id)
    const lockedItem: BracketItem = itemsById.get(lock.loot_item_id) ?? { id: lock.loot_item_id }
    const bracket = bracketStates.find(state => state.config.ranks.includes(lock.rank))
    if (bracket) {
      placeInBracket(lockedItem, bracket, lock.rank, lock.slot as 1 | 2)
    } else {
      noBracketPlacements.set(key, lock.loot_item_id)
    }
  }

  for (const bisItemId of orderedBisItemIds) {
    // The raider already has an item locked to a rank
    if (lockedItemIds.has(bisItemId)) continue

    // Skip if item not available in this tier's loot table
    const item = itemsById.get(bisItemId)
    if (!item) continue

    // Skip items the user already owns (imported from WowSims)
    if (equippedWowheadIds.has(item.wowhead_id)) continue

    // Items the officers prio'd to other classes stay unranked: the editor
    // refuses them in Brackets 1-4 and No Bracket, so the import must too (#484).
    // This also covers Loot Council items, which are never rankable.
    const bracketSlot = canRankInZone(item, 'bracket')
      ? findNextValidSlot(item, bracketStates, enforceSlotRestrictions, itemsById, bracketLimits)
      : null

    if (bracketSlot) {
      const { bracketIndex, rank, slot } = bracketSlot
      placeInBracket(item, bracketStates[bracketIndex], rank, slot)
      newRankings[`${rank}-${slot}`] = item.id
      importedCount++
    } else if (canRankInZone(item, 'noBracket')) {
      // Brackets are full, can't fit this item, or it is not primary prio here
      const noBracketSlot = findNextNoBracketSlot(item, noBracketPlacements, itemsById)

      if (noBracketSlot) {
        const { rank, slot } = noBracketSlot
        noBracketPlacements.set(`${rank}-${slot}`, item.id)
        newRankings[`${rank}-${slot}`] = item.id
        importedCount++
      }
      // If no slot found anywhere, skip this item
    }
  }

  return { rankings: newRankings, importedCount }
}
