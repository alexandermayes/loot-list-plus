// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackApiError } from '@/utils/analytics/server'

// Deliberately NOT mocked: '@/utils/feature-gate' and '../_helpers' must run
// for real against the fake client below, so these tests prove the route
// calls the real Premium gate rather than a reimplementation of it (UE3).
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), trackApiError: vi.fn() }))

const BOT_KEY = 'test-bot-key'

const GUILD = 'aaaaaaaa-0000-0000-0000-000000000001'
const DISCORD = 'discord-server-1'
const ACTIVE_CHAR = 'aaaaaaaa-0000-0000-0000-000000000005'
const UNKNOWN_DISCORD = 'unknown-server'

type Row = Record<string, unknown>

interface FailSpec {
  table: string
  select?: string
}

interface Filter {
  type: 'eq'
  col: string
  val: unknown
}

interface RecordedCall {
  table: string
  select: string
  filters: Filter[]
  orders: Array<{ col: string; ascending: boolean }>
  limit?: number
}

/**
 * Generic in-memory recording fake, mirroring
 * app/api/bot/priority/__tests__/route.test.ts, trimmed to what /score uses
 * (no `in` or `range`). Every from(table) call records its select string,
 * filters, orders and limit. options.fail is a list of { table, select? };
 * a matching call resolves { data: null, error }.
 */
function makeClient(tables: Record<string, Row[]>, options?: { fail?: FailSpec[] }) {
  const calls: RecordedCall[] = []

  function matchesFail(call: RecordedCall): boolean {
    if (!options?.fail) return false
    return options.fail.some(
      (f) => f.table === call.table && (f.select === undefined || f.select === call.select)
    )
  }

  function applyFilters(rows: Row[], filters: Filter[]): Row[] {
    return rows.filter((row) => filters.every((f) => row[f.col] === f.val))
  }

  function compareValues(a: unknown, b: unknown): number {
    if (a === b) return 0
    if (typeof a === 'number' && typeof b === 'number') return a - b
    return String(a) < String(b) ? -1 : 1
  }

  function applyOrders(rows: Row[], orders: RecordedCall['orders']): Row[] {
    const sorted = rows.slice()
    for (let i = orders.length - 1; i >= 0; i--) {
      const { col, ascending } = orders[i]
      sorted.sort((a, b) => (ascending ? compareValues(a[col], b[col]) : -compareValues(a[col], b[col])))
    }
    return sorted
  }

  function resolveRows(call: RecordedCall): Row[] {
    let rows = applyFilters(tables[call.table] ?? [], call.filters)
    rows = applyOrders(rows, call.orders)
    if (call.limit != null) rows = rows.slice(0, call.limit)
    return rows
  }

  function from(table: string) {
    const call: RecordedCall = { table, select: '', filters: [], orders: [] }
    calls.push(call)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select(cols: string) {
        call.select = cols
        return builder
      },
      eq(col: string, val: unknown) {
        call.filters.push({ type: 'eq', col, val })
        return builder
      },
      order(col: string, opts?: { ascending?: boolean }) {
        call.orders.push({ col, ascending: opts?.ascending !== false })
        return builder
      },
      limit(n: number) {
        call.limit = n
        return builder
      },
      maybeSingle() {
        if (matchesFail(call)) return Promise.resolve({ data: null, error: { message: 'boom' } })
        const rows = resolveRows(call)
        return Promise.resolve({ data: rows[0] ?? null, error: null })
      },
      single() {
        if (matchesFail(call)) return Promise.resolve({ data: null, error: { message: 'boom' } })
        const rows = resolveRows(call)
        if (rows.length === 0) return Promise.resolve({ data: null, error: { message: 'not found' } })
        return Promise.resolve({ data: rows[0], error: null })
      },
      then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
        if (matchesFail(call)) {
          return Promise.resolve({ data: null, error: { message: 'boom' } }).then(resolve, reject)
        }
        const rows = resolveRows(call)
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject)
      },
    }
    return builder
  }

  return { client: { from }, calls }
}

function request(params: Record<string, string>, headers: Record<string, string> = { authorization: `Bot ${BOT_KEY}` }) {
  const url = new URL('http://localhost/api/bot/score')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url, { headers }) as unknown as Parameters<typeof GET>[0]
}

