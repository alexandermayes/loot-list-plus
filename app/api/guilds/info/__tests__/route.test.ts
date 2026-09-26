// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PUT } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { isGuildCreator } from '@/utils/server-roles'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({
  isGuildCreator: vi.fn(),
  verifyGuildMasterPermissions: vi.fn(),
}))

/** Minimal Supabase stand-in: a guild with the given game version ('classic' or 'forever'), or a missing row when game is null. */
function makeClient(game: string | null) {
  const updates: unknown[] = []
  const lookups: string[] = []
  const client = {
    from(table: string) {
      let op = 'select'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => { lookups.push(table); return builder },
        update: (payload: unknown) => { op = 'update'; updates.push(payload); return builder },
        eq: () => builder,
        single: () => Promise.resolve(
          table === 'guilds'
            ? { data: game === null ? null : { game }, error: null }
            : { data: null, error: null }
        ),
        then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
          Promise.resolve(op === 'update' ? { error: null } : { data: null, error: null }).then(resolve, reject),
      }
      return builder
    },
  }
  return { client, updates, lookups }
}

function put(body: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return PUT(new Request('http://localhost/api/guilds/info', { method: 'PUT', body: JSON.stringify(body) }) as any)
}

describe('PUT /api/guilds/info ruleset validation', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'user-1' }, error: null } as never)
    vi.mocked(isGuildCreator).mockResolvedValue(true as never)
  })

  it('rejects a realm name on a Forever guild', async () => {
    const { client, updates } = makeClient('forever')
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await put({ guild_id: 'g1', realm: 'Arugal' })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Select a valid WoW Forever ruleset.' })
    expect(updates).toEqual([])
  })

  it('saves a valid ruleset on a Forever guild', async () => {
    const { client, updates } = makeClient('forever')
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await put({ guild_id: 'g1', realm: 'PvP (US)' })

    expect(res.status).toBe(200)
    expect(updates).toEqual([{ realm: 'PvP (US)' }])
  })

  it('saves a ruleset-shaped realm on a Classic guild without validating it as a ruleset', async () => {
    const { client, updates } = makeClient('classic')
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await put({ guild_id: 'g1', realm: 'PvP (US)' })

    expect(res.status).toBe(200)
    expect(updates).toEqual([{ realm: 'PvP (US)' }])
  })

  it('leaves realm validation unchanged for a Classic guild (no realm heuristic)', async () => {
    const { client, updates } = makeClient('classic')
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await put({ guild_id: 'g1', realm: 'Arugal' })

    expect(res.status).toBe(200)
    expect(updates).toEqual([{ realm: 'Arugal' }])
  })

  it('treats a missing guild row as classic (no ruleset validation)', async () => {
    const { client, updates } = makeClient(null)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await put({ guild_id: 'g1', realm: 'Arugal' })

    expect(res.status).toBe(200)
    expect(updates).toEqual([{ realm: 'Arugal' }])
  })

  it('skips the game lookup when the realm is not being changed', async () => {
    const { client, updates, lookups } = makeClient('forever')
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await put({ guild_id: 'g1', name: 'Onslaught' })

    expect(res.status).toBe(200)
    expect(lookups).toEqual([])
    expect(updates).toEqual([{ name: 'Onslaught' }])
  })

  it('reads only the guilds table when validating a realm change', async () => {
    const { client, lookups } = makeClient('forever')
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    await put({ guild_id: 'g1', realm: 'PvP (US)' })

    expect(lookups).toEqual(['guilds'])
  })
})
