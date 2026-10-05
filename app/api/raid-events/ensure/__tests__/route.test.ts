// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { revalidateGuildRaidEvents } from '@/lib/cache/dashboard-attendance'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/lib/cache/dashboard-attendance', () => ({ revalidateGuildRaidEvents: vi.fn() }))

// ─── Fixture ids (valid UUIDs) ──────────────────────────────

const GUILD_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const GUILD_B = 'aaaaaaaa-0000-0000-0000-000000000002'
const XA = 'bbbbbbbb-0000-0000-0000-000000000001'
const XB = 'bbbbbbbb-0000-0000-0000-000000000003'
const XDET = 'bbbbbbbb-0000-0000-0000-000000000004'
const UNKNOWN_EXPANSION_ID = 'bbbbbbbb-0000-0000-0000-000000000099'
const TMA = 'cccccccc-0000-0000-0000-000000000001'
const TMB = 'cccccccc-0000-0000-0000-000000000002'
const USER_ID = 'eeeeeeee-0000-0000-0000-000000000001'
const CHAR_A = 'ffffffff-0000-0000-0000-000000000001'
const TIER_XA_P2_ACTIVE = 'dddddddd-0000-0000-0000-000000000001'

const DATE_1 = '2026-09-01' // Tuesday
const DATE_2 = '2026-09-03' // Thursday

// ─── Recording fake client ──────────────────────────────────

type Op = 'select' | 'insert' | 'update' | 'delete'
type FilterKind = 'eq' | 'in' | 'is' | 'gte' | 'lte'
type Filter = [FilterKind, string, unknown]
interface SelectOptions { count?: string; head?: boolean }
interface Call {
  table: string
  op: Op
  filters: Filter[]
  selectCols?: string
  selectOptions?: SelectOptions
  payload?: unknown
}

interface ExpansionRow {
  id: string
  guild_id: string | null
  current_phase: number | null
  raid_days_per_week?: number | null
  first_raid_day?: number | null
  second_raid_day?: number | null
  third_raid_day?: number | null
  fourth_raid_day?: number | null
  fifth_raid_day?: number | null
}
interface RaidTeamRow { id: string; guild_id: string; raid_days_override: unknown; schedule_history: unknown }
interface RaidTierRow { id: string; expansion_id: string; phase: number; is_guild_active: boolean }
interface RaidEventRow { id: string; guild_id: string; raid_date: string; raid_team_id: string | null; raid_tier_id: string }
interface GuildSettingsRow {
  guild_id: string
  raid_days_per_week?: number | null
  first_raid_day?: number | null
  second_raid_day?: number | null
  third_raid_day?: number | null
  fourth_raid_day?: number | null
  fifth_raid_day?: number | null
}

interface Fixture {
  expansions: ExpansionRow[]
  raidTeams: RaidTeamRow[]
  raidTiers: RaidTierRow[]
  raidEvents: RaidEventRow[]
  guildSettings: GuildSettingsRow[]
  characters: { id: string; user_id: string }[]
  memberships: { character_id: string; guild_id: string; is_active: boolean }[]
  // Blanket error for every call to `${table}:${op}`.
  errors?: Partial<Record<string, string>>
}

function baseFixture(): Fixture {
  return {
    expansions: [
      {
        id: XA, guild_id: GUILD_A, current_phase: 2,
        raid_days_per_week: 2, first_raid_day: 2, second_raid_day: 4,
        third_raid_day: null, fourth_raid_day: null, fifth_raid_day: null,
      },
      { id: XB, guild_id: GUILD_B, current_phase: 2 },
      { id: XDET, guild_id: null, current_phase: 2 },
    ],
    raidTeams: [],
    raidTiers: [
      { id: TIER_XA_P2_ACTIVE, expansion_id: XA, phase: 2, is_guild_active: true },
    ],
    raidEvents: [],
    guildSettings: [
      {
        guild_id: GUILD_A,
        raid_days_per_week: 2, first_raid_day: 2, second_raid_day: 4,
        third_raid_day: null, fourth_raid_day: null, fifth_raid_day: null,
      },
    ],
    characters: [{ id: CHAR_A, user_id: USER_ID }],
    memberships: [{ character_id: CHAR_A, guild_id: GUILD_A, is_active: true }],
  }
}

const EXPANSION_REF_COLS = 'id, current_phase'
const SCHEDULE_COLS = 'raid_days_per_week, first_raid_day, second_raid_day, third_raid_day, fourth_raid_day, fifth_raid_day'
const TEAM_SCHEDULE_COLS = 'raid_days_override, schedule_history'

