// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))
// @/utils/server-roles is deliberately NOT mocked: the POST officer check (added in a
// later task) runs the real verifyOfficerPermissions against the fake client below, so
// custom role name and position-not-name cases are proven through the route itself.

// Valid-shaped UUID constants (8-4-4-4-12 hex), grouped by kind so ids read as what
// they are in test output.
const u = (n: number) => `00000001-0000-0000-0000-${String(n).padStart(12, '0')}`
const c = (n: number) => `00000002-0000-0000-0000-${String(n).padStart(12, '0')}`
const g = (n: number) => `00000003-0000-0000-0000-${String(n).padStart(12, '0')}`
const a = (n: number) => `00000004-0000-0000-0000-${String(n).padStart(12, '0')}`
const e = (n: number) => `00000005-0000-0000-0000-${String(n).padStart(12, '0')}`

// Guilds
const GUILD_A = g(1)
const GUILD_B = g(2)
const GUILD_C = g(3)
const GUILD_D = g(4)
const GUILD_F = g(5)

// Users
const OWNER = u(1)
const GONE_OWNER = u(2)
const VIEWER = u(3)
const VIEWER_AD = u(4)
const OUTSIDER = u(5)
const VIEWER_INACTIVE = u(6)
const NO_CHARS = u(7)

// Characters
const CH_T = c(1) // owned by OWNER; active in A, D, F; inactive in C
const CH_GONE = c(2) // owned by GONE_OWNER; inactive in A only
const CH_V1 = c(3) // owned by VIEWER; active in A
const CH_V2 = c(4) // owned by VIEWER; active in C
const CH_VA1 = c(5) // owned by VIEWER_AD; active in A
const CH_VA2 = c(6) // owned by VIEWER_AD; active in A (second character, same guild)
const CH_VD = c(7) // owned by VIEWER_AD; active in D
const CH_X = c(8) // owned by OUTSIDER; active in B
const CH_VI = c(9) // owned by VIEWER_INACTIVE; inactive in A

interface CharacterRow { id: string; user_id: string; name?: string }
interface MembershipRow { character_id: string; guild_id: string; role: string; is_active: boolean }
interface GuildRoleRow { guild_id: string; name: string; position: number; permissions?: string[] }
interface GuildRow { id: string; created_by: string }
interface EquippedItemRow {
  id: string
  character_id: string
  slot: string
  wowhead_id: number
  item_name: string | null
  enchant_id: number | null
  gem_ids: number[] | null
  imported_at: string
}
interface LootItemsEmbed { wowhead_id: number; name: string; item_slot: string }
interface LootHistoryRow {
  id: string
  character_id: string
  guild_id: string
  awarded_date: string
  loot_items: LootItemsEmbed | null
}

type FixtureTable =
  | 'characters'
  | 'character_guild_memberships'
  | 'guild_roles'
  | 'guilds'
  | 'character_equipped_items'
  | 'loot_history'

interface Fixture {
  characters: CharacterRow[]
  memberships: MembershipRow[]
  guildRoles: GuildRoleRow[]
  guilds: GuildRow[]
  equippedItems: EquippedItemRow[]
  lootHistory: LootHistoryRow[]
  errors?: Partial<Record<FixtureTable, string>>
}

