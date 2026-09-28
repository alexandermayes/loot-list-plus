// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server's middleware relies on.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// OD-05 (GH #300): the companion's PKCE authorize, consent and token
// endpoints share the 'auth' bucket (10/min) with /auth/*, not the general
// 'api' bucket (60/min). Each test re-imports proxy.ts fresh (UPSTASH env
// stubbed empty, module registry reset) so the in-memory rate-limit store
// starts clean and isn't shared across tests.
describe('GH #300: proxy.ts routes the companion auth endpoints into the auth rate-limit bucket', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', '')
    vi.resetModules()
  })

  function requestFor(pathname: string, ip: string, method: 'GET' | 'POST' = 'GET') {
    return new NextRequest(`http://localhost${pathname}`, {
      method,
      headers: { 'x-forwarded-for': ip },
    })
  }

  it('10 POSTs to /api/addon/auth/token from one IP each carry X-RateLimit-Limit 10, and the 11th is 429', async () => {
    const { proxy } = await import('@/proxy')
    const ip = '10.0.0.1'

    for (let i = 0; i < 10; i++) {
      const res = await proxy(requestFor('/api/addon/auth/token', ip, 'POST'))
      expect(res.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(res.status).not.toBe(429)
    }

    const eleventh = await proxy(requestFor('/api/addon/auth/token', ip, 'POST'))
    expect(eleventh.status).toBe(429)
    expect(eleventh.headers.get('X-RateLimit-Limit')).toBe('10')
  })

  it('GET /api/addon/auth from a fresh IP carries X-RateLimit-Limit 10', async () => {
    const { proxy } = await import('@/proxy')
    const res = await proxy(requestFor('/api/addon/auth?response_type=code', '10.0.0.2'))
    expect(res.headers.get('X-RateLimit-Limit')).toBe('10')
  })

  it.each(['/api/addon/guild-data', '/api/addon/authz'])(
    '%s carries X-RateLimit-Limit 60 (the general api bucket, not auth)',
    async (pathname) => {
      const { proxy } = await import('@/proxy')
      const res = await proxy(requestFor(pathname, '10.0.0.3'))
      expect(res.headers.get('X-RateLimit-Limit')).toBe('60')
    }
  )
})
