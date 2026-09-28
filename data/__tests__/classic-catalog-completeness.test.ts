import { describe, it, expect } from 'vitest'
import { Items } from 'wow-classic-items'
import { classicRaids } from '../classic-wow-raids'
import { canClassUseToken, getTokenClasses, isTokenSlot } from '../token-class-mapping'
import { canUseWeaponType, type WeaponType, type WowClassName } from '../class-proficiencies'
import { ITEM_ICONS } from '../item-icons'
import { ITEM_TYPES, type ItemTypeInfo } from '../item-types'
import { GH273_CORE } from './fixtures/classic-gh273-core'
import { FACTION_ITEM_ALIASES } from '@/domain/loot/faction-item-aliases'

// GH-273: Classic (Era) guilds could not find Carapace of the Old God, Ring of
// the Martyr or Boots of Pure Thought, because data/classic-wow-raids.ts (which
// the expansion seeder copies into every guild) never listed them. The
// 2026-01-09 rewrite kept only equippable single-boss epics, so tier tokens,
// trash drops and several plain boss drops were silently missing across all
// seven Classic raids. The earlier #269 suite only checked that listed ids and
// names agree; nothing checked that the catalog is complete.
//
// This suite is that completeness gate. Expectations come from the
// wow-classic-items package and an independently transcribed table, not from
// the catalog itself, so dropping an item or a token mapping fails here.
//
// RED evidence, measured against the pre-fix catalog: 171 of 200 assertions
// failed, including 62 package misses (70 before the deliberate exclusions)
// and all 66 original core items absent (the fixture has since gained the left
// Bindings of the Windseeker). Reverting only the Imperial Qiraji or a Tier
// 2.5 class list, with the items present, fails the token checks.

type PackageItem = InstanceType<typeof Items>[number]

// iconSrc false keeps the raw icon name (e.g. 'inv_qiraj_carapaceoldgod'),
// which is the form data/item-icons.ts stores.
const packageItems = [...new Items({ iconSrc: false })]
const packageById = new Map<number, PackageItem>(packageItems.map(item => [item.itemId, item]))

// Zone ids the package uses for the seven Classic raids. Naxxramas shares 3456
// with the Wrath of the Lich King version, whose items all have ids above
// 25000, hence the id bound below.
const CLASSIC_RAID_ZONES: Record<number, string> = {
  2717: 'Molten Core',
  2677: 'Blackwing Lair',
  2159: "Onyxia's Lair",
  1977: "Zul'Gurub",
  3429: "Ruins of Ahn'Qiraj",
  3428: "Temple of Ahn'Qiraj",
  3456: 'Naxxramas',
}
const MAX_CLASSIC_ITEM_ID = 25000

// Epic or Legendary Classic raid drops deliberately left out of the catalog.
// Anything else the package attributes to a Classic raid must be listed, so a
// future omission (or a package update adding a drop) fails loudly instead of
// reaching guilds as a silent gap.
const DELIBERATELY_EXCLUDED: Record<number, string> = {
  18562: 'Elementium Ore: crafting material, not a loot-list item',
  21110: 'Draconic for Dummies: quest item, package only',
  21138: 'Red Scepter Shard: quest material',
  21890: 'Gloves of the Fallen Prophet: package only, not in AtlasLootClassic',
  22726: 'Splinter of Atiesh: legendary quest material',
  23072: 'Fists of the Unrelenting: package only, not in AtlasLootClassic',
}

const CLASSIC_CLASSES: WowClassName[] = [
  'Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Shaman', 'Mage', 'Warlock', 'Druid',
]

// Slots that carry no armor or weapon type (class-agnostic or non-equippable).
const UNTYPED_SLOTS = new Set(['Token', 'Quest', 'Finger', 'Trinket', 'Back', 'Neck'])

const catalogEntries = classicRaids.flatMap(raid =>
  raid.bosses.flatMap(boss => boss.items.map(item => ({ raid: raid.name, boss: boss.name, ...item }))),
)

function sorted(values: readonly string[]): string[] {
  return [...values].sort()
}

/** The "Classes: A, B" tooltip line the package prints on class-restricted items. */
function tooltipClasses(item: PackageItem): string[] | null {
  const line = item.tooltip?.find(t => t.label.startsWith('Classes: '))
  return line ? line.label.slice('Classes: '.length).split(', ') : null
}