function defaultFixture(): Fixture {
  return {
    characters: [
      { id: CH_T, user_id: OWNER, name: 'Targetone' },
      { id: CH_GONE, user_id: GONE_OWNER, name: 'Goneone' },
      { id: CH_V1, user_id: VIEWER, name: 'Viewerone' },
      { id: CH_V2, user_id: VIEWER, name: 'Viewertwo' },
      { id: CH_VA1, user_id: VIEWER_AD, name: 'Viewerthree' },
      { id: CH_VA2, user_id: VIEWER_AD, name: 'Viewerfour' },
      { id: CH_VD, user_id: VIEWER_AD, name: 'Viewerfive' },
      { id: CH_X, user_id: OUTSIDER, name: 'Outsiderone' },
      { id: CH_VI, user_id: VIEWER_INACTIVE, name: 'Inactiveone' },
    ],
    memberships: [
      { character_id: CH_T, guild_id: GUILD_A, role: 'Member', is_active: true },
      { character_id: CH_T, guild_id: GUILD_C, role: 'Member', is_active: false },
      { character_id: CH_T, guild_id: GUILD_D, role: 'Member', is_active: true },
      { character_id: CH_T, guild_id: GUILD_F, role: 'Member', is_active: true },
      { character_id: CH_GONE, guild_id: GUILD_A, role: 'Member', is_active: false },
      { character_id: CH_V1, guild_id: GUILD_A, role: 'Member', is_active: true },
      { character_id: CH_V2, guild_id: GUILD_C, role: 'Member', is_active: true },
      { character_id: CH_VA1, guild_id: GUILD_A, role: 'Member', is_active: true },
      { character_id: CH_VA2, guild_id: GUILD_A, role: 'Member', is_active: true },
      { character_id: CH_VD, guild_id: GUILD_D, role: 'Member', is_active: true },
      { character_id: CH_X, guild_id: GUILD_B, role: 'Member', is_active: true },
      { character_id: CH_VI, guild_id: GUILD_A, role: 'Member', is_active: false },
    ],
    guildRoles: [
      { guild_id: GUILD_A, name: 'Guild Master', position: 100 },
      { guild_id: GUILD_A, name: 'Officer', position: 50 },
      { guild_id: GUILD_A, name: 'Member', position: 0 },
      { guild_id: GUILD_B, name: 'Guild Master', position: 100 },
      { guild_id: GUILD_B, name: 'Officer', position: 50 },
      { guild_id: GUILD_B, name: 'Member', position: 0 },
      { guild_id: GUILD_C, name: 'Guild Master', position: 100 },
      { guild_id: GUILD_C, name: 'Officer', position: 50 },
      { guild_id: GUILD_C, name: 'Member', position: 0 },
      { guild_id: GUILD_D, name: 'Guild Master', position: 100 },
      { guild_id: GUILD_D, name: 'Officer', position: 50 },
      { guild_id: GUILD_D, name: 'Member', position: 0 },
      { guild_id: GUILD_F, name: 'Guild Master', position: 100 },
      { guild_id: GUILD_F, name: 'Officer', position: 50 },
      { guild_id: GUILD_F, name: 'Member', position: 0 },
    ],
    guilds: [
      { id: GUILD_A, created_by: u(901) },
      { id: GUILD_B, created_by: u(902) },
      { id: GUILD_C, created_by: u(903) },
      { id: GUILD_D, created_by: u(904) },
      { id: GUILD_F, created_by: u(905) },
    ],
    equippedItems: [
      { id: e(1), character_id: CH_T, slot: 'Head', wowhead_id: 2001, item_name: 'Equip Head', enchant_id: null, gem_ids: null, imported_at: '2026-01-01T00:00:00.000Z' },
      { id: e(2), character_id: CH_T, slot: 'Chest', wowhead_id: 2002, item_name: 'Equip Chest', enchant_id: null, gem_ids: null, imported_at: '2026-01-01T00:00:00.000Z' },
    ],
    lootHistory: [
      { id: a(1), character_id: CH_T, guild_id: GUILD_A, awarded_date: '2026-01-02', loot_items: { wowhead_id: 1001, name: 'Item A', item_slot: 'Head' } },
      { id: a(2), character_id: CH_T, guild_id: GUILD_C, awarded_date: '2026-01-03', loot_items: { wowhead_id: 1003, name: 'Item C', item_slot: 'Chest' } },
      { id: a(3), character_id: CH_T, guild_id: GUILD_D, awarded_date: '2026-01-04', loot_items: { wowhead_id: 1004, name: 'Item D', item_slot: 'Legs' } },
      { id: a(4), character_id: CH_T, guild_id: GUILD_A, awarded_date: '2026-01-05', loot_items: null },
      { id: a(5), character_id: CH_GONE, guild_id: GUILD_A, awarded_date: '2026-01-06', loot_items: { wowhead_id: 1005, name: 'Item Gone', item_slot: 'Feet' } },
    ],
  }
}