function makeClient(fixture: Fixture, calls: Call[]) {
  const raidEvents = fixture.raidEvents.map(r => ({ ...r }))
  let nextEventId = 1

  function resolveQuery(call: Call): { data: unknown; error: { message: string } | null; count?: number } {
    const key = `${call.table}:${call.op}`
    const configuredError = fixture.errors?.[key]
    if (configuredError) {
      return { data: null, error: { message: configuredError } }
    }

    if (call.table === 'characters' && call.op === 'select') {
      const userVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'user_id')?.[2]
      const matched = fixture.characters.filter(c => c.user_id === userVal)
      return { data: matched.map(c => ({ id: c.id })), error: null }
    }

    if (call.table === 'character_guild_memberships' && call.op === 'select') {
      const guildVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'guild_id')?.[2]
      const inIds = call.filters.find(f => f[0] === 'in' && f[1] === 'character_id')?.[2] as string[] | undefined
      const activeVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'is_active')?.[2]
      const matched = fixture.memberships.find(m =>
        m.guild_id === guildVal && (!inIds || inIds.includes(m.character_id)) &&
        (activeVal === undefined || m.is_active === activeVal)
      )
      return { data: matched ? { id: matched.character_id } : null, error: null }
    }

    if (call.table === 'raid_teams' && call.op === 'select' && call.selectOptions?.head) {
      const guildVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'guild_id')?.[2]
      const matchedCount = fixture.raidTeams.filter(t => t.guild_id === guildVal).length
      return { data: null, error: null, count: matchedCount }
    }

    if (call.table === 'raid_teams' && call.op === 'select' && call.selectCols === TEAM_SCHEDULE_COLS) {
      const idVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'id')?.[2]
      const guildVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'guild_id')?.[2]
      const matched = fixture.raidTeams.find(t => t.id === idVal && t.guild_id === guildVal)
      return {
        data: matched ? { raid_days_override: matched.raid_days_override, schedule_history: matched.schedule_history } : null,
        error: null,
      }
    }

    if (call.table === 'guild_settings' && call.op === 'select') {
      const guildVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'guild_id')?.[2]
      const matched = fixture.guildSettings.find(g => g.guild_id === guildVal)
      return { data: matched ?? null, error: null }
    }

    if (call.table === 'expansions' && call.op === 'select' && call.selectCols === EXPANSION_REF_COLS) {
      const idVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'id')?.[2]
      const guildVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'guild_id')?.[2]
      const matched = fixture.expansions.find(e => e.id === idVal && e.guild_id === guildVal)
      return { data: matched ? { id: matched.id, current_phase: matched.current_phase } : null, error: null }
    }

    if (call.table === 'expansions' && call.op === 'select' && call.selectCols === SCHEDULE_COLS) {
      const idVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'id')?.[2]
      const guildVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'guild_id')?.[2]
      const matched = fixture.expansions.find(e => e.id === idVal && e.guild_id === guildVal)
      return {
        data: matched
          ? {
              raid_days_per_week: matched.raid_days_per_week ?? null,
              first_raid_day: matched.first_raid_day ?? null,
              second_raid_day: matched.second_raid_day ?? null,
              third_raid_day: matched.third_raid_day ?? null,
              fourth_raid_day: matched.fourth_raid_day ?? null,
              fifth_raid_day: matched.fifth_raid_day ?? null,
            }
          : null,
        error: null,
      }
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
      const inDates = call.filters.find(f => f[0] === 'in' && f[1] === 'raid_date')?.[2] as string[] | undefined
      const teamVal = call.filters.find(f => f[0] === 'eq' && f[1] === 'raid_team_id')?.[2]
      const gteVal = call.filters.find(f => f[0] === 'gte' && f[1] === 'raid_date')?.[2] as string | undefined
      const lteVal = call.filters.find(f => f[0] === 'lte' && f[1] === 'raid_date')?.[2] as string | undefined
      let matched = raidEvents.filter(e => e.guild_id === guildVal)
      if (inDates) matched = matched.filter(e => inDates.includes(e.raid_date))
      if (teamVal !== undefined) matched = matched.filter(e => e.raid_team_id === teamVal)
      if (gteVal !== undefined) matched = matched.filter(e => e.raid_date >= gteVal)
      if (lteVal !== undefined) matched = matched.filter(e => e.raid_date <= lteVal)
      return { data: matched.map(e => ({ ...e })), error: null }
    }

    if (call.table === 'raid_events' && call.op === 'insert') {
      const payload = call.payload as Record<string, unknown>[]
      for (const row of payload) {
        raidEvents.push({
          id: `event-${nextEventId++}`,
          guild_id: row.guild_id as string,
          raid_date: row.raid_date as string,
          raid_team_id: (row.raid_team_id as string | null) ?? null,
          raid_tier_id: row.raid_tier_id as string,
        })
      }
      return { data: null, error: null }
    }

    return { data: null, error: null }
  }

  const client = {
    from(table: string) {
      const call: Call = { table, op: 'select', filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: (cols?: string, options?: SelectOptions) => { call.selectCols = cols; call.selectOptions = options; return builder },
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
  return new Request('http://localhost/api/raid-events/ensure', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

async function run(fixture: Fixture, body: Record<string, unknown>, authed = true) {
  const calls: Call[] = []
  const { client } = makeClient(fixture, calls)
  vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceRoleClient>)
  if (authed) {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: USER_ID }, error: null } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>)
  } else {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: null, error: { message: 'no session' } } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>)
  }
  const res = await POST(request({ guild_id: GUILD_A, ...body }))
  const json = await res.json()
  return { res, json, calls }
}

