// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  NEED_DEFINITIONS,
  findNeedDefinition,
  needRowColumns,
} from '@/domain/loot/needs'

// Why this tracer exists: the need taxonomy is a one-way contract (D-12) once
// raiders rank its keys, and every seeded need row is built from it (DISC-06).
// These cases prove the thinnest slice end to end: a frozen definition turns
// into a row payload with the shape the Discovery migration's check expects.
// The full frozen-list gate (independent fixture, counts, cost mirror, names,
// aliases, spec defaults) is added below the tracer.

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
