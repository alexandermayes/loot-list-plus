// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const cookieStoreStub = {
  getAll: vi.fn(() => []),
  set: vi.fn(),
}

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStoreStub),
}))

interface SupabaseStubOptions {
  exchangeError?: { message: string } | null
  user?: { id: string } | null
  userCharacters?: Array<{ id: string }>
  charMembership?: { guild_id: string } | null
  existingActive?: { active_guild_id: string } | null
}

/**
 * One recording Supabase stand-in for createServerClient. `from(table)`
 * returns a chainable, thenable builder: select/eq/in/limit are no-ops that
 * return the same builder; maybeSingle resolves per-table canned data;
 * awaiting the chain directly (no maybeSingle call, as the characters query
 * does) resolves the per-table list data via the builder's own `then`.
 */
function createSupabaseStub(options: SupabaseStubOptions = {}) {
  const {
    exchangeError = null,
    user = { id: 'user-1' },
    userCharacters = [],
    charMembership = null,
    existingActive = null,
  } = options

  const upsertCalls: unknown[] = []

  function builder(table: string) {
    const chain = {
      select: () => chain,
      eq: () => chain,
      in: () => chain,
      limit: () => chain,
      maybeSingle: async () => {
        if (table === 'character_guild_memberships') return { data: charMembership }
        if (table === 'user_active_characters') return { data: existingActive }
        return { data: null }
      },
      upsert: (payload: unknown) => {
        upsertCalls.push(payload)
        return Promise.resolve({ data: null, error: null })
      },
      then: (resolve: (value: { data: unknown }) => void) => {
        if (table === 'characters') return resolve({ data: userCharacters })
        return resolve({ data: null })
      },
    }
    return chain
  }

  return {
    auth: {
      exchangeCodeForSession: vi.fn(async () => ({ error: exchangeError })),
      getUser: vi.fn(async () => ({ data: { user: exchangeError ? null : user } })),
    },
    from: vi.fn((table: string) => builder(table)),
    upsertCalls,
  }
}

let currentSupabaseStub = createSupabaseStub()

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => currentSupabaseStub),
}))

function buildRequest(query: string) {
  return { url: `http://localhost:3000/auth/callback${query}` }
}

beforeEach(() => {
  vi.clearAllMocks()
  cookieStoreStub.getAll.mockReturnValue([])
})

describe('GET /auth/callback', () => {
  it('sends a brand-new user (no characters) with the create-guild next straight through, query kept', async () => {
    currentSupabaseStub = createSupabaseStub({ userCharacters: [] })
    const { GET } = await import('../route')
    const res = await GET(buildRequest('?code=abc&next=%2Fguild-select%2Fcreate%3Fgame%3Dforever'))
    expect(res.headers.get('location')).toBe(
      'http://localhost:3000/guild-select/create?game=forever'
    )
  })

  it('sends a brand-new user with any other next to /guild-select', async () => {
    currentSupabaseStub = createSupabaseStub({ userCharacters: [] })
    const { GET } = await import('../route')
    const res = await GET(buildRequest('?code=abc&next=%2Foverview'))
    expect(res.headers.get('location')).toBe('http://localhost:3000/guild-select')
  })

  it('sends a brand-new user with no next to /guild-select', async () => {
    currentSupabaseStub = createSupabaseStub({ userCharacters: [] })
    const { GET } = await import('../route')
    const res = await GET(buildRequest('?code=abc'))
    expect(res.headers.get('location')).toBe('http://localhost:3000/guild-select')
  })

  it('sends a member to a safe next unchanged', async () => {
    currentSupabaseStub = createSupabaseStub({
      userCharacters: [{ id: 'char-1' }],
      charMembership: { guild_id: 'guild-1' },
      existingActive: { active_guild_id: 'guild-1' },
    })
    const { GET } = await import('../route')
    const res = await GET(buildRequest('?code=abc&next=%2Floot-list'))
    expect(res.headers.get('location')).toBe('http://localhost:3000/loot-list')
  })

  it('falls a member back to /overview for an unsafe next, keeping the request host', async () => {
    currentSupabaseStub = createSupabaseStub({
      userCharacters: [{ id: 'char-1' }],
      charMembership: { guild_id: 'guild-1' },
      existingActive: { active_guild_id: 'guild-1' },
    })
    const { GET } = await import('../route')
    const res = await GET(buildRequest('?code=abc&next=%40evil.com'))
    const location = res.headers.get('location')
    expect(location).toBe('http://localhost:3000/overview')
    expect(new URL(location as string).host).toBe('localhost:3000')
  })

  it('falls a member back to /overview for a protocol-relative next, keeping the request host', async () => {
    currentSupabaseStub = createSupabaseStub({
      userCharacters: [{ id: 'char-1' }],
      charMembership: { guild_id: 'guild-1' },
      existingActive: { active_guild_id: 'guild-1' },
    })
    const { GET } = await import('../route')
    const res = await GET(buildRequest('?code=abc&next=%2F%2Fevil.com'))
    const location = res.headers.get('location')
    expect(location).toBe('http://localhost:3000/overview')
    expect(new URL(location as string).host).toBe('localhost:3000')
  })

  it('redirects to the auth_failed fallback when code exchange fails', async () => {
    currentSupabaseStub = createSupabaseStub({ exchangeError: { message: 'bad code' } })
    const { GET } = await import('../route')
    const res = await GET(buildRequest('?code=abc'))
    expect(res.headers.get('location')).toBe('http://localhost:3000/?error=auth_failed')
  })

  it('redirects to the auth_failed fallback when there is no code at all', async () => {
    currentSupabaseStub = createSupabaseStub()
    const { GET } = await import('../route')
    const res = await GET(buildRequest(''))
    expect(res.headers.get('location')).toBe('http://localhost:3000/?error=auth_failed')
  })
})
