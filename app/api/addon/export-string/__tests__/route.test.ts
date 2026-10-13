// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { inflateRawSync } from 'zlib'
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { trackApiError } from '@/utils/analytics/server'
import { FACTION_ITEM_ALIASES } from '@/domain/loot/faction-item-aliases'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyOfficerPermissions: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), trackApiError: vi.fn() }))

type Filter = [string, unknown]
type Order = { col: string; ascending: boolean }
type Call = { table: string; cols: string; filters: Filter[]; orders: Order[]; range?: [number, number] }

/** PostgREST's max_rows (supabase/config.toml): a read returns at most this many rows however it is asked. */
const MAX_ROWS = 1000

interface LootItemRow {
  id: string
  name: string
  wowhead_id: number
  boss_name: string
  item_slot: string
  item_type: string | null
  classification: string
  raid_tier_id: string
}

interface RaidTierRow {
  id: string
  name: string
  phase: number
  expansion_id: string
  loot_items: LootItemRow[]
}

interface CharacterRow {
  id: string
  name: string
  user_id: string
  wow_classes: { name: string; color_hex: string }
  spec: { id: string; name: string; role: string } | null
}

interface MembershipRow {
  guild_id: string
  character_id: string
  role: string
  membership_status: string
  is_active: boolean
  characters: CharacterRow
}

interface LootSubmissionRow {
  id: string
  guild_id: string
  character_id: string
  phase: number
  status: string
  expansion_id?: string | null
  loot_submission_items: Array<{
    loot_item_id: string
    rank: number
    slot?: number
    removed_at?: string | null
    loot_items: { wowhead_id: number }
  }>
}

interface Fixture {
  guilds: Array<{ id: string; name: string; active_expansion_id: string | null }>
  guild_settings: Array<{ guild_id: string }>
  expansions: Array<{ id: string; name: string; current_phase: number }>
  raid_tiers: RaidTierRow[]
  character_guild_memberships: MembershipRow[]
  loot_items: LootItemRow[]
  loot_submissions: LootSubmissionRow[]
  blp_tracking: Array<{ guild_id: string; character_id: string; loot_item_id: string; times_passed: number }>
  raid_events: Array<{ guild_id: string; id: string; raid_date: string; raid_team_id: string | null; is_bonus: boolean }>
  guild_item_priorities: Array<{
    guild_id: string
    raid_tier_id: string
    item_id: string
    role_priorities?: unknown
    class_priorities?: unknown
    character_priorities?: unknown
    priority_bonuses?: unknown
  }>
  attendance_records: Array<{ raid_event_id: string; character_id: string }>
  raid_team_members: Array<{ guild_id: string; character_id: string; raid_team_id: string }>
  /** FU-C of 261001-tv5: awards read for the receive skip. */
  loot_history?: Array<{ guild_id: string; character_id: string | null; loot_item: { wowhead_id: number } | null }>
  lootHistoryError?: boolean
  /** GH #326: simulates a failed character_guild_memberships read. */
  membershipsError?: boolean
}

/** Every table export-string may read. The fake throws for anything else, so a misspelled or nonexistent table fails the tests. */
const ALLOWED_TABLES = [
  'guilds',
  'guild_settings',
  'expansions',
  'raid_tiers',
  'loot_items',
  'character_guild_memberships',
  'loot_submissions',
  'guild_item_priorities',
  'blp_tracking',
  'raid_events',
  'attendance_records',
  'raid_team_members',
  'loot_history',
]

function emptyFixture(): Fixture {
  return {
    guilds: [],
    guild_settings: [],
    expansions: [],
    raid_tiers: [],
    character_guild_memberships: [],
    loot_items: [],
    loot_submissions: [],
    blp_tracking: [],
    raid_events: [],
    guild_item_priorities: [],
    attendance_records: [],
    raid_team_members: [],
  }
}

function resolveRows(table: string, filters: Filter[], fixture: Fixture): unknown[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (fixture as any)[table] ?? []
  const find = (col: string) => filters.find(f => f[0] === col)?.[1]
  switch (table) {
    case 'guilds':
      return rows.filter((r: { id: string }) => r.id === find('id'))
    case 'guild_settings':
      return rows.filter((r: { guild_id: string }) => r.guild_id === find('guild_id'))
    case 'expansions':
      return rows.filter((r: { id: string }) => r.id === find('id'))
    case 'raid_tiers':
      return rows.filter((r: { expansion_id: string }) => r.expansion_id === find('expansion_id'))
    case 'character_guild_memberships': {
      const isActiveFilter = filters.find(f => f[0] === 'is_active')
      return rows.filter((r: { guild_id: string; is_active?: boolean }) => {
        if (r.guild_id !== find('guild_id')) return false
        if (isActiveFilter && r.is_active !== isActiveFilter[1]) return false
        return true
      })
    }
    case 'loot_items': {
      const val = find('raid_tier_id')
      if (Array.isArray(val)) return rows.filter((r: { raid_tier_id: string }) => val.includes(r.raid_tier_id))
      return rows.filter((r: { raid_tier_id: string }) => r.raid_tier_id === val)
    }
    case 'loot_submissions':
      return rows.filter((r: { guild_id: string }) => r.guild_id === find('guild_id'))
    case 'blp_tracking':
      return rows.filter((r: { guild_id: string }) => r.guild_id === find('guild_id'))
    case 'raid_events':
      return rows.filter((r: { guild_id: string }) => r.guild_id === find('guild_id'))
    case 'guild_item_priorities': {
      const tierIds = (find('raid_tier_id') as string[]) ?? []
      return rows.filter(
        (r: { guild_id: string; raid_tier_id: string }) => r.guild_id === find('guild_id') && tierIds.includes(r.raid_tier_id),
      )
    }
    case 'attendance_records': {
      const ids = (find('raid_event_id') as string[]) ?? []
      return rows.filter((r: { raid_event_id: string }) => ids.includes(r.raid_event_id))
    }
    case 'raid_team_members':
      return rows.filter((r: { guild_id: string }) => r.guild_id === find('guild_id'))
    case 'loot_history':
      return rows.filter((r: { guild_id: string }) => r.guild_id === find('guild_id'))
    default:
      throw new Error(`fake client: unknown table ${table}`)
  }
}

