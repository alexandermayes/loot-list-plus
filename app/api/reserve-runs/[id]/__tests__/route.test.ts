// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH, DELETE } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'
import { trackEvent } from '@/utils/analytics/server'
import { logReserveAudit } from '@/utils/reserve-audit'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn() }))
vi.mock('@/utils/reserve-audit', () => ({ logReserveAudit: vi.fn() }))

const id = (n: number) => `aaaaaaaa-0000-0000-0000-${String(n).padStart(12, '0')}`

const GUILD_ID = id(1)
const TIER_ID = id(2)
const CREATOR_ID = id(10)
const OFFICER_ID = id(11)
const MEMBER_ID = id(12)
const GONE_ID = id(13)
const SOLO_ID = id(14)
const OUTSIDER_ID = id(15)

const RUN_RG = id(100)
const RUN_RGL = id(101)
const RUN_RGP = id(102)
const RUN_RLEFT = id(103)
const RUN_RN = id(104)
const UNKNOWN_RUN = id(199)

type Row = Record<string, unknown>
type Op = 'select' | 'insert' | 'update' | 'delete'
type Filter = ['eq' | 'in', string, unknown]
interface Call { table: string; op: Op; filters: Filter[]; selectCols?: string; payload?: unknown }

interface Fixture {
  reserve_runs: Row[]
  characters: Row[]
  character_guild_memberships: Row[]
  reserve_submissions: Row[]
  reserve_awards: Row[]
  loot_items: Row[]
  raid_tiers: Row[]
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

// Projects a row down to the columns named in a select() call, mirroring
// Supabase: an explicit column list never returns a column it did not name.
function project(row: Row, selectCols: string | undefined): Row {
  if (!selectCols || selectCols === '*') return row
  const cols = selectCols.split(',').map((c) => c.trim())
  const out: Row = {}
  for (const col of cols) out[col] = row[col]
  return out
}

/**
 * Recording fake client shared by the detail route's GET, PATCH and DELETE
 * tests: from(table) records { table, op, selectCols, filters, payload };
 * builder methods select, insert, update, delete, eq, in, order, limit,
 * single, maybeSingle and a thenable; respond() answers from fixture rows
 * filtered by the recorded eq/in calls, or with an error when errorOn
 * names the table.
 */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []
  const tables: Record<string, Row[]> = {
    reserve_runs: fixture.reserve_runs.map((r) => ({ ...r })),
    characters: fixture.characters.map((r) => ({ ...r })),
    character_guild_memberships: fixture.character_guild_memberships.map((r) => ({ ...r })),
    reserve_submissions: fixture.reserve_submissions.map((r) => ({ ...r })),
    reserve_awards: fixture.reserve_awards.map((r) => ({ ...r })),
    loot_items: fixture.loot_items.map((r) => ({ ...r })),
    raid_tiers: fixture.raid_tiers.map((r) => ({ ...r })),
  }

  function respond(call: Call): { data: unknown; error: { message: string } | null } {
    const errorMsg = fixture.errorOn?.[call.table]
    if (errorMsg) return { data: null, error: { message: errorMsg } }

    const rows = tables[call.table] || []

    if (call.op === 'update') {
      const matched = applyFilters(rows, call.filters)
      matched.forEach((row) => Object.assign(row, call.payload as Row))
      return { data: matched, error: null }
    }
    if (call.op === 'delete') {
      const matched = applyFilters(rows, call.filters)
      tables[call.table] = rows.filter((r) => !matched.includes(r))
      return { data: matched, error: null }
    }
    if (call.op === 'insert') {
      return { data: [call.payload as Row], error: null }
    }
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
        update: (payload: unknown) => { call.op = 'update'; call.payload = payload; return builder },
        delete: () => { call.op = 'delete'; return builder },
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
        maybeSingle: () => {
          const result = respond(call)
          if (result.error) return Promise.resolve(result)
          const rows = result.data as Row[]
          return Promise.resolve({ data: rows[0] ?? null, error: null })
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
    visibility: 'hidden_until_lock',
    max_reserves: 2,
    max_reserves_per_item: null,
    allow_duplicates: false,
    enforce_class_restrictions: false,
    rules_note: null,
    discord_invite_url: null,
    hard_reserves: [],
    rule_snapshot: {},
    share_token: 'share-token',
    locked_at: null,
    raid_at: '2026-10-10T00:00:00.000Z',
    lock_at: '2026-10-09T00:00:00.000Z',
    created_at: '2026-10-01T00:00:00.000Z',
    updated_at: '2026-10-01T00:00:00.000Z',
    expansion_id: null,
    raid_team_id: null,
    raid_tier_id: TIER_ID,
    title: 'Run',
    ...overrides,
  })

