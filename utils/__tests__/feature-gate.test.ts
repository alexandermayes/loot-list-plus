import { describe, it, expect, vi } from 'vitest'
import {
  checkSubscriptionTier,
  requirePro,
  readGuildTier,
  guildHasPaidAccess,
  userHasReserveAccess,
  requireReserveAccess,
  requireReserveRunPremium,
} from '../feature-gate'

// Lightweight supabase mock: chainable query builder
function mockSupabase(result: { data: unknown; error: unknown }) {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  }
  return chain as unknown as Parameters<typeof checkSubscriptionTier>[0]
}

// ─── checkSubscriptionTier ────────────────────────────────────

describe('checkSubscriptionTier', () => {
  it('returns isPro:true for pro guild', async () => {
    const sb = mockSupabase({ data: { subscription_tier: 'pro' }, error: null })
    const result = await checkSubscriptionTier(sb, 'guild-1')
    expect(result).toEqual({ tier: 'pro', isPro: true })
  })

  it('returns isPro:false for free guild', async () => {
    const sb = mockSupabase({ data: { subscription_tier: 'free' }, error: null })
    const result = await checkSubscriptionTier(sb, 'guild-1')
    expect(result).toEqual({ tier: 'free', isPro: false })
  })

  it('returns isPro:false when guild not found', async () => {
    const sb = mockSupabase({ data: null, error: { message: 'not found' } })
    const result = await checkSubscriptionTier(sb, 'missing')
    expect(result).toEqual({ tier: 'free', isPro: false })
  })

  it('defaults to free when subscription_tier is null', async () => {
    const sb = mockSupabase({ data: { subscription_tier: null }, error: null })
    const result = await checkSubscriptionTier(sb, 'guild-1')
    expect(result).toEqual({ tier: 'free', isPro: false })
  })
})

// ─── requirePro ───────────────────────────────────────────────

describe('requirePro', () => {
  it('returns isPro:true for pro guild (no error)', async () => {
    const sb = mockSupabase({ data: { subscription_tier: 'pro' }, error: null })
    const result = await requirePro(sb, 'guild-1')
    expect(result.isPro).toBe(true)
    expect('error' in result && result.error).toBeFalsy()
  })

  it('returns error response for free guild', async () => {
    const sb = mockSupabase({ data: { subscription_tier: 'free' }, error: null })
    const result = await requirePro(sb, 'guild-1')
    expect(result.isPro).toBe(false)
    if (!result.isPro) {
      expect(result.error).toBeDefined()
      // NextResponse.json returns a Response-like object
      const body = await result.error.json()
      expect(body.error).toBe('This feature requires a Pro subscription')
      expect(result.error.status).toBe(403)
    }
  })

  it('returns error response when guild not found', async () => {
    const sb = mockSupabase({ data: null, error: { message: 'not found' } })
    const result = await requirePro(sb, 'missing')
    expect(result.isPro).toBe(false)
  })
})

// ─── makeTableClient: a generic recording fake for the strict-read gate ───

type Row = Record<string, unknown>
type Op = 'select'
type Filter = ['eq' | 'in' | 'lt', string, unknown]
interface Call { table: string; op: Op; filters: Filter[] }

interface Tables {
  [table: string]: Row[]
}

function applyFilters(rows: Row[], filters: Filter[]) {
  return rows.filter((row) =>
    filters.every(([kind, col, val]) => {
      if (kind === 'eq') return row[col] === val
      if (kind === 'in') return Array.isArray(val) && (val as unknown[]).includes(row[col])
      if (kind === 'lt') return typeof row[col] === 'string' && (row[col] as string) < (val as string)
      return true
    })
  )
}

/**
 * Generic recording fake shared by the gate's unit tests: from(table)
 * records { table, filters }; builder methods select, eq, in, lt, limit,
 * maybeSingle, single and a thenable; respond() answers from fixture rows
 * filtered by the recorded eq/in/lt calls, or with an error when errorOn
 * names the table.
 */
