// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'
import { recomputeBlpForItems } from '@/utils/blp/recompute'
import { routeRecordsToTeamEvents } from '@/utils/raid-events/team-routing'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))
vi.mock('@/utils/audit/log', () => ({ logAudit: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), setUserMilestone: vi.fn() }))
vi.mock('@/utils/analytics/funnel', () => ({ evaluateGuildFunnel: vi.fn() }))
vi.mock('@/lib/discord-loot-announcements', () => ({ notifyLootAward: vi.fn() }))
vi.mock('@/utils/blp/recompute', () => ({ recomputeBlpForItems: vi.fn(), recomputeBlpForEvents: vi.fn() }))
vi.mock('@/utils/raid-events/team-routing', () => ({ routeRecordsToTeamEvents: vi.fn(async (_s: unknown, _g: unknown, records: unknown[]) => records) }))
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (fn: () => unknown) => fn(),
}))

const GUILD_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const EXP_ID = 'aaaaaaaa-0000-0000-0000-000000000002'
const TIER_ID = 'aaaaaaaa-0000-0000-0000-000000000003'
const ITEM_ID = 'aaaaaaaa-0000-0000-0000-000000000004'
const ITEM_ID_2 = 'aaaaaaaa-0000-0000-0000-000000000005'
const EXP_ID_2 = 'aaaaaaaa-0000-0000-0000-000000000006'
const TIER_ID_2 = 'aaaaaaaa-0000-0000-0000-000000000007'
const FOREIGN_ITEM_ID = 'aaaaaaaa-0000-0000-0000-000000000008'
const USER_ID = 'aaaaaaaa-0000-0000-0000-000000000009'
const RAID_EVENT_ID = 'aaaaaaaa-0000-0000-0000-00000000000a'
const CHARACTER_ID = 'aaaaaaaa-0000-0000-0000-00000000000b'

type ExpansionRow = { id: string; guild_id: string }
type TierRow = { id: string; expansion_id: string }
type ItemRow = { id: string; raid_tier_id: string }
type Call = { table: string; filters: Array<[string, unknown]>; insertPayload?: Record<string, unknown> }

interface Fixture {
  expansions: ExpansionRow[]
  tiers: TierRow[]
  items: ItemRow[]
  blpEnabled?: boolean
  duplicateLootItemIds?: Set<string>
}