  return {
    reserve_runs: [
      run({ id: RUN_RG, created_by: CREATOR_ID, raid_leader_token: 'TOK_G' }),
      run({ id: RUN_RGL, created_by: CREATOR_ID, raid_leader_token: 'TOK_G', status: 'locked' }),
      run({ id: RUN_RGP, created_by: CREATOR_ID, raid_leader_token: 'TOK_G', visibility: 'public_live' }),
      run({ id: RUN_RLEFT, created_by: GONE_ID, raid_leader_token: 'TOK_L' }),
      run({ id: RUN_RN, created_by: SOLO_ID, raid_leader_token: 'TOK_N', guild_id: null }),
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
    reserve_submissions: [
      { id: 'sub-1', reserve_run_id: RUN_RG, status: 'submitted', character_name: 'Alice', character_class: 'Warrior', character_spec: null, items: ['item-a', 'item-b'], created_at: '1', updated_at: '1' },
      { id: 'sub-2', reserve_run_id: RUN_RG, status: 'submitted', character_name: 'Bob', character_class: 'Mage', character_spec: null, items: ['item-c'], created_at: '2', updated_at: '2' },
      { id: 'sub-3', reserve_run_id: RUN_RGL, status: 'submitted', character_name: 'Carl', character_class: 'Priest', character_spec: null, items: ['item-d'], created_at: '3', updated_at: '3' },
      { id: 'sub-4', reserve_run_id: RUN_RGP, status: 'submitted', character_name: 'Dana', character_class: 'Rogue', character_spec: null, items: ['item-e'], created_at: '4', updated_at: '4' },
    ],
    reserve_awards: [
      { id: 'award-1', reserve_run_id: RUN_RG, loot_item_id: 'item-a', character_name: 'Alice', submission_id: 'sub-1', awarded_at: '1', notes: null, awarded_by: 'should-never-be-selected' },
    ],
    loot_items: [],
    raid_tiers: [{ id: TIER_ID, name: 'Tier 1' }],
  }
}

function request(runId: string, opts: { token?: string } = {}) {
  const headers = new Headers()
  if (opts.token) headers.set('x-reserve-leader-token', opts.token)
  return new NextRequest(`http://localhost/api/reserve-runs/${runId}`, { headers })
}

function patchRequest(runId: string, body: unknown, opts: { token?: string } = {}) {
  const headers = new Headers({ 'content-type': 'application/json' })
  if (opts.token) headers.set('x-reserve-leader-token', opts.token)
  return new NextRequest(`http://localhost/api/reserve-runs/${runId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
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

const submissionCalls = (calls: Call[]) => calls.filter((c) => c.table === 'reserve_submissions' && c.op === 'select')
const runUpdateCalls = (calls: Call[]) => calls.filter((c) => c.table === 'reserve_runs' && c.op === 'update')
const runDeleteCalls = (calls: Call[]) => calls.filter((c) => c.table === 'reserve_runs' && c.op === 'delete')

describe('GET /api/reserve-runs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(verifyPermission).mockImplementation(async (_sb, userId, guildId) =>
      userId === OFFICER_ID && guildId === GUILD_ID ? { hasPermission: true } : { hasPermission: false }
    )
  })

  it('returns the full run, the leader token and stored items to the creator', async () => {
    setUser(CREATOR_ID)
    const calls = setClient(baseFixture())
    const res = await GET(request(RUN_RG), { params: Promise.resolve({ id: RUN_RG }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.can_manage).toBe(true)
    expect(json.run.raid_leader_token).toBe('TOK_G')
    expect(json.run.created_by).toBe(CREATOR_ID)
    const [a, b] = json.run.submissions
    expect(a.items).toEqual(['item-a', 'item-b'])
    expect(a.item_count).toBe(2)
    expect(b.items).toEqual(['item-c'])
    expect(b.item_count).toBe(1)
    void calls
  })

  it('returns the leader token to an officer with Manage reserves', async () => {
    setUser(OFFICER_ID)
    setClient(baseFixture())
    const res = await GET(request(RUN_RG), { params: Promise.resolve({ id: RUN_RG }) })
    const json = await res.json()
    expect(json.can_manage).toBe(true)
    expect(json.run.raid_leader_token).toBe('TOK_G')
  })

  it('withholds the leader token, created_by and reserved items from a viewing member while open and hidden', async () => {
    setUser(MEMBER_ID)
    const calls = setClient(baseFixture())
    const res = await GET(request(RUN_RG), { params: Promise.resolve({ id: RUN_RG }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.can_manage).toBe(false)
    expect(json.run).not.toHaveProperty('raid_leader_token')
    expect(json.run).not.toHaveProperty('created_by')
    expect(json.run.share_token).toBe('share-token')
    const [a, b] = json.run.submissions
    expect(a.items).toEqual([])
    expect(a.item_count).toBe(2)
    expect(b.items).toEqual([])
    expect(b.item_count).toBe(1)
    expect(json.run.awards[0]).not.toHaveProperty('awarded_by')
    const subCall = submissionCalls(calls)[0]
    expect(subCall.selectCols).toBe('id, character_name, character_class, character_spec, items, created_at, updated_at')
  })

  it('sends stored items to a member once the run is locked', async () => {
    setUser(MEMBER_ID)
    setClient(baseFixture())
    const res = await GET(request(RUN_RGL), { params: Promise.resolve({ id: RUN_RGL }) })
    const json = await res.json()
    expect(json.run.submissions[0].items).toEqual(['item-d'])
  })

  it('sends stored items to a member when the run is public_live', async () => {
    setUser(MEMBER_ID)
    setClient(baseFixture())
    const res = await GET(request(RUN_RGP), { params: Promise.resolve({ id: RUN_RGP }) })
    const json = await res.json()
    expect(json.run.submissions[0].items).toEqual(['item-e'])
  })

  it('refuses a creator who left the guild, with no sign-up read', async () => {
    setUser(GONE_ID)
    const calls = setClient(baseFixture())
    const res = await GET(request(RUN_RLEFT), { params: Promise.resolve({ id: RUN_RLEFT }) })
    const json = await res.json()
    expect(res.status).toBe(403)
    expect(json.error).toBe('Forbidden')
    expect(submissionCalls(calls)).toHaveLength(0)
  })

  it('refuses a non-member, with no sign-up read', async () => {
    setUser(OUTSIDER_ID)
    const calls = setClient(baseFixture())
    const res = await GET(request(RUN_RG), { params: Promise.resolve({ id: RUN_RG }) })
    expect(res.status).toBe(403)
    expect(submissionCalls(calls)).toHaveLength(0)
  })

  it('returns 401 when signed out with no token', async () => {
    setUser(null)
    setClient(baseFixture())
    const res = await GET(request(RUN_RG), { params: Promise.resolve({ id: RUN_RG }) })
    const json = await res.json()
    expect(res.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('grants manager access signed out with the correct leader token', async () => {
    setUser(null)
    setClient(baseFixture())
    const res = await GET(request(RUN_RG, { token: 'TOK_G' }), { params: Promise.resolve({ id: RUN_RG }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.can_manage).toBe(true)
    expect(json.run.raid_leader_token).toBe('TOK_G')
  })

  it('returns 401 signed out with a wrong token', async () => {
    setUser(null)
    setClient(baseFixture())
    const res = await GET(request(RUN_RG, { token: 'wrong' }), { params: Promise.resolve({ id: RUN_RG }) })
    expect(res.status).toBe(401)
  })

  it('a run with no guild is managed by its creator', async () => {
    setUser(SOLO_ID)
    setClient(baseFixture())
    const res = await GET(request(RUN_RN), { params: Promise.resolve({ id: RUN_RN }) })
    const json = await res.json()
    expect(json.can_manage).toBe(true)
  })

  it('refuses a signed-in non-manager on a run with no guild', async () => {
    setUser(OUTSIDER_ID)
    setClient(baseFixture())
    const res = await GET(request(RUN_RN), { params: Promise.resolve({ id: RUN_RN }) })
    expect(res.status).toBe(403)
  })

  it('returns 401 signed out on a run with no guild', async () => {
    setUser(null)
    setClient(baseFixture())
    const res = await GET(request(RUN_RN), { params: Promise.resolve({ id: RUN_RN }) })
    expect(res.status).toBe(401)
  })

  it('grants manager access signed out with the leader token on a run with no guild, never calling verifyPermission', async () => {
    setUser(null)
    setClient(baseFixture())
    const res = await GET(request(RUN_RN, { token: 'TOK_N' }), { params: Promise.resolve({ id: RUN_RN }) })
    const json = await res.json()
    expect(json.can_manage).toBe(true)
    expect(verifyPermission).not.toHaveBeenCalled()
  })

  it('returns 404 for an unknown run', async () => {
    setUser(CREATOR_ID)
    setClient(baseFixture())
    const res = await GET(request(UNKNOWN_RUN), { params: Promise.resolve({ id: UNKNOWN_RUN }) })
    const json = await res.json()
    expect(res.status).toBe(404)
    expect(json.error).toBe('Run not found')
  })

  it('returns 500 with no sign-up read when the membership lookup errors for a member', async () => {
    setUser(MEMBER_ID)
    const fixture = baseFixture()
    fixture.errorOn = { characters: 'db down' }
    const calls = setClient(fixture)
    const res = await GET(request(RUN_RG), { params: Promise.resolve({ id: RUN_RG }) })
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).toBe('Internal server error')
    expect(submissionCalls(calls)).toHaveLength(0)
  })

  it('returns 500 when the sign-up read errors for the creator', async () => {
    setUser(CREATOR_ID)
    const fixture = baseFixture()
    fixture.errorOn = { reserve_submissions: 'db down' }
    setClient(fixture)
    const res = await GET(request(RUN_RG), { params: Promise.resolve({ id: RUN_RG }) })
    expect(res.status).toBe(500)
  })
})

describe('PATCH /api/reserve-runs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: false } as unknown as Awaited<ReturnType<typeof verifyPermission>>)
  })

  it('refuses a creator who left the guild, with no update call', async () => {
    setUser(GONE_ID)
    const calls = setClient(baseFixture())
    const res = await PATCH(patchRequest(RUN_RLEFT, { action: 'lock' }), { params: Promise.resolve({ id: RUN_RLEFT }) })
    expect(res.status).toBe(403)
    expect(runUpdateCalls(calls)).toHaveLength(0)
  })

  it('locks a run for its creator with one update call', async () => {
    setUser(CREATOR_ID)
    const calls = setClient(baseFixture())
    const res = await PATCH(patchRequest(RUN_RG, { action: 'lock' }), { params: Promise.resolve({ id: RUN_RG }) })
    expect(res.status).toBe(200)
    expect(runUpdateCalls(calls)).toHaveLength(1)
  })

  it('locks a run signed out with the leader token', async () => {
    setUser(null)
    setClient(baseFixture())
    const res = await PATCH(patchRequest(RUN_RG, { action: 'lock' }, { token: 'TOK_G' }), { params: Promise.resolve({ id: RUN_RG }) })
    expect(res.status).toBe(200)
  })
})

describe('DELETE /api/reserve-runs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: false } as unknown as Awaited<ReturnType<typeof verifyPermission>>)
  })

  it('refuses a creator who left the guild, with no delete call', async () => {
    setUser(GONE_ID)
    const calls = setClient(baseFixture())
    const res = await DELETE(request(RUN_RLEFT), { params: Promise.resolve({ id: RUN_RLEFT }) })
    expect(res.status).toBe(403)
    expect(runDeleteCalls(calls)).toHaveLength(0)
  })

  it('deletes a run with no guild for its creator', async () => {
    setUser(SOLO_ID)
    const calls = setClient(baseFixture())
    const res = await DELETE(request(RUN_RN), { params: Promise.resolve({ id: RUN_RN }) })
    expect(res.status).toBe(200)
    expect(runDeleteCalls(calls)).toHaveLength(1)
  })
})

// Referenced so eslint does not flag unused imports pulled in for mock typings.
void trackEvent
void logReserveAudit
