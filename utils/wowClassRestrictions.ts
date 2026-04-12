/**
 * Map an item's armor_type to the WoW classes that can wear it.
 *
 * Used by the reserve feature's "enforce class restrictions" toggle.
 * Class names are returned in title case to match what the join form
 * stores in `reserve_submissions.character_class`.
 */

export const ARMOR_TYPE_CLASSES: Record<string, string[]> = {
  cloth: ['Mage', 'Priest', 'Warlock'],
  leather: ['Druid', 'Rogue', 'Monk', 'Demon Hunter'],
  mail: ['Hunter', 'Shaman', 'Evoker'],
  plate: ['Warrior', 'Paladin', 'Death Knight'],
}

/**
 * Returns the list of classes that can use an item, or null if the
 * item has no class-specific restriction (e.g. trinkets, rings,
 * weapons handled by all). The reserve feature only enforces armor
 * restrictions for now — weapons can always be reserved.
 */
export function getItemAllowedClasses(item: {
  armor_type?: string | null
}): string[] | null {
  const armor = item.armor_type?.toLowerCase()
  if (!armor) return null
  return ARMOR_TYPE_CLASSES[armor] ?? null
}

/**
 * Check whether a character of the given class is allowed to reserve
 * the given item under class-restriction rules.
 */
export function canClassReserveItem(
  characterClass: string,
  item: { armor_type?: string | null }
): boolean {
  const allowed = getItemAllowedClasses(item)
  if (!allowed) return true
  return allowed.some(c => c.toLowerCase() === characterClass.toLowerCase())
}
