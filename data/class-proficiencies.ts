/**
 * Class Proficiencies for WoW Classic / TBC
 *
 * Defines which weapon types and armor types each class can equip.
 * Used to filter loot items so players only see items they can use.
 *
 * Reference: https://wowwiki-archive.fandom.com/wiki/Class_proficiencies
 */

// Weapon types that exist in the game
export type WeaponType =
  | 'Dagger'
  | 'Fist Weapon'
  | 'One-Handed Axe'
  | 'Two-Handed Axe'
  | 'One-Handed Mace'
  | 'Two-Handed Mace'
  | 'One-Handed Sword'
  | 'Two-Handed Sword'
  | 'Polearm'
  | 'Staff'
  | 'Bow'
  | 'Crossbow'
  | 'Gun'
  | 'Thrown'
  | 'Wand'
  | 'Shield'

// Armor types in order of "heaviness"
export type ArmorType = 'Cloth' | 'Leather' | 'Mail' | 'Plate'

// WoW class names (matching database)
export type WowClassName =
  | 'Warrior'
  | 'Paladin'
  | 'Hunter'
  | 'Rogue'
  | 'Priest'
  | 'Shaman'
  | 'Mage'
  | 'Warlock'
  | 'Druid'

export interface ClassProficiency {
  weapons: WeaponType[]
  maxArmorType: ArmorType  // Can wear this and all lighter types
}

/**
 * Class proficiencies for TBC (level 70)
 * Note: Hunters/Shamans wear Mail at 40+, which applies to all TBC content
 */
export const CLASS_PROFICIENCIES: Record<WowClassName, ClassProficiency> = {
  Warrior: {
    weapons: [
      'Dagger',
      'Fist Weapon',
      'One-Handed Axe',
      'Two-Handed Axe',
      'One-Handed Mace',
      'Two-Handed Mace',
      'One-Handed Sword',
      'Two-Handed Sword',
      'Polearm',
      'Staff',
      'Bow',
      'Crossbow',
      'Gun',
      'Thrown',
      'Shield',
    ],
    maxArmorType: 'Plate',
  },

  Paladin: {
    weapons: [
      'One-Handed Axe',
      'Two-Handed Axe',
      'One-Handed Mace',
      'Two-Handed Mace',
      'One-Handed Sword',
      'Two-Handed Sword',
      'Polearm',
      'Shield',
    ],
    maxArmorType: 'Plate',
  },

  Hunter: {
    weapons: [
      'Dagger',
      'Fist Weapon',
      'One-Handed Axe',
      'Two-Handed Axe',
      'One-Handed Sword',
      'Two-Handed Sword',
      'Polearm',
      'Staff',
      'Bow',
      'Crossbow',
      'Gun',
      'Thrown',
    ],
    maxArmorType: 'Mail',
  },

  Rogue: {
    weapons: [
      'Dagger',
      'Fist Weapon',
      'One-Handed Mace',
      'One-Handed Sword',
      'Bow',
      'Crossbow',
      'Gun',
      'Thrown',
    ],
    maxArmorType: 'Leather',
  },

  Priest: {
    weapons: ['Dagger', 'One-Handed Mace', 'Staff', 'Wand'],
    maxArmorType: 'Cloth',
  },

  Shaman: {
    weapons: [
      'Dagger',
      'Fist Weapon',
      'One-Handed Axe',
      'Two-Handed Axe',
      'One-Handed Mace',
      'Two-Handed Mace',
      'Staff',
      'Shield',
    ],
    maxArmorType: 'Mail',
  },

  Mage: {
    weapons: ['Dagger', 'One-Handed Sword', 'Staff', 'Wand'],
    maxArmorType: 'Cloth',
  },

  Warlock: {
    weapons: ['Dagger', 'One-Handed Sword', 'Staff', 'Wand'],
    maxArmorType: 'Cloth',
  },

  Druid: {
    weapons: [
      'Dagger',
      'Fist Weapon',
      'One-Handed Mace',
      'Two-Handed Mace',
      'Polearm',
      'Staff',
    ],
    maxArmorType: 'Leather',
  },
}

// Armor type hierarchy for comparison
const ARMOR_HIERARCHY: ArmorType[] = ['Cloth', 'Leather', 'Mail', 'Plate']

/**
 * Check if a class can wear a specific armor type
 */
export function canWearArmorType(
  className: WowClassName,
  armorType: ArmorType
): boolean {
  const maxArmor = CLASS_PROFICIENCIES[className].maxArmorType
  const maxIndex = ARMOR_HIERARCHY.indexOf(maxArmor)
  const itemIndex = ARMOR_HIERARCHY.indexOf(armorType)
  return itemIndex <= maxIndex
}

/**
 * Check if a class can use a specific weapon type
 */
export function canUseWeaponType(
  className: WowClassName,
  weaponType: WeaponType
): boolean {
  return CLASS_PROFICIENCIES[className].weapons.includes(weaponType)
}

/**
 * Get all armor types a class can wear
 */
export function getWearableArmorTypes(className: WowClassName): ArmorType[] {
  const maxArmor = CLASS_PROFICIENCIES[className].maxArmorType
  const maxIndex = ARMOR_HIERARCHY.indexOf(maxArmor)
  return ARMOR_HIERARCHY.slice(0, maxIndex + 1)
}

/**
 * Items that are class-agnostic (any class can use regardless of proficiency)
 * These slots don't have armor type restrictions
 */
export const CLASS_AGNOSTIC_SLOTS = [
  'Neck',
  'Back',
  'Finger',
  'Trinket',
  'Relic',
  'Idol',              // Druid relics
  'Totem',             // Shaman relics
  'Libram',            // Paladin relics
  'Held In Off-hand',  // Caster off-hands
  'Off-Hand',          // Alternative off-hand slot name (with hyphen)
  'Off Hand',          // Alternative off-hand slot name (without hyphen)
  'Recipe',
  'Mount',
  'Book',              // Recipe/spell books
  'Token',             // Tier tokens (class-restricted via token-class-mapping.ts)
  'Quest',             // Quest items
  'Bag',               // Bags
  'Enchant',           // Enchantments (not equippable gear)
  'Crafting',          // Crafting materials
]

/**
 * Check if an item slot is class-agnostic (any class can equip)
 */
export function isClassAgnosticSlot(slot: string): boolean {
  return CLASS_AGNOSTIC_SLOTS.includes(slot)
}
