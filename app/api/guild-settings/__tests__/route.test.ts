// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, PUT } from '../route'
import { LOOT_STYLE_IDS, LOOT_STYLE_PRESETS } from '@/domain/guild/loot-style-presets'
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

describe('PUT /api/guild-settings award_slot_lock_enabled validation', () => {
  let service: ReturnType<typeof makeServiceClient>

  beforeEach(() => {
    service = makeServiceClient()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'user-1' }, error: null } as never)
    vi.mocked(createClient).mockResolvedValue({} as never)
    vi.mocked(createServiceRoleClient).mockReturnValue(service.client as never)
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as never)
  })

  it('stores a boolean value in the update payload', async () => {
    const res = await put({ award_slot_lock_enabled: true })

    expect(res.status).toBe(200)
    expect(service.updates).toHaveLength(1)
    expect(service.updates[0].award_slot_lock_enabled).toBe(true)
  })

  it('returns 400 for a non-boolean value and writes nothing', async () => {
    const res = await put({ award_slot_lock_enabled: 'yes' })
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toBe('award_slot_lock_enabled must be true or false')
    expect(service.updates).toHaveLength(0)
    expect(service.inserts).toHaveLength(0)
  })
})

describe('PUT /api/guild-settings loot_style', () => {
  let service: ReturnType<typeof makeServiceClient>

  beforeEach(() => {
    service = makeServiceClient()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'user-1' }, error: null } as never)
    vi.mocked(createClient).mockResolvedValue({} as never)
    vi.mocked(createServiceRoleClient).mockReturnValue(service.client as never)
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: true } as never)
  })

  it('records one update holding the preset id and its knobs', async () => {
    const res = await put({ ...LOOT_STYLE_PRESETS.even_rotation.knobs, loot_style: 'even_rotation' })

    expect(res.status).toBe(200)
    expect(service.updates).toHaveLength(1)
    expect(service.updates[0]).toMatchObject({ ...LOOT_STYLE_PRESETS.even_rotation.knobs, loot_style: 'even_rotation' })
  })

  it('stores null so a guild can go back to Custom', async () => {
    const res = await put({ loot_style: null })

    expect(res.status).toBe(200)
    expect(service.updates).toHaveLength(1)
    expect(service.updates[0].loot_style).toBeNull()
  })

  it.each([['council'], [7], [true], ['__proto__'], ['']])('answers 400 for %j and writes nothing', async (value) => {
    const res = await put({ loot_style: value })

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({ error: 'loot_style must be one of the loot style presets' })
    expect(service.updates).toEqual([])
    expect(service.inserts).toEqual([])
  })

  it('still refuses a non-officer before looking at loot_style', async () => {
    vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: false } as never)

    const res = await put({ loot_style: 'even_rotation' })

    expect(res.status).toBe(403)
    expect(service.updates).toEqual([])
  })
})

describe('GET /api/guild-settings loot_style default', () => {
  it('includes loot_style null for a guild with no settings row', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessionClient: any = {
      from(table: string) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const builder: any = {
          select: () => builder,
          eq: () => builder,
          in: () => builder,
          limit: () => Promise.resolve({ data: [{ id: 'm1' }], error: null }),
          single: () => Promise.resolve({ data: null, error: { code: 'PGRST116' } }),
          then: (resolve: (v: unknown) => unknown) =>
            resolve(table === 'characters' ? { data: [{ id: 'c1' }], error: null } : { data: null, error: null }),
        }
        return builder
      },
    }
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'user-1' }, error: null } as never)
    vi.mocked(createClient).mockResolvedValue(sessionClient as never)

    const res = await GET(new Request('http://localhost/api/guild-settings?guild_id=g1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.settings).toHaveProperty('loot_style', null)
  })
})

describe('LOOT_STYLE_IDS against the database check', () => {
  // The route validates with the TypeScript ids and the database check is the
  // backstop, so a drift between them would let one accept what the other rejects.
  it('equals the ids in guild_settings_loot_style_check', () => {
    const sql = readFileSync(join(process.cwd(), 'supabase/migrations/20261111120000_need_lists.sql'), 'utf8')
    const line = sql.split('\n').find((l) => l.includes('ADD CONSTRAINT "guild_settings_loot_style_check"'))
    expect(line).toBeDefined()
    const array = /ARRAY\[([^\]]*)\]/.exec(line as string)
    expect(array).not.toBeNull()
    const ids = [...(array as RegExpExecArray)[1].matchAll(/'([a-z_]+)'/g)].map((m) => m[1])

    expect([...ids].sort()).toEqual([...LOOT_STYLE_IDS].sort())
  })
})