/**
 * Recording fake matching the export-string query sequence. options.fail lists
 * tables whose reads resolve { data: null, error } (then, range, single and
 * maybeSingle alike). options.rpc replaces the get_guild_expansions result.
 * Querying a table outside ALLOWED_TABLES throws.
 */
function makeClient(
  fixture: Fixture,
  options?: { fail?: string[]; rpc?: { data: unknown; error: { message: string } | null } },
) {
  const calls: Call[] = []
  const failing = (table: string) => (options?.fail ?? []).includes(table)
  const failure = () => ({ data: null, error: { message: 'boom' } })
  const client = {
    from(table: string) {
      if (!ALLOWED_TABLES.includes(table)) throw new Error(`fake client: unknown table ${table}`)
      const call: Call = { table, cols: '', filters: [], orders: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: (cols: string) => { call.cols = cols; return builder },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        order: (col: string, opts?: { ascending?: boolean }) => {
          call.orders.push({ col, ascending: opts?.ascending ?? true })
          return builder
        },
        lte: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        limit: () => builder,
        range: (from: number, to: number) => {
          call.range = [from, to]
          if (failing(table)) return Promise.resolve(failure())
          if (table === 'loot_history' && fixture.lootHistoryError) {
            return Promise.resolve({ data: null, error: { message: 'history boom' } })
          }
          // Like the server, a window never returns more than MAX_ROWS rows.
          const rows = resolveRows(table, call.filters, fixture).slice(from, Math.min(to + 1, from + MAX_ROWS))
          return Promise.resolve({ data: rows, error: null })
        },
        single: () => {
          if (failing(table)) return Promise.resolve(failure())
          const rows = resolveRows(table, call.filters, fixture)
          return Promise.resolve({ data: rows[0] ?? null, error: null })
        },
        maybeSingle: () => {
          if (failing(table)) return Promise.resolve(failure())
          const rows = resolveRows(table, call.filters, fixture)
          return Promise.resolve({ data: rows[0] ?? null, error: null })
        },
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
          if (failing(table)) return Promise.resolve(failure()).then(resolve, reject)
          if (table === 'character_guild_memberships' && fixture.membershipsError) {
            return Promise.resolve({ data: null, error: { message: 'cgm boom' } }).then(resolve, reject)
          }
          // An unranged read is cut at MAX_ROWS, as on the server, so a route
          // that forgets to page a large table fails its test instead of passing.
          const rows = resolveRows(table, call.filters, fixture).slice(0, MAX_ROWS)
          return Promise.resolve({ data: rows, error: null, count: rows.length }).then(resolve, reject)
        },
      }
      return builder
    },
    rpc: () => Promise.resolve(options?.rpc ?? { data: [], error: null }),
  }
  return { client, calls }
}

const GUILD_ID = 'g1'

/** A guild whose catalog holds one Alliance row per FACTION_ITEM_ALIASES pair, plus one unrelated item. */
function baseFixture(): Fixture {
  const fixture = emptyFixture()
  const onyItem: LootItemRow = { id: 'li-ony', name: 'Head of Onyxia', wowhead_id: 18423, boss_name: 'Onyxia', item_slot: 'Quest', item_type: null, classification: 'quest', raid_tier_id: 'tier-ony' }
  const nefItem: LootItemRow = { id: 'li-nef', name: 'Head of Nefarian', wowhead_id: 19003, boss_name: 'Nefarian', item_slot: 'Quest', item_type: null, classification: 'quest', raid_tier_id: 'tier-bwl' }
  const unrelatedItem: LootItemRow = { id: 'li-unrelated', name: 'Unrelated Item', wowhead_id: 16921, boss_name: 'Some Boss', item_slot: 'Trinket', item_type: 'trinket', classification: 'boe', raid_tier_id: 'tier-bwl' }

  fixture.guilds = [{ id: GUILD_ID, name: 'Test Guild', active_expansion_id: 'exp-1' }]
  fixture.expansions = [{ id: 'exp-1', name: 'Classic', current_phase: 3 }]
  fixture.raid_tiers = [
    { id: 'tier-ony', name: "Onyxia's Lair", phase: 1, expansion_id: 'exp-1', loot_items: [onyItem] },
    { id: 'tier-bwl', name: 'Blackwing Lair', phase: 4, expansion_id: 'exp-1', loot_items: [nefItem, unrelatedItem] },
  ]
  fixture.loot_items = [onyItem, nefItem, unrelatedItem]
  fixture.character_guild_memberships = [
    {
      guild_id: GUILD_ID,
      character_id: 'c1',
      role: 'raider',
      membership_status: 'full',
      is_active: true,
      characters: {
        id: 'c1',
        name: 'Thrall',
        user_id: 'user-1',
        wow_classes: { name: 'Shaman', color_hex: '#0070DE' },
        spec: null,
      },
    },
  ]
  fixture.loot_submissions = [
    {
      id: 's1',
      guild_id: GUILD_ID,
      character_id: 'c1',
      phase: 4,
      status: 'approved',
      expansion_id: 'exp-1',
      loot_submission_items: [
        { loot_item_id: 'li-nef', rank: 12, loot_items: { wowhead_id: 19003 } },
        { loot_item_id: 'li-ony', rank: 7, loot_items: { wowhead_id: 18423 } },
        { loot_item_id: 'li-unrelated', rank: 3, loot_items: { wowhead_id: 16921 } },
      ],
    },
  ]
  return fixture
}

