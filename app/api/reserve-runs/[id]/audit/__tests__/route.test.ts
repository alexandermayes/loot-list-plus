// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))

const id = (n: number) => `dddddddd-0000-0000-0000-${String(n).padStart(12, '0')}`

const GUILD_ID = id(1)
const CREATOR_ID = id(10)
const OFFICER_ID = id(11)
const MEMBER_ID = id(12)
const GONE_ID = id(13)
const OUTSIDER_ID = id(14)
const SOLO_ID = id(15)

const RUN_RG = id(100)
const RUN_RLEFT = id(101)
const RUN_RN = id(102)
const UNKNOWN_RUN = id(199)

type Row = Record<string, unknown>
type Op = 'select' | 'insert' | 'update' | 'delete'
type Filter = ['eq' | 'in', string, unknown]
interface Call { table: string; op: Op; filters: Filter[]; selectCols?: string }

interface Fixture {
  reserve_runs: Row[]
  characters: Row[]
  character_guild_memberships: Row[]
  reserve_audit_log: Row[]
  errorOn?: Partial<Record<string, string>>
}

function applyFilters(rows: Row[], filters: Filter[]) {
  return rows.filter((row) =>
    filters.every(([kind, col, val]) => {
      if (kind === 'eq') return row[col] === val
      if (kind === 'in') return Array.isArray(val) && (val as unknown[]).includes(row[col])
      return true
    })
  )
}

/**
 * Recording fake client for the audit route: from(table) records
 * { table, op, selectCols, filters }; builder methods select, eq, in,
 * order, limit, single and a thenable, answering from fixture rows.
 */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []
  const tables: Record<string, Row[]> = {
    reserve_runs: fixture.reserve_runs.map((r) => ({ ...r })),
    characters: fixture.characters.map((r) => ({ ...r })),
    character_guild_memberships: fixture.character_guild_memberships.map((r) => ({ ...r })),
    reserve_audit_log: fixture.reserve_audit_log.map((r) => ({ ...r })),
  }

  function respond(call: Call) {
    const errorMsg = fixture.errorOn?.[call.table]
    if (errorMsg) return { data: null, error: { message: errorMsg } }
    const rows = tables[call.table] || []
    return { data: applyFilters(rows, call.filters), error: null }
  }

  const client = {
    from(table: string) {
      const call: Call = { table, op: 'select', filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: (cols?: string) => { call.selectCols = cols; return builder },
        eq: (col: string, val: unknown) => { call.filters.push(['eq', col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push(['in', col, val]); return builder },
        order: () => builder,
        limit: () => builder,
        single: () => {
          const result = respond(call)
          if (result.error) return Promise.resolve(result)
          const rows = result.data as Row[]
          return Promise.resolve(rows.length > 0 ? { data: rows[0], error: null } : { data: null, error: { message: 'not found' } })
        },
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(respond(call)).then(resolve, reject),
      }
      return builder
    },
  }
  return { client, calls }
}

function baseFixture(): Fixture {
  return {
    reserve_runs: [
      { id: RUN_RG, guild_id: GUILD_ID, created_by: CREATOR_ID, raid_leader_token: 'TOK_G' },
      { id: RUN_RLEFT, guild_id: GUILD_ID, created_by: GONE_ID, raid_leader_token: 'TOK_L' },
      { id: RUN_RN, guild_id: null, created_by: SOLO_ID, raid_leader_token: 'TOK_N' },
    ],
    characters: [
      { id: 'char-creator', user_id: CREATOR_ID },
      { id: 'char-member', user_id: MEMBER_ID },
      { id: 'char-gone', user_id: GONE_ID },
      { id: 'char-solo', user_id: SOLO_ID },
      { id: 'char-outsider', user_id: OUTSIDER_ID },
    ],
    character_guild_memberships: [
      { id: 'mem-creator', guild_id: GUILD_ID, character_id: 'char-creator', is_active: true },
      { id: 'mem-member', guild_id: GUILD_ID, character_id: 'char-member', is_active: true },
      { id: 'mem-gone', guild_id: GUILD_ID, character_id: 'char-gone', is_active: false },
    ],
    reserve_audit_log: [
      { id: 'entry-1', reserve_run_id: RUN_RG, actor_user_id: CREATOR_ID, actor_label: 'creator@example.com', action: 'run_locked', details: {}, created_at: '1' },
    ],
  }
}

function setUser(userId: string | null) {
  vi.mocked(getAuthenticatedUser).mockResolvedValue(
    (userId ? { user: { id: userId }, error: null } : { user: null, error: null }) as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>
  )
}

function setClient(fixture: Fixture) {
  const { client, calls } = makeClient(fixture)
  vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceRoleClient>)
  return calls
}

