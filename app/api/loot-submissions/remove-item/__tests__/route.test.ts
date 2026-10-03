// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'
import { trackApiError } from '@/utils/analytics/server'
import { toDateString } from '@/utils/date'
import { buildRemoveItemHistoryRow } from '@/lib/loot/loot-history-rows'
import { logAudit } from '@/utils/audit/log'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))
vi.mock('@/utils/audit/log', () => ({ logAudit: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), trackApiError: vi.fn() }))

const GUILD_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const SUBMISSION_ID = 'aaaaaaaa-0000-0000-0000-000000000002'
const CHARACTER_ID = 'aaaaaaaa-0000-0000-0000-000000000003'
const OWNER_USER_ID = 'aaaaaaaa-0000-0000-0000-000000000004'
const OFFICER_USER_ID = 'aaaaaaaa-0000-0000-0000-000000000005'
const NON_OWNER_USER_ID = 'aaaaaaaa-0000-0000-0000-000000000006'
const ITEM_ID = 'aaaaaaaa-0000-0000-0000-000000000007'
const TIER_ID = 'aaaaaaaa-0000-0000-0000-000000000008'
const EXP_ID = 'aaaaaaaa-0000-0000-0000-000000000009'
const TIER_ID_2 = 'aaaaaaaa-0000-0000-0000-00000000000a'
const EXP_ID_2 = 'aaaaaaaa-0000-0000-0000-00000000000b'
const FOREIGN_ITEM_ID = 'aaaaaaaa-0000-0000-0000-00000000000c'

type ExpansionRow = { id: string; guild_id: string }
type TierRow = { id: string; expansion_id: string }
type ItemRow = { id: string; raid_tier_id: string }
type ItemDetail = { id: string; raid_tier_id: string; name: string; wowhead_id: number }
type SubmissionItemRow = { id: string; rank: number; slot: string; loot_item_id: string; removed_at: string | null }
type Call = { table: string; filters: Array<[string, unknown]>; insertPayload?: Record<string, unknown>; updatePayload?: Record<string, unknown> }

interface Fixture {
  submission?: { id: string; guild_id: string; character_id: string; status: string; expansion_id: string } | null
  character?: { id: string; user_id: string; name: string } | null
  itemRows: SubmissionItemRow[]
  expansions: ExpansionRow[]
  tiers: TierRow[]
  items: ItemRow[]
  itemDetails: ItemDetail[]
  restoreUpdateError?: { message: string; code?: string } | null
  removeUpdateError?: { message: string } | null
  historyInsertError?: { message: string } | null
}