/** GH #355: c1's approved lists across expansions (s1 is phase 4 in exp-1). */
function addListsAcrossExpansions(fixture: Fixture) {
  fixture.loot_submissions.push(
    {
      id: 's2', guild_id: GUILD_ID, character_id: 'c1', phase: 3, status: 'approved', expansion_id: 'exp-1',
      loot_submission_items: [
        { loot_item_id: 'li-bindings', rank: 40, loot_items: { wowhead_id: 20928 } },
        { loot_item_id: 'li-ony', rank: 9, loot_items: { wowhead_id: 18423 } },
      ],
    },
    {
      id: 's3', guild_id: GUILD_ID, character_id: 'c1', phase: 4, status: 'approved', expansion_id: 'exp-2',
      loot_submission_items: [{ loot_item_id: 'li-other', rank: 60, loot_items: { wowhead_id: 99999 } }],
    },
    {
      id: 's4', guild_id: GUILD_ID, character_id: 'c1', phase: 2, status: 'approved', expansion_id: null,
      loot_submission_items: [{ loot_item_id: 'li-legacy', rank: 2, loot_items: { wowhead_id: 21000 } }],
    },
  )
}

function request(query = `guild_id=${GUILD_ID}`) {
  return new NextRequest(`http://localhost/api/addon/export-string?${query}`)
}

function decodePayload(exportString: string) {
  const b64 = exportString.replace(/^LLP1:1:/, '')
  const compressed = Buffer.from(b64, 'base64')
  const json = inflateRawSync(compressed).toString('utf-8')
  return JSON.parse(json)
}

