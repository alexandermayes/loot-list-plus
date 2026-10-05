// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { logReserveAudit } from '@/utils/reserve-audit'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/reserve-audit', () => ({ logReserveAudit: vi.fn() }))

const id = (n: number) => `eeeeeeee-0000-0000-0000-${String(n).padStart(12, '0')}`

const GUILD_ID = id(1)
const TIER_ID = id(2)
const ITEM_ID = id(3)
const CREATOR_ID = id(10)
const GONE_ID = id(11)
const SOLO_ID = id(12)

const RUN_OPEN = id(100)
const RUN_LOCKED = id(101)
const RUN_LEFT = id(102)
const RUN_SOLO = id(103)

const SHARE_OPEN = 'share-open'
const SHARE_LOCKED = 'share-locked'
const SHARE_LEFT = 'share-left'
const SHARE_SOLO = 'share-solo'
const SHARE_UNKNOWN = 'share-unknown'

type Row = Record<string, unknown>
type Op = 'select' | 'insert' | 'update' | 'delete'
type Filter = ['eq' | 'in' | 'ilike' | 'lt', string, unknown]
interface Call { table: string; op: Op; filters: Filter[]; selectCols?: string; payload?: unknown }

interface Fixture {
  reserve_runs: Row[]
  raid_tiers: Row[]
  guilds: Row[]
  loot_items: Row[]
  characters: Row[]
  character_guild_memberships: Row[]
  reserve_submissions: Row[]
  reserve_awards: Row[]
  errorOn?: Partial<Record<string, string>>
}

function applyFilters(rows: Row[], filters: Filter[]) {
  return rows.filter((row) =>
    filters.every(([kind, col, val]) => {
      if (kind === 'eq') return row[col] === val
      if (kind === 'in') return Array.isArray(val) && (val as unknown[]).includes(row[col])
      if (kind === 'ilike') return String(row[col]).toLowerCase() === String(val).toLowerCase()
      if (kind === 'lt') return typeof row[col] === 'string' && (row[col] as string) < (val as string)
      return true
    })
  )
}

function project(row: Row, selectCols: string | undefined): Row {
  if (!selectCols || selectCols.trim() === '*') return row
  const cols = selectCols.split(',').map((c) => c.trim()).filter(Boolean)
  const out: Row = {}
  for (const col of cols) {
    const key = col.split(':')[0].split('(')[0].trim()
    out[key] = row[key]
  }
  return out
}

