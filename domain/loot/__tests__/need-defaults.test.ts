// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  NEED_DEFAULTS,
  SPECS_WITHOUT_DEFAULT,
  defaultNeedsFor,
  matchesSpecDefault,
} from '@/domain/loot/need-defaults'
import { NEED_BUDGET_POINTS, budgetForPicks } from '@/domain/loot/need-budget'
import { eligibleNeedsFor } from '@/domain/loot/need-eligibility'
import { findNeedDefinition } from '@/domain/loot/needs'
import classSpecs from '@/domain/loot/__fixtures__/class-specs.json'

// Why these cases: a default is the one-tap path for a raider (DISC-04), so a
// default the spec cannot use or one over the budget would put an error in
// front of them on their first tap. This is the D-09 gate: a list that fails
// any check here fails the build instead of reaching the picker. The pair list
// is the hand-transcribed class-specs fixture, not read back from the module,
// so a seeded spec with neither a default nor a SPECS_WITHOUT_DEFAULT entry is
// a visible failure (D-31).

const pairId = (className: string, specName: string) => `${className}|${specName}`

describe('NEED_DEFAULTS gate (D-09, D-31)', () => {
  it('holds exactly 18 lists and 5 specs without one', () => {
    expect(NEED_DEFAULTS).toHaveLength(18)
    expect(SPECS_WITHOUT_DEFAULT).toHaveLength(5)
  })

  it('covers every seeded (class, spec) pair exactly once, as a default or on purpose without one', () => {
    const withDefault = new Set(NEED_DEFAULTS.map((d) => pairId(d.className, d.specName)))
    const without = new Set(SPECS_WITHOUT_DEFAULT.map((d) => pairId(d.className, d.specName)))
    expect(withDefault.size).toBe(NEED_DEFAULTS.length)
    expect(without.size).toBe(SPECS_WITHOUT_DEFAULT.length)

    for (const id of withDefault) expect(without.has(id), `${id} is in both`).toBe(false)

    const seeded = classSpecs.map((pair) => pairId(pair.className, pair.specName))
    expect(seeded).toHaveLength(23)
    for (const id of seeded) {
      expect(withDefault.has(id) || without.has(id), `${id} has neither a default nor a listed gap`).toBe(true)
    }
    expect([...withDefault, ...without].sort()).toEqual([...seeded].sort())
  })

  it('lists the Death Knight and Monk specs as the specs without a default', () => {
    expect(SPECS_WITHOUT_DEFAULT.map((d) => pairId(d.className, d.specName)).sort()).toEqual(
      [
        'Death Knight|Blood',
        'Death Knight|Frost/Unholy',
        'Monk|Brewmaster',
        'Monk|Mistweaver',
        'Monk|Windwalker',
      ].sort(),
    )
  })

  describe.each(NEED_DEFAULTS.map((entry) => [`${entry.className} ${entry.specName}`, entry] as const))(
    '%s',
    (_label, entry) => {
      it('has five distinct keys, each the current key of a need', () => {
        expect(entry.needs).toHaveLength(5)
        expect(new Set(entry.needs).size).toBe(5)
        for (const key of entry.needs) {
          expect(findNeedDefinition(key)?.key, key).toBe(key)
        }
      })

      it('fits the 10-point budget', () => {
        expect(budgetForPicks(entry.needs).used).toBeLessThanOrEqual(NEED_BUDGET_POINTS)
      })

      it('offers only needs this class and spec can use', () => {
        const eligible = new Set(
          eligibleNeedsFor({ className: entry.className, specName: entry.specName }).map((need) => need.key),
        )
        for (const key of entry.needs) expect(eligible.has(key), `${key} is not eligible`).toBe(true)
      })

      it('is frozen, tuple included', () => {
        expect(Object.isFrozen(entry)).toBe(true)
        expect(Object.isFrozen(entry.needs)).toBe(true)
      })
    },
  )

  it('keeps Shadow Priest at 10 points with no ranged-weapon key (D-31, F7)', () => {
    const shadow = NEED_DEFAULTS.find((d) => d.className === 'Priest' && d.specName === 'Shadow')
    expect(shadow?.needs).toEqual([
      'main-hand-weapon.spell-damage',
      'trinket.spell-damage',
      'ring.spell-damage',
      'chest.cloth.spell-damage',
      'head.cloth.spell-damage',
    ])
    expect(budgetForPicks(shadow?.needs ?? []).used).toBe(10)
    expect(shadow?.needs.some((key) => key.startsWith('ranged-weapon'))).toBe(false)
  })

  it('reads defaultNeedsFor as the same list the table holds, position 1 first', () => {
    const arms = defaultNeedsFor('Warrior', 'Arms/Fury')
    expect(arms?.[0]).toBe('two-hand-weapon.strength')
    for (const entry of NEED_DEFAULTS) {
      expect(defaultNeedsFor(entry.className, entry.specName)).toEqual(entry.needs)
    }
  })
})