describe('GET /api/addon/export-string (GH #290, faction-variant mirroring)', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'u1' }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true } as never)
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
  })

  it('mirrors every FACTION_ITEM_ALIASES pair into payload.items and payload.members[].items', async () => {
    // The fixture must cover every known alias pair, or this test would pass
    // vacuously if a future pair were added without updating it.
    const fixtureWowheadIds = new Set(baseFixture().loot_items.map(i => i.wowhead_id))
    for (const allianceId of Object.values(FACTION_ITEM_ALIASES)) {
      expect(fixtureWowheadIds.has(allianceId), `fixture must cover alliance id ${allianceId}`).toBe(true)
    }
    expect(Object.keys(FACTION_ITEM_ALIASES)).toHaveLength(2)

    const { client } = makeClient(baseFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(200)

    const payload = decodePayload(body.exportString)
    expect(payload.items).toHaveLength(5)

    for (const [hordeStr, allianceId] of Object.entries(FACTION_ITEM_ALIASES)) {
      const hordeId = Number(hordeStr)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allianceItem = payload.items.find((i: any) => i.wowhead_id === allianceId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hordeItem = payload.items.find((i: any) => i.wowhead_id === hordeId)
      expect(allianceItem, `expected alliance item ${allianceId}`).toBeDefined()
      expect(hordeItem, `expected mirrored horde item ${hordeId}`).toBeDefined()
      expect(hordeItem).toEqual({ ...allianceItem, wowhead_id: hordeId })

      const member = payload.members[0]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allianceRank = member.items.find((i: any) => i.wowhead_id === allianceId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hordeRank = member.items.find((i: any) => i.wowhead_id === hordeId)
      expect(allianceRank).toBeDefined()
      expect(hordeRank).toEqual({ wowhead_id: hordeId, rank: allianceRank.rank })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(payload.items.filter((i: any) => i.wowhead_id === 16921)).toHaveLength(1)
    const member = payload.members[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(member.items.filter((i: any) => i.wowhead_id === 16921)).toHaveLength(1)

    // stats.items reports the catalog row count (3), not the mirrored count (5).
    expect(body.stats.items).toBe(3)
  })

  it('exact rows win: a guild that already holds both faction ids gets one entry per id, no mirror', async () => {
    const fixture = baseFixture()
    const nefHordeItem: LootItemRow = { id: 'li-nef-horde', name: 'Head of Nefarian', wowhead_id: 19002, boss_name: 'Nefarian', item_slot: 'Quest', item_type: null, classification: 'quest', raid_tier_id: 'tier-bwl' }
    fixture.loot_items.push(nefHordeItem)
    const bwlTier = fixture.raid_tiers.find(t => t.id === 'tier-bwl')!
    bwlTier.loot_items = [...bwlTier.loot_items, nefHordeItem]

    const { client } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request())
    const body = await res.json()
    const payload = decodePayload(body.exportString)

    expect(res.status).toBe(200)
    expect(payload.items).toHaveLength(5)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nefItems = payload.items.filter((i: any) => i.wowhead_id === 19003 || i.wowhead_id === 19002)
    expect(nefItems).toHaveLength(2)
    expect(nefItems.find((i: { id: string }) => i.id === 'li-nef')).toBeDefined()
    expect(nefItems.find((i: { id: string }) => i.id === 'li-nef-horde')).toBeDefined()
    // stats.items reports the catalog row count (4), still not the mirrored count.
    expect(body.stats.items).toBe(4)
  })
})

describe('FU-3 of #331, #293 and FU-C of 261001-tv5: member items', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'u1' }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true } as never)
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function memberItems(fixture: Fixture) {
    const { client, calls } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    const res = await GET(request())
    const body = await res.json()
    return { res, body, items: decodePayload(body.exportString).members[0].items as Array<{ wowhead_id: number; rank: number }>, calls }
  }

  it('E1 a removed list row is left out of members[].items', async () => {
    const fixture = baseFixture()
    fixture.loot_submissions[0].loot_submission_items[2].removed_at = '2026-09-21T10:00:00Z'
    const { res, items } = await memberItems(fixture)
    expect(res.status).toBe(200)
    expect(items.some(i => i.wowhead_id === 16921)).toBe(false)
    expect(items.some(i => i.wowhead_id === 19003)).toBe(true)
  })

  it('E2 a raider listed for 20928 at ranks 50 and 30 with one award of it gets only the 30 entry', async () => {
    const fixture = baseFixture()
    fixture.loot_submissions[0].loot_submission_items.push(
      { loot_item_id: 'li-bindings', rank: 50, slot: 1, loot_items: { wowhead_id: 20928 } },
      { loot_item_id: 'li-bindings', rank: 30, slot: 2, loot_items: { wowhead_id: 20928 } },
    )
    fixture.loot_history = [{ guild_id: GUILD_ID, character_id: 'c1', loot_item: { wowhead_id: 20928 } }]
    const { res, items } = await memberItems(fixture)
    expect(res.status).toBe(200)
    expect(items.filter(i => i.wowhead_id === 20928)).toEqual([{ wowhead_id: 20928, rank: 30 }])
  })

  it('E3 the loot_history read is filtered by the request guild_id', async () => {
    const fixture = baseFixture()
    fixture.loot_submissions[0].loot_submission_items.push(
      { loot_item_id: 'li-bindings', rank: 50, slot: 1, loot_items: { wowhead_id: 20928 } },
    )
    // Another guild's award of the same item to a character with the same id is ignored.
    fixture.loot_history = [{ guild_id: 'other-guild', character_id: 'c1', loot_item: { wowhead_id: 20928 } }]
    const { items, calls } = await memberItems(fixture)
    const historyCalls = calls.filter(c => c.table === 'loot_history')
    expect(historyCalls).toHaveLength(1)
    expect(historyCalls[0].filters).toEqual([['guild_id', GUILD_ID]])
    expect(historyCalls[0].range).toEqual([0, 999])
    expect(items.filter(i => i.wowhead_id === 20928)).toEqual([{ wowhead_id: 20928, rank: 50 }])
  })

  it('E4 a loot_history error answers 500, tracks the error and returns no exportString (owner decision 8)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(trackApiError).mockClear()
    const fixture = baseFixture()
    fixture.loot_submissions[0].loot_submission_items.push(
      { loot_item_id: 'li-bindings', rank: 50, slot: 1, loot_items: { wowhead_id: 20928 } },
      { loot_item_id: 'li-bindings', rank: 30, slot: 2, loot_items: { wowhead_id: 20928 } },
    )
    fixture.loot_history = [{ guild_id: GUILD_ID, character_id: 'c1', loot_item: { wowhead_id: 20928 } }]
    fixture.lootHistoryError = true
    const { client } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body).toEqual({ error: 'Internal server error' })
    expect(body.exportString).toBeUndefined()
    expect(trackApiError).toHaveBeenCalledTimes(1)
  })

  it('E1b selects slot and removed_at and sends each raider\'s ranks best last', async () => {
    const { items, calls } = await memberItems(baseFixture())
    // Ranks 12 (19003, mirrored to 19002), 7 (18423, mirrored to 18422), 3 (16921).
    expect(items).toEqual([
      { wowhead_id: 16921, rank: 3 },
      { wowhead_id: 18423, rank: 7 },
      { wowhead_id: 18422, rank: 7 },
      { wowhead_id: 19003, rank: 12 },
      { wowhead_id: 19002, rank: 12 },
    ])
    const subCols = calls.find(c => c.table === 'loot_submissions' && c.cols.includes('loot_submission_items'))!.cols
    expect(subCols).toMatch(/slot/)
    expect(subCols).toMatch(/removed_at/)
    expect(subCols).toMatch(/expansion_id/)
  })

  it('E5 merges the active expansion\'s lists, keeps null-expansion lists, and leaves other expansions out (GH #355)', async () => {
    const fixture = baseFixture()
    addListsAcrossExpansions(fixture)
    const { res, body, items, calls } = await memberItems(fixture)
    expect(res.status).toBe(200)
    expect(items).toContainEqual({ wowhead_id: 20928, rank: 40 })
    expect(items).toContainEqual({ wowhead_id: 21000, rank: 2 })
    expect(items).toContainEqual({ wowhead_id: 16921, rank: 3 })
    expect(items).toContainEqual({ wowhead_id: 19003, rank: 12 })
    expect(items.filter(i => i.wowhead_id === 18423)).toEqual([{ wowhead_id: 18423, rank: 9 }])
    expect(items.some(i => i.wowhead_id === 99999)).toBe(false)
    // The scope lives in code, so a null expansion_id row is not dropped by SQL.
    const subCall = calls.find(c => c.table === 'loot_submissions')!
    expect(subCall.filters).toEqual([['guild_id', 'g1'], ['status', 'approved']])
    expect(body.stats.submissions).toBe(3)
  })

  it('E6 a guild with no active expansion keeps every approved list (GH #355)', async () => {
    const fixture = baseFixture()
    fixture.guilds[0].active_expansion_id = null
    addListsAcrossExpansions(fixture)
    const { items, body } = await memberItems(fixture)
    expect(items).toContainEqual({ wowhead_id: 99999, rank: 60 })
    expect(body.stats.submissions).toBe(4)
  })
})

