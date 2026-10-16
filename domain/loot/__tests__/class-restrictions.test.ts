import { describe, it, expect } from 'vitest'
import { canClassUseItem, getItemClassRestriction } from '../class-restrictions'
import type { WowClassName } from '@/data/class-proficiencies'

// GH #276: the pure class-lock rule the raider item picker consults next to
// the token rule. Unknown id or missing class means allowed: a wrong hide
// costs a raider a legitimate item, a wrong show is today's behaviour.

const ALL_CLASSES: WowClassName[] = [
  'Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Death Knight',
  'Shaman', 'Mage', 'Warlock', 'Monk', 'Druid',
]

describe('canClassUseItem (#276)', () => {
  it('Arcanist Crown (16795) is Mage only', () => {
    expect(canClassUseItem(16795, 'Mage')).toBe(true)
    expect(canClassUseItem(16795, 'Warrior')).toBe(false)
    expect(canClassUseItem(16795, 'Priest')).toBe(false)
  })

  it('Gloves of the Redeemed Prophecy (21889) is Paladin only, even for another plate wearer', () => {
    expect(canClassUseItem(21889, 'Paladin')).toBe(true)
    expect(canClassUseItem(21889, 'Warrior')).toBe(false)
  })

  it('Qiraji Spiked Hilt (20886) is locked to its class list in a class-agnostic slot', () => {
    expect(canClassUseItem(20886, 'Warrior')).toBe(true)
    expect(canClassUseItem(20886, 'Hunter')).toBe(true)
    expect(canClassUseItem(20886, 'Mage')).toBe(false)
  })

  it("Burnished Quel'Serrar (49495) covers Death Knight", () => {
    expect(canClassUseItem(49495, 'Death Knight')).toBe(true)
    expect(canClassUseItem(49495, 'Hunter')).toBe(false)
  })

  it.each(ALL_CLASSES)('an id outside the map (100000) is allowed for %s', (className) => {
    expect(canClassUseItem(100000, className)).toBe(true)
  })

  it('a null or undefined wowhead id is allowed', () => {
    expect(canClassUseItem(null, 'Warrior')).toBe(true)
    expect(canClassUseItem(undefined, 'Warrior')).toBe(true)
  })

  it('a character with no class is allowed', () => {
    expect(canClassUseItem(16795, null)).toBe(true)
    expect(canClassUseItem(16795, undefined)).toBe(true)
  })
})

describe('getItemClassRestriction (#276)', () => {
  it('returns the class list for a locked id', () => {
    expect(getItemClassRestriction(16795)).toEqual(['Mage'])
  })

  it('returns undefined for an unlocked id and for null', () => {
    expect(getItemClassRestriction(19375)).toBeUndefined()
    expect(getItemClassRestriction(null)).toBeUndefined()
    expect(getItemClassRestriction(undefined)).toBeUndefined()
  })
})
