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
// UUID-shaped ids for the OD-2 loot_item_id guild-scope checks below —
// resolveGuildLootItemIds only queries loot_items for well-formed UUIDs.
const ITEM_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const FOREIGN_ITEM_ID = 'bbbbbbbb-0000-0000-0000-000000000002'

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
            const wowheadFilter = call.filters.find(([col]) => col === 'wowhead_id')
            const idFilter = call.filters.find(([col]) => col === 'id')
            const rows = fixture.items.filter(item => {
              if (!tierIdsFilter.includes(item.raid_tier_id)) return false
              if (wowheadFilter) {
                const [, val] = wowheadFilter
                if (item.wowhead_id !== val) return false
              }
              if (idFilter) {
                const [, val] = idFilter as [string, string[]]
                if (!val.includes(item.id)) return false
              }
              return true
            })
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

  it('GH #294: the wowheadId-only path (missing lootItemId) carries raid_tier_id and expansion_id, resolving the Horde id to the guild catalog Alliance row', async () => {
    const { client, calls } = makeClient(singleItemFixture({ id: 'item-19003', wowhead_id: 19003 }))
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const payload = { guildId: GUILD_ID, exportedAt: '2026-09-20T00:00:00Z', awards: [{ wowheadId: 19002, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' }], attendance: [] }
    const res = await POST(request({ importString: importString(payload) }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.awards).toEqual({ processed: 1, errors: 0 })

    const insert = lootHistoryInserts(calls)[0]
    const insertPayload = insert?.insertPayload as { loot_item_id: string; raid_tier_id: string; expansion_id: string }
    expect(insertPayload.loot_item_id).toBe('item-19003')
    expect(insertPayload.raid_tier_id).toBe('tier-1')
    expect(insertPayload.expansion_id).toBe('exp-1')

    const wowheadFilters = lootItemsLookups(calls).map(c => c.filters.find(([col]) => col === 'wowhead_id')?.[1])
    expect(wowheadFilters).toEqual([19002, 19003])
  })

  it('OD-2: a supplied lootItemId the guild owns directly is checked (loot_items filtered by id and the guild tier ids) and its payload carries the server tier and expansion', async () => {
    const { client, calls } = makeClient(singleItemFixture({ id: ITEM_ID, wowhead_id: 19003 }))
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const payload = { guildId: GUILD_ID, exportedAt: '2026-09-20T00:00:00Z', awards: [{ wowheadId: 19003, lootItemId: ITEM_ID, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' }], attendance: [] }
    const res = await POST(request({ importString: importString(payload) }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.awards).toEqual({ processed: 1, errors: 0 })

    const idLookup = lootItemsLookups(calls).find(c => c.filters.some(([col]) => col === 'id'))
    expect(idLookup?.filters.find(([col]) => col === 'id')?.[1]).toEqual([ITEM_ID])
    expect(idLookup?.filters.find(([col]) => col === 'raid_tier_id')?.[1]).toEqual(['tier-1'])

    const insert = lootHistoryInserts(calls)[0]
    const insertPayload = insert?.insertPayload as { loot_item_id: string; raid_tier_id: string; expansion_id: string }
    expect(insertPayload.loot_item_id).toBe(ITEM_ID)
    expect(insertPayload.raid_tier_id).toBe('tier-1')
    expect(insertPayload.expansion_id).toBe('exp-1')
  })

  it('OD-2: a lootItemId not owned by the guild falls back to the wowheadId and the resolved item (not the foreign id) is written', async () => {
    const { client, calls } = makeClient(singleItemFixture({ id: ITEM_ID, wowhead_id: 19003 }))
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    // FOREIGN_ITEM_ID is well-formed but not owned by GUILD_ID — the guild
    // has no loot_items row with that id — so it falls back to wowheadId 19003.
    const payload = {
      guildId: GUILD_ID,
      exportedAt: '2026-09-20T00:00:00Z',
      awards: [{ wowheadId: 19003, lootItemId: FOREIGN_ITEM_ID, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' }],
      attendance: [],
    }
    const res = await POST(request({ importString: importString(payload) }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.awards).toEqual({ processed: 1, errors: 0 })

    const insert = lootHistoryInserts(calls)[0]
    const insertPayload = insert?.insertPayload as { loot_item_id: string; raid_tier_id: string; expansion_id: string }
    // The foreign id is never written — the wowheadId-resolved guild item is.
    expect(insertPayload.loot_item_id).toBe(ITEM_ID)
    expect(insertPayload.raid_tier_id).toBe('tier-1')
    expect(insertPayload.expansion_id).toBe('exp-1')
  })

  it('OD-2: a lootItemId not owned by the guild whose wowheadId also does not resolve rejects the whole import with 400, nothing processed', async () => {
    const { client, calls } = makeClient({
      expansions: [{ id: 'exp-1', guild_id: GUILD_ID }],
      tiers: [{ id: 'tier-1', expansion_id: 'exp-1' }],
      items: [],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const payload = {
      guildId: GUILD_ID,
      exportedAt: '2026-09-20T00:00:00Z',
      awards: [{ wowheadId: 99999, lootItemId: FOREIGN_ITEM_ID, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' }],
      attendance: [{ raidDate: '2026-09-20', raidName: 'BWL', startTime: '20:00', endTime: '23:00', bossKills: [], attended: [] }],
    }
    const res = await POST(request({ importString: importString(payload) }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.invalid_loot_item_ids).toEqual([FOREIGN_ITEM_ID])
    expect(body.error).toBe("Some loot items aren't in this guild's loot tables. Refresh the page and try again.")
    expect(lootHistoryInserts(calls)).toHaveLength(0)
    const { importAttendanceByTeam } = await import('@/utils/raid-events/team-routing')
    expect(importAttendanceByTeam).not.toHaveBeenCalled()
  })

  it('OD-2: a mix of a guild-owned id and a fully-unresolvable foreign id rejects the whole import with 400 and zero inserts', async () => {
    const { client, calls } = makeClient(singleItemFixture({ id: ITEM_ID, wowhead_id: 19003 }))
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const payload = {
      guildId: GUILD_ID,
      exportedAt: '2026-09-20T00:00:00Z',
      awards: [
        { wowheadId: 19003, lootItemId: ITEM_ID, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' },
        { wowheadId: 88888, lootItemId: FOREIGN_ITEM_ID, characterName: 'Jaina', awardedAt: '2026-09-20T20:00:00Z' },
      ],
      attendance: [],
    }
    const res = await POST(request({ importString: importString(payload) }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.invalid_loot_item_ids).toEqual([FOREIGN_ITEM_ID])
    expect(lootHistoryInserts(calls)).toHaveLength(0)
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
