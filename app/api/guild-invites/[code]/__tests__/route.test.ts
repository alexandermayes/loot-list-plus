// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackEvent, setUserMilestone } from '@/utils/analytics/server'
import { evaluateGuildFunnel } from '@/utils/analytics/funnel'
import { getDefaultRoleName } from '@/domain/guild/default-role'
import { recordGuildJoinGrant, consumeGuildJoinGrant } from '@/domain/guild/join-grants'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/lib/cache/user-bundle', () => ({ revalidateUserBundle: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({
  setUserMilestone: vi.fn(),
  trackEvent: vi.fn(),
}))
vi.mock('@/utils/analytics/funnel', () => ({ evaluateGuildFunnel: vi.fn() }))
vi.mock('@/domain/guild/default-role', () => ({ getDefaultRoleName: vi.fn() }))
vi.mock('@/domain/guild/join-grants', () => ({
  recordGuildJoinGrant: vi.fn(),
  consumeGuildJoinGrant: vi.fn(),
}))

const USER = 'user-1'
const GUILD = 'guild-1'
const CHARACTER = 'char-1'
const CODE = 'ABC123'

interface Call {
  table: string
  op: 'select' | 'update' | 'insert' | 'upsert' | 'delete'
  payload?: unknown
  filters: Array<[string, unknown]>
}

/** Shared, ordered log of service-role writes and join record helper calls. */
let events: string[] = []

interface ServiceWorld {
  /** A character with a class set exists for the user. */
  hasCharacter: boolean
  existing?: { id: string; is_active: boolean } | null
  trial?: boolean
  failInsert?: boolean
}

