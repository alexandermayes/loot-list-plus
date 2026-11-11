// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '../route'
import { NEED_ROW_FIXED_ERROR } from '@/domain/loot/item-identity'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackApiError: vi.fn() }))

const USER_ID = 'eeeeeeee-0000-0000-0000-000000000001'
const GUILD_ID = 'eeeeeeee-0000-0000-0000-000000000002'
const TIER_ID = 'eeeeeeee-0000-0000-0000-000000000003'
const ITEM_ID = 'eeeeeeee-0000-0000-0000-000000000004'
const NEED_ID = 'eeeeeeee-0000-0000-0000-000000000005'

// A need row as the loot_item embed of a priority. Nothing offers a need row
// for priorities in Phase 3; the fixture proves the read passes one through.
const NEED_ROW = {
  id: NEED_ID,
  name: 'Trinket, Healing',
  kind: 'need',
  need_key: 'trinket.healing',
  wowhead_id: null,
  boss_name: 'Needs',
  item_slot: 'Trinket',
  classification: 'Reserved',
}

const ITEM_ROW = {
  id: ITEM_ID,
  name: 'Seal of the Dawn',
  kind: 'item',
  wowhead_id: 19019,
  boss_name: 'Ragnaros',
  item_slot: 'Trinket',
  classification: 'Big 3',
}

const PRIORITIES = [
  { id: 'eeeeeeee-0000-0000-0000-000000000010', guild_id: GUILD_ID, item_id: ITEM_ID, raid_tier_id: TIER_ID, loot_item: ITEM_ROW },
  { id: 'eeeeeeee-0000-0000-0000-000000000011', guild_id: GUILD_ID, item_id: NEED_ID, raid_tier_id: TIER_ID, loot_item: NEED_ROW },
]

/**
 * Pulls the column list out of the loot_item embed of a recorded select, so
 * the fake can hand back only what the route asked for (WR-03).
 */
function embeddedColumns(select: string): string[] | null {
  const match = /loot_item:loot_items\(([^)]*)\)/.exec(select)
  if (!match) return null
  return match[1].split(',').map(col => col.trim()).filter(Boolean)
}

/**
 * Applies the recorded select to priority rows: the loot_item embed keeps
 * only the columns the route listed. A fake that returned its fixture whatever
 * the select said could not fail when the route stopped selecting `kind`, which
 * is why the old GET test pinned nothing.
 */
function projectPriorities(rows: unknown[], select: string): unknown[] {
  const columns = embeddedColumns(select)
  if (!columns) return rows
  return rows.map(row => {
    const priority = row as { loot_item?: Record<string, unknown> | null }
    if (!priority.loot_item) return row
    const projected: Record<string, unknown> = {}
    for (const col of columns) {
      if (col in priority.loot_item) projected[col] = priority.loot_item[col]
    }
    return { ...priority, loot_item: projected }
  })
}

interface FakeCall {
  table: string
  op: 'select' | 'insert' | 'update'
  select?: string
}

/** Generic thenable query fake: every chain method returns the builder. */
function makeBuilder(table: string, calls: FakeCall[], resolve: (call: FakeCall) => { data: unknown; error: unknown }) {
  const call: FakeCall = { table, op: 'select' }
  calls.push(call)
  const builder: Record<string, unknown> = {}
  for (const method of ['eq', 'in', 'limit']) {
    builder[method] = () => builder
  }
  builder.select = (cols: string) => {
    call.select = cols
    return builder
  }
  builder.insert = () => {
    call.op = 'insert'
    return builder
  }
  builder.update = () => {
    call.op = 'update'
    return builder
  }
  builder.single = () => Promise.resolve(resolve(call))
  builder.maybeSingle = () => Promise.resolve(resolve(call))
  builder.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(resolve(call)).then(onFulfilled, onRejected)
  return builder
}

function useClients(opts: { isMember: boolean; priorities?: unknown[] }) {
  const serviceCalls: FakeCall[] = []
  vi.mocked(createClient).mockResolvedValue({
    from: (table: string) =>
      makeBuilder(table, [], () => ({ data: opts.isMember ? [{ id: 'membership' }] : [], error: null })),
  } as never)
  vi.mocked(createServiceRoleClient).mockReturnValue({
    from: (table: string) =>
      makeBuilder(table, serviceCalls, call => ({
        data: projectPriorities(opts.priorities ?? [], call.select ?? ''),
        error: null,
      })),
  } as never)
  return { serviceCalls }
}

/**
 * POST fake: the caller is the guild creator, so the permission check passes
 * on the first read. The service client answers loot_items by `lootItem` (or an
 * error) and records every guild_item_priorities call.
 */
