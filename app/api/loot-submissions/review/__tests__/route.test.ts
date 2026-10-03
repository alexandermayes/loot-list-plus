// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'
import { logStatusChange } from '@/utils/audit/log'
import { trackEvent } from '@/utils/analytics/server'
import { evaluateGuildFunnel } from '@/utils/analytics/funnel'
import { revalidatePendingSubmissions } from '@/lib/cache/submission-tag'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))
vi.mock('@/utils/audit/log', () => ({ logStatusChange: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn() }))
vi.mock('@/utils/analytics/funnel', () => ({ evaluateGuildFunnel: vi.fn() }))
vi.mock('@/lib/cache/submission-tag', () => ({ revalidatePendingSubmissions: vi.fn() }))

const GUILD_ID = 'cccccccc-0000-0000-0000-000000000001'
const SUBMISSION_ID = 'cccccccc-0000-0000-0000-000000000002'
const CHARACTER_ID = 'cccccccc-0000-0000-0000-000000000003'
const OFFICER_USER_ID = 'cccccccc-0000-0000-0000-000000000004'
const ITEM_ID = 'cccccccc-0000-0000-0000-000000000005'
const SNAPSHOT_ID = 'cccccccc-0000-0000-0000-000000000006'

const NOT_ACTIVE_MEMBER_ERROR = "This raider isn't an active member of this guild. Check the roster, then try again."
const UNDO_REFUSED_ERROR = "This review can't be undone anymore. Refresh to see the list's current status."

type Op = 'select' | 'insert' | 'update' | 'delete'
type Call = { table: string; op: Op; filters: Array<[string, unknown]>; payload?: unknown }

interface Fixture {
  submission: { id: string; guild_id: string; status: string; character_id: string | null; reviewed_at: string | null } | null
  activeMemberships: Array<{ character_id: string; guild_id: string }>
  membershipError?: { message: string } | null
  statusUpdateError?: { code?: string; message: string } | null
  // When set, overrides the default single-row update response (used to
  // simulate the guarded update matching no row).
  statusUpdateRows?: unknown[]
  // loot_submission_snapshots: the latest row by version, for the approve
  // path's maybeSingle read. null/undefined means none exists.
  latestSnapshot?: { id: string; version: number } | null
  latestSnapshotError?: { message: string } | null
  itemsReadError?: { message: string } | null
  snapshotDeleteError?: { message: string } | null
  snapshotInsertError?: { message: string } | null
  // Rows the undo's snapshot delete (filtered by gte snapshot_at) should
  // return, standing in for "what this approval wrote".
  snapshotRemovedRows?: Array<{ id: string; submission_id: string; version: number; items: unknown; snapshot_at: string }>
  snapshotPutBackError?: { message: string } | null
}

