// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getDefaultRoleName } from '@/domain/guild/default-role'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/domain/guild/default-role', () => ({ getDefaultRoleName: vi.fn() }))
// domain/guild/join-grants is NOT mocked: the real helper runs against the
// service-role fake, so the route, the helper and the table names are wired
// end to end.

interface Call {
  table: string
  op: 'select' | 'update' | 'insert' | 'upsert' | 'delete'
  payload?: unknown
  filters: Array<[string, unknown]>
  otherFilters: Array<[string, string, unknown]>
}

type Resolver = (call: Call, terminal: 'single' | 'maybeSingle' | 'then') => { data: unknown; error: unknown }

/**
 * Recording Supabase stand-in. Every chain records its table, operation,
 * payload and eq filters (in, neq, is and gt go to otherFilters); `resolve`
 * decides what each awaited chain returns.
 */
function createFakeClient(resolve: Resolver) {
  const calls: Call[] = []
  function from(table: string) {
    const call: Call = { table, op: 'select', filters: [], otherFilters: [] }
    calls.push(call)
    const other = (kind: string) => (col: string, val: unknown) => {
      call.otherFilters.push([kind, col, val])
      return builder
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: () => builder,
      update: (payload: unknown) => {
        call.op = 'update'
        call.payload = payload
        return builder
      },
      insert: (payload: unknown) => {
        call.op = 'insert'
        call.payload = payload
        return builder
      },
      upsert: (payload: unknown) => {
        call.op = 'upsert'
        call.payload = payload
        return builder
      },
      delete: () => {
        call.op = 'delete'
        return builder
      },
      eq: (col: string, val: unknown) => {
        call.filters.push([col, val])
        return builder
      },
      in: other('in'),
      neq: other('neq'),
      is: other('is'),
      gt: other('gt'),
      order: () => builder,
      limit: () => builder,
      maybeSingle: () => Promise.resolve(resolve(call, 'maybeSingle')),
      single: () => Promise.resolve(resolve(call, 'single')),
      then: (onResolve: (v: unknown) => unknown, onReject: (e: unknown) => unknown) =>
        Promise.resolve(resolve(call, 'then')).then(onResolve, onReject),
    }
    return builder
  }
  const writes = () => calls.filter(c => c.op !== 'select')
  return { client: { from }, calls, writes }
}

const USER = 'user-1'
const CHARACTER = 'char-1'
const ALT = 'char-2'
const GUILD = 'guild-1'

