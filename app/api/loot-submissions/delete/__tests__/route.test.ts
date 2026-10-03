// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DELETE } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser, createClient } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'
import { logAudit } from '@/utils/audit/log'
import { trackEvent } from '@/utils/analytics/server'
import { revalidatePendingSubmissions } from '@/lib/cache/submission-tag'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn(), createClient: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))
vi.mock('@/utils/audit/log', () => ({ logAudit: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), trackApiError: vi.fn() }))
vi.mock('@/lib/cache/submission-tag', () => ({ revalidatePendingSubmissions: vi.fn() }))

const GUILD_ID = 'dddddddd-0000-0000-0000-000000000001'
const OTHER_GUILD_ID = 'dddddddd-0000-0000-0000-000000000002'
const OFFICER_USER_ID = 'dddddddd-0000-0000-0000-000000000003'

// Makes a valid-shaped UUID so the route's UUID_PATTERN check passes.
const id = (n: number) => `eeeeeeee-0000-0000-0000-${String(n).padStart(12, '0')}`

type Op = 'select' | 'insert' | 'update' | 'delete'
type Filter = ['eq' | 'in', string, unknown]
interface Call { table: string; op: Op; filters: Filter[]; selectCols?: string; payload?: unknown }

interface FixtureRow { id: string; character_id: string | null; status: string; guild_id: string }

interface Fixture {
  rows: FixtureRow[]
  // 1-based index of the bulk delete call (one per chunk) that should error.
  errorOnBulkCall?: number
  errorMessage?: string
  singleDeleteError?: { message: string } | null
}

/**
 * Recording fake client for the delete route: the single path's
 * select('*').single() read and delete().select('id'), and the bulk path's
 * chunked delete().eq().in().in().select(). Deletes mutate a working copy
 * of fixture.rows so a second chunk sees the first chunk's removals.
 */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []
  const rows = fixture.rows.map(r => ({ ...r }))
  let bulkCallCount = 0

  const client = {
    from(table: string) {
      const call: Call = { table, op: 'select', filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: (cols?: string) => { call.selectCols = cols; return builder },
        insert: (payload: unknown) => { call.op = 'insert'; call.payload = payload; return builder },
        update: (payload: unknown) => { call.op = 'update'; call.payload = payload; return builder },
        delete: () => { call.op = 'delete'; return builder },
        eq: (col: string, val: unknown) => { call.filters.push(['eq', col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push(['in', col, val]); return builder },
        single: () => {
          if (table === 'loot_submissions' && call.op === 'select') {
            const idVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'id')?.[2]
            const guildVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'guild_id')?.[2]
            const row = rows.find(r => r.id === idVal && r.guild_id === guildVal)
            return Promise.resolve(row ? { data: row, error: null } : { data: null, error: { message: 'not found' } })
          }
          return Promise.resolve({ data: null, error: null })
        },
        then: (resolve: (v: unknown) => unknown) => {
          if (table === 'loot_submissions' && call.op === 'delete') {
            const hasInFilter = call.filters.some(f => f[0] === 'in')
            if (hasInFilter) {
              // Bulk path: one call per chunk.
              bulkCallCount++
              if (fixture.errorOnBulkCall === bulkCallCount) {
                return Promise.resolve({ data: null, error: { message: fixture.errorMessage || 'db error' } }).then(resolve)
              }
              const guildVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'guild_id')?.[2]
              const chunkIds = call.filters.find(f => f[0] === 'in' && f[1] === 'id')?.[2] as string[]
              const chunkStatuses = call.filters.find(f => f[0] === 'in' && f[1] === 'status')?.[2] as string[]
              const matched = rows.filter(r => r.guild_id === guildVal && chunkIds.includes(r.id) && chunkStatuses.includes(r.status))
              for (const m of matched) {
                const idx = rows.indexOf(m)
                if (idx !== -1) rows.splice(idx, 1)
              }
              return Promise.resolve({ data: matched.map(r => ({ id: r.id, character_id: r.character_id, status: r.status })), error: null }).then(resolve)
            }
            // Single path: eq id, eq guild_id, no in filters.
            if (fixture.singleDeleteError) {
              return Promise.resolve({ data: null, error: fixture.singleDeleteError }).then(resolve)
            }
            const idVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'id')?.[2]
            const guildVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'guild_id')?.[2]
            const row = rows.find(r => r.id === idVal && r.guild_id === guildVal)
            if (row) {
              const idx = rows.indexOf(row)
              rows.splice(idx, 1)
            }
            return Promise.resolve({ data: row ? [{ id: row.id }] : [], error: null }).then(resolve)
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
  return new Request('http://localhost/api/loot-submissions/delete', {
    method: 'DELETE',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof DELETE>[0]
}

const bulkDeleteCalls = (calls: Call[]) => calls.filter(c => c.table === 'loot_submissions' && c.op === 'delete' && c.filters.some(f => f[0] === 'in'))

async function run(fixture: Fixture, body: Record<string, unknown>, hasPermission = true) {
  const { client, calls } = makeClient(fixture)
  vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceRoleClient>)
  vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: OFFICER_USER_ID }, error: null } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>)
  vi.mocked(verifyPermission).mockResolvedValue({ hasPermission } as unknown as Awaited<ReturnType<typeof verifyPermission>>)
  const res = await DELETE(request({ guild_id: GUILD_ID, ...body }))
  return { res, json: await res.json(), calls }
}

