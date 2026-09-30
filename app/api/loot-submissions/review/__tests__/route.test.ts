// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'

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

const NOT_ACTIVE_MEMBER_ERROR = "This raider isn't an active member of this guild. Check the roster, then try again."

type Op = 'select' | 'insert' | 'update' | 'delete'
type Call = { table: string; op: Op; filters: Array<[string, unknown]>; payload?: unknown }

interface Fixture {
  submission: { id: string; guild_id: string; status: string; character_id: string | null } | null
  activeMemberships: Array<{ character_id: string; guild_id: string }>
  membershipError?: { message: string } | null
  statusUpdateError?: { code?: string; message: string } | null
}

/**
 * Recording fake client for the review route: the loot_submissions single()
 * read, the character_guild_memberships lookup used by
 * findInvalidCharacterIds, the loot_submission_items read, the snapshot
 * delete and insert, and the loot_submissions update(...).eq().select()
 * whose result can be configured to fail.
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
            return Promise.resolve({ data: [{ rank: 50, slot: 1, loot_item_id: ITEM_ID, loot_item: { name: 'Sulfuras' } }], error: null }).then(resolve)
          }
          if (table === 'loot_submissions' && call.op === 'update') {
            if (fixture.statusUpdateError) {
              return Promise.resolve({ data: null, error: fixture.statusUpdateError }).then(resolve)
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
    submission: { id: SUBMISSION_ID, guild_id: GUILD_ID, status: 'pending', character_id: CHARACTER_ID },
    activeMemberships: [{ character_id: CHARACTER_ID, guild_id: GUILD_ID }],
  }
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

  it('approves the list of an active member, replacing the snapshot and setting status approved', async () => {
    const { res, calls } = await run(baseFixture(), { status: 'approved' })
    expect(res.status).toBe(200)
    expect(snapshotWrites(calls).map(c => c.op)).toEqual(['delete', 'insert'])
    const updates = submissionUpdates(calls)
    expect(updates).toHaveLength(1)
    expect(updates[0].payload).toEqual(expect.objectContaining({ status: 'approved', change_rejected_at: null }))
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

  it('still rejects the list of a raider who is not an active member', async () => {
    const fixture = { ...baseFixture(), activeMemberships: [] }
    const { res, calls } = await run(fixture, { status: 'rejected', review_notes: 'Left the guild' })
    expect(res.status).toBe(200)
    expect(snapshotWrites(calls)).toHaveLength(0)
    expect(submissionUpdates(calls)[0].payload).toEqual(expect.objectContaining({ status: 'rejected', review_notes: 'Left the guild' }))
    expect(calls.some(c => c.table === 'character_guild_memberships')).toBe(false)
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
