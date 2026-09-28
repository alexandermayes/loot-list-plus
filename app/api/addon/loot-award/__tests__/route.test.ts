// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { buildAddonAwardRow } from '@/lib/loot/loot-history-rows'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyOfficerPermissions: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), trackApiError: vi.fn() }))
vi.mock('@/utils/analytics/funnel', () => ({ evaluateGuildFunnel: vi.fn() }))
vi.mock('@/lib/discord-loot-announcements', () => ({ notifyLootAward: vi.fn() }))
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (fn: () => unknown) => fn(),
}))

const GUILD_ID = 'guild-1'
const OTHER_GUILD_ID = 'guild-2'

type ExpansionRow = { id: string; guild_id: string }
type TierRow = { id: string; expansion_id: string }
type ItemRow = { id: string; name: string; raid_tier_id: string; wowhead_id: number }
type Call = { table: string; filters: Array<[string, unknown]> }

interface Fixture {
  expansions: ExpansionRow[]
  tiers: TierRow[]
  items: ItemRow[]
  activeExpansionId?: string
  characters?: Array<{ character_id: string; characters: { id: string; name: string } }>
  errorOn?: 'expansions' | 'raid_tiers' | 'guilds' | 'loot_items'
}

/**
 * Recording fake matching the real (guild-scoped) query sequence: plain
 * single-column `.eq`/`.in` filters against `expansions`, `raid_tiers`,
 * `guilds`, and `loot_items` in turn, plus `character_guild_memberships`
 * and `loot_history`. Every call is recorded so the guild scope is
 * asserted on the actual filter values flowing through each step.
 */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const call: Call = { table, filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: () => builder,
        insert: (payload: unknown) => { call.filters.push(['__insert_payload__', payload]); return builder },
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        limit: () => builder,
        single: () => {
          if (table === 'guilds') {
            if (fixture.errorOn === 'guilds') return Promise.resolve({ data: null, error: { message: 'guilds boom' } })
            return Promise.resolve({ data: { active_expansion_id: fixture.activeExpansionId ?? null }, error: null })
          }
          if (table === 'loot_history') {
            return Promise.resolve({ data: { id: 'hist-1' }, error: null })
          }
          return Promise.resolve({ data: null, error: null })
        },
        then: (resolve: (v: unknown) => unknown) => {
          if (table === 'expansions') {
            if (fixture.errorOn === 'expansions') {
              return Promise.resolve({ data: null, error: { message: 'expansions boom' } }).then(resolve)
            }
            const guildIdFilter = call.filters.find(([col]) => col === 'guild_id')?.[1]
            const rows = fixture.expansions.filter(e => e.guild_id === guildIdFilter)
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          if (table === 'raid_tiers') {
            if (fixture.errorOn === 'raid_tiers') {
              return Promise.resolve({ data: null, error: { message: 'raid_tiers boom' } }).then(resolve)
            }
            const expansionIdsFilter = (call.filters.find(([col]) => col === 'expansion_id')?.[1] ?? []) as string[]
            const rows = fixture.tiers.filter(t => expansionIdsFilter.includes(t.expansion_id))
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          if (table === 'loot_items') {
            if (fixture.errorOn === 'loot_items') {
              return Promise.resolve({ data: null, error: { message: 'loot_items boom' } }).then(resolve)
            }
            const tierIdsFilter = (call.filters.find(([col]) => col === 'raid_tier_id')?.[1] ?? []) as string[]
            const wowheadFilter = call.filters.find(([col]) => col === 'wowhead_id')?.[1]
            const rows = fixture.items.filter(item => tierIdsFilter.includes(item.raid_tier_id) && item.wowhead_id === wowheadFilter)
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          if (table === 'character_guild_memberships') {
            return Promise.resolve({ data: fixture.characters ?? [], error: null }).then(resolve)
          }
          return Promise.resolve({ data: null, error: null }).then(resolve)
        },
      }
      return builder
    },
  }
  return { client, calls }
}

/** One guild owning one item under one tier/expansion — the common case. */
function singleItemFixture(item: { id: string; name: string; wowhead_id: number }, guildId = GUILD_ID) {
  return {
    expansions: [{ id: 'exp-1', guild_id: guildId }],
    tiers: [{ id: 'tier-1', expansion_id: 'exp-1' }],
    items: [{ id: item.id, name: item.name, raid_tier_id: 'tier-1', wowhead_id: item.wowhead_id }],
  }
}

