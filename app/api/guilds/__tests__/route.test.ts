// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { seedExpansionForGuild } from '@/app/services/expansionSeeder'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/app/services/expansionSeeder', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/app/services/expansionSeeder')>()),
  seedExpansionForGuild: vi.fn(),
}))
vi.mock('@/utils/cache', () => ({
  getCached: vi.fn(),
  invalidateCache: vi.fn(),
  cacheKeys: { userGuilds: vi.fn((userId: string) => `cache:guilds:${userId}`) },
}))
vi.mock('@/lib/cache/user-bundle', () => ({ revalidateUserBundle: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({
  trackApiError: vi.fn(),
  trackEvent: vi.fn(),
  setUserMilestone: vi.fn(),
}))
vi.mock('@/utils/analytics/funnel', () => ({ evaluateGuildFunnel: vi.fn() }))

/**
 * One recording Supabase stand-in shared by both createClient() and
 * createServiceRoleClient(). maybeSingle on user_preferences always resolves
 * discord_verified: true; single() after an insert on guilds resolves a
 * fresh guild row; every other awaited chain resolves an empty list. Insert
 * payloads are recorded per table.
 */
function createMockSupabase() {
  const insertPayloads: Record<string, unknown[]> = {}

  function buildBuilder(table: string) {
    let inserted = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      not: () => builder,
      order: () => builder,
      limit: () => builder,
      in: () => builder,
      insert: (payload: unknown) => {
        insertPayloads[table] = insertPayloads[table] || []
        insertPayloads[table].push(payload)
        inserted = true
        return builder
      },
      update: () => builder,
      upsert: () => builder,
      delete: () => builder,
      maybeSingle: () => {
        if (table === 'user_preferences') {
          return Promise.resolve({ data: { discord_verified: true }, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      },
      single: () => {
        if (table === 'guilds' && inserted) {
          return Promise.resolve({
            data: { id: 'g1', name: 'Test Guild', realm: 'PvP (EU)', faction: 'Horde' },
            error: null,
          })
        }
        return Promise.resolve({ data: null, error: null })
      },
      then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null }).then(resolve, reject),
    }
    return builder
  }

  const supabase = { from: (table: string) => buildBuilder(table) }
  return { supabase, insertPayloads }
}

function request(body: unknown) {
  return new Request('http://localhost/api/guilds', {
    method: 'POST',
    body: JSON.stringify(body),
    // No discord_server_id in any body below, so no Discord fetch happens.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any
}

const baseBody = { name: 'Test Guild', faction: 'Horde' }

describe('POST /api/guilds game-version derivation and enforcement', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'user-1' }, error: null } as never)
    vi.mocked(seedExpansionForGuild).mockReset()
    vi.mocked(seedExpansionForGuild).mockResolvedValue({ expansionId: 'exp-1' } as never)
  })

  it('derives game "forever" for expansion Forever and writes it to the guilds insert', async () => {
    const { supabase, insertPayloads } = createMockSupabase()
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    vi.mocked(createServiceRoleClient).mockReturnValue(supabase as never)

    const res = await POST(request({ ...baseBody, expansion: 'Forever', realm: 'PvP (EU)' }))

    expect(res.status).toBe(200)
    expect(insertPayloads.guilds?.[0]).toMatchObject({ game: 'forever' })
  })

  it('derives game "classic" for The Burning Crusade and writes it to the guilds insert', async () => {
    const { supabase, insertPayloads } = createMockSupabase()
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    vi.mocked(createServiceRoleClient).mockReturnValue(supabase as never)

    const res = await POST(request({ ...baseBody, expansion: 'The Burning Crusade', realm: 'Arugal' }))

    expect(res.status).toBe(200)
    expect(insertPayloads.guilds?.[0]).toMatchObject({ game: 'classic' })
  })

  it('rejects a client-sent game that disagrees with the chosen Forever expansion, with no guild insert', async () => {
    const { supabase, insertPayloads } = createMockSupabase()
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    vi.mocked(createServiceRoleClient).mockReturnValue(supabase as never)

    const res = await POST(request({ ...baseBody, expansion: 'Forever', realm: 'PvP (EU)', game: 'classic' }))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Game version does not match the selected expansion.' })
    expect(insertPayloads.guilds).toBeUndefined()
  })

  it('rejects a client-sent game "retail" that disagrees with the chosen Classic expansion, with no guild insert', async () => {
    const { supabase, insertPayloads } = createMockSupabase()
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    vi.mocked(createServiceRoleClient).mockReturnValue(supabase as never)

    const res = await POST(request({ ...baseBody, expansion: 'Classic', realm: 'Arugal', game: 'retail' }))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Game version does not match the selected expansion.' })
    expect(insertPayloads.guilds).toBeUndefined()
  })

  it('accepts a client-sent game that matches the chosen expansion', async () => {
    const { supabase, insertPayloads } = createMockSupabase()
    vi.mocked(createClient).mockResolvedValue(supabase as never)
    vi.mocked(createServiceRoleClient).mockReturnValue(supabase as never)

    const res = await POST(request({ ...baseBody, expansion: 'Forever', realm: 'PvP (EU)', game: 'forever' }))

    expect(res.status).toBe(200)
    expect(insertPayloads.guilds?.[0]).toMatchObject({ game: 'forever' })
  })
})