/**
 * Recording fake client for the join route: from(table) records
 * { table, op, selectCols, filters, payload }; builder methods select,
 * insert, update, eq, in, ilike, order, limit, single, maybeSingle and a
 * thenable, answering from fixture rows projected to the selected columns.
 */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []
  const tables: Record<string, Row[]> = {
    reserve_runs: fixture.reserve_runs.map((r) => ({ ...r })),
    raid_tiers: fixture.raid_tiers.map((r) => ({ ...r })),
    guilds: fixture.guilds.map((r) => ({ ...r })),
    loot_items: fixture.loot_items.map((r) => ({ ...r })),
    characters: fixture.characters.map((r) => ({ ...r })),
    character_guild_memberships: fixture.character_guild_memberships.map((r) => ({ ...r })),
    reserve_submissions: fixture.reserve_submissions.map((r) => ({ ...r })),
    reserve_awards: fixture.reserve_awards.map((r) => ({ ...r })),
  }

  function respond(call: Call) {
    const errorMsg = fixture.errorOn?.[call.table]
    if (errorMsg) return { data: null, error: { message: errorMsg } }
    const rows = tables[call.table] || []
    if (call.op === 'update') {
      const matched = applyFilters(rows, call.filters)
      matched.forEach((row) => Object.assign(row, call.payload as Row))
      return { data: matched.map((r) => project(r, call.selectCols)), error: null }
    }
    if (call.op === 'insert') {
      const inserted = { id: `generated-${tables[call.table].length + 1}`, ...(call.payload as Row) }
      tables[call.table].push(inserted)
      return { data: [project(inserted, call.selectCols)], error: null }
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
        eq: (col: string, val: unknown) => { call.filters.push(['eq', col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push(['in', col, val]); return builder },
        ilike: (col: string, val: unknown) => { call.filters.push(['ilike', col, val]); return builder },
        lt: (col: string, val: unknown) => { call.filters.push(['lt', col, val]); return builder },
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
    max_reserves: 2,
    max_reserves_per_item: null,
    allow_duplicates: false,
    hard_reserves: [],
    raid_tier_id: TIER_ID,
    enforce_class_restrictions: false,
    visibility: 'hidden_until_lock',
    title: 'Run',
    raid_at: '1',
    lock_at: '1',
    locked_at: null,
    rules_note: null,
    rule_snapshot: {},
    discord_invite_url: null,
    expansion_id: null,
    ...overrides,
  })
  return {
    reserve_runs: [
      { id: RUN_OPEN, share_token: SHARE_OPEN, ...run({ id: RUN_OPEN, created_by: CREATOR_ID, raid_leader_token: 'TOK' }) },
      { id: RUN_LOCKED, share_token: SHARE_LOCKED, ...run({ id: RUN_LOCKED, created_by: CREATOR_ID, raid_leader_token: 'TOK', status: 'locked' }) },
      { id: RUN_LEFT, share_token: SHARE_LEFT, ...run({ id: RUN_LEFT, created_by: GONE_ID, raid_leader_token: 'TOK_L' }) },
      { id: RUN_SOLO, share_token: SHARE_SOLO, ...run({ id: RUN_SOLO, created_by: SOLO_ID, raid_leader_token: 'TOK_S', guild_id: null }) },
    ],
    raid_tiers: [{ id: TIER_ID, name: 'Tier 1' }],
    guilds: [{ id: GUILD_ID, name: 'Guild', subscription_tier: 'pro' }],
    loot_items: [{ id: ITEM_ID, name: 'Sword', armor_type: null, boss_name: 'Boss', item_slot: 'weapon', wowhead_id: 1, classification: 'epic', raid_tier_id: TIER_ID, is_available: true }],
    characters: [
      { id: 'char-creator', user_id: CREATOR_ID, name: 'Creator', is_main: true, class: { name: 'Warrior', color_hex: '#fff' }, spec: { name: 'Fury' } },
      { id: 'char-gone', user_id: GONE_ID, name: 'Gone', is_main: true, class: { name: 'Mage', color_hex: '#fff' }, spec: { name: 'Fire' } },
    ],
    character_guild_memberships: [
      { id: 'mem-creator', guild_id: GUILD_ID, character_id: 'char-creator', is_active: true },
      { id: 'mem-gone', guild_id: GUILD_ID, character_id: 'char-gone', is_active: false },
    ],
    reserve_submissions: [
      { id: 'sub-locked', reserve_run_id: RUN_LOCKED, status: 'submitted', character_name: 'Dana', character_class: 'Rogue', character_spec: null, items: [ITEM_ID], created_at: '1' },
    ],
    reserve_awards: [],
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

const submissionCalls = (calls: Call[]) => calls.filter((c) => c.table === 'reserve_submissions' && c.op === 'select')

function getRequest(token: string) {
  return new NextRequest(`http://localhost/api/reserve-runs/join/${token}`)
}

function postRequest(token: string, body: unknown) {
  return new NextRequest(`http://localhost/api/reserve-runs/join/${token}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/reserve-runs/join/[token]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('gives a signed-out guest no run id, created_by or token, and no sign-up read on an open hidden run', async () => {
    setUser(null)
    const calls = setClient(baseFixture())
    const res = await GET(getRequest(SHARE_OPEN), { params: Promise.resolve({ token: SHARE_OPEN }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.can_manage).toBe(false)
    expect(json.run).not.toHaveProperty('id')
    expect(json.run).not.toHaveProperty('created_by')
    expect(json.run).not.toHaveProperty('raid_leader_token')
    expect(json.run.title).toBe('Run')
    expect(json.items).toHaveLength(1)
    expect(json.submissions).toEqual([])
    expect(submissionCalls(calls)).toHaveLength(0)
  })

  it('gives a guest the sign-ups but still no run id on a locked run', async () => {
    setUser(null)
    setClient(baseFixture())
    const res = await GET(getRequest(SHARE_LOCKED), { params: Promise.resolve({ token: SHARE_LOCKED }) })
    const json = await res.json()
    expect(json.submissions).toHaveLength(1)
    expect(json.run).not.toHaveProperty('id')
  })

  it('gives the leader token holder the run id and created_by', async () => {
    const req = new NextRequest(`http://localhost/api/reserve-runs/join/${SHARE_OPEN}`, {
      headers: { 'x-reserve-leader-token': 'TOK' },
    })
    setUser(null)
    setClient(baseFixture())
    const res = await GET(req, { params: Promise.resolve({ token: SHARE_OPEN }) })
    const json = await res.json()
    expect(json.can_manage).toBe(true)
    expect(json.run.id).toBe(RUN_OPEN)
    expect(json.run.created_by).toBe(CREATOR_ID)
  })

  it('gives the creator who is an active member the run id', async () => {
    setUser(CREATOR_ID)
    setClient(baseFixture())
    const res = await GET(getRequest(SHARE_OPEN), { params: Promise.resolve({ token: SHARE_OPEN }) })
    const json = await res.json()
    expect(json.can_manage).toBe(true)
    expect(json.run.id).toBe(RUN_OPEN)
  })

  it('gives the creator who left the guild no run id and can_manage false', async () => {
    setUser(GONE_ID)
    setClient(baseFixture())
    const res = await GET(getRequest(SHARE_LEFT), { params: Promise.resolve({ token: SHARE_LEFT }) })
    const json = await res.json()
    expect(json.can_manage).toBe(false)
    expect(json.run).not.toHaveProperty('id')
  })

  it('gives the creator of a run with no guild can_manage true', async () => {
    setUser(SOLO_ID)
    setClient(baseFixture())
    const res = await GET(getRequest(SHARE_SOLO), { params: Promise.resolve({ token: SHARE_SOLO }) })
    const json = await res.json()
    expect(json.can_manage).toBe(true)
  })

  it('returns 404 for an unknown share token', async () => {
    setUser(null)
    setClient(baseFixture())
    const res = await GET(getRequest(SHARE_UNKNOWN), { params: Promise.resolve({ token: SHARE_UNKNOWN }) })
    expect(res.status).toBe(404)
  })

  it('stays open (D-05): a free non-grandfathered guild still returns the same payload keys', async () => {
    setUser(null)
    const fixture = baseFixture()
    fixture.guilds = [{ id: GUILD_ID, name: 'Guild', subscription_tier: 'free' }]
    setClient(fixture)
    const res = await GET(getRequest(SHARE_OPEN), { params: Promise.resolve({ token: SHARE_OPEN }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.run.title).toBe('Run')
  })
})

describe('POST /api/reserve-runs/join/[token]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  const body = (overrides: Record<string, unknown> = {}) => ({
    character_name: 'Newbie',
    character_class: 'Warrior',
    items: [ITEM_ID],
    ...overrides,
  })

  it('creates a guest sign-up with no internal id keys in the response', async () => {
    const calls = setClient(baseFixture())
    const res = await POST(postRequest(SHARE_OPEN, body()), { params: Promise.resolve({ token: SHARE_OPEN }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.updated).toBe(false)
    expect(json.submission).not.toHaveProperty('reserve_run_id')
    expect(json.submission).not.toHaveProperty('character_id')
    expect(json.submission).not.toHaveProperty('user_id')
    const insertCall = calls.find((c) => c.table === 'reserve_submissions' && c.op === 'insert')
    expect(insertCall?.selectCols).toBe('id, character_name, character_class, character_spec, items, status, created_at, updated_at')
  })

  it('updates an existing submission under the same name with the same column list', async () => {
    const fixture = baseFixture()
    fixture.reserve_submissions.push({
      id: 'sub-existing',
      reserve_run_id: RUN_OPEN,
      status: 'submitted',
      character_name: 'Newbie',
      character_class: 'Warrior',
      character_spec: null,
      items: [ITEM_ID],
      created_at: '1',
    })
    const calls = setClient(fixture)
    const res = await POST(postRequest(SHARE_OPEN, body()), { params: Promise.resolve({ token: SHARE_OPEN }) })
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.updated).toBe(true)
    expect(json.submission).not.toHaveProperty('reserve_run_id')
    const updateCall = calls.find((c) => c.table === 'reserve_submissions' && c.op === 'update')
    expect(updateCall?.selectCols).toBe('id, character_name, character_class, character_spec, items, status, created_at, updated_at')
  })

  it('refuses a sign-up on a locked run', async () => {
    setClient(baseFixture())
    const res = await POST(postRequest(SHARE_LOCKED, body()), { params: Promise.resolve({ token: SHARE_LOCKED }) })
    const json = await res.json()
    expect(res.status).toBe(400)
    expect(json.error).toBe('This run is no longer accepting reserves')
  })

  // D-04, D-07: the run's guild needs Premium or reserve grandfathering.
  function freeFixture(): Fixture {
    const fixture = baseFixture()
    fixture.guilds = [{ id: GUILD_ID, name: 'Guild', subscription_tier: 'free' }]
    return fixture
  }

  it('refuses a guest sign-up on a free non-grandfathered guild with C-3, no insert or update', async () => {
    const calls = setClient(freeFixture())
    const res = await POST(postRequest(SHARE_OPEN, body()), { params: Promise.resolve({ token: SHARE_OPEN }) })
    const json = await res.json()
    expect(res.status).toBe(403)
    expect(json).toEqual({
      error: "This run can't take reserves right now because its guild doesn't have LootList+ Premium. Let your raid leader know.",
      code: 'premium_required',
    })
    expect(calls.some((c) => c.table === 'reserve_submissions' && (c.op === 'insert' || c.op === 'update'))).toBe(false)
  })

  it('refuses a guest sign-up on a run with no guild when its creator has no Premium guild', async () => {
    const fixture = baseFixture()
    fixture.guilds = []
    const calls = setClient(fixture)
    const res = await POST(postRequest(SHARE_SOLO, body()), { params: Promise.resolve({ token: SHARE_SOLO }) })
    const json = await res.json()
    expect(res.status).toBe(403)
    expect(json.code).toBe('premium_required')
    expect(calls.some((c) => c.table === 'reserve_submissions' && (c.op === 'insert' || c.op === 'update'))).toBe(false)
  })

  it('accepts a guest sign-up on a run with no guild when its creator is active in a pro guild', async () => {
    const fixture = baseFixture()
    const SECOND_GUILD_ID = id(2)
    fixture.guilds = [{ id: SECOND_GUILD_ID, name: 'Second Guild', subscription_tier: 'pro' }]
    fixture.characters.push({ id: 'char-solo', user_id: SOLO_ID, name: 'Solo', is_main: true, class: { name: 'Hunter', color_hex: '#fff' }, spec: { name: 'BM' } })
    fixture.character_guild_memberships.push({ id: 'mem-solo', guild_id: SECOND_GUILD_ID, character_id: 'char-solo', is_active: true })
    const calls = setClient(fixture)
    const res = await POST(postRequest(SHARE_SOLO, body()), { params: Promise.resolve({ token: SHARE_SOLO }) })
    expect(res.status).toBe(200)
    expect(calls.some((c) => c.table === 'reserve_submissions' && c.op === 'insert')).toBe(true)
  })

  it('still gives a missing character name the existing 400 before any guilds read', async () => {
    const calls = setClient(freeFixture())
    const res = await POST(postRequest(SHARE_OPEN, body({ character_name: '' })), { params: Promise.resolve({ token: SHARE_OPEN }) })
    expect(res.status).toBe(400)
    expect(calls.some((c) => c.table === 'guilds')).toBe(false)
  })

  it('still gives an unknown token the existing 404 before any guilds read', async () => {
    const calls = setClient(freeFixture())
    const res = await POST(postRequest(SHARE_UNKNOWN, body()), { params: Promise.resolve({ token: SHARE_UNKNOWN }) })
    expect(res.status).toBe(404)
    expect(calls.some((c) => c.table === 'guilds')).toBe(false)
  })

  it('answers 500 with nothing written when the guilds read errors', async () => {
    const fixture = baseFixture()
    fixture.errorOn = { guilds: 'db down' }
    const calls = setClient(fixture)
    const res = await POST(postRequest(SHARE_OPEN, body()), { params: Promise.resolve({ token: SHARE_OPEN }) })
    const json = await res.json()
    expect(res.status).toBe(500)
    expect(json.error).toBe('Internal server error')
    expect(calls.some((c) => c.table === 'reserve_submissions' && (c.op === 'insert' || c.op === 'update'))).toBe(false)
  })
})

void logReserveAudit
