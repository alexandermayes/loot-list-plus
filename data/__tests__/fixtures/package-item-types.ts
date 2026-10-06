import { Items } from 'wow-classic-items'
import type { WeaponType } from '../../class-proficiencies'
import { ARMOR_SLOTS, type ItemTypeInfo } from '../../item-types'

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

export interface RaidCatalogItem {
  name: string
  slot: string
  wowhead_id: number
}

export interface RaidCatalogBoss {
  name: string
  items: RaidCatalogItem[]
}

export interface RaidCatalogRaid {
  name: string
  bosses: RaidCatalogBoss[]
}

export interface ArmorSlotPiece {
  raid: string
  boss: string
  name: string
  slot: string
  wowhead_id: number
}

/**
 * The first occurrence of each wowhead_id whose catalog slot is in
 * ARMOR_SLOTS, in catalog order (raid order, then boss order, then item
 * order). Used by the TBC and Wrath guards and the picker proof so both
 * work from the same definition of "a raid armor piece".
 */
export function uniqueArmorSlotPieces(raids: RaidCatalogRaid[]): ArmorSlotPiece[] {
  const seen = new Set<number>()
  const pieces: ArmorSlotPiece[] = []
  for (const raid of raids) {
    for (const boss of raid.bosses) {
      for (const raidItem of boss.items) {
        if (!(ARMOR_SLOTS as readonly string[]).includes(raidItem.slot)) continue
        if (seen.has(raidItem.wowhead_id)) continue
        seen.add(raidItem.wowhead_id)
        pieces.push({ raid: raid.name, boss: boss.name, ...raidItem })
      }
    }
  }
  return pieces
}
