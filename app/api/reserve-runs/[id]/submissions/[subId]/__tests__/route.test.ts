// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
//
// First tests for this route (261004-jgk D-03, D-07): the run owner needs
// reserve access before a manager's sign-up edit or removal is allowed.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH, DELETE } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyReserveRunAccess } from '@/utils/reserve-access'
import { requireReserveRunPremium } from '@/utils/feature-gate'
import { logReserveAudit } from '@/utils/reserve-audit'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/reserve-access', () => ({ verifyReserveRunAccess: vi.fn() }))
vi.mock('@/utils/feature-gate', () => ({ requireReserveRunPremium: vi.fn() }))
vi.mock('@/utils/reserve-audit', () => ({ logReserveAudit: vi.fn() }))

const RUN_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const SUB_ID = 'aaaaaaaa-0000-0000-0000-000000000002'
const USER_ID = 'aaaaaaaa-0000-0000-0000-000000000003'

const baseRun = {
  id: RUN_ID,
  guild_id: 'bbbbbbbb-0000-0000-0000-000000000001',
  status: 'open',
  created_by: USER_ID,
  raid_leader_token: 'tok',
  raid_tier_id: 'cccccccc-0000-0000-0000-000000000001',
}

const baseSubmission = {
  id: SUB_ID,
  reserve_run_id: RUN_ID,
  character_name: 'Alice',
  character_class: 'Warrior',
  character_spec: null,
  items: ['item-a'],
}

/** Small recording fake for reserve_submissions select/update/delete. */
function makeClient(opts: { submission?: typeof baseSubmission | null } = {}) {
  const calls: Array<{ op: string; filters: Array<[string, unknown]>; payload?: unknown }> = []
  const submission = opts.submission === undefined ? baseSubmission : opts.submission
  const client = {
    from(table: string) {
      if (table !== 'reserve_submissions') throw new Error(`unexpected table ${table}`)
      const call = { op: 'select', filters: [] as Array<[string, unknown]>, payload: undefined as unknown }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        update: (payload: unknown) => { call.op = 'update'; call.payload = payload; return builder },
        delete: () => { call.op = 'delete'; return builder },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        single: () => {
          if (call.op === 'update') {
            return Promise.resolve(submission ? { data: { ...submission, ...(call.payload as object) }, error: null } : { data: null, error: { message: 'not found' } })
          }
          return Promise.resolve(submission ? { data: submission, error: null } : { data: null, error: { message: 'not found' } })
        },
      }
      return builder
    },
  }
  return { client, calls }
}

function patchRequest(body: unknown) {
  return new NextRequest(`http://localhost/api/reserve-runs/${RUN_ID}/submissions/${SUB_ID}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function deleteRequest() {
  return new NextRequest(`http://localhost/api/reserve-runs/${RUN_ID}/submissions/${SUB_ID}`, { method: 'DELETE' })
}

function routeParams() {
  return { params: Promise.resolve({ id: RUN_ID, subId: SUB_ID }) }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID, email: 'o@example.test' } } as never)
  vi.mocked(verifyReserveRunAccess).mockResolvedValue({ allowed: true, actor: 'officer', run: baseRun } as never)
  vi.mocked(requireReserveRunPremium).mockResolvedValue({ allowed: true } as never)
  vi.mocked(logReserveAudit).mockResolvedValue(undefined)
})

describe('PATCH /api/reserve-runs/[id]/submissions/[subId]', () => {
  it('updates the submission for an allowed manager', async () => {
    const { client, calls } = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await PATCH(patchRequest({ character_name: 'Fixed' }), routeParams())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.submission.character_name).toBe('Fixed')
    expect(calls.filter((c) => c.op === 'update')).toHaveLength(1)
  })

  it('passes through the gate denial with no reserve_submissions call at all', async () => {
    const gateError = new Response(JSON.stringify({ error: 'gate', code: 'premium_required' }), { status: 403 })
    vi.mocked(requireReserveRunPremium).mockResolvedValue({ allowed: false, error: gateError } as never)
    const { client, calls } = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await PATCH(patchRequest({ character_name: 'Fixed' }), routeParams())
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json).toEqual({ error: 'gate', code: 'premium_required' })
    expect(calls).toHaveLength(0)
  })

  it('does not call the gate when access is denied (403 Forbidden)', async () => {
    vi.mocked(verifyReserveRunAccess).mockResolvedValue({ allowed: false, actor: 'none', run: null, reason: 'Forbidden' } as never)
    const { client } = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await PATCH(patchRequest({ character_name: 'Fixed' }), routeParams())

    expect(res.status).toBe(403)
    expect(requireReserveRunPremium).not.toHaveBeenCalled()
  })

  it('does not call the gate when the run is not found (404)', async () => {
    vi.mocked(verifyReserveRunAccess).mockResolvedValue({ allowed: false, actor: 'none', run: null, reason: 'Run not found' } as never)
    const { client } = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await PATCH(patchRequest({ character_name: 'Fixed' }), routeParams())

    expect(res.status).toBe(404)
    expect(requireReserveRunPremium).not.toHaveBeenCalled()
  })

  it('calls requireReserveRunPremium with the client, the run from access, and manager', async () => {
    const { client } = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    await PATCH(patchRequest({ character_name: 'Fixed' }), routeParams())

    expect(requireReserveRunPremium).toHaveBeenCalledTimes(1)
    expect(requireReserveRunPremium).toHaveBeenCalledWith(client, baseRun, 'manager')
  })
})

describe('DELETE /api/reserve-runs/[id]/submissions/[subId]', () => {
  it('deletes the submission when allowed', async () => {
    const { client, calls } = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await DELETE(deleteRequest(), routeParams())

    expect(res.status).toBe(200)
    expect(calls.filter((c) => c.op === 'delete')).toHaveLength(1)
  })

  it('passes through the gate denial with no delete call', async () => {
    const gateError = new Response(JSON.stringify({ error: 'gate', code: 'premium_required' }), { status: 403 })
    vi.mocked(requireReserveRunPremium).mockResolvedValue({ allowed: false, error: gateError } as never)
    const { client, calls } = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await DELETE(deleteRequest(), routeParams())
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json).toEqual({ error: 'gate', code: 'premium_required' })
    expect(calls.filter((c) => c.op === 'delete')).toHaveLength(0)
  })

  it('does not call the gate when access is denied (403 Forbidden)', async () => {
    vi.mocked(verifyReserveRunAccess).mockResolvedValue({ allowed: false, actor: 'none', run: null, reason: 'Forbidden' } as never)
    const { client } = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await DELETE(deleteRequest(), routeParams())

    expect(res.status).toBe(403)
    expect(requireReserveRunPremium).not.toHaveBeenCalled()
  })

  it('calls requireReserveRunPremium with the client, the run from access, and manager', async () => {
    const { client } = makeClient()
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    await DELETE(deleteRequest(), routeParams())

    expect(requireReserveRunPremium).toHaveBeenCalledTimes(1)
    expect(requireReserveRunPremium).toHaveBeenCalledWith(client, baseRun, 'manager')
  })
})
