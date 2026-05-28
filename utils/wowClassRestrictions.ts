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

/**
 * Reverse lookup: armor type a given class wears.
 *
 * Returns the title-cased armor name ('Cloth', 'Leather', 'Mail', 'Plate'),
 * or null if the class is unknown. Hunter is mapped to Mail here, which
 * matches every expansion currently in LootList+ (Classic-era Hunters wearing
 * leather pre-40 isn't relevant to raid-loot context).
 */
const CLASS_ARMOR_TYPE: Record<string, 'Cloth' | 'Leather' | 'Mail' | 'Plate'> = {
  mage: 'Cloth',
  priest: 'Cloth',
  warlock: 'Cloth',
  druid: 'Leather',
  rogue: 'Leather',
  monk: 'Leather',
  'demon hunter': 'Leather',
  hunter: 'Mail',
  shaman: 'Mail',
  evoker: 'Mail',
  warrior: 'Plate',
  paladin: 'Plate',
  'death knight': 'Plate',
}

export function getClassArmorType(
  className: string | null | undefined
): 'Cloth' | 'Leather' | 'Mail' | 'Plate' | null {
  if (!className) return null
  return CLASS_ARMOR_TYPE[className.toLowerCase()] ?? null
}
