import { describe, it, expect } from 'vitest'
import { Items } from 'wow-classic-items'
import { classicRaids } from '../classic-wow-raids'
import { tbcRaids } from '../tbc-raids'
import { wrathRaids } from '../wrath-raids'
import { getItemTypeInfo, inferArmorType, ARMOR_SLOTS, ITEM_TYPES } from '../item-types'
import { packageTypeInfo, uniqueArmorSlotPieces } from './fixtures/package-item-types'

// GH-388: with no stored armor type, the picker falls back first to
// ITEM_TYPES and then to inferArmorType's guess from the item's name and
// slot. A guess that is lighter than the item's real armor type (for
// example Cloth guessed for a Mail item) never hides anything, because
// canWearArmorType (data/class-proficiencies.ts) compares against each
// class's heaviest wearable armor: a lighter guess only shows the item to
// more classes than it should. A guess heavier than the real type (Plate
// guessed for a Mail item) hides the item from classes that can wear it,
// which is what hid Dragonstalker's Greaves (GH #388). This gate checks
// that no armor piece in the catalogs below ever resolves heavier than its
// real type, whether resolution comes from an ITEM_TYPES entry or a name
// guess.

type PackageItem = InstanceType<typeof Items>[number]

const packageItems = [...new Items({ iconSrc: false })]
const packageById = new Map<number, PackageItem>(packageItems.map((item) => [item.itemId, item]))

const ARMOR_ORDER = ['Cloth', 'Leather', 'Mail', 'Plate'] as const
type ArmorOrderType = (typeof ARMOR_ORDER)[number]

function armorIndex(type: string | undefined): number {
  if (type === undefined) return -1
  return ARMOR_ORDER.indexOf(type as ArmorOrderType)
}

/** What the picker resolves an empty-stored-type row's armor type to. */
function resolvedArmorType(wowheadId: number, slot: string, name: string): string | undefined {
  const entry = getItemTypeInfo(wowheadId)
  if (entry) {
    return entry.armor_type
  }
  return inferArmorType(slot, name)
}

interface Catalog {
  expansion: string
  raids: Array<{ name: string; bosses: Array<{ name: string; items: Array<{ name: string; slot: string; wowhead_id: number }> }> }>
}

// B and C: Classic, TBC and Wrath (per the OD-2 Resolution).
const CATALOGS: Catalog[] = [
  { expansion: 'Classic', raids: classicRaids },
  { expansion: 'TBC', raids: tbcRaids },
  { expansion: 'Wrath', raids: wrathRaids },
]

function armorPiecesFor(catalog: Catalog) {
  const seen = new Set<number>()
  const pieces: Array<{ expansion: string; raid: string; name: string; slot: string; wowhead_id: number; packageItem: PackageItem }> = []
  for (const raid of catalog.raids) {
    for (const boss of raid.bosses) {
      for (const raidItem of boss.items) {
        if (!(ARMOR_SLOTS as readonly string[]).includes(raidItem.slot)) continue
        if (seen.has(raidItem.wowhead_id)) continue
        seen.add(raidItem.wowhead_id)
        const packageItem = packageById.get(raidItem.wowhead_id)
        if (!packageItem || packageItem.class !== 'Armor' || !ARMOR_ORDER.includes(packageItem.subclass as ArmorOrderType)) {
          continue
        }
        pieces.push({ expansion: catalog.expansion, raid: raid.name, ...raidItem, packageItem })
      }
    }
  }
  return pieces
}

describe('no Classic, TBC or Wrath raid armor piece resolves heavier than its real type (#388)', () => {
  it('no checkable armor piece resolves to an armor type heavier than the package type', () => {
    const failures: string[] = []
    for (const catalog of CATALOGS) {
      for (const piece of armorPiecesFor(catalog)) {
        const resolved = resolvedArmorType(piece.wowhead_id, piece.slot, piece.name)
        const packageType = piece.packageItem.subclass as ArmorOrderType
        if (armorIndex(resolved) > armorIndex(packageType)) {
          failures.push(
            `${piece.expansion} | ${piece.raid} | ${piece.name} (${piece.wowhead_id}): resolves ${resolved}, package ${packageType}`
          )
        }
      }
    }
    expect(failures).toEqual([])
  })
})

