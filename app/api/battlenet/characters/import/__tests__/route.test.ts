// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getBattlenetAccount, battlenetFetch, getWowProfileNamespaces } from '@/lib/battlenet'
import { getDefaultRoleName } from '@/domain/guild/default-role'
import { resolveGuildJoinAccess, consumeGuildJoinGrant } from '@/domain/guild/join-grants'
import { evaluateGuildFunnel } from '@/utils/analytics/funnel'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/lib/battlenet', () => ({
  getBattlenetAccount: vi.fn(),
  battlenetFetch: vi.fn(),
  getWowProfileNamespaces: vi.fn(),
  SLOT_MAPPING: {},
}))
vi.mock('@/lib/cache/user-bundle', () => ({ revalidateUserBundle: vi.fn() }))
vi.mock('@/utils/cache', () => ({
  invalidateCache: vi.fn(),
  cacheKeys: { userCharacters: vi.fn((userId: string) => `cache:characters:${userId}`) },
}))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn() }))
vi.mock('@/utils/analytics/funnel', () => ({ evaluateGuildFunnel: vi.fn() }))
vi.mock('@/domain/guild/default-role', () => ({ getDefaultRoleName: vi.fn() }))
vi.mock('@/domain/guild/join-grants', () => ({
  resolveGuildJoinAccess: vi.fn(),
  consumeGuildJoinGrant: vi.fn(),
}))

const USER = 'user-1'
const GUILD = 'guild-1'
const CHARACTER = 'char-new'

interface Call {
  table: string
  op: 'select' | 'update' | 'insert' | 'upsert' | 'delete'
  payload?: unknown
  options?: unknown
  filters: Array<[string, unknown]>
}

/** Shared, ordered log of service-role writes and join record helper calls. */
let events: string[] = []

interface ServiceWorld {
  /** Number of specs for the class; more than one with no match asks the client to pick. */
  specCount?: number
  failUpsert?: boolean
  trial?: boolean
}

