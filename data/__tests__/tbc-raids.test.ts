import { describe, it, expect } from 'vitest'
import { blacktemple, mounthyjal, sunwellplateau, tbcRaids } from '../tbc-raids'

// Regression guard for #171: Black Temple and Hyjal Summit were seeded with
// no "Trash" boss group, so their trash loot never showed in Loot Management.
describe('TBC trash loot (#171)', () => {
  it.each([
    ['Black Temple', blacktemple],
    ['Hyjal Summit', mounthyjal],
  ])('%s has a non-empty Trash group', (_label, raid) => {
    const trash = raid.bosses.find(b => b.name === 'Trash')
    expect(trash).toBeDefined()
    expect(trash!.items.length).toBeGreaterThan(0)
  })
})

// Every raid's loot list must have unique wowhead_ids — a duplicate means an
// item was added under the wrong id (the failure mode that made the deleted
// add-missing-year2-items script untrustworthy).
describe('TBC loot integrity', () => {
  it.each(tbcRaids.map(r => [r.name, r] as const))(
    '%s has no duplicate wowhead_id',
    (_name, raid) => {
      const ids = raid.bosses.flatMap(b => b.items.map(i => i.wowhead_id))
      expect(new Set(ids).size).toBe(ids.length)
    }
  )
})

// Content audit follow-up to #171: 15 items were confirmed missing from the
// seed via Wowhead (slot from XML inventoryType, boss source cross-checked on
// warcraft.wiki.gg). Lock in their verified placement.
describe('audited TBC item additions', () => {
  const EXPECTED: Array<{
    raid: typeof blacktemple
    id: number
    name: string
    slot: string
    boss: string
  }> = [
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
    const group = raid.bosses.find(b => b.items.some(i => i.wowhead_id === id))
    expect(group, `${name} (${id}) not found in ${raid.name}`).toBeDefined()
    expect(group!.name).toBe(boss)
    const item = group!.items.find(i => i.wowhead_id === id)!
    expect(item.name).toBe(name)
    expect(item.slot).toBe(slot)
  })
})
