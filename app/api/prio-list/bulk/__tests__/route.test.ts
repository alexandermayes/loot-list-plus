// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { NEED_ROW_FIXED_ERROR } from '@/domain/loot/item-identity'
import { IN_FILTER_CHUNK_SIZE } from '@/utils/supabase/paginate'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'

vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackApiError: vi.fn() }))

const USER_ID = 'eeeeeeee-0000-0000-0000-000000000001'
const GUILD_ID = 'eeeeeeee-0000-0000-0000-000000000002'
const TIER_ID = 'eeeeeeee-0000-0000-0000-000000000003'
const ITEM_ID = 'eeeeeeee-0000-0000-0000-000000000004'
const OTHER_ITEM_ID = 'eeeeeeee-0000-0000-0000-000000000005'
const NEED_ID = 'eeeeeeee-0000-0000-0000-000000000006'

type CatalogRow = { id: string; kind: string }

/** The catalog the fake loot_items read answers from, by id. */
const CATALOG: Record<string, CatalogRow> = {
  [ITEM_ID]: { id: ITEM_ID, kind: 'item' },
  [OTHER_ITEM_ID]: { id: OTHER_ITEM_ID, kind: 'item' },
  [NEED_ID]: { id: NEED_ID, kind: 'need' },
}

const syntheticId = (n: number) => `eeeeeeee-0000-0000-0000-${String(n).padStart(12, '0')}`

interface FakeCall {
  table: string
  op: 'select' | 'upsert'
  select?: string
  /** The ids of an .in('id', ...) filter. */
  ids?: unknown[]
  /** The rows handed to upsert. */
  rows?: unknown[]
}

/**
 * Service-client fake: loot_items answers from `catalog` (or an error) for
 * the ids of the .in() filter, so a chunked read is answered chunk by chunk;
 * guild_item_priorities records the upsert and echoes its rows.
 */
function useServiceClient(opts: { catalog?: Record<string, CatalogRow>; lootItemsError?: boolean }) {
  const calls: FakeCall[] = []
  const catalog = opts.catalog ?? CATALOG
  vi.mocked(createServiceRoleClient).mockReturnValue({
    from: (table: string) => {
      const call: FakeCall = { table, op: 'select' }
      calls.push(call)
      const resolve = () => {
        if (table === 'loot_items') {
          if (opts.lootItemsError) return { data: null, error: { message: 'boom' } }
          return { data: (call.ids ?? []).map(id => catalog[String(id)]).filter(Boolean), error: null }
        }
        return { data: call.rows ?? [], error: null }
      }
      const builder: Record<string, unknown> = {}
      builder.select = (cols?: string) => {
        if (cols) call.select = cols
        return builder
      }
      builder.eq = () => builder
      builder.in = (_col: string, ids: unknown[]) => {
        call.ids = ids
        return builder
      }
      builder.upsert = (rows: unknown[]) => {
        call.op = 'upsert'
        call.rows = rows
        return builder
      }
      builder.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
        Promise.resolve(resolve()).then(onFulfilled, onRejected)
      return builder
    },
  } as never)
  return { calls }
}

function postRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/prio-list/bulk', { method: 'POST', body: JSON.stringify(body) })
}

const upsertsOf = (calls: FakeCall[]) => calls.filter(c => c.table === 'guild_item_priorities' && c.op === 'upsert')
const lootItemReadsOf = (calls: FakeCall[]) => calls.filter(c => c.table === 'loot_items')

describe('POST /api/prio-list/bulk', () => {
  const BODY = {
    guild_id: GUILD_ID,
    raid_tier_id: TIER_ID,
    priorities: [{ item_id: ITEM_ID, role_priorities: { tank: 4 } }, { item_id: OTHER_ITEM_ID }],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID }, error: null } as never)
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as never)
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('answers 401 without a user and reads nothing', async () => {
    const { calls } = useServiceClient({})
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: null, error: null } as never)

    const response = await POST(postRequest(BODY))

    expect(response.status).toBe(401)
    expect(calls).toEqual([])
  })

  it('answers 403 without manage_loot, before the item read and the upsert', async () => {
    const { calls } = useServiceClient({})
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: false } as never)

    const response = await POST(postRequest(BODY))

    expect(response.status).toBe(403)
    expect(calls).toEqual([])
  })

  it('refuses a batch holding a need row with 400 and the fixed-row error, before any write (D-03, T-04-07-03)', async () => {
    const { calls } = useServiceClient({})

    const response = await POST(postRequest({
      ...BODY,
      priorities: [...BODY.priorities, { item_id: NEED_ID, role_priorities: { tank: 9 } }],
    }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: NEED_ROW_FIXED_ERROR })
    expect(upsertsOf(calls)).toEqual([])
    // The refusal reads kind; a fake that ignored the select could not fail if the column were dropped.
    expect(lootItemReadsOf(calls)[0]?.select).toMatch(/\bkind\b/)
  })

  it('answers 500 and writes nothing when the loot_items read fails, never skipping the check', async () => {
    const { calls } = useServiceClient({ lootItemsError: true })

    const response = await POST(postRequest(BODY))

    expect(response.status).toBe(500)
    expect(upsertsOf(calls)).toEqual([])
  })

  it('still upserts every row of a catalog-only batch', async () => {
    const { calls } = useServiceClient({})

    const response = await POST(postRequest(BODY))
    const body = await response.json()

    expect(response.status).toBe(200)
    const upserts = upsertsOf(calls)
    expect(upserts).toHaveLength(1)
    expect(upserts[0].rows?.map(r => (r as { item_id: string }).item_id)).toEqual([ITEM_ID, OTHER_ITEM_ID])
    expect(body).toMatchObject({ success: true, updated: 2, failed: 0 })
  })

  it('reads the batch\'s distinct ids in chunks of IN_FILTER_CHUNK_SIZE (WR-05)', async () => {
    const ids = Array.from({ length: IN_FILTER_CHUNK_SIZE * 2 + 5 }, (_, i) => syntheticId(i + 1000))
    const catalog = Object.fromEntries(ids.map(id => [id, { id, kind: 'item' }]))
    const { calls } = useServiceClient({ catalog })
    // The first id twice: the lookup de-duplicates, the upsert keeps the request's rows.
    const priorities = [...ids, ids[0]].map(item_id => ({ item_id }))

    const response = await POST(postRequest({ ...BODY, priorities }))

    expect(response.status).toBe(200)
    expect(lootItemReadsOf(calls).map(c => c.ids?.length)).toEqual([IN_FILTER_CHUNK_SIZE, IN_FILTER_CHUNK_SIZE, 5])
    expect(upsertsOf(calls)[0].rows).toHaveLength(ids.length + 1)
  })

  it('refuses when the need row sits in a later chunk', async () => {
    const ids = Array.from({ length: IN_FILTER_CHUNK_SIZE }, (_, i) => syntheticId(i + 1000))
    const catalog = { ...Object.fromEntries(ids.map(id => [id, { id, kind: 'item' }])), [NEED_ID]: CATALOG[NEED_ID] }
    const { calls } = useServiceClient({ catalog })

    const response = await POST(postRequest({ ...BODY, priorities: [...ids, NEED_ID].map(item_id => ({ item_id })) }))

    expect(response.status).toBe(400)
    expect(lootItemReadsOf(calls)).toHaveLength(2)
    expect(upsertsOf(calls)).toEqual([])
  })
})
