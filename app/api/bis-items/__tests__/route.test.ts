// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
//
// Pins that Import BIS reads raids from every phase of the list's phase group,
// not just the canonical phase the client sends (#484).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))

const USER = '00000001-0000-0000-0000-000000000001'
const CHARACTER = '00000002-0000-0000-0000-000000000001'
const GUILD = '00000003-0000-0000-0000-000000000001'
const EXPANSION = '00000005-0000-0000-0000-000000000001'

// Real Mage BiS ids, so the route's TBC_BIS lookup runs unmocked.
const SEA_WITCH_VESTMENTS = 30107 // Serpentshrine Cavern, phase 2
const TEMPEST_OF_CHAOS = 30910 // Hyjal Summit, phase 3

type Row = Record<string, unknown>

interface Fixture {
  raid_tiers: Row[]
  expansions: Row[]
  loot_items: Row[]
}

// Applies eq/in filters for real so a query for the wrong phases or tiers
// returns the wrong rows instead of passing by accident.
function fakeClient(fixture: Fixture) {
  const characters: Row[] = [
    {
      id: CHARACTER,
      user_id: USER,
      class_id: 'c',
      spec_id: 's',
      spec: { id: 's', name: 'Arcane' },
      class: { id: 'c', name: 'Mage' },
    },
  ]
  const tables: Record<string, Row[]> = { ...fixture, characters }
  const lootItemQueries: unknown[][] = []

  const from = (table: string) => {
    let rows = [...(tables[table] ?? [])]
    const builder = {
      select: () => builder,
      order: () => builder,
      eq: (col: string, val: unknown) => {
        rows = rows.filter(r => r[col] === val)
        return builder
      },
      in: (col: string, vals: unknown[]) => {
        if (table === 'loot_items') lootItemQueries.push(vals)
        rows = rows.filter(r => vals.includes(r[col]))
        return builder
      },
      single: () =>
        Promise.resolve(
          rows[0] ? { data: rows[0], error: null } : { data: null, error: { message: 'no rows' } }
        ),
      then: (resolve: (v: { data: Row[]; error: null }) => unknown) =>
        resolve({ data: rows, error: null }),
    }
    return builder
  }

  return { client: { from }, lootItemQueries }
}

function tier(id: string, name: string, phase: number, active = true): Row {
  return { id, name, phase, is_guild_active: active, expansion_id: EXPANSION }
}

function bisRequest(phase: number) {
  const qs = new URLSearchParams({
    expansion_id: EXPANSION,
    phase: String(phase),
    character_id: CHARACTER,
    guild_id: GUILD,
  })
  return new NextRequest(`http://localhost/api/bis-items?${qs}`)
}

const LOOT_ITEMS: Row[] = [
  { id: 'li-ssc', name: 'Vestments of the Sea-Witch', item_slot: 'Chest', wowhead_id: SEA_WITCH_VESTMENTS, raid_tier_id: 't-ssc', is_available: true },
  { id: 'li-hyjal', name: 'Tempest of Chaos', item_slot: 'Two-Hand', wowhead_id: TEMPEST_OF_CHAOS, raid_tier_id: 't-hyjal', is_available: true },
]

function run(fixture: Fixture, phase = 2) {
  const { client, lootItemQueries } = fakeClient(fixture)
  vi.mocked(createServiceRoleClient).mockReturnValue(
    client as unknown as ReturnType<typeof createServiceRoleClient>
  )
  return { response: GET(bisRequest(phase)), lootItemQueries }
}

describe('GET /api/bis-items phase groups', () => {
  beforeEach(() => {
    vi.mocked(createServiceRoleClient).mockReset()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      user: { id: USER },
      error: null,
    } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>)
  })

  // regression for #484
  it('imports from every phase of a merged group', async () => {
    const { response, lootItemQueries } = run({
      raid_tiers: [tier('t-ssc', 'Serpentshrine Cavern', 2), tier('t-hyjal', 'Hyjal Summit', 3)],
      expansions: [{ id: EXPANSION, current_phase: 3, phase_groups: [[2, 3]] }],
      loot_items: LOOT_ITEMS,
    })
    const res = await response
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.tier_names).toEqual(['Serpentshrine Cavern', 'Hyjal Summit'])
    expect(body.items.map((i: { wowhead_id: number }) => i.wowhead_id).sort()).toEqual(
      [SEA_WITCH_VESTMENTS, TEMPEST_OF_CHAOS].sort()
    )
    expect(lootItemQueries).toEqual([['t-ssc', 't-hyjal']])
  })

  it('keeps to the one phase when phases are not merged', async () => {
    const { response } = run({
      raid_tiers: [tier('t-ssc', 'Serpentshrine Cavern', 2), tier('t-hyjal', 'Hyjal Summit', 3)],
      expansions: [{ id: EXPANSION, current_phase: 3, phase_groups: null }],
      loot_items: LOOT_ITEMS,
    })
    const body = await (await response).json()

    expect(body.tier_names).toEqual(['Serpentshrine Cavern'])
    expect(body.items.map((i: { wowhead_id: number }) => i.wowhead_id)).toEqual([SEA_WITCH_VESTMENTS])
  })

  it('leaves out a grouped phase that is not unlocked yet', async () => {
    const { response } = run({
      raid_tiers: [tier('t-ssc', 'Serpentshrine Cavern', 2), tier('t-hyjal', 'Hyjal Summit', 3)],
      expansions: [{ id: EXPANSION, current_phase: 2, phase_groups: [[2, 3]] }],
      loot_items: LOOT_ITEMS,
    })
    const body = await (await response).json()

    expect(body.tier_names).toEqual(['Serpentshrine Cavern'])
  })

  it('names a disabled raid from a later phase of the group when nothing matches', async () => {
    const { response } = run({
      raid_tiers: [tier('t-other', 'Some Raid Without BiS Data', 2), tier('t-hyjal', 'Hyjal Summit', 3, false)],
      expansions: [{ id: EXPANSION, current_phase: 3, phase_groups: [[2, 3]] }],
      loot_items: LOOT_ITEMS,
    })
    const res = await response
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.code).toBe('NO_BIS_DATA')
    expect(body.details.disabled_raids_with_bis).toEqual(['Hyjal Summit'])
  })
})
