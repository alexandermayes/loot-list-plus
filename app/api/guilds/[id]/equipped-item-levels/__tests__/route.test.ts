// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { verifyPermission } from '@/utils/server-roles'

vi.mock('@/utils/supabase/server', () => ({ createClient: vi.fn(), getAuthenticatedUser: vi.fn() }))
vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/server-roles', () => ({ verifyPermission: vi.fn() }))

// Valid-shaped UUID constants (8-4-4-4-12 hex), grouped by kind.
const u = (n: number) => `00000001-0000-0000-0000-${String(n).padStart(12, '0')}`
const c = (n: number) => `00000002-0000-0000-0000-${String(n).padStart(12, '0')}`
const g = (n: number) => `00000003-0000-0000-0000-${String(n).padStart(12, '0')}`

const GUILD = g(1)
const OTHER_GUILD = g(2)
const OFFICER = u(1)
const CH_A = c(1) // active in GUILD, rings and a helm synced
const CH_B = c(2) // active in GUILD, no gear rows
const CH_INACTIVE = c(3) // inactive in GUILD
const CH_OTHER = c(4) // active in OTHER_GUILD only

type Filter = ['eq' | 'in', string, unknown]
interface Call { table: string; selectCols?: string; filters: Filter[] }

interface MembershipRow { character_id: string; guild_id: string; is_active: boolean }
interface EquippedRow { character_id: string; slot: string; item_level: number | null; imported_at: string | null }

interface Fixture {
  memberships: MembershipRow[]
  equipped: EquippedRow[]
  errors?: { character_guild_memberships?: string; character_equipped_items?: string }
}

function defaultFixture(): Fixture {
  return {
    memberships: [
      { character_id: CH_A, guild_id: GUILD, is_active: true },
      { character_id: CH_B, guild_id: GUILD, is_active: true },
      { character_id: CH_INACTIVE, guild_id: GUILD, is_active: false },
      { character_id: CH_OTHER, guild_id: OTHER_GUILD, is_active: true },
    ],
    equipped: [
      { character_id: CH_A, slot: 'Finger 1', item_level: 489, imported_at: '2026-10-20T12:00:00.000Z' },
      { character_id: CH_A, slot: 'Finger 2', item_level: 476, imported_at: '2026-10-21T12:00:00.000Z' },
      { character_id: CH_A, slot: 'Head', item_level: null, imported_at: '2026-10-19T12:00:00.000Z' },
      { character_id: CH_INACTIVE, slot: 'Head', item_level: 500, imported_at: '2026-10-21T12:00:00.000Z' },
      { character_id: CH_OTHER, slot: 'Head', item_level: 500, imported_at: '2026-10-21T12:00:00.000Z' },
    ],
  }
}

function applyFilters<T extends Record<string, unknown>>(rows: T[], filters: Filter[]): T[] {
  return rows.filter(row => filters.every(([op, col, val]) =>
    op === 'eq' ? row[col] === val : (val as unknown[]).includes(row[col])))
}

/**
 * Recording fake client. `from(table)` records { table, selectCols, filters };
 * select, eq and in are chainable and the builder is thenable. `tables` names
 * what this client is allowed to answer, so a read on the wrong client fails.
 */
function fakeClient(fixture: Fixture, tables: Array<keyof NonNullable<Fixture['errors']>>) {
  const calls: Call[] = []
  function resolve(call: Call): { data: unknown; error: { message: string } | null } {
    const table = call.table as keyof NonNullable<Fixture['errors']>
    if (!tables.includes(table)) return { data: null, error: { message: `unexpected read of ${call.table} on this client` } }
    const errorMessage = fixture.errors?.[table]
    if (errorMessage) return { data: null, error: { message: errorMessage } }
    const rows = table === 'character_guild_memberships' ? fixture.memberships : fixture.equipped
    return { data: applyFilters(rows as unknown as Record<string, unknown>[], call.filters), error: null }
  }
  const client = {
    from(table: string) {
      const call: Call = { table, filters: [] }
      calls.push(call)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const builder: any = {
        select: (cols?: string) => { call.selectCols = cols; return builder },
        eq: (col: string, val: unknown) => { call.filters.push(['eq', col, val]); return builder },
        in: (col: string, val: unknown) => { call.filters.push(['in', col, val]); return builder },
        then: (onResolve: (v: unknown) => unknown, onReject?: (e: unknown) => unknown) =>
          Promise.resolve(resolve(call)).then(onResolve, onReject),
      }
      return builder
    },
  }
  return { client, calls }
}

interface World {
  fixture?: Fixture
  user?: string | null
  permitted?: boolean
}

function setup({ fixture = defaultFixture(), user = OFFICER, permitted = true }: World = {}) {
  const service = fakeClient(fixture, ['character_guild_memberships'])
  const rls = fakeClient(fixture, ['character_equipped_items'])
  vi.mocked(createServiceRoleClient).mockReturnValue(service.client as never)
  vi.mocked(createClient).mockResolvedValue(rls.client as never)
  vi.mocked(getAuthenticatedUser).mockResolvedValue(
    (user ? { user: { id: user }, error: null } : { user: null, error: new Error('No session') }) as never,
  )
  vi.mocked(verifyPermission).mockResolvedValue({ hasPermission: permitted })
  return { service, rls }
}

