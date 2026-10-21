// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
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

/** Generic thenable query fake: every chain method returns the builder. */
function makeBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {}
  for (const method of ['select', 'eq', 'limit']) {
    builder[method] = () => builder
  }
  builder.then = (onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled, onRejected)
  return builder
}

function useClients(opts: { isMember: boolean; priorities?: unknown[] }) {
  vi.mocked(createClient).mockResolvedValue({
    from: () => makeBuilder({ data: opts.isMember ? [{ id: 'membership' }] : [], error: null }),
  } as never)
  vi.mocked(createServiceRoleClient).mockReturnValue({
    from: () => makeBuilder({ data: opts.priorities ?? [], error: null }),
  } as never)
}

function request(params: Record<string, string>): Request {
  const url = new URL('http://localhost/api/prio-list')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return new Request(url)
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

  it("returns a priority whose loot_item is a need row (kind: 'need') unchanged", async () => {
    useClients({ isMember: true, priorities: PRIORITIES })

    const response = await GET(request({ guild_id: GUILD_ID, raid_tier_id: TIER_ID }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.priorities).toEqual(PRIORITIES)
    const need = body.priorities[1].loot_item
    expect(need.kind).toBe('need')
    expect(need.wowhead_id).toBeNull()
  })
})
