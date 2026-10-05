// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET, POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { requireReserveAccess, guildHasPaidAccess } from '@/utils/feature-gate'
import { trackEvent } from '@/utils/analytics/server'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/feature-gate', () => ({ requireReserveAccess: vi.fn(), guildHasPaidAccess: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn() }))

const id = (n: number) => `bbbbbbbb-0000-0000-0000-${String(n).padStart(12, '0')}`

const GUILD_ID = id(1)
const MEMBER_ID = id(10)
const OUTSIDER_ID = id(11)
const INACTIVE_ID = id(13)

type Row = Record<string, unknown>
type Op = 'select' | 'insert' | 'update' | 'delete'
type Filter = ['eq' | 'in', string, unknown]
interface Call { table: string; op: Op; filters: Filter[]; selectCols?: string; payload?: unknown }

interface Fixture {
  reserve_runs: Row[]
  characters: Row[]
  character_guild_memberships: Row[]
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

// Projects a row down to the columns named in a select() call (embeds like
// "reserve_submissions(count)" project to the bare "reserve_submissions"
// key), mirroring Supabase: an explicit column list never returns a column
// it did not name.
function project(row: Row, selectCols: string | undefined): Row {
  if (!selectCols || selectCols.trim() === '*') return row
  const cols = selectCols.split(',').map((c) => c.trim()).filter(Boolean)
  const out: Row = {}
  for (const col of cols) {
    const key = col.split('(')[0].trim()
    out[key] = row[key]
  }
  return out
}

/**
 * Recording fake client for the list and create routes: from(table)
 * records { table, op, selectCols, filters, payload }; builder methods
 * select, insert, eq, in, order and a thenable; a respond() answers from
 * fixture rows or with { data: null, error } when errorOn names the table.
 */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []
  const tables: Record<string, Row[]> = {
    reserve_runs: fixture.reserve_runs.map((r) => ({ ...r })),
    characters: fixture.characters.map((r) => ({ ...r })),
    character_guild_memberships: fixture.character_guild_memberships.map((r) => ({ ...r })),
  }

  function respond(call: Call) {
    const errorMsg = fixture.errorOn?.[call.table]
    if (errorMsg) return { data: null, error: { message: errorMsg } }
    const rows = tables[call.table] || []
    if (call.op === 'insert') return { data: [call.payload as Row], error: null }
    return { data: applyFilters(rows, call.filters).map((r) => project(r, call.selectCols)), error: null }
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
      { id: 'run-1', guild_id: GUILD_ID, raid_tier_id: 'tier-1', title: 'Run 1', status: 'open', raid_at: '1', lock_at: '1', locked_at: null, max_reserves: 2, visibility: 'hidden_until_lock', share_token: 'tok', created_at: '1', created_by: 'should-not-leak', raid_leader_token: 'should-not-leak' },
    ],
    characters: [
      { id: 'char-member', user_id: MEMBER_ID },
      { id: 'char-outsider', user_id: OUTSIDER_ID },
      { id: 'char-inactive', user_id: INACTIVE_ID },
    ],
    character_guild_memberships: [
      { id: 'mem-member', guild_id: GUILD_ID, character_id: 'char-member', is_active: true },
      { id: 'mem-inactive', guild_id: GUILD_ID, character_id: 'char-inactive', is_active: false },
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

const runSelectCalls = (calls: Call[]) => calls.filter((c) => c.table === 'reserve_runs' && c.op === 'select')
const runInsertCalls = (calls: Call[]) => calls.filter((c) => c.table === 'reserve_runs' && c.op === 'insert')

function listRequest(guildId?: string) {
  const url = guildId ? `http://localhost/api/reserve-runs?guild_id=${guildId}` : 'http://localhost/api/reserve-runs'
  return new NextRequest(url)
}

function postRequest(body: unknown) {
  return new NextRequest('http://localhost/api/reserve-runs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/reserve-runs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(guildHasPaidAccess).mockResolvedValue(true)
  })

  it('returns 401 signed out', async () => {
    setUser(null)
    setClient(baseFixture())
    const res = await GET(listRequest(GUILD_ID))
    expect(res.status).toBe(401)
  })

  it('returns 400 with no guild_id', async () => {
    setUser(MEMBER_ID)
    setClient(baseFixture())
    const res = await GET(listRequest())
    expect(res.status).toBe(400)
  })

  it('returns runs to an active member with an explicit column list, no raid_leader_token or created_by', async () => {
    setUser(MEMBER_ID)
    const calls = setClient(baseFixture())
    const res = await GET(listRequest(GUILD_ID))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.runs).toHaveLength(1)
    expect(json.runs[0]).not.toHaveProperty('raid_leader_token')
    const call = runSelectCalls(calls)[0]
    expect(call.selectCols).toContain('share_token')
    expect(call.selectCols).not.toContain('raid_leader_token')
    expect(call.selectCols).not.toContain('created_by')
    expect(call.selectCols?.trim().startsWith('*')).toBe(false)
  })

  it('refuses an inactive member with no reserve_runs call', async () => {
    setUser(INACTIVE_ID)
    const calls = setClient(baseFixture())
    const res = await GET(listRequest(GUILD_ID))
    const json = await res.json()
    expect(res.status).toBe(403)
    expect(json.error).toBe('Not a guild member')
    expect(runSelectCalls(calls)).toHaveLength(0)
  })

