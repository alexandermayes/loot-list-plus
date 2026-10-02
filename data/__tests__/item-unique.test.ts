import { describe, it, expect } from 'vitest'
import { Items } from 'wow-classic-items'
import { ITEM_UNIQUE, ONE_HAND_WEAPON_IDS } from '../item-unique'
import { classicRaids } from '../classic-wow-raids'
import { tbcRaids } from '../tbc-raids'
import { wrathRaids } from '../wrath-raids'
import { cataRaids } from '../cata-raids'
import { mopRaids } from '../mop-raids'

// GH #293: the unique map must agree with the wow-classic-items package for
// every id the package has, and cover every paired-slot catalog item, so a
// raider can list a non-unique ring twice and a unique one only once.

interface PackageItem {
  itemId: number
  slot?: string
  tooltip?: { label?: string }[]
}

const packageById = new Map<number, PackageItem>()
for (const item of new Items({ iconSrc: false })) {
  packageById.set(item.itemId, item as PackageItem)
}

const packageIsUnique = (item: PackageItem) =>
  (item.tooltip ?? []).some(line => (line.label ?? '').startsWith('Unique'))

const allRaids = [...classicRaids, ...tbcRaids, ...wrathRaids, ...cataRaids, ...mopRaids]

function catalogIds(raids: typeof allRaids, slots: string[]): Set<number> {
  const ids = new Set<number>()
  for (const raid of raids) {
    for (const boss of raid.bosses) {
      for (const item of boss.items) {
        if (slots.includes(item.slot)) ids.add(item.wowhead_id)
      }
    }
  }
  return ids
}

describe('ITEM_UNIQUE', () => {
  it('agrees with the package Unique tooltip for every id the package has', () => {
    const disagreements: number[] = []
    for (const [id, isUnique] of Object.entries(ITEM_UNIQUE)) {
      const packageItem = packageById.get(Number(id))
      if (packageItem && packageIsUnique(packageItem) !== isUnique) disagreements.push(Number(id))
    }
    expect(disagreements).toEqual([])
  })

  it('has a flag for every paired-slot catalog item and every one-hand weapon', () => {
    const missing: number[] = []
    for (const id of [...catalogIds(allRaids, ['One-Hand', 'Finger', 'Trinket']), ...ONE_HAND_WEAPON_IDS]) {
      if (ITEM_UNIQUE[id] === undefined) missing.push(id)
    }
    expect(missing).toEqual([])
  })
})

describe('ONE_HAND_WEAPON_IDS', () => {
  it('lists exactly the Classic Weapon items the package calls One-Hand', () => {
    const expected = [...catalogIds(classicRaids, ['Weapon'])]
      .filter(id => packageById.get(id)?.slot === 'One-Hand')
      .sort((a, b) => a - b)
    expect(expected).toHaveLength(33)
    expect([...ONE_HAND_WEAPON_IDS]).toEqual(expected)
  })
})
