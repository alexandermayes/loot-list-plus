// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'
import { randomBytes, createHash } from 'crypto'
import { NextRequest } from 'next/server'
import { GET, POST as consentPost } from '../route'
import { POST as tokenPost } from '../token/route'
import { POST as attendancePost } from '@/app/api/addon/attendance/route'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { COMPANION_REDIRECT_URI, AUTH_CODE_TTL_SECONDS } from '@/lib/addon/companion-auth'
import { hashSyncToken } from '@/lib/addon/sync-tokens'
import { makeFakeAddonDb } from '@/lib/addon/__tests__/fake-addon-db'
import { resolvePostAuthRedirect, isSafeNextPath } from '@/lib/post-auth-redirect'

vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyOfficerPermissions: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackApiError: vi.fn(), trackEvent: vi.fn() }))
vi.mock('@/utils/blp/recompute', () => ({ recomputeBlpForEvents: vi.fn() }))
vi.mock('@/utils/raid-events/team-routing', () => ({
  importAttendanceByTeam: vi.fn(async () => ({ eventIds: ['evt-1'], attendedCount: 0, absentCount: 0 })),
}))
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (fn: () => unknown) => fn(),
}))

const USER_ID = '11111111-1111-1111-1111-111111111111'
const GUILD_A = '22222222-2222-2222-2222-222222222222'
const GUILD_B = '33333333-3333-3333-3333-333333333333'

function makeVerifier() {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

function canonicalParams(overrides: Record<string, string | string[] | undefined> = {}, challenge?: string) {
  const params = new URLSearchParams()
  const base: Record<string, string | undefined> = {
    response_type: 'code',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    redirect_uri: COMPANION_REDIRECT_URI,
  }
  const merged = { ...base, ...overrides }
  for (const [key, value] of Object.entries(merged)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const v of value) params.append(key, v)
    } else {
      params.append(key, value)
    }
  }
  return params
}

function authorizeUrl(params: URLSearchParams) {
  return `http://localhost/api/addon/auth?${params.toString()}`
}

function getRequest(params: URLSearchParams) {
  return new NextRequest(authorizeUrl(params))
}

