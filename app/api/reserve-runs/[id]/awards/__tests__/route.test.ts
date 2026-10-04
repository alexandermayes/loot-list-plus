// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, DELETE } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyReserveRunAccess } from '@/utils/reserve-access'
import { logReserveAudit } from '@/utils/reserve-audit'
import { requireReserveRunPremium } from '@/utils/feature-gate'

// Quick task 261003-t28 amendment A1: the route now checks, before writing,
// that a given submission_id belongs to this run and that loot_item_id is
// in the run's raid tier (matching the database trigger added in the same
// task), answering 400 with a shared message instead of letting the
// trigger turn the write into a 500.

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/reserve-access', () => ({ verifyReserveRunAccess: vi.fn() }))
vi.mock('@/utils/reserve-audit', () => ({ logReserveAudit: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn() }))
vi.mock('@/utils/feature-gate', () => ({ requireReserveRunPremium: vi.fn() }))

const RUN_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const TIER_ID = 'aaaaaaaa-0000-0000-0000-000000000002'
const OTHER_TIER_ID = 'aaaaaaaa-0000-0000-0000-000000000003'
const ITEM_ID = 'aaaaaaaa-0000-0000-0000-000000000004'
const OTHER_TIER_ITEM_ID = 'aaaaaaaa-0000-0000-0000-000000000005'
const SUBMISSION_ID = 'aaaaaaaa-0000-0000-0000-000000000006'
const FOREIGN_SUBMISSION_ID = 'aaaaaaaa-0000-0000-0000-000000000007'
const USER_ID = 'aaaaaaaa-0000-0000-0000-000000000008'
const AWARD_ID = 'aaaaaaaa-0000-0000-0000-000000000009'

const MISMATCH_MESSAGE = "This award doesn't match this reserve run. Refresh the page, then try again."

interface Fixture {
  /** loot_items rows that exist in this run's raid tier (TIER_ID). */
  tierItemIds?: Set<string>
  /** reserve_submissions ids that belong to this run. */
  runSubmissionIds?: Set<string>
  submissionLookupError?: boolean
  itemLookupError?: boolean
}

/** Recording fake client. Supports the reserve_submissions and loot_items
 * membership checks (via maybeSingle), and a reserve_awards insert. */
function makeClient(fixture: Fixture) {
  const calls: Array<{ table: string; filters: Array<[string, unknown]> }> = []
  const client = {
    from(table: string) {
      const call = { table, filters: [] as Array<[string, unknown]> }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        insert: () => builder,
        delete: () => builder,
        eq: (col: string, val: unknown) => {
          call.filters.push([col, val])
          return builder
        },
        maybeSingle: () => {
          if (table === 'reserve_submissions') {
            if (fixture.submissionLookupError) return Promise.resolve({ data: null, error: { message: 'boom' } })
            const id = call.filters.find(([col]) => col === 'id')?.[1] as string
            const found = fixture.runSubmissionIds?.has(id)
            return Promise.resolve({ data: found ? { id } : null, error: null })
          }
          if (table === 'loot_items') {
            if (fixture.itemLookupError) return Promise.resolve({ data: null, error: { message: 'boom' } })
            const id = call.filters.find(([col]) => col === 'id')?.[1] as string
            const found = fixture.tierItemIds?.has(id)
            return Promise.resolve({ data: found ? { id } : null, error: null })
          }
          return Promise.resolve({ data: null, error: null })
        },
        single: () => {
          if (table === 'reserve_awards') {
            return Promise.resolve({ data: { id: AWARD_ID }, error: null })
          }
          return Promise.resolve({ data: null, error: null })
        },
        // Only reached by DELETE's bare delete().eq().eq() (no single()).
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(resolve, reject),
      }
      return builder
    },
  }
  return { client, calls }
}

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/reserve-runs/x/awards', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

const baseRun = {
  id: RUN_ID,
  guild_id: 'bbbbbbbb-0000-0000-0000-000000000001',
  status: 'locked',
  created_by: USER_ID,
  raid_leader_token: 'tok',
  raid_tier_id: TIER_ID,
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID, email: 'o@example.test' } } as never)
  vi.mocked(verifyReserveRunAccess).mockResolvedValue({ allowed: true, actor: 'officer', run: baseRun } as never)
  vi.mocked(logReserveAudit).mockResolvedValue(undefined)
  vi.mocked(requireReserveRunPremium).mockResolvedValue({ allowed: true } as never)
})

