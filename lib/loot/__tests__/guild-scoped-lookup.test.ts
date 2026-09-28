// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { resolveGuildLootItem, findGuildLootItemsByWowheadIds, resolveGuildLootItemIds } from '../guild-scoped-lookup'

type ExpansionRow = { id: string; guild_id: string }
type TierRow = { id: string; expansion_id: string }
type ItemRow = { id: string; name: string; raid_tier_id: string; wowhead_id: number }
type Call = { table: string; filters: Array<[string, unknown]> }

interface Fixture {
  expansions: ExpansionRow[]
  tiers: TierRow[]
  items: ItemRow[]
  activeExpansionId?: string | null
  errorOn?: 'expansions' | 'raid_tiers' | 'guilds' | 'loot_items'
}

/**
 * Recording fake matching the real (post-review) query sequence: plain
 * single-column `.eq`/`.in` filters against `expansions`, `raid_tiers`,
 * `guilds`, and `loot_items` in turn — no nested embed. Every call is
 * recorded so the guild scope is asserted on the actual filter values
 * flowing through each step, not just the final rows.
 */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const call: Call = { table, filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        single: () => {
          if (table !== 'guilds') return Promise.resolve({ data: null, error: null })
          if (fixture.errorOn === 'guilds') {
            return Promise.resolve({ data: null, error: { message: 'guilds boom' } })
          }
          return Promise.resolve({ data: { active_expansion_id: fixture.activeExpansionId ?? null }, error: null })
        },
        then: (resolve: (v: unknown) => unknown) => {
          if (table === 'expansions') {
            if (fixture.errorOn === 'expansions') {
              return Promise.resolve({ data: null, error: { message: 'expansions boom' } }).then(resolve)
            }
            const guildIdFilter = call.filters.find(([col]) => col === 'guild_id')?.[1]
            const rows = fixture.expansions.filter(e => e.guild_id === guildIdFilter)
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          if (table === 'raid_tiers') {
            if (fixture.errorOn === 'raid_tiers') {
              return Promise.resolve({ data: null, error: { message: 'raid_tiers boom' } }).then(resolve)
            }
            const expansionIdsFilter = call.filters.find(([col]) => col === 'expansion_id')?.[1] as string[] | undefined
            const rows = fixture.tiers.filter(t => (expansionIdsFilter ?? []).includes(t.expansion_id))
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          if (table === 'loot_items') {
            if (fixture.errorOn === 'loot_items') {
              return Promise.resolve({ data: null, error: { message: 'loot_items boom' } }).then(resolve)
            }
            const tierIdsFilter = call.filters.find(([col]) => col === 'raid_tier_id')?.[1] as string[] | undefined
            const wowheadFilter = call.filters.find(([col]) => col === 'wowhead_id')
            const idFilter = call.filters.find(([col]) => col === 'id')
            const rows = fixture.items.filter(item => {
              const tierOk = (tierIdsFilter ?? []).includes(item.raid_tier_id)
              if (!tierOk) return false
              if (wowheadFilter) {
                const [, val] = wowheadFilter
                const idOk = Array.isArray(val) ? val.includes(item.wowhead_id) : item.wowhead_id === val
                if (!idOk) return false
              }
              if (idFilter) {
                const [, val] = idFilter
                const idOk = Array.isArray(val) ? val.includes(item.id) : item.id === val
                if (!idOk) return false
              }
              return true
            })
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          return Promise.resolve({ data: null, error: null }).then(resolve)
        },
      }
      return builder
    },
  }
  return { client, calls }
}

const GUILD_A = 'guild-a'
const GUILD_B = 'guild-b'