function consentRequest(params: URLSearchParams, formGuildId: string | string[] | null, originHost = 'localhost') {
  const form = new URLSearchParams()
  if (formGuildId !== null) {
    if (Array.isArray(formGuildId)) {
      for (const g of formGuildId) form.append('guild_id', g)
    } else {
      form.append('guild_id', formGuildId)
    }
  }
  return new NextRequest(authorizeUrl(params), {
    method: 'POST',
    headers: {
      origin: originHost ? `http://${originHost}` : '',
      host: 'localhost',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  })
}

function tokenRequest(body: unknown) {
  return new NextRequest('http://localhost/api/addon/auth/token', {
    method: 'POST',
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

describe('GH #300: PKCE authorize/consent/token exchange', () => {
  let fake: ReturnType<typeof makeFakeAddonDb>

  beforeEach(() => {
    vi.clearAllMocks()
    fake = makeFakeAddonDb({
      guilds: [
        { id: GUILD_A, name: 'Alpha Raiders' },
        { id: GUILD_B, name: 'Beta Raiders' },
      ],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true } as never)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  /** Runs the full good-path login and returns the issued sync token plus the (now-spent) code. */
  async function runGoodPathLogin() {
    const { verifier, challenge } = makeVerifier()
    const params = canonicalParams({}, challenge)

    const authRes = await GET(getRequest(params))
    expect(authRes.status).toBe(303)
    expect(authRes.headers.get('location')).toBe(`http://localhost/companion/authorize?${params.toString()}`)

    const consentRes = await consentPost(consentRequest(params, GUILD_A))
    expect(consentRes.status).toBe(303)
    const location = consentRes.headers.get('location')!
    expect(location.startsWith(`${COMPANION_REDIRECT_URI}?code=`)).toBe(true)
    const code = new URL(location).searchParams.get('code')!

    const tokenRes = await tokenPost(tokenRequest({ code, code_verifier: verifier }))
    const tokenBody = await tokenRes.json()

    return { code, verifier, challenge, params, tokenRes, tokenBody }
  }

  describe('good path', () => {
    it('authorize GET (signed in) 303s to the picker with the canonical query', async () => {
      const { challenge } = makeVerifier()
      const params = canonicalParams({}, challenge)
      const res = await GET(getRequest(params))
      expect(res.status).toBe(303)
      expect(res.headers.get('location')).toBe(`http://localhost/companion/authorize?${params.toString()}`)
    })

    it('consent POST 303s to the companion with a code; token exchange returns exactly {token, guild_id, guild_name, expires_at} with Cache-Control no-store', async () => {
      const { tokenRes, tokenBody } = await runGoodPathLogin()

      expect(tokenRes.status).toBe(200)
      expect(tokenRes.headers.get('cache-control')).toBe('no-store')
      expect(Object.keys(tokenBody).sort()).toEqual(['expires_at', 'guild_id', 'guild_name', 'token'])
      expect(tokenBody.guild_id).toBe(GUILD_A)
      expect(tokenBody.guild_name).toBe('Alpha Raiders')
      expect(typeof tokenBody.token).toBe('string')
    })

    it('the stored code row holds sha256(code), never the code, and expires 60s after issue', async () => {
      const { verifier, challenge } = makeVerifier()
      const params = canonicalParams({}, challenge)
      const before = Date.now()

      const consentRes = await consentPost(consentRequest(params, GUILD_A))
      const code = new URL(consentRes.headers.get('location')!).searchParams.get('code')!

      const row = fake.tables.addon_auth_codes[0]
      expect(row).toBeDefined()
      expect(row.code_hash).toBe(createHash('sha256').update(code).digest('hex'))
      expect(row.code_hash).not.toBe(code)
      const expiresMs = new Date(row.expires_at).getTime()
      expect(expiresMs - before).toBeGreaterThanOrEqual((AUTH_CODE_TTL_SECONDS - 1) * 1000)
      expect(expiresMs - before).toBeLessThanOrEqual((AUTH_CODE_TTL_SECONDS + 2) * 1000)

      // consume so the row cleans up and doesn't leak into other assertions
      await tokenPost(tokenRequest({ code, code_verifier: verifier }))
    })

    it('the stored sync token hash equals sha256(token)', async () => {
      const { tokenBody } = await runGoodPathLogin()
      const row = fake.tables.addon_sync_tokens.find((r) => r.guild_id === GUILD_A && r.user_id === USER_ID)
      expect(row?.token_hash).toBe(hashSyncToken(tokenBody.token))
    })
  })

  describe('a failed exchange burns the code (OD-03)', () => {
    it('wrong verifier: 400 invalid_grant, and the same code then fails again', async () => {
      const { challenge } = makeVerifier()
      const { verifier: wrongVerifier } = makeVerifier()
      const params = canonicalParams({}, challenge)

      const consentRes = await consentPost(consentRequest(params, GUILD_A))
      const code = new URL(consentRes.headers.get('location')!).searchParams.get('code')!

      const first = await tokenPost(tokenRequest({ code, code_verifier: wrongVerifier }))
      expect(first.status).toBe(400)
      expect(await first.json()).toEqual({ error: 'invalid_grant' })

      const second = await tokenPost(tokenRequest({ code, code_verifier: wrongVerifier }))
      expect(second.status).toBe(400)
      expect(await second.json()).toEqual({ error: 'invalid_grant' })
    })

    it('expired: a code exchanged more than 60s after issue is invalid_grant', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      try {
        const { verifier, challenge } = makeVerifier()
        const params = canonicalParams({}, challenge)

        const consentRes = await consentPost(consentRequest(params, GUILD_A))
        const code = new URL(consentRes.headers.get('location')!).searchParams.get('code')!

        vi.advanceTimersByTime((AUTH_CODE_TTL_SECONDS + 1) * 1000)

        const res = await tokenPost(tokenRequest({ code, code_verifier: verifier }))
        expect(res.status).toBe(400)
        expect(await res.json()).toEqual({ error: 'invalid_grant' })
      } finally {
        vi.useRealTimers()
      }
    })

    it('reused code: the second exchange of an already-consumed code is invalid_grant', async () => {
      const { code, verifier } = await runGoodPathLogin()
      const res = await tokenPost(tokenRequest({ code, code_verifier: verifier }))
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'invalid_grant' })
    })

    it('wrong redirect_uri at exchange time is invalid_grant', async () => {
      const { challenge, verifier } = makeVerifier()
      const params = canonicalParams({}, challenge)
      const consentRes = await consentPost(consentRequest(params, GUILD_A))
      const code = new URL(consentRes.headers.get('location')!).searchParams.get('code')!

      const res = await tokenPost(
        tokenRequest({ code, code_verifier: verifier, redirect_uri: 'https://evil.example/cb' })
      )
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'invalid_grant' })
    })
  })

  describe('wrong redirect_uri at authorize/consent time (OD-02)', () => {
    it.each(['lootlistplus://auth/callback/', 'https://evil.example/cb'])(
      'authorize GET with redirect_uri=%s gets 400 with no Location',
      async (redirectUri) => {
        const { challenge } = makeVerifier()
        const params = canonicalParams({ redirect_uri: redirectUri }, challenge)
        const res = await GET(getRequest(params))
        expect(res.status).toBe(400)
        expect(res.headers.get('location')).toBeNull()
        expect(await res.json()).toEqual({ error: 'invalid_request', error_description: 'redirect_uri is not allowed' })
      }
    )

    it.each(['lootlistplus://auth/callback/', 'https://evil.example/cb'])(
      'consent POST with redirect_uri=%s gets 400 with no Location and inserts no row',
      async (redirectUri) => {
        const { challenge } = makeVerifier()
        const params = canonicalParams({ redirect_uri: redirectUri }, challenge)
        const res = await consentPost(consentRequest(params, GUILD_A))
        expect(res.status).toBe(400)
        expect(res.headers.get('location')).toBeNull()
        expect(fake.tables.addon_auth_codes).toHaveLength(0)
      }
    )
  })

  describe('plain PKCE method is rejected (T-300-08)', () => {
    it('authorize GET with code_challenge_method=plain 303s to error=invalid_request', async () => {
      const { challenge } = makeVerifier()
      const params = canonicalParams({ code_challenge_method: 'plain' }, challenge)
      const res = await GET(getRequest(params))
      expect(res.status).toBe(303)
      expect(res.headers.get('location')).toBe(`${COMPANION_REDIRECT_URI}?error=invalid_request`)
    })

    it('authorize GET with a missing code_challenge_method 303s to error=invalid_request', async () => {
      const { challenge } = makeVerifier()
      const params = canonicalParams({ code_challenge_method: undefined }, challenge)
      const res = await GET(getRequest(params))
      expect(res.status).toBe(303)
      expect(res.headers.get('location')).toBe(`${COMPANION_REDIRECT_URI}?error=invalid_request`)
    })

    it('consent POST with code_challenge_method=plain 303s to error=invalid_request and inserts no row', async () => {
      const { challenge } = makeVerifier()
      const params = canonicalParams({ code_challenge_method: 'plain' }, challenge)
      const res = await consentPost(consentRequest(params, GUILD_A))
      expect(res.status).toBe(303)
      expect(res.headers.get('location')).toBe(`${COMPANION_REDIRECT_URI}?error=invalid_request`)
      expect(fake.tables.addon_auth_codes).toHaveLength(0)
    })

    it('a token request whose verifier equals the stored S256 challenge itself (what a plain client sends) is invalid_grant', async () => {
      const { challenge } = makeVerifier()
      const params = canonicalParams({}, challenge)
      const consentRes = await consentPost(consentRequest(params, GUILD_A))
      const code = new URL(consentRes.headers.get('location')!).searchParams.get('code')!

      // A plain-method client would send the challenge itself as the verifier.
      const res = await tokenPost(tokenRequest({ code, code_verifier: challenge.padEnd(43, 'a').slice(0, 43) }))
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'invalid_grant' })
    })
  })

  describe('malformed input', () => {
    it('authorize GET with a missing code_challenge is invalid_request (303 with error)', async () => {
      const params = canonicalParams({ code_challenge: undefined })
      const res = await GET(getRequest(params))
      expect(res.status).toBe(303)
      expect(res.headers.get('location')).toBe(`${COMPANION_REDIRECT_URI}?error=invalid_request`)
    })

    it.each(['too-short', 'x'.repeat(200), 'not_a_verifier_at_all_because_of_$ymbols!!'])(
      'token exchange with an invalid code_verifier %s gets 400 invalid_request with no row deleted',
      async (verifier) => {
        const { challenge } = makeVerifier()
        const params = canonicalParams({}, challenge)
        const consentRes = await consentPost(consentRequest(params, GUILD_A))
        const code = new URL(consentRes.headers.get('location')!).searchParams.get('code')!

        const res = await tokenPost(tokenRequest({ code, code_verifier: verifier }))
        expect(res.status).toBe(400)
        expect(await res.json()).toEqual({ error: 'invalid_request' })
        expect(fake.tables.addon_auth_codes).toHaveLength(1)
      }
    )

    it('token exchange with a missing code gets 400 invalid_request', async () => {
      const { verifier } = makeVerifier()
      const res = await tokenPost(tokenRequest({ code_verifier: verifier }))
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'invalid_request' })
    })

    it('a repeated redirect_uri is rejected as invalid_redirect_uri (400, no Location)', async () => {
      const { challenge } = makeVerifier()
      const params = canonicalParams({}, challenge)
      params.append('redirect_uri', COMPANION_REDIRECT_URI)
      const res = await GET(getRequest(params))
      expect(res.status).toBe(400)
      expect(res.headers.get('location')).toBeNull()
    })

    it('a repeated code_challenge is rejected as invalid_request (303 with error)', async () => {
      const { challenge } = makeVerifier()
      const params = canonicalParams({}, challenge)
      params.append('code_challenge', challenge)
      const res = await GET(getRequest(params))
      expect(res.status).toBe(303)
      expect(res.headers.get('location')).toBe(`${COMPANION_REDIRECT_URI}?error=invalid_request`)
    })
  })

  describe('sign-in round trip (T-300-09)', () => {
    it('a signed-out GET 303s to / with next equal to the canonical authorize path, and the round trip never contains code=', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: null, error: new Error('no session') } as never)
      const { challenge } = makeVerifier()
      const params = canonicalParams({}, challenge)

      const res = await GET(getRequest(params))
      expect(res.status).toBe(303)
      const location = res.headers.get('location')!
      const expectedNext = `/api/addon/auth?${params.toString()}`
      expect(location).toBe(`http://localhost/?next=${encodeURIComponent(expectedNext)}`)
      expect(expectedNext).not.toContain('code=')

      expect(isSafeNextPath(expectedNext)).toBe(true)
      expect(resolvePostAuthRedirect({ next: expectedNext, hasMemberships: true })).toBe(expectedNext)
    })
  })

  describe('consent guards', () => {
    it('a cross-site Origin gets 403 and inserts no row', async () => {
      const { challenge } = makeVerifier()
      const params = canonicalParams({}, challenge)
      const req = new NextRequest(authorizeUrl(params), {
        method: 'POST',
        headers: { origin: 'https://evil.example', host: 'localhost' },
        body: new URLSearchParams({ guild_id: GUILD_A }).toString(),
      })
      const res = await consentPost(req)
      expect(res.status).toBe(403)
      expect(fake.tables.addon_auth_codes).toHaveLength(0)
    })

    it('a missing Origin header gets 403 and inserts no row', async () => {
      const { challenge } = makeVerifier()
      const params = canonicalParams({}, challenge)
      const req = new NextRequest(authorizeUrl(params), {
        method: 'POST',
        headers: { host: 'localhost' },
        body: new URLSearchParams({ guild_id: GUILD_A }).toString(),
      })
      const res = await consentPost(req)
      expect(res.status).toBe(403)
      expect(fake.tables.addon_auth_codes).toHaveLength(0)
    })

    it('no session gets 401 and inserts no row', async () => {
      vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: null, error: new Error('no session') } as never)
      const { challenge } = makeVerifier()
      const params = canonicalParams({}, challenge)
      const res = await consentPost(consentRequest(params, GUILD_A))
      expect(res.status).toBe(401)
      expect(fake.tables.addon_auth_codes).toHaveLength(0)
    })

    it('not an officer gets 403 and inserts no row', async () => {
      vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: false } as never)
      const { challenge } = makeVerifier()
      const params = canonicalParams({}, challenge)
      const res = await consentPost(consentRequest(params, GUILD_A))
      expect(res.status).toBe(403)
      expect(fake.tables.addon_auth_codes).toHaveLength(0)
    })

    it('a malformed guild_id gets 400 and inserts no row', async () => {
      const { challenge } = makeVerifier()
      const params = canonicalParams({}, challenge)
      const res = await consentPost(consentRequest(params, 'not-a-uuid'))
      expect(res.status).toBe(400)
      expect(fake.tables.addon_auth_codes).toHaveLength(0)
    })
  })

  describe('token grants (OD-04)', () => {
    it('officer rights revoked between consent and exchange gives 400 invalid_grant and no token row', async () => {
      const { verifier, challenge } = makeVerifier()
      const params = canonicalParams({}, challenge)
      const consentRes = await consentPost(consentRequest(params, GUILD_A))
      const code = new URL(consentRes.headers.get('location')!).searchParams.get('code')!

      // Demoted after consent, before the exchange — the correct verifier is
      // used so a failure can only be attributed to the officer re-check.
      vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: false } as never)

      const res = await tokenPost(tokenRequest({ code, code_verifier: verifier }))
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({ error: 'invalid_grant' })
      expect(fake.tables.addon_sync_tokens).toHaveLength(0)
    })

    it('a second login for the same user and guild replaces the earlier token hash', async () => {
      const first = await runGoodPathLogin()
      const second = await runGoodPathLogin()

      const rows = fake.tables.addon_sync_tokens.filter((r) => r.guild_id === GUILD_A && r.user_id === USER_ID)
      expect(rows).toHaveLength(1)
      expect(rows[0].token_hash).toBe(hashSyncToken(second.tokenBody.token))
      expect(rows[0].token_hash).not.toBe(hashSyncToken(first.tokenBody.token))
    })
  })

  describe('e2e: the issued token works as a Bearer credential on the attendance route (D-02)', () => {
    it('the same guild_id passes the gate', async () => {
      const { tokenBody } = await runGoodPathLogin()
      vi.mocked(verifyOfficerPermissions).mockClear()
      vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true } as never)

      const res = await attendancePost(
        attendanceRequest(
          { guild_id: GUILD_A, raid_date: '2026-09-20', raid_name: 'MC', attended: [] },
          { authorization: `Bearer ${tokenBody.token}` }
        )
      )

      expect(res.status).not.toBe(401)
      expect(res.status).not.toBe(403)
      expect(verifyOfficerPermissions).toHaveBeenCalledWith(fake.client, USER_ID, GUILD_A)
    })

    it('a different guild_id gets 403 (A-03) and verifyOfficerPermissions is never called', async () => {
      const { tokenBody } = await runGoodPathLogin()
      vi.mocked(verifyOfficerPermissions).mockClear()

      const res = await attendancePost(
        attendanceRequest(
          { guild_id: GUILD_B, raid_date: '2026-09-20', raid_name: 'MC', attended: [] },
          { authorization: `Bearer ${tokenBody.token}` }
        )
      )

      expect(res.status).toBe(403)
      expect(await res.json()).toEqual({ error: 'This sync token is for a different guild' })
      expect(verifyOfficerPermissions).not.toHaveBeenCalled()
    })
  })

  describe('drift: the companion and the migration must never disagree with the server constants', () => {
    const repoRoot = path.resolve(__dirname, '../../../../..')

    it('COMPANION_REDIRECT_URI matches the literal in companion/src/main/auth.ts', () => {
      const authTs = readFileSync(path.join(repoRoot, 'companion/src/main/auth.ts'), 'utf8')
      expect(authTs).toContain(`redirect_uri: '${COMPANION_REDIRECT_URI}'`)
      expect(authTs).toContain("code_challenge_method: 'S256'")
      expect(authTs).toContain('code_verifier: verifier')
    })

    it('COMPANION_REDIRECT_URI matches the migration CHECK literal', () => {
      const migration = readFileSync(
        path.join(repoRoot, 'supabase/migrations/20260928180000_create_addon_auth_codes.sql'),
        'utf8'
      )
      expect(migration).toContain(`"redirect_uri" = '${COMPANION_REDIRECT_URI}'`)
    })

    it('AUTH_CODE_TTL_SECONDS matches the migration default interval', () => {
      const migration = readFileSync(
        path.join(repoRoot, 'supabase/migrations/20260928180000_create_addon_auth_codes.sql'),
        'utf8'
      )
      expect(migration).toContain(`interval '${AUTH_CODE_TTL_SECONDS} seconds'`)
    })
  })
})
