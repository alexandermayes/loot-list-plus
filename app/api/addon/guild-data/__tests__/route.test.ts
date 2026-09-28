// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
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
type Call = { table: string; cols: string; filters: Filter[] }

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
  wowhead_id: number
  boss_name: string
  item_slot: string
  item_type: string | null
  classification: string
  raid_tier_id: string
}

interface LootSubmissionRow {
  id: string
  guild_id: string
  character_id: string
  phase: number
  status: string
  loot_submission_items: Array<{ loot_item_id: string; rank: number; loot_items: { wowhead_id: number } }>
}

interface Fixture {
  guilds: Array<{ id: string; name: string; active_expansion_id: string }>
  guild_settings: Array<{ guild_id: string }>
  expansions: Array<{ id: string; name: string; current_phase: number }>
  raid_tiers: Array<{ id: string; name: string; phase: number; expansion_id: string }>
  character_guild_memberships: MembershipRow[]
  loot_items: LootItemRow[]
  loot_submissions: LootSubmissionRow[]
  bad_luck_protection: Array<{ guild_id: string; character_id: string; loot_item_id: string; times_passed: number }>
  raid_events: Array<{ guild_id: string; id: string; raid_date: string; raid_team_id: string | null; is_bonus: boolean }>
  item_priorities: Array<{ loot_item_id: string }>
  attendance_records: Array<{ raid_event_id: string; character_id: string }>
  raid_team_members: Array<{ guild_id: string; character_id: string; raid_team_id: string }>
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
      const tierIds = (find('raid_tier_id') as string[]) ?? []
      return rows.filter((r: { raid_tier_id: string }) => tierIds.includes(r.raid_tier_id))
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
    default:
      return rows
  }
}

/** Recording fake matching the guild-data query sequence. */
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

  // OD-01 fix lands in its own commit — skipped here so commit 1 (the
  // mirror) is green on its own; flipped to `it` in the OD-01 commit.
  it.skip('OD-01: selects loot_items.item_slot (not a nonexistent slot column) and maps it to the output slot field', async () => {
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
