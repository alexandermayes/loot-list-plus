/**
 * Ranked items that sit outside their zone's officer prio pool (#484).
 *
 * The editor refuses to place such an item, but a list saved before an
 * officer changed prio keeps it, and a direct save never went through the
 * editor at all. The submit route and the editor marker both use this, so a
 * raider sees in the editor exactly what submit will refuse.
 */

import { positionKey } from './list-row-updates'
import { canRankInZone, zoneForRank, type ListZone, type PrioZoneItem } from './prio-zones'

export const PRIO_VIOLATION_CODE = 'PRIO_VIOLATION'

export interface PrioRankedEntry {
  loot_item_id: string
  rank: number
  slot: number
}

/** An item from the character's item set, with the prio flags lib/loot-items-query.ts computes. */
export interface PrioCheckItem extends PrioZoneItem {
  id: string
}

export interface PrioLockPosition {
  rank: number
  slot: number
  loot_item_id: string
}

export interface PrioViolation {
  loot_item_id: string
  rank: number
  slot: number
  zone: ListZone
}

/**
 * The entries the editor would refuse to place at their rank, ordered rank
 * descending then slot ascending (list order).
 *
 * Not flagged:
 * - Loot Council items. Every editor pool lists them, so the drag guard lets
 *   an already ranked one move to any zone; prio does not decide them.
 * - Items outside the character's item set (not equippable, unavailable, or
 *   from a tier the guild turned off). The editor never offers them and the
 *   existing submit rules do not reject them, so prio stays out of it too.
 * - A rank and slot held by an active award lock on the same item. Locks are
 *   officer awards and are never re-judged.
 */
export function findPrioViolations(
  entries: readonly PrioRankedEntry[],
  items: readonly PrioCheckItem[],
  locks: readonly PrioLockPosition[] = [],
): PrioViolation[] {
  const itemsById = new Map(items.map(item => [item.id, item]))
  const lockedKeys = new Set(
    locks.map(lock => `${positionKey(Number(lock.rank), Number(lock.slot))}:${lock.loot_item_id}`),
  )

  const violations: PrioViolation[] = []
  for (const entry of entries) {
    if (!entry.loot_item_id) continue
    const rank = Number(entry.rank)
    const slot = Number(entry.slot)
    if (lockedKeys.has(`${positionKey(rank, slot)}:${entry.loot_item_id}`)) continue

    const item = itemsById.get(entry.loot_item_id)
    if (!item || item.is_loot_council) continue

    const zone = zoneForRank(rank)
    if (!canRankInZone(item, zone)) {
      violations.push({ loot_item_id: entry.loot_item_id, rank, slot, zone })
    }
  }

  return violations.sort((a, b) => b.rank - a.rank || a.slot - b.slot)
}

/**
 * The refusal shown to the raider when submit finds out-of-prio items.
 * DRAFT copy, held for owner sign-off.
 */
export function prioViolationMessage(violations: readonly { item_name: string; rank: number }[]): string {
  const listed = violations.map(v => `${v.item_name} (rank ${v.rank})`)
  if (listed.length === 1) {
    return `Officers set prio for ${listed[0]} to other classes. Move it to Off-spec or remove it, then submit again.`
  }
  return `Officers set prio for these items to other classes: ${listed.join(', ')}. Move them to Off-spec or remove them, then submit again.`
}

/** Hover text and accessible label for the editor marker. DRAFT copy, held for owner sign-off. */
export const PRIO_MARKER_LABEL = 'Officers set prio for this item to other classes. Move it to Off-spec or remove it before you submit.'

/** Visible badge text for the editor marker. DRAFT copy, held for owner sign-off. */
export const PRIO_MARKER_TEXT = 'Not your prio'
