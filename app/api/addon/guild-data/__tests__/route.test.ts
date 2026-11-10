// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

interface CharacterRow {
  id: string
  name: string
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

interface LootItemRow {
  id: string
  name: string
  wowhead_id: number | null
  boss_name: string
  item_slot: string
  item_type: string | null
  classification: string
  raid_tier_id: string
  /** Defaults to 'item' when absent, like the column default. */
  kind?: 'item' | 'need'
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
    loot_items: { wowhead_id: number | null; kind?: 'item' | 'need' }
  }>
}

interface Fixture {
  guilds: Array<{ id: string; name: string; active_expansion_id: string | null }>
  guild_settings: Array<{ guild_id: string }>
  expansions: Array<{ id: string; name: string; current_phase: number }>
  raid_tiers: Array<{ id: string; name: string; phase: number; expansion_id: string }>
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
}

/** Every table guild-data may read. The fake throws for anything else, so a misspelled or nonexistent table fails the tests. */
const ALLOWED_TABLES = [
  'guilds',
  'guild_settings',
  'expansions',
  'raid_tiers',
  'character_guild_memberships',
  'loot_items',
  'loot_submissions',
  'blp_tracking',
  'raid_events',
  'guild_item_priorities',
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
    case 'character_guild_memberships':
      return rows.filter((r: { guild_id: string }) => r.guild_id === find('guild_id'))
    case 'loot_items': {
      const tierIds = (find('raid_tier_id') as string[]) ?? []
      const kind = find('kind')
      return rows.filter(
        (r: { raid_tier_id: string; kind?: string }) =>
          tierIds.includes(r.raid_tier_id) && (kind === undefined || (r.kind ?? 'item') === kind),
      )
    }
    case 'loot_submissions':
      return rows.filter((r: { guild_id: string }) => r.guild_id === find('guild_id'))
    case 'blp_tracking':
      // The route embeds loot_items (kind); resolve it from the loot_items fixture.
      return rows
        .filter((r: { guild_id: string }) => r.guild_id === find('guild_id'))
        .map((r: { loot_item_id: string }) => ({
          ...r,
          loot_items: { kind: fixture.loot_items.find(i => i.id === r.loot_item_id)?.kind ?? 'item' },
        }))
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
 * Recording fake matching the guild-data query sequence. options.fail lists
 * tables whose reads resolve { data: null, error } (then, range, single and
 * maybeSingle alike). Querying a table outside ALLOWED_TABLES throws.
 */
function makeClient(fixture: Fixture, options?: { fail?: string[] }) {
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
          // An unranged read is cut at MAX_ROWS, as on the server, so a route
          // that forgets to page a large table fails its test instead of passing.
          const rows = resolveRows(table, call.filters, fixture).slice(0, MAX_ROWS)
          return Promise.resolve({ data: rows, error: null, count: rows.length }).then(resolve, reject)
        },
      }
      return builder
    },
    rpc: () => Promise.resolve({ data: [], error: null }),
  }
  return { client, calls }
}

const GUILD_ID = 'g1'

/** A guild whose catalog holds one Alliance row per FACTION_ITEM_ALIASES pair, plus one unrelated item. */
function baseFixture(): Fixture {
  const fixture = emptyFixture()
  fixture.guilds = [{ id: GUILD_ID, name: 'Test Guild', active_expansion_id: 'exp-1' }]
  fixture.expansions = [{ id: 'exp-1', name: 'Classic', current_phase: 4 }]
  fixture.raid_tiers = [
    { id: 'tier-ony', name: "Onyxia's Lair", phase: 1, expansion_id: 'exp-1' },
    { id: 'tier-bwl', name: 'Blackwing Lair', phase: 4, expansion_id: 'exp-1' },
  ]
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
        wow_classes: { name: 'Shaman', color_hex: '#0070DE' },
        spec: null,
      },
    },
  ]
  fixture.loot_items = [
    { id: 'li-ony', name: 'Head of Onyxia', wowhead_id: 18423, boss_name: 'Onyxia', item_slot: 'Quest', item_type: null, classification: 'quest', raid_tier_id: 'tier-ony' },
    { id: 'li-nef', name: 'Head of Nefarian', wowhead_id: 19003, boss_name: 'Nefarian', item_slot: 'Quest', item_type: null, classification: 'quest', raid_tier_id: 'tier-bwl' },
    { id: 'li-unrelated', name: 'Unrelated Item', wowhead_id: 16921, boss_name: 'Some Boss', item_slot: 'Trinket', item_type: 'trinket', classification: 'boe', raid_tier_id: 'tier-bwl' },
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
  return new NextRequest(`http://localhost/api/addon/guild-data?${query}`)
}

