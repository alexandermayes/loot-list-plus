// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deflateRawSync } from 'zlib'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyOfficerPermissions } from '@/utils/server-roles'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyOfficerPermissions: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), trackApiError: vi.fn() }))
vi.mock('@/lib/discord-loot-announcements', () => ({ notifyLootAward: vi.fn() }))
vi.mock('@/utils/blp/recompute', () => ({ recomputeBlpForEvents: vi.fn() }))
vi.mock('@/utils/raid-events/team-routing', () => ({ importAttendanceByTeam: vi.fn(async () => ({ eventIds: [] })) }))
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (fn: () => unknown) => fn(),
}))

const GUILD_ID = 'g1'
const OTHER_GUILD_ID = 'g2'

type CatalogRow = { id: string; raid_tier_id: string; guild_id: string; expansion_id: string; wowhead_id: number }
type Call = { table: string; filters: Array<[string, unknown]>; insertPayload?: unknown }

/** Recording fake, same shape as the loot-award route test's fake. */
function makeClient(opts: { catalog: CatalogRow[]; activeExpansionId?: string }) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const call: Call = { table, filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        insert: (payload: unknown) => { call.insertPayload = payload; return builder },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        single: () => {
          if (table === 'guilds') {
            return Promise.resolve({ data: { active_expansion_id: opts.activeExpansionId ?? null }, error: null })
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
              data: matches.map(row => ({ id: row.id, name: 'item', raid_tier_id: row.raid_tier_id, raid_tiers: { expansion_id: row.expansion_id } })),
              error: null,
            }).then(resolve)
          }
          if (table === 'loot_history') {
            return Promise.resolve({ error: null }).then(resolve)
          }
          if (table === 'character_guild_memberships') {
            return Promise.resolve({ data: [], error: null }).then(resolve)
          }
          return Promise.resolve({ data: null, error: null }).then(resolve)
        },
      }
      return builder
    },
  }
  return { client, calls }
}

function importString(payload: unknown) {
  const json = JSON.stringify(payload)
  const compressed = deflateRawSync(Buffer.from(json, 'utf-8'))
  return 'LLP1E:1:' + compressed.toString('base64')
}

function request(body: unknown) {
  return new Request('http://localhost/api/addon/import-string', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

const lootItemsLookups = (calls: Call[]) => calls.filter(c => c.table === 'loot_items')
const lootHistoryInserts = (calls: Call[]) => calls.filter(c => c.table === 'loot_history' && c.insertPayload)

describe('POST /api/addon/import-string', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'user-1' }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true } as never)
  })

  it('resolves a Horde-id award to the guild catalog Alliance row', async () => {
    const { client, calls } = makeClient({
      catalog: [{ id: 'item-19003', raid_tier_id: 'tier-bwl', guild_id: GUILD_ID, expansion_id: 'exp-1', wowhead_id: 19003 }],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const payload = { guildId: GUILD_ID, exportedAt: '2026-09-20T00:00:00Z', awards: [{ wowheadId: 19002, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' }], attendance: [] }
    const res = await POST(request({ importString: importString(payload) }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.awards).toEqual({ processed: 1, errors: 0 })

    const insert = lootHistoryInserts(calls)[0]
    expect((insert?.insertPayload as { loot_item_id: string }).loot_item_id).toBe('item-19003')

    const wowheadFilters = lootItemsLookups(calls).map(c => c.filters.find(([col]) => col === 'wowhead_id')?.[1])
    expect(wowheadFilters).toEqual([19002, 19003])
  })

  it('makes no loot_items lookup when the award already carries lootItemId', async () => {
    const { client, calls } = makeClient({ catalog: [] })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const payload = { guildId: GUILD_ID, exportedAt: '2026-09-20T00:00:00Z', awards: [{ wowheadId: 19002, lootItemId: 'item-manual', characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' }], attendance: [] }
    const res = await POST(request({ importString: importString(payload) }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.awards).toEqual({ processed: 1, errors: 0 })
    expect(lootItemsLookups(calls)).toHaveLength(0)
    const insert = lootHistoryInserts(calls)[0]
    expect((insert?.insertPayload as { loot_item_id: string }).loot_item_id).toBe('item-manual')
  })

  it('counts an unresolvable wowheadId as an error with no loot_history insert', async () => {
    const { client, calls } = makeClient({ catalog: [] })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const payload = { guildId: GUILD_ID, exportedAt: '2026-09-20T00:00:00Z', awards: [{ wowheadId: 99999, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' }], attendance: [] }
    const res = await POST(request({ importString: importString(payload) }))
    const body = await res.json()

    expect(body.data.awards).toEqual({ processed: 0, errors: 1 })
    expect(lootHistoryInserts(calls)).toHaveLength(0)
  })

  it('SCOPE-01: never awards another guild row for the same wowhead_id', async () => {
    const { client, calls } = makeClient({
      catalog: [{ id: 'other-guild-item', raid_tier_id: 'tier-x', guild_id: OTHER_GUILD_ID, expansion_id: 'exp-2', wowhead_id: 19003 }],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const payload = { guildId: GUILD_ID, exportedAt: '2026-09-20T00:00:00Z', awards: [{ wowheadId: 19002, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' }], attendance: [] }
    const res = await POST(request({ importString: importString(payload) }))
    const body = await res.json()

    expect(body.data.awards).toEqual({ processed: 0, errors: 1 })
    expect(lootHistoryInserts(calls)).toHaveLength(0)
  })
})
