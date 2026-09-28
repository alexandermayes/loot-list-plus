// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

type ExpansionRow = { id: string; guild_id: string }
type TierRow = { id: string; expansion_id: string }
type ItemRow = { id: string; raid_tier_id: string; wowhead_id: number }
type Call = { table: string; filters: Array<[string, unknown]>; insertPayload?: unknown }

interface Fixture {
  expansions: ExpansionRow[]
  tiers: TierRow[]
  items: ItemRow[]
  errorOn?: 'expansions' | 'raid_tiers' | 'guilds' | 'loot_items'
}

/** Recording fake matching the guild-scoped query sequence (expansions -> raid_tiers -> guilds -> loot_items). */
function makeClient(fixture: Fixture) {
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
        in: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        single: () => {
          if (table === 'guilds') {
            if (fixture.errorOn === 'guilds') return Promise.resolve({ data: null, error: { message: 'guilds boom' } })
            return Promise.resolve({ data: { active_expansion_id: null }, error: null })
          }
          return Promise.resolve({ data: null, error: null })
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
            const expansionIdsFilter = (call.filters.find(([col]) => col === 'expansion_id')?.[1] ?? []) as string[]
            const rows = fixture.tiers.filter(t => expansionIdsFilter.includes(t.expansion_id))
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          if (table === 'loot_items') {
            if (fixture.errorOn === 'loot_items') {
              return Promise.resolve({ data: null, error: { message: 'loot_items boom' } }).then(resolve)
            }
            const tierIdsFilter = (call.filters.find(([col]) => col === 'raid_tier_id')?.[1] ?? []) as string[]
            const wowheadFilter = call.filters.find(([col]) => col === 'wowhead_id')?.[1]
            const rows = fixture.items.filter(item => tierIdsFilter.includes(item.raid_tier_id) && item.wowhead_id === wowheadFilter)
            return Promise.resolve({ data: rows.map(r => ({ ...r, name: 'item' })), error: null }).then(resolve)
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

/** One guild owning one item under one tier/expansion — the common case. */
function singleItemFixture(item: { id: string; wowhead_id: number }, guildId = GUILD_ID) {
  return {
    expansions: [{ id: 'exp-1', guild_id: guildId }],
    tiers: [{ id: 'tier-1', expansion_id: 'exp-1' }],
    items: [{ id: item.id, raid_tier_id: 'tier-1', wowhead_id: item.wowhead_id }],
  }
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
    const { client, calls } = makeClient(singleItemFixture({ id: 'item-19003', wowhead_id: 19003 }))
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
    const { client, calls } = makeClient({ expansions: [], tiers: [], items: [] })
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
    const { client, calls } = makeClient({
      expansions: [{ id: 'exp-1', guild_id: GUILD_ID }],
      tiers: [{ id: 'tier-1', expansion_id: 'exp-1' }],
      items: [],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const payload = { guildId: GUILD_ID, exportedAt: '2026-09-20T00:00:00Z', awards: [{ wowheadId: 99999, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' }], attendance: [] }
    const res = await POST(request({ importString: importString(payload) }))
    const body = await res.json()

    expect(body.data.awards).toEqual({ processed: 0, errors: 1 })
    expect(lootHistoryInserts(calls)).toHaveLength(0)
  })

  it('SCOPE-01: never awards another guild row for the same wowhead_id', async () => {
    const { client, calls } = makeClient({
      expansions: [{ id: 'exp-1', guild_id: GUILD_ID }, { id: 'exp-2', guild_id: OTHER_GUILD_ID }],
      tiers: [{ id: 'tier-1', expansion_id: 'exp-1' }, { id: 'tier-2', expansion_id: 'exp-2' }],
      items: [{ id: 'other-guild-item', raid_tier_id: 'tier-2', wowhead_id: 19003 }],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const payload = { guildId: GUILD_ID, exportedAt: '2026-09-20T00:00:00Z', awards: [{ wowheadId: 19002, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' }], attendance: [] }
    const res = await POST(request({ importString: importString(payload) }))
    const body = await res.json()

    expect(body.data.awards).toEqual({ processed: 0, errors: 1 })
    expect(lootHistoryInserts(calls)).toHaveLength(0)

    // Another guild's tier id must never reach the loot_items query.
    const raidTiersCall = calls.find(c => c.table === 'raid_tiers')
    expect(raidTiersCall?.filters).toEqual([['expansion_id', ['exp-1']]])
    for (const call of lootItemsLookups(calls)) {
      const tierFilter = call.filters.find(([col]) => col === 'raid_tier_id')?.[1]
      expect(tierFilter).toEqual(['tier-1'])
    }
  })

  describe('guild-scope query errors are not silently swallowed as a genuine no-match', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('counts a loot_items query error as an award error, logged distinctly from a genuine miss', async () => {
      const { client, calls } = makeClient({
        expansions: [{ id: 'exp-1', guild_id: GUILD_ID }],
        tiers: [{ id: 'tier-1', expansion_id: 'exp-1' }],
        items: [],
        errorOn: 'loot_items',
      })
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const payload = { guildId: GUILD_ID, exportedAt: '2026-09-20T00:00:00Z', awards: [{ wowheadId: 19002, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' }], attendance: [] }
      const res = await POST(request({ importString: importString(payload) }))
      const body = await res.json()

      expect(body.data.awards).toEqual({ processed: 0, errors: 1 })
      expect(lootHistoryInserts(calls)).toHaveLength(0)

      const loggedError = consoleErrorSpy.mock.calls.find((call: unknown[]) => String(call[0]).includes('Failed to process award'))
      expect(loggedError, 'expected the loot_items query failure to be logged').toBeDefined()
      const thrown = loggedError?.[1] as Error
      expect(thrown?.message).toMatch(/loot_items/i)
      expect(thrown?.message).not.toMatch(/Could not resolve item/)
    })

    it('counts an expansions query error as an award error, distinct from a genuine miss', async () => {
      const { client } = makeClient({ expansions: [], tiers: [], items: [], errorOn: 'expansions' })
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const payload = { guildId: GUILD_ID, exportedAt: '2026-09-20T00:00:00Z', awards: [{ wowheadId: 19003, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' }], attendance: [] }
      const res = await POST(request({ importString: importString(payload) }))
      const body = await res.json()

      expect(body.data.awards).toEqual({ processed: 0, errors: 1 })
      const loggedError = consoleErrorSpy.mock.calls.find((call: unknown[]) => String(call[0]).includes('Failed to process award'))
      const thrown = loggedError?.[1] as Error
      expect(thrown?.message).toMatch(/expansions/i)
    })
  })
})
