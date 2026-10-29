// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'
import { NEED_ROW_FIXED_ERROR } from '@/domain/loot/item-identity'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))
vi.mock('@/utils/audit/log', () => ({ logAudit: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackApiError: vi.fn() }))

const GUILD_ID = 'cccccccc-0000-0000-0000-000000000001'
const ITEM_ID = 'cccccccc-0000-0000-0000-000000000002'
const OFFICER_USER_ID = 'cccccccc-0000-0000-0000-000000000003'

type Op = 'select' | 'update'
type Call = { table: string; op: Op; filters: Array<[string, unknown]>; payload?: unknown }

/**
 * Recording fake client for PATCH: the loot_items ownership read, the
 * raid_tiers and expansions guild check, and the loot_items update.
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
        update: (payload: unknown) => { call.op = 'update'; call.payload = payload; return builder },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        single: () => {
          if (table === 'loot_items') return Promise.resolve({ data: item, error: null })
          if (table === 'raid_tiers') return Promise.resolve({ data: { expansion_id: 'exp-1' }, error: null })
          if (table === 'expansions') return Promise.resolve({ data: { guild_id: GUILD_ID }, error: null })
          return Promise.resolve({ data: null, error: null })
        },
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: [{ ...item, ...(call.payload as object) }], error: null }).then(resolve),
      }
      return builder
    },
  }
  return { client, calls }
}

function request(body: unknown) {
  return new Request('http://localhost/api/loot-items', {
    method: 'PATCH',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof PATCH>[0]
}

const updates = (calls: Call[]) => calls.filter((c) => c.op === 'update')

async function run(item: Record<string, unknown>, opts: { permitted?: boolean } = {}) {
  const { client, calls } = makeClient(item)
  vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceRoleClient>)
  vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: OFFICER_USER_ID }, error: null } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>)
  vi.mocked(verifyPermission).mockResolvedValue({
    hasPermission: opts.permitted ?? true,
    error: opts.permitted === false ? 'Insufficient permissions' : undefined,
  } as unknown as Awaited<ReturnType<typeof verifyPermission>>)
  const res = await PATCH(request({ guild_id: GUILD_ID, item_id: ITEM_ID, updates: { allocation_cost: 3, notes: 'ignored' } }))
  return { res, json: await res.json(), calls }
}

describe('PATCH /api/loot-items', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('returns 400 with NEED_ROW_FIXED_ERROR and writes nothing for a need row (D-12, D-06, D-08)', async () => {
    const { res, json, calls } = await run({ id: ITEM_ID, raid_tier_id: 'tier-1', kind: 'need' })
    expect(res.status).toBe(400)
    expect(json).toEqual({ error: NEED_ROW_FIXED_ERROR })
    expect(updates(calls)).toHaveLength(0)
  })

  it('updates an item row with the sanitized fields', async () => {
    const { res, json, calls } = await run({ id: ITEM_ID, raid_tier_id: 'tier-1', kind: 'item' })
    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    const written = updates(calls)
    expect(written).toHaveLength(1)
    expect(written[0].payload).toEqual({ allocation_cost: 3 })
  })

  it('returns 403 without manage_loot', async () => {
    const { res, calls } = await run({ id: ITEM_ID, raid_tier_id: 'tier-1', kind: 'item' }, { permitted: false })
    expect(res.status).toBe(403)
    expect(updates(calls)).toHaveLength(0)
  })
})
