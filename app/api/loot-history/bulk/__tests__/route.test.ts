// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, PATCH } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'
import { recomputeBlpForItems } from '@/utils/blp/recompute'
import { routeRecordsToTeamEvents } from '@/utils/raid-events/team-routing'
import { logAudit } from '@/utils/audit/log'

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
const OTHER_GUILD_ID = 'bbbbbbbb-0000-0000-0000-000000000001'
const FOREIGN_RAID_EVENT_ID = 'bbbbbbbb-0000-0000-0000-000000000002'
const FOREIGN_CHARACTER_ID = 'bbbbbbbb-0000-0000-0000-000000000003'
const INACTIVE_CHARACTER_ID = 'aaaaaaaa-0000-0000-0000-00000000000f'

type ExpansionRow = { id: string; guild_id: string }
type TierRow = { id: string; expansion_id: string }
type ItemRow = { id: string; raid_tier_id: string }
type RaidEventRow = { id: string; guild_id: string }
type MembershipRow = { character_id: string; guild_id: string; is_active: boolean | null }
type Call = {
  table: string
  filters: Array<[string, unknown]>
  insertPayload?: Record<string, unknown>
  updatePayload?: Record<string, unknown>
  order?: [string, boolean]
}

interface Fixture {
  expansions: ExpansionRow[]
  tiers: TierRow[]
  items: ItemRow[]
  raidEvents?: RaidEventRow[]
  memberships?: MembershipRow[]
  blpEnabled?: boolean
  duplicateLootItemIds?: Set<string>
  patchBefore?: Record<string, unknown>
  /** FU-1 of #331, #293: highest stored award_copy per character_id, read
   * by the next_award_copy and reassign lookups (absent: none stored). */
  highestCopies?: Record<string, number>
  highestCopyError?: boolean
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
        update: (payload: Record<string, unknown>) => { call.updatePayload = payload; return builder },
        delete: () => builder,
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        order: (col: string, opts: { ascending: boolean }) => { call.order = [col, opts.ascending]; return builder },
        limit: () => builder,
        maybeSingle: () => {
          if (table === 'loot_history') {
            if (fixture.highestCopyError) return Promise.resolve({ data: null, error: { message: 'copy boom' } })
            const charId = call.filters.find(([col]) => col === 'character_id')?.[1] as string
            const highest = fixture.highestCopies?.[charId]
            return Promise.resolve({ data: highest === undefined ? null : { award_copy: highest }, error: null })
          }
          return Promise.resolve({ data: null, error: null })
        },
        single: () => {
          if (table === 'guild_settings') {
            return Promise.resolve({ data: { blp_enabled: fixture.blpEnabled ?? false }, error: null })
          }
          if (table === 'loot_history') {
            if (call.insertPayload) {
              const payload = call.insertPayload as { loot_item_id: string }
              if (fixture.duplicateLootItemIds?.has(payload.loot_item_id)) {
                return Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate key value' } })
              }
              insertCounter += 1
              return Promise.resolve({ data: { id: `hist-${insertCounter}` }, error: null })
            }
            // PATCH's before-read (no insert payload on this call).
            return Promise.resolve({
              data: fixture.patchBefore ?? { character_id: CHARACTER_ID, character_name: 'Thrall', notes: null },
              error: null,
            })
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
          if (table === 'raid_events') {
            const guildIdFilter = call.filters.find(([col]) => col === 'guild_id')?.[1]
            const idFilter = (call.filters.find(([col]) => col === 'id')?.[1] ?? []) as string[]
            const rows = (fixture.raidEvents ?? []).filter(r => r.guild_id === guildIdFilter && idFilter.includes(r.id))
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          if (table === 'character_guild_memberships') {
            const guildIdFilter = call.filters.find(([col]) => col === 'guild_id')?.[1]
            const isActiveFilter = call.filters.find(([col]) => col === 'is_active')?.[1]
            const charIdFilter = (call.filters.find(([col]) => col === 'character_id')?.[1] ?? []) as string[]
            const rows = (fixture.memberships ?? []).filter(m =>
              m.guild_id === guildIdFilter && m.is_active === isActiveFilter && charIdFilter.includes(m.character_id)
            )
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
    raidEvents: [{ id: RAID_EVENT_ID, guild_id: GUILD_ID }],
    memberships: [{ character_id: CHARACTER_ID, guild_id: GUILD_ID, is_active: true }],
  }
}

function request(body: unknown) {
  return new Request('http://localhost/api/loot-history/bulk', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

function patchRequest(body: unknown) {
  return new Request('http://localhost/api/loot-history/bulk', {
    method: 'PATCH',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PATCH>[0]
}

const lootHistoryInserts = (calls: Call[]) => calls.filter(c => c.table === 'loot_history' && c.insertPayload)
const lootHistoryUpdates = (calls: Call[]) => calls.filter(c => c.table === 'loot_history' && c.updatePayload)
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
      memberships: [{ character_id: CHARACTER_ID, guild_id: GUILD_ID, is_active: true }],
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

  it('a 23505 insert error still yields results[i].error "duplicate" (an unlinked item gets no next_award_copy)', async () => {
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
    expect(calls.filter(c => c.table === 'raid_events')).toHaveLength(0)
    expect(calls.filter(c => c.table === 'character_guild_memberships')).toHaveLength(0)
  })

  describe('GH #296: raid event and raider guild scoping', () => {
    it('a valid raid_event_id and an active character_id return 200, with the insert payload carrying exactly those ids', async () => {
      const { client, calls } = makeClient(singleItemFixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({
        guild_id: GUILD_ID,
        items: [{ loot_item_id: ITEM_ID, raid_event_id: RAID_EVENT_ID, character_id: CHARACTER_ID, character_name: 'Thrall' }],
      }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.successCount).toBe(1)
      const insert = lootHistoryInserts(calls)[0]
      expect(insert?.insertPayload?.raid_event_id).toBe(RAID_EVENT_ID)
      expect(insert?.insertPayload?.character_id).toBe(CHARACTER_ID)
    })

    it('a raid_event_id belonging to another guild returns 400 with invalid_raid_event_ids, C-1, no inserts, and routing never called', async () => {
      const fixture = singleItemFixture()
      fixture.raidEvents = [{ id: FOREIGN_RAID_EVENT_ID, guild_id: OTHER_GUILD_ID }]
      const { client, calls } = makeClient(fixture)
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({
        guild_id: GUILD_ID,
        items: [{ loot_item_id: ITEM_ID, raid_event_id: FOREIGN_RAID_EVENT_ID, character_id: CHARACTER_ID, character_name: 'Thrall' }],
      }))
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.invalid_raid_event_ids).toEqual([FOREIGN_RAID_EVENT_ID])
      expect(body.invalid_character_ids).toEqual([])
      expect(body.error).toBe("Some awards are linked to a raid that isn't in this guild. Refresh the page and try again.")
      expect(lootHistoryInserts(calls)).toHaveLength(0)
      expect(routeRecordsToTeamEvents).not.toHaveBeenCalled()
    })

    it('a character_id whose only membership is in another guild returns 400 with invalid_character_ids and C-2', async () => {
      const fixture = singleItemFixture()
      fixture.memberships = [{ character_id: FOREIGN_CHARACTER_ID, guild_id: OTHER_GUILD_ID, is_active: true }]
      const { client, calls } = makeClient(fixture)
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({
        guild_id: GUILD_ID,
        items: [{ loot_item_id: ITEM_ID, character_id: FOREIGN_CHARACTER_ID, character_name: 'Jaina' }],
      }))
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.invalid_character_ids).toEqual([FOREIGN_CHARACTER_ID])
      expect(body.error).toBe("Some raiders aren't active members of this guild. Check the roster, then try again.")
      expect(lootHistoryInserts(calls)).toHaveLength(0)
      expect(routeRecordsToTeamEvents).not.toHaveBeenCalled()
    })

    it('a character_id with an inactive membership in this guild returns 400 with invalid_character_ids', async () => {
      const fixture = singleItemFixture()
      fixture.memberships = [{ character_id: INACTIVE_CHARACTER_ID, guild_id: GUILD_ID, is_active: false }]
      const { client } = makeClient(fixture)
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({
        guild_id: GUILD_ID,
        items: [{ loot_item_id: ITEM_ID, character_id: INACTIVE_CHARACTER_ID, character_name: 'Jaina' }],
      }))
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.invalid_character_ids).toEqual([INACTIVE_CHARACTER_ID])
    })

    it('both a foreign raid event and a foreign character return 400 with C-3 and both arrays populated', async () => {
      const fixture = singleItemFixture()
      fixture.raidEvents = [{ id: FOREIGN_RAID_EVENT_ID, guild_id: OTHER_GUILD_ID }]
      fixture.memberships = [{ character_id: FOREIGN_CHARACTER_ID, guild_id: OTHER_GUILD_ID, is_active: true }]
      const { client } = makeClient(fixture)
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({
        guild_id: GUILD_ID,
        items: [{ loot_item_id: ITEM_ID, raid_event_id: FOREIGN_RAID_EVENT_ID, character_id: FOREIGN_CHARACTER_ID, character_name: 'Jaina' }],
      }))
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.invalid_raid_event_ids).toEqual([FOREIGN_RAID_EVENT_ID])
      expect(body.invalid_character_ids).toEqual([FOREIGN_CHARACTER_ID])
      expect(body.error).toBe("Some awards are linked to a raid or raider that isn't in this guild. Refresh the page, check the roster, then try again.")
    })

    it('null raid_event_id and null character_id plus character_name return 200 with no raid_events or membership query, and the payload has raid_event_id null and no character_id key', async () => {
      const { client, calls } = makeClient(singleItemFixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({
        guild_id: GUILD_ID,
        items: [{ loot_item_id: ITEM_ID, raid_event_id: null, character_id: null, character_name: 'Jaina' }],
      }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.successCount).toBe(1)
      expect(calls.filter(c => c.table === 'raid_events')).toHaveLength(0)
      expect(calls.filter(c => c.table === 'character_guild_memberships')).toHaveLength(0)
      const insert = lootHistoryInserts(calls)[0]
      expect(insert?.insertPayload?.raid_event_id).toBeNull()
      expect('character_id' in (insert?.insertPayload ?? {})).toBe(false)
    })

    it('the Gargul unmatched shape (valid raid_event_id, character_name only, no character_id key) returns 200', async () => {
      const { client, calls } = makeClient(singleItemFixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({
        guild_id: GUILD_ID,
        items: [{ loot_item_id: ITEM_ID, raid_event_id: RAID_EVENT_ID, character_name: 'Unmatched Raider' }],
      }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.successCount).toBe(1)
      expect(calls.filter(c => c.table === 'character_guild_memberships')).toHaveLength(0)
    })

    it('a malformed character_id "not-a-uuid" returns 400 listing it, with no query containing it', async () => {
      const { client, calls } = makeClient(singleItemFixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({
        guild_id: GUILD_ID,
        items: [{ loot_item_id: ITEM_ID, character_id: 'not-a-uuid', character_name: 'Jaina' }],
      }))
      const body = await res.json()

      expect(res.status).toBe(400)
      expect(body.invalid_character_ids).toEqual(['not-a-uuid'])
      const membershipCall = calls.find(c => c.table === 'character_guild_memberships')
      const charIdFilter = membershipCall?.filters.find(([col]) => col === 'character_id')?.[1] as string[] | undefined
      expect(charIdFilter ?? []).not.toContain('not-a-uuid')
    })

    it('the raid_events query filters guild_id equal to GUILD_ID, and the membership query filters guild_id equal to GUILD_ID and is_active equal to true', async () => {
      const { client, calls } = makeClient(singleItemFixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({
        guild_id: GUILD_ID,
        items: [{ loot_item_id: ITEM_ID, raid_event_id: RAID_EVENT_ID, character_id: CHARACTER_ID, character_name: 'Thrall' }],
      }))
      expect(res.status).toBe(200)

      const raidEventsCall = calls.find(c => c.table === 'raid_events')
      expect(raidEventsCall?.filters).toContainEqual(['guild_id', GUILD_ID])
      const membershipCall = calls.find(c => c.table === 'character_guild_memberships')
      expect(membershipCall?.filters).toContainEqual(['guild_id', GUILD_ID])
      expect(membershipCall?.filters).toContainEqual(['is_active', true])
    })
  })
})

