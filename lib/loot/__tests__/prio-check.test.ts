import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchListPrioItems } from '@/lib/loot/prio-check'
import { findPrioViolations } from '@/domain/loot/prio-violations'

type Row = Record<string, unknown>

// In-memory stand-in for the query shapes prio-check and loot-items-query use.
function makeClient(tables: Record<string, Row[]>, errors: Record<string, { message: string }> = {}) {
  return {
    from(table: string) {
      let rows = [...(tables[table] ?? [])]
      const result = () => (errors[table] ? { data: null, error: errors[table] } : { data: rows, error: null })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: unknown) => { rows = rows.filter(r => r[col] === val); return builder },
        in: (col: string, vals: unknown[]) => { rows = rows.filter(r => vals.includes(r[col])); return builder },
        order: () => builder,
        range: (start: number, end: number) => { rows = rows.slice(start, end + 1); return builder },
        single: () => Promise.resolve(
          errors[table] ? { data: null, error: errors[table] } : { data: rows[0] ?? null, error: rows[0] ? null : { message: 'none' } },
        ),
        then: (resolve: (v: unknown) => unknown) => Promise.resolve(result()).then(resolve),
      }
      return builder
    },
  } as unknown as SupabaseClient
}

const EXPANSION_ID = 'exp-1'
const MAGE_CLASS = 'class-mage'
const OTHER_CLASS = 'class-warrior'

function item(id: string, tierId: string, classes: Row[]): Row {
  return {
    id,
    name: `Item ${id}`,
    boss_name: 'Boss',
    item_slot: 'Neck',
    wowhead_id: 1,
    classification: 'Unlimited',
    item_type: null,
    allocation_cost: 0,
    is_available: true,
    is_loot_council: false,
    roles: null,
    armor_type: null,
    weapon_type: null,
    primary_stat: null,
    raid_tier_id: tierId,
    loot_item_classes: classes,
    raid_tiers: { name: tierId },
  }
}

function tables(): Record<string, Row[]> {
  return {
    expansions: [{ id: EXPANSION_ID, current_phase: 3, phase_groups: [[2, 3]] }],
    raid_tiers: [
      { id: 't1', phase: 1, expansion_id: EXPANSION_ID, is_guild_active: true },
      { id: 't2', phase: 2, expansion_id: EXPANSION_ID, is_guild_active: true },
      { id: 't3', phase: 3, expansion_id: EXPANSION_ID, is_guild_active: true },
    ],
    characters: [{ id: 'char-1', class_id: MAGE_CLASS, spec_id: null, user_id: 'u', wow_classes: { name: 'Mage' } }],
    loot_items: [
      item('p1-item', 't1', []),
      item('p2-open', 't2', []),
      item('p3-other', 't3', [{ class_id: OTHER_CLASS, spec_id: null, spec_type: 'primary' }]),
    ],
    wow_classes: [],
    class_specs: [],
  }
}

describe('fetchListPrioItems', () => {
  it('reads every tier of the list phase group and carries the prio flags', async () => {
    const items = await fetchListPrioItems(makeClient(tables()), { character_id: 'char-1', expansion_id: EXPANSION_ID, phase: 2 })
    expect(items.map(i => i.id).sort()).toEqual(['p2-open', 'p3-other'])

    // regression for #484: an item from the group's later phase prio-d to
    // another class is caught, not just items of the first phase.
    expect(
      findPrioViolations([{ loot_item_id: 'p3-other', rank: 45, slot: 1 }], items),
    ).toEqual([{ loot_item_id: 'p3-other', rank: 45, slot: 1, zone: 'bracket' }])
  })

  it('rejects when the expansion or tiers cannot be read', async () => {
    const list = { character_id: 'char-1', expansion_id: EXPANSION_ID, phase: 2 }
    await expect(fetchListPrioItems(makeClient(tables(), { expansions: { message: 'x' } }), list)).rejects.toThrow()
    await expect(fetchListPrioItems(makeClient(tables(), { raid_tiers: { message: 'x' } }), list)).rejects.toThrow()
  })

  it('rejects when the character cannot be read', async () => {
    const list = { character_id: 'missing', expansion_id: EXPANSION_ID, phase: 2 }
    await expect(fetchListPrioItems(makeClient(tables()), list)).rejects.toThrow()
  })
})