const auditCalls = (calls: Call[]) => calls.filter((c) => c.table === 'reserve_audit_log')

function request(runId: string, opts: { token?: string } = {}) {
  const headers = new Headers()
  if (opts.token) headers.set('x-reserve-leader-token', opts.token)
  return new NextRequest(`http://localhost/api/reserve-runs/${runId}/audit`, { headers })
}

describe('GET /api/reserve-runs/[id]/audit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(verifyPermission).mockImplementation(async (_sb, userId, guildId) =>
      userId === OFFICER_ID && guildId === GUILD_ID ? { hasPermission: true } : { hasPermission: false }
    )
  })

  it('returns entries to the creator who is an active member', async () => {
    setUser(CREATOR_ID)
    setClient(baseFixture())
    const res = await GET(request(RUN_RG), { params: Promise.resolve({ id: RUN_RG }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.entries).toHaveLength(1)
  })

  it('returns entries to an officer with Manage reserves', async () => {
    setUser(OFFICER_ID)
    setClient(baseFixture())
    const res = await GET(request(RUN_RG), { params: Promise.resolve({ id: RUN_RG }) })
    expect(res.status).toBe(200)
  })

  it('returns entries to a signed-out caller with the leader token', async () => {
    setUser(null)
    setClient(baseFixture())
    const res = await GET(request(RUN_RG, { token: 'TOK_G' }), { params: Promise.resolve({ id: RUN_RG }) })
    expect(res.status).toBe(200)
  })

  it('refuses a member who only views, with no reserve_audit_log call', async () => {
    setUser(MEMBER_ID)
    const calls = setClient(baseFixture())
    const res = await GET(request(RUN_RG), { params: Promise.resolve({ id: RUN_RG }) })
    const json = await res.json()
    expect(res.status).toBe(403)
    expect(json.error).toBe('Forbidden')
    expect(auditCalls(calls)).toHaveLength(0)
  })

  it('refuses the creator who left the guild', async () => {
    setUser(GONE_ID)
    setClient(baseFixture())
    const res = await GET(request(RUN_RLEFT), { params: Promise.resolve({ id: RUN_RLEFT }) })
    expect(res.status).toBe(403)
  })

  it('returns 401 signed out with no token', async () => {
    setUser(null)
    setClient(baseFixture())
    const res = await GET(request(RUN_RG), { params: Promise.resolve({ id: RUN_RG }) })
    const json = await res.json()
    expect(res.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('refuses a signed-in non-creator on a run with no guild', async () => {
    setUser(OUTSIDER_ID)
    setClient(baseFixture())
    const res = await GET(request(RUN_RN), { params: Promise.resolve({ id: RUN_RN }) })
    expect(res.status).toBe(403)
  })

  it('returns 500 when the membership lookup errors for the creator', async () => {
    setUser(CREATOR_ID)
    const fixture = baseFixture()
    fixture.errorOn = { characters: 'db down' }
    const calls = setClient(fixture)
    const res = await GET(request(RUN_RG), { params: Promise.resolve({ id: RUN_RG }) })
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).toBe('Internal server error')
    expect(auditCalls(calls)).toHaveLength(0)
  })

  it('returns 404 for an unknown run', async () => {
    setUser(CREATOR_ID)
    setClient(baseFixture())
    const res = await GET(request(UNKNOWN_RUN), { params: Promise.resolve({ id: UNKNOWN_RUN }) })
    const json = await res.json()
    expect(res.status).toBe(404)
    expect(json.error).toBe('Run not found')
  })
})