// Mirrors the 'Classic raid armor types (#388)' checks in
// classic-catalog-completeness.test.ts; with no entry and an empty stored
// type the picker guesses from the name, and since GH #388 narrowed the
// plate rule most TBC and Wrath armor showed to every class; heroic
// versions have their own ids; two TBC items in armor slots are fist
// weapons in the item data.
describe.each([
  { expansion: 'TBC', raids: tbcRaids, armorSlotCount: 330 },
  { expansion: 'Wrath', raids: wrathRaids, armorSlotCount: 664 },
])('$expansion raid catalog item types (#388)', ({ expansion, raids, armorSlotCount }) => {
  const expansionCatalogEntries = raids.flatMap((raid) =>
    raid.bosses.flatMap((boss) =>
      boss.items.map((raidItem) => ({ raid: raid.name, ...raidItem }))
    )
  )

  it(`has exactly ${armorSlotCount} ${expansion} raid armor-slot pieces`, () => {
    expect(uniqueArmorSlotPieces(raids)).toHaveLength(armorSlotCount)
  })

  it(`every ${expansion} raid armor-slot piece has an ITEM_TYPES entry that agrees with the package`, () => {
    const failures = uniqueArmorSlotPieces(raids)
      .map((piece) => {
        const packageItem = packageById.get(piece.wowhead_id)
        const expected = packageItem ? packageTypeInfo(packageItem) : null
        const actual = ITEM_TYPES[piece.wowhead_id]
        return { piece, actual, expected }
      })
      .filter(({ actual, expected }) => JSON.stringify(actual ?? null) !== JSON.stringify(expected))
      .map(
        ({ piece, actual, expected }) =>
          `${piece.raid} | ${piece.name} (${piece.wowhead_id}): ITEM_TYPES ${actual ? JSON.stringify(actual) : 'none'}, package ${expected ? JSON.stringify(expected) : 'none'}`
      )
    expect(failures).toEqual([])
  })

  it(`every ITEM_TYPES entry for a ${expansion} catalog item agrees with the package`, () => {
    const failures = expansionCatalogEntries
      .filter((entry) => ITEM_TYPES[entry.wowhead_id] !== undefined)
      .filter((entry) => {
        const packageItem = packageById.get(entry.wowhead_id)
        const expected = packageItem ? packageTypeInfo(packageItem) : null
        return JSON.stringify(ITEM_TYPES[entry.wowhead_id]) !== JSON.stringify(expected)
      })
      .map((entry) => {
        const packageItem = packageById.get(entry.wowhead_id)
        const expected = packageItem ? packageTypeInfo(packageItem) : null
        return `${entry.raid} | ${entry.name} (${entry.wowhead_id}) slot ${entry.slot}: ITEM_TYPES ${JSON.stringify(ITEM_TYPES[entry.wowhead_id])}, package ${expected ? JSON.stringify(expected) : 'none'}`
      })
    expect(failures).toEqual([])
  })

  it(`no ${expansion} catalog item with slot Back, Token, Quest or Recipe has an ITEM_TYPES entry`, () => {
    const failures = expansionCatalogEntries
      .filter((entry) => ['Back', 'Token', 'Quest', 'Recipe'].includes(entry.slot))
      .filter((entry) => ITEM_TYPES[entry.wowhead_id] !== undefined)
      .map((entry) => `${entry.raid} | ${entry.name} (${entry.wowhead_id})`)
    expect(failures).toEqual([])
  })
})

// Unit cases for the narrowed Plate rule (OD-2 B and C): "greaves",
// "sabatons", "breastplate" and "vambraces" name mail and plate pieces
// alike, so they no longer mean Plate on their own; a name containing
// "plate" but not "breastplate" still does.
describe('inferArmorType', () => {
  it.each([
    ['Feet', "Dragonstalker's Greaves"],
    ['Feet', 'Sabatons of the Flamewalker'],
    ['Chest', "Dragonstalker's Breastplate"],
    ['Wrist', "Scourge Hunter's Vambraces"],
    ['Hands', 'Gauntlets of Might'],
    ['Back', 'Battleplate Cloak'],
  ])('returns undefined for (%s, %s)', (slot, name) => {
    expect(inferArmorType(slot, name)).toBeUndefined()
  })

  it.each([
    ['Chest', 'Battleplate of the Apocalypse'],
    ['Legs', 'Legplates of Wrath'],
    ['Hands', 'Plated Fists of Provocation'],
  ])("returns 'Plate' for (%s, %s)", (slot, name) => {
    expect(inferArmorType(slot, name)).toBe('Plate')
  })

  it("returns 'Mail' for ('Chest', 'Chainmail Hauberk')", () => {
    expect(inferArmorType('Chest', 'Chainmail Hauberk')).toBe('Mail')
  })

  it("returns 'Cloth' for ('Chest', 'Robes of Prophecy')", () => {
    expect(inferArmorType('Chest', 'Robes of Prophecy')).toBe('Cloth')
  })
})
