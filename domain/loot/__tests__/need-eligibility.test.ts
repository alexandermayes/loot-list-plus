// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  DUAL_WIELD_CLASSES,
  NEED_NOT_ELIGIBLE_CODE,
  NEED_NOT_ELIGIBLE_ERROR,
  PHYSICAL_STAT_BY_CLASS,
  RELIC_CLASSES,
  eligibleNeedsFor,
  eligibleSlotsFor,
  isNeedEligible,
  specMappingKey,
} from '@/domain/loot/need-eligibility'
import { NEED_DEFINITIONS } from '@/domain/loot/needs'
import { specMapping } from '@/domain/loot/spec-role-mapping'
import classSpecs from '@/domain/loot/__fixtures__/class-specs.json'

// Why these cases: the picker offers only needs a raider can use, and the
// submit route refuses the rest with the same function (D-10), so a hole here
// is a hole in both. The fixture of seeded (class, spec) pairs is transcribed
// by hand from scripts/seed-class-specs.ts rather than read back from the
// module, so a spec the seed script adds but specMapping lacks fails here
// instead of leaving that raider with an empty picker.

const EM_DASH = String.fromCharCode(0x2014)
const EN_DASH = String.fromCharCode(0x2013)

function keysFor(className: string | null, specName: string | null): Set<string> {
  return new Set(eligibleNeedsFor({ className, specName }).map((need) => need.key))
}

describe('specMappingKey', () => {
  it('uses the class alone when class and spec share a name', () => {
    expect(specMappingKey('Mage', 'Mage')).toBe('Mage')
    expect(specMappingKey('Hunter', 'Hunter')).toBe('Hunter')
  })

  it('joins spec and class otherwise, the way the master sheet does', () => {
    expect(specMappingKey('Warrior', 'Arms/Fury')).toBe('Arms/Fury Warrior')
    expect(specMappingKey('Priest', 'Holy/Disc')).toBe('Holy/Disc Priest')
  })

  it('resolves every seeded (class, spec) pair to a specMapping key', () => {
    expect(classSpecs).toHaveLength(23)
    for (const { className, specName } of classSpecs) {
      const key = specMappingKey(className, specName)
      expect(Object.hasOwn(specMapping, key), `${className} ${specName} -> ${key}`).toBe(true)
      expect(specMapping[key].class).toBe(className)
    }
  })
})

describe('class tables (flagged assumptions A1 and A2)', () => {
  it('lists the dual-wield, relic and physical-stat classes', () => {
    expect([...DUAL_WIELD_CLASSES].sort()).toEqual(
      ['Death Knight', 'Hunter', 'Monk', 'Rogue', 'Shaman', 'Warrior'].sort(),
    )
    expect([...RELIC_CLASSES].sort()).toEqual(['Death Knight', 'Druid', 'Paladin', 'Shaman'].sort())
    expect(PHYSICAL_STAT_BY_CLASS.get('Warrior')).toEqual(['strength'])
    expect(PHYSICAL_STAT_BY_CLASS.get('Rogue')).toEqual(['agility'])
    expect(PHYSICAL_STAT_BY_CLASS.get('Shaman')).toEqual(['strength', 'agility'])
    expect(PHYSICAL_STAT_BY_CLASS.get('Druid')).toEqual(['strength', 'agility'])
  })
})

