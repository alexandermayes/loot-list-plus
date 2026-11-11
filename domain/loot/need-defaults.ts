/**
 * The default Discovery list for each spec (D-09, D-11, D-31).
 *
 * This file is the owner-reviewed source of spec defaults: the owner reads the
 * lists before the PR carrying it merges, and every later edit is a PR too.
 * There is no per-guild editing (deferred). A default is what a raider accepts
 * with one "Looks right" tap, so domain/loot/__tests__/need-defaults.test.ts
 * fails the build for a list that is not five distinct current keys, is over
 * the budget, or holds a need the spec cannot use.
 *
 * Each list is ordered with the need the raider wants most first, because the
 * picker maps position 1 to the top rank. The rows are the research table
 * (FEATURES.md) transcribed to keys, with Arms standing in for the single
 * Arms/Fury row and the Shadow Priest wand swapped for a ring: wands sit in
 * the Big ranged weapon row, which would cost 11 (D-31).
 *
 * Death Knight and Monk specs are not served by the taxonomy, so they have no
 * default and are listed in SPECS_WITHOUT_DEFAULT; the gate test makes a spec
 * that is in neither list a failure, so a gap is always a visible decision.
 *
 * Pure and client-safe: no server code, no I/O.
 */

export interface NeedDefault {
  readonly className: string
  readonly specName: string
  /** Five need keys, position 1 first. */
  readonly needs: readonly [string, string, string, string, string]
}

type NeedKeys = NeedDefault['needs']

// Frozen at both levels so a caller cannot reorder a list the owner reviewed.
function frozenDefault(entry: NeedDefault): NeedDefault {
  return Object.freeze({
    ...entry,
    needs: Object.freeze([...entry.needs]) as unknown as NeedKeys,
  })
}

