// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { GET } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { trackApiError } from '@/utils/analytics/server'

// Deliberately NOT mocked: findInvalidCharacterIds, fetchReceivedCounts and
// pickReceivedEntries must run for real against the fake client below, so these
// tests prove the route calls the actual award-check, received-counts and
// receive-skip definitions rather than a reimplementation of them (GH #325).
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), trackApiError: vi.fn() }))

const BOT_KEY = 'test-bot-key'

const GUILD = 'aaaaaaaa-0000-0000-0000-000000000001'
const OTHER_GUILD = 'bbbbbbbb-0000-0000-0000-000000000001'
const DISCORD = 'discord-server-1'
const EXP = 'aaaaaaaa-0000-0000-0000-000000000002'
const TIER = 'aaaaaaaa-0000-0000-0000-000000000003'
const ITEM = 'aaaaaaaa-0000-0000-0000-000000000004'
const ITEM_B = 'aaaaaaaa-0000-0000-0000-00000000000b'
const ACTIVE_CHAR = 'aaaaaaaa-0000-0000-0000-000000000005'
const DEPARTED_CHAR = 'aaaaaaaa-0000-0000-0000-000000000006'
const SUB_ACTIVE = 'aaaaaaaa-0000-0000-0000-000000000007'
const SUB_DEPARTED = 'aaaaaaaa-0000-0000-0000-000000000008'

type Row = Record<string, unknown>

interface FailSpec {
  table: string
  select?: string
}

interface Filter {
  type: 'eq' | 'in' | 'is' | 'ilike'
  col: string
  val: unknown
}

interface RecordedCall {
  table: string
  select: string
  filters: Filter[]
  orders: Array<{ col: string; ascending: boolean }>
  limit?: number
  range?: [number, number]
}

/**
 * Generic in-memory recording fake. Every from(table) call records its select
 * string, filters, orders, limit and range. options.fail is a list of
 * { table, select? }; a matching call resolves { data: null, error }.
 */
function makeClient(tables: Record<string, Row[]>, options?: { fail?: FailSpec[] }) {
  const calls: RecordedCall[] = []

  function matchesFail(call: RecordedCall): boolean {
    if (!options?.fail) return false
    return options.fail.some(
      (f) => f.table === call.table && (f.select === undefined || f.select === call.select)
    )
  }

  function ilikeMatch(pattern: string, value: string): boolean {
    const escaped = pattern
      .toLowerCase()
      .split('%')
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*')
    return new RegExp(`^${escaped}$`).test(value.toLowerCase())
  }

  function applyFilters(rows: Row[], filters: Filter[]): Row[] {
    return rows.filter((row) =>
      filters.every((f) => {
        if (f.type === 'eq') return row[f.col] === f.val
        if (f.type === 'in') return (f.val as unknown[]).includes(row[f.col])
        if (f.type === 'is') return row[f.col] === null || row[f.col] === undefined
        if (f.type === 'ilike') return ilikeMatch(String(f.val), String(row[f.col] ?? ''))
        return true
      })
    )
  }

  function compareValues(a: unknown, b: unknown): number {
    if (a === b) return 0
    if (typeof a === 'number' && typeof b === 'number') return a - b
    return String(a) < String(b) ? -1 : 1
  }

  function applyOrders(rows: Row[], orders: RecordedCall['orders']): Row[] {
    const sorted = rows.slice()
    for (let i = orders.length - 1; i >= 0; i--) {
      const { col, ascending } = orders[i]
      sorted.sort((a, b) => (ascending ? compareValues(a[col], b[col]) : -compareValues(a[col], b[col])))
    }
    return sorted
  }

  function resolveRows(call: RecordedCall): Row[] {
    let rows = applyFilters(tables[call.table] ?? [], call.filters)
    rows = applyOrders(rows, call.orders)
    if (call.range) rows = rows.slice(call.range[0], call.range[1] + 1)
    if (call.limit != null) rows = rows.slice(0, call.limit)
    return rows
  }

  function from(table: string) {
    const call: RecordedCall = { table, select: '', filters: [], orders: [] }
    calls.push(call)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {
      select(cols: string) {
        call.select = cols
        return builder
      },
      eq(col: string, val: unknown) {
        call.filters.push({ type: 'eq', col, val })
        return builder
      },
      in(col: string, val: unknown[]) {
        call.filters.push({ type: 'in', col, val })
        return builder
      },
      is(col: string, val: null) {
        call.filters.push({ type: 'is', col, val })
        return builder
      },
      ilike(col: string, val: string) {
        call.filters.push({ type: 'ilike', col, val })
        return builder
      },
      order(col: string, opts?: { ascending?: boolean }) {
        call.orders.push({ col, ascending: opts?.ascending !== false })
        return builder
      },
      limit(n: number) {
        call.limit = n
        return builder
      },
      range(start: number, end: number) {
        call.range = [start, end]
        return builder
      },
      maybeSingle() {
        if (matchesFail(call)) return Promise.resolve({ data: null, error: { message: 'boom' } })
        const rows = resolveRows(call)
        return Promise.resolve({ data: rows[0] ?? null, error: null })
      },
      single() {
        if (matchesFail(call)) return Promise.resolve({ data: null, error: { message: 'boom' } })
        const rows = resolveRows(call)
        if (rows.length === 0) return Promise.resolve({ data: null, error: { message: 'not found' } })
        return Promise.resolve({ data: rows[0], error: null })
      },
      then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
        if (matchesFail(call)) {
          return Promise.resolve({ data: null, error: { message: 'boom' } }).then(resolve, reject)
        }
        const rows = resolveRows(call)
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject)
      },
    }
    return builder
  }

  return { client: { from }, calls }
}

