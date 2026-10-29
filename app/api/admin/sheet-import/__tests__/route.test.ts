// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
//
// First test for the admin sheet import. The items import updates loot_items
// by matched id with the service-role client, so a need row (kind 'need',
// D-12) must never be among the rows it can match (D-14).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), trackApiError: vi.fn() }))

const GUILD_ID = 'eeeeeeee-0000-0000-0000-000000000001'
const USER_ID = 'eeeeeeee-0000-0000-0000-000000000002'
const EXPANSION_ID = 'eeeeeeee-0000-0000-0000-000000000003'
const TIER_ID = 'eeeeeeee-0000-0000-0000-000000000004'
const ITEM_ID = 'eeeeeeee-0000-0000-0000-000000000005'
const NEED_ID = 'eeeeeeee-0000-0000-0000-000000000006'

type Row = Record<string, unknown>
type Op = 'select' | 'insert' | 'update' | 'delete'
type Filter = ['eq' | 'in', string, unknown]
interface Call { table: string; op: Op; filters: Filter[]; payload?: unknown }

interface Fixture {
  raid_tiers: Row[]
  loot_items: Row[]
  errorOn?: Partial<Record<string, string>>
}

function applyFilters(rows: Row[], filters: Filter[]) {
  return rows.filter((row) =>
    filters.every(([kind, col, val]) => {
      if (kind === 'eq') return row[col] === val
      return Array.isArray(val) && (val as unknown[]).includes(row[col])
    })
  )
}

/**
 * Recording fake client: from(table) records { table, op, filters, payload };
 * eq and in narrow the rows the way PostgREST would, so a read that forgets a
 * kind filter really does return the need row.
 */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []
  const tables: Record<string, Row[]> = {
    raid_tiers: fixture.raid_tiers,
    loot_items: fixture.loot_items,
  }

  const client = {
    from(table: string) {
      const call: Call = { table, op: 'select', filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        insert: (payload: unknown) => { call.op = 'insert'; call.payload = payload; return builder },
        update: (payload: unknown) => { call.op = 'update'; call.payload = payload; return builder },
        delete: () => { call.op = 'delete'; return builder },
        eq: (col: string, val: unknown) => { call.filters.push(['eq', col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push(['in', col, val]); return builder },
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
          const errorMsg = fixture.errorOn?.[table]
          let result: { data: unknown; error: unknown }
          if (errorMsg) result = { data: null, error: { message: errorMsg } }
          else if (call.op === 'select') result = { data: applyFilters(tables[table] ?? [], call.filters), error: null }
          else result = { data: null, error: null }
          return Promise.resolve(result).then(resolve, reject)
        },
      }
      return builder
    },
  }
  return { client, calls }
}

function baseFixture(): Fixture {
  return {
    raid_tiers: [{ id: TIER_ID, name: 'Test Raid', expansion_id: EXPANSION_ID, is_guild_active: true }],
    loot_items: [
      { id: ITEM_ID, name: 'Real Sword', item_slot: 'Weapon', raid_tier_id: TIER_ID, classification: 'Unlimited', is_available: true, kind: 'item', wowhead_id: 1001 },
      // Same name the sheet uses for the generic trinket need.
      { id: NEED_ID, name: 'Trinket, Healing', item_slot: 'Trinket', raid_tier_id: TIER_ID, classification: 'Unlimited', is_available: true, kind: 'need', wowhead_id: null },
    ],
  }
}

const CSV = [
  'Name,Available,Classification,Category,Raid',
  '"Trinket, Healing",TRUE,Reserved,Trinket,Test Raid',
  'Real Sword,TRUE,Reserved,Weapon,Test Raid',
].join('\n')

function post(body: Record<string, unknown>) {
  return POST(
    new Request('http://localhost/api/admin/sheet-import', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ guildId: GUILD_ID, expansionId: EXPANSION_ID, itemsCSV: CSV, ...body }),
    })
  )
}

function setClient(fixture: Fixture) {
  const { client, calls } = makeClient(fixture)
  vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceRoleClient>)
  return calls
}

const lootItemReads = (calls: Call[]) => calls.filter((c) => c.table === 'loot_items' && c.op === 'select')
const lootItemUpdates = (calls: Call[]) => calls.filter((c) => c.table === 'loot_items' && c.op === 'update')

describe('POST /api/admin/sheet-import', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.mocked(getAuthenticatedUser).mockResolvedValue(
      { user: { id: USER_ID }, error: null } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>
    )
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as Awaited<ReturnType<typeof verifyPermission>>)
  })

  it('answers 401 without a user', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue(
      { user: null, error: null } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>
    )
    setClient(baseFixture())
    const res = await post({ dryRun: true })
    expect(res.status).toBe(401)
  })

  it('answers 403 without manage_settings and reads no items', async () => {
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: false } as Awaited<ReturnType<typeof verifyPermission>>)
    const calls = setClient(baseFixture())
    const res = await post({ dryRun: true })
    expect(res.status).toBe(403)
    expect(lootItemReads(calls)).toHaveLength(0)
  })

  // D-12, D-14: a need row is not a sheet item and must not be matchable.
  it('dry run reads kind item only and matches the real item, never the need row', async () => {
    const calls = setClient(baseFixture())
    const res = await post({ dryRun: true })
    const json = await res.json()

    expect(res.status).toBe(200)
    const reads = lootItemReads(calls)
    expect(reads).toHaveLength(1)
    expect(reads[0].filters).toContainEqual(['eq', 'kind', 'item'])

    expect(json.items.matched.map((m: { dbId: string }) => m.dbId)).toEqual([ITEM_ID])
    expect(json.items.matched.some((m: { dbId: string }) => m.dbId === NEED_ID)).toBe(false)
    expect(json.items.unmatched.map((u: { name: string }) => u.name)).toEqual(['Trinket, Healing'])
    expect(lootItemUpdates(calls)).toHaveLength(0)
  })

  it('an apply run updates the item row by id and never the need row', async () => {
    const calls = setClient(baseFixture())
    const res = await post({})
    const json = await res.json()

    expect(res.status).toBe(200)
    const updates = lootItemUpdates(calls)
    expect(updates).toHaveLength(1)
    expect(updates[0].filters).toEqual([['eq', 'id', ITEM_ID]])
    expect(updates[0].payload).toEqual({ classification: 'Reserved' })
    expect(updates.some((c) => c.filters.some(([, , val]) => val === NEED_ID))).toBe(false)
    expect(json.itemsUpdated).toBe(1)
  })

  it('answers the existing 400 when the loot_items read errors, with no update', async () => {
    const fixture = baseFixture()
    fixture.errorOn = { loot_items: 'db down' }
    const calls = setClient(fixture)
    const res = await post({})
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('No loot items found. Make sure the expansion is seeded.')
    expect(lootItemUpdates(calls)).toHaveLength(0)
  })
})