describe('eligibleSlotsFor', () => {
  it('derives weapon slots from the class weapon list', () => {
    const mage = eligibleSlotsFor('Mage')
    expect(mage.has('main-hand-weapon')).toBe(true)
    expect(mage.has('two-hand-weapon')).toBe(true)
    expect(mage.has('ranged-weapon')).toBe(true)
    expect(mage.has('shield')).toBe(false)
    expect(mage.has('off-hand-weapon')).toBe(false)
    expect(mage.has('relic')).toBe(false)
  })

  it('gives a class with no two-handers no two-hand slot', () => {
    expect(eligibleSlotsFor('Rogue').has('two-hand-weapon')).toBe(false)
    expect(eligibleSlotsFor('Priest').has('ranged-weapon')).toBe(true)
  })

  it('is empty for an unknown or missing class and for prototype names', () => {
    expect(eligibleSlotsFor('Bard').size).toBe(0)
    expect(eligibleSlotsFor(null).size).toBe(0)
    expect(eligibleSlotsFor(undefined).size).toBe(0)
    expect(eligibleSlotsFor('__proto__').size).toBe(0)
    expect(eligibleSlotsFor('constructor').size).toBe(0)
  })
})

describe('eligibleNeedsFor (D-10)', () => {
  it('Mage: caster weapons, cloth and accessories only', () => {
    const keys = keysFor('Mage', 'Mage')
    for (const key of [
      'main-hand-weapon.spell-damage',
      'two-hand-weapon.spell-damage',
      'ranged-weapon.spell-damage',
      'chest.cloth.spell-damage',
      'trinket.spell-damage',
      'ring.spell-damage',
      'neck.spell-damage',
      'back.spell-damage',
      'off-hand-item.spell-damage',
    ]) {
      expect(keys.has(key), key).toBe(true)
    }
    for (const key of keys) {
      expect(key.startsWith('shield.'), key).toBe(false)
      expect(key.startsWith('off-hand-weapon.'), key).toBe(false)
      expect(key.startsWith('relic.'), key).toBe(false)
      expect(/\.(plate|leather|mail)\./.test(key), key).toBe(false)
      expect(key.endsWith('.healing') || key.endsWith('.tank'), key).toBe(false)
    }
  })

  it('Warrior Protection: tank rows in plate and lighter armour, shield, no relic', () => {
    const keys = keysFor('Warrior', 'Protection')
    expect(keys.has('shield.tank')).toBe(true)
    expect(keys.has('chest.plate.tank')).toBe(true)
    expect(keys.has('chest.leather.tank')).toBe(true)
    expect(keys.has('chest.mail.tank')).toBe(false) // mail carries no tank family
    for (const key of keys) {
      expect(key.endsWith('.healing') || key.endsWith('.spell-damage'), key).toBe(false)
      expect(key.endsWith('.agility'), key).toBe(false)
      expect(key.startsWith('relic.'), key).toBe(false)
    }
  })

  it('Rogue: agility rows only, with off-hand and ranged weapons', () => {
    const keys = keysFor('Rogue', 'Rogue')
    expect(keys.has('off-hand-weapon.agility')).toBe(true)
    expect(keys.has('ranged-weapon.agility')).toBe(true)
    expect(keys.has('chest.leather.agility')).toBe(true)
    for (const key of keys) expect(key.endsWith('.strength'), key).toBe(false)
  })

  it('Shaman Enhancement: strength and agility, off-hand weapon, relic and mail', () => {
    const keys = keysFor('Shaman', 'Enhancement')
    for (const stat of ['strength', 'agility']) {
      expect(keys.has(`off-hand-weapon.${stat}`), stat).toBe(true)
      expect(keys.has(`relic.${stat}`), stat).toBe(true)
      expect(keys.has(`chest.mail.${stat}`), stat).toBe(true)
    }
  })

  it('Druid Feral: leather agility only, relic strength and agility', () => {
    const keys = keysFor('Druid', 'Feral')
    expect(keys.has('chest.leather.agility')).toBe(true)
    expect(keys.has('chest.leather.strength')).toBe(false) // leather has no strength family
    expect(keys.has('relic.strength')).toBe(true)
    expect(keys.has('relic.agility')).toBe(true)
    expect(keys.has('off-hand-weapon.agility')).toBe(false) // druids do not dual wield
  })

  it('Paladin Holy: healing in every armour class, relic and shield', () => {
    const keys = keysFor('Paladin', 'Holy')
    for (const armour of ['plate', 'mail', 'leather', 'cloth']) {
      expect(keys.has(`chest.${armour}.healing`), armour).toBe(true)
    }
    expect(keys.has('relic.healing')).toBe(true)
    expect(keys.has('shield.healing')).toBe(true)
  })

  it('Priest Holy/Disc: off-hand item and wand healing, no shield', () => {
    const keys = keysFor('Priest', 'Holy/Disc')
    expect(keys.has('off-hand-item.healing')).toBe(true)
    expect(keys.has('ranged-weapon.healing')).toBe(true)
    for (const key of keys) expect(key.startsWith('shield.'), key).toBe(false)
  })

  it('a null spec gets the union of the roles of every spec of the class', () => {
    const noSpec = keysFor('Paladin', null)
    for (const spec of ['Holy', 'Retribution', 'Protection']) {
      for (const key of keysFor('Paladin', spec)) expect(noSpec.has(key), `${spec} ${key}`).toBe(true)
    }
    expect(noSpec.has('chest.plate.healing')).toBe(true)
    expect(noSpec.has('chest.plate.tank')).toBe(true)
    expect(noSpec.has('chest.plate.strength')).toBe(true)
    expect(noSpec.has('chest.plate.spell-damage')).toBe(false)
  })

  it('treats a spec the mapping does not know like a missing spec', () => {
    expect(keysFor('Paladin', 'Dancing')).toEqual(keysFor('Paladin', null))
  })

  it('an unknown or missing class gets no needs', () => {
    expect(eligibleNeedsFor({ className: 'Bard', specName: null })).toEqual([])
    expect(eligibleNeedsFor({ className: null, specName: null })).toEqual([])
    expect(eligibleNeedsFor({ className: undefined, specName: 'Holy' })).toEqual([])
    expect(eligibleNeedsFor({ className: '__proto__', specName: null })).toEqual([])
  })

  it('every seeded (class, spec) pair gets a non-empty picker made only of real needs', () => {
    const all = new Set(NEED_DEFINITIONS.map((need) => need.key))
    for (const { className, specName } of classSpecs) {
      const keys = keysFor(className, specName)
      expect(keys.size, `${className} ${specName}`).toBeGreaterThan(0)
      for (const key of keys) expect(all.has(key), key).toBe(true)
    }
  })
})

