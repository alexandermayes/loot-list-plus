// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'
import { seedExpansionForGuild } from '@/app/services/expansionSeeder'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))
vi.mock('@/app/services/expansionSeeder', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/app/services/expansionSeeder')>()),
  seedExpansionForGuild: vi.fn(),
}))

/** Minimal Supabase stand-in: a guild with the given game version, or a missing row when game is null. */
function makeClient(game: string | null) {
  const client = {
    from(table: string) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        single: () => Promise.resolve(
          table === 'guilds'
            ? { data: game === null ? null : { game }, error: null }
            : { data: null, error: null }
        ),
      }
      return builder
    },
  }
  return client
}

function post(guildId: string, body: unknown) {
  const request = new Request(`http://localhost/api/guilds/${guildId}/expansions`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return POST(request as any, { params: Promise.resolve({ id: guildId }) })
}

describe('POST /api/guilds/[id]/expansions game-version enforcement', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'user-1' }, error: null } as never)
    vi.mocked(createClient).mockResolvedValue({} as never)
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as never)
    vi.mocked(seedExpansionForGuild).mockReset()
  })

  it('rejects The Burning Crusade for a Forever guild without seeding', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(makeClient('forever') as never)

    const res = await post('g1', { expansionName: 'The Burning Crusade' })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: "The Burning Crusade isn't available for this guild's game version.",
    })
    expect(seedExpansionForGuild).not.toHaveBeenCalled()
  })

  it('rejects Forever for a Classic guild', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(makeClient('classic') as never)

    const res = await post('g1', { expansionName: 'Forever' })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: "WoW Forever isn't available for this guild's game version.",
    })
    expect(seedExpansionForGuild).not.toHaveBeenCalled()
  })

  it('adds The Burning Crusade to a Classic guild', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(makeClient('classic') as never)
    vi.mocked(seedExpansionForGuild).mockResolvedValue({ expansionId: 'exp-1' } as never)

    const res = await post('g1', { expansionName: 'The Burning Crusade' })

    expect(res.status).toBe(200)
    expect(seedExpansionForGuild).toHaveBeenCalledWith(
      expect.anything(),
      'g1',
      'The Burning Crusade',
      true,
      true
    )
    expect(await res.json()).toEqual({
      success: true,
      expansionId: 'exp-1',
      message: 'The Burning Crusade has been added to your guild!',
    })
  })

  it('returns 404 Guild not found for a missing guild row, without seeding', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue(makeClient(null) as never)

    const res = await post('g1', { expansionName: 'The Burning Crusade' })

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Guild not found' })
    expect(seedExpansionForGuild).not.toHaveBeenCalled()
  })
})
