// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { NEED_DEFAULTS, SPECS_WITHOUT_DEFAULT, defaultNeedsFor } from '@/domain/loot/need-defaults'
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
