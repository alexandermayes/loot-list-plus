import { ITEM_CLASS_RESTRICTIONS } from '../../data/item-class-restrictions'
import type { WowClassName } from '../../data/class-proficiencies'

/**
 * Class locks on individual items (GH #276).
 *
 * The raider item picker filters non-token gear by armor and weapon
 * proficiency. canWearArmorType allows lighter armor, so a class-locked
 * drop such as a Classic tier set piece, a class trinket, a class ring or a
 * Priest or Hunter quest item passes that check for every class that can
 * wear its armor type. This rule narrows it to the classes on the item's
 * "Classes:" line, read from the wow-classic-items package and generated
 * into data/item-class-restrictions.ts.
 *
 * The map covers Classic, TBC and Wrath only, because that is what the
 * package covers. Tokens and recipes are deliberately absent (see the data
 * file header): tokens keep data/token-class-mapping.ts, recipes show to
 * every class per GH-284 D-03.
 *
 * Unknown means allowed, the same stance canClassUseToken takes: a wrong
 * hide costs a raider a legitimate item, a wrong show is today's behaviour.
 */

/** The classes that can use an item, or undefined when the map has no lock for it. */
export function getItemClassRestriction(
  wowheadId: number | null | undefined,
): readonly WowClassName[] | undefined {
  if (wowheadId === null || wowheadId === undefined) return undefined
  return ITEM_CLASS_RESTRICTIONS[wowheadId]
}

/** True unless the map locks the item to classes that do not include className. */
export function canClassUseItem(
  wowheadId: number | null | undefined,
  className: WowClassName | null | undefined,
): boolean {
  if (!className) return true
  const allowed = getItemClassRestriction(wowheadId)
  if (!allowed) return true
  return allowed.includes(className)
}
