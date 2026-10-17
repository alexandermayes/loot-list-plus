// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { deflateRawSync } from 'zlib'
import { POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'
import { verifyOfficerPermissions } from '@/utils/server-roles'
import { trackApiError } from '@/utils/analytics/server'
import { notifyLootAward } from '@/lib/discord-loot-announcements'
import { recomputeBlpForItems } from '@/utils/blp/recompute'
import { addonAwardKey } from '@/lib/loot/addon-award-insert'
import { importAttendanceByTeam, findAwardRaidEvent } from '@/utils/raid-events/team-routing'
import { linkUnlinkedAddonAwards } from '@/utils/raid-events/link-unlinked-awards'

// GH #321: the back-linker has its own tests (utils/raid-events/__tests__);
// here only the route's wiring to it is checked.
vi.mock('@/utils/raid-events/link-unlinked-awards', () => ({
  linkUnlinkedAddonAwards: vi.fn(async () => ({ linked: [], itemIds: [], skipped: [] })),
}))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyOfficerPermissions: vi.fn() }))
vi.mock('@/utils/analytics/server', () => ({ trackEvent: vi.fn(), trackApiError: vi.fn() }))
vi.mock('@/lib/discord-loot-announcements', () => ({ notifyLootAward: vi.fn() }))
vi.mock('@/utils/blp/recompute', () => ({ recomputeBlpForEvents: vi.fn(), recomputeBlpForItems: vi.fn() }))
// toRaidNightDate stays real: lib/addon/award-session.ts uses it.
vi.mock('@/utils/raid-events/team-routing', async (importOriginal) => ({
  toRaidNightDate: (await importOriginal<typeof import('@/utils/raid-events/team-routing')>()).toRaidNightDate,
  importAttendanceByTeam: vi.fn(async () => ({ eventIds: [] })),
  findAwardRaidEvent: vi.fn(async () => ({ raidEventId: null, outcome: 'no_raid_night' })),
}))
vi.mock('next/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/server')>()),
  after: (fn: () => unknown) => fn(),
}))

const GUILD_ID = 'g1'
const OTHER_GUILD_ID = 'g2'
// UUID-shaped ids for the OD-2 loot_item_id guild-scope checks below —
// resolveGuildLootItemIds only queries loot_items for well-formed UUIDs.
const ITEM_ID = 'aaaaaaaa-0000-0000-0000-000000000001'
const FOREIGN_ITEM_ID = 'bbbbbbbb-0000-0000-0000-000000000002'

type ExpansionRow = { id: string; guild_id: string }
type TierRow = { id: string; expansion_id: string; name?: string }
type ItemRow = { id: string; raid_tier_id: string; wowhead_id: number; boss_name?: string }
type Call = {
  table: string
  filters: Array<[string, unknown]>
  insertPayload?: unknown
  updatePayload?: unknown
  columns?: string
}
/** A loot_history row in the fake's in-memory store (FU-1 of #331, #293). */
type HistoryRow = {
  id: string
  guild_id: string
  loot_item_id: string
  character_id: string | null
  character_name: string | null
  raid_event_id: string | null
  award_copy: number
  source_award_key: string | null
}

interface Fixture {
  expansions: ExpansionRow[]
  tiers: TierRow[]
  items: ItemRow[]
  errorOn?: 'expansions' | 'raid_tiers' | 'guilds' | 'loot_items'
  characters?: Array<{ character_id: string; characters: { id: string; name: string } }>
  /** loot_history insert error (e.g. a 23505 on a re-import). */
  insertError?: { code?: string; message: string }
  /** Row returned by the post-23505 existing-row lookup. */
  lookupRow?: { id: string } | null
  /** Existing loot_history rows. The keyed addon path reads, stamps and
   * inserts against this store, and inserts enforce both unique rules. */
  history?: HistoryRow[]
  /** GH #355: the active expansion's timezone; null or absent means no active expansion. */
  raidTimeZone?: string | null
  /** GH #355: the raid time zone read (guilds.maybeSingle) fails. */
  raidTimeZoneError?: boolean
}

function matchesFilters(row: Record<string, unknown>, filters: Array<[string, unknown]>): boolean {
  return filters.every(([col, val]) => {
    if (col.startsWith('is:')) return row[col.slice(3)] === null
    return Array.isArray(val) ? val.includes(row[col]) : row[col] === val
  })
}

