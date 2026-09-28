// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyOfficerPermissions } from '@/utils/server-roles'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyOfficerPermissions: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), trackApiError: vi.fn() }))
vi.mock('@/utils/analytics/funnel', () => ({ evaluateGuildFunnel: vi.fn() }))
vi.mock('@/lib/discord-loot-announcements', () => ({ notifyLootAward: vi.fn() }))
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (fn: () => unknown) => fn(),
}))

const GUILD_ID = 'guild-1'
const OTHER_GUILD_ID = 'guild-2'

type CatalogRow = { id: string; name: string; raid_tier_id: string; guild_id: string; expansion_id: string; wowhead_id: number }
type Call = { table: string; filters: Array<[string, unknown]> }

/**
 * Recording fake modelled on app/api/guilds/change-expansion's test client:
 * every builder method returns the builder, and each eq/in call records its
 * column and value. `catalog` holds loot_items rows across (possibly
 * several) guilds; the fake honors the raid_tiers.expansions.guild_id
 * embedded filter the way real PostgREST would, so a wrong scope is caught.
 */
function makeClient(opts: { catalog: CatalogRow[]; activeExpansionId?: string; characters?: Array<{ character_id: string; characters: { id: string; name: string } }> }) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const call: Call = { table, filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        insert: (payload: unknown) => {
          call.filters.push(['__insert_payload__', payload])
          return builder
        },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        limit: () => builder,
        single: () => {
          if (table === 'guilds') {
            return Promise.resolve({ data: { active_expansion_id: opts.activeExpansionId ?? null }, error: null })
          }
          if (table === 'loot_history') {
            return Promise.resolve({ data: { id: 'hist-1' }, error: null })
          }
          return Promise.resolve({ data: null, error: null })
        },
        then: (resolve: (v: unknown) => unknown) => {
          if (table === 'loot_items') {
            const guildIdFilter = call.filters.find(([col]) => col === 'raid_tiers.expansions.guild_id')?.[1]
            const wowheadFilter = call.filters.find(([col]) => col === 'wowhead_id')?.[1]
            const matches = opts.catalog.filter(
              row => row.guild_id === guildIdFilter && row.wowhead_id === wowheadFilter
            )
            return Promise.resolve({
              data: matches.map(row => ({
                id: row.id,
                name: row.name,
                raid_tier_id: row.raid_tier_id,
                raid_tiers: { expansion_id: row.expansion_id },
              })),
              error: null,
            }).then(resolve)
          }
          if (table === 'character_guild_memberships') {
            return Promise.resolve({ data: opts.characters ?? [], error: null }).then(resolve)
          }
          return Promise.resolve({ data: null, error: null }).then(resolve)
        },
      }
      return builder
    },
  }
  return { client, calls }
}

function request(body: unknown) {
  return new Request('http://localhost/api/addon/loot-award', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

const lootItemsLookups = (calls: Call[]) => calls.filter(c => c.table === 'loot_items')
const lootHistoryInsert = (calls: Call[]) =>
  calls.find(c => c.table === 'loot_history' && c.filters.some(([col]) => col === '__insert_payload__'))

describe('POST /api/addon/loot-award', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'user-1' }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true } as never)
  })

  it('resolves a Horde Head of Nefarian (19002) to the guild catalog Alliance row (19003)', async () => {
    const { client, calls } = makeClient({
      catalog: [{ id: 'item-19003', name: 'Head of Nefarian', raid_tier_id: 'tier-bwl', guild_id: GUILD_ID, expansion_id: 'exp-1', wowhead_id: 19003 }],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD_ID, wowhead_id: 19002, character_name: 'Thrall' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.item_name).toBe('Head of Nefarian')

    const insert = lootHistoryInsert(calls)
    const payload = insert?.filters.find(([col]) => col === '__insert_payload__')?.[1] as { loot_item_id: string }
    expect(payload.loot_item_id).toBe('item-19003')

    const wowheadFilters = lootItemsLookups(calls).map(c => c.filters.find(([col]) => col === 'wowhead_id')?.[1])
    expect(wowheadFilters).toEqual([19002, 19003])
  })

  it('resolves a Horde Head of Onyxia (18422) to the guild catalog Alliance row (18423)', async () => {
    const { client, calls } = makeClient({
      catalog: [{ id: 'item-18423', name: 'Head of Onyxia', raid_tier_id: 'tier-ony', guild_id: GUILD_ID, expansion_id: 'exp-1', wowhead_id: 18423 }],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD_ID, wowhead_id: 18422, character_name: 'Thrall' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.item_name).toBe('Head of Onyxia')
    const insert = lootHistoryInsert(calls)
    const payload = insert?.filters.find(([col]) => col === '__insert_payload__')?.[1] as { loot_item_id: string }
    expect(payload.loot_item_id).toBe('item-18423')
  })

  it('prefers the exact id after one lookup when the guild owns both the Horde and Alliance rows', async () => {
    const { client, calls } = makeClient({
      catalog: [
        { id: 'item-19003', name: 'Alliance', raid_tier_id: 'tier-a', guild_id: GUILD_ID, expansion_id: 'exp-1', wowhead_id: 19003 },
        { id: 'item-19002', name: 'Horde', raid_tier_id: 'tier-h', guild_id: GUILD_ID, expansion_id: 'exp-1', wowhead_id: 19002 },
      ],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD_ID, wowhead_id: 19002, character_name: 'Thrall' }))
    expect(res.status).toBe(200)
    const insert = lootHistoryInsert(calls)
    const payload = insert?.filters.find(([col]) => col === '__insert_payload__')?.[1] as { loot_item_id: string }
    expect(payload.loot_item_id).toBe('item-19002')
    expect(lootItemsLookups(calls)).toHaveLength(1)
  })

  it('makes one loot_items lookup for a non-alias id', async () => {
    const { client, calls } = makeClient({
      catalog: [{ id: 'item-19003', name: 'Head of Nefarian', raid_tier_id: 'tier-bwl', guild_id: GUILD_ID, expansion_id: 'exp-1', wowhead_id: 19003 }],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD_ID, wowhead_id: 19003, character_name: 'Thrall' }))
    expect(res.status).toBe(200)
    expect(lootItemsLookups(calls)).toHaveLength(1)
  })

  it('returns 404 for an unknown wowhead_id, naming it, with no loot_history insert', async () => {
    const { client, calls } = makeClient({ catalog: [] })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD_ID, wowhead_id: 99999, character_name: 'Thrall' }))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toContain('99999')
    expect(lootItemsLookups(calls)).toHaveLength(1)
    expect(lootHistoryInsert(calls)).toBeUndefined()
  })

  it('SCOPE-01: never awards another guild row, even when it is the first (and only) match for the id', async () => {
    // guild-2 has the Alliance catalog row; the requesting guild (guild-1) has none.
    const { client, calls } = makeClient({
      catalog: [{ id: 'other-guild-item', name: 'Head of Nefarian', raid_tier_id: 'tier-bwl', guild_id: OTHER_GUILD_ID, expansion_id: 'exp-2', wowhead_id: 19003 }],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD_ID, wowhead_id: 19002, character_name: 'Thrall' }))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(lootHistoryInsert(calls)).toBeUndefined()
    expect(body.error).toContain('19002')
  })
})
