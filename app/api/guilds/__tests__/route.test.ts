// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../route'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { seedExpansionForGuild } from '@/app/services/expansionSeeder'
import { checkUserManagesDiscordServer } from '@/lib/discord-server-access'

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
// Only the Discord call is replaced; discordServerAccessError stays real so
// the tests check the shipped status and text.
vi.mock('@/lib/discord-server-access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/discord-server-access')>()),
  checkUserManagesDiscordServer: vi.fn(),
}))

/**
 * One recording Supabase stand-in shared by both createClient() and
 * createServiceRoleClient(). maybeSingle on user_preferences always resolves
 * discord_verified: true; single() after an insert on guilds resolves a
 * fresh guild row; every other awaited chain resolves an empty list. Insert
 * payloads are recorded per table.
 */
function createMockSupabase(opts: { failGuildsLinkUpdate?: boolean } = {}) {
  const insertPayloads: Record<string, unknown[]> = {}
  // Every update and delete, in call order, with the eq filters applied to it.
  const writes: { table: string; op: 'update' | 'delete'; payload?: unknown; filters: [string, unknown][] }[] = []

  function buildBuilder(table: string) {
    let inserted = false
    let current: (typeof writes)[number] | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: () => builder,
      eq: (column: string, value: unknown) => {
        if (current) current.filters.push([column, value])
        return builder
      },
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
      update: (payload: unknown) => {
        current = { table, op: 'update', payload, filters: [] }
        writes.push(current)
        return builder
      },
      upsert: () => builder,
      delete: () => {
        current = { table, op: 'delete', filters: [] }
        writes.push(current)
        return builder
      },
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
      then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
        const failLink = opts.failGuildsLinkUpdate &&
          current?.op === 'update' && table === 'guilds' &&
          Object.prototype.hasOwnProperty.call(current.payload ?? {}, 'discord_server_id')
        return Promise.resolve(failLink ? { data: null, error: { message: 'update failed' } } : { data: [], error: null })
          .then(resolve, reject)
      },
    }
    return builder
  }

  const supabase = { from: (table: string) => buildBuilder(table) }
  return { supabase, insertPayloads, writes }
}

