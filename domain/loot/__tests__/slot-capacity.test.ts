import { describe, it, expect } from 'vitest'
import {
  maxCopiesForSlot,
  maxCopiesForItem,
  isUniqueEquipped,
  MAX_COPIES_PER_SLOT,
} from '../slot-capacity'

// Real ids from data/item-unique.ts. The three rings are the ones reported in
// GH #181. They are not the only non-unique rings and trinkets: the refreshed
// map (GH #293) adds Cauterizing Band, Shard of the Fallen Star and Ring of
// Spell Power, among others.
const BAND_OF_DEVASTATION = 32526
const RING_OF_ANCIENT_KNOWLEDGE = 32527
const BLESSED_BAND_OF_KARABOR = 32528
const MARLIS_EYE = 19930 // Zul'Gurub, a non-unique trinket
const SPECTRAL_BAND_OF_INNERVATION = 28510 // unique ring
const SKULL_OF_GULDAN = 32483 // unique trinket
const UNKNOWN_ID = 99999999

describe('maxCopiesForSlot', () => {
  it('allows two copies in paired slots', () => {
    expect(maxCopiesForSlot('One-Hand')).toBe(2)
    expect(maxCopiesForSlot('Finger')).toBe(2)
    expect(maxCopiesForSlot('Trinket')).toBe(2)
  })

  it('allows one copy in single-equip slots', () => {
    for (const slot of ['Head', 'Neck', 'Chest', 'Two-Hand', 'Shield', 'Back']) {
      expect(maxCopiesForSlot(slot)).toBe(1)
    }
  })

  it('caps tokens at one copy by slot alone (token counts come from maxCopiesForItem)', () => {
    expect(maxCopiesForSlot('Token')).toBe(1)
  })

  it('falls back to one copy for unknown, null or empty slots', () => {
    expect(maxCopiesForSlot('Tabard')).toBe(1)
    expect(maxCopiesForSlot(null)).toBe(1)
    expect(maxCopiesForSlot(undefined)).toBe(1)
    expect(maxCopiesForSlot('')).toBe(1)
  })

  it('uses slot names that match the loot_items / raid data vocabulary', () => {
    // Guards against drift like 'Ring' vs 'Finger' — data/*-raids.ts uses
    // 'Finger' and 'Trinket', and loot_items.item_slot is seeded from it.
    expect(Object.keys(MAX_COPIES_PER_SLOT).sort()).toEqual(['Finger', 'One-Hand', 'Trinket'])
  })
})

describe('isUniqueEquipped', () => {
  it('reports the reported non-unique rings as not unique', () => {
    expect(isUniqueEquipped(BAND_OF_DEVASTATION)).toBe(false)
    expect(isUniqueEquipped(RING_OF_ANCIENT_KNOWLEDGE)).toBe(false)
    expect(isUniqueEquipped(BLESSED_BAND_OF_KARABOR)).toBe(false)
  })

  it('reports unique rings and trinkets as unique', () => {
    expect(isUniqueEquipped(SPECTRAL_BAND_OF_INNERVATION)).toBe(true)
    expect(isUniqueEquipped(SKULL_OF_GULDAN)).toBe(true)
  })

  it('returns undefined for unmapped ids rather than guessing', () => {
    expect(isUniqueEquipped(UNKNOWN_ID)).toBeUndefined()
    expect(isUniqueEquipped(null)).toBeUndefined()
    expect(isUniqueEquipped(undefined)).toBeUndefined()
  })
})