describe('POST /api/loot-history/bulk award copies (FU-1 of #331, #293)', () => {
  const C4 = 'Every award_copy must be a whole number from 1 to 10'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID }, error: null } as never)
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as never)
    vi.mocked(routeRecordsToTeamEvents).mockImplementation(async (_s, _g, records) => records)
  })

  const linked = (extra: Record<string, unknown> = {}) => ({
    loot_item_id: ITEM_ID,
    raid_event_id: RAID_EVENT_ID,
    character_id: CHARACTER_ID,
    character_name: 'Thrall',
    ...extra,
  })
  const insertedCopies = (calls: Call[]) => lootHistoryInserts(calls).map(c => c.insertPayload?.award_copy)

  it('B1 one item without award_copy inserts award_copy 1', async () => {
    const { client, calls } = makeClient(singleItemFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD_ID, items: [linked()] }))
    expect(res.status).toBe(200)
    expect(insertedCopies(calls)).toEqual([1])
  })

  it('B2 two items with one item, raider and night insert copies 1 and 2, both successful', async () => {
    const { client, calls } = makeClient(singleItemFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD_ID, items: [linked(), linked()] }))
    const body = await res.json()
    expect(insertedCopies(calls)).toEqual([1, 2])
    expect(body.results.map((r: { success: boolean }) => r.success)).toEqual([true, true])
  })

  it('B3 an explicit award_copy 2 inserts 2', async () => {
    const { client, calls } = makeClient(singleItemFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    await POST(request({ guild_id: GUILD_ID, items: [linked({ award_copy: 2 })] }))
    expect(insertedCopies(calls)).toEqual([2])
  })

  it('B4 an award_copy of 0, 11, 1.5 or "2" returns 400 with C-4 and invalid_award_copy_indexes, and inserts nothing', async () => {
    const { client, calls } = makeClient(singleItemFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      items: [linked({ award_copy: 0 }), linked({ award_copy: 11 }), linked({ award_copy: 1 }), linked({ award_copy: 1.5 }), linked({ award_copy: '2' }), linked({ award_copy: null })],
    }))
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe(C4)
    expect(body.invalid_award_copy_indexes).toEqual([0, 1, 3, 4])
    expect(lootHistoryInserts(calls)).toHaveLength(0)
    expect(lootItemsLookups(calls)).toHaveLength(0)
  })

  it('B5 a 23505 on a linked item returns next_award_copy from the highest stored copy, and null at 10', async () => {
    const fixture = { ...singleItemFixture(), duplicateLootItemIds: new Set([ITEM_ID]), highestCopies: { [CHARACTER_ID]: 1 } }
    const first = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(first.client as never)
    let body = await (await POST(request({ guild_id: GUILD_ID, items: [linked()] }))).json()
    expect(body.results[0]).toEqual({ index: 0, success: false, error: 'duplicate', next_award_copy: 2 })
    const lookup = first.calls.find(c => c.table === 'loot_history' && c.order)
    expect(lookup?.filters).toEqual([
      ['guild_id', GUILD_ID],
      ['loot_item_id', ITEM_ID],
      ['character_id', CHARACTER_ID],
      ['raid_event_id', RAID_EVENT_ID],
    ])
    expect(lookup?.order).toEqual(['award_copy', false])

    const capped = makeClient({ ...fixture, highestCopies: { [CHARACTER_ID]: 10 } })
    vi.mocked(createServiceRoleClient).mockReturnValue(capped.client as never)
    body = await (await POST(request({ guild_id: GUILD_ID, items: [linked()] }))).json()
    expect(body.results[0]).toEqual({ index: 0, success: false, error: 'duplicate', next_award_copy: null })

    const failed = makeClient({ ...fixture, highestCopyError: true })
    vi.mocked(createServiceRoleClient).mockReturnValue(failed.client as never)
    body = await (await POST(request({ guild_id: GUILD_ID, items: [linked()] }))).json()
    expect(body.results[0]).toEqual({ index: 0, success: false, error: 'duplicate' })
  })

  it('B6 an unlinked item with award_copy 3 inserts award_copy 1', async () => {
    const { client, calls } = makeClient(singleItemFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    await POST(request({ guild_id: GUILD_ID, items: [linked({ raid_event_id: null, award_copy: 3 })] }))
    expect(insertedCopies(calls)).toEqual([1])
  })

  it('B7 two items whose input nights are routed onto one team night are numbered 1 and 2', async () => {
    const OTHER_EVENT_ID = 'aaaaaaaa-0000-0000-0000-00000000000d'
    const TEAM_EVENT_ID = 'aaaaaaaa-0000-0000-0000-00000000000e'
    vi.mocked(routeRecordsToTeamEvents).mockImplementation(async (_s, _g, records) => {
      for (const r of records as Array<{ raid_event_id?: string | null }>) r.raid_event_id = TEAM_EVENT_ID
      return records
    })
    const fixture = singleItemFixture()
    fixture.raidEvents = [...(fixture.raidEvents ?? []), { id: OTHER_EVENT_ID, guild_id: GUILD_ID }]
    const { client, calls } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD_ID, items: [linked(), linked({ raid_event_id: OTHER_EVENT_ID })] }))
    expect(res.status).toBe(200)
    expect(lootHistoryInserts(calls).map(c => [c.insertPayload?.raid_event_id, c.insertPayload?.award_copy])).toEqual([
      [TEAM_EVENT_ID, 1],
      [TEAM_EVENT_ID, 2],
    ])
  })
})

