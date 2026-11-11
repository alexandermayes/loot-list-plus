// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server's middleware relies on.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { isSafeNextPath } from '@/lib/post-auth-redirect'

// D-24 amended: the Set your 5 link (/loot-list?guild=<uuid>&picker=1) must
// survive sign-in. A request with no auth cookies is signed out through
// refreshSupabaseSession's own cookie check, which returns before any network
// call, so the real proxy runs here with nothing mocked.
describe('proxy.ts: the sign-in redirect keeps the query string in next (D-24)', () => {
  const GUILD = '11111111-1111-4111-8111-111111111111'

  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    vi.resetModules()
  })

  async function signedOutRedirect(pathAndQuery: string) {
    const { proxy } = await import('@/proxy')
    const res = await proxy(new NextRequest(`http://localhost${pathAndQuery}`))
    const location = res.headers.get('location')
    expect(location).not.toBeNull()
    return new URL(location!)
  }

  it('sends a signed-out /loot-list picker link to the sign-in page with the path and the query in next', async () => {
    const path = `/loot-list?guild=${GUILD}&picker=1`

    const target = await signedOutRedirect(path)

    expect(target.pathname).toBe('/')
    expect(target.searchParams.get('next')).toBe(path)
  })

  it('keeps the carried next value acceptable to isSafeNextPath', async () => {
    const target = await signedOutRedirect(`/loot-list?guild=${GUILD}&picker=1`)

    expect(isSafeNextPath(target.searchParams.get('next'))).toBe(true)
  })

  it('keeps next equal to the pathname when the request has no query', async () => {
    const target = await signedOutRedirect('/overview')

    expect(target.searchParams.get('next')).toBe('/overview')
  })

  it('stays same-origin when the query itself looks like a redirect (T-04-07-04)', async () => {
    const target = await signedOutRedirect('/overview?next=//evil.example')

    const next = target.searchParams.get('next')
    expect(next).toBe('/overview?next=//evil.example')
    expect(isSafeNextPath(next)).toBe(true)
    expect(target.origin).toBe('http://localhost')
  })
})
