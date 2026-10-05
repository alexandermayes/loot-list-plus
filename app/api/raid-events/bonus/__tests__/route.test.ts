// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyPermission } from '@/utils/server-roles'
import { logAudit } from '@/utils/audit/log'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({
  verifyPermission: vi.fn(),
  verifyOfficerPermissions: vi.fn(),
  verifyGuildMasterPermissions: vi.fn(),
}))
vi.mock('@/utils/audit/log', () => ({ logAudit: vi.fn() }))

// ─── Fixture ids (valid UUIDs) ──────────────────────────────

const GUILD_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const GUILD_B = 'aaaaaaaa-0000-0000-0000-000000000002'
const XA = 'bbbbbbbb-0000-0000-0000-000000000001'
const XA_OLD = 'bbbbbbbb-0000-0000-0000-000000000002'
const XB = 'bbbbbbbb-0000-0000-0000-000000000003'
const XDET = 'bbbbbbbb-0000-0000-0000-000000000004'
const UNKNOWN_EXPANSION_ID = 'bbbbbbbb-0000-0000-0000-000000000099'
const TMA = 'cccccccc-0000-0000-0000-000000000001'
const TMB = 'cccccccc-0000-0000-0000-000000000002'
const UNKNOWN_TEAM_ID = 'cccccccc-0000-0000-0000-000000000099'
const OFFICER_USER_ID = 'eeeeeeee-0000-0000-0000-000000000001'
const TIER_XA_P2_ACTIVE = 'dddddddd-0000-0000-0000-000000000001'
const TIER_XA_P2_INACTIVE = 'dddddddd-0000-0000-0000-000000000002'
const TIER_XA_P1_ACTIVE = 'dddddddd-0000-0000-0000-000000000003'
const TIER_XA_P1_INACTIVE = 'dddddddd-0000-0000-0000-000000000004'
const TIER_XA_OLD = 'dddddddd-0000-0000-0000-000000000005'
const TIER_XB = 'dddddddd-0000-0000-0000-000000000006'
const TIER_XDET = 'dddddddd-0000-0000-0000-000000000007'

// ─── Recording fake client ──────────────────────────────────

type Op = 'select' | 'insert' | 'upsert' | 'update' | 'delete'
type FilterKind = 'eq' | 'in' | 'is' | 'gte' | 'lte'
type Filter = [FilterKind, string, unknown]
interface Call {
  table: string
  op: Op
  filters: Filter[]
  selectCols?: string
  payload?: unknown
}

interface ExpansionRow { id: string; guild_id: string | null; current_phase: number | null }
interface RaidTeamRow { id: string; guild_id: string }
interface RaidTierRow { id: string; expansion_id: string; phase: number; is_guild_active: boolean }
interface RaidEventRow { id: string; guild_id: string; raid_date: string; raid_team_id: string | null; is_bonus: boolean }

interface Fixture {
  expansions: ExpansionRow[]
  raidTeams: RaidTeamRow[]
  raidTiers: RaidTierRow[]
  raidEvents: RaidEventRow[]
  // Blanket error for every call to `${table}:${op}`.
  errors?: Partial<Record<string, string>>
}

function baseFixture(): Fixture {
  return {
    expansions: [
      { id: XA, guild_id: GUILD_A, current_phase: 2 },
      { id: XA_OLD, guild_id: GUILD_A, current_phase: 2 },
      { id: XB, guild_id: GUILD_B, current_phase: 2 },
      { id: XDET, guild_id: null, current_phase: 2 },
    ],
    raidTeams: [
      { id: TMA, guild_id: GUILD_A },
      { id: TMB, guild_id: GUILD_B },
    ],
    raidTiers: [
      { id: TIER_XA_P2_ACTIVE, expansion_id: XA, phase: 2, is_guild_active: true },
      { id: TIER_XA_P2_INACTIVE, expansion_id: XA, phase: 2, is_guild_active: false },
      { id: TIER_XA_P1_ACTIVE, expansion_id: XA, phase: 1, is_guild_active: true },
      { id: TIER_XA_P1_INACTIVE, expansion_id: XA, phase: 1, is_guild_active: false },
      { id: TIER_XA_OLD, expansion_id: XA_OLD, phase: 2, is_guild_active: true },
      { id: TIER_XB, expansion_id: XB, phase: 2, is_guild_active: true },
      { id: TIER_XDET, expansion_id: XDET, phase: 2, is_guild_active: true },
    ],
    raidEvents: [],
  }
}

