import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  equippedSlotsForLootItem,
  tierTokenSlot,
  summarizeEquippedItemLevel,
  daysSinceSync,
} from '@/domain/loot/equipped-item-level'

// Quick task 261026-wpw: pure slot rules behind the Equipped column in the
// officer item candidate panel. Display only; nothing here feeds LootScore.

describe('equippedSlotsForLootItem', () => {
  it('compares rings and trinkets against the lower of both paired slots', () => {
    expect(equippedSlotsForLootItem('Finger', 'Any Ring')).toEqual({
      primary: ['Finger 1', 'Finger 2'],
      context: [],
      fallback: [],
      basis: 'lowest',
    })
    expect(equippedSlotsForLootItem('Trinket', 'Any Trinket')).toEqual({
      primary: ['Trinket 1', 'Trinket 2'],
      context: [],
      fallback: [],
      basis: 'lowest',
    })
  })

  it('compares One-Hand and Two-Hand weapons against the main hand with the off hand as context', () => {
    for (const slot of ['One-Hand', 'Two-Hand']) {
      expect(equippedSlotsForLootItem(slot, 'Weapon')).toEqual({
        primary: ['Main Hand'],
        context: ['Off Hand'],
        fallback: [],
        basis: 'single',
      })
    }
  })

  it('compares Main Hand and Weapon items against the main hand only', () => {
    for (const slot of ['Main Hand', 'Weapon']) {
      expect(equippedSlotsForLootItem(slot, 'Weapon')).toMatchObject({ primary: ['Main Hand'], context: [], fallback: [] })
    }
  })

  it('compares off-hand items, shields and held-in-off-hand items against the off hand', () => {
    for (const slot of ['Off-Hand', 'Off Hand', 'Shield', 'Held In Off-hand']) {
      expect(equippedSlotsForLootItem(slot, 'Offhand')).toMatchObject({ primary: ['Off Hand'], context: [], fallback: [] })
    }
  })

  it('compares Ranged, Wand and Thrown against Ranged, falling back to the main hand', () => {
    for (const slot of ['Ranged', 'Wand', 'Thrown']) {
      expect(equippedSlotsForLootItem(slot, 'Ranged thing')).toMatchObject({ primary: ['Ranged'], fallback: ['Main Hand'] })
    }
  })

  it('compares relics, idols, totems, librams and sigils against Ranged with no fallback', () => {
    for (const slot of ['Relic', 'Idol', 'Totem', 'Libram', 'Sigil']) {
      expect(equippedSlotsForLootItem(slot, 'Relic thing')).toMatchObject({ primary: ['Ranged'], fallback: [] })
    }
  })

  it('maps the ten single armor slots to themselves', () => {
    for (const slot of ['Head', 'Neck', 'Shoulder', 'Back', 'Chest', 'Wrist', 'Hands', 'Waist', 'Legs', 'Feet']) {
      expect(equippedSlotsForLootItem(slot, 'Armor')).toEqual({ primary: [slot], context: [], fallback: [], basis: 'single' })
    }
  })

  it('matches slots trimmed and case-insensitively', () => {
    expect(equippedSlotsForLootItem('  finger ', 'Ring')).toMatchObject({ primary: ['Finger 1', 'Finger 2'] })
    expect(equippedSlotsForLootItem('HEAD', 'Helm')).toMatchObject({ primary: ['Head'] })
    expect(equippedSlotsForLootItem('two-hand', 'Staff')).toMatchObject({ primary: ['Main Hand'] })
  })

  it('resolves a Token through the slot word in its name', () => {
    expect(equippedSlotsForLootItem('Token', 'Helm of the Shadowy Conqueror')).toMatchObject({ primary: ['Head'] })
    expect(equippedSlotsForLootItem('Token', 'Essence of the Cursed Conqueror')).toBeNull()
  })

  it('treats mounts, recipes, quest items, crafting, enchants, legendaries, bags, books, empty and unknown slots as not comparable', () => {
    for (const slot of ['Mount', 'Recipe', 'Quest', 'Crafting', 'Enchant', 'Legendary', 'Bag', 'Book', '', '   ', 'Unknown']) {
      expect(equippedSlotsForLootItem(slot, 'Thing')).toBeNull()
    }
  })
})

