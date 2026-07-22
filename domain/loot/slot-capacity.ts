import { ITEM_UNIQUE } from '../../data/item-unique'

/**
 * How many copies of a single item a raider may place on one loot list.
 *
 * Most gear occupies one equipment slot, so a second copy of the same item is
 * never useful and is almost always a mis-click. Three slots are worn in pairs
 * — dual-wielded one-handers, two rings, two trinkets — so listing the same
 * item twice is legitimate there (issue #181), but only when the item isn't
 * Unique / Unique-Equipped. Nearly every raid ring and trinket in the game IS
 * unique, so the slot alone can't answer the question; see isUniqueEquipped.
 *
 * Tokens are deliberately absent: they cap at one copy *per bracket section*,
 * a rule the loot list enforces separately via `isTokenSlot`.
 */
export const MAX_COPIES_PER_SLOT: Record<string, number> = {
  'One-Hand': 2,
  Finger: 2,
  Trinket: 2,
}

export const DEFAULT_MAX_COPIES = 1

/** Slots a raider can equip two of, and so may list twice. */
export const PAIRED_SLOTS = Object.keys(MAX_COPIES_PER_SLOT)

/**
 * Whether an item can only be worn once regardless of slot.
 *
 * Returns undefined for ids absent from the generated map — unknown, NOT
 * "not unique". Callers must not treat that as permission to list an item
 * twice; a wrong "yes" produces a list the raider can't actually equip, which
 * officers then allocate loot from.
 */
export function isUniqueEquipped(wowheadId: number | null | undefined): boolean | undefined {
  if (wowheadId == null) return undefined
  return ITEM_UNIQUE[wowheadId]
}

/**
 * Max copies of an item in the given `loot_items.item_slot`, ignoring the
 * unique flag. Prefer maxCopiesForItem — this is the slot-only fallback for
 * items whose unique status we couldn't determine.
 */
export function maxCopiesForSlot(slot: string | null | undefined): number {
  if (!slot) return DEFAULT_MAX_COPIES
  return MAX_COPIES_PER_SLOT[slot] ?? DEFAULT_MAX_COPIES
}

/**
 * What a paired slot allows when we have no unique flag for the item.
 *
 * Asymmetric on purpose. Listing a one-hander twice has been allowed for as
 * long as the loot list has existed and weapons are rarely Unique, so an
 * unflagged one-hander keeps its second copy rather than silently regressing
 * dual-wielders. Rings and trinkets are the opposite: two copies is the new
 * capability, and nearly every raid ring and trinket is Unique, so an
 * unflagged one gets the single copy it has always had. Both directions
 * preserve today's behaviour when we don't know; only a verified flag changes
 * anything.
 */
const MAX_COPIES_WHEN_UNIQUE_UNKNOWN: Record<string, number> = {
  'One-Hand': 2,
}

/**
 * Max copies of a specific item a raider may put on one loot list.
 *
 * Unpaired slots always cap at one. Paired slots cap at one when the item is
 * Unique and at two when it verifiably isn't; see
 * MAX_COPIES_WHEN_UNIQUE_UNKNOWN for the unflagged case.
 */
export function maxCopiesForItem(item: {
  item_slot?: string | null
  wowhead_id?: number | null
}): number {
  const slotMax = maxCopiesForSlot(item.item_slot)
  if (slotMax === DEFAULT_MAX_COPIES) return slotMax

  const unique = isUniqueEquipped(item.wowhead_id)
  if (unique === undefined) {
    return MAX_COPIES_WHEN_UNIQUE_UNKNOWN[item.item_slot as string] ?? DEFAULT_MAX_COPIES
  }
  return unique ? DEFAULT_MAX_COPIES : slotMax
}
