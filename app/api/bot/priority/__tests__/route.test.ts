// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

// Deliberately NOT mocked: findInvalidCharacterIds, fetchReceivedCounts and
// pickReceivedEntries must run for real against the fake client below, so these
// tests prove the route calls the actual award-check, received-counts and
// receive-skip definitions rather than a reimplementation of them (GH #325).
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), trackApiError: vi.fn() }))

const BOT_KEY = 'test-bot-key'

const GUILD = 'aaaaaaaa-0000-0000-0000-000000000001'
const OTHER_GUILD = 'bbbbbbbb-0000-0000-0000-000000000001'
const DISCORD = 'discord-server-1'
const EXP = 'aaaaaaaa-0000-0000-0000-000000000002'
const TIER = 'aaaaaaaa-0000-0000-0000-000000000003'
const ITEM = 'aaaaaaaa-0000-0000-0000-000000000004'
const ITEM_B = 'aaaaaaaa-0000-0000-0000-00000000000b'
const ACTIVE_CHAR = 'aaaaaaaa-0000-0000-0000-000000000005'
const DEPARTED_CHAR = 'aaaaaaaa-0000-0000-0000-000000000006'
const SUB_ACTIVE = 'aaaaaaaa-0000-0000-0000-000000000007'
const SUB_DEPARTED = 'aaaaaaaa-0000-0000-0000-000000000008'

type Row = Record<string, unknown>

interface FailSpec {
  table: string
  select?: string
}

interface Filter {
  type: 'eq' | 'in' | 'is' | 'ilike'
  col: string
  val: unknown
}

interface RecordedCall {
  table: string
  select: string
  filters: Filter[]
  orders: Array<{ col: string; ascending: boolean }>
  limit?: number
  range?: [number, number]
}

/**
 * Generic in-memory recording fake. Every from(table) call records its select
 * string, filters, orders, limit and range. options.fail is a list of
 * { table, select? }; a matching call resolves { data: null, error }.
 */
function makeClient(tables: Record<string, Row[]>, options?: { fail?: FailSpec[] }) {
  const calls: RecordedCall[] = []

  function matchesFail(call: RecordedCall): boolean {
    if (!options?.fail) return false
    return options.fail.some(
      (f) => f.table === call.table && (f.select === undefined || f.select === call.select)
    )
  }

  function ilikeMatch(pattern: string, value: string): boolean {
    const escaped = pattern
      .toLowerCase()
      .split('%')
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*')
    return new RegExp(`^${escaped}$`).test(value.toLowerCase())
  }

  function applyFilters(rows: Row[], filters: Filter[]): Row[] {
    return rows.filter((row) =>
      filters.every((f) => {
        if (f.type === 'eq') return row[f.col] === f.val
        if (f.type === 'in') return (f.val as unknown[]).includes(row[f.col])
        if (f.type === 'is') return row[f.col] === null || row[f.col] === undefined
        if (f.type === 'ilike') return ilikeMatch(String(f.val), String(row[f.col] ?? ''))
        return true
      })
    )
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
    if (call.range) rows = rows.slice(call.range[0], call.range[1] + 1)
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
      in(col: string, val: unknown[]) {
        call.filters.push({ type: 'in', col, val })
        return builder
      },
      is(col: string, val: null) {
        call.filters.push({ type: 'is', col, val })
        return builder
      },
      ilike(col: string, val: string) {
        call.filters.push({ type: 'ilike', col, val })
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
      range(start: number, end: number) {
        call.range = [start, end]
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
  const url = new URL('http://localhost/api/bot/priority')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url, { headers }) as unknown as Parameters<typeof GET>[0]
}

/**
 * Base fixture (tracer, GH #325): ACTIVE_CHAR has an active membership and an
 * approved list ranking ITEM at 40; DEPARTED_CHAR's membership is inactive and its
 * approved list ranks ITEM at 50. Both tiers Loot and Ranks on. No loot_history
 * rows, so the received-copies skip removes nothing.
 */
function baseTables(overrides: Partial<Record<string, Row[]>> = {}): Record<string, Row[]> {
  return {
    guilds: [
      {
        id: GUILD,
        name: 'Test Guild',
        discord_server_id: DISCORD,
        is_active: true,
        created_at: '2020-01-01T00:00:00Z',
        active_expansion_id: EXP,
      },
    ],
    raid_tiers: [{ id: TIER, expansion_id: EXP, is_guild_active: true, master_sheet_visible: true }],
    loot_items: [
      { id: ITEM, raid_tier_id: TIER, name: 'Bilegrip Boots', wowhead_id: 1001 },
      { id: ITEM_B, raid_tier_id: TIER, name: 'Bilegrip Boots (Heroic)', wowhead_id: 1001 },
    ],
    loot_submissions: [
      { id: SUB_ACTIVE, character_id: ACTIVE_CHAR, guild_id: GUILD, status: 'approved' },
      { id: SUB_DEPARTED, character_id: DEPARTED_CHAR, guild_id: GUILD, status: 'approved' },
    ],
    loot_submission_items: [
      { id: 'lsi-1', submission_id: SUB_ACTIVE, loot_item_id: ITEM, rank: 40, slot: 1, removed_at: null },
      { id: 'lsi-2', submission_id: SUB_DEPARTED, loot_item_id: ITEM, rank: 50, slot: 1, removed_at: null },
    ],
    character_guild_memberships: [
      { character_id: ACTIVE_CHAR, guild_id: GUILD, is_active: true },
      { character_id: DEPARTED_CHAR, guild_id: GUILD, is_active: false },
    ],
    characters: [
      { id: ACTIVE_CHAR, name: 'Active', wow_classes: { name: 'Mage' } },
      { id: DEPARTED_CHAR, name: 'Departed', wow_classes: { name: 'Rogue' } },
    ],
    loot_history: [],
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

describe('GET /api/bot/priority (tracer, GH #325)', () => {
  it('lists an active raider from an approved list and leaves out a departed one', async () => {
    const { client } = makeClient(baseTables())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.item_name).toBe('Bilegrip Boots')
    expect(body.item_wowhead_id).toBe(1001)
    expect(body.raiders).toEqual([{ name: 'Active', class: 'Mage', rank: 40 }])
  })

  it('answers 403 rankings_hidden when the only matching tier has Ranks off', async () => {
    const tables = baseTables({
      raid_tiers: [{ id: TIER, expansion_id: EXP, is_guild_active: true, master_sheet_visible: false }],
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).toEqual({ error: 'rankings_hidden', item_name: 'Bilegrip Boots', item_wowhead_id: 1001 })
  })
})
