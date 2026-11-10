import { describe, it, expect } from 'vitest'
import { TBC_BIS } from '@/data/bis/tbc-bis'
import { tbcRaids } from '@/data/tbc-raids'
import { canWearArmorType, canUseWeaponType, type WowClassName } from '@/data/class-proficiencies'
import { packageItemById, packageClasses } from './fixtures/package-item-classes'
import { packageTypeInfo, type PackageItem } from './fixtures/package-item-types'

// #484 follow-up: the Neck audit in tbc-bis-necks.test.ts found a tank neck
// on a hunter's list. This widens the same check to every other slot. Import
// BIS matches a BiS id against the loot table of the guild's active tiers
// and ranks the match by the loot item's slot, so an entry under the wrong
// tier key never imports, an unusable or off-role id imports gear the raider
// cannot or should not want, and an off-table id does nothing at all.
//
// Off-table ids (crafted, badge, reputation, dungeon and the tier set pieces
// made from tokens) are not errors in this file, they are the known import
// gap, so they are only counted. Tier tokens sit on the loot table under slot
// 'Token' and are listed here under the equipment slot they turn into, which
// is the one naming difference besides the weapon and off-hand variants.

// BiS tier key -> name in tbcRaids (same map as tbc-bis-necks.test.ts)
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

const SPEC_CLASS: Record<string, WowClassName> = {
  'Holy Paladin': 'Paladin',
  'Retribution Paladin': 'Paladin',
  'Protection Paladin': 'Paladin',
  'Restoration Shaman': 'Shaman',
  'Elemental Shaman': 'Shaman',
  'Enhancement Shaman': 'Shaman',
  'Restoration Druid': 'Druid',
  'Feral Druid': 'Druid',
  'Guardian Druid': 'Druid',
  'Balance Druid': 'Druid',
  'Protection Warrior': 'Warrior',
  'Arms/Fury Warrior': 'Warrior',
  'Holy/Disc Priest': 'Priest',
  'Shadow Priest': 'Priest',
  'Mage': 'Mage',
  'Hunter': 'Hunter',
  'Warlock': 'Warlock',
  'Rogue': 'Rogue',
}

type SpecGroup = 'tank' | 'guardian' | 'healer' | 'caster' | 'physical'