/**
 * Recording fake client for the review route: the loot_submissions single()
 * read, the character_guild_memberships lookup used by
 * findInvalidCharacterIds, the loot_submission_items read, the latest
 * snapshot maybeSingle read, the snapshot delete (both the approve
 * cleanup-by-neq and the undo removal-by-gte shapes) and insert, and the
 * loot_submissions update(...).eq().eq().select() whose result can be
 * configured to fail or match no row.
 */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const call: Call = { table, op: 'select', filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        insert: (payload: unknown) => { call.op = 'insert'; call.payload = payload; return builder },
        update: (payload: unknown) => { call.op = 'update'; call.payload = payload; return builder },
        delete: () => { call.op = 'delete'; return builder },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        is: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        neq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        gte: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        order: () => builder,
        limit: () => builder,
        maybeSingle: () => {
          if (table === 'loot_submission_snapshots') {
            if (fixture.latestSnapshotError) {
              return Promise.resolve({ data: null, error: fixture.latestSnapshotError })
            }
            return Promise.resolve({ data: fixture.latestSnapshot ?? null, error: null })
          }
          return Promise.resolve({ data: null, error: null })
        },
        single: () => {
          if (table === 'loot_submissions') {
            return Promise.resolve(fixture.submission ? { data: fixture.submission, error: null } : { data: null, error: { message: 'not found' } })
          }
          return Promise.resolve({ data: null, error: null })
        },
        then: (resolve: (v: unknown) => unknown) => {
          if (table === 'character_guild_memberships') {
            if (fixture.membershipError) {
              return Promise.resolve({ data: null, error: fixture.membershipError }).then(resolve)
            }
            const guildId = call.filters.find(([col]) => col === 'guild_id')?.[1]
            const activeOnly = call.filters.some(([col, val]) => col === 'is_active' && val === true)
            const ids = (call.filters.find(([col]) => col === 'character_id')?.[1] ?? []) as string[]
            const rows = activeOnly
              ? fixture.activeMemberships.filter(m => m.guild_id === guildId && ids.includes(m.character_id)).map(m => ({ character_id: m.character_id }))
              : []
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          if (table === 'loot_submission_items') {
            if (fixture.itemsReadError) {
              return Promise.resolve({ data: null, error: fixture.itemsReadError }).then(resolve)
            }
            return Promise.resolve({ data: [{ rank: 50, slot: 1, loot_item_id: ITEM_ID, loot_item: { name: 'Sulfuras' } }], error: null }).then(resolve)
          }
          if (table === 'loot_submission_snapshots' && call.op === 'delete') {
            const isUndoRemoval = call.filters.some(([col]) => col === 'snapshot_at')
            if (isUndoRemoval) {
              return Promise.resolve({ data: fixture.snapshotRemovedRows ?? [], error: null }).then(resolve)
            }
            // Approve cleanup-by-neq delete.
            if (fixture.snapshotDeleteError) {
              return Promise.resolve({ data: null, error: fixture.snapshotDeleteError }).then(resolve)
            }
            return Promise.resolve({ data: null, error: null }).then(resolve)
          }
          if (table === 'loot_submission_snapshots' && call.op === 'insert') {
            // Distinguish the approve-path new snapshot from the undo's
            // put-back insert by payload shape: an array means put-back.
            if (Array.isArray(call.payload)) {
              if (fixture.snapshotPutBackError) {
                return Promise.resolve({ data: null, error: fixture.snapshotPutBackError }).then(resolve)
              }
              return Promise.resolve({ data: call.payload, error: null }).then(resolve)
            }
            if (fixture.snapshotInsertError) {
              return Promise.resolve({ data: null, error: fixture.snapshotInsertError }).then(resolve)
            }
            return Promise.resolve({ data: null, error: null }).then(resolve)
          }
          if (table === 'loot_submissions' && call.op === 'update') {
            if (fixture.statusUpdateError) {
              return Promise.resolve({ data: null, error: fixture.statusUpdateError }).then(resolve)
            }
            if (fixture.statusUpdateRows) {
              return Promise.resolve({ data: fixture.statusUpdateRows, error: null }).then(resolve)
            }
            return Promise.resolve({ data: [{ id: SUBMISSION_ID, ...(call.payload as object) }], error: null }).then(resolve)
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
    submission: { id: SUBMISSION_ID, guild_id: GUILD_ID, status: 'pending', character_id: CHARACTER_ID, reviewed_at: null },
    activeMemberships: [{ character_id: CHARACTER_ID, guild_id: GUILD_ID }],
  }
}

function minutesAgoIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString()
}

function request(body: unknown) {
  return new Request('http://localhost/api/loot-submissions/review', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

const writes = (calls: Call[]) => calls.filter(c => c.op !== 'select')
const snapshotWrites = (calls: Call[]) => writes(calls).filter(c => c.table === 'loot_submission_snapshots')
const submissionUpdates = (calls: Call[]) => writes(calls).filter(c => c.table === 'loot_submissions')

async function run(fixture: Fixture, body: Record<string, unknown>) {
  const { client, calls } = makeClient(fixture)
  vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceRoleClient>)
  vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: OFFICER_USER_ID }, error: null } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>)
  vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as unknown as Awaited<ReturnType<typeof verifyPermission>>)
  const res = await POST(request({ submission_id: SUBMISSION_ID, ...body }))
  return { res, json: await res.json(), calls }
}

