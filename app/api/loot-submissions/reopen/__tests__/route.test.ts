// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { logStatusChange } from '@/utils/audit/log'
import { revalidatePendingSubmissions } from '@/lib/cache/submission-tag'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/audit/log', () => ({ logStatusChange: vi.fn(async () => undefined) }))
vi.mock('@/lib/cache/submission-tag', () => ({ revalidatePendingSubmissions: vi.fn() }))

const GUILD_ID = 'eeeeeeee-0000-0000-0000-000000000001'
const SUBMISSION_ID = 'eeeeeeee-0000-0000-0000-000000000002'
const CHARACTER_ID = 'eeeeeeee-0000-0000-0000-000000000003'
const OWNER_ID = 'eeeeeeee-0000-0000-0000-000000000004'
const OTHER_USER_ID = 'eeeeeeee-0000-0000-0000-000000000005'

type Call = { table: string; op: 'select' | 'update'; filters: Array<[string, unknown]>; payload?: Record<string, unknown> }

interface Fixture {
  submission: { id: string; guild_id: string; character_id: string; status: string } | null
  characterOwner: string | null
  updatedRows?: Array<{ id: string }>
  updateError?: { code?: string; message: string } | null
}

/**
 * Recording fake client: the loot_submissions and characters single() reads,
 * and the conditional loot_submissions update whose row count and error can
 * be configured.
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
        update: (payload: Record<string, unknown>) => { call.op = 'update'; call.payload = payload; return builder },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        single: () => {
          if (table === 'loot_submissions') {
            return Promise.resolve(fixture.submission ? { data: fixture.submission, error: null } : { data: null, error: { message: 'not found' } })
          }
          if (table === 'characters') {
            return Promise.resolve(fixture.characterOwner ? { data: { id: CHARACTER_ID, user_id: fixture.characterOwner }, error: null } : { data: null, error: { message: 'not found' } })
          }
          return Promise.resolve({ data: null, error: { message: `unexpected single on ${table}` } })
        },
        then: (resolve: (v: unknown) => unknown) => {
          if (call.op === 'update') {
            return Promise.resolve(
              fixture.updateError ? { data: null, error: fixture.updateError } : { data: fixture.updatedRows ?? [{ id: SUBMISSION_ID }], error: null },
            ).then(resolve)
          }
          return Promise.resolve({ data: [], error: null }).then(resolve)
        },
      }
      return builder
    },
  }
  return { client, calls }
}

function request(body: Record<string, unknown> = { submission_id: SUBMISSION_ID }) {
  return { json: async () => body } as unknown as Parameters<typeof POST>[0]
}

async function run(fixture: Fixture, body?: Record<string, unknown>) {
  const { client, calls } = makeClient(fixture)
  vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceRoleClient>)
  const res = await POST(request(body))
  return { res, body: await res.json(), calls }
}

const submission = (status: string) => ({ id: SUBMISSION_ID, guild_id: GUILD_ID, character_id: CHARACTER_ID, status })
const updates = (calls: Call[]) => calls.filter(c => c.table === 'loot_submissions' && c.op === 'update')

describe('POST /api/loot-submissions/reopen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: OWNER_ID }, error: null } as never)
  })

  it('returns 401 without a user', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: null, error: { message: 'no session' } } as never)
    const { res } = await run({ submission: submission('approved'), characterOwner: OWNER_ID })
    expect(res.status).toBe(401)
  })

  it('returns 400 without a submission id', async () => {
    const { res } = await run({ submission: submission('approved'), characterOwner: OWNER_ID }, {})
    expect(res.status).toBe(400)
  })

  it('returns 404 for an unknown list', async () => {
    const { res } = await run({ submission: null, characterOwner: OWNER_ID })
    expect(res.status).toBe(404)
  })

  it("returns 403 for another raider's list and writes nothing", async () => {
    const { res, calls } = await run({ submission: submission('approved'), characterOwner: OTHER_USER_ID })
    expect(res.status).toBe(403)
    expect(updates(calls)).toHaveLength(0)
    expect(logStatusChange).not.toHaveBeenCalled()
  })

  it('leaves a draft alone and reports it, with no update and no audit row', async () => {
    const { res, body, calls } = await run({ submission: submission('draft'), characterOwner: OWNER_ID })
    expect(res.status).toBe(200)
    expect(body).toEqual({ success: true, status: 'draft', reopened: false })
    expect(updates(calls)).toHaveLength(0)
    expect(logStatusChange).not.toHaveBeenCalled()
    expect(revalidatePendingSubmissions).not.toHaveBeenCalled()
  })

  it('leaves a rejected list alone', async () => {
    const { body, calls } = await run({ submission: submission('rejected'), characterOwner: OWNER_ID })
    expect(body).toEqual({ success: true, status: 'rejected', reopened: false })
    expect(updates(calls)).toHaveLength(0)
  })

  // The transition the browser used to make on its own, now audited.
  it('drops an approved list to draft, clears the review trail and writes the audit row', async () => {
    const { res, body, calls } = await run({ submission: submission('approved'), characterOwner: OWNER_ID })

    expect(res.status).toBe(200)
    expect(body).toEqual({ success: true, status: 'draft', reopened: true, previous_status: 'approved' })

    const [update] = updates(calls)
    expect(update.payload).toMatchObject({
      status: 'draft',
      review_notes: null,
      reviewed_at: null,
      reviewed_by: null,
      change_rejected_at: null,
    })
    expect(update.payload?.updated_at).toEqual(expect.any(String))
    // Conditional on the status the route read, so a newer decision survives.
    expect(update.filters).toEqual([['id', SUBMISSION_ID], ['status', 'approved']])

    expect(logStatusChange).toHaveBeenCalledTimes(1)
    expect(vi.mocked(logStatusChange).mock.calls[0][0]).toMatchObject({
      guildId: GUILD_ID,
      tableName: 'loot_submissions',
      recordId: SUBMISSION_ID,
      userId: OWNER_ID,
      oldStatus: 'approved',
      newStatus: 'draft',
      additionalData: { character_id: CHARACTER_ID, reason: 'raider_edit' },
    })
    expect(revalidatePendingSubmissions).not.toHaveBeenCalled()
  })

  it('drops a pending list to draft and refreshes the officers pending count', async () => {
    const { body } = await run({ submission: submission('pending'), characterOwner: OWNER_ID })
    expect(body).toMatchObject({ reopened: true, previous_status: 'pending' })
    expect(logStatusChange).toHaveBeenCalledWith(expect.objectContaining({ oldStatus: 'pending', newStatus: 'draft' }))
    expect(revalidatePendingSubmissions).toHaveBeenCalledWith(GUILD_ID)
  })

  it('returns 409 and no audit row when the status changed under the raider', async () => {
    const { res, body } = await run({ submission: submission('approved'), characterOwner: OWNER_ID, updatedRows: [] })
    expect(res.status).toBe(409)
    expect(body.error).toBe('This list changed while you were editing. Refresh to see its current status.')
    expect(logStatusChange).not.toHaveBeenCalled()
  })

  it('returns 500 and no audit row when the update fails', async () => {
    const { res } = await run({ submission: submission('approved'), characterOwner: OWNER_ID, updateError: { code: '42501', message: 'denied' } })
    expect(res.status).toBe(500)
    expect(logStatusChange).not.toHaveBeenCalled()
  })
})