type FilterOp = 'eq' | 'in' | 'is'
type Filter = [FilterOp, string, unknown]
interface Call {
  table: string
  op: 'select' | 'insert' | 'delete'
  selectCols?: string
  filters: Filter[]
  payload?: unknown
  limit?: number
  single?: boolean
}

function applyFilters<T extends Record<string, unknown>>(rows: T[], filters: Filter[]): T[] {
  return rows.filter(row => filters.every(([op, col, val]) => {
    if (op === 'eq') return row[col] === val
    if (op === 'in') return (val as unknown[]).includes(row[col])
    if (op === 'is') return row[col] === val
    return true
  }))
}

function project<T extends Record<string, unknown>>(row: T, selectCols?: string): Record<string, unknown> {
  if (!selectCols) return { ...row }
  const cols = selectCols.split(',').map(s => s.trim()).filter(Boolean)
  const out: Record<string, unknown> = {}
  for (const col of cols) out[col] = row[col]
  return out
}

let equippedIdCounter = 1000

/**
 * Recording fake client for /api/character-gear. `from(table)` records
 * { table, op, selectCols, filters, payload, limit, single }; select, eq, in, is,
 * order, limit, single, delete and insert are chainable; the builder is thenable.
 * `select()` after `insert()` keeps op 'insert' (it never touches op itself).
 */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []

  function resolve(call: Call): { data: unknown; error: { message: string } | null } {
    const errorMessage = fixture.errors?.[call.table as FixtureTable]
    if (errorMessage) return { data: null, error: { message: errorMessage } }

    if (call.table === 'character_equipped_items' && call.op === 'insert') {
      const payloadRows = (Array.isArray(call.payload) ? call.payload : [call.payload]) as Record<string, unknown>[]
      const inserted = payloadRows.map(row => ({ id: e(equippedIdCounter++), ...row }))
      fixture.equippedItems.push(...(inserted as unknown as EquippedItemRow[]))
      return { data: inserted, error: null }
    }

    if (call.table === 'character_equipped_items' && call.op === 'delete') {
      const toRemove = applyFilters(fixture.equippedItems as unknown as Record<string, unknown>[], call.filters)
      fixture.equippedItems = fixture.equippedItems.filter(row => !toRemove.includes(row as unknown as Record<string, unknown>))
      return { data: null, error: null }
    }

    let rows: Record<string, unknown>[]
    switch (call.table) {
      case 'characters': rows = fixture.characters as unknown as Record<string, unknown>[]; break
      case 'character_guild_memberships': rows = fixture.memberships as unknown as Record<string, unknown>[]; break
      case 'guild_roles': rows = fixture.guildRoles as unknown as Record<string, unknown>[]; break
      case 'guilds': rows = fixture.guilds as unknown as Record<string, unknown>[]; break
      case 'character_equipped_items': rows = fixture.equippedItems as unknown as Record<string, unknown>[]; break
      case 'loot_history': rows = fixture.lootHistory as unknown as Record<string, unknown>[]; break
      default: rows = []
    }

    let filtered = applyFilters(rows, call.filters)
    if (typeof call.limit === 'number') filtered = filtered.slice(0, call.limit)

    if (call.table === 'loot_history') {
      const mapped = filtered.map(r => ({ id: r.id, awarded_date: r.awarded_date, loot_items: r.loot_items }))
      return { data: mapped, error: null }
    }

    if (call.single) {
      if (filtered.length === 0) return { data: null, error: { message: 'not found' } }
      return { data: project(filtered[0], call.selectCols), error: null }
    }

    return { data: filtered.map(r => project(r, call.selectCols)), error: null }
  }

  const client = {
    from(table: string) {
      const call: Call = { table, op: 'select', filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: (cols?: string) => { call.selectCols = cols; return builder },
        eq: (col: string, val: unknown) => { call.filters.push(['eq', col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push(['in', col, val]); return builder },
        is: (col: string, val: unknown) => { call.filters.push(['is', col, val]); return builder },
        order: () => builder,
        limit: (n: number) => { call.limit = n; return builder },
        single: () => { call.single = true; return builder },
        delete: () => { call.op = 'delete'; return builder },
        insert: (payload: unknown) => { call.op = 'insert'; call.payload = payload; return builder },
        then: (onResolve: (v: unknown) => unknown, onReject?: (e: unknown) => unknown) =>
          Promise.resolve(resolve(call)).then(onResolve, onReject),
      }
      return builder
    },
  }
  return { client, calls }
}

function setup(fixture: Fixture, authUserId: string | null = OWNER) {
  const { client, calls } = makeClient(fixture)
  vi.mocked(createServiceRoleClient).mockReturnValue(client as unknown as ReturnType<typeof createServiceRoleClient>)
  if (authUserId) {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: { id: authUserId }, error: null } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>)
  } else {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ user: null, error: { message: 'no session' } } as unknown as Awaited<ReturnType<typeof getAuthenticatedUser>>)
  }
  return { calls }
}