describe('resolveGuildLootItem', () => {
  it('resolves the Horde id to the guild-owned Alliance row', async () => {
    const { client } = makeClient({
      expansions: [{ id: 'exp-a', guild_id: GUILD_A }],
      tiers: [{ id: 'tier-bwl', expansion_id: 'exp-a' }],
      items: [{ id: 'item-19003', name: 'Head of Nefarian', raid_tier_id: 'tier-bwl', wowhead_id: 19003 }],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItem(client as any, GUILD_A, 19002)
    expect(result).toEqual({ id: 'item-19003', name: 'Head of Nefarian', raid_tier_id: 'tier-bwl', expansion_id: 'exp-a' })
  })

  it('never returns another guild row even when it is the first (and only) match', async () => {
    // guild-b owns the Alliance row; guild-a has its own expansion/tier but no matching item.
    const { client } = makeClient({
      expansions: [{ id: 'exp-a', guild_id: GUILD_A }, { id: 'exp-b', guild_id: GUILD_B }],
      tiers: [{ id: 'tier-a', expansion_id: 'exp-a' }, { id: 'tier-b', expansion_id: 'exp-b' }],
      items: [{ id: 'other-guild-item', name: 'Head of Nefarian', raid_tier_id: 'tier-b', wowhead_id: 19003 }],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItem(client as any, GUILD_A, 19002)
    expect(result).toBeNull()
  })

  it('the guild scope comes from expansions -> raid_tiers: another guild tier id never reaches the loot_items query', async () => {
    const { client, calls } = makeClient({
      expansions: [{ id: 'exp-a', guild_id: GUILD_A }, { id: 'exp-b', guild_id: GUILD_B }],
      tiers: [{ id: 'tier-a', expansion_id: 'exp-a' }, { id: 'tier-b', expansion_id: 'exp-b' }],
      items: [],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await resolveGuildLootItem(client as any, GUILD_A, 19003)

    const expansionsCall = calls.find(c => c.table === 'expansions')
    expect(expansionsCall?.filters).toEqual([['guild_id', GUILD_A]])

    const raidTiersCall = calls.find(c => c.table === 'raid_tiers')
    expect(raidTiersCall?.filters).toEqual([['expansion_id', ['exp-a']]])

    const lootItemsCalls = calls.filter(c => c.table === 'loot_items')
    for (const call of lootItemsCalls) {
      const tierFilter = call.filters.find(([col]) => col === 'raid_tier_id')?.[1]
      expect(tierFilter).toEqual(['tier-a'])
    }
  })

  it('prefers the exact id over the alias when the calling guild owns both rows', async () => {
    const { client } = makeClient({
      expansions: [{ id: 'exp-a', guild_id: GUILD_A }],
      tiers: [{ id: 'tier-bwl', expansion_id: 'exp-a' }, { id: 'tier-bwl-horde', expansion_id: 'exp-a' }],
      items: [
        { id: 'item-19003', name: 'Alliance', raid_tier_id: 'tier-bwl', wowhead_id: 19003 },
        { id: 'item-19002', name: 'Horde', raid_tier_id: 'tier-bwl-horde', wowhead_id: 19002 },
      ],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItem(client as any, GUILD_A, 19002)
    expect(result?.id).toBe('item-19002')
  })

  it('picks the active expansion row when the guild owns the item under two expansions', async () => {
    const { client } = makeClient({
      activeExpansionId: 'exp-active',
      expansions: [{ id: 'exp-old', guild_id: GUILD_A }, { id: 'exp-active', guild_id: GUILD_A }],
      tiers: [{ id: 'tier-zzz', expansion_id: 'exp-old' }, { id: 'tier-aaa', expansion_id: 'exp-active' }],
      items: [
        { id: 'item-old', name: 'Head of Nefarian', raid_tier_id: 'tier-zzz', wowhead_id: 19003 },
        { id: 'item-active', name: 'Head of Nefarian', raid_tier_id: 'tier-aaa', wowhead_id: 19003 },
      ],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItem(client as any, GUILD_A, 19003)
    expect(result?.id).toBe('item-active')
    expect(result?.expansion_id).toBe('exp-active')
  })

  it('falls back to the lowest raid_tier_id deterministically when no row is the active expansion', async () => {
    const { client } = makeClient({
      activeExpansionId: 'exp-neither',
      expansions: [{ id: 'exp-old', guild_id: GUILD_A }, { id: 'exp-older', guild_id: GUILD_A }],
      tiers: [{ id: 'tier-zzz', expansion_id: 'exp-old' }, { id: 'tier-aaa', expansion_id: 'exp-older' }],
      items: [
        { id: 'item-zzz', name: 'Head of Nefarian', raid_tier_id: 'tier-zzz', wowhead_id: 19003 },
        { id: 'item-aaa', name: 'Head of Nefarian', raid_tier_id: 'tier-aaa', wowhead_id: 19003 },
      ],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItem(client as any, GUILD_A, 19003)
    expect(result?.id).toBe('item-aaa')
  })

  it('returns null when nothing matches any candidate', async () => {
    const { client } = makeClient({
      expansions: [{ id: 'exp-a', guild_id: GUILD_A }],
      tiers: [{ id: 'tier-a', expansion_id: 'exp-a' }],
      items: [],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItem(client as any, GUILD_A, 99999)
    expect(result).toBeNull()
  })

  it('returns null without querying loot_items when the guild has no expansions', async () => {
    const { client, calls } = makeClient({ expansions: [], tiers: [], items: [] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItem(client as any, GUILD_A, 19003)
    expect(result).toBeNull()
    expect(calls.some(c => c.table === 'loot_items')).toBe(false)
  })

  it('returns null without querying loot_items when the guild has expansions but no raid tiers', async () => {
    const { client, calls } = makeClient({
      expansions: [{ id: 'exp-a', guild_id: GUILD_A }],
      tiers: [],
      items: [],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItem(client as any, GUILD_A, 19003)
    expect(result).toBeNull()
    expect(calls.some(c => c.table === 'loot_items')).toBe(false)
  })

  it('throws (does not return null) when the expansions query errors', async () => {
    const { client } = makeClient({ expansions: [], tiers: [], items: [], errorOn: 'expansions' })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(resolveGuildLootItem(client as any, GUILD_A, 19003)).rejects.toThrow(/expansions/i)
  })

  it('throws when the raid_tiers query errors', async () => {
    const { client } = makeClient({
      expansions: [{ id: 'exp-a', guild_id: GUILD_A }],
      tiers: [],
      items: [],
      errorOn: 'raid_tiers',
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(resolveGuildLootItem(client as any, GUILD_A, 19003)).rejects.toThrow(/raid.tiers/i)
  })

  it('throws when the guilds query errors', async () => {
    const { client } = makeClient({
      expansions: [{ id: 'exp-a', guild_id: GUILD_A }],
      tiers: [{ id: 'tier-a', expansion_id: 'exp-a' }],
      items: [],
      errorOn: 'guilds',
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(resolveGuildLootItem(client as any, GUILD_A, 19003)).rejects.toThrow(/guild/i)
  })

  it('throws (not a false 404-shaped null) when the loot_items query errors', async () => {
    const { client } = makeClient({
      expansions: [{ id: 'exp-a', guild_id: GUILD_A }],
      tiers: [{ id: 'tier-a', expansion_id: 'exp-a' }],
      items: [],
      errorOn: 'loot_items',
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(resolveGuildLootItem(client as any, GUILD_A, 19003)).rejects.toThrow(/loot_items/i)
  })
})

describe('findGuildLootItemsByWowheadIds', () => {
  it('finds a guild-owned row across candidates and excludes another guild row for the same id', async () => {
    const { client } = makeClient({
      expansions: [{ id: 'exp-a', guild_id: GUILD_A }, { id: 'exp-b', guild_id: GUILD_B }],
      tiers: [{ id: 'tier-a', expansion_id: 'exp-a' }, { id: 'tier-b', expansion_id: 'exp-b' }],
      items: [
        { id: 'mine', name: 'Head of Nefarian', raid_tier_id: 'tier-a', wowhead_id: 19003 },
        { id: 'not-mine', name: 'Head of Nefarian', raid_tier_id: 'tier-b', wowhead_id: 19003 },
      ],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await findGuildLootItemsByWowheadIds(client as any, GUILD_A, [19002, 19003])
    expect(result).toEqual([{ id: 'mine', name: 'Head of Nefarian', raid_tier_id: 'tier-a' }])
  })

  it('returns an empty array when the guild has no matching row', async () => {
    const { client } = makeClient({
      expansions: [{ id: 'exp-a', guild_id: GUILD_A }],
      tiers: [{ id: 'tier-a', expansion_id: 'exp-a' }],
      items: [],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await findGuildLootItemsByWowheadIds(client as any, GUILD_A, [99999])
    expect(result).toEqual([])
  })

  it('returns an empty array without querying loot_items when the guild has no expansions', async () => {
    const { client, calls } = makeClient({ expansions: [], tiers: [], items: [] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await findGuildLootItemsByWowheadIds(client as any, GUILD_A, [19003])
    expect(result).toEqual([])
    expect(calls.some(c => c.table === 'loot_items')).toBe(false)
  })

  it('throws (does not return an empty array) when the loot_items query errors', async () => {
    const { client } = makeClient({
      expansions: [{ id: 'exp-a', guild_id: GUILD_A }],
      tiers: [{ id: 'tier-a', expansion_id: 'exp-a' }],
      items: [],
      errorOn: 'loot_items',
    })
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      findGuildLootItemsByWowheadIds(client as any, GUILD_A, [19003]),
    ).rejects.toThrow(/loot_items/i)
  })
})

describe('resolveGuildLootItemIds', () => {
  const ID_1 = '11111111-1111-1111-1111-111111111111'
  const ID_2 = '22222222-2222-2222-2222-222222222222'
  const ID_3 = '33333333-3333-3333-3333-333333333333'
  const FOREIGN_ID = '99999999-9999-9999-9999-999999999999'
  const NONEXISTENT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

  it('resolves ids the guild owns to id, raid_tier_id and expansion_id', async () => {
    const { client } = makeClient({
      expansions: [{ id: 'exp-a', guild_id: GUILD_A }],
      tiers: [{ id: 'tier-a', expansion_id: 'exp-a' }],
      items: [{ id: ID_1, name: 'Item 1', raid_tier_id: 'tier-a', wowhead_id: 1 }],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItemIds(client as any, GUILD_A, [ID_1])
    expect(result.resolved.get(ID_1)).toEqual({ id: ID_1, raid_tier_id: 'tier-a', expansion_id: 'exp-a' })
    expect(result.invalidIds).toEqual([])
  })

  it('puts an id owned by another guild and a nonexistent id both in invalidIds', async () => {
    const { client } = makeClient({
      expansions: [{ id: 'exp-a', guild_id: GUILD_A }, { id: 'exp-b', guild_id: GUILD_B }],
      tiers: [{ id: 'tier-a', expansion_id: 'exp-a' }, { id: 'tier-b', expansion_id: 'exp-b' }],
      items: [{ id: FOREIGN_ID, name: 'Foreign', raid_tier_id: 'tier-b', wowhead_id: 2 }],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItemIds(client as any, GUILD_A, [FOREIGN_ID, NONEXISTENT_ID])
    expect(result.resolved.size).toBe(0)
    expect(result.invalidIds).toEqual([FOREIGN_ID, NONEXISTENT_ID])
  })

  it('puts a non-UUID id in invalidIds without ever sending it to loot_items', async () => {
    const { client, calls } = makeClient({
      expansions: [{ id: 'exp-a', guild_id: GUILD_A }],
      tiers: [{ id: 'tier-a', expansion_id: 'exp-a' }],
      items: [{ id: ID_1, name: 'Item 1', raid_tier_id: 'tier-a', wowhead_id: 1 }],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItemIds(client as any, GUILD_A, ['not-a-uuid', ID_1])
    expect(result.invalidIds).toEqual(['not-a-uuid'])
    expect(result.resolved.get(ID_1)).toBeTruthy()

    const lootItemsCall = calls.find(c => c.table === 'loot_items')
    const idFilter = lootItemsCall?.filters.find(([col]) => col === 'id')?.[1] as string[]
    expect(idFilter).toEqual([ID_1])
  })

  it('returns every id invalid and makes no loot_items query when the guild has no tiers', async () => {
    const { client, calls } = makeClient({ expansions: [], tiers: [], items: [] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItemIds(client as any, GUILD_A, [ID_1, ID_2])
    expect(result.resolved.size).toBe(0)
    expect(result.invalidIds).toEqual([ID_1, ID_2])
    expect(calls.some(c => c.table === 'loot_items')).toBe(false)
  })

  it('makes no query at all when every id is malformed', async () => {
    const { client, calls } = makeClient({ expansions: [], tiers: [], items: [] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItemIds(client as any, GUILD_A, ['nope', 'also-nope'])
    expect(result.invalidIds).toEqual(['nope', 'also-nope'])
    expect(calls.some(c => c.table === 'expansions')).toBe(false)
    expect(calls.some(c => c.table === 'loot_items')).toBe(false)
  })

  it('dedupes repeated ids, keeping first-seen order in invalidIds', async () => {
    const { client } = makeClient({ expansions: [], tiers: [], items: [] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItemIds(client as any, GUILD_A, [ID_1, ID_2, ID_1])
    expect(result.invalidIds).toEqual([ID_1, ID_2])
  })

  it('queries loot_items in chunks of 100 for 250 ids', async () => {
    const items = Array.from({ length: 250 }, (_, i) => {
      const hex = i.toString(16).padStart(8, '0')
      return { id: `${hex}-0000-0000-0000-000000000000`, name: `Item ${i}`, raid_tier_id: 'tier-a', wowhead_id: i }
    })
    const { client, calls } = makeClient({
      expansions: [{ id: 'exp-a', guild_id: GUILD_A }],
      tiers: [{ id: 'tier-a', expansion_id: 'exp-a' }],
      items,
    })
    const ids = items.map(i => i.id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItemIds(client as any, GUILD_A, ids)
    expect(result.invalidIds).toEqual([])
    expect(result.resolved.size).toBe(250)
    expect(calls.filter(c => c.table === 'loot_items')).toHaveLength(3)
  })

  it('throws naming loot_items when the loot_items query errors', async () => {
    const { client } = makeClient({
      expansions: [{ id: 'exp-a', guild_id: GUILD_A }],
      tiers: [{ id: 'tier-a', expansion_id: 'exp-a' }],
      items: [],
      errorOn: 'loot_items',
    })
    await expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolveGuildLootItemIds(client as any, GUILD_A, [ID_1, ID_2, ID_3]),
    ).rejects.toThrow(/loot_items/i)
  })
})