function serviceClient(w: ServiceWorld) {
  const calls: Call[] = []
  function from(table: string) {
    const call: Call = { table, op: 'select', filters: [] }
    calls.push(call)
    const write = (op: Call['op']) => (payload?: unknown) => {
      call.op = op
      call.payload = payload
      events.push(`${table}:${op}`)
      return builder
    }
    const resolve = () => {
      if (table === 'characters') return { data: w.hasCharacter ? [{ id: CHARACTER, class_id: 'class-1' }] : [], error: null }
      if (table === 'character_guild_memberships' && call.op === 'select') return { data: w.existing ?? null, error: null }
      if (table === 'guild_settings') return { data: { new_members_start_as_trial: w.trial === true }, error: null }
      if (table === 'character_guild_memberships' && call.op === 'insert' && w.failInsert) {
        return { data: null, error: { message: 'insert failed' } }
      }
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
      not: () => builder,
      order: () => builder,
      limit: () => builder,
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

/** User-session client: the redeem_invite_code RPC and the guild realm read. */
function userClient(redeemed: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    single: () => Promise.resolve({ data: { realm: 'Realm' }, error: null }),
  }
  return {
    rpc: vi.fn(() => Promise.resolve({ data: [redeemed], error: null })),
    from: vi.fn(() => builder),
  }
}

const REDEEMED = { invite_guild_id: GUILD, error_code: null }

function setup(w: ServiceWorld, redeemed: unknown = REDEEMED) {
  const user = userClient(redeemed)
  const service = serviceClient(w)
  vi.mocked(createClient).mockResolvedValue(user as never)
  vi.mocked(createServiceRoleClient).mockReturnValue(service.client as never)
  return { user, service }
}

function request() {
  return new Request(`http://localhost/api/guild-invites/${CODE}`, { method: 'POST' }) as never
}
const params = { params: Promise.resolve({ code: CODE }) }

describe('POST /api/guild-invites/[code] records the join for users without a character', () => {
  beforeEach(() => {
    events = []
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER }, error: null } as never)
    vi.mocked(getDefaultRoleName).mockResolvedValue('Member')
    vi.mocked(recordGuildJoinGrant).mockImplementation(async () => {
      events.push('record')
      return { error: null }
    })
    vi.mocked(consumeGuildJoinGrant).mockImplementation(async () => {
      events.push('consume')
    })
  })

  it('records the join before setting the active guild when the user has no character with a class set', async () => {
    const { service } = setup({ hasCharacter: false })

    const res = await POST(request(), params)

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ success: true, guild_id: GUILD, needs_character_creation: true })
    expect(recordGuildJoinGrant).toHaveBeenCalledTimes(1)
    expect(recordGuildJoinGrant).toHaveBeenCalledWith(service.client, { userId: USER, guildId: GUILD, source: 'invite_code' })
    expect(events).toEqual(['record', 'user_active_characters:upsert'])
    expect(consumeGuildJoinGrant).not.toHaveBeenCalled()
    expect(trackEvent).toHaveBeenCalledWith({ event: 'guild_joined', userId: USER, guildId: GUILD })
  })

  it('returns 500 with the existing text and writes nothing else when the join record cannot be written', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(recordGuildJoinGrant).mockResolvedValue({ error: { message: 'write failed' } })
    const { service } = setup({ hasCharacter: false })

    const res = await POST(request(), params)

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Couldn't join guild. Try again or contact an officer." })
    expect(service.writes()).toEqual([])
    expect(trackEvent).not.toHaveBeenCalled()
    expect(evaluateGuildFunnel).not.toHaveBeenCalled()
  })

  it('inserts the membership and then consumes the join record for a user with a character', async () => {
    const { service } = setup({ hasCharacter: true, existing: null })

    const res = await POST(request(), params)

    expect(res.status).toBe(200)
    expect(recordGuildJoinGrant).not.toHaveBeenCalled()
    expect(consumeGuildJoinGrant).toHaveBeenCalledWith(service.client, { userId: USER, guildId: GUILD })
    expect(events).toEqual(['character_guild_memberships:insert', 'consume', 'user_active_characters:upsert'])
    expect(setUserMilestone).toHaveBeenCalledWith(USER, 'first_guild_joined_at')
  })

  it('reactivates an inactive membership and then consumes the join record', async () => {
    const { service } = setup({ hasCharacter: true, existing: { id: 'm-1', is_active: false } })

    const res = await POST(request(), params)

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ message: 'Successfully rejoined guild' })
    const update = service.writes().find(c => c.table === 'character_guild_memberships')
    expect(update).toMatchObject({ op: 'update', payload: { is_active: true, role: 'Member', joined_via: 'invite_code' }, filters: [['id', 'm-1']] })
    expect(consumeGuildJoinGrant).toHaveBeenCalledWith(service.client, { userId: USER, guildId: GUILD })
    expect(events).toEqual(['character_guild_memberships:update', 'consume', 'user_active_characters:upsert'])
  })

  it('returns the existing 500 and consumes nothing when the membership insert fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    setup({ hasCharacter: true, existing: null, failInsert: true })

    const res = await POST(request(), params)

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: "Couldn't join guild. Try again or contact an officer." })
    expect(consumeGuildJoinGrant).not.toHaveBeenCalled()
  })

  it('returns the existing 400 with no write for an active membership', async () => {
    const { service } = setup({ hasCharacter: true, existing: { id: 'm-2', is_active: true } })

    const res = await POST(request(), params)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'You are already a member of this guild' })
    expect(service.writes()).toEqual([])
    expect(recordGuildJoinGrant).not.toHaveBeenCalled()
    expect(consumeGuildJoinGrant).not.toHaveBeenCalled()
  })

  it('returns the existing 400 for an expired code with no helper call and no service-role write', async () => {
    const { service } = setup({ hasCharacter: false }, { invite_guild_id: null, error_code: 'EXPIRED' })

    const res = await POST(request(), params)

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'This invite code has expired' })
    expect(service.calls).toEqual([])
    expect(recordGuildJoinGrant).not.toHaveBeenCalled()
    expect(consumeGuildJoinGrant).not.toHaveBeenCalled()
  })

  it('keeps the trial fields on the insert when the guild starts new members as trial', async () => {
    const { service } = setup({ hasCharacter: true, existing: null, trial: true })

    await POST(request(), params)

    const insert = service.writes().find(c => c.table === 'character_guild_memberships')
    expect(insert?.payload).toMatchObject({ membership_status: 'trial', joined_via: 'invite_code' })
  })
})
