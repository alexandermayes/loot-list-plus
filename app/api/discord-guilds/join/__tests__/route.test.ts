// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../route'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getDefaultRoleName } from '@/domain/guild/default-role'
import { recordGuildJoinGrant, consumeGuildJoinGrant } from '@/domain/guild/join-grants'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/lib/cache/user-bundle', () => ({ revalidateUserBundle: vi.fn() }))
vi.mock('@/domain/guild/default-role', () => ({ getDefaultRoleName: vi.fn() }))
vi.mock('@/domain/guild/join-grants', () => ({
  recordGuildJoinGrant: vi.fn(),
  consumeGuildJoinGrant: vi.fn(),
}))

const USER = 'user-1'
const GUILD = 'guild-1'
const CHARACTER = 'char-1'
const DISCORD_SERVER = 'discord-server-1'

interface Call {
  table: string
  op: 'select' | 'update' | 'insert' | 'upsert' | 'delete'
  payload?: unknown
  filters: Array<[string, unknown]>
}

/** Shared, ordered log of service-role writes and join record helper calls. */
let events: string[] = []

interface ServiceWorld {
  hasCharacter: boolean
  existing?: { id: string; is_active: boolean } | null
  failInsert?: boolean
}

function serviceClient(w: ServiceWorld) {
  const calls: Call[] = []
  function from(table: string) {
    const call: Call = { table, op: 'select', filters: [] }
    calls.push(call)
    const write = (op: Call['op']) => (payload?: unknown) => {
      call.op = op
      call.payload = payload
      events.push(`${table}:${op}`)
      return builder
    }
    const resolve = () => {
      if (table === 'characters' && call.filters.some(([col]) => col === 'id')) return { data: { class_id: 'class-1' }, error: null }
      if (table === 'characters') return { data: w.hasCharacter ? [{ id: CHARACTER, class_id: 'class-1' }] : [], error: null }
      if (table === 'character_guild_memberships' && call.op === 'select') return { data: w.existing ?? null, error: null }
      if (table === 'guild_settings') return { data: { new_members_start_as_trial: false }, error: null }
      if (table === 'character_guild_memberships' && call.op === 'insert' && w.failInsert) {
        return { data: null, error: { message: 'insert failed' } }
      }
      return { data: null, error: null }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: () => builder,
      insert: write('insert'),
      update: write('update'),
      upsert: write('upsert'),
      delete: write('delete'),
      eq: (col: string, val: unknown) => {
        call.filters.push([col, val])
        return builder
      },
      not: () => builder,
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => Promise.resolve(resolve()),
      single: () => Promise.resolve(resolve()),
      then: (onResolve: (v: unknown) => unknown, onReject: (e: unknown) => unknown) =>
        Promise.resolve(resolve()).then(onResolve, onReject),
    }
    return builder
  }
  const writes = () => calls.filter(c => c.op !== 'select')
  return { client: { from }, calls, writes }
}

/** User-session client: Discord verification, the guild row and the provider token. */
function userClient({ verified = true }: { verified?: boolean } = {}) {
  function from(table: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: () => builder,
      eq: () => builder,
      maybeSingle: () =>
        Promise.resolve(
          table === 'user_preferences'
            ? { data: verified ? { discord_verified: true, discord_id: 'd-1' } : { discord_verified: false, discord_id: null }, error: null }
            : { data: null, error: null },
        ),
      single: () =>
        Promise.resolve(
          table === 'guilds'
            ? { data: { id: GUILD, name: 'Guild', realm: 'Realm', discord_server_id: DISCORD_SERVER, is_active: true }, error: null }
            : { data: null, error: null },
        ),
    }
    return builder
  }
  return {
    from,
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: { provider_token: 'token-1' } } })),
      refreshSession: vi.fn(),
    },
  }
}

function stubDiscord(serverIds: string[]) {
  vi.stubGlobal('fetch', vi.fn(() =>
    Promise.resolve(new Response(JSON.stringify(serverIds.map(id => ({ id, name: 'Server', icon: null, owner: false, permissions: '0' }))), { status: 200 })),
  ))
}

function setup(w: ServiceWorld, opts: { verified?: boolean; inServer?: boolean } = {}) {
  const service = serviceClient(w)
  vi.mocked(createClient).mockResolvedValue(userClient({ verified: opts.verified }) as never)
  vi.mocked(createServiceRoleClient).mockReturnValue(service.client as never)
  stubDiscord(opts.inServer === false ? ['other-server'] : [DISCORD_SERVER])
  return { service }
}

