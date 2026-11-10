import { describe, it, expect } from 'vitest'
import { TBC_BIS } from '@/data/bis/tbc-bis'
import { tbcRaids } from '@/data/tbc-raids'

// #484: an officer saw a tank neck at rank 50 on a hunter's list after Import
// BIS. Import BIS matches BiS ids against the guild's loot table and ranks them
// by the loot item's real slot, so a neck entry that is the wrong item, the
// wrong raid or the wrong role either does nothing or imports the wrong gear.

// BiS tier key -> name in tbcRaids
const RAID_NAME_BY_TIER: Record<string, string> = {
  'Karazhan': 'Karazhan',
  "Gruul's Lair": "Gruul's Lair",
  "Magtheridon's Lair": "Magtheridon's Lair",
  'Serpentshrine Cavern': 'Serpentshrine Cavern',
  'Tempest Keep': 'Tempest Keep: The Eye',
  'Hyjal Summit': 'Hyjal Summit',
  'Black Temple': 'Black Temple',
  "Zul'Aman": "Zul'Aman",
  'Sunwell Plateau': 'Sunwell Plateau',
}

type NeckRole = 'tank' | 'healer' | 'healerCaster' | 'caster' | 'physical'

// Role of every Neck item in tbcRaids, classified from its stats in the
// wow-classic-items package.
const NECK_ROLE_IDS: Record<NeckRole, number[]> = {
  tank: [28516, 30099, 32362, 34178],
  healer: [28731, 28822, 32370, 33281, 34184, 35291],
  healerCaster: [28609, 32589],
  caster: [28530, 28762, 30666, 30008, 32349, 33466, 34204, 35290],
  physical: [28509, 28674, 28745, 30022, 30059, 32260, 32591, 33297, 34177, 35292],
}

const NECK_ROLE = new Map<number, NeckRole>(
  (Object.entries(NECK_ROLE_IDS) as [NeckRole, number[]][]).flatMap(([role, ids]) =>
    ids.map(id => [id, role] as [number, NeckRole])
  )
)

const ROLES_BY_SPEC_GROUP: Record<string, NeckRole[]> = {
  tank: ['tank'],
  guardian: ['tank', 'physical'],
  healer: ['healer', 'healerCaster'],
  caster: ['caster', 'healerCaster'],
  physical: ['physical'],
}

const SPEC_GROUP: Record<string, keyof typeof ROLES_BY_SPEC_GROUP> = {
  'Protection Paladin': 'tank',
  'Protection Warrior': 'tank',
  'Guardian Druid': 'guardian',
  'Holy Paladin': 'healer',
  'Restoration Shaman': 'healer',
  'Restoration Druid': 'healer',
  'Holy/Disc Priest': 'healer',
  'Elemental Shaman': 'caster',
  'Balance Druid': 'caster',
  'Shadow Priest': 'caster',
  'Mage': 'caster',
  'Warlock': 'caster',
  'Retribution Paladin': 'physical',
  'Enhancement Shaman': 'physical',
  'Feral Druid': 'physical',
  'Arms/Fury Warrior': 'physical',
  'Hunter': 'physical',
  'Rogue': 'physical',
}

const raidItems = new Map<string, Map<number, string>>()
const allNeckIds = new Set<number>()
for (const raid of tbcRaids) {
  const items = new Map<number, string>()
  for (const boss of raid.bosses) {
    for (const item of boss.items) {
      items.set(item.wowhead_id, item.slot)
      if (item.slot === 'Neck') allNeckIds.add(item.wowhead_id)
    }
  }
  raidItems.set(raid.name, items)
}

interface NeckEntry {
  spec: string
  tier: string
  id: number
}
const neckEntries: NeckEntry[] = []
const nonNeckSlotEntries: { spec: string; tier: string; slot: string; id: number }[] = []
for (const [spec, tiers] of Object.entries(TBC_BIS)) {
  for (const [tier, slots] of Object.entries(tiers)) {
    for (const [slot, items] of Object.entries(slots)) {
      for (const { wowhead_id } of items ?? []) {
        if (slot === 'Neck') neckEntries.push({ spec, tier, id: wowhead_id })
        else nonNeckSlotEntries.push({ spec, tier, slot, id: wowhead_id })
      }
    }
  }
}

describe('TBC BiS necks', () => {
  it('has a role for every Neck item in tbcRaids', () => {
    const missing = [...allNeckIds].filter(id => !NECK_ROLE.has(id))
    expect(missing).toEqual([])
  })

  it('has a role group for every TBC_BIS spec', () => {
    const missing = Object.keys(TBC_BIS).filter(spec => !(spec in SPEC_GROUP))
    expect(missing).toEqual([])
  })

  it('has a raid name for every BiS tier', () => {
    const tiers = new Set(neckEntries.map(e => e.tier))
    for (const tier of tiers) expect(RAID_NAME_BY_TIER, tier).toHaveProperty(tier)
  })

  it.each(neckEntries.map(e => [`${e.spec} / ${e.tier} / ${e.id}`, e] as const))(
    '%s is a Neck drop of that raid',
    (_label, { tier, id }) => {
      expect(raidItems.get(RAID_NAME_BY_TIER[tier])?.get(id)).toBe('Neck')
    }
  )

  it.each(neckEntries.map(e => [`${e.spec} / ${e.tier} / ${e.id}`, e] as const))(
    '%s fits the spec role',
    (_label, { spec, id }) => {
      const role = NECK_ROLE.get(id)
      const allowed = ROLES_BY_SPEC_GROUP[SPEC_GROUP[spec]]
      expect(role, `role of ${id}`).toBeDefined()
      expect(allowed).toContain(role)
    }
  )

  it('has no entry in another slot that points at a neck', () => {
    const wrong = nonNeckSlotEntries
      .filter(e => allNeckIds.has(e.id))
      .map(e => `${e.spec} / ${e.tier} / ${e.slot} / ${e.id}`)
    expect(wrong).toEqual([])
  })

  // regression for #484
  it('only lists Pendant of Titans (32362) for tank specs', () => {
    const wrong = neckEntries
      .filter(e => e.id === 32362 && SPEC_GROUP[e.spec] !== 'tank' && SPEC_GROUP[e.spec] !== 'guardian')
      .map(e => `${e.spec} / ${e.tier}`)
    expect(wrong).toEqual([])
  })

  // regression for #484
  it('gives Hunter only physical necks in every raid', () => {
    const hunter = neckEntries.filter(e => e.spec === 'Hunter')
    expect(hunter.length).toBeGreaterThan(0)
    for (const { tier, id } of hunter) {
      expect(NECK_ROLE.get(id), `${tier} / ${id}`).toBe('physical')
    }
  })
})