describe('GH #326: export members come from active memberships only', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'u1' }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true } as never)
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** Adds a second character, c2, with an approved list ranking li-unrelated. */
  function addSecondMember(fixture: Fixture, membershipOverrides: Partial<MembershipRow> = {}): Fixture {
    fixture.character_guild_memberships.push({
      guild_id: GUILD_ID,
      character_id: 'c2',
      role: 'raider',
      membership_status: 'inactive',
      is_active: false,
      characters: {
        id: 'c2',
        name: 'Jaina',
        user_id: 'user-2',
        wow_classes: { name: 'Mage', color_hex: '#69CCF0' },
        spec: null,
      },
      ...membershipOverrides,
    })
    fixture.loot_submissions.push({
      id: 's2',
      guild_id: GUILD_ID,
      character_id: 'c2',
      phase: 4,
      status: 'approved',
      loot_submission_items: [
        { loot_item_id: 'li-unrelated', rank: 5, loot_items: { wowhead_id: 16921 } },
      ],
    })
    return fixture
  }

  it('X1: an inactive member (c2) has no member entry or items in the export', async () => {
    const fixture = addSecondMember(baseFixture())
    const { client } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(200)

    const payload = decodePayload(body.exportString)
    expect(payload.members.map((m: { character_id: string }) => m.character_id)).toEqual(['c1'])
  })

  it('X2: stats.submissions counts only c1\'s approved list, and stats.members is 1', async () => {
    const fixture = addSecondMember(baseFixture())
    const { client } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.stats.submissions).toBe(1)
    expect(body.stats.members).toBe(1)
  })

  it('X3: a guild whose only membership row is inactive exports no members, no submissions, and derives nothing from draft or rejected lists', async () => {
    const fixture = emptyFixture()
    fixture.guilds = [{ id: GUILD_ID, name: 'Test Guild', active_expansion_id: 'exp-1' }]
    fixture.expansions = [{ id: 'exp-1', name: 'Classic', current_phase: 3 }]
    fixture.character_guild_memberships = [
      {
        guild_id: GUILD_ID,
        character_id: 'c1',
        role: 'raider',
        membership_status: 'inactive',
        is_active: false,
        characters: {
          id: 'c1',
          name: 'Thrall',
          user_id: 'user-1',
          wow_classes: { name: 'Shaman', color_hex: '#0070DE' },
          spec: null,
        },
      },
    ]
    fixture.loot_submissions = [
      { id: 's-approved', guild_id: GUILD_ID, character_id: 'c1', phase: 4, status: 'approved', loot_submission_items: [] },
      { id: 's-draft', guild_id: GUILD_ID, character_id: 'c2', phase: 4, status: 'draft', loot_submission_items: [] },
      { id: 's-rejected', guild_id: GUILD_ID, character_id: 'c3', phase: 4, status: 'rejected', loot_submission_items: [] },
    ]
    const { client, calls } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(200)

    const payload = decodePayload(body.exportString)
    expect(payload.members).toEqual([])
    expect(body.stats.members).toBe(0)
    expect(body.stats.submissions).toBe(0)

    expect(calls.some(c => c.table === 'characters')).toBe(false)
    expect(calls.some(c => c.table === 'loot_submissions' && c.cols === 'character_id')).toBe(false)
  })

  it('X4: a failing membership read answers 500, calls trackApiError once, and returns no exportString', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fixture = baseFixture()
    fixture.membershipsError = true
    const { client } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request())
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body).toEqual({ error: 'Internal server error' })
    expect(body.exportString).toBeUndefined()
    expect(trackApiError).toHaveBeenCalledTimes(1)
    errorSpy.mockRestore()
  })

  it('X5: the character_guild_memberships call filters eq guild_id and eq is_active true', async () => {
    const { client, calls } = makeClient(baseFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    await GET(request())

    const membershipCall = calls.find(c => c.table === 'character_guild_memberships')
    expect(membershipCall).toBeDefined()
    expect(membershipCall!.filters).toContainEqual(['guild_id', GUILD_ID])
    expect(membershipCall!.filters).toContainEqual(['is_active', true])
  })
})