describe('GET /api/addon/guild-data (GH #290, faction-variant mirroring)', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'u1' }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true } as never)
  })

  it('mirrors every FACTION_ITEM_ALIASES pair into items and member ranked items', async () => {
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
    expect(body.items).toHaveLength(5)

    for (const [hordeStr, allianceId] of Object.entries(FACTION_ITEM_ALIASES)) {
      const hordeId = Number(hordeStr)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allianceItem = body.items.find((i: any) => i.wowhead_id === allianceId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hordeItem = body.items.find((i: any) => i.wowhead_id === hordeId)
      expect(allianceItem, `expected alliance item ${allianceId}`).toBeDefined()
      expect(hordeItem, `expected mirrored horde item ${hordeId}`).toBeDefined()
      expect(hordeItem).toEqual({ ...allianceItem, wowhead_id: hordeId })

      const member = body.members[0]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allianceRank = member.items.find((i: any) => i.wowhead_id === allianceId)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const hordeRank = member.items.find((i: any) => i.wowhead_id === hordeId)
      expect(allianceRank).toBeDefined()
      expect(hordeRank).toEqual({ wowhead_id: hordeId, rank: allianceRank.rank })
    }

    // The unrelated item is present exactly once, both in items and member items.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(body.items.filter((i: any) => i.wowhead_id === 16921)).toHaveLength(1)
    const member = body.members[0]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(member.items.filter((i: any) => i.wowhead_id === 16921)).toHaveLength(1)

    // Explicit values named in the plan.
    expect(member.items).toContainEqual({ wowhead_id: 19002, rank: 12 })
    expect(member.items).toContainEqual({ wowhead_id: 18422, rank: 7 })
  })

  it('exact rows win: a guild that already holds both faction ids gets one entry per id, no mirror', async () => {
    const fixture = baseFixture()
    fixture.loot_items.push({
      id: 'li-nef-horde',
      name: 'Head of Nefarian',
      wowhead_id: 19002,
      boss_name: 'Nefarian',
      item_slot: 'Quest',
      item_type: null,
      classification: 'quest',
      raid_tier_id: 'tier-bwl',
    })
    const { client } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request())
    const body = await res.json()

    expect(res.status).toBe(200)
    // 19003, 18423 (+mirror 18422), 16921, 19002 hand-added = 5, no extra mirror for 19003/19002.
    expect(body.items).toHaveLength(5)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nefItems = body.items.filter((i: any) => i.wowhead_id === 19003 || i.wowhead_id === 19002)
    expect(nefItems).toHaveLength(2)
    expect(nefItems.find((i: { id: string }) => i.id === 'li-nef')).toBeDefined()
    expect(nefItems.find((i: { id: string }) => i.id === 'li-nef-horde')).toBeDefined()
  })

  it('OD-01: selects loot_items.item_slot (not a nonexistent slot column) and maps it to the output slot field', async () => {
    const fixture = baseFixture()
    const { client, calls } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request())
    const body = await res.json()

    expect(res.status).toBe(200)
    const lootItemsCall = calls.find(c => c.table === 'loot_items')
    expect(lootItemsCall).toBeDefined()
    const cols = (lootItemsCall!.cols || '').split(',').map(c => c.trim())
    expect(cols).toContain('item_slot')
    expect(cols).not.toContain('slot')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nefItem = body.items.find((i: any) => i.wowhead_id === 19003)
    expect(nefItem.slot).toBe('Quest')
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
    return { res, items: body.members[0].items as Array<{ wowhead_id: number; rank: number }>, calls }
  }

  it('G1 a removed list row is left out of members[].items', async () => {
    const fixture = baseFixture()
    fixture.loot_submissions[0].loot_submission_items[2].removed_at = '2026-09-21T10:00:00Z'
    const { res, items } = await memberItems(fixture)
    expect(res.status).toBe(200)
    expect(items.some(i => i.wowhead_id === 16921)).toBe(false)
    expect(items.some(i => i.wowhead_id === 19003)).toBe(true)
  })

  it('G2 a raider listed for 20928 at ranks 50 and 30 with one award of it gets only the 30 entry', async () => {
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

  it('G3 the loot_history read is filtered by the request guild_id', async () => {
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

  it('G4 a loot_history error answers 500 and tracks the error, so entries never go out without the receive skip (owner decision 7)', async () => {
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
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal server error' })
    expect(trackApiError).toHaveBeenCalledTimes(1)
  })

  it('G1b selects slot and removed_at and sends each raider\'s ranks best last', async () => {
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

  it('G5 merges the active expansion\'s lists, keeps null-expansion lists, and leaves other expansions out (GH #355)', async () => {
    const fixture = baseFixture()
    addListsAcrossExpansions(fixture)
    const { res, items, calls } = await memberItems(fixture)
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
  })

  it('G6 a guild with no active expansion keeps every approved list (GH #355)', async () => {
    const fixture = baseFixture()
    fixture.guilds[0].active_expansion_id = null
    addListsAcrossExpansions(fixture)
    const { items } = await memberItems(fixture)
    expect(items).toContainEqual({ wowhead_id: 99999, rank: 60 })
  })
})

describe('D-14 and DISC-06: need rows never reach the companion payload', () => {
  const NEED_WARNING = 'Need rows skipped by a reader that does not handle them yet'

  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'u1' }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true } as never)
    vi.mocked(trackApiError).mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /** baseFixture plus a need row in the BWL tier. */
  function needFixture(): Fixture {
    const fixture = baseFixture()
    fixture.loot_items.push({
      id: 'li-need', name: 'Chest, Plate, Strength', wowhead_id: null, boss_name: 'Generic',
      item_slot: 'Chest', item_type: null, classification: 'standard', raid_tier_id: 'tier-bwl', kind: 'need',
    })
    return fixture
  }

  it('N1 loot_items is read with kind = item, and a need row never appears in items', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { client, calls } = makeClient(needFixture())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(calls.find(c => c.table === 'loot_items')!.filters).toContainEqual(['kind', 'item'])
    // Same five entries the need-free fixture produces; no row has a null wowhead_id.
    expect(body.items).toHaveLength(5)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(body.items.every((i: any) => typeof i.wowhead_id === 'number')).toBe(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(body.items.some((i: any) => i.name === 'Chest, Plate, Strength')).toBe(false)
    expect(warn).not.toHaveBeenCalled()
  })

  it('N2 a ranked need is left out of members[].items and the request warns once with the reader name', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fixture = needFixture()
    // A fake-client fixture stands past the D-22 hold, which refuses a ranked need in real data.
    fixture.loot_submissions[0].loot_submission_items.push(
      { loot_item_id: 'li-need', rank: 20, loot_items: { wowhead_id: null, kind: 'need' } },
    )
    fixture.loot_submissions.push({
      id: 's-need', guild_id: GUILD_ID, character_id: 'c1', phase: 3, status: 'approved', expansion_id: 'exp-1',
      loot_submission_items: [{ loot_item_id: 'li-need', rank: 5, loot_items: { wowhead_id: null, kind: 'need' } }],
    })
    const { client } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.members[0].items).toEqual([
      { wowhead_id: 16921, rank: 3 },
      { wowhead_id: 18423, rank: 7 },
      { wowhead_id: 18422, rank: 7 },
      { wowhead_id: 19003, rank: 12 },
      { wowhead_id: 19002, rank: 12 },
    ])
    // The one warning fires on the first skipped row; the count after that is not logged again.
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(NEED_WARNING, { reader: 'addon-guild-data', skipped: 1 })
  })

  it('N3 blp keeps the item entry and drops the need entry, whatever expansion the need belongs to', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fixture = needFixture()
    fixture.blp_tracking = [
      { guild_id: GUILD_ID, character_id: 'c1', loot_item_id: 'li-nef', times_passed: 3 },
      { guild_id: GUILD_ID, character_id: 'c1', loot_item_id: 'li-need', times_passed: 4 },
      { guild_id: GUILD_ID, character_id: 'c2', loot_item_id: 'li-need', times_passed: 1 },
    ]
    const { client, calls } = makeClient(fixture)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.blp).toEqual({ c1: { 'li-nef': 3 } })
    expect(calls.find(c => c.table === 'blp_tracking')!.cols).toMatch(/loot_items \(kind\)/)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith(NEED_WARNING, { reader: 'addon-guild-data', skipped: 2 })
  })

  it('N4 DISC-06 empty: a guild with no need rows answers the same body as the item-only fixture, with no warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const plain = baseFixture()
    plain.blp_tracking = [{ guild_id: GUILD_ID, character_id: 'c1', loot_item_id: 'li-nef', times_passed: 3 }]
    const withNeed = needFixture()
    withNeed.blp_tracking = [...plain.blp_tracking]
    const bodyOf = async (fixture: Fixture) => {
      const { client } = makeClient(fixture)
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
      return (await GET(request())).json()
    }
    const without = await bodyOf(plain)
    const withUnranked = await bodyOf(withNeed)
    expect(withUnranked).toEqual(without)
    expect(Object.keys(without).sort()).toEqual(
      ['attendance', 'blp', 'expansionId', 'guildId', 'guildName', 'items', 'members', 'phase', 'priorities', 'settings'],
    )
    expect(warn).not.toHaveBeenCalled()
  })

  it('N5 a failed loot_items read still answers 500', async () => {
    const { client } = makeClient(needFixture(), { fail: ['loot_items'] })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    const res = await GET(request())
    expect(res.status).toBe(500)
    expect(trackApiError).toHaveBeenCalledTimes(1)
  })
})

