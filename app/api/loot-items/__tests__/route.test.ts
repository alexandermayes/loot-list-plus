// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PATCH } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'
import { NEED_ROW_FIXED_ERROR } from '@/domain/loot/item-identity'
import {
  fetchFilteredLootItems,
  fetchLootItemsCharacter,
  resolveTierIdsForPhases,
} from '@/lib/loot-items-query'
import { resolveNeedListScope } from '@/lib/loot/need-list-scope'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))
vi.mock('@/utils/audit/log', () => ({ logAudit: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackApiError: vi.fn() }))
vi.mock('@/lib/loot-items-query', () => ({
  fetchLootItemsCharacter: vi.fn(),
  fetchFilteredLootItems: vi.fn(),
  resolveTierIdsForPhases: vi.fn(),
}))
vi.mock('@/lib/loot/need-list-scope', () => ({ resolveNeedListScope: vi.fn() }))

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

describe('GET /api/loot-items need list scope (D-12, D-02 amended)', () => {
  const USER_ID = 'cccccccc-0000-0000-0000-000000000010'
  const CHARACTER_ID = 'cccccccc-0000-0000-0000-000000000011'
  const EXPANSION_ID = 'cccccccc-0000-0000-0000-000000000012'
  const TIER_ID = 'cccccccc-0000-0000-0000-000000000013'
  const GUILD_ID_PARAM = 'cccccccc-0000-0000-0000-000000000014'
  const CHARACTER = { id: CHARACTER_ID, class_id: 1, spec_id: 1, class_name: null }
  const ITEMS = [{ id: 'item-1', kind: 'item' }]
  const SLOTS = { 'tier-a': 1, 'tier-b': 2, 'tier-c': 3 }

  function getClient() {
    return {
      from: () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const builder: any = {
          select: () => builder,
          eq: () => builder,
          single: () => Promise.resolve({ data: { user_id: USER_ID }, error: null }),
        }
        return builder
      },
    }
  }

  function getRequest(params: Record<string, string>) {
    const url = new URL('http://localhost/api/loot-items')
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
    return new NextRequest(url)
  }

  const PHASES_PARAMS = {
    expansion_id: EXPANSION_ID,
    phases: '1,2',
    character_id: CHARACTER_ID,
    guild_id: GUILD_ID_PARAM,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(createServiceRoleClient).mockReturnValue(getClient() as unknown as ReturnType<typeof createServiceRoleClient>)
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID }, error: null } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>)
    vi.mocked(fetchLootItemsCharacter).mockResolvedValue(CHARACTER as never)
    vi.mocked(resolveTierIdsForPhases).mockResolvedValue([TIER_ID])
    vi.mocked(fetchFilteredLootItems).mockResolvedValue(ITEMS)
  })

  it('serves needs and the slot map for an all-Discovery group on the phases path', async () => {
    vi.mocked(resolveNeedListScope).mockResolvedValue({ includeNeeds: true, tierSlots: SLOTS })

    const res = await GET(getRequest(PHASES_PARAMS))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ items: ITEMS, need_tier_slots: SLOTS })
    expect(resolveNeedListScope).toHaveBeenCalledWith(expect.anything(), {
      expansionId: EXPANSION_ID,
      phases: [1, 2],
    })
    expect(vi.mocked(fetchFilteredLootItems).mock.calls[0][3]).toEqual({ includeNeeds: true })
  })

  it('keeps needs hidden for a Known group and returns need_tier_slots null', async () => {
    vi.mocked(resolveNeedListScope).mockResolvedValue({ includeNeeds: false, tierSlots: null })

    const res = await GET(getRequest({ ...PHASES_PARAMS, phases: '1' }))

    expect(await res.json()).toEqual({ items: ITEMS, need_tier_slots: null })
    expect(vi.mocked(fetchFilteredLootItems).mock.calls[0][3]).toEqual({ includeNeeds: false })
  })

  it('decides the single phase path the same way', async () => {
    vi.mocked(resolveNeedListScope).mockResolvedValue({ includeNeeds: true, tierSlots: SLOTS })
    const { expansion_id, character_id, guild_id } = PHASES_PARAMS

    const res = await GET(getRequest({ expansion_id, character_id, guild_id, phase: '3' }))

    expect(resolveNeedListScope).toHaveBeenCalledWith(expect.anything(), {
      expansionId: EXPANSION_ID,
      phases: [3],
    })
    expect((await res.json()).need_tier_slots).toEqual(SLOTS)
  })

  it('leaves the legacy tier_id path items only: includeNeeds false, need_tier_slots null', async () => {
    const res = await GET(getRequest({ tier_id: TIER_ID, character_id: CHARACTER_ID }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ items: ITEMS, need_tier_slots: null })
    expect(resolveNeedListScope).not.toHaveBeenCalled()
    expect(vi.mocked(fetchFilteredLootItems).mock.calls[0][3]).toEqual({ includeNeeds: false })
  })

  it('answers 500 when the scope read fails, with no items served', async () => {
    vi.mocked(resolveNeedListScope).mockRejectedValue(new Error('Failed to read raid tiers for the need list'))

    const res = await GET(getRequest(PHASES_PARAMS))

    expect(res.status).toBe(500)
    expect(fetchFilteredLootItems).not.toHaveBeenCalled()
  })

  it('does not read the scope when no tier is guild-active for the phases', async () => {
    vi.mocked(resolveTierIdsForPhases).mockResolvedValue([])

    const res = await GET(getRequest(PHASES_PARAMS))

    expect(await res.json()).toEqual({ items: [] })
    expect(resolveNeedListScope).not.toHaveBeenCalled()
  })
})
