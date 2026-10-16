import { describe, it, expect } from 'vitest'
import { ITEM_CLASS_RESTRICTIONS } from '../item-class-restrictions'
import { classicRaids } from '../classic-wow-raids'
import { tbcRaids } from '../tbc-raids'
import { wrathRaids } from '../wrath-raids'
import { classLockedCatalogItems } from './fixtures/package-item-classes'

// GH #276: the generated class-restriction map must agree with the
// wow-classic-items package for every class-locked Classic, TBC and Wrath
// catalog item, and must carry nothing else (no Token, no Recipe, no item
// without a Classes line), so the picker hides exactly what the game hides.

const classicLocked = classLockedCatalogItems(classicRaids)
const tbcLocked = classLockedCatalogItems(tbcRaids)
const wrathLocked = classLockedCatalogItems(wrathRaids)
const allLocked = [...classicLocked, ...tbcLocked, ...wrathLocked]
const lockedIds = new Set(allLocked.map((lockedItem) => lockedItem.wowhead_id))

const sorted = (classes: readonly string[] | undefined) => (classes ? [...classes].sort() : undefined)

describe('ITEM_CLASS_RESTRICTIONS (#276)', () => {
  it('agrees with the package Classes line for every covered catalog id', () => {
    const disagreements: Array<{ id: number; map: string[] | undefined; pkg: string[] }> = []
    const missing: number[] = []
    for (const lockedItem of allLocked) {
      const mapped = sorted(ITEM_CLASS_RESTRICTIONS[lockedItem.wowhead_id])
      if (!mapped) {
        missing.push(lockedItem.wowhead_id)
      } else if (JSON.stringify(mapped) !== JSON.stringify(lockedItem.classes)) {
        disagreements.push({ id: lockedItem.wowhead_id, map: mapped, pkg: lockedItem.classes })
      }
    }
    expect(missing).toEqual([])
    expect(disagreements).toEqual([])
  })

  it('has no entry for a catalog id without a Classes line, a Token id or a Recipe id', () => {
    const unexpected = Object.keys(ITEM_CLASS_RESTRICTIONS)
      .map(Number)
      .filter((id) => !lockedIds.has(id))
    expect(unexpected).toEqual([])

    // Mish'undare, Circlet of the Mind Flayer: cloth head with no class line.
    expect(ITEM_CLASS_RESTRICTIONS[19375]).toBeUndefined()
    // Qiraji Bindings of Command: slot Token, ruled by TOKEN_CLASS_MAPPING (OD-3).
    expect(ITEM_CLASS_RESTRICTIONS[20928]).toBeUndefined()
    // Pattern: Core Felcloth Bag: slot Recipe, visible to every class per GH-284 D-03 (OD-4).
    expect(ITEM_CLASS_RESTRICTIONS[21371]).toBeUndefined()
  })

  it('pins the #276 samples', () => {
    for (const arcanistId of [16795, 16796, 16797, 16798, 16799, 16800, 16801, 16802]) {
      expect(ITEM_CLASS_RESTRICTIONS[arcanistId]).toEqual(['Mage'])
    }
    expect(ITEM_CLASS_RESTRICTIONS[21889]).toEqual(['Paladin'])
    expect(ITEM_CLASS_RESTRICTIONS[16941]).toEqual(['Hunter'])
    expect(sorted(ITEM_CLASS_RESTRICTIONS[49495])).toEqual(['Death Knight', 'Paladin', 'Warrior'])
  })

  it('covers exactly 207 ids (174 Classic, 13 TBC, 20 Wrath)', () => {
    // Pinning the count is the repo pattern (see the 341 Classic armor pieces
    // in lib/__tests__/loot-items-query.test.ts); a catalog change updates the
    // pin alongside the regenerated map.
    expect(classicLocked).toHaveLength(174)
    expect(tbcLocked).toHaveLength(13)
    expect(wrathLocked).toHaveLength(20)
    expect(Object.keys(ITEM_CLASS_RESTRICTIONS)).toHaveLength(207)
  })
})