describe('tierTokenSlot', () => {
  it.each([
    ['Helm of the Fiery Conqueror', 'Head'],
    ['Desecrated Helmet', 'Head'],
    ['Crown of the Lost Protector', 'Head'],
    ['Desecrated Circlet', 'Head'],
    ['Desecrated Headpiece', 'Head'],
    ['Shoulders of the Shadowy Vanquisher', 'Shoulder'],
    ['Desecrated Shoulderpads', 'Shoulder'],
    ['Mantle of the Forlorn Conqueror', 'Shoulder'],
    ['Pauldrons of the Fallen Hero', 'Shoulder'],
    ['Spaulders of the Wayward Protector', 'Shoulder'],
    ['Chest of the Crackling Conqueror', 'Chest'],
    ['Chestguard of the Vanquished Champion', 'Chest'],
    ['Breastplate of the Lost Vanquisher', 'Chest'],
    ['Desecrated Robe', 'Chest'],
    ['Desecrated Tunic', 'Chest'],
    ['Gauntlets of the Forlorn Protector', 'Hands'],
    ['Gloves of the Fallen Defender', 'Hands'],
    ['Desecrated Handguards', 'Hands'],
    ['Leggings of the Cursed Vanquisher', 'Legs'],
    ['Desecrated Legguards', 'Legs'],
    ['Legplates of the Wayward Conqueror', 'Legs'],
    ['Bracers of the Forgotten Conqueror', 'Wrist'],
    ['Desecrated Bindings', 'Wrist'],
    ['Desecrated Wristguards', 'Wrist'],
    ['Belt of the Forgotten Vanquisher', 'Waist'],
    ['Desecrated Girdle', 'Waist'],
    ['Desecrated Waistguard', 'Waist'],
    ['Boots of the Forgotten Protector', 'Feet'],
    ['Desecrated Sabatons', 'Feet'],
    ['Desecrated Sandals', 'Feet'],
  ])('%s gives %s', (name, slot) => {
    expect(tierTokenSlot(name)).toBe(slot)
  })

  it('matches whole words case-insensitively and ignores a Heroic suffix', () => {
    expect(tierTokenSlot('GAUNTLETS OF THE SHADOWY VANQUISHER (HEROIC)')).toBe('Hands')
    expect(tierTokenSlot('Gauntlets of the Shadowy Vanquisher (Heroic)')).toBe('Hands')
  })

  it('gives null for Qiraji and Primal Hakkari tokens, which map to different slots per class', () => {
    expect(tierTokenSlot('Qiraji Bindings of Command')).toBeNull()
    expect(tierTokenSlot('Imperial Qiraji Regalia')).toBeNull()
    expect(tierTokenSlot('Primal Hakkari Girdle')).toBeNull()
    expect(tierTokenSlot('Primal Hakkari Armsplint')).toBeNull()
  })

  it('gives null when no slot word is present', () => {
    expect(tierTokenSlot('Trophy of the Crusade')).toBeNull()
    expect(tierTokenSlot('Essence of the Cursed Protector')).toBeNull()
    expect(tierTokenSlot('')).toBeNull()
  })
})

