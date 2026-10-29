// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
// A two-item BIS table keeps the fixture independent of the real BIS data.
vi.mock('@/data/bis/tbc-bis', () => ({
  TBC_BIS: {
    Mage: {
      Karazhan: {
        Head: [{ wowhead_id: 111, priority: 'bis' }],
        Trinket: [{ wowhead_id: 222, priority: 'alt' }],
      },
    },
  },
}))

const USER_ID = 'bbbbbbbb-0000-0000-0000-000000000001'
const CHARACTER_ID = 'bbbbbbbb-0000-0000-0000-000000000002'

type Row = Record<string, unknown>
type Call = { table: string; filters: Array<[string, unknown]> }

/**
 * Recording fake client: the characters single() read, the raid_tiers reads
 * and the loot_items read. The loot_items rows are filtered by every recorded
 * eq, and a row without a kind column counts as an item like the database
 * default, so a missing kind filter would let the need row through.
 */
function makeClient(lootItems: Row[]) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const call: Call = { table, filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        single: () =>
          Promise.resolve({
            data: {
              id: CHARACTER_ID,
              user_id: USER_ID,
              class_id: 'class-mage',
              spec_id: 'spec-fire',
              spec: { id: 'spec-fire', name: 'Fire' },
              class: { id: 'class-mage', name: 'Mage' },
            },
            error: null,
          }),
        then: (resolve: (v: unknown) => unknown) => {
          if (table === 'raid_tiers') {
            return Promise.resolve({
              data: [{ id: 'tier-1', name: 'Karazhan', phase: 1, is_guild_active: true }],
              error: null,
            }).then(resolve)
          }
          if (table === 'loot_items') {
            const rows = lootItems.filter((r) =>
              call.filters.every(([col, val]) => {
                if (col === 'raid_tier_id') return (val as string[]).includes(r.raid_tier_id as string)
                if (col === 'kind') return (r.kind ?? 'item') === val
                return r[col] === val
              }),
            )
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          return Promise.resolve({ data: null, error: null }).then(resolve)
        },
      }
      return builder
    },
  }
  return { client, calls }
}

function request() {
  const url = `http://localhost/api/bis-items?expansion_id=exp-1&phase=1&character_id=${CHARACTER_ID}&guild_id=guild-1`
  return { nextUrl: new URL(url) } as unknown as Parameters<typeof GET>[0]
}

const itemRow = (id: string, wowheadId: number, slot: string): Row => ({
  id,
  name: `Item ${wowheadId}`,
  item_slot: slot,
  wowhead_id: wowheadId,
  raid_tier_id: 'tier-1',
  is_available: true,
  kind: 'item',
})

const needRow: Row = {
  id: 'need-1',
  name: 'Head',
  item_slot: 'Head',
  wowhead_id: null,
  raid_tier_id: 'tier-1',
  is_available: true,
  kind: 'need',
}

describe('GET /api/bis-items', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('returns 401 without a user', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: null, error: null } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>)
    const res = await GET(request())
    expect(res.status).toBe(401)
  })

  it('reads only kind item rows and maps only items, never a null wowhead key (D-14)', async () => {
    const { client, calls } = makeClient([itemRow('i-111', 111, 'Head'), itemRow('i-222', 222, 'Trinket'), needRow])
    vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceRoleClient>)
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID }, error: null } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>)

    const res = await GET(request())
    const json = await res.json()

    expect(res.status).toBe(200)
    const lootItemsRead = calls.find((c) => c.table === 'loot_items')
    expect(lootItemsRead?.filters).toContainEqual(['kind', 'item'])
    expect(json.items.map((i: { loot_item_id: string }) => i.loot_item_id).sort()).toEqual(['i-111', 'i-222'])
    expect(json.items.map((i: { wowhead_id: unknown }) => i.wowhead_id)).not.toContain(null)
    expect(JSON.stringify(json)).not.toContain('need-1')
  })
})