describe('FIX-02: real BLP and priorities in the import string, typed client', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'u1' }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true } as never)
    vi.mocked(trackApiError).mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function use(fixture: Fixture, options?: { fail?: string[] }) {
    const made = makeClient(fixture, options)
    vi.mocked(createServiceRoleClient).mockReturnValue(made.client as never)
    return made
  }

  it('B1 sends blp[characterId][lootItemId] = times_passed from blp_tracking filtered by the request guild', async () => {
    const fixture = baseFixture()
    fixture.blp_tracking = [
      { guild_id: GUILD_ID, character_id: 'c1', loot_item_id: 'li-nef', times_passed: 3 },
      { guild_id: 'other-guild', character_id: 'c1', loot_item_id: 'li-ony', times_passed: 9 },
    ]
    const { calls } = use(fixture)
    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(200)
    const payload = decodePayload(body.exportString)
    expect(payload.blp).toEqual({ c1: { 'li-nef': 3 } })
    expect(payload.blp.c1['li-nef']).toBe(3)
    const blpCalls = calls.filter(c => c.table === 'blp_tracking')
    expect(blpCalls).toHaveLength(1)
    expect(blpCalls[0].filters).toContainEqual(['guild_id', GUILD_ID])
    expect(blpCalls[0].orders).toEqual([{ col: 'id', ascending: true }])
  })

  it('B2 sends priorities keyed by loot item id from guild_item_priorities, with default bonuses when null', async () => {
    const fixture = baseFixture()
    fixture.guild_item_priorities = [
      {
        guild_id: GUILD_ID, raid_tier_id: 'tier-bwl', item_id: 'li-nef',
        role_priorities: { tank: 4 }, class_priorities: { Shaman: 2 }, character_priorities: { c1: 1 },
        priority_bonuses: null,
      },
      { guild_id: 'other-guild', raid_tier_id: 'tier-bwl', item_id: 'li-unrelated', priority_bonuses: null },
    ]
    const { calls } = use(fixture)
    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(200)
    const payload = decodePayload(body.exportString)
    expect(Object.keys(payload.priorities)).toEqual(['li-nef'])
    expect(payload.priorities['li-nef']).toEqual({
      role_priorities: { tank: 4 },
      class_priorities: { Shaman: 2 },
      character_priorities: { c1: 1 },
      priority_bonuses: { role: 5, class: 3, character: 2 },
    })
    const prioCalls = calls.filter(c => c.table === 'guild_item_priorities')
    expect(prioCalls).toHaveLength(1)
    expect(prioCalls[0].filters).toContainEqual(['guild_id', GUILD_ID])
    expect(prioCalls[0].filters).toContainEqual(['raid_tier_id', ['tier-ony', 'tier-bwl']])
    expect(prioCalls[0].orders).toEqual([{ col: 'id', ascending: true }])
  })

  it('B3 keeps explicit priority_bonuses when the row has them', async () => {
    const fixture = baseFixture()
    fixture.guild_item_priorities = [
      { guild_id: GUILD_ID, raid_tier_id: 'tier-bwl', item_id: 'li-nef', priority_bonuses: { role: 9, class: 8, character: 7 } },
    ]
    use(fixture)
    const res = await GET(request())
    const payload = decodePayload((await res.json()).exportString)
    expect(payload.priorities['li-nef'].priority_bonuses).toEqual({ role: 9, class: 8, character: 7 })
  })

  it('B4 the fake client throws for a table outside its allow-list', () => {
    const { client } = makeClient(baseFixture())
    expect(() => client.from('bad_luck_protection')).toThrow('fake client: unknown table bad_luck_protection')
    expect(() => client.from('item_priorities')).toThrow('fake client: unknown table item_priorities')
  })

  it('B5 the payload keeps the LLP1:1 prefix and its top-level keys', async () => {
    use(baseFixture())
    const res = await GET(request())
    const body = await res.json()
    expect(body.exportString.startsWith('LLP1:1:')).toBe(true)
    expect(Object.keys(decodePayload(body.exportString))).toEqual([
      'guildId', 'guildName', 'expansionId', 'phase', 'settings', 'items', 'members', 'priorities', 'blp', 'attendance',
    ])
    expect(Object.keys(body.stats)).toEqual([
      'items', 'members', 'submissions', 'raidTiers', 'expansion', 'compressedSize', 'uncompressedSize',
    ])
  })
})

// ─── Task 2: paging, empty guilds, honest errors ──────────

/** Raid dates on consecutive days from 2026-01-01, so each event owns its own date. */
function raidDate(i: number): string {
  return new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10)
}

/** A membership row for raider `id`, with the class and spec shape export-string reads. */
function membership(id: string): MembershipRow {
  return {
    guild_id: GUILD_ID,
    character_id: id,
    role: 'raider',
    membership_status: 'full',
    is_active: true,
    characters: { id, name: `Raider ${id}`, user_id: `user-${id}`, wow_classes: { name: 'Shaman', color_hex: '#0070DE' }, spec: null },
  }
}