describe('tierTokenSlot across every Token in the raid data', () => {
  const DATA_DIR = path.resolve(__dirname, '../../../data')
  const RAID_FILES = ['mop-raids.ts', 'cata-raids.ts', 'wrath-raids.ts', 'tbc-raids.ts', 'classic-wow-raids.ts']

  // Tokens that are not comparable: either they carry no slot word, or they
  // map to a different slot per class. This list must match the sweep exactly
  // so a new token is either resolved or named here on purpose.
  const EXPECTED_NULL = [
    'Essence of the Cursed Conqueror',
    'Essence of the Cursed Protector',
    'Essence of the Cursed Vanquisher',
    'Elementium Gem Cluster',
    'Eternal Ember',
    'Seething Cinder',
    'Husk of the Old God',
    'Carapace of the Old God',
    'Skin of the Great Sandworm',
    'Mature Black Dragon Sinew',
    'Trophy of the Crusade',
    'Regalia of the Grand Conqueror',
    'Regalia of the Grand Protector',
    'Regalia of the Grand Vanquisher',
    'Imperial Qiraji Armaments',
    'Imperial Qiraji Regalia',
    'Qiraji Bindings of Command',
    'Qiraji Bindings of Dominance',
    // Not in the plan's list: the ICC class tokens upgrade any tier piece, the
    // Val'anyr fragment is a legendary part, and Ouro's hide names no slot.
    "Conqueror's Mark of Sanctification",
    "Protector's Mark of Sanctification",
    "Vanquisher's Mark of Sanctification",
    "Fragment of Val'anyr",
    "Ouro's Intact Hide",
  ]

  /** Every name paired with slot 'Token' in one data file, read as text. */
  function tokenNames(file: string): string[] {
    const text = fs.readFileSync(path.join(DATA_DIR, file), 'utf8')
    // Names are single quoted with escaped apostrophes or double quoted.
    const entry = /name:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")\s*,\s*slot:\s*'Token'/g
    const names: string[] = []
    for (const match of text.matchAll(entry)) {
      names.push((match[1] ?? match[2]).replace(/\\(.)/g, '$1'))
    }
    // The regex must see every Token line, or a quoting change would silently shrink the sweep.
    const tokenLines = (text.match(/slot:\s*'Token'/g) ?? []).length
    expect(names.length).toBe(tokenLines)
    return names
  }

  const names = Array.from(new Set(
    RAID_FILES.flatMap(tokenNames).map(name => name.replace(/ \(Heroic\)$/, '')),
  ))

  it('reads a non-trivial token set from all five files', () => {
    expect(names.length).toBeGreaterThan(100)
  })

  it('resolves every token to a slot except the named not-comparable list', () => {
    const unresolved = names.filter(name => tierTokenSlot(name) === null).sort()
    const primalHakkari = names.filter(name => name.startsWith('Primal Hakkari '))
    expect(primalHakkari.length).toBeGreaterThan(0)
    const expected = [...EXPECTED_NULL, ...primalHakkari].sort()
    expect(unresolved).toEqual(expected)
  })

  it('spot-checks known tokens', () => {
    expect(tierTokenSlot('Helm of the Shadowy Conqueror')).toBe('Head')
    expect(tierTokenSlot('Desecrated Robe')).toBe('Chest')
    expect(tierTokenSlot('Gauntlets of the Shadowy Vanquisher (Heroic)')).toBe('Hands')
  })
})