/** Map a package weapon (or shield) to the WeaponType the proficiency table uses. */
function packageWeaponType(item: PackageItem): WeaponType | null {
  if (item.class === 'Armor' && item.subclass === 'Shield') return 'Shield'
  if (item.class !== 'Weapon') return null
  const hand = item.slot === 'Two-Hand' ? 'Two-Handed' : 'One-Handed'
  switch (item.subclass) {
    case 'Axe': return `${hand} Axe`
    case 'Mace': return `${hand} Mace`
    case 'Sword': return `${hand} Sword`
    case 'Dagger':
    case 'Staff':
    case 'Polearm':
    case 'Fist Weapon':
    case 'Bow':
    case 'Crossbow':
    case 'Gun':
    case 'Wand':
    case 'Thrown':
      return item.subclass
    default:
      return null
  }
}

/** The ITEM_TYPES entry the package implies for an armor piece or weapon. */
function packageTypeInfo(item: PackageItem): ItemTypeInfo | null {
  if (item.class === 'Armor' && ['Cloth', 'Leather', 'Mail', 'Plate'].includes(item.subclass)) {
    return { armor_type: item.subclass as ItemTypeInfo['armor_type'] }
  }
  const weaponType = packageWeaponType(item)
  return weaponType ? { weapon_type: weaponType } : null
}

/**
 * Classes eligible for a token. Class-restricted tokens carry a "Classes:"
 * tooltip line. Tokens without one (Imperial Qiraji Armaments and Regalia) are
 * turned in at a quest of the same name, so eligibility is every Classic class
 * proficient with at least one reward, using the same proficiency table the
 * loot-items query filters with.
 */
function expectedTokenClasses(tokenId: number): string[] | null {
  const token = packageById.get(tokenId)
  if (!token) return null
  const restricted = tooltipClasses(token)
  if (restricted) return sorted(restricted)

  const rewards = packageItems.filter(item =>
    item.source?.category === 'Quest' && item.source.quests?.some(quest => quest.name === token.name),
  )
  if (rewards.length === 0) return null
  const eligible = CLASSIC_CLASSES.filter(className =>
    rewards.some(reward => {
      const weaponType = packageWeaponType(reward)
      return weaponType !== null && canUseWeaponType(className, weaponType)
    }),
  )
  return sorted(eligible)
}

describe('Classic catalog completeness (#273)', () => {
  it('lists every Epic or Legendary drop the package attributes to a Classic raid, unless deliberately excluded or covered by a faction alias', () => {
    const catalogKeys = new Set(catalogEntries.map(entry => `${entry.raid}|${entry.wowhead_id}`))
    const missing = packageItems
      .filter(item => item.itemId < MAX_CLASSIC_ITEM_ID)
      .filter(item => item.quality === 'Epic' || item.quality === 'Legendary')
      .filter(item => item.source?.zone !== undefined && CLASSIC_RAID_ZONES[item.source.zone] !== undefined)
      .filter(item => !(item.itemId in DELIBERATELY_EXCLUDED))
      .filter(item => {
        // GH #277: an aliased Horde id (e.g. 19002) has no catalog row of
        // its own by design — it counts as present when its alias target
        // (the Alliance catalog id) is listed under the same raid.
        const catalogId = FACTION_ITEM_ALIASES[item.itemId] ?? item.itemId
        return !catalogKeys.has(`${CLASSIC_RAID_ZONES[item.source.zone!]}|${catalogId}`)
      })
      .map(item => `${CLASSIC_RAID_ZONES[item.source.zone!]}: ${item.name} (${item.itemId})`)
    expect(missing, `missing from data/classic-wow-raids.ts:\n${missing.join('\n')}`).toEqual([])
  })

  it('keeps the exclusion list honest: every excluded id exists in the package and is not in the catalog', () => {
    const catalogIds = new Set(catalogEntries.map(entry => entry.wowhead_id))
    const stale = Object.keys(DELIBERATELY_EXCLUDED)
      .map(Number)
      .filter(id => !packageById.has(id) || catalogIds.has(id))
    expect(stale).toEqual([])
  })

  it('covers exactly the 67 core items in the fixture', () => {
    expect(GH273_CORE).toHaveLength(67)
    expect(new Set(GH273_CORE.map(item => `${item.raid}|${item.id}`)).size).toBe(67)
  })

  it('lists both Bindings of the Windseeker halves, under different bosses', () => {
    const halves = catalogEntries
      .filter(entry => entry.name === 'Bindings of the Windseeker')
      .map(entry => `${entry.raid}|${entry.boss}|${entry.wowhead_id}|${entry.slot}`)
      .sort()
    expect(halves).toEqual([
      'Molten Core|Baron Geddon|18563|Quest',
      'Molten Core|Garr|18564|Quest',
    ])
  })

  it.each(GH273_CORE)('$raid lists $name ($id) once, under $boss, as $slot', expected => {
    const matches = catalogEntries.filter(entry => entry.raid === expected.raid && entry.wowhead_id === expected.id)
    expect(matches, `${expected.name} (${expected.id}) not found in ${expected.raid}`).toHaveLength(1)
    expect(matches[0]).toMatchObject({ boss: expected.boss, name: expected.name, slot: expected.slot })
  })
})

