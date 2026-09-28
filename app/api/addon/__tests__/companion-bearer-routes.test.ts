// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as guildDataGet } from '../guild-data/route'
import { GET as exportStringGet } from '../export-string/route'
import { POST as lootAwardPost } from '../loot-award/route'
import { POST as attendancePost } from '../attendance/route'
import { POST as syncTokenPost } from '../sync-token/route'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { issueSyncToken } from '@/lib/addon/sync-tokens'
import { makeFakeAddonDb } from '@/lib/addon/__tests__/fake-addon-db'

vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyOfficerPermissions: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), trackApiError: vi.fn() }))
vi.mock('@/utils/analytics/funnel', () => ({ evaluateGuildFunnel: vi.fn() }))
vi.mock('@/lib/discord-loot-announcements', () => ({ notifyLootAward: vi.fn() }))
vi.mock('@/lib/loot/guild-scoped-lookup', () => ({ resolveGuildLootItem: vi.fn() }))
vi.mock('@/utils/blp/recompute', () => ({ recomputeBlpForEvents: vi.fn() }))
vi.mock('@/utils/raid-events/team-routing', () => ({
  importAttendanceByTeam: vi.fn(async () => ({ eventIds: ['evt-1'], attendedCount: 0, absentCount: 0 })),
}))
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (fn: () => unknown) => fn(),
}))

const GUILD_A = 'guild-a'
const GUILD_B = 'guild-b'
const TOKEN_USER_ID = 'token-user'

function guildDataRequest(guildId: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost/api/addon/guild-data?guild_id=${guildId}`, { headers })
}

function exportStringRequest(guildId: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost/api/addon/export-string?guild_id=${guildId}`, { headers })
}

function lootAwardRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/addon/loot-award', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function attendanceRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/addon/attendance', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

describe('GH #300: all four addon routes share the Bearer-or-cookie guild gate', () => {
  let fake: ReturnType<typeof makeFakeAddonDb>

  beforeEach(() => {
    vi.clearAllMocks()
    fake = makeFakeAddonDb()
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)
  })

  async function mintToken(guildId: string, userId = TOKEN_USER_ID, expiresDays = 30) {
    const result = await issueSyncToken(fake.client, { userId, guildId, expiresDays })
    if (!result.ok) throw new Error('failed to mint token in test setup')
    return result.token
  }

  const routes: Array<{
    name: string
    call: (headers: Record<string, string>, guildId: string) => Promise<Response>
  }> = [
    {
      name: 'GET guild-data',
      call: (headers, guildId) => guildDataGet(guildDataRequest(guildId, headers)),
    },
    {
      name: 'GET export-string',
      call: (headers, guildId) => exportStringGet(exportStringRequest(guildId, headers)),
    },
    {
      name: 'POST loot-award',
      call: (headers, guildId) =>
        lootAwardPost(
          lootAwardRequest({ guild_id: guildId, wowhead_id: 123, character_name: 'Thrall' }, headers)
        ),
    },
    {
      name: 'POST attendance',
      call: (headers, guildId) =>
        attendancePost(
          attendanceRequest({ guild_id: guildId, raid_date: '2026-09-20', raid_name: 'MC', attended: [] }, headers)
        ),
    },
  ]

  for (const route of routes) {
    describe(route.name, () => {
      it('a Bearer token for guild A used with guild_id B gives 403 A-03 without an officer call', async () => {
        const token = await mintToken(GUILD_A)
        vi.mocked(verifyOfficerPermissions).mockClear()

        const res = await route.call({ authorization: `Bearer ${token}` }, GUILD_B)
        expect(res.status).toBe(403)
        expect(await res.json()).toEqual({ error: 'This sync token is for a different guild' })
        expect(verifyOfficerPermissions).not.toHaveBeenCalled()
      })

      it('a Bearer token for guild A on guild A, with the officer check failing, gives 403 Officer permissions required', async () => {
        const token = await mintToken(GUILD_A)
        vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: false } as never)

        const res = await route.call({ authorization: `Bearer ${token}` }, GUILD_A)
        expect(res.status).toBe(403)
        expect(await res.json()).toEqual({ error: 'Officer permissions required' })
        expect(verifyOfficerPermissions).toHaveBeenCalledWith(fake.client, TOKEN_USER_ID, GUILD_A)
      })

      it('no header and no cookie session gives 401', async () => {
        vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: null, error: new Error('no session') } as never)
        const res = await route.call({}, GUILD_A)
        expect(res.status).toBe(401)
      })

      it('an expired token gives 401 A-02', async () => {
        const token = await mintToken(GUILD_A, TOKEN_USER_ID, -1)
        const res = await route.call({ authorization: `Bearer ${token}` }, GUILD_A)
        expect(res.status).toBe(401)
        expect(await res.json()).toEqual({
          error: 'Sync token expired. Log in again from the companion app.',
        })
      })

      it("'Basic abc' gives 401 A-01 without calling getAuthenticatedUser", async () => {
        const res = await route.call({ authorization: 'Basic abc' }, GUILD_A)
        expect(res.status).toBe(401)
        expect(await res.json()).toEqual({ error: 'Invalid sync token' })
        expect(getAuthenticatedUser).not.toHaveBeenCalled()
      })
    })
  }
})