describe('DELETE /api/loot-submissions/delete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('bulk path', () => {
    it("removes every named list in the officer's guild, other raiders included, and reports count and requested", async () => {
      const fixture: Fixture = {
        rows: [
          { id: id(1), character_id: 'char-1', status: 'pending', guild_id: GUILD_ID },
          { id: id(2), character_id: 'char-2', status: 'pending', guild_id: GUILD_ID },
        ],
      }
      const { res, json, calls } = await run(fixture, { target: 'pending', submission_ids: [id(1), id(2)] })
      expect(res.status).toBe(200)
      expect(json).toEqual(expect.objectContaining({ success: true, count: 2, requested: 2 }))
      expect(createClient).not.toHaveBeenCalled()
      const deletes = bulkDeleteCalls(calls)
      expect(deletes).toHaveLength(1)
      expect(deletes[0].filters).toEqual(expect.arrayContaining([
        ['eq', 'guild_id', GUILD_ID],
        ['in', 'id', [id(1), id(2)]],
        ['in', 'status', ['pending']],
      ]))
    })

    it('target all uses status in pending, approved, rejected', async () => {
      const fixture: Fixture = {
        rows: [
          { id: id(1), character_id: 'char-1', status: 'approved', guild_id: GUILD_ID },
        ],
      }
      const { calls } = await run(fixture, { target: 'all', submission_ids: [id(1)] })
      const deletes = bulkDeleteCalls(calls)
      expect(deletes[0].filters).toEqual(expect.arrayContaining([
        ['in', 'status', ['pending', 'approved', 'rejected']],
      ]))
    })

    it('chunks 150 ids into two delete calls of 100 and 50, de-duplicates ids, and counts returned rows', async () => {
      const ids = Array.from({ length: 150 }, (_, i) => id(i))
      const rows = ids.slice(0, 120).map(rowId => ({ id: rowId, character_id: 'char', status: 'pending', guild_id: GUILD_ID }))
      const fixture: Fixture = { rows }
      // Send 150 unique ids plus a duplicate of the first id.
      const { res, json, calls } = await run(fixture, { target: 'pending', submission_ids: [...ids, ids[0]] })
      expect(res.status).toBe(200)
      expect(json.requested).toBe(150)
      expect(json.count).toBe(120)
      const deletes = bulkDeleteCalls(calls)
      expect(deletes).toHaveLength(2)
      expect((deletes[0].filters.find(f => f[1] === 'id')?.[2] as string[])).toHaveLength(100)
      expect((deletes[1].filters.find(f => f[1] === 'id')?.[2] as string[])).toHaveLength(50)
    })

    it('returns 400 with C-1 and makes no delete call when submission_ids is missing', async () => {
      const { res, json, calls } = await run({ rows: [] }, { target: 'pending' })
      expect(res.status).toBe(400)
      expect(json.error).toBe('This page is out of date. Refresh it, then try again.')
      expect(bulkDeleteCalls(calls)).toHaveLength(0)
    })

    it('returns 400 with C-1 when submission_ids is a string', async () => {
      const { res, json, calls } = await run({ rows: [] }, { target: 'pending', submission_ids: id(1) })
      expect(res.status).toBe(400)
      expect(json.error).toBe('This page is out of date. Refresh it, then try again.')
      expect(bulkDeleteCalls(calls)).toHaveLength(0)
    })

    it('returns 400 with C-1 when the array has a non-UUID entry', async () => {
      const { res, json, calls } = await run({ rows: [] }, { target: 'pending', submission_ids: [id(1), 'not-a-uuid'] })
      expect(res.status).toBe(400)
      expect(json.error).toBe('This page is out of date. Refresh it, then try again.')
      expect(bulkDeleteCalls(calls)).toHaveLength(0)
    })

    it('returns 400 with C-1 when the array has 1001 ids', async () => {
      const ids = Array.from({ length: 1001 }, (_, i) => id(i))
      const { res, json, calls } = await run({ rows: [] }, { target: 'pending', submission_ids: ids })
      expect(res.status).toBe(400)
      expect(json.error).toBe('This page is out of date. Refresh it, then try again.')
      expect(bulkDeleteCalls(calls)).toHaveLength(0)
    })

    it('returns 200 with count 0 and requested 0 and makes no delete call for an empty array', async () => {
      const { res, json, calls } = await run({ rows: [] }, { target: 'pending', submission_ids: [] })
      expect(res.status).toBe(200)
      expect(json).toEqual(expect.objectContaining({ success: true, count: 0, requested: 0 }))
      expect(bulkDeleteCalls(calls)).toHaveLength(0)
    })

    it('returns 403 with the existing text and makes no delete call for a non-officer', async () => {
      const { res, json, calls } = await run({ rows: [] }, { target: 'pending', submission_ids: [id(1)] }, false)
      expect(res.status).toBe(403)
      expect(json.error).toBe('Only officers can delete loot lists')
      expect(bulkDeleteCalls(calls)).toHaveLength(0)
    })

    it('keeps the existing 400 text when guild_id is missing', async () => {
      const { client } = makeClient({ rows: [] })
      vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceRoleClient>)
      vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: OFFICER_USER_ID }, error: null } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>)
      const res = await DELETE(request({ target: 'pending', submission_ids: [id(1)] }))
      const json = await res.json()
      expect(res.status).toBe(400)
      expect(json.error).toBe('guild_id is required')
    })

    it('keeps the existing 400 text for a bad target', async () => {
      const { res, json } = await run({ rows: [] }, { target: 'bogus', submission_ids: [id(1)] })
      expect(res.status).toBe(400)
      expect(json.error).toBe('target must be "pending" or "all"')
    })

    it('writes one audit entry and one analytics event with count and requested, and revalidates', async () => {
      const fixture: Fixture = {
        rows: [
          { id: id(1), character_id: 'char-1', status: 'pending', guild_id: GUILD_ID },
        ],
      }
      await run(fixture, { target: 'pending', submission_ids: [id(1), id(2)] })
      expect(logAudit).toHaveBeenCalledTimes(1)
      expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
        tableName: 'loot_submissions',
        action: 'DELETE',
        oldData: expect.objectContaining({ bulk_delete: true, target: 'pending', count: 1, requested: 2, submission_ids: [id(1)] }),
      }))
      expect(trackEvent).toHaveBeenCalledWith(expect.objectContaining({
        event: 'loot_submission_deleted',
        properties: expect.objectContaining({ count: 1, requested: 2, was_bulk: true }),
      }))
      expect(revalidatePendingSubmissions).toHaveBeenCalledWith(GUILD_ID)
    })

    it('returns 500 with the existing text when a second chunk errors, keeping the first chunk\'s count, and still audits and revalidates', async () => {
      const ids = Array.from({ length: 150 }, (_, i) => id(i))
      const rows = ids.map(rowId => ({ id: rowId, character_id: 'char', status: 'pending', guild_id: GUILD_ID }))
      const fixture: Fixture = { rows, errorOnBulkCall: 2 }
      const { res, json } = await run(fixture, { target: 'pending', submission_ids: ids })
      expect(res.status).toBe(500)
      expect(json.error).toBe('Failed to delete loot submissions')
      expect(json.count).toBe(100)
      expect(json.requested).toBe(150)
      expect(logAudit).toHaveBeenCalledTimes(1)
      expect(revalidatePendingSubmissions).toHaveBeenCalledWith(GUILD_ID)
    })

    it('skips ids of another guild and leaves them undeleted', async () => {
      const fixture: Fixture = {
        rows: [
          { id: id(1), character_id: 'char-1', status: 'pending', guild_id: OTHER_GUILD_ID },
        ],
      }
      const { res, json } = await run(fixture, { target: 'pending', submission_ids: [id(1)] })
      expect(res.status).toBe(200)
      expect(json.count).toBe(0)
      expect(json.requested).toBe(1)
    })
  })

  describe('single path', () => {
    it('still uses the service role and returns 200 with count 1', async () => {
      const fixture: Fixture = {
        rows: [{ id: id(1), character_id: 'char-1', status: 'pending', guild_id: GUILD_ID }],
      }
      const { res, json } = await run(fixture, { submission_id: id(1) })
      expect(res.status).toBe(200)
      expect(json).toEqual(expect.objectContaining({ success: true, count: 1 }))
      expect(createClient).not.toHaveBeenCalled()
    })

    it('returns 404 when no row is returned', async () => {
      const fixture: Fixture = { rows: [] }
      const { res, json } = await run(fixture, { submission_id: id(1) })
      expect(res.status).toBe(404)
      expect(json.error).toBe('Submission not found or already deleted')
    })
  })
})