describe('Classic faction-variant aliases (#277)', () => {
  // Plan-time audit of wow-classic-items covered every package item with id
  // below MAX_CLASSIC_ITEM_ID whose name equals a Classic catalog item's
  // name. It found exactly two faction pairs: Head of Nefarian (19002
  // Horde / 19003 Alliance) and Head of Onyxia (18422 Horde / 18423
  // Alliance). Bindings of the Windseeker (18563/18564, left/right halves)
  // and Warblade of the Hakkari (19865/19866, main-hand/off-hand) are also
  // same-name pairs, but both halves are ALREADY in the catalog under
  // different bosses (see the Windseeker test above) — they are distinct
  // items, not a faction variant of one item, so they are correctly absent
  // from FACTION_ITEM_ALIASES. The package has no faction field, so "same
  // name as a catalog item, id not itself a catalog id" is the detection
  // rule the sibling-set test below encodes; it fails loudly if a future
  // package update adds a new pair.

  it('maps Head of Nefarian (19002) to the catalog id 19003 listed under Blackwing Lair, Nefarian', () => {
    expect(FACTION_ITEM_ALIASES[19002]).toBe(19003)
    const match = catalogEntries.find(entry => entry.wowhead_id === 19003)
    expect(match).toMatchObject({ raid: 'Blackwing Lair', boss: 'Nefarian', name: 'Head of Nefarian' })
  })

  it('maps Head of Onyxia (18422) to the catalog id 18423 listed under Onyxia\'s Lair, Onyxia', () => {
    expect(FACTION_ITEM_ALIASES[18422]).toBe(18423)
    const match = catalogEntries.find(entry => entry.wowhead_id === 18423)
    expect(match).toMatchObject({ raid: "Onyxia's Lair", boss: 'Onyxia', name: 'Head of Onyxia' })
  })

  it.each(Object.entries(FACTION_ITEM_ALIASES).map(([key, target]) => [Number(key), target] as const))(
    'alias %i -> %i: both ids exist in the package with the same name, the target is a catalog id, the key is not, and the key is not deliberately excluded or itself an alias target',
    (key, target) => {
      const keyItem = packageById.get(key)
      const targetItem = packageById.get(target)
      expect(keyItem, `package has no item ${key}`).toBeDefined()
      expect(targetItem, `package has no item ${target}`).toBeDefined()
      expect(keyItem!.name).toBe(targetItem!.name)

      const catalogIds = new Set(catalogEntries.map(entry => entry.wowhead_id))
      expect(catalogIds.has(target), `alias target ${target} must be a catalog id`).toBe(true)
      expect(catalogIds.has(key), `alias key ${key} must NOT be a catalog id`).toBe(false)
      expect(key in DELIBERATELY_EXCLUDED, `alias key ${key} must not also be deliberately excluded`).toBe(false)
      expect(
        Object.prototype.hasOwnProperty.call(FACTION_ITEM_ALIASES, target),
        `alias target ${target} must not itself be an alias key (no chains)`,
      ).toBe(false)
    },
  )

  it('the alias key set equals every same-name, non-catalog faction sibling the package has today', () => {
    const catalogNameSet = new Set(catalogEntries.map(entry => entry.name))
    const catalogIds = new Set(catalogEntries.map(entry => entry.wowhead_id))

    const siblings = packageItems
      .filter(item => item.itemId < MAX_CLASSIC_ITEM_ID)
      .filter(item => !catalogIds.has(item.itemId))
      .filter(item => catalogNameSet.has(item.name))
      .map(item => item.itemId)

    expect(sorted(siblings.map(String))).toEqual(sorted(Object.keys(FACTION_ITEM_ALIASES)))
    // Sanity: this is exactly the audited pair today, not an accidental match.
    expect(siblings.sort((a, b) => a - b)).toEqual([18422, 19002])
  })
})

