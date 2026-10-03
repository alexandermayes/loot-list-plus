// @vitest-environment node
// jsdom (the global vitest.config.ts environment) does not provide the web
// Response/Request globals that next/server relies on.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { createServiceRoleClient } from '@/utils/supabase/service-role'
import { getAuthenticatedUser } from '@/utils/supabase/server'

vi.mock('@/utils/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/utils/supabase/server', () => ({ getAuthenticatedUser: vi.fn() }))

// Valid-shaped UUID constants (8-4-4-4-12 hex), grouped by kind so ids read
// as what they are in test output.
const u = (n: number) => `00000001-0000-0000-0000-${String(n).padStart(12, '0')}`
const c = (n: number) => `00000002-0000-0000-0000-${String(n).padStart(12, '0')}`
const g = (n: number) => `00000003-0000-0000-0000-${String(n).padStart(12, '0')}`
const l = (n: number) => `00000004-0000-0000-0000-${String(n).padStart(12, '0')}`
// Ids that never appear in any fixture row (used for chunking/limit tests).
const unknownId = (n: number) => `00000009-0000-0000-0000-${String(n).padStart(12, '0')}`

const USER = u(1)
const USER_NO_ACTIVE = u(2)
const USER_NO_CHARS = u(3)

const CH_A1 = c(1)
const CH_A2 = c(2)
const CH_C = c(3)
const CH_D = c(4)
const CH_NO_ACTIVE = c(5)

const GUILD_A = g(1)
const GUILD_B = g(2)
const GUILD_C = g(3)
const GUILD_D = g(4)

const LA1 = l(1)
const LA2 = l(2)
const LA3 = l(3)
const LB1 = l(4)
const LC1 = l(5)
const LD1 = l(6)
const LX = l(99)

interface CharacterRow { id: string; user_id: string }
interface MembershipRow { character_id: string; guild_id: string; is_active: boolean }
interface ListRow { id: string; guild_id: string }
interface ItemRow { id: string; submission_id: string; removed_at: string | null }

interface Fixture {
  characters: CharacterRow[]
  memberships: MembershipRow[]
  lists: ListRow[]
  items: ItemRow[]
  errors?: Partial<Record<'characters' | 'character_guild_memberships' | 'loot_submissions', string>>
}

function defaultFixture(): Fixture {
  let nextItemId = 1
  const mkItems = (submissionId: string, count: number, removedCount = 0): ItemRow[] => {
    const rows: ItemRow[] = []
    for (let i = 0; i < count; i++) {
      rows.push({
        id: `00000005-0000-0000-0000-${String(nextItemId++).padStart(12, '0')}`,
        submission_id: submissionId,
        removed_at: null,
      })
    }
    for (let i = 0; i < removedCount; i++) {
      rows.push({
        id: `00000005-0000-0000-0000-${String(nextItemId++).padStart(12, '0')}`,
        submission_id: submissionId,
        removed_at: '2026-09-01T00:00:00.000Z',
      })
    }
    return rows
  }

  return {
    characters: [
      { id: CH_A1, user_id: USER },
      { id: CH_A2, user_id: USER },
      { id: CH_C, user_id: USER },
      { id: CH_D, user_id: USER },
      { id: CH_NO_ACTIVE, user_id: USER_NO_ACTIVE },
    ],
    memberships: [
      { character_id: CH_A1, guild_id: GUILD_A, is_active: true },
      { character_id: CH_A2, guild_id: GUILD_A, is_active: true },
      { character_id: CH_C, guild_id: GUILD_C, is_active: false },
      { character_id: CH_D, guild_id: GUILD_D, is_active: true },
      { character_id: CH_NO_ACTIVE, guild_id: GUILD_A, is_active: false },
    ],
    lists: [
      { id: LA1, guild_id: GUILD_A },
      { id: LA2, guild_id: GUILD_A },
      { id: LA3, guild_id: GUILD_A },
      { id: LB1, guild_id: GUILD_B },
      { id: LC1, guild_id: GUILD_C },
      { id: LD1, guild_id: GUILD_D },
    ],
    items: [
      ...mkItems(LA1, 2, 1),
      ...mkItems(LA2, 1),
      ...mkItems(LB1, 3),
      ...mkItems(LC1, 1),
      ...mkItems(LD1, 1),
    ],
  }
}

type FilterOp = 'eq' | 'in' | 'is'
type Filter = [FilterOp, string, unknown]
interface RangeCall { start: number; end: number }
interface Call { table: string; selectCols?: string; filters: Filter[]; range?: RangeCall }

