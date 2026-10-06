import { describe, it, expect } from 'vitest'
import { Items } from 'wow-classic-items'
import { classicRaids } from '../classic-wow-raids'
import { canClassUseToken, getTokenClasses, isTokenSlot } from '../token-class-mapping'
import { canUseWeaponType, isClassAgnosticSlot, type WowClassName } from '../class-proficiencies'
import { ITEM_ICONS } from '../item-icons'
import { ITEM_TYPES, inferArmorType, inferWeaponType, ARMOR_SLOTS } from '../item-types'
import { GH273_CORE } from './fixtures/classic-gh273-core'
import { GH284_RECIPES, GH284_RESEARCH } from './fixtures/classic-gh284-recipes'
import { packageWeaponType, packageTypeInfo } from './fixtures/package-item-types'
import { ITEM_CLASSIFICATIONS } from '../classic-wow-item-classifications'
import { CLASSIC_ITEM_ROLES } from '../classic-item-roles'
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
//
// GH-284: the gate above compares only Epic and Legendary Classic drops
// against the wow-classic-items package's zone attribution. The Molten Core
// and both Ahn'Qiraj raid-specific profession recipes are quality Rare, so
// the package's zone data does not cover them; they need their own
// fixture-driven gate, built from the independently transcribed research
// fixture (classic-gh284-recipes.json), not from the catalog or the
// package's zone field. The 'Classic raid profession recipes (#284)' describe
// below checks: the fixture shape (28 entries, 21 unique ids, MC 10 / RoAQ 8 /
// ToAQ 10); that every fixture entry is in the catalog exactly once, under the
// derived boss group (D-01, with a hard-coded single-boss table independent
// of the fixture); that no extra Recipe entries exist anywhere in the catalog
// (D-02) and the other four raids have zero Recipe entries; that the 7 ids
// shared between the two AQ raids appear once in each, both under 'Shared
// Boss Loot'; that every research boss name maps to a real catalog boss
// group; package agreement (class, quality, normalized name) and icon parity;
// and D-03 visibility (no ITEM_TYPES entry, no classification/role override,
// class-agnostic slot, no inferred armor or weapon type).
//
// RED evidence, measured before the catalog and icon edit: 62 of 99 tests in
// this describe block failed (all catalog-placement, no-extra-entries,
// shared-id and icon checks; the fixture-shape, per-raid-count, boss-name-
// mapping, package-agreement and D-03 visibility checks passed against the
// unmodified catalog since they do not depend on the catalog yet listing the
// recipes, and the four no-Recipe-in-other-raids checks trivially passed too).

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

// The package-agreement check above only covers ids that already have an
// entry, and the GH-273 coverage only checks items the package attributes to
// a Classic raid zone (GH #278), so Tier 1 and Tier 2 pieces without a zone
// were never required to have a type. With no entry and an empty stored
// type the picker guesses from the name, which hid mail pieces from Hunters
// and Shamans (GH #388).
const armorPieces = (() => {
  const seen = new Set<number>()
  const pieces: typeof catalogEntries = []
  for (const entry of catalogEntries) {
    if (!ARMOR_SLOTS.includes(entry.slot as (typeof ARMOR_SLOTS)[number])) continue
    if (seen.has(entry.wowhead_id)) continue
    seen.add(entry.wowhead_id)
    pieces.push(entry)
  }
  return pieces
})()

describe('Classic raid armor types (#388)', () => {
  it('has exactly 341 Classic raid armor pieces', () => {
    expect(armorPieces).toHaveLength(341)
  })

  it('every Classic raid armor piece has an ITEM_TYPES entry that agrees with the package', () => {
    const failures = armorPieces
      .filter(entry => {
        const packageItem = packageById.get(entry.wowhead_id)
        const expected = packageItem ? packageTypeInfo(packageItem) : null
        return JSON.stringify(ITEM_TYPES[entry.wowhead_id] ?? null) !== JSON.stringify(expected)
      })
      .map(entry => {
        const packageItem = packageById.get(entry.wowhead_id)
        const expected = packageItem ? packageTypeInfo(packageItem) : null
        const actual = ITEM_TYPES[entry.wowhead_id]
        return `${entry.raid} | ${entry.name} (${entry.wowhead_id}): ITEM_TYPES ${actual ? JSON.stringify(actual) : 'none'}, package ${expected ? JSON.stringify(expected) : 'none'}`
      })
    expect(failures).toEqual([])
  })

  it('no Classic catalog item with slot Back, Token, Quest or Recipe has an ITEM_TYPES entry', () => {
    const failures = catalogEntries
      .filter(entry => ['Back', 'Token', 'Quest', 'Recipe'].includes(entry.slot))
      .filter(entry => ITEM_TYPES[entry.wowhead_id] !== undefined)
      .map(entry => `${entry.raid} | ${entry.name} (${entry.wowhead_id})`)
    expect(failures).toEqual([])
  })
})

