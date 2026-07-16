import { describe, it, expect } from 'vitest'
import { parseWowSimsExport } from '../wowsims-parser'

describe('parseWowSimsExport', () => {
  // Regression guard for #172. The WoWSims TBC "full sim" / website export
  // differs from the addon export in two ways that both broke import:
  //   1. class is the protobuf enum form "ClassShaman" (addon: "Shaman")
  //   2. gear is a positional array under equipment.items in ItemSlot order,
  //      with no per-item `slot` field (addon: explicit slot on each item)
  describe('full-sim / website export (#172)', () => {
    // player.name + player.class present -> the player object IS the character.
    // equipment.items is positional: [Head, Neck, Shoulder, Back, ...].
    const fullSimExport = JSON.stringify({
      player: {
        name: 'Zaptest',
        level: 70,
        race: 'RaceDraenei',
        class: 'ClassShaman',
        equipment: {
          items: [
            { id: 34333, name: 'Cursed Vision of Sargeras' }, // index 0 -> HEAD
            { id: 34204 }, // index 1 -> NECK
            {}, // index 2 -> SHOULDER, empty: dropped, must not shift later slots
            { id: 34242, enchant: { id: 2621 }, gems: [{ id: 32409 }] }, // index 3 -> BACK
          ],
        },
      },
    })

    it('strips the ClassShaman enum prefix and resolves the class', () => {
      const result = parseWowSimsExport(fullSimExport)
      expect(result.success).toBe(true)
      expect(result.data?.className).toBe('Shaman')
    })

    it('strips the Race enum prefix', () => {
      const result = parseWowSimsExport(fullSimExport)
      expect(result.data?.race).toBe('Draenei')
    })

    it('assigns slots from array position when items have no slot field', () => {
      const result = parseWowSimsExport(fullSimExport)
      const slots = result.data?.items.map(i => i.slot)
      // Head + Neck + Back; the empty Shoulder entry is dropped without
      // knocking Back out of alignment.
      expect(slots).toEqual(['Head', 'Neck', 'Back'])
    })

    it('carries item id, name, enchant and gems through', () => {
      const result = parseWowSimsExport(fullSimExport)
      const back = result.data?.items.find(i => i.slot === 'Back')
      expect(back).toMatchObject({ wowheadId: 34242, enchantId: 2621, gemIds: [32409] })
      const head = result.data?.items.find(i => i.slot === 'Head')
      expect(head?.itemName).toBe('Cursed Vision of Sargeras')
    })
  })

  it.each([
    ['ClassWarrior', 'Warrior'],
    ['ClassDeathKnight', 'Death Knight'],
    ['ClassMage', 'Mage'],
  ])('resolves enum-prefixed class %s -> %s', (enumClass, expected) => {
    const json = JSON.stringify({
      name: 'X',
      class: enumClass,
      equipment: { items: [{ id: 100 }] },
    })
    const result = parseWowSimsExport(json)
    expect(result.success).toBe(true)
    expect(result.data?.className).toBe(expected)
  })

  it('still parses the addon export format (bare class + explicit slots)', () => {
    const addonExport = JSON.stringify({
      character: { name: 'Bob', level: 70, gameClass: 'Warrior', race: 'Orc' },
      items: [
        { id: 30000, slot: 'HEAD', name: 'Helm' },
        { id: 30001, slot: 'MAIN_HAND' },
      ],
    })
    const result = parseWowSimsExport(addonExport)
    expect(result.success).toBe(true)
    expect(result.data?.className).toBe('Warrior')
    expect(result.data?.race).toBe('Orc')
    expect(result.data?.items.map(i => i.slot)).toEqual(['Head', 'Main Hand'])
  })

  it('still reports genuinely unknown classes with the original value', () => {
    const json = JSON.stringify({
      name: 'X',
      class: 'ClassBanana',
      equipment: { items: [{ id: 100 }] },
    })
    const result = parseWowSimsExport(json)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Unknown class: ClassBanana')
  })
})
