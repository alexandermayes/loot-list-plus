// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, PATCH, DELETE } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'
import { recomputeBlpForItems } from '@/utils/blp/recompute'
import { routeRecordsToTeamEvents } from '@/utils/raid-events/team-routing'
import { logAudit } from '@/utils/audit/log'
import { lockAwardedSlots, releaseSlotLocksForAward } from '@/lib/loot/slot-locks'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))
vi.mock('@/utils/audit/log', () => ({ logAudit: vi.fn() }))
vi.mock('@/lib/loot/slot-locks', () => ({
  lockAwardedSlots: vi.fn(async () => 0),
  releaseSlotLocksForAward: vi.fn(async () => 0),
}))
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
const SECOND_CHARACTER_ID = 'aaaaaaaa-0000-0000-0000-000000000012'

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
  /** Set when the call went through `.delete()`, so the fake can tell the
   * DELETE's pre-read select from the delete itself. */
  deleted?: boolean
}

type DeleteRow = {
  id: string
  loot_item_id: string | null
  character_id: string | null
  character_name: string | null
  raid_event_id: string | null
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
  /** FIX-01: rows the DELETE pre-read returns, filtered by the recorded id (in)
   * and raid_event_id (eq) filters. */
  deleteRows?: DeleteRow[]
  /** FIX-01: the DELETE pre-read fails. */
  deleteReadError?: boolean
  /** FIX-01: the delete itself fails. */
  deleteError?: boolean
  /** FIX-01: PATCH's before-read fails with this error (PGRST116 is the no-row code). */
  patchBeforeError?: { code?: string; message: string }
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
        delete: () => { call.deleted = true; return builder },
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
            if (fixture.patchBeforeError) return Promise.resolve({ data: null, error: fixture.patchBeforeError })
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
          if (table === 'loot_history') {
            if (call.deleted) {
              return Promise.resolve({ data: null, error: fixture.deleteError ? { message: 'delete boom' } : null }).then(resolve)
            }
            // The DELETE pre-read select.
            if (fixture.deleteReadError) {
              return Promise.resolve({ data: null, error: { message: 'read boom' } }).then(resolve)
            }
            const idFilter = call.filters.find(([col]) => col === 'id')?.[1] as string[] | undefined
            const raidEventFilter = call.filters.find(([col]) => col === 'raid_event_id')?.[1]
            const rows = (fixture.deleteRows ?? []).filter(r =>
              (!idFilter || idFilter.includes(r.id)) && (raidEventFilter === undefined || r.raid_event_id === raidEventFilter)
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

function deleteRequest(body: unknown) {
  return new Request('http://localhost/api/loot-history/bulk', {
    method: 'DELETE',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof DELETE>[0]
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

  // D-15, DISC-07: a Discovery award is keyed on the need row. D-22 holds real
  // need rankings in Phase 3, so this fixture stands past the hold; 03-15 proves
  // the BLP SQL, this proves the route hands it the need id.
  it('need row (past the D-22 hold): the insert is keyed on the need row with no awarded_item_id and BLP recompute gets the need id', async () => {
    const NEED_ROW_ID = 'aaaaaaaa-0000-0000-0000-000000000020'
    const needRow = {
      id: NEED_ROW_ID,
      name: 'Trinket, Healing',
      kind: 'need',
      need_key: 'trinket.healing',
      wowhead_id: null,
      boss_name: 'Needs',
      item_slot: 'Trinket',
      classification: 'Reserved',
      allocation_cost: 3,
      raid_tier_id: TIER_ID,
    }
    const fixture = singleItemFixture()
    fixture.items = [needRow]
    fixture.blpEnabled = true
    const { client, calls } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      items: [{ loot_item_id: NEED_ROW_ID, raid_event_id: RAID_EVENT_ID, character_id: CHARACTER_ID, character_name: 'Thrall' }],
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.successCount).toBe(1)
    const insert = lootHistoryInserts(calls)[0]
    expect(insert?.insertPayload?.loot_item_id).toBe(NEED_ROW_ID)
    expect(insert?.insertPayload?.raid_tier_id).toBe(TIER_ID)
    expect(insert?.insertPayload).not.toHaveProperty('awarded_item_id')
    expect(recomputeBlpForItems).toHaveBeenCalledWith(expect.anything(), GUILD_ID, [NEED_ROW_ID])
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

describe('DELETE /api/loot-history/bulk (FIX-01)', () => {
  const HIST_ID = 'hist-1'

  beforeEach(() => {
    vi.clearAllMocks()
    // clearAllMocks keeps implementations; drop the pending promise the await test installs.
    vi.mocked(recomputeBlpForItems).mockReset()
    vi.mocked(recomputeBlpForItems).mockResolvedValue(undefined)
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID }, error: null } as never)
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as never)
  })

  const linkedRow = (extra: Partial<DeleteRow> = {}): DeleteRow => ({
    id: HIST_ID,
    loot_item_id: ITEM_ID,
    character_id: CHARACTER_ID,
    character_name: 'Thrall',
    raid_event_id: RAID_EVENT_ID,
    ...extra,
  })

  it('deleting one linked award by id answers 200 and recomputes BLP once for that item', async () => {
    const { client } = makeClient({ ...singleItemFixture(), deleteRows: [linkedRow()] })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await DELETE(deleteRequest({ guild_id: GUILD_ID, ids: [HIST_ID] }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(recomputeBlpForItems).toHaveBeenCalledTimes(1)
    expect(recomputeBlpForItems).toHaveBeenCalledWith(client, GUILD_ID, [ITEM_ID])
  })

  it('the response waits for the recompute (it is awaited, not deferred with after())', async () => {
    const { client } = makeClient({ ...singleItemFixture(), deleteRows: [linkedRow()] })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    let release: () => void = () => {}
    vi.mocked(recomputeBlpForItems).mockImplementation(() => new Promise<void>((resolve) => { release = resolve }))

    let settled = false
    const pending = DELETE(deleteRequest({ guild_id: GUILD_ID, ids: [HIST_ID] })).then((res) => {
      settled = true
      return res
    })
    // Flush a macrotask so every awaited step that does not depend on the recompute has run.
    await new Promise((r) => setTimeout(r, 0))

    expect(recomputeBlpForItems).toHaveBeenCalledTimes(1)
    expect(settled).toBe(false)

    release()
    const res = await pending
    expect(settled).toBe(true)
    expect(res.status).toBe(200)
  })

  const nightRows = (): DeleteRow[] => [
    linkedRow({ id: 'hist-1', loot_item_id: ITEM_ID }),
    linkedRow({ id: 'hist-2', loot_item_id: ITEM_ID }),
    linkedRow({ id: 'hist-3', loot_item_id: ITEM_ID_2 }),
  ]

  it('E-03 deleting a whole night by raid_event_id recomputes each distinct item once, in any order', async () => {
    const { client } = makeClient({ ...singleItemFixture(), deleteRows: nightRows() })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await DELETE(deleteRequest({ guild_id: GUILD_ID, raid_event_id: RAID_EVENT_ID }))

    expect(res.status).toBe(200)
    expect(recomputeBlpForItems).toHaveBeenCalledTimes(1)
    const [passedClient, passedGuild, passedIds] = vi.mocked(recomputeBlpForItems).mock.calls[0]
    expect(passedClient).toBe(client)
    expect(passedGuild).toBe(GUILD_ID)
    expect(passedIds).toHaveLength(2)
    expect(new Set(passedIds)).toEqual(new Set([ITEM_ID, ITEM_ID_2]))
  })

  it('E-03 the by-night recompute is awaited before the response returns', async () => {
    const { client } = makeClient({ ...singleItemFixture(), deleteRows: nightRows() })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    let release: () => void = () => {}
    vi.mocked(recomputeBlpForItems).mockImplementation(() => new Promise<void>((resolve) => { release = resolve }))

    let settled = false
    const pending = DELETE(deleteRequest({ guild_id: GUILD_ID, raid_event_id: RAID_EVENT_ID })).then((res) => {
      settled = true
      return res
    })
    await new Promise((r) => setTimeout(r, 0))

    expect(recomputeBlpForItems).toHaveBeenCalledTimes(1)
    expect(settled).toBe(false)

    release()
    expect((await pending).status).toBe(200)
  })

  it('E-01 deleting two awards of the same item in one request recomputes that item once', async () => {
    const rows = [linkedRow({ id: 'hist-1' }), linkedRow({ id: 'hist-2' })]
    const { client } = makeClient({ ...singleItemFixture(), deleteRows: rows })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await DELETE(deleteRequest({ guild_id: GUILD_ID, ids: ['hist-1', 'hist-2'] }))

    expect(res.status).toBe(200)
    expect(recomputeBlpForItems).toHaveBeenCalledTimes(1)
    expect(recomputeBlpForItems).toHaveBeenCalledWith(client, GUILD_ID, [ITEM_ID])
  })

  it('E-02 ids that match no rows answer 200 and make no recompute call', async () => {
    const { client } = makeClient({ ...singleItemFixture(), deleteRows: [] })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await DELETE(deleteRequest({ guild_id: GUILD_ID, ids: ['missing'] }))

    expect(res.status).toBe(200)
    expect(recomputeBlpForItems).not.toHaveBeenCalled()
  })

  it('E-02 a raid night with no awards answers 200 and makes no recompute call', async () => {
    const { client } = makeClient({ ...singleItemFixture(), deleteRows: [] })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await DELETE(deleteRequest({ guild_id: GUILD_ID, raid_event_id: RAID_EVENT_ID }))

    expect(res.status).toBe(200)
    expect(recomputeBlpForItems).not.toHaveBeenCalled()
  })

  it('E-02 rows with a null raid_event_id or a null loot_item_id answer 200 and make no recompute call', async () => {
    const rows = [
      linkedRow({ id: 'hist-1', raid_event_id: null }),
      linkedRow({ id: 'hist-2', loot_item_id: null }),
    ]
    const { client } = makeClient({ ...singleItemFixture(), deleteRows: rows })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await DELETE(deleteRequest({ guild_id: GUILD_ID, ids: ['hist-1', 'hist-2'] }))

    expect(res.status).toBe(200)
    expect(recomputeBlpForItems).not.toHaveBeenCalled()
  })

  it.each([
    ['ids', { ids: [HIST_ID] }],
    ['raid_event_id', { raid_event_id: RAID_EVENT_ID }],
  ])('a failed pre-read (%s) answers 500, deletes nothing and recomputes nothing', async (_branch, selector) => {
    const { client, calls } = makeClient({ ...singleItemFixture(), deleteRows: [linkedRow()], deleteReadError: true })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await DELETE(deleteRequest({ guild_id: GUILD_ID, ...selector }))

    expect(res.status).toBe(500)
    expect(calls.some((c) => c.deleted)).toBe(false)
    expect(recomputeBlpForItems).not.toHaveBeenCalled()
    expect(logAudit).not.toHaveBeenCalled()
  })

  it.each([
    ['ids', { ids: [HIST_ID] }],
    ['raid_event_id', { raid_event_id: RAID_EVENT_ID }],
  ])('a failed delete (%s) answers 500 and recomputes nothing', async (_branch, selector) => {
    const { client } = makeClient({ ...singleItemFixture(), deleteRows: [linkedRow()], deleteError: true })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await DELETE(deleteRequest({ guild_id: GUILD_ID, ...selector }))

    expect(res.status).toBe(500)
    expect(recomputeBlpForItems).not.toHaveBeenCalled()
  })

  it.each([
    ['ids', { ids: [HIST_ID] }],
    ['raid_event_id', { raid_event_id: RAID_EVENT_ID }],
  ])('every loot_history call on the %s branch is scoped to the request guild', async (_branch, selector) => {
    const { client, calls } = makeClient({ ...singleItemFixture(), deleteRows: [linkedRow()] })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    await DELETE(deleteRequest({ guild_id: GUILD_ID, ...selector }))

    const lootHistoryCalls = calls.filter((c) => c.table === 'loot_history')
    // One pre-read and one delete.
    expect(lootHistoryCalls).toHaveLength(2)
    expect(lootHistoryCalls.some((c) => c.deleted)).toBe(true)
    for (const c of lootHistoryCalls) {
      expect(c.filters).toContainEqual(['guild_id', GUILD_ID])
    }
  })
})

describe('PATCH /api/loot-history/bulk BLP recompute (FIX-01)', () => {
  const RECORD_ID = 'aaaaaaaa-0000-0000-0000-000000000010'
  const linkedBefore = { character_id: CHARACTER_ID, character_name: 'Thrall', notes: null, loot_item_id: ITEM_ID, raid_event_id: RAID_EVENT_ID, award_copy: 1 }

  function patchFixture(extra: Partial<Fixture> = {}): Fixture {
    const base = singleItemFixture()
    return {
      ...base,
      memberships: [...(base.memberships ?? []), { character_id: SECOND_CHARACTER_ID, guild_id: GUILD_ID, is_active: true }],
      patchBefore: linkedBefore,
      ...extra,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(recomputeBlpForItems).mockReset()
    vi.mocked(recomputeBlpForItems).mockResolvedValue(undefined)
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID }, error: null } as never)
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as never)
  })

  it('moving a linked award to another raider recomputes BLP for that item', async () => {
    const { client } = makeClient(patchFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await PATCH(patchRequest({ guild_id: GUILD_ID, id: RECORD_ID, updates: { character_id: SECOND_CHARACTER_ID } }))

    expect(res.status).toBe(200)
    expect(recomputeBlpForItems).toHaveBeenCalledTimes(1)
    expect(recomputeBlpForItems).toHaveBeenCalledWith(client, GUILD_ID, [ITEM_ID])
  })

  it('the reassign response waits for the recompute', async () => {
    const { client } = makeClient(patchFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    let release: () => void = () => {}
    vi.mocked(recomputeBlpForItems).mockImplementation(() => new Promise<void>((resolve) => { release = resolve }))

    let settled = false
    const pending = PATCH(patchRequest({ guild_id: GUILD_ID, id: RECORD_ID, updates: { character_id: SECOND_CHARACTER_ID } })).then((res) => {
      settled = true
      return res
    })
    await new Promise((r) => setTimeout(r, 0))

    expect(recomputeBlpForItems).toHaveBeenCalledTimes(1)
    expect(settled).toBe(false)

    release()
    expect((await pending).status).toBe(200)
  })

  it('unlinking a linked award (character_id null) recomputes BLP for that item', async () => {
    const { client } = makeClient(patchFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await PATCH(patchRequest({ guild_id: GUILD_ID, id: RECORD_ID, updates: { character_id: null } }))

    expect(res.status).toBe(200)
    expect(recomputeBlpForItems).toHaveBeenCalledTimes(1)
    expect(recomputeBlpForItems).toHaveBeenCalledWith(client, GUILD_ID, [ITEM_ID])
  })

  it.each([
    ['the same character_id (E-01)', { character_id: CHARACTER_ID }],
    ['notes only', { notes: 'n' }],
    ['character_name only', { character_name: 'Jaina' }],
  ])('%s makes no recompute call', async (_label, updates) => {
    const { client } = makeClient(patchFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await PATCH(patchRequest({ guild_id: GUILD_ID, id: RECORD_ID, updates }))

    expect(res.status).toBe(200)
    expect(recomputeBlpForItems).not.toHaveBeenCalled()
  })

  it('a row with a null raid_event_id makes no recompute call', async () => {
    const { client } = makeClient(patchFixture({ patchBefore: { ...linkedBefore, raid_event_id: null } }))
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await PATCH(patchRequest({ guild_id: GUILD_ID, id: RECORD_ID, updates: { character_id: SECOND_CHARACTER_ID } }))

    expect(res.status).toBe(200)
    expect(recomputeBlpForItems).not.toHaveBeenCalled()
  })

  it('a row with a null loot_item_id makes no recompute call', async () => {
    const { client } = makeClient(patchFixture({ patchBefore: { ...linkedBefore, loot_item_id: null } }))
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await PATCH(patchRequest({ guild_id: GUILD_ID, id: RECORD_ID, updates: { character_id: SECOND_CHARACTER_ID } }))

    expect(res.status).toBe(200)
    expect(recomputeBlpForItems).not.toHaveBeenCalled()
  })

  it('a failed before-read answers 500, updates nothing and recomputes nothing', async () => {
    const { client, calls } = makeClient(patchFixture({ patchBeforeError: { code: 'XX000', message: 'read boom' } }))
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await PATCH(patchRequest({ guild_id: GUILD_ID, id: RECORD_ID, updates: { character_id: SECOND_CHARACTER_ID } }))

    expect(res.status).toBe(500)
    expect(lootHistoryUpdates(calls)).toHaveLength(0)
    expect(recomputeBlpForItems).not.toHaveBeenCalled()
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('a before-read with no row (PGRST116) keeps today\'s behaviour: update attempted, 200, no recompute', async () => {
    const { client, calls } = makeClient(patchFixture({ patchBeforeError: { code: 'PGRST116', message: 'no rows' } }))
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await PATCH(patchRequest({ guild_id: GUILD_ID, id: RECORD_ID, updates: { character_id: SECOND_CHARACTER_ID } }))

    expect(res.status).toBe(200)
    expect(lootHistoryUpdates(calls)).toHaveLength(1)
    expect(recomputeBlpForItems).not.toHaveBeenCalled()
  })

  it('a failed update answers 500 and recomputes nothing', async () => {
    const { client, calls } = makeClient(patchFixture())
    // Make the update itself fail: the fake resolves loot_history updates with no error, so wrap `then`.
    const originalFrom = client.from.bind(client)
    client.from = (table: string) => {
      const builder = originalFrom(table)
      if (table === 'loot_history') {
        const originalThen = builder.then
        builder.then = (resolve: (v: unknown) => unknown) => {
          const call = calls[calls.length - 1]
          if (call.updatePayload) return Promise.resolve({ data: null, error: { message: 'update boom' } }).then(resolve)
          return originalThen(resolve)
        }
      }
      return builder
    }
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await PATCH(patchRequest({ guild_id: GUILD_ID, id: RECORD_ID, updates: { character_id: SECOND_CHARACTER_ID } }))

    expect(res.status).toBe(500)
    expect(recomputeBlpForItems).not.toHaveBeenCalled()
  })

  it('the before-read and the update both carry the request guild filter', async () => {
    const { client, calls } = makeClient(patchFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    await PATCH(patchRequest({ guild_id: GUILD_ID, id: RECORD_ID, updates: { character_id: SECOND_CHARACTER_ID } }))

    const lootHistoryCalls = calls.filter((c) => c.table === 'loot_history' && !c.order)
    expect(lootHistoryCalls.length).toBeGreaterThanOrEqual(2)
    for (const c of lootHistoryCalls) {
      expect(c.filters).toContainEqual(['guild_id', GUILD_ID])
    }
  })
})

describe('POST /api/loot-history/bulk award receipt (FIX-04)', () => {
  const NINE_KEYS = [
    'itemRank', 'attendanceScore', 'rankModifier', 'roleBonus', 'badLuckBonus',
    'priorityBonus', 'trialPenalty', 'donationBonus', 'raiderBonus',
  ]
  const LONG_FLOAT = -1.2345678901234567e-300

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID }, error: null } as never)
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as never)
    vi.mocked(routeRecordsToTeamEvents).mockImplementation(async (_s, _g, records) => records)
  })

  const allNine = (value: number) => Object.fromEntries(NINE_KEYS.map((k) => [k, value]))

  /** A decision_context holding exactly the keys the sanitizer keeps, valid values only. */
  function contextWith(ids: string[], names: string[], value: number): Record<string, unknown> {
    return {
      outcome_type: 'score',
      was_score_winner: true,
      tied_at_top: false,
      gap_to_next: value,
      awarded_character_id: ids[0],
      winner_score: value,
      winner_components: allNine(value),
      top_candidates: [0, 1, 2].map((i) => ({
        character_id: ids[i + 1],
        player_name: names[i],
        loot_score: value,
        is_trial: false,
        is_eligible: true,
        has_received: false,
        bad_luck_bonus: value,
        components: allNine(value),
      })),
    }
  }

  /**
   * Build a context whose JSON.stringify length is exactly `target`. Seven
   * strings of 64 UTF-16 units hold the padding: U+0001 serializes as six
   * characters (+5 over a plain one) and a double quote as two (+1), so coarse
   * steps use the former and the remainder the latter.
   */
  function contextOfLength(target: number): Record<string, unknown> {
    const plain = 'a'.repeat(64)
    const baseline = JSON.stringify(contextWith(Array(4).fill(plain), Array(3).fill(plain), LONG_FLOAT)).length
    const extra = target - baseline
    const coarse = Math.floor(extra / 5)
    const fine = extra - coarse * 5
    expect(extra).toBeGreaterThanOrEqual(0)
    expect(coarse + fine).toBeLessThanOrEqual(7 * 64)
    const chars = [
      ...Array<string>(coarse).fill('\u0001'),
      ...Array<string>(fine).fill('"'),
    ]
    while (chars.length < 7 * 64) chars.push('a')
    const strings = Array.from({ length: 7 }, (_, i) => chars.slice(i * 64, (i + 1) * 64).join(''))
    const context = contextWith(strings.slice(0, 4), strings.slice(4), LONG_FLOAT)
    expect(JSON.stringify(context).length).toBe(target)
    return context
  }

  async function postWithContext(decision_context: unknown) {
    const { client } = makeClient(singleItemFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    const res = await POST(request({
      guild_id: GUILD_ID,
      items: [{ loot_item_id: ITEM_ID, character_id: CHARACTER_ID, character_name: 'Thrall', decision_context }],
    }))
    expect(res.status).toBe(200)
    const insertCall = vi.mocked(logAudit).mock.calls.map((c) => c[0]).find((c) => c.action === 'INSERT')
    return (insertCall?.newData as { decision_context: Record<string, unknown> | null }).decision_context
  }

  it('stores all nine score components for the winner and every top candidate', async () => {
    const stored = await postWithContext(contextWith(
      ['winner', 'c1', 'c2', 'c3'],
      ['Thrall', 'Jaina', 'Sylvanas'],
      1.5,
    ))

    expect(stored).not.toBeNull()
    expect(new Set(Object.keys(stored!.winner_components as object))).toEqual(new Set(NINE_KEYS))
    const candidates = stored!.top_candidates as Array<{ components: Record<string, number> }>
    expect(candidates).toHaveLength(3)
    for (const candidate of candidates) {
      expect(new Set(Object.keys(candidate.components))).toEqual(new Set(NINE_KEYS))
    }
    expect((stored!.winner_components as Record<string, number>).donationBonus).toBe(1.5)
    expect((stored!.winner_components as Record<string, number>).raiderBonus).toBe(1.5)
  })

  it('a worst-case receipt (64-character ids and names, full-precision floats) is stored under the cap with no _truncated', async () => {
    const plain = 'a'.repeat(64)
    const stored = await postWithContext(contextWith(Array(4).fill(plain), Array(3).fill(plain), LONG_FLOAT))

    expect(stored).not.toHaveProperty('_truncated')
    expect(JSON.stringify(stored).length).toBeLessThan(4096)
    expect((stored!.winner_components as Record<string, number>).raiderBonus).toBe(LONG_FLOAT)
  })

  it('E-12 component values are stored exactly as sent, and non-finite or non-number values are dropped per key', async () => {
    // JSON has no NaN or Infinity: the request body turns both into null, so the
    // route sees null for them. The sanitizer drops them either way.
    const stored = await postWithContext({
      outcome_type: 'score',
      awarded_character_id: 'winner',
      winner_components: {
        donationBonus: 0.30000000000000004,
        roleBonus: 2,
        raiderBonus: Infinity,
        attendanceScore: NaN,
        itemRank: '5',
      },
      top_candidates: [],
    })

    expect(stored!.winner_components).toEqual({ donationBonus: 0.30000000000000004, roleBonus: 2 })
  })

  it.each([4095, 4096])('E-11 a sanitized receipt of exactly %i characters is stored intact', async (target) => {
    const stored = await postWithContext(contextOfLength(target))

    expect(stored).not.toHaveProperty('_truncated')
    expect(JSON.stringify(stored).length).toBe(target)
  })

  it('E-11 a sanitized receipt of exactly 4097 characters is stored as the _truncated stub', async () => {
    const context = contextOfLength(4097)
    const stored = await postWithContext(context)

    expect(stored).toEqual({
      outcome_type: 'score',
      awarded_character_id: context.awarded_character_id,
      _truncated: true,
    })
  })
})

describe('award slot locks (quick task 261028-0gx)', () => {
  const RECORD_ID = 'aaaaaaaa-0000-0000-0000-000000000010'

  function twoItemFixture(): Fixture {
    const fixture = singleItemFixture()
    fixture.items = [
      { id: ITEM_ID, raid_tier_id: TIER_ID },
      { id: ITEM_ID_2, raid_tier_id: TIER_ID },
    ]
    return fixture
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID }, error: null } as never)
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as never)
    vi.mocked(routeRecordsToTeamEvents).mockImplementation(async (_s, _g, records) => records)
  })

  it('POST locks once with every successful insert and its sanitized reason, in input order', async () => {
    const { client } = makeClient(twoItemFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      items: [
        { loot_item_id: ITEM_ID, awarded_date: '2026-09-20', character_id: CHARACTER_ID, character_name: 'Test Raider', reason: 'score' },
        { loot_item_id: ITEM_ID_2, awarded_date: '2026-09-20', character_id: CHARACTER_ID, character_name: 'Test Raider', reason: 'offspec' },
      ],
    }))

    expect(res.status).toBe(200)
    expect(lockAwardedSlots).toHaveBeenCalledTimes(1)
    expect(lockAwardedSlots).toHaveBeenCalledWith(client, GUILD_ID, [
      { lootHistoryId: 'hist-1', reason: 'score' },
      { lootHistoryId: 'hist-2', reason: 'offspec' },
    ])
  })

  it('POST does not lock when the only item failed as a duplicate', async () => {
    const fixture = singleItemFixture()
    fixture.duplicateLootItemIds = new Set([ITEM_ID])
    const { client } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      items: [{ loot_item_id: ITEM_ID, awarded_date: '2026-09-20', character_id: CHARACTER_ID, character_name: 'Test Raider' }],
    }))
    const body = await res.json()

    expect(body.failedCount).toBe(1)
    expect(lockAwardedSlots).not.toHaveBeenCalled()
  })

  it('POST response is unchanged when no lock was written', async () => {
    vi.mocked(lockAwardedSlots).mockResolvedValue(0)
    const { client } = makeClient(singleItemFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      items: [{ loot_item_id: ITEM_ID, awarded_date: '2026-09-20', character_id: CHARACTER_ID, character_name: 'Test Raider' }],
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.successCount).toBe(1)
    expect(body.failedCount).toBe(0)
    expect(lockAwardedSlots).toHaveBeenCalledWith(client, GUILD_ID, [{ lootHistoryId: 'hist-1', reason: null }])
  })

  it('PATCH releases the lock with award_reassigned when the character changes', async () => {
    const fixture = singleItemFixture()
    fixture.memberships = [{ character_id: SECOND_CHARACTER_ID, guild_id: GUILD_ID, is_active: true }]
    const { client, calls } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await PATCH(patchRequest({
      guild_id: GUILD_ID,
      id: RECORD_ID,
      updates: { character_id: SECOND_CHARACTER_ID, character_name: 'Test Other' },
    }))

    expect(res.status).toBe(200)
    expect(lootHistoryUpdates(calls)).toHaveLength(1)
    expect(releaseSlotLocksForAward).toHaveBeenCalledTimes(1)
    expect(releaseSlotLocksForAward).toHaveBeenCalledWith(client, RECORD_ID, USER_ID, 'award_reassigned')
  })

  it('PATCH with a notes-only update does not release a lock', async () => {
    const { client } = makeClient(singleItemFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await PATCH(patchRequest({
      guild_id: GUILD_ID,
      id: RECORD_ID,
      updates: { notes: 'Updated note' },
    }))

    expect(res.status).toBe(200)
    expect(releaseSlotLocksForAward).not.toHaveBeenCalled()
  })
})
