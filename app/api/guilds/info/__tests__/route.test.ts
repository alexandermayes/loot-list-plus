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

/** Minimal Supabase stand-in: a guild whose active expansion has the given name. */
function makeClient(activeExpansionName: string | null) {
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
            ? { data: { active_expansion_id: activeExpansionName ? 'exp-1' : null }, error: null }
            : { data: activeExpansionName ? { name: activeExpansionName } : null, error: null }
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
    const { client, updates } = makeClient('Forever')
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await put({ guild_id: 'g1', realm: 'Arugal' })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Select a valid WoW Forever ruleset.' })
    expect(updates).toEqual([])
  })

  it('saves a valid ruleset on a Forever guild', async () => {
    const { client, updates } = makeClient('Forever')
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await put({ guild_id: 'g1', realm: 'PvP (US)' })

    expect(res.status).toBe(200)
    expect(updates).toEqual([{ realm: 'PvP (US)' }])
  })

  it('leaves realm validation unchanged for other expansions', async () => {
    const { client, updates } = makeClient('Classic')
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await put({ guild_id: 'g1', realm: 'Arugal' })

    expect(res.status).toBe(200)
    expect(updates).toEqual([{ realm: 'Arugal' }])
  })

  it('skips the expansion lookup when the realm is not being changed', async () => {
    const { client, updates, lookups } = makeClient('Forever')
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await put({ guild_id: 'g1', name: 'Onslaught' })

    expect(res.status).toBe(200)
    expect(lookups).toEqual([])
    expect(updates).toEqual([{ name: 'Onslaught' }])
  })
})