function makeTableClient(tables: Tables, errorOn?: string) {
  const calls: Call[] = []

  function respond(call: Call): { data: unknown; error: { message: string } | null } {
    if (errorOn === call.table) return { data: null, error: { message: 'boom' } }
    const rows = tables[call.table] || []
    return { data: applyFilters(rows, call.filters), error: null }
  }

  const client = {
    from(table: string) {
      const call: Call = { table, op: 'select', filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        eq: (col: string, val: unknown) => { call.filters.push(['eq', col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push(['in', col, val]); return builder },
        lt: (col: string, val: unknown) => { call.filters.push(['lt', col, val]); return builder },
        limit: () => builder,
        single: () => {
          const result = respond(call)
          if (result.error) return Promise.resolve(result)
          const rows = result.data as Row[]
          return Promise.resolve(rows.length > 0 ? { data: rows[0], error: null } : { data: null, error: { message: 'not found' } })
        },
        maybeSingle: () => {
          const result = respond(call)
          if (result.error) return Promise.resolve(result)
          const rows = result.data as Row[]
          return Promise.resolve({ data: rows[0] ?? null, error: null })
        },
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(respond(call)).then(resolve, reject),
      }
      return builder
    },
  }
  return { client, calls }
}

const GUILD_PRO = 'bbbbbbbb-0000-0000-0000-000000000001'
const GUILD_FREE_GRANDFATHERED = 'bbbbbbbb-0000-0000-0000-000000000002'
const GUILD_FREE_NEW = 'bbbbbbbb-0000-0000-0000-000000000003'
const GUILD_MISSING = 'bbbbbbbb-0000-0000-0000-000000000004'
const USER_ACTIVE_PRO = 'bbbbbbbb-0000-0000-0000-000000000010'
const USER_INACTIVE_PRO = 'bbbbbbbb-0000-0000-0000-000000000011'
const USER_NO_CHARS = 'bbbbbbbb-0000-0000-0000-000000000012'
const RUN_CREATOR = 'bbbbbbbb-0000-0000-0000-000000000020'

function baseTables(): Tables {
  return {
    guilds: [
      { id: GUILD_PRO, subscription_tier: 'pro' },
      { id: GUILD_FREE_GRANDFATHERED, subscription_tier: 'free' },
      { id: GUILD_FREE_NEW, subscription_tier: 'free' },
    ],
    reserve_runs: [
      { id: 'run-1', guild_id: GUILD_FREE_GRANDFATHERED, created_at: '2026-08-26T00:00:00.000Z' },
      { id: 'run-2', guild_id: GUILD_FREE_NEW, created_at: '2026-09-01T00:00:00.000Z' },
    ],
    characters: [
      { id: 'char-active', user_id: USER_ACTIVE_PRO },
      { id: 'char-inactive', user_id: USER_INACTIVE_PRO },
    ],
    character_guild_memberships: [
      { id: 'mem-active', guild_id: GUILD_PRO, character_id: 'char-active', is_active: true },
      { id: 'mem-inactive', guild_id: GUILD_PRO, character_id: 'char-inactive', is_active: false },
    ],
  }
}

describe('readGuildTier', () => {
  it('returns pro for a pro guild', async () => {
    const { client } = makeTableClient(baseTables())
    await expect(readGuildTier(client as never, GUILD_PRO)).resolves.toBe('pro')
  })

  it('returns free for a free guild', async () => {
    const { client } = makeTableClient(baseTables())
    await expect(readGuildTier(client as never, GUILD_FREE_NEW)).resolves.toBe('free')
  })

  it('returns free for a null tier or no row', async () => {
    const tables = baseTables()
    tables.guilds.push({ id: 'null-tier-guild', subscription_tier: null })
    const { client } = makeTableClient(tables)
    await expect(readGuildTier(client as never, 'null-tier-guild')).resolves.toBe('free')
    await expect(readGuildTier(client as never, GUILD_MISSING)).resolves.toBe('free')
  })

  it('rejects on a guilds read error', async () => {
    const { client } = makeTableClient(baseTables(), 'guilds')
    await expect(readGuildTier(client as never, GUILD_PRO)).rejects.toThrow()
  })
})

describe('guildHasPaidAccess', () => {
  it('a pro guild gives true for reserve_runs and guild_api with no reserve_runs read', async () => {
    const { client, calls } = makeTableClient(baseTables())
    await expect(guildHasPaidAccess(client as never, GUILD_PRO, 'reserve_runs')).resolves.toBe(true)
    await expect(guildHasPaidAccess(client as never, GUILD_PRO, 'guild_api')).resolves.toBe(true)
    expect(calls.some((c) => c.table === 'reserve_runs')).toBe(false)
  })

  it('a free guild with a pre-cutoff run gives true for reserve_runs and false for guild_api with no reserve_runs read for guild_api', async () => {
    const tables = baseTables()
    const { client, calls } = makeTableClient(tables)
    await expect(guildHasPaidAccess(client as never, GUILD_FREE_GRANDFATHERED, 'reserve_runs')).resolves.toBe(true)
    const callsBeforeGuildApi = calls.length
    await expect(guildHasPaidAccess(client as never, GUILD_FREE_GRANDFATHERED, 'guild_api')).resolves.toBe(false)
    const newCalls = calls.slice(callsBeforeGuildApi)
    expect(newCalls.some((c) => c.table === 'reserve_runs')).toBe(false)
  })

  it('a free guild whose only run is on or after the cutoff gives false', async () => {
    const { client } = makeTableClient(baseTables())
    await expect(guildHasPaidAccess(client as never, GUILD_FREE_NEW, 'reserve_runs')).resolves.toBe(false)
  })

  it('rejects on a reserve_runs read error', async () => {
    const { client } = makeTableClient(baseTables(), 'reserve_runs')
    await expect(guildHasPaidAccess(client as never, GUILD_FREE_NEW, 'reserve_runs')).rejects.toThrow()
  })

  it('rejects on a guilds read error', async () => {
    const { client } = makeTableClient(baseTables(), 'guilds')
    await expect(guildHasPaidAccess(client as never, GUILD_FREE_NEW, 'reserve_runs')).rejects.toThrow()
  })
})

describe('userHasReserveAccess', () => {
  it('with a guildId follows guildHasPaidAccess', async () => {
    const { client } = makeTableClient(baseTables())
    await expect(userHasReserveAccess(client as never, RUN_CREATOR, GUILD_PRO)).resolves.toBe(true)
    await expect(userHasReserveAccess(client as never, RUN_CREATOR, GUILD_FREE_NEW)).resolves.toBe(false)
  })

  it('with no guildId, an active membership in a pro guild gives true', async () => {
    const { client } = makeTableClient(baseTables())
    await expect(userHasReserveAccess(client as never, USER_ACTIVE_PRO, null)).resolves.toBe(true)
  })

  it('with no guildId, an inactive-only membership in a pro guild gives false', async () => {
    const { client } = makeTableClient(baseTables())
    await expect(userHasReserveAccess(client as never, USER_INACTIVE_PRO, null)).resolves.toBe(false)
  })

  it('with no guildId, a user with no characters gives false with no membership read', async () => {
    const { client, calls } = makeTableClient(baseTables())
    await expect(userHasReserveAccess(client as never, USER_NO_CHARS, undefined)).resolves.toBe(false)
    expect(calls.some((c) => c.table === 'character_guild_memberships')).toBe(false)
  })

  it('rejects on a characters read error', async () => {
    const { client } = makeTableClient(baseTables(), 'characters')
    await expect(userHasReserveAccess(client as never, USER_ACTIVE_PRO, null)).rejects.toThrow()
  })

  it('rejects on a character_guild_memberships read error', async () => {
    const { client } = makeTableClient(baseTables(), 'character_guild_memberships')
    await expect(userHasReserveAccess(client as never, USER_ACTIVE_PRO, null)).rejects.toThrow()
  })
})

describe('requireReserveAccess (strict reads)', () => {
  it('allows a pro guild', async () => {
    const { client } = makeTableClient(baseTables())
    const result = await requireReserveAccess(client as never, RUN_CREATOR, GUILD_PRO)
    expect(result.allowed).toBe(true)
  })

  it('denies a free non-grandfathered guild with status 403 and C-1', async () => {
    const { client } = makeTableClient(baseTables())
    const result = await requireReserveAccess(client as never, RUN_CREATOR, GUILD_FREE_NEW)
    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      expect(result.error.status).toBe(403)
      const body = await result.error.json()
      expect(body).toEqual({
        error: 'Reserve runs are a LootList+ Premium feature. Upgrade your guild to create new runs.',
        code: 'premium_required',
      })
    }
  })

  it('rejects on a read error with no denial body', async () => {
    const { client } = makeTableClient(baseTables(), 'guilds')
    await expect(requireReserveAccess(client as never, RUN_CREATOR, GUILD_FREE_NEW)).rejects.toThrow()
  })
})

describe('requireReserveRunPremium', () => {
  it('allows a guild run of a pro guild', async () => {
    const { client } = makeTableClient(baseTables())
    const result = await requireReserveRunPremium(client as never, { guild_id: GUILD_PRO, created_by: RUN_CREATOR }, 'manager')
    expect(result.allowed).toBe(true)
  })

  it('denies a guild run of a free non-grandfathered guild with C-2 for manager', async () => {
    const { client } = makeTableClient(baseTables())
    const result = await requireReserveRunPremium(client as never, { guild_id: GUILD_FREE_NEW, created_by: RUN_CREATOR }, 'manager')
    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      expect(result.error.status).toBe(403)
      const body = await result.error.json()
      expect(body).toEqual({
        error: 'Reserve runs are a LootList+ Premium feature, so this run is read only until its guild upgrades.',
        code: 'premium_required',
      })
    }
  })

  it('denies a guild run of a free non-grandfathered guild with C-3 for guest', async () => {
    const { client } = makeTableClient(baseTables())
    const result = await requireReserveRunPremium(client as never, { guild_id: GUILD_FREE_NEW, created_by: RUN_CREATOR }, 'guest')
    expect(result.allowed).toBe(false)
    if (!result.allowed) {
      expect(result.error.status).toBe(403)
      const body = await result.error.json()
      expect(body).toEqual({
        error: "This run can't take reserves right now because its guild doesn't have LootList+ Premium. Let your raid leader know.",
        code: 'premium_required',
      })
    }
  })

  it('a run with no guild is decided by its creator active in a pro guild', async () => {
    const { client } = makeTableClient(baseTables())
    const result = await requireReserveRunPremium(client as never, { guild_id: null, created_by: USER_ACTIVE_PRO }, 'manager')
    expect(result.allowed).toBe(true)
  })

  it('a run with no guild denies when its creator has no Premium guild', async () => {
    const { client } = makeTableClient(baseTables())
    const result = await requireReserveRunPremium(client as never, { guild_id: null, created_by: USER_NO_CHARS }, 'manager')
    expect(result.allowed).toBe(false)
  })

  it('rejects on a read error', async () => {
    const { client } = makeTableClient(baseTables(), 'guilds')
    await expect(
      requireReserveRunPremium(client as never, { guild_id: GUILD_FREE_NEW, created_by: RUN_CREATOR }, 'manager')
    ).rejects.toThrow()
  })
})
