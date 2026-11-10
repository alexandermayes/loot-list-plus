// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  NEED_BOSS_NAME,
  NEED_CLASSIFICATION_BY_TIER,
  NEED_COST_BY_TIER,
  NEED_DEFINITIONS,
  findNeedDefinition,
  needRowColumns,
  resolveNeedKey,
  validateNeedDefinitions,
  type NeedDefinition,
} from '@/domain/loot/needs'
import needKeysFixture from '@/domain/loot/__fixtures__/need-keys.json'

// Why this gate exists: need keys become a one-way contract (D-12) the moment
// raiders rank them, because rankings, submissions, bad luck protection and
// pins all reference them. A typo, a rename or a repriced row must fail CI
// here rather than reach a guild.
//
// The fixture and the spec-default list below are transcribed by hand from the
// plan, not read back from needs.ts, so this is a real guard rather than a
// restatement of the data (same pattern as the Forever manifest gate). A later
// key change has to edit both files on purpose.

const EM_DASH = String.fromCharCode(0x2014)
const EN_DASH = String.fromCharCode(0x2013)

// The item_slot vocabulary already used by data/*-raids.ts.
const ITEM_SLOT_VOCABULARY = [
  'Two-Hand', 'Main Hand', 'Off Hand', 'Ranged', 'Trinket', 'Finger', 'Neck', 'Back',
  'Shield', 'Held In Off-hand', 'Relic', 'Head', 'Shoulder', 'Chest', 'Wrist', 'Hands',
  'Waist', 'Legs', 'Feet',
]