function serviceClient(w: ServiceWorld) {
  const calls: Call[] = []
  function from(table: string) {
    const call: Call = { table, op: 'select', filters: [] }
    calls.push(call)
    const write = (op: Call['op']) => (payload?: unknown, options?: unknown) => {
      call.op = op
      call.payload = payload
      call.options = options
      events.push(`${table}:${op}`)
      return builder
    }
    const resolve = () => {
      if (table === 'wow_classes') return { data: { id: 'class-1', name: 'Warrior', color_hex: '#fff' }, error: null }
      if (table === 'class_specs') {
        const n = w.specCount ?? 1
        return { data: Array.from({ length: n }, (_, i) => ({ id: `spec-${i}`, name: `Spec ${i}` })), error: null }
      }
      if (table === 'characters' && call.op === 'insert') return { data: { id: CHARACTER, name: 'Thrall' }, error: null }
      if (table === 'characters') return { data: null, error: null }
      if (table === 'guild_settings') return { data: { new_members_start_as_trial: w.trial === true }, error: null }
      if (table === 'character_guild_memberships' && w.failUpsert) return { data: null, error: { message: 'upsert failed' } }
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

const PROFILE = {
  id: 123,
  name: 'Thrall',
  level: 60,
  character_class: { name: 'Warrior', id: 1 },
  active_spec: { name: 'Unmatched', id: 9 },
  realm: { name: 'Faerlina', slug: 'faerlina' },
  faction: { type: 'HORDE', name: 'Horde' },
}

function setup(w: ServiceWorld = {}) {
  const service = serviceClient(w)
  vi.mocked(createServiceRoleClient).mockReturnValue(service.client as never)
  return { service }
}

function request(body: Record<string, unknown>) {
  return new Request('http://localhost/api/battlenet/characters/import', {
    method: 'POST',
    body: JSON.stringify({ name: 'Thrall', realmSlug: 'faerlina', version: 'classic-era', importGear: false, ...body }),
  }) as never
}

const allowed = (via: 'creator' | 'member' | 'grant') => ({ allowed: true as const, via })

describe('POST /api/battlenet/characters/import applies the guild rule before creating anything', () => {
  beforeEach(() => {
    events = []
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER }, error: null } as never)
    vi.mocked(getBattlenetAccount).mockResolvedValue({ region: 'us' } as never)
    vi.mocked(getWowProfileNamespaces).mockReturnValue(['profile-classic1x-us'])
    vi.mocked(battlenetFetch).mockImplementation(async () => new Response(JSON.stringify(PROFILE), { status: 200 }))
    vi.mocked(getDefaultRoleName).mockResolvedValue('Member')
    vi.mocked(resolveGuildJoinAccess).mockResolvedValue(allowed('grant'))
    vi.mocked(consumeGuildJoinGrant).mockImplementation(async () => {
      events.push('consume')
    })
  })

  it('returns 403 with no Battle.net request and no write when access is not allowed', async () => {
    vi.mocked(resolveGuildJoinAccess).mockResolvedValue({ allowed: false })
    const { service } = setup()

    const res = await POST(request({ guildId: GUILD }))

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'You are not a member of this guild' })
    expect(resolveGuildJoinAccess).toHaveBeenCalledWith(service.client, { userId: USER, guildId: GUILD })
    expect(battlenetFetch).not.toHaveBeenCalled()
    expect(service.writes()).toEqual([])
    expect(consumeGuildJoinGrant).not.toHaveBeenCalled()
  })

  it('returns 500 with no Battle.net request and no write when the access lookup fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(resolveGuildJoinAccess).mockRejectedValue(new Error('Failed to check guild join access'))
    const { service } = setup()

    const res = await POST(request({ guildId: GUILD }))

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal server error' })
    expect(battlenetFetch).not.toHaveBeenCalled()
    expect(service.writes()).toEqual([])
  })

  it('creates the character, upserts the membership with the default role and then consumes the join record', async () => {
    const { service } = setup()

    const res = await POST(request({ guildId: GUILD }))

    expect(res.status).toBe(201)
    const upsert = service.writes().find(c => c.table === 'character_guild_memberships')
    expect(upsert).toMatchObject({
      op: 'upsert',
      payload: { character_id: CHARACTER, guild_id: GUILD, role: 'Member', is_active: true, joined_via: 'battlenet_import' },
      options: { onConflict: 'character_id,guild_id' },
    })
    expect(consumeGuildJoinGrant).toHaveBeenCalledWith(service.client, { userId: USER, guildId: GUILD })
    expect(events).toEqual(['characters:insert', 'character_guild_memberships:upsert', 'consume'])
    expect(evaluateGuildFunnel).toHaveBeenCalledWith(service.client, GUILD)
  })

  it('still returns 201 and consumes nothing when the membership upsert fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    setup({ failUpsert: true })

    const res = await POST(request({ guildId: GUILD }))

    expect(res.status).toBe(201)
    expect(consumeGuildJoinGrant).not.toHaveBeenCalled()
  })

  it('runs no access check and writes no membership without a guildId', async () => {
    const { service } = setup()

    const res = await POST(request({}))

    expect(res.status).toBe(201)
    expect(resolveGuildJoinAccess).not.toHaveBeenCalled()
    expect(service.writes().filter(c => c.table === 'character_guild_memberships')).toEqual([])
    expect(consumeGuildJoinGrant).not.toHaveBeenCalled()
  })

  it('runs the check on a needs_spec answer and writes or consumes nothing', async () => {
    const { service } = setup({ specCount: 2 })

    const res = await POST(request({ guildId: GUILD }))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ needs_spec: true })
    expect(resolveGuildJoinAccess).toHaveBeenCalledTimes(1)
    expect(service.writes()).toEqual([])
    expect(consumeGuildJoinGrant).not.toHaveBeenCalled()
  })

  it('adds trial fields to the upsert via a join record when the guild starts new members as trial', async () => {
    const { service } = setup({ trial: true })

    await POST(request({ guildId: GUILD }))

    const upsert = service.writes().find(c => c.table === 'character_guild_memberships')
    expect(upsert?.payload).toMatchObject({ membership_status: 'trial', trial_started_at: expect.any(String) })
  })

  it.each(['creator', 'member'] as const)('adds no trial fields via the %s path even when trial is on', async (via) => {
    vi.mocked(resolveGuildJoinAccess).mockResolvedValue(allowed(via))
    const { service } = setup({ trial: true })

    const res = await POST(request({ guildId: GUILD }))

    expect(res.status).toBe(201)
    const upsert = service.writes().find(c => c.table === 'character_guild_memberships')
    expect(upsert?.payload).not.toHaveProperty('membership_status')
    expect(service.calls.some(c => c.table === 'guild_settings')).toBe(false)
    expect(consumeGuildJoinGrant).toHaveBeenCalledWith(service.client, { userId: USER, guildId: GUILD })
  })
})