/**
 * Recording fake client. Supports the guild-scoped id resolution query
 * sequence (expansions -> raid_tiers -> loot_items filtered by id AND
 * raid_tier_id), guild_settings, and a loot_history insert capture that can
 * be configured to fail a specific loot_item_id with Postgres 23505.
 */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []
  let insertCounter = 0
  const client = {
    from(table: string) {
      const call: Call = { table, filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        insert: (payload: Record<string, unknown>) => { call.insertPayload = payload; return builder },
        update: () => builder,
        delete: () => builder,
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        single: () => {
          if (table === 'guild_settings') {
            return Promise.resolve({ data: { blp_enabled: fixture.blpEnabled ?? false }, error: null })
          }
          if (table === 'loot_history') {
            const payload = call.insertPayload as { loot_item_id: string }
            if (fixture.duplicateLootItemIds?.has(payload.loot_item_id)) {
              return Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate key value' } })
            }
            insertCounter += 1
            return Promise.resolve({ data: { id: `hist-${insertCounter}` }, error: null })
          }
          return Promise.resolve({ data: null, error: null })
        },
        then: (resolve: (v: unknown) => unknown) => {
          if (table === 'expansions') {
            const guildIdFilter = call.filters.find(([col]) => col === 'guild_id')?.[1]
            const rows = fixture.expansions.filter(e => e.guild_id === guildIdFilter)
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          if (table === 'raid_tiers') {
            const expansionIdsFilter = (call.filters.find(([col]) => col === 'expansion_id')?.[1] ?? []) as string[]
            const idFilter = call.filters.find(([col]) => col === 'id')
            if (idFilter) {
              // The old first-item tier lookup used .eq('id', firstTierId) — must never happen post-fix.
              throw new Error('unexpected raid_tiers query filtered on id')
            }
            const rows = fixture.tiers.filter(t => expansionIdsFilter.includes(t.expansion_id))
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          if (table === 'loot_items') {
            const tierIdsFilter = (call.filters.find(([col]) => col === 'raid_tier_id')?.[1] ?? []) as string[]
            const idFilter = call.filters.find(([col]) => col === 'id')?.[1] as string[] | undefined
            const rows = fixture.items.filter(item => tierIdsFilter.includes(item.raid_tier_id) && (!idFilter || idFilter.includes(item.id)))
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

function singleItemFixture(): Fixture {
  return {
    expansions: [{ id: EXP_ID, guild_id: GUILD_ID }],
    tiers: [{ id: TIER_ID, expansion_id: EXP_ID }],
    items: [{ id: ITEM_ID, raid_tier_id: TIER_ID }],
  }
}

function request(body: unknown) {
  return new Request('http://localhost/api/loot-history/bulk', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

const lootHistoryInserts = (calls: Call[]) => calls.filter(c => c.table === 'loot_history' && c.insertPayload)
const lootItemsLookups = (calls: Call[]) => calls.filter(c => c.table === 'loot_items')

describe('POST /api/loot-history/bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID }, error: null } as never)
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as never)
    vi.mocked(routeRecordsToTeamEvents).mockImplementation(async (_s, _g, records) => records)
  })

  it('GH #294: a valid item insert payload carries the server raid_tier_id and expansion_id even when the request sends a different tier or null', async () => {
    const { client, calls } = makeClient(singleItemFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      items: [{ loot_item_id: ITEM_ID, raid_tier_id: null, awarded_date: '2026-09-20', character_id: CHARACTER_ID, character_name: 'Thrall' }],
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.successCount).toBe(1)
    const insert = lootHistoryInserts(calls)[0]
    expect(insert?.insertPayload?.raid_tier_id).toBe(TIER_ID)
    expect(insert?.insertPayload?.expansion_id).toBe(EXP_ID)
  })

  it('GH #294: two items owned under two different expansions each get their own expansion_id', async () => {
    const { client, calls } = makeClient({
      expansions: [{ id: EXP_ID, guild_id: GUILD_ID }, { id: EXP_ID_2, guild_id: GUILD_ID }],
      tiers: [{ id: TIER_ID, expansion_id: EXP_ID }, { id: TIER_ID_2, expansion_id: EXP_ID_2 }],
      items: [{ id: ITEM_ID, raid_tier_id: TIER_ID }, { id: ITEM_ID_2, raid_tier_id: TIER_ID_2 }],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      items: [
        { loot_item_id: ITEM_ID, character_id: CHARACTER_ID, character_name: 'Thrall' },
        { loot_item_id: ITEM_ID_2, character_id: CHARACTER_ID, character_name: 'Thrall' },
      ],
    }))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.successCount).toBe(2)

    const inserts = lootHistoryInserts(calls)
    expect(inserts[0]?.insertPayload?.expansion_id).toBe(EXP_ID)
    expect(inserts[1]?.insertPayload?.expansion_id).toBe(EXP_ID_2)
  })

  it('GH #294: one foreign loot_item_id among valid ones returns 400, lists it in invalid_loot_item_ids, writes nothing', async () => {
    const { client, calls } = makeClient(singleItemFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      items: [
        { loot_item_id: ITEM_ID, character_id: CHARACTER_ID, character_name: 'Thrall' },
        { loot_item_id: FOREIGN_ITEM_ID, character_id: CHARACTER_ID, character_name: 'Jaina' },
      ],
    }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.invalid_loot_item_ids).toEqual([FOREIGN_ITEM_ID])
    // OD-3 exact user-approved copy — the message never interpolates ids.
    expect(body.error).toBe("Some loot items aren't in this guild's loot tables. Refresh the page and try again.")
    expect(lootHistoryInserts(calls)).toHaveLength(0)
    expect(routeRecordsToTeamEvents).not.toHaveBeenCalled()
  })

  it('GH #294: an item without a string loot_item_id returns 400 with invalid_item_indexes and writes nothing', async () => {
    const { client, calls } = makeClient(singleItemFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      items: [
        { loot_item_id: ITEM_ID, character_id: CHARACTER_ID, character_name: 'Thrall' },
        { character_id: CHARACTER_ID, character_name: 'Jaina' },
      ],
    }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.invalid_item_indexes).toEqual([1])
    expect(lootHistoryInserts(calls)).toHaveLength(0)
  })

  it('a 23505 insert error still yields results[i].error "duplicate"', async () => {
    const fixture = singleItemFixture()
    fixture.duplicateLootItemIds = new Set([ITEM_ID])
    const { client } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      items: [{ loot_item_id: ITEM_ID, character_id: CHARACTER_ID, character_name: 'Thrall' }],
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.results[0]).toEqual({ index: 0, success: false, error: 'duplicate' })
    expect(body.successCount).toBe(0)
    expect(body.failedCount).toBe(1)
  })

  it('blp_enabled with a raid_event_id still schedules recomputeBlpForItems', async () => {
    const fixture = singleItemFixture()
    fixture.blpEnabled = true
    const { client } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      items: [{ loot_item_id: ITEM_ID, raid_event_id: RAID_EVENT_ID, character_id: CHARACTER_ID, character_name: 'Thrall' }],
    }))
    expect(res.status).toBe(200)
    expect(recomputeBlpForItems).toHaveBeenCalledWith(expect.anything(), GUILD_ID, [ITEM_ID])
  })

  it('a raid_event_id rewritten by routeRecordsToTeamEvents reaches the insert payload', async () => {
    const REWRITTEN_EVENT_ID = 'aaaaaaaa-0000-0000-0000-00000000000c'
    vi.mocked(routeRecordsToTeamEvents).mockImplementation(async (_s, _g, records) => {
      const items = records as Array<{ raid_event_id?: string | null }>
      items[0].raid_event_id = REWRITTEN_EVENT_ID
      return records
    })
    const { client, calls } = makeClient(singleItemFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      items: [{ loot_item_id: ITEM_ID, raid_event_id: RAID_EVENT_ID, character_id: CHARACTER_ID, character_name: 'Thrall' }],
    }))
    expect(res.status).toBe(200)

    const insert = lootHistoryInserts(calls)[0]
    expect(insert?.insertPayload?.raid_event_id).toBe(REWRITTEN_EVENT_ID)
  })

  it('a caller without manage_loot gets 403 before any loot_items query', async () => {
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: false, error: 'Insufficient permissions' } as never)
    const { client, calls } = makeClient(singleItemFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      items: [{ loot_item_id: ITEM_ID, character_id: CHARACTER_ID, character_name: 'Thrall' }],
    }))
    expect(res.status).toBe(403)
    expect(lootItemsLookups(calls)).toHaveLength(0)
  })
})