/**
 * Recording fake for the Supabase service-role client, in the style of
 * app/api/attendance/bulk/__tests__/route.test.ts. Every from() call is
 * pushed onto `calls`; resolveQuery answers each table/op combination the
 * route and lib/raid-events/guild-raid-refs.ts need. Inserts append to a
 * working copy of fixture.raidEvents so a later read sees them.
 */
function makeClient(fixture: Fixture, calls: Call[]) {
  const raidEvents = fixture.raidEvents.map(r => ({ ...r }))
  let nextEventId = 1

  function resolveQuery(call: Call): { data: unknown; error: { message: string } | null } {
    const key = `${call.table}:${call.op}`
    const configuredError = fixture.errors?.[key]
    if (configuredError) {
      return { data: null, error: { message: configuredError } }
    }

    if (call.table === 'expansions' && call.op === 'select') {
      const idVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'id')?.[2]
      const guildVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'guild_id')?.[2]
      const matched = fixture.expansions.find(e => e.id === idVal && e.guild_id === guildVal)
      return { data: matched ? { id: matched.id, current_phase: matched.current_phase } : null, error: null }
    }

    if (call.table === 'raid_teams' && call.op === 'select') {
      const idVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'id')?.[2]
      const guildVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'guild_id')?.[2]
      const matched = fixture.raidTeams.find(t => t.id === idVal && t.guild_id === guildVal)
      return { data: matched ? { id: matched.id } : null, error: null }
    }

    if (call.table === 'raid_tiers' && call.op === 'select') {
      const expVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'expansion_id')?.[2]
      const phaseVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'phase')?.[2]
      const activeFilterPresent = call.filters.some(f => f[0] === 'eq' && f[1] === 'is_guild_active')
      const activeVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'is_guild_active')?.[2]
      const matched = fixture.raidTiers.find(t =>
        t.expansion_id === expVal &&
        (phaseVal === undefined || t.phase === phaseVal) &&
        (!activeFilterPresent || t.is_guild_active === activeVal)
      )
      return { data: matched ? { id: matched.id } : null, error: null }
    }

    if (call.table === 'raid_events' && call.op === 'select') {
      const guildVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'guild_id')?.[2]
      const dateVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'raid_date')?.[2]
      const teamVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'raid_team_id')?.[2]
      const isNullTeam = call.filters.some(f => f[0] === 'is' && f[1] === 'raid_team_id' && f[2] === null)
      const matched = raidEvents.filter(e =>
        e.guild_id === guildVal &&
        e.raid_date === dateVal &&
        (teamVal !== undefined ? e.raid_team_id === teamVal : (!isNullTeam || e.raid_team_id === null))
      )
      return { data: matched.map(e => ({ id: e.id, is_bonus: e.is_bonus })), error: null }
    }

    if (call.table === 'raid_events' && call.op === 'insert') {
      const payload = call.payload as Record<string, unknown>
      const created: RaidEventRow = {
        id: `event-${nextEventId++}`,
        guild_id: payload.guild_id as string,
        raid_date: payload.raid_date as string,
        raid_team_id: (payload.raid_team_id as string | null) ?? null,
        is_bonus: true,
      }
      raidEvents.push(created)
      return { data: { ...payload, id: created.id }, error: null }
    }

    return { data: null, error: null }
  }

  const client = {
    from(table: string) {
      const call: Call = { table, op: 'select', filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: (cols?: string) => { call.selectCols = cols; return builder },
        insert: (payload: unknown) => { call.op = 'insert'; call.payload = payload; return builder },
        update: (payload: unknown) => { call.op = 'update'; call.payload = payload; return builder },
        delete: () => { call.op = 'delete'; return builder },
        eq: (col: string, val: unknown) => { call.filters.push(['eq', col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push(['in', col, val]); return builder },
        is: (col: string, val: unknown) => { call.filters.push(['is', col, val]); return builder },
        gte: (col: string, val: unknown) => { call.filters.push(['gte', col, val]); return builder },
        lte: (col: string, val: unknown) => { call.filters.push(['lte', col, val]); return builder },
        limit: () => builder,
        order: () => builder,
        maybeSingle: () => Promise.resolve(resolveQuery(call)),
        single: () => Promise.resolve(resolveQuery(call)),
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(resolveQuery(call)).then(resolve, reject),
      }
      return builder
    },
  }
  return { client }
}

function request(body: unknown) {
  return new Request('http://localhost/api/raid-events/bonus', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

async function run(fixture: Fixture, body: Record<string, unknown>, hasPermission = true) {
  const calls: Call[] = []
  const { client } = makeClient(fixture, calls)
  vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceRoleClient>)
  vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: OFFICER_USER_ID }, error: null } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>)
  vi.mocked(verifyPermission).mockResolvedValue({ hasPermission } as unknown as Awaited<ReturnType<typeof verifyPermission>>)
  const res = await POST(request({ guild_id: GUILD_A, ...body }))
  const json = await res.json()
  return { res, json, calls }
}