/**
 * Recording fake client for the item-counts route: characters, active
 * memberships, loot_submissions and loot_submission_items reads, in the
 * style of the delete route test's makeClient. Builder methods record
 * filters; the builder itself is thenable (awaiting it resolves the query
 * against fixture rows).
 */
function makeClient(fixture: Fixture) {
  const calls: Call[] = []

  function resolve(call: Call): { data: unknown; error: { message: string } | null } {
    const errorMessage = fixture.errors?.[call.table as keyof NonNullable<Fixture['errors']>]
    if (errorMessage) return { data: null, error: { message: errorMessage } }

    const getFilter = (op: FilterOp, col: string) => call.filters.find(f => f[0] === op && f[1] === col)?.[2]

    if (call.table === 'characters') {
      const userId = getFilter('eq', 'user_id')
      const rows = fixture.characters.filter(ch => ch.user_id === userId)
      return { data: rows.map(ch => ({ id: ch.id })), error: null }
    }

    if (call.table === 'character_guild_memberships') {
      const characterIds = (getFilter('in', 'character_id') as string[] | undefined) ?? []
      const isActive = getFilter('eq', 'is_active')
      const rows = fixture.memberships.filter(m => characterIds.includes(m.character_id) && m.is_active === isActive)
      return { data: rows.map(m => ({ guild_id: m.guild_id })), error: null }
    }

    if (call.table === 'loot_submissions') {
      const idIn = (getFilter('in', 'id') as string[] | undefined) ?? []
      const guildIn = (getFilter('in', 'guild_id') as string[] | undefined) ?? []
      const rows = fixture.lists.filter(list => idIn.includes(list.id) && guildIn.includes(list.guild_id))
      return { data: rows.map(list => ({ id: list.id })), error: null }
    }

    if (call.table === 'loot_submission_items') {
      const submissionIn = (getFilter('in', 'submission_id') as string[] | undefined) ?? []
      const removedAtIs = call.filters.find(f => f[0] === 'is' && f[1] === 'removed_at')
      let rows = fixture.items.filter(item => submissionIn.includes(item.submission_id))
      if (removedAtIs && removedAtIs[2] === null) {
        rows = rows.filter(item => item.removed_at === null)
      }
      rows = [...rows].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      if (call.range) rows = rows.slice(call.range.start, call.range.end + 1)
      return { data: rows.map(item => ({ submission_id: item.submission_id })), error: null }
    }

    return { data: [], error: null }
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
        is: (col: string, val: unknown) => { call.filters.push(['is', col, val]); return builder },
        order: () => builder,
        range: (start: number, end: number) => { call.range = { start, end }; return builder },
        then: (onResolve: (v: unknown) => unknown, onReject?: (e: unknown) => unknown) =>
          Promise.resolve(resolve(call)).then(onResolve, onReject),
      }
      return builder
    },
  }
  return { client, calls }
}

function setup(fixture: Fixture, authUserId: string | null = USER) {
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
  return new NextRequest(`http://localhost/api/loot-submissions/item-counts?${query}`)
}

function postRequest(body: unknown) {
  const rawBody = typeof body === 'string' ? body : JSON.stringify(body)
  return new NextRequest('http://localhost/api/loot-submissions/item-counts', {
    method: 'POST',
    body: rawBody,
  })
}

const callsFor = (calls: Call[], table: string) => calls.filter(c => c.table === table)
const filterValue = (call: Call, op: FilterOp, col: string) => call.filters.find(f => f[0] === op && f[1] === col)?.[2]

