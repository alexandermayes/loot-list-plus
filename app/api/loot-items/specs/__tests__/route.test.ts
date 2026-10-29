// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'
import { NEED_ROW_FIXED_ERROR } from '@/domain/loot/item-identity'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))
vi.mock('@/utils/audit/log', () => ({ logAudit: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackApiError: vi.fn() }))

const GUILD_ID = 'eeeeeeee-0000-0000-0000-000000000001'
const ITEM_ID = 'eeeeeeee-0000-0000-0000-000000000002'
const OFFICER_USER_ID = 'eeeeeeee-0000-0000-0000-000000000003'

type Op = 'select' | 'insert' | 'delete'
type Call = { table: string; op: Op; filters: Array<[string, unknown]>; payload?: unknown }

/**
 * Recording fake client for the specs route: the loot_items ownership read,
 * the raid_tiers and expansions guild check, and the loot_item_classes
 * delete, insert and read-back.
 */
function makeClient(item: Record<string, unknown>) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const call: Call = { table, op: 'select', filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        insert: (payload: unknown) => { call.op = 'insert'; call.payload = payload; return builder },
        delete: () => { call.op = 'delete'; return builder },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        single: () => {
          if (table === 'loot_items') return Promise.resolve({ data: item, error: null })
          if (table === 'raid_tiers') return Promise.resolve({ data: { expansion_id: 'exp-1' }, error: null })
          if (table === 'expansions') return Promise.resolve({ data: { guild_id: GUILD_ID }, error: null })
          return Promise.resolve({ data: null, error: null })
        },
        then: (resolve: (v: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
      }
      return builder
    },
  }
  return { client, calls }
}

function request(body: unknown) {
  return new Request('http://localhost/api/loot-items/specs', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

const classWrites = (calls: Call[]) => calls.filter((c) => c.table === 'loot_item_classes' && c.op !== 'select')

async function run(item: Record<string, unknown>, body: Record<string, unknown>) {
  const { client, calls } = makeClient(item)
  vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceRoleClient>)
  vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: OFFICER_USER_ID }, error: null } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>)
  vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as unknown as Awaited<ReturnType<typeof verifyPermission>>)
  const res = await POST(request({ guild_id: GUILD_ID, item_id: ITEM_ID, ...body }))
  return { res, json: await res.json(), calls }
}

describe('POST /api/loot-items/specs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it.each([
    ['remove_all', { remove_all: { spec_type: 'primary' } }],
    ['remove', { remove: [{ spec_id: 'spec-1', spec_type: 'primary' }] }],
    ['add', { add: [{ class_id: 'class-1', spec_id: 'spec-1', spec_type: 'primary' }] }],
  ])('returns 400 with NEED_ROW_FIXED_ERROR and writes no loot_item_classes row for a need row: %s (D-12)', async (_name, body) => {
    const { res, json, calls } = await run({ id: ITEM_ID, raid_tier_id: 'tier-1', kind: 'need' }, body)
    expect(res.status).toBe(400)
    expect(json).toEqual({ error: NEED_ROW_FIXED_ERROR })
    expect(classWrites(calls)).toHaveLength(0)
  })

  it('still edits an item row: records the insert and answers 200', async () => {
    const { res, json, calls } = await run(
      { id: ITEM_ID, raid_tier_id: 'tier-1', kind: 'item' },
      { add: [{ class_id: 'class-1', spec_id: 'spec-1', spec_type: 'primary' }] },
    )
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    const writes = classWrites(calls)
    expect(writes.map((c) => c.op)).toEqual(['insert'])
    expect(writes[0].payload).toEqual([
      { loot_item_id: ITEM_ID, class_id: 'class-1', spec_id: 'spec-1', spec_type: 'primary' },
    ])
  })
})
