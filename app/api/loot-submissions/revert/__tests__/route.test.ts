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
vi.mock('@/lib/cache/submission-tag', () => ({ revalidatePendingSubmissions: vi.fn() }))

const GUILD_ID = 'dddddddd-0000-0000-0000-000000000001'
const SUBMISSION_ID = 'dddddddd-0000-0000-0000-000000000002'
const CHARACTER_ID = 'dddddddd-0000-0000-0000-000000000003'
const OFFICER_USER_ID = 'dddddddd-0000-0000-0000-000000000004'
const ITEM_ID = 'dddddddd-0000-0000-0000-000000000005'

const NOT_ACTIVE_MEMBER_ERROR = "This raider isn't an active member of this guild. Check the roster, then try again."

type Op = 'select' | 'insert' | 'update' | 'delete'
type Call = { table: string; op: Op; filters: Array<[string, unknown]>; payload?: unknown }

interface Fixture {
  submission: { id: string; guild_id: string; status: string; resubmission_count: number; character_id: string | null } | null
  snapshot: { items: Array<{ rank: number; slot: number; loot_item_id: string; item_name: string }> } | null
  activeMemberships: Array<{ character_id: string; guild_id: string }>
  membershipError?: { message: string } | null
  statusUpdateError?: { code?: string; message: string } | null
}

/**
 * Recording fake client for the revert route: the loot_submissions and
 * snapshot single() reads, the character_guild_memberships lookup used by
 * findInvalidCharacterIds, the item delete and insert, and loot_submissions
 * updates whose approved-status result can be configured to fail.
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
        order: () => builder,
        limit: () => builder,
        single: () => {
          if (table === 'loot_submissions') {
            return Promise.resolve(fixture.submission ? { data: fixture.submission, error: null } : { data: null, error: { message: 'not found' } })
          }
          if (table === 'loot_submission_snapshots') {
            return Promise.resolve(fixture.snapshot ? { data: fixture.snapshot, error: null } : { data: null, error: { message: 'no rows' } })
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
          if (table === 'loot_submissions' && call.op === 'update') {
            const isApproved = (call.payload as { status?: string }).status === 'approved'
            return Promise.resolve({ error: isApproved ? (fixture.statusUpdateError ?? null) : null }).then(resolve)
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
    submission: { id: SUBMISSION_ID, guild_id: GUILD_ID, status: 'pending', resubmission_count: 1, character_id: CHARACTER_ID },
    snapshot: { items: [{ rank: 50, slot: 1, loot_item_id: ITEM_ID, item_name: 'Sulfuras' }] },
    activeMemberships: [{ character_id: CHARACTER_ID, guild_id: GUILD_ID }],
  }
}

function request(body: unknown) {
  return new Request('http://localhost/api/loot-submissions/revert', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

const writes = (calls: Call[]) => calls.filter(c => c.op !== 'select')
const itemWrites = (calls: Call[]) => writes(calls).filter(c => c.table === 'loot_submission_items')
const submissionUpdates = (calls: Call[]) => writes(calls).filter(c => c.table === 'loot_submissions')

async function run(fixture: Fixture) {
  const { client, calls } = makeClient(fixture)
  vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceRoleClient>)
  vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: OFFICER_USER_ID }, error: null } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>)
  vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as unknown as Awaited<ReturnType<typeof verifyPermission>>)
  const res = await POST(request({ submission_id: SUBMISSION_ID, review_notes: 'Keeping the approved list' }))
  return { res, json: await res.json(), calls }
}

describe('POST /api/loot-submissions/revert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('restores the snapshot of an active member and sets status approved', async () => {
    const { res, json, calls } = await run(baseFixture())
    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true })
    expect(itemWrites(calls).map(c => c.op)).toEqual(['delete', 'insert'])
    const updates = submissionUpdates(calls)
    expect(updates).toHaveLength(1)
    expect(updates[0].payload).toEqual(expect.objectContaining({ status: 'approved', review_notes: 'Keeping the approved list' }))
  })

  it('returns 400 with the roster message and writes nothing when restoring the list of a raider who is not an active member', async () => {
    const fixture = { ...baseFixture(), activeMemberships: [] }
    const { res, json, calls } = await run(fixture)
    expect(res.status).toBe(400)
    expect(json.error).toBe(NOT_ACTIVE_MEMBER_ERROR)
    expect(writes(calls)).toHaveLength(0)
  })

  it('returns 400 with the roster message and writes nothing when the list has no character', async () => {
    const fixture = baseFixture()
    fixture.submission!.character_id = null
    const { res, json, calls } = await run(fixture)
    expect(res.status).toBe(400)
    expect(json.error).toBe(NOT_ACTIVE_MEMBER_ERROR)
    expect(writes(calls)).toHaveLength(0)
  })

  it('still falls back to a rejection without a snapshot, even for a raider who is not an active member', async () => {
    const fixture = { ...baseFixture(), snapshot: null, activeMemberships: [] }
    const { res, json, calls } = await run(fixture)
    expect(res.status).toBe(200)
    expect(json).toEqual({ success: true, fallback: 'rejected' })
    expect(itemWrites(calls)).toHaveLength(0)
    expect(submissionUpdates(calls).map(c => (c.payload as { status: string }).status)).toEqual(['rejected'])
  })

  it('returns 400 with the roster message when the approved status update fails with 23514', async () => {
    const fixture = { ...baseFixture(), statusUpdateError: { code: '23514', message: 'loot_submissions: a pending or approved list needs an active guild membership' } }
    const { res, json } = await run(fixture)
    expect(res.status).toBe(400)
    expect(json.error).toBe(NOT_ACTIVE_MEMBER_ERROR)
  })

  it('still returns 500 for any other status update error', async () => {
    const fixture = { ...baseFixture(), statusUpdateError: { code: '57014', message: 'canceling statement' } }
    const { res, json } = await run(fixture)
    expect(res.status).toBe(500)
    expect(json.error).toBe('Failed to update submission status')
  })

  it('returns 500 and writes nothing when the membership lookup fails', async () => {
    const fixture = { ...baseFixture(), membershipError: { message: 'lookup failed' } }
    const { res, calls } = await run(fixture)
    expect(res.status).toBe(500)
    expect(writes(calls)).toHaveLength(0)
  })
})