describe('GET and POST /api/loot-submissions/item-counts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('401', () => {
    it('GET returns 401 Unauthorized and makes no database call when there is no session', async () => {
      setup(defaultFixture(), null)
      const res = await GET(getRequest(`ids=${LA1}`))
      expect(res.status).toBe(401)
      expect((await res.json()).error).toBe('Unauthorized')
      expect(createServiceRoleClient).not.toHaveBeenCalled()
    })

    it('POST returns 401 Unauthorized and makes no database call when there is no session', async () => {
      setup(defaultFixture(), null)
      const res = await POST(postRequest({ ids: [LA1] }))
      expect(res.status).toBe(401)
      expect((await res.json()).error).toBe('Unauthorized')
      expect(createServiceRoleClient).not.toHaveBeenCalled()
    })
  })

  describe('allowed', () => {
    it('returns counts only for the readable lists, leaving out an empty one, with the expected query shape', async () => {
      const { calls } = setup(defaultFixture())
      const res = await POST(postRequest({ ids: [LA1, LA2, LA3] }))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ [LA1]: 2, [LA2]: 1 })

      const submissionsCall = callsFor(calls, 'loot_submissions')[0]
      expect(filterValue(submissionsCall, 'in', 'guild_id')).toEqual([GUILD_A, GUILD_D])
      expect(filterValue(submissionsCall, 'in', 'id')).toEqual([LA1, LA2, LA3])

      const itemsCall = callsFor(calls, 'loot_submission_items')[0]
      expect(filterValue(itemsCall, 'in', 'submission_id')).toEqual([LA1, LA2, LA3])
      expect(itemsCall.filters).toContainEqual(['is', 'removed_at', null])
    })
  })

  describe('other guild', () => {
    it('returns 200 {} and makes no loot_submission_items call for a list in a guild the caller is not active in', async () => {
      const { calls } = setup(defaultFixture())
      const res = await POST(postRequest({ ids: [LB1] }))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({})
      expect(callsFor(calls, 'loot_submission_items')).toHaveLength(0)
    })
  })

  describe('inactive membership', () => {
    it('returns 200 {} for a list in a guild where the caller has only an inactive membership', async () => {
      const { calls } = setup(defaultFixture())
      const res = await POST(postRequest({ ids: [LC1] }))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({})
      const membershipsCall = callsFor(calls, 'character_guild_memberships')[0]
      expect(filterValue(membershipsCall, 'eq', 'is_active')).toBe(true)
    })
  })

  describe('multi-guild', () => {
    it('returns counts for readable lists across more than one active guild', async () => {
      setup(defaultFixture())
      const res = await POST(postRequest({ ids: [LA1, LD1] }))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ [LA1]: 2, [LD1]: 1 })
    })
  })

  describe('mixed', () => {
    it('keeps only the readable id, de-duplicating and dropping the non-UUID entry before the lookup', async () => {
      const { calls } = setup(defaultFixture())
      const res = await POST(postRequest({ ids: [LA1, LB1, LC1, LX, 'not-a-uuid', LA1] }))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ [LA1]: 2 })

      const submissionsCall = callsFor(calls, 'loot_submissions')[0]
      expect(filterValue(submissionsCall, 'in', 'id')).toEqual([LA1, LB1, LC1, LX])

      const itemsCall = callsFor(calls, 'loot_submission_items')[0]
      expect(filterValue(itemsCall, 'in', 'submission_id')).toEqual([LA1])
    })
  })

  describe('GET', () => {
    it('returns counts for a comma-separated ids query, dropping a trailing empty entry', async () => {
      setup(defaultFixture())
      const res = await GET(getRequest(`ids=${LA1},${LB1},`))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ [LA1]: 2 })
    })

    it('returns 200 {} without createServiceRoleClient when ids is absent', async () => {
      setup(defaultFixture())
      const res = await GET(getRequest(''))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({})
      expect(createServiceRoleClient).not.toHaveBeenCalled()
    })

    it('returns 200 {} without createServiceRoleClient when ids is empty', async () => {
      setup(defaultFixture())
      const res = await GET(getRequest('ids='))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({})
      expect(createServiceRoleClient).not.toHaveBeenCalled()
    })
  })

  describe('malformed POST', () => {
    const cases: Array<[string, unknown]> = [
      ['a body that is not JSON', 'not json'],
      ['a null body', null],
      ['an array body', []],
      ['an ids value that is a string', { ids: 'abc' }],
      ['an ids entry that is a number', { ids: [123] }],
      ['an ids entry that is null', { ids: [LA1, null] }],
    ]

    it.each(cases)('returns 400 with C-1 and makes no database call for %s', async (_label, body) => {
      setup(defaultFixture())
      const res = await POST(postRequest(body))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('ids must be a list of up to 2000 loot list ids')
      expect(createServiceRoleClient).not.toHaveBeenCalled()
    })
  })

  describe('empty POST', () => {
    const cases: Array<[string, unknown]> = [
      ['an empty object', {}],
      ['an empty ids array', { ids: [] }],
      ['ids of only empty strings', { ids: ['', ''] }],
      ['ids of only a non-UUID string', { ids: ['not-a-uuid'] }],
    ]

    it.each(cases)('returns 200 {} without createServiceRoleClient for %s', async (_label, body) => {
      setup(defaultFixture())
      const res = await POST(postRequest(body))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({})
      expect(createServiceRoleClient).not.toHaveBeenCalled()
    })
  })

  describe('limit', () => {
    it('POST with 2001 distinct ids returns 400 C-1 without createServiceRoleClient', async () => {
      setup(defaultFixture())
      const ids = Array.from({ length: 2001 }, (_, i) => unknownId(i))
      const res = await POST(postRequest({ ids }))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('ids must be a list of up to 2000 loot list ids')
      expect(createServiceRoleClient).not.toHaveBeenCalled()
    })

    it('GET with 2001 distinct ids returns 400 C-1 without createServiceRoleClient', async () => {
      setup(defaultFixture())
      const ids = Array.from({ length: 2001 }, (_, i) => unknownId(i))
      const res = await GET(getRequest(`ids=${ids.join(',')}`))
      expect(res.status).toBe(400)
      expect((await res.json()).error).toBe('ids must be a list of up to 2000 loot list ids')
      expect(createServiceRoleClient).not.toHaveBeenCalled()
    })

    it('POST with 2001 entries that are all the same id is accepted (distinct count 1)', async () => {
      setup(defaultFixture())
      const ids = Array.from({ length: 2001 }, () => LA1)
      const res = await POST(postRequest({ ids }))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ [LA1]: 2 })
    })
  })

  describe('chunking', () => {
    it('POST with 150 distinct unknown ids makes two loot_submissions lookups of 100 and 50 ids and returns {}', async () => {
      const { calls } = setup(defaultFixture())
      const ids = Array.from({ length: 150 }, (_, i) => unknownId(i))
      const res = await POST(postRequest({ ids }))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({})

      const submissionsCalls = callsFor(calls, 'loot_submissions')
      expect(submissionsCalls).toHaveLength(2)
      expect((filterValue(submissionsCalls[0], 'in', 'id') as string[])).toHaveLength(100)
      expect((filterValue(submissionsCalls[1], 'in', 'id') as string[])).toHaveLength(50)
    })
  })

  describe('no membership', () => {
    it('returns 200 {} with no loot_submissions call for a user with only an inactive membership', async () => {
      const { calls } = setup(defaultFixture(), USER_NO_ACTIVE)
      const res = await POST(postRequest({ ids: [LA1] }))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({})
      expect(callsFor(calls, 'loot_submissions')).toHaveLength(0)
    })

    it('returns 200 {} with no loot_submissions call for a user with no characters', async () => {
      const { calls } = setup(defaultFixture(), USER_NO_CHARS)
      const res = await POST(postRequest({ ids: [LA1] }))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({})
      expect(callsFor(calls, 'loot_submissions')).toHaveLength(0)
    })
  })

  describe('errors', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    it('returns 500 with no loot_submission_items call when the characters lookup errors', async () => {
      const fixture = defaultFixture()
      fixture.errors = { characters: 'db down' }
      const { calls } = setup(fixture)
      const res = await POST(postRequest({ ids: [LA1] }))
      expect(res.status).toBe(500)
      expect((await res.json()).error).toBe('Internal server error')
      expect(callsFor(calls, 'loot_submission_items')).toHaveLength(0)
    })

    it('returns 500 with no loot_submission_items call when the memberships lookup errors', async () => {
      const fixture = defaultFixture()
      fixture.errors = { character_guild_memberships: 'db down' }
      const { calls } = setup(fixture)
      const res = await POST(postRequest({ ids: [LA1] }))
      expect(res.status).toBe(500)
      expect((await res.json()).error).toBe('Internal server error')
      expect(callsFor(calls, 'loot_submission_items')).toHaveLength(0)
    })

    it('returns 500 with no loot_submission_items call when the loot_submissions lookup errors', async () => {
      const fixture = defaultFixture()
      fixture.errors = { loot_submissions: 'db down' }
      const { calls } = setup(fixture)
      const res = await POST(postRequest({ ids: [LA1] }))
      expect(res.status).toBe(500)
      expect((await res.json()).error).toBe('Internal server error')
      expect(callsFor(calls, 'loot_submission_items')).toHaveLength(0)
    })
  })

  describe('pagination kept', () => {
    it('counts 1001 live items on one list through two range pages', async () => {
      const fixture = defaultFixture()
      fixture.items = fixture.items.filter(item => item.submission_id !== LA2)
      for (let i = 0; i < 1001; i++) {
        fixture.items.push({
          id: `00000006-0000-0000-0000-${String(i).padStart(12, '0')}`,
          submission_id: LA2,
          removed_at: null,
        })
      }
      const { calls } = setup(fixture)
      const res = await POST(postRequest({ ids: [LA2] }))
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ [LA2]: 1001 })

      const itemsCalls = callsFor(calls, 'loot_submission_items')
      expect(itemsCalls).toHaveLength(2)
      expect(itemsCalls[0].range).toEqual({ start: 0, end: 999 })
      expect(itemsCalls[1].range).toEqual({ start: 1000, end: 1999 })
    })
  })
})