/** A pro guild with one active raider, no team, and settings computeAttendance needs. */
function baseTables(overrides: Partial<Record<string, Row[]>> = {}): Record<string, Row[]> {
  return {
    guilds: [
      {
        id: GUILD,
        name: 'Test Guild',
        discord_server_id: DISCORD,
        is_active: true,
        created_at: '2020-01-01T00:00:00Z',
        active_expansion_id: 'aaaaaaaa-0000-0000-0000-000000000002',
        subscription_tier: 'pro',
      },
    ],
    character_guild_memberships: [
      {
        character_id: ACTIVE_CHAR,
        guild_id: GUILD,
        is_active: true,
        characters: { id: ACTIVE_CHAR, name: 'Active' },
      },
    ],
    raid_team_members: [],
    guild_settings: [
      {
        guild_id: GUILD,
        rolling_attendance_weeks: 4,
        max_attendance_bonus: 4,
        raid_days_per_week: 2,
        first_raid_day: 3,
        second_raid_day: 4,
        week_reset_day: 2,
      },
    ],
    raid_events: [],
    attendance_records: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.stubEnv('BOT_API_KEY', BOT_KEY)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('GET /api/bot/score: auth runs before any database call', () => {
  it('answers 503 when BOT_API_KEY is unset, without calling createServiceRoleClient', async () => {
    vi.unstubAllEnvs()
    const res = await GET(request({ discord_guild_id: DISCORD, character_name: 'Active' }, { authorization: `Bot ${BOT_KEY}` }))
    expect(res.status).toBe(503)
    expect(createServiceRoleClient).not.toHaveBeenCalled()
  })

  it('answers 401 for a missing header, a Bearer scheme, and a wrong token, without calling createServiceRoleClient', async () => {
    const missing = await GET(request({ discord_guild_id: DISCORD, character_name: 'Active' }, {}))
    expect(missing.status).toBe(401)

    const bearer = await GET(
      request({ discord_guild_id: DISCORD, character_name: 'Active' }, { authorization: `Bearer ${BOT_KEY}` })
    )
    expect(bearer.status).toBe(401)

    const wrong = await GET(
      request({ discord_guild_id: DISCORD, character_name: 'Active' }, { authorization: 'Bot wrong-token' })
    )
    expect(wrong.status).toBe(401)

    expect(createServiceRoleClient).not.toHaveBeenCalled()
  })
})

describe('GET /api/bot/score: parameters and guild resolution', () => {
  it('a missing character_name gives 400', async () => {
    const { client } = makeClient(baseTables())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD }))
    expect(res.status).toBe(400)
  })

  it('an unknown server gives 404 no_guild_linked with no subscription_tier read', async () => {
    const { client, calls } = makeClient(baseTables())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: UNKNOWN_DISCORD, character_name: 'Active' }))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('no_guild_linked')
    expect(calls.some((c) => c.select === 'subscription_tier')).toBe(false)
  })
})

describe('UE3: Premium required (discord_bot)', () => {
  const CONTRACT_BODY = {
    error: 'premium_required',
    guild_name: 'Test Guild',
    premium_url: 'https://www.getlootlist.com/premium',
  }

  it('a free guild answers 403 with the contract body, reading only guilds', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    const tables = baseTables({ guilds: [{ ...baseTables().guilds[0], subscription_tier: 'free' }] })
    const { client, calls } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, character_name: 'Active' }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).toEqual(CONTRACT_BODY)
    expect(calls.every((c) => c.table === 'guilds')).toBe(true)
    expect(calls.some((c) => c.table === 'character_guild_memberships')).toBe(false)
  })

  it('a null subscription_tier answers the same', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    const tables = baseTables({ guilds: [{ ...baseTables().guilds[0], subscription_tier: null }] })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, character_name: 'Active' }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).toEqual(CONTRACT_BODY)
  })

  it('answers 500 when the tier read fails, with no character_guild_memberships call recorded', async () => {
    const { client, calls } = makeClient(baseTables(), {
      fail: [{ table: 'guilds', select: 'subscription_tier' }],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, character_name: 'Active' }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toEqual({ error: 'Internal server error' })
    expect(vi.mocked(trackApiError)).toHaveBeenCalled()
    expect(calls.some((c) => c.table === 'character_guild_memberships')).toBe(false)
  })
})

describe('GET /api/bot/score: a Premium guild sees no change', () => {
  it('an unknown character answers 404 character_not_found', async () => {
    const { client } = makeClient(baseTables())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, character_name: 'Nobody' }))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: 'character_not_found', character_name: 'Nobody' })
  })

  it('an active raider with a guild_settings row answers 200 with the expected shape', async () => {
    const { client } = makeClient(baseTables())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, character_name: 'Active' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.character_name).toBe('Active')
    expect(body.guild_name).toBe('Test Guild')
    expect(body.team_name).toBeNull()
    expect(typeof body.attendance.score).toBe('number')
    expect(typeof body.attendance.max_score).toBe('number')
    expect(typeof body.attendance.score_percent).toBe('number')
    expect(typeof body.attendance.raids_attended).toBe('number')
    expect(typeof body.attendance.raids_in_window).toBe('number')
    expect(body.rolling_weeks).toBe(4)
  })
})