describe('FIX-02: real BLP and priorities, typed client', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'u1' }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true } as never)
    vi.mocked(trackApiError).mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => {})
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
    expect(body.blp).toEqual({ c1: { 'li-nef': 3 } })
    const blpCalls = calls.filter(c => c.table === 'blp_tracking')
    expect(blpCalls).toHaveLength(1)
    expect(blpCalls[0].filters).toContainEqual(['guild_id', GUILD_ID])
  })

  it('B2 sends priorities keyed by loot item id from guild_item_priorities, with default bonuses when null', async () => {
    const fixture = baseFixture()
    fixture.guild_item_priorities = [
      { guild_id: GUILD_ID, raid_tier_id: 'tier-bwl', item_id: 'li-nef', role_priorities: null, class_priorities: null, character_priorities: null, priority_bonuses: null },
      { guild_id: 'other-guild', raid_tier_id: 'tier-bwl', item_id: 'li-unrelated', priority_bonuses: null },
    ]
    const { calls } = use(fixture)
    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(Object.keys(body.priorities)).toEqual(['li-nef'])
    expect(body.priorities['li-nef']).toEqual({
      role_priorities: {},
      class_priorities: {},
      character_priorities: {},
      priority_bonuses: { role: 5, class: 3, character: 2 },
    })
    const prioCalls = calls.filter(c => c.table === 'guild_item_priorities')
    expect(prioCalls).toHaveLength(1)
    expect(prioCalls[0].filters).toContainEqual(['guild_id', GUILD_ID])
    expect(prioCalls[0].filters).toContainEqual(['raid_tier_id', ['tier-ony', 'tier-bwl']])
  })

  it.each(['blp_tracking', 'guild_item_priorities'])('B3 a %s read error answers 500 and tracks the error', async table => {
    const { calls } = use(baseFixture(), { fail: [table] })
    const res = await GET(request())
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal server error' })
    expect(trackApiError).toHaveBeenCalledTimes(1)
    expect(calls.some(c => c.table === table)).toBe(true)
  })

  it('B4 the fake client throws for a table outside its allow-list', () => {
    const { client } = makeClient(baseFixture())
    expect(() => client.from('bad_luck_protection')).toThrow('fake client: unknown table bad_luck_protection')
    expect(() => client.from('item_priorities')).toThrow('fake client: unknown table item_priorities')
  })
})