function getRequest(query: string) {
  return new NextRequest(`http://localhost/api/character-gear?${query}`)
}

const callsFor = (calls: Call[], table: string) => calls.filter(c => c.table === table)
const filterValue = (call: Call, op: FilterOp, col: string) => call.filters.find(f => f[0] === op && f[1] === col)?.[2]
const hasFilter = (call: Call, op: FilterOp, col: string) => call.filters.some(f => f[0] === op && f[1] === col)

describe('GET /api/character-gear', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    equippedIdCounter = 1000
  })

  it('returns 401 Unauthorized and makes no database call when there is no session', async () => {
    setup(defaultFixture(), null)
    const res = await GET(getRequest(`character_id=${CH_T}`))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('Unauthorized')
    expect(createServiceRoleClient).not.toHaveBeenCalled()
  })

  it('returns 400 character_id is required when character_id is absent', async () => {
    setup(defaultFixture())
    const res = await GET(getRequest(''))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('character_id is required')
  })

  it('returns 404 Character not found for an unknown character_id', async () => {
    setup(defaultFixture())
    const res = await GET(getRequest(`character_id=${c(999)}`))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Character not found')
  })

  describe('owner', () => {
    it('gets every award across guilds, with no membership check', async () => {
      const { calls } = setup(defaultFixture(), OWNER)
      const res = await GET(getRequest(`character_id=${CH_T}`))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.character_id).toBe(CH_T)
      expect(body.items).toHaveLength(2)
      const wowheadIds = (body.awarded_items as { wowhead_id: number }[]).map(i => i.wowhead_id).sort()
      expect(wowheadIds).toEqual([1001, 1003, 1004])
      expect(body.count).toBe(5)

      const lootHistoryCall = callsFor(calls, 'loot_history')[0]
      expect(filterValue(lootHistoryCall, 'eq', 'character_id')).toBe(CH_T)
      expect(hasFilter(lootHistoryCall, 'in', 'guild_id')).toBe(false)
      expect(callsFor(calls, 'character_guild_memberships')).toHaveLength(0)
    })
  })

  describe('shared guild (non-owner)', () => {
    it('gets awards only from the one guild shared with the character', async () => {
      const { calls } = setup(defaultFixture(), VIEWER)
      const res = await GET(getRequest(`character_id=${CH_T}`))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.items).toHaveLength(2)
      const wowheadIds = (body.awarded_items as { wowhead_id: number }[]).map(i => i.wowhead_id)
      expect(wowheadIds).toEqual([1001])

      const lootHistoryCall = callsFor(calls, 'loot_history')[0]
      expect(filterValue(lootHistoryCall, 'in', 'guild_id')).toEqual([GUILD_A])
    })
  })

  describe('multi-guild and de-duplication', () => {
    it('gets awards from every guild shared across the caller\'s characters, with no duplicate guild id', async () => {
      const { calls } = setup(defaultFixture(), VIEWER_AD)
      const res = await GET(getRequest(`character_id=${CH_T}`))
      expect(res.status).toBe(200)
      const body = await res.json()
      const wowheadIds = (body.awarded_items as { wowhead_id: number }[]).map(i => i.wowhead_id).sort()
      expect(wowheadIds).toEqual([1001, 1004])

      const lootHistoryCall = callsFor(calls, 'loot_history')[0]
      const guildIdFilter = filterValue(lootHistoryCall, 'in', 'guild_id') as string[]
      expect([...guildIdFilter].sort()).toEqual([GUILD_A, GUILD_D].sort())
      expect(new Set(guildIdFilter).size).toBe(guildIdFilter.length)
    })
  })

  describe('refused', () => {
    it('refuses an outsider with no shared guild, with no character_equipped_items or loot_history call', async () => {
      const { calls } = setup(defaultFixture(), OUTSIDER)
      const res = await GET(getRequest(`character_id=${CH_T}`))
      expect(res.status).toBe(403)
      expect((await res.json()).error).toBe('Not authorized')
      expect(callsFor(calls, 'character_equipped_items')).toHaveLength(0)
      expect(callsFor(calls, 'loot_history')).toHaveLength(0)
    })

    it('refuses a viewer whose only membership in the shared guild is inactive', async () => {
      const { calls } = setup(defaultFixture(), VIEWER_INACTIVE)
      const res = await GET(getRequest(`character_id=${CH_T}`))
      expect(res.status).toBe(403)
      expect((await res.json()).error).toBe('Not authorized')
      expect(callsFor(calls, 'loot_history')).toHaveLength(0)
    })

    it('refuses a caller with no characters', async () => {
      const { calls } = setup(defaultFixture(), NO_CHARS)
      const res = await GET(getRequest(`character_id=${CH_T}`))
      expect(res.status).toBe(403)
      expect((await res.json()).error).toBe('Not authorized')
      expect(callsFor(calls, 'loot_history')).toHaveLength(0)
    })

    it('refuses a viewer asking about a character whose only membership is inactive', async () => {
      const { calls } = setup(defaultFixture(), VIEWER)
      const res = await GET(getRequest(`character_id=${CH_GONE}`))
      expect(res.status).toBe(403)
      expect((await res.json()).error).toBe('Not authorized')
      expect(callsFor(calls, 'loot_history')).toHaveLength(0)
    })
  })

  describe('fail closed', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    it('returns 403 with no loot_history call when a character_guild_memberships read errors', async () => {
      const fixture = defaultFixture()
      fixture.errors = { character_guild_memberships: 'db down' }
      const { calls } = setup(fixture, VIEWER)
      const res = await GET(getRequest(`character_id=${CH_T}`))
      expect(res.status).toBe(403)
      expect((await res.json()).error).toBe('Not authorized')
      expect(callsFor(calls, 'loot_history')).toHaveLength(0)
    })

    it('returns 200 with awarded_items [] when the loot_history read errors', async () => {
      const fixture = defaultFixture()
      fixture.errors = { loot_history: 'db down' }
      setup(fixture, OWNER)
      const res = await GET(getRequest(`character_id=${CH_T}`))
      expect(res.status).toBe(200)
      const body = await res.json()
      expect(body.awarded_items).toEqual([])
      expect(body.items).toHaveLength(2)
    })

    it('returns 500 Failed to fetch equipped items when the character_equipped_items read errors', async () => {
      const fixture = defaultFixture()
      fixture.errors = { character_equipped_items: 'db down' }
      setup(fixture, OWNER)
      const res = await GET(getRequest(`character_id=${CH_T}`))
      expect(res.status).toBe(500)
      expect((await res.json()).error).toBe('Failed to fetch equipped items')
    })
  })
})
