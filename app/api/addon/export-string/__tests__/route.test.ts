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
import { FACTION_ITEM_ALIASES } from '@/domain/loot/faction-item-aliases'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyOfficerPermissions: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), trackApiError: vi.fn() }))

type Filter = [string, unknown]
type Call = { table: string; cols: string; filters: Filter[]; range?: [number, number] }

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
  loot_submission_items: Array<{
    loot_item_id: string
    rank: number
    slot?: number
    removed_at?: string | null
    loot_items: { wowhead_id: number }
  }>
}

interface Fixture {
  guilds: Array<{ id: string; name: string; active_expansion_id: string }>
  guild_settings: Array<{ guild_id: string }>
  expansions: Array<{ id: string; name: string; current_phase: number }>
  raid_tiers: RaidTierRow[]
  character_guild_memberships: MembershipRow[]
  loot_items: LootItemRow[]
  loot_submissions: LootSubmissionRow[]
  bad_luck_protection: Array<{ guild_id: string; character_id: string; loot_item_id: string; times_passed: number }>
  raid_events: Array<{ guild_id: string; id: string; raid_date: string; raid_team_id: string | null; is_bonus: boolean }>
  item_priorities: Array<{ loot_item_id: string }>
  attendance_records: Array<{ raid_event_id: string; character_id: string }>
  raid_team_members: Array<{ guild_id: string; character_id: string; raid_team_id: string }>
  /** FU-C of 261001-tv5: awards read for the receive skip. */
  loot_history?: Array<{ guild_id: string; character_id: string | null; loot_item: { wowhead_id: number } | null }>
  lootHistoryError?: boolean
}

function emptyFixture(): Fixture {
  return {
    guilds: [],
    guild_settings: [],
    expansions: [],
    raid_tiers: [],
    character_guild_memberships: [],
    loot_items: [],
    loot_submissions: [],
    bad_luck_protection: [],
    raid_events: [],
    item_priorities: [],
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
      const val = find('raid_tier_id')
      if (Array.isArray(val)) return rows.filter((r: { raid_tier_id: string }) => val.includes(r.raid_tier_id))
      return rows.filter((r: { raid_tier_id: string }) => r.raid_tier_id === val)
    }
    case 'loot_submissions':
      return rows.filter((r: { guild_id: string }) => r.guild_id === find('guild_id'))
    case 'bad_luck_protection':
      return rows.filter((r: { guild_id: string }) => r.guild_id === find('guild_id'))
    case 'raid_events':
      return rows.filter((r: { guild_id: string }) => r.guild_id === find('guild_id'))
    case 'item_priorities': {
      const ids = (find('loot_item_id') as string[]) ?? []
      return rows.filter((r: { loot_item_id: string }) => ids.includes(r.loot_item_id))
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
      return rows
  }
}

/** Recording fake matching the export-string query sequence. */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const call: Call = { table, cols: '', filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: (cols: string) => { call.cols = cols; return builder },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        order: () => builder,
        lte: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        limit: () => builder,
        range: (from: number, to: number) => {
          call.range = [from, to]
          if (table === 'loot_history' && fixture.lootHistoryError) {
            return Promise.resolve({ data: null, error: { message: 'history boom' } })
          }
          const rows = resolveRows(table, call.filters, fixture).slice(from, to + 1)
          return Promise.resolve({ data: rows, error: null })
        },
        single: () => {
          const rows = resolveRows(table, call.filters, fixture)
          return Promise.resolve({ data: rows[0] ?? null, error: null })
        },
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
          const rows = resolveRows(table, call.filters, fixture)
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
      loot_submission_items: [
        { loot_item_id: 'li-nef', rank: 12, loot_items: { wowhead_id: 19003 } },
        { loot_item_id: 'li-ony', rank: 7, loot_items: { wowhead_id: 18423 } },
        { loot_item_id: 'li-unrelated', rank: 3, loot_items: { wowhead_id: 16921 } },
      ],
    },
  ]
  return fixture
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
    return { res, items: decodePayload(body.exportString).members[0].items as Array<{ wowhead_id: number; rank: number }>, calls }
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

  it('E4 a loot_history error still returns 200 with every entry', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fixture = baseFixture()
    fixture.loot_submissions[0].loot_submission_items.push(
      { loot_item_id: 'li-bindings', rank: 50, slot: 1, loot_items: { wowhead_id: 20928 } },
      { loot_item_id: 'li-bindings', rank: 30, slot: 2, loot_items: { wowhead_id: 20928 } },
    )
    fixture.loot_history = [{ guild_id: GUILD_ID, character_id: 'c1', loot_item: { wowhead_id: 20928 } }]
    fixture.lootHistoryError = true
    const { res, items } = await memberItems(fixture)
    expect(res.status).toBe(200)
    expect(items.filter(i => i.wowhead_id === 20928)).toEqual([
      { wowhead_id: 20928, rank: 30 },
      { wowhead_id: 20928, rank: 50 },
    ])
    expect(errorSpy).toHaveBeenCalledWith('Failed to read loot history for the addon export receive skip:', 'history boom')
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
  })
})