describe('FIX-02: large guilds are never cut at the 1000-row cap', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'u1' }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true } as never)
    vi.mocked(trackApiError).mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function use(fixture: Fixture, options?: { fail?: string[] }) {
    const made = makeClient(fixture, options)
    vi.mocked(createServiceRoleClient).mockReturnValue(made.client as never)
    return made
  }

  const rangesOf = (calls: Call[], table: string) => calls.filter(c => c.table === table).map(c => c.range)

  it('P1 returns all 1001 blp_tracking rows, read in windows (0,999) and (1000,1999)', async () => {
    const fixture = baseFixture()
    fixture.blp_tracking = Array.from({ length: 1001 }, (_, i) => ({
      guild_id: GUILD_ID, character_id: `bc${i}`, loot_item_id: 'li-nef', times_passed: i + 1,
    }))
    const { calls } = use(fixture)
    const res = await GET(request())
    const payload = decodePayload((await res.json()).exportString)
    expect(res.status).toBe(200)
    expect(Object.keys(payload.blp)).toHaveLength(1001)
    expect(payload.blp.bc1000).toEqual({ 'li-nef': 1001 })
    expect(rangesOf(calls, 'blp_tracking')).toEqual([[0, 999], [1000, 1999]])
  })

  it('P2 builds attendance from all 1120 attendance_records rows (28 events by 40 raiders)', async () => {
    const fixture = baseFixture()
    const eventIds = Array.from({ length: 28 }, (_, i) => `ev${i}`)
    fixture.raid_events = eventIds.map((id, i) => ({
      guild_id: GUILD_ID, id, raid_date: raidDate(i), raid_team_id: null, is_bonus: false,
    }))
    // Event-major order: a cap at 1000 rows would drop the last 120 records (the last three events).
    fixture.attendance_records = eventIds.flatMap(eventId =>
      Array.from({ length: 40 }, (_, r) => ({ raid_event_id: eventId, character_id: `r${r}` })),
    )
    const { calls } = use(fixture)
    const res = await GET(request())
    const payload = decodePayload((await res.json()).exportString)
    expect(res.status).toBe(200)
    for (let r = 0; r < 40; r++) {
      expect(payload.attendance[`r${r}`].records, `raider r${r}`).toHaveLength(28)
      expect(payload.attendance[`r${r}`].totalRaids).toBe(28)
    }
    expect(rangesOf(calls, 'attendance_records')).toEqual([[0, 999], [1000, 1999]])
    for (const call of calls.filter(c => c.table === 'attendance_records')) {
      expect(call.orders).toEqual([{ col: 'id', ascending: true }])
    }
  })

  it('P3 builds members[].items from all 1001 approved loot_submissions', async () => {
    const fixture = baseFixture()
    // 1000 active raiders (the bounded membership read is one guild's registered
    // characters, see the route's comment), 1001 submissions: a guild's approved
    // submissions span phases, so raider sc0 holds an older and a newer one.
    const ids = Array.from({ length: 1000 }, (_, i) => `sc${i}`)
    fixture.character_guild_memberships = ids.map(membership)
    const submission = (id: string, character: string, phase: number, itemId: string, wowheadId: number) => ({
      id,
      guild_id: GUILD_ID,
      character_id: character,
      phase,
      status: 'approved',
      loot_submission_items: [{ loot_item_id: itemId, rank: 5, loot_items: { wowhead_id: wowheadId } }],
    })
    fixture.loot_submissions = [
      ...ids.map((id, i) => submission(`sub${i}`, id, 1, 'li-ony', 18423)),
      // The 1001st submission: past the 1000-row cap, and the newest for sc0.
      submission('sub1000', 'sc0', 4, 'li-nef', 19003),
    ]
    const { calls } = use(fixture)
    const res = await GET(request())
    const payload = decodePayload((await res.json()).exportString)
    expect(res.status).toBe(200)
    expect(rangesOf(calls, 'loot_submissions')).toEqual([[0, 999], [1000, 1999]])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sc0 = payload.members.find((m: any) => m.character_id === 'sc0')
    // Last wins: the 1001st submission replaces the phase 1 one, so a read cut at 1000 rows would show 18423.
    expect(sc0.items).toEqual([
      { wowhead_id: 19003, rank: 5 },
      { wowhead_id: 19002, rank: 5 },
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sc1 = payload.members.find((m: any) => m.character_id === 'sc1')
    expect(sc1.items.length).toBeGreaterThan(0)
  })

  it('P4 orders every ranged read by a column list ending in id', async () => {
    const fixture = baseFixture()
    fixture.blp_tracking = [{ guild_id: GUILD_ID, character_id: 'c1', loot_item_id: 'li-nef', times_passed: 1 }]
    fixture.guild_item_priorities = [{ guild_id: GUILD_ID, raid_tier_id: 'tier-bwl', item_id: 'li-nef' }]
    fixture.raid_events = [{ guild_id: GUILD_ID, id: 'ev0', raid_date: raidDate(0), raid_team_id: null, is_bonus: false }]
    fixture.attendance_records = [{ raid_event_id: 'ev0', character_id: 'c1' }]
    const { calls } = use(fixture)
    const res = await GET(request())
    expect(res.status).toBe(200)
    const expected: Record<string, string[]> = {
      blp_tracking: ['id'],
      guild_item_priorities: ['id'],
      loot_submissions: ['created_at', 'id'],
      attendance_records: ['id'],
    }
    for (const [table, cols] of Object.entries(expected)) {
      const tableCalls = calls.filter(c => c.table === table)
      expect(tableCalls.length, `${table} was read`).toBeGreaterThan(0)
      for (const call of tableCalls) {
        expect(call.range, `${table} is read in windows`).toBeDefined()
        expect(call.orders.map(o => o.col), table).toEqual(cols)
        expect(call.orders.every(o => o.ascending), `${table} ascending`).toBe(true)
      }
    }
  })

  it('P5 a raider with two approved submissions keeps the newest (created_at then id order)', async () => {
    const fixture = baseFixture()
    fixture.loot_submissions = [
      {
        id: 'old', guild_id: GUILD_ID, character_id: 'c1', phase: 1, status: 'approved',
        loot_submission_items: [{ loot_item_id: 'li-ony', rank: 2, loot_items: { wowhead_id: 18423 } }],
      },
      {
        id: 'new', guild_id: GUILD_ID, character_id: 'c1', phase: 4, status: 'approved',
        loot_submission_items: [{ loot_item_id: 'li-nef', rank: 9, loot_items: { wowhead_id: 19003 } }],
      },
    ]
    const { calls } = use(fixture)
    const res = await GET(request())
    const payload = decodePayload((await res.json()).exportString)
    expect(res.status).toBe(200)
    expect(calls.find(c => c.table === 'loot_submissions')!.orders.map(o => o.col)).toEqual(['created_at', 'id'])
    expect(payload.members[0].items).toEqual([
      { wowhead_id: 19003, rank: 9 },
      { wowhead_id: 19002, rank: 9 },
    ])
  })
})