const SPEC_GROUP: Record<string, SpecGroup> = {
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

type ItemRole = 'tank' | 'healer' | 'caster' | 'physical' | 'hybrid' | 'none'

// Only the clear misfits fail: a tank item on a DPS or healer list, a spell
// item on a physical list, a physical item on a caster or healer list. Healer
// against caster is a judgement call (the Neck test pins it by hand), tanks
// mix defense, threat and spell gear, and a bear takes tank or physical.
const ROLES_BY_SPEC_GROUP: Record<SpecGroup, ItemRole[]> = {
  tank: ['tank', 'healer', 'caster', 'physical', 'hybrid', 'none'],
  guardian: ['tank', 'physical', 'hybrid', 'none'],
  healer: ['healer', 'caster', 'hybrid', 'none'],
  caster: ['healer', 'caster', 'hybrid', 'none'],
  physical: ['physical', 'hybrid', 'none'],
}

// Role of a package item from its tooltip lines. The feral attack power line
// appears on every high-damage weapon, caster staves included, so it only
// counts as physical when the weapon carries no spell power.
function itemRole(item: PackageItem): ItemRole {
  const labels = (item.tooltip ?? []).map(entry => entry.label ?? '')
  const has = (re: RegExp) => labels.some(label => re.test(label))
  const tank = has(/defense rating|parry rating|block rating|block value/i) || item.subclass === 'Shield'
  const spell = has(/spell power|healing done|damage and healing/i)
  const feral = has(/attack power.*forms only/i)
  const physical =
    (has(/attack power/i) && !feral) ||
    has(/^\+\d+ (Agility|Strength)$/) ||
    has(/expertise rating|armor penetration/i) ||
    (feral && !spell)
  const intellect = has(/^\+\d+ Intellect$/)
  if (tank && (spell || physical)) return 'hybrid'
  if (tank) return 'tank'
  if (physical && spell) return 'hybrid'
  if (physical) return 'physical'
  if (spell || intellect) {
    return has(/mana per 5|^\+\d+ Spirit$/i) && !has(/hit rating/i) ? 'healer' : 'caster'
  }
  if (has(/dodge rating/i)) return 'tank'
  return 'none'
}

const RELIC_CLASS: Record<string, WowClassName> = { Totem: 'Shaman', Idol: 'Druid', Libram: 'Paladin' }

// Why the class cannot equip the item, or null. Armor and weapon proficiency
// come from data/class-proficiencies.ts; the Classes line is what
// domain/loot/class-restrictions.ts reads, taken from the package directly
// because the generated map only covers catalog items.
function unusableReason(item: PackageItem, className: WowClassName): string | null {
  const classes = packageClasses(item)
  if (classes && !classes.includes(className)) return `Classes: ${classes.join(', ')}`
  const typeInfo = packageTypeInfo(item)
  if (typeInfo?.armor_type && !canWearArmorType(className, typeInfo.armor_type)) return `${typeInfo.armor_type} armor`
  if (typeInfo?.weapon_type && !canUseWeaponType(className, typeInfo.weapon_type)) return typeInfo.weapon_type
  const relicClass = RELIC_CLASS[item.subclass]
  if (relicClass && relicClass !== className) return `${item.subclass} relic`
  return null
}

// Loot-table slot names that are the same equipment slot as the BiS slot
const LOOT_SLOTS_BY_BIS_SLOT: Record<string, string[]> = {
  'Main Hand': ['Main Hand', 'One-Hand', 'Legendary'],
  'Off Hand': ['Off Hand', 'One-Hand', 'Held In Off-hand', 'Legendary'],
  'One-Hand': ['One-Hand', 'Main Hand', 'Off Hand'],
  'Held In Off-hand': ['Held In Off-hand', 'Off Hand'],
  'Ranged': ['Ranged', 'Thrown'],
  'Shoulder': ['Shoulder', 'Shoulders'],
}

const TOKEN_NAME = /of the (Fallen|Vanquished|Forgotten) (Hero|Champion|Defender|Conqueror|Protector|Vanquisher)$/
const TOKEN_SLOT_BY_PREFIX: Record<string, string> = {
  Helm: 'Head',
  Pauldrons: 'Shoulder',
  Chestguard: 'Chest',
  Gloves: 'Hands',
  Leggings: 'Legs',
  Bracers: 'Wrist',
  Belt: 'Waist',
  Boots: 'Feet',
}

function lootSlotMatches(bisSlot: string, lootSlot: string, name: string): boolean {
  if (lootSlot === bisSlot) return true
  if (lootSlot === 'Token') return TOKEN_NAME.test(name) && TOKEN_SLOT_BY_PREFIX[name.split(' ')[0]] === bisSlot
  return (LOOT_SLOTS_BY_BIS_SLOT[bisSlot] ?? []).includes(lootSlot)
}

interface LootDrop {
  raid: string
  slot: string
  name: string
}
const dropsById = new Map<number, LootDrop[]>()
for (const raid of tbcRaids) {
  for (const boss of raid.bosses) {
    for (const item of boss.items) {
      const drops = dropsById.get(item.wowhead_id) ?? []
      drops.push({ raid: raid.name, slot: item.slot, name: item.name })
      dropsById.set(item.wowhead_id, drops)
    }
  }
}

interface BisEntry {
  spec: string
  tier: string
  slot: string
  id: number
  drops: LootDrop[]
}
const entries: BisEntry[] = []
for (const [spec, tiers] of Object.entries(TBC_BIS)) {
  for (const [tier, slots] of Object.entries(tiers)) {
    for (const [slot, items] of Object.entries(slots)) {
      if (slot === 'Neck') continue
      for (const { wowhead_id } of items ?? []) {
        entries.push({ spec, tier, slot, id: wowhead_id, drops: dropsById.get(wowhead_id) ?? [] })
      }
    }
  }
}
const onTable = entries.filter(entry => entry.drops.length > 0)
const offTable = entries.filter(entry => entry.drops.length === 0)
const specNames = Object.keys(TBC_BIS)

const label = (entry: BisEntry) => `${entry.tier} / ${entry.slot} / ${entry.id}`

describe('TBC BiS audit', () => {
  it('has a raid name for every BiS tier', () => {
    const tiers = new Set(entries.map(entry => entry.tier))
    for (const tier of tiers) expect(RAID_NAME_BY_TIER, tier).toHaveProperty(tier)
  })

  it('has a class and a role group for every TBC_BIS spec', () => {
    expect(specNames.filter(spec => !(spec in SPEC_CLASS))).toEqual([])
    expect(specNames.filter(spec => !(spec in SPEC_GROUP))).toEqual([])
  })

  it('has a package item for every on-table entry', () => {
    const missing = onTable.filter(entry => !packageItemById(entry.id)).map(entry => `${entry.spec} / ${label(entry)}`)
    expect(missing).toEqual([])
  })

  // Off-table entries never import, which is a known gap and not a data
  // error, but a change in this count means an id moved on or off the loot
  // table and the author should know whether that was intended.
  it('keeps the off-table entry count', () => {
    expect(offTable.length).toBe(182)
    expect(new Set(offTable.map(entry => entry.id)).size).toBe(88)
  })

  it('lists no id twice within one spec, tier and slot', () => {
    const seen = new Set<string>()
    const doubled: string[] = []
    for (const entry of entries) {
      const key = `${entry.spec} / ${label(entry)}`
      if (seen.has(key)) doubled.push(key)
      seen.add(key)
    }
    expect(doubled).toEqual([])
  })

  describe.each(specNames)('%s', spec => {
    const specEntries = onTable.filter(entry => entry.spec === spec)

    it('lists every on-table entry under the raid that drops it', () => {
      const wrong = specEntries
        .filter(entry => !entry.drops.some(drop => drop.raid === RAID_NAME_BY_TIER[entry.tier]))
        .map(entry => `${label(entry)} drops in ${entry.drops.map(drop => drop.raid).join(' | ')}`)
      expect(wrong).toEqual([])
    })

    it('lists every on-table entry under its equipment slot', () => {
      const wrong = specEntries
        .filter(entry => !entry.drops.some(drop => lootSlotMatches(entry.slot, drop.slot, drop.name)))
        .map(entry => `${label(entry)} is a ${entry.drops.map(drop => drop.slot).join(' | ')} drop`)
      expect(wrong).toEqual([])
    })

    it('lists only items the class can use', () => {
      const className = SPEC_CLASS[spec]
      const wrong = specEntries
        .map(entry => {
          const item = packageItemById(entry.id)
          const reason = item ? unusableReason(item, className) : null
          return reason ? `${label(entry)} (${reason})` : null
        })
        .filter((text): text is string => text !== null)
      expect(wrong).toEqual([])
    })

    it('lists only items that fit the spec role', () => {
      const allowed = ROLES_BY_SPEC_GROUP[SPEC_GROUP[spec]]
      const wrong = specEntries
        .map(entry => {
          const item = packageItemById(entry.id)
          const role = item ? itemRole(item) : 'none'
          return allowed.includes(role) ? null : `${label(entry)} (${role})`
        })
        .filter((text): text is string => text !== null)
      expect(wrong).toEqual([])
    })
  })

  const idsOf = (spec: string, tier: string, slot: string) =>
    (TBC_BIS[spec]?.[tier]?.[slot as keyof (typeof TBC_BIS)[string][string]] ?? []).map(item => item.wowhead_id)

  // regression for #484
  it('gives Hunter a mail chest in Karazhan, not Wrynn Dynasty Greaves (28621)', () => {
    const ids = idsOf('Hunter', 'Karazhan', 'Chest')
    expect(ids).not.toContain(28621)
    expect(ids).toContain(28599)
  })

  // regression for #484
  it("lists Dragonspine Trophy (28830) only under Gruul's Lair", () => {
    const elsewhere = entries
      .filter(entry => entry.id === 28830 && entry.tier !== "Gruul's Lair")
      .map(entry => `${entry.spec} / ${entry.tier}`)
    expect(elsewhere).toEqual([])
    expect(idsOf('Hunter', "Gruul's Lair", 'Trinket')).toContain(28830)
  })

  // regression for #484
  it('lists the T5 tokens under the raid that drops them', () => {
    const vashjHelms = [30242, 30243, 30244]
    const tempestKeepTokens = [30236, 30237, 30238, 30248, 30249, 30250]
    const wrong = entries
      .filter(
        entry =>
          (vashjHelms.includes(entry.id) && entry.tier !== 'Serpentshrine Cavern') ||
          (tempestKeepTokens.includes(entry.id) && entry.tier !== 'Tempest Keep')
      )
      .map(entry => `${entry.spec} / ${label(entry)}`)
    expect(wrong).toEqual([])
  })

  // regression for #484
  it('gives Feral Druid the Sunwell feral staff (34198), not Apolyon (34247)', () => {
    const ids = idsOf('Feral Druid', 'Sunwell Plateau', 'Two-Hand')
    expect(ids).toContain(34198)
    expect(ids).not.toContain(34247)
  })

  // regression for #484
  it('lists no tank libram (32368) for Holy Paladin', () => {
    const wrong = entries.filter(entry => entry.id === 32368 && entry.spec !== 'Protection Paladin')
    expect(wrong.map(entry => `${entry.spec} / ${label(entry)}`)).toEqual([])
  })
})
