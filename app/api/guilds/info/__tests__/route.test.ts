// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PUT } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { isGuildCreator, verifyGuildMasterPermissions } from '@/utils/server-roles'
import { checkUserManagesDiscordServer } from '@/lib/discord-server-access'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({
  isGuildCreator: vi.fn(),
  verifyGuildMasterPermissions: vi.fn(),
}))
// Only the Discord call is replaced; discordServerAccessError stays real so
// the tests check the shipped status and text.
vi.mock('@/lib/discord-server-access', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/discord-server-access')>()),
  checkUserManagesDiscordServer: vi.fn(),
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

/**
 * Supabase stand-in for the Discord link tests: a classic guild whose stored
 * discord_server_id is `stored`. Records the columns each guilds read selects
 * and every update payload. `lookupError` makes the stored-link read fail.
 */
function makeLinkClient(stored: string | null, opts: { lookupError?: boolean } = {}) {
  const updates: unknown[] = []
  const selects: string[] = []
  const client = {
    from(table: string) {
      let op = 'select'
      let columns = ''
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: (cols: string) => { columns = cols; selects.push(`${table}:${cols}`); return builder },
        update: (payload: unknown) => { op = 'update'; updates.push(payload); return builder },
        eq: () => builder,
        single: () => {
          if (table !== 'guilds') return Promise.resolve({ data: null, error: null })
          if (columns.includes('discord_server_id') && opts.lookupError) {
            return Promise.resolve({ data: null, error: { message: 'lookup failed' } })
          }
          return Promise.resolve({ data: { game: 'classic', discord_server_id: stored }, error: null })
        },
        then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
          Promise.resolve(op === 'update' ? { error: null } : { data: null, error: null }).then(resolve, reject),
      }
      return builder
    },
  }
  return { client, updates, selects }
}

describe('PUT /api/guilds/info Discord server link', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'user-1' }, error: null } as never)
    vi.mocked(isGuildCreator).mockResolvedValue(true as never)
    vi.mocked(checkUserManagesDiscordServer).mockReset()
    vi.mocked(checkUserManagesDiscordServer).mockResolvedValue({ ok: true })
  })

  it('saves a new server id when the user manages that server', async () => {
    const { client, updates } = makeLinkClient('111')
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await put({ guild_id: 'g1', name: 'Onslaught', discord_server_id: ' 555 ' })

    expect(res.status).toBe(200)
    expect(checkUserManagesDiscordServer).toHaveBeenCalledTimes(1)
    expect(checkUserManagesDiscordServer).toHaveBeenCalledWith('555')
    expect(updates).toEqual([{ name: 'Onslaught', discord_server_id: '555' }])
  })

  it('checks a first link on a guild with no stored server id', async () => {
    const { client, updates } = makeLinkClient(null)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await put({ guild_id: 'g1', discord_server_id: '555' })

    expect(res.status).toBe(200)
    expect(checkUserManagesDiscordServer).toHaveBeenCalledWith('555')
    expect(updates).toEqual([{ discord_server_id: '555' }])
  })

  it.each([
    ['not_manager', 403, { error: 'You can only link a Discord server where you have the Manage Server permission.' }],
    ['token_expired', 403, { error: 'Discord connection expired. Please log in again to reconnect.', code: 'discord_token_expired' }],
    ['rate_limited', 429, { error: 'Discord rate limit reached. Please wait a moment and try again.' }],
    ['discord_error', 502, { error: "Couldn't check your Discord server permissions. Try again." }],
  ] as const)('returns the %s response and saves nothing', async (reason, status, body) => {
    const { client, updates } = makeLinkClient('111')
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    vi.mocked(checkUserManagesDiscordServer).mockResolvedValue({ ok: false, reason })

    const res = await put({ guild_id: 'g1', name: 'Onslaught', discord_server_id: '555' })

    expect(res.status).toBe(status)
    expect(await res.json()).toEqual(body)
    expect(updates).toEqual([])
  })

  it.each([
    ['111', '111'],
    [' 111 ', '111'],
    ['111', ' 111 '],
  ])('saves the stored server id (%j stored, %j sent) without a Discord check', async (stored, sent) => {
    const { client, updates } = makeLinkClient(stored)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await put({ guild_id: 'g1', name: 'Onslaught', discord_server_id: sent })

    expect(res.status).toBe(200)
    expect(checkUserManagesDiscordServer).not.toHaveBeenCalled()
    expect(updates).toEqual([{ name: 'Onslaught', discord_server_id: '111' }])
  })

  it.each([null, ''])('unlinks with %j without a Discord check', async (sent) => {
    const { client, updates, selects } = makeLinkClient('111')
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await put({ guild_id: 'g1', discord_server_id: sent })

    expect(res.status).toBe(200)
    expect(checkUserManagesDiscordServer).not.toHaveBeenCalled()
    expect(selects).toEqual([])
    expect(updates).toEqual([{ discord_server_id: null }])
  })

  it('does not read the stored link or call Discord when the body has no server id', async () => {
    const { client, updates, selects } = makeLinkClient('111')
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await put({ guild_id: 'g1', name: 'Onslaught' })

    expect(res.status).toBe(200)
    expect(checkUserManagesDiscordServer).not.toHaveBeenCalled()
    expect(selects).toEqual([])
    expect(updates).toEqual([{ name: 'Onslaught' }])
  })

  it('returns 500 and saves nothing when the stored link cannot be read', async () => {
    const { client, updates } = makeLinkClient('111', { lookupError: true })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await put({ guild_id: 'g1', discord_server_id: '555' })

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Failed to update guild information' })
    expect(checkUserManagesDiscordServer).not.toHaveBeenCalled()
    expect(updates).toEqual([])
  })

  it('still refuses a user who is not the guild owner before any Discord check', async () => {
    const { client, updates } = makeLinkClient('111')
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    vi.mocked(isGuildCreator).mockResolvedValue(false as never)
    vi.mocked(verifyGuildMasterPermissions).mockResolvedValue({ hasPermission: false } as never)

    const res = await put({ guild_id: 'g1', discord_server_id: '555' })

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Only the guild owner can modify guild information' })
    expect(checkUserManagesDiscordServer).not.toHaveBeenCalled()
    expect(updates).toEqual([])
  })
})
