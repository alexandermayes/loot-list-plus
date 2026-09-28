// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { resolveGuildLootItem, findGuildLootItemsByWowheadIds } from '../guild-scoped-lookup'

type Row = { id: string; name: string; raid_tier_id: string; guild_id: string; expansion_id: string; wowhead_id: number }

/**
 * Recording fake modelled on the addon route test fakes: every builder
 * method returns the builder, and `eq`/`in` calls record the column and
 * value so the guild-scope filter itself is asserted on, not merely the
 * final returned rows.
 */
function makeClient(opts: { rows: Row[]; activeExpansionId?: string | null }) {
  const calls: Array<{ table: string; filters: Array<[string, unknown]> }> = []
  const client = {
    from(table: string) {
      const call = { table, filters: [] as Array<[string, unknown]> }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        single: () => {
          if (table === 'guilds') {
            return Promise.resolve({ data: { active_expansion_id: opts.activeExpansionId ?? null }, error: null })
          }
          return Promise.resolve({ data: null, error: null })
        },
        then: (resolve: (v: unknown) => unknown) => {
          if (table !== 'loot_items') return Promise.resolve({ data: [], error: null }).then(resolve)
          const guildIdFilter = call.filters.find(([col]) => col === 'raid_tiers.expansions.guild_id')?.[1]
          const matches = opts.rows.filter(row => {
            const guildOk = guildIdFilter === undefined || row.guild_id === guildIdFilter
            const idFilter = call.filters.find(([col]) => col === 'wowhead_id')
            if (!idFilter) return guildOk
            const [, val] = idFilter
            const idOk = Array.isArray(val) ? val.includes(row.wowhead_id) : row.wowhead_id === val
            return guildOk && idOk
          })
          return Promise.resolve({
            data: matches.map(row => ({
              id: row.id,
              name: row.name,
              raid_tier_id: row.raid_tier_id,
              raid_tiers: { expansion_id: row.expansion_id },
            })),
            error: null,
          }).then(resolve)
        },
      }
      return builder
    },
  }
  return { client, calls }
}

describe('resolveGuildLootItem', () => {
  it('resolves the Horde id to the guild-owned Alliance row', async () => {
    const { client } = makeClient({
      rows: [{ id: 'item-19003', name: 'Head of Nefarian', raid_tier_id: 'tier-bwl', guild_id: 'guild-a', expansion_id: 'exp-a', wowhead_id: 19003 }],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItem(client as any, 'guild-a', 19002)
    expect(result).toEqual({ id: 'item-19003', name: 'Head of Nefarian', raid_tier_id: 'tier-bwl' })
  })

  it('never returns another guild row even when it is the first (and only) match', async () => {
    const { client } = makeClient({
      rows: [{ id: 'other-guild-item', name: 'Head of Nefarian', raid_tier_id: 'tier-bwl', guild_id: 'guild-b', expansion_id: 'exp-b', wowhead_id: 19003 }],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItem(client as any, 'guild-a', 19002)
    expect(result).toBeNull()
  })

  it('prefers the exact id over the alias when the calling guild owns both rows', async () => {
    const { client } = makeClient({
      rows: [
        { id: 'item-19003', name: 'Alliance', raid_tier_id: 'tier-bwl', guild_id: 'guild-a', expansion_id: 'exp-a', wowhead_id: 19003 },
        { id: 'item-19002', name: 'Horde', raid_tier_id: 'tier-bwl-horde', guild_id: 'guild-a', expansion_id: 'exp-a', wowhead_id: 19002 },
      ],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItem(client as any, 'guild-a', 19002)
    expect(result?.id).toBe('item-19002')
  })

  it('picks the active expansion row when the guild owns the item under two expansions', async () => {
    const { client } = makeClient({
      activeExpansionId: 'exp-active',
      rows: [
        { id: 'item-old', name: 'Head of Nefarian', raid_tier_id: 'tier-zzz', guild_id: 'guild-a', expansion_id: 'exp-old', wowhead_id: 19003 },
        { id: 'item-active', name: 'Head of Nefarian', raid_tier_id: 'tier-aaa', guild_id: 'guild-a', expansion_id: 'exp-active', wowhead_id: 19003 },
      ],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItem(client as any, 'guild-a', 19003)
    expect(result?.id).toBe('item-active')
  })

  it('falls back to the lowest raid_tier_id deterministically when no row is the active expansion', async () => {
    const { client } = makeClient({
      activeExpansionId: 'exp-neither',
      rows: [
        { id: 'item-zzz', name: 'Head of Nefarian', raid_tier_id: 'tier-zzz', guild_id: 'guild-a', expansion_id: 'exp-old', wowhead_id: 19003 },
        { id: 'item-aaa', name: 'Head of Nefarian', raid_tier_id: 'tier-aaa', guild_id: 'guild-a', expansion_id: 'exp-older', wowhead_id: 19003 },
      ],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItem(client as any, 'guild-a', 19003)
    expect(result?.id).toBe('item-aaa')
  })

  it('returns null when nothing matches any candidate', async () => {
    const { client } = makeClient({ rows: [] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await resolveGuildLootItem(client as any, 'guild-a', 99999)
    expect(result).toBeNull()
  })
})

describe('findGuildLootItemsByWowheadIds', () => {
  it('finds a guild-owned row across candidates and excludes another guild row for the same id', async () => {
    const { client } = makeClient({
      rows: [
        { id: 'mine', name: 'Head of Nefarian', raid_tier_id: 'tier-a', guild_id: 'guild-a', expansion_id: 'exp-a', wowhead_id: 19003 },
        { id: 'not-mine', name: 'Head of Nefarian', raid_tier_id: 'tier-b', guild_id: 'guild-b', expansion_id: 'exp-b', wowhead_id: 19003 },
      ],
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await findGuildLootItemsByWowheadIds(client as any, 'guild-a', [19002, 19003])
    expect(result).toEqual([{ id: 'mine', name: 'Head of Nefarian', raid_tier_id: 'tier-a' }])
  })

  it('returns an empty array when the guild has no matching row', async () => {
    const { client } = makeClient({ rows: [] })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await findGuildLootItemsByWowheadIds(client as any, 'guild-a', [99999])
    expect(result).toEqual([])
  })
})

