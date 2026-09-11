// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on, so this suite opts
// into the node environment instead of touching vitest.config.ts.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as route from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'

// Builds a chainable Supabase-like query object whose select() resolves to
// a table-specific count, so the three counts stay distinguishable in
// assertions instead of collapsing to the same mocked value.
function buildSelectResult(count: number) {
  return { count, error: null }
}

const TABLE_COUNTS: Record<string, number> = {
  guilds: 11,
  character_guild_memberships: 222,
  loot_history: 3333,
}

vi.mock('@/utils/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(),
}))

describe('GET /api/guild-count', () => {
  beforeEach(() => {
    vi.mocked(createServiceRoleClient).mockReset()
    vi.mocked(createServiceRoleClient).mockReturnValue({
      from: (table: string) => ({
        select: () => Promise.resolve(buildSelectResult(TABLE_COUNTS[table] ?? 0)),
      }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  })

  it('exports dynamic as force-dynamic so Next.js never prerenders this route', () => {
    expect(route.dynamic).toBe('force-dynamic')
  })

  it('does not export an ISR revalidate binding', () => {
    expect(Object.keys(route)).not.toContain('revalidate')
  })

  it('returns 200 with { guilds, raiders, loot } mapped from the three table counts', async () => {
    const response = await route.GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({
      guilds: TABLE_COUNTS.guilds,
      raiders: TABLE_COUNTS.character_guild_memberships,
      loot: TABLE_COUNTS.loot_history,
    })
  })

  it('carries a one hour CDN Cache-Control header on success', async () => {
    const response = await route.GET()

    expect(response.headers.get('Cache-Control')).toBe(
      'public, s-maxage=3600, stale-while-revalidate=86400'
    )
  })

  it('resolves to a generic 500 JSON error body instead of throwing when the client construction fails', async () => {
    vi.mocked(createServiceRoleClient).mockImplementationOnce(() => {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
    })

    const response = await route.GET()
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toHaveProperty('error')
  })
})