const BIG_SLOTS = ['two-hand-weapon', 'main-hand-weapon', 'off-hand-weapon', 'ranged-weapon', 'trinket']
const MEDIUM_SLOTS = ['ring', 'neck', 'back', 'shield', 'off-hand-item', 'relic']
const STANDARD_SLOTS = ['head', 'shoulders', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet']

// FEATURES.md "Defaults by class and spec", Wand read as Ranged weapon (D-23).
const SPEC_DEFAULTS = [
  'two-hand-weapon.strength', 'main-hand-weapon.strength', 'trinket.physical',
  'ring.physical', 'chest.plate.strength', 'hands.plate.strength',
  'main-hand-weapon.tank', 'trinket.tank', 'shield.tank',
  'chest.plate.tank', 'legs.plate.tank', 'main-hand-weapon.healing',
  'trinket.healing', 'ring.healing', 'chest.plate.healing',
  'legs.plate.healing', 'legs.plate.strength', 'shield.healing',
  'chest.mail.healing', 'legs.mail.healing', 'main-hand-weapon.spell-damage',
  'trinket.spell-damage', 'ring.spell-damage', 'chest.mail.spell-damage',
  'head.mail.spell-damage', 'chest.mail.strength', 'hands.mail.strength',
  'off-hand-item.healing', 'chest.leather.healing', 'legs.leather.healing',
  'two-hand-weapon.agility', 'chest.leather.agility', 'head.leather.agility',
  'two-hand-weapon.tank', 'ring.tank', 'chest.leather.tank',
  'legs.leather.tank', 'off-hand-item.spell-damage', 'chest.leather.spell-damage',
  'legs.leather.spell-damage', 'chest.cloth.healing', 'legs.cloth.healing',
  'ranged-weapon.spell-damage', 'chest.cloth.spell-damage', 'head.cloth.spell-damage',
  'legs.cloth.spell-damage', 'ranged-weapon.agility', 'chest.mail.agility',
  'legs.mail.agility', 'main-hand-weapon.agility', 'hands.leather.agility',
]

type MutableNeed = {
  -readonly [K in keyof NeedDefinition]: NeedDefinition[K] extends readonly string[]
    ? string[]
    : NeedDefinition[K]
}

function clone(): MutableNeed[] {
  return structuredClone(NEED_DEFINITIONS) as MutableNeed[]
}

function expectError(errors: string[], fragment: string) {
  expect(errors.some((message) => message.includes(fragment))).toBe(true)
}

describe('need taxonomy tracer', () => {
  it('holds 145 definitions', () => {
    expect(NEED_DEFINITIONS.length).toBe(145)
  })

  it('describes chest.plate.strength as a Standard row', () => {
    const definition = findNeedDefinition('chest.plate.strength')
    expect(definition).not.toBeNull()
    expect(definition?.name).toBe('Chest, Plate, Strength')
    expect(definition?.tier).toBe('standard')
    expect(definition?.cost).toBe(1)
    expect(definition?.classification).toBe('Unlimited')
  })

  it('builds the need-row columns for trinket.healing', () => {
    const definition = findNeedDefinition('trinket.healing')
    expect(definition).not.toBeNull()
    const columns = needRowColumns(definition!)
    expect(columns).toEqual({
      name: 'Trinket, Healing',
      boss_name: 'Needs',
      item_slot: 'Trinket',
      kind: 'need',
      need_key: 'trinket.healing',
      classification: 'Reserved',
      allocation_cost: 3,
      armor_type: null,
      roles: ['healer'],
      primary_stat: null,
      is_available: true,
      is_loot_council: false,
    })
    expect('wowhead_id' in columns).toBe(false)
  })

  it('maps armour, role and primary stat for legs.mail.agility', () => {
    const columns = needRowColumns(findNeedDefinition('legs.mail.agility')!)
    expect(columns.armor_type).toBe('Mail')
    expect(columns.roles).toEqual(['physical'])
    expect(columns.primary_stat).toBe('Agility')
    expect(columns.item_slot).toBe('Legs')
  })

  it('finds ring.tank and returns null for anything else', () => {
    expect(findNeedDefinition('ring.tank')?.key).toBe('ring.tank')
    expect(findNeedDefinition('nope')).toBeNull()
    expect(findNeedDefinition('')).toBeNull()
    // A plain-object lookup would answer these from the prototype (T-03-03-02).
    expect(findNeedDefinition('constructor')).toBeNull()
    expect(findNeedDefinition('__proto__')).toBeNull()
  })
})

describe('need taxonomy frozen list', () => {
  it('has exactly the keys of the independent fixture, in order (D-12)', () => {
    expect(NEED_DEFINITIONS.map((definition) => definition.key)).toEqual(needKeysFixture)
  })

  it('counts 19 Big, 22 Medium and 104 Standard rows', () => {
    const count = (tier: string) => NEED_DEFINITIONS.filter((d) => d.tier === tier).length
    expect(count('big')).toBe(19)
    expect(count('medium')).toBe(22)
    expect(count('standard')).toBe(104)
  })

  it('writes every key as slot[.armour].stat in lowercase kebab segments, unique', () => {
    for (const definition of NEED_DEFINITIONS) {
      expect(definition.key).toMatch(/^[a-z-]+(\.[a-z-]+){1,2}$/)
      const parts = [definition.slot, definition.armour, definition.stat].filter(Boolean)
      expect(definition.key).toBe(parts.join('.'))
    }
    const keys = NEED_DEFINITIONS.map((d) => d.key)
    const names = NEED_DEFINITIONS.map((d) => d.name)
    expect(new Set(keys).size).toBe(keys.length)
    expect(new Set(names).size).toBe(names.length)
  })

  it('puts the right slots in each tier', () => {
    const slotsOf = (tier: string) => [
      ...new Set(NEED_DEFINITIONS.filter((d) => d.tier === tier).map((d) => d.slot)),
    ]
    expect(slotsOf('big')).toEqual(BIG_SLOTS)
    expect(slotsOf('medium')).toEqual(MEDIUM_SLOTS)
    expect(slotsOf('standard')).toEqual(STANDARD_SLOTS)
  })

  it('mirrors cost and classification from the tier on every row (D-06, D-08)', () => {
    expect(NEED_COST_BY_TIER).toEqual({ big: 3, medium: 2, standard: 1 })
    expect(NEED_CLASSIFICATION_BY_TIER).toEqual({
      big: 'Reserved',
      medium: 'Limited',
      standard: 'Unlimited',
    })
    for (const definition of NEED_DEFINITIONS) {
      expect(definition.cost).toBe(NEED_COST_BY_TIER[definition.tier])
      expect(definition.classification).toBe(NEED_CLASSIFICATION_BY_TIER[definition.tier])
    }
  })

  it('[D-23] prices Shield, Off-hand item and Relic as Medium and folds wands into Ranged weapon', () => {
    const rows = NEED_DEFINITIONS.filter((d) => ['shield', 'off-hand-item', 'relic'].includes(d.slot))
    expect(rows.length).toBe(10)
    for (const row of rows) {
      expect(row.tier).toBe('medium')
      expect(row.cost).toBe(2)
      expect(row.classification).toBe('Limited')
    }
    for (const definition of NEED_DEFINITIONS) {
      expect(definition.key.toLowerCase()).not.toContain('wand')
      expect(definition.name.toLowerCase()).not.toContain('wand')
    }
    expect(findNeedDefinition('ranged-weapon.spell-damage')?.tier).toBe('big')
    expect(findNeedDefinition('ranged-weapon.healing')?.tier).toBe('big')
  })

  it('keeps dashes out of every name and the Needs label', () => {
    for (const definition of NEED_DEFINITIONS) {
      expect(definition.name).not.toContain(EM_DASH)
      expect(definition.name).not.toContain(EN_DASH)
    }
    expect(NEED_BOSS_NAME).toBe('Needs')
    expect(NEED_BOSS_NAME).not.toContain(EM_DASH)
    expect(NEED_BOSS_NAME).not.toContain(EN_DASH)
  })

  it('[D-00c] keeps Healing and Spell damage apart, has no Tier slot, and limits armour to armour slots', () => {
    const stats = new Set(NEED_DEFINITIONS.map((d) => d.stat))
    expect(stats.has('healing')).toBe(true)
    expect(stats.has('spell-damage')).toBe(true)
    for (const definition of NEED_DEFINITIONS) {
      expect(definition.slot).not.toContain('tier')
      const isArmourSlot = STANDARD_SLOTS.includes(definition.slot)
      expect(definition.armour === null).toBe(!isArmourSlot)
    }
  })

  it('names rows as slot, armour and stat joined by comma and space (D-10)', () => {
    expect(findNeedDefinition('two-hand-weapon.strength')?.name).toBe('Two-hand weapon, Strength')
    expect(findNeedDefinition('trinket.spell-damage')?.name).toBe('Trinket, Spell damage')
    expect(findNeedDefinition('off-hand-item.healing')?.name).toBe('Off-hand item, Healing')
  })

  it('uses only item_slot values from the existing vocabulary', () => {
    for (const definition of NEED_DEFINITIONS) {
      expect(ITEM_SLOT_VOCABULARY).toContain(needRowColumns(definition).item_slot)
    }
  })

  it('builds identical need-row payloads on every call (DISC-01 ordering)', () => {
    const first = NEED_DEFINITIONS.map(needRowColumns)
    const second = NEED_DEFINITIONS.map(needRowColumns)
    expect(second).toEqual(first)
    expect(first.every((row) => row.kind === 'need' && row.is_available && !row.is_loot_council)).toBe(true)
  })

  it('is frozen, entry by entry', () => {
    expect(Object.isFrozen(NEED_DEFINITIONS)).toBe(true)
    for (const definition of NEED_DEFINITIONS) {
      expect(Object.isFrozen(definition)).toBe(true)
      expect(Object.isFrozen(definition.previousKeys)).toBe(true)
      expect(Object.isFrozen(definition.previousNames)).toBe(true)
    }
  })

  it('resolves every spec default to a key', () => {
    expect(SPEC_DEFAULTS.length).toBe(51)
    for (const key of SPEC_DEFAULTS) {
      expect(findNeedDefinition(key)?.key).toBe(key)
      expect(resolveNeedKey(key)).toBe(key)
    }
  })
})

describe('validateNeedDefinitions', () => {
  it('returns no error for the shipped list', () => {
    expect(validateNeedDefinitions(NEED_DEFINITIONS)).toEqual([])
    expect(validateNeedDefinitions()).toEqual([])
  })

  it('names a duplicate key', () => {
    const rows = clone()
    rows[1].key = rows[0].key
    expectError(validateNeedDefinitions(rows), 'duplicate key')
  })

  it('names a duplicate display name', () => {
    const rows = clone()
    rows[1].name = rows[0].name
    expectError(validateNeedDefinitions(rows), 'duplicate name')
  })

  it('names a key renamed without its parts changing', () => {
    const rows = clone()
    rows[0].key = 'two-hand-weapon.str'
    expectError(validateNeedDefinitions(rows), 'does not match its slot, armour and stat')
  })

  it('names a cost of 2 on a Big slot', () => {
    const rows = clone()
    rows[0].cost = 2
    expectError(validateNeedDefinitions(rows), 'cost')
  })

  it('names a classification that breaks the tier mirror', () => {
    const rows = clone()
    rows[0].classification = 'Unlimited'
    expectError(validateNeedDefinitions(rows), 'classification')
  })

  it('names a dash in a display name', () => {
    const emRows = clone()
    emRows[0].name = `Two-hand weapon ${EM_DASH} Strength`
    expectError(validateNeedDefinitions(emRows), 'dash')
    const enRows = clone()
    enRows[0].name = `Two-hand weapon ${EN_DASH} Strength`
    expectError(validateNeedDefinitions(enRows), 'dash')
  })

  it('names an alias equal to a current key', () => {
    const rows = clone()
    rows[0].previousKeys = [rows[1].key]
    expectError(validateNeedDefinitions(rows), 'alias')
  })

  it('names the same alias on two rows', () => {
    const rows = clone()
    rows[0].previousKeys = ['old.shared-key']
    rows[1].previousKeys = ['old.shared-key']
    expectError(validateNeedDefinitions(rows), 'alias')
  })

  it('resolves a retired key through its alias after a rename (D-12)', () => {
    const rows = clone()
    const oldKey = rows[0].key
    rows[0].key = 'two-hand-weapon.brawn'
    rows[0].stat = 'brawn' as NeedDefinition['stat']
    rows[0].previousKeys = [oldKey]
    expect(validateNeedDefinitions(rows)).toEqual([])
    expect(findNeedDefinition(oldKey, rows)?.key).toBe('two-hand-weapon.brawn')
    expect(resolveNeedKey(oldKey, rows)).toBe('two-hand-weapon.brawn')
    // Without the alias the old key is simply gone.
    expect(findNeedDefinition(oldKey)?.key).toBe(oldKey)
    expect(findNeedDefinition('two-hand-weapon.brawn')).toBeNull()
  })
})
