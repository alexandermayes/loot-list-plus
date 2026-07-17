import { describe, it, expect } from 'vitest'
import { blacktemple, mounthyjal, sunwellplateau, tbcRaids } from '../tbc-raids'
import { ITEM_ICONS } from '../item-icons'

type Raid = typeof blacktemple
type Expected = { raid: Raid; id: number; name: string; slot: string; boss: string }

function findByIdInRaid(raid: Raid, id: number) {
  const group = raid.bosses.find(b => b.items.some(i => i.wowhead_id === id))
  return group ? { boss: group.name, item: group.items.find(i => i.wowhead_id === id)! } : null
}

// #171: Black Temple and Hyjal Summit were seeded with no "Trash" group, then
// (reopened) with WRONG wowhead_ids copied from a corrupt script, so items
// rendered the wrong Wowhead tooltip/icon. These lock in the verified-correct
// ids/slots (warcraft.wiki.gg + Wowhead XML) so the mistake can't recur.
describe('TBC trash loot (#171)', () => {
  it.each([
    ['Black Temple', blacktemple],
    ['Hyjal Summit', mounthyjal],
  ])('%s has a non-empty Trash group', (_label, raid) => {
    const trash = raid.bosses.find(b => b.name === 'Trash')
    expect(trash).toBeDefined()
    expect(trash!.items.length).toBeGreaterThan(0)
  })

  const TRASH: Expected[] = [
    { raid: blacktemple, id: 32527, name: 'Ring of Ancient Knowledge', slot: 'Finger', boss: 'Trash' },
    { raid: blacktemple, id: 32526, name: 'Band of Devastation', slot: 'Finger', boss: 'Trash' },
    { raid: blacktemple, id: 32528, name: 'Blessed Band of Karabor', slot: 'Finger', boss: 'Trash' },
    { raid: blacktemple, id: 32608, name: "Pillager's Gauntlets", slot: 'Hands', boss: 'Trash' },
    { raid: blacktemple, id: 32593, name: 'Treads of the Den Mother', slot: 'Feet', boss: 'Trash' },
    { raid: blacktemple, id: 34012, name: 'Shroud of the Final Stand', slot: 'Back', boss: 'Trash' },
    { raid: blacktemple, id: 32943, name: 'Swiftsteel Bludgeon', slot: 'One-Hand', boss: 'Trash' },
    { raid: blacktemple, id: 34011, name: 'Illidari Runeshield', slot: 'Off Hand', boss: 'Trash' },
    { raid: mounthyjal, id: 34010, name: "Pepe's Shroud of Pacification", slot: 'Back', boss: 'Trash' },
    { raid: mounthyjal, id: 32589, name: 'Hellfire-Encased Pendant', slot: 'Neck', boss: 'Trash' },
    { raid: mounthyjal, id: 32946, name: 'Claw of Molten Fury', slot: 'One-Hand', boss: 'Trash' },
    { raid: mounthyjal, id: 32945, name: 'Fist of Molten Fury', slot: 'One-Hand', boss: 'Trash' },
    { raid: mounthyjal, id: 34009, name: 'Hammer of Judgement', slot: 'One-Hand', boss: 'Trash' },
    { raid: mounthyjal, id: 32592, name: 'Chestguard of Relentless Storms', slot: 'Chest', boss: 'Trash' },
    { raid: mounthyjal, id: 32590, name: 'Nethervoid Cloak', slot: 'Back', boss: 'Trash' },
  ]

  it.each(TRASH)('$name maps to id $id in the right Trash group', ({ raid, id, name, slot, boss }) => {
    const found = findByIdInRaid(raid, id)
    expect(found, `${name} (${id}) not found in ${raid.name}`).not.toBeNull()
    expect(found!.boss).toBe(boss)
    expect(found!.item.name).toBe(name)
    expect(found!.item.slot).toBe(slot)
  })
})