const expansionLookups = (calls: Call[]) => calls.filter(c => c.table === 'expansions' && c.op === 'select')
const teamLookups = (calls: Call[]) => calls.filter(c => c.table === 'raid_teams' && c.op === 'select')
const tierLookups = (calls: Call[]) => calls.filter(c => c.table === 'raid_tiers' && c.op === 'select')
const eventReads = (calls: Call[]) => calls.filter(c => c.table === 'raid_events' && c.op === 'select')
const eventInserts = (calls: Call[]) => calls.filter(c => c.table === 'raid_events' && c.op === 'insert')

describe('POST /api/raid-events/bonus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('B-1: happy path, no team, uses the phase 2 active tier of the verified expansion', async () => {
    const { res, json, calls } = await run(baseFixture(), {
      expansion_id: XA,
      raid_date: '2026-09-01',
    })
    expect(res.status).toBe(200)
    expect(json.event.guild_id).toBe(GUILD_A)
    expect(json.event.raid_tier_id).toBe(TIER_XA_P2_ACTIVE)
    expect(json.event.raid_team_id).toBeNull()
    expect(json.event.is_bonus).toBe(true)

    const expLookups = expansionLookups(calls)
    expect(expLookups).toHaveLength(1)
    expect(expLookups[0].filters).toEqual(expect.arrayContaining([
      ['eq', 'id', XA],
      ['eq', 'guild_id', GUILD_A],
    ]))
    expect(teamLookups(calls)).toHaveLength(0)
    expect(eventInserts(calls)).toHaveLength(1)
    expect(logAudit).toHaveBeenCalledTimes(1)
  })

  it('B-2: raid_team_id TMA returns 200 and is checked against the guild', async () => {
    const { res, json, calls } = await run(baseFixture(), {
      expansion_id: XA,
      raid_date: '2026-09-01',
      raid_team_id: TMA,
    })
    expect(res.status).toBe(200)
    expect(json.event.raid_team_id).toBe(TMA)

    const tLookups = teamLookups(calls)
    expect(tLookups).toHaveLength(1)
    expect(tLookups[0].filters).toEqual(expect.arrayContaining([
      ['eq', 'id', TMA],
      ['eq', 'guild_id', GUILD_A],
    ]))

    const reads = eventReads(calls)
    expect(reads.some(c => c.filters.some(f => f[0] === 'eq' && f[1] === 'raid_team_id' && f[2] === TMA))).toBe(true)

    const inserts = eventInserts(calls)
    expect(inserts).toHaveLength(1)
    expect((inserts[0].payload as Record<string, unknown>).raid_team_id).toBe(TMA)
    expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
      newData: expect.objectContaining({ raid_team_id: TMA }),
    }))
  })

  it("B-3 (C-1): another guild's expansion returns 400 with no further lookups or writes", async () => {
    const { res, json, calls } = await run(baseFixture(), {
      expansion_id: XB,
      raid_date: '2026-09-01',
    })
    expect(res.status).toBe(400)
    expect(json.error).toBe("This expansion isn't in this guild. Refresh the page, then try again.")
    expect(tierLookups(calls)).toHaveLength(0)
    expect(eventReads(calls)).toHaveLength(0)
    expect(eventInserts(calls)).toHaveLength(0)
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('B-4 (C-1, detached expansion): guild_id null never matches the guild filter', async () => {
    const { res, json, calls } = await run(baseFixture(), {
      expansion_id: XDET,
      raid_date: '2026-09-01',
    })
    expect(res.status).toBe(400)
    expect(json.error).toBe("This expansion isn't in this guild. Refresh the page, then try again.")
    expect(eventInserts(calls)).toHaveLength(0)
  })

  it('B-5 (C-1): an unknown expansion UUID returns 400 after one lookup', async () => {
    const { res, json, calls } = await run(baseFixture(), {
      expansion_id: UNKNOWN_EXPANSION_ID,
      raid_date: '2026-09-01',
    })
    expect(res.status).toBe(400)
    expect(json.error).toBe("This expansion isn't in this guild. Refresh the page, then try again.")
    expect(expansionLookups(calls)).toHaveLength(1)
  })

  it("B-5 (C-1): a malformed expansion_id ('abc') returns 400 with no lookup", async () => {
    const { res, json, calls } = await run(baseFixture(), {
      expansion_id: 'abc',
      raid_date: '2026-09-01',
    })
    expect(res.status).toBe(400)
    expect(json.error).toBe("This expansion isn't in this guild. Refresh the page, then try again.")
    expect(expansionLookups(calls)).toHaveLength(0)
  })

  it('B-5 (C-1): a numeric expansion_id (42) returns 400 with no lookup', async () => {
    const { res, json, calls } = await run(baseFixture(), {
      expansion_id: 42,
      raid_date: '2026-09-01',
    })
    expect(res.status).toBe(400)
    expect(json.error).toBe("This expansion isn't in this guild. Refresh the page, then try again.")
    expect(expansionLookups(calls)).toHaveLength(0)
  })

  it("B-6 (C-2): another guild's raid_team_id returns 400 with no tier lookup or insert", async () => {
    const { res, json, calls } = await run(baseFixture(), {
      expansion_id: XA,
      raid_date: '2026-09-01',
      raid_team_id: TMB,
    })
    expect(res.status).toBe(400)
    expect(json.error).toBe("This raid team isn't in this guild. Refresh the page, then try again.")
    expect(tierLookups(calls)).toHaveLength(0)
    expect(eventInserts(calls)).toHaveLength(0)
  })

  it('B-6 (C-2): an unknown team UUID gives the same 400', async () => {
    const { res, json } = await run(baseFixture(), {
      expansion_id: XA,
      raid_date: '2026-09-01',
      raid_team_id: UNKNOWN_TEAM_ID,
    })
    expect(res.status).toBe(400)
    expect(json.error).toBe("This raid team isn't in this guild. Refresh the page, then try again.")
  })

  it("B-6 (C-2): an empty-string raid_team_id gives 400 with no team lookup", async () => {
    const { res, json, calls } = await run(baseFixture(), {
      expansion_id: XA,
      raid_date: '2026-09-01',
      raid_team_id: '',
    })
    expect(res.status).toBe(400)
    expect(json.error).toBe("This raid team isn't in this guild. Refresh the page, then try again.")
    expect(teamLookups(calls)).toHaveLength(0)
  })

  it("B-6 (C-2): a malformed raid_team_id ('abc') gives 400 with no team lookup", async () => {
    const { res, json, calls } = await run(baseFixture(), {
      expansion_id: XA,
      raid_date: '2026-09-01',
      raid_team_id: 'abc',
    })
    expect(res.status).toBe(400)
    expect(json.error).toBe("This raid team isn't in this guild. Refresh the page, then try again.")
    expect(teamLookups(calls)).toHaveLength(0)
  })

  it('B-6: raid_team_id null behaves as B-1 (no team check, 200)', async () => {
    const { res, json } = await run(baseFixture(), {
      expansion_id: XA,
      raid_date: '2026-09-01',
      raid_team_id: null,
    })
    expect(res.status).toBe(200)
    expect(json.event.raid_team_id).toBeNull()
  })

  it('B-7: with every XA tier, the phase 2 active tier is chosen after one lookup', async () => {
    const { json, calls } = await run(baseFixture(), {
      expansion_id: XA,
      raid_date: '2026-09-01',
    })
    expect(json.event.raid_tier_id).toBe(TIER_XA_P2_ACTIVE)
    expect(tierLookups(calls)).toHaveLength(1)
  })

  it('B-7: without a phase 2 active tier, the phase 2 inactive tier is chosen after two lookups', async () => {
    const fixture = baseFixture()
    fixture.raidTiers = fixture.raidTiers.filter(t => t.id !== TIER_XA_P2_ACTIVE)
    const { json, calls } = await run(fixture, {
      expansion_id: XA,
      raid_date: '2026-09-01',
    })
    expect(json.event.raid_tier_id).toBe(TIER_XA_P2_INACTIVE)
    expect(tierLookups(calls)).toHaveLength(2)
  })

  it('B-7: with only phase 1 tiers, the phase 1 active tier is chosen after three lookups', async () => {
    const fixture = baseFixture()
    fixture.raidTiers = fixture.raidTiers.filter(t => t.id === TIER_XA_P1_ACTIVE || t.id === TIER_XA_P1_INACTIVE || t.expansion_id !== XA)
    const { json, calls } = await run(fixture, {
      expansion_id: XA,
      raid_date: '2026-09-01',
    })
    expect(json.event.raid_tier_id).toBe(TIER_XA_P1_ACTIVE)
    expect(tierLookups(calls)).toHaveLength(3)
  })

  it('B-7: with only the phase 1 inactive tier, that tier is chosen after four lookups', async () => {
    const fixture = baseFixture()
    fixture.raidTiers = fixture.raidTiers.filter(t => t.id === TIER_XA_P1_INACTIVE || t.expansion_id !== XA)
    const { json, calls } = await run(fixture, {
      expansion_id: XA,
      raid_date: '2026-09-01',
    })
    expect(json.event.raid_tier_id).toBe(TIER_XA_P1_INACTIVE)
    expect(tierLookups(calls)).toHaveLength(4)
  })

  it('B-7: with no XA tier, 400 "No raid tier configured for this expansion" after four lookups, no insert', async () => {
    const fixture = baseFixture()
    fixture.raidTiers = fixture.raidTiers.filter(t => t.expansion_id !== XA)
    const { res, json, calls } = await run(fixture, {
      expansion_id: XA,
      raid_date: '2026-09-01',
    })
    expect(res.status).toBe(400)
    expect(json.error).toBe('No raid tier configured for this expansion')
    expect(tierLookups(calls)).toHaveLength(4)
    expect(eventInserts(calls)).toHaveLength(0)
  })

  it('B-7: with expansion XA_OLD, the XA_OLD tier is chosen', async () => {
    const { json } = await run(baseFixture(), {
      expansion_id: XA_OLD,
      raid_date: '2026-09-01',
    })
    expect(json.event.raid_tier_id).toBe(TIER_XA_OLD)
  })

  it('B-8: an expansions lookup error returns 500 with no insert', async () => {
    const fixture = baseFixture()
    fixture.errors = { 'expansions:select': 'boom' }
    const { res, json, calls } = await run(fixture, {
      expansion_id: XA,
      raid_date: '2026-09-01',
    })
    expect(res.status).toBe(500)
    expect(json.error).toBe('Internal server error')
    expect(eventInserts(calls)).toHaveLength(0)
  })

  it('B-8: a raid_teams lookup error returns 500 with no insert', async () => {
    const fixture = baseFixture()
    fixture.errors = { 'raid_teams:select': 'boom' }
    const { res, json, calls } = await run(fixture, {
      expansion_id: XA,
      raid_date: '2026-09-01',
      raid_team_id: TMA,
    })
    expect(res.status).toBe(500)
    expect(json.error).toBe('Internal server error')
    expect(eventInserts(calls)).toHaveLength(0)
  })

  it('B-8: a raid_tiers lookup error returns 500 with no insert, after exactly one raid_tiers call', async () => {
    const fixture = baseFixture()
    fixture.errors = { 'raid_tiers:select': 'boom' }
    const { res, json, calls } = await run(fixture, {
      expansion_id: XA,
      raid_date: '2026-09-01',
    })
    expect(res.status).toBe(500)
    expect(json.error).toBe('Internal server error')
    expect(tierLookups(calls)).toHaveLength(1)
    expect(eventInserts(calls)).toHaveLength(0)
  })

  it('B-8 (A2): a collision read error returns 500 with no insert', async () => {
    const fixture = baseFixture()
    fixture.errors = { 'raid_events:select': 'boom' }
    const { res, json, calls } = await run(fixture, {
      expansion_id: XA,
      raid_date: '2026-09-01',
    })
    expect(res.status).toBe(500)
    expect(json.error).toBe('Internal server error')
    expect(eventInserts(calls)).toHaveLength(0)
  })

  it('B-9: hasPermission false returns 403 with no expansions lookup', async () => {
    const { res, json, calls } = await run(baseFixture(), {
      expansion_id: XA,
      raid_date: '2026-09-01',
    }, false)
    expect(res.status).toBe(403)
    expect(json.error).toBe('Officers only')
    expect(expansionLookups(calls)).toHaveLength(0)
  })

  it('B-9: missing expansion_id keeps the required-fields 400', async () => {
    const { res, json } = await run(baseFixture(), {
      raid_date: '2026-09-01',
    })
    expect(res.status).toBe(400)
    expect(json.error).toBe('guild_id, expansion_id, and raid_date are required')
  })

  it('B-9: raid_date "2026-9-1" keeps the format 400', async () => {
    const { res, json } = await run(baseFixture(), {
      expansion_id: XA,
      raid_date: '2026-9-1',
    })
    expect(res.status).toBe(400)
    expect(json.error).toBe('raid_date must be YYYY-MM-DD')
  })

  it('B-9: an existing non-bonus event on that date for that team returns the existing 409', async () => {
    const fixture = baseFixture()
    fixture.raidEvents = [
      { id: 'existing-1', guild_id: GUILD_A, raid_date: '2026-09-01', raid_team_id: null, is_bonus: false },
    ]
    const { res, json } = await run(fixture, {
      expansion_id: XA,
      raid_date: '2026-09-01',
    })
    expect(res.status).toBe(409)
    expect(json.error).toBe('A scheduled raid already exists on this date for this team. Use that event instead.')
  })

  it('B-9: an insert error returns 500 with the database message', async () => {
    const fixture = baseFixture()
    fixture.errors = { 'raid_events:insert': 'db exploded' }
    const { res, json } = await run(fixture, {
      expansion_id: XA,
      raid_date: '2026-09-01',
    })
    expect(res.status).toBe(500)
    expect(json.error).toBe('db exploded')
  })
})
