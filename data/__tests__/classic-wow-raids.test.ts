import { describe, it, expect } from 'vitest'
import { classicRaids, naxxramas } from '../classic-wow-raids'
import { TOKEN_CLASS_MAPPING, getTokenClasses } from '../token-class-mapping'
import { Items } from 'wow-classic-items'

// GH-269: Naxxramas Tier 3 token names were attached to the wrong wowhead_id
// (sequential ids grouped by armor slot instead of the real per-item ids), so
// the row label and the tooltip/icon it opened disagreed. TOKEN_CLASS_MAPPING
// then compounded it with single-class restrictions where the real tokens are
// shared by two, four or three classes, so raiders of the right class could
// not add the token to a loot list. This suite transcribes the corrected
// names and classes independently from Wowhead and the wow-classic-items
// package, not from data/classic-wow-raids.ts or data/token-class-mapping.ts,
// so it is a real regression guard rather than a restatement of the data.
//
// RED evidence measured during planning, against the pre-fix data: this
// suite reported 20 wrong token names plus one wrong spelling (Jin'do's
// Judgment vs Judgement), 21 failures total. Post-fix: zero.

// Build the id-to-name lookup once. iconSrc false skips building icon URLs
// for all ~38k items, which this suite does not need.
const itemsById = new Map<number, string>()
for (const item of new Items({ iconSrc: false })) {
  itemsById.set(item.itemId, item.name)
}

// Strips a trailing parenthetical suffix (Heroic, Main Hand, Off Hand, etc.)
// before lowercasing and stripping non-alphanumerics, so deliberate variant
// suffixes and apostrophe differences do not cause a false mismatch. Classic
// raid data needs none of that tolerance today, but a future TBC or Wrath
// extension of this suite would, so the helper is written once, correctly.
function normalizeItemName(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

// Authoritative table, transcribed from Wowhead and verified against
// wow-classic-items v2.0.1, independently of the source data files.
const TIER_3_TOKENS: [wowheadId: number, name: string, classes: string[]][] = [
  [22349, 'Desecrated Breastplate', ['Warrior', 'Rogue']],
  [22350, 'Desecrated Tunic', ['Paladin', 'Hunter', 'Shaman', 'Druid']],
  [22351, 'Desecrated Robe', ['Priest', 'Mage', 'Warlock']],
  [22352, 'Desecrated Legplates', ['Warrior', 'Rogue']],
  [22353, 'Desecrated Helmet', ['Warrior', 'Rogue']],
  [22354, 'Desecrated Pauldrons', ['Warrior', 'Rogue']],
  [22355, 'Desecrated Bracers', ['Warrior', 'Rogue']],
  [22356, 'Desecrated Waistguard', ['Warrior', 'Rogue']],
  [22357, 'Desecrated Gauntlets', ['Warrior', 'Rogue']],
  [22358, 'Desecrated Sabatons', ['Warrior', 'Rogue']],
  [22359, 'Desecrated Legguards', ['Paladin', 'Hunter', 'Shaman', 'Druid']],
  [22360, 'Desecrated Headpiece', ['Paladin', 'Hunter', 'Shaman', 'Druid']],
  [22361, 'Desecrated Spaulders', ['Paladin', 'Hunter', 'Shaman', 'Druid']],
  [22362, 'Desecrated Wristguards', ['Paladin', 'Hunter', 'Shaman', 'Druid']],
  [22363, 'Desecrated Girdle', ['Paladin', 'Hunter', 'Shaman', 'Druid']],
  [22364, 'Desecrated Handguards', ['Paladin', 'Hunter', 'Shaman', 'Druid']],
  [22365, 'Desecrated Boots', ['Paladin', 'Hunter', 'Shaman', 'Druid']],
  [22366, 'Desecrated Leggings', ['Priest', 'Mage', 'Warlock']],
  [22367, 'Desecrated Circlet', ['Priest', 'Mage', 'Warlock']],
  [22368, 'Desecrated Shoulderpads', ['Priest', 'Mage', 'Warlock']],
  [22369, 'Desecrated Bindings', ['Priest', 'Mage', 'Warlock']],
  [22370, 'Desecrated Belt', ['Priest', 'Mage', 'Warlock']],
  [22371, 'Desecrated Gloves', ['Priest', 'Mage', 'Warlock']],
  [22372, 'Desecrated Sandals', ['Priest', 'Mage', 'Warlock']],
]

describe('Classic raid items match wow-classic-items (#269)', () => {
  const allItems = classicRaids.flatMap(raid => raid.bosses.flatMap(boss => boss.items))

  it('every seeded item has a wowhead_id present in the package', () => {
    const missing = allItems
      .filter(item => !itemsById.has(item.wowhead_id))
      .map(item => `${item.name} (${item.wowhead_id})`)
    expect(missing, `ids missing from wow-classic-items: ${missing.join(', ')}`).toEqual([])
  })

  it('every seeded item name matches the package name for its id', () => {
    const mismatched = allItems
      .filter(item => {
        const packageName = itemsById.get(item.wowhead_id)
        return packageName !== undefined && normalizeItemName(packageName) !== normalizeItemName(item.name)
      })
      .map(item => `${item.name} (${item.wowhead_id}) expected "${itemsById.get(item.wowhead_id)}"`)
    expect(mismatched, `name mismatches: ${mismatched.join(', ')}`).toEqual([])
  })
})

describe('Naxxramas Tier 3 Tokens (#269)', () => {
  const tokenGroup = naxxramas.bosses.find(boss => boss.name === 'Tier 3 Tokens')

  it('has exactly 24 items', () => {
    expect(tokenGroup).toBeDefined()
    expect(tokenGroup!.items.length).toBe(24)
  })

  it.each(TIER_3_TOKENS)(
    'wowhead_id %i is named "%s" with slot Token',
    (wowheadId, name) => {
      const found = tokenGroup!.items.find(item => item.wowhead_id === wowheadId)
      expect(found, `wowhead_id ${wowheadId} not found in Tier 3 Tokens`).toBeDefined()
      expect(found!.name).toBe(name)
      expect(found!.slot).toBe('Token')
    }
  )

  it.each(TIER_3_TOKENS)(
    'getTokenClasses("%s") returns the expected class list',
    (_wowheadId, name, classes) => {
      const actual = getTokenClasses(name)
      expect(actual, `no class mapping found for "${name}"`).toBeDefined()
      expect([...actual!].sort()).toEqual([...classes].sort())
    }
  )

  it('no TOKEN_CLASS_MAPPING key is a substring of any other key', () => {
    const keys = Object.keys(TOKEN_CLASS_MAPPING)
    const collisions = keys.filter(key => keys.some(other => other !== key && other.includes(key)))
    expect(collisions, `keys that shadow another key: ${collisions.join(', ')}`).toEqual([])
  })
})
