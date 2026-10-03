// @vitest-environment node
// Quick task 261002-l8o: a Discord server can be linked to a guild only by
// someone who owns or manages it (the same rule as the server picker).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  canManageDiscordServer,
  checkUserManagesDiscordServer,
  discordServerAccessError,
} from '../discord-server-access'
import { createClient } from '@/utils/supabase/server'

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }))

const getSession = vi.fn()
const refreshSession = vi.fn()

function sessionWithToken(token: string | null) {
  return { data: { session: token === null ? null : { provider_token: token } }, error: null }
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('canManageDiscordServer', () => {
  it('is true for the server owner', () => {
    expect(canManageDiscordServer({ owner: true, permissions: '0' })).toBe(true)
  })

  it('is true with Administrator (0x8)', () => {
    expect(canManageDiscordServer({ owner: false, permissions: '8' })).toBe(true)
  })

  it('is true with Manage Server (0x20)', () => {
    expect(canManageDiscordServer({ owner: false, permissions: '32' })).toBe(true)
  })

  it('is true for a large permissions string with the 0x20 bit set', () => {
    // 2^50 + 0x20, past the 32-bit range that Number bitwise operators cover
    expect(canManageDiscordServer({ owner: false, permissions: '1125899906842656' })).toBe(true)
  })

  it('is false without owner, Administrator or Manage Server', () => {
    expect(canManageDiscordServer({ owner: false, permissions: '0' })).toBe(false)
    expect(canManageDiscordServer({ owner: false, permissions: '2048' })).toBe(false)
  })

  it('is false when the permissions string cannot be parsed', () => {
    expect(canManageDiscordServer({ owner: false, permissions: 'not-a-number' })).toBe(false)
  })
})

describe('checkUserManagesDiscordServer', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    getSession.mockReset()
    refreshSession.mockReset()
    fetchMock.mockReset()
    vi.mocked(createClient).mockReset()
    vi.mocked(createClient).mockResolvedValue({ auth: { getSession, refreshSession } } as never)
    getSession.mockResolvedValue(sessionWithToken('user-token'))
    refreshSession.mockResolvedValue(sessionWithToken(null))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is ok when the list has the server with Manage Server', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [
      { id: '111', owner: false, permissions: '0' },
      { id: '222', owner: false, permissions: '32' },
    ]))

    expect(await checkUserManagesDiscordServer('222')).toEqual({ ok: true })
  })

  it('is not_manager when the server is not in the list', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [{ id: '111', owner: true, permissions: '8' }]))

    expect(await checkUserManagesDiscordServer('222')).toEqual({ ok: false, reason: 'not_manager' })
  })

  it('is not_manager when the server is listed without owner, Administrator or Manage Server', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [{ id: '222', owner: false, permissions: '2048' }]))

    expect(await checkUserManagesDiscordServer('222')).toEqual({ ok: false, reason: 'not_manager' })
  })

  it('is not_manager without calling Discord when the id has a non-digit', async () => {
    expect(await checkUserManagesDiscordServer('12a4')).toEqual({ ok: false, reason: 'not_manager' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(createClient).not.toHaveBeenCalled()
  })

  it('is token_expired without calling Discord when neither session has a Discord token', async () => {
    getSession.mockResolvedValue(sessionWithToken(null))
    refreshSession.mockResolvedValue(sessionWithToken(null))

    expect(await checkUserManagesDiscordServer('222')).toEqual({ ok: false, reason: 'token_expired' })
    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('is token_expired without calling Discord when the refresh fails', async () => {
    getSession.mockResolvedValue(sessionWithToken(null))
    refreshSession.mockResolvedValue({ data: { session: null }, error: { message: 'refresh failed' } })

    expect(await checkUserManagesDiscordServer('222')).toEqual({ ok: false, reason: 'token_expired' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uses the refreshed token when only the refreshed session has one', async () => {
    getSession.mockResolvedValue(sessionWithToken(null))
    refreshSession.mockResolvedValue(sessionWithToken('refreshed-token'))
    fetchMock.mockResolvedValue(jsonResponse(200, [{ id: '222', owner: true, permissions: '0' }]))

    expect(await checkUserManagesDiscordServer('222')).toEqual({ ok: true })
    expect(fetchMock.mock.calls[0][1]).toEqual({ headers: { Authorization: 'Bearer refreshed-token' } })
  })

  it('does not refresh when the session already has a token', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, [{ id: '222', owner: true, permissions: '0' }]))

    await checkUserManagesDiscordServer('222')

    expect(refreshSession).not.toHaveBeenCalled()
  })

  it('is token_expired when Discord answers 401', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { message: '401: Unauthorized' }))

    expect(await checkUserManagesDiscordServer('222')).toEqual({ ok: false, reason: 'token_expired' })
  })

  it('is token_expired when Discord answers 403', async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, { message: 'Missing Access' }))

    expect(await checkUserManagesDiscordServer('222')).toEqual({ ok: false, reason: 'token_expired' })
  })

  it('is rate_limited when Discord answers 429', async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, { retry_after: 1 }))

    expect(await checkUserManagesDiscordServer('222')).toEqual({ ok: false, reason: 'rate_limited' })
  })

  it('is discord_error when Discord answers 500', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { message: 'error' }))

    expect(await checkUserManagesDiscordServer('222')).toEqual({ ok: false, reason: 'discord_error' })
  })

  it('is discord_error when the request throws', async () => {
    fetchMock.mockRejectedValue(new Error('network down'))

    expect(await checkUserManagesDiscordServer('222')).toEqual({ ok: false, reason: 'discord_error' })
  })

  it('is discord_error when the body is not an array', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { guilds: [] }))

    expect(await checkUserManagesDiscordServer('222')).toEqual({ ok: false, reason: 'discord_error' })
  })

  it('asks the v10 users/@me/guilds endpoint with the Bearer token', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []))

    await checkUserManagesDiscordServer('222')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('https://discord.com/api/v10/users/@me/guilds')
    expect(fetchMock.mock.calls[0][1]).toEqual({ headers: { Authorization: 'Bearer user-token' } })
  })
})

describe('discordServerAccessError', () => {
  it('maps not_manager to 403 with the link text', () => {
    expect(discordServerAccessError('not_manager')).toEqual({
      status: 403,
      body: { error: 'You can only link a Discord server where you have the Manage Server permission.' },
    })
  })

  it('maps token_expired to 403 with the reconnect text and code', () => {
    expect(discordServerAccessError('token_expired')).toEqual({
      status: 403,
      body: {
        error: 'Discord connection expired. Please log in again to reconnect.',
        code: 'discord_token_expired',
      },
    })
  })

  it('maps rate_limited to 429 with the rate limit text', () => {
    expect(discordServerAccessError('rate_limited')).toEqual({
      status: 429,
      body: { error: 'Discord rate limit reached. Please wait a moment and try again.' },
    })
  })

  it('maps discord_error to 502 with the retry text', () => {
    expect(discordServerAccessError('discord_error')).toEqual({
      status: 502,
      body: { error: "Couldn't check your Discord server permissions. Try again." },
    })
  })
})
