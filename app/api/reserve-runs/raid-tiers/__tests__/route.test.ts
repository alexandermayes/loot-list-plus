// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
//
// Pins that Forever reserve runs do not light up on the public tiers route as
// a side effect of the expansion registry work (EXPN-02, research Pitfall 1).
// The route resolves a slug through EXPANSION_NAME_TO_SLUG, which has no
// Forever entry, so Forever answers 400 before any service-role client is
// built. The owner can change that deliberately later; this test then moves
// with the decision instead of the behavior shifting unnoticed.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getExpansionSlug } from '@/data/expansion-phases'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))

function tiersRequest(expansion: string) {
  return new NextRequest(
    `http://localhost/api/reserve-runs/raid-tiers?expansion=${encodeURIComponent(expansion)}`
  )
}

// Only the expansions lookup is reachable in the empty case: from().select()
// .eq().limit() resolves to no rows, so the route answers before raid_tiers.
function clientWithNoExpansions() {
  const tables: string[] = []
  const limit = vi.fn().mockResolvedValue({ data: [], error: null })
  const eq = vi.fn().mockReturnValue({ limit })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn((table: string) => {
    tables.push(table)
    return { select }
  })
  return { client: { from }, tables }
}

describe('GET /api/reserve-runs/raid-tiers', () => {
  beforeEach(() => {
    vi.mocked(createServiceRoleClient).mockReset()
  })

  it('refuses Forever with 400 Unknown expansion and never builds a service-role client', async () => {
    const res = await GET(tiersRequest('Forever'))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Unknown expansion' })
    expect(createServiceRoleClient).not.toHaveBeenCalled()
  })

  it('still answers 200 with an empty tier list for Classic when no guild has seeded it', async () => {
    const { client, tables } = clientWithNoExpansions()
    vi.mocked(createServiceRoleClient).mockReturnValue(
      client as unknown as ReturnType<typeof createServiceRoleClient>
    )

    const res = await GET(tiersRequest('Classic'))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, tiers: [] })
    expect(createServiceRoleClient).toHaveBeenCalledTimes(1)
    expect(tables).toEqual(['expansions'])
  })

  // D-14: a Discovery tier holds no items to reserve, so the reserve tier
  // list shows Known tiers only.
  it('lists only Known tiers: the raid_tiers read filters list_mode to known', async () => {
    const eqCalls: Array<[string, unknown]> = []
    const tierRows = [{ id: 'tier-1', name: 'Tier 1', phase: 1 }]
    const tiersBuilder: Record<string, unknown> = {}
    tiersBuilder.eq = vi.fn((col: string, val: unknown) => {
      eqCalls.push([col, val])
      return tiersBuilder
    })
    tiersBuilder.order = vi.fn(() => tiersBuilder)
    tiersBuilder.then = (resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: tierRows, error: null }).then(resolve)
    const expansionsBuilder = {
      eq: () => ({ limit: () => Promise.resolve({ data: [{ id: 'exp-1' }], error: null }) }),
    }
    const client = {
      from: (table: string) => ({
        select: () => (table === 'expansions' ? expansionsBuilder : tiersBuilder),
      }),
    }
    vi.mocked(createServiceRoleClient).mockReturnValue(
      client as unknown as ReturnType<typeof createServiceRoleClient>
    )

    const res = await GET(tiersRequest('Classic'))

    expect(res.status).toBe(200)
    expect(eqCalls).toContainEqual(['expansion_id', 'exp-1'])
    expect(eqCalls).toContainEqual(['list_mode', 'known'])
    expect((await res.json()).tiers).toEqual(tierRows)
  })

  it('has no public slug for Forever', () => {
    expect(getExpansionSlug('Forever')).toBeNull()
  })
})
