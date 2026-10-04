// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'
import { requireReserveAccess } from '@/utils/feature-gate'
import { trackEvent } from '@/utils/analytics/server'
import { logReserveAudit } from '@/utils/reserve-audit'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))
vi.mock('@/utils/feature-gate', () => ({ requireReserveAccess: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn() }))
vi.mock('@/utils/reserve-audit', () => ({ logReserveAudit: vi.fn() }))

const id = (n: number) => `cccccccc-0000-0000-0000-${String(n).padStart(12, '0')}`

const GUILD_ID = id(1)
const CREATOR_ID = id(10)
const GONE_ID = id(11)
const SOLO_ID = id(12)
const LEADER_OUTSIDER_ID = id(13)

const RUN_GUILD = id(100)
const RUN_SOLO = id(101)

type Row = Record<string, unknown>
type Op = 'select' | 'insert' | 'update' | 'delete'
type Filter = ['eq' | 'in', string, unknown]
interface Call { table: string; op: Op; filters: Filter[]; selectCols?: string; payload?: unknown }

interface Fixture {
  reserve_runs: Row[]
  characters: Row[]
  character_guild_memberships: Row[]
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
 * Recording fake client for the duplicate route: from(table) records
 * { table, op, selectCols, filters, payload }; builder methods select,
 * insert, eq, in and a thenable/single terminal, answering from fixture
 * rows filtered by the recorded eq/in calls.
 */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []
  const tables: Record<string, Row[]> = {
    reserve_runs: fixture.reserve_runs.map((r) => ({ ...r })),
    characters: fixture.characters.map((r) => ({ ...r })),
    character_guild_memberships: fixture.character_guild_memberships.map((r) => ({ ...r })),
  }

  function respond(call: Call) {
    const rows = tables[call.table] || []
    if (call.op === 'insert') return { data: [call.payload as Row], error: null }
    return { data: applyFilters(rows, call.filters), error: null }
  }

  const client = {
    from(table: string) {
      const call: Call = { table, op: 'select', filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: (cols?: string) => { call.selectCols = cols; return builder },
        insert: (payload: unknown) => { call.op = 'insert'; call.payload = payload; return builder },
        eq: (col: string, val: unknown) => { call.filters.push(['eq', col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push(['in', col, val]); return builder },
        order: () => builder,
        limit: () => builder,
        single: () => {
          const result = respond(call)
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
  const run = (overrides: Row): Row => ({
    guild_id: GUILD_ID,
    status: 'open',
    raid_tier_id: 'tier-1',
    raid_team_id: null,
    expansion_id: null,
    title: 'Source',
    raid_at: '2026-10-10T00:00:00.000Z',
    lock_at: '2026-10-09T00:00:00.000Z',
    max_reserves: 2,
    max_reserves_per_item: null,
    allow_duplicates: false,
    visibility: 'hidden_until_lock',
    rules_note: null,
    hard_reserves: [],
    rule_snapshot: {},
    discord_invite_url: null,
    enforce_class_restrictions: false,
    raid_leader_token: 'TOK',
    ...overrides,
  })
  return {
    reserve_runs: [
      run({ id: RUN_GUILD, created_by: CREATOR_ID }),
      run({ id: RUN_SOLO, created_by: SOLO_ID, guild_id: null }),
    ],
    characters: [
      { id: 'char-creator', user_id: CREATOR_ID },
      { id: 'char-gone', user_id: GONE_ID },
      { id: 'char-solo', user_id: SOLO_ID },
      { id: 'char-leader-outsider', user_id: LEADER_OUTSIDER_ID },
    ],
    character_guild_memberships: [
      { id: 'mem-creator', guild_id: GUILD_ID, character_id: 'char-creator', is_active: true },
      { id: 'mem-gone', guild_id: GUILD_ID, character_id: 'char-gone', is_active: false },
    ],
  }
}

function setUser(userId: string | null) {
  vi.mocked(getAuthenticatedUser).mockResolvedValue(
    (userId ? { user: { id: userId, email: `${userId}@example.com` }, error: null } : { user: null, error: null }) as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>
  )
}

function setClient(fixture: Fixture) {
  const { client, calls } = makeClient(fixture)
  vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceRoleClient>)
  return calls
}

const runInsertCalls = (calls: Call[]) => calls.filter((c) => c.table === 'reserve_runs' && c.op === 'insert')

function request(runId: string, opts: { token?: string } = {}) {
  const headers = new Headers()
  if (opts.token) headers.set('x-reserve-leader-token', opts.token)
  return new NextRequest(`http://localhost/api/reserve-runs/${runId}/duplicate`, { method: 'POST', headers })
}

describe('POST /api/reserve-runs/[id]/duplicate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(requireReserveAccess).mockResolvedValue({ allowed: true })
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: false } as unknown as Awaited<ReturnType<typeof verifyPermission>>)
  })

  it('returns 401 signed out', async () => {
    setUser(null)
    setClient(baseFixture())
    const res = await POST(request(RUN_GUILD), { params: Promise.resolve({ id: RUN_GUILD }) })
    const json = await res.json()
    expect(res.status).toBe(401)
    expect(json.error).toBe('Sign in to duplicate a run')
  })

  it('refuses a signed-in leader-token holder who is not an active member of the guild, with no insert and no requireReserveAccess call', async () => {
    setUser(LEADER_OUTSIDER_ID)
    const calls = setClient(baseFixture())
    const res = await POST(request(RUN_GUILD, { token: 'TOK' }), { params: Promise.resolve({ id: RUN_GUILD }) })
    const json = await res.json()
    expect(res.status).toBe(403)
    expect(json.error).toBe('Not a guild member')
    expect(runInsertCalls(calls)).toHaveLength(0)
    expect(requireReserveAccess).not.toHaveBeenCalled()
  })

  it('duplicates a guild run for the creator who is an active member, with created_by the caller and guild_id the source guild', async () => {
    setUser(CREATOR_ID)
    const calls = setClient(baseFixture())
    const res = await POST(request(RUN_GUILD), { params: Promise.resolve({ id: RUN_GUILD }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    const inserts = runInsertCalls(calls)
    expect(inserts).toHaveLength(1)
    expect((inserts[0].payload as Row).created_by).toBe(CREATOR_ID)
    expect((inserts[0].payload as Row).guild_id).toBe(GUILD_ID)
    void json
  })

  it('refuses the creator who left the guild, with no insert', async () => {
    setUser(GONE_ID)
    const calls = setClient(baseFixture())
    const res = await POST(request(RUN_GUILD), { params: Promise.resolve({ id: RUN_GUILD }) })
    const json = await res.json()
    expect(res.status).toBe(403)
    expect(json.error).toBe('Forbidden')
    expect(runInsertCalls(calls)).toHaveLength(0)
  })

  it('duplicates a run with no guild for its creator, with no membership read', async () => {
    setUser(SOLO_ID)
    const calls = setClient(baseFixture())
    const res = await POST(request(RUN_SOLO), { params: Promise.resolve({ id: RUN_SOLO }) })
    expect(res.status).toBe(200)
    const membershipCalls = calls.filter((c) => c.table === 'character_guild_memberships')
    expect(membershipCalls).toHaveLength(0)
    expect(runInsertCalls(calls)).toHaveLength(1)
  })
})

void trackEvent
void logReserveAudit
