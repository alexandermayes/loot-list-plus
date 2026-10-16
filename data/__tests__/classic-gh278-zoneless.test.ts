import { describe, it, expect } from 'vitest'
import { Items } from 'wow-classic-items'
import { classicRaids } from '../classic-wow-raids'
import { ITEM_ICONS } from '../item-icons'
import { GH273_CORE } from './fixtures/classic-gh273-core'
import { GH278_PLACED, GH278_ZONELESS, ZONELESS_SOURCE_RAID } from './fixtures/classic-gh278-zoneless'

// GH-278: the completeness gate only sees package items with a source.zone,
// and wow-classic-items 2.0.1 has no source at all for these 32 Epic ids. The
// fixture is the expectation the gate cannot derive from the package, so this
// suite keeps the fixture honest against the package instead: shape, raid
// placement, and per row the package name, quality, icon and the absence of a
// source. The catalog is read here only to confirm the placement targets
// (raid and boss group names) exist, never to supply the expected rows.

type PackageItem = InstanceType<typeof Items>[number]

// iconSrc false keeps the raw icon name, the form data/item-icons.ts stores.
const packageItems = [...new Items({ iconSrc: false })]
const packageById = new Map<number, PackageItem>(packageItems.map(item => [item.itemId, item]))

// Naxxramas shares zone 3456 with the Wrath version, whose ids are all above
// this bound; the completeness suite uses the same cutoff.
const MAX_CLASSIC_ITEM_ID = 25000
const ONYXIAS_LAIR_ZONE = 2159

function countBy<T>(items: readonly T[], key: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) counts[key(item)] = (counts[key(item)] ?? 0) + 1
  return counts
}

describe('Classic zone-less source fixture (#278)', () => {
  it('has 32 entries with 32 unique ids: Cache of the Firelord 5, Onyxia 18, Four Horsemen Chest 9', () => {
    expect(GH278_ZONELESS).toHaveLength(32)
    expect(new Set(GH278_ZONELESS.map(item => item.id)).size).toBe(32)
    expect(countBy(GH278_ZONELESS, item => item.source)).toEqual({
      'Cache of the Firelord': 5,
      'Onyxia': 18,
      'Four Horsemen Chest': 9,
    })
  })

  it("places 5 rows in Molten Core, 18 in Onyxia's Lair and 9 in Naxxramas", () => {
    expect(countBy(GH278_PLACED, item => item.raid)).toEqual({
      'Molten Core': 5,
      "Onyxia's Lair": 18,
      'Naxxramas': 9,
    })
  })

  it('maps every source to a catalog raid and every boss to a real boss group of that raid', () => {
    const bossGroupsByRaid = new Map(classicRaids.map(raid => [raid.name, new Set(raid.bosses.map(boss => boss.name))]))
    for (const raid of Object.values(ZONELESS_SOURCE_RAID)) {
      expect(bossGroupsByRaid.has(raid), `catalog has no raid named ${raid}`).toBe(true)
    }
    for (const item of GH278_PLACED) {
      expect(
        bossGroupsByRaid.get(item.raid)?.has(item.boss),
        `${item.raid} catalog has no boss group "${item.boss}" (fixture row ${item.name}, ${item.id})`,
      ).toBe(true)
    }
  })

  it.each(GH278_ZONELESS)(
    '$name ($id) is an Epic Classic item the package records no source for, with the package name and icon',
    expected => {
      const packageItem = packageById.get(expected.id)
      expect(packageItem, `package has no item ${expected.id}`).toBeDefined()
      expect(packageItem!.itemId).toBeLessThan(MAX_CLASSIC_ITEM_ID)
      expect(packageItem!.quality).toBe('Epic')
      // The type says source is always present, but the package has none for
      // these ids. If one appears, the package now attributes this item, so
      // the row must leave the fixture and the zone gate takes over.
      expect(
        packageItem!.source,
        `the package now attributes ${expected.name} (${expected.id}); remove it from the #278 fixture so the zone gate covers it`,
      ).toBeUndefined()
      expect(packageItem!.name).toBe(expected.name)
      expect(ITEM_ICONS[expected.id]).toBe(packageItem!.icon)
    },
  )

  it("the package has no item in zone 2159, so Onyxia's Lair depends on this fixture", () => {
    const inOnyxiasLair = packageItems.filter(item => item.source?.zone === ONYXIAS_LAIR_ZONE)
    expect(inOnyxiasLair).toHaveLength(0)
  })

  it('overlaps GH273_CORE on exactly the four Cache and Sinew ids', () => {
    const coreIds = new Set(GH273_CORE.map(item => item.id))
    const overlap = GH278_ZONELESS.map(item => item.id).filter(id => coreIds.has(id)).sort((a, b) => a - b)
    expect(overlap).toEqual([18705, 18808, 19139, 19140])
  })
})