describe('GH #300: loot-award records a repudiation trail against the Bearer token holder', () => {
  let fake: ReturnType<typeof makeFakeAddonDb>

  beforeEach(async () => {
    vi.clearAllMocks()
    fake = makeFakeAddonDb()
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true } as never)

    const { resolveGuildLootItem } = await import('@/lib/loot/guild-scoped-lookup')
    vi.mocked(resolveGuildLootItem).mockResolvedValue({
      id: 'item-1',
      name: 'Test Item',
      raid_tier_id: 'tier-1',
      expansion_id: 'exp-1',
      wowhead_id: 123,
    } as never)
  })

  it('the recorded loot_history insert payload carries awarded_by equal to the Bearer token holder', async () => {
    const token = (await issueSyncToken(fake.client, { userId: TOKEN_USER_ID, guildId: GUILD_A })) as {
      ok: true
      token: string
    }

    const res = await lootAwardPost(
      lootAwardRequest(
        { guild_id: GUILD_A, wowhead_id: 123, character_name: 'Thrall' },
        { authorization: `Bearer ${token.token}` }
      )
    )
    expect(res.status).toBe(200)

    const insertCall = fake.calls.find((c) => c.table === 'loot_history' && c.insertPayload)
    expect(insertCall?.insertPayload).toBeDefined()
    const payload = insertCall!.insertPayload as { awarded_by: string }
    expect(payload.awarded_by).toBe(TOKEN_USER_ID)
  })
})

describe('GH #300: POST /api/addon/sync-token is unchanged behaviourally after reusing issueSyncToken', () => {
  let fake: ReturnType<typeof makeFakeAddonDb>

  beforeEach(() => {
    vi.clearAllMocks()
    fake = makeFakeAddonDb()
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: TOKEN_USER_ID }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true } as never)
  })

  function syncTokenRequest(body: unknown) {
    return new NextRequest('http://localhost/api/addon/sync-token', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  it('returns { data: { token, expires_at, guild_id } } and upserts on guild_id,user_id', async () => {
    const res = await syncTokenPost(syncTokenRequest({ guild_id: GUILD_A }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Object.keys(body.data).sort()).toEqual(['expires_at', 'guild_id', 'token'])
    expect(body.data.guild_id).toBe(GUILD_A)

    const upsertCall = fake.calls.find((c) => c.table === 'addon_sync_tokens' && c.upsertPayload)
    expect(upsertCall).toBeDefined()
  })

  it('returns 500 "Failed to create token" on an upsert error', async () => {
    fake.setErrorOn('addon_sync_tokens')
    const res = await syncTokenPost(syncTokenRequest({ guild_id: GUILD_A }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Failed to create token' })
  })
})