describe('POST /api/loot-submissions/review', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('approve', () => {
    it('inserts one snapshot with version 0 and no delete when there is no earlier snapshot', async () => {
      const fixture = { ...baseFixture(), latestSnapshot: null }
      const { res, calls } = await run(fixture, { status: 'approved' })
      expect(res.status).toBe(200)
      expect(snapshotWrites(calls).map(c => c.op)).toEqual(['insert'])
      const insert = snapshotWrites(calls)[0]
      expect(insert.payload).toEqual(expect.objectContaining({ version: 0 }))
      const updates = submissionUpdates(calls)
      expect(updates).toHaveLength(1)
      expect(updates[0].payload).toEqual(expect.objectContaining({ status: 'approved', change_rejected_at: null }))
      // The snapshot's snapshot_at equals the list's reviewed_at.
      expect((insert.payload as { snapshot_at: string }).snapshot_at).toBe((updates[0].payload as { reviewed_at: string }).reviewed_at)
    })

    it('deletes snapshots other than the latest and inserts version 3 when the latest is version 2', async () => {
      const fixture = { ...baseFixture(), latestSnapshot: { id: SNAPSHOT_ID, version: 2 } }
      const { calls } = await run(fixture, { status: 'approved' })
      const writesForSnapshots = snapshotWrites(calls)
      expect(writesForSnapshots.map(c => c.op)).toEqual(['delete', 'insert'])
      expect(writesForSnapshots[0].filters).toEqual(expect.arrayContaining([['submission_id', SUBMISSION_ID], ['id', SNAPSHOT_ID]]))
      expect(writesForSnapshots[1].payload).toEqual(expect.objectContaining({ version: 3 }))
    })

    it('returns 500 and writes no loot_submissions update when the items read fails', async () => {
      const fixture = { ...baseFixture(), itemsReadError: { message: 'items read failed' } }
      const { res, json, calls } = await run(fixture, { status: 'approved' })
      expect(res.status).toBe(500)
      expect(json.error).toBe('Failed to update submission')
      expect(submissionUpdates(calls)).toHaveLength(0)
    })

    it('returns 500 and writes no loot_submissions update when the latest-snapshot read fails', async () => {
      const fixture = { ...baseFixture(), latestSnapshotError: { message: 'read failed' } }
      const { res, json, calls } = await run(fixture, { status: 'approved' })
      expect(res.status).toBe(500)
      expect(json.error).toBe('Failed to update submission')
      expect(submissionUpdates(calls)).toHaveLength(0)
    })

    it('returns 500 and writes no loot_submissions update when the snapshot delete fails', async () => {
      const fixture = { ...baseFixture(), latestSnapshot: { id: SNAPSHOT_ID, version: 2 }, snapshotDeleteError: { message: 'delete failed' } }
      const { res, json, calls } = await run(fixture, { status: 'approved' })
      expect(res.status).toBe(500)
      expect(json.error).toBe('Failed to update submission')
      expect(submissionUpdates(calls)).toHaveLength(0)
    })

    it('returns 500 and writes no loot_submissions update when the snapshot insert fails', async () => {
      const fixture = { ...baseFixture(), snapshotInsertError: { message: 'insert failed' } }
      const { res, json, calls } = await run(fixture, { status: 'approved' })
      expect(res.status).toBe(500)
      expect(json.error).toBe('Failed to update submission')
      expect(submissionUpdates(calls)).toHaveLength(0)
    })

    it('returns 400 with the roster message and writes nothing when approving a list whose raider is not an active member', async () => {
      const fixture = { ...baseFixture(), activeMemberships: [] }
      const { res, json, calls } = await run(fixture, { status: 'approved' })
      expect(res.status).toBe(400)
      expect(json.error).toBe(NOT_ACTIVE_MEMBER_ERROR)
      expect(writes(calls)).toHaveLength(0)
    })

    it('returns 400 with the roster message and writes nothing when approving a list with no character', async () => {
      const fixture = baseFixture()
      fixture.submission!.character_id = null
      const { res, json, calls } = await run(fixture, { status: 'approved' })
      expect(res.status).toBe(400)
      expect(json.error).toBe(NOT_ACTIVE_MEMBER_ERROR)
      expect(writes(calls)).toHaveLength(0)
    })

    it('returns 400 with the roster message when the status update fails with 23514', async () => {
      const fixture = { ...baseFixture(), statusUpdateError: { code: '23514', message: 'loot_submissions: a pending or approved list needs an active guild membership' } }
      const { res, json } = await run(fixture, { status: 'approved' })
      expect(res.status).toBe(400)
      expect(json.error).toBe(NOT_ACTIVE_MEMBER_ERROR)
    })

    it('still returns 500 for any other status update error', async () => {
      const fixture = { ...baseFixture(), statusUpdateError: { code: '57014', message: 'canceling statement' } }
      const { res, json } = await run(fixture, { status: 'approved' })
      expect(res.status).toBe(500)
      expect(json.error).toBe('Failed to update submission')
    })

    it('returns 500 and writes nothing when the membership lookup fails', async () => {
      const fixture = { ...baseFixture(), membershipError: { message: 'lookup failed' } }
      const { res, calls } = await run(fixture, { status: 'approved' })
      expect(res.status).toBe(500)
      expect(writes(calls)).toHaveLength(0)
    })
  })

  describe('reject', () => {
    it('still rejects the list of a raider who is not an active member', async () => {
      const fixture = { ...baseFixture(), activeMemberships: [] }
      const { res, calls } = await run(fixture, { status: 'rejected', review_notes: 'Left the guild' })
      expect(res.status).toBe(200)
      expect(snapshotWrites(calls)).toHaveLength(0)
      expect(submissionUpdates(calls)[0].payload).toEqual(expect.objectContaining({ status: 'rejected', review_notes: 'Left the guild' }))
      expect(calls.some(c => c.table === 'character_guild_memberships')).toBe(false)
    })
  })

  describe('undo', () => {
    it('undoes an approval reviewed 1 minute ago: removes the snapshot at or after reviewed_at, updates to pending with review fields cleared, filtered by status approved', async () => {
      const reviewedAt = minutesAgoIso(1)
      const fixture = {
        ...baseFixture(),
        submission: { id: SUBMISSION_ID, guild_id: GUILD_ID, status: 'approved', character_id: CHARACTER_ID, reviewed_at: reviewedAt },
        snapshotRemovedRows: [{ id: SNAPSHOT_ID, submission_id: SUBMISSION_ID, version: 1, items: [], snapshot_at: reviewedAt }],
      }
      const { res, json, calls } = await run(fixture, { status: 'pending' })
      expect(res.status).toBe(200)
      expect(json.success).toBe(true)
      const snapshotDeletes = snapshotWrites(calls).filter(c => c.op === 'delete')
      expect(snapshotDeletes).toHaveLength(1)
      expect(snapshotDeletes[0].filters).toEqual(expect.arrayContaining([['submission_id', SUBMISSION_ID], ['snapshot_at', reviewedAt]]))
      const updates = submissionUpdates(calls)
      expect(updates).toHaveLength(1)
      expect(updates[0].payload).toEqual(expect.objectContaining({
        status: 'pending',
        reviewed_at: null,
        reviewed_by: null,
        review_notes: null,
        change_rejected_at: null,
        resubmit_reminded_at: null,
        resubmit_reminder_count: 0,
      }))
      expect(updates[0].filters).toEqual(expect.arrayContaining([['id', SUBMISSION_ID], ['status', 'approved']]))
      expect(logStatusChange).toHaveBeenCalledWith(expect.objectContaining({ oldStatus: 'approved', newStatus: 'pending' }))
      expect(trackEvent).toHaveBeenCalledWith(expect.objectContaining({ properties: expect.objectContaining({ undo: true, old_status: 'approved', new_status: 'pending' }) }))
      expect(evaluateGuildFunnel).not.toHaveBeenCalled()
      expect(revalidatePendingSubmissions).toHaveBeenCalledWith(GUILD_ID)
    })

    it('undoes a rejected list with no snapshot write, filtered by status rejected', async () => {
      const reviewedAt = minutesAgoIso(1)
      const fixture = {
        ...baseFixture(),
        submission: { id: SUBMISSION_ID, guild_id: GUILD_ID, status: 'rejected', character_id: CHARACTER_ID, reviewed_at: reviewedAt },
      }
      const { res, calls } = await run(fixture, { status: 'pending' })
      expect(res.status).toBe(200)
      expect(snapshotWrites(calls)).toHaveLength(0)
      const updates = submissionUpdates(calls)
      expect(updates[0].filters).toEqual(expect.arrayContaining([['status', 'rejected']]))
    })

    it.each([
      ['pending', minutesAgoIso(1)],
      ['draft', minutesAgoIso(1)],
    ])('refuses with 400 C-5 and writes nothing when the current status is %s', async (currentStatus, reviewedAt) => {
      const fixture = {
        ...baseFixture(),
        submission: { id: SUBMISSION_ID, guild_id: GUILD_ID, status: currentStatus, character_id: CHARACTER_ID, reviewed_at: reviewedAt as string },
      }
      const { res, json, calls } = await run(fixture, { status: 'pending' })
      expect(res.status).toBe(400)
      expect(json.error).toBe(UNDO_REFUSED_ERROR)
      expect(writes(calls)).toHaveLength(0)
    })

    it('refuses with 400 C-5 and writes nothing when reviewed_at is null', async () => {
      const fixture = {
        ...baseFixture(),
        submission: { id: SUBMISSION_ID, guild_id: GUILD_ID, status: 'approved', character_id: CHARACTER_ID, reviewed_at: null },
      }
      const { res, json, calls } = await run(fixture, { status: 'pending' })
      expect(res.status).toBe(400)
      expect(json.error).toBe(UNDO_REFUSED_ERROR)
      expect(writes(calls)).toHaveLength(0)
    })

    it('refuses with 400 C-5 and writes nothing when reviewed_at is 11 minutes old', async () => {
      const fixture = {
        ...baseFixture(),
        submission: { id: SUBMISSION_ID, guild_id: GUILD_ID, status: 'approved', character_id: CHARACTER_ID, reviewed_at: minutesAgoIso(11) },
      }
      const { res, json, calls } = await run(fixture, { status: 'pending' })
      expect(res.status).toBe(400)
      expect(json.error).toBe(UNDO_REFUSED_ERROR)
      expect(writes(calls)).toHaveLength(0)
    })

    it('refuses with 400 C-5 and writes nothing when reviewed_at cannot be parsed', async () => {
      const fixture = {
        ...baseFixture(),
        submission: { id: SUBMISSION_ID, guild_id: GUILD_ID, status: 'approved', character_id: CHARACTER_ID, reviewed_at: 'not-a-date' },
      }
      const { res, json, calls } = await run(fixture, { status: 'pending' })
      expect(res.status).toBe(400)
      expect(json.error).toBe(UNDO_REFUSED_ERROR)
      expect(writes(calls)).toHaveLength(0)
    })

    it('returns 400 with the roster message and writes nothing for a raider with no active membership', async () => {
      const fixture = {
        ...baseFixture(),
        submission: { id: SUBMISSION_ID, guild_id: GUILD_ID, status: 'approved', character_id: CHARACTER_ID, reviewed_at: minutesAgoIso(1) },
        activeMemberships: [],
      }
      const { res, json, calls } = await run(fixture, { status: 'pending' })
      expect(res.status).toBe(400)
      expect(json.error).toBe(NOT_ACTIVE_MEMBER_ERROR)
      expect(writes(calls)).toHaveLength(0)
    })

    it('returns 400 with the roster message and writes nothing for a list with no character', async () => {
      const fixture = {
        ...baseFixture(),
        submission: { id: SUBMISSION_ID, guild_id: GUILD_ID, status: 'approved', character_id: null, reviewed_at: minutesAgoIso(1) },
      }
      const { res, json, calls } = await run(fixture, { status: 'pending' })
      expect(res.status).toBe(400)
      expect(json.error).toBe(NOT_ACTIVE_MEMBER_ERROR)
      expect(writes(calls)).toHaveLength(0)
    })

    it('returns 403 with the existing text and writes nothing for a non-officer', async () => {
      const { client } = makeClient({
        ...baseFixture(),
        submission: { id: SUBMISSION_ID, guild_id: GUILD_ID, status: 'approved', character_id: CHARACTER_ID, reviewed_at: minutesAgoIso(1) },
      })
      vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceRoleClient>)
      vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: OFFICER_USER_ID }, error: null } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>)
      vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: false } as unknown as Awaited<ReturnType<typeof verifyPermission>>)
      const res = await POST(request({ submission_id: SUBMISSION_ID, status: 'pending' }))
      const json = await res.json()
      expect(res.status).toBe(403)
      expect(json.error).toBe('Only officers can review submissions')
    })

    it('returns 400 with the roster message and puts the removed snapshot rows back when the guarded update returns 23514', async () => {
      const reviewedAt = minutesAgoIso(1)
      const removedRows = [{ id: SNAPSHOT_ID, submission_id: SUBMISSION_ID, version: 1, items: [], snapshot_at: reviewedAt }]
      const fixture = {
        ...baseFixture(),
        submission: { id: SUBMISSION_ID, guild_id: GUILD_ID, status: 'approved', character_id: CHARACTER_ID, reviewed_at: reviewedAt },
        snapshotRemovedRows: removedRows,
        statusUpdateError: { code: '23514', message: 'needs an active guild membership' },
      }
      const { res, json, calls } = await run(fixture, { status: 'pending' })
      expect(res.status).toBe(400)
      expect(json.error).toBe(NOT_ACTIVE_MEMBER_ERROR)
      const putBack = snapshotWrites(calls).find(c => c.op === 'insert')
      expect(putBack?.payload).toEqual(removedRows)
    })

    it('returns 400 C-5 and puts the removed snapshot rows back when the guarded update matches no row', async () => {
      const reviewedAt = minutesAgoIso(1)
      const removedRows = [{ id: SNAPSHOT_ID, submission_id: SUBMISSION_ID, version: 1, items: [], snapshot_at: reviewedAt }]
      const fixture = {
        ...baseFixture(),
        submission: { id: SUBMISSION_ID, guild_id: GUILD_ID, status: 'approved', character_id: CHARACTER_ID, reviewed_at: reviewedAt },
        snapshotRemovedRows: removedRows,
        statusUpdateRows: [],
      }
      const { res, json, calls } = await run(fixture, { status: 'pending' })
      expect(res.status).toBe(400)
      expect(json.error).toBe(UNDO_REFUSED_ERROR)
      const putBack = snapshotWrites(calls).find(c => c.op === 'insert')
      expect(putBack?.payload).toEqual(removedRows)
    })

    it('returns 500 Failed to update submission and puts the removed snapshot rows back for any other update error', async () => {
      const reviewedAt = minutesAgoIso(1)
      const removedRows = [{ id: SNAPSHOT_ID, submission_id: SUBMISSION_ID, version: 1, items: [], snapshot_at: reviewedAt }]
      const fixture = {
        ...baseFixture(),
        submission: { id: SUBMISSION_ID, guild_id: GUILD_ID, status: 'approved', character_id: CHARACTER_ID, reviewed_at: reviewedAt },
        snapshotRemovedRows: removedRows,
        statusUpdateError: { code: '57014', message: 'canceling statement' },
      }
      const { res, json, calls } = await run(fixture, { status: 'pending' })
      expect(res.status).toBe(500)
      expect(json.error).toBe('Failed to update submission')
      const putBack = snapshotWrites(calls).find(c => c.op === 'insert')
      expect(putBack?.payload).toEqual(removedRows)
    })
  })
})