/**
 * Recording fake client. Supports loot_submissions and characters single(),
 * loot_submission_items select (then) and update chained with eq/is/in, the
 * expansions -> raid_tiers -> loot_items sequence used by
 * resolveGuildLootItemIds, the loot_items name lookup via single(), and a
 * loot_history insert whose result can be configured to fail.
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
        insert: (payload: Record<string, unknown>) => { call.insertPayload = payload; return builder },
        update: (payload: Record<string, unknown>) => { call.updatePayload = payload; return builder },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        is: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        single: () => {
          if (table === 'loot_submissions') {
            return Promise.resolve(
              fixture.submission !== undefined && fixture.submission !== null
                ? { data: fixture.submission, error: null }
                : { data: null, error: { message: 'not found' } }
            )
          }
          if (table === 'characters') {
            return Promise.resolve({ data: fixture.character ?? null, error: null })
          }
          if (table === 'loot_items') {
            const idFilter = call.filters.find(([col]) => col === 'id')?.[1] as string | undefined
            const tierFilter = call.filters.find(([col]) => col === 'raid_tier_id')?.[1] as string | undefined
            const detail = fixture.itemDetails.find(d => d.id === idFilter && d.raid_tier_id === tierFilter)
            return Promise.resolve({ data: detail ? { id: detail.id, name: detail.name, wowhead_id: detail.wowhead_id } : null, error: null })
          }
          return Promise.resolve({ data: null, error: null })
        },
        then: (resolve: (v: unknown) => unknown) => {
          if (table === 'loot_submission_items') {
            if (call.updatePayload) {
              // A removal sets removed_at to a timestamp; a restore clears it.
              const isRemovalUpdate = call.updatePayload.removed_at !== null
              const error = isRemovalUpdate ? (fixture.removeUpdateError ?? null) : (fixture.restoreUpdateError ?? null)
              return Promise.resolve({ error }).then(resolve)
            }
            return Promise.resolve({ data: fixture.itemRows, error: null }).then(resolve)
          }
          if (table === 'expansions') {
            const guildIdFilter = call.filters.find(([col]) => col === 'guild_id')?.[1]
            const rows = fixture.expansions.filter(e => e.guild_id === guildIdFilter)
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          if (table === 'raid_tiers') {
            const expansionIdsFilter = (call.filters.find(([col]) => col === 'expansion_id')?.[1] ?? []) as string[]
            const rows = fixture.tiers.filter(t => expansionIdsFilter.includes(t.expansion_id))
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          if (table === 'loot_items') {
            const tierIdsFilter = (call.filters.find(([col]) => col === 'raid_tier_id')?.[1] ?? []) as string[]
            const idFilter = (call.filters.find(([col]) => col === 'id')?.[1] ?? []) as string[]
            const rows = fixture.items.filter(item => tierIdsFilter.includes(item.raid_tier_id) && idFilter.includes(item.id))
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          if (table === 'loot_history') {
            return Promise.resolve({ error: fixture.historyInsertError ?? null }).then(resolve)
          }
          return Promise.resolve({ data: null, error: null }).then(resolve)
        },
      }
      return builder
    },
  }
  return { client, calls }
}

function baseFixture(): Fixture {
  return {
    submission: { id: SUBMISSION_ID, guild_id: GUILD_ID, character_id: CHARACTER_ID, status: 'approved', expansion_id: EXP_ID },
    character: { id: CHARACTER_ID, user_id: OWNER_USER_ID, name: 'Thrall' },
    itemRows: [{ id: 'row-1', rank: 1, slot: 'main-hand', loot_item_id: ITEM_ID, removed_at: null }],
    expansions: [{ id: EXP_ID, guild_id: GUILD_ID }],
    tiers: [{ id: TIER_ID, expansion_id: EXP_ID }],
    items: [{ id: ITEM_ID, raid_tier_id: TIER_ID }],
    itemDetails: [{ id: ITEM_ID, raid_tier_id: TIER_ID, name: 'Sulfuras', wowhead_id: 17182 }],
  }
}

function request(body: unknown) {
  return new Request('http://localhost/api/loot-submissions/remove-item', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

const lootHistoryInserts = (calls: Call[]) => calls.filter(c => c.table === 'loot_history' && c.insertPayload)
const submissionItemUpdates = (calls: Call[]) => calls.filter(c => c.table === 'loot_submission_items' && c.updatePayload)
const lootItemsCalls = (calls: Call[]) => calls.filter(c => c.table === 'loot_items')

describe('POST /api/loot-submissions/remove-item', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: OWNER_USER_ID }, error: null } as never)
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as never)
  })

  it('GH #297: already_obtained for an item the guild owns inserts a typed row deep-equal to buildRemoveItemHistoryRow, and the response has history_recorded true', async () => {
    const { client, calls } = makeClient(baseFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      submission_id: SUBMISSION_ID,
      loot_item_id: ITEM_ID,
      already_obtained: true,
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.history_recorded).toBe(true)

    const expected = buildRemoveItemHistoryRow({
      guildId: GUILD_ID,
      item: { id: ITEM_ID, raid_tier_id: TIER_ID, expansion_id: EXP_ID },
      characterId: CHARACTER_ID,
      characterName: 'Thrall',
      awardedBy: OWNER_USER_ID,
      reason: null,
      today: toDateString(new Date()),
    })
    const insert = lootHistoryInserts(calls)[0]
    expect(insert?.insertPayload).toEqual(expected)
    expect(insert?.insertPayload?.raid_tier_id).toBe(TIER_ID)
    expect(insert?.insertPayload?.expansion_id).toBe(EXP_ID)
  })

  it("GH #297: the item's tier under a second guild expansion sets expansion_id from the item's own tier, not the submission's", async () => {
    const fixture = baseFixture()
    fixture.tiers = [{ id: TIER_ID, expansion_id: EXP_ID }, { id: TIER_ID_2, expansion_id: EXP_ID_2 }]
    fixture.expansions = [{ id: EXP_ID, guild_id: GUILD_ID }, { id: EXP_ID_2, guild_id: GUILD_ID }]
    fixture.items = [{ id: ITEM_ID, raid_tier_id: TIER_ID_2 }]
    fixture.itemDetails = [{ id: ITEM_ID, raid_tier_id: TIER_ID_2, name: 'Sulfuras', wowhead_id: 17182 }]
    const { client, calls } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      submission_id: SUBMISSION_ID,
      loot_item_id: ITEM_ID,
      already_obtained: true,
    }))
    expect(res.status).toBe(200)

    const insert = lootHistoryInserts(calls)[0]
    expect(insert?.insertPayload?.raid_tier_id).toBe(TIER_ID_2)
    expect(insert?.insertPayload?.expansion_id).toBe(EXP_ID_2)
  })

  it('GH #297: a foreign item plus already_obtained returns 400 invalid_loot_item_ids with the #294 copy, no submission update and no history insert', async () => {
    const fixture = baseFixture()
    fixture.itemRows = [{ id: 'row-1', rank: 1, slot: 'main-hand', loot_item_id: FOREIGN_ITEM_ID, removed_at: null }]
    const { client, calls } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      submission_id: SUBMISSION_ID,
      loot_item_id: FOREIGN_ITEM_ID,
      already_obtained: true,
    }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.invalid_loot_item_ids).toEqual([FOREIGN_ITEM_ID])
    expect(body.error).toBe("Some loot items aren't in this guild's loot tables. Refresh the page and try again.")
    expect(submissionItemUpdates(calls)).toHaveLength(0)
    expect(lootHistoryInserts(calls)).toHaveLength(0)
  })

  it('no already_obtained: the soft delete happens and no loot_history insert occurs', async () => {
    const { client, calls } = makeClient(baseFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      submission_id: SUBMISSION_ID,
      loot_item_id: ITEM_ID,
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect('history_recorded' in body).toBe(false)
    expect(submissionItemUpdates(calls)).toHaveLength(1)
    expect(lootHistoryInserts(calls)).toHaveLength(0)
  })

  it('restore works as today, and every loot_items query carries a raid_tier_id filter (no unscoped lookup)', async () => {
    const fixture = baseFixture()
    fixture.itemRows = [{ id: 'row-1', rank: 1, slot: 'main-hand', loot_item_id: ITEM_ID, removed_at: '2026-09-20T00:00:00Z' }]
    const { client, calls } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      submission_id: SUBMISSION_ID,
      loot_item_id: ITEM_ID,
      restore: true,
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.restored).toBe(true)
    expect(body.item_name).toBe('Sulfuras')

    for (const call of lootItemsCalls(calls)) {
      const tierFilter = call.filters.find(([col]) => col === 'raid_tier_id')
      expect(tierFilter).toBeDefined()
    }
  })

  it('a history insert error still returns 200 with history_recorded false and calls trackApiError', async () => {
    const fixture = baseFixture()
    fixture.historyInsertError = { message: 'insert boom' }
    const { client } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      submission_id: SUBMISSION_ID,
      loot_item_id: ITEM_ID,
      already_obtained: true,
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.history_recorded).toBe(false)
    expect(trackApiError).toHaveBeenCalledWith(OWNER_USER_ID, 'POST /api/loot-submissions/remove-item', expect.any(Error))
  })

  it('a non-owner without manage_submissions gets 403 and nothing is written', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: NON_OWNER_USER_ID }, error: null } as never)
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: false } as never)
    const { client, calls } = makeClient(baseFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      submission_id: SUBMISSION_ID,
      loot_item_id: ITEM_ID,
      already_obtained: true,
    }))

    expect(res.status).toBe(403)
    expect(submissionItemUpdates(calls)).toHaveLength(0)
    expect(lootHistoryInserts(calls)).toHaveLength(0)
  })

  it('the soft delete targets the single row by id, guarded by removed_at null', async () => {
    const { client, calls } = makeClient(baseFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD_ID, submission_id: SUBMISSION_ID, loot_item_id: ITEM_ID }))
    expect(res.status).toBe(200)
    expect((await res.json()).ranks_removed).toEqual([1])
    expect(submissionItemUpdates(calls)[0].filters).toEqual([['id', 'row-1'], ['removed_at', null]])
  })

  it('an officer (non-owner) with manage_submissions can remove the item', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: OFFICER_USER_ID }, error: null } as never)
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as never)
    const { client } = makeClient(baseFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      submission_id: SUBMISSION_ID,
      loot_item_id: ITEM_ID,
    }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
  })

  // GH #293: a list can hold two copies of one item; remove and restore act
  // on one row only.
  describe('one row of an item listed twice', () => {
    const twoActive = (): SubmissionItemRow[] => [
      { id: 'row-50', rank: 50, slot: '1', loot_item_id: ITEM_ID, removed_at: null },
      { id: 'row-30', rank: 30, slot: '2', loot_item_id: ITEM_ID, removed_at: null },
    ]
    const twoRemoved = (): SubmissionItemRow[] => [
      { id: 'row-50', rank: 50, slot: '1', loot_item_id: ITEM_ID, removed_at: '2026-09-20T00:00:00Z' },
      { id: 'row-30', rank: 30, slot: '2', loot_item_id: ITEM_ID, removed_at: '2026-09-21T00:00:00Z' },
    ]

    async function post(itemRows: SubmissionItemRow[], extra: Record<string, unknown>) {
      const fixture = { ...baseFixture(), itemRows }
      const { client, calls } = makeClient(fixture)
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
      const res = await POST(request({ guild_id: GUILD_ID, submission_id: SUBMISSION_ID, loot_item_id: ITEM_ID, ...extra }))
      return { res, body: await res.json(), calls }
    }

    it('removes only the row at the given rank and slot', async () => {
      const { res, body, calls } = await post(twoActive(), { rank: 30, slot: 2 })
      expect(res.status).toBe(200)
      expect(body.ranks_removed).toEqual([30])
      const updates = submissionItemUpdates(calls)
      expect(updates).toHaveLength(1)
      expect(updates[0].filters).toEqual([['id', 'row-30'], ['removed_at', null]])
    })

    it('removes the best-ranked row when no position is sent', async () => {
      const { res, body, calls } = await post(twoActive(), {})
      expect(res.status).toBe(200)
      expect(body.ranks_removed).toEqual([50])
      expect(submissionItemUpdates(calls)[0].filters).toEqual([['id', 'row-50'], ['removed_at', null]])
    })

    it('returns 404 and writes nothing for a position with no row of that item', async () => {
      const { res, body, calls } = await post(twoActive(), { rank: 40, slot: 1 })
      expect(res.status).toBe(404)
      expect(body.error).toBe('Item not found in this submission')
      expect(submissionItemUpdates(calls)).toHaveLength(0)
    })

    it('returns 400 when the row at the position is already removed', async () => {
      const rows = twoActive()
      rows[1].removed_at = '2026-09-21T00:00:00Z'
      const { res, body, calls } = await post(rows, { rank: 30, slot: 2 })
      expect(res.status).toBe(400)
      expect(body.error).toBe('Item already removed')
      expect(submissionItemUpdates(calls)).toHaveLength(0)
    })

    it('restores only the row at the given rank and slot', async () => {
      const { res, body, calls } = await post(twoRemoved(), { restore: true, rank: 30, slot: 2 })
      expect(res.status).toBe(200)
      expect(body.restored).toBe(true)
      const updates = submissionItemUpdates(calls)
      expect(updates).toHaveLength(1)
      expect(updates[0].filters).toEqual([['id', 'row-30']])
    })

    it('restores the best-ranked removed row when no position is sent', async () => {
      const { res, calls } = await post(twoRemoved(), { restore: true })
      expect(res.status).toBe(200)
      expect(submissionItemUpdates(calls)[0].filters).toEqual([['id', 'row-50']])
    })

    it('returns 400 when the row at the restore position is not removed', async () => {
      const rows = twoRemoved()
      rows[1].removed_at = null
      const { res, body, calls } = await post(rows, { restore: true, rank: 30, slot: 2 })
      expect(res.status).toBe(400)
      expect(body.error).toBe('Item is not removed')
      expect(submissionItemUpdates(calls)).toHaveLength(0)
    })
  })

  // GH #354: since the partial unique index, a removed row and a live row
  // can share a rank and slot. Remove and restore must act on the matching
  // row, and a restore that collides with a live row is refused.
  describe('a removed row and a live row share a rank and slot (GH #354)', () => {
    const liveThenRemoved = (): SubmissionItemRow[] => [
      { id: 'row-live', rank: 50, slot: '1', loot_item_id: ITEM_ID, removed_at: null },
      { id: 'row-removed', rank: 50, slot: '1', loot_item_id: ITEM_ID, removed_at: '2026-09-20T00:00:00Z' },
    ]
    const removedThenLive = (): SubmissionItemRow[] => [
      { id: 'row-removed', rank: 50, slot: '1', loot_item_id: ITEM_ID, removed_at: '2026-09-20T00:00:00Z' },
      { id: 'row-live', rank: 50, slot: '1', loot_item_id: ITEM_ID, removed_at: null },
    ]
    const twoRemovedAtOnePosition = (): SubmissionItemRow[] => [
      { id: 'row-earlier', rank: 50, slot: '1', loot_item_id: ITEM_ID, removed_at: '2026-09-20T00:00:00Z' },
      { id: 'row-later', rank: 50, slot: '1', loot_item_id: ITEM_ID, removed_at: '2026-09-21T00:00:00Z' },
    ]

    async function post(itemRows: SubmissionItemRow[], extra: Record<string, unknown>, fixtureOverrides: Partial<Fixture> = {}) {
      const fixture = { ...baseFixture(), itemRows, ...fixtureOverrides }
      const { client, calls } = makeClient(fixture)
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
      const res = await POST(request({ guild_id: GUILD_ID, submission_id: SUBMISSION_ID, loot_item_id: ITEM_ID, ...extra }))
      return { res, body: await res.json(), calls }
    }

    it.each([
      ['live row listed first', liveThenRemoved()],
      ['removed row listed first', removedThenLive()],
    ])('removes the live row at the position when %s', async (_label, rows) => {
      const { res, body, calls } = await post(rows, { rank: 50, slot: 1 })
      expect(res.status).toBe(200)
      expect(body.ranks_removed).toEqual([50])
      const updates = submissionItemUpdates(calls)
      expect(updates).toHaveLength(1)
      expect(updates[0].filters).toEqual([['id', 'row-live'], ['removed_at', null]])
    })

    it.each([
      ['live row listed first', liveThenRemoved()],
      ['removed row listed first', removedThenLive()],
    ])('restores the removed row at the position when %s', async (_label, rows) => {
      const { res, body, calls } = await post(rows, { restore: true, rank: 50, slot: 1 })
      expect(res.status).toBe(200)
      expect(body.restored).toBe(true)
      const updates = submissionItemUpdates(calls)
      expect(updates).toHaveLength(1)
      expect(updates[0].filters).toEqual([['id', 'row-removed']])
    })

    it('restores the row with the later removed_at when two removed rows share the position', async () => {
      const { calls } = await post(twoRemovedAtOnePosition(), { restore: true, rank: 50, slot: 1 })
      const updates = submissionItemUpdates(calls)
      expect(updates).toHaveLength(1)
      expect(updates[0].filters).toEqual([['id', 'row-later']])
    })

    it('a restore blocked by the new index (23505) returns 409 with the GH #354 copy and writes no audit entry', async () => {
      const { res, body, calls } = await post(liveThenRemoved(), { restore: true, rank: 50, slot: 1 }, {
        restoreUpdateError: { message: 'duplicate key value violates unique constraint', code: '23505' },
      })
      expect(res.status).toBe(409)
      expect(body.error).toBe('Another item is now at this rank and slot. Remove or move it first, then try again.')
      expect(logAudit).not.toHaveBeenCalled()
      expect(lootHistoryInserts(calls)).toHaveLength(0)
    })

    it('a restore blocked by any other error keeps the existing 500 message', async () => {
      const { res, body } = await post(liveThenRemoved(), { restore: true, rank: 50, slot: 1 }, {
        restoreUpdateError: { message: 'connection reset' },
      })
      expect(res.status).toBe(500)
      expect(body.error).toBe('Couldn\'t restore item. Try again.')
      expect(logAudit).not.toHaveBeenCalled()
    })
  })
})