describe('Classic token class restrictions (#273)', () => {
  const tokens = catalogEntries.filter(entry => isTokenSlot(entry.slot))

  it('includes the AQ40, ZG and Onyxia tokens', () => {
    const tokenIds = new Set(tokens.map(token => token.wowhead_id))
    const expectedTokens = GH273_CORE.filter(item => item.slot === 'Token').map(item => item.id)
    expect(expectedTokens).toHaveLength(20)
    expect(expectedTokens.filter(id => !tokenIds.has(id))).toEqual([])
  })

  // The picker (lib/loot-items-query.ts) filters Token-slot rows with
  // canClassUseToken; any other slot skips class rules, so as 'Quest' the
  // Sinew was offered to every class.
  it.each(CLASSIC_CLASSES)('offers Mature Black Dragon Sinew to %s only if Hunter', className => {
    const sinew = catalogEntries.find(entry => entry.wowhead_id === 18705)
    expect(sinew && isTokenSlot(sinew.slot)).toBe(true)
    expect(canClassUseToken('Mature Black Dragon Sinew', className)).toBe(className === 'Hunter')
  })

  it.each(tokens.map(token => [token.name, token.wowhead_id] as const))(
    '%s (%i) has a TOKEN_CLASS_MAPPING entry matching the package',
    (name, wowheadId) => {
      const actual = getTokenClasses(name)
      expect(actual, `no TOKEN_CLASS_MAPPING entry matches "${name}"`).toBeDefined()
      const expected = expectedTokenClasses(wowheadId)
      expect(expected, `package has no class data for ${name} (${wowheadId})`).not.toBeNull()
      expect(sorted(actual!)).toEqual(expected)
    },
  )

  it('derives Imperial Qiraji eligibility from the quest rewards, which every Classic class can use', () => {
    expect(expectedTokenClasses(21232)).toEqual(sorted(CLASSIC_CLASSES))
    expect(expectedTokenClasses(21237)).toEqual(sorted(CLASSIC_CLASSES))
  })
})

describe('Classic catalog icons and item types (#273)', () => {
  it('has an icon for every Classic catalog item', () => {
    const missing = catalogEntries
      .filter(entry => !ITEM_ICONS[entry.wowhead_id])
      .map(entry => `${entry.name} (${entry.wowhead_id})`)
    expect(missing).toEqual([])
  })

  it.each(GH273_CORE)('icon for $name ($id) matches the package', expected => {
    expect(ITEM_ICONS[expected.id]).toBe(packageById.get(expected.id)?.icon)
  })

  it.each(GH273_CORE.filter(item => !UNTYPED_SLOTS.has(item.slot)))(
    'ITEM_TYPES has an entry for $name ($id)',
    expected => {
      expect(ITEM_TYPES[expected.id], `no ITEM_TYPES entry for ${expected.name}`).toBeDefined()
    },
  )

  it('every ITEM_TYPES entry for a Classic catalog item agrees with the package', () => {
    const mismatched = catalogEntries
      .filter(entry => ITEM_TYPES[entry.wowhead_id] !== undefined)
      .filter(entry => {
        const packageItem = packageById.get(entry.wowhead_id)
        return !packageItem || JSON.stringify(ITEM_TYPES[entry.wowhead_id]) !== JSON.stringify(packageTypeInfo(packageItem))
      })
      .map(entry => `${entry.name} (${entry.wowhead_id})`)
    expect(mismatched).toEqual([])
  })
})