function request() {
  return new Request('http://localhost/api/discord-guilds/join', {
    method: 'POST',
    body: JSON.stringify({ guild_id: GUILD }),
  }) as never
}

describe('POST /api/discord-guilds/join records the join for users without a character', () => {
  beforeEach(() => {
    events = []
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER }, error: null } as never)
    vi.mocked(getDefaultRoleName).mockResolvedValue('Member')
    vi.mocked(recordGuildJoinGrant).mockImplementation(async () => {
      events.push('record')
      return { error: null }
    })
    vi.mocked(consumeGuildJoinGrant).mockImplementation(async () => {
      events.push('consume')
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('records the join before setting the active guild when the user has no character with a class set', async () => {
    const { service } = setup({ hasCharacter: false })

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ success: true, guild_id: GUILD, needs_character_creation: true })
    expect(recordGuildJoinGrant).toHaveBeenCalledTimes(1)
    expect(recordGuildJoinGrant).toHaveBeenCalledWith(service.client, { userId: USER, guildId: GUILD, source: 'discord_verify' })
    expect(events).toEqual(['record', 'user_active_characters:upsert'])
    expect(consumeGuildJoinGrant).not.toHaveBeenCalled()
  })

  it('returns 500 with the existing text and no user_active_characters write when the join record cannot be written', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(recordGuildJoinGrant).mockResolvedValue({ error: { message: 'write failed' } })
    const { service } = setup({ hasCharacter: false })

    const res = await POST(request())

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Couldn't join guild. Try again or contact an officer." })
    expect(service.writes()).toEqual([])
  })

  it('returns the existing 403 and calls no helper when the user is not in the Discord server', async () => {
    const { service } = setup({ hasCharacter: false }, { inServer: false })

    const res = await POST(request())

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: "You must be a member of this guild's Discord server" })
    expect(recordGuildJoinGrant).not.toHaveBeenCalled()
    expect(consumeGuildJoinGrant).not.toHaveBeenCalled()
    expect(service.calls).toEqual([])
  })

  it('returns the existing 403 and calls no helper when the user is not Discord verified', async () => {
    const { service } = setup({ hasCharacter: false }, { verified: false })

    const res = await POST(request())

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Discord verification required' })
    expect(recordGuildJoinGrant).not.toHaveBeenCalled()
    expect(service.calls).toEqual([])
  })

  it('inserts the membership and then consumes the join record for a user with a character', async () => {
    const { service } = setup({ hasCharacter: true, existing: null })

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(recordGuildJoinGrant).not.toHaveBeenCalled()
    expect(consumeGuildJoinGrant).toHaveBeenCalledWith(service.client, { userId: USER, guildId: GUILD })
    expect(events).toEqual(['character_guild_memberships:insert', 'consume', 'user_active_characters:upsert'])
  })

  it('reactivates an inactive membership and then consumes the join record', async () => {
    const { service } = setup({ hasCharacter: true, existing: { id: 'm-1', is_active: false } })

    const res = await POST(request())

    expect(res.status).toBe(200)
    const update = service.writes().find(c => c.table === 'character_guild_memberships')
    expect(update).toMatchObject({ op: 'update', payload: { is_active: true, role: 'Member', joined_via: 'discord_verify' }, filters: [['id', 'm-1']] })
    expect(events).toEqual(['character_guild_memberships:update', 'consume', 'user_active_characters:upsert'])
  })

  it('writes no membership and consumes nothing in the "Already a member" branch', async () => {
    const { service } = setup({ hasCharacter: true, existing: { id: 'm-2', is_active: true } })

    const res = await POST(request())

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ message: 'Already a member - set as active guild' })
    expect(service.writes().filter(c => c.table === 'character_guild_memberships')).toEqual([])
    expect(consumeGuildJoinGrant).not.toHaveBeenCalled()
    expect(recordGuildJoinGrant).not.toHaveBeenCalled()
  })

  it('returns the existing 500 and consumes nothing when the membership insert fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    setup({ hasCharacter: true, existing: null, failInsert: true })

    const res = await POST(request())

    expect(res.status).toBe(500)
    expect(consumeGuildJoinGrant).not.toHaveBeenCalled()
  })
})
