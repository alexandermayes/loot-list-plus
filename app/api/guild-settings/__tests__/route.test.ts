// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PUT } from '../route'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn(), getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))
vi.mock('@/utils/audit/log', () => ({ logAudit: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), trackApiError: vi.fn() }))
vi.mock('@/utils/analytics/funnel', () => ({ evaluateGuildFunnel: vi.fn() }))

const RAIDER = '11111111-1111-4111-8111-111111111111'

/** Service-role stand-in: an existing guild_settings row, recording every update and insert payload. */
function makeServiceClient() {
  const updates: Record<string, unknown>[] = []
  const inserts: Record<string, unknown>[] = []
  const client = {
    from() {
      let written: Record<string, unknown> | null = null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        update: (payload: Record<string, unknown>) => { updates.push(payload); written = payload; return builder },
        insert: (payload: Record<string, unknown>) => { inserts.push(payload); written = payload; return builder },
        single: () => Promise.resolve(
          written
            ? { data: { id: 'settings-1', ...written }, error: null }
            : { data: { id: 'settings-1', guild_id: 'g1' }, error: null },
        ),
      }
      return builder
    },
    rpc: vi.fn(),
  }
  return { client, updates, inserts }
}

function put(settings: unknown) {
  return PUT(new Request('http://localhost/api/guild-settings', {
    method: 'PUT',
    body: JSON.stringify({ guild_id: 'g1', settings }),
  }))
}

describe('PUT /api/guild-settings single_raider_modifiers validation', () => {
  let service: ReturnType<typeof makeServiceClient>

  beforeEach(() => {
    service = makeServiceClient()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'user-1' }, error: null } as never)
    vi.mocked(createClient).mockResolvedValue({} as never)
    vi.mocked(createServiceRoleClient).mockReturnValue(service.client as never)
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as never)
  })

  it('stores a sanitised copy of a valid map', async () => {
    const res = await put({
      single_raider_modifiers: {
        [RAIDER]: [{ amount: 2, starts_at: '2026-10-06', expires_at: '2026-10-12', label: ' Full enchants ', batch_id: 'batch-0001', note: 'x' }],
      },
    })

    expect(res.status).toBe(200)
    expect(service.updates).toHaveLength(1)
    expect(service.updates[0].single_raider_modifiers).toEqual({
      [RAIDER]: [{ amount: 2, expires_at: '2026-10-12', starts_at: '2026-10-06', label: 'Full enchants', batch_id: 'batch-0001' }],
    })
  })

  it('rejects a string amount with a 400 and writes nothing', async () => {
    const res = await put({ single_raider_modifiers: { [RAIDER]: [{ amount: '5', expires_at: null }] } })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'Each raider bonus needs a number for its amount.' })
    expect(service.updates).toEqual([])
    expect(service.inserts).toEqual([])
  })

  it('rejects a reason over 60 characters', async () => {
    const res = await put({ single_raider_modifiers: { [RAIDER]: [{ amount: 1, expires_at: null, label: 'x'.repeat(61) }] } })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'A raider bonus reason can be up to 60 characters.' })
    expect(service.updates).toEqual([])
  })

  it('rejects a raider key that is not a UUID', async () => {
    const res = await put({ single_raider_modifiers: { 'char-1': [{ amount: 1, expires_at: null }] } })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'A raider bonus has an unknown raider.' })
    expect(service.updates).toEqual([])
  })

  it('skips validation when the payload has no raider bonuses', async () => {
    const res = await put({ loot_announcements_enabled: true })

    expect(res.status).toBe(200)
    expect(service.updates).toHaveLength(1)
    expect(service.updates[0]).not.toHaveProperty('single_raider_modifiers')
    expect(service.updates[0].loot_announcements_enabled).toBe(true)
  })
})