describe('defaultNeedsFor edges (D-11, T-04-04-01)', () => {
  it('returns null for a spec on purpose without a default', () => {
    expect(defaultNeedsFor('Death Knight', 'Blood')).toBeNull()
    expect(defaultNeedsFor('Monk', 'Windwalker')).toBeNull()
  })

  it('returns null for a missing or unknown class or spec', () => {
    expect(defaultNeedsFor(null, 'Mage')).toBeNull()
    expect(defaultNeedsFor('Mage', null)).toBeNull()
    expect(defaultNeedsFor(undefined, undefined)).toBeNull()
    expect(defaultNeedsFor('Mage', 'Fire')).toBeNull()
    expect(defaultNeedsFor('Gnome', 'Mage')).toBeNull()
  })

  it('answers nothing for prototype names', () => {
    expect(defaultNeedsFor('__proto__', 'x')).toBeNull()
    expect(defaultNeedsFor('constructor', 'constructor')).toBeNull()
    expect(defaultNeedsFor('toString', 'valueOf')).toBeNull()
  })

  it('returns the same frozen array, in the same order, on every call', () => {
    const first = defaultNeedsFor('Rogue', 'Rogue')
    const second = defaultNeedsFor('Rogue', 'Rogue')
    expect(first).not.toBeNull()
    expect(second).toBe(first)
    expect(Object.isFrozen(first)).toBe(true)
    expect(first?.[0]).toBe('main-hand-weapon.agility')
  })
})

describe('matchesSpecDefault (D-11, DISC-04 adjacency)', () => {
  it('is true when all five positions hold the default keys in order', () => {
    const mage = [...(defaultNeedsFor('Mage', 'Mage') ?? [])]
    expect(mage).toHaveLength(5)
    expect(matchesSpecDefault(mage, 'Mage', 'Mage')).toBe(true)
  })

  it('is true for every default against its own spec', () => {
    for (const entry of NEED_DEFAULTS) {
      expect(matchesSpecDefault([...entry.needs], entry.className, entry.specName), entry.specName).toBe(true)
    }
  })

  it('is false for the same five keys in another order, because that is an edit', () => {
    const swapped = [...(defaultNeedsFor('Mage', 'Mage') ?? [])]
    ;[swapped[3], swapped[4]] = [swapped[4], swapped[3]]
    expect(matchesSpecDefault(swapped, 'Mage', 'Mage')).toBe(false)
  })

  it('is false when a position is empty, so four keys and a null is an edit', () => {
    const four = [...(defaultNeedsFor('Mage', 'Mage') ?? [])]
    expect(matchesSpecDefault([...four.slice(0, 4), null], 'Mage', 'Mage')).toBe(false)
    expect(matchesSpecDefault([null, null, null, null, null], 'Mage', 'Mage')).toBe(false)
  })

  it('is false for a list of the wrong length', () => {
    const mage = [...(defaultNeedsFor('Mage', 'Mage') ?? [])]
    expect(matchesSpecDefault(mage.slice(0, 4), 'Mage', 'Mage')).toBe(false)
    expect(matchesSpecDefault([...mage, 'ring.spell-damage'], 'Mage', 'Mage')).toBe(false)
  })

  it('is false when the keys belong to a different spec', () => {
    const rogue = [...(defaultNeedsFor('Rogue', 'Rogue') ?? [])]
    expect(matchesSpecDefault(rogue, 'Mage', 'Mage')).toBe(false)
  })

  it('is false for any keys when the spec has no default or is unknown', () => {
    const keys = [...(defaultNeedsFor('Mage', 'Mage') ?? [])]
    expect(matchesSpecDefault(keys, 'Death Knight', 'Blood')).toBe(false)
    expect(matchesSpecDefault(keys, null, 'Mage')).toBe(false)
    expect(matchesSpecDefault(keys, 'Mage', undefined)).toBe(false)
    expect(matchesSpecDefault(keys, '__proto__', 'x')).toBe(false)
  })
})
