// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PUT } from '../route'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyOfficerPermissions } from '@/utils/server-roles'

vi.mock('@/utils/supabase/server', () => ({
  createClient: vi.fn(),
  getAuthenticatedUser: vi.fn(),
}))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyOfficerPermissions: vi.fn() }))

interface Call {
  table: string
  op: 'select' | 'update' | 'insert' | 'upsert' | 'delete'
  payload?: unknown
  filters: Array<[string, unknown]>
}

/**
 * Recording Supabase stand-in. Every chain records its table, operation,
 * payload and eq filters. maybeSingle() on a guild_roles select resolves
 * `storedRole`; every other awaited chain resolves { data: null, error: null }.
 */
function createFakeClient(storedRole: { data: unknown; error: unknown }) {
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
      maybeSingle: () =>
        Promise.resolve(table === 'guild_roles' && call.op === 'select' ? storedRole : { data: null, error: null }),
      single: () => Promise.resolve({ data: null, error: null }),
      then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(resolve, reject),
    }
    return builder
  }
  const writes = () => calls.filter(c => c.op !== 'select')
  return { client: { from }, calls, writes }
}

function request(body: unknown) {
  return new Request('http://localhost/api/guild-roles', {
    method: 'PUT',
    body: JSON.stringify(body),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any
}

const GUILD = 'guild-1'
const ROLE = 'role-1'

describe('PUT /api/guild-roles rename propagation follows the stored role name', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'user-1' }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockReset()
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true, role: 'Officer', position: 50 })
  })

  it('renames the role and moves its holders from the stored name, never from the body old_name', async () => {
    const fake = createFakeClient({ data: { name: 'Raider' }, error: null })
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)

    const res = await PUT(request({ role_id: ROLE, guild_id: GUILD, name: ' Core ', permissions: ['view_master_sheet'], old_name: 'Member' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })

    const lookup = fake.calls.find(c => c.table === 'guild_roles' && c.op === 'select')
    expect(lookup?.filters).toEqual([
      ['id', ROLE],
      ['guild_id', GUILD],
    ])

    const roleUpdates = fake.writes().filter(c => c.table === 'guild_roles')
    expect(roleUpdates).toHaveLength(1)
    expect(roleUpdates[0]).toMatchObject({
      op: 'update',
      payload: { name: 'Core', permissions: ['view_master_sheet'] },
      filters: [
        ['id', ROLE],
        ['guild_id', GUILD],
      ],
    })

    const memberUpdates = fake.writes().filter(c => c.table === 'character_guild_memberships')
    expect(memberUpdates).toHaveLength(1)
    expect(memberUpdates[0].op).toBe('update')
    expect(memberUpdates[0].payload).toEqual({ role: 'Core' })
    expect(memberUpdates[0].filters).toEqual(
      expect.arrayContaining([
        ['guild_id', GUILD],
        ['role', 'Raider'],
        ['is_active', true],
      ]),
    )
    expect(memberUpdates[0].filters).not.toContainEqual(['role', 'Member'])
  })

  it('does not touch memberships when the name equals the stored name, whatever old_name says', async () => {
    const fake = createFakeClient({ data: { name: 'Raider' }, error: null })
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)

    const res = await PUT(request({ role_id: ROLE, guild_id: GUILD, name: 'Raider', permissions: [], old_name: 'Member' }))

    expect(res.status).toBe(200)
    expect(fake.writes().filter(c => c.table === 'character_guild_memberships')).toEqual([])
    expect(fake.writes().filter(c => c.table === 'guild_roles')).toHaveLength(1)
  })

  it('does not touch memberships when the stored role is not found, and still returns 200', async () => {
    const fake = createFakeClient({ data: null, error: null })
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)

    const res = await PUT(request({ role_id: ROLE, guild_id: GUILD, name: 'Core', permissions: [], old_name: 'Member' }))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(fake.writes().filter(c => c.table === 'character_guild_memberships')).toEqual([])
  })

  it('returns 500 with { success: false } and writes nothing when the stored role lookup fails', async () => {
    const fake = createFakeClient({ data: null, error: { message: 'lookup failed' } })
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const res = await PUT(request({ role_id: ROLE, guild_id: GUILD, name: 'Core', permissions: [], old_name: 'Member' }))

    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ success: false })
    expect(fake.writes()).toEqual([])
    errorSpy.mockRestore()
  })

  it('still returns 403 Not authorized with no reads of the role and no writes for a caller without officer permissions', async () => {
    const fake = createFakeClient({ data: { name: 'Raider' }, error: null })
    vi.mocked(createServiceRoleClient).mockReturnValue(fake.client as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: false })

    const res = await PUT(request({ role_id: ROLE, guild_id: GUILD, name: 'Core', permissions: [], old_name: 'Raider' }))

    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Not authorized' })
    expect(fake.calls).toEqual([])
  })
})