describe('isNeedEligible', () => {
  const mage = { className: 'Mage', specName: 'Mage' }

  it('accepts an eligible key and refuses an ineligible one', () => {
    expect(isNeedEligible(mage, 'chest.cloth.spell-damage')).toBe(true)
    expect(isNeedEligible(mage, 'chest.plate.tank')).toBe(false)
  })

  it('refuses an unknown key, a non-string and prototype keys', () => {
    expect(isNeedEligible(mage, 'not-a-need')).toBe(false)
    expect(isNeedEligible(mage, 42)).toBe(false)
    expect(isNeedEligible(mage, null)).toBe(false)
    expect(isNeedEligible(mage, '__proto__')).toBe(false)
    expect(isNeedEligible(mage, 'constructor')).toBe(false)
    expect(isNeedEligible(mage, 'hasOwnProperty')).toBe(false)
  })

  it('refuses every key for an unknown class', () => {
    expect(isNeedEligible({ className: 'Bard', specName: null }, 'chest.cloth.spell-damage')).toBe(false)
  })
})

describe('refusal copy (DRAFT for the 04-19 sign-off)', () => {
  it('carries the code and sentence, with no em or en dash', () => {
    expect(NEED_NOT_ELIGIBLE_CODE).toBe('NEED_NOT_ELIGIBLE')
    expect(NEED_NOT_ELIGIBLE_ERROR).toBe("Your spec can't use this need. Change it to continue.")
    expect(NEED_NOT_ELIGIBLE_ERROR).not.toContain(EM_DASH)
    expect(NEED_NOT_ELIGIBLE_ERROR).not.toContain(EN_DASH)
  })
})
