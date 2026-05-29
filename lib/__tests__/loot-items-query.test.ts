import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchFilteredLootItems,
  resolveTierIdsForPhases,
  type LootItemCharacter,
} from '../loot-items-query'

/**
 * Minimal in-memory Supabase client stand-in. Only implements the query
 * patterns that loot-items-query.ts actually uses: a chained `.select`
 * with optional `.in`, `.eq`, `.order`, awaited as `{ data, error }`.
 *
 * Each table is seeded from the provided fixture and filters are applied
 * in the order they're chained, so tests can assert behavior on the same
 * shape the real client returns.
 */
type Row = Record<string, unknown>

function makeMockSupabase(tables: Record<string, Row[]>) {
  function fromBuilder(table: string) {
    let rows: Row[] = [...(tables[table] ?? [])]

    const builder = {
      select(_cols: string) {
        return builder
      },
      in(column: string, values: unknown[]) {
        rows = rows.filter((r) => values.includes(r[column]))
        return builder
      },
      eq(column: string, value: unknown) {
        rows = rows.filter((r) => r[column] === value)
        return builder
      },
      order(_column: string, _opts?: unknown) {
        return builder
      },
      range(start: number, end: number) {
        // Mirror PostgREST .range() (inclusive bounds) so paginatedSelect works.
        rows = rows.slice(start, end + 1)
        return builder
      },
      // Thenable — allows `await supabase.from(...).select(...).eq(...)`
      then(onFulfilled: (result: { data: Row[]; error: null }) => unknown) {
        return Promise.resolve({ data: rows, error: null }).then(onFulfilled)
      },
    }
    return builder
  }

  return {
    from: fromBuilder,
  } as unknown as SupabaseClient
}

// ─── Shared fixtures ────────────────────────────────────────────

// wow_classes + class_specs reference data used by all tests.
const allClasses = [
  { id: 'class-warrior', name: 'Warrior', color_hex: '#C79C6E' },
  { id: 'class-druid', name: 'Druid', color_hex: '#FF7D0A' },
  { id: 'class-mage', name: 'Mage', color_hex: '#69CCF0' },
  { id: 'class-hunter', name: 'Hunter', color_hex: '#ABD473' },
]

const allSpecs = [
  { id: 'spec-warrior-fury', name: 'Fury', class_id: 'class-warrior' },
  { id: 'spec-warrior-prot', name: 'Protection', class_id: 'class-warrior' },
  { id: 'spec-druid-feral', name: 'Feral', class_id: 'class-druid' },
  { id: 'spec-mage-fire', name: 'Fire', class_id: 'class-mage' },
]

function warrior(overrides: Partial<LootItemCharacter> = {}): LootItemCharacter {
  return {
    id: 'char-1',
    class_id: 'class-warrior',
    spec_id: 'spec-warrior-fury',
    class_name: 'Warrior',
    ...overrides,
  }
}

function druid(overrides: Partial<LootItemCharacter> = {}): LootItemCharacter {
  return {
    id: 'char-2',
    class_id: 'class-druid',
    spec_id: 'spec-druid-feral',
    class_name: 'Druid',
    ...overrides,
  }
}

function mage(overrides: Partial<LootItemCharacter> = {}): LootItemCharacter {
  return {
    id: 'char-3',
    class_id: 'class-mage',
    spec_id: 'spec-mage-fire',
    class_name: 'Mage',
    ...overrides,
  }
}

/**
 * Helper to build a loot_items row matching the shape the query selects.
 * Defaults keep items "open" (no class restrictions, no special slots)
 * so tests only need to override what they care about.
 */
function item(
  id: string,
  overrides: Partial<{
    name: string
    boss_name: string
    item_slot: string
    wowhead_id: number
    armor_type: string | null
    weapon_type: string | null
    classification: string
    item_type: string
    allocation_cost: number
    is_available: boolean
    is_loot_council: boolean
    roles: string[]
    raid_tier_id: string
    loot_item_classes: Array<{ class_id: string; spec_id: string | null; spec_type: string | null }>
    raid_tiers: { name: string } | null
  }> = {}
) {
  return {
    id,
    name: overrides.name ?? 'Test Item',
    boss_name: overrides.boss_name ?? 'Test Boss',
    item_slot: overrides.item_slot ?? 'Chest',
    wowhead_id: overrides.wowhead_id ?? 100000,
    classification: overrides.classification ?? 'Unlimited',
    item_type: overrides.item_type ?? 'Chest',
    allocation_cost: overrides.allocation_cost ?? 1,
    is_available: overrides.is_available ?? true,
    is_loot_council: overrides.is_loot_council ?? false,
    roles: overrides.roles ?? [],
    armor_type: overrides.armor_type ?? null,
    weapon_type: overrides.weapon_type ?? null,
    raid_tier_id: overrides.raid_tier_id ?? 'tier-1',
    loot_item_classes: overrides.loot_item_classes ?? [],
    raid_tiers: overrides.raid_tiers ?? { name: 'Karazhan' },
  }
}