function request(body: unknown) {
  return new Request(`http://localhost/api/characters/${CHARACTER}/guilds`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
const params = { params: Promise.resolve({ id: CHARACTER }) }

/** User-session client: the character ownership check. */
function userClient(owned: boolean) {
  return createFakeClient(call =>
    call.table === 'characters' && owned ? { data: { id: CHARACTER }, error: null } : { data: null, error: null },
  )
}

interface ServiceWorld {
  createdBy: string
  existing: { id: string; is_active: boolean } | null
  /** Characters the user owns (the route's character is always among them). */
  characters?: string[]
  /** Another own character is an active member of the guild. */
  altActive?: boolean
  /** The user holds an unconsumed, unexpired join record for the guild. */
  grant?: boolean
  /** guild_settings.new_members_start_as_trial */
  trial?: boolean
  failAccessLookup?: boolean
  failInsert?: boolean
}

/** Service-role client: guild, characters, memberships, join records, settings and write results. */
function serviceClient(w: ServiceWorld) {
  return createFakeClient((call, terminal) => {
    if (call.table === 'guilds' && call.op === 'select') return { data: { created_by: w.createdBy }, error: null }
    if (call.table === 'characters' && call.op === 'select') {
      if (w.failAccessLookup) return { data: null, error: { message: 'lookup failed' } }
      return { data: (w.characters ?? [CHARACTER]).map(id => ({ id })), error: null }
    }
    if (call.table === 'character_guild_memberships' && call.op === 'select' && terminal === 'maybeSingle') {
      return { data: w.existing, error: null }
    }
    if (call.table === 'character_guild_memberships' && call.op === 'select' && terminal === 'then') {
      return { data: w.altActive ? [{ id: 'm-alt' }] : [], error: null }
    }
    if (call.table === 'guild_join_grants' && call.op === 'select') {
      return { data: w.grant ? { user_id: USER } : null, error: null }
    }
    if (call.table === 'guild_settings' && call.op === 'select') {
      return { data: { new_members_start_as_trial: w.trial === true }, error: null }
    }
    if (call.table === 'character_guild_memberships' && call.op === 'insert' && w.failInsert) {
      return { data: null, error: { message: 'insert failed' } }
    }
    if (call.table === 'character_guild_memberships' && (call.op === 'update' || call.op === 'insert')) {
      return { data: { id: w.existing?.id ?? 'm-new', ...(call.payload as object) }, error: null }
    }
    return { data: null, error: null }
  })
}

function setup(owned: boolean, w: ServiceWorld) {
  const user = userClient(owned)
  const service = serviceClient(w)
  vi.mocked(createClient).mockResolvedValue(user.client as never)
  vi.mocked(createServiceRoleClient).mockReturnValue(service.client as never)
  return { user, service }
}

const membershipWrites = (calls: Call[]) => calls.filter(c => c.table === 'character_guild_memberships' && c.op !== 'select')
const consumeWrites = (calls: Call[]) => calls.filter(c => c.table === 'guild_join_grants' && c.op !== 'select')

function expectConsumed(calls: Call[]) {
  const consumes = consumeWrites(calls)
  expect(consumes).toHaveLength(1)
  expect(consumes[0]).toMatchObject({
    op: 'update',
    filters: [['user_id', USER], ['guild_id', GUILD]],
    otherFilters: [['is', 'consumed_at', null]],
  })
  expect((consumes[0].payload as { consumed_at: string }).consumed_at).toEqual(expect.any(String))
  // The consume comes after the membership write.
  const membershipIndex = calls.findIndex(c => c.table === 'character_guild_memberships' && c.op !== 'select')
  expect(calls.indexOf(consumes[0])).toBeGreaterThan(membershipIndex)
}

describe('POST /api/characters/[id]/guilds adds a character only for the creator, an existing member or a recorded join', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER }, error: null } as never)
    vi.mocked(getDefaultRoleName).mockReset()
    vi.mocked(getDefaultRoleName).mockResolvedValue('Member')
  })

  it('returns 403 with no write for a non-creator with no other active character and no join record', async () => {
    const { service } = setup(true, { createdBy: 'someone-else', existing: null, characters: [CHARACTER, ALT] })

    const res = await POST(request({ guild_id: GUILD }), params)

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'You are not a member of this guild' })
    expect(service.writes()).toEqual([])
  })

  it('inserts with the default role and consumes the join record for a record holder', async () => {
    const { service } = setup(true, { createdBy: 'someone-else', existing: null, grant: true })

    const res = await POST(request({ guild_id: GUILD, joined_via: 'invite' }), params)

    expect(res.status).toBe(201)
    const writes = membershipWrites(service.calls)
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({
      op: 'insert',
      payload: { character_id: CHARACTER, guild_id: GUILD, role: 'Member', joined_via: 'invite' },
    })
    expect(writes[0].payload).not.toHaveProperty('membership_status')
    expectConsumed(service.calls)
    const grantLookup = service.calls.find(c => c.table === 'guild_join_grants' && c.op === 'select')
    expect(grantLookup?.filters).toEqual([['user_id', USER], ['guild_id', GUILD]])
    expect(grantLookup?.otherFilters).toContainEqual(['is', 'consumed_at', null])
  })

  it('inserts and consumes for a user whose other character is an active member (alts)', async () => {
    const { service } = setup(true, { createdBy: 'someone-else', existing: null, characters: [CHARACTER, ALT], altActive: true })

    const res = await POST(request({ guild_id: GUILD }), params)

    expect(res.status).toBe(201)
    expect(membershipWrites(service.calls)).toHaveLength(1)
    expectConsumed(service.calls)
    const lookup = service.calls.find(c => c.table === 'character_guild_memberships' && c.otherFilters.length > 0)
    expect(lookup?.otherFilters).toContainEqual(['in', 'character_id', [ALT]])
    expect(lookup?.otherFilters).toContainEqual(['neq', 'character_id', CHARACTER])
    expect(lookup?.filters).toContainEqual(['is_active', true])
  })

  it('inserts with Guild Master and consumes for the guild creator', async () => {
    const { service } = setup(true, { createdBy: USER, existing: null })

    const res = await POST(request({ guild_id: GUILD }), params)

    expect(res.status).toBe(201)
    const writes = membershipWrites(service.calls)
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({ op: 'insert', payload: { role: 'Guild Master' } })
    expectConsumed(service.calls)
  })

  it('returns 403 with no write for an inactive membership when the user is not the creator and has no other active character or record', async () => {
    const { service } = setup(true, { createdBy: 'someone-else', existing: { id: 'm-1', is_active: false } })

    const res = await POST(request({ guild_id: GUILD }), params)

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'You are not a member of this guild' })
    expect(service.writes()).toEqual([])
  })

  it('reactivates an inactive membership with is_active true and the default role when another own character is active', async () => {
    const { service } = setup(true, {
      createdBy: 'someone-else',
      existing: { id: 'm-1', is_active: false },
      characters: [CHARACTER, ALT],
      altActive: true,
    })

    const res = await POST(request({ guild_id: GUILD }), params)

    expect(res.status).toBe(200)
    const writes = membershipWrites(service.calls)
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({
      table: 'character_guild_memberships',
      op: 'update',
      payload: { is_active: true, role: 'Member' },
      filters: [['id', 'm-1']],
    })
    expect(getDefaultRoleName).toHaveBeenCalledWith(GUILD)
    expectConsumed(service.calls)
    const body = await res.json()
    expect(body.membership).toMatchObject({ id: 'm-1', role: 'Member', is_active: true })
  })

  it('reactivates the guild creator with role Guild Master and consumes', async () => {
    const { service } = setup(true, { createdBy: USER, existing: { id: 'm-2', is_active: false } })

    const res = await POST(request({ guild_id: GUILD }), params)

    expect(res.status).toBe(200)
    const writes = membershipWrites(service.calls)
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({ op: 'update', payload: { is_active: true, role: 'Guild Master' } })
    expectConsumed(service.calls)
  })

  it('still returns 409 with no write and no access lookup for an active membership', async () => {
    const { service } = setup(true, { createdBy: 'someone-else', existing: { id: 'm-3', is_active: true }, grant: true })

    const res = await POST(request({ guild_id: GUILD }), params)

    expect(res.status).toBe(409)
    expect(service.writes()).toEqual([])
    expect(service.calls.some(c => c.table === 'guild_join_grants')).toBe(false)
  })

  it('still returns 404 with no service-role call for a character the caller does not own', async () => {
    const { user, service } = setup(false, { createdBy: USER, existing: { id: 'm-4', is_active: false } })

    const res = await POST(request({ guild_id: GUILD }), params)

    expect(res.status).toBe(404)
    expect(service.calls).toEqual([])
    expect(user.writes()).toEqual([])
  })

  it('returns 500 with no membership write when the access lookup fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { service } = setup(true, { createdBy: 'someone-else', existing: null, grant: true, failAccessLookup: true })

    const res = await POST(request({ guild_id: GUILD }), params)

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal server error' })
    expect(service.writes()).toEqual([])
  })

  it('returns 500 and consumes nothing when the insert fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { service } = setup(true, { createdBy: 'someone-else', existing: null, grant: true, failInsert: true })

    const res = await POST(request({ guild_id: GUILD }), params)

    expect(res.status).toBe(500)
    expect(membershipWrites(service.calls)).toHaveLength(1)
    expect(consumeWrites(service.calls)).toEqual([])
  })

  describe('trial for members added through a join record', () => {
    it('adds trial fields to the insert when access is via a join record and the guild starts new members as trial', async () => {
      const { service } = setup(true, { createdBy: 'someone-else', existing: null, grant: true, trial: true })

      const res = await POST(request({ guild_id: GUILD }), params)

      expect(res.status).toBe(201)
      const [write] = membershipWrites(service.calls)
      expect(write.payload).toMatchObject({ membership_status: 'trial', trial_started_at: expect.any(String) })
      const settings = service.calls.find(c => c.table === 'guild_settings')
      expect(settings?.filters).toEqual([['guild_id', GUILD]])
    })

    it('adds trial fields to the reactivation when access is via a join record and trial is on', async () => {
      const { service } = setup(true, { createdBy: 'someone-else', existing: { id: 'm-5', is_active: false }, grant: true, trial: true })

      const res = await POST(request({ guild_id: GUILD }), params)

      expect(res.status).toBe(200)
      const [write] = membershipWrites(service.calls)
      expect(write).toMatchObject({ op: 'update', payload: { is_active: true, role: 'Member', membership_status: 'trial' } })
      expect(write.payload).toHaveProperty('trial_started_at')
    })

    it('adds no trial fields via a join record when trial is off', async () => {
      const { service } = setup(true, { createdBy: 'someone-else', existing: null, grant: true, trial: false })

      await POST(request({ guild_id: GUILD }), params)

      const [write] = membershipWrites(service.calls)
      expect(write.payload).not.toHaveProperty('membership_status')
      expect(write.payload).not.toHaveProperty('trial_started_at')
    })

    it.each([
      ['member', { characters: [CHARACTER, ALT], altActive: true }],
      ['creator', { createdBy: USER }],
    ])('adds no trial fields and reads no settings via the %s path even when trial is on', async (_path, extra) => {
      const { service } = setup(true, { createdBy: 'someone-else', existing: null, trial: true, ...extra })

      const res = await POST(request({ guild_id: GUILD }), params)

      expect(res.status).toBe(201)
      const [write] = membershipWrites(service.calls)
      expect(write.payload).not.toHaveProperty('membership_status')
      expect(service.calls.some(c => c.table === 'guild_settings')).toBe(false)
    })
  })
})