const expansionRefLookups = (calls: Call[]) => calls.filter(c => c.table === 'expansions' && c.op === 'select' && c.selectCols === EXPANSION_REF_COLS)
const teamCountLookups = (calls: Call[]) => calls.filter(c => c.table === 'raid_teams' && c.op === 'select' && c.selectOptions?.head)
const tierLookups = (calls: Call[]) => calls.filter(c => c.table === 'raid_tiers' && c.op === 'select')
const existingEventReads = (calls: Call[]) => calls.filter(c => c.table === 'raid_events' && c.op === 'select' && c.filters.some(f => f[0] === 'in'))
const eventInserts = (calls: Call[]) => calls.filter(c => c.table === 'raid_events' && c.op === 'insert')
const membershipLookups = (calls: Call[]) => calls.filter(c => c.table === 'character_guild_memberships' && c.op === 'select')

describe('POST /api/raid-events/ensure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('E-1: happy path, no teams, creates two events with the XA phase 2 active tier', async () => {
    const { res, json, calls } = await run(baseFixture(), {
      dates: [DATE_1, DATE_2],
      expansion_id: XA,
    })
    expect(res.status).toBe(200)
    expect(Array.isArray(json.events)).toBe(true)

    const expLookups = expansionRefLookups(calls)
    expect(expLookups).toHaveLength(1)
    expect(expLookups[0].filters).toEqual(expect.arrayContaining([
      ['eq', 'id', XA],
      ['eq', 'guild_id', GUILD_A],
    ]))

    const inserts = eventInserts(calls)
    expect(inserts).toHaveLength(1)
    const rows = inserts[0].payload as Record<string, unknown>[]
    expect(rows).toHaveLength(2)
    for (const row of rows) {
      expect(row.guild_id).toBe(GUILD_A)
      expect(row.raid_tier_id).toBe(TIER_XA_P2_ACTIVE)
      expect(row.raid_team_id).toBeNull()
      expect(row.notes).toBeNull()
      expect(row.is_skipped).toBe(false)
      expect(row.skip_reason).toBeNull()
    }
    expect(revalidateGuildRaidEvents).toHaveBeenCalledWith(GUILD_A)

    // expansion check happens after membership, before the team count
    const membershipIndex = calls.indexOf(membershipLookups(calls)[0])
    const expIndex = calls.indexOf(expLookups[0])
    const teamCountIndex = calls.indexOf(teamCountLookups(calls)[0])
    expect(membershipIndex).toBeLessThan(expIndex)
    expect(expIndex).toBeLessThan(teamCountIndex)
  })

  it("E-2 (OD-1 A): another guild's expansion gives 400 C-1 with no team count, no events read, no insert", async () => {
    const { res, json, calls } = await run(baseFixture(), {
      dates: [DATE_1, DATE_2],
      expansion_id: XB,
    })
    expect(res.status).toBe(400)
    expect(json.error).toBe("This expansion isn't in this guild. Refresh the page, then try again.")
    expect(teamCountLookups(calls)).toHaveLength(0)
    expect(existingEventReads(calls)).toHaveLength(0)
    expect(eventInserts(calls)).toHaveLength(0)
  })

  it('E-2 (OD-1 A, detached expansion): guild_id null gives the same 400', async () => {
    const { res, json, calls } = await run(baseFixture(), {
      dates: [DATE_1, DATE_2],
      expansion_id: XDET,
    })
    expect(res.status).toBe(400)
    expect(json.error).toBe("This expansion isn't in this guild. Refresh the page, then try again.")
    expect(eventInserts(calls)).toHaveLength(0)
  })

  it('E-2 (OD-1 A): an unknown expansion UUID gives 400 C-1', async () => {
    const { res, json, calls } = await run(baseFixture(), {
      dates: [DATE_1, DATE_2],
      expansion_id: UNKNOWN_EXPANSION_ID,
    })
    expect(res.status).toBe(400)
    expect(json.error).toBe("This expansion isn't in this guild. Refresh the page, then try again.")
    expect(eventInserts(calls)).toHaveLength(0)
  })

  it("E-2 (OD-1 A): a malformed expansion_id ('abc') gives 400 C-1 with no expansions lookup", async () => {
    const { res, json, calls } = await run(baseFixture(), {
      dates: [DATE_1, DATE_2],
      expansion_id: 'abc',
    })
    expect(res.status).toBe(400)
    expect(json.error).toBe("This expansion isn't in this guild. Refresh the page, then try again.")
    expect(expansionRefLookups(calls)).toHaveLength(0)
  })

  it('E-3: expansion_id absent makes no expansions lookup and no insert, returns 200', async () => {
    const { res, json, calls } = await run(baseFixture(), {
      dates: [DATE_1, DATE_2],
    })
    expect(res.status).toBe(200)
    expect(Array.isArray(json.events)).toBe(true)
    expect(expansionRefLookups(calls)).toHaveLength(0)
    expect(eventInserts(calls)).toHaveLength(0)
  })

  it("E-3: expansion_id '' makes no expansions lookup and no insert, returns 200", async () => {
    const { res, json, calls } = await run(baseFixture(), {
      dates: [DATE_1, DATE_2],
      expansion_id: '',
    })
    expect(res.status).toBe(200)
    expect(Array.isArray(json.events)).toBe(true)
    expect(expansionRefLookups(calls)).toHaveLength(0)
    expect(eventInserts(calls)).toHaveLength(0)
  })

  it('E-4: every date already present makes one expansions lookup, no raid_tiers lookup, no insert', async () => {
    const fixture = baseFixture()
    fixture.raidEvents = [
      { id: 'existing-1', guild_id: GUILD_A, raid_date: DATE_1, raid_team_id: null, raid_tier_id: TIER_XA_P2_ACTIVE },
      { id: 'existing-2', guild_id: GUILD_A, raid_date: DATE_2, raid_team_id: null, raid_tier_id: TIER_XA_P2_ACTIVE },
    ]
    const { res, json, calls } = await run(fixture, {
      dates: [DATE_1, DATE_2],
      expansion_id: XA,
    })
    expect(res.status).toBe(200)
    expect(Array.isArray(json.events)).toBe(true)
    expect(expansionRefLookups(calls)).toHaveLength(1)
    expect(tierLookups(calls)).toHaveLength(0)
    expect(eventInserts(calls)).toHaveLength(0)
  })

  it('E-5: raid_team_id TMA in a team guild inserts rows with raid_team_id TMA, checked against the guild', async () => {
    const fixture = baseFixture()
    fixture.raidTeams = [
      { id: TMA, guild_id: GUILD_A, raid_days_override: null, schedule_history: null },
      { id: TMB, guild_id: GUILD_B, raid_days_override: null, schedule_history: null },
    ]
    const { res, json, calls } = await run(fixture, {
      dates: [DATE_1, DATE_2],
      expansion_id: XA,
      raid_team_id: TMA,
    })
    expect(res.status).toBe(200)
    expect(Array.isArray(json.events)).toBe(true)

    const inserts = eventInserts(calls)
    expect(inserts).toHaveLength(1)
    const rows = inserts[0].payload as Record<string, unknown>[]
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.raid_team_id).toBe(TMA)
    }

    const teamScheduleLookups = calls.filter(c => c.table === 'raid_teams' && c.selectCols === TEAM_SCHEDULE_COLS)
    expect(teamScheduleLookups).toHaveLength(1)
    expect(teamScheduleLookups[0].filters).toEqual(expect.arrayContaining([
      ['eq', 'id', TMA],
      ['eq', 'guild_id', GUILD_A],
    ]))
  })

  it("E-5: raid_team_id TMB (another guild's team) returns the existing 404 with no insert", async () => {
    const fixture = baseFixture()
    fixture.raidTeams = [
      { id: TMA, guild_id: GUILD_A, raid_days_override: null, schedule_history: null },
      { id: TMB, guild_id: GUILD_B, raid_days_override: null, schedule_history: null },
    ]
    const { res, json, calls } = await run(fixture, {
      dates: [DATE_1, DATE_2],
      expansion_id: XA,
      raid_team_id: TMB,
    })
    expect(res.status).toBe(404)
    expect(json.error).toBe('Raid team not found in this guild')
    expect(eventInserts(calls)).toHaveLength(0)
  })

  it('E-5: a guild with teams and no raid_team_id makes no insert', async () => {
    const fixture = baseFixture()
    fixture.raidTeams = [
      { id: TMA, guild_id: GUILD_A, raid_days_override: null, schedule_history: null },
    ]
    const { res, json, calls } = await run(fixture, {
      dates: [DATE_1, DATE_2],
      expansion_id: XA,
    })
    expect(res.status).toBe(200)
    expect(Array.isArray(json.events)).toBe(true)
    expect(eventInserts(calls)).toHaveLength(0)
  })

  it('E-6 (OD-1 A): an expansions lookup error gives 500 with no insert', async () => {
    const fixture = baseFixture()
    fixture.errors = { 'expansions:select': 'boom' }
    const { res, json, calls } = await run(fixture, {
      dates: [DATE_1, DATE_2],
      expansion_id: XA,
    })
    expect(res.status).toBe(500)
    expect(json.error).toBe('Internal server error')
    expect(eventInserts(calls)).toHaveLength(0)
  })

  it('E-6 (OD-1 A, A1): a team-count lookup error gives 500 with no insert', async () => {
    const fixture = baseFixture()
    fixture.errors = { 'raid_teams:select': 'boom' }
    const { res, json, calls } = await run(fixture, {
      dates: [DATE_1, DATE_2],
      expansion_id: XA,
    })
    expect(res.status).toBe(500)
    expect(json.error).toBe('Internal server error')
    expect(eventInserts(calls)).toHaveLength(0)
  })

  it('E-6 (OD-1 A): a raid_tiers lookup error gives 500 with no insert, after exactly one raid_tiers call', async () => {
    const fixture = baseFixture()
    fixture.errors = { 'raid_tiers:select': 'boom' }
    const { res, json, calls } = await run(fixture, {
      dates: [DATE_1, DATE_2],
      expansion_id: XA,
    })
    expect(res.status).toBe(500)
    expect(json.error).toBe('Internal server error')
    expect(tierLookups(calls)).toHaveLength(1)
    expect(eventInserts(calls)).toHaveLength(0)
  })

  it('E-7: with no XA tier there is no insert, and the response is 200 { events }', async () => {
    const fixture = baseFixture()
    fixture.raidTiers = []
    const { res, json, calls } = await run(fixture, {
      dates: [DATE_1, DATE_2],
      expansion_id: XA,
    })
    expect(res.status).toBe(200)
    expect(Array.isArray(json.events)).toBe(true)
    expect(eventInserts(calls)).toHaveLength(0)
    expect(console.error).toHaveBeenCalledWith('No raid tier found for expansion:', expect.objectContaining({ expansion_id: XA }))
  })

  it('E-8: no authenticated user gives 401 Unauthorized', async () => {
    const { res, json } = await run(baseFixture(), {
      dates: [DATE_1, DATE_2],
      expansion_id: XA,
    }, false)
    expect(res.status).toBe(401)
    expect(json.error).toBe('Unauthorized')
  })

  it('E-8: a user with no characters gives 403 "No characters found"', async () => {
    const fixture = baseFixture()
    fixture.characters = []
    const { res, json } = await run(fixture, {
      dates: [DATE_1, DATE_2],
      expansion_id: XA,
    })
    expect(res.status).toBe(403)
    expect(json.error).toBe('No characters found')
  })

  it('E-8: a user with no active membership in A gives 403 with no expansions lookup', async () => {
    const fixture = baseFixture()
    fixture.memberships = []
    const { res, json, calls } = await run(fixture, {
      dates: [DATE_1, DATE_2],
      expansion_id: XA,
    })
    expect(res.status).toBe(403)
    expect(json.error).toBe('Not a member of this guild')
    expect(expansionRefLookups(calls)).toHaveLength(0)
  })

  it('E-8: an empty dates array keeps "guild_id and dates are required"', async () => {
    const { res, json } = await run(baseFixture(), {
      dates: [],
      expansion_id: XA,
    })
    expect(res.status).toBe(400)
    expect(json.error).toBe('guild_id and dates are required')
  })
})