/** Recording fake matching the guild-scoped query sequence (expansions -> raid_tiers -> guilds -> loot_items). */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []
  const history: HistoryRow[] = fixture.history ?? []

  function insertHistory(payload: Record<string, unknown>) {
    const next: HistoryRow = {
      id: `hist-${history.length + 1}`,
      guild_id: payload.guild_id as string,
      loot_item_id: payload.loot_item_id as string,
      character_id: (payload.character_id as string | null | undefined) ?? null,
      character_name: (payload.character_name as string | null | undefined) ?? null,
      raid_event_id: (payload.raid_event_id as string | null | undefined) ?? null,
      award_copy: (payload.award_copy as number | undefined) ?? 1,
      source_award_key: (payload.source_award_key as string | null | undefined) ?? null,
    }
    const clash = history.some(r =>
      (next.source_award_key !== null && r.guild_id === next.guild_id && r.source_award_key === next.source_award_key) ||
      (next.raid_event_id !== null && next.character_id !== null &&
        r.guild_id === next.guild_id && r.loot_item_id === next.loot_item_id &&
        r.character_id === next.character_id && r.raid_event_id === next.raid_event_id &&
        r.award_copy === next.award_copy),
    )
    if (clash) return { data: null, error: { code: '23505', message: 'duplicate key' } }
    history.push(next)
    return { data: { id: next.id }, error: null }
  }

  const client = {
    from(table: string) {
      const call: Call = { table, filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: (columns?: string) => { if (!call.insertPayload && !call.updatePayload) call.columns = columns; return builder },
        insert: (payload: unknown) => { call.insertPayload = payload; return builder },
        update: (payload: unknown) => { call.updatePayload = payload; return builder },
        order: () => builder,
        eq: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push([col, val]); return builder },
        is: (col: string, val: unknown) => { call.filters.push([`is:${col}`, val]); return builder },
        limit: () => builder,
        single: () => {
          if (table === 'guilds') {
            if (fixture.errorOn === 'guilds') return Promise.resolve({ data: null, error: { message: 'guilds boom' } })
            return Promise.resolve({ data: { active_expansion_id: null }, error: null })
          }
          if (table === 'loot_history') {
            if (fixture.insertError) return Promise.resolve({ data: null, error: fixture.insertError })
            return Promise.resolve(insertHistory(call.insertPayload as Record<string, unknown>))
          }
          return Promise.resolve({ data: null, error: null })
        },
        maybeSingle: () => {
          if (table === 'guilds') {
            if (fixture.raidTimeZoneError) return Promise.resolve({ data: null, error: { message: 'guilds boom' } })
            return Promise.resolve({
              data: {
                active_expansion_id: null,
                expansions: fixture.raidTimeZone == null ? null : { timezone: fixture.raidTimeZone },
              },
              error: null,
            })
          }
          if (table === 'loot_history' && call.filters.some(([col]) => col === 'source_award_key')) {
            const found = history.find(r => matchesFilters(r, call.filters))
            return Promise.resolve({ data: found ? { id: found.id } : null, error: null })
          }
          if (table === 'loot_history' && call.columns === 'award_copy') {
            const copies = history.filter(r => matchesFilters(r, call.filters)).map(r => r.award_copy)
            return Promise.resolve({ data: copies.length ? { award_copy: Math.max(...copies) } : null, error: null })
          }
          if (table === 'loot_history') return Promise.resolve({ data: fixture.lookupRow ?? null, error: null })
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
            const wowheadFilter = call.filters.find(([col]) => col === 'wowhead_id')
            const idFilter = call.filters.find(([col]) => col === 'id')
            const rows = fixture.items.filter(item => {
              if (!tierIdsFilter.includes(item.raid_tier_id)) return false
              if (wowheadFilter) {
                const [, val] = wowheadFilter
                if (item.wowhead_id !== val) return false
              }
              if (idFilter) {
                const [, val] = idFilter as [string, string[]]
                if (!val.includes(item.id)) return false
              }
              return true
            })
            return Promise.resolve({ data: rows.map(r => ({ ...r, name: 'item' })), error: null }).then(resolve)
          }
          if (table === 'loot_history' && call.updatePayload) {
            const stamped = history.filter(r => matchesFilters(r, call.filters))
            for (const r of stamped) Object.assign(r, call.updatePayload)
            return Promise.resolve({ data: stamped.map(r => ({ id: r.id })), error: null }).then(resolve)
          }
          if (table === 'loot_history') {
            const rows = history.filter(r => matchesFilters(r, call.filters)).sort((a, b) => a.award_copy - b.award_copy)
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
function singleItemFixture(item: { id: string; wowhead_id: number }, guildId = GUILD_ID) {
  return {
    expansions: [{ id: 'exp-1', guild_id: guildId }],
    tiers: [{ id: 'tier-1', expansion_id: 'exp-1' }],
    items: [{ id: item.id, raid_tier_id: 'tier-1', wowhead_id: item.wowhead_id }],
  }
}

function importString(payload: unknown) {
  const json = JSON.stringify(payload)
  const compressed = deflateRawSync(Buffer.from(json, 'utf-8'))
  return 'LLP1E:1:' + compressed.toString('base64')
}

function request(body: unknown) {
  return new Request('http://localhost/api/addon/import-string', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0]
}

const lootItemsLookups = (calls: Call[]) => calls.filter(c => c.table === 'loot_items')
const lootHistoryInserts = (calls: Call[]) => calls.filter(c => c.table === 'loot_history' && c.insertPayload)

describe('POST /api/addon/import-string', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: 'user-1' }, error: null } as never)
    vi.mocked(verifyOfficerPermissions).mockResolvedValue({ hasPermission: true } as never)
    vi.mocked(importAttendanceByTeam).mockImplementation(async () => ({ eventIds: [], attendedCount: 0, absentCount: 0 }))
    vi.mocked(findAwardRaidEvent).mockImplementation(async () => ({ raidEventId: null, outcome: 'no_raid_night' }))
  })

  it('GH #294: the wowheadId-only path (missing lootItemId) carries raid_tier_id and expansion_id, resolving the Horde id to the guild catalog Alliance row', async () => {
    const { client, calls } = makeClient(singleItemFixture({ id: 'item-19003', wowhead_id: 19003 }))
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const payload = { guildId: GUILD_ID, exportedAt: '2026-09-20T00:00:00Z', awards: [{ wowheadId: 19002, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' }], attendance: [] }
    const res = await POST(request({ importString: importString(payload) }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.awards).toEqual({ processed: 1, errors: 0, already_recorded: 0 })

    const insert = lootHistoryInserts(calls)[0]
    const insertPayload = insert?.insertPayload as { loot_item_id: string; raid_tier_id: string; expansion_id: string }
    expect(insertPayload.loot_item_id).toBe('item-19003')
    expect(insertPayload.raid_tier_id).toBe('tier-1')
    expect(insertPayload.expansion_id).toBe('exp-1')

    const wowheadFilters = lootItemsLookups(calls).map(c => c.filters.find(([col]) => col === 'wowhead_id')?.[1])
    expect(wowheadFilters).toEqual([19002, 19003])
  })

  it('OD-2: a supplied lootItemId the guild owns directly is checked (loot_items filtered by id and the guild tier ids) and its payload carries the server tier and expansion', async () => {
    const { client, calls } = makeClient(singleItemFixture({ id: ITEM_ID, wowhead_id: 19003 }))
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const payload = { guildId: GUILD_ID, exportedAt: '2026-09-20T00:00:00Z', awards: [{ wowheadId: 19003, lootItemId: ITEM_ID, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' }], attendance: [] }
    const res = await POST(request({ importString: importString(payload) }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.awards).toEqual({ processed: 1, errors: 0, already_recorded: 0 })

    const idLookup = lootItemsLookups(calls).find(c => c.filters.some(([col]) => col === 'id'))
    expect(idLookup?.filters.find(([col]) => col === 'id')?.[1]).toEqual([ITEM_ID])
    expect(idLookup?.filters.find(([col]) => col === 'raid_tier_id')?.[1]).toEqual(['tier-1'])

    const insert = lootHistoryInserts(calls)[0]
    const insertPayload = insert?.insertPayload as { loot_item_id: string; raid_tier_id: string; expansion_id: string }
    expect(insertPayload.loot_item_id).toBe(ITEM_ID)
    expect(insertPayload.raid_tier_id).toBe('tier-1')
    expect(insertPayload.expansion_id).toBe('exp-1')
  })

  it('OD-2: a lootItemId not owned by the guild falls back to the wowheadId and the resolved item (not the foreign id) is written', async () => {
    const { client, calls } = makeClient(singleItemFixture({ id: ITEM_ID, wowhead_id: 19003 }))
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    // FOREIGN_ITEM_ID is well-formed but not owned by GUILD_ID — the guild
    // has no loot_items row with that id — so it falls back to wowheadId 19003.
    const payload = {
      guildId: GUILD_ID,
      exportedAt: '2026-09-20T00:00:00Z',
      awards: [{ wowheadId: 19003, lootItemId: FOREIGN_ITEM_ID, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' }],
      attendance: [],
    }
    const res = await POST(request({ importString: importString(payload) }))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.awards).toEqual({ processed: 1, errors: 0, already_recorded: 0 })

    const insert = lootHistoryInserts(calls)[0]
    const insertPayload = insert?.insertPayload as { loot_item_id: string; raid_tier_id: string; expansion_id: string }
    // The foreign id is never written — the wowheadId-resolved guild item is.
    expect(insertPayload.loot_item_id).toBe(ITEM_ID)
    expect(insertPayload.raid_tier_id).toBe('tier-1')
    expect(insertPayload.expansion_id).toBe('exp-1')
  })

  it('OD-2: a lootItemId not owned by the guild whose wowheadId also does not resolve rejects the whole import with 400, nothing processed', async () => {
    const { client, calls } = makeClient({
      expansions: [{ id: 'exp-1', guild_id: GUILD_ID }],
      tiers: [{ id: 'tier-1', expansion_id: 'exp-1' }],
      items: [],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const payload = {
      guildId: GUILD_ID,
      exportedAt: '2026-09-20T00:00:00Z',
      awards: [{ wowheadId: 99999, lootItemId: FOREIGN_ITEM_ID, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' }],
      attendance: [{ raidDate: '2026-09-20', raidName: 'BWL', startTime: '20:00', endTime: '23:00', bossKills: [], attended: [] }],
    }
    const res = await POST(request({ importString: importString(payload) }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.invalid_loot_item_ids).toEqual([FOREIGN_ITEM_ID])
    expect(body.error).toBe("Some loot items aren't in this guild's loot tables. Refresh the page and try again.")
    expect(lootHistoryInserts(calls)).toHaveLength(0)
    expect(importAttendanceByTeam).not.toHaveBeenCalled()
    expect(findAwardRaidEvent).not.toHaveBeenCalled()
  })

  it('OD-2: a mix of a guild-owned id and a fully-unresolvable foreign id rejects the whole import with 400 and zero inserts', async () => {
    const { client, calls } = makeClient(singleItemFixture({ id: ITEM_ID, wowhead_id: 19003 }))
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const payload = {
      guildId: GUILD_ID,
      exportedAt: '2026-09-20T00:00:00Z',
      awards: [
        { wowheadId: 19003, lootItemId: ITEM_ID, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' },
        { wowheadId: 88888, lootItemId: FOREIGN_ITEM_ID, characterName: 'Jaina', awardedAt: '2026-09-20T20:00:00Z' },
      ],
      attendance: [],
    }
    const res = await POST(request({ importString: importString(payload) }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.invalid_loot_item_ids).toEqual([FOREIGN_ITEM_ID])
    expect(lootHistoryInserts(calls)).toHaveLength(0)
  })

  it('counts an unresolvable wowheadId as an error with no loot_history insert', async () => {
    const { client, calls } = makeClient({
      expansions: [{ id: 'exp-1', guild_id: GUILD_ID }],
      tiers: [{ id: 'tier-1', expansion_id: 'exp-1' }],
      items: [],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const payload = { guildId: GUILD_ID, exportedAt: '2026-09-20T00:00:00Z', awards: [{ wowheadId: 99999, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' }], attendance: [] }
    const res = await POST(request({ importString: importString(payload) }))
    const body = await res.json()

    expect(body.data.awards).toEqual({ processed: 0, errors: 1, already_recorded: 0 })
    expect(lootHistoryInserts(calls)).toHaveLength(0)
  })

  it('SCOPE-01: never awards another guild row for the same wowhead_id', async () => {
    const { client, calls } = makeClient({
      expansions: [{ id: 'exp-1', guild_id: GUILD_ID }, { id: 'exp-2', guild_id: OTHER_GUILD_ID }],
      tiers: [{ id: 'tier-1', expansion_id: 'exp-1' }, { id: 'tier-2', expansion_id: 'exp-2' }],
      items: [{ id: 'other-guild-item', raid_tier_id: 'tier-2', wowhead_id: 19003 }],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

    const payload = { guildId: GUILD_ID, exportedAt: '2026-09-20T00:00:00Z', awards: [{ wowheadId: 19002, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' }], attendance: [] }
    const res = await POST(request({ importString: importString(payload) }))
    const body = await res.json()

    expect(body.data.awards).toEqual({ processed: 0, errors: 1, already_recorded: 0 })
    expect(lootHistoryInserts(calls)).toHaveLength(0)

    // Another guild's tier id must never reach the loot_items query.
    const raidTiersCall = calls.find(c => c.table === 'raid_tiers')
    expect(raidTiersCall?.filters).toEqual([['expansion_id', ['exp-1']]])
    for (const call of lootItemsLookups(calls)) {
      const tierFilter = call.filters.find(([col]) => col === 'raid_tier_id')?.[1]
      expect(tierFilter).toEqual(['tier-1'])
    }
  })

  describe('guild-scope query errors are not silently swallowed as a genuine no-match', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleErrorSpy.mockRestore()
    })

    it('counts a loot_items query error as an award error, logged distinctly from a genuine miss', async () => {
      const { client, calls } = makeClient({
        expansions: [{ id: 'exp-1', guild_id: GUILD_ID }],
        tiers: [{ id: 'tier-1', expansion_id: 'exp-1' }],
        items: [],
        errorOn: 'loot_items',
      })
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const payload = { guildId: GUILD_ID, exportedAt: '2026-09-20T00:00:00Z', awards: [{ wowheadId: 19002, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' }], attendance: [] }
      const res = await POST(request({ importString: importString(payload) }))
      const body = await res.json()

      expect(body.data.awards).toEqual({ processed: 0, errors: 1, already_recorded: 0 })
      expect(lootHistoryInserts(calls)).toHaveLength(0)

      const loggedError = consoleErrorSpy.mock.calls.find((call: unknown[]) => String(call[0]).includes('Failed to process award'))
      expect(loggedError, 'expected the loot_items query failure to be logged').toBeDefined()
      const thrown = loggedError?.[1] as Error
      expect(thrown?.message).toMatch(/loot_items/i)
      expect(thrown?.message).not.toMatch(/Could not resolve item/)
    })

    it('counts an expansions query error as an award error, distinct from a genuine miss', async () => {
      const { client } = makeClient({ expansions: [], tiers: [], items: [], errorOn: 'expansions' })
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const payload = { guildId: GUILD_ID, exportedAt: '2026-09-20T00:00:00Z', awards: [{ wowheadId: 19003, characterName: 'Thrall', awardedAt: '2026-09-20T20:00:00Z' }], attendance: [] }
      const res = await POST(request({ importString: importString(payload) }))
      const body = await res.json()

      expect(body.data.awards).toEqual({ processed: 0, errors: 1, already_recorded: 0 })
      const loggedError = consoleErrorSpy.mock.calls.find((call: unknown[]) => String(call[0]).includes('Failed to process award'))
      const thrown = loggedError?.[1] as Error
      expect(thrown?.message).toMatch(/expansions/i)
    })
  })

  describe('GH #295 / #307: attendance first, session nights and live tier hints', () => {
    const AQ20_ITEM = 'aaaaaaaa-0000-0000-0000-000000000020'
    const AQ40_ITEM = 'aaaaaaaa-0000-0000-0000-000000000040'
    const thrall = [{ character_id: 'char-1', characters: { id: 'char-1', name: 'Thrall' } }]

    function aqFixture(extra: Partial<Fixture> = {}): Fixture {
      return {
        expansions: [{ id: 'exp-classic', guild_id: GUILD_ID }],
        tiers: [
          { id: 'tier-a-aq20', expansion_id: 'exp-classic', name: "Ruins of Ahn'Qiraj" },
          { id: 'tier-b-aq40', expansion_id: 'exp-classic', name: "Temple of Ahn'Qiraj" },
        ],
        items: [
          { id: AQ40_ITEM, raid_tier_id: 'tier-b-aq40', wowhead_id: 20727, boss_name: 'Shared Boss Loot' },
          { id: AQ20_ITEM, raid_tier_id: 'tier-a-aq20', wowhead_id: 20727, boss_name: 'Shared Boss Loot' },
          { id: 'aq40-cthun', raid_tier_id: 'tier-b-aq40', wowhead_id: 21221, boss_name: "C'Thun" },
          { id: 'aq20-ossirian', raid_tier_id: 'tier-a-aq20', wowhead_id: 21220, boss_name: 'Ossirian the Unscarred' },
        ],
        characters: thrall,
        ...extra,
      }
    }

    // A session that crosses 00:00 UTC, with a live C'Thun kill.
    const aq40Session = {
      raidDate: '2026-09-20',
      raidName: "Temple of Ahn'Qiraj",
      startTime: '2026-09-20T23:00:00Z',
      endTime: '2026-09-21T03:00:00Z',
      bossKills: [{ bossName: "C'Thun", killTime: '2026-09-21T00:45:00Z', roster: [] }],
      attended: ['Thrall'],
    }

    // The addon's cached catalog row (AQ20) and its cached boss label.
    const cachedAward = {
      wowheadId: 20727,
      lootItemId: AQ20_ITEM,
      characterName: 'Thrall',
      bossName: 'Shared Boss Loot',
      raidName: "Ruins of Ahn'Qiraj",
      awardedAt: '2026-09-21T01:00:00Z',
    }

    function payloadWith(awards: unknown[], attendance: unknown[]) {
      return { guildId: GUILD_ID, exportedAt: '2026-09-21T04:00:00Z', awards, attendance }
    }

    const insertPayload = (calls: Call[]) =>
      lootHistoryInserts(calls)[0]?.insertPayload as {
        loot_item_id: string
        raid_tier_id: string
        raid_event_id: string | null
        awarded_date: string
      }

    it('processes attendance before awards', async () => {
      const { client } = makeClient(aqFixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({ importString: importString(payloadWith([cachedAward], [aq40Session])) }))
      expect(res.status).toBe(200)

      const attendanceOrder = vi.mocked(importAttendanceByTeam).mock.invocationCallOrder[0]
      const awardOrder = vi.mocked(findAwardRaidEvent).mock.invocationCallOrder[0]
      expect(attendanceOrder).toBeDefined()
      expect(awardOrder).toBeDefined()
      expect(attendanceOrder).toBeLessThan(awardOrder)
    })

    it("links an award inside a session with the session's raidDate, not the awardedAt date", async () => {
      vi.mocked(findAwardRaidEvent).mockResolvedValueOnce({ raidEventId: 'ev-0920', outcome: 'linked' })
      const { client, calls } = makeClient(aqFixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      await POST(request({ importString: importString(payloadWith([cachedAward], [aq40Session])) }))

      expect(findAwardRaidEvent).toHaveBeenCalledWith(client, GUILD_ID, '2026-09-20', 'char-1')
      expect(insertPayload(calls).raid_event_id).toBe('ev-0920')
      // GH #355: the stored date is the zoned night (session start 19:00 EDT on the 20th).
      expect(insertPayload(calls).awarded_date).toBe('2026-09-20')
    })

    it('uses the zoned awardedAt night for an award outside any session (05:00Z is 01:00 EDT, rollover)', async () => {
      const { client, calls } = makeClient(aqFixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const late = { ...cachedAward, awardedAt: '2026-09-21T05:00:00Z' }
      await POST(request({ importString: importString(payloadWith([late], [aq40Session])) }))

      expect(findAwardRaidEvent).toHaveBeenCalledWith(client, GUILD_ID, '2026-09-20', 'char-1')
      expect(insertPayload(calls).raid_event_id).toBeNull()
    })

    it("replaces the cached AQ20 lootItemId with the AQ40 row when the live C'Thun kill decides", async () => {
      const { client, calls } = makeClient(aqFixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({ importString: importString(payloadWith([cachedAward], [aq40Session])) }))
      const body = await res.json()

      expect(body.data.awards).toEqual({ processed: 1, errors: 0, already_recorded: 0 })
      expect(insertPayload(calls).loot_item_id).toBe(AQ40_ITEM)
      expect(insertPayload(calls).raid_tier_id).toBe('tier-b-aq40')
    })

    // GH #307: the addon records a session's instance name as the game
    // reports it (GetInstanceInfo), and on Classic Era names AQ40 kills
    // from its own NPC table, so neither "Ahn'Qiraj Temple" nor "Princess
    // Yauj" is a catalog name. Before GH #307's instance names the import
    // kept the addon's cached AQ20 row.
    it('files an AQ formula from a live AQ40 session under Temple of Ahn\'Qiraj when the game names the instance Ahn\'Qiraj Temple', async () => {
      const { client, calls } = makeClient(aqFixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const eraAq40Session = {
        ...aq40Session,
        raidName: "Ahn'Qiraj Temple",
        bossKills: [{ bossName: 'Princess Yauj', killTime: '2026-09-21T00:45:00Z', roster: [] }],
      }
      const res = await POST(request({ importString: importString(payloadWith([cachedAward], [eraAq40Session])) }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.awards).toEqual({ processed: 1, errors: 0, already_recorded: 0 })
      expect(insertPayload(calls).loot_item_id).toBe(AQ40_ITEM)
      expect(insertPayload(calls).raid_tier_id).toBe('tier-b-aq40')
    })

    it('keeps the cached lootItemId when there is no session', async () => {
      const { client, calls } = makeClient(aqFixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      await POST(request({ importString: importString(payloadWith([cachedAward], [])) }))

      expect(insertPayload(calls).loot_item_id).toBe(AQ20_ITEM)
    })

    it('keeps the cached lootItemId when the live hints do not decide', async () => {
      const { client, calls } = makeClient(aqFixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const undecided = { ...aq40Session, raidName: 'Unknown', bossKills: [] }
      await POST(request({ importString: importString(payloadWith([cachedAward], [undecided])) }))

      expect(insertPayload(calls).loot_item_id).toBe(AQ20_ITEM)
    })

    it('recomputes BLP for the item of a newly linked award', async () => {
      vi.mocked(findAwardRaidEvent).mockResolvedValueOnce({ raidEventId: 'ev-0920', outcome: 'linked' })
      const { client } = makeClient(aqFixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      await POST(request({ importString: importString(payloadWith([cachedAward], [aq40Session])) }))

      expect(recomputeBlpForItems).toHaveBeenCalledWith(client, GUILD_ID, [AQ40_ITEM])
      expect(notifyLootAward).toHaveBeenCalledWith(client, GUILD_ID, [
        { itemId: AQ40_ITEM, characterName: 'Thrall', raidEventId: 'ev-0920' },
      ])
    })

    it('does not recompute item BLP for an unlinked award', async () => {
      const { client } = makeClient(aqFixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      await POST(request({ importString: importString(payloadWith([cachedAward], [])) }))

      expect(recomputeBlpForItems).not.toHaveBeenCalled()
    })

    it('a re-import counts as processed and already_recorded, not an error, and is not announced', async () => {
      // FU-1 of #331, #293: the award is matched by its key, not by a 23505.
      vi.mocked(findAwardRaidEvent).mockResolvedValueOnce({ raidEventId: 'ev-0920', outcome: 'linked' })
      const { client, calls } = makeClient(aqFixture({
        history: [{
          id: 'hist-old', guild_id: GUILD_ID, loot_item_id: AQ40_ITEM, character_id: 'char-1', character_name: 'Thrall',
          raid_event_id: 'ev-0920', award_copy: 1, source_award_key: 'addon:2026-09-21T01:00:00Z:20727:thrall',
        }],
      }))
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({ importString: importString(payloadWith([cachedAward], [aq40Session])) }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.awards).toEqual({ processed: 1, errors: 0, already_recorded: 1 })
      expect(lootHistoryInserts(calls)).toHaveLength(0)
      expect(notifyLootAward).not.toHaveBeenCalled()
      expect(recomputeBlpForItems).not.toHaveBeenCalled()
    })

    it('a raid-night lookup error still saves the award unlinked', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(findAwardRaidEvent).mockRejectedValueOnce(new Error('raid_events boom'))
      const { client, calls } = makeClient(aqFixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({ importString: importString(payloadWith([cachedAward], [aq40Session])) }))
      const body = await res.json()
      consoleErrorSpy.mockRestore()

      expect(body.data.awards).toEqual({ processed: 1, errors: 0, already_recorded: 0 })
      expect(insertPayload(calls).raid_event_id).toBeNull()
      expect(trackApiError).toHaveBeenCalledWith('unknown', 'POST /api/addon/import-string', expect.any(Error))
    })

    describe('FU-1 of #331, #293: a second award of one item to one raider on one night', () => {
      const BINDINGS_ITEM = 'aq40-bindings'
      const KEY_1 = 'addon:2026-09-20T20:00:00Z:20928:thrall'
      const KEY_2 = 'addon:2026-09-20T21:30:00Z:20928:thrall'
      const bindingsAt = (awardedAt: string) => ({
        wowheadId: 20928,
        characterName: 'Thrall',
        bossName: 'Shared Boss Loot',
        awardedAt,
      })
      const first = bindingsAt('2026-09-20T20:00:00Z')
      const second = bindingsAt('2026-09-20T21:30:00Z')
      const stored = (id: string, copy: number, key: string | null): HistoryRow => ({
        id, guild_id: GUILD_ID, loot_item_id: BINDINGS_ITEM, character_id: 'char-1', character_name: 'Thrall',
        raid_event_id: 'ev-0920', award_copy: copy, source_award_key: key,
      })
      function bindingsFixture(history: HistoryRow[] = []): Fixture {
        const base = aqFixture()
        return {
          ...base,
          items: [...base.items, { id: BINDINGS_ITEM, raid_tier_id: 'tier-b-aq40', wowhead_id: 20928, boss_name: 'Shared Boss Loot' }],
          history,
        }
      }
      const insertedRows = (calls: Call[]) =>
        lootHistoryInserts(calls).map(c => {
          const p = c.insertPayload as { award_copy?: number; source_award_key?: string }
          return { award_copy: p.award_copy, source_award_key: p.source_award_key }
        })

      beforeEach(() => {
        vi.mocked(findAwardRaidEvent).mockResolvedValue({ raidEventId: 'ev-0920', outcome: 'linked' })
      })

      it('I1 two awards at different times record copy 1 and copy 2 with their own keys', async () => {
        const fixture = bindingsFixture()
        const { client, calls } = makeClient(fixture)
        vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

        const res = await POST(request({ importString: importString(payloadWith([first, second], [])) }))
        const body = await res.json()

        expect(body.data.awards).toEqual({ processed: 2, errors: 0, already_recorded: 0 })
        expect(insertedRows(calls)).toEqual([
          { award_copy: 1, source_award_key: KEY_1 },
          { award_copy: 2, source_award_key: KEY_2 },
        ])
        expect(fixture.history).toHaveLength(2)
        const announced = vi.mocked(notifyLootAward).mock.calls[0][2]
        expect(announced).toHaveLength(2)
      })

      it('I2 importing the same export again records nothing and reports both as already recorded', async () => {
        const fixture = bindingsFixture([stored('hist-a', 1, KEY_1), stored('hist-b', 2, KEY_2)])
        const { client, calls } = makeClient(fixture)
        vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

        const res = await POST(request({ importString: importString(payloadWith([first, second], [])) }))
        const body = await res.json()

        expect(body.data.awards).toEqual({ processed: 2, errors: 0, already_recorded: 2 })
        expect(lootHistoryInserts(calls)).toHaveLength(0)
        expect(fixture.history).toHaveLength(2)
        expect(notifyLootAward).not.toHaveBeenCalled()
        expect(recomputeBlpForItems).not.toHaveBeenCalled()
      })

      it('I3 an export holding only the second award, after the first was imported, records copy 2', async () => {
        const fixture = bindingsFixture([stored('hist-a', 1, KEY_1)])
        const { client, calls } = makeClient(fixture)
        vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

        const res = await POST(request({ importString: importString(payloadWith([second], [])) }))
        const body = await res.json()

        expect(body.data.awards).toEqual({ processed: 1, errors: 0, already_recorded: 0 })
        expect(insertedRows(calls)).toEqual([{ award_copy: 2, source_award_key: KEY_2 }])
      })

      it('I4 an unkeyed row on the night absorbs the award: it is stamped with the key and nothing is inserted', async () => {
        const fixture = bindingsFixture([stored('hist-web', 1, null)])
        const { client, calls } = makeClient(fixture)
        vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

        const res = await POST(request({ importString: importString(payloadWith([first], [])) }))
        const body = await res.json()

        expect(body.data.awards).toEqual({ processed: 1, errors: 0, already_recorded: 1 })
        expect(lootHistoryInserts(calls)).toHaveLength(0)
        expect(fixture.history).toEqual([stored('hist-web', 1, KEY_1)])
        const stamp = calls.find(c => c.table === 'loot_history' && c.updatePayload)
        expect(stamp?.updatePayload).toEqual({ source_award_key: KEY_1 })
        expect(notifyLootAward).not.toHaveBeenCalled()
      })

      describe('FU-C of 261001-tv5: an award that carries an awardId', () => {
        const AWARD_A = '2026-09-20T20:00:00Z-1-a1b2c3'
        const AWARD_B = '2026-09-20T20:00:00Z-2-d4e5f6'
        const ADDON2_A = `addon2:${AWARD_A}:20928:thrall`
        const ADDON2_B = `addon2:${AWARD_B}:20928:thrall`
        const withId = (awardId: string) => ({ ...first, awardId })
        const keyLookupValues = (calls: Call[]) =>
          calls
            .filter(c => c.table === 'loot_history')
            .flatMap(c => c.filters.filter(([col]) => col === 'source_award_key').map(([, val]) => val))

        it('I5 gets the addon2 key and its lookup includes the legacy key', async () => {
          const fixture = bindingsFixture([])
          const { client, calls } = makeClient(fixture)
          vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

          const res = await POST(request({ importString: importString(payloadWith([withId(AWARD_A)], [])) }))
          const body = await res.json()

          expect(body.data.awards).toEqual({ processed: 1, errors: 0, already_recorded: 0 })
          expect(insertedRows(calls)).toEqual([{ award_copy: 1, source_award_key: ADDON2_A }])
          expect(keyLookupValues(calls)).toEqual([[ADDON2_A, KEY_1]])
        })

        it('I5b an award stored earlier under its legacy key is already recorded, not doubled', async () => {
          const fixture = bindingsFixture([stored('hist-legacy', 1, KEY_1)])
          const { client, calls } = makeClient(fixture)
          vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

          const res = await POST(request({ importString: importString(payloadWith([withId(AWARD_A)], [])) }))
          const body = await res.json()

          expect(body.data.awards).toEqual({ processed: 1, errors: 0, already_recorded: 1 })
          expect(lootHistoryInserts(calls)).toHaveLength(0)
          expect(fixture.history).toHaveLength(1)
        })

        it('I6 importing the same string again reports it under already_recorded and inserts nothing', async () => {
          const fixture = bindingsFixture([])
          const { client, calls } = makeClient(fixture)
          vi.mocked(createServiceRoleClient).mockReturnValue(client as never)
          const exportString = importString(payloadWith([withId(AWARD_A)], []))

          await POST(request({ importString: exportString }))
          const insertsAfterFirst = lootHistoryInserts(calls).length
          const res = await POST(request({ importString: exportString }))
          const body = await res.json()

          expect(insertsAfterFirst).toBe(1)
          expect(body.data.awards).toEqual({ processed: 1, errors: 0, already_recorded: 1 })
          expect(lootHistoryInserts(calls)).toHaveLength(1)
          expect(fixture.history).toHaveLength(1)
        })

        it('I7 two awards in the same second with different awardIds record copy 1 and copy 2', async () => {
          const fixture = bindingsFixture([])
          const { client, calls } = makeClient(fixture)
          vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

          const res = await POST(request({ importString: importString(payloadWith([withId(AWARD_A), withId(AWARD_B)], [])) }))
          const body = await res.json()

          expect(body.data.awards).toEqual({ processed: 2, errors: 0, already_recorded: 0 })
          expect(insertedRows(calls)).toEqual([
            { award_copy: 1, source_award_key: ADDON2_A },
            { award_copy: 2, source_award_key: ADDON2_B },
          ])
          expect(fixture.history).toHaveLength(2)
        })

        it('I8 an award without awardId keeps the legacy key', async () => {
          const fixture = bindingsFixture([])
          const { client, calls } = makeClient(fixture)
          vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

          await POST(request({ importString: importString(payloadWith([first], [])) }))

          expect(insertedRows(calls)).toEqual([{ award_copy: 1, source_award_key: KEY_1 }])
          expect(keyLookupValues(calls)).toEqual([KEY_1])
        })
      })
    })
  })

  describe('GH #355: raid night in the guild time zone', () => {
    const thrall = [{ character_id: 'char-1', characters: { id: 'char-1', name: 'Thrall' } }]
    const fixture = (extra: Partial<Fixture> = {}): Fixture => ({
      ...singleItemFixture({ id: 'item-19003', wowhead_id: 19003 }),
      characters: thrall,
      raidTimeZone: 'America/New_York',
      ...extra,
    })
    // 20:30 EDT on the 13th, which is already the 14th in UTC.
    const session = {
      raidDate: '2026-10-14',
      raidName: 'Naxxramas',
      startTime: '2026-10-14T00:30:00Z',
      endTime: '2026-10-14T04:00:00Z',
      bossKills: [],
      attended: ['Thrall'],
    }
    const award = (awardedAt: string) => ({ wowheadId: 19003, characterName: 'Thrall', awardedAt })
    const payloadWith = (awards: unknown[], attendance: unknown[]) => ({
      guildId: GUILD_ID, exportedAt: '2026-10-14T05:00:00Z', awards, attendance,
    })
    const storedPayload = (calls: Call[]) =>
      lootHistoryInserts(calls)[0]?.insertPayload as { awarded_date: string; source_award_key?: string }

    it('M1 attendance takes the night from the session start in the guild time zone', async () => {
      const { client } = makeClient(fixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({ importString: importString(payloadWith([], [session])) }))

      expect(res.status).toBe(200)
      expect(importAttendanceByTeam).toHaveBeenCalledTimes(1)
      expect(vi.mocked(importAttendanceByTeam).mock.calls[0][2]).toBe('2026-10-13')
    })

    it('M2 an award inside the session links and is stored on the zoned night, key unchanged', async () => {
      vi.mocked(findAwardRaidEvent).mockResolvedValueOnce({ raidEventId: 'ev-1013', outcome: 'linked' })
      const { client, calls } = makeClient(fixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const awardedAt = '2026-10-14T02:00:00Z'
      const res = await POST(request({ importString: importString(payloadWith([award(awardedAt)], [session])) }))

      expect(res.status).toBe(200)
      expect(findAwardRaidEvent).toHaveBeenCalledTimes(1)
      expect(findAwardRaidEvent).toHaveBeenCalledWith(client, GUILD_ID, '2026-10-13', 'char-1')
      expect(storedPayload(calls).awarded_date).toBe('2026-10-13')
      expect(storedPayload(calls).source_award_key).toBe(
        addonAwardKey({ awardedAt, wowheadId: 19003, characterName: 'Thrall' }),
      )
    })

    it('M3 an award outside any session uses its own time in the guild zone (Berlin 05:59 CEST)', async () => {
      const { client, calls } = makeClient(fixture({ raidTimeZone: 'Europe/Berlin' }))
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({ importString: importString(payloadWith([award('2026-10-14T03:59:00Z')], [])) }))

      expect(res.status).toBe(200)
      expect(vi.mocked(findAwardRaidEvent).mock.calls[0]).toEqual([client, GUILD_ID, '2026-10-13', 'char-1'])
      expect(storedPayload(calls).awarded_date).toBe('2026-10-13')
    })

    it('M4 a failed time zone read carries on with the UTC dates and tracks the error', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      const { client, calls } = makeClient(fixture({ raidTimeZoneError: true }))
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({ importString: importString(payloadWith([award('2026-10-14T02:00:00Z')], [session])) }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.awards).toEqual({ processed: 1, errors: 0, already_recorded: 0 })
      expect(vi.mocked(importAttendanceByTeam).mock.calls[0][2]).toBe('2026-10-14')
      expect(findAwardRaidEvent).toHaveBeenCalledWith(client, GUILD_ID, '2026-10-14', 'char-1')
      expect(storedPayload(calls).awarded_date).toBe('2026-10-14')
      expect(trackApiError).toHaveBeenCalledWith('unknown', 'POST /api/addon/import-string', expect.any(Error))
    })

    it('M5 a session start time that is not a timestamp keeps its raidDate', async () => {
      const { client } = makeClient(fixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({ importString: importString(payloadWith([], [{ ...session, startTime: '20:00' }])) }))

      expect(res.status).toBe(200)
      expect(vi.mocked(importAttendanceByTeam).mock.calls[0][2]).toBe('2026-10-14')
    })
  })

  describe('GH #321: sessionDate and awards that arrived before the night', () => {
    const thrall = [{ character_id: 'char-1', characters: { id: 'char-1', name: 'Thrall' } }]
    // A UTC zone keeps the zoned night equal to the awardedAt UTC date (no
    // rollover at 08:00Z), so only sessionDate can move the night.
    const fixture = (extra: Partial<Fixture> = {}): Fixture => ({
      ...singleItemFixture({ id: 'item-19003', wowhead_id: 19003 }),
      characters: thrall,
      raidTimeZone: 'UTC',
      ...extra,
    })
    const payloadWith = (awards: unknown[], attendance: unknown[]) => ({
      guildId: GUILD_ID, exportedAt: '2026-09-21T09:00:00Z', awards, attendance,
    })
    const storedPayload = (calls: Call[]) =>
      lootHistoryInserts(calls)[0]?.insertPayload as { raid_event_id: string | null; awarded_date: string }
    // 20:30 EDT on the 13th, which is already the 14th in UTC.
    const nySession = {
      raidDate: '2026-10-14',
      raidName: 'Naxxramas',
      startTime: '2026-10-14T00:30:00Z',
      endTime: '2026-10-14T04:00:00Z',
      bossKills: [],
      attended: ['Thrall'],
    }

    beforeEach(() => {
      vi.mocked(linkUnlinkedAddonAwards).mockImplementation(async () => ({ linked: [], itemIds: [], skipped: [] }))
    })

    it('S1 an award with sessionDate 2026-09-20 outside any session links to the 2026-09-20 night, not its awardedAt date', async () => {
      vi.mocked(findAwardRaidEvent).mockImplementation(async (_client, _guild, date) =>
        date === '2026-09-20' ? { raidEventId: 'ev-0920', outcome: 'linked' } : { raidEventId: null, outcome: 'no_raid_night' },
      )
      const { client, calls } = makeClient(fixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const award = { wowheadId: 19003, characterName: 'Thrall', awardedAt: '2026-09-21T08:00:00Z', sessionDate: '2026-09-20' }
      const res = await POST(request({ importString: importString(payloadWith([award], [])) }))

      expect(res.status).toBe(200)
      expect(vi.mocked(findAwardRaidEvent).mock.calls.map(c => c[2])).toEqual(['2026-09-21', '2026-09-20'])
      expect(storedPayload(calls).raid_event_id).toBe('ev-0920')
    })

    it('S2 a malformed sessionDate falls back to the awardedAt date and never rejects the import', async () => {
      const { client, calls } = makeClient(fixture())
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const award = { wowheadId: 19003, characterName: 'Thrall', awardedAt: '2026-09-21T08:00:00Z', sessionDate: '2026-13-45' }
      const res = await POST(request({ importString: importString(payloadWith([award], [])) }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.awards).toEqual({ processed: 1, errors: 0, already_recorded: 0 })
      expect(vi.mocked(findAwardRaidEvent).mock.calls.map(c => c[2])).toEqual(['2026-09-21'])
      expect(storedPayload(calls).awarded_date).toBe('2026-09-21')
    })

    it("S3 a session in the export still wins over the award's sessionDate", async () => {
      vi.mocked(findAwardRaidEvent).mockResolvedValueOnce({ raidEventId: 'ev-1013', outcome: 'linked' })
      const { client } = makeClient(fixture({ raidTimeZone: 'America/New_York' }))
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const award = { wowheadId: 19003, characterName: 'Thrall', awardedAt: '2026-10-14T02:00:00Z', sessionDate: '2026-10-14' }
      await POST(request({ importString: importString(payloadWith([award], [nySession])) }))

      expect(findAwardRaidEvent).toHaveBeenCalledTimes(1)
      expect(findAwardRaidEvent).toHaveBeenCalledWith(client, GUILD_ID, '2026-10-13', 'char-1')
    })

    it('S4 after the attendance creates a night, earlier unlinked awards on that night are linked before the awards and their items join the BLP recompute', async () => {
      vi.mocked(importAttendanceByTeam).mockResolvedValueOnce({ eventIds: ['ev-1013'], attendedCount: 1, absentCount: 0 })
      vi.mocked(linkUnlinkedAddonAwards).mockResolvedValueOnce({ linked: ['hist-old'], itemIds: ['item-old'], skipped: [] })
      const { client } = makeClient(fixture({ raidTimeZone: 'America/New_York' }))
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const award = { wowheadId: 19003, characterName: 'Thrall', awardedAt: '2026-10-14T02:00:00Z' }
      const res = await POST(request({ importString: importString(payloadWith([award], [nySession])) }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.attendance).toEqual({ processed: 1, errors: 0 })
      expect(linkUnlinkedAddonAwards).toHaveBeenCalledTimes(1)
      expect(linkUnlinkedAddonAwards).toHaveBeenCalledWith(client, GUILD_ID, '2026-10-13')
      const attendanceOrder = vi.mocked(importAttendanceByTeam).mock.invocationCallOrder[0]
      const linkOrder = vi.mocked(linkUnlinkedAddonAwards).mock.invocationCallOrder[0]
      const awardOrder = vi.mocked(findAwardRaidEvent).mock.invocationCallOrder[0]
      expect(attendanceOrder).toBeLessThan(linkOrder)
      expect(linkOrder).toBeLessThan(awardOrder)
      expect(recomputeBlpForItems).toHaveBeenCalledWith(client, GUILD_ID, expect.arrayContaining(['item-old']))
    })

    it('S5 two sessions on the same night call the linker once per night, and none without attendance', async () => {
      const { client } = makeClient(fixture({ raidTimeZone: 'America/New_York' }))
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const second = { ...nySession, startTime: '2026-10-14T01:00:00Z', endTime: '2026-10-14T03:00:00Z' }
      await POST(request({ importString: importString(payloadWith([], [nySession, second])) }))
      expect(vi.mocked(linkUnlinkedAddonAwards).mock.calls.map(c => c[2])).toEqual(['2026-10-13'])

      vi.mocked(linkUnlinkedAddonAwards).mockClear()
      await POST(request({ importString: importString(payloadWith([{ wowheadId: 19003, characterName: 'Thrall', awardedAt: '2026-10-14T02:00:00Z' }], [])) }))
      expect(linkUnlinkedAddonAwards).not.toHaveBeenCalled()
    })

    it('S6 a linking failure is logged and tracked and the import still succeeds', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(importAttendanceByTeam).mockResolvedValueOnce({ eventIds: ['ev-1013'], attendedCount: 1, absentCount: 0 })
      vi.mocked(linkUnlinkedAddonAwards).mockRejectedValueOnce(new Error('loot_history boom'))
      const { client } = makeClient(fixture({ raidTimeZone: 'America/New_York' }))
      vi.mocked(createServiceRoleClient).mockReturnValue(client as never)

      const res = await POST(request({ importString: importString(payloadWith([], [nySession])) }))
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.data.attendance).toEqual({ processed: 1, errors: 0 })
      expect(trackApiError).toHaveBeenCalledWith('unknown', 'POST /api/addon/import-string', expect.any(Error))
    })
  })
})