function request(params: Record<string, string>, headers: Record<string, string> = { authorization: `Bot ${BOT_KEY}` }) {
  const url = new URL('http://localhost/api/bot/priority')
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  return new Request(url, { headers }) as unknown as Parameters<typeof GET>[0]
}

/**
 * Base fixture (tracer, GH #325): ACTIVE_CHAR has an active membership and an
 * approved list ranking ITEM at 40; DEPARTED_CHAR's membership is inactive and its
 * approved list ranks ITEM at 50. Both tiers Loot and Ranks on. No loot_history
 * rows, so the received-copies skip removes nothing.
 */
function baseTables(overrides: Partial<Record<string, Row[]>> = {}): Record<string, Row[]> {
  return {
    guilds: [
      {
        id: GUILD,
        name: 'Test Guild',
        discord_server_id: DISCORD,
        is_active: true,
        created_at: '2020-01-01T00:00:00Z',
        active_expansion_id: EXP,
      },
    ],
    raid_tiers: [{ id: TIER, expansion_id: EXP, is_guild_active: true, master_sheet_visible: true }],
    loot_items: [
      { id: ITEM, raid_tier_id: TIER, name: 'Bilegrip Boots', wowhead_id: 1001 },
      { id: ITEM_B, raid_tier_id: TIER, name: 'Bilegrip Boots (Heroic)', wowhead_id: 1001 },
    ],
    loot_submissions: [
      { id: SUB_ACTIVE, character_id: ACTIVE_CHAR, guild_id: GUILD, status: 'approved' },
      { id: SUB_DEPARTED, character_id: DEPARTED_CHAR, guild_id: GUILD, status: 'approved' },
    ],
    loot_submission_items: [
      { id: 'lsi-1', submission_id: SUB_ACTIVE, loot_item_id: ITEM, rank: 40, slot: 1, removed_at: null },
      { id: 'lsi-2', submission_id: SUB_DEPARTED, loot_item_id: ITEM, rank: 50, slot: 1, removed_at: null },
    ],
    character_guild_memberships: [
      { character_id: ACTIVE_CHAR, guild_id: GUILD, is_active: true },
      { character_id: DEPARTED_CHAR, guild_id: GUILD, is_active: false },
    ],
    characters: [
      { id: ACTIVE_CHAR, name: 'Active', wow_classes: { name: 'Mage' } },
      { id: DEPARTED_CHAR, name: 'Departed', wow_classes: { name: 'Rogue' } },
    ],
    loot_history: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.stubEnv('BOT_API_KEY', BOT_KEY)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('GET /api/bot/priority (tracer, GH #325)', () => {
  it('lists an active raider from an approved list and leaves out a departed one', async () => {
    const { client } = makeClient(baseTables())
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.item_name).toBe('Bilegrip Boots')
    expect(body.item_wowhead_id).toBe(1001)
    expect(body.raiders).toEqual([{ name: 'Active', class: 'Mage', rank: 40 }])
  })

  it('answers 403 rankings_hidden when the only matching tier has Ranks off', async () => {
    const tables = baseTables({
      raid_tiers: [{ id: TIER, expansion_id: EXP, is_guild_active: true, master_sheet_visible: false }],
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body).toEqual({ error: 'rankings_hidden', item_name: 'Bilegrip Boots', item_wowhead_id: 1001 })
  })
})

function uuidFrom(suffix: string): string {
  return `cccccccc-0000-0000-0000-${suffix.padStart(12, '0')}`
}

function approvedSub(id: string, characterId: string | null, guildId: string = GUILD): Row {
  return { id, character_id: characterId, guild_id: guildId, status: 'approved' }
}

function sub(id: string, characterId: string | null, status: string, guildId: string = GUILD): Row {
  return { id, character_id: characterId, guild_id: guildId, status }
}

function lsi(
  id: string,
  submissionId: string | null,
  lootItemId: string | null,
  rank: number,
  slot = 1,
  removedAt: string | null = null
): Row {
  return { id, submission_id: submissionId, loot_item_id: lootItemId, rank, slot, removed_at: removedAt }
}

function cgm(characterId: string, guildId: string, isActive: boolean | null): Row {
  return { character_id: characterId, guild_id: guildId, is_active: isActive }
}

function char(id: string, name: string, className: string | null): Row {
  return { id, name, wow_classes: className ? { name: className } : null }
}

function award(characterId: string, wowheadId: number, guildId: string = GUILD): Row {
  return { character_id: characterId, guild_id: guildId, loot_item: { wowhead_id: wowheadId } }
}

/** A minimal, self-contained table set: one guild, one Loot-on/Ranks-on tier, one item. */
function scenario(overrides: Partial<Record<string, Row[]>> = {}): Record<string, Row[]> {
  return {
    guilds: [
      {
        id: GUILD,
        name: 'Test Guild',
        discord_server_id: DISCORD,
        is_active: true,
        created_at: '2020-01-01T00:00:00Z',
        active_expansion_id: EXP,
      },
    ],
    raid_tiers: [{ id: TIER, expansion_id: EXP, is_guild_active: true, master_sheet_visible: true }],
    loot_items: [{ id: ITEM, raid_tier_id: TIER, name: 'Bilegrip Boots', wowhead_id: 1001 }],
    loot_submissions: [],
    loot_submission_items: [],
    character_guild_memberships: [],
    characters: [],
    loot_history: [],
    ...overrides,
  }
}

/** scenario() plus one active raider (REAL) ranking ITEM, so every read in the
 * route's happy path actually runs (used by the D-04 error-path tests). */
function readyScenario(overrides: Partial<Record<string, Row[]>> = {}): Record<string, Row[]> {
  const CHAR = uuidFrom('990')
  const SUB = uuidFrom('991')
  return scenario({
    loot_submissions: [approvedSub(SUB, CHAR)],
    loot_submission_items: [lsi('ready-r1', SUB, ITEM, 10)],
    character_guild_memberships: [cgm(CHAR, GUILD, true)],
    characters: [char(CHAR, 'Ready', 'Mage')],
    ...overrides,
  })
}

describe('GH #325: D-01 removed rows and submission status', () => {
  it('a removed row does not count; the live row still shows; a raider whose only row is removed is absent', async () => {
    const CHAR_LIVE = uuidFrom('100')
    const CHAR_REMOVED_ONLY = uuidFrom('101')
    const SUB1 = uuidFrom('200')
    const SUB2 = uuidFrom('201')
    const tables = scenario({
      loot_submissions: [approvedSub(SUB1, CHAR_LIVE), approvedSub(SUB2, CHAR_REMOVED_ONLY)],
      loot_submission_items: [
        lsi('r1', SUB1, ITEM, 50, 1, '2024-01-01T00:00:00Z'),
        lsi('r2', SUB1, ITEM, 30, 1, null),
        lsi('r3', SUB2, ITEM, 20, 1, '2024-01-01T00:00:00Z'),
      ],
      character_guild_memberships: [cgm(CHAR_LIVE, GUILD, true), cgm(CHAR_REMOVED_ONLY, GUILD, true)],
      characters: [char(CHAR_LIVE, 'Live', 'Mage'), char(CHAR_REMOVED_ONLY, 'Gone', 'Rogue')],
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    const body = await res.json()
    expect(body.raiders).toEqual([{ name: 'Live', class: 'Mage', rank: 30 }])
  })

  it('draft, pending and rejected submissions, and an approved submission in another guild, never appear', async () => {
    const CHAR_DRAFT = uuidFrom('110')
    const CHAR_PENDING = uuidFrom('111')
    const CHAR_REJECTED = uuidFrom('112')
    const CHAR_OTHERGUILD = uuidFrom('113')
    const CHAR_APPROVED = uuidFrom('114')
    const SUB_DRAFT = uuidFrom('210')
    const SUB_PENDING = uuidFrom('211')
    const SUB_REJECTED = uuidFrom('212')
    const SUB_OTHERGUILD = uuidFrom('213')
    const SUB_APPROVED = uuidFrom('214')
    const tables = scenario({
      loot_submissions: [
        sub(SUB_DRAFT, CHAR_DRAFT, 'draft'),
        sub(SUB_PENDING, CHAR_PENDING, 'pending'),
        sub(SUB_REJECTED, CHAR_REJECTED, 'rejected'),
        approvedSub(SUB_OTHERGUILD, CHAR_OTHERGUILD, OTHER_GUILD),
        approvedSub(SUB_APPROVED, CHAR_APPROVED),
      ],
      loot_submission_items: [
        lsi('r1', SUB_DRAFT, ITEM, 90),
        lsi('r2', SUB_PENDING, ITEM, 90),
        lsi('r3', SUB_REJECTED, ITEM, 90),
        lsi('r4', SUB_OTHERGUILD, ITEM, 90),
        lsi('r5', SUB_APPROVED, ITEM, 10),
      ],
      character_guild_memberships: [
        cgm(CHAR_DRAFT, GUILD, true),
        cgm(CHAR_PENDING, GUILD, true),
        cgm(CHAR_REJECTED, GUILD, true),
        cgm(CHAR_OTHERGUILD, OTHER_GUILD, true),
        cgm(CHAR_APPROVED, GUILD, true),
      ],
      characters: [
        char(CHAR_DRAFT, 'Draft', null),
        char(CHAR_PENDING, 'Pending', null),
        char(CHAR_REJECTED, 'Rejected', null),
        char(CHAR_OTHERGUILD, 'Other', null),
        char(CHAR_APPROVED, 'Approved', null),
      ],
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    const body = await res.json()
    expect(body.raiders).toEqual([{ name: 'Approved', class: null, rank: 10 }])
  })
})

describe('GH #325: D-02 active membership', () => {
  it('CGM is_active NULL is absent; active-only-in-another-guild is absent; a null character_id submission is absent', async () => {
    const CHAR_NULL_ACTIVE = uuidFrom('120')
    const CHAR_OTHERGUILD_ACTIVE = uuidFrom('121')
    const CHAR_GOOD = uuidFrom('122')
    const SUB_NULLACTIVE = uuidFrom('220')
    const SUB_OTHERGUILD_ACTIVE = uuidFrom('221')
    const SUB_NULLCHAR = uuidFrom('222')
    const SUB_GOOD = uuidFrom('223')
    const tables = scenario({
      loot_submissions: [
        approvedSub(SUB_NULLACTIVE, CHAR_NULL_ACTIVE),
        approvedSub(SUB_OTHERGUILD_ACTIVE, CHAR_OTHERGUILD_ACTIVE),
        approvedSub(SUB_NULLCHAR, null),
        approvedSub(SUB_GOOD, CHAR_GOOD),
      ],
      loot_submission_items: [
        lsi('r1', SUB_NULLACTIVE, ITEM, 90),
        lsi('r2', SUB_OTHERGUILD_ACTIVE, ITEM, 90),
        lsi('r3', SUB_NULLCHAR, ITEM, 90),
        lsi('r4', SUB_GOOD, ITEM, 10),
      ],
      character_guild_memberships: [
        cgm(CHAR_NULL_ACTIVE, GUILD, null),
        cgm(CHAR_OTHERGUILD_ACTIVE, OTHER_GUILD, true),
        cgm(CHAR_GOOD, GUILD, true),
      ],
      characters: [
        char(CHAR_NULL_ACTIVE, 'NullActive', null),
        char(CHAR_OTHERGUILD_ACTIVE, 'OtherActive', null),
        char(CHAR_GOOD, 'Good', null),
      ],
    })
    const { client, calls } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    const body = await res.json()
    expect(body.raiders).toEqual([{ name: 'Good', class: null, rank: 10 }])

    const membershipCall = calls.find((c) => c.table === 'character_guild_memberships')
    expect(membershipCall?.filters).toEqual(
      expect.arrayContaining([
        { type: 'eq', col: 'guild_id', val: GUILD },
        { type: 'eq', col: 'is_active', val: true },
      ])
    )
  })
})

describe('GH #325: D-03 received-copies skip across same-wowhead rows', () => {
  it('one award removes a raider who listed it once; with two listed copies, one award keeps the lower remaining rank', async () => {
    const CHAR_RECEIVED_ONCE = uuidFrom('130')
    const CHAR_TWO_COPIES = uuidFrom('131')
    const SUB_RECEIVED_ONCE = uuidFrom('230')
    const SUB_TWO_COPIES = uuidFrom('231')
    const tables = scenario({
      loot_items: [
        { id: ITEM, raid_tier_id: TIER, name: 'Bilegrip Boots', wowhead_id: 1001 },
        { id: ITEM_B, raid_tier_id: TIER, name: 'Bilegrip Boots (Heroic)', wowhead_id: 1001 },
      ],
      loot_submissions: [approvedSub(SUB_RECEIVED_ONCE, CHAR_RECEIVED_ONCE), approvedSub(SUB_TWO_COPIES, CHAR_TWO_COPIES)],
      loot_submission_items: [
        lsi('r1', SUB_RECEIVED_ONCE, ITEM, 50),
        lsi('r2', SUB_TWO_COPIES, ITEM, 45),
        lsi('r3', SUB_TWO_COPIES, ITEM, 20),
      ],
      character_guild_memberships: [cgm(CHAR_RECEIVED_ONCE, GUILD, true), cgm(CHAR_TWO_COPIES, GUILD, true)],
      characters: [char(CHAR_RECEIVED_ONCE, 'ReceivedOnce', null), char(CHAR_TWO_COPIES, 'TwoCopies', null)],
      // Awards are keyed by wowhead id, so an award recorded via ITEM_B (a second
      // loot_items row sharing wowhead 1001) still counts toward ITEM's skip.
      loot_history: [award(CHAR_RECEIVED_ONCE, 1001), award(CHAR_TWO_COPIES, 1001)],
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    const body = await res.json()
    expect(body.raiders).toEqual([{ name: 'TwoCopies', class: null, rank: 20 }])
  })

  it('a ranking made on a different loot_items row with the same wowhead id in a visible tier counts', async () => {
    const CHAR = uuidFrom('140')
    const SUB = uuidFrom('240')
    const tables = scenario({
      loot_items: [
        { id: ITEM, raid_tier_id: TIER, name: 'Bilegrip Boots', wowhead_id: 1001 },
        { id: ITEM_B, raid_tier_id: TIER, name: 'Bilegrip Boots (Heroic)', wowhead_id: 1001 },
      ],
      loot_submissions: [approvedSub(SUB, CHAR)],
      loot_submission_items: [lsi('r1', SUB, ITEM_B, 33)],
      character_guild_memberships: [cgm(CHAR, GUILD, true)],
      characters: [char(CHAR, 'OnHeroic', null)],
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    const body = await res.json()
    expect(body.raiders).toEqual([{ name: 'OnHeroic', class: null, rank: 33 }])
  })

  it('a ranking made on a same-wowhead row in a Ranks-off tier does not count', async () => {
    const TIER_HIDDEN = uuidFrom('150')
    const ITEM_HIDDEN = uuidFrom('151')
    const CHAR = uuidFrom('152')
    const SUB = uuidFrom('250')
    const tables = scenario({
      raid_tiers: [
        { id: TIER, expansion_id: EXP, is_guild_active: true, master_sheet_visible: true },
        { id: TIER_HIDDEN, expansion_id: EXP, is_guild_active: true, master_sheet_visible: false },
      ],
      loot_items: [
        { id: ITEM, raid_tier_id: TIER, name: 'Bilegrip Boots', wowhead_id: 1001 },
        { id: ITEM_HIDDEN, raid_tier_id: TIER_HIDDEN, name: 'Bilegrip Boots (Hidden)', wowhead_id: 1001 },
      ],
      loot_submissions: [approvedSub(SUB, CHAR)],
      loot_submission_items: [lsi('r1', SUB, ITEM_HIDDEN, 77)],
      character_guild_memberships: [cgm(CHAR, GUILD, true)],
      characters: [char(CHAR, 'Hidden', null)],
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    const body = await res.json()
    expect(body.raiders).toEqual([])
  })

  it('an item with a null wowhead id skips nothing and never queries loot_history', async () => {
    const CHAR = uuidFrom('160')
    const SUB = uuidFrom('260')
    const tables = scenario({
      loot_items: [{ id: ITEM, raid_tier_id: TIER, name: 'Bilegrip Boots', wowhead_id: null }],
      loot_submissions: [approvedSub(SUB, CHAR)],
      loot_submission_items: [lsi('r1', SUB, ITEM, 10)],
      character_guild_memberships: [cgm(CHAR, GUILD, true)],
      characters: [char(CHAR, 'NoWowhead', null)],
      loot_history: [award(CHAR, 1001)],
    })
    const { client, calls } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    const body = await res.json()
    expect(body.raiders).toEqual([{ name: 'NoWowhead', class: null, rank: 10 }])
    expect(calls.some((c) => c.table === 'loot_history')).toBe(false)
  })
})

describe('GH #325: D-06 the Loot and Ranks gate', () => {
  it('an item that exists only in a Loot-off tier gives item_not_found, not rankings_hidden', async () => {
    const TIER_LOOT_OFF = uuidFrom('170')
    const ITEM_LOOT_OFF = uuidFrom('171')
    const TIER_OTHER = uuidFrom('172')
    const tables = scenario({
      raid_tiers: [
        { id: TIER_OTHER, expansion_id: EXP, is_guild_active: true, master_sheet_visible: true },
        { id: TIER_LOOT_OFF, expansion_id: EXP, is_guild_active: false, master_sheet_visible: true },
      ],
      loot_items: [{ id: ITEM_LOOT_OFF, raid_tier_id: TIER_LOOT_OFF, name: 'Bilegrip Boots', wowhead_id: 1001 }],
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('item_not_found')
  })

  it('when a visible and a hidden item both match, the visible one is answered', async () => {
    const TIER_HIDDEN = uuidFrom('180')
    const ITEM_HIDDEN = uuidFrom('181')
    const tables = scenario({
      raid_tiers: [
        { id: TIER, expansion_id: EXP, is_guild_active: true, master_sheet_visible: true },
        { id: TIER_HIDDEN, expansion_id: EXP, is_guild_active: true, master_sheet_visible: false },
      ],
      loot_items: [
        { id: ITEM, raid_tier_id: TIER, name: 'Bilegrip Boots', wowhead_id: 1001 },
        { id: ITEM_HIDDEN, raid_tier_id: TIER_HIDDEN, name: 'Bilegrip Boots', wowhead_id: 2002 },
      ],
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.item_wowhead_id).toBe(1001)
  })

  it('master_sheet_visible NULL also gives 403 rankings_hidden', async () => {
    const tables = scenario({
      raid_tiers: [{ id: TIER, expansion_id: EXP, is_guild_active: true, master_sheet_visible: null }],
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('rankings_hidden')
  })

  it('with no Loot-on tier at all, the answer is 404 no_items_in_expansion', async () => {
    const tables = scenario({
      raid_tiers: [{ id: TIER, expansion_id: EXP, is_guild_active: false, master_sheet_visible: true }],
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('no_items_in_expansion')
  })
})

describe('GH #325: D-05/D-07 ordering and one line per raider', () => {
  it('seven active raiders give five lines in rank, slot, name order', async () => {
    const chars = Array.from({ length: 7 }, (_, i) => uuidFrom(`${300 + i}`))
    const subs = Array.from({ length: 7 }, (_, i) => uuidFrom(`${400 + i}`))
    const ranks = [70, 60, 50, 40, 30, 20, 10]
    const names = ['Gamma', 'Alpha', 'Beta', 'Delta', 'Epsilon', 'Zeta', 'Eta']
    const tables = scenario({
      loot_submissions: chars.map((c, i) => approvedSub(subs[i], c)),
      loot_submission_items: chars.map((_, i) => lsi(`r${i}`, subs[i], ITEM, ranks[i])),
      character_guild_memberships: chars.map((c) => cgm(c, GUILD, true)),
      characters: chars.map((c, i) => char(c, names[i], null)),
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    const body = await res.json()
    expect(body.raiders).toHaveLength(5)
    expect(body.raiders.map((r: { rank: number }) => r.rank)).toEqual([70, 60, 50, 40, 30])
  })

  it('a raider with two approved submissions ranking the item appears once with the best rank', async () => {
    const CHAR = uuidFrom('500')
    const SUB1 = uuidFrom('501')
    const SUB2 = uuidFrom('502')
    const tables = scenario({
      loot_submissions: [approvedSub(SUB1, CHAR), approvedSub(SUB2, CHAR)],
      loot_submission_items: [lsi('r1', SUB1, ITEM, 25), lsi('r2', SUB2, ITEM, 60)],
      character_guild_memberships: [cgm(CHAR, GUILD, true)],
      characters: [char(CHAR, 'Twice', null)],
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    const body = await res.json()
    expect(body.raiders).toEqual([{ name: 'Twice', class: null, rank: 60 }])
  })
})

describe('GH #325: basic answers', () => {
  it('no ranked raiders gives 200 with raiders []', async () => {
    const tables = scenario()
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.raiders).toEqual([])
  })

  it('a guild with no active expansion gives 404 no_active_expansion', async () => {
    const tables = scenario({
      guilds: [
        {
          id: GUILD,
          name: 'Test Guild',
          discord_server_id: DISCORD,
          is_active: true,
          created_at: '2020-01-01T00:00:00Z',
          active_expansion_id: null,
        },
      ],
    })
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('no_active_expansion')
  })

  it('an unknown server gives 404 no_guild_linked', async () => {
    const tables = scenario()
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: 'unknown-server', item_query: 'bilegrip' }))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('no_guild_linked')
  })

  it('a missing item_query gives 400', async () => {
    const tables = scenario()
    const { client } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD }))
    expect(res.status).toBe(400)
  })
})

describe('GH #325: pagination', () => {
  it('pages through more than 1000 approved submissions and still finds the raider; records range [1000, 1999] on loot_submissions', async () => {
    const REAL_CHAR = uuidFrom('900')
    const REAL_SUB = `00000000-0000-0000-0000-${String(1000).padStart(12, '0')}`
    const fillerSubs: Row[] = []
    for (let i = 0; i < 1000; i++) {
      fillerSubs.push(approvedSub(`00000000-0000-0000-0000-${String(i).padStart(12, '0')}`, null))
    }
    const tables = scenario({
      loot_submissions: [...fillerSubs, approvedSub(REAL_SUB, REAL_CHAR)],
      loot_submission_items: [lsi('r1', REAL_SUB, ITEM, 15)],
      character_guild_memberships: [cgm(REAL_CHAR, GUILD, true)],
      characters: [char(REAL_CHAR, 'Paged', null)],
    })
    const { client, calls } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    const body = await res.json()
    expect(body.raiders).toEqual([{ name: 'Paged', class: null, rank: 15 }])

    const submissionCalls = calls.filter((c) => c.table === 'loot_submissions')
    expect(submissionCalls.some((c) => c.range && c.range[0] === 1000 && c.range[1] === 1999)).toBe(true)
  })

  it('pages through more than 1000 live loot_submission_items rows on draft submissions and still finds the approved raider; records range [1000, 1999] on loot_submission_items', async () => {
    const REAL_CHAR = uuidFrom('901')
    const REAL_SUB = uuidFrom('902')
    const DRAFT_SUB = uuidFrom('903')
    const fillerRows: Row[] = []
    for (let i = 0; i < 1000; i++) {
      fillerRows.push(lsi(`00000000-0000-0000-0000-${String(i).padStart(12, '0')}`, DRAFT_SUB, ITEM, 5))
    }
    const realRowId = `00000000-0000-0000-0000-${String(1000).padStart(12, '0')}`
    const tables = scenario({
      loot_submissions: [sub(DRAFT_SUB, null, 'draft'), approvedSub(REAL_SUB, REAL_CHAR)],
      loot_submission_items: [...fillerRows, lsi(realRowId, REAL_SUB, ITEM, 25)],
      character_guild_memberships: [cgm(REAL_CHAR, GUILD, true)],
      characters: [char(REAL_CHAR, 'PagedItems', null)],
    })
    const { client, calls } = makeClient(tables)
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
    const body = await res.json()
    expect(body.raiders).toEqual([{ name: 'PagedItems', class: null, rank: 25 }])

    const itemCalls = calls.filter((c) => c.table === 'loot_submission_items')
    expect(itemCalls.some((c) => c.range && c.range[0] === 1000 && c.range[1] === 1999)).toBe(true)
  })
})

describe('GH #325: D-04 every query error returns 500 and calls trackApiError', () => {
  const cases: Array<{ label: string; fail: FailSpec[] }> = [
    { label: 'guilds', fail: [{ table: 'guilds' }] },
    { label: 'raid_tiers', fail: [{ table: 'raid_tiers' }] },
    { label: 'loot_items search', fail: [{ table: 'loot_items', select: 'id, name, wowhead_id' }] },
    { label: 'same-wowhead loot_items read', fail: [{ table: 'loot_items', select: 'id' }] },
    { label: 'loot_submissions', fail: [{ table: 'loot_submissions' }] },
    { label: 'loot_submission_items', fail: [{ table: 'loot_submission_items' }] },
    { label: 'the membership lookup', fail: [{ table: 'character_guild_memberships', select: 'character_id' }] },
    { label: 'loot_history', fail: [{ table: 'loot_history' }] },
    { label: 'characters', fail: [{ table: 'characters' }] },
  ]

  for (const { label, fail } of cases) {
    it(`returns 500 when ${label} fails`, async () => {
      const tables = readyScenario()
      const { client } = makeClient(tables, { fail })
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }))
      expect(res.status).toBe(500)
      const body = await res.json()
      expect(body).toEqual({ error: 'Internal server error' })
      expect(vi.mocked(trackApiError)).toHaveBeenCalled()
    })
  }
})

describe('GH #325: D-09 auth runs before any database call', () => {
  it('answers 503 when BOT_API_KEY is unset, without calling createServiceRoleClient', async () => {
    vi.unstubAllEnvs()
    const res = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }, { authorization: `Bot ${BOT_KEY}` }))
    expect(res.status).toBe(503)
    expect(createServiceRoleClient).not.toHaveBeenCalled()
  })

  it('answers 401 for a missing header, a Bearer scheme, and a wrong token, without calling createServiceRoleClient', async () => {
    const missing = await GET(request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }, {}))
    expect(missing.status).toBe(401)

    const bearer = await GET(
      request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }, { authorization: `Bearer ${BOT_KEY}` })
    )
    expect(bearer.status).toBe(401)

    const wrong = await GET(
      request({ discord_guild_id: DISCORD, item_query: 'bilegrip' }, { authorization: 'Bot wrong-token' })
    )
    expect(wrong.status).toBe(401)

    expect(createServiceRoleClient).not.toHaveBeenCalled()
  })
})
