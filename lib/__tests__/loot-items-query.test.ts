import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fetchFilteredLootItems,
  resolveTierIdsForPhases,
  type LootItemCharacter,
} from '../loot-items-query'
import { classicRaids } from '@/data/classic-wow-raids'
import { tbcRaids } from '@/data/tbc-raids'
import { wrathRaids } from '@/data/wrath-raids'
import { Items } from 'wow-classic-items'
import { ARMOR_SLOTS } from '@/data/item-types'
import { uniqueArmorSlotPieces } from '@/data/__tests__/fixtures/package-item-types'
import { classLockedCatalogItems, packageClasses } from '@/data/__tests__/fixtures/package-item-classes'

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

// ─── GH-284: Classic raid recipes visible to every class ───────

// Built from the real catalog, not hard-coded, so a future recipe added to
// or removed from data/classic-wow-raids.ts is reflected here automatically.
// A unique id per raid (raid name plus wowhead id) is required because 7
// formulas are listed under both Ruins of Ahn'Qiraj and Temple of Ahn'Qiraj.
const gh284RecipeRows = classicRaids.flatMap((raid) =>
  raid.bosses.flatMap((boss) =>
    boss.items
      .filter((raidItem) => raidItem.slot === 'Recipe')
      .map((raidItem) =>
        item(`${raid.name}-${raidItem.wowhead_id}`, {
          name: raidItem.name,
          item_slot: 'Recipe',
          wowhead_id: raidItem.wowhead_id,
          armor_type: null,
          weapon_type: null,
          classification: 'Unlimited',
          allocation_cost: 0,
        })
      )
  )
)

const CLASSIC_CLASSES = [
  'Warrior', 'Paladin', 'Hunter', 'Rogue', 'Priest', 'Shaman', 'Mage', 'Warlock', 'Druid',
] as const

const WRATH_CLASSES = [...CLASSIC_CLASSES, 'Death Knight'] as const