// Every raid's loot list must have unique wowhead_ids — a duplicate means an
// item was added under the wrong id.
describe('TBC loot integrity', () => {
  it.each(tbcRaids.map(r => [r.name, r] as const))(
    '%s has no duplicate wowhead_id',
    (_name, raid) => {
      const ids = raid.bosses.flatMap(b => b.items.map(i => i.wowhead_id))
      expect(new Set(ids).size).toBe(ids.length)
    }
  )

  // Regression guard for the broken-icon half of #171: icons come from the
  // static ITEM_ICONS map (data/item-icons.ts), NOT live Wowhead. An item with
  // no entry renders a broken placeholder, so every seeded id must be mapped.
  it('every TBC seeded item has an icon-map entry', () => {
    const missing = tbcRaids
      .flatMap(r => r.bosses.flatMap(b => b.items))
      .filter(i => !ITEM_ICONS[i.wowhead_id])
      .map(i => `${i.name} (${i.wowhead_id})`)
    expect(missing, `missing icons: ${missing.join(', ')}`).toEqual([])
  })
})

// Content audit follow-up to #171: 15 items confirmed missing from the seed
// via Wowhead (slot from XML inventoryType, source cross-checked on
// warcraft.wiki.gg). Lock in their verified placement.
describe('audited TBC item additions', () => {
  const EXPECTED: Expected[] = [
    { raid: blacktemple, id: 32329, name: 'Cowl of Benevolence', slot: 'Head', boss: 'Teron Gorefiend' },
    { raid: sunwellplateau, id: 34204, name: 'Amulet of Unfettered Magics', slot: 'Neck', boss: 'Eredar Twins' },
    { raid: sunwellplateau, id: 34199, name: "Archon's Gavel", slot: 'Main Hand', boss: 'Eredar Twins' },
    { raid: sunwellplateau, id: 34198, name: 'Stanchion of Primal Instinct', slot: 'Two-Hand', boss: 'Eredar Twins' },
    { raid: sunwellplateau, id: 34210, name: 'Amice of the Convoker', slot: 'Shoulder', boss: 'Eredar Twins' },
    { raid: sunwellplateau, id: 34202, name: 'Shawl of Wonderment', slot: 'Shoulder', boss: 'Eredar Twins' },
    { raid: sunwellplateau, id: 34213, name: 'Ring of Hardened Resolve', slot: 'Finger', boss: "M'uru" },
    { raid: sunwellplateau, id: 34230, name: 'Ring of Omnipotence', slot: 'Finger', boss: "M'uru" },
    { raid: sunwellplateau, id: 34427, name: 'Blackened Naaru Sliver', slot: 'Trinket', boss: "M'uru" },
    { raid: sunwellplateau, id: 34428, name: 'Steely Naaru Sliver', slot: 'Trinket', boss: "M'uru" },
    { raid: sunwellplateau, id: 34214, name: 'Muramasa', slot: 'One-Hand', boss: "M'uru" },
    { raid: sunwellplateau, id: 34169, name: 'Breeches of Natural Aggression', slot: 'Legs', boss: 'Kalecgos' },
    { raid: sunwellplateau, id: 34167, name: 'Legplates of the Holy Juggernaut', slot: 'Legs', boss: 'Kalecgos' },
    { raid: sunwellplateau, id: 34350, name: 'Gauntlets of the Ancient Shadowmoon', slot: 'Hands', boss: 'Trash' },
    { raid: sunwellplateau, id: 34351, name: 'Tranquil Majesty Wraps', slot: 'Hands', boss: 'Trash' },
  ]

  it.each(EXPECTED)('$name is under $boss with the right slot/id', ({ raid, id, name, slot, boss }) => {
    const found = findByIdInRaid(raid, id)
    expect(found, `${name} (${id}) not found in ${raid.name}`).not.toBeNull()
    expect(found!.boss).toBe(boss)
    expect(found!.item.name).toBe(name)
    expect(found!.item.slot).toBe(slot)
  })
})
