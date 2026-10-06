import { Items } from 'wow-classic-items'
import type { WeaponType } from '../../class-proficiencies'
import type { ItemTypeInfo } from '../../item-types'

/**
 * Shared by the Classic catalog completeness guard and the TBC and Wrath
 * guards in data/__tests__/item-types.test.ts, plus the picker tests in
 * lib/__tests__/loot-items-query.test.ts, so "agrees with the package" means
 * the same thing for every expansion.
 */

export type PackageItem = InstanceType<typeof Items>[number]

/** Map a package weapon (or shield) to the WeaponType the proficiency table uses. */
export function packageWeaponType(item: PackageItem): WeaponType | null {
  if (item.class === 'Armor' && item.subclass === 'Shield') return 'Shield'
  if (item.class !== 'Weapon') return null
  const hand = item.slot === 'Two-Hand' ? 'Two-Handed' : 'One-Handed'
  switch (item.subclass) {
    case 'Axe': return `${hand} Axe`
    case 'Mace': return `${hand} Mace`
    case 'Sword': return `${hand} Sword`
    case 'Dagger':
    case 'Staff':
    case 'Polearm':
    case 'Fist Weapon':
    case 'Bow':
    case 'Crossbow':
    case 'Gun':
    case 'Wand':
    case 'Thrown':
      return item.subclass
    default:
      return null
  }
}

/** The ITEM_TYPES entry the package implies for an armor piece or weapon. */
export function packageTypeInfo(item: PackageItem): ItemTypeInfo | null {
  if (item.class === 'Armor' && ['Cloth', 'Leather', 'Mail', 'Plate'].includes(item.subclass)) {
    return { armor_type: item.subclass as ItemTypeInfo['armor_type'] }
  }
  const weaponType = packageWeaponType(item)
  return weaponType ? { weapon_type: weaponType } : null
}