describe('Classic raid profession recipes (#284)', () => {
  // GH-284: Molten Core, Ruins of Ahn'Qiraj and Temple of Ahn'Qiraj drop 21
  // unique raid-specific profession recipes (28 raid-scoped rows, since the 7
  // AQ enchanting formulas that drop in both AQ raids are listed once per
  // raid) that data/classic-wow-raids.ts never listed. Expectations come
  // from classic-gh284-recipes.json, the research fixture transcribed
  // independently from Wowhead and AtlasLoot (see the fixture module header),
  // not from the catalog or the package's zone field, since these recipes
  // are quality Rare and the package's zone attribution is not checked for
  // Rare items above.

  const NO_RECIPE_RAIDS = ["Onyxia's Lair", 'Blackwing Lair', "Zul'Gurub", 'Naxxramas']

  // D-01, hard-coded independently of the fixture module: the four
  // single-boss recipes and the catalog boss group each sits under. Every
  // other recipe entry is expected under 'Shared Boss Loot'.
  const SINGLE_BOSS_PLACEMENTS: [raid: string, id: number, boss: string][] = [
    ["Ruins of Ahn'Qiraj", 22220, 'Moam'],
    ["Temple of Ahn'Qiraj", 22222, 'The Prophet Skeram'],
    ["Temple of Ahn'Qiraj", 20726, 'Twin Emperors'],
    ["Temple of Ahn'Qiraj", 20735, 'Twin Emperors'],
  ]

  const recipeCatalogEntries = catalogEntries.filter(entry => entry.slot === 'Recipe')

  // Same rule as classic-wow-raids.test.ts's normalizeItemName: lowercase,
  // then strip non-alphanumerics. No GH-284 recipe name has a parenthetical
  // suffix, so the simpler two-step form is enough here.
  function normalizeRecipeName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '')
  }

  it('fixture has 28 entries with 21 unique ids, every entry quality Rare and confidence confirmed, sourced from wowhead and atlasloot', () => {
    expect(GH284_RESEARCH).toHaveLength(28)
    expect(new Set(GH284_RESEARCH.map(entry => entry.wowhead_id)).size).toBe(21)
    for (const entry of GH284_RESEARCH) {
      expect(entry.quality, `${entry.name} (${entry.wowhead_id})`).toBe('Rare')
      expect(entry.confidence, `${entry.name} (${entry.wowhead_id})`).toBe('confirmed')
      expect(entry.sources, `${entry.name} (${entry.wowhead_id})`).toContain('wowhead')
      expect(entry.sources, `${entry.name} (${entry.wowhead_id})`).toContain('atlasloot')
    }
  })

  it("has the per-raid recipe counts: Molten Core 10, Ruins of Ahn'Qiraj 8, Temple of Ahn'Qiraj 10", () => {
    const counts: Record<string, number> = {}
    for (const entry of GH284_RESEARCH) {
      counts[entry.raid] = (counts[entry.raid] ?? 0) + 1
    }
    expect(counts).toEqual({
      'Molten Core': 10,
      "Ruins of Ahn'Qiraj": 8,
      "Temple of Ahn'Qiraj": 10,
    })
  })

  it.each(GH284_RECIPES)('$raid lists $name ($id) once, under $boss, as Recipe', expected => {
    const matches = recipeCatalogEntries.filter(
      entry => entry.raid === expected.raid && entry.wowhead_id === expected.id,
    )
    expect(matches, `${expected.name} (${expected.id}) not found exactly once in ${expected.raid}`).toHaveLength(1)
    expect(matches[0]).toMatchObject({ boss: expected.boss, name: expected.name, slot: 'Recipe' })
  })

  it.each(SINGLE_BOSS_PLACEMENTS)('%s recipe %i sits under %s (D-01), not Shared Boss Loot', (raid, id, boss) => {
    const match = recipeCatalogEntries.find(entry => entry.raid === raid && entry.wowhead_id === id)
    expect(match, `${raid} recipe ${id} not found`).toBeDefined()
    expect(match!.boss).toBe(boss)
  })

  it('every recipe entry other than the four D-01 single-boss placements sits under Shared Boss Loot', () => {
    const singleBossKeys = new Set(SINGLE_BOSS_PLACEMENTS.map(([raid, id]) => `${raid}|${id}`))
    const wrong = GH284_RECIPES
      .filter(recipe => !singleBossKeys.has(`${recipe.raid}|${recipe.id}`))
      .filter(recipe => recipe.boss !== 'Shared Boss Loot')
      .map(recipe => `${recipe.raid}: ${recipe.name} (${recipe.id}) under ${recipe.boss}`)
    expect(wrong).toEqual([])
  })

  it('only the 21 raid-specific recipes are in the catalog: every Classic catalog Recipe entry is a fixture raid-and-id pair (D-02)', () => {
    const fixtureKeys = new Set(GH284_RECIPES.map(recipe => `${recipe.raid}|${recipe.id}`))
    const extra = recipeCatalogEntries
      .filter(entry => !fixtureKeys.has(`${entry.raid}|${entry.wowhead_id}`))
      .map(entry => `${entry.raid}: ${entry.name} (${entry.wowhead_id})`)
    expect(extra, `catalog Recipe entries not in the GH-284 fixture:\n${extra.join('\n')}`).toEqual([])
  })

  it.each(NO_RECIPE_RAIDS)('%s has zero Recipe entries', raidName => {
    const found = recipeCatalogEntries
      .filter(entry => entry.raid === raidName)
      .map(entry => `${entry.name} (${entry.wowhead_id})`)
    expect(found).toEqual([])
  })

  it('exactly the 7 shared AQ formula ids appear in both AQ raids, once each, both under Shared Boss Loot', () => {
    const aq20Ids = new Set(
      recipeCatalogEntries.filter(entry => entry.raid === "Ruins of Ahn'Qiraj").map(entry => entry.wowhead_id),
    )
    const aq40Ids = new Set(
      recipeCatalogEntries.filter(entry => entry.raid === "Temple of Ahn'Qiraj").map(entry => entry.wowhead_id),
    )
    const shared = [...aq20Ids].filter(id => aq40Ids.has(id)).sort((a, b) => a - b)
    expect(shared).toEqual([20727, 20728, 20729, 20730, 20731, 20734, 20736])

    for (const id of shared) {
      const aq20Matches = recipeCatalogEntries.filter(
        entry => entry.raid === "Ruins of Ahn'Qiraj" && entry.wowhead_id === id,
      )
      const aq40Matches = recipeCatalogEntries.filter(
        entry => entry.raid === "Temple of Ahn'Qiraj" && entry.wowhead_id === id,
      )
      expect(aq20Matches, `id ${id} in Ruins of Ahn'Qiraj`).toHaveLength(1)
      expect(aq40Matches, `id ${id} in Temple of Ahn'Qiraj`).toHaveLength(1)
      expect(aq20Matches[0].boss).toBe('Shared Boss Loot')
      expect(aq40Matches[0].boss).toBe('Shared Boss Loot')
    }
  })

  it('every research boss name maps to a real boss group in that raid of the catalog', () => {
    const bossGroupsByRaid = new Map<string, Set<string>>()
    for (const raid of classicRaids) {
      bossGroupsByRaid.set(raid.name, new Set(raid.bosses.map(boss => boss.name)))
    }
    for (const recipe of GH284_RECIPES) {
      const groups = bossGroupsByRaid.get(recipe.raid)
      expect(groups, `catalog has no raid named ${recipe.raid}`).toBeDefined()
      for (const sourceBoss of recipe.sourceBosses) {
        expect(
          groups!.has(sourceBoss),
          `${recipe.raid} catalog has no boss group "${sourceBoss}" (from research, via catalogBossName)`,
        ).toBe(true)
      }
    }
  })

  it.each(GH284_RECIPES)(
    '$name ($id) is Recipe/Rare in the package with a name matching $raid, and ITEM_ICONS matches the package icon',
    expected => {
      const packageItem = packageById.get(expected.id)
      expect(packageItem, `package has no item ${expected.id}`).toBeDefined()
      expect(packageItem!.class).toBe('Recipe')
      expect(packageItem!.quality).toBe('Rare')
      expect(normalizeRecipeName(packageItem!.name)).toBe(normalizeRecipeName(expected.name))
      expect(ITEM_ICONS[expected.id]).toBe(packageItem!.icon)
    },
  )

  it('has an icon for every GH-284 recipe id, with one entry per id even though 7 ids are listed in two raids', () => {
    const uniqueIds = new Set(GH284_RECIPES.map(recipe => recipe.id))
    const missing = [...uniqueIds].filter(id => !ITEM_ICONS[id])
    expect(missing).toEqual([])
  })

  it.each(GH284_RECIPES)(
    '$name ($id) has no ITEM_TYPES entry, no classification/role override, a class-agnostic slot, and no inferred armor or weapon type (D-03)',
    expected => {
      expect(ITEM_TYPES[expected.id], `${expected.name} (${expected.id}) must have no ITEM_TYPES entry (OD-01)`).toBeUndefined()
      expect(ITEM_CLASSIFICATIONS[expected.name]).toBeUndefined()
      expect(CLASSIC_ITEM_ROLES[expected.name]).toBeUndefined()
      expect(isTokenSlot('Recipe')).toBe(false)
      expect(isClassAgnosticSlot('Recipe')).toBe(true)
      expect(inferArmorType('Recipe', expected.name)).toBeUndefined()
      expect(inferWeaponType('Recipe', expected.name)).toBeUndefined()
    },
  )
})