describe('POST /api/reserve-runs/[id]/awards (quick task 261003-t28 amendment A1)', () => {
  it('rejects a submission_id that does not belong to this run with 400 and the shared message, writing nothing', async () => {
    const { client, calls } = makeClient({ runSubmissionIds: new Set(), tierItemIds: new Set([ITEM_ID]) })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(makeRequest({ loot_item_id: ITEM_ID, character_name: 'Raiderone', submission_id: FOREIGN_SUBMISSION_ID }), {
      params: Promise.resolve({ id: RUN_ID }),
    })
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe(MISMATCH_MESSAGE)
    expect(calls.some(c => c.table === 'reserve_awards')).toBe(false)
  })

  it('accepts a submission_id of this run', async () => {
    const { client, calls } = makeClient({ runSubmissionIds: new Set([SUBMISSION_ID]), tierItemIds: new Set([ITEM_ID]) })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(makeRequest({ loot_item_id: ITEM_ID, character_name: 'Raiderone', submission_id: SUBMISSION_ID }), {
      params: Promise.resolve({ id: RUN_ID }),
    })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(calls.some(c => c.table === 'reserve_awards')).toBe(true)
  })

  it('allows a NULL submission_id (a pug award) without checking reserve_submissions', async () => {
    const { client, calls } = makeClient({ tierItemIds: new Set([ITEM_ID]) })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(makeRequest({ loot_item_id: ITEM_ID, character_name: 'Pugname' }), {
      params: Promise.resolve({ id: RUN_ID }),
    })

    expect(res.status).toBe(200)
    expect(calls.some(c => c.table === 'reserve_submissions')).toBe(false)
  })

  it('rejects a loot_item_id outside the run raid tier with 400 and the shared message, writing nothing', async () => {
    const { client, calls } = makeClient({ runSubmissionIds: new Set([SUBMISSION_ID]), tierItemIds: new Set([ITEM_ID]) })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(makeRequest({ loot_item_id: OTHER_TIER_ITEM_ID, character_name: 'Raiderone', submission_id: SUBMISSION_ID }), {
      params: Promise.resolve({ id: RUN_ID }),
    })
    const json = await res.json()

    expect(res.status).toBe(400)
    expect(json.error).toBe(MISMATCH_MESSAGE)
    expect(calls.some(c => c.table === 'reserve_awards')).toBe(false)
  })

  it('accepts a loot_item_id of the run raid tier', async () => {
    const { client } = makeClient({ tierItemIds: new Set([ITEM_ID]) })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(makeRequest({ loot_item_id: ITEM_ID, character_name: 'Raiderone' }), {
      params: Promise.resolve({ id: RUN_ID }),
    })

    expect(res.status).toBe(200)
  })

  it('fails closed (500, nothing written) when the submission lookup errors', async () => {
    const { client, calls } = makeClient({ submissionLookupError: true, tierItemIds: new Set([ITEM_ID]) })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(makeRequest({ loot_item_id: ITEM_ID, character_name: 'Raiderone', submission_id: SUBMISSION_ID }), {
      params: Promise.resolve({ id: RUN_ID }),
    })

    expect(res.status).toBe(500)
    expect(calls.some(c => c.table === 'reserve_awards')).toBe(false)
  })

  it('fails closed (500, nothing written) when the item lookup errors', async () => {
    const { client, calls } = makeClient({ itemLookupError: true })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(makeRequest({ loot_item_id: ITEM_ID, character_name: 'Raiderone' }), {
      params: Promise.resolve({ id: RUN_ID }),
    })

    expect(res.status).toBe(500)
    expect(calls.some(c => c.table === 'reserve_awards')).toBe(false)
  })

  it('ignores an unrelated tier id when checking items (control: OTHER_TIER_ID never referenced by the run)', async () => {
    const { client } = makeClient({ tierItemIds: new Set([ITEM_ID]) })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    expect(OTHER_TIER_ID).not.toBe(TIER_ID)

    const res = await POST(makeRequest({ loot_item_id: ITEM_ID, character_name: 'Raiderone' }), {
      params: Promise.resolve({ id: RUN_ID }),
    })

    expect(res.status).toBe(200)
  })
})

