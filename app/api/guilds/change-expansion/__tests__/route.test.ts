// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'
import { seedExpansionForGuild } from '@/app/services/expansionSeeder'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))
vi.mock('@/app/services/expansionSeeder', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/app/services/expansionSeeder')>()),
  seedExpansionForGuild: vi.fn(),
}))

type Call = { table: string; op: string; payload?: unknown; filters: Array<[string, unknown]> }

/** Chainable, thenable Supabase stand-in that records every query it receives. */
function makeClient(opts: { existing: Array<{ id: string; name: string }>; updateError?: unknown; game?: string }) {
  const game = opts.game ?? 'classic'
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const call: Call = { table, op: 'select', filters: [] }
      calls.push(call)
      const result = () => {
        if (call.op === 'select') return { data: opts.existing, error: null }
        if (call.op === 'update') return { error: opts.updateError ?? null }
        return { error: null }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        delete: () => { call.op = 'delete'; return builder },
        update: (payload: unknown) => { call.op = 'update'; call.payload = payload; return builder },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        single: () => Promise.resolve(
          table === 'guilds' ? { data: { game }, error: null } : { data: null, error: null }
        ),
        then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
          Promise.resolve(result()).then(resolve, reject),
      }
      return builder
    },
  }
  return { client, calls }
}

function request(body: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Request('http://localhost/api/guilds/change-expansion', { method: 'POST', body: JSON.stringify(body) }) as any
}

const deletes = (calls: Call[]) => calls.filter(c => c.table === 'expansions' && c.op === 'delete')
const guildsUpdate = (calls: Call[]) => calls.find(c => c.table === 'guilds' && c.op === 'update')

describe('POST /api/guilds/change-expansion', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'user-1' }, error: null } as never)
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as never)
    vi.mocked(seedExpansionForGuild).mockReset()
  })

  it('seeds through the service-role path without setting current, then switches and deletes the old expansion', async () => {
    const { client, calls } = makeClient({ existing: [{ id: 'old-1', name: 'Classic' }] })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    vi.mocked(seedExpansionForGuild).mockResolvedValue({ expansionId: 'new-1' })

    const res = await POST(request({ guild_id: 'g1', expansion: 'The Burning Crusade' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, expansion_id: 'new-1' })
    // Regression: the 4th argument is setAsCurrent and the 5th is useServiceRole
    expect(seedExpansionForGuild).toHaveBeenCalledWith(client, 'g1', 'The Burning Crusade', false, true)
    const update = guildsUpdate(calls)
    expect(update?.payload).toEqual({ active_expansion_id: 'new-1' })
    expect(deletes(calls)).toEqual([
      expect.objectContaining({ filters: [['id', ['old-1']]] }),
    ])
    // The delete happens after the guild points at the new expansion
    expect(calls.indexOf(update!)).toBeLessThan(calls.indexOf(deletes(calls)[0]))
  })

  it('keeps the old expansions when seeding fails and removes only the partial new row', async () => {
    const { client, calls } = makeClient({ existing: [{ id: 'old-1', name: 'Classic' }] })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    vi.mocked(seedExpansionForGuild).mockResolvedValue({ expansionId: '', error: 'Failed to create expansion' })

    const res = await POST(request({ guild_id: 'g1', expansion: 'The Burning Crusade' }))

    expect(res.status).toBe(500)
    // No guilds update happened (the guild game lookup itself does read guilds)
    expect(guildsUpdate(calls)).toBeUndefined()
    expect(deletes(calls)).toEqual([
      expect.objectContaining({ filters: [['guild_id', 'g1'], ['name', 'The Burning Crusade']] }),
    ])
  })

  it('rolls back the new expansion when switching the active expansion fails', async () => {
    const { client, calls } = makeClient({
      existing: [{ id: 'old-1', name: 'Classic' }],
      updateError: { message: 'boom' },
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    vi.mocked(seedExpansionForGuild).mockResolvedValue({ expansionId: 'new-1' })

    const res = await POST(request({ guild_id: 'g1', expansion: 'The Burning Crusade' }))

    expect(res.status).toBe(500)
    expect(deletes(calls)).toEqual([
      expect.objectContaining({ filters: [['id', 'new-1']] }),
    ])
  })

  it('reuses an expansion the guild already has instead of reseeding it', async () => {
    const { client, calls } = makeClient({
      existing: [{ id: 'old-1', name: 'Classic' }, { id: 'tbc-1', name: 'The Burning Crusade' }],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: 'g1', expansion: 'The Burning Crusade' }))

    expect(res.status).toBe(200)
    expect(seedExpansionForGuild).not.toHaveBeenCalled()
    expect(guildsUpdate(calls)?.payload).toEqual({ active_expansion_id: 'tbc-1' })
    expect(deletes(calls)).toEqual([
      expect.objectContaining({ filters: [['id', ['old-1']]] }),
    ])
  })

  it('rejects unknown expansion names before touching the database', async () => {
    const { client, calls } = makeClient({ existing: [] })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: 'g1', expansion: 'constructor' }))

    expect(res.status).toBe(400)
    expect(calls).toEqual([])
  })

  it('rejects The Burning Crusade for a Forever guild before seeding, switching or deleting anything', async () => {
    const { client, calls } = makeClient({ existing: [{ id: 'fe-1', name: 'Forever' }], game: 'forever' })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: 'g1', expansion: 'The Burning Crusade' }))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: "The Burning Crusade isn't available for this guild's game version.",
    })
    expect(seedExpansionForGuild).not.toHaveBeenCalled()
    expect(deletes(calls)).toEqual([])
    expect(guildsUpdate(calls)).toBeUndefined()
  })

  it('rejects Forever for a Classic guild before seeding, switching or deleting anything', async () => {
    const { client, calls } = makeClient({ existing: [{ id: 'c-1', name: 'Classic' }], game: 'classic' })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: 'g1', expansion: 'Forever' }))

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: "WoW Forever isn't available for this guild's game version.",
    })
    expect(seedExpansionForGuild).not.toHaveBeenCalled()
    expect(deletes(calls)).toEqual([])
    expect(guildsUpdate(calls)).toBeUndefined()
  })
})