function usePostClients(opts: { lootItem: { id: string; kind: string } | null; lootItemError?: boolean }) {
  const serviceCalls: FakeCall[] = []
  vi.mocked(createClient).mockResolvedValue({
    from: (table: string) =>
      makeBuilder(table, [], () => ({ data: table === 'guilds' ? { created_by: USER_ID } : null, error: null })),
  } as never)
  vi.mocked(createServiceRoleClient).mockReturnValue({
    from: (table: string) =>
      makeBuilder(table, serviceCalls, () => {
        if (table === 'loot_items') {
          return opts.lootItemError
            ? { data: null, error: { message: 'boom' } }
            : { data: opts.lootItem, error: null }
        }
        return { data: { id: 'eeeeeeee-0000-0000-0000-0000000000f0' }, error: null }
      }),
  } as never)
  return { serviceCalls }
}

function request(params: Record<string, string>): Request {
  const url = new URL('http://localhost/api/prio-list')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return new Request(url)
}

function postRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/prio-list', { method: 'POST', body: JSON.stringify(body) })
}

describe('GET /api/prio-list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      user: { id: USER_ID },
      error: null,
    } as never)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('answers 401 without a user', async () => {
    useClients({ isMember: true })
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: null, error: null } as never)
    const response = await GET(request({ guild_id: GUILD_ID }))
    expect(response.status).toBe(401)
  })

  it('answers 403 to a non-member', async () => {
    useClients({ isMember: false, priorities: PRIORITIES })
    const response = await GET(request({ guild_id: GUILD_ID }))
    expect(response.status).toBe(403)
  })

  it('selects kind inside the loot_item embed so need rows can be told apart', async () => {
    const { serviceCalls } = useClients({ isMember: true, priorities: PRIORITIES })

    await GET(request({ guild_id: GUILD_ID, raid_tier_id: TIER_ID }))

    const read = serviceCalls.find(c => c.table === 'guild_item_priorities')
    expect(read?.select).toMatch(/loot_item:loot_items\([^)]*\bkind\b/)
  })

  it('drops a priority whose loot_item is a need row and keeps the item priority (D-03, WR-03)', async () => {
    useClients({ isMember: true, priorities: PRIORITIES })

    const response = await GET(request({ guild_id: GUILD_ID, raid_tier_id: TIER_ID }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.priorities.map((p: { item_id: string }) => p.item_id)).toEqual([ITEM_ID])
    expect(
      body.priorities.some((p: { loot_item?: { kind?: string } | null }) => p.loot_item?.kind === 'need'),
    ).toBe(false)
  })

  it('keeps a priority whose loot_item is missing, as before', async () => {
    const orphan = { id: 'eeeeeeee-0000-0000-0000-000000000012', guild_id: GUILD_ID, item_id: ITEM_ID, raid_tier_id: TIER_ID, loot_item: null }
    useClients({ isMember: true, priorities: [orphan] })

    const response = await GET(request({ guild_id: GUILD_ID, raid_tier_id: TIER_ID }))
    const body = await response.json()

    expect(body.priorities).toEqual([orphan])
  })
})

describe('POST /api/prio-list', () => {
  const BODY = { guild_id: GUILD_ID, item_id: ITEM_ID, raid_tier_id: TIER_ID }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      user: { id: USER_ID },
      error: null,
    } as never)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('refuses an item_id that is a need row with 400 and the fixed-row error, before any priority read or write (D-03)', async () => {
    const { serviceCalls } = usePostClients({ lootItem: { id: NEED_ID, kind: 'need' } })

    const response = await POST(postRequest({ ...BODY, item_id: NEED_ID }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: NEED_ROW_FIXED_ERROR })
    expect(serviceCalls.filter(c => c.table === 'guild_item_priorities')).toEqual([])
  })

  it('answers 500 and writes nothing when the loot_items read fails, never skipping the check', async () => {
    const { serviceCalls } = usePostClients({ lootItem: null, lootItemError: true })

    const response = await POST(postRequest(BODY))

    expect(response.status).toBe(500)
    expect(serviceCalls.filter(c => c.table === 'guild_item_priorities')).toEqual([])
  })

  it('still saves a priority for a catalog item', async () => {
    const { serviceCalls } = usePostClients({ lootItem: { id: ITEM_ID, kind: 'item' } })

    const response = await POST(postRequest(BODY))

    expect(response.status).toBe(200)
    const writes = serviceCalls.filter(c => c.table === 'guild_item_priorities' && c.op !== 'select')
    expect(writes).toHaveLength(1)
  })
})
