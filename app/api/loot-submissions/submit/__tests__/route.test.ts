// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/audit/log', () => ({ logStatusChange: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), setUserMilestone: vi.fn() }))
vi.mock('@/lib/cache/submission-tag', () => ({ revalidatePendingSubmissions: vi.fn() }))

const GUILD_ID = 'bbbbbbbb-0000-0000-0000-000000000001'
const SUBMISSION_ID = 'bbbbbbbb-0000-0000-0000-000000000002'
const CHARACTER_ID = 'bbbbbbbb-0000-0000-0000-000000000003'
const OWNER_USER_ID = 'bbbbbbbb-0000-0000-0000-000000000004'
const OTHER_USER_ID = 'bbbbbbbb-0000-0000-0000-000000000005'

const NOT_ACTIVE_MEMBER_ERROR = 'Your character needs to rejoin this guild.'

type Call = { table: string; filters: Array<[string, unknown]>; updatePayload?: Record<string, unknown> }

interface Fixture {
  submission: { id: string; guild_id: string; character_id: string | null; expansion_id: string; phase: number; status: string; resubmission_count: number; submitted_at: string | null } | null
  character: { id: string; user_id: string } | null
  activeMemberships: Array<{ character_id: string; guild_id: string }>
  membershipError?: { message: string } | null
  statusUpdateError?: { code?: string; message: string } | null
}

/**
 * Recording fake client. Supports the loot_submissions and characters
 * single() reads, the loot_submission_items read, the guild_settings read,
 * the character_guild_memberships lookup used by findInvalidCharacterIds
 * (filtered by guild_id, is_active and character_id), and loot_submissions
 * updates whose status update result can be configured to fail.
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
        update: (payload: Record<string, unknown>) => { call.updatePayload = payload; return builder },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        is: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        single: () => {
          if (table === 'loot_submissions') {
            return Promise.resolve(fixture.submission ? { data: fixture.submission, error: null } : { data: null, error: { message: 'not found' } })
          }
          if (table === 'characters') {
            return Promise.resolve({ data: fixture.character, error: null })
          }
          if (table === 'guild_settings') {
            return Promise.resolve({ data: null, error: null })
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
            return Promise.resolve({ data: [], error: null }).then(resolve)
          }
          if (table === 'loot_submissions' && call.updatePayload) {
            const isStatusUpdate = 'status' in call.updatePayload
            return Promise.resolve({ error: isStatusUpdate ? (fixture.statusUpdateError ?? null) : null }).then(resolve)
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
    submission: {
      id: SUBMISSION_ID,
      guild_id: GUILD_ID,
      character_id: CHARACTER_ID,
      expansion_id: 'bbbbbbbb-0000-0000-0000-000000000006',
      phase: 1,
      status: 'draft',
      resubmission_count: 1,
      submitted_at: '2026-09-01T00:00:00.000Z',
    },
    character: { id: CHARACTER_ID, user_id: OWNER_USER_ID },
    activeMemberships: [{ character_id: CHARACTER_ID, guild_id: GUILD_ID }],
  }
}

function request(body: unknown) {
  return new Request('http://localhost/api/loot-submissions/submit', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

const submissionUpdates = (calls: Call[]) => calls.filter(c => c.table === 'loot_submissions' && c.updatePayload)

async function run(fixture: Fixture, userId = OWNER_USER_ID) {
  const { client, calls } = makeClient(fixture)
  vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceRoleClient>)
  vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: userId }, error: null } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>)
  const res = await POST(request({ submission_id: SUBMISSION_ID }))
  return { res, body: await res.json(), calls }
}

describe('POST /api/loot-submissions/submit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('submits the list of an active member and sets status pending', async () => {
    const { res, body, calls } = await run(baseFixture())
    expect(res.status).toBe(200)
    expect(body).toEqual({ success: true })
    const updates = submissionUpdates(calls)
    expect(updates.map(u => u.updatePayload)).toEqual([
      { resubmission_count: 2 },
      expect.objectContaining({ status: 'pending', change_rejected_at: null, resubmit_reminded_at: null, resubmit_reminder_count: 0 }),
    ])
  })

  it('returns 403 with the rejoin message and writes nothing when the membership is inactive', async () => {
    const fixture = { ...baseFixture(), activeMemberships: [] }
    const { res, body, calls } = await run(fixture)
    expect(res.status).toBe(403)
    expect(body.error).toBe(NOT_ACTIVE_MEMBER_ERROR)
    expect(submissionUpdates(calls)).toHaveLength(0)
    expect(calls.some(c => c.table === 'loot_submission_items')).toBe(false)
  })

  it('checks the membership in the list guild, not another guild', async () => {
    const fixture = { ...baseFixture(), activeMemberships: [{ character_id: CHARACTER_ID, guild_id: 'bbbbbbbb-0000-0000-0000-0000000000ff' }] }
    const { res, body, calls } = await run(fixture)
    expect(res.status).toBe(403)
    expect(body.error).toBe(NOT_ACTIVE_MEMBER_ERROR)
    expect(submissionUpdates(calls)).toHaveLength(0)
  })

  it('returns 500 and writes nothing when the membership lookup fails', async () => {
    const fixture = { ...baseFixture(), membershipError: { message: 'lookup failed' } }
    const { res, calls } = await run(fixture)
    expect(res.status).toBe(500)
    expect(submissionUpdates(calls)).toHaveLength(0)
  })

  it('returns 403 with the rejoin message when the status update fails with 23514', async () => {
    const fixture = { ...baseFixture(), statusUpdateError: { code: '23514', message: 'loot_submissions: a pending or approved list needs an active guild membership' } }
    const { res, body } = await run(fixture)
    expect(res.status).toBe(403)
    expect(body.error).toBe(NOT_ACTIVE_MEMBER_ERROR)
  })

  it('still returns 500 for any other status update error', async () => {
    const fixture = { ...baseFixture(), statusUpdateError: { code: '57014', message: 'canceling statement' } }
    const { res, body } = await run(fixture)
    expect(res.status).toBe(500)
    expect(body.error).toBe('Failed to submit')
  })

  it('still returns 403 with the ownership message for another raider', async () => {
    const { res, body, calls } = await run(baseFixture(), OTHER_USER_ID)
    expect(res.status).toBe(403)
    expect(body.error).toBe('You can only submit your own lists')
    expect(submissionUpdates(calls)).toHaveLength(0)
    expect(calls.some(c => c.table === 'character_guild_memberships')).toBe(false)
  })
})
