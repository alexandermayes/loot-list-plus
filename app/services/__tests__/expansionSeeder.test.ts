import { describe, it, expect } from 'vitest'
import {
  SUPPORTED_EXPANSIONS,
  isSupportedExpansion,
  getAvailableExpansions,
  seedExpansionForGuild,
  getExpansionDefinition,
  getExpansionGame,
  gameMismatchError,
} from '../expansionSeeder'
import { EXPANSION_GAMES } from '@/domain/expansion/game'
import { getRaidPhase, getExpansionSlug } from '@/data/expansion-phases'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any

interface RecordedCall {
  table: string
  method: 'select' | 'eq' | 'insert' | 'update'
  args: unknown[]
}

/**
 * A small recording Supabase mock. from(table) returns a fresh chainable
 * builder whose select/eq/insert/update record their arguments and return
 * the builder. single() resolves per scenario: for 'expansions', the
 * duplicate-check select resolves not-found by default (or a duplicate row
 * when duplicateExists is set), while the insert chain always resolves a
 * fresh expansion row -- the two are distinguished by whether insert() was
 * called on that specific builder instance. The builder is also thenable so
 * plain awaited update().eq() chains settle without a .single() call.
 *
 * An awaited raid_tiers chain that never called insert() is the catalog sync's
 * existing-tiers read: it resolves no rows, or { error } when
 * raidTiersReadError is set.
 */
function createMockSupabase(
  options: { duplicateExists?: boolean; raidTiersReadError?: string } = {}
) {
  const fromCalls: string[] = []
  const calls: RecordedCall[] = []

  function buildBuilder(table: string) {
    let insertCalled = false

    const builder = {
      select(...args: unknown[]) {
        calls.push({ table, method: 'select', args })
        return builder
      },
      eq(...args: unknown[]) {
        calls.push({ table, method: 'eq', args })
        return builder
      },
      insert(...args: unknown[]) {
        calls.push({ table, method: 'insert', args })
        insertCalled = true
        return builder
      },
      update(...args: unknown[]) {
        calls.push({ table, method: 'update', args })
        return builder
      },
      single() {
        if (table === 'expansions') {
          if (insertCalled) {
            return Promise.resolve({ data: { id: 'exp-1' }, error: null })
          }
          return options.duplicateExists
            ? Promise.resolve({ data: { id: 'existing-id' }, error: null })
            : Promise.resolve({ data: null, error: { code: 'PGRST116' } })
        }
        return Promise.resolve({ data: null, error: null })
      },
      // Thenable so `await builder.update(...).eq(...)` settles without single().
      then(
        onFulfilled?: (value: { data: unknown; error: unknown }) => unknown,
        onRejected?: (reason: unknown) => unknown
      ) {
        let result: { data: unknown; error: unknown } = { data: null, error: null }
        if (table === 'raid_tiers' && !insertCalled) {
          result = options.raidTiersReadError
            ? { data: null, error: { message: options.raidTiersReadError } }
            : { data: [], error: null }
        }
        return Promise.resolve(result).then(onFulfilled, onRejected)
      },
    }

    return builder
  }

  const supabase: AnySupabase = {
    from(table: string) {
      fromCalls.push(table)
      return buildBuilder(table)
    },
  }

  return { supabase, fromCalls, calls }
}

describe('SUPPORTED_EXPANSIONS', () => {
  it('lists expansions with data, in registry order, ending with Forever', () => {
    expect(SUPPORTED_EXPANSIONS).toEqual([
      'Classic',
      'The Burning Crusade',
      'Wrath of the Lich King',
      'Cataclysm',
      'Mists of Pandaria',
      'Forever',
    ])
  })
})

describe('isSupportedExpansion', () => {
  it('is true for Forever and Classic', () => {
    expect(isSupportedExpansion('Forever')).toBe(true)
    expect(isSupportedExpansion('Classic')).toBe(true)
  })

  it('is false for a null-data retail expansion (Legion)', () => {
    expect(isSupportedExpansion('Legion')).toBe(false)
  })

  it('is case-sensitive (lowercase forever is rejected)', () => {
    expect(isSupportedExpansion('forever')).toBe(false)
  })

  it('rejects prototype-pollution-style names', () => {
    expect(isSupportedExpansion('constructor')).toBe(false)
    expect(isSupportedExpansion('__proto__')).toBe(false)
    expect(isSupportedExpansion('toString')).toBe(false)
  })

  it('rejects empty string, undefined and non-string input', () => {
    expect(isSupportedExpansion('')).toBe(false)
    expect(isSupportedExpansion(undefined)).toBe(false)
    expect(isSupportedExpansion(42)).toBe(false)
  })
})

describe('EXPANSION_GAMES registry consistency', () => {
  it('has a key set equal to SUPPORTED_EXPANSIONS', () => {
    expect(new Set(Object.keys(EXPANSION_GAMES))).toEqual(new Set(SUPPORTED_EXPANSIONS))
  })

  it('agrees with each ExpansionDefinition.game for every supported expansion', () => {
    for (const name of SUPPORTED_EXPANSIONS) {
      const definition = getExpansionDefinition(name)
      expect(definition).not.toBeNull()
      expect(definition?.game).toBe(getExpansionGame(name))
    }
  })
})

describe('gameMismatchError', () => {
  it('names the display name and the game-version sentence', () => {
    expect(gameMismatchError('Forever')).toBe(
      "WoW Forever isn't available for this guild's game version."
    )
    expect(gameMismatchError('The Burning Crusade')).toBe(
      "The Burning Crusade isn't available for this guild's game version."
    )
  })
})

