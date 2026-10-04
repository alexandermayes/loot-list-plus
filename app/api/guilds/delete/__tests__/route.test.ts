// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))
vi.mock('@/utils/analytics/server', () => ({
  trackApiError: vi.fn(),
}))

/**
 * One recording Supabase stand-in. rpc(name, args) records the call and
 * resolves { error } from the test's option. from('guilds').select().eq()
 * .single() resolves the test's guild row (or null). Every update and
 * delete, in call order, is recorded with its eq filters. Every other
 * awaited chain resolves the shape the route expects with empty data.
 */
function createMockSupabase(opts: {
  guild?: { id: string; created_by: string; name: string } | null
  guildError?: unknown
  rpcError?: unknown
  characters?: { id: string }[]
  memberships?: { guild_id: string }[]
  activeChar?: { active_guild_id: string | null } | null
} = {}) {
  const rpcCalls: { name: string; args: unknown }[] = []
  // Every update and delete, in call order, with the eq filters applied to it.
  const writes: { table: string; op: 'update' | 'delete'; payload?: unknown; filters: [string, unknown][] }[] = []

  function buildBuilder(table: string) {
    let current: (typeof writes)[number] | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        if (current) current.filters.push([column, value])
        return builder
      },
      in: () => builder,
      limit: () => builder,
      update: (payload: unknown) => {
        current = { table, op: 'update', payload, filters: [] }
        writes.push(current)
        return builder
      },
      delete: () => {
        current = { table, op: 'delete', filters: [] }
        writes.push(current)
        return builder
      },
      single: () => {
        if (table === 'guilds') {
          return Promise.resolve({ data: opts.guild ?? null, error: opts.guildError ?? null })
        }
        return Promise.resolve({ data: null, error: null })
      },
      maybeSingle: () => {
        if (table === 'user_active_characters') {
          return Promise.resolve({ data: opts.activeChar ?? null, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      },
      then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
        if (table === 'characters') {
          return Promise.resolve({ data: opts.characters ?? [], error: null }).then(resolve, reject)
        }
        if (table === 'character_guild_memberships') {
          return Promise.resolve({ data: opts.memberships ?? [], error: null }).then(resolve, reject)
        }
        return Promise.resolve({ data: [], error: null }).then(resolve, reject)
      },
    }
    return builder
  }

  const supabase = {
    from: (table: string) => buildBuilder(table),
    rpc: (name: string, args: unknown) => {
      rpcCalls.push({ name, args })
      return Promise.resolve({ error: opts.rpcError ?? null })
    },
  }
  return { supabase, rpcCalls, writes }
}

function request(body: unknown) {
  return new Request('http://localhost/api/guilds/delete', {
    method: 'POST',
    body: JSON.stringify(body),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any
}

const GUILD_ID = 'guild-1'
const USER_ID = 'user-1'
const guildRow = { id: GUILD_ID, created_by: USER_ID, name: 'Test Guild' }

describe('POST /api/guilds/delete', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID }, error: null } as never)
  })

  it('T1: returns 401 with no rpc call when there is no authenticated user', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: null, error: new Error('no session') } as never)
    const { supabase, rpcCalls } = createMockSupabase()
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const res = await POST(request({ guild_id: GUILD_ID }))

    expect(res.status).toBe(401)
    expect(rpcCalls).toEqual([])
  })

  it('T2: returns 400 when guild_id is missing', async () => {
    const { supabase, rpcCalls } = createMockSupabase()
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const res = await POST(request({}))

    expect(res.status).toBe(400)
    expect(rpcCalls).toEqual([])
  })

  it('T3: returns 404 when the guild read returns no row', async () => {
    const { supabase, rpcCalls } = createMockSupabase({ guild: null })
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const res = await POST(request({ guild_id: GUILD_ID }))

    expect(res.status).toBe(404)
    expect(rpcCalls).toEqual([])
  })

  it('T4: returns 403 with no rpc call when the caller did not create the guild', async () => {
    const { supabase, rpcCalls } = createMockSupabase({ guild: { ...guildRow, created_by: 'someone-else' } })
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const res = await POST(request({ guild_id: GUILD_ID }))

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Only the guild creator can delete the guild' })
    expect(rpcCalls).toEqual([])
  })

  it('T5: returns 500 with the existing text and writes nothing when delete_guild fails', async () => {
    const { supabase, rpcCalls, writes } = createMockSupabase({ guild: guildRow, rpcError: { message: 'boom' } })
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const res = await POST(request({ guild_id: GUILD_ID }))

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Couldn't delete guild. Try again." })
    expect(rpcCalls).toEqual([{ name: 'delete_guild', args: { p_guild_id: GUILD_ID } }])
    expect(writes).toEqual([])
  })

  it('T6: returns 200 success when delete_guild succeeds, calling rpc exactly once', async () => {
    const { supabase, rpcCalls, writes } = createMockSupabase({
      guild: guildRow,
      characters: [{ id: 'char-1' }],
      memberships: [{ guild_id: 'other-guild' }],
      activeChar: { active_guild_id: 'other-guild' },
    })
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const res = await POST(request({ guild_id: GUILD_ID }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true, message: 'Guild deleted successfully', has_other_guilds: true })
    expect(rpcCalls).toEqual([{ name: 'delete_guild', args: { p_guild_id: GUILD_ID } }])
    expect(writes).toEqual([])
  })

  it('T6b: clears the active guild when it was the deleted guild', async () => {
    const { supabase, writes } = createMockSupabase({
      guild: guildRow,
      characters: [],
      activeChar: { active_guild_id: GUILD_ID },
    })
    vi.mocked(createClient).mockResolvedValue(supabase as never)

    const res = await POST(request({ guild_id: GUILD_ID }))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ success: true, has_other_guilds: false })
    expect(writes).toEqual([
      { table: 'user_active_characters', op: 'update', payload: expect.objectContaining({ active_guild_id: null }), filters: [['user_id', USER_ID]] },
    ])
  })
})
