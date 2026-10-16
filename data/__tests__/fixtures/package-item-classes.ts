import { Items } from 'wow-classic-items'
import type { PackageItem, RaidCatalogRaid } from './package-item-types'

/**
 * Test-side derivation of the class lock the wow-classic-items package
 * carries for an item (GH #276). The package has no `classes` field; the
 * only place a class lock appears is the tooltip line `Classes: A, B`.
 *
 * Shared by data/__tests__/item-class-restrictions.test.ts (the generated
 * map agrees with the package) and the picker sweep in
 * lib/__tests__/loot-items-query.test.ts (the picker agrees with the
 * package). Neither imports the generated map or the generator, so this
 * file is the independent reading of the same source.
 */

export const CLASSES_LINE_PREFIX = 'Classes: '

/**
 * Slots the class-restriction map does not cover. Tokens keep their own rule
 * in data/token-class-mapping.ts (OD-3); recipes show to every class per
 * GH-284 D-03 (OD-4).
 */
export const CLASS_RESTRICTION_EXCLUDED_SLOTS = ['Token', 'Recipe'] as const

const packageById = new Map<number, PackageItem>()
for (const pkgItem of new Items({ iconSrc: false })) {
  packageById.set(pkgItem.itemId, pkgItem)
}

/** The package item for a wowhead id, or undefined when the package lacks it. */
export function packageItemById(wowheadId: number): PackageItem | undefined {
  return packageById.get(wowheadId)
}

/** The sorted class names on the package `Classes:` line, or null when there is none. */
export function packageClasses(item: PackageItem): string[] | null {
  const line = (item.tooltip ?? []).find((entry) => (entry.label ?? '').startsWith(CLASSES_LINE_PREFIX))
  if (!line) return null
  return line.label.slice(CLASSES_LINE_PREFIX.length).split(', ').sort()
}

export interface ClassLockedCatalogItem {
  wowhead_id: number
  name: string
  slot: string
  classes: string[]
}

/**
 * The first occurrence of each catalog wowhead_id, in catalog order, whose
 * slot is not excluded and whose package entry carries a `Classes:` line.
 */
export function classLockedCatalogItems(raids: RaidCatalogRaid[]): ClassLockedCatalogItem[] {
  const seen = new Set<number>()
  const locked: ClassLockedCatalogItem[] = []
  for (const raid of raids) {
    for (const boss of raid.bosses) {
      for (const raidItem of boss.items) {
        if (seen.has(raidItem.wowhead_id)) continue
        seen.add(raidItem.wowhead_id)
        if ((CLASS_RESTRICTION_EXCLUDED_SLOTS as readonly string[]).includes(raidItem.slot)) continue
        const pkgItem = packageById.get(raidItem.wowhead_id)
        if (!pkgItem) continue
        const classes = packageClasses(pkgItem)
        if (!classes) continue
        locked.push({ wowhead_id: raidItem.wowhead_id, name: raidItem.name, slot: raidItem.slot, classes })
      }
    }
  }
  return locked
}