describe('maxCopiesForItem', () => {
  it('allows the reported rings twice — the whole point of GH #181', () => {
    expect(maxCopiesForItem({ item_slot: 'Finger', wowhead_id: BAND_OF_DEVASTATION })).toBe(2)
    expect(maxCopiesForItem({ item_slot: 'Finger', wowhead_id: RING_OF_ANCIENT_KNOWLEDGE })).toBe(2)
    expect(maxCopiesForItem({ item_slot: 'Finger', wowhead_id: BLESSED_BAND_OF_KARABOR })).toBe(2)
  })

  it('allows a non-unique trinket twice', () => {
    expect(maxCopiesForItem({ item_slot: 'Trinket', wowhead_id: MARLIS_EYE })).toBe(2)
  })

  it('still caps unique rings and trinkets at one copy', () => {
    expect(maxCopiesForItem({ item_slot: 'Finger', wowhead_id: SPECTRAL_BAND_OF_INNERVATION })).toBe(1)
    expect(maxCopiesForItem({ item_slot: 'Trinket', wowhead_id: SKULL_OF_GULDAN })).toBe(1)
  })

  it('caps non-paired slots at one copy no matter what the item is', () => {
    // A non-unique id in a single-equip slot must not leak two copies.
    expect(maxCopiesForItem({ item_slot: 'Head', wowhead_id: BAND_OF_DEVASTATION })).toBe(1)
    expect(maxCopiesForItem({ item_slot: 'Two-Hand', wowhead_id: MARLIS_EYE })).toBe(1)
  })

  it('keeps the dual-wield allowance for one-handers we have no flag for', () => {
    // Unknown must not regress long-standing behaviour: One-Hand stays at 2.
    expect(maxCopiesForItem({ item_slot: 'One-Hand', wowhead_id: UNKNOWN_ID })).toBe(2)
    expect(maxCopiesForItem({ item_slot: 'One-Hand' })).toBe(2)
  })

  it('does not grant a second copy to rings or trinkets we have no flag for', () => {
    // Fail safe: unknown rings/trinkets keep today's single-copy behaviour
    // rather than letting a raider build a list they cannot equip.
    expect(maxCopiesForItem({ item_slot: 'Finger', wowhead_id: UNKNOWN_ID })).toBe(1)
    expect(maxCopiesForItem({ item_slot: 'Trinket', wowhead_id: null })).toBe(1)
    expect(maxCopiesForItem({ item_slot: 'Finger' })).toBe(1)
  })

  // GH #293: Classic rings and trinkets the refreshed map flags.
  it('allows the non-unique Classic rings and trinkets twice', () => {
    expect(maxCopiesForItem({ item_slot: 'Finger', wowhead_id: 19140 })).toBe(2) // Cauterizing Band
    expect(maxCopiesForItem({ item_slot: 'Trinket', wowhead_id: 21891 })).toBe(2) // Shard of the Fallen Star
    expect(maxCopiesForItem({ item_slot: 'Finger', wowhead_id: 19147 })).toBe(2) // Ring of Spell Power
  })

  it('keeps the newly mapped unique rings at one copy', () => {
    for (const id of [19434, 22722, 21620, 21836]) {
      expect(maxCopiesForItem({ item_slot: 'Finger', wowhead_id: id })).toBe(1)
    }
  })

  // Classic data files every weapon as 'Weapon'; only package One-Hand ones pair.
  it('pairs a Classic Weapon only when it is a non-unique one-hander', () => {
    expect(maxCopiesForItem({ item_slot: 'Weapon', wowhead_id: 17068 })).toBe(2) // Deathbringer
    expect(maxCopiesForItem({ item_slot: 'Weapon', wowhead_id: 19351 })).toBe(1) // Maladath (Unique)
    expect(maxCopiesForItem({ item_slot: 'Weapon', wowhead_id: 17103 })).toBe(1) // Azuresong Mageblade (Main Hand)
    expect(maxCopiesForItem({ item_slot: 'Weapon', wowhead_id: UNKNOWN_ID })).toBe(1)
    expect(maxCopiesForItem({ item_slot: 'Weapon', wowhead_id: null })).toBe(1)
  })

  // GH #331: a token may be listed once per gear slot it turns into (the
  // count applies per spec group; see domain/loot/item-copies.ts).
  it('gives tokens one copy per gear slot they turn into', () => {
    expect(maxCopiesForItem({ item_slot: 'Token', wowhead_id: 20928 })).toBe(2) // Qiraji Bindings of Command
    expect(maxCopiesForItem({ item_slot: 'Token', wowhead_id: 47242 })).toBe(5) // Trophy of the Crusade
    expect(maxCopiesForItem({ item_slot: 'Token', wowhead_id: 105858 })).toBe(5) // Essence of the Cursed Conqueror
  })

  it('gives single-slot, unknown and id-less tokens one copy', () => {
    expect(maxCopiesForItem({ item_slot: 'Token', wowhead_id: 22349 })).toBe(1) // Desecrated Breastplate
    expect(maxCopiesForItem({ item_slot: 'Token', wowhead_id: UNKNOWN_ID })).toBe(1)
    expect(maxCopiesForItem({ item_slot: 'Token', wowhead_id: null })).toBe(1)
  })
})