describe('getAvailableExpansions', () => {
  it('lists Forever with hasData true, and still lists null-data retail expansions with hasData false', () => {
    const available = getAvailableExpansions()
    expect(available).toContainEqual({ name: 'Forever', hasData: true })
    expect(available).toContainEqual({ name: 'Warlords of Draenor', hasData: false })
    expect(available).toContainEqual({ name: 'Legion', hasData: false })
  })
})

describe('seedExpansionForGuild', () => {
  it('seeds Forever with its three manifest raid tiers in one insert and no loot rows', async () => {
    const { supabase, fromCalls, calls } = createMockSupabase()

    const result = await seedExpansionForGuild(supabase, 'g1', 'Forever', true, true)

    expect(result).toEqual({ expansionId: 'exp-1' })
    expect(result.error).toBeUndefined()

    // D-01: bosses stay manifest-only, so no catalog tables are touched.
    expect(fromCalls).not.toContain('loot_items')
    expect(fromCalls).not.toContain('loot_item_classes')
    expect(fromCalls).not.toContain('wow_classes')

    const insertCall = calls.find(c => c.table === 'expansions' && c.method === 'insert')
    expect(insertCall).toBeDefined()
    expect(insertCall?.args[0]).toMatchObject({ name: 'Forever', current_phase: 1 })

    const tierCalls = calls.filter(c => c.table === 'raid_tiers')
    expect(tierCalls.filter(c => c.method === 'select')).toEqual([
      { table: 'raid_tiers', method: 'select', args: ['id, name'] },
    ])
    expect(tierCalls.filter(c => c.method === 'eq')).toEqual([
      { table: 'raid_tiers', method: 'eq', args: ['expansion_id', 'exp-1'] },
    ])
    expect(tierCalls.filter(c => c.method === 'update')).toEqual([])

    const tierInserts = tierCalls.filter(c => c.method === 'insert')
    expect(tierInserts).toHaveLength(1)
    expect(tierInserts[0].args).toEqual([
      [
        {
          expansion_id: 'exp-1',
          name: 'Barrow Deeps',
          is_active: true,
          is_guild_active: true,
          master_sheet_visible: true,
          phase: 1,
          sort_order: 1,
        },
        {
          expansion_id: 'exp-1',
          name: 'Hyjal Summit',
          is_active: false,
          is_guild_active: true,
          master_sheet_visible: true,
          phase: 1,
          sort_order: 2,
        },
        {
          expansion_id: 'exp-1',
          name: "Onyxia's Lair",
          is_active: false,
          is_guild_active: true,
          master_sheet_visible: true,
          phase: 1,
          sort_order: 3,
        },
      ],
    ])
  })

  it('returns the existing generic error and inserts no tiers when the raid_tiers read fails', async () => {
    const { supabase, calls } = createMockSupabase({ raidTiersReadError: 'boom' })

    const result = await seedExpansionForGuild(supabase, 'g1', 'Forever', true, true)

    expect(result).toEqual({
      expansionId: '',
      error: 'Something went wrong while setting up the expansion',
    })
    expect(calls.filter(c => c.table === 'raid_tiers' && c.method === 'insert')).toEqual([])
  })

  it('rejects an unsupported expansion (Legion) with the registry-derived CP-09 message', async () => {
    const { supabase, fromCalls } = createMockSupabase()

    const result = await seedExpansionForGuild(supabase, 'g1', 'Legion', true, true)

    expect(result.expansionId).toBe('')
    expect(result.error).toBe(
      'No data available for Legion yet. Currently supported: Classic, The Burning Crusade, ' +
        'Wrath of the Lich King, Cataclysm, Mists of Pandaria, and WoW Forever. Please select ' +
        'one of these or wait for other expansion data to be added.'
    )
    expect(result.error).not.toMatch(/—/)
    expect(fromCalls).toEqual([])
  })

  it('rejects a prototype-pollution name (constructor) without ever calling from()', async () => {
    const { supabase, fromCalls } = createMockSupabase()

    const result = await seedExpansionForGuild(supabase, 'g1', 'constructor', true, true)

    expect(result.expansionId).toBe('')
    expect(result.error).toBeDefined()
    expect(fromCalls).toEqual([])
  })

  it('returns the CP-08 duplicate message when the guild already has Forever', async () => {
    const { supabase } = createMockSupabase({ duplicateExists: true })

    const result = await seedExpansionForGuild(supabase, 'g1', 'Forever', true, true)

    expect(result.expansionId).toBe('')
    expect(result.error).toBe(
      'Guild already has WoW Forever. Each expansion can only be added once per guild.'
    )
  })
})

describe('getRaidPhase', () => {
  it('resolves Forever raids by exact name and still resolves the legacy Classic names', () => {
    expect(getRaidPhase('forever', 'Barrow Deeps')).toBe(1)
    expect(getRaidPhase('forever', 'Hyjal Summit')).toBe(1)
    expect(getRaidPhase('forever', "Onyxia's Lair")).toBe(1)
    expect(getRaidPhase('forever', 'Molten Core')).toBeNull()
    expect(getRaidPhase('classic', "Onyxia's Lair")).toBe(1)
    expect(getRaidPhase('missing-slug', 'Barrow Deeps')).toBeNull()
  })

  it('keeps Forever out of the name-to-slug map the public reserve-run route keys off', () => {
    expect(getExpansionSlug('Forever')).toBeNull()
  })
})