// ─── Task 2: paging, empty guilds, honest errors ──────────

/** Raid dates on consecutive days from 2026-01-01, so each event owns its own date. */
function raidDate(i: number): string {
  return new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10)
}

/** A membership row for raider `id`, with the class and spec shape guild-data reads. */
function membership(id: string): MembershipRow {
  return {
    guild_id: GUILD_ID,
    character_id: id,
    role: 'raider',
    membership_status: 'full',
    is_active: true,
    characters: { id, name: `Raider ${id}`, wow_classes: { name: 'Shaman', color_hex: '#0070DE' }, spec: null },
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

  it('P1 [E-05] returns all 1001 blp_tracking rows, read in windows (0,999) and (1000,1999)', async () => {
    const fixture = baseFixture()
    fixture.blp_tracking = Array.from({ length: 1001 }, (_, i) => ({
      guild_id: GUILD_ID,
      character_id: `bc${i}`,
      loot_item_id: 'li-nef',
      times_passed: i + 1,
    }))
    const { calls } = use(fixture)
    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(Object.keys(body.blp)).toHaveLength(1001)
    expect(body.blp.bc1000).toEqual({ 'li-nef': 1001 })
    expect(rangesOf(calls, 'blp_tracking')).toEqual([[0, 999], [1000, 1999]])
  })

  it('P2 [E-05] builds attendance from all 1120 attendance_records rows (28 events by 40 raiders)', async () => {
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
    const body = await res.json()
    expect(res.status).toBe(200)
    for (let r = 0; r < 40; r++) {
      expect(body.attendance[`r${r}`].records, `raider r${r}`).toHaveLength(28)
      expect(body.attendance[`r${r}`].totalRaids).toBe(28)
    }
    expect(rangesOf(calls, 'attendance_records')).toEqual([[0, 999], [1000, 1999]])
  })

  it('P3 [E-05] builds members[].items from all 1001 approved loot_submissions', async () => {
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
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(rangesOf(calls, 'loot_submissions')).toEqual([[0, 999], [1000, 1999]])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sc0 = body.members.find((m: any) => m.character_id === 'sc0')
    // GH #355 merges both of sc0's lists, so the 1001st submission's item
    // (19003, past the cap) sits beside the phase 1 one; a read cut at 1000
    // rows would leave only 18423.
    expect(sc0.items).toEqual([
      { wowhead_id: 18423, rank: 5 },
      { wowhead_id: 18422, rank: 5 },
      { wowhead_id: 19003, rank: 5 },
      { wowhead_id: 19002, rank: 5 },
    ])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sc1 = body.members.find((m: any) => m.character_id === 'sc1')
    expect(sc1.items.length).toBeGreaterThan(0)
  })

  it('P4 [E-05] returns all 1001 loot_items and all 1001 guild_item_priorities rows', async () => {
    const fixture = baseFixture()
    fixture.loot_items = Array.from({ length: 1001 }, (_, i) => ({
      id: `li${i}`, name: `Item ${i}`, wowhead_id: 100000 + i, boss_name: 'Boss', item_slot: 'Trinket',
      item_type: 'trinket', classification: 'boe', raid_tier_id: 'tier-bwl',
    }))
    fixture.loot_submissions = []
    fixture.guild_item_priorities = fixture.loot_items.map(item => ({
      guild_id: GUILD_ID, raid_tier_id: 'tier-bwl', item_id: item.id,
    }))
    const { calls } = use(fixture)
    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.items).toHaveLength(1001)
    expect(Object.keys(body.priorities)).toHaveLength(1001)
    expect(rangesOf(calls, 'loot_items')).toEqual([[0, 999], [1000, 1999]])
    expect(rangesOf(calls, 'guild_item_priorities')).toEqual([[0, 999], [1000, 1999]])
  })

  it('P5 [E-07] orders every ranged read by a column list ending in id', async () => {
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
      loot_items: ['name', 'id'],
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

  it('P6 a raider with two approved submissions gets both merged (GH #355), read in created_at then id order', async () => {
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
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(calls.find(c => c.table === 'loot_submissions')!.orders.map(o => o.col)).toEqual(['created_at', 'id'])
    expect(body.members[0].items).toEqual([
      { wowhead_id: 18423, rank: 2 },
      { wowhead_id: 18422, rank: 2 },
      { wowhead_id: 19003, rank: 9 },
      { wowhead_id: 19002, rank: 9 },
    ])
  })
})

describe('FIX-02: empty and expansion-less guilds still answer 200', () => {
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

  it('E1 [E-06] no raid_events in the window: 200, an empty records list per member, no attendance_records read', async () => {
    const { calls } = use(baseFixture())
    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.attendance).toEqual({ c1: { totalRaids: 0, records: [] } })
    expect(calls.some(c => c.table === 'attendance_records')).toBe(false)
  })

  it('E2 [E-06] no guild_settings row: 200 with settings {}', async () => {
    const fixture = baseFixture()
    expect(fixture.guild_settings).toEqual([])
    use(fixture)
    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.settings).toEqual({})
  })

  it('E3 [E-06] no blp_tracking rows gives blp {} and no priority rows gives priorities {}', async () => {
    use(baseFixture())
    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.blp).toEqual({})
    expect(body.priorities).toEqual({})
  })

  it('E4 [E-06] a null active_expansion_id: 200 with items [], and no expansions, raid_tiers, loot_items or priorities read', async () => {
    const fixture = baseFixture()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(fixture.guilds[0] as any).active_expansion_id = null
    const { calls } = use(fixture)
    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.items).toEqual([])
    expect(body.priorities).toEqual({})
    for (const table of ['expansions', 'raid_tiers', 'loot_items', 'guild_item_priorities']) {
      expect(calls.some(c => c.table === table), `${table} is not read`).toBe(false)
    }
  })

  it('E5 the 200 body keeps its keys', async () => {
    use(baseFixture())
    const res = await GET(request())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(Object.keys(body)).toEqual([
      'guildId', 'guildName', 'expansionId', 'phase', 'settings', 'items', 'members', 'priorities', 'blp', 'attendance',
    ])
  })
})

describe('FIX-02: every read that fails answers 500 (owner decision 7)', () => {
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

  it.each(ALLOWED_TABLES)('X1 a failed %s read answers 500, tracks one error and leaks no database message', async table => {
    const fixture = fullFixture()
    const { client, calls } = makeClient(fixture, { fail: [table] })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
    const res = await GET(request())
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Internal server error' })
    expect(trackApiError).toHaveBeenCalledTimes(1)
    expect(calls.some(c => c.table === table), `${table} was read`).toBe(true)
  })

  it('X2 a failure on the second page of blp_tracking answers 500, not a partial list', async () => {
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
})