  it('refuses a caller with no characters, with no reserve_runs call', async () => {
    setUser(OUTSIDER_ID)
    const calls = setClient(baseFixture())
    const res = await GET(listRequest(GUILD_ID))
    expect(res.status).toBe(403)
    expect(runSelectCalls(calls)).toHaveLength(0)
  })

  it('refuses a malformed guild_id with no database call at all', async () => {
    setUser(MEMBER_ID)
    const calls = setClient(baseFixture())
    const res = await GET(listRequest('not-a-uuid'))
    const json = await res.json()
    expect(res.status).toBe(403)
    expect(json.error).toBe('Not a guild member')
    expect(calls).toHaveLength(0)
  })

  it('returns 500 with no reserve_runs call when the membership lookup errors', async () => {
    setUser(MEMBER_ID)
    const fixture = baseFixture()
    fixture.errorOn = { characters: 'db down' }
    const calls = setClient(fixture)
    const res = await GET(listRequest(GUILD_ID))
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).toBe('Internal server error')
    expect(runSelectCalls(calls)).toHaveLength(0)
  })

  // D-06: reserve_access tells the Reserve page whether the guild can
  // create and change runs.
  it('returns reserve_access true for an active member, calling guildHasPaidAccess with the client, guild id and reserve_runs', async () => {
    setUser(MEMBER_ID)
    setClient(baseFixture())
    const res = await GET(listRequest(GUILD_ID))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.reserve_access).toBe(true)
    expect(json.runs).toHaveLength(1)
    expect(guildHasPaidAccess).toHaveBeenCalledWith(createServiceRoleClient(), GUILD_ID, 'reserve_runs')
  })

  it('returns reserve_access false with the runs still returned when guildHasPaidAccess resolves false', async () => {
    setUser(MEMBER_ID)
    vi.mocked(guildHasPaidAccess).mockResolvedValue(false)
    setClient(baseFixture())
    const res = await GET(listRequest(GUILD_ID))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.reserve_access).toBe(false)
    expect(json.runs).toHaveLength(1)
  })

  it('returns reserve_access null, 200 and the runs when guildHasPaidAccess rejects, logging with a constant message', async () => {
    setUser(MEMBER_ID)
    vi.mocked(guildHasPaidAccess).mockRejectedValue(new Error('boom'))
    setClient(baseFixture())
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await GET(listRequest(GUILD_ID))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.reserve_access).toBeNull()
    expect(json.runs).toHaveLength(1)
    expect(consoleSpy).toHaveBeenCalledWith('Reserve runs GET: reserve access read failed:', expect.any(Error))
  })

  it('does not call guildHasPaidAccess for a non-member', async () => {
    setUser(OUTSIDER_ID)
    setClient(baseFixture())
    const res = await GET(listRequest(GUILD_ID))
    expect(res.status).toBe(403)
    expect(guildHasPaidAccess).not.toHaveBeenCalled()
  })
})

describe('POST /api/reserve-runs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(requireReserveAccess).mockResolvedValue({ allowed: true })
  })

  const validBody = (overrides: Record<string, unknown> = {}) => ({
    guild_id: GUILD_ID,
    raid_tier_id: 'tier-1',
    title: 'New run',
    raid_at: '2026-10-10T00:00:00.000Z',
    lock_at: '2026-10-09T00:00:00.000Z',
    ...overrides,
  })

  it('refuses a non-member with no requireReserveAccess call and no insert', async () => {
    setUser(OUTSIDER_ID)
    const calls = setClient(baseFixture())
    const res = await POST(postRequest(validBody()))
    const json = await res.json()
    expect(res.status).toBe(403)
    expect(json.error).toBe('Not a guild member')
    expect(requireReserveAccess).not.toHaveBeenCalled()
    expect(runInsertCalls(calls)).toHaveLength(0)
  })

  it('creates a run for an active member, calling requireReserveAccess once', async () => {
    setUser(MEMBER_ID)
    const calls = setClient(baseFixture())
    const res = await POST(postRequest(validBody()))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(requireReserveAccess).toHaveBeenCalledTimes(1)
    const inserts = runInsertCalls(calls)
    expect(inserts).toHaveLength(1)
    expect((inserts[0].payload as Row).created_by).toBe(MEMBER_ID)
    void json
  })

  it('returns the Premium gate response for an active member of a non-Premium guild, with no insert', async () => {
    setUser(MEMBER_ID)
    const calls = setClient(baseFixture())
    vi.mocked(requireReserveAccess).mockResolvedValue({
      allowed: false,
      error: NextResponse.json({ error: 'Reserve runs are a LootList+ Premium feature.' }, { status: 403 }),
    })
    const res = await POST(postRequest(validBody()))
    expect(res.status).toBe(403)
    expect(runInsertCalls(calls)).toHaveLength(0)
  })

  it('inserts with guild_id null and makes no membership read when guild_id is absent', async () => {
    setUser(MEMBER_ID)
    const calls = setClient(baseFixture())
    const res = await POST(postRequest(validBody({ guild_id: undefined })))
    expect(res.status).toBe(200)
    const membershipCalls = calls.filter((c) => c.table === 'character_guild_memberships')
    expect(membershipCalls).toHaveLength(0)
    const inserts = runInsertCalls(calls)
    expect((inserts[0].payload as Row).guild_id).toBeNull()
  })
})

void trackEvent
