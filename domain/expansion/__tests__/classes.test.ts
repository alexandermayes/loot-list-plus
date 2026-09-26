import { describe, it, expect } from 'vitest'
import { resolveExpansionEra, isClassAvailableForExpansion, getExpansionClassNames } from '../classes'

describe('resolveExpansionEra', () => {
  it('aliases Forever and Classic WoW to Classic', () => {
    expect(resolveExpansionEra('Forever')).toBe('Classic')
    expect(resolveExpansionEra('Classic WoW')).toBe('Classic')
  })

  it('leaves every other name unchanged', () => {
    expect(resolveExpansionEra('Mists of Pandaria')).toBe('Mists of Pandaria')
    expect(resolveExpansionEra('Some Future Thing')).toBe('Some Future Thing')
  })
})

describe('getExpansionClassNames', () => {
  it('gives Forever exactly the 9 Classic classes', () => {
    const names = getExpansionClassNames('Forever')
    expect(names).not.toBeNull()
    expect(names).toHaveLength(9)
    expect(new Set(names)).toEqual(new Set([
      'Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Shaman', 'Mage', 'Warlock', 'Druid',
    ]))
  })

  it('gives The Burning Crusade the 9 Classic classes', () => {
    expect(getExpansionClassNames('The Burning Crusade')).toHaveLength(9)
  })

  it('gives Cataclysm 10 classes (adds Death Knight)', () => {
    const names = getExpansionClassNames('Cataclysm')
    expect(names).toHaveLength(10)
    expect(names).toContain('Death Knight')
    expect(names).not.toContain('Monk')
  })

  it('gives Mists of Pandaria 11 classes', () => {
    expect(getExpansionClassNames('Mists of Pandaria')).toHaveLength(11)
  })

  it('returns null for an unrecognized expansion', () => {
    expect(getExpansionClassNames('Some Future Thing')).toBeNull()
  })
})

describe('isClassAvailableForExpansion', () => {
  it('gates Death Knight and Monk out of Forever, but not Warrior', () => {
    expect(isClassAvailableForExpansion('Death Knight', 'Forever')).toBe(false)
    expect(isClassAvailableForExpansion('Monk', 'Forever')).toBe(false)
    expect(isClassAvailableForExpansion('Warrior', 'Forever')).toBe(true)
  })

  it('keeps Death Knight false for Classic and TBC, true from Wrath on', () => {
    expect(isClassAvailableForExpansion('Death Knight', 'Classic')).toBe(false)
    expect(isClassAvailableForExpansion('Death Knight', 'The Burning Crusade')).toBe(false)
    expect(isClassAvailableForExpansion('Death Knight', 'Wrath of the Lich King')).toBe(true)
    expect(isClassAvailableForExpansion('Death Knight', 'Cataclysm')).toBe(true)
  })

  it('keeps Monk false through Cataclysm, true for Mists of Pandaria', () => {
    expect(isClassAvailableForExpansion('Monk', 'Classic')).toBe(false)
    expect(isClassAvailableForExpansion('Monk', 'The Burning Crusade')).toBe(false)
    expect(isClassAvailableForExpansion('Monk', 'Wrath of the Lich King')).toBe(false)
    expect(isClassAvailableForExpansion('Monk', 'Cataclysm')).toBe(false)
    expect(isClassAvailableForExpansion('Monk', 'Mists of Pandaria')).toBe(true)
  })

  it('defaults to permissive true for unknown or missing expansions', () => {
    expect(isClassAvailableForExpansion('Death Knight', 'Some Future Thing')).toBe(true)
    expect(isClassAvailableForExpansion('Monk', 'Some Future Thing')).toBe(true)
    expect(isClassAvailableForExpansion('Death Knight', undefined)).toBe(true)
    expect(isClassAvailableForExpansion('Monk', undefined)).toBe(true)
  })
})