function request(body: unknown) {
  return new Request('http://localhost/api/guilds', {
    method: 'POST',
    body: JSON.stringify(body),
    // The game-version tests send no discord_server_id; the Discord link
    // tests replace the access check and clear DISCORD_BOT_TOKEN.
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

describe('POST /api/guilds Discord server link', () => {
  const linkBody = { ...baseBody, expansion: 'Classic', realm: 'Arugal' }

  /** Separate user-session and service-role mocks, so each test can tell which client wrote. */
  function setupClients(serviceOpts: { failGuildsLinkUpdate?: boolean } = {}) {
    const user = createMockSupabase()
    const service = createMockSupabase(serviceOpts)
    vi.mocked(createClient).mockResolvedValue(user.supabase as never)
    vi.mocked(createServiceRoleClient).mockReturnValue(service.supabase as never)
    return { user, service }
  }

  const guildWrites = (writes: ReturnType<typeof createMockSupabase>['writes']) =>
    writes.filter((w) => w.table === 'guilds')

  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'user-1' }, error: null } as never)
    vi.mocked(seedExpansionForGuild).mockReset()
    vi.mocked(seedExpansionForGuild).mockResolvedValue({ expansionId: 'exp-1' } as never)
    vi.mocked(checkUserManagesDiscordServer).mockReset()
    vi.mocked(checkUserManagesDiscordServer).mockResolvedValue({ ok: true })
    vi.stubEnv('DISCORD_BOT_TOKEN', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('inserts the guild without the link, then writes the verified id with the service role', async () => {
    const { user, service } = setupClients()

    const res = await POST(request({ ...linkBody, discord_server_id: ' 123 ' }))

    expect(res.status).toBe(200)
    expect(checkUserManagesDiscordServer).toHaveBeenCalledTimes(1)
    expect(checkUserManagesDiscordServer).toHaveBeenCalledWith('123')
    expect(user.insertPayloads.guilds).toHaveLength(1)
    expect(user.insertPayloads.guilds?.[0]).not.toHaveProperty('discord_server_id')
    expect(guildWrites(service.writes)[0]).toEqual({
      table: 'guilds',
      op: 'update',
      payload: { discord_server_id: '123' },
      filters: [['id', 'g1']],
    })
  })

  it('leaves guild updates and deletes to the service role when the check passes', async () => {
    const { user } = setupClients()

    await POST(request({ ...linkBody, discord_server_id: '123' }))

    expect(guildWrites(user.writes)).toEqual([])
    expect(Object.keys(user.insertPayloads)).toContain('guilds')
  })

  it.each([
    ['not_manager', 403, { error: 'You can only link a Discord server where you have the Manage Server permission.' }],
    ['token_expired', 403, { error: 'Discord connection expired. Please log in again to reconnect.', code: 'discord_token_expired' }],
    ['rate_limited', 429, { error: 'Discord rate limit reached. Please wait a moment and try again.' }],
    ['discord_error', 502, { error: "Couldn't check your Discord server permissions. Try again." }],
  ] as const)('returns the %s response with no guild insert', async (reason, status, body) => {
    const { user, service } = setupClients()
    vi.mocked(checkUserManagesDiscordServer).mockResolvedValue({ ok: false, reason })

    const res = await POST(request({ ...linkBody, discord_server_id: '123' }))

    expect(res.status).toBe(status)
    expect(await res.json()).toEqual(body)
    expect(user.insertPayloads.guilds).toBeUndefined()
    expect(service.insertPayloads.guilds).toBeUndefined()
    expect(guildWrites(service.writes)).toEqual([])
  })

  it('deletes the new guild with the service role and returns 500 when the link write fails', async () => {
    const { user, service } = setupClients({ failGuildsLinkUpdate: true })

    const res = await POST(request({ ...linkBody, discord_server_id: '123' }))

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Failed to create guild' })
    expect(guildWrites(service.writes)).toEqual([
      { table: 'guilds', op: 'update', payload: { discord_server_id: '123' }, filters: [['id', 'g1']] },
      { table: 'guilds', op: 'delete', filters: [['id', 'g1']] },
    ])
    expect(guildWrites(user.writes)).toEqual([])
    expect(seedExpansionForGuild).not.toHaveBeenCalled()
  })

  it('deletes the new guild with the service role when seeding fails, keeping the status and text', async () => {
    const { user, service } = setupClients()
    vi.mocked(seedExpansionForGuild).mockResolvedValue({ expansionId: null, error: 'seed failed' } as never)

    const res = await POST(request({ ...linkBody, discord_server_id: '123' }))

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Couldn't set up the expansion. Try again." })
    expect(guildWrites(service.writes)).toContainEqual({ table: 'guilds', op: 'delete', filters: [['id', 'g1']] })
    expect(guildWrites(user.writes)).toEqual([])
  })

  it('deletes with the service role when seeding fails for a guild without a link', async () => {
    const { user, service } = setupClients()
    vi.mocked(seedExpansionForGuild).mockResolvedValue({ expansionId: null, error: 'seed failed' } as never)

    const res = await POST(request(linkBody))

    expect(res.status).toBe(500)
    expect(guildWrites(service.writes)).toEqual([{ table: 'guilds', op: 'delete', filters: [['id', 'g1']] }])
    expect(guildWrites(user.writes)).toEqual([])
  })

  it('refuses a numeric server id with 403 and the link text, with no check and no insert', async () => {
    const { user } = setupClients()

    const res = await POST(request({ ...linkBody, discord_server_id: 123 }))

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'You can only link a Discord server where you have the Manage Server permission.' })
    expect(checkUserManagesDiscordServer).not.toHaveBeenCalled()
    expect(user.insertPayloads.guilds).toBeUndefined()
  })

  it.each([
    ['no server id', {}],
    ['a null server id', { discord_server_id: null }],
    ['an empty server id', { discord_server_id: '' }],
    ['a blank server id', { discord_server_id: '   ' }],
  ])('creates the guild with %s without a check or a link write', async (_label, extra) => {
    const { user, service } = setupClients()

    const res = await POST(request({ ...linkBody, ...extra }))

    expect(res.status).toBe(200)
    expect(checkUserManagesDiscordServer).not.toHaveBeenCalled()
    expect(user.insertPayloads.guilds?.[0]).not.toHaveProperty('discord_server_id')
    expect(
      guildWrites(service.writes).some((w) =>
        Object.prototype.hasOwnProperty.call((w.payload as object) ?? {}, 'discord_server_id'))
    ).toBe(false)
  })

  it('fetches the server icon with the verified id', async () => {
    setupClients()
    vi.stubEnv('DISCORD_BOT_TOKEN', 'bot-token')
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ icon: null }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const res = await POST(request({ ...linkBody, discord_server_id: ' 123 ' }))

    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledWith('https://discord.com/api/v10/guilds/123', expect.anything())
  })
})