function get(query: string | null, guildId = GUILD) {
  const url = `http://localhost/api/guilds/${guildId}/equipped-item-levels${query === null ? '' : `?character_ids=${query}`}`
  return GET(new NextRequest(url), { params: Promise.resolve({ id: guildId }) })
}

const noReads = (world: ReturnType<typeof setup>) => {
  expect(world.service.calls).toEqual([])
  expect(world.rls.calls).toEqual([])
}

describe('GET /api/guilds/[id]/equipped-item-levels', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('answers 401 without a user and runs no permission check or read', async () => {
    const world = setup({ user: null })
    const res = await get(CH_A)
    expect(res.status).toBe(401)
    expect(verifyPermission).not.toHaveBeenCalled()
    noReads(world)
  })

  it('answers 403 Officers only when the user lacks manage_loot, with no read', async () => {
    const world = setup({ permitted: false })
    const res = await get(CH_A)
    expect(res.status).toBe(403)
    expect(await res.json()).toEqual({ error: 'Officers only' })
    expect(verifyPermission).toHaveBeenCalledWith(world.service.client, OFFICER, GUILD, 'manage_loot')
    noReads(world)
  })

  it.each([
    ['missing', null],
    ['empty', ''],
    ['only commas', ',,'],
    ['not a UUID', `${CH_A},char-b`],
    ['more than 200 ids', Array.from({ length: 201 }, (_, i) => c(100 + i)).join(',')],
  ])('answers 400 with no read when character_ids is %s', async (_label, query) => {
    const world = setup()
    const res = await get(query)
    expect(res.status).toBe(400)
    noReads(world)
  })

  it('accepts exactly 200 distinct ids', async () => {
    const res = await get(Array.from({ length: 200 }, (_, i) => c(100 + i)).join(','))
    expect(res.status).toBe(200)
  })

  it('dedupes ids before the membership filter', async () => {
    const world = setup()
    await get(`${CH_A},${CH_A},${CH_B}`)
    expect(world.service.calls[0]).toMatchObject({
      table: 'character_guild_memberships',
      filters: [['eq', 'guild_id', GUILD], ['eq', 'is_active', true], ['in', 'character_id', [CH_A, CH_B]]],
    })
  })

  it('drops inactive and cross-guild ids before the gear read and omits them from the answer', async () => {
    const world = setup()
    const res = await get([CH_A, CH_B, CH_INACTIVE, CH_OTHER].join(','))
    expect(res.status).toBe(200)
    const gearRead = world.rls.calls.find(call => call.table === 'character_equipped_items')
    expect(gearRead?.filters).toEqual([['in', 'character_id', [CH_A, CH_B]]])
    const body = await res.json()
    expect(Object.keys(body.characters)).toEqual([CH_A])
  })

  it('reads gear through the RLS-scoped client, never the service role', async () => {
    const world = setup()
    await get(CH_A)
    expect(world.service.calls.map(call => call.table)).toEqual(['character_guild_memberships'])
    expect(world.rls.calls.map(call => call.table)).toEqual(['character_equipped_items'])
    expect(world.rls.calls[0].selectCols).toBe('character_id, slot, item_level, imported_at')
  })

  it('answers an empty 200 with no gear read when no id is active in this guild', async () => {
    const world = setup()
    const res = await get(`${CH_INACTIVE},${CH_OTHER}`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ characters: {} })
    expect(res.headers.get('Cache-Control')).toBe('private, no-store')
    expect(world.rls.calls).toEqual([])
  })

  it('answers 500 when the membership read fails, never an empty success', async () => {
    const fixture = defaultFixture()
    fixture.errors = { character_guild_memberships: 'boom' }
    const world = setup({ fixture })
    const res = await get(CH_A)
    expect(res.status).toBe(500)
    expect(await res.json()).not.toHaveProperty('characters')
    expect(world.rls.calls).toEqual([])
  })

  it('answers 500 when the gear read fails, never an empty success', async () => {
    const fixture = defaultFixture()
    fixture.errors = { character_equipped_items: 'boom' }
    setup({ fixture })
    const res = await get(CH_A)
    expect(res.status).toBe(500)
    expect(await res.json()).not.toHaveProperty('characters')
  })

  it('answers 200 with slots per character, the newest imported_at as synced_at, and no-store caching', async () => {
    setup()
    const res = await get(`${CH_A},${CH_B}`)
    expect(res.status).toBe(200)
    expect(res.headers.get('Cache-Control')).toBe('private, no-store')
    expect(await res.json()).toEqual({
      characters: {
        [CH_A]: {
          synced_at: '2026-10-21T12:00:00.000Z',
          slots: { 'Finger 1': 489, 'Finger 2': 476, Head: null },
        },
      },
    })
  })
})