describe('summarizeEquippedItemLevel', () => {
  const synced = '2026-10-20T12:00:00.000Z'

  it('is not comparable when the item has no equipped slots', () => {
    expect(summarizeEquippedItemLevel('Mount', 'Reins', { synced_at: synced, slots: { Head: 489 } }))
      .toEqual({ kind: 'not-comparable' })
  })

  it('is not synced when the character has no data or no slots at all', () => {
    expect(summarizeEquippedItemLevel('Finger', 'Ring', null)).toEqual({ kind: 'not-synced' })
    expect(summarizeEquippedItemLevel('Finger', 'Ring', { synced_at: synced, slots: {} })).toEqual({ kind: 'not-synced' })
  })

  it('reads the lower of both ring slots', () => {
    expect(summarizeEquippedItemLevel('Finger', 'Ring', { synced_at: synced, slots: { 'Finger 1': 489, 'Finger 2': 476 } }))
      .toEqual({
        kind: 'ok',
        itemLevel: 476,
        perSlot: [{ slot: 'Finger 1', level: 489 }, { slot: 'Finger 2', level: 476 }],
        syncedAt: synced,
      })
  })

  it('reads Empty when a paired slot has no row instead of the other slot level', () => {
    expect(summarizeEquippedItemLevel('Finger', 'Ring', { synced_at: synced, slots: { 'Finger 1': 489 } }))
      .toEqual({ kind: 'empty-slot' })
  })

  it('reports no item level when a primary row has a null level', () => {
    expect(summarizeEquippedItemLevel('Head', 'Helm', { synced_at: synced, slots: { Head: null } }))
      .toEqual({ kind: 'no-item-level' })
    expect(summarizeEquippedItemLevel('Trinket', 'Trinket', { synced_at: synced, slots: { 'Trinket 1': 489, 'Trinket 2': null } }))
      .toEqual({ kind: 'no-item-level' })
  })

  it('compares a two-hand weapon against the main hand and lists the off hand as context', () => {
    expect(summarizeEquippedItemLevel('Two-Hand', 'Staff', { synced_at: synced, slots: { 'Main Hand': 496, 'Off Hand': 483 } }))
      .toEqual({
        kind: 'ok',
        itemLevel: 496,
        perSlot: [{ slot: 'Main Hand', level: 496 }, { slot: 'Off Hand', level: 483 }],
        syncedAt: synced,
      })
  })

  it('lists only the main hand when the off hand context slot is empty', () => {
    expect(summarizeEquippedItemLevel('One-Hand', 'Sword', { synced_at: synced, slots: { 'Main Hand': 496 } }))
      .toMatchObject({ kind: 'ok', itemLevel: 496, perSlot: [{ slot: 'Main Hand', level: 496 }] })
  })

  it('falls back to the main hand for a ranged item when the character has no Ranged row', () => {
    expect(summarizeEquippedItemLevel('Ranged', 'Bow', { synced_at: synced, slots: { 'Main Hand': 489, Head: 480 } }))
      .toMatchObject({ kind: 'ok', itemLevel: 489, perSlot: [{ slot: 'Main Hand', level: 489 }] })
    expect(summarizeEquippedItemLevel('Ranged', 'Bow', { synced_at: synced, slots: { Ranged: 470, 'Main Hand': 489 } }))
      .toMatchObject({ kind: 'ok', itemLevel: 470, perSlot: [{ slot: 'Ranged', level: 470 }] })
    expect(summarizeEquippedItemLevel('Relic', 'Idol', { synced_at: synced, slots: { 'Main Hand': 489 } }))
      .toEqual({ kind: 'empty-slot' })
  })

  it('normalizes WowSims slot keys so Finger1 and Trinket2 read as Finger 1 and Trinket 2', () => {
    expect(summarizeEquippedItemLevel('Finger', 'Ring', { synced_at: synced, slots: { Finger1: 489, Finger2: 476 } }))
      .toMatchObject({ kind: 'ok', itemLevel: 476 })
    expect(summarizeEquippedItemLevel('Trinket', 'Trinket', { synced_at: synced, slots: { Trinket1: 463, Trinket2: 470 } }))
      .toMatchObject({ kind: 'ok', itemLevel: 463, perSlot: [{ slot: 'Trinket 1', level: 463 }, { slot: 'Trinket 2', level: 470 }] })
  })

  it('passes a null synced_at through', () => {
    expect(summarizeEquippedItemLevel('Head', 'Helm', { synced_at: null, slots: { Head: 489 } }))
      .toMatchObject({ kind: 'ok', syncedAt: null })
  })
})

describe('daysSinceSync', () => {
  const now = new Date('2026-10-27T12:00:00.000Z')

  it('is null without a sync time or with an unreadable one', () => {
    expect(daysSinceSync(null, now)).toBeNull()
    expect(daysSinceSync('not a date', now)).toBeNull()
  })

  it('floors the elapsed days and never goes below zero', () => {
    expect(daysSinceSync('2026-10-27T08:00:00.000Z', now)).toBe(0)
    expect(daysSinceSync('2026-10-26T12:00:00.000Z', now)).toBe(1)
    expect(daysSinceSync('2026-10-24T14:00:00.000Z', now)).toBe(2)
    expect(daysSinceSync('2026-10-28T12:00:00.000Z', now)).toBe(0)
  })
})