function request(body: unknown) {
  return new Request('http://localhost/api/addon/loot-award', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

const lootItemsLookups = (calls: Call[]) => calls.filter(c => c.table === 'loot_items')
const lootHistoryInsert = (calls: Call[]) =>
  calls.find(c => c.table === 'loot_history' && c.filters.some(([col]) => col === '__insert_payload__'))

describe('POST /api/addon/loot-award', () => {
  beforeEach(() => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'user-1' }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true } as never)
  })

  it('resolves a Horde Head of Nefarian (19002) to the guild catalog Alliance row (19003)', async () => {
    const { client, calls } = makeClient(singleItemFixture({ id: 'item-19003', name: 'Head of Nefarian', wowhead_id: 19003 }))
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD_ID, wowhead_id: 19002, character_name: 'Thrall' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.item_name).toBe('Head of Nefarian')

    const insert = lootHistoryInsert(calls)
    const payload = insert?.filters.find(([col]) => col === '__insert_payload__')?.[1] as { loot_item_id: string }
    expect(payload.loot_item_id).toBe('item-19003')

    const wowheadFilters = lootItemsLookups(calls).map(c => c.filters.find(([col]) => col === 'wowhead_id')?.[1])
    expect(wowheadFilters).toEqual([19002, 19003])
  })

  it('resolves a Horde Head of Onyxia (18422) to the guild catalog Alliance row (18423)', async () => {
    const { client, calls } = makeClient(singleItemFixture({ id: 'item-18423', name: 'Head of Onyxia', wowhead_id: 18423 }))
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD_ID, wowhead_id: 18422, character_name: 'Thrall' }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.item_name).toBe('Head of Onyxia')
    const insert = lootHistoryInsert(calls)
    const payload = insert?.filters.find(([col]) => col === '__insert_payload__')?.[1] as { loot_item_id: string }
    expect(payload.loot_item_id).toBe('item-18423')
  })

  it('prefers the exact id after one lookup when the guild owns both the Horde and Alliance rows', async () => {
    const { client, calls } = makeClient({
      expansions: [{ id: 'exp-1', guild_id: GUILD_ID }],
      tiers: [{ id: 'tier-a', expansion_id: 'exp-1' }, { id: 'tier-h', expansion_id: 'exp-1' }],
      items: [
        { id: 'item-19003', name: 'Alliance', raid_tier_id: 'tier-a', wowhead_id: 19003 },
        { id: 'item-19002', name: 'Horde', raid_tier_id: 'tier-h', wowhead_id: 19002 },
      ],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD_ID, wowhead_id: 19002, character_name: 'Thrall' }))
    expect(res.status).toBe(200)
    const insert = lootHistoryInsert(calls)
    const payload = insert?.filters.find(([col]) => col === '__insert_payload__')?.[1] as { loot_item_id: string }
    expect(payload.loot_item_id).toBe('item-19002')
    expect(lootItemsLookups(calls)).toHaveLength(1)
  })

  it('makes one loot_items lookup for a non-alias id', async () => {
    const { client, calls } = makeClient(singleItemFixture({ id: 'item-19003', name: 'Head of Nefarian', wowhead_id: 19003 }))
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD_ID, wowhead_id: 19003, character_name: 'Thrall' }))
    expect(res.status).toBe(200)
    expect(lootItemsLookups(calls)).toHaveLength(1)
  })

  it('returns 404 for an unknown wowhead_id, naming it, with no loot_history insert', async () => {
    const { client, calls } = makeClient({
      expansions: [{ id: 'exp-1', guild_id: GUILD_ID }],
      tiers: [{ id: 'tier-1', expansion_id: 'exp-1' }],
      items: [],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD_ID, wowhead_id: 99999, character_name: 'Thrall' }))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(body.error).toContain('99999')
    expect(lootItemsLookups(calls)).toHaveLength(1)
    expect(lootHistoryInsert(calls)).toBeUndefined()
  })

  it('SCOPE-01: never awards another guild row, even when it is the first (and only) match for the id', async () => {
    // guild-2 owns the Alliance catalog row under its own expansion/tier; guild-1 has none.
    const { client, calls } = makeClient({
      expansions: [{ id: 'exp-2', guild_id: OTHER_GUILD_ID }],
      tiers: [{ id: 'tier-2', expansion_id: 'exp-2' }],
      items: [{ id: 'other-guild-item', name: 'Head of Nefarian', raid_tier_id: 'tier-2', wowhead_id: 19003 }],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD_ID, wowhead_id: 19002, character_name: 'Thrall' }))
    const body = await res.json()

    expect(res.status).toBe(404)
    expect(lootHistoryInsert(calls)).toBeUndefined()
    expect(body.error).toContain('19002')
    // The requesting guild has no expansions of its own, so the scoped
    // lookup must resolve to "no rows" without ever querying loot_items —
    // proving guild-2's tier id never reached that query.
    expect(lootItemsLookups(calls)).toHaveLength(0)
  })

  it('SCOPE-01: another guild tier id never reaches the loot_items query even when both guilds have data', async () => {
    const { client, calls } = makeClient({
      expansions: [{ id: 'exp-1', guild_id: GUILD_ID }, { id: 'exp-2', guild_id: OTHER_GUILD_ID }],
      tiers: [{ id: 'tier-1', expansion_id: 'exp-1' }, { id: 'tier-2', expansion_id: 'exp-2' }],
      items: [{ id: 'other-guild-item', name: 'Head of Nefarian', raid_tier_id: 'tier-2', wowhead_id: 19003 }],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD_ID, wowhead_id: 19002, character_name: 'Thrall' }))
    expect(res.status).toBe(404)

    const raidTiersCall = calls.find(c => c.table === 'raid_tiers')
    expect(raidTiersCall?.filters).toEqual([['expansion_id', ['exp-1']]])
    for (const call of lootItemsLookups(calls)) {
      const tierFilter = call.filters.find(([col]) => col === 'raid_tier_id')?.[1]
      expect(tierFilter).toEqual(['tier-1'])
    }
  })

  it('returns a 500 distinct from the 404 no-match case when the guild-scope lookup query errors', async () => {
    const { client, calls } = makeClient({
      expansions: [{ id: 'exp-1', guild_id: GUILD_ID }],
      tiers: [{ id: 'tier-1', expansion_id: 'exp-1' }],
      items: [],
      errorOn: 'loot_items',
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD_ID, wowhead_id: 19002, character_name: 'Thrall' }))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).not.toContain('No loot item found')
    expect(lootHistoryInsert(calls)).toBeUndefined()
  })

  it('GH #294: the insert payload carries raid_tier_id and expansion_id and matches buildAddonAwardRow', async () => {
    const { client, calls } = makeClient(singleItemFixture({ id: 'item-19003', name: 'Head of Nefarian', wowhead_id: 19003 }))
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({
      guild_id: GUILD_ID,
      wowhead_id: 19003,
      character_name: 'Thrall',
      awarded_date: '2026-09-20',
    }))
    expect(res.status).toBe(200)

    const insert = lootHistoryInsert(calls)
    const payload = insert?.filters.find(([col]) => col === '__insert_payload__')?.[1] as {
      raid_tier_id: string
      expansion_id: string
    }
    expect(payload.raid_tier_id).toBe('tier-1')
    expect(payload.expansion_id).toBe('exp-1')
    expect(payload).toEqual(
      buildAddonAwardRow({
        guildId: GUILD_ID,
        item: { id: 'item-19003', raid_tier_id: 'tier-1', expansion_id: 'exp-1' },
        characterId: null,
        characterName: 'Thrall',
        awardedDate: '2026-09-20',
        awardedBy: 'user-1',
        notes: undefined,
        bossName: undefined,
        today: '2026-09-20',
      })
    )
  })

  it('GH #294: records the active expansion tier and expansion id when the guild owns the item under two expansions', async () => {
    const { client, calls } = makeClient({
      activeExpansionId: 'exp-active',
      expansions: [{ id: 'exp-old', guild_id: GUILD_ID }, { id: 'exp-active', guild_id: GUILD_ID }],
      tiers: [{ id: 'tier-old', expansion_id: 'exp-old' }, { id: 'tier-active', expansion_id: 'exp-active' }],
      items: [
        { id: 'item-old', name: 'Head of Nefarian', raid_tier_id: 'tier-old', wowhead_id: 19003 },
        { id: 'item-active', name: 'Head of Nefarian', raid_tier_id: 'tier-active', wowhead_id: 19003 },
      ],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD_ID, wowhead_id: 19003, character_name: 'Thrall' }))
    expect(res.status).toBe(200)

    const insert = lootHistoryInsert(calls)
    const payload = insert?.filters.find(([col]) => col === '__insert_payload__')?.[1] as {
      loot_item_id: string
      raid_tier_id: string
      expansion_id: string
    }
    expect(payload.loot_item_id).toBe('item-active')
    expect(payload.raid_tier_id).toBe('tier-active')
    expect(payload.expansion_id).toBe('exp-active')
  })

  it('returns a 500 when the expansions query errors, not a false 404', async () => {
    const { client } = makeClient({ expansions: [], tiers: [], items: [], errorOn: 'expansions' })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const res = await POST(request({ guild_id: GUILD_ID, wowhead_id: 19003, character_name: 'Thrall' }))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).not.toContain('No loot item found')
  })
})