// ─── Empty + edge inputs ────────────────────────────────────────

describe('fetchFilteredLootItems', () => {
  it('returns [] when no tier ids are passed', async () => {
    const supabase = makeMockSupabase({ loot_items: [], wow_classes: [], class_specs: [] })
    const result = await fetchFilteredLootItems(supabase, warrior(), [])
    expect(result).toEqual([])
  })

  it('returns [] when no items match the tier filter', async () => {
    const supabase = makeMockSupabase({
      loot_items: [item('a', { raid_tier_id: 'other-tier' })],
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const result = await fetchFilteredLootItems(supabase, warrior(), ['tier-1'])
    expect(result).toEqual([])
  })

  // ─── Armor proficiency ──────────────────────────────────────

  it('filters plate off a mage but keeps cloth', async () => {
    const supabase = makeMockSupabase({
      loot_items: [
        item('plate', { name: 'Plate Legs', item_slot: 'Legs', armor_type: 'Plate' }),
        item('cloth', { name: 'Cloth Robe', item_slot: 'Chest', armor_type: 'Cloth' }),
      ],
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const result = (await fetchFilteredLootItems(supabase, mage(), ['tier-1'])) as Array<{ id: string }>
    const ids = result.map((r) => r.id)
    expect(ids).toContain('cloth')
    expect(ids).not.toContain('plate')
  })

  it('keeps plate for a warrior', async () => {
    const supabase = makeMockSupabase({
      loot_items: [item('plate', { name: 'Plate Legs', item_slot: 'Legs', armor_type: 'Plate' })],
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const result = (await fetchFilteredLootItems(supabase, warrior(), ['tier-1'])) as Array<{ id: string }>
    expect(result.map((r) => r.id)).toEqual(['plate'])
  })

  it('leather on a druid passes the armor check', async () => {
    const supabase = makeMockSupabase({
      loot_items: [item('leather', { item_slot: 'Chest', armor_type: 'Leather' })],
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const result = (await fetchFilteredLootItems(supabase, druid(), ['tier-1'])) as Array<{ id: string }>
    expect(result.map((r) => r.id)).toEqual(['leather'])
  })

  // ─── Class-agnostic slots ──────────────────────────────────

  it('lets any class see a neck regardless of armor type', async () => {
    const supabase = makeMockSupabase({
      loot_items: [item('neck', { item_slot: 'Neck', armor_type: null })],
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const result = (await fetchFilteredLootItems(supabase, mage(), ['tier-1'])) as Array<{ id: string }>
    expect(result).toHaveLength(1)
  })

  it('lets any class see a trinket', async () => {
    const supabase = makeMockSupabase({
      loot_items: [item('trink', { item_slot: 'Trinket', armor_type: null })],
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const result = (await fetchFilteredLootItems(supabase, druid(), ['tier-1'])) as Array<{ id: string }>
    expect(result).toHaveLength(1)
  })

  // ─── Weapon proficiency ────────────────────────────────────

  it('filters plate mail weapons a mage cannot equip', async () => {
    const supabase = makeMockSupabase({
      loot_items: [
        item('axe', {
          name: 'Two-Handed Axe',
          item_slot: 'Two-Hand',
          weapon_type: 'Two-Handed Axe',
        }),
        item('staff', {
          name: 'Staff of Power',
          item_slot: 'Two-Hand',
          weapon_type: 'Staff',
        }),
      ],
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const result = (await fetchFilteredLootItems(supabase, mage(), ['tier-1'])) as Array<{ id: string }>
    const ids = result.map((r) => r.id)
    // Mage cannot use Two-Handed Axe, can use Staff
    expect(ids).toContain('staff')
    expect(ids).not.toContain('axe')
  })

  // ─── Token eligibility ─────────────────────────────────────

  it('filters a token that is not for the character class', async () => {
    // Fallen Hero = Hunter/Mage/Warlock. A Warrior should not see it.
    const supabase = makeMockSupabase({
      loot_items: [
        item('tok-hero', {
          name: 'Helm of the Fallen Hero',
          item_slot: 'Token',
        }),
      ],
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const result = (await fetchFilteredLootItems(supabase, warrior(), ['tier-1'])) as Array<{ id: string }>
    expect(result).toEqual([])
  })

  it('keeps a token that matches the character class', async () => {
    // Fallen Defender = Warrior/Priest/Druid. A Warrior should see it.
    const supabase = makeMockSupabase({
      loot_items: [
        item('tok-def', {
          name: 'Chestguard of the Fallen Defender',
          item_slot: 'Token',
        }),
      ],
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const result = (await fetchFilteredLootItems(supabase, warrior(), ['tier-1'])) as Array<{ id: string }>
    expect(result).toHaveLength(1)
  })

  // ─── Bracket spec-type resolution ──────────────────────────

  it('marks item as unallocated when no loot_item_classes rows exist', async () => {
    const supabase = makeMockSupabase({
      loot_items: [item('x', { item_slot: 'Chest', armor_type: 'Plate' })],
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const result = (await fetchFilteredLootItems(supabase, warrior(), ['tier-1'])) as Array<{
      is_allocated: boolean
      has_primary_only: boolean
      character_spec_type: string | null
    }>
    expect(result[0].is_allocated).toBe(false)
    expect(result[0].has_primary_only).toBe(false)
    expect(result[0].character_spec_type).toBeNull()
  })

  it('resolves primary spec-type when the character spec is in loot_item_classes', async () => {
    const supabase = makeMockSupabase({
      loot_items: [
        item('x', {
          item_slot: 'Chest',
          armor_type: 'Plate',
          loot_item_classes: [
            { class_id: 'class-warrior', spec_id: 'spec-warrior-fury', spec_type: 'primary' },
          ],
        }),
      ],
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const result = (await fetchFilteredLootItems(supabase, warrior(), ['tier-1'])) as Array<{
      character_spec_type: string | null
      is_allocated: boolean
    }>
    expect(result[0].is_allocated).toBe(true)
    expect(result[0].character_spec_type).toBe('primary')
  })

  it('falls back to class-level assignment when the character spec has no specific row', async () => {
    // Item is assigned class-level (spec_id null) for Warrior as secondary.
    // A Fury warrior has no spec-specific row, so should see the class-level entry.
    const supabase = makeMockSupabase({
      loot_items: [
        item('x', {
          item_slot: 'Chest',
          armor_type: 'Plate',
          loot_item_classes: [
            { class_id: 'class-warrior', spec_id: null, spec_type: 'secondary' },
          ],
        }),
      ],
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const result = (await fetchFilteredLootItems(supabase, warrior(), ['tier-1'])) as Array<{
      character_spec_type: string | null
    }>
    expect(result[0].character_spec_type).toBe('secondary')
  })

  it('returns null spec-type when the character class is not in loot_item_classes', async () => {
    // Item is assigned to Druid only. A Warrior is not prio'd on this item.
    const supabase = makeMockSupabase({
      loot_items: [
        item('x', {
          item_slot: 'Chest',
          armor_type: 'Plate',
          loot_item_classes: [
            { class_id: 'class-druid', spec_id: 'spec-druid-feral', spec_type: 'primary' },
          ],
        }),
      ],
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const result = (await fetchFilteredLootItems(supabase, warrior(), ['tier-1'])) as Array<{
      character_spec_type: string | null
      is_allocated: boolean
    }>
    expect(result[0].is_allocated).toBe(true)
    expect(result[0].character_spec_type).toBeNull()
  })

  it('flags has_primary_only when there are primary assignments but no secondary', async () => {
    const supabase = makeMockSupabase({
      loot_items: [
        item('x', {
          item_slot: 'Chest',
          armor_type: 'Plate',
          loot_item_classes: [
            { class_id: 'class-warrior', spec_id: 'spec-warrior-fury', spec_type: 'primary' },
            { class_id: 'class-druid', spec_id: 'spec-druid-feral', spec_type: 'primary' },
          ],
        }),
      ],
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const result = (await fetchFilteredLootItems(supabase, warrior(), ['tier-1'])) as Array<{
      has_primary_only: boolean
    }>
    expect(result[0].has_primary_only).toBe(true)
  })

  it('clears has_primary_only when a secondary assignment exists', async () => {
    const supabase = makeMockSupabase({
      loot_items: [
        item('x', {
          item_slot: 'Chest',
          armor_type: 'Plate',
          loot_item_classes: [
            { class_id: 'class-warrior', spec_id: 'spec-warrior-fury', spec_type: 'primary' },
            { class_id: 'class-warrior', spec_id: 'spec-warrior-prot', spec_type: 'secondary' },
          ],
        }),
      ],
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const result = (await fetchFilteredLootItems(supabase, warrior(), ['tier-1'])) as Array<{
      has_primary_only: boolean
    }>
    expect(result[0].has_primary_only).toBe(false)
  })

  // ─── Enrichment ─────────────────────────────────────────────

  it('enriches class restrictions with class_name and spec_name from reference data', async () => {
    const supabase = makeMockSupabase({
      loot_items: [
        item('x', {
          item_slot: 'Chest',
          armor_type: 'Plate',
          loot_item_classes: [
            { class_id: 'class-warrior', spec_id: 'spec-warrior-fury', spec_type: 'primary' },
          ],
        }),
      ],
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const result = (await fetchFilteredLootItems(supabase, warrior(), ['tier-1'])) as Array<{
      loot_item_classes: Array<{ class_name: string | null; class_color: string | null; spec_name: string | null }>
    }>
    expect(result[0].loot_item_classes[0]).toMatchObject({
      class_name: 'Warrior',
      class_color: '#C79C6E',
      spec_name: 'Fury',
    })
  })

  it('flattens raid_tiers join into raid_tier_name', async () => {
    const supabase = makeMockSupabase({
      loot_items: [
        item('x', {
          item_slot: 'Chest',
          armor_type: 'Plate',
          raid_tiers: { name: 'Karazhan' },
        }),
      ],
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const result = (await fetchFilteredLootItems(supabase, warrior(), ['tier-1'])) as Array<{
      raid_tier_name: string | null
    }>
    expect(result[0].raid_tier_name).toBe('Karazhan')
  })

  it('handles raid_tiers returned as an array (legacy join shape)', async () => {
    // Supabase occasionally returns joined records as an array depending
    // on the FK relationship. The helper should handle both shapes.
    const supabase = makeMockSupabase({
      loot_items: [
        {
          ...item('x', { item_slot: 'Chest', armor_type: 'Plate' }),
          raid_tiers: [{ name: 'Black Temple' }],
        },
      ],
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const result = (await fetchFilteredLootItems(supabase, warrior(), ['tier-1'])) as Array<{
      raid_tier_name: string | null
    }>
    expect(result[0].raid_tier_name).toBe('Black Temple')
  })
})

// ─── resolveTierIdsForPhases ────────────────────────────────────

describe('resolveTierIdsForPhases', () => {
  it('returns tier ids for matching active phases', async () => {
    const supabase = makeMockSupabase({
      raid_tiers: [
        { id: 'tier-1', expansion_id: 'exp-1', phase: 1, is_guild_active: true },
        { id: 'tier-2', expansion_id: 'exp-1', phase: 2, is_guild_active: true },
        { id: 'tier-3', expansion_id: 'exp-1', phase: 3, is_guild_active: true },
      ],
    })
    const result = await resolveTierIdsForPhases(supabase, 'exp-1', [1, 2])
    expect(result).toEqual(['tier-1', 'tier-2'])
  })

  it('skips tiers from other expansions', async () => {
    const supabase = makeMockSupabase({
      raid_tiers: [
        { id: 'tier-a', expansion_id: 'exp-1', phase: 1, is_guild_active: true },
        { id: 'tier-b', expansion_id: 'exp-2', phase: 1, is_guild_active: true },
      ],
    })
    const result = await resolveTierIdsForPhases(supabase, 'exp-1', [1])
    expect(result).toEqual(['tier-a'])
  })

  it('skips inactive tiers', async () => {
    const supabase = makeMockSupabase({
      raid_tiers: [
        { id: 'tier-a', expansion_id: 'exp-1', phase: 1, is_guild_active: true },
        { id: 'tier-b', expansion_id: 'exp-1', phase: 1, is_guild_active: false },
      ],
    })
    const result = await resolveTierIdsForPhases(supabase, 'exp-1', [1])
    expect(result).toEqual(['tier-a'])
  })

  it('returns null for out-of-range phases', async () => {
    const supabase = makeMockSupabase({ raid_tiers: [] })
    const result = await resolveTierIdsForPhases(supabase, 'exp-1', [0, 99])
    expect(result).toBeNull()
  })

  it('returns [] when no tiers match the phases', async () => {
    const supabase = makeMockSupabase({
      raid_tiers: [{ id: 'tier-a', expansion_id: 'exp-1', phase: 5, is_guild_active: true }],
    })
    const result = await resolveTierIdsForPhases(supabase, 'exp-1', [1, 2])
    expect(result).toEqual([])
  })
})