describe('PATCH /api/loot-history/bulk', () => {
  const RECORD_ID = 'aaaaaaaa-0000-0000-0000-000000000010'

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID }, error: null } as never)
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as never)
  })

  it('a character_id of an active member of this guild returns 200, and the update payload carries that character_id', async () => {
    const { client, calls } = makeClient(singleItemFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await PATCH(patchRequest({
      guild_id: GUILD_ID,
      id: RECORD_ID,
      updates: { character_id: CHARACTER_ID, character_name: 'Thrall' },
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    const update = lootHistoryUpdates(calls)[0]
    expect(update?.updatePayload?.character_id).toBe(CHARACTER_ID)
  })

  it('a character_id whose only membership is in another guild returns 400 C-2, with no update and no audit call', async () => {
    const fixture = singleItemFixture()
    fixture.memberships = [{ character_id: FOREIGN_CHARACTER_ID, guild_id: OTHER_GUILD_ID, is_active: true }]
    const { client, calls } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await PATCH(patchRequest({
      guild_id: GUILD_ID,
      id: RECORD_ID,
      updates: { character_id: FOREIGN_CHARACTER_ID },
    }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe("Some raiders aren't active members of this guild. Check the roster, then try again.")
    expect(body.invalid_character_ids).toEqual([FOREIGN_CHARACTER_ID])
    expect(lootHistoryUpdates(calls)).toHaveLength(0)
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('an inactive member of this guild returns 400', async () => {
    const fixture = singleItemFixture()
    fixture.memberships = [{ character_id: INACTIVE_CHARACTER_ID, guild_id: GUILD_ID, is_active: false }]
    const { client } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await PATCH(patchRequest({
      guild_id: GUILD_ID,
      id: RECORD_ID,
      updates: { character_id: INACTIVE_CHARACTER_ID },
    }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.invalid_character_ids).toEqual([INACTIVE_CHARACTER_ID])
  })

  it('character_id null returns 200, makes no membership query, and the update payload has character_id null', async () => {
    const { client, calls } = makeClient(singleItemFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await PATCH(patchRequest({
      guild_id: GUILD_ID,
      id: RECORD_ID,
      updates: { character_id: null },
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(calls.filter(c => c.table === 'character_guild_memberships')).toHaveLength(0)
    const update = lootHistoryUpdates(calls)[0]
    expect(update?.updatePayload?.character_id).toBeNull()
  })

  it('only notes and character_name makes no membership query and returns 200', async () => {
    const { client, calls } = makeClient(singleItemFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await PATCH(patchRequest({
      guild_id: GUILD_ID,
      id: RECORD_ID,
      updates: { notes: 'Updated note', character_name: 'Jaina' },
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(calls.filter(c => c.table === 'character_guild_memberships')).toHaveLength(0)
  })

  it('without manage_loot gets 403 before any membership query', async () => {
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: false, error: 'Insufficient permissions' } as never)
    const { client, calls } = makeClient(singleItemFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await PATCH(patchRequest({
      guild_id: GUILD_ID,
      id: RECORD_ID,
      updates: { character_id: CHARACTER_ID },
    }))
    expect(res.status).toBe(403)
    expect(calls.filter(c => c.table === 'character_guild_memberships')).toHaveLength(0)
  })

  describe('award copies on reassign (FU-1 of #331, #293)', () => {
    const OTHER_CHARACTER_ID = 'aaaaaaaa-0000-0000-0000-000000000011'
    const linkedBefore = { character_id: CHARACTER_ID, character_name: 'Thrall', notes: null, loot_item_id: ITEM_ID, raid_event_id: RAID_EVENT_ID, award_copy: 1 }
    function reassignFixture(extra: Partial<Fixture> = {}): Fixture {
      const base = singleItemFixture()
      return {
        ...base,
        memberships: [...(base.memberships ?? []), { character_id: OTHER_CHARACTER_ID, guild_id: GUILD_ID, is_active: true }],
        patchBefore: linkedBefore,
        ...extra,
      }
    }

    it('P1 moving a linked award to a raider with no copy that night sends award_copy 1', async () => {
      const { client, calls } = makeClient(reassignFixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await PATCH(patchRequest({ guild_id: GUILD_ID, id: RECORD_ID, updates: { character_id: OTHER_CHARACTER_ID, character_name: 'Jaina' } }))
      expect(res.status).toBe(200)
      expect(lootHistoryUpdates(calls)[0]?.updatePayload).toEqual({ character_id: OTHER_CHARACTER_ID, character_name: 'Jaina', award_copy: 1 })
      const lookup = calls.find(c => c.table === 'loot_history' && c.order)
      expect(lookup?.filters).toEqual([
        ['guild_id', GUILD_ID],
        ['loot_item_id', ITEM_ID],
        ['character_id', OTHER_CHARACTER_ID],
        ['raid_event_id', RAID_EVENT_ID],
      ])
    })

    it('P2 moving it to a raider whose highest copy is 1 sends award_copy 2', async () => {
      const { client, calls } = makeClient(reassignFixture({ highestCopies: { [OTHER_CHARACTER_ID]: 1 } }))
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      await PATCH(patchRequest({ guild_id: GUILD_ID, id: RECORD_ID, updates: { character_id: OTHER_CHARACTER_ID } }))
      expect(lootHistoryUpdates(calls)[0]?.updatePayload).toEqual({ character_id: OTHER_CHARACTER_ID, award_copy: 2 })
    })

    it('P2b at the 10-copy cap, or when the lookup fails, award_copy is left out', async () => {
      for (const extra of [{ highestCopies: { [OTHER_CHARACTER_ID]: 10 } }, { highestCopyError: true }]) {
        const { client, calls } = makeClient(reassignFixture(extra))
        vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
        await PATCH(patchRequest({ guild_id: GUILD_ID, id: RECORD_ID, updates: { character_id: OTHER_CHARACTER_ID } }))
        expect(lootHistoryUpdates(calls)[0]?.updatePayload).toEqual({ character_id: OTHER_CHARACTER_ID })
      }
    })

    it('P3 a notes-only update and a same-character update send no award_copy', async () => {
      for (const updates of [{ notes: 'n' }, { character_id: CHARACTER_ID, character_name: 'Thrall' }]) {
        const { client, calls } = makeClient(reassignFixture())
        vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
        await PATCH(patchRequest({ guild_id: GUILD_ID, id: RECORD_ID, updates }))
        expect(lootHistoryUpdates(calls)[0]?.updatePayload).not.toHaveProperty('award_copy')
        expect(calls.some(c => c.table === 'loot_history' && c.order)).toBe(false)
      }
    })

    it('P4 an unlinked row sends no award_copy', async () => {
      const { client, calls } = makeClient(reassignFixture({ patchBefore: { ...linkedBefore, raid_event_id: null } }))
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      await PATCH(patchRequest({ guild_id: GUILD_ID, id: RECORD_ID, updates: { character_id: OTHER_CHARACTER_ID } }))
      expect(lootHistoryUpdates(calls)[0]?.updatePayload).toEqual({ character_id: OTHER_CHARACTER_ID })
    })

    it('the audit log keeps the same before fields as today', async () => {
      const { client } = makeClient(reassignFixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      await PATCH(patchRequest({ guild_id: GUILD_ID, id: RECORD_ID, updates: { character_id: OTHER_CHARACTER_ID } }))
      expect(vi.mocked(logAudit).mock.calls[0][0].oldData).toEqual({ character_id: CHARACTER_ID, character_name: 'Thrall', notes: null })
    })
  })
})