describe('POST /api/reserve-runs/[id]/awards (D-03: the run owner needs reserve access)', () => {
  it('calls requireReserveRunPremium once with the client, baseRun and manager', async () => {
    const { client } = makeClient({ tierItemIds: new Set([ITEM_ID]) })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    await POST(makeRequest({ loot_item_id: ITEM_ID, character_name: 'Raiderone' }), {
      params: Promise.resolve({ id: RUN_ID }),
    })

    expect(requireReserveRunPremium).toHaveBeenCalledTimes(1)
    expect(requireReserveRunPremium).toHaveBeenCalledWith(client, baseRun, 'manager')
  })

  it('passes through the gate denial, with no award insert, no submission or item read and no audit', async () => {
    const gateError = new Response(JSON.stringify({ error: 'gate', code: 'premium_required' }), { status: 403 })
    vi.mocked(requireReserveRunPremium).mockResolvedValue({ allowed: false, error: gateError } as never)
    const { client, calls } = makeClient({ tierItemIds: new Set([ITEM_ID]) })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(makeRequest({ loot_item_id: ITEM_ID, character_name: 'Raiderone' }), {
      params: Promise.resolve({ id: RUN_ID }),
    })
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json).toEqual({ error: 'gate', code: 'premium_required' })
    expect(calls.some(c => c.table === 'reserve_awards')).toBe(false)
    expect(calls.some(c => c.table === 'reserve_submissions')).toBe(false)
    expect(calls.some(c => c.table === 'loot_items')).toBe(false)
    expect(logReserveAudit).not.toHaveBeenCalled()
  })

  it('does not call requireReserveRunPremium when verifyReserveRunAccess denies', async () => {
    vi.mocked(verifyReserveRunAccess).mockResolvedValue({ allowed: false, actor: 'none', run: null, reason: 'Forbidden' } as never)
    const { client } = makeClient({})
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(makeRequest({ loot_item_id: ITEM_ID, character_name: 'Raiderone' }), {
      params: Promise.resolve({ id: RUN_ID }),
    })

    expect(res.status).toBe(403)
    expect(requireReserveRunPremium).not.toHaveBeenCalled()
  })

  it('answers 500 with nothing written when requireReserveRunPremium rejects', async () => {
    vi.mocked(requireReserveRunPremium).mockRejectedValue(new Error('boom'))
    const { client, calls } = makeClient({ tierItemIds: new Set([ITEM_ID]) })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(makeRequest({ loot_item_id: ITEM_ID, character_name: 'Raiderone' }), {
      params: Promise.resolve({ id: RUN_ID }),
    })
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toBe('Internal server error')
    expect(calls.some(c => c.table === 'reserve_awards')).toBe(false)
  })
})

describe('DELETE /api/reserve-runs/[id]/awards (D-03: the run owner needs reserve access)', () => {
  function makeDeleteRequest() {
    return new NextRequest(`http://localhost/api/reserve-runs/x/awards?award_id=${AWARD_ID}`, { method: 'DELETE' })
  }

  it('calls requireReserveRunPremium once with the client, baseRun and manager, then deletes', async () => {
    const { client, calls } = makeClient({})
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: RUN_ID }) })

    expect(res.status).toBe(200)
    expect(requireReserveRunPremium).toHaveBeenCalledTimes(1)
    expect(requireReserveRunPremium).toHaveBeenCalledWith(client, baseRun, 'manager')
    void calls
  })

  it('passes through the gate denial, with no reserve_awards read or delete', async () => {
    const gateError = new Response(JSON.stringify({ error: 'gate', code: 'premium_required' }), { status: 403 })
    vi.mocked(requireReserveRunPremium).mockResolvedValue({ allowed: false, error: gateError } as never)
    const { client, calls } = makeClient({})
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: RUN_ID }) })
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json).toEqual({ error: 'gate', code: 'premium_required' })
    expect(calls.some(c => c.table === 'reserve_awards')).toBe(false)
  })

  it('does not call requireReserveRunPremium when verifyReserveRunAccess denies', async () => {
    vi.mocked(verifyReserveRunAccess).mockResolvedValue({ allowed: false, actor: 'none', run: null, reason: 'Forbidden' } as never)
    const { client } = makeClient({})
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await DELETE(makeDeleteRequest(), { params: Promise.resolve({ id: RUN_ID }) })

    expect(res.status).toBe(403)
    expect(requireReserveRunPremium).not.toHaveBeenCalled()
  })
})
