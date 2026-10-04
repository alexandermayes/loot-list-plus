// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

// Hoisted so process.env.SUPER_ADMIN_IDS is set before the route module
// (which reads it once, at module load, into a top-level const) is imported.
vi.hoisted(() => {
  process.env.SUPER_ADMIN_IDS = 'admin-1'
})

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/utils/supabase/admin', () => ({ createAdminClient: vi.fn() }))

const USER_ID = 'admin-1'
const KEEP_NAME = 'Keep Guild'
const KEEP_ID = 'g-keep'

interface AdminOpts {
  userId?: string | null
  keepRow?: { id: string } | null
  subRows?: { guild_id: string }[]
  subError?: unknown
}

/**
 * One recording admin-client stand-in. Every delete and update (on any
 * table) is recorded with its filters; the guild_subscriptions read is
 * recorded separately with its filters and resolves the test's rows or
 * error. Every other awaited chain resolves { data: [], error: null }.
 */
function createMockAdmin(opts: AdminOpts = {}) {
  const deletes: { table: string; filters: [string, unknown][] }[] = []
  const subscriptionFilters: [string, unknown][] = []

  function buildBuilder(table: string) {
    let op: 'delete' | 'update' | null = null
    let current: (typeof deletes)[number] | null = null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select: (columns: string) => {
        if (table === 'guild_subscriptions') {
          void columns
        }
        return builder
      },
      ilike: () => builder,
      single: () => {
        if (table === 'guilds') {
          return Promise.resolve({ data: opts.keepRow ?? null, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      },
      not: (column: string, operator: string, value: unknown) => {
        if (table === 'guild_subscriptions') subscriptionFilters.push([`not:${column}:${operator}`, value])
        return builder
      },
      neq: (column: string, value: unknown) => {
        if (table === 'guild_subscriptions') {
          subscriptionFilters.push([`neq:${column}`, value])
          return builder
        }
        if (current) current.filters.push([column, value])
        return builder
      },
      eq: (column: string, value: unknown) => {
        if (current) current.filters.push([column, value])
        return builder
      },
      delete: () => {
        op = 'delete'
        current = { table, filters: [] }
        deletes.push(current)
        return builder
      },
      update: () => {
        op = 'update'
        current = { table, filters: [] }
        return builder
      },
      then: (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
        if (table === 'guild_subscriptions') {
          return Promise.resolve({ data: opts.subRows ?? [], error: opts.subError ?? null }).then(resolve, reject)
        }
        void op
        return Promise.resolve({ data: [], error: null }).then(resolve, reject)
      },
    }
    return builder
  }

  const admin = { from: (table: string) => buildBuilder(table) }
  return { admin, deletes, subscriptionFilters }
}

function request(body: unknown) {
  return new Request('http://localhost/api/admin/clear-all-guilds', {
    method: 'POST',
    body: JSON.stringify(body),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any
}

beforeEach(() => {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: USER_ID } } }) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('POST /api/admin/clear-all-guilds', () => {
  it('A1: a live subscription read returns a row -> 409 C-6, no delete recorded', async () => {
    const { admin, deletes } = createMockAdmin({ subRows: [{ guild_id: 'g-live' }] })
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    const res = await POST(request({}))
    const body = await res.json()

    expect(res.status).toBe(409)
    expect(body).toEqual({
      error: 'Some of these guilds still have a live Premium subscription. Delete them one at a time from Guild Settings, which cancels the subscription, then try again.',
      guild_ids: ['g-live'],
    })
    expect(deletes).toEqual([])
  })

  it('A2: the read returns [] -> the existing deletes run, 200', async () => {
    const { admin, deletes } = createMockAdmin({ subRows: [] })
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    const res = await POST(request({}))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.success).toBe(true)
    expect(deletes.some((d) => d.table === 'guilds')).toBe(true)
  })

  it('A3: keep_guild_name resolves -> the guild_subscriptions read carries neq(guild_id, keep) plus the two not filters; [] proceeds', async () => {
    const { admin, subscriptionFilters } = createMockAdmin({ keepRow: { id: KEEP_ID }, subRows: [] })
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    const res = await POST(request({ keep_guild_name: KEEP_NAME }))

    expect(res.status).toBe(200)
    expect(subscriptionFilters).toEqual(
      expect.arrayContaining([
        ['neq:guild_id', KEEP_ID],
        ['not:stripe_subscription_id:is', null],
        ['not:status:in', '(canceled,incomplete_expired)'],
      ])
    )
  })

  it('A4: the read returns an error -> 500 existing text, no delete recorded', async () => {
    const { admin, deletes } = createMockAdmin({ subError: { message: 'boom' } })
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    const res = await POST(request({}))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body).toEqual({ error: "Couldn't delete guilds. Try again." })
    expect(deletes).toEqual([])
  })

  it('A5: a signed-in user who is not a super admin -> 403, no guild_subscriptions read', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'not-admin' } } }) },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    const { admin, subscriptionFilters } = createMockAdmin({ subRows: [] })
    vi.mocked(createAdminClient).mockReturnValue(admin as never)

    const res = await POST(request({}))

    expect(res.status).toBe(403)
    expect(subscriptionFilters).toEqual([])
  })
})