describe('FIX-02: empty and expansion-less guilds still answer 200 or 404', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'u1' }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true } as never)
    vi.mocked(trackApiError).mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function use(fixture: Fixture, options?: { fail?: string[] }) {
    const made = makeClient(fixture, options)
    vi.mocked(createServiceRoleClient).mockReturnValue(made.client as never)
    return made
  }

  it('N1 no raid_events in the window: 200, an empty records list per member, no attendance_records read', async () => {
    const { calls } = use(baseFixture())
    const res = await GET(request())
    const payload = decodePayload((await res.json()).exportString)
    expect(res.status).toBe(200)
    expect(payload.attendance).toEqual({ c1: { totalRaids: 0, records: [] } })
    expect(calls.some(c => c.table === 'attendance_records')).toBe(false)
  })

  it('N2 no guild_settings row: 200 with an exportString and settings {}', async () => {
    const fixture = baseFixture()
    expect(fixture.guild_settings).toEqual([])
    use(fixture)
    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(typeof body.exportString).toBe('string')
    expect(decodePayload(body.exportString).settings).toEqual({})
  })

  it('N3 no guild row: 404', async () => {
    const fixture = baseFixture()
    fixture.guilds = []
    use(fixture)
    const res = await GET(request())
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Guild not found' })
    expect(trackApiError).not.toHaveBeenCalled()
  })

  it('N4 an expansion with no raid tiers: 200 and no guild_item_priorities call', async () => {
    const fixture = baseFixture()
    fixture.raid_tiers = []
    fixture.loot_items = []
    const { calls } = use(fixture)
    const res = await GET(request())
    const payload = decodePayload((await res.json()).exportString)
    expect(res.status).toBe(200)
    expect(payload.items).toEqual([])
    expect(payload.priorities).toEqual({})
    expect(calls.some(c => c.table === 'guild_item_priorities')).toBe(false)
  })

  it('N5 no blp_tracking rows gives blp {} and no priority rows gives priorities {}', async () => {
    use(baseFixture())
    const res = await GET(request())
    const payload = decodePayload((await res.json()).exportString)
    expect(res.status).toBe(200)
    expect(payload.blp).toEqual({})
    expect(payload.priorities).toEqual({})
  })
})

describe('FIX-02: every read that fails answers 500 (owner decisions 7 and 8)', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'u1' }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true } as never)
    vi.mocked(trackApiError).mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** A fixture where every table is read: attendance_records needs a raid event in the window. */
  function fullFixture(): Fixture {
    const fixture = baseFixture()
    fixture.raid_events = [{ guild_id: GUILD_ID, id: 'ev0', raid_date: raidDate(0), raid_team_id: null, is_bonus: false }]
    fixture.attendance_records = [{ raid_event_id: 'ev0', character_id: 'c1' }]
    return fixture
  }

  // loot_items is left out: its only direct read is the debug-only head count.
  const READ_TABLES = [
    'guilds',
    'guild_settings',
    'expansions',
    'raid_tiers',
    'character_guild_memberships',
    'loot_submissions',
    'guild_item_priorities',
    'blp_tracking',
    'raid_events',
    'attendance_records',
    'raid_team_members',
    'loot_history',
  ]

  it.each(READ_TABLES)('X1 a failed %s read answers 500, tracks one error and returns no exportString', async table => {
    const { client, calls } = makeClient(fullFixture(), { fail: [table] })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body).toEqual({ error: 'Internal server error' })
    expect(body.exportString).toBeUndefined()
    expect(trackApiError).toHaveBeenCalledTimes(1)
    expect(calls.some(c => c.table === table), `${table} was read`).toBe(true)
  })

  it('X2 a failed get_guild_expansions fallback read answers 500', async () => {
    const fixture = fullFixture()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(fixture.guilds[0] as any).active_expansion_id = null
    const { client } = makeClient(fixture, { rpc: { data: null, error: { message: 'rpc boom' } } })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body).toEqual({ error: 'Internal server error' })
    expect(body.exportString).toBeUndefined()
    expect(trackApiError).toHaveBeenCalledTimes(1)
  })

  it('X3 a failure on the second page of blp_tracking answers 500, not a partial list', async () => {
    const fixture = fullFixture()
    fixture.blp_tracking = Array.from({ length: 1000 }, (_, i) => ({
      guild_id: GUILD_ID, character_id: `bc${i}`, loot_item_id: 'li-nef', times_passed: 1,
    }))
    const { client, calls } = makeClient(fixture)
    // Fail only the second window of blp_tracking.
    const realFrom = client.from.bind(client)
    client.from = (table: string) => {
      const builder = realFrom(table)
      if (table !== 'blp_tracking') return builder
      const realRange = builder.range
      builder.range = (from: number, to: number) =>
        from === 0 ? realRange(from, to) : Promise.resolve({ data: null, error: { message: 'page 2 boom' } })
      return builder
    }
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    const res = await GET(request())
    expect(res.status).toBe(500)
    expect(trackApiError).toHaveBeenCalledTimes(1)
    expect(calls.filter(c => c.table === 'blp_tracking')).toHaveLength(2)
  })

  it('X5 the 500 body never carries the database message', async () => {
    const { client } = makeClient(fullFixture(), { fail: ['blp_tracking'] })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    const res = await GET(request())
    expect(JSON.stringify(await res.json())).not.toContain('boom')
  })
})