describe('GH-284: Classic raid recipes visible to every class', () => {
  it('the catalog has exactly 28 Classic raid recipe rows', () => {
    // Guards against an empty or partial catalog passing the class checks
    // below silently (an empty list would "match" for every class).
    expect(gh284RecipeRows).toHaveLength(28)
  })

  it.each(CLASSIC_CLASSES)('lists every Classic raid recipe for %s', async (className) => {
    // The Mage run also carries a Plate control row: if the picker ever
    // stopped filtering by armor proficiency, this row would leak through
    // and the test would catch it, proving the assertion below can fail.
    const controlRow = item('plate-control', {
      name: 'Plate Control Chestpiece',
      item_slot: 'Chest',
      armor_type: 'Plate',
    })
    const rows = className === 'Mage' ? [...gh284RecipeRows, controlRow] : gh284RecipeRows

    const supabase = makeMockSupabase({
      loot_items: rows,
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const character = warrior({ class_name: className, class_id: `class-${className.toLowerCase()}` })
    const result = (await fetchFilteredLootItems(supabase, character, ['tier-1'])) as Array<{ id: string }>
    const ids = result.map((r) => r.id).sort()

    expect(ids).toEqual(gh284RecipeRows.map((r) => r.id).sort())
    if (className === 'Mage') {
      expect(ids).not.toContain('plate-control')
    }
  })
})

// ─── GH-276: class-locked items show only to the classes that can use them ──

// Classic set pieces and other class-locked drops pass the armor rule because
// canWearArmorType allows lighter armor, so Arcanist cloth showed to every
// class (GH #276). Rows carry no armor or weapon type, the shape the seeder
// stores, so the picker's fallback path is exercised. Expectations for the
// sweep come from the package via the fixture, not from the generated map.
describe('GH-276: class-locked items show only to the classes that can use them', () => {
  const classIdFor = (className: string) => `class-${className.toLowerCase().replace(/ /g, '-')}`

  async function visibleIdsFor(rows: ReturnType<typeof item>[], className: string): Promise<string[]> {
    const supabase = makeMockSupabase({
      loot_items: rows,
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const character = warrior({ class_name: className, class_id: classIdFor(className) })
    const result = (await fetchFilteredLootItems(supabase, character, ['tier-1'])) as Array<{ id: string }>
    return result.map((r) => r.id).sort()
  }

  const arcanistRows = [
    { wowhead_id: 16795, name: 'Arcanist Crown', slot: 'Head' },
    { wowhead_id: 16796, name: 'Arcanist Leggings', slot: 'Legs' },
    { wowhead_id: 16797, name: 'Arcanist Mantle', slot: 'Shoulder' },
    { wowhead_id: 16798, name: 'Arcanist Robes', slot: 'Chest' },
    { wowhead_id: 16799, name: 'Arcanist Bindings', slot: 'Wrist' },
    { wowhead_id: 16800, name: 'Arcanist Boots', slot: 'Feet' },
    { wowhead_id: 16801, name: 'Arcanist Gloves', slot: 'Hands' },
    { wowhead_id: 16802, name: 'Arcanist Belt', slot: 'Waist' },
  ].map((piece) =>
    item(`mc-${piece.wowhead_id}`, {
      name: piece.name,
      item_slot: piece.slot,
      wowhead_id: piece.wowhead_id,
      armor_type: null,
      weapon_type: null,
    })
  )

  it.each(CLASSIC_CLASSES)('a Mage sees all eight Arcanist pieces and no other Classic class sees any: %s', async (className) => {
    const ids = await visibleIdsFor(arcanistRows, className)
    expect(ids).toEqual(className === 'Mage' ? arcanistRows.map((r) => r.id).sort() : [])
  })

  it.each(CLASSIC_CLASSES)('Gloves of the Redeemed Prophecy (21889, Hands) shows to a Paladin and not to a Warrior: %s', async (className) => {
    const row = item('aq40-21889', {
      name: 'Gloves of the Redeemed Prophecy',
      item_slot: 'Hands',
      wowhead_id: 21889,
      armor_type: null,
      weapon_type: null,
    })
    const ids = await visibleIdsFor([row], className)
    expect(ids).toEqual(className === 'Paladin' ? ['aq40-21889'] : [])
  })

  // These sit in slots isClassAgnosticSlot returns early for, so the class
  // check has to run before that early return (OD-5).
  it.each([
    { wowhead_id: 19339, name: 'Mind Quickening Gem', slot: 'Trinket', owner: 'Mage' },
    { wowhead_id: 18646, name: 'The Eye of Divinity', slot: 'Quest', owner: 'Priest' },
    { wowhead_id: 23059, name: 'Ring of the Dreadnaught', slot: 'Finger', owner: 'Warrior' },
  ])('$name ($wowhead_id, $slot) is locked to $owner even though the slot is class-agnostic', async ({ wowhead_id, name, slot, owner }) => {
    const row = item(`locked-${wowhead_id}`, { name, item_slot: slot, wowhead_id, armor_type: null, weapon_type: null })
    for (const className of CLASSIC_CLASSES) {
      const ids = await visibleIdsFor([row], className)
      expect(ids, `${className} / ${name}`).toEqual(className === owner ? [`locked-${wowhead_id}`] : [])
    }
  })

  it('an item with no Classes line keeps the armor rule', async () => {
    // Mish'undare is cloth with no class line: canWearArmorType allows
    // lighter armor, so every class sees it, exactly as before #276. The
    // Onslaught Girdle (plate, no class line) stays hidden from a Mage,
    // proving the armor check is intact and that the sweep below can fail.
    const mishundare = item('bwl-19375', {
      name: "Mish'undare, Circlet of the Mind Flayer",
      item_slot: 'Head',
      wowhead_id: 19375,
      armor_type: null,
      weapon_type: null,
    })
    const girdle = item('mc-19137', {
      name: 'Onslaught Girdle',
      item_slot: 'Waist',
      wowhead_id: 19137,
      armor_type: null,
      weapon_type: null,
    })
    for (const className of CLASSIC_CLASSES) {
      expect(await visibleIdsFor([mishundare], className), className).toEqual(['bwl-19375'])
    }
    expect(await visibleIdsFor([girdle], 'Warrior')).toEqual(['mc-19137'])
    expect(await visibleIdsFor([girdle], 'Mage')).toEqual([])
  })

  it.each(CLASSIC_CLASSES)('a Recipe with a Classes line still shows to every class (GH-284 D-03, OD-4): %s', async (className) => {
    // Pattern: Core Felcloth Bag carries "Classes: Warlock" in the package;
    // recipes stay visible to every class, so the map has no Recipe ids.
    const row = item('mc-21371', {
      name: 'Pattern: Core Felcloth Bag',
      item_slot: 'Recipe',
      wowhead_id: 21371,
      armor_type: null,
      weapon_type: null,
      classification: 'Unlimited',
      allocation_cost: 0,
    })
    expect(await visibleIdsFor([row], className)).toEqual(['mc-21371'])
  })

  describe.each([
    { expansion: 'Classic', raids: classicRaids, classes: CLASSIC_CLASSES, count: 174 },
    { expansion: 'TBC', raids: tbcRaids, classes: CLASSIC_CLASSES, count: 13 },
    { expansion: 'Wrath', raids: wrathRaids, classes: WRATH_CLASSES, count: 20 },
  ])('every class-locked $expansion catalog item shows to exactly the classes on its package Classes line', ({ expansion, raids, classes, count }) => {
    const locked = classLockedCatalogItems(raids)
    const rows = locked.map((lockedItem) =>
      item(`${expansion.toLowerCase()}-${lockedItem.wowhead_id}`, {
        name: lockedItem.name,
        item_slot: lockedItem.slot,
        wowhead_id: lockedItem.wowhead_id,
        armor_type: null,
        weapon_type: null,
      })
    )

    it(`has exactly ${count} class-locked ${expansion} catalog items`, () => {
      expect(locked).toHaveLength(count)
    })

    it.each(classes)('shows %s exactly the items whose Classes line names them', async (className) => {
      const expectedIds = locked
        .filter((lockedItem) => lockedItem.classes.includes(className))
        .map((lockedItem) => `${expansion.toLowerCase()}-${lockedItem.wowhead_id}`)
        .sort()
      expect(await visibleIdsFor(rows, className)).toEqual(expectedIds)
    })
  })
})

// ─── GH-388 / GH-276: Dragonstalker's Greaves shows to Hunters only ──────

// The seeder stores no armor type, so the picker falls back to ITEM_TYPES and
// then to a guess from the name; "greaves" was read as plate, hiding the
// piece from Hunters and Shamans (GH #388). The Greaves are Hunter Tier 2
// and carry "Classes: Hunter" in the package, so #276 narrows the mail rule
// to Hunters: Warriors, Paladins and Shamans can wear mail but not this piece.
describe('GH-388 / GH-276: Dragonstalker\'s Greaves shows to Hunters only', () => {
  const bwlGreavesRow = classicRaids
    .find((raid) => raid.name === 'Blackwing Lair')
    ?.bosses.find((boss) => boss.name === 'Broodlord Lashlayer')
    ?.items.find((raidItem) => raidItem.wowhead_id === 16941)

  it('the catalog has Dragonstalker\'s Greaves at wowhead_id 16941, slot Feet, under Blackwing Lair / Broodlord Lashlayer', () => {
    expect(bwlGreavesRow).toBeDefined()
    expect(bwlGreavesRow?.name).toBe("Dragonstalker's Greaves")
    expect(bwlGreavesRow?.slot).toBe('Feet')
  })

  const GH388_CLASS_EXPECTATIONS: Array<{ className: string; visible: boolean }> = [
    { className: 'Warrior', visible: false },
    { className: 'Paladin', visible: false },
    { className: 'Hunter', visible: true },
    { className: 'Shaman', visible: false },
    { className: 'Rogue', visible: false },
    { className: 'Druid', visible: false },
    { className: 'Priest', visible: false },
    { className: 'Mage', visible: false },
    { className: 'Warlock', visible: false },
  ]

  it.each(GH388_CLASS_EXPECTATIONS)(
    'with no stored armor or weapon type, $className sees Dragonstalker\'s Greaves: $visible',
    async ({ className, visible }) => {
      const row = item('bwl-16941', {
        name: "Dragonstalker's Greaves",
        item_slot: 'Feet',
        wowhead_id: 16941,
        armor_type: null,
        weapon_type: null,
      })
      const supabase = makeMockSupabase({
        loot_items: [row],
        wow_classes: allClasses,
        class_specs: allSpecs,
      })
      const character = warrior({ class_name: className, class_id: `class-${className.toLowerCase()}` })
      const result = (await fetchFilteredLootItems(supabase, character, ['tier-1'])) as Array<{ id: string }>
      const ids = result.map((r) => r.id)
      if (visible) {
        expect(ids).toContain('bwl-16941')
      } else {
        expect(ids).not.toContain('bwl-16941')
      }
    },
  )
})

// ─── GH-388: every Classic raid armor piece shows to exactly the classes ──
// ─── that can wear it ──────────────────────────────────────────────────

describe('GH-388: every Classic raid armor piece shows to exactly the classes that can wear it', () => {
  const packageItems388 = [...new Items({ iconSrc: false })]
  const packageById388 = new Map(packageItems388.map((pkgItem) => [pkgItem.itemId, pkgItem]))

  const classicArmorPieces = (() => {
    const seen = new Set<number>()
    const pieces: Array<{ raid: string; boss: string; name: string; slot: string; wowhead_id: number }> = []
    for (const raid of classicRaids) {
      for (const boss of raid.bosses) {
        for (const raidItem of boss.items) {
          if (!(ARMOR_SLOTS as readonly string[]).includes(raidItem.slot)) continue
          if (seen.has(raidItem.wowhead_id)) continue
          seen.add(raidItem.wowhead_id)
          pieces.push({ raid: raid.name, boss: boss.name, ...raidItem })
        }
      }
    }
    return pieces
  })()

  // Armor hierarchy and per-class max, kept local and independent of
  // data/class-proficiencies.ts so this test does not share a bug with the
  // code it is checking.
  const ARMOR_ORDER = ['Cloth', 'Leather', 'Mail', 'Plate'] as const
  const CLASS_MAX_ARMOR: Record<string, (typeof ARMOR_ORDER)[number]> = {
    Warrior: 'Plate',
    Paladin: 'Plate',
    Hunter: 'Mail',
    Shaman: 'Mail',
    Rogue: 'Leather',
    Druid: 'Leather',
    Priest: 'Cloth',
    Mage: 'Cloth',
    Warlock: 'Cloth',
  }

  it('the catalog has exactly 341 unique Classic raid armor pieces', () => {
    expect(classicArmorPieces).toHaveLength(341)
  })

  it.each(CLASSIC_CLASSES)('shows %s exactly the pieces whose package armor type is not heavier than their heaviest armor', async (className) => {
    const rows = classicArmorPieces.map((piece) =>
      item(`classic-${piece.wowhead_id}`, {
        name: piece.name,
        item_slot: piece.slot,
        wowhead_id: piece.wowhead_id,
        armor_type: null,
        weapon_type: null,
      })
    )
    const supabase = makeMockSupabase({
      loot_items: rows,
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const character = warrior({ class_name: className, class_id: `class-${className.toLowerCase()}` })
    const result = (await fetchFilteredLootItems(supabase, character, ['tier-1'])) as Array<{ id: string }>
    const visibleIds = result.map((r) => r.id).sort()

    const maxIndex = ARMOR_ORDER.indexOf(CLASS_MAX_ARMOR[className])
    const expectedIds = classicArmorPieces
      .filter((piece) => {
        const pkgItem = packageById388.get(piece.wowhead_id)
        const armorType = pkgItem?.class === 'Armor' ? pkgItem.subclass : undefined
        const armorIndex = ARMOR_ORDER.indexOf(armorType as (typeof ARMOR_ORDER)[number])
        const armorAllowed = armorIndex !== -1 && armorIndex <= maxIndex
        // #276: a class lock narrows the armor rule
        const locked = pkgItem ? packageClasses(pkgItem) : null
        return armorAllowed && (locked === null || locked.includes(className))
      })
      .map((piece) => `classic-${piece.wowhead_id}`)
      .sort()

    expect(visibleIds).toEqual(expectedIds)
  })
})

// ─── GH-388 (Wrath): Inexorable Sabatons shows only to classes that can ──
// ─── wear plate ─────────────────────────────────────────────────────────

// The seeder stores no armor type and no Wrath item had an ITEM_TYPES entry,
// so the picker guessed from the name; since GH #388 narrowed the plate
// rule, "sabatons" no longer reads as plate and this plate piece showed to
// every class.
describe('GH-388 (Wrath): Inexorable Sabatons shows only to classes that can wear plate', () => {
  const sabatonsRow = wrathRaids
    .find((raid) => raid.name === 'Naxxramas (Wrath)')
    ?.bosses.find((boss) => boss.name === "Anub'Rekhan")
    ?.items.find((raidItem) => raidItem.wowhead_id === 39717)

  it("the catalog has Inexorable Sabatons at wowhead_id 39717, slot Feet, under Naxxramas (Wrath) / Anub'Rekhan", () => {
    expect(sabatonsRow).toBeDefined()
    expect(sabatonsRow?.name).toBe('Inexorable Sabatons')
    expect(sabatonsRow?.slot).toBe('Feet')
  })

  const GH388_WRATH_CLASS_EXPECTATIONS: Array<{ className: string; visible: boolean }> = [
    { className: 'Warrior', visible: true },
    { className: 'Paladin', visible: true },
    { className: 'Death Knight', visible: true },
    { className: 'Hunter', visible: false },
    { className: 'Shaman', visible: false },
    { className: 'Rogue', visible: false },
    { className: 'Druid', visible: false },
    { className: 'Priest', visible: false },
    { className: 'Mage', visible: false },
    { className: 'Warlock', visible: false },
  ]

  it.each(GH388_WRATH_CLASS_EXPECTATIONS)(
    'with no stored armor or weapon type, $className sees Inexorable Sabatons: $visible',
    async ({ className, visible }) => {
      const row = item('wrath-39717', {
        name: 'Inexorable Sabatons',
        item_slot: 'Feet',
        wowhead_id: 39717,
        armor_type: null,
        weapon_type: null,
      })
      const supabase = makeMockSupabase({
        loot_items: [row],
        wow_classes: allClasses,
        class_specs: allSpecs,
      })
      const character = warrior({
        class_name: className,
        class_id: `class-${className.toLowerCase().replace(/ /g, '-')}`,
      })
      const result = (await fetchFilteredLootItems(supabase, character, ['tier-1'])) as Array<{ id: string }>
      const ids = result.map((r) => r.id)
      if (visible) {
        expect(ids).toContain('wrath-39717')
      } else {
        expect(ids).not.toContain('wrath-39717')
      }
    },
  )
})

// ─── GH-388: every TBC and Wrath raid armor piece shows to exactly the ──
// ─── classes that can wear it ───────────────────────────────────────────

describe.each([
  { expansion: 'TBC', raids: tbcRaids, classes: CLASSIC_CLASSES, pieceCount: 328 },
  { expansion: 'Wrath', raids: wrathRaids, classes: WRATH_CLASSES, pieceCount: 664 },
])('GH-388: every $expansion raid armor piece shows to exactly the classes that can wear it', ({ expansion, raids, classes, pieceCount }) => {
  const packageItems = [...new Items({ iconSrc: false })]
  const packageById = new Map(packageItems.map((pkgItem) => [pkgItem.itemId, pkgItem]))

  const ARMOR_ORDER = ['Cloth', 'Leather', 'Mail', 'Plate'] as const
  const CLASS_MAX_ARMOR: Record<string, (typeof ARMOR_ORDER)[number]> = {
    Warrior: 'Plate',
    Paladin: 'Plate',
    'Death Knight': 'Plate',
    Hunter: 'Mail',
    Shaman: 'Mail',
    Rogue: 'Leather',
    Druid: 'Leather',
    Priest: 'Cloth',
    Mage: 'Cloth',
    Warlock: 'Cloth',
  }

  const pieces = uniqueArmorSlotPieces(raids).filter((piece) => {
    const pkgItem = packageById.get(piece.wowhead_id)
    return pkgItem?.class === 'Armor' && (ARMOR_ORDER as readonly string[]).includes(pkgItem.subclass)
  })

  it(`has exactly ${pieceCount} ${expansion} raid armor pieces with a package armor type`, () => {
    expect(pieces).toHaveLength(pieceCount)
  })

  it.each(classes)('shows %s exactly the pieces whose package armor type is not heavier than their heaviest armor', async (className) => {
    const rows = pieces.map((piece) =>
      item(`${expansion.toLowerCase()}-${piece.wowhead_id}`, {
        name: piece.name,
        item_slot: piece.slot,
        wowhead_id: piece.wowhead_id,
        armor_type: null,
        weapon_type: null,
      })
    )
    const supabase = makeMockSupabase({
      loot_items: rows,
      wow_classes: allClasses,
      class_specs: allSpecs,
    })
    const character = warrior({
      class_name: className,
      class_id: `class-${className.toLowerCase().replace(/ /g, '-')}`,
    })
    const result = (await fetchFilteredLootItems(supabase, character, ['tier-1'])) as Array<{ id: string }>
    const visibleIds = result.map((r) => r.id).sort()

    const maxIndex = ARMOR_ORDER.indexOf(CLASS_MAX_ARMOR[className])
    const expectedIds = pieces
      .filter((piece) => {
        const pkgItem = packageById.get(piece.wowhead_id)
        const armorType = pkgItem?.class === 'Armor' ? pkgItem.subclass : undefined
        const armorIndex = ARMOR_ORDER.indexOf(armorType as (typeof ARMOR_ORDER)[number])
        const armorAllowed = armorIndex !== -1 && armorIndex <= maxIndex
        // #276: a class lock narrows the armor rule
        const locked = pkgItem ? packageClasses(pkgItem) : null
        return armorAllowed && (locked === null || locked.includes(className))
      })
      .map((piece) => `${expansion.toLowerCase()}-${piece.wowhead_id}`)
      .sort()

    expect(visibleIds).toEqual(expectedIds)
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
