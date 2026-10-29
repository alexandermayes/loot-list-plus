// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))

const TIER_ID = 'tier-1'

type Row = Record<string, unknown>
type Filter = ['eq', string, unknown]

/**
 * Recording fake for the one loot_items read: records the eq filters and
 * answers from the fixture rows those filters leave, or with an error.
 */
function makeClient(rows: Row[], errorMessage?: string) {
  const filters: Filter[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    select: () => builder,
    eq: (col: string, val: unknown) => { filters.push(['eq', col, val]); return builder },
    order: () => builder,
    then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
      if (errorMessage) return Promise.resolve({ data: null, error: { message: errorMessage } }).then(resolve, reject)
      const data = rows.filter((row) => filters.every(([, col, val]) => row[col] === val))
      return Promise.resolve({ data, error: null }).then(resolve, reject)
    },
  }
  const client = { from: vi.fn(() => builder) }
  return { client, filters }
}

function request(query = `?raid_tier_id=${TIER_ID}`) {
  return new NextRequest(`http://localhost/api/reserve-runs/items${query}`)
}

describe('GET /api/reserve-runs/items', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('lists item rows only and records the kind filter (D-14)', async () => {
    const { client, filters } = makeClient([
      { id: 'item-1', raid_tier_id: TIER_ID, is_available: true, kind: 'item', name: 'Real Sword' },
      { id: 'need-1', raid_tier_id: TIER_ID, is_available: true, kind: 'need', name: 'Main hand weapon' },
    ])
    vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceRoleClient>)

    const res = await GET(request())
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.items.map((i: Row) => i.id)).toEqual(['item-1'])
    expect(filters).toContainEqual(['eq', 'kind', 'item'])
  })

  it('answers 400 without raid_tier_id', async () => {
    const res = await GET(request(''))
    expect(res.status).toBe(400)
    expect(createServiceRoleClient).not.toHaveBeenCalled()
  })

  it('answers 500 when the read fails', async () => {
    const { client } = makeClient([], 'boom')
    vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceRoleClient>)

    const res = await GET(request())
    expect(res.status).toBe(500)
  })
})