export const NEED_DEFAULTS: readonly NeedDefault[] = Object.freeze([
  frozenDefault({
    className: 'Warrior',
    specName: 'Arms/Fury',
    needs: [
      'two-hand-weapon.strength',
      'trinket.physical',
      'ring.physical',
      'chest.plate.strength',
      'hands.plate.strength',
    ],
  }),
  frozenDefault({
    className: 'Warrior',
    specName: 'Protection',
    needs: ['main-hand-weapon.tank', 'trinket.tank', 'shield.tank', 'chest.plate.tank', 'legs.plate.tank'],
  }),
  frozenDefault({
    className: 'Paladin',
    specName: 'Holy',
    needs: [
      'main-hand-weapon.healing',
      'trinket.healing',
      'ring.healing',
      'chest.plate.healing',
      'legs.plate.healing',
    ],
  }),
  frozenDefault({
    className: 'Paladin',
    specName: 'Retribution',
    needs: [
      'two-hand-weapon.strength',
      'trinket.physical',
      'ring.physical',
      'chest.plate.strength',
      'legs.plate.strength',
    ],
  }),
  frozenDefault({
    className: 'Paladin',
    specName: 'Protection',
    needs: ['main-hand-weapon.tank', 'shield.tank', 'trinket.tank', 'chest.plate.tank', 'legs.plate.tank'],
  }),
  frozenDefault({
    className: 'Shaman',
    specName: 'Restoration',
    needs: [
      'main-hand-weapon.healing',
      'trinket.healing',
      'shield.healing',
      'chest.mail.healing',
      'legs.mail.healing',
    ],
  }),
  frozenDefault({
    className: 'Shaman',
    specName: 'Elemental',
    needs: [
      'main-hand-weapon.spell-damage',
      'trinket.spell-damage',
      'ring.spell-damage',
      'chest.mail.spell-damage',
      'head.mail.spell-damage',
    ],
  }),
  // Two-hand Strength is pending the Forever Windfury rework: owner review (D-09).
  frozenDefault({
    className: 'Shaman',
    specName: 'Enhancement',
    needs: [
      'two-hand-weapon.strength',
      'trinket.physical',
      'ring.physical',
      'chest.mail.strength',
      'hands.mail.strength',
    ],
  }),
  frozenDefault({
    className: 'Druid',
    specName: 'Restoration',
    needs: [
      'main-hand-weapon.healing',
      'trinket.healing',
      'off-hand-item.healing',
      'chest.leather.healing',
      'legs.leather.healing',
    ],
  }),
  // Feral is the cat build, so agility: owner review (D-09).
  frozenDefault({
    className: 'Druid',
    specName: 'Feral',
    needs: [
      'two-hand-weapon.agility',
      'trinket.physical',
      'ring.physical',
      'chest.leather.agility',
      'head.leather.agility',
    ],
  }),
  frozenDefault({
    className: 'Druid',
    specName: 'Guardian',
    needs: ['two-hand-weapon.tank', 'trinket.tank', 'ring.tank', 'chest.leather.tank', 'legs.leather.tank'],
  }),
  frozenDefault({
    className: 'Druid',
    specName: 'Balance',
    needs: [
      'main-hand-weapon.spell-damage',
      'trinket.spell-damage',
      'off-hand-item.spell-damage',
      'chest.leather.spell-damage',
      'legs.leather.spell-damage',
    ],
  }),
  frozenDefault({
    className: 'Priest',
    specName: 'Holy/Disc',
    needs: [
      'main-hand-weapon.healing',
      'trinket.healing',
      'off-hand-item.healing',
      'chest.cloth.healing',
      'legs.cloth.healing',
    ],
  }),
  frozenDefault({
    className: 'Priest',
    specName: 'Shadow',
    needs: [
      'main-hand-weapon.spell-damage',
      'trinket.spell-damage',
      'ring.spell-damage',
      'chest.cloth.spell-damage',
      'head.cloth.spell-damage',
    ],
  }),
  frozenDefault({
    className: 'Mage',
    specName: 'Mage',
    needs: [
      'main-hand-weapon.spell-damage',
      'trinket.spell-damage',
      'ring.spell-damage',
      'head.cloth.spell-damage',
      'legs.cloth.spell-damage',
    ],
  }),
  frozenDefault({
    className: 'Warlock',
    specName: 'Warlock',
    needs: [
      'main-hand-weapon.spell-damage',
      'trinket.spell-damage',
      'ring.spell-damage',
      'chest.cloth.spell-damage',
      'head.cloth.spell-damage',
    ],
  }),
  frozenDefault({
    className: 'Hunter',
    specName: 'Hunter',
    needs: [
      'ranged-weapon.agility',
      'trinket.physical',
      'ring.physical',
      'chest.mail.agility',
      'legs.mail.agility',
    ],
  }),
  frozenDefault({
    className: 'Rogue',
    specName: 'Rogue',
    needs: [
      'main-hand-weapon.agility',
      'trinket.physical',
      'ring.physical',
      'chest.leather.agility',
      'hands.leather.agility',
    ],
  }),
])

/** Specs the taxonomy cannot serve: the picker opens with five empty rows (D-11). */
export const SPECS_WITHOUT_DEFAULT: ReadonlyArray<{
  readonly className: string
  readonly specName: string
}> = Object.freeze([
  Object.freeze({ className: 'Death Knight', specName: 'Blood' }),
  Object.freeze({ className: 'Death Knight', specName: 'Frost/Unholy' }),
  Object.freeze({ className: 'Monk', specName: 'Brewmaster' }),
  Object.freeze({ className: 'Monk', specName: 'Windwalker' }),
  Object.freeze({ className: 'Monk', specName: 'Mistweaver' }),
])

// A Map keyed by a joined string, never an object indexed by input: the names
// come from a character row the raider can edit, and '__proto__' must answer
// nothing instead of answering from the prototype (T-04-04-01).
const pairKey = (className: string, specName: string) => `${className}|${specName}`

const DEFAULT_BY_PAIR: ReadonlyMap<string, NeedDefault> = new Map(
  NEED_DEFAULTS.map((entry) => [pairKey(entry.className, entry.specName), entry] as const),
)

/**
 * The default five keys for this spec, or null when there is none (a spec in
 * SPECS_WITHOUT_DEFAULT, or a missing or unknown class or spec). The same
 * frozen array comes back on every call.
 */
export function defaultNeedsFor(
  className: string | null | undefined,
  specName: string | null | undefined,
): readonly string[] | null {
  if (typeof className !== 'string' || typeof specName !== 'string') return null
  return DEFAULT_BY_PAIR.get(pairKey(className, specName))?.needs ?? null
}
