// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals authenticateAddonRequest relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import {
  authenticateAddonRequest,
  authorizeAddonGuild,
  issueSyncToken,
  hashSyncToken,
  SYNC_TOKEN_DEFAULT_DAYS,
} from '../sync-tokens'
import { makeFakeAddonDb } from './fake-addon-db'

vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyOfficerPermissions: vi.fn() }))

const USER_ID = 'user-1'
const GUILD_A = 'guild-a'
const GUILD_B = 'guild-b'

function request(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/addon/attendance', { headers })
}

describe('GH #300: SYNC_TOKEN_DEFAULT_DAYS', () => {
  it('is 30 (the value C-05 quotes)', () => {
    expect(SYNC_TOKEN_DEFAULT_DAYS).toBe(30)
  })
})

describe('GH #300: authenticateAddonRequest', () => {
  let fake: ReturnType<typeof makeFakeAddonDb>

  beforeEach(() => {
    vi.clearAllMocks()
    fake = makeFakeAddonDb()
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)
  })

  async function mintToken(guildId: string, userId: string, expiresInDays = SYNC_TOKEN_DEFAULT_DAYS) {
    const result = await issueSyncToken(fake.client, { userId, guildId, expiresDays: expiresInDays })
    if (!result.ok) throw new Error('failed to mint token in test setup')
    return result.token
  }

  it('a valid token for guild A authenticates on guild A', async () => {
    const token = await mintToken(GUILD_A, USER_ID)
    const auth = await authenticateAddonRequest(request({ authorization: `Bearer ${token}` }))
    expect(auth.ok).toBe(true)
    if (auth.ok) {
      expect(auth.principal).toEqual({ kind: 'sync_token', userId: USER_ID, guildId: GUILD_A })
    }
  })

  it('an expired token gives 401 A-02', async () => {
    const token = await mintToken(GUILD_A, USER_ID, -1)
    const auth = await authenticateAddonRequest(request({ authorization: `Bearer ${token}` }))
    expect(auth.ok).toBe(false)
    if (!auth.ok) {
      expect(auth.response.status).toBe(401)
      expect(await auth.response.json()).toEqual({
        error: 'Sync token expired. Log in again from the companion app.',
      })
    }
  })

  it('a token for guild A used on guild B is rejected without an officer call, once paired with authorizeAddonGuild', async () => {
    const token = await mintToken(GUILD_A, USER_ID)
    const auth = await authenticateAddonRequest(request({ authorization: `Bearer ${token}` }))
    expect(auth.ok).toBe(true)
    if (!auth.ok) return

    vi.mocked(verifyOfficerPermissions).mockClear()
    const access = await authorizeAddonGuild(fake.client, auth.principal, GUILD_B)
    expect(access.ok).toBe(false)
    if (!access.ok) {
      expect(access.response.status).toBe(403)
      expect(await access.response.json()).toEqual({ error: 'This sync token is for a different guild' })
    }
    expect(verifyOfficerPermissions).not.toHaveBeenCalled()
  })

  it('replacing a token invalidates the old one and authenticates the new one', async () => {
    const oldToken = await mintToken(GUILD_A, USER_ID)
    const newToken = await mintToken(GUILD_A, USER_ID)

    const oldAuth = await authenticateAddonRequest(request({ authorization: `Bearer ${oldToken}` }))
    expect(oldAuth.ok).toBe(false)
    if (!oldAuth.ok) {
      expect(oldAuth.response.status).toBe(401)
      expect(await oldAuth.response.json()).toEqual({ error: 'Invalid sync token' })
    }

    const newAuth = await authenticateAddonRequest(request({ authorization: `Bearer ${newToken}` }))
    expect(newAuth.ok).toBe(true)
  })

  it('a missing header and no cookie session gives 401 Unauthorized', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: null, error: new Error('no session') } as never)
    const auth = await authenticateAddonRequest(request())
    expect(auth.ok).toBe(false)
    if (!auth.ok) {
      expect(auth.response.status).toBe(401)
      expect(await auth.response.json()).toEqual({ error: 'Unauthorized' })
    }
  })

  it('no header with a cookie session authenticates as session, and the officer check runs with the cookie user', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true } as never)

    const auth = await authenticateAddonRequest(request())
    expect(auth.ok).toBe(true)
    if (!auth.ok) return
    expect(auth.principal).toEqual({ kind: 'session', userId: USER_ID })

    const access = await authorizeAddonGuild(fake.client, auth.principal, GUILD_A)
    expect(access.ok).toBe(true)
    expect(verifyOfficerPermissions).toHaveBeenCalledWith(fake.client, USER_ID, GUILD_A)
  })

  it.each(['Basic abc', 'Bearer', 'Bearer nothex'])(
    'a malformed header (%s) gives 401 A-01 without calling getAuthenticatedUser',
    async (header) => {
      const auth = await authenticateAddonRequest(request({ authorization: header }))
      expect(auth.ok).toBe(false)
      if (!auth.ok) {
        expect(auth.response.status).toBe(401)
        expect(await auth.response.json()).toEqual({ error: 'Invalid sync token' })
      }
      expect(getAuthenticatedUser).not.toHaveBeenCalled()
    }
  )

  it('a header present with a valid cookie session still uses the token path', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'someone-else' }, error: null } as never)
    const token = await mintToken(GUILD_A, USER_ID)

    const auth = await authenticateAddonRequest(request({ authorization: `Bearer ${token}` }))
    expect(auth.ok).toBe(true)
    if (auth.ok) {
      expect(auth.principal).toEqual({ kind: 'sync_token', userId: USER_ID, guildId: GUILD_A })
    }
    expect(getAuthenticatedUser).not.toHaveBeenCalled()
  })

  it('a valid token whose officer check fails gives 403 Officer permissions required', async () => {
    const token = await mintToken(GUILD_A, USER_ID)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: false } as never)

    const auth = await authenticateAddonRequest(request({ authorization: `Bearer ${token}` }))
    expect(auth.ok).toBe(true)
    if (!auth.ok) return

    const access = await authorizeAddonGuild(fake.client, auth.principal, GUILD_A)
    expect(access.ok).toBe(false)
    if (!access.ok) {
      expect(access.response.status).toBe(403)
      expect(await access.response.json()).toEqual({ error: 'Officer permissions required' })
    }
  })

  it('the lookup queries token_hash by sha256(token), never the raw token', async () => {
    const token = await mintToken(GUILD_A, USER_ID)
    const row = fake.tables.addon_sync_tokens[0]
    expect(row.token_hash).toBe(hashSyncToken(token))
    expect(row.token_hash).not.toBe(token)
  })
})
