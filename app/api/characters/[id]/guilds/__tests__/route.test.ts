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

interface Call {
  table: string
  op: 'select' | 'update' | 'insert' | 'upsert' | 'delete'
  payload?: unknown
  filters: Array<[string, unknown]>
}

type Resolver = (call: Call, terminal: 'single' | 'maybeSingle' | 'then') => { data: unknown; error: unknown }

/**
 * Recording Supabase stand-in. Every chain records its table, operation,
 * payload and eq filters; `resolve` decides what each awaited chain returns.
 */
function createFakeClient(resolve: Resolver) {
  const calls: Call[] = []
  function from(table: string) {
    const call: Call = { table, op: 'select', filters: [] }
    calls.push(call)
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

/** Service-role client: the guild creator, the existing membership and the write results. */
function serviceClient({ createdBy, existing }: { createdBy: string; existing: { id: string; is_active: boolean } | null }) {
  return createFakeClient((call, terminal) => {
    if (call.table === 'guilds' && call.op === 'select') return { data: { created_by: createdBy }, error: null }
    if (call.table === 'character_guild_memberships' && call.op === 'select' && terminal === 'maybeSingle') {
      return { data: existing, error: null }
    }
    if (call.table === 'character_guild_memberships' && (call.op === 'update' || call.op === 'insert')) {
      return { data: { id: existing?.id ?? 'm-new', ...(call.payload as object) }, error: null }
    }
    return { data: null, error: null }
  })
}

describe('POST /api/characters/[id]/guilds reactivation assigns the same role as a new membership', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER }, error: null } as never)
    vi.mocked(getDefaultRoleName).mockReset()
    vi.mocked(getDefaultRoleName).mockResolvedValue('Member')
  })

  it('reactivates an inactive membership of a non-creator with is_active true and the default role', async () => {
    const user = userClient(true)
    const service = serviceClient({ createdBy: 'someone-else', existing: { id: 'm-1', is_active: false } })
    vi.mocked(createClient).mockResolvedValue(user.client as never)
    vi.mocked(createServiceRoleClient).mockReturnValue(service.client as never)

    const res = await POST(request({ guild_id: GUILD }), params)

    expect(res.status).toBe(200)
    const writes = service.writes()
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({
      table: 'character_guild_memberships',
      op: 'update',
      payload: { is_active: true, role: 'Member' },
      filters: [['id', 'm-1']],
    })
    expect(getDefaultRoleName).toHaveBeenCalledWith(GUILD)
    const body = await res.json()
    expect(body.membership).toMatchObject({ id: 'm-1', role: 'Member', is_active: true })
  })

  it('reactivates the guild creator with role Guild Master', async () => {
    const user = userClient(true)
    const service = serviceClient({ createdBy: USER, existing: { id: 'm-2', is_active: false } })
    vi.mocked(createClient).mockResolvedValue(user.client as never)
    vi.mocked(createServiceRoleClient).mockReturnValue(service.client as never)

    const res = await POST(request({ guild_id: GUILD }), params)

    expect(res.status).toBe(200)
    const writes = service.writes()
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({ op: 'update', payload: { is_active: true, role: 'Guild Master' } })
  })

  it('still inserts a new membership with the default role when none exists', async () => {
    const user = userClient(true)
    const service = serviceClient({ createdBy: 'someone-else', existing: null })
    vi.mocked(createClient).mockResolvedValue(user.client as never)
    vi.mocked(createServiceRoleClient).mockReturnValue(service.client as never)

    const res = await POST(request({ guild_id: GUILD, joined_via: 'invite' }), params)

    expect(res.status).toBe(201)
    const writes = service.writes()
    expect(writes).toHaveLength(1)
    expect(writes[0]).toMatchObject({
      table: 'character_guild_memberships',
      op: 'insert',
      payload: { character_id: CHARACTER, guild_id: GUILD, role: 'Member', joined_via: 'invite' },
    })
  })

  it('still returns 409 with no write for an active membership', async () => {
    const user = userClient(true)
    const service = serviceClient({ createdBy: 'someone-else', existing: { id: 'm-3', is_active: true } })
    vi.mocked(createClient).mockResolvedValue(user.client as never)
    vi.mocked(createServiceRoleClient).mockReturnValue(service.client as never)

    const res = await POST(request({ guild_id: GUILD }), params)

    expect(res.status).toBe(409)
    expect(service.writes()).toEqual([])
  })

  it('still returns 404 with no service-role write for a character the caller does not own', async () => {
    const user = userClient(false)
    const service = serviceClient({ createdBy: USER, existing: { id: 'm-4', is_active: false } })
    vi.mocked(createClient).mockResolvedValue(user.client as never)
    vi.mocked(createServiceRoleClient).mockReturnValue(service.client as never)

    const res = await POST(request({ guild_id: GUILD }), params)

    expect(res.status).toBe(404)
    expect(service.calls).toEqual([])
    expect(user.writes()).toEqual([])
  })
})
